import { MeetingLaunchRequest, MeetingWindowState, MeetingBridgeEvent } from './MeetingTypes';
import { MeetingStateManager } from './MeetingStateManager';
import { MeetingTelemetryService } from './MeetingTelemetryService';
import { getApiClient } from '../../../core/services';

const getZoomPopupRenderer = () => {
  if (process.env.EXPO_PUBLIC_ZOOM_RENDERER === 'client') {
    return '/meeting-hosts/zoom-client-launch.html';
  }
  return '/meeting-hosts/zoom-sdk-launch.html';
};

/** Maps provider IDs to their SDK launch page filenames */
const PROVIDER_LAUNCH_PAGES: Record<string, () => string> = {
  zoom:         getZoomPopupRenderer,
  google_meet:  () => '/meeting-hosts/gmeet.html',
  'google-meet':() => '/meeting-hosts/gmeet.html',
  teams:        () => '/meeting-hosts/teams-sdk-launch.html',
  jitsi:        () => '/meeting-hosts/jitsi-sdk-launch.html',
  bbb:          () => '/meeting-hosts/bbb-sdk-launch.html',
};

const POPUP_WINDOW_NAME  = 'nermai-meeting';
const POPUP_FEATURES     = [
  'width=1280', 'height=760', 'left=80', 'top=80',
  'menubar=no', 'toolbar=no', 'location=no',
  'status=no', 'scrollbars=no', 'resizable=yes',
].join(',');

/** How often we poll window.closed as a fallback (ms) */
const WINDOW_POLL_MS     = 2000;
/** How often we send a heartbeat probe to the popup (ms) */
const HEARTBEAT_INTERVAL = 30_000;
/** How many missed heartbeats before we treat the popup as dead */
const HEARTBEAT_TIMEOUT  = 45_000;

/**
 * MeetingLauncherService
 *
 * Provider-agnostic meeting window manager. Owns the window reference and
 * coordinates four independent signals to detect meeting state:
 *
 *   1. postMessage from the popup (MEETING_STARTED / MEETING_ENDED / WINDOW_CLOSED)
 *   2. Polling window.closed every 2 s (catches accidental close, browser crash)
 *   3. Heartbeat every 30 s (catches laptop sleep / network drop / frozen tab)
 *   4. beforeunload from the popup (caught via WINDOW_CLOSED message)
 *
 * The popup receives ONLY a one-time Redis token — no meeting IDs, passcodes,
 * signatures, ZAKs or SDK keys ever appear on the client.
 */
class MeetingLauncherServiceClass {
  private popupWindow:      Window | null = null;
  private currentRequest:   MeetingLaunchRequest | null = null;
  private messageHandler:   ((e: MessageEvent) => void) | null = null;
  private pollInterval:     ReturnType<typeof setInterval> | null = null;
  private heartbeatInterval:ReturnType<typeof setInterval> | null = null;
  private lastHeartbeatAck: number = 0;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * launch() must be called directly from a user-interaction handler
   * (click event) so the browser allows the popup to open without blocking.
   */
  preparePopup(): void {
    // Open synchronously on user click to bypass blockers
    this.popupWindow = window.open('about:blank', POPUP_WINDOW_NAME, POPUP_FEATURES);
  }

  /**
   * launch() binds the prepared popup to the actual meeting URL
   */
  launch(request: MeetingLaunchRequest): void {
    this.currentRequest = request;

    const launchPage = (PROVIDER_LAUNCH_PAGES[request.provider] ?? PROVIDER_LAUNCH_PAGES['zoom'])();
    const url = `${launchPage}?token=${encodeURIComponent(request.token)}&sessionId=${encodeURIComponent(request.sessionId)}&apiUrl=${encodeURIComponent(this._getApiUrl())}`;

    MeetingStateManager.setState('opening');
    MeetingTelemetryService.record('LAUNCH_INITIATED', { provider: request.provider, sessionId: request.sessionId });

    // Re-use the window if prepared, otherwise open it (which might get blocked)
    if (!this.popupWindow || this.popupWindow.closed) {
       this.popupWindow = window.open(url, POPUP_WINDOW_NAME, POPUP_FEATURES);
    } else {
       this.popupWindow.location.href = url;
    }

    if (!this.popupWindow || this.popupWindow.closed) {
      // Browser blocked the popup — this happens when launch() is NOT called
      // from a direct user click (e.g. setTimeout, auto-mount).
      MeetingStateManager.setState('blocked');
      MeetingTelemetryService.record('POPUP_BLOCKED', { provider: request.provider });
      return;
    }

    MeetingStateManager.setState('open');
    MeetingTelemetryService.record('POPUP_OPENED', { provider: request.provider });
    this.lastHeartbeatAck = Date.now();

    this._registerMessageListener();
    this._startPolling();
    this._startHeartbeat();
  }

