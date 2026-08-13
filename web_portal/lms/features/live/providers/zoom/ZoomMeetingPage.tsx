import React, { useEffect, useState } from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { meetingLauncher } from '../../services/MeetingLauncherService';
import { MeetingStateManager } from '../../services/MeetingStateManager';
import { MeetingWindowState } from '../../services/MeetingTypes';
import { Video, RefreshCw, ExternalLink } from 'lucide-react';

// ── Zoom Status Indicator ─────────────────────────────────────────────────────

const STATUS_CONFIG: Record<MeetingWindowState, { label: string; color: string; dot: string }> = {
  idle:         { label: 'Not Started',   color: 'text-gray-400',   dot: 'bg-gray-500' },
  opening:      { label: 'Opening…',      color: 'text-blue-400',   dot: 'bg-blue-400 animate-pulse' },
  open:         { label: 'Window Open',   color: 'text-blue-400',   dot: 'bg-blue-400' },
  joined:       { label: 'Joined',        color: 'text-green-400',  dot: 'bg-green-400' },
  active:       { label: 'Connected',     color: 'text-green-400',  dot: 'bg-green-400 animate-pulse' },
  reconnecting: { label: 'Reconnecting',  color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
  ended:        { label: 'Meeting Ended', color: 'text-gray-400',   dot: 'bg-gray-400' },
  closed:       { label: 'Window Closed', color: 'text-gray-500',   dot: 'bg-gray-600' },
  blocked:      { label: 'Popup Blocked', color: 'text-red-400',    dot: 'bg-red-400' },
};

const ZoomStatusBanner: React.FC<{
  state: MeetingWindowState;
  onFocus: () => void;
  onRejoin: () => void;
}> = ({ state, onFocus, onRejoin }) => {
  const cfg = STATUS_CONFIG[state];
  const isAlive = state === 'open' || state === 'joined' || state === 'active' || state === 'reconnecting';

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-gray-900/80 border-b border-gray-800">
      <Video size={16} className="text-gray-400 shrink-0" />
      <span className="text-sm text-gray-400 font-medium">Zoom Meeting</span>
      <div className="flex items-center gap-2 ml-1">
        <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        {isAlive && (
          <button
            onClick={onFocus}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
          >
            <ExternalLink size={12} />
            Focus Zoom
          </button>
        )}
        {(state === 'closed' || state === 'ended' || state === 'blocked') && (
          <button
            onClick={onRejoin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <RefreshCw size={12} />
            {state === 'blocked' ? 'Allow Popup & Retry' : 'Rejoin Zoom'}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export const ZoomMeetingPage: React.FC<{ payload: any }> = ({ payload }) => {
  const { session } = useLiveSessionContext();
  const [windowState, setWindowState] = useState<MeetingWindowState>('idle');

  // Subscribe to the central state manager
  useEffect(() => {
    const unsubscribe = MeetingStateManager.subscribe(setWindowState);
    return unsubscribe;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      meetingLauncher.close();
      MeetingStateManager.reset();
    };
  }, []);

  // Zoom startup is now completely managed by LiveSessionController


  const handleFocus  = () => meetingLauncher.focus();
  const handleRejoin = () => meetingLauncher.reconnect();

  return (
    <div className="flex flex-col w-full h-full bg-gray-950">
      <ZoomStatusBanner
        state={windowState}
        onFocus={handleFocus}
        onRejoin={handleRejoin}
      />

      {/* When popup is blocked, show a prominent call-to-action */}
      {windowState === 'blocked' && (
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-8 text-center">
          <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-2xl p-8 max-w-md">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">Popup Blocked</h3>
            <p className="text-sm text-gray-400 mb-4">
              Your browser blocked the Zoom meeting window. Please allow popups for this site and click Retry.
            </p>
            <button
              onClick={handleRejoin}
              className="px-5 py-2.5 bg-yellow-600 hover:bg-yellow-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Allow Popup &amp; Retry
            </button>
          </div>
        </div>
      )}

      {/* When meeting is active, show a helper panel */}
      {(windowState === 'active' || windowState === 'joined' || windowState === 'open') && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center">
          <div className="w-12 h-12 bg-green-900/40 border border-green-500/20 rounded-full flex items-center justify-center mb-2">
            <Video size={20} className="text-green-400" />
          </div>
          <p className="text-sm font-medium text-green-400">Meeting is Live</p>
          <p className="text-xs text-gray-500 max-w-xs">
            Your Zoom meeting is running in a separate window. Use the panel on the right to manage attendance, resources, and more.
          </p>
          <button
            onClick={handleFocus}
            className="mt-2 flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            <ExternalLink size={14} />
            Switch to Zoom Window
          </button>
        </div>
      )}

      {/* Idle / ended state */}
      {(windowState === 'idle' || windowState === 'ended' || windowState === 'closed') && (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 p-6 text-center">
          <p className="text-sm text-gray-500 mb-4">
            {windowState === 'ended' || windowState === 'closed'
              ? 'The Zoom meeting has ended.'
              : 'Waiting for orchestration...'}
          </p>
          {(windowState === 'ended' || windowState === 'closed') && (
            <button
              onClick={handleRejoin}
              className="mt-1 flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <RefreshCw size={14} />
              Rejoin Meeting
            </button>
          )}
        </div>
      )}
    </div>
  );
};
