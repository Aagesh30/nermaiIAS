/**
 * MeetingLaunchRequest — provider-agnostic meeting launch descriptor.
 * The launcher only knows the token and session ID. Meeting credentials
 * stay on the server — the popup page exchanges the token itself.
 */
export interface MeetingLaunchRequest {
  /** Meeting provider identifier (e.g. 'zoom', 'google_meet', 'teams') */
  provider: 'zoom' | 'google_meet' | 'google-meet' | 'teams' | 'jitsi' | 'bbb' | string;
  /** One-time Redis token — the ONLY credential that reaches the client */
  token: string;
  /** Session ID for state correlation */
  sessionId: string;
}

export type MeetingWindowState =
  | 'idle'
  | 'opening'
  | 'open'
  | 'joined'
  | 'active'
  | 'reconnecting'
  | 'ended'
  | 'closed'
  | 'blocked'; // popup blocked by browser

/** Simplified event bridge — only top-level lifecycle events from the popup */
export type MeetingBridgeEvent =
  | 'MEETING_STARTED'
  | 'MEETING_ENDED'
  | 'WINDOW_CLOSED'
  | 'RECONNECT_REQUESTED'
  | 'LAUNCHER_OPENED'
  | 'MEET_LAUNCH_REQUESTED';
