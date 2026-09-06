import { db } from '../../infrastructure/firebase';
import { EntityType, IContentAccess } from './types';
import { ContentHierarchyService } from '../hierarchy/ContentHierarchyService';
import { CapabilityResolver } from './CapabilityResolver';
import { IStudentProfile, IBatch, IBatchCapabilities } from '../../modules/students/types';
import { STUDENT_COLLECTIONS } from '../../modules/students/constants';

export type DenialReason =
  | 'NOT_ENROLLED'       // Student doesn't exist in DB at all
  | 'FREE_PLAN'          // Student has no batch membership
  | 'WRONG_COURSE'       // Student is not enrolled in the course this class belongs to
  | 'TARGET_MISMATCH'    // Student is in the course, but not targeted for this class
  | 'ONLINE_RECORDED'    // Online student trying to access a recorded class
  | 'OFFLINE_RECORDED'   // Offline student trying to access a recorded class
  | 'OFFLINE_LIVE'       // Offline student trying to access a live class
  | 'NO_CAPABILITY'      // Generic capability mismatch
  | 'LIMIT_EXCEEDED';    // Has capability but hit monthly unit limit

export interface RequestScope {
  type: EntityType;
  contentId: string;
  contentName?: string;
  count: number;       // number of recorded classes
  units: number;       // unit cost
  allowed: boolean;    // can student submit this scope?
  reason?: string;     // why not allowed (if !allowed)
  isPending?: boolean; // true if already submitted and pending
}

export interface SAPEDecision {
  allowed: boolean;
  reason: DenialReason | string;
  // Enriched context for the UI to build the correct screen
  context?: {
    batchType?: 'online' | 'offline' | 'recorded' | 'free' | null;
    classType?: string;
    batchName?: string;
  };
  source?: 'ADMIN' | 'PERMANENT' | 'TEMPORARY' | 'BATCH' | 'PUBLIC';
  // Request options for denied students
  allowedRequestScopes?: RequestScope[];
  remainingRecordedUnits?: number;
  monthlyLimit?: number;
}

export class AccessPolicyEngine {
  private hierarchyService = new ContentHierarchyService();