  close(): void {
    if (this.popupWindow && !this.popupWindow.closed) {
      this.popupWindow.close();
      MeetingTelemetryService.record('POPUP_CLOSED_BY_LMS', {});
    }
    this._cleanup();
    MeetingStateManager.setState('closed');
  }

  focus(): void {
    if (this.isAlive()) this.popupWindow!.focus();
  }

  /**
   * reconnect() — safe to call from UI. Will re-open the popup.
   * Must still originate from a user click to avoid popup blocking.
   */
  reconnect(): void {
    if (this.currentRequest) {
      MeetingTelemetryService.record('RECONNECT_INITIATED', { provider: this.currentRequest.provider });
      MeetingStateManager.setState('reconnecting');
      this._cleanup();
      // Small delay gives the browser time to finish closing the old window
      setTimeout(() => this.launch(this.currentRequest!), 300);
    }
  }

  isAlive(): boolean {
    return !!this.popupWindow && !this.popupWindow.closed;
  }

  waitUntilClosed(): Promise<void> {
    return new Promise(resolve => {
      const unsubscribe = MeetingStateManager.subscribe((state: MeetingWindowState) => {
        if (state === 'closed' || state === 'ended') {
          unsubscribe();
          resolve();
        }
      });
    });
  }

  onMeetingEnded(callback: () => void): () => void {
    return MeetingStateManager.subscribe((state: MeetingWindowState) => {
      if (state === 'ended' || state === 'closed') callback();
    });
  }

  getState(): MeetingWindowState {
    return MeetingStateManager.getState();
  }

  // ── Signal 1 — postMessage from popup ─────────────────────────────────────

  private _registerMessageListener(): void {
    if (this.messageHandler) window.removeEventListener('message', this.messageHandler);

    this.messageHandler = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (!data?.type) return;

        // Heartbeat acknowledgement from the popup
        if (data.type === 'HEARTBEAT_ACK') {
          this.lastHeartbeatAck = Date.now();
          return;
        }

        const bridgeEvents: MeetingBridgeEvent[] = [
          'MEETING_STARTED',
          'MEETING_ENDED',
          'WINDOW_CLOSED',
          'RECONNECT_REQUESTED',
          'LAUNCHER_OPENED',
          'MEET_LAUNCH_REQUESTED',
        ];

        if (bridgeEvents.includes(data.type)) {
          MeetingStateManager.handleBridgeEvent(data.type as MeetingBridgeEvent);
          MeetingTelemetryService.record('BRIDGE_EVENT_RECEIVED', { type: data.type });

          if (data.type === 'MEETING_ENDED' || data.type === 'WINDOW_CLOSED') {
            this._cleanup();
          }
        }
      } catch (_) {}
    };

    window.addEventListener('message', this.messageHandler);
  }

  // ── Signal 2 — Poll window.closed (catches accidental/crash close) ─────────

  private _startPolling(): void {
    this.pollInterval = setInterval(() => {
      if (this.popupWindow && this.popupWindow.closed) {
        MeetingStateManager.setState('closed');
        MeetingTelemetryService.record('POPUP_CLOSED_BY_USER', {});
        this._cleanup();
      }
    }, WINDOW_POLL_MS);
  }

  // ── Signal 3 — Heartbeat (catches laptop sleep / frozen tab / network drop) ─

  private _startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (!this.isAlive()) return;

      // Probe the popup — it responds with HEARTBEAT_ACK via postMessage
      try {
        this.popupWindow!.postMessage(JSON.stringify({ type: 'HEARTBEAT' }), '*');
      } catch (_) {}

      // If we haven't received an ACK within the timeout window, mark as closed
      const elapsed = Date.now() - this.lastHeartbeatAck;
      if (elapsed > HEARTBEAT_TIMEOUT) {
        MeetingTelemetryService.record('HEARTBEAT_TIMEOUT', { elapsedMs: elapsed });
        MeetingStateManager.setState('closed');
        this._cleanup();
      }
    }, HEARTBEAT_INTERVAL);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  private _cleanup(): void {
    if (this.pollInterval)      { clearInterval(this.pollInterval);      this.pollInterval = null; }
    if (this.heartbeatInterval) { clearInterval(this.heartbeatInterval); this.heartbeatInterval = null; }
    if (this.messageHandler)    { window.removeEventListener('message', this.messageHandler); this.messageHandler = null; }
    this.popupWindow = null;
  }

  private _getApiUrl(): string {
    try {
      const client = getApiClient();
      if (client.defaults.baseURL) {
        return client.defaults.baseURL;
      }
    } catch (_) {}
    
    if (typeof process !== 'undefined' && (process.env as any).EXPO_PUBLIC_API_URL) {
      return (process.env as any).EXPO_PUBLIC_API_URL;
    }
    return window.location.origin;
  }
}

export const meetingLauncher = new MeetingLauncherServiceClass();

