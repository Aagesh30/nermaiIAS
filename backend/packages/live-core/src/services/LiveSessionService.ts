import { LiveSessionApi } from '@nermai/api';
import { ILiveSession } from '../types';
import { LiveSessionStateMachine, SessionState } from '../state/LiveSessionStateMachine';
import { emitTelemetry } from '../events/telemetry';

export interface JoinPayload {
  token?: string;
  provider: string;
  [key: string]: any;
}

export interface ProviderIframeEvent {
  type: 'HOST_CONNECTED' | 'PARTICIPANT_JOINED' | 'PARTICIPANT_LEFT' | 'MEETING_ENDED' | 'CONNECTION_LOST' | 'HOST_DISCONNECTED';
  sessionId: string;
  provider: string;
  role: string;
  [key: string]: any;
}

type SessionSubscriber = (state: SessionState, session: ILiveSession | null) => void;

class LiveSessionService {
  private stateMachine = new LiveSessionStateMachine();
  private currentSession: ILiveSession | null = null;
  private subscribers: Set<SessionSubscriber> = new Set();
  private pollingInterval: number | null = null;

  constructor() {
    this.stateMachine.subscribe((state) => {
      this.subscribers.forEach(sub => sub(state, this.currentSession));
    });
  }

  async joinSession(sessionId: string): Promise<JoinPayload> {
    try {
      emitTelemetry('LIVE_SESSION_JOIN_REQUESTED', { sessionId });
      
      // Full reset of the singleton so navigation back to the page works cleanly
      this.currentSession = null;
      this.stateMachine.transitionTo('IDLE');
      this.stateMachine.transitionTo('STARTING');
      
      const response = await LiveSessionApi.joinSession(sessionId);
      const payload = response.data?.data || response.data; // Handle both wrapped and unwrapped

      // ── PROVIDER DETECTION ─────────────────────────────────────────────────
      // The backend join response does not always include a top-level 'provider'
      // field. Detect it from multiple sources in priority order.
      const detectedProvider: string =
        payload.provider ||           // top-level field (preferred)
        payload.session?.provider ||  // nested inside the session object
        (payload.sdk ? 'zoom' : '');  // presence of 'sdk' object = Zoom payload

      // Normalize onto the payload so the frontend registry can use it
      payload.provider = detectedProvider;

      console.log('[LiveSessionService] Detected provider:', detectedProvider, '| payload keys:', Object.keys(payload));
      // ──────────────────────────────────────────────────────────────────────

      // If this is a Zoom session, generate the short-lived Redis token for the iframe
      if (detectedProvider === 'zoom' && !payload.token) {
        try {
          const tokenRes = await LiveSessionApi.generateJoinToken(sessionId);
          // Backend returns either { token: '...' } or the token string directly
          payload.token = tokenRes.data?.token || (typeof tokenRes.data === 'string' ? tokenRes.data : null);
          console.log('[LiveSessionService] Token generated:', payload.token ? `${payload.token.substring(0, 12)}...` : 'FAILED');
        } catch (tokenErr: any) {
          console.error('[LiveSessionService] generateJoinToken failed:', tokenErr.message);
          throw new Error('Failed to generate a secure join token. Please try again.');
        }
      }

      // Hard guard: token must exist before mounting the iframe
      if (detectedProvider === 'zoom' && !payload.token) {
        throw new Error('No join token was generated. The session cannot start.');
      }
      
      if (payload.session) {
        this.currentSession = payload.session;
      }

      // ✅ Transition to LIVE *only after* the complete payload (including token) is ready.
      // This prevents ZoomMeetingPlayer from mounting with joinPayload.token = null,
      // which would show "Initializing Zoom SDK..." permanently instead of the iframe.
      this.stateMachine.transitionTo('LIVE');
      
      emitTelemetry('LIVE_SESSION_JOINED', { sessionId, provider: payload.provider });
      return payload;
    } catch (err: any) {
      console.error('Failed to join session', err);
      this.stateMachine.transitionTo('ERROR');
      emitTelemetry('LIVE_PROVIDER_ERROR', { sessionId, error: err.message });
      throw err;
    }
  }

  async handleProviderEvent(event: ProviderIframeEvent) {
    if (!this.currentSession || this.currentSession.id !== event.sessionId) return;
    
    try {
      if (event.type === 'HOST_CONNECTED') {
        // Sync the backend if it hasn't been marked LIVE/RUNNING yet.
        if (this.currentSession?.status !== 'LIVE' && this.currentSession?.status !== 'RUNNING') {
           await LiveSessionApi.startSession(event.sessionId);
           if (this.currentSession) this.currentSession.status = 'LIVE'; // Optimistic update
           emitTelemetry('LIVE_SESSION_JOINED', { sessionId: event.sessionId, provider: event.provider });
        }
      } else if (event.type === 'MEETING_ENDED') {
        if (this.stateMachine.getState() !== 'ENDED') {
           this.stateMachine.transitionTo('ENDED');
           await LiveSessionApi.endSession(event.sessionId);
        }
      }
    } catch (error) {
      console.error('Failed to sync provider event to backend', error);
    }
  }

  async leaveSession() {
    const sessionId = this.currentSession?.id;
    this.currentSession = null;
    this.stateMachine.transitionTo('ENDED');
    emitTelemetry('LIVE_SESSION_LEFT', { sessionId });
    
    if (this.pollingInterval) {
      // @ts-ignore - browser types vs node types
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  subscribe(callback: SessionSubscriber) {
    this.subscribers.add(callback);
    callback(this.stateMachine.getState(), this.currentSession);
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  getSessionState(): SessionState {
    return this.stateMachine.getState();
  }
}

export const liveSessionService = new LiveSessionService();
