export enum LiveEventType {
  // Zoom/Provider Events
  SESSION_CONNECTING = 'SESSION_CONNECTING',
  SESSION_CONNECTED = 'SESSION_CONNECTED',
  SESSION_RECONNECTING = 'SESSION_RECONNECTING',
  SESSION_RECONNECTED = 'SESSION_RECONNECTED',
  SESSION_ENDED = 'SESSION_ENDED',
  
  HOST_CONNECTED = 'HOST_CONNECTED',
  HOST_DISCONNECTED = 'HOST_DISCONNECTED',
  
  PARTICIPANT_JOINED = 'PARTICIPANT_JOINED',
  PARTICIPANT_LEFT = 'PARTICIPANT_LEFT',
  PARTICIPANT_PROMOTED = 'PARTICIPANT_PROMOTED',
  
  WAITING_ROOM_UPDATED = 'WAITING_ROOM_UPDATED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',
  HAND_RAISED = 'HAND_RAISED',
  
  SCREEN_SHARE_STARTED = 'SCREEN_SHARE_STARTED',
  SCREEN_SHARE_STOPPED = 'SCREEN_SHARE_STOPPED',
  
  // Academic Events
  RECORDING_STARTED = 'RECORDING_STARTED',
  RECORDING_STOPPED = 'RECORDING_STOPPED',
  ATTENDANCE_STARTED = 'ATTENDANCE_STARTED',
  ATTENDANCE_STOPPED = 'ATTENDANCE_STOPPED',
  CLASS_STARTED = 'CLASS_STARTED',
  CLASS_ENDED = 'CLASS_ENDED',
  
  // Window Events
  POPUP_OPENED = 'POPUP_OPENED',
  POPUP_CLOSED = 'POPUP_CLOSED',
  POPUP_BLOCKED = 'POPUP_BLOCKED',
  
  // Launcher Events
  LAUNCHER_OPENED = 'LAUNCHER_OPENED',
  MEET_LAUNCH_REQUESTED = 'MEET_LAUNCH_REQUESTED'
}

export interface LiveEventMap {
  SESSION_CONNECTING: {};
  SESSION_CONNECTED: { connectionState?: string };
  SESSION_RECONNECTING: {};
  SESSION_RECONNECTED: {};
  SESSION_ENDED: { reason?: string };
  
  HOST_CONNECTED: { displayName?: string; role?: string };
  HOST_DISCONNECTED: { reason?: string };
  
  PARTICIPANT_JOINED: { providerParticipantId?: string; displayName?: string; isRemote?: boolean };
  PARTICIPANT_LEFT: { providerParticipantId?: string; displayName?: string; isRemote?: boolean };
  PARTICIPANT_PROMOTED: { nermaiUserId: string, zoomUserId: string, timestamp: number, source: string, status: string };
  
  WAITING_ROOM_UPDATED: { count: number };
  CHAT_MESSAGE: { sender: string; message: string };
  HAND_RAISED: { participantId?: string; displayName?: string };
  
  SCREEN_SHARE_STARTED: { participantId?: string };
  SCREEN_SHARE_STOPPED: {};
  
  RECORDING_STARTED: {};
  RECORDING_STOPPED: {};
  ATTENDANCE_STARTED: { startedAt: string };
  ATTENDANCE_STOPPED: { endedAt: string };
  CLASS_STARTED: { sessionId: string };
  CLASS_ENDED: { sessionId: string };
  
  POPUP_OPENED: {};
  POPUP_CLOSED: {};
  POPUP_BLOCKED: {};
  
  LAUNCHER_OPENED: {};
  MEET_LAUNCH_REQUESTED: {};
}

export interface LiveEvent<K extends keyof LiveEventMap> {
  version: 1;
  provider: string;
  sessionId: string;
  timestamp: number;
  type: K;
  payload: LiveEventMap[K];
}

type LiveEventCallback<K extends keyof LiveEventMap> = (event: LiveEvent<K>) => void;

class EventBus {
  private listeners: Map<keyof LiveEventMap, Set<Function>> = new Map();

  on<K extends keyof LiveEventMap>(event: K, callback: LiveEventCallback<K>) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback); // Returns unsubscribe function
  }

  off<K extends keyof LiveEventMap>(event: K, callback: LiveEventCallback<K>) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit<K extends keyof LiveEventMap>(event: K, fullEventObj: LiveEvent<K>) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.forEach(cb => {
        try {
          cb(fullEventObj);
        } catch (err) {
          console.error(`Error executing LiveEventBus callback for ${event as string}:`, err);
        }
      });
    }
  }
}

export const liveEventBus = new EventBus();
