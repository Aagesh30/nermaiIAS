export interface LiveMeetingProvider {
  initialize: (payload: any) => Promise<void>;
  join: () => Promise<void>;
  leave: () => Promise<void>;
  reconnect: () => Promise<void>;
  destroy: () => Promise<void>;

  getConnectionState: () => 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error' | 'ended';

  supportsWaitingRoom: boolean;
  supportsBreakoutRooms: boolean;
  supportsChat: boolean;
  supportsScreenShare: boolean;
  supportsRecording: boolean;
}

