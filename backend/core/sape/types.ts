import { BaseAuditFields } from '../types';

export type EntityType = 'CLASS' | 'LIVE_SESSION' | 'TOPIC' | 'SUBJECT' | 'COURSE' | 'NOTE' | 'PDF' | 'ASSIGNMENT' | 'TEST' | 'QUIZ' | 'RESOURCE';
export type AccessStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';
export type AccessType = 'TEMPORARY' | 'PERMANENT';

// SAPE / SARS Request System
export interface IAccessRequest extends BaseAuditFields {
  id: string;
  studentId: string;
  batchId: string | null;
  requestType: EntityType;
  contentId: string;
  contentName?: string;  // Human-readable name for UI display
  reason: string;
  requestedAt: string;
  status: AccessStatus;
  rejectionReason?: string;
  approvedDurationHours?: number | null;
  expiresAt?: string | null;
}

// Single source of truth for explicit grants
export interface IContentAccess extends BaseAuditFields {
  id: string;
  studentId: string;
  entityType: EntityType;
  entityId: string;
  accessType: AccessType;
  grantedBy: string; // admin user ID
  grantedAt: string;
  expiresAt: string | null; // null if permanent
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
  permissionVersion: number;
}

// Optional diagnostics cache
export interface IEffectiveAccessCache extends BaseAuditFields {
  id: string;
  studentId: string;
  entityType: EntityType;
  entityId: string;
  accessSource: 'BATCH' | 'TEMPORARY' | 'PERMANENT' | 'PUBLIC';
  expiresAt: string | null;
  lastCalculated: string;
  permissionVersion: number;
}

// Quotas
export interface IBatchQuota extends BaseAuditFields {
  id: string; // usually the batchId
  monthlyPool: number | null; // null means unlimited
  tenantId: string;
}

// Limit usage
export interface IStudentRequestUsage extends BaseAuditFields {
  id: string;
  studentId: string;
  month: string; // YYYY-MM format
  recordedUnitsUsed: number;
  monthlyLimit: number | null; // captured limit
}

// Global System Settings
export interface ISystemSettings extends BaseAuditFields {
  id: string; // usually 'default' or tenantId
  requestLimits: {
    offlineRecordedUnitsPerMonth: number | null;
    maxPendingRequests: number;
  };
  accessPresets: {
    [presetId: string]: {
      name: string;
      durationHours: number | null; // null for permanent
      ignoreLimits: boolean;
      entityTypesAllowed: EntityType[];
    }
  };
}

// Audit Logs
export type AuditAction = 'APPROVED' | 'EXTENDED' | 'SHORTENED' | 'REVOKED' | 'AUTO_EXPIRED' | 'PERMANENT_GRANTED' | 'PERMANENT_REMOVED';

export interface IAccessAuditLog extends BaseAuditFields {
  id: string;
  studentId: string;
  entityType: EntityType;
  entityId: string;
  action: AuditAction;
  performedBy: string; // admin ID or 'SYSTEM' for auto_expired
  reason?: string;
  previousExpiry?: string | null;
  newExpiry?: string | null;
}
