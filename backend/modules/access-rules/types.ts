import { BaseAuditFields } from '../../core/types';

// ─── Visibility Modes ────────────────────────────────────────────────────────

export type VisibilityMode = 'public' | 'batch' | 'student' | 'mixed' | 'hidden';
export type PermissionMode = 'inherit' | 'override';

export type EntityType =
  | 'course'
  | 'subject'
  | 'topic'
  | 'class'
  | 'resource'
  | 'assignment'
  | 'test'
  | 'live_session';

export type AccessRequestReason =
  | 'revision'
  | 'missed_live'
  | 'medical_leave'
  | 'purchased_later'
  | 'other';

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export type BatchType = 'online' | 'offline' | 'recorded' | 'free';

export type CascadeMode = 'this_only' | 'inheriting_children' | 'force_all';

// ─── Temporary Grant ─────────────────────────────────────────────────────────

export interface TemporaryGrant {
  studentId: string;
  grantedAt: string;   // ISO
  expiresAt?: string;  // ISO — undefined = never expires
  grantedBy: string;   // adminId
  requestId?: string;  // links back to the access_request that triggered it
}

// ─── Entity Permission Document ───────────────────────────────────────────────

export interface IEntityPermission extends BaseAuditFields {
  entityType: EntityType;
  entityId: string;
  tenantId: string;

  /** ID of the direct parent entity (used for hierarchy resolution and cascades) */
  parentId?: string;

  /**
   * 'inherit' = use the resolved permission from the nearest ancestor with 'override'.
   * 'override' = use the visibility fields below. Every new entity defaults to 'inherit'.
   */
  permissionMode: PermissionMode;

  // ── Only relevant when permissionMode === 'override' ──────────────────────

  /** The selected visibility mode for this entity. */
  visibility?: VisibilityMode;

  /** Batch IDs targeted (used for 'batch' and 'mixed' modes). */
  targetBatchIds?: string[];

  /** Student IDs targeted (used for 'student' and 'mixed' modes). */
  targetStudentIds?: string[];

  // ── Temporary Access ──────────────────────────────────────────────────────

  /**
   * Per-student temporary grants. Admin-approved access requests write here.
   * The evaluator checks this array BEFORE applying the general visibility rule,
   * so a student with a valid, non-expired grant always gets through.
   */
  temporaryGrants?: TemporaryGrant[];

  /** Scheduled unlock: entity becomes accessible at this UTC datetime. */
  unlocksAt?: string; // ISO
}

// ─── Permission Audit Log ────────────────────────────────────────────────────

export interface IPermissionAuditEntry {
  id?: string;
  changedBy: string;
  changedAt: string;
  previousMode: PermissionMode;
  newMode: PermissionMode;
  previousVisibility?: VisibilityMode;
  newVisibility?: VisibilityMode;
  previousTargetBatchIds?: string[];
  newTargetBatchIds?: string[];
  previousTargetStudentIds?: string[];
  newTargetStudentIds?: string[];
  cascadeApplied?: CascadeMode;
  note?: string;
}

// ─── Access Request Document ─────────────────────────────────────────────────

export interface IAccessRequest extends BaseAuditFields {
  id?: string;
  tenantId: string;
  studentId: string;

  entityId: string;
  entityType: EntityType;
  /** Denormalized display name so the admin dashboard renders without a join. */
  entityName: string;
  /** Human-readable breadcrumb: "IAS 2027 > Polity > Fundamental Rights" */
  parentPath?: string;

  reason: AccessRequestReason;
  customReason?: string;

  status: AccessRequestStatus;
  reviewedBy?: string;
  reviewedAt?: string;

  /** Populated by admin on approval — if set, access is temporary. */
  grantExpiresAt?: string; // ISO
}

// ─── Batch Capabilities Document ─────────────────────────────────────────────

export interface IBatchCapabilities {
  id?: string; // == batchId
  tenantId: string;
  batchType: BatchType;

  canAccessLiveClasses: boolean;
  canAccessRecordedClasses: boolean;
  canAccessNotes: boolean;
  canAccessAssignments: boolean;
  canAccessTests: boolean;
  /** Allows students to file a "Request Access" for recorded content they don't own. */
  canRequestRecording: boolean;
}

// ─── Permission Template Document ────────────────────────────────────────────

export interface IPermissionTemplate extends BaseAuditFields {
  id?: string;
  tenantId: string;
  name: string;             // e.g. "Online Only", "Revision Week"
  permissionMode: 'override'; // templates always carry an explicit override
  visibility: VisibilityMode;
  targetBatchIds?: string[];
  targetStudentIds?: string[];
  /** If set, temporary grants applied via this template expire after N days. */
  expiresInDays?: number;
}

// ─── Engine Output Types ──────────────────────────────────────────────────────

export type LockReason =
  | 'batch_only'
  | 'student_only'
  | 'hidden_by_admin'
  | 'scheduled_unlock'
  | 'capability_blocked'
  | 'no_lock'; // access is granted

export interface EffectivePermission {
  resolvedFrom: EntityType | 'default';
  resolvedEntityId: string;
  permissionMode: PermissionMode;
  visibility: VisibilityMode;
  targetBatchIds: string[];
  targetStudentIds: string[];
  unlocksAt?: string;
}

export interface AccessDecision {
  allowed: boolean;
  lockReason?: LockReason;
  /** Human-readable lock message shown to the student UI. */
  lockMessage?: string;
  /** True if a temporary grant exists for this specific student. */
  hasTemporaryGrant?: boolean;
  grantExpiresAt?: string;
}

// ─── Request Filter (for bulkApprove / approveByFilter) ──────────────────────

export interface ApproveByFilterOptions {
  /** Approve only requests from students in this batch. */
  batchId?: string;
  /** Approve only requests from students who joined before this date (ISO). */
  joinedBefore?: string;
  /** Approve only requests from students with attendance% above this value. */
  attendanceAbove?: number;
  /** Approve a specific list of studentIds. */
  studentIds?: string[];
  /** If set, approved grants expire at this ISO datetime. */
  grantExpiresAt?: string;
}
