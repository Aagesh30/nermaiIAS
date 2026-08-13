import React, { useEffect, useState } from 'react';
import { useLiveSessionContext } from '../../../context/LiveSessionContext';
import { Clock, RefreshCw } from 'lucide-react';

const RETRY_INTERVAL_MS = 30_000; // 30 s between auto-retry

/**
 * WaitingRoomLobby
 *
 * Shown when the backend returns { waiting: true } — the session has a
 * waiting room enabled and the student must be approved by the host.
 *
 * Automatically retries via startSession() every 30 s so the student
 * transitions to LIVE as soon as the host approves without manual action.
 */
export const WaitingRoomLobby: React.FC = () => {
  const { session, startSession } = useLiveSessionContext();
  const [secondsUntilRetry, setSecondsUntilRetry] = useState(RETRY_INTERVAL_MS / 1000);

  // ── Auto-retry countdown ────────────────────────────────────────────────────
  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout>;
    let countdownTimer: ReturnType<typeof setInterval>;

    // Count down each second
    countdownTimer = setInterval(() => {
      setSecondsUntilRetry((prev) => {
        if (prev <= 1) return RETRY_INTERVAL_MS / 1000; // reset after retry fires
        return prev - 1;
      });
    }, 1000);

    // Fire the actual retry on the interval
    retryTimer = setTimeout(function scheduleRetry() {
      startSession(); // re-triggers the join attempt
      retryTimer = setTimeout(scheduleRetry, RETRY_INTERVAL_MS);
    }, RETRY_INTERVAL_MS);

    return () => {
      clearTimeout(retryTimer);
      clearInterval(countdownTimer);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleManualRetry = () => {
    setSecondsUntilRetry(RETRY_INTERVAL_MS / 1000);
    startSession();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black font-sans text-center px-4">
      <div className="max-w-xl w-full bg-gray-900 border border-gray-800 p-10 rounded-2xl relative overflow-hidden">
        {/* Session Info */}
        <h1 className="text-2xl font-bold text-white mb-1">
          {session?.title || 'Live Class'}
        </h1>
        <p className="text-gray-500 text-sm mb-8">
          Instructor: {session?.teacherName || 'Your Teacher'}
        </p>

        {/* Waiting animation */}
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 flex items-center justify-center">
              <Clock size={28} className="text-blue-400" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          </div>

          <div>
            <p className="text-blue-400 font-semibold text-lg">Waiting Room</p>
            <p className="text-gray-500 text-sm mt-1">
              Your join request has been sent to the host.
            </p>
            <p className="text-gray-600 text-xs mt-1">
              The host will admit you when the class is ready.
            </p>
          </div>
        </div>

        {/* Auto-retry indicator */}
        <div className="mt-4 py-3 px-4 bg-gray-950 rounded-xl border border-gray-800 text-xs text-gray-500">
          Auto-retrying in{' '}
          <span className="text-gray-300 font-medium tabular-nums">
            {secondsUntilRetry}s
          </span>
        </div>

        {/* Manual retry */}
        <button
          onClick={handleManualRetry}
          className="mt-4 flex items-center justify-center gap-2 w-full py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-xl transition-colors"
        >
          <RefreshCw size={15} />
          Check Now
        </button>
      </div>
    </div>
  );
};
