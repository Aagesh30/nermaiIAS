import React from 'react';
import { useParams } from 'react-router-dom';
import { LiveSessionProvider, LiveSessionContextState } from './context/LiveSessionContext';
import { LiveSessionLayout } from './core/LiveSessionLayout';
import { liveSessionService, JoinPayload, SessionState, LiveCapabilities } from '@nermai/live-core';
import { MeetingStateManager } from './services/MeetingStateManager';
import { MeetingWindowState } from './services/MeetingTypes';
import { useState, useEffect, useCallback } from 'react';

interface LiveSessionFeatureProps {
  role: 'student' | 'teacher' | 'admin' | 'staff' | 'super_admin';
  capabilities: LiveCapabilities;
}

// ── MeetingWindowState → context windowState ──────────────────────────────────
const WINDOW_STATE_MAP: Record<MeetingWindowState, LiveSessionContextState['windowState']> = {
  idle:         'CLOSED',
  opening:      'OPENING',
  open:         'OPENED',
  joined:       'OPENED',
  active:       'OPENED',
  reconnecting: 'OPENED',
  ended:        'CLOSED',
  closed:       'CLOSED',
  blocked:      'BLOCKED',
};

// ── MeetingWindowState → context zoomState ────────────────────────────────────
const ZOOM_STATE_MAP: Record<MeetingWindowState, LiveSessionContextState['zoomState']> = {
  idle:         'DISCONNECTED',
  opening:      'LAUNCHING',
  open:         'JOINING',
  joined:       'JOINING',
  active:       'CONNECTED',
  reconnecting: 'RECONNECTING',
  ended:        'DISCONNECTED',
  closed:       'DISCONNECTED',
  blocked:      'DISCONNECTED',
};

export const LiveSessionFeature: React.FC<LiveSessionFeatureProps> = ({ role, capabilities }) => {
  const { sessionId } = useParams();
  const [sessionState, setSessionState] = useState<any>(null);
  const [academicState, setAcademicState] = useState<LiveSessionContextState['academicState']>('SCHEDULED');
  const [zoomState, setZoomState] = useState<LiveSessionContextState['zoomState']>('DISCONNECTED');
  const [windowState, setWindowState] = useState<LiveSessionContextState['windowState']>('CLOSED');
  const [joinState, setJoinState] = useState<JoinPayload | null>(null);
  const [hostConnected, setHostConnected] = useState<boolean>(false);

  // ── Subscribe to live session service (backend state) ──────────────────────
  useEffect(() => {
    if (!sessionId) return;

    const unsubscribe = liveSessionService.subscribe((state: SessionState, session: any) => {
      setSessionState(session);
      if (state === 'LIVE') setAcademicState('LIVE');
      else if (state === 'ENDED') setAcademicState('ENDED');
    });

    // Fetch initial session data so lobbies can display titles
    liveSessionService.fetchSession(sessionId).catch(console.error);

    // ── Start Bridge Adapters ────────────────────────────────────────────────
    import('./services/WebMessageBridge').then((m) => m.webMessageBridge.start());
    import('./services/MeetingStateBusAdapter').then((m) => m.meetingStateBusAdapter.start(sessionId));

    return () => {
      import('./services/WebMessageBridge').then((m) => m.webMessageBridge.stop());
      import('./services/MeetingStateBusAdapter').then((m) => m.meetingStateBusAdapter.stop());
      unsubscribe();
      liveSessionService.leaveSession();
    };
  }, [sessionId]);

  // ── Sync MeetingStateManager → context zoomState / windowState ───────────
  // This keeps ClassHealthWidget accurate without modifying MeetingLauncherService.
  useEffect(() => {
    return MeetingStateManager.subscribe((state: MeetingWindowState) => {
      setWindowState(WINDOW_STATE_MAP[state] ?? 'CLOSED');
      setZoomState(ZOOM_STATE_MAP[state] ?? 'DISCONNECTED');
    });
  }, []);

  // ── Join error recovery: revert STARTING → SCHEDULED so lobby re-appears ──
  const onJoinError = useCallback((_error: Error) => {
    setAcademicState('SCHEDULED');
  }, []);

  const providerValue: LiveSessionContextState = {
    session: sessionState,
    participant: null,
    role,
    capabilities,
    provider: joinState?.provider || 'zoom',
    academicState,
    zoomState,
    windowState,
    attendanceStatus: 'pending',
    hostConnected,
    joinState,
    refreshSession: () => {
      if (sessionId) liveSessionService.fetchSession(sessionId).catch(console.error);
    },
    startSession: () => setAcademicState('STARTING'),
    setAcademicState,
    setHostConnected,
    onJoinError,
  };

  return (
    <LiveSessionProvider value={providerValue}>
      <LiveSessionLayout />
    </LiveSessionProvider>
  );
};
