import { db } from '../../infrastructure/firebase';
import { IAccessRequest, IContentAccess, EntityType, IStudentRequestUsage } from '../../core/sape/types';
import { ContentHierarchyService } from '../../core/hierarchy/ContentHierarchyService';
import { AppError } from '../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';
import { STUDENT_COLLECTIONS } from '../students/constants';
import { FieldValue } from 'firebase-admin/firestore';

export class AccessRequestService {
  private hierarchyService = new ContentHierarchyService();

  private getMonthString() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  // ─── Student: Create Request ─────────────────────────────────────────────────

  async createRequest(
    studentId: string,
    batchId: string | null,
    requestType: EntityType,
    contentId: string,
    contentName: string,
    reason: string,
    studentName?: string,
    studentRegNo?: string
  ): Promise<IAccessRequest> {

    // 1. Duplicate prevention
    const existingSnap = await db.collection('access_requests')
      .where('studentId', '==', studentId)
      .where('contentId', '==', contentId)
      .where('requestType', '==', requestType)
      .where('status', '==', 'PENDING')
      .limit(1)
      .get();

    if (!existingSnap.empty) {
      throw new AppError('You already have a pending request for this content.', 400);
    }

    // 2. Max pending requests guard
    const pendingSnap = await db.collection('access_requests')
      .where('studentId', '==', studentId)
      .where('status', '==', 'PENDING')
      .get();

    if (pendingSnap.size >= 5) {
      throw new AppError('You have 5 pending requests. Please wait for an administrator to process them.', 429);
    }

    // 3. Build display label: "<rollNo> <name>" or just "<name>"
    const label = studentRegNo && studentName
      ? `${studentRegNo} ${studentName}`
      : studentName || studentRegNo || '';

    // 4. Create the request document — store name at creation so admin view
    //    never needs a cross-collection lookup.
    const newRequest: IAccessRequest = {
      id: uuidv4(),
      studentId,
      studentName: label,
      batchId,
      requestType,
      contentId,
      contentName,
      reason,
      requestedAt: new Date().toISOString(),
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } as any;

    await db.collection('access_requests').doc(newRequest.id).set(newRequest);
    return newRequest;
  }

  // ─── Student: View My Requests ───────────────────────────────────────────────

  async getMyRequests(studentId: string) {
    const snap = await db.collection('access_requests')
      .where('studentId', '==', studentId)
      .orderBy('requestedAt', 'desc')
      .get();

    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // ─── Admin: List Pending Requests ────────────────────────────────────────────

  async listPendingRequests(filters?: { batchType?: string; requestType?: string }) {
    let query: FirebaseFirestore.Query = db.collection('access_requests')
      .where('status', '==', 'PENDING');
      // Note: orderBy('requestedAt') + where('status') requires a Firestore composite index.
      // We sort in-memory to avoid the 500 until the index is deployed.

    if (filters?.requestType) {
      query = query.where('requestType', '==', filters.requestType);
    }

    const snap = await query.get();
    const requests = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a: any, b: any) => (a.requestedAt > b.requestedAt ? 1 : -1));

