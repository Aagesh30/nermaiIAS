export type LiveEventCallback = (payload?: any) => void;

export enum LiveEventTypeMobile {
  // Mobile Bridge Events
  SESSION_CONNECTING = 'SESSION_CONNECTING',
  SESSION_CONNECTED = 'SESSION_CONNECTED',
  SESSION_ENDED = 'SESSION_ENDED',
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
  HOST_CONNECTED = 'HOST_CONNECTED',
  HOST_LEFT = 'HOST_LEFT',
  CONNECTION_LOST = 'CONNECTION_LOST',
  RECONNECTED = 'RECONNECTED',
  
  // App Events
  WEBVIEW_LOADED = 'WEBVIEW_LOADED',
  WEBVIEW_ERROR = 'WEBVIEW_ERROR'
}

class EventBusMobile {
  private listeners: Map<LiveEventTypeMobile, Set<LiveEventCallback>> = new Map();

  on(event: LiveEventTypeMobile, callback: LiveEventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback); // Returns unsubscribe function
  }

  off(event: LiveEventTypeMobile, callback: LiveEventCallback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit(event: LiveEventTypeMobile, payload?: any) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`Error executing LiveEventBusMobile callback for ${event}:`, err);
        }
      });
    }
  }
}

export const liveEventBusMobile = new EventBusMobile();
