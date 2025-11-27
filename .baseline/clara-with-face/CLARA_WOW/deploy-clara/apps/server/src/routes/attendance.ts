import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { AttendanceRepository } from '../repositories/AttendanceRepository.js';
import { TimetableRepository } from '../timetableRepository.js';
import {
  parseExcelFile,
  parseCSVFile,
  parseGoogleSheets,
  detectColumns,
  validateRow,
} from '../services/attendanceParserService.js';
import type { AttendanceData, AttendanceRecord, ColumnMapping } from '../types/attendance.js';
import * as XLSX from 'xlsx';

type AuthPayload = {
  userId: string;
  role: 'client' | 'staff';
  staffId?: string;
  dept?: string;
  email?: string;
};

export function createAttendanceRoutes(timetableRepo: TimetableRepository): Router {
  const router = Router();
  const attendanceRepo = new AttendanceRepository();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv',
      'application/csv',
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(xlsx|xls|csv)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only Excel (.xlsx, .xls) and CSV files are allowed.'));
    }
  },
});

// Type for authenticated request
type AuthRequest = Request & {
  user?: AuthPayload;
};

// Helper to check if user is staff/admin
function isStaffOrAdmin(req: AuthRequest): boolean {
  return req.user?.role === 'staff';
}

// Helper to get user info
function getUserInfo(req: AuthRequest): { id: string; name: string } {
  const userId = req.user?.userId || req.user?.email || 'unknown';
  const name = req.user?.email?.split('@')[0] || userId;
  return { id: userId, name };
}

/**
 * POST /api/attendance/parse-file
 * Parse uploaded Excel/CSV file
 */
router.post('/parse-file', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const buffer = req.file.buffer;
    const filename = req.file.originalname.toLowerCase();

    let rows: Array<Record<string, any>>;
    try {
      if (filename.endsWith('.csv')) {
        rows = await parseCSVFile(buffer);
      } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
        rows = await parseExcelFile(buffer);
      } else {
        return res.status(400).json({ error: 'Unsupported file type. Please upload .xlsx, .xls, or .csv files.' });
      }
    } catch (parseError: any) {
      console.error('Error parsing file:', parseError);
      return res.status(400).json({ error: `Failed to parse file: ${parseError.message || 'Invalid file format'}` });
    }

    if (!rows || rows.length === 0) {
      return res.status(400).json({ error: 'File is empty or could not be parsed. Please ensure the file contains data.' });
    }

    // Extract headers from first row keys
    const firstRow = rows[0];
    if (!firstRow || typeof firstRow !== 'object') {
      return res.status(400).json({ error: 'Invalid file format. Could not read headers.' });
    }

    const headers = Object.keys(firstRow);
    if (headers.length === 0) {
      return res.status(400).json({ error: 'No columns found in file. Please ensure the file has headers.' });
    }

    const suggestedMapping = detectColumns(headers);

    res.json({
      rows,
      headers,
      suggestedMapping,
    });
  } catch (error: any) {
    console.error('Error parsing file:', error);
    res.status(500).json({ error: error.message || 'Failed to parse file' });
  }
});

/**
 * POST /api/attendance/from-google
 * Parse Google Sheets from URL
 */
router.post('/from-google', async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Google Sheets URL is required' });
    }

    const rows = await parseGoogleSheets(url);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'Sheet is empty or could not be parsed' });
    }

    const headers = Object.keys(rows[0] || {});
    const suggestedMapping = detectColumns(headers);

    res.json({
      rows,
      headers,
      suggestedMapping,
    });
  } catch (error: any) {
    console.error('Error parsing Google Sheets:', error);
    res.status(500).json({ error: error.message || 'Failed to parse Google Sheets' });
  }
});

/**
 * POST /api/attendance/save
 * Save attendance records to database
 */
