import { useEffect, useRef, useCallback } from 'react';
import { getApiClient } from '@nermai/api';
import { useLiveSessionContext } from '../context/LiveSessionContext';
import { liveEventBus } from '../dashboard/orchestration/LiveEventBus';
import { meetingLauncher } from '../services/MeetingLauncherService';
import { LiveClassesApi } from '@nermai/api';

const HEARTBEAT_INTERVAL_MS = 30_000;

export function usePresenceLifecycle(sessionId: string | undefined): {
  leaveSession: () => Promise<void>;
} {
  const { academicState } = useLiveSessionContext();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPausedRef = useRef<boolean>(false);

  const startHeartbeat = useCallback(() => {
    if (intervalRef.current) return;
    
    const sendHeartbeat = async () => {
      if (isPausedRef.current || !sessionId) return;
      try {
        await getApiClient().post(`/live-sessions/${sessionId}/participants/heartbeat`);
      } catch {
        // Swallow silently
      }
    };

    // Send immediately
    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [sessionId]);

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const pauseHeartbeat = useCallback(() => {
    isPausedRef.current = true;
  }, []);

  const resumeHeartbeat = useCallback(() => {
    isPausedRef.current = false;
  }, []);

  useEffect(() => {
    if (!sessionId || academicState !== 'LIVE') {
      stopHeartbeat();
      return;
    }

    startHeartbeat();

    // Subscribe to events that impact presence
    const unsubOpen = liveEventBus.on('POPUP_OPENED', () => resumeHeartbeat());
    const unsubRecon = liveEventBus.on('SESSION_RECONNECTED', () => resumeHeartbeat());
    
    const unsubClose = liveEventBus.on('POPUP_CLOSED', () => pauseHeartbeat());
    const unsubBlock = liveEventBus.on('POPUP_BLOCKED', () => pauseHeartbeat());
    
    const unsubEnd = liveEventBus.on('SESSION_ENDED', () => stopHeartbeat());

    return () => {
      unsubOpen();
      unsubRecon();
      unsubClose();
      unsubBlock();
      unsubEnd();
      stopHeartbeat();
    };
  }, [sessionId, academicState, startHeartbeat, stopHeartbeat, pauseHeartbeat, resumeHeartbeat]);

  const leaveSession = useCallback(async () => {
    stopHeartbeat();
    meetingLauncher.close();
    if (sessionId) {
      try {
        await LiveClassesApi.leaveSession(sessionId);
      } catch (err) {
        console.error('Failed to notify backend of leave:', err);
      }
    }
  }, [sessionId, stopHeartbeat]);

  return { leaveSession };
}