    // Enrich with student + batch info
    const enriched = await Promise.all(
      requests.map(async (req: any) => {
        // If name was stored at creation time, use it directly (fast path)
        let finalName: string = req.studentName || '';
        // Hoist student to outer scope so studentEmail is accessible in return
        let student: FirebaseFirestore.DocumentData | null | undefined = null;

        if (!finalName) {
          // Fallback for old requests: look up across all student collections
          // 1. New student_profiles (self-registered via app)
          const profileDoc = await db.collection(STUDENT_COLLECTIONS.PROFILES).doc(req.studentId).get();
          student = profileDoc.exists ? profileDoc.data() : null;

          // 2. Legacy 'students' collection (admin-imported)
          if (!student) {
            const legacyDoc = await db.collection('students').doc(req.studentId).get();
            if (legacyDoc.exists) student = legacyDoc.data();
          }

          // 3. Final fallback: 'users' collection
          if (!student) {
            const userDoc = await db.collection('users').doc(req.studentId).get();
            if (userDoc.exists) student = userDoc.data();
          }

          if (student) {
            // Name: displayName > firstName+lastName > name
            const name =
              student.displayName ||
              (`${student.firstName || ''} ${student.lastName || ''}`.trim()) ||
              student.name ||
              '';

            // Roll number: loginUsername > rollNumber > rollNo > username
            const regNo =
              student.loginUsername ||
              student.rollNumber ||
              student.rollNo ||
              student.username ||
              '';

            // Format: "<rollNo> <name>"
            finalName = regNo && name ? `${regNo} ${name}` : name || regNo || req.studentId;
          } else {
            finalName = req.studentId;
          }
        }

        let batchData = null;
        if (req.batchId) {
          const batchDoc = await db.collection(STUDENT_COLLECTIONS.BATCHES).doc(req.batchId).get();
          if (batchDoc.exists) batchData = batchDoc.data();
        }

        // Compute cost for this request
        let cost = { recordedClasses: 0, units: 0 };
        try {
          cost = await this.hierarchyService.calculateScopeCost(req.requestType, req.contentId);
        } catch (_) {}

        return {
          ...req,
          studentName: finalName,
          studentEmail: student?.email || '',
          batchName: batchData?.name || null,
          batchType: batchData?.batchType || null,
          cost
        };
      })
    );

    // Filter by batchType if needed (done in memory since it comes from batch join)
    if (filters?.batchType) {
      return enriched.filter(r => r.batchType === filters.batchType);
    }