const saveAttendanceSchema = z.object({
  semester: z.string(),
  section: z.string(),
  date: z.string(),
  records: z.array(
    z.object({
      identifier: z.string(),
      name: z.string().optional(),
      status: z.enum(['present', 'absent', 'late']),
      remarks: z.string().optional(),
    })
  ),
  source: z.enum(['excel', 'google', 'manual']),
  columnMapping: z
    .object({
      identifier: z.string(),
      date: z.string().optional(),
      status: z.string().optional(),
      batch: z.string().optional(),
      remarks: z.string().optional(),
    })
    .optional(),
});

router.post('/save', async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const parsed = saveAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid request data', details: parsed.error });
    }

    const { semester, section, date, records, source } = parsed.data;
    const userInfo = getUserInfo(req);

    // Validate all records have identifiers
    const errors: string[] = [];
    const validRecords: AttendanceRecord[] = [];

    records.forEach((record, index) => {
      if (!record.identifier || !record.identifier.trim()) {
        errors.push(`Row ${index + 1}: Missing identifier`);
        return;
      }
      validRecords.push({
        identifier: record.identifier.trim(),
        name: record.name?.trim(),
        status: record.status,
        remarks: record.remarks?.trim(),
        recordedAt: new Date(),
        recordedBy: userInfo.id,
      });
    });

    if (validRecords.length === 0) {
      return res.status(400).json({ error: 'No valid records to save', errors });
    }

    const attendanceData: AttendanceData = {
      semester,
      section,
      date: new Date(date),
      source,
      uploadedBy: userInfo,
      records: validRecords,
    };

    const attendanceId = await attendanceRepo.saveAttendance(attendanceData);

    res.json({
      attendanceId,
      saved: validRecords.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ error: error.message || 'Failed to save attendance' });
  }
});

/**
 * GET /api/attendance
 * Get attendance for a specific date
 */
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const { semester, section, date } = req.query;

    if (!semester || !section || !date) {
      return res.status(400).json({ error: 'semester, section, and date are required' });
    }

    const attendance = await attendanceRepo.getAttendance(
      semester.toString(),
      section.toString(),
      date.toString()
    );

    if (!attendance) {
      return res.status(404).json({ error: 'Attendance not found' });
    }

    // Convert Date objects to ISO strings for JSON response
    const response = {
      ...attendance,
      _id: attendance._id?.toString(),
      date: attendance.date instanceof Date ? attendance.date.toISOString().split('T')[0] : attendance.date,
      records: attendance.records.map(r => ({
        ...r,
        recordedAt: r.recordedAt instanceof Date ? r.recordedAt.toISOString() : r.recordedAt,
      })),
      createdAt: attendance.createdAt instanceof Date ? attendance.createdAt.toISOString() : attendance.createdAt,
      updatedAt: attendance.updatedAt instanceof Date ? attendance.updatedAt.toISOString() : attendance.updatedAt,
      audit: attendance.audit?.map(a => ({
        ...a,
        at: a.at instanceof Date ? a.at.toISOString() : a.at,
      })),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch attendance' });
  }
});

/**
 * PATCH /api/attendance/:attendanceId/record/:recordIndex
 * Update a single attendance record
 */
router.patch('/:attendanceId/record/:recordIndex', async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const { attendanceId, recordIndex } = req.params;
    const { status, remarks } = req.body;

    if (!attendanceId || recordIndex === undefined) {
      return res.status(400).json({ error: 'attendanceId and recordIndex are required' });
    }

    const updates: Partial<AttendanceRecord> = {};
    if (status && ['present', 'absent', 'late'].includes(status)) {
      updates.status = status;
    }
    if (remarks !== undefined) {
      updates.remarks = remarks;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid updates provided' });
    }

    const userInfo = getUserInfo(req);
    await attendanceRepo.updateRecord(attendanceId, parseInt(recordIndex), updates, userInfo.id);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error updating attendance record:', error);
    res.status(500).json({ error: error.message || 'Failed to update attendance record' });
  }
});

/**
 * GET /api/attendance/roster
 * Get class roster for a semester/section
 */
