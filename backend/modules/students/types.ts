import { BaseAuditFields } from '../../core/types';


export interface ProgramMembership {
  batchId: string;
  joinedAt: string;
  status: 'active' | 'suspended' | 'completed' | 'inactive';
}

export interface IStudentProfile extends BaseAuditFields {
  id: string; // matches Firebase Auth UID
  tenantId: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  rollNo?: string | null;
  status: 'active' | 'inactive' | 'suspended';
  programMemberships: ProgramMembership[];
  role?: string;
  fcmToken?: string;
  accessTier?: 'free' | 'paid' | 'scholarship' | 'blocked' | 'enrolled' | null;
  qrCodeEnabled?: boolean;
  qrCodeEnabledAt?: string | null;
  qrCodeRequested?: boolean;
  qrCodeRequestedAt?: string | null;
}

export interface IEnrollment extends BaseAuditFields {
  id: string;
  studentId: string;
  courseId: string;
  tenantId: string;
  enrollmentDate: string;
  status: 'active' | 'completed' | 'dropped' | 'suspended';
  validUntil?: string; // Optional expiry for subscriptions
  progressPercentage: number;
}

export interface IBatch extends BaseAuditFields {
  id: string;
  tenantId: string;
  name: string; // e.g. "Morning Batch 2026"
  courseId: string;
  maxCapacity: number;
  currentEnrollment: number;
  startDate: string;
  endDate?: string;
  status: 'upcoming' | 'active' | 'completed';
  batchType?: 'online' | 'offline' | 'recorded';
  capabilities?: IBatchCapabilities;
}

export interface IBatchCapabilities {
  canViewLive: boolean;
  canViewRecorded: boolean;
  canRequestRecorded: boolean;
  canRequestTopic: boolean;
  canRequestSubject: boolean;
  canRequestCourse: boolean;
}
