import { BaseAuditFields } from '../../core/types';

export interface IClassAnalytics extends BaseAuditFields {
  id?: string;
  classId: string;
  tenantId: string;
  actualDurationMinutes?: number;
  teacherDelayMinutes?: number;
  attendancePercentage: number | null; // Explicitly null until reconciliation
  extensionCount: number;
  totalExtensionMinutes: number;
  recordingUploadedAfterMinutes?: number | null;
  attendanceRequiredMinutes?: number | null;
  attendanceAchievedMinutes?: number | null;
  averageJoinDelay?: number | null;
  averageExitEarly?: number | null;
  totalRecordingWatchTime?: number | null;
  peakConcurrentStudents?: number | null;
  averageWatchTime?: number | null;
  joinRate?: number | null;
  completionRate?: number | null;
  lateJoinPercentage?: number | null;
  dropoutPercentage?: number | null;
  recordingViews?: number | null;
  recordingCompletionPercentage?: number | null;
}
