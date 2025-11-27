import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  AttendanceData,
  AttendanceRecord,
  ColumnMapping,
  ParsedRow,
  StaffProfile,
} from '../types';

interface AttendanceProps {
  user: StaffProfile;
}

const SEMESTERS = ['3rd Semester', '5th Semester', '7th Semester'];
const SECTIONS = ['V-A', 'V-B', 'V-C', 'III-A', 'III-B', 'III-C', 'VII-A', 'VII-B'];

const Attendance: React.FC<AttendanceProps> = ({ user }) => {
  const [selectedSemester, setSelectedSemester] = useState('5th Semester');
  const [selectedSection, setSelectedSection] = useState('V-A');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [viewMode, setViewMode] = useState<'import' | 'manual' | 'calendar'>('import');
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    identifier: '',
  });
  const [headers, setHeaders] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [roster, setRoster] = useState<Array<{ identifier: string; name?: string }>>([]);
  const [manualRecords, setManualRecords] = useState<Record<string, 'present' | 'absent' | 'late'>>({});
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceData[]>([]);
  const [showGoogleSheetsModal, setShowGoogleSheetsModal] = useState(false);
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState('');
  const [syncToTimetable, setSyncToTimetable] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Determine API base URL - match pattern from other components
  const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE) {
      const base = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_BASE;
      return base.endsWith('/api') ? base : `${base}/api`;
    }
    
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      const port = window.location.port;
      const pathname = window.location.pathname;
      
      // If accessed through unified server (port 8080 or /staff path), use current origin
      if (port === '8080' || pathname.startsWith('/staff')) {
        return `${origin}/api`;
      }
      
      // If staff app is on a different port (like 5174), use port 8080 for API
      if (port === '5174' || port === '5173') {
        const host = window.location.hostname;
        return `http://${host}:8080/api`;
      }
      
      // Default fallback: use current origin
      return `${origin}/api`;
    }
    
    return 'http://localhost:8080/api';
  };

  const API_BASE = getApiBaseUrl();

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getAuthHeaders = (includeContentType = true) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (includeContentType) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  // Fetch roster
  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/attendance/roster?semester=${selectedSemester.replace(/\D/g, '')}&section=${selectedSection}`,
          { headers: getAuthHeaders() }
        );
        if (response.ok) {
          const data = await response.json();
          setRoster(data);
        }
      } catch (error) {
        console.error('Error fetching roster:', error);
      }
    };

    if (viewMode === 'manual') {
      fetchRoster();
    }
  }, [selectedSemester, selectedSection, viewMode, API_BASE]);

  // Fetch attendance history for calendar
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();

        const response = await fetch(
          `${API_BASE}/attendance/history?semester=${selectedSemester.replace(/\D/g, '')}&section=${selectedSection}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`,
          { headers: getAuthHeaders() }
        );
        if (response.ok) {
          const data = await response.json();
          setAttendanceHistory(data);
        }
      } catch (error) {
        console.error('Error fetching attendance history:', error);
      }
    };

    if (viewMode === 'calendar') {
      fetchHistory();
    }
  }, [selectedSemester, selectedSection, viewMode, API_BASE]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE}/attendance/parse-file`, {
        method: 'POST',
        headers: getAuthHeaders(false), // Don't include Content-Type for FormData
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to parse file');
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to parse file';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data.rows || !Array.isArray(data.rows)) {
        throw new Error('Invalid response from server');
      }

      setHeaders(data.headers || []);
      setColumnMapping(data.suggestedMapping || { identifier: '' });

      // Validate rows
      const validated: ParsedRow[] = data.rows.map((row: any, index: number) => {
        // This would use validateRow from parser service
        // For now, create basic validation
        const identifierCol = data.suggestedMapping?.identifier || '';
        const statusCol = data.suggestedMapping?.status || '';
        const remarksCol = data.suggestedMapping?.remarks || '';
        
        const identifier = identifierCol ? (row[identifierCol]?.toString().trim() || '') : '';
        const statusValue = statusCol ? (row[statusCol]?.toString().trim() || 'absent') : 'absent';
        const errors: string[] = [];

        if (!identifier) {
          errors.push(`Row ${index + 1}: Missing identifier`);
        }

        // Find name column
        const nameCol = Object.keys(row).find(k => 
          k.toLowerCase().includes('name') && k !== identifierCol
        );
        const name = nameCol ? (row[nameCol]?.toString().trim() || '') : '';

        // Normalize status
        const statusLower = statusValue.toLowerCase();
        let status: 'present' | 'absent' | 'late' = 'absent';
        if (statusLower === 'present' || statusLower === 'p' || statusLower === '1' || statusLower === 'yes') {
          status = 'present';
        } else if (statusLower === 'late' || statusLower === 'l') {
          status = 'late';
        }

        return {
          raw: row,
          mapped: {
            identifier,
            status,
            name: name || undefined,
            remarks: remarksCol ? (row[remarksCol]?.toString().trim() || undefined) : undefined,
          },
          errors,
        };
      });

      setParsedRows(validated);
      const errors = validated.filter(r => r.errors.length > 0).map(r => r.errors.join(', '));
      setValidationErrors(errors);
      setViewMode('import');
    } catch (error: any) {
      showToast(error.message || 'Failed to parse file', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSheetsImport = async () => {
    if (!googleSheetsUrl.trim()) {
      showToast('Please enter a Google Sheets URL', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/attendance/from-google`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ url: googleSheetsUrl }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse Google Sheets');
      }

      const data = await response.json();
      setHeaders(data.headers);
      setColumnMapping(data.suggestedMapping);

      const validated: ParsedRow[] = data.rows.map((row: any, index: number) => {
        const identifier = row[data.suggestedMapping.identifier]?.toString().trim();
        const status = row[data.suggestedMapping.status]?.toString().trim() || 'absent';
        const errors: string[] = [];

        if (!identifier) {
          errors.push('Missing identifier');
        }

        return {
          raw: row,
          mapped: {
            identifier: identifier || '',
            status: status.toLowerCase() === 'present' || status === 'p' || status === '1' ? 'present' : status.toLowerCase() === 'late' || status === 'l' ? 'late' : 'absent',
            name: row[Object.keys(row).find(k => k.toLowerCase().includes('name')) || '']?.toString().trim(),
            remarks: row[data.suggestedMapping.remarks]?.toString().trim(),
          },
          errors,
        };
      });

      setParsedRows(validated);
      const errors = validated.filter(r => r.errors.length > 0).map(r => r.errors.join(', '));
      setValidationErrors(errors);
      setShowGoogleSheetsModal(false);
      setViewMode('import');
    } catch (error: any) {
      showToast(error.message || 'Failed to parse Google Sheets', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAttendance = async () => {
    const validRecords = parsedRows
      .filter(r => r.errors.length === 0 && r.mapped.identifier)
      .map(r => ({
        identifier: r.mapped.identifier!,
        name: r.mapped.name,
        status: r.mapped.status || 'absent',
        remarks: r.mapped.remarks,
      }));

    if (validRecords.length === 0) {
      showToast('No valid records to save', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/attendance/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          semester: selectedSemester.replace(/\D/g, ''),
          section: selectedSection,
          date: selectedDate,
          records: validRecords,
          source: 'excel',
          columnMapping,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance');
      }

      showToast(`Successfully saved ${validRecords.length} attendance records`, 'success');
      setParsedRows([]);
      setViewMode('calendar');
    } catch (error: any) {
      showToast(error.message || 'Failed to save attendance', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualSave = async () => {
    const records: AttendanceRecord[] = roster.map(student => ({
      identifier: student.identifier,
      name: student.name,
      status: manualRecords[student.identifier] || 'absent',
      recordedAt: new Date().toISOString(),
      recordedBy: user.id,
    }));

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/attendance/save`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          semester: selectedSemester.replace(/\D/g, ''),
          section: selectedSection,
          date: selectedDate,
          records,
          source: 'manual',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save attendance');
      }

      showToast(`Successfully saved attendance for ${records.length} students`, 'success');
      setManualRecords({});
    } catch (error: any) {
      showToast(error.message || 'Failed to save attendance', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportSample = () => {
    const sample = [
      ['USN', 'Name', 'Status', 'Remarks'],
      ['1VA24CD001', 'Student One', 'Present', ''],
      ['1VA24CD002', 'Student Two', 'Absent', 'Sick'],
      ['1VA24CD003', 'Student Three', 'Late', 'Traffic'],
    ];

    const csv = sample.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'attendance_sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedRows.filter(r => r.errors.length === 0 && r.mapped.identifier).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-20 right-6 z-50 px-6 py-3 rounded-lg shadow-lg ${
              toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Controls */}
      <div className="flex flex-wrap items-center gap-4 bg-slate-900/50 backdrop-blur-lg border border-white/10 rounded-2xl p-4">
        <h2 className="text-2xl font-bold text-white">Attendance</h2>
        <select
          value={selectedSemester}
          onChange={(e) => setSelectedSemester(e.target.value)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-white/10"
        >
          {SEMESTERS.map(sem => (
            <option key={sem} value={sem}>{sem}</option>
          ))}
        </select>
        <select
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-white/10"
        >
          {SECTIONS.map(sec => (
            <option key={sec} value={sec}>{sec}</option>
          ))}
        </select>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg border border-white/10"
        />
        <div className="flex gap-2 ml-auto">
          <button
            onClick={() => setViewMode('import')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'import'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Import
          </button>
          <button
            onClick={() => setViewMode('manual')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Manual
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Calendar
          </button>
        </div>
      </div>

      {/* Import Mode */}
      {viewMode === 'import' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 space-y-6"
        >
          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fa-solid fa-file-excel"></i>
              Import Excel/CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => setShowGoogleSheetsModal(true)}
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              <i className="fa-brands fa-google"></i>
              Import from Google Sheets
            </button>
            <button
              onClick={handleExportSample}
              className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg flex items-center gap-2"
            >
              <i className="fa-solid fa-download"></i>
              Export Sample CSV
            </button>
          </div>

          {/* Column Mapping */}
          {headers.length > 0 && (
            <div className="bg-slate-800/50 rounded-lg p-4 space-y-4">
              <h3 className="text-white font-semibold">Column Mapping</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-300 text-sm block mb-2">Identifier (USN/Student ID) *</label>
                  <select
                    value={columnMapping.identifier}
                    onChange={(e) => setColumnMapping({ ...columnMapping, identifier: e.target.value })}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/10"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-2">Status (Present/Absent/Late)</label>
                  <select
                    value={columnMapping.status || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, status: e.target.value })}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/10"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-300 text-sm block mb-2">Remarks (Optional)</label>
                  <select
                    value={columnMapping.remarks || ''}
                    onChange={(e) => setColumnMapping({ ...columnMapping, remarks: e.target.value })}
                    className="w-full bg-slate-700 text-white px-4 py-2 rounded-lg border border-white/10"
                  >
                    <option value="">Select column...</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Preview Table */}
          {parsedRows.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-semibold">Preview</h3>
                <div className="text-slate-300 text-sm">
                  Total: {parsedRows.length} | Valid: {validCount} | Invalid: {invalidCount}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-800">
                      <th className="px-4 py-2 text-slate-300 border border-white/10">Identifier</th>
                      <th className="px-4 py-2 text-slate-300 border border-white/10">Name</th>
                      <th className="px-4 py-2 text-slate-300 border border-white/10">Status</th>
                      <th className="px-4 py-2 text-slate-300 border border-white/10">Remarks</th>
                      <th className="px-4 py-2 text-slate-300 border border-white/10">Errors</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedRows.slice(0, 20).map((row, index) => (
                      <tr
                        key={index}
                        className={`${row.errors.length > 0 ? 'bg-red-900/20' : 'bg-slate-800/50'}`}
                      >
                        <td className="px-4 py-2 text-white border border-white/10">{row.mapped.identifier || '-'}</td>
                        <td className="px-4 py-2 text-white border border-white/10">{row.mapped.name || '-'}</td>
                        <td className="px-4 py-2 text-white border border-white/10">
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => {
                                const updated = [...parsedRows];
                                updated[index].mapped.status = 'present';
                                setParsedRows(updated);
                              }}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                row.mapped.status === 'present'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                              title="Mark as Present"
                            >
                              P
                            </button>
                            <button
                              onClick={() => {
                                const updated = [...parsedRows];
                                updated[index].mapped.status = 'absent';
                                setParsedRows(updated);
                              }}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                row.mapped.status === 'absent'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                              title="Mark as Absent"
                            >
                              A
                            </button>
                            <button
                              onClick={() => {
                                const updated = [...parsedRows];
                                updated[index].mapped.status = 'late';
                                setParsedRows(updated);
                              }}
                              className={`px-3 py-1 rounded text-xs font-semibold transition-colors ${
                                row.mapped.status === 'late'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              }`}
                              title="Mark as Late"
                            >
                              L
                            </button>
                            <span className={`ml-2 px-2 py-1 rounded text-xs ${
                              row.mapped.status === 'present' ? 'bg-green-500/20 text-green-400' :
                              row.mapped.status === 'late' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-red-500/20 text-red-400'
                            }`}>
                              {row.mapped.status || 'absent'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-white border border-white/10">
                          <input
                            type="text"
                            value={row.mapped.remarks || ''}
                            onChange={(e) => {
                              const updated = [...parsedRows];
                              updated[index].mapped.remarks = e.target.value;
                              setParsedRows(updated);
                            }}
                            placeholder="Add remarks..."
                            className="w-full bg-slate-700 text-white px-2 py-1 rounded text-sm border border-white/10 focus:border-blue-500 focus:outline-none"
                          />
                        </td>
                        <td className="px-4 py-2 text-red-400 text-sm border border-white/10">
                          {row.errors.join(', ') || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedRows.length > 20 && (
                  <p className="text-slate-400 text-sm mt-2">Showing first 20 rows of {parsedRows.length}</p>
                )}
              </div>

              {/* Validation Summary */}
              {validationErrors.length > 0 && (
                <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
                  <h4 className="text-red-400 font-semibold mb-2">Validation Errors:</h4>
                  <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                    {validationErrors.slice(0, 10).map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                  {validationErrors.length > 10 && (
                    <p className="text-red-400 text-sm mt-2">... and {validationErrors.length - 10} more errors</p>
                  )}
                </div>
              )}

              {/* Bulk Actions */}
              <div className="flex gap-2 items-center bg-slate-800/50 rounded-lg p-3">
                <span className="text-slate-300 text-sm font-semibold">Bulk Actions:</span>
                <button
                  onClick={() => {
                    const updated = parsedRows.map(row => ({
                      ...row,
                      mapped: { ...row.mapped, status: 'present' as const }
                    }));
                    setParsedRows(updated);
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <i className="fa-solid fa-check"></i>
                  Mark All Present
                </button>
                <button
                  onClick={() => {
                    const updated = parsedRows.map(row => ({
                      ...row,
                      mapped: { ...row.mapped, status: 'absent' as const }
                    }));
                    setParsedRows(updated);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <i className="fa-solid fa-times"></i>
                  Mark All Absent
                </button>
                <button
                  onClick={() => {
                    const updated = parsedRows.map(row => ({
                      ...row,
                      mapped: { ...row.mapped, status: 'late' as const }
                    }));
                    setParsedRows(updated);
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"
                >
                  <i className="fa-solid fa-clock"></i>
                  Mark All Late
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 items-center">
                <button
                  onClick={handleSaveAttendance}
                  disabled={!columnMapping.identifier || validCount === 0 || isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <i className="fa-solid fa-save"></i>
                  Save to DB ({validCount} records)
                </button>
                <button
                  onClick={() => {
                    setParsedRows([]);
                    setHeaders([]);
                    setColumnMapping({ identifier: '' });
                    setValidationErrors([]);
                  }}
                  className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg"
                >
                  Cancel
                </button>
                <label className="flex items-center gap-2 text-slate-300">
                  <input
                    type="checkbox"
                    checked={syncToTimetable}
                    onChange={(e) => setSyncToTimetable(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span>Sync to Weekly Timetable</span>
                </label>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Manual Mode */}
      {viewMode === 'manual' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6 space-y-6"
        >
          <div className="flex justify-between items-center">
            <h3 className="text-white font-semibold text-lg">Mark Attendance Manually</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const allPresent: Record<string, 'present'> = {};
                  roster.forEach(s => {
                    allPresent[s.identifier] = 'present';
                  });
                  setManualRecords(allPresent);
                }}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Mark All Present
              </button>
              <button
                onClick={() => {
                  const allAbsent: Record<string, 'absent'> = {};
                  roster.forEach(s => {
                    allAbsent[s.identifier] = 'absent';
                  });
                  setManualRecords(allAbsent);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {roster.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No roster found for {selectedSemester} - {selectedSection}</p>
              <p className="text-sm mt-2">Import a roster first or attendance will be created from imports</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roster.map((student) => (
                <div
                  key={student.identifier}
                  className="bg-slate-800/50 border border-white/10 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-white font-semibold">{student.identifier}</p>
                    {student.name && <p className="text-slate-400 text-sm">{student.name}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setManualRecords({ ...manualRecords, [student.identifier]: 'present' })}
                      className={`px-3 py-1 rounded text-sm ${
                        manualRecords[student.identifier] === 'present'
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      P
                    </button>
                    <button
                      onClick={() => setManualRecords({ ...manualRecords, [student.identifier]: 'absent' })}
                      className={`px-3 py-1 rounded text-sm ${
                        manualRecords[student.identifier] === 'absent'
                          ? 'bg-red-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      A
                    </button>
                    <button
                      onClick={() => setManualRecords({ ...manualRecords, [student.identifier]: 'late' })}
                      className={`px-3 py-1 rounded text-sm ${
                        manualRecords[student.identifier] === 'late'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      L
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-4 items-center">
            <button
              onClick={handleManualSave}
              disabled={roster.length === 0 || isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <i className="fa-solid fa-save"></i>
              Save Attendance
            </button>
            <label className="flex items-center gap-2 text-slate-300">
              <input
                type="checkbox"
                checked={syncToTimetable}
                onChange={(e) => setSyncToTimetable(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Sync to Weekly Timetable</span>
            </label>
          </div>
        </motion.div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-lg border border-white/10 rounded-2xl p-6"
        >
          <h3 className="text-white font-semibold text-lg mb-4">Attendance History</h3>
          {attendanceHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {attendanceHistory.map((attendance) => {
                const dateStr = attendance.date instanceof Date
                  ? attendance.date.toISOString().split('T')[0]
                  : attendance.date;
                return (
                  <div
                    key={attendance._id}
                    className="bg-slate-800/50 border border-white/10 rounded-lg p-4 cursor-pointer hover:bg-slate-800 transition-colors"
                    onClick={() => {
                      setSelectedDate(dateStr);
                      setViewMode('manual');
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-white font-semibold">{dateStr}</p>
                        <p className="text-slate-400 text-sm">
                          {attendance.records.filter(r => r.status === 'present').length} Present,{' '}
                          {attendance.records.filter(r => r.status === 'absent').length} Absent,{' '}
                          {attendance.records.filter(r => r.status === 'late').length} Late
                        </p>
                      </div>
                      <div className="text-slate-400 text-sm">
                        {attendance.source} • {attendance.uploadedBy.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      {/* Google Sheets Modal */}
      <AnimatePresence>
        {showGoogleSheetsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowGoogleSheetsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-white font-semibold text-lg mb-4">Import from Google Sheets</h3>
              <input
                type="text"
                value={googleSheetsUrl}
                onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                placeholder="Paste Google Sheets URL here..."
                className="w-full bg-slate-800 text-white px-4 py-3 rounded-lg border border-white/10 mb-4"
              />
              <div className="flex gap-4">
                <button
                  onClick={handleGoogleSheetsImport}
                  disabled={isLoading}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg disabled:opacity-50"
                >
                  Import
                </button>
                <button
                  onClick={() => {
                    setShowGoogleSheetsModal(false);
                    setGoogleSheetsUrl('');
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Attendance;

