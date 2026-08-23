import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardApi } from '../core/services';
import { LiveClassesApi, LiveSessionApi, LmsAttendanceApi } from '../core/services';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LivePulseBadge } from '../components/ui/LivePulseBadge';
import { CardGridSkeleton, CoursePlayerSkeleton } from '../components/ui/Skeleton';
import { Radio, Clock, Calendar, ArrowLeft, Video, Send, CheckCircle, AlertCircle, XCircle, ShieldCheck, ChevronDown } from 'lucide-react';

const CoursePlayer = React.lazy<React.ComponentType<{ courseId: string; initialClassId?: string; onBack: () => void }>>(() =>
  import('./CoursePlayer').then(m => ({ default: m.CoursePlayer }))
);

// ── Countdown helper ──────────────────────────────────────────────────────────
const useCountdown = (targetDate: string | null) => {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setText('Starting now'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return text;
};

// ── Status helpers ────────────────────────────────────────────────────────────
const isLiveStatus = (s: string) => ['LIVE', 'JOINING', 'HOST_CONNECTED', 'ATTENDANCE_RUNNING'].includes(s);
const isEndedStatus = (s: string) => ['ENDED', 'CANCELLED', 'EXPIRED', 'ARCHIVED', 'NOT_UPLOADED', 'RECORDED_AVAILABLE'].includes(s);

const PRESET_DAYS = [1, 2, 7, 14, 30];

// ── Prior Access Request Modal ────────────────────────────────────────────────
const PriorAccessRequestModal = ({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: { requestType: 'LIVE_SESSION'; days: number; reason: string }) => Promise<void>;
}) => {
  const [selectedPreset, setSelectedPreset] = useState<number | 'custom'>(7);
  const [customDays, setCustomDays] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const effectiveDays = selectedPreset === 'custom'
    ? parseInt(customDays, 10)
    : selectedPreset as number;

  const isValid =
    reason.trim().length >= 10 &&
    !isNaN(effectiveDays) &&
    effectiveDays >= 1 &&
    effectiveDays <= 365;

  const handleSubmit = async () => {
    setError('');
    if (!isValid) {
      if (!reason.trim() || reason.trim().length < 10) setError('Please enter a reason (at least 10 characters).');
      else if (isNaN(effectiveDays) || effectiveDays < 1) setError('Please select or enter a valid number of days (min 1).');
      else if (effectiveDays > 365) setError('Maximum allowed is 365 days.');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({ requestType: 'LIVE_SESSION', days: effectiveDays, reason: reason.trim() });
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to submit request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <ShieldCheck size={20} className="text-indigo-500" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Temporary Access</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">Admin will review and approve your request</p>
          </div>
        </div>

        {submitted ? (
          <div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 mb-4">
              <CheckCircle size={20} className="text-green-500 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300">Request Submitted!</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                  Your request for {effectiveDays} day(s) of live class access has been sent to the admin.
                </p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 text-xs text-amber-700 dark:text-amber-300">
              <strong>Need permanent access?</strong> Contact your coordinator or admin to request a batch type change (e.g., switch to Online or Recorded batch). Temporary access cannot be made permanent through this form.
            </div>
            <button onClick={onClose} className="mt-5 w-full py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors">
              Close
            </button>
          </div>
        ) : (
          <>

            {/* Duration */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">Duration</label>

              {/* Preset pills */}
              <div className="flex flex-wrap gap-2 mb-3">
                {PRESET_DAYS.map(d => (
                  <button
                    key={d}
                    onClick={() => { setSelectedPreset(d); setCustomDays(''); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      selectedPreset === d
                        ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-600 dark:text-indigo-400'
                        : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-indigo-500/30 hover:text-indigo-500'
                    }`}
                  >
                    {d === 1 ? '1 Day' : `${d} Days`}
                  </button>
                ))}
                <button
                  onClick={() => setSelectedPreset('custom')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                    selectedPreset === 'custom'
                      ? 'bg-orange-500/10 border-orange-500/40 text-orange-600 dark:text-orange-400'
                      : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-orange-500/30 hover:text-orange-500'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Manual entry — shown only when 'Custom' selected */}
              {selectedPreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={customDays}
                    onChange={e => setCustomDays(e.target.value)}
                    placeholder="Enter number of days"
                    className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">days (max 365)</span>
                </div>
              )}

              {/* Duration summary */}
              {!isNaN(effectiveDays) && effectiveDays >= 1 && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-2 font-medium">
                  ✓ Requesting access for <strong>{effectiveDays} day{effectiveDays > 1 ? 's' : ''}</strong>
                </p>
              )}
            </div>

            {/* Reason */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-2">
                Reason <span className="text-gray-400 font-normal normal-case">(min 10 chars)</span>
              </label>
              <textarea
                className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="E.g., I missed classes due to travel and need access for revision..."
                value={reason}
                onChange={e => setReason(e.target.value)}
                maxLength={600}
              />
              <p className="text-xs text-gray-400 text-right mt-0.5">{reason.length}/600</p>
            </div>

            {/* Permanent access notice */}
            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                <strong>Need permanent access?</strong> This form only grants temporary access. For permanent access, contact your coordinator to change your batch type to Online or Recorded.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 mb-4">
                <AlertCircle size={14} className="text-red-500 shrink-0" />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="py-2.5 px-6 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ flex: 2 }}
              >
                <Send size={14} />
                {submitting ? 'Sending...' : 'Send Request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};


// ── Request Access Modal ──────────────────────────────────────────────────────
const RequestAccessModal = ({
  cls,
  existingRequest,
  onClose,
  onSubmit,
}: {
  cls: any;
  existingRequest?: any;
  onClose: () => void;
  onSubmit: (classId: string, className: string, reason: string) => Promise<void>;
}) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // A rejected or revoked request allows re-submission — treat as non-blocking
  const isRejected = existingRequest?.status === 'REJECTED';
  const isRevoked = existingRequest?.status === 'REVOKED';
  const blockingRequest = existingRequest && !isRejected && !isRevoked ? existingRequest : null;

  const handleSubmit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(cls.classId || cls.id, cls.title || cls.className || 'Unknown Class', reason.trim());
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">Request Access</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Request access to <span className="font-semibold text-gray-800 dark:text-gray-100">{cls.title || cls.className}</span>
        </p>

        {/* Show rejection context above the re-request form */}
        {isRejected && !submitted && (
          <div className="flex items-start gap-3 p-3 rounded-lg mb-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700">
            <XCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">Previous request was rejected</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {existingRequest.adminNote ? `Admin note: ${existingRequest.adminNote}` : 'No reason was provided.'} You may submit a new request below.
              </p>
            </div>
          </div>
        )}

        {blockingRequest ? (
          <div className={`flex items-center gap-3 p-4 rounded-lg mb-4 ${
            blockingRequest.status === 'PENDING' ? 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700' :
            'bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700'
          }`}>
            {blockingRequest.status === 'PENDING' && <Clock size={18} className="text-yellow-500 shrink-0" />}
            {blockingRequest.status === 'APPROVED' && <CheckCircle size={18} className="text-green-500 shrink-0" />}
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Request {blockingRequest.status === 'PENDING' ? 'Pending Review' : 'Approved'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {blockingRequest.status === 'PENDING'
                  ? 'Your request is awaiting admin approval.'
                  : 'Access granted! Refresh to join.'}
              </p>
            </div>
          </div>
        ) : submitted ? (
          <div className="flex items-center gap-3 p-4 rounded-lg mb-4 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700">
            <CheckCircle size={18} className="text-green-500 shrink-0" />
            <p className="text-sm font-semibold text-green-700 dark:text-green-300">Request submitted! Admin will review it shortly.</p>
          </div>
        ) : (
          <>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRejected ? 'New reason for re-requesting access' : 'Reason for requesting access'}
            </label>
            <textarea
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="E.g., I am preparing for my exam and this class covers important topics..."
              value={reason}
              onChange={e => setReason(e.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right mt-1">{reason.length}/500</p>
          </>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg transition-colors"
          >
            {submitted || blockingRequest ? 'Close' : 'Cancel'}
          </button>
          {!submitted && !blockingRequest && (
            <button
              onClick={handleSubmit}
              disabled={submitting || !reason.trim()}
              className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={14} />
              {submitting ? 'Sending...' : isRejected ? 'Re-submit Request' : 'Send Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Session Card ──────────────────────────────────────────────────────────────
const SessionCard = ({
  cls,
  myRequests,
  onJoin,
  onRequestAccess,
  onAttendanceSubmitted,
}: {
  cls: any;
  myRequests: any[];
  onJoin: (courseId: string, classId: string) => void;
  onRequestAccess: (cls: any) => void;
  onAttendanceSubmitted: (result: { status: string; durationMinutes: number | null }) => void;
}) => {
  const rawStatus: string = cls.liveStatus || cls.status || 'SCHEDULED';

  // Client-side time-based override: if backend says SCHEDULED but time has passed → treat as ENDED
  const isTimedOutCard = (() => {
    if (rawStatus !== 'SCHEDULED' && rawStatus !== 'DRAFT') return false;
    const scheduledMs = cls.scheduledStartTime || cls.startTime || cls.scheduledAt
      ? new Date(cls.scheduledStartTime || cls.startTime || cls.scheduledAt).getTime()
      : 0;
    if (!scheduledMs) return false;
    const durationMs = (cls.expectedDurationMinutes || 60) * 60 * 1000;
    const graceMs = 10 * 60 * 1000;
    return Date.now() > scheduledMs + durationMs + graceMs;
  })();

  const liveStatus: string = isTimedOutCard ? 'ENDED' : rawStatus;
  const isScheduled = liveStatus === 'SCHEDULED' || liveStatus === 'DRAFT';
  const isLive = isLiveStatus(liveStatus);
  const isEnded = isEndedStatus(liveStatus) || isTimedOutCard;
  const startTime = cls.startTime || cls.scheduledAt || cls.scheduledStartTime || null;
  const countdown = useCountdown(isScheduled ? startTime : null);

  const [attRecord, setAttRecord] = React.useState<any>(null);
  const [givingAtt, setGivingAtt] = React.useState(false);
  const [hasJoined, setHasJoined] = React.useState(false);

  // Load existing attendance record for this class on mount — for all statuses
  React.useEffect(() => {
    const classId = cls.classId || cls.id;
    if (!classId) return;
    LmsAttendanceApi.getClassAttendance(classId)
      .then((res: any) => {
        const rec = res?.data?.data || res?.data || null;
        setAttRecord(rec);
        if (rec?.joinedAt) setHasJoined(true);
      })
      .catch(() => {});
  }, [cls.classId, cls.id]);

  const handleGiveAttendance = async () => {
    setGivingAtt(true);
    try {
      const res = await LmsAttendanceApi.submitAttendance(cls.classId || cls.id);
      const updated = res?.data?.data || res?.data;
      setAttRecord(updated);
      // Notify page level to show popup
      onAttendanceSubmitted({
        status: updated?.status || 'UNKNOWN',
        durationMinutes: updated?.durationMinutes ?? null,
      });
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to submit attendance.');
    } finally {
      setGivingAtt(false);
    }
  };

  // Existing request for this class (if any)
  const existingRequest = myRequests.find(
    (r: any) => r.contentId === (cls.classId || cls.id) && r.requestType === 'CLASS'
  );

  const formatBatchName = (name: string) => {
    if (!name) return '';
    return name.split(',').map(b => b.trim().length > 20 ? b.trim().substring(0, 8) + '...' : b.trim()).join(', ');
  };

  // Color theming
  const borderClass = isLive
    ? 'border-green-500/50 bg-green-500/5 dark:border-green-500/40 dark:bg-green-500/5'
    : isScheduled
    ? 'border-yellow-500/40 bg-yellow-500/5 dark:border-yellow-500/30 dark:bg-yellow-500/5'
    : isEnded
    ? 'border-red-500/30 bg-red-500/5 dark:border-red-500/20 dark:bg-red-500/5'
    : 'border-gray-200 dark:border-gray-700';

  const iconBg = isLive
    ? 'bg-green-500/15 text-green-500'
    : isScheduled
    ? 'bg-yellow-500/15 text-yellow-500'
    : isEnded
    ? 'bg-red-500/15 text-red-400'
    : 'bg-primary/10 text-primary';

  const getStatusDisplay = (): { text: string; variant: string; color: string } => {
    if (liveStatus === 'JOINING') return { text: 'Host Starting…', variant: 'destructive', color: 'text-green-400' };
    if (liveStatus === 'HOST_CONNECTED') return { text: 'Connecting…', variant: 'destructive', color: 'text-green-400' };
    if (isLive) return { text: '🟢 LIVE NOW', variant: 'destructive', color: 'text-green-400' };
    if (isScheduled) return { text: '🟡 UPCOMING', variant: 'default', color: 'text-yellow-400' };
    if (isEnded) return { text: '🔴 ENDED', variant: 'secondary', color: 'text-red-400' };
    return { text: liveStatus, variant: 'default', color: 'text-gray-400' };
  };

  const statusDisplay = getStatusDisplay();

  const canJoin = (cls.joinAllowed || existingRequest?.status === 'APPROVED') && !isEnded && !attRecord?.attendanceSubmittedAt;
  const accessDenied = !!cls.accessDenied && existingRequest?.status !== 'APPROVED';

  const renderRequestButton = (label: string) => {
    if (!accessDenied) return null;
    if (existingRequest) {
      return (
        <button
          onClick={() => onRequestAccess(cls)}
          className={`w-full py-2 px-4 text-center text-xs rounded-lg border flex items-center justify-center gap-2 ${
            existingRequest.status === 'PENDING' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' :
            existingRequest.status === 'APPROVED' ? 'text-green-400 bg-green-500/10 border-green-500/20' :
            'text-red-400 bg-red-500/10 border-red-500/20'
          }`}
        >
          {existingRequest.status === 'PENDING' && <><Clock size={11} /> Request Pending</>}
          {existingRequest.status === 'APPROVED' && <><CheckCircle size={11} /> Access Approved</>}
          {existingRequest.status === 'REJECTED' && <><AlertCircle size={11} /> Request Rejected — Click to re-request</>}
          {existingRequest.status === 'REVOKED' && <><AlertCircle size={11} /> Access Reverted — Click to re-request</>}
        </button>
      );
    }
    return (
      <button
        className="w-full py-2 px-4 text-center text-xs font-semibold rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-2"
        onClick={() => onRequestAccess(cls)}
      >
        <Send size={12} />
        {label}
      </button>
    );
  };

  return (
    <Card className={`transition-all duration-200 hover:scale-[1.01] ${borderClass}`}>
      <CardContent className="p-6 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-lg ${iconBg}`}>
            <Radio size={22} />
          </div>
          <div className="flex items-center gap-2">
            {isLive && <LivePulseBadge />}
            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
              isLive ? 'bg-green-500/10 border-green-500/30 text-green-400' :
              isScheduled ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400' :
              'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {statusDisplay.text}
            </span>
          </div>
        </div>

        {/* Title & meta */}
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 leading-snug">{cls.title || cls.className}</h3>
          <div className="flex flex-wrap gap-2 items-center my-1.5">
            {cls.courseName && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Course: {cls.courseName}
              </span>
            )}
            {cls.batchName && (
              <div className="text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                Batch: {formatBatchName(cls.batchName)}
              </div>
            )}
            {accessDenied && (
              <div className="text-xs bg-orange-500/15 text-orange-600 dark:text-orange-400 px-2 py-1 rounded border border-orange-500/20">
                🔒 Access Restricted
              </div>
            )}
          </div>
          {cls.subjectName && (
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">{cls.subjectName}</p>
          )}
        </div>

        {/* Time info */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          {isScheduled && countdown ? (
            <><Clock size={12} className="text-yellow-400" /><span className="text-yellow-400 font-medium">Starts in {countdown}</span></>
          ) : startTime ? (
            <><Calendar size={12} /><span>{new Date(startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></>
          ) : null}
          {cls.provider && (
            <><span className="mx-1">·</span><Video size={12} /><span className="capitalize">{cls.provider === 'zoom' ? 'Zoom Live' : cls.provider}</span></>
          )}
        </div>

        {/* ── Action Area ── */}

        {/* LIVE — has access */}
        {isLive && !accessDenied && (
          <div className="mt-4 space-y-2">
            {/* Join Now — always available so student can rejoin Zoom if disconnected */}
            {canJoin && (
              <button
                id={`join-live-${cls.courseId || cls.id}`}
                className="w-full py-2.5 px-4 text-white text-sm font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2"
                style={{ backgroundColor: '#16a34a', boxShadow: '0 10px 15px -3px rgba(22, 163, 74, 0.3)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
                onClick={() => { setHasJoined(true); onJoin(cls.courseId || cls.id, cls.classId || cls.id); }}
              >
                <Video size={16} />
                {hasJoined || attRecord?.joinedAt ? 'Rejoin Class' : 'Join Now'}
              </button>
            )}

            {/* Joined indicator */}
            {(hasJoined || attRecord?.joinedAt) && !attRecord?.attendanceSubmittedAt && (
              <div className="w-full py-2 px-4 text-center text-xs font-semibold rounded-lg bg-green-50 border border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400 flex items-center justify-center gap-2">
                <CheckCircle size={13} /> Attendance marked — your presence is recorded
              </div>
            )}

            {/* Already closed (attendance finalized by admin) */}
            {attRecord?.attendanceSubmittedAt && (
              <div className={`w-full py-2 px-4 text-center text-xs font-semibold rounded-lg border ${
                attRecord.status === 'PRESENT'
                  ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                  : 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
              }`}>
                {attRecord.status === 'PRESENT' ? '✅ Present' : '❌ Absent'}
                {attRecord.durationMinutes != null && (
                  <span className="ml-2 font-normal opacity-75">({attRecord.durationMinutes} min)</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* LIVE — attendance given (duplicate guard kept for safety) */}



        {/* LIVE — access denied */}
        {isLive && accessDenied && (
          <div className="space-y-2 mt-4">
            <div className="w-full py-2 px-4 text-center text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-lg dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-700/50">
              🔒 You don't have access to this live class
            </div>
            {renderRequestButton('Request Live Class Access')}
          </div>
        )}

        {/* SCHEDULED — has access, waiting for start */}
        {isScheduled && !accessDenied && (
          <div className="space-y-2 mt-4">
            <div className="w-full py-2 px-4 text-center text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-300 rounded-lg dark:text-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-700/50">
              Available at start time
            </div>
          </div>
        )}

        {/* SCHEDULED — access denied */}
        {isScheduled && accessDenied && (
          <div className="space-y-2 mt-4">
            <div className="w-full py-2 px-4 text-center text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-lg dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-700/50">
              🔒 Access restricted for your batch
            </div>
            {renderRequestButton('Request Access for This Class')}
          </div>
        )}

        {/* ENDED — has access */}
        {isEnded && !accessDenied && (
          <div className="space-y-2 mt-2">
            <div className="w-full py-2 px-4 text-center text-xs text-red-400/80 bg-red-500/10 border border-red-500/20 rounded-lg">
              Session ended
            </div>
            {/* Show attendance outcome if submitted */}
            {attRecord?.attendanceSubmittedAt && (
              <div className={`w-full py-2 px-4 text-center text-xs font-semibold rounded-lg border ${
                attRecord.status === 'PRESENT'
                  ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-700 dark:text-green-400'
                  : 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-400'
              }`}>
                {attRecord.status === 'PRESENT' ? '✅ Present' : '❌ Absent'}
                {attRecord.durationMinutes != null && (
                  <span className="ml-1 font-normal opacity-75">— {attRecord.durationMinutes} min attended</span>
                )}
                {attRecord.thresholdMinutes != null && (
                  <span className="ml-1 font-normal opacity-60">(threshold: {attRecord.thresholdMinutes}m)</span>
                )}
                {attRecord.manualNote && (
                  <div className="text-[10px] mt-0.5 opacity-60 italic">{attRecord.manualNote}</div>
                )}
              </div>
            )}
            {/* Joined but never submitted — class already ended */}
            {attRecord?.joinedAt && !attRecord?.attendanceSubmittedAt && (
              <div className="w-full py-2 px-4 text-center text-xs text-orange-500 bg-orange-50 border border-orange-200 rounded-lg dark:bg-orange-900/20 dark:border-orange-700/50">
                ⚠️ You joined but did not give attendance
              </div>
            )}
            {/* Correction request */}
            {attRecord?.attendanceSubmittedAt && attRecord?.status === 'ABSENT' && !attRecord?.correctionRequested && (
              <button
                onClick={() => onRequestAccess(cls)}
                className="w-full py-2 px-3 text-xs font-medium rounded-lg border border-orange-400/50 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 hover:bg-orange-100 transition-colors"
              >
                Request Attendance Correction
              </button>
            )}
            {attRecord?.correctionRequested && (
              <div className="text-xs text-center text-gray-500 dark:text-gray-400">Correction request submitted</div>
            )}
          </div>
        )}

        {/* ENDED — access denied (recording locked) */}
        {isEnded && accessDenied && (
          <div className="space-y-2 mt-4">
            <div className="w-full py-2 px-4 text-center text-xs font-medium text-orange-700 bg-orange-100 border border-orange-300 rounded-lg dark:text-orange-400 dark:bg-orange-900/30 dark:border-orange-700/50">
              🔒 Recording access restricted for your batch
            </div>
            {renderRequestButton('Request Recording Access')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const StudentLiveClassesPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [initialClassId, setInitialClassId] = useState<string | null>(null);
  const [requestModal, setRequestModal] = useState<{ cls: any } | null>(null);
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [showPriorAccessModal, setShowPriorAccessModal] = useState(false);
  const [attPopup, setAttPopup] = useState<{ status: string; durationMinutes: number | null } | null>(null);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'live' | 'ended'>('upcoming');
  const [expandedCourses, setExpandedCourses] = useState<Record<string, boolean>>({});
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const res = await LiveClassesApi.getStudentLiveSessions();
      return { liveClasses: res.data?.data || res.data || [] };
    },
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  // Load my access requests once
  useEffect(() => {
    LiveClassesApi.getMyAccessRequests()
      .then((res: any) => {
        const data = res?.data?.data || res?.data || [];
        setMyRequests(Array.isArray(data) ? data : []);
      })
      .catch(() => {});
  }, []);

  const classes = dashboardData?.liveClasses || [];

  const handleRequestAccess = async (classId: string, className: string, reason: string) => {
    await LiveClassesApi.requestLiveClassAccess(classId, className, reason);
    // Refresh my requests list
    const res = await LiveClassesApi.getMyAccessRequests() as any;
    const data = res?.data?.data || res?.data || [];
    setMyRequests(Array.isArray(data) ? data : []);
    // Invalidate live sessions so accessDenied is re-evaluated from server
    queryClient.invalidateQueries({ queryKey: ['studentDashboard'] });
  };

  const handlePriorAccessSubmit = async (data: { requestType: 'LIVE_SESSION'; days: number; reason: string }) => {
    await LiveClassesApi.requestTemporaryAccess({
      requestType: 'LIVE_SESSION',
      contentId: 'general',
      contentName: 'General Live Class Access',
      reason: data.reason,
      requestedDays: data.days,
    });
    const res = await LiveClassesApi.getMyAccessRequests() as any;
    const d = res?.data?.data || res?.data || [];
    setMyRequests(Array.isArray(d) ? d : []);
  };


  const handleJoinClass = async (courseId: string | null, classId: string, cls?: any) => {
    try {
      let launched = false;
      try {
        const tokenRes = await LiveSessionApi.generateJoinToken(classId);
        const token = tokenRes.data?.token || tokenRes.token;
        if (token) {
          const baseOrigin = typeof window !== "undefined" ? window.location.origin : "https://nermaiiasacademy-519c8.web.app";
          
          let apiBase = "https://nermaiiasacademy-519c8.web.app/api";
          if (typeof window !== "undefined" && window.location && window.location.hostname) {
            const hostname = window.location.hostname;
            if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.") || hostname.startsWith("172.")) {
              apiBase = `http://${hostname}:5000/api`;
            } else {
              apiBase = `https://${hostname}/api`;
            }
          }
          const apiUrl = encodeURIComponent(apiBase.replace(/\/api$/, ""));
          
          const popupUrl = `${baseOrigin}/meeting-hosts/zoom-client-launch.html?token=${encodeURIComponent(token)}&sessionId=${encodeURIComponent(classId)}&apiUrl=${apiUrl}`;
          if (typeof window !== "undefined") {
            window.open(popupUrl, "nermai-meeting", "width=1280,height=760,menubar=no,toolbar=no,location=no,status=no,resizable=yes");
          }
          launched = true;
          // Silent: record join timestamp for attendance
          if (cls) {
            LmsAttendanceApi.recordJoin(
              cls.classId || classId,
              cls.title || cls.className || '',
              cls.courseId || '',
              cls.courseName || '',
              cls.batchName || ''
            ).catch(() => {});
            
            // Also register with the real-time Live Attendance module (LAMS)
            // It safely returns 200 if no active session is running yet.
            const liveSessionIdForLams = cls.sessionId || cls.id || classId;
            import('../core/services').then(({ LiveAttendanceApi }) => {
               LiveAttendanceApi.studentJoin(liveSessionIdForLams).catch(() => {});
            }).catch(() => {});
          }
        }

      } catch (tokErr) {
        console.warn("Join token resolution failed, checking join API:", tokErr);
      }

      if (launched) return;

      const res = await LiveSessionApi.joinSession(classId);
      const payload = res?.data?.data || res?.data || res;

      if (payload?.waiting) {
        alert("The instructor has not started this live session yet. Please try again once the class starts.");
        return;
      }

      const launchUrl = payload?.joinUrl || payload?.join_url || payload?.meetUrl || payload?.url || payload?.sdk?.joinUrl || payload?.sdk?.join_url || (payload?.videoId ? `https://www.youtube.com/watch?v=${payload.videoId}` : null);

      if (launchUrl) {
        if (typeof window !== "undefined") {
          window.open(launchUrl, "_blank");
        }
      } else {
        alert("The live meeting link is pending. Please wait for the instructor to start.");
      }
    } catch (err: any) {
      console.error("Failed to join session:", err);
      alert(err.response?.data?.message || err.message || "Failed to join live session.");
    }
  };

  const live = classes.filter((c: any) => isLiveStatus(c.liveStatus || c.status));

  // Default to live tab if there are live classes and we haven't manually changed tabs
  useEffect(() => {
    if (live.length > 0 && activeTab === 'upcoming') {
      setActiveTab('live');
    }
  }, [live.length]);

  // ── CoursePlayer view removed for popup ──

  // Client-side time-based ended override:
  // If a class is SCHEDULED but its scheduled time + expected duration + 10-min grace
  // has already passed, treat it as ENDED regardless of what the backend says.
  const isTimedOut = (c: any): boolean => {
    const s = c.liveStatus || c.status || 'SCHEDULED';
    if (s !== 'SCHEDULED' && s !== 'DRAFT') return false;
    const scheduledMs = c.scheduledStartTime || c.startTime || c.scheduledAt
      ? new Date(c.scheduledStartTime || c.startTime || c.scheduledAt).getTime()
      : 0;
    if (!scheduledMs) return false;
    const durationMs = (c.expectedDurationMinutes || 60) * 60 * 1000;
    const graceMs = 10 * 60 * 1000;
    return Date.now() > scheduledMs + durationMs + graceMs;
  };

  const upcoming = classes.filter((c: any) => {
    const s = c.liveStatus || c.status || 'SCHEDULED';
    return (s === 'SCHEDULED' || s === 'DRAFT') && !isLiveStatus(s) && !isTimedOut(c);
  });
  const ended = classes.filter((c: any) => isEndedStatus(c.liveStatus || c.status) || isTimedOut(c));

  const endedCoursesMap = new Map();
  const endedUnassigned: any[] = [];

  ended.forEach((cls: any) => {
    const courseId = cls.courseId;
    const subjectId = cls.subjectId || 'unassigned_subject';
    const topicId = cls.topicId || 'unassigned_topic';

    if (!courseId) {
      endedUnassigned.push(cls);
      return;
    }

    if (!endedCoursesMap.has(courseId)) {
      endedCoursesMap.set(courseId, {
        id: courseId,
        title: cls.courseName || 'Unknown Course',
        subjects: new Map()
      });
    }
    const courseNode = endedCoursesMap.get(courseId);

    if (!courseNode.subjects.has(subjectId)) {
      courseNode.subjects.set(subjectId, {
        id: subjectId,
        title: subjectId === 'unassigned_subject' ? 'Unassigned Subject' : (cls.subjectName || 'Unknown Subject'),
        topics: new Map()
      });
    }
    const subjectNode = courseNode.subjects.get(subjectId);

    if (!subjectNode.topics.has(topicId)) {
      subjectNode.topics.set(topicId, {
        id: topicId,
        title: topicId === 'unassigned_topic' ? 'Unassigned Topic' : (cls.topicName || 'Unknown Topic'),
        classes: []
      });
    }
    subjectNode.topics.get(topicId).classes.push(cls);
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <PageHeader
          title="Live Classes"
          description="Join ongoing or upcoming live sessions."
        />
        {/* Prior Access Request Banner Button */}
        <button
          id="prior-access-request-btn"
          onClick={() => setShowPriorAccessModal(true)}
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-indigo-300 dark:border-indigo-700/60 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-all shadow-sm"
        >
          <ShieldCheck size={16} />
          Request Temporary Access
        </button>
      </div>

      {loading ? (
        <CardGridSkeleton count={4} />
      ) : classes.length === 0 ? (
        <div className="p-12 border border-dashed border-gray-250 dark:border-gray-700 rounded-2xl text-center">
          <Radio className="mx-auto text-gray-500 dark:text-gray-400 mb-4 w-12 h-12" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">No Live Classes</h3>
          <p className="text-gray-500 dark:text-gray-400 mt-1">There are no live classes at this time.</p>
        </div>
      ) : (
        <div>
          {/* Tabs */}
          <div className="flex flex-wrap gap-3 mb-8">
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                activeTab === 'upcoming' 
                  ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700/50' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}
            >
              Upcoming Classes
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'upcoming' ? 'bg-yellow-200 text-yellow-900 dark:bg-yellow-800 dark:text-yellow-100' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                {upcoming.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                activeTab === 'live' 
                  ? 'bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700/50' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}
            >
              Live Now
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'live' ? 'bg-green-200 text-green-900 dark:bg-green-800 dark:text-green-100' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                {live.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('ended')}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
                activeTab === 'ended' 
                  ? 'bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/50 dark:text-red-300 dark:border-red-700/50' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
              }`}
            >
              Ended Classes
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'ended' ? 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
                {ended.length}
              </span>
            </button>
          </div>

          <div className="space-y-8">
            {activeTab === 'live' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {live.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-500 italic">No live classes right now.</div>
                ) : (
                  live.map((cls: any, i: number) => (
                    <SessionCard
                      key={i}
                      cls={cls}
                      myRequests={myRequests}
                      onJoin={() => handleJoinClass(cls.courseId, cls.sessionId || cls.id, cls)}
                      onRequestAccess={(c) => setRequestModal({ cls: c })}
                      onAttendanceSubmitted={setAttPopup}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'upcoming' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {upcoming.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-gray-500 italic">No upcoming classes.</div>
                ) : (
                  upcoming.map((cls: any, i: number) => (
                    <SessionCard
                      key={i}
                      cls={cls}
                      myRequests={myRequests}
                      onJoin={() => handleJoinClass(cls.courseId, cls.sessionId || cls.id, cls)}
                      onRequestAccess={(c) => setRequestModal({ cls: c })}
                      onAttendanceSubmitted={setAttPopup}
                    />
                  ))
                )}
              </div>
            )}

            {activeTab === 'ended' && (
              <div className="space-y-4">
                {ended.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 italic">No ended classes.</div>
                ) : (
                  <>
                    {Array.from(endedCoursesMap.values()).map(courseNode => {
                      const isCourseExpanded = expandedCourses[courseNode.id] !== false;
                      return (
                        <div key={courseNode.id} className="space-y-3">
                          <button
                            onClick={() => setExpandedCourses(prev => ({ ...prev, [courseNode.id]: !isCourseExpanded }))}
                            className="w-full flex justify-between items-center bg-gray-100 dark:bg-gray-800 p-3 rounded-lg"
                          >
                            <span className="font-bold text-gray-900 dark:text-white">📚 {courseNode.title}</span>
                            <span className="text-gray-500">{isCourseExpanded ? '▲' : '▼'}</span>
                          </button>

                          {isCourseExpanded && (
                            <div className="pl-4 ml-2 border-l-2 border-gray-200 dark:border-gray-700 space-y-3">
                              {Array.from(courseNode.subjects.values()).map((subjectNode: any) => {
                                const isSubjectExpanded = expandedSubjects[subjectNode.id] !== false;
                                return (
                                  <div key={subjectNode.id} className="space-y-3">
                                    <button
                                      onClick={() => setExpandedSubjects(prev => ({ ...prev, [subjectNode.id]: !isSubjectExpanded }))}
                                      className="w-full flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg"
                                    >
                                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200">📘 {subjectNode.title}</span>
                                      <span className="text-gray-500 text-sm">{isSubjectExpanded ? '▲' : '▼'}</span>
                                    </button>

                                    {isSubjectExpanded && (
                                      <div className="pl-4 pt-2">
                                        {Array.from(subjectNode.topics.values()).map((topicNode: any) => (
                                          <div key={topicNode.id} className="mb-4">
                                            <h4 className="text-xs font-bold text-red-500 mb-2 uppercase">{topicNode.title}</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                              {topicNode.classes.map((c: any) => (
                                                <SessionCard
                                                  key={c.id}
                                                  cls={c}
                                                  myRequests={myRequests}
                                                  onJoin={() => handleJoinClass(c.courseId, c.sessionId || c.id, c)}
                                                  onRequestAccess={(clsObj) => setRequestModal({ cls: clsObj })}
                                                  onAttendanceSubmitted={setAttPopup}
                                                />
                                              ))}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {endedUnassigned.length > 0 && (
                      <div className="space-y-3">
                        <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg flex items-center justify-between">
                          <span className="font-bold text-gray-900 dark:text-white">❓ Unassigned Classes</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                          {endedUnassigned.map((cls: any) => (
                            <SessionCard
                              key={cls.id}
                              cls={cls}
                              myRequests={myRequests}
                              onJoin={() => handleJoinClass(cls.courseId, cls.sessionId || cls.id)}
                              onRequestAccess={(c) => setRequestModal({ cls: c })}
                              onAttendanceSubmitted={setAttPopup}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Request Access Modal (per-class) */}
      {requestModal && (
        <RequestAccessModal
          cls={requestModal.cls}
          existingRequest={myRequests.find(
            (r: any) => r.contentId === (requestModal.cls.classId || requestModal.cls.id) && r.requestType === 'CLASS'
          )}
          onClose={() => setRequestModal(null)}
          onSubmit={handleRequestAccess}
        />
      )}

      {/* Prior Access Request Modal (general temporary access) */}
      {showPriorAccessModal && (
        <PriorAccessRequestModal
          onClose={() => setShowPriorAccessModal(false)}
          onSubmit={handlePriorAccessSubmit}
        />
      )}
      {/* Attendance Submitted Popup — rendered at page root for correct fixed positioning */}
      {attPopup && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setAttPopup(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-5xl mb-3">{attPopup.status === 'PRESENT' ? '✅' : '❌'}</div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
              {attPopup.status === 'PRESENT' ? 'Attendance Recorded!' : 'Marked Absent'}
            </h3>
            {attPopup.durationMinutes != null && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                You attended for{' '}
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {attPopup.durationMinutes} minute{attPopup.durationMinutes !== 1 ? 's' : ''}
                </span>
              </p>
            )}
            <p className={`text-xs font-semibold mt-1 mb-4 ${
              attPopup.status === 'PRESENT' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
            }`}>
              {attPopup.status === 'PRESENT'
                ? 'You have met the minimum attendance requirement.'
                : 'You did not meet the minimum attendance threshold.'}
            </p>
            <button
              onClick={() => setAttPopup(null)}
              className="w-full py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