router.get('/roster', async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const { semester, section } = req.query;

    if (!semester || !section) {
      return res.status(400).json({ error: 'semester and section are required' });
    }

    const roster = await attendanceRepo.getRoster(semester.toString(), section.toString());

    res.json(roster);
  } catch (error: any) {
    console.error('Error fetching roster:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch roster' });
  }
});

/**
 * GET /api/attendance/export
 * Export attendance as CSV/XLSX
 */
router.get('/export', async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const { semester, section, date, format } = req.query;

    if (!semester || !section) {
      return res.status(400).json({ error: 'semester and section are required' });
    }

    const attendanceList = await attendanceRepo.exportAttendance(
      semester.toString(),
      section.toString(),
      date?.toString()
    );

    if (attendanceList.length === 0) {
      return res.status(404).json({ error: 'No attendance data found' });
    }

    const exportFormat = (format || 'csv').toString().toLowerCase();

    if (exportFormat === 'xlsx') {
      // Export as Excel
      const workbook = XLSX.utils.book_new();

      attendanceList.forEach(attendance => {
        const dateStr = attendance.date instanceof Date 
          ? attendance.date.toISOString().split('T')[0] 
          : attendance.date.toString();
        
        const sheetData = [
          ['Semester', 'Section', 'Date', 'Source', 'Uploaded By'],
          [
            attendance.semester,
            attendance.section,
            dateStr,
            attendance.source,
            attendance.uploadedBy.name,
          ],
          [],
          ['Identifier', 'Name', 'Status', 'Remarks', 'Recorded At', 'Recorded By'],
          ...attendance.records.map(r => [
            r.identifier,
            r.name || '',
            r.status,
            r.remarks || '',
            r.recordedAt instanceof Date ? r.recordedAt.toISOString() : r.recordedAt,
            r.recordedBy,
          ]),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, dateStr);
      });

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_${semester}_${section}.xlsx`);
      res.send(buffer);
    } else {
      // Export as CSV
      let csv = 'Semester,Section,Date,Identifier,Name,Status,Remarks,Recorded At,Recorded By\n';

      attendanceList.forEach(attendance => {
        const dateStr = attendance.date instanceof Date 
          ? attendance.date.toISOString().split('T')[0] 
          : attendance.date.toString();

        attendance.records.forEach(record => {
          const recordedAt = record.recordedAt instanceof Date 
            ? record.recordedAt.toISOString() 
            : record.recordedAt;
          
          csv += `"${attendance.semester}","${attendance.section}","${dateStr}","${record.identifier}","${record.name || ''}","${record.status}","${record.remarks || ''}","${recordedAt}","${record.recordedBy}"\n`;
        });
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance_${semester}_${section}.csv`);
      res.send(csv);
    }
  } catch (error: any) {
    console.error('Error exporting attendance:', error);
    res.status(500).json({ error: error.message || 'Failed to export attendance' });
  }
});

/**
 * GET /api/attendance/history
 * Get attendance history for calendar view
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const { semester, section, startDate, endDate } = req.query;

    if (!semester || !section) {
      return res.status(400).json({ error: 'semester and section are required' });
    }

    const history = await attendanceRepo.getAttendanceHistory(
      semester.toString(),
      section.toString(),
      startDate?.toString(),
      endDate?.toString()
    );

    // Convert Date objects to ISO strings
    const response = history.map(attendance => ({
      ...attendance,
      _id: attendance._id?.toString(),
      date: attendance.date instanceof Date ? attendance.date.toISOString().split('T')[0] : attendance.date,
      records: attendance.records.map(r => ({
        ...r,
        recordedAt: r.recordedAt instanceof Date ? r.recordedAt.toISOString() : r.recordedAt,
      })),
      createdAt: attendance.createdAt instanceof Date ? attendance.createdAt.toISOString() : attendance.createdAt,
      updatedAt: attendance.updatedAt instanceof Date ? attendance.updatedAt.toISOString() : attendance.updatedAt,
    }));

    res.json(response);
  } catch (error: any) {
    console.error('Error fetching attendance history:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch attendance history' });
  }
});

/**
 * POST /api/attendance/sync-timetable
 * Sync attendance with timetable
 */