  async evaluateAccess(
    studentId: string,
    entityType: EntityType,
    entityId: string,
    isAdminOverride: boolean = false
  ): Promise<SAPEDecision> {

    // 1. Admin Override — always allow
    if (isAdminOverride) {
      return { allowed: true, reason: 'Admin Quick Grant Override', source: 'ADMIN' };
    }

    // 2. EARLY GRANT CHECK — check content_access BEFORE profile lookup.
    //    This handles legacy students (from 'students' collection) who are not in
    //    'student_profiles', so they would otherwise get NOT_ENROLLED even with a
    //    valid admin-approved grant.
    const earlyTree = [
      { type: entityType, id: entityId },
      ...(await this.hierarchyService.getParents(entityType, entityId))
    ];

    for (const node of earlyTree) {
      const grantSnap = await db.collection('content_access')
        .where('studentId', '==', studentId)
        .where('entityType', '==', node.type)
        .where('entityId', '==', node.id)
        .where('status', '==', 'ACTIVE')
        .get();

      for (const doc of grantSnap.docs) {
        const grant = doc.data() as IContentAccess;
        if (grant.accessType === 'PERMANENT') {
          return { allowed: true, reason: `PERMANENT ${node.type} grant`, source: 'PERMANENT' };
        }
        if (grant.accessType === 'TEMPORARY') {
          if (!grant.expiresAt || new Date(grant.expiresAt) > new Date()) {
            return { allowed: true, reason: `TEMPORARY ${node.type} grant`, source: 'TEMPORARY' };
          }
        }
      }
    }

    // 3. Load student profile
    const studentDoc = await db.collection(STUDENT_COLLECTIONS.PROFILES).doc(studentId).get();
    if (!studentDoc.exists) {
      // Also check legacy 'students' collection for basic enrollment info
      const legacyDoc = await db.collection('students').doc(studentId).get();
      if (!legacyDoc.exists) {
        return { allowed: false, reason: 'NOT_ENROLLED' };
      }
      // Legacy student with no grant — deny but give a useful reason
      return { allowed: false, reason: 'NOT_ENROLLED' };
    }
    const student = studentDoc.data() as IStudentProfile;

    // 4. Gather all active batch memberships + capabilities
    const activeMemberships = student.programMemberships?.filter(m => m.status === 'active') || [];

    if (activeMemberships.length === 0) {
      return {
        allowed: false,
        reason: 'FREE_PLAN',
        context: { batchType: 'free' },
        allowedRequestScopes: []
      };
    }

    // Load all batches and merge capabilities & enrolled courses.
    // Capability source priority:
    //   1. Explicit batch.capabilities object in Firestore (most precise)
    //   2. Derived from batch.batchType string (fallback, matches listing service logic)
    //   3. No known type at all → treat as 'online' (matrix: 'No recognized batch type → Live: ✅')
    const batchCapabilities: IBatchCapabilities[] = [];
    const batchDocs: IBatch[] = [];
    const enrolledCourseIds = new Set<string>();

    for (const m of activeMemberships) {
      if ((m as any).courseId) enrolledCourseIds.add((m as any).courseId);
      if (m.batchId) {
        const batchDoc = await db.collection(STUDENT_COLLECTIONS.BATCHES).doc(m.batchId).get();
        if (batchDoc.exists) {
          const batch = { id: batchDoc.id, ...batchDoc.data() } as IBatch;
          batchDocs.push(batch);
          if (batch.courseId) enrolledCourseIds.add(batch.courseId);
          if (batch.capabilities) {
            // Explicit capabilities object — highest priority.
            batchCapabilities.push(batch.capabilities);
          } else if (batch.batchType) {
            // No explicit capabilities → derive from batchType so SAPE matches the
            // listing service exactly (both now use the same authoritative matrix).
            batchCapabilities.push(AccessPolicyEngine.deriveCapsFromBatchType(batch.batchType));
          }
          // If neither capabilities nor batchType exists, we handle it after the loop.
        }
      }
    }

    // 'No recognized batch type' fallback: matrix says treat as Online → Live ✅, Recorded ❌.
    // This fires when the student has active memberships but NONE of the batch docs have
    // a capabilities object or a known batchType.
    const hasAnyCapability = batchCapabilities.length > 0;
    const effectiveCapabilities = hasAnyCapability
      ? batchCapabilities
      : [{ canViewLive: true, canViewRecorded: false, canRequestRecorded: true,
             canRequestTopic: true, canRequestSubject: false, canRequestCourse: false }];

    const mergedCapabilities = CapabilityResolver.mergeCapabilities(effectiveCapabilities);
    // Determine "primary" batch type for context (use most permissive)
    const primaryBatchType = batchDocs.find(b => b.batchType === 'recorded')?.batchType
      ?? batchDocs.find(b => b.batchType === 'online')?.batchType
      ?? batchDocs.find(b => b.batchType === 'offline')?.batchType
      ?? null;
    const primaryBatchName = batchDocs[0]?.name;


    // 5. Check explicitly granted permissions again (for profile-enrolled students — redundant
    //    for legacy students who were handled by the early check above, but kept for safety)
    const tree = [
      { type: entityType, id: entityId },
      ...(await this.hierarchyService.getParents(entityType, entityId))
    ];

    let temporaryGrant: IContentAccess | null = null;

    for (const node of tree) {
      const grantSnap = await db.collection('content_access')
        .where('studentId', '==', studentId)
        .where('entityType', '==', node.type)
        .where('entityId', '==', node.id)
        .where('status', '==', 'ACTIVE')
        .get();

      for (const doc of grantSnap.docs) {
        const grant = doc.data() as IContentAccess;

        if (grant.accessType === 'PERMANENT') {
          return { allowed: true, reason: `PERMANENT ${node.type} grant`, source: 'PERMANENT' };
        }

        if (grant.accessType === 'TEMPORARY') {
          // Check it hasn't expired
          if (!grant.expiresAt || new Date(grant.expiresAt) > new Date()) {
            temporaryGrant = grant;
          }
        }
      }
    }

    if (temporaryGrant) {
      return {
        allowed: true,
        reason: `TEMPORARY ${temporaryGrant.entityType} grant`,
        source: 'TEMPORARY'
      };
    }

    // 5. Batch Capability & Course check
    if (entityType === 'CLASS') {
      const clsDoc = await db.collection('classes').doc(entityId).get();
      if (clsDoc.exists) {
        const cls = clsDoc.data()!;

        // 5a. Public / free content
        if (cls.accessLevel === 'free') {
          return { allowed: true, reason: 'Publicly visible resource', source: 'PUBLIC' };
        }

        // 5b. Course Enrollment Hard Gate (must be enrolled in the class's course)
        if (cls.courseId && !enrolledCourseIds.has(cls.courseId)) {
          return this.buildDeniedDecision(
            studentId, entityType, entityId, 'WRONG_COURSE',
            { batchType: primaryBatchType, classType: cls.classType, batchName: primaryBatchName },
            mergedCapabilities
          );
        }

        // 5c. Specific Batch check (ERP batches / all / paid / free)
        if (cls.accessLevel === 'batch' || (cls.targetBatchIds && cls.targetBatchIds.length > 0)) {
          const targetBatchIds: string[] = cls.targetBatchIds || [];
          const hasBatchAccess = 
            targetBatchIds.includes('all') ||
            (targetBatchIds.includes('all_paid') && activeMemberships.length > 0) ||
            (targetBatchIds.includes('all_free') && activeMemberships.length === 0) ||
            activeMemberships.some(m => m.batchId && targetBatchIds.includes(m.batchId));

          if (!hasBatchAccess) {
            return this.buildDeniedDecision(
              studentId, entityType, entityId, 'TARGET_MISMATCH',
              { batchType: primaryBatchType, classType: cls.classType, batchName: primaryBatchName },
              mergedCapabilities
            );
          }
        }

        // 5d. Recorded class
        if (cls.classType === 'youtube_recorded') {
          if (mergedCapabilities.canViewRecorded) {
            return { allowed: true, reason: 'Batch grants recorded access', source: 'BATCH' };
          }
          // Denied - build context-aware reason
          const denialReason: DenialReason =
            primaryBatchType === 'online' ? 'ONLINE_RECORDED'
            : primaryBatchType === 'offline' ? 'OFFLINE_RECORDED'
            : 'NO_CAPABILITY';

          return this.buildDeniedDecision(
            studentId, entityType, entityId, denialReason,
            { batchType: primaryBatchType, classType: cls.classType, batchName: primaryBatchName },
            mergedCapabilities
          );
        }

        // 5e. Live class
        if (cls.classType === 'youtube_live' || cls.classType === 'zoom_live' || cls.classType === 'live') {
          if (mergedCapabilities.canViewLive) {
            return { allowed: true, reason: 'Batch grants live access', source: 'BATCH' };
          }
          const denialReason: DenialReason =
            primaryBatchType === 'offline' ? 'OFFLINE_LIVE' : 'NO_CAPABILITY';

          return this.buildDeniedDecision(
            studentId, entityType, entityId, denialReason,
            { batchType: primaryBatchType, classType: cls.classType, batchName: primaryBatchName },
            mergedCapabilities
          );
        }
      }
    }

    // 6. Fallback denial (for TOPIC/SUBJECT/COURSE level evaluation or unknown)
    return this.buildDeniedDecision(
      studentId, entityType, entityId, 'NO_CAPABILITY',
      { batchType: primaryBatchType, batchName: primaryBatchName },
      mergedCapabilities
    );
  }

