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
  subjectName?: string;
  topicId: string;
  subtopicId?: string;
  title: string;
  description?: string;
  teacherId?: string;
  teacherName?: string;
  topicName?: string;
  order: number;
  classType: 'recorded' | 'live' | 'zoom_live' | 'youtube_live' | 'youtube_recorded';
  accessLevel: 'free' | 'premium' | 'batch';
  targetBatchIds?: string[];
  targetCourses?: string[];
  encryptedVideoId?: string;
  encryptedRecordingId?: string;
  scheduledStartTime?: string;
  expectedDurationMinutes?: number;
  minimumAttendancePercentage?: number;
  attendanceThresholdMinutes?: number;
  liveSession?: any;
  attendance?: {
    mode: 'percentage' | 'fixed_minutes' | 'full' | 'manual' | 'first_join_only' | 'teacher_marked' | 'hybrid';
    value: number;
    version: number;
    lockAfterStart: boolean;
    allowEditBeforeStart: boolean;
  };
}
