/**
 * useZoomLauncher.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that wraps ZoomLinkResolver for use in components.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { useState, useCallback } from 'react';
import { openZoomMeeting, ZoomJoinParams } from '../zoom/ZoomLinkResolver';

export interface ZoomLaunchState {
  launched: boolean;
  launching: boolean;
  error: string | null;
  launchedUrl: string | null;
}

export function useZoomLauncher() {
  const [state, setState] = useState<ZoomLaunchState>({
    launched: false,
    launching: false,
    error: null,
    launchedUrl: null,
  });

  const launch = useCallback(async (params: ZoomJoinParams) => {
    setState(s => ({ ...s, launching: true, error: null }));
    try {
      const result = await openZoomMeeting(params);
      setState(s => ({
        ...s,
        launched: result.success,
        launching: false,
        launchedUrl: result.url,
        error: result.success ? null : 'Zoom URL could not be opened on this device.',
      }));
      return result;
    } catch (e: any) {
      const error = e?.message ?? 'Failed to open Zoom.';
      setState(s => ({ ...s, launching: false, error, launched: false }));
      return { success: false, url: '' };
    }
  }, []);

  const reset = useCallback(() => {
    setState({ launched: false, launching: false, error: null, launchedUrl: null });
  }, []);

  return { ...state, launch, reset };
}
