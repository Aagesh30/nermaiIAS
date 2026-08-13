import { BaseAuditFields } from '../../core/types';

export interface ILiveSession extends BaseAuditFields {
  id?: string;
  classId: string;
  provider: 'zoom' | 'youtube' | 'google_meet' | 'teams' | 'custom';
  providerSessionId?: string; // e.g. Zoom Meeting ID, YouTube Video ID
  providerAccountId?: string; // Links to provider_accounts
  hostId?: string; // Legacy: Reference to the Host Profile (e.g. zoom_hosts ID)
  status: 'DRAFT' | 'SCHEDULED' | 'JOINING' | 'HOST_CONNECTED' | 'LIVE' | 'ATTENDANCE_RUNNING' | 'ENDING' | 'ENDED' | 'CANCELLED' | 'EXPIRED' | 'ARCHIVED';
  scheduledStartTime?: string;
  expectedDurationMinutes?: number;
  providerVersion?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  extensionMinutes?: number;
  extensionLog?: Array<{ minutes: number; reason?: string; timestamp: string; adminId: string }>;
  launchPayload?: any; // Stores provider-specific data like start_url, join_url, passcode
  
  // Session Ownership & Audit
  sessionStartedBy?: string;
  sessionEndedBy?: string;
  assignedStaffIds?: string[]; // Array of user IDs assigned as moderators
  staffAssignmentsHistory?: Array<{
    action: 'ASSIGNED' | 'REMOVED';
    userId: string;
    adminId: string;
    timestamp: string;
  }>;
  
  // Independent Attendance State
  attendance?: {
    status: 'NOT_STARTED' | 'LIVE' | 'ENDED' | 'LOCKED';
    startedAt?: string;
    endedAt?: string;
    startedBy?: string;
    endedBy?: string;
  };
  
  // Recording Metadata Placeholders
  recording?: {
    status: 'none' | 'processing' | 'ready';
    providerRecordingId?: string;
    url?: string;
  };
  
  // Analytics Metadata
  sessionAnalytics?: {
    averageWatchTime?: number;
    peakParticipants?: number;
    joinCount?: number;
    dropCount?: number;
    completionRate?: number;
  };

  // Configuration & Versioning
  waitingRoomEnabled?: boolean;
  sessionVersion?: number;

  // Audit / History
  history?: Array<{
    action: string;
    userId: string;
    timestamp: string;
    metadata?: any;
  }>;
}

export type ModerationStatus = 'NONE' | 'WAITING' | 'APPROVED' | 'REJECTED' | 'KICKED';
export type PresenceStatus = 'OFFLINE' | 'CONNECTING' | 'JOINED' | 'RECONNECTING' | 'LEFT';

export interface ILiveParticipant {
  studentId: string;
  displayName: string;
  avatarUrl?: string;
  role?: 'HOST' | 'PARTICIPANT' | 'CO_HOST';
  connectionState?: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED';
  providerParticipantId?: string;

  // Decoupled Statuses
  moderationStatus: ModerationStatus;
  presenceStatus: PresenceStatus;

  // Timestamps
  requestedAt?: string;
  approvedAt?: string;
  joinedAt?: string;
  leftAt?: string;
  lastHeartbeat: string;

  // Device & Platform Info
  device?: string;
  platform?: 'web' | 'android' | 'ios';

  // Audit Fields
  approvedBy?: string;
  kickedBy?: string;
  kickReasonCode?: 'SPAM' | 'MISCONDUCT' | 'DISRUPTION' | 'OTHER';
  kickCustomMessage?: string;

  // Interactivity (Raise Hand)
  isHandRaised: boolean;
  handRaisedAt?: string;

  // Audio / Provider Capabilities (Future-proof)
  isMuted?: boolean;
  canSpeak?: boolean;
  capabilities: {
    canJoin: boolean;
    canRaiseHand: boolean;
    canChat: boolean;
    canSpeak: boolean;
  };
}

export interface ILiveBlock {
  studentId: string;
  displayName?: string;
  blockedBy: string;
  blockedAt: string;
  reason?: string;
  active: boolean;
  unblockedAt?: string;
  unblockedBy?: string;
}

export interface ILiveSessionEvent {
  id?: string;
  sessionId: string;
  studentId?: string;
  actorId: string;
  eventType:
    | 'JOIN_REQUEST'
    | 'APPROVED'
    | 'REJECTED'
    | 'JOINED'
    | 'LEFT'
    | 'KICKED'
    | 'ALLOW_REJOIN'
    | 'BLOCKED'
    | 'UNBLOCKED'
    | 'HAND_RAISED'
    | 'HAND_LOWERED';
  metadata?: Record<string, any>;
  timestamp: string;
}

export interface IZoomHost extends BaseAuditFields {
  id?: string;
  email: string;
  zoomUserId: string; // The specific User ID in Zoom (e.g. u_123)
  currentSessions: number;
  maxConcurrentSessions: number; // e.g. 1 for basic, 2+ for enterprise
  status: 'available' | 'busy'; // Pool availability status
  isActive: boolean; // Whether this host is enabled in the pool
  currentMeetingId?: string; // Meeting ID currently assigned
  lastHeartbeat?: string;
  lastUsedAt?: string;
}
