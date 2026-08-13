import { redisClient } from '../../infrastructure/redis';
import { db } from '../../infrastructure/firebase';
import { AppError } from '../../core/errors/AppError';
import { getAccessContext } from '../../core/security/AccessCache';
import { NotificationService } from '../notifications/service';
import { AccessRulesRepository } from './repository';
import {
  IEntityPermission, IAccessRequest, IBatchCapabilities, IPermissionTemplate,
  EntityType, VisibilityMode, PermissionMode, CascadeMode, AccessDecision,
  EffectivePermission, LockReason, TemporaryGrant, AccessRequestReason,
  ApproveByFilterOptions, BatchType,
} from './types';

const repo = new AccessRulesRepository();
const notificationService = new NotificationService();

/** Redis TTL for resolved permission cache (5 minutes). */
const PERM_CACHE_TTL = 300;

function permCacheKey(entityId: string) {
  return `sacs:perm:${entityId}`;
}

// ─── Default Capabilities by Batch Type ──────────────────────────────────────

const DEFAULT_CAPABILITIES: Record<BatchType, IBatchCapabilities> = {
  online: {
    tenantId: '',
    batchType: 'online',
    canAccessLiveClasses: true,
    canAccessRecordedClasses: false,
    canAccessNotes: true,
    canAccessAssignments: true,
    canAccessTests: true,
    canRequestRecording: true,
  },
  offline: {
    tenantId: '',
    batchType: 'offline',
    canAccessLiveClasses: false,
    canAccessRecordedClasses: false,
    canAccessNotes: true,
    canAccessAssignments: true,
    canAccessTests: true,
    canRequestRecording: true,
  },
  recorded: {
    tenantId: '',
    batchType: 'recorded',
    canAccessLiveClasses: true,
    canAccessRecordedClasses: true,
    canAccessNotes: true,
    canAccessAssignments: true,
    canAccessTests: true,
    canRequestRecording: false,
  },
  free: {
    tenantId: '',
    batchType: 'free',
    canAccessLiveClasses: false,
    canAccessRecordedClasses: false,
    canAccessNotes: false,
    canAccessAssignments: false,
    canAccessTests: false,
    canRequestRecording: false,
  },
};

// ─── Lock Message Builder ─────────────────────────────────────────────────────

function buildLockMessage(reason: LockReason, perm: EffectivePermission): string {
  switch (reason) {
    case 'hidden_by_admin':
      return 'This content is hidden by the admin.';
    case 'batch_only': {
      // Ideally we'd fetch batch names here, but keep this synchronous for performance
      return '🔒 This content is restricted to selected batch students.';
    }
    case 'student_only':
      return '🔒 This content is restricted to selected students.';
    case 'scheduled_unlock':
      return `🔒 This content unlocks on ${new Date(perm.unlocksAt!).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}.`;
    case 'capability_blocked':
      return '🔒 Your batch type does not have access to this content.';
    default:
      return '🔒 You do not have access to this content.';
  }
}

// ─── SACS Service ──────────────────────────────────────────────────────────────

export class AccessRulesService {

  // ── 1. PERMISSION RESOLUTION ─────────────────────────────────────────────────

