import { Collection, ObjectId } from 'mongodb';
import { getCollection } from '../db/mongoClient.js';
import type { AttendanceData, AttendanceRecord, RosterData, RosterStudent } from '../types/attendance.js';

export class AttendanceRepository {
  private async getAttendanceCollection(): Promise<Collection<AttendanceData>> {
    const collection = await getCollection<AttendanceData>('attendance');
    // Create indexes if they don't exist
    await collection.createIndexes([
      { key: { semester: 1, section: 1, date: 1 }, unique: false },
      { key: { 'uploadedBy.id': 1 }, unique: false },
    ]).catch(() => {
      // Indexes may already exist, ignore error
    });
    return collection;
  }

  private async getRosterCollection(): Promise<Collection<RosterData>> {
    const collection = await getCollection<RosterData>('rosters');
    // Create index for roster lookups
    await collection.createIndex({ semester: 1, section: 1 }, { unique: true }).catch(() => {
      // Index may already exist, ignore error
    });
    return collection;
  }

  async saveAttendance(data: AttendanceData): Promise<string> {
    const collection = await this.getAttendanceCollection();
    const now = new Date();
    
    const attendanceDoc: AttendanceData = {
      ...data,
      date: data.date instanceof Date ? data.date : new Date(data.date),
      records: data.records.map(record => ({
        ...record,
        recordedAt: record.recordedAt instanceof Date ? record.recordedAt : new Date(record.recordedAt || now),
      })),
      createdAt: now,
      updatedAt: now,
      audit: [
        {
          action: 'upload',
          by: data.uploadedBy.id,
          at: now,
        },
        ...(data.audit || []),
      ],
    };

    // Check if attendance already exists for this semester/section/date
    const existing = await collection.findOne({
      semester: data.semester,
      section: data.section,
      date: attendanceDoc.date,
    });

    if (existing) {
      // Update existing
      const result = await collection.updateOne(
        { _id: existing._id },
        {
          $set: {
            ...attendanceDoc,
            _id: existing._id,
            updatedAt: now,
          },
          $push: {
            audit: {
              action: 'edit',
              by: data.uploadedBy.id,
              at: now,
              diff: {
                field: 'records',
                oldValue: existing.records.length,
                newValue: attendanceDoc.records.length,
              },
            },
          },
        }
      );
      return existing._id?.toString() || '';
    } else {
      // Insert new
      const result = await collection.insertOne(attendanceDoc as any);
      return result.insertedId.toString();
    }
  }

  async getAttendance(semester: string, section: string, date: string): Promise<AttendanceData | null> {
    const collection = await this.getAttendanceCollection();
    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(attendanceDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const attendance = await collection.findOne({
      semester,
      section,
      date: {
        $gte: attendanceDate,
        $lt: nextDay,
      },
    });

    return attendance;
  }

  async getAttendanceById(attendanceId: string): Promise<AttendanceData | null> {
    const collection = await this.getAttendanceCollection();
    const _id = new ObjectId(attendanceId);
    return collection.findOne({ _id });
  }

  async updateRecord(
    attendanceId: string,
    recordIndex: number,
    updates: Partial<AttendanceRecord>,
    userId: string
  ): Promise<void> {
    const collection = await this.getAttendanceCollection();
    const _id = new ObjectId(attendanceId);

    const attendance = await collection.findOne({ _id });
    if (!attendance) {
      throw new Error('Attendance not found');
    }

    if (recordIndex < 0 || recordIndex >= attendance.records.length) {
      throw new Error('Invalid record index');
    }

    const oldRecord = attendance.records[recordIndex];
    const updatedRecord: AttendanceRecord = {
      ...oldRecord,
      ...updates,
      recordedAt: new Date(),
      recordedBy: userId,
    };

    await collection.updateOne(
      { _id },
      {
        $set: {
          [`records.${recordIndex}`]: updatedRecord,
          updatedAt: new Date(),
        },
        $push: {
          audit: {
            action: 'edit',
            by: userId,
            at: new Date(),
            diff: {
              field: `records[${recordIndex}]`,
              oldValue: oldRecord,
              newValue: updatedRecord,
            },
          },
        },
      }
    );
  }

  async getRoster(semester: string, section: string): Promise<Array<{ identifier: string; name?: string }>> {
    const collection = await this.getRosterCollection();
    const roster = await collection.findOne({ semester, section });

    if (roster) {
      return roster.students.map(s => ({
        identifier: s.identifier,
        name: s.name,
      }));
    }

    // Fallback: extract from attendance records
    const attendanceCollection = await this.getAttendanceCollection();
    const attendanceRecords = await attendanceCollection
      .find({ semester, section })
      .sort({ date: -1 })
      .limit(10)
      .toArray();

    const studentMap = new Map<string, string>();
    attendanceRecords.forEach(attendance => {
      attendance.records.forEach(record => {
        if (record.identifier && !studentMap.has(record.identifier)) {
          studentMap.set(record.identifier, record.name || '');
        }
      });
    });

    return Array.from(studentMap.entries()).map(([identifier, name]) => ({
      identifier,
      name: name || undefined,
    }));
  }

  async exportAttendance(
    semester: string,
    section: string,
    date?: string
  ): Promise<AttendanceData[]> {
    const collection = await this.getAttendanceCollection();
    const query: any = { semester, section };

    if (date) {
      const attendanceDate = new Date(date);
      attendanceDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(attendanceDate);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = {
        $gte: attendanceDate,
        $lt: nextDay,
      };
    }

    return collection.find(query).sort({ date: -1 }).toArray();
  }

  async getAttendanceHistory(
    semester: string,
    section: string,
    startDate?: string,
    endDate?: string
  ): Promise<AttendanceData[]> {
    const collection = await this.getAttendanceCollection();
    const query: any = { semester, section };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        query.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.date.$lte = end;
      }
    }

    return collection.find(query).sort({ date: -1 }).toArray();
  }

  async saveRoster(semester: string, section: string, students: RosterStudent[]): Promise<void> {
    const collection = await this.getRosterCollection();
    const now = new Date();

    await collection.updateOne(
      { semester, section },
      {
        $set: {
          semester,
          section,
          students,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );
  }
}