  private async buildDeniedDecision(
    studentId: string,
    entityType: EntityType,
    entityId: string,
    reason: DenialReason,
    context: SAPEDecision['context'],
    capabilities: IBatchCapabilities
  ): Promise<SAPEDecision> {
    // Fetch monthly usage
    const now = new Date();
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usageDoc = await db.collection('student_request_usage').doc(`${studentId}_${monthStr}`).get();

    let monthlyLimit = 10;
    let recordedUnitsUsed = 0;

    if (usageDoc.exists) {
      const data = usageDoc.data() as any;
      monthlyLimit = data.monthlyLimit ?? 10;
      recordedUnitsUsed = data.recordedUnitsUsed ?? 0;
    }

    const remainingRecordedUnits = monthlyLimit - recordedUnitsUsed;

    // Build request scope options
    const allowedRequestScopes: RequestScope[] = [];

    const buildScope = async (scopeType: EntityType, scopeId: string, canRequest: boolean): Promise<RequestScope> => {
      const cost = await this.hierarchyService.calculateScopeCost(scopeType, scopeId);
      const withinLimit = cost.units <= remainingRecordedUnits;
      
      // Check if there is already a pending request
      const existingSnap = await db.collection('access_requests')
        .where('studentId', '==', studentId)
        .where('contentId', '==', scopeId)
        .where('requestType', '==', scopeType)
        .where('status', '==', 'PENDING')
        .limit(1)
        .get();
      const isPending = !existingSnap.empty;

      return {
        type: scopeType,
        contentId: scopeId,
        count: cost.recordedClasses,
        units: cost.units,
        allowed: canRequest && withinLimit && !isPending,
        isPending,
        reason: isPending 
          ? 'You already have a pending request for this.'
          : !canRequest
          ? `Your batch does not allow ${scopeType.toLowerCase()} requests`
          : !withinLimit
          ? `Requires ${cost.units} units, you have ${remainingRecordedUnits} remaining`
          : undefined
      };
    };

    if (entityType === 'CLASS') {
      // CLASS scope - only offer recorded requests if it's not a live class
      if (!['live', 'zoom_live', 'youtube_live'].includes(context?.classType || '')) {
        allowedRequestScopes.push(await buildScope('CLASS', entityId, capabilities.canRequestRecorded));
      }

      // Walk up the hierarchy to offer TOPIC/SUBJECT/COURSE scopes
      const parents = await this.hierarchyService.getParents('CLASS', entityId);

      const topicParent = parents.find(p => p.type === 'TOPIC');
      if (topicParent) {
        allowedRequestScopes.push(await buildScope('TOPIC', topicParent.id, capabilities.canRequestTopic));
      }

      const subjectParent = parents.find(p => p.type === 'SUBJECT');
      if (subjectParent) {
        allowedRequestScopes.push(await buildScope('SUBJECT', subjectParent.id, capabilities.canRequestSubject));
      }

      const courseParent = parents.find(p => p.type === 'COURSE');
      if (courseParent) {
        allowedRequestScopes.push(await buildScope('COURSE', courseParent.id, capabilities.canRequestCourse));
      }
    } else if (entityType === 'TOPIC') {
      allowedRequestScopes.push(await buildScope('TOPIC', entityId, capabilities.canRequestTopic));
      const parents = await this.hierarchyService.getParents('TOPIC', entityId);
      const subjectParent = parents.find(p => p.type === 'SUBJECT');
      if (subjectParent) {
        allowedRequestScopes.push(await buildScope('SUBJECT', subjectParent.id, capabilities.canRequestSubject));
      }
    } else if (entityType === 'SUBJECT') {
      allowedRequestScopes.push(await buildScope('SUBJECT', entityId, capabilities.canRequestSubject));
    }

    return {
      allowed: false,
      reason,
      context,
      allowedRequestScopes,
      remainingRecordedUnits,
      monthlyLimit
    };
  }
  /**
   * Derives IBatchCapabilities from a batchType string.
   * Implements the authoritative matrix identically to the listing service:
   *   online   → Live ✅  Recorded ❌
   *   recorded → Live ✅  Recorded ✅
   *   offline  → Live ❌  Recorded ❌
   *   unknown  → treat as online (Live ✅  Recorded ❌)
   */
  private static deriveCapsFromBatchType(batchType: string): IBatchCapabilities {
    const t = batchType.toLowerCase().trim();
    return {
      canViewLive:      t === 'online' || t === 'recorded',
      canViewRecorded:  t === 'recorded',
      canRequestRecorded: true,
      canRequestTopic:    true,
      canRequestSubject:  false,
      canRequestCourse:   false,
    };
  }
}
