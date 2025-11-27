import * as XLSX from 'xlsx';
import type { ColumnMapping, AttendanceRecord } from '../types/attendance.js';

/**
 * Parse Excel file (XLSX/XLS) and return rows as array of objects
 */
export async function parseExcelFile(buffer: Buffer): Promise<Array<Record<string, any>>> {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });
  return rows as Array<Record<string, any>>;
}

/**
 * Parse CSV file and return rows as array of objects
 */
export async function parseCSVFile(buffer: Buffer): Promise<Array<Record<string, any>>> {
  const text = buffer.toString('utf-8');
  const lines = text.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  // Parse header
  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);

  // Parse data rows
  const rows: Array<Record<string, any>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;

    const row: Record<string, any> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Helper to parse CSV line (handles quoted values)
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse Google Sheets public CSV export
 */
export async function parseGoogleSheets(url: string): Promise<Array<Record<string, any>>> {
  // Extract sheet ID and GID from URL
  let sheetId = '';
  let gid = '0';

  // Handle different Google Sheets URL formats
  const sheetIdMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (sheetIdMatch) {
    sheetId = sheetIdMatch[1];
  }

  const gidMatch = url.match(/[#&]gid=(\d+)/);
  if (gidMatch) {
    gid = gidMatch[1];
  }

  if (!sheetId) {
    throw new Error('Invalid Google Sheets URL. Could not extract sheet ID.');
  }

  // Construct CSV export URL
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;

  // Fetch CSV
  const response = await fetch(csvUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch Google Sheets: ${response.statusText}`);
  }

  const csvText = await response.text();
  const buffer = Buffer.from(csvText, 'utf-8');
  return parseCSVFile(buffer);
}

/**
 * Normalize status value to standard format
 */
export function normalizeStatus(value: string): 'present' | 'absent' | 'late' {
  if (!value) return 'absent';
  
  const normalized = value.toString().toLowerCase().trim();
  
  // Present variations
  if (['present', 'p', '1', 'yes', 'true', 'y', 'attended', 'attendance'].includes(normalized)) {
    return 'present';
  }
  
  // Late variations
  if (['late', 'l', 'tardy'].includes(normalized)) {
    return 'late';
  }
  
  // Absent variations (default)
  if (['absent', 'a', '0', 'no', 'false', 'n', 'missing'].includes(normalized)) {
    return 'absent';
  }
  
  // Default to absent if unrecognized
  return 'absent';
}

/**
 * Auto-detect column mapping from headers
 */
export function detectColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { identifier: '' };
  const headerLower = headers.map(h => h.toLowerCase().trim());

  // Find identifier column (USN, Student ID, etc.)
  const identifierPatterns = ['usn', 'student id', 'studentid', 'id', 'identifier', 'roll no', 'rollno', 'roll number'];
  for (const pattern of identifierPatterns) {
    const index = headerLower.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.identifier = headers[index];
      break;
    }
  }

  // Find date column
  const datePatterns = ['date', 'attendance date', 'class date'];
  for (const pattern of datePatterns) {
    const index = headerLower.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.date = headers[index];
      break;
    }
  }

  // Find status column
  const statusPatterns = ['status', 'attendance', 'present/absent', 'present', 'absent', 'attendance status'];
  for (const pattern of statusPatterns) {
    const index = headerLower.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.status = headers[index];
      break;
    }
  }

  // Find batch/section column
  const batchPatterns = ['batch', 'section', 'class', 'division'];
  for (const pattern of batchPatterns) {
    const index = headerLower.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.batch = headers[index];
      break;
    }
  }

  // Find remarks column
  const remarksPatterns = ['remarks', 'notes', 'comment', 'comments'];
  for (const pattern of remarksPatterns) {
    const index = headerLower.findIndex(h => h.includes(pattern));
    if (index !== -1) {
      mapping.remarks = headers[index];
      break;
    }
  }

  return mapping;
}

/**
 * Validate and map a row to AttendanceRecord
 */
export function validateRow(
  row: Record<string, any>,
  mapping: ColumnMapping,
  date: string
): { valid: boolean; errors: string[]; record: Partial<AttendanceRecord> } {
  const errors: string[] = [];
  const record: Partial<AttendanceRecord> = {};

  // Extract identifier (required)
  const identifier = row[mapping.identifier]?.toString().trim();
  if (!identifier) {
    errors.push('Missing identifier (USN/Student ID)');
  } else {
    record.identifier = identifier;
  }

  // Extract name (optional)
  const nameCol = Object.keys(row).find(k => 
    k.toLowerCase().includes('name') && k !== mapping.identifier
  );
  if (nameCol && row[nameCol]) {
    record.name = row[nameCol].toString().trim();
  }

  // Extract status
  if (mapping.status && row[mapping.status]) {
    record.status = normalizeStatus(row[mapping.status].toString());
  } else {
    // Try to infer from other columns
    const statusCol = Object.keys(row).find(k => {
      const val = row[k]?.toString().toLowerCase();
      return ['present', 'absent', 'late', 'p', 'a', 'l', '1', '0'].includes(val);
    });
    if (statusCol) {
      record.status = normalizeStatus(row[statusCol].toString());
    } else {
      record.status = 'absent'; // Default
    }
  }

  // Extract remarks
  if (mapping.remarks && row[mapping.remarks]) {
    record.remarks = row[mapping.remarks].toString().trim();
  }

  // Extract date if present in row
  if (mapping.date && row[mapping.date]) {
    const rowDate = row[mapping.date].toString();
    // Validate date format
    const dateObj = new Date(rowDate);
    if (isNaN(dateObj.getTime())) {
      errors.push(`Invalid date format: ${rowDate}`);
    }
  }

  return {
    valid: errors.length === 0 && !!record.identifier,
    errors,
    record,
  };
}

