import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LmsAttendanceApi } from '../core/services';
import {
  CheckCircle, XCircle, Clock, RefreshCw, Search, Filter,
  AlertCircle, User, BookOpen, Calendar, SlidersHorizontal,
  ShieldCheck, ChevronDown, ChevronUp, Lock
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
function fmtDuration(min: number | null) {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)}h ${min % 60 > 0 ? `${min % 60}m` : ''}`;
}

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'PRESENT')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700/50"><CheckCircle size={11} /> Present</span>;
  if (status === 'ABSENT')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-700/50"><XCircle size={11} /> Absent</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700/50"><Clock size={11} /> Pending</span>;
};

// ── Manual Mark Modal ─────────────────────────────────────────────────────────
const ManualMarkModal = ({
  record,
  onClose,
  onSave,
}: {
  record: any;
  onClose: () => void;
  onSave: (status: 'PRESENT' | 'ABSENT', note: string) => Promise<void>;
}) => {
  const [status, setStatus] = useState<'PRESENT' | 'ABSENT'>(record.status === 'PRESENT' ? 'PRESENT' : 'ABSENT');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Manual Attendance Mark</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          Student: <strong>{record.studentName}</strong> · Class: <strong>{record.className}</strong>
        </p>

        <div className="flex gap-3 mb-4">
          {(['PRESENT', 'ABSENT'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border-2 transition-all ${
                status === s
                  ? s === 'PRESENT'
                    ? 'bg-green-50 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-red-50 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                  : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
              }`}
            >
              {s === 'PRESENT' ? '✅ Present' : '❌ Absent'}
            </button>
          ))}
        </div>

        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
          Admin Note (optional)
        </label>
        <textarea
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Reason for manual override..."
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-4"
        />

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try { await onSave(status, note); onClose(); }
              finally { setSaving(false); }
            }}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const AdminAttendancePage = () => {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'records' | 'corrections'>('records');
  const [filters, setFilters] = useState({ studentName: '', className: '', batchName: '', status: 'ALL', dateFrom: '', dateTo: '' });
  const [showFilters, setShowFilters] = useState(false);
  const [markModal, setMarkModal] = useState<any>(null);
  const [correctionNote, setCorrectionNote] = useState<Record<string, string>>({});
  const [closingClassId, setClosingClassId] = useState<string | null>(null);

  // Records query
  const { data: recordsData, isLoading: loadingRecords, refetch: refetchRecords } = useQuery({
    queryKey: ['adminLmsAttendance', filters],
    queryFn: async () => {
      const params: any = {};
      if (filters.studentName) params.studentName = filters.studentName;
      if (filters.className) params.className = filters.className;
      if (filters.batchName) params.batchName = filters.batchName;
      if (filters.status !== 'ALL') params.status = filters.status;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      const res = await LmsAttendanceApi.adminGetRecords(params);
      return res?.data?.data || res?.data || [];
    },
    enabled: tab === 'records',
  });

  // Corrections query
  const { data: corrections = [], isLoading: loadingCorrections, refetch: refetchCorrections } = useQuery({
    queryKey: ['adminLmsCorrections'],
    queryFn: async () => {
      const res = await LmsAttendanceApi.adminGetCorrections();
      return res?.data?.data || res?.data || [];
    },
    enabled: tab === 'corrections',
  });

  const records: any[] = recordsData || [];

  const handleManualMark = async (id: string, status: 'PRESENT' | 'ABSENT', note: string) => {
    await LmsAttendanceApi.adminMarkManual(id, status, note);
    refetchRecords();
  };

  const handleReviewCorrection = async (id: string, approve: boolean) => {
    const note = correctionNote[id] || '';
    await LmsAttendanceApi.adminReviewCorrection(id, approve, note);
    refetchCorrections();
    qc.invalidateQueries({ queryKey: ['adminLmsAttendance'] });
  };

  const handleCloseAttendance = async (classId: string) => {
    if (!window.confirm(`Auto-mark all pending (joined but not submitted) attendance for this class as ABSENT?\n\nThis cannot be undone.`)) return;
    setClosingClassId(classId);
    try {
      const res = await LmsAttendanceApi.adminCloseClassAttendance(classId);
      const count = res?.data?.data?.closedCount ?? 0;
      alert(`Done! ${count} pending record(s) were auto-marked.`);
      refetchRecords();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to close attendance.');
    } finally {
      setClosingClassId(null);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Live Class Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage and review all student attendance records.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Close Attendance for a class — quick action */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Class ID to close…"
              id="close-att-classid"
              className="px-3 py-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400/50 w-44"
            />
            <button
              onClick={() => {
                const input = document.getElementById('close-att-classid') as HTMLInputElement;
                const id = input?.value?.trim();
                if (!id) { alert('Enter a Class ID first.'); return; }
                handleCloseAttendance(id);
              }}
              disabled={!!closingClassId}
              title="Auto-mark all pending students as ABSENT for this class"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 dark:border-red-700/50 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <Lock size={12} />
              {closingClassId ? 'Closing…' : 'Close Attendance'}
            </button>
          </div>
          <button
            onClick={() => { refetchRecords(); refetchCorrections(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        {([['records', 'Attendance Records'], ['corrections', 'Correction Requests']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {label}
            {key === 'corrections' && (corrections as any[]).filter((c: any) => c.status === 'PENDING').length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold bg-orange-500 text-white rounded-full">
                {(corrections as any[]).filter((c: any) => c.status === 'PENDING').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── RECORDS TAB ── */}
      {tab === 'records' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          {/* Filters bar */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    value={filters.studentName}
                    onChange={(e) => setFilters(f => ({ ...f, studentName: e.target.value }))}
                    placeholder="Search student…"
                    className="pl-9 pr-3 py-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="relative flex-1 max-w-xs">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    value={filters.className}
                    onChange={(e) => setFilters(f => ({ ...f, className: e.target.value }))}
                    placeholder="Search class…"
                    className="pl-9 pr-3 py-2 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
                  className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All Status</option>
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
              <button
                onClick={() => setShowFilters(v => !v)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <SlidersHorizontal size={14} />
                More Filters
                {showFilters ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
            </div>

            {showFilters && (
              <div className="flex flex-wrap gap-3 pt-2">
                <input
                  value={filters.batchName}
                  onChange={(e) => setFilters(f => ({ ...f, batchName: e.target.value }))}
                  placeholder="Filter by batch…"
                  className="flex-1 min-w-[160px] max-w-xs py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                  className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                  className="py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={() => setFilters({ studentName: '', className: '', batchName: '', status: 'ALL', dateFrom: '', dateTo: '' })}
                  className="px-3 py-2 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {/* Records Table */}
          {loadingRecords ? (
            <div className="py-12 text-center text-gray-400">Loading attendance records…</div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={36} />
              <p className="text-gray-500 dark:text-gray-400">No records found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Student</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Class</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Joined</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Submitted</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Duration</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {records.map((r: any) => (
                    <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                            <User size={14} className="text-indigo-600 dark:text-indigo-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white text-xs">{r.studentName || r.studentId}</p>
                            {r.batchName && <p className="text-[10px] text-gray-400">{r.batchName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900 dark:text-white text-xs max-w-[160px] truncate">{r.className || '—'}</p>
                        {r.courseName && <p className="text-[10px] text-gray-400 truncate max-w-[160px]">{r.courseName}</p>}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtDate(r.joinedAt)}</td>
                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{fmtTime(r.joinedAt)}</td>
                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {r.attendanceSubmittedAt ? fmtTime(r.attendanceSubmittedAt) : <span className="italic text-gray-300 dark:text-gray-600">—</span>}
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 dark:text-gray-400">
                        {fmtDuration(r.durationMinutes)}
                        {r.thresholdMinutes != null && (
                          <span className="ml-1 text-[10px] text-gray-400 dark:text-gray-500">(≥{r.thresholdMinutes}m)</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1">
                          <StatusBadge status={r.status} />
                          {r.manuallyMarked && <span className="text-[10px] text-indigo-500">Admin corrected</span>}
                          {r.correctionRequested && <span className="text-[10px] text-orange-500">Correction req.</span>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => setMarkModal(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-indigo-300 dark:border-indigo-700/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors whitespace-nowrap"
                        >
                          <ShieldCheck size={12} />
                          Mark
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="px-6 py-3 text-xs text-gray-400 border-t border-gray-100 dark:border-white/5">
                {records.length} record{records.length !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CORRECTIONS TAB ── */}
      {tab === 'corrections' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Student Correction Requests</h2>
            <p className="text-xs text-gray-400 mt-0.5">Students who believe their attendance is incorrect can request a review.</p>
          </div>

          {loadingCorrections ? (
            <div className="py-12 text-center text-gray-400">Loading…</div>
          ) : (corrections as any[]).length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={36} />
              <p className="text-gray-500 dark:text-gray-400">No correction requests.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-white/5">
              {(corrections as any[]).map((c: any) => (
                <div key={c.id} className="p-6 hover:bg-gray-50/50 dark:hover:bg-white/3 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">{c.studentName}</span>
                        {c.status === 'PENDING' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-700/50">PENDING</span>
                        )}
                        {c.status === 'APPROVED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700/50">APPROVED</span>
                        )}
                        {c.status === 'REJECTED' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700">REJECTED</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Class: <strong className="text-gray-700 dark:text-gray-300">{c.className}</strong> · {fmtDate(c.joinedAt)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Joined {fmtTime(c.joinedAt)} → Submitted {fmtTime(c.attendanceSubmittedAt)} · Duration: {fmtDuration(c.durationMinutes)} · Was: <strong className={c.currentStatus === 'ABSENT' ? 'text-red-500' : 'text-green-500'}>{c.currentStatus}</strong>
                      </p>
                      <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-700/30 rounded-xl">
                        <p className="text-xs text-orange-700 dark:text-orange-300">
                          <strong>Student's reason:</strong> {c.reason}
                        </p>
                      </div>
                      {c.adminNote && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                          <strong>Admin note:</strong> {c.adminNote}
                        </p>
                      )}
                    </div>

                    {c.status === 'PENDING' && (
                      <div className="flex flex-col gap-2 min-w-[220px]">
                        <textarea
                          rows={2}
                          value={correctionNote[c.id] || ''}
                          onChange={(e) => setCorrectionNote(n => ({ ...n, [c.id]: e.target.value }))}
                          placeholder="Optional note to student…"
                          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs p-2 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewCorrection(c.id, true)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-green-600 text-white hover:bg-green-700 transition-colors"
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => handleReviewCorrection(c.id, false)}
                            className="flex-1 py-2 rounded-xl text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                          >
                            ❌ Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual Mark Modal */}
      {markModal && (
        <ManualMarkModal
          record={markModal}
          onClose={() => setMarkModal(null)}
          onSave={(status, note) => handleManualMark(markModal.id, status, note)}
        />
      )}
    </div>
  );
};

export default AdminAttendancePage;
