// Attendance Types for Server

export interface AttendanceRecord {
  identifier: string;
  name?: string;
  status: 'present' | 'absent' | 'late';
  remarks?: string;
  recordedAt: Date;
  recordedBy: string;
}

export interface AttendanceData {
  _id?: string;
  semester: string;
  section: string;
  date: Date;
  source: 'excel' | 'google' | 'manual';
  uploadedBy: {
    id: string;
    name: string;
  };
  records: AttendanceRecord[];
  createdAt?: Date;
  updatedAt?: Date;
  audit?: Array<{
    action: 'upload' | 'edit' | 'delete';
    by: string;
    at: Date;
    diff?: {
      field: string;
      oldValue: any;
      newValue: any;
    };
  }>;
}

export interface ColumnMapping {
  identifier: string;
  date?: string;
  status?: string;
  batch?: string;
  remarks?: string;
}

export interface ParsedRow {
  raw: any;
  mapped: Partial<AttendanceRecord>;
  errors: string[];
}

export interface RosterStudent {
  identifier: string;
  name: string;
  email?: string;
}

export interface RosterData {
  _id?: string;
  semester: string;
  section: string;
  students: RosterStudent[];
  createdAt?: Date;
  updatedAt?: Date;
}