router.post('/sync-timetable', async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    const { attendanceId, sync } = req.body;

    if (!attendanceId) {
      return res.status(400).json({ error: 'attendanceId is required' });
    }

    // Get attendance by ID
    const attendance = await attendanceRepo.getAttendanceById(attendanceId);
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance not found' });
    }

    if (sync) {
      // Find corresponding timetable slot and mark as Busy
      const date = attendance.date instanceof Date ? attendance.date : new Date(attendance.date);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }) as 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday';
      
      // Get timetable for the coordinator (uploadedBy.id)
      try {
        const facultyId = attendance.uploadedBy.id;
        const semester = attendance.semester;
        
        // Get timetable for this faculty and semester
        const timetable = await timetableRepo.get(facultyId, semester);
        
        if (timetable && timetable.schedule[dayName]) {
          // Mark classes on this day for the matching section as "Busy"
          const updatedSchedule = { ...timetable.schedule };
          if (updatedSchedule[dayName]) {
            updatedSchedule[dayName] = updatedSchedule[dayName].map(cls => {
              // Only mark as Busy if the batch/section matches
              if (cls.batch === attendance.section || !cls.batch) {
                return {
                  ...cls,
                  classType: 'Busy' as const,
                };
              }
              return cls;
            });
          }
          
          // Update timetable
          await timetableRepo.createOrUpdate(
            {
              ...timetable,
              schedule: updatedSchedule,
            },
            attendance.uploadedBy.id,
            `Attendance sync for ${dayName}`
          );
          
          console.log(`[Attendance Sync] Marked ${dayName} classes as Busy for ${facultyId} in ${semester} semester, section ${attendance.section}`);
        }
      } catch (error) {
        console.error('[Attendance Sync] Error syncing with timetable:', error);
        // Don't fail the request if sync fails
      }
    }

    res.json({ success: true, synced: sync });
  } catch (error: any) {
    console.error('Error syncing timetable:', error);
    res.status(500).json({ error: error.message || 'Failed to sync timetable' });
  }
});

/**
 * POST /api/attendance/roster/import
 * Import student roster
 */
router.post('/roster/import', upload.single('file'), async (req: AuthRequest, res: Response) => {
  try {
    if (!isStaffOrAdmin(req)) {
      return res.status(403).json({ error: 'Access denied. Staff/Admin only.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { semester, section } = req.body;
    if (!semester || !section) {
      return res.status(400).json({ error: 'semester and section are required' });
    }

    const buffer = req.file.buffer;
    const filename = req.file.originalname.toLowerCase();

    let rows: Array<Record<string, any>>;
    if (filename.endsWith('.csv')) {
      rows = await parseCSVFile(buffer);
    } else if (filename.endsWith('.xlsx') || filename.endsWith('.xls')) {
      rows = await parseExcelFile(buffer);
    } else {
      return res.status(400).json({ error: 'Unsupported file type' });
    }

    // Map rows to roster students
    const mapping = detectColumns(Object.keys(rows[0] || {}));
    const students = rows
      .map(row => {
        const identifier = row[mapping.identifier]?.toString().trim();
        const nameCol = Object.keys(row).find(k => k.toLowerCase().includes('name'));
        const name = nameCol ? row[nameCol]?.toString().trim() : '';
        
        if (!identifier) return null;
        
        return {
          identifier,
          name: name || undefined,
        };
      })
      .filter((s): s is { identifier: string; name?: string } => s !== null);

    await attendanceRepo.saveRoster(semester, section, students);

    res.json({ success: true, imported: students.length });
  } catch (error: any) {
    console.error('Error importing roster:', error);
    res.status(500).json({ error: error.message || 'Failed to import roster' });
  }
});

  return router;
}