    return enriched;
  }

  // ─── Admin: Approve Request ──────────────────────────────────────────────────

  async approveRequest(
    requestId: string,
    adminId: string,
    durationHours: number | null,
    ignoreLimit: boolean = false,
    partialSelection?: string[]
  ) {
    const reqDoc = await db.collection('access_requests').doc(requestId).get();
    if (!reqDoc.exists) throw new AppError('Request not found', 404);

    const request = reqDoc.data() as any;
    if (request.status !== 'PENDING') throw new AppError('Request is not pending', 400);

    const cost = await this.hierarchyService.calculateScopeCost(request.requestType, request.contentId);
    let unitsToDeduct = partialSelection && partialSelection.length > 0
      ? partialSelection.length
      : cost.units;

    const monthStr = this.getMonthString();
    const usageRef = db.collection('student_request_usage').doc(`${request.studentId}_${monthStr}`);

    const expiresAt = durationHours ? new Date(Date.now() + durationHours * 3600000).toISOString() : null;
    const accessType = durationHours ? 'TEMPORARY' : 'PERMANENT';

    await db.runTransaction(async (t) => {
      const usageDoc = await t.get(usageRef);
      let recordedUnitsUsed = 0;
      let monthlyLimit: number | null = 10;

      if (usageDoc.exists) {
        const data = usageDoc.data() as IStudentRequestUsage;
        recordedUnitsUsed = data.recordedUnitsUsed || 0;
        monthlyLimit = data.monthlyLimit;
      }

      if (!ignoreLimit && monthlyLimit !== null) {
        if (recordedUnitsUsed + unitsToDeduct > monthlyLimit) {
          throw new AppError(
            `Approval exceeds quota: requires ${unitsToDeduct} units, student has ${monthlyLimit - recordedUnitsUsed} remaining. Use ignoreLimit to bypass.`,
            403
          );
        }
      }

      // Update usage
      t.set(usageRef, {
        studentId: request.studentId,
        month: monthStr,
        recordedUnitsUsed: recordedUnitsUsed + unitsToDeduct,
        monthlyLimit,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // Mark request approved
      t.update(reqDoc.ref, {
        status: 'APPROVED',
        updatedAt: new Date().toISOString(),
        updatedBy: adminId,
        approvedDurationHours: durationHours,
        expiresAt
      });

      // Create content_access grants
      const grantBase = {
        studentId: request.studentId,
        accessType,
        grantedBy: adminId,
        grantedAt: new Date().toISOString(),
        expiresAt,
        status: 'ACTIVE',
        sourceRequestId: requestId,
        permissionVersion: 1
      };

      if (partialSelection && partialSelection.length > 0) {
        for (const childId of partialSelection) {
          const grantId = uuidv4();
          t.set(db.collection('content_access').doc(grantId), {
            id: grantId,
            ...grantBase,
            entityType: 'CLASS',
            entityId: childId
          });
        }
      } else {
        const grantId = uuidv4();
        t.set(db.collection('content_access').doc(grantId), {
          id: grantId,
          ...grantBase,
          entityType: request.requestType,
          entityId: request.contentId
        });
      }
    });

    return { success: true, message: 'Request approved successfully.' };
  }

  // ─── Admin: Reject Request ───────────────────────────────────────────────────

  async rejectRequest(requestId: string, adminId: string, reason: string) {
    const reqDoc = await db.collection('access_requests').doc(requestId).get();
    if (!reqDoc.exists) throw new AppError('Request not found', 404);

    const request = reqDoc.data() as any;
    if (request.status !== 'PENDING') throw new AppError('Request is not pending', 400);

    await reqDoc.ref.update({
      status: 'REJECTED',
      rejectionReason: reason,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId
    });

    return { success: true };
  }

  // ─── Admin: Bulk Reject ──────────────────────────────────────────────────────

  async bulkReject(requestIds: string[], adminId: string, reason: string) {
    const results = await Promise.allSettled(
      requestIds.map(async (id) => {
        return this.rejectRequest(id, adminId, reason);
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: true,
      summary: `Successfully rejected ${successful} requests. Failed: ${failed}.`
    };
  }

  // ─── Admin: Bulk Approve ─────────────────────────────────────────────────────

  async bulkApprove(
    requestIds: string[],
    adminId: string,
    grantType: 'TEMPORARY' | 'PERMANENT',
    durationHours: number | null,
    consumeMonthlyUnits: boolean,
    respectMonthlyLimit: boolean,
    presetId: string | null,
    overrideLimit: boolean
  ) {
    const results = await Promise.allSettled(
      requestIds.map(async (id) => {
        // Individual approval logic slightly modified for bulk specifics
        const reqDoc = await db.collection('access_requests').doc(id).get();
        if (!reqDoc.exists) throw new AppError('Request not found', 404);

        const request = reqDoc.data() as any;
        if (request.status !== 'PENDING') throw new AppError('Request is not pending', 400);

        const contentId = request.contentId || request.entityId;
        const requestType = request.requestType || request.entityType;

        if (!contentId || !requestType) {
          throw new AppError('Request is missing content/entity ID or type', 400);
        }

        // Conflict Detection: check if active permanent grant exists for this content
        const existingGrants = await db.collection('content_access')
          .where('studentId', '==', request.studentId)
          .where('entityId', '==', contentId)
          .where('status', '==', 'ACTIVE')
          .get();
        
        let hasPermanent = false;
        existingGrants.forEach(doc => {
          if (doc.data().accessType === 'PERMANENT') hasPermanent = true;
        });

        if (hasPermanent && grantType === 'TEMPORARY') {
          // If they already have permanent access, a temporary grant is a conflict/redundant
          throw new AppError('CONFLICT: Student already has permanent access', 409);
        }

        const cost = await this.hierarchyService.calculateScopeCost(requestType, contentId);
        const unitsToDeduct = consumeMonthlyUnits ? cost.units : 0;
        const monthStr = this.getMonthString();
        const usageRef = db.collection('student_request_usage').doc(`${request.studentId}_${monthStr}`);
        
        const expiresAt = grantType === 'TEMPORARY' && durationHours 
          ? new Date(Date.now() + durationHours * 3600000).toISOString() 
          : null;

        await db.runTransaction(async (t) => {
          const usageDoc = await t.get(usageRef);
          let recordedUnitsUsed = 0;
          let monthlyLimit: number | null = 10;

          if (usageDoc.exists) {
            const data = usageDoc.data() as IStudentRequestUsage;
            recordedUnitsUsed = data.recordedUnitsUsed || 0;
            monthlyLimit = data.monthlyLimit;
          }

          if (respectMonthlyLimit && !overrideLimit && monthlyLimit !== null) {
            if (recordedUnitsUsed + unitsToDeduct > monthlyLimit) {
              throw new AppError(`Approval exceeds quota for student ${request.studentId}`, 403);
            }
          }

          if (consumeMonthlyUnits) {
            t.set(usageRef, {
              studentId: request.studentId,
              month: monthStr,
              recordedUnitsUsed: recordedUnitsUsed + unitsToDeduct,
              monthlyLimit,
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }

          t.update(reqDoc.ref, {
            status: 'APPROVED',
            updatedAt: new Date().toISOString(),
            updatedBy: adminId,
            approvedDurationHours: grantType === 'TEMPORARY' ? durationHours : null,
            expiresAt,
            appliedPresetId: presetId
          });

          const grantId = uuidv4();
          t.set(db.collection('content_access').doc(grantId), {
            id: grantId,
            studentId: request.studentId,
            accessType: grantType,
            grantedBy: adminId,
            grantedAt: new Date().toISOString(),
            expiresAt,
            status: 'ACTIVE',
            sourceRequestId: id,
            permissionVersion: 1,
            entityType: requestType,
            entityId: contentId
          });
        });

        // ─── Also write to entity_permissions.temporaryGrants ─────────────────
        // The SACS access evaluator (evaluateEntityAccess) reads temporaryGrants
        // from entity_permissions, NOT from content_access. We must bridge both.
        const entityPermRef = db.collection('entity_permissions').doc(contentId);
        const entityPermDoc = await entityPermRef.get();
        const existingTempGrants: any[] = entityPermDoc.exists
          ? (entityPermDoc.data()?.temporaryGrants || [])
          : [];
        // Remove any old grant for this student, then add new one
        const filteredGrants = existingTempGrants.filter((g: any) => g.studentId !== request.studentId);
        const sacsGrant = {
          studentId: request.studentId,
          grantedAt: new Date().toISOString(),
          expiresAt: expiresAt || undefined,
          grantedBy: adminId,
          requestId: id,
        };
        await entityPermRef.set(
          { temporaryGrants: [...filteredGrants, sacsGrant], updatedAt: new Date().toISOString() },
          { merge: true }
        );

        // Invalidate Redis caches to ensure immediate reflection on student side
        try {
          const { redisClient } = await import('../../infrastructure/redis');
          await redisClient.del(`sacs:perm:${contentId}`);
          const { invalidateAccessCache } = await import('../../core/security/AccessCache');
          await invalidateAccessCache(request.studentId);
        } catch (e) {
          // ignore cache invalidation errors
        }

        return id;
      })
    );

    const approved = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    const errors = results
      .filter(r => r.status === 'rejected')
      .map((r: any) => r.reason?.message || 'Unknown error');

    // Categorize conflicts specifically
    const conflicts = errors.filter(e => e.includes('CONFLICT')).length;

    return { approved, failed, conflicts, errors };
  }

  // ─── Admin: List Temporary Grants ────────────────────────────────────────────

  async listTemporaryGrants() {
    const snap = await db.collection('content_access')
      .where('accessType', '==', 'TEMPORARY')
      .where('status', '==', 'ACTIVE')
      .orderBy('expiresAt', 'asc')
      .get();

    const grants = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Expire stale grants automatically (defensive cleanup)
    const now = new Date().toISOString();
    const batch = db.batch();
    let hasExpired = false;

    for (const grant of grants) {
      if (grant.expiresAt && grant.expiresAt < now) {
        batch.update(db.collection('content_access').doc(grant.id), {
          status: 'EXPIRED',
          updatedAt: now
        });
        hasExpired = true;
      }
    }

    if (hasExpired) await batch.commit();

    // Enrich with student names
    const activeGrants = grants.filter(g => !g.expiresAt || g.expiresAt >= now);
    return Promise.all(activeGrants.map(async (grant) => {
      let studentDoc = await db.collection(STUDENT_COLLECTIONS.PROFILES).doc(grant.studentId).get();
      let student = studentDoc.exists ? studentDoc.data() : null;
      if (!student) {
        const userDoc = await db.collection('users').doc(grant.studentId).get();
        if (userDoc.exists) student = userDoc.data();
      }

      const hoursLeft = grant.expiresAt
        ? Math.max(0, Math.round((new Date(grant.expiresAt).getTime() - Date.now()) / 3600000))
        : null;

      return {
        ...grant,
        studentName: student?.displayName || student?.name || student?.username || 'Unknown',
        hoursLeft
      };
    }));
  }

  // ─── Admin: Extend Grant ─────────────────────────────────────────────────────

  async extendGrant(grantId: string, adminId: string, additionalHours: number) {
    const grantDoc = await db.collection('content_access').doc(grantId).get();
    if (!grantDoc.exists) throw new AppError('Grant not found', 404);

    const grant = grantDoc.data() as IContentAccess;
    if (grant.status !== 'ACTIVE') throw new AppError('Grant is not active', 400);

    const currentExpiry = grant.expiresAt ? new Date(grant.expiresAt) : new Date();
    const newExpiry = new Date(currentExpiry.getTime() + additionalHours * 3600000).toISOString();

    await grantDoc.ref.update({
      expiresAt: newExpiry,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId
    });

    return { success: true, newExpiry };
  }

  // ─── Admin: Revoke Grant ─────────────────────────────────────────────────────

  async revokeGrant(grantId: string, adminId: string, reason: string) {
    // The History tab passes the access_request ID; the Permanent tab passes the content_access grant ID.
    // Try content_access first, then fall back to finding the grant via the request.
    let grantRef: FirebaseFirestore.DocumentReference | null = null;
    let sourceRequestId: string | null = null;

    const grantDoc = await db.collection('content_access').doc(grantId).get();
    if (grantDoc.exists) {
      grantRef = grantDoc.ref;
      sourceRequestId = (grantDoc.data() as any)?.sourceRequestId || null;
    } else {
      // Maybe grantId is actually an access_request ID — find the linked grant
      const linkedGrantSnap = await db.collection('content_access')
        .where('sourceRequestId', '==', grantId)
        .where('status', '==', 'ACTIVE')
        .limit(1)
        .get();
      if (!linkedGrantSnap.empty) {
        grantRef = linkedGrantSnap.docs[0].ref;
        sourceRequestId = grantId; // the passed ID is the request ID
      } else {
        // Last resort: check if the access_request itself exists and mark it REVOKED
        const reqDoc = await db.collection('access_requests').doc(grantId).get();
        if (reqDoc.exists) {
          await reqDoc.ref.update({
            status: 'REVOKED',
            revocationReason: reason,
            updatedAt: new Date().toISOString(),
            updatedBy: adminId
          });
          return { success: true };
        }
        throw new AppError('Grant not found', 404);
      }
    }

    const revokePayload = {
      status: 'REVOKED',
      revocationReason: reason,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId
    };

    // Revoke the content_access grant
    await grantRef.update(revokePayload);

    // Also update the source access_request so History tab doesn't re-show it on refresh
    if (sourceRequestId) {
      await db.collection('access_requests').doc(sourceRequestId).update(revokePayload).catch(() => {});
    }

    return { success: true };
  }

  // ─── Admin: Analytics ────────────────────────────────────────────────────────

  async getAnalytics() {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    
    // Aggregate data using Firebase
    const [pendingSnap, activeGrantsSnap, usageSnap] = await Promise.all([
      db.collection('access_requests').where('status', '==', 'PENDING').get(),
      db.collection('content_access').where('status', '==', 'ACTIVE').get(),
      db.collection('student_request_usage').where('month', '==', this.getMonthString()).get()
    ]);

    let temporaryGrants = 0;
    let permanentGrants = 0;
    let expiringToday = 0;
    let expiredToday = 0;
    const tomorrow = new Date(now.getTime() + 24 * 3600000).toISOString();

    activeGrantsSnap.docs.forEach(doc => {
      const data = doc.data() as IContentAccess;
      if (data.accessType === 'TEMPORARY') temporaryGrants++;
      if (data.accessType === 'PERMANENT') permanentGrants++;
      
      if (data.expiresAt) {
        if (data.expiresAt < now.toISOString() && data.expiresAt > todayStr) expiredToday++;
        else if (data.expiresAt < tomorrow && data.expiresAt > now.toISOString()) expiringToday++;
      }
    });

    let recordedUnitsGrantedMonth = 0;
    usageSnap.docs.forEach(doc => {
      recordedUnitsGrantedMonth += (doc.data().recordedUnitsUsed || 0);
    });

    return {
      overview: {
        pendingRequests: pendingSnap.size,
        activeTemporaryGrants: temporaryGrants,
        activePermanentGrants: permanentGrants,
      },
      usage: {
        recordedUnitsGrantedMonth,
      },
      expiry: {
        expiredToday,
        expiringToday,
      }
    };
  }

  // ─── Admin: Request History (Approved + Rejected) ────────────────────────────────────────────

  async listHistory(status?: 'APPROVED' | 'REJECTED') {
    let query: FirebaseFirestore.Query = db.collection('access_requests');

    if (status) {
      query = query.where('status', '==', status);
    } else {
      // Return both APPROVED and REJECTED
      query = query.where('status', 'in', ['APPROVED', 'REJECTED']);
    }

    // Removed orderBy('updatedAt') to prevent Firestore composite index 500 error
    const snap = await query.limit(100).get();
    let requests = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Sort in memory (descending)
    requests.sort((a, b) => {
      const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return bTime - aTime;
    });

    // Enrich with student info + active grant info for approved ones
    return Promise.all(requests.map(async (req: any) => {
      let studentDoc = await db.collection(STUDENT_COLLECTIONS.PROFILES).doc(req.studentId).get();
      let student = studentDoc.exists ? studentDoc.data() : null;
      if (!student) {
        const userDoc = await db.collection('users').doc(req.studentId).get();
        if (userDoc.exists) student = userDoc.data();
      }

      let grant = null;
      if (req.status === 'APPROVED') {
        const grantSnap = await db.collection('content_access')
          .where('sourceRequestId', '==', req.id)
          .where('status', '==', 'ACTIVE')
          .limit(1)
          .get();
        if (!grantSnap.empty) grant = { id: grantSnap.docs[0].id, ...grantSnap.docs[0].data() };
      }

      const hoursLeft = (grant as any)?.expiresAt
        ? Math.max(0, Math.round((new Date((grant as any).expiresAt).getTime() - Date.now()) / 3600000))
        : null;

      const name = student?.displayName || student?.name || student?.fullName
        || student?.studentName || student?.username || req.studentName || 'Unknown';
      const regNo = student?.username || student?.regNo || '';
      const finalName = (regNo && regNo !== name) ? `${name} (${regNo})` : name;

      return {
        ...req,
        studentName: finalName,
        studentEmail: student?.email || '',
        grant,
        hoursLeft
      };
    }));
  }

  // ─── Admin: Permanent Grants ─────────────────────────────────────────────────

  async listPermanentGrants() {
    const snap = await db.collection('content_access')
      .where('accessType', '==', 'PERMANENT')
      .where('status', '==', 'ACTIVE')
      .get();

    const grants = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    return Promise.all(grants.map(async (grant) => {
      let studentDoc = await db.collection(STUDENT_COLLECTIONS.PROFILES).doc(grant.studentId).get();
      let student = studentDoc.exists ? studentDoc.data() : null;
      if (!student) {
        const userDoc = await db.collection('users').doc(grant.studentId).get();
        if (userDoc.exists) student = userDoc.data();
      }

      return {
        ...grant,
        studentName: student?.displayName || student?.name || student?.username || 'Unknown',
        studentEmail: student?.email || '',
      };
    }));
  }

  // ─── Admin: Convert Grant Type ───────────────────────────────────────────────

  async convertGrant(grantId: string, adminId: string, newType: 'TEMPORARY' | 'PERMANENT', durationHours?: number) {
    const grantDoc = await db.collection('content_access').doc(grantId).get();
    if (!grantDoc.exists) throw new AppError('Grant not found', 404);

    const grant = grantDoc.data() as any;
    if (grant.status !== 'ACTIVE') throw new AppError('Grant is not active', 400);

    const expiresAt = newType === 'TEMPORARY' && durationHours
      ? new Date(Date.now() + durationHours * 3600000).toISOString()
      : null;

    await grantDoc.ref.update({
      accessType: newType,
      expiresAt,
      updatedAt: new Date().toISOString(),
      updatedBy: adminId
    });

    return { success: true, newType, expiresAt };
  }
}
