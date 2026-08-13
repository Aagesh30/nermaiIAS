import React from 'react';
import { useLiveSessionContext } from '../../../context/LiveSessionContext';
import { meetingLauncher } from '../../../services/MeetingLauncherService';
import { useSessionStatusPoller } from '../../../hooks/useSessionStatusPoller';
import { useParams } from 'react-router-dom';
import { Video, Clock, AlertTriangle, Loader2 } from 'lucide-react';

/**
 * StudentLobby
 *
 * Shown to students when academicState === 'SCHEDULED'.
 *
 * Behaviour:
 *  - Polls backend every 10 s to detect when the host starts (session LIVE/HOST_CONNECTED).
 *  - Displays "Join Zoom Meeting" button ONLY when the host is ready.
 *  - Shows "Waiting for host…" spinner before that.
 *  - Calls meetingLauncher.preparePopup() synchronously on button click to avoid
 *    popup-blocker, then startSession() to trigger the join flow.
 */
export const StudentLobby: React.FC = () => {
  const { session, startSession } = useLiveSessionContext();
  const { sessionId } = useParams();

  const { isHostReady, sessionStatus, loading, error } = useSessionStatusPoller(sessionId, 10_000);

  const handleJoin = () => {
    // IMPORTANT: preparePopup() must run synchronously on the click event
    // to pre-open about:blank before the async join flow begins.
    // This bypasses browser popup blockers.
    meetingLauncher.preparePopup();
    startSession();
  };

  const isSessionEnded = sessionStatus === 'ENDED' || sessionStatus === 'CANCELLED';

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black font-sans text-center px-4">
      <div className="max-w-xl w-full bg-gray-900 border border-gray-800 p-10 rounded-2xl">

        {/* Session Info */}
        <div className="mb-8">
          <div className="w-12 h-12 bg-blue-900/30 border border-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Video size={22} className="text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            {session?.title || 'Live Class'}
          </h1>
          <p className="text-gray-500 text-sm">
            {session?.courseName && (
              <span className="mr-2">📚 {session.courseName}</span>
            )}
            {session?.teacherName && (
              <span>👤 {session.teacherName}</span>
            )}
          </p>
          {session?.startTime && (
            <p className="text-gray-600 text-xs mt-2">
              Scheduled: {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        {/* Error State */}
        {error && !isHostReady && (
          <div className="flex items-center gap-2 bg-red-950/30 border border-red-500/20 rounded-lg px-4 py-3 mb-4 text-sm text-red-400">
            <AlertTriangle size={15} />
            <span>Could not refresh session status. Will retry automatically.</span>
          </div>
        )}

        {/* Ended State */}
        {isSessionEnded ? (
          <div className="py-4">
            <p className="text-gray-400 text-sm">This session has ended.</p>
          </div>

        /* Host Ready — show Join button */
        ) : isHostReady ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Host is live
            </div>
            <button
              id="student-join-zoom-btn"
              onClick={handleJoin}
              className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-xl font-bold text-base transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
            >
              <Video size={20} />
              Join Live Class
            </button>
            <p className="text-xs text-gray-600 mt-1">
              A Zoom window will open in your browser. Allow popups if prompted.
            </p>
          </div>

        /* Waiting State */
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            {loading && !sessionStatus ? (
              <Loader2 size={36} className="text-blue-500 animate-spin" />
            ) : (
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            <div>
              <p className="text-blue-400 font-medium animate-pulse">Waiting for host…</p>
              <p className="text-gray-600 text-xs mt-1">
                You'll see a Join button as soon as the host starts the class.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-gray-700 text-xs">
              <Clock size={11} />
              <span>Checking every 10 seconds</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