  /**
   * Walk up the entity hierarchy to find the nearest 'override' ancestor.
   * Results are cached in Redis for 5 minutes and invalidated on any write.
   *
   * Resolution order (highest priority first):
   *   entity itself (if override) → parent (if override) → … → default: public
   */
  async resolveEffectivePermission(
    entityId: string,
    entityType: EntityType,
    tenantId: string,
  ): Promise<EffectivePermission> {
    // 1. Redis cache hit
    try {
      const cached = await redisClient.get(permCacheKey(entityId));
      if (cached) return JSON.parse(cached) as EffectivePermission;
    } catch { /* Redis unavailable — continue to Firestore */ }

    // 2. Walk the hierarchy
    let currentId: string | undefined = entityId;
    let currentType: EntityType = entityType;
    const visited = new Set<string>();

    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      const perm = await repo.getPermission(currentId);

      if (!perm) {
        // No permission document — treat as inherit, walk to parent
        currentId = undefined; // fallback to default at end
        break;
      }

      if (perm.permissionMode === 'override') {
        const result: EffectivePermission = {
          resolvedFrom: perm.entityType,
          resolvedEntityId: currentId,
          permissionMode: 'override',
          visibility: perm.visibility ?? 'public',
          targetBatchIds: perm.targetBatchIds ?? [],
          targetStudentIds: perm.targetStudentIds ?? [],
          unlocksAt: perm.unlocksAt,
        };
        // Cache result
        try {
          await redisClient.set(permCacheKey(entityId), JSON.stringify(result), 'EX', PERM_CACHE_TTL);
        } catch { /* ignore */ }
        return result;
      }

      // permissionMode === 'inherit' — climb to parent
      currentId = perm.parentId;
    }

