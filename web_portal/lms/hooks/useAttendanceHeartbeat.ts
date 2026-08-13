import { useEffect, useRef, useCallback } from 'react';
import { AttendanceApi } from '../core/services';

interface UseAttendanceProps {
  classId: string;
  provider: 'youtube_recorded' | 'youtube_live' | 'zoom_live' | 'recorded';
  playerJwt: string;
  playerRef?: any;
}

type AttendanceEvent = "JOIN" | "PLAY" | "PAUSE" | "SEEK" | "HEARTBEAT" | "BACKGROUND" | "FOREGROUND" | "LEAVE" | "ENDED" | "COMPLETE";

export const useAttendanceHeartbeat = ({ classId, provider, playerJwt, playerRef }: UseAttendanceProps) => {
  const isLive = provider.includes('live');
  const heartbeatInterval = isLive ? 300000 : 90000; // 5 min vs 90 sec
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isBackgroundRef = useRef(false);

  const sendEvent = useCallback(async (event: AttendanceEvent, position?: number) => {
    try {
      await AttendanceApi.sendAttendanceEvent({
        classId,
        event,
        position,
        provider,
        timestamp: new Date().toISOString()
      }, playerJwt);
    } catch (error) {
      console.error(`Failed to send attendance event ${event}:`, error);
    }
  }, [classId, provider, playerJwt]);

  const startHeartbeat = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (!isBackgroundRef.current) {
        sendEvent('HEARTBEAT');
      }
    }, heartbeatInterval);
  }, [sendEvent, heartbeatInterval]);

  const stopHeartbeat = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  useEffect(() => {
    // Initial join event
    sendEvent('JOIN');
    startHeartbeat();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        isBackgroundRef.current = true;
        sendEvent('BACKGROUND');
        stopHeartbeat();
      } else {
        isBackgroundRef.current = false;
        sendEvent('FOREGROUND');
        startHeartbeat();
      }
    };

    const handleFocus = () => {
      if (isBackgroundRef.current) {
        isBackgroundRef.current = false;
        sendEvent('FOREGROUND');
        startHeartbeat();
      }
    };

    const handleBlur = () => {
      if (!isBackgroundRef.current) {
        isBackgroundRef.current = true;
        sendEvent('BACKGROUND');
        stopHeartbeat();
      }
    };

    const handleBeforeUnload = () => {
      sendEvent('LEAVE');
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      sendEvent('LEAVE');
      stopHeartbeat();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [sendEvent, startHeartbeat, stopHeartbeat]);

  return {
    sendEvent // Expose for manual player events (PAUSE, SEEK, COMPLETE, PLAY)
  };
};


