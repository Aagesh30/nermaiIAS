/**
 * ZoomDeepLinkPlayer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * MOBILE ONLY — Main orchestrator for the Expo Go Zoom deep-link flow.
 *
 * Flow:
 *   Student clicks class → PlayerAccess → MeetingPlayerFactory → ZoomDeepLinkPlayer
 *   When LIVE:
 *     1. Player fetches its own join credentials (GET /live-sessions/:sessionId/join)
 *     2. Builds join URL
 *     3. Launches Zoom app via Linking
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { ZoomStatusScreen, ZoomSessionState } from './ZoomStatusScreen';
import { useZoomLauncher } from '../hooks/useZoomLauncher';
import { useZoomPresence } from '../hooks/useZoomPresence';
import { buildZoomJoinUrl, ZoomJoinParams } from './ZoomLinkResolver';
import { getApiClient } from '@nermai/api';

interface ZoomDeepLinkPlayerProps {
  payload: any;
  onSessionEnd?: () => void;
}

function statusToScreenState(status: string): ZoomSessionState {
  switch ((status ?? '').toUpperCase()) {
    case 'LIVE':      return 'LIVE';
    case 'WAITING':   return 'WAITING';
    case 'SCHEDULED': return 'SCHEDULED';
    case 'ENDED':     return 'ENDED';
    case 'CANCELLED': return 'CANCELLED';
    default:          return 'WAITING';
  }
}

function deriveInitialState(payload: any): ZoomSessionState {
  const status: string = payload?.status ?? payload?.session?.status ?? '';
  if (!status) return 'LOADING';
  return statusToScreenState(status);
}

export const ZoomDeepLinkPlayer: React.FC<ZoomDeepLinkPlayerProps> = ({ payload, onSessionEnd }) => {
  const [screenState, setScreenState] = useState<ZoomSessionState>(() => deriveInitialState(payload));
  const [localError, setLocalError] = useState<string | null>(null);
  
  // Join credentials hydration
  const [joinData, setJoinData] = useState<any>(null);
  const [loadingJoin, setLoadingJoin] = useState(false);
  
  const mountedRef = useRef(true);
  const sessionId = payload?.sessionId;

  const { launch, launching, error: launchError, reset: resetLaunch } = useZoomLauncher();
  const { presenceState, sessionStatus, markLaunched, checkSessionStatus, reset: resetPresence } = useZoomPresence(sessionId ?? null);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // ── Sync presence state → screen state ────────────────────────────────────
  useEffect(() => {
    if (!mountedRef.current) return;
    if (presenceState === 'returned')          setScreenState('RETURNED');
    if (presenceState === 'session_ended')     { setScreenState('ENDED'); onSessionEnd?.(); }
    if (presenceState === 'session_cancelled') setScreenState('CANCELLED');
  }, [presenceState, onSessionEnd]);

  // ── Self-hydrate join credentials when LIVE ───────────────────────────────
  const loadJoinData = useCallback(async () => {
    if (!sessionId || !mountedRef.current) return;
    
    try {
      setLoadingJoin(true);
      setScreenState('LOADING_CREDENTIALS');
      
      const api = getApiClient();
      const response = await api.get(`/live-sessions/${sessionId}/join`);
      
      console.log('[ZoomDeepLinkPlayer] JOIN PAYLOAD', response.data);
      
      if (mountedRef.current) {
        setJoinData(response.data);
        setScreenState('LIVE');
      }
    } catch (error) {
      console.error('[ZoomDeepLinkPlayer] JOIN FAILED', error);
      if (mountedRef.current) {
        setScreenState('FAILED');
        setLocalError('Unable to load meeting credentials.');
      }
    } finally {
      if (mountedRef.current) setLoadingJoin(false);
    }
  }, [sessionId]);

  // ── Trigger hydration if state becomes LIVE ───────────────────────────────
  useEffect(() => {
    // We want to fetch credentials if the session is LIVE and we don't have them yet.
    if (screenState === 'LIVE' && !joinData && !loadingJoin) {
      loadJoinData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState, sessionId, joinData, loadingJoin]);

  // ── Auto-launch once we have joinData ─────────────────────────────────────
  const hasAutoLaunched = useRef(false);
  useEffect(() => {
    if (screenState === 'LIVE' && joinData && !hasAutoLaunched.current) {
      hasAutoLaunched.current = true;
      handleOpenZoom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenState, joinData]);

  // ── Open Zoom ──────────────────────────────────────────────────────────────
  const handleOpenZoom = useCallback(async () => {
    const responsePayload = joinData?.data ?? joinData;
    const meetingId = responsePayload?.meetingId;
    const joinUrl = responsePayload?.joinUrl;
    const password = responsePayload?.sdk?.passcode ?? responsePayload?.password;
    const displayName = responsePayload?.displayName;

    console.log("[ZoomDeepLinkPlayer] payload =", responsePayload);
    console.log("[ZoomDeepLinkPlayer] meetingId =", meetingId);
    console.log("[ZoomDeepLinkPlayer] password =", password);
    console.log("[ZoomDeepLinkPlayer] displayName =", displayName);
    
    if (!meetingId && !joinUrl) {
      console.warn('[ZoomDeepLinkPlayer] No meetingId in payload — cannot launch Zoom.');
      if (mountedRef.current) {
        setLocalError('Missing meeting credentials.');
        setScreenState('FAILED');
      }
      return;
    }

    const params: ZoomJoinParams = {
      meetingId: meetingId ?? '',
      password: password ?? '',
      displayName: displayName,
      joinUrl: joinUrl
    };

    const result = await launch(params);
    if (!mountedRef.current) return;
    
    if (result.success) {
      markLaunched();
    } else {
      setScreenState('FAILED');
    }
  }, [launch, joinData, markLaunched]);

  // ── Retry: re-fetch live status & credentials ───────────────────────────────
  const handleRetry = useCallback(async () => {
    resetLaunch();
    resetPresence();
    setLocalError(null);
    setJoinData(null);
    hasAutoLaunched.current = false;
    
    if (mountedRef.current) setScreenState('LOADING');
    
    await checkSessionStatus();
    if (!mountedRef.current) return;
    
    if (sessionStatus) {
      const newState = statusToScreenState(sessionStatus);
      setScreenState(newState);
      // The useEffect will trigger loadJoinData if newState is LIVE
    } else {
      setScreenState(deriveInitialState(payload));
    }
  }, [resetLaunch, resetPresence, checkSessionStatus, sessionStatus, payload]);

  return (
    <ZoomStatusScreen
      state={screenState}
      classTitle={payload?.classTitle ?? payload?.session?.classTitle}
      teacherName={payload?.teacherName}
      scheduledTime={payload?.scheduledTime}
      error={localError || launchError}
      onOpenZoom={handleOpenZoom}
      onRetry={handleRetry}
      onBack={onSessionEnd}
      launching={launching || loadingJoin}
    />
  );
};
