import React, { useState, useEffect, useCallback } from 'react';
import { useLiveSessionContext } from '../context/LiveSessionContext';
import { ArrowLeft, Clock, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LiveSessionApi } from '@nermai/api';
import { meetingLauncher } from '../services/MeetingLauncherService';

// ── Attendance Timer ──────────────────────────────────────────────────────────

const AttendanceTimer: React.FC<{ startedAt: string; durationMs?: number }> = ({ startedAt, durationMs = 300000 }) => {
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const calculateTime = () => {
      const start = new Date(startedAt).getTime();
      const now = Date.now();
      const elapsed = now - start;
      const remaining = Math.max(0, durationMs - elapsed);
      setTimeLeft(remaining);
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [startedAt, durationMs]);

  const mins = Math.floor(timeLeft / 60000);
  const secs = Math.floor((timeLeft % 60000) / 1000);

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-blue-900/40 border border-blue-500/30 text-blue-300 rounded-full text-sm font-medium animate-pulse ml-4">
      <Clock size={16} />
      <span>Attendance</span>
      <span className="opacity-50">|</span>
      <span className="font-mono">{mins}:{secs.toString().padStart(2, '0')}</span>
    </div>
  );
};

// ── End Session Confirm Modal ─────────────────────────────────────────────────

const EndSessionModal: React.FC<{
  onConfirm: () => void;
  onCancel: () => void;
  isEnding: boolean;
  hasAttendanceRunning: boolean;
}> = ({ onConfirm, onCancel, isEnding, hasAttendanceRunning }) => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
      <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mb-4">
        <span className="text-red-400 text-lg">!</span>
      </div>
      <h3 className="text-lg font-bold text-white mb-2">End Session for Everyone?</h3>
      <p className="text-sm text-gray-400 mb-2">
        This will:
      </p>
      <ul className="text-sm text-gray-400 mb-4 space-y-1 pl-4 list-disc">
        {hasAttendanceRunning && <li className="text-yellow-400">Automatically close and lock attendance</li>}
        <li>Prevent new students from joining</li>
        <li>Close the Zoom meeting</li>
        <li>Archive the session and generate reports</li>
      </ul>
      <p className="text-xs text-gray-500 mb-5">This cannot be undone.</p>
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isEnding}
          className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-40"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isEnding}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isEnding ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Ending…
            </>
          ) : (
            'End Session'
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Header ────────────────────────────────────────────────────────────────────

export const LiveSessionHeader: React.FC = () => {
  const { session, capabilities } = useLiveSessionContext();
  const navigate = useNavigate();

  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const isAttendanceRunning =
    session?.attendanceStatus === 'RUNNING' ||
    session?.attendance?.status === 'RUNNING';
  const attendanceStartedAt =
    session?.attendanceStartedAt || session?.attendance?.startedAt;

  const handleLeave = () => navigate(-1);

  /**
   * End Session — NERMAI orchestrates everything.
   * NERMAI does not let Zoom decide when the class ends.
   *
   * Backend endSession() already handles:
   *   1. Stops and finalises attendance if running
   *   2. Locks new joins (status = ENDING → ENDED)
   *   3. Calls provider.endSession() → ends the Zoom meeting
   *   4. Archives the session + emits class:ended event
   */
  const handleEndSession = useCallback(async () => {
    if (!session?.id) return;
    setIsEndingSession(true);
    setActionError(null);
    try {
      await LiveSessionApi.endSession(session.id);
      // Close the Zoom popup after NERMAI has ended the session
      meetingLauncher.close();
      setShowEndConfirm(false);
    } catch (e: any) {
      setActionError(e?.response?.data?.message || 'Failed to end session. Please try again.');
    } finally {
      setIsEndingSession(false);
    }
  }, [session?.id]);

  const handleStartAttendance = async () => {
    if (!session?.id) return;
    setActionError(null);
    try {
      await LiveSessionApi.startAttendance(session.id);
    } catch (e: any) {
      setActionError(e?.response?.data?.message || 'Failed to start attendance.');
    }
  };

  const handleEndAttendance = async () => {
    if (!session?.id) return;
    setActionError(null);
    try {
      await LiveSessionApi.endAttendance(session.id);
    } catch (e: any) {
      setActionError(e?.response?.data?.message || 'Failed to end attendance.');
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 bg-gray-950 border-b border-gray-800 text-white z-50 shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLeave}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-bold">{session?.title || 'Live Session'}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${
                session?.status === 'LIVE' || session?.liveStatus === 'LIVE'
                  ? 'bg-red-500 animate-pulse'
                  : 'bg-yellow-500'
              }`} />
              <span className="text-xs uppercase tracking-wider text-gray-400">
                {session?.liveStatus || session?.status || 'Loading…'}
              </span>
            </div>
          </div>
          {isAttendanceRunning && attendanceStartedAt && (
            <AttendanceTimer startedAt={attendanceStartedAt} />
          )}
        </div>

        <div className="flex items-center gap-2">
          {actionError && (
            <span className="text-xs text-red-400 mr-2 max-w-xs truncate">{actionError}</span>
          )}

          {/* Start Attendance — independent of Zoom state */}
          {capabilities.canStartAttendance && !isAttendanceRunning && (
            <button
              onClick={handleStartAttendance}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Start Attendance
            </button>
          )}

          {/* End Attendance — independent of Zoom state */}
          {capabilities.canEndAttendance && isAttendanceRunning && (
            <button
              onClick={handleEndAttendance}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              End Attendance
            </button>
          )}

          {/* End Session — NERMAI orchestrates: attendance → Zoom → archive */}
          {capabilities.canEndMeeting && (
            <button
              onClick={() => setShowEndConfirm(true)}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              End Session
            </button>
          )}

          <button
            onClick={handleLeave}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      {showEndConfirm && (
        <EndSessionModal
          onConfirm={handleEndSession}
          onCancel={() => setShowEndConfirm(false)}
          isEnding={isEndingSession}
          hasAttendanceRunning={isAttendanceRunning}
        />
      )}
    </>
  );
};
