import { BaseAuditFields } from '../../core/types';

export interface ICourse extends BaseAuditFields {
  id?: string;
  tenantId: string;
  name: string;
  description: string;
  price: number;
  isFree?: boolean;  // Optional — derived from price === 0 or set explicitly in Firestore
  visibility: 'public' | 'private' | 'restricted';
  courseStaffId?: string; // Primary default staff for the course
  assignedStaffIds?: string[];
  assignedStaff?: any[];
}

export interface ISubject extends BaseAuditFields {
  id?: string;
  courseId: string;
  name: string;
  order: number;
  defaultStaffId?: string; // Subject default staff override
}

export interface ITopic extends BaseAuditFields {
  id?: string;
  subjectId: string;
  name: string;
  order: number;
  progress?: number; // 0, 50, 75, 100 or computed progress
}

export interface ISubtopic extends BaseAuditFields {
  id?: string;
  topicId: string;
  name: string;
  description?: string;
  order: number;
  defaultStaffId?: string; // Subtopic default staff override
  completed?: boolean;
}

export interface IClass extends BaseAuditFields {
  id?: string;
  tenantId?: string;
  courseId?: string;
  subjectId?: string;
  topicId: string;
  subtopicId?: string;
  title: string;
  teacherId?: string;
  order: number;
  classType: 'recorded' | 'live';
  accessLevel: 'free' | 'premium' | 'batch';
  encryptedVideoId?: string; // Uploaded recording ID
  scheduledStartTime?: string;
  expectedDurationMinutes?: number;
  liveSession?: any; // Appended by service for frontend consumption
  attendance: {
    mode: 'percentage' | 'fixed_minutes' | 'full' | 'manual' | 'first_join_only' | 'teacher_marked' | 'hybrid';
    value: number;
    version: number; // Increments on any admin modification
    lockAfterStart: boolean;
    allowEditBeforeStart: boolean;
  };
}
