/**
 * useZoomPresence.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Monitors AppState to detect when the user returns from Zoom.
 * Polls session status on foreground return + active polling while in-app.
 *
 * Lifecycle:
 *   app active (launched Zoom) → polls every POLL_INTERVAL_MS
 *   app goes background         → stops polling
 *   app returns from background → single immediate check + resume polling
 *   unmount / class end         → all cleanup called
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getApiClient } from '@nermai/api';

export type ZoomPresenceState = 'idle' | 'in_zoom' | 'returned' | 'session_ended' | 'session_cancelled';

const POLL_INTERVAL_MS = 20_000; // Poll every 20s while app is active after Zoom launch

export function useZoomPresence(sessionId: string | null) {
  const [presenceState, setPresenceState] = useState<ZoomPresenceState>('idle');
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);

  const appStateRef    = useRef<AppStateStatus>(AppState.currentState);
  const launched       = useRef(false);
  const mountedRef     = useRef(true);   // guard against setState after unmount
  const pollTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cleanup helper ──────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  // ── Core: fetch session status ──────────────────────────────────────────────
  const checkSessionStatus = useCallback(async () => {
    if (!sessionId || !mountedRef.current) return;
    try {
      const res = await getApiClient().get(`/live-sessions/${sessionId}/state`);
      if (!mountedRef.current) return; // component unmounted while we awaited

      const status: string = res.data?.data?.status ?? res.data?.status ?? 'UNKNOWN';
      setSessionStatus(status);
      console.log('[useZoomPresence] Session status:', status);

      if (status === 'LIVE' || status === 'WAITING') {
        setPresenceState('returned');
      } else if (status === 'ENDED') {
        setPresenceState('session_ended');
        stopPolling(); // class over — no more polling needed
      } else if (status === 'CANCELLED') {
        setPresenceState('session_cancelled');
        stopPolling();
      }
    } catch (e: any) {
      console.warn('[useZoomPresence] Failed to check session status:', e?.message);
      // Network error on return → don't crash, just warn
    }
  }, [sessionId, stopPolling]);

  // ── Start active polling ───────────────────────────────────────────────────
  const startPolling = useCallback(() => {
    stopPolling(); // clear any existing timer first
    if (!sessionId) return;
    pollTimerRef.current = setInterval(() => {
      checkSessionStatus();
    }, POLL_INTERVAL_MS);
  }, [sessionId, checkSessionStatus, stopPolling]);

  // ── Mark as "in Zoom" ──────────────────────────────────────────────────────
  const markLaunched = useCallback(() => {
    launched.current = true;
    setPresenceState('in_zoom');
    startPolling();
  }, [startPolling]);

  // ── AppState listener ──────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (!launched.current) return;

      if (prev === 'background' && nextState === 'active') {
        // User returned from Zoom — immediate check then resume polling
        console.log('[useZoomPresence] App foregrounded after Zoom launch — checking status.');
        checkSessionStatus();
        startPolling();
      } else if (nextState === 'background') {
        // App went to background — pause polling to save battery
        console.log('[useZoomPresence] App backgrounded — pausing poll.');
        stopPolling();
      }
    });

    return () => {
      mountedRef.current = false;
      sub.remove();
      stopPolling();
    };
  }, [checkSessionStatus, startPolling, stopPolling]);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    launched.current = false;
    setPresenceState('idle');
    setSessionStatus(null);
    stopPolling();
  }, [stopPolling]);

  return { presenceState, sessionStatus, markLaunched, checkSessionStatus, reset };
}
