import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LmsAttendanceApi } from '../core/services';
import { CheckCircle, XCircle, Clock, Calendar, AlertCircle, RefreshCw } from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}
function fmtTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtDuration(min: number | null) {
  if (min == null) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Correction Request Modal ──────────────────────────────────────────────────
const CorrectionModal = ({
  record,
  onClose,
  onSubmit,
}: {
  record: any;
  onClose: () => void;
  onSubmit: (reason: string) => Promise<void>;
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (reason.trim().length < 5) return;
    setSubmitting(true);
    try {
      await onSubmit(reason.trim());
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Request Attendance Correction</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Class: <strong>{record.className}</strong> on {fmtDate(record.joinedAt)}
        </p>

        {done ? (
          <div className="text-center py-6">
            <CheckCircle className="mx-auto text-green-500 mb-3" size={40} />
            <p className="font-semibold text-gray-900 dark:text-white">Request Submitted!</p>
            <p className="text-sm text-gray-500 mt-1">The admin will review your request shortly.</p>
            <button
              onClick={onClose}
              className="mt-5 px-5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
              Reason <span className="font-normal text-gray-400">(min 5 chars)</span>
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you believe the attendance is incorrect..."
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={submitting || reason.trim().length < 5}
                onClick={handleSubmit}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Submitting…' : 'Submit Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Status Badge ──────────────────────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'PRESENT')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-700/50">
        <CheckCircle size={11} /> Present
      </span>
    );
  if (status === 'ABSENT')
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-700/50">
        <XCircle size={11} /> Absent
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-700/50">
      <Clock size={11} /> Pending
    </span>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const StudentAttendancePage = () => {
  const [correctionModal, setCorrectionModal] = useState<any>(null);

  const {
    data,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['myLmsAttendance'],
    queryFn: async () => {
      const res = await LmsAttendanceApi.getMyAttendance();
      return res?.data?.data || res?.data || { records: [], summary: {} };
    },
    refetchOnWindowFocus: true,
  });

  const records: any[] = data?.records || [];
  const summary = data?.summary || {};

  const handleRequestCorrection = async (attendanceId: string, reason: string) => {
    await LmsAttendanceApi.requestCorrection(attendanceId, reason);
    await refetch();
  };

  return (
    <div className="space-y-8 p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Live Class Attendance</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your attendance history for all live classes.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Classes</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{summary.totalClasses ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Submitted</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-green-200 dark:border-green-700/40 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-green-500 uppercase tracking-wide mb-2">Present</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400">{summary.presentCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Classes</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-700/40 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-red-500 uppercase tracking-wide mb-2">Absent</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.absentCount ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Classes</p>
        </div>
        <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-700/40 rounded-2xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-2">Attended</p>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{summary.totalHours ?? 0}h</p>
          <p className="text-xs text-gray-500 mt-1">Total hours</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Attendance Records</h2>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : records.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="mx-auto text-gray-300 dark:text-gray-600 mb-4" size={40} />
            <p className="text-gray-500 dark:text-gray-400 font-medium">No attendance records yet.</p>
            <p className="text-xs text-gray-400 mt-1">Join a live class and give attendance to see records here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Class</th>
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
                      <p className="font-medium text-gray-900 dark:text-white truncate max-w-[220px]">{r.className || '—'}</p>
                      {r.courseName && <p className="text-xs text-gray-400 truncate">{r.courseName}</p>}
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtDate(r.joinedAt)}</td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">{fmtTime(r.joinedAt)}</td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {r.attendanceSubmittedAt ? fmtTime(r.attendanceSubmittedAt) : <span className="text-gray-400 italic">Not given</span>}
                    </td>
                    <td className="px-4 py-4 text-gray-600 dark:text-gray-400">{fmtDuration(r.durationMinutes)}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={r.status} />
                        {r.manuallyMarked && (
                          <span className="text-[10px] text-indigo-500 dark:text-indigo-400">Admin corrected</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {r.status === 'ABSENT' && !r.correctionRequested && (
                        <button
                          onClick={() => setCorrectionModal(r)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-orange-300 dark:border-orange-700/50 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors whitespace-nowrap"
                        >
                          <AlertCircle size={12} />
                          Request Correction
                        </button>
                      )}
                      {r.correctionRequested && (
                        <span className="text-xs text-gray-400 italic">Requested</span>
                      )}
                      {r.status === 'PRESENT' && (
                        <span className="text-xs text-green-500">✓</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Correction Modal */}
      {correctionModal && (
        <CorrectionModal
          record={correctionModal}
          onClose={() => setCorrectionModal(null)}
          onSubmit={(reason) => handleRequestCorrection(correctionModal.id, reason)}
        />
      )}
    </div>
  );
};

export default StudentAttendancePage;
