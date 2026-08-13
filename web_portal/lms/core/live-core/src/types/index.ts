export interface ILiveParticipant {
  id: string;
  name: string;
  role: UserRole;
  joinedAt: string;
}

export interface ILiveSession {
  id: string;
  sessionId: string;
  title: string;
  status: string;
  liveStatus: string;
  provider: string;
  startTime: string;
  endTime?: string;
  effectiveEndTime?: string;
  hostId: string;
  courseId?: string;
  classId?: string;
  participants: ILiveParticipant[];
  [key: string]: any;
}

export type UserRole = 'student' | 'teacher' | 'admin' | 'staff' | 'super_admin';

export interface LiveCapabilities {
  canStartMeeting?: boolean;
  canEndMeeting?: boolean;
  canStartAttendance?: boolean;
  canEndAttendance?: boolean;
  canMuteAll?: boolean;
  canManageParticipants?: boolean;
  canShareScreen?: boolean;
  canRecord?: boolean;
  canChat?: boolean;

  // Provider UI Responsibilities
  usesNativeMeetingUI?: boolean;
  nativeChat?: boolean;
  nativeParticipants?: boolean;
  nativeQA?: boolean;
  nativeToolbar?: boolean;
  nativeAudioVideo?: boolean;
  nativeScreenShare?: boolean;
  nativeReactions?: boolean;
}

