import { useState, useEffect, useRef } from 'react';
import { LiveSessionApi } from '@nermai/api';

type SessionStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'JOINING'
  | 'HOST_CONNECTED'
  | 'LIVE'
  | 'ENDING'
  | 'ENDED'
  | 'CANCELLED';

interface PollerResult {
  sessionStatus: SessionStatus | null;
  isHostReady: boolean; // true when session is LIVE or HOST_CONNECTED
  loading: boolean;
  error: string | null;
}

const HOST_READY_STATUSES: SessionStatus[] = ['LIVE', 'HOST_CONNECTED'];
const TERMINAL_STATUSES: SessionStatus[] = ['ENDED', 'CANCELLED'];

/**
 * useSessionStatusPoller
 *
 * Polls GET /live-sessions/:id every `intervalMs` to detect when the host
 * starts the meeting (LIVE / HOST_CONNECTED). Stops polling once the session
 * reaches a terminal state (ENDED / CANCELLED) or once the caller calls stop.
 *
 * Used by StudentLobby to show the "Join" button only when the host is live.
 */
export function useSessionStatusPoller(
  sessionId: string | undefined,
  intervalMs = 10_000
): PollerResult {
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (!sessionId) return;

    const poll = async () => {
      try {
        const res = await LiveSessionApi.getSession(sessionId);
        const data = res.data?.data || res.data;
        const status: SessionStatus = data?.status ?? data?.liveStatus ?? 'SCHEDULED';

        if (!mountedRef.current) return;
        setSessionStatus(status);
        setError(null);
        setLoading(false);

        // Stop polling once terminal or host-ready (caller will proceed)
        if (TERMINAL_STATUSES.includes(status)) {
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (err: any) {
        if (mountedRef.current) {
          setError(err?.message || 'Failed to fetch session status');
          setLoading(false);
        }
      }
    };

    setLoading(true);
    poll(); // immediate first fetch
    timerRef.current = setInterval(poll, intervalMs);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId, intervalMs]);

  return {
    sessionStatus,
    isHostReady: sessionStatus !== null && HOST_READY_STATUSES.includes(sessionStatus),
    loading,
    error,
  };
}