    // 3. Default: public (reached root without finding an override)
    const defaultPerm: EffectivePermission = {
      resolvedFrom: 'default',
      resolvedEntityId: entityId,
      permissionMode: 'inherit',
      visibility: 'public',
      targetBatchIds: [],
      targetStudentIds: [],
    };
    try {
      await redisClient.set(permCacheKey(entityId), JSON.stringify(defaultPerm), 'EX', PERM_CACHE_TTL);
    } catch { /* ignore */ }
    return defaultPerm;
  }

  /**
   * Full access evaluation for a student requesting an entity.
   *
   * Decision order:
   *   1. Scheduled unlock gate
   *   2. Hidden check
   *   3. Temporary grant (approved request with valid expiry)
   *   4. Batch capability check
   *   5. Visibility rule (public / batch / student / mixed)
   */
  async evaluateEntityAccess(
    userId: string,
    entityId: string,
    entityType: EntityType,
    tenantId: string,
  ): Promise<AccessDecision> {
    const [perm, permDoc, accessCtx] = await Promise.all([
      this.resolveEffectivePermission(entityId, entityType, tenantId),
      repo.getPermission(entityId),
      getAccessContext(userId, tenantId),
    ]);

    // 1. Scheduled unlock gate
    if (perm.unlocksAt && new Date(perm.unlocksAt) > new Date()) {
      return {
        allowed: false,
        lockReason: 'scheduled_unlock',
        lockMessage: buildLockMessage('scheduled_unlock', perm),
      };
    }

    // 2. Hidden — nobody except admin
    if (perm.visibility === 'hidden') {
      return {
        allowed: false,
        lockReason: 'hidden_by_admin',
        lockMessage: buildLockMessage('hidden_by_admin', perm),
      };
    }

    // 3. Check temporary grants on the DIRECT permission doc (not inherited)
    if (permDoc?.temporaryGrants) {
      const now = new Date();
      const grant = permDoc.temporaryGrants.find(
        g => g.studentId === userId && (!g.expiresAt || new Date(g.expiresAt) > now),
      );
      if (grant) {
        return {
          allowed: true,
          hasTemporaryGrant: true,
          grantExpiresAt: grant.expiresAt,
        };
      }
    }

    // 4. Batch capability check (for entity types that depend on batch type)
    if (accessCtx.batchIds.length > 0) {
      // Fetch capability for the student's first active batch (all batches should have same type per student)
      // In practice, most students belong to a single batch.
      const studentBatchId = accessCtx.batchIds[0];
      const caps = await repo.getBatchCapabilities(studentBatchId);
      const batchType: BatchType = (caps?.batchType ?? 'free');
      const defaults = DEFAULT_CAPABILITIES[batchType];
      const effectiveCaps = { ...defaults, ...(caps ?? {}) };

      if (entityType === 'class' || entityType === 'live_session') {
        // For recorded classes, rely on visibility rule below
        // For live classes, the batch capability is the gate
        // (actual live/recorded distinction handled by the video player service)
      }
      // Future: check per-entityType cap here (e.g., 'test' requires canAccessTests)
    } else {
      // No batch membership → free student
      // Free students only see 'public' content
      if (perm.visibility !== 'public') {
        return {
          allowed: false,
          lockReason: 'capability_blocked',
          lockMessage: buildLockMessage('capability_blocked', perm),
        };
      }
    }

    // 5. Visibility rule evaluation
    switch (perm.visibility) {
      case 'public':
        return { allowed: true };

      case 'batch': {
        const hasBatch = accessCtx.batchIds.some(id => perm.targetBatchIds.includes(id));
        if (!hasBatch) {
          return {
            allowed: false,
            lockReason: 'batch_only',
            lockMessage: buildLockMessage('batch_only', perm),
          };
        }
        return { allowed: true };
      }

      case 'student': {
        if (!perm.targetStudentIds.includes(userId)) {
          return {
            allowed: false,
            lockReason: 'student_only',
            lockMessage: buildLockMessage('student_only', perm),
          };
        }
        return { allowed: true };
      }

      case 'mixed': {
        const hasBatch   = accessCtx.batchIds.some(id => perm.targetBatchIds.includes(id));
        const hasStudent = perm.targetStudentIds.includes(userId);
        if (!hasBatch && !hasStudent) {
          return {
            allowed: false,
            lockReason: 'batch_only',
            lockMessage: buildLockMessage('batch_only', perm),
          };
        }
        return { allowed: true };
      }

      default:
        return { allowed: true };
    }
  }

  // ── 2. PERMISSION MANAGEMENT ──────────────────────────────────────────────────

  async setEntityPermission(
    entityId: string,
    entityType: EntityType,
    data: {
      permissionMode: PermissionMode;
      visibility?: VisibilityMode;
      targetBatchIds?: string[];
      targetStudentIds?: string[];
      parentId?: string;
      unlocksAt?: string;
      cascade?: CascadeMode;
    },
    adminId: string,
    tenantId: string,
  ): Promise<void> {
    const existing = await repo.getPermission(entityId);
    const now = new Date().toISOString();

    const permData: Partial<IEntityPermission> = {
      entityType,
      entityId,
      tenantId,
      permissionMode: data.permissionMode,
      visibility: data.permissionMode === 'override' ? (data.visibility ?? 'public') : undefined,
      targetBatchIds: data.permissionMode === 'override' ? (data.targetBatchIds ?? []) : undefined,
      targetStudentIds: data.permissionMode === 'override' ? (data.targetStudentIds ?? []) : undefined,
      parentId: data.parentId,
      unlocksAt: data.unlocksAt,
      updatedBy: adminId,
      updatedAt: now,
      ...(existing ? {} : { createdBy: adminId, createdAt: now }),
    };

    // Strip undefined values for Firestore
    Object.keys(permData).forEach(k => (permData as any)[k] === undefined && delete (permData as any)[k]);

    await repo.setPermission(entityId, permData);

    // Audit log
    await repo.addAuditEntry(entityId, {
      changedBy: adminId,
      changedAt: now,
      previousMode: existing?.permissionMode ?? 'inherit',
      newMode: data.permissionMode,
      previousVisibility: existing?.visibility,
      newVisibility: data.visibility,
      previousTargetBatchIds: existing?.targetBatchIds,
      newTargetBatchIds: data.targetBatchIds,
      cascadeApplied: data.cascade,
    });

    // Invalidate Redis cache for this entity
    await this._invalidateCache(entityId);

    // Cascade to children
    if (data.cascade && data.cascade !== 'this_only') {
      await this.cascadePermission(entityId, data.cascade, adminId, tenantId);
    }
  }

  /**
   * Propagate permission changes to child entities.
   * - 'inheriting_children': only reset children whose permissionMode is still 'inherit'
   * - 'force_all': reset ALL children to 'inherit' (clears their overrides)
   */
  async cascadePermission(
    parentId: string,
    mode: CascadeMode,
    adminId: string,
    tenantId: string,
  ): Promise<void> {
    if (mode === 'this_only') return;

    const children = await repo.getChildPermissions(parentId, tenantId);
    const now = new Date().toISOString();

    await Promise.all(children.map(async child => {
      if (mode === 'inheriting_children' && child.permissionMode !== 'inherit') return;

      // Reset child to 'inherit' so it picks up the parent's new rule
      await repo.setPermission(child.entityId, {
        permissionMode: 'inherit',
        updatedBy: adminId,
        updatedAt: now,
      });
      await this._invalidateCache(child.entityId);

      // Recursively cascade down the tree
      await this.cascadePermission(child.entityId, mode, adminId, tenantId);
    }));
  }

  /**
   * Advisory only — never blocks. Returns a warning if child would be more
   * restrictive than its resolved parent permission.
   */
  async detectConflict(
    parentId: string,
    childVisibility: VisibilityMode,
    tenantId: string,
  ): Promise<{ hasConflict: boolean; message: string } | null> {
    const parentPerm = await repo.getPermission(parentId);
    if (!parentPerm || parentPerm.permissionMode !== 'override') return null;

    const VISIBILITY_ORDER: VisibilityMode[] = ['public', 'mixed', 'batch', 'student', 'hidden'];
    const parentIdx = VISIBILITY_ORDER.indexOf(parentPerm.visibility ?? 'public');
    const childIdx  = VISIBILITY_ORDER.indexOf(childVisibility);

    if (childIdx > parentIdx) {
      return {
        hasConflict: true,
        message: `This item's visibility (${childVisibility}) is more restrictive than its parent (${parentPerm.visibility}). Students who can see the parent may not see this item.`,
      };
    }
    return null;
  }

  private async _invalidateCache(entityId: string): Promise<void> {
    try { await redisClient.del(permCacheKey(entityId)); } catch { /* ignore */ }
  }

  // ── 3. ACCESS REQUESTS ────────────────────────────────────────────────────────

  async submitAccessRequest(
    studentId: string,
    entityId: string,
    entityType: EntityType,
    entityName: string,
    reason: AccessRequestReason,
    customReason: string | undefined,
    tenantId: string,
  ): Promise<string> {
    // Prevent duplicate pending requests
    const existing = await repo.getStudentPendingRequest(studentId, entityId);
    if (existing) throw new AppError('You already have a pending request for this content.', 409);

    const now = new Date().toISOString();
    const requestId = await repo.createAccessRequest({
      tenantId,
      studentId,
      entityId,
      entityType,
      entityName,
      reason,
      customReason,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      createdBy: studentId,
      updatedBy: studentId,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });

    // Notify admins (fire-and-forget)
    notificationService.dispatchNotification({
      tenantId,
      title: 'New Access Request',
      body: `A student has requested access to "${entityName}".`,
      visibility: 'global', // admins subscribe to global notifications
      metadata: { requestId, entityId, entityType },
    }).catch(() => {});

    return requestId;
  }

  async approveRequest(
    requestId: string,
    adminId: string,
    tenantId: string,
    grantExpiresAt?: string,
  ): Promise<void> {
    const request = await repo.getAccessRequest(requestId);
    if (!request) throw new AppError('Request not found', 404);
    if (request.tenantId !== tenantId) throw new AppError('Tenant mismatch', 403);
    if (request.status !== 'pending') throw new AppError('Request is no longer pending', 400);

    const now = new Date().toISOString();

    // Write temporary grant to entity_permissions
    const grant: TemporaryGrant = {
      studentId: request.studentId,
      grantedAt: now,
      expiresAt: grantExpiresAt,
      grantedBy: adminId,
      requestId,
    };

    const permDoc = await repo.getPermission(request.entityId);
    const existingGrants = permDoc?.temporaryGrants ?? [];
    // Remove any previous grant for the same student before adding new one
    const filteredGrants = existingGrants.filter(g => g.studentId !== request.studentId);

    await repo.setPermission(request.entityId, {
      temporaryGrants: [...filteredGrants, grant],
      updatedBy: adminId,
      updatedAt: now,
    });

    // Update request status
    await repo.updateAccessRequest(requestId, {
      status: 'approved',
      reviewedBy: adminId,
      reviewedAt: now,
      grantExpiresAt,
    });

    // Invalidate student's access cache so new grant is effective immediately
    const { invalidateAccessCache } = await import('../../core/security/AccessCache');
    await invalidateAccessCache(request.studentId);
    await this._invalidateCache(request.entityId);

    // Notify student
    notificationService.dispatchNotification({
      tenantId,
      title: 'Access Granted ✅',
      body: `Your request for "${request.entityName}" has been approved.`,
      visibility: 'student',
      targetStudentIds: [request.studentId],
      metadata: {
        studentId: request.studentId,
        entityId: request.entityId,
        ...(grantExpiresAt ? { grantExpiresAt } : {}),
      },
    }).catch(() => {});
  }

  async rejectRequest(requestId: string, adminId: string, tenantId: string): Promise<void> {
    const request = await repo.getAccessRequest(requestId);
    if (!request) throw new AppError('Request not found', 404);
    if (request.tenantId !== tenantId) throw new AppError('Tenant mismatch', 403);

    const now = new Date().toISOString();
    await repo.updateAccessRequest(requestId, {
      status: 'rejected',
      reviewedBy: adminId,
      reviewedAt: now,
    });

    notificationService.dispatchNotification({
      tenantId,
      title: 'Access Request Declined',
      body: `Your request for "${request.entityName}" was not approved.`,
      visibility: 'student',
      targetStudentIds: [request.studentId],
      metadata: { studentId: request.studentId, entityId: request.entityId },
    }).catch(() => {});
  }

  async bulkApproveRequests(
    requestIds: string[],
    adminId: string,
    tenantId: string,
    grantExpiresAt?: string,
  ): Promise<{ approved: number; failed: number }> {
    let approved = 0;
    let failed = 0;
    await Promise.all(requestIds.map(async id => {
      try {
        await this.approveRequest(id, adminId, tenantId, grantExpiresAt);
        approved++;
      } catch {
        failed++;
      }
    }));
    return { approved, failed };
  }

  async approveByFilter(
    entityId: string,
    filter: ApproveByFilterOptions,
    adminId: string,
    tenantId: string,
  ): Promise<{ approved: number; failed: number }> {
    let pendingRequests = await repo.getPendingRequestsByEntity(entityId, tenantId);

    // Apply filters
    if (filter.batchId || filter.joinedBefore || filter.attendanceAbove || filter.studentIds) {
      // Fetch student profiles to filter
      const studentIds = [...new Set(pendingRequests.map(r => r.studentId))];
      const studentDocs = await Promise.all(
        studentIds.map(id => db.collection('students').doc(id).get())
      );
      const studentMap = new Map(studentDocs.map(d => [d.id, d.data()]));

      pendingRequests = pendingRequests.filter(req => {
        const profile = studentMap.get(req.studentId);
        if (!profile) return false;

        if (filter.studentIds && !filter.studentIds.includes(req.studentId)) return false;

        if (filter.batchId) {
          const memberships: any[] = profile.programMemberships ?? [];
          const inBatch = memberships.some(m => m.status === 'active' && m.batchId === filter.batchId);
          if (!inBatch) return false;
        }

        if (filter.joinedBefore) {
          const joined = profile.createdAt ?? '';
          if (joined > filter.joinedBefore) return false;
        }

        // attendanceAbove filter would require querying the attendance module
        // — left as extension point for now

        return true;
      });
    }

    const requestIds = pendingRequests.map(r => r.id!);
    return this.bulkApproveRequests(requestIds, adminId, tenantId, filter.grantExpiresAt);
  }

  // ── 4. BATCH CAPABILITIES ──────────────────────────────────────────────────────

  async setBatchCapabilities(
    batchId: string,
    data: Partial<IBatchCapabilities>,
    adminId: string,
    tenantId: string,
  ): Promise<void> {
    await repo.setBatchCapabilities(batchId, { ...data, tenantId });
  }

  async getBatchCapabilities(batchId: string, tenantId: string): Promise<IBatchCapabilities> {
    const caps = await repo.getBatchCapabilities(batchId);
    if (!caps) {
      // Return sensible defaults for an unknown batch
      return { ...DEFAULT_CAPABILITIES.free, tenantId };
    }
    return caps;
  }

  // ── 5. TEMPLATES ─────────────────────────────────────────────────────────────

  async saveTemplate(
    name: string,
    permData: Partial<IPermissionTemplate>,
    adminId: string,
    tenantId: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    return repo.createTemplate({
      ...permData,
      name,
      tenantId,
      permissionMode: 'override',
      visibility: permData.visibility ?? 'public',
      createdBy: adminId,
      updatedBy: adminId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    } as any);
  }

  async applyTemplate(
    entityId: string,
    entityType: EntityType,
    templateId: string,
    cascade: CascadeMode,
    adminId: string,
    tenantId: string,
  ): Promise<void> {
    const template = await repo.getTemplate(templateId);
    if (!template) throw new AppError('Template not found', 404);

    const expiresAt = template.expiresInDays
      ? new Date(Date.now() + template.expiresInDays * 86400 * 1000).toISOString()
      : undefined;

    await this.setEntityPermission(
      entityId,
      entityType,
      {
        permissionMode: 'override',
        visibility: template.visibility,
        targetBatchIds: template.targetBatchIds,
        targetStudentIds: template.targetStudentIds,
        unlocksAt: expiresAt,
        cascade,
      },
      adminId,
      tenantId,
    );
  }

  async listTemplates(tenantId: string): Promise<IPermissionTemplate[]> {
    return repo.listTemplates(tenantId);
  }

  // ── 6. MATRIX & AUDIT ─────────────────────────────────────────────────────────

  /** Returns all permissions for a course tree flattened into a single response. */
  async getPermissionMatrix(courseId: string, tenantId: string): Promise<Record<string, IEntityPermission | null>> {
    const permTypes: EntityType[] = ['subject', 'topic', 'class', 'resource'];
    const results: Record<string, IEntityPermission | null> = {};

    // Include the course itself
    results[courseId] = await repo.getPermission(courseId);

    // Fetch all child permissions by type for this tenant, then filter by parentId chain
    // (Simplified: return all permissions belonging to this tenant for the matrix view)
    await Promise.all(permTypes.map(async type => {
      const perms = await repo.getPermissionsByType(type, tenantId);
      perms.forEach(p => { results[p.entityId] = p; });
    }));

    return results;
  }

  async getAuditLog(entityId: string): Promise<any[]> {
    return repo.getAuditLog(entityId);
  }

  async listAccessRequests(tenantId: string, filters: {
    status?: 'pending' | 'approved' | 'rejected';
    entityId?: string;
    studentId?: string;
    limit?: number;
    startAfter?: string;
  }): Promise<IAccessRequest[]> {
    return repo.listAccessRequests(tenantId, filters);
  }

  async getMyAccessRequests(studentId: string, tenantId: string): Promise<IAccessRequest[]> {
    return repo.listAccessRequests(tenantId, { studentId });
  }

  async getLockStatus(
    userId: string,
    entityId: string,
    entityType: EntityType,
    tenantId: string,
  ): Promise<{
    decision: AccessDecision;
    effectivePerm: EffectivePermission;
    pendingRequest: IAccessRequest | null;
  }> {
    const [decision, effectivePerm, pendingRequest] = await Promise.all([
      this.evaluateEntityAccess(userId, entityId, entityType, tenantId),
      this.resolveEffectivePermission(entityId, entityType, tenantId),
      repo.getStudentPendingRequest(userId, entityId),
    ]);
    return { decision, effectivePerm, pendingRequest };
  }
}
