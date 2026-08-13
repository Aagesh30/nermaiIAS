import { BaseAuditFields } from './core';

export type InteractionContextType =
  | 'live_class'
  | 'recorded_class'
  | 'course'
  | 'subject'
  | 'topic'
  | 'resource'
  | 'assignment'
  | 'announcement';

export interface InteractionContext {
  tenantId: string;
  contextType: InteractionContextType;
  contextId: string;
  parentCourseId?: string;
  parentSubjectId?: string;
  parentTopicId?: string;
}

export type InteractionEventType =
  | 'CHAT'
  | 'QUESTION'
  | 'VOICE'
  | 'REACTION'
  | 'HAND'
  | 'POLL'
  | 'POLL_VOTE'
  | 'TEACHER_REPLY'
  | 'DELETE'
  | 'PIN'
  | 'MUTE'
  | 'SYSTEM'
  | 'ASSISTANT'
  | 'AI_REPLY'
  | 'QUIZ'
  | 'RESOURCE_SHARE'
  | 'BADGE'
  | 'CERTIFICATE';

export type InteractionStatus = 'NEW' | 'VISIBLE' | 'PINNED' | 'ANSWERED' | 'ARCHIVED' | 'DELETED';

export interface InteractionAttachment {
  type: 'image' | 'pdf' | 'audio' | 'video';
  url: string;
  thumbnail?: string;
  size?: number;
}

export interface InteractionReference {
  videoPosition?: number;
  pageNumber?: number;
  assignmentQuestion?: string;
  liveTimestamp?: number;
}

export interface IInteraction extends BaseAuditFields {
  id: string; 
  context: InteractionContext;
  interactionType: InteractionEventType;
  userId: string;
  userName?: string; 
  
  payload: Record<string, any>;
  attachments?: InteractionAttachment[];
  reference?: InteractionReference;
  status: InteractionStatus;
  parentId?: string; 
  metadata?: Record<string, any>; 
  isEdited?: boolean;
}

export interface InteractionSettings {
  chatEnabled: boolean;
  voiceEnabled: boolean;
  questionEnabled: boolean;
  reactionEnabled: boolean;
  pollEnabled: boolean;
  anonymousPoll: boolean;
  slowMode: {
    enabled: boolean;
    intervalSeconds: number;
  };
  editWindowMinutes: number;
  studentCanDelete: boolean;
  teacherOnlyChat: boolean;
  maxVoiceDurationSec: number;
}
