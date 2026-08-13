export type ZoomSessionState = 
  | 'VALID'
  | 'ENDED'
  | 'NOT_FOUND'
  | 'DELETED'
  | 'INVALID_HOST'
  | 'NO_START_URL'
  | 'AUTH_FAILED'
  | 'ACCOUNT_MISMATCH'
  | 'INSUFFICIENT_SCOPES'
  | 'TOKEN_EXPIRED'
  | 'INVALID_CREDENTIALS'
  | 'PROVIDER_LOOKUP_FAILED'
  | 'NETWORK_ERROR'
  | 'ZOOM_API_ERROR'
  | 'UNKNOWN_ERROR';

export interface VerifyResult {
  valid: boolean;
  state: ZoomSessionState;
  meetingId: string;
  uuid?: string;
}

export interface LiveProvider {
  /**
   * Initializes a new session on the provider's end (e.g. creating a Zoom meeting via REST API).
   * Should return any provider-specific session ID and launch payloads.
   */
  createSession(config: { title: string; startTime?: string; durationMinutes?: number; teacherId?: string; customProviderId?: string; providerPasscode?: string; providerAccountId?: string; meetingMode?: string; hostUrl?: string; participantUrl?: string; hostKey?: string; meetingCode?: string; }): Promise<{ providerSessionId: string, hostId?: string, launchPayload: any, providerAccountId?: string }>;
  
  /**
   * Called when a host clicks "Start Session". 
   * Retrieves the URL or payload required to launch the host client.
   */
  startSession(liveSession: any): Promise<{ type: 'url' | 'payload' | 'sdk', url?: string, payload?: any }>;
  
  /**
   * Cleans up the provider's state when the session ends (e.g., releasing host pools, stopping streams).
   */
  endSession(liveSession: any): Promise<void>;
  
  /**
   * Called when a student joins. 
   * Returns a signed JWT, specific HTML page, or token needed by the client's player.
   */
  generateJoinPayload(liveSession: any, studentInfo: any): Promise<any>;

  /** Optional methods for future capabilities */
  verifySession?(liveSession: any): Promise<VerifyResult>;
  
  /**
   * Optional diagnostic method to fetch a detailed forensic snapshot of the session state.
   */
  getDiagnostics?(liveSession: any): Promise<any>;
  
  pause?(liveSession: any): Promise<void>;
  resume?(liveSession: any): Promise<void>;
  destroy?(liveSession: any): Promise<void>;
}
