import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getApiClient, LiveClassesApi } from '@nermai/api';

const HEARTBEAT_INTERVAL_MS = 30_000; // 30 seconds

export function usePresenceLifecycleMobile(sessionId: string | undefined, isLive: boolean): {
  leaveSession: () => Promise<void>;
} {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const isPausedRef = useRef<boolean>(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
      if (nextAppState === 'active') {
        isPausedRef.current = false;
      } else {
        isPausedRef.current = true;
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

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

    sendHeartbeat();
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  }, [sessionId]);

  const stopHeartbeat = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !isLive) {
      stopHeartbeat();
      return;
    }

    // App state changes control the pause/resume natively via the ref above.
    // The heartbeat interval keeps running but bails early if paused.
    startHeartbeat();

    return () => {
      stopHeartbeat();
    };
  }, [sessionId, isLive, startHeartbeat, stopHeartbeat]);

  const leaveSession = useCallback(async () => {
    stopHeartbeat();
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
