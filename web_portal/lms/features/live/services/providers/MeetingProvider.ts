export interface MeetingLaunchOptions {
  token: string;
  sessionId: string;
  role: 'admin' | 'teacher' | 'student' | 'staff';
}

export interface MeetingProvider {
  /** Uniquely identifies the provider (e.g., 'zoom', 'google-meet') */
  readonly id: string;

  /** Launches the meeting interface (e.g., opens popup, initializes iframe) */
  launch(options: MeetingLaunchOptions): Promise<void>;

  /** Handles joining the actual meeting session once launched */
  join(): Promise<void>;

  /** Attempts to reconnect if the connection drops */
  reconnect(): Promise<void>;

  /** Brings the meeting interface to the foreground */
  focus(): void;

  /** Gracefully leaves the meeting and closes the interface */
  close(): Promise<void>;

  /** Administratively ends the meeting for all participants (if supported) */
  endMeeting(): Promise<void>;

  // Feature Flags
  supportsChat(): boolean;
  supportsBreakoutRooms(): boolean;
  supportsRecording(): boolean;
}
