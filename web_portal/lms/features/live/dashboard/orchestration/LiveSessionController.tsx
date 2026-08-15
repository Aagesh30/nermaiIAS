import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { AdminLobby } from '../layouts/lobbies/AdminLobby';
import { TeacherLobby } from '../layouts/lobbies/TeacherLobby';
import { StudentLobby } from '../layouts/lobbies/StudentLobby';
import { WaitingRoomLobby } from '../layouts/lobbies/WaitingRoomLobby';
import { InitializationTimeline } from './InitializationTimeline';
import { liveSessionService } from '@nermai/live-core';
import { meetingLauncher } from '../../services/MeetingLauncherService';
import { liveEventBus } from './LiveEventBus';
import { recoveryController } from './RecoveryController';

export const LiveSessionController: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { academicState, role, provider, zoomState, windowState, hostConnected, onJoinError, setAcademicState, setHostConnected } = useLiveSessionContext();
  const { sessionId } = useParams();
  const [searchParams] = window.location.search ? [new URLSearchParams(window.location.search)] : [new URLSearchParams()];
  const adminOverride = searchParams.get('adminOverride') === 'true';

  // ── Single Source of Truth: trigger join + launch when STARTING ───────────
  useEffect(() => {
    if (academicState !== 'STARTING' || !sessionId) return;

    liveSessionService
      .joinSession(sessionId, { adminOverride })
      .then((payload) => {
        // ── Waiting Room ───────────────────────────────────────────────────
        // Backend returns { waiting: true } when the session has waiting room
        // enabled and the student has not been approved yet. Do NOT launch
        // the popup in this case — WaitingRoomLobby handles the retry loop.
        if (payload.waiting === true) {
          setAcademicState('WAITING_ROOM');
          return;
        }

        // ── Launch Zoom popup ──────────────────────────────────────────────
        meetingLauncher.launch({
          provider: payload.provider || 'zoom',
          token: payload.token || '',
          sessionId: sessionId || '',
        });
      })
      .catch((err: Error) => {
        console.error('[LiveSessionController] Failed to join session:', err);
        // Revert state so the student lobby re-appears with the error visible
        onJoinError(err);
      });
  }, [academicState, sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Event Bus subscription (Phase 2) ─────────────
  useEffect(() => {
    // Pass a context update function to the recovery controller
    recoveryController.init(
      (updates) => {
         if (updates.academicState) setAcademicState(updates.academicState);
      },
      () => academicState,
      () => sessionId
    );

    const unsubEnded = liveEventBus.on('SESSION_ENDED', (event) => {
      // Automatically finalize session status
      liveSessionService.handleProviderEvent({ 
         type: 'MEETING_ENDED', 
         sessionId: event.sessionId, 
         provider: event.provider, 
         role: role 
      });
    });

    const unsubHostConnected = liveEventBus.on('HOST_CONNECTED', (event) => {
      // Sync the backend when host first arrives
      liveSessionService.handleProviderEvent({
         type: 'HOST_CONNECTED',
         sessionId: event.sessionId,
         provider: event.provider,
         role: role
      });
      setHostConnected(true);
    });

    const unsubHostDisconnected = liveEventBus.on('HOST_DISCONNECTED', (event) => {
      setHostConnected(false);
    });

    const unsubPromoted = liveEventBus.on('PARTICIPANT_PROMOTED', (event) => {
      if (event.payload) {
        import('@nermai/api').then(({ LiveSessionApi }) => {
          LiveSessionApi.recordPromotion(sessionId, {
            nermaiUserId: event.payload.nermaiUserId,
            zoomUserId: event.payload.zoomUserId,
            timestamp: event.payload.timestamp,
            source: event.payload.source,
            status: event.payload.status
          }).catch(console.error);
        });
      }
    });

    return () => {
      unsubEnded();
      unsubHostConnected();
      unsubHostDisconnected();
      unsubPromoted();
    };
  }, [sessionId, role, setAcademicState, setHostConnected]);

  // ── Sync Host Connection for Local Dev / No-Webhook Environments ───────────
  useEffect(() => {
    console.log('[LiveSessionController] Evaluating HOST_CONNECTED condition. zoomState:', zoomState, 'role:', role);
    // When the popup successfully connects, if this user is a teacher/admin,
    // explicitly declare the host as connected. This triggers handleProviderEvent
    // which hits the backend to mark the session as LIVE.
    if (zoomState === 'CONNECTED' && ['teacher', 'admin', 'super_admin', 'staff'].includes(role)) {
      console.log('[LiveSessionController] CONDITION MET! Emitting HOST_CONNECTED');
      liveEventBus.emit('HOST_CONNECTED', {
        version: 1,
        provider: provider || 'zoom', 
        sessionId: sessionId || '',
        timestamp: Date.now(),
        type: 'HOST_CONNECTED',
        payload: {}
      });
    }
  }, [zoomState, role, sessionId, provider]);

  // ── Waiting Room ───────────────────────────────────────────────────────────
  if (academicState === 'WAITING_ROOM') {
    return <WaitingRoomLobby />;
  }

  // ── Pre-Join Lobbies ──────────────────────────────────────────────────────
  // Show lobby if scheduled, OR if it's already LIVE but this user hasn't joined yet
  const needsToJoin = academicState === 'SCHEDULED' || 
    (academicState === 'LIVE' && zoomState === 'DISCONNECTED' && windowState !== 'OPENED');

  if (needsToJoin) {
    switch (role) {
      case 'super_admin':
      case 'admin':
        return <AdminLobby />;
      case 'teacher':
        return <TeacherLobby />;
      case 'student':
        return <StudentLobby />;
      default:
        return <StudentLobby />;
    }
  }

  // ── Initialization in progress (STARTING) ─────────────────────────────────
  if (academicState !== 'LIVE' && academicState !== 'ENDED') {
    return <InitializationTimeline />;
  }

  // ── Live / Ended — render role layout ─────────────────────────────────────
  return <>{children}</>;
};
