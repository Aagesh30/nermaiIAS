/**
 * Student LMS Discovery Service
 *
 * Provides batch-filtered LMS content discovery for offline/online/recorded students.
 * Implements the THREE-LAYER separation required by the LMS Permission spec:
 *
 *   Layer 1 — Batch targeting:  targetBatchIds (who the content is for)
 *   Layer 2 — Student type:     offline/online/recorded (how visibility is determined)
 *   Layer 3 — Access control:   SACS / AccessEngine (whether they can consume it)
 *
 * Visibility table:
 *   offline   → can DISCOVER all recorded classes in their batch; must request access
 *   online    → visibility gated by batch + accessLevel; SACS decides access
 *   recorded  → same as online
 *   unassigned → nothing visible
 *
 * NOTE: Live sessions are intentionally EXCLUDED from this service.
 * GET /live-sessions already branches on role === 'student' and calls
 * LiveSessionService.getStudentLiveSessions() which already performs full
 * batch filtering. No duplication needed.
 */

import { db } from '../../infrastructure/firebase';
import { STUDENT_COLLECTIONS } from './constants';
import { IStudentProfile } from './types';
import { AccessRulesService } from '../access-rules/service';

const sacsService = new AccessRulesService();

// ─── Student profile resolution ───────────────────────────────────────────────

interface StudentContext {
  batchIds: string[];          // resolved UUID batch IDs
  studentType: string;         // 'offline' | 'online' | 'recorded' | ''
  studentId: string | null;    // doc ID in 'students' collection
}

/**
 * Resolves the student's batch UUIDs and type.
 *
 * Priority:
 *   1. NEW-NERMAI: student_profiles.programMemberships[].{batchId, status}
 *   2. Legacy fallback: users.studentId → students.batch (name) → batches.batchName → doc ID
 *
 * The legacy path is needed because the old system stores batch as a human-readable
 * name ('43') while classes use UUID doc IDs ('2a237617-...') in targetBatchIds.
 */
async function resolveStudentContext(userId: string): Promise<StudentContext> {
  const result: StudentContext = { batchIds: [], studentType: '', studentId: null };

  // ── Path 1: NEW-NERMAI programMemberships ──────────────────────────────────
  const profileDoc = await db.collection(STUDENT_COLLECTIONS.PROFILES).doc(userId).get();
  if (profileDoc.exists) {
    const profile = profileDoc.data() as IStudentProfile;
    (profile.programMemberships || []).forEach((m) => {
      if (m.status === 'active' && m.batchId) {
        result.batchIds.push(m.batchId);
      }
    });
  }

  // ── Path 2: Legacy fallback via users → students → batches ─────────────────
  if (result.batchIds.length === 0) {
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.studentId) {
        result.studentId = userData.studentId;
        const sDoc = await db.collection('students').doc(userData.studentId).get();
        if (sDoc.exists) {
          const sData = sDoc.data()!;
          result.studentType = sData.type || 'offline'; // default to offline for legacy

          // sData.batch is the legacy human-readable batch name (e.g. '43')
          // We must resolve it to the UUID doc ID used in classes.targetBatchIds
          if (sData.batch) {
            const batchSnap = await db.collection('batches')
              .where('batchName', '==', String(sData.batch))
              .where('isDeleted', '==', false)
              .limit(1)
              .get();

            if (!batchSnap.empty) {
              result.batchIds.push(batchSnap.docs[0].id);
            }
          }
        }
      }
    }
  }

  return result;
}

// ─── Visibility logic ─────────────────────────────────────────────────────────

/**
 * Determines if a class/resource is VISIBLE to a student (Layer 1 + Layer 2).
 * Visibility ≠ access permission — SACS (Layer 3) handles that separately.
 *
 * Offline students:
 *   Always visible if they are in one of the target batches (or content has no batch restriction).
 *   They must request access through SACS to consume the content.
 *
 * Online/Recorded students:
 *   Visibility is additionally gated by accessLevel sentinels.
 */
function isVisibleToStudent(
  targetBatchIds: string[],
  accessLevel: string,
  studentBatchIds: string[],
  studentType: string
): boolean {
  const isOffline = studentType === 'offline';
  const isEnrolled = studentBatchIds.length > 0;

  // No batches resolved → unassigned student, nothing visible
  if (!isEnrolled) return false;

  // ── Batch matching ──────────────────────────────────────────────────────────
  let batchMatches: boolean;
  if (targetBatchIds.length === 0) {
    // No batch restriction → visible to all enrolled students
    batchMatches = true;
  } else if (targetBatchIds.includes('all')) {
    batchMatches = true;
  } else if (targetBatchIds.includes('all_paid') && isEnrolled) {
    batchMatches = true;
  } else if (targetBatchIds.includes('all_free') && !isEnrolled) {
    batchMatches = true;
  } else {
    // Specific batch targeting
    batchMatches = studentBatchIds.some((bId) => targetBatchIds.includes(bId));
  }

  if (!batchMatches) return false;

  // ── Student type visibility gating ─────────────────────────────────────────
  // Offline students: batch match is sufficient for DISCOVERY (SACS controls actual access)
  if (isOffline) return true;

  // Online/Recorded students: additionally respect accessLevel sentinels
  if (accessLevel === 'free' || accessLevel === 'all') return true;
  if (accessLevel === 'paid' || accessLevel === '') return isEnrolled;

  return true;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns batch-filtered recorded classes with SACS access decisions.
 *
 * For offline students, ALL recorded classes from their batch are returned
 * (visibility = true), but access.allowed may be false → UI shows "Request Access".
 * For online/recorded students, normal batch + accessLevel gating applies.
 */
export async function getMyLmsClasses(userId: string, tenantId: string): Promise<any[]> {
  const ctx = await resolveStudentContext(userId);

  // Query only recorded classes from Firestore
  const classesSnap = await db.collection('classes')
    .where('classType', 'in', ['recorded', 'youtube_recorded'])
    .where('isDeleted', '==', false)
    .get();

  const visible: any[] = [];
  for (const doc of classesSnap.docs) {
    const cls = { id: doc.id, ...doc.data() } as any;

    // Skip classes belonging to a different tenant
    if (cls.tenantId && cls.tenantId !== tenantId) continue;

    const targetBatchIds: string[] = cls.targetBatchIds || [];
    const accessLevel: string = cls.accessLevel || '';

    // Layer 1 + 2: Visibility check
    if (!isVisibleToStudent(targetBatchIds, accessLevel, ctx.batchIds, ctx.studentType)) continue;

    // Layer 3: SACS access decision (additive — does NOT affect visibility)
    let access = { allowed: false, pendingRequest: false };
    try {
      const lockStatus = await sacsService.getLockStatus(userId, cls.id, 'class', tenantId);
      
      let isAllowed = lockStatus.decision.allowed;
      // Replicate old NERMAI constraint: Offline students MUST request access for recorded classes
      if (ctx.studentType === 'offline' && !lockStatus.decision.hasTemporaryGrant) {
        isAllowed = false;
      }

      access = {
        allowed: isAllowed,
        pendingRequest: !!lockStatus.pendingRequest,
      };
    } catch (e) {
      // SACS failure: treat as denied so UI shows "Request Access" rather than crashing
      access = { allowed: false, pendingRequest: false };
    }

    // Emit class + additive access object
    // encryptedVideoId is intentionally kept encrypted; raw URLs are never sent to client
    visible.push({ ...cls, access, studentType: ctx.studentType });
  }

  return visible;
}

/**
 * Returns batch-filtered resources with SACS access decisions.
 * Uses `targetBatchIds` and `isGeneral` from the IResource schema.
 */
export async function getMyLmsResources(userId: string, tenantId: string): Promise<any[]> {
  const ctx = await resolveStudentContext(userId);

  // Query only published resources for this tenant
  const resourcesSnap = await db.collection('resources')
    .where('tenantId', '==', tenantId)
    .where('isDeleted', '==', false)
    .where('status', '==', 'published')
    .get();

  const visible: any[] = [];
  for (const doc of resourcesSnap.docs) {
    const res = { id: doc.id, ...doc.data() } as any;

    const targetBatchIds: string[] = res.targetBatchIds || [];
    const accessLevel: string = res.visibility || '';

    // isGeneral resources are visible to all enrolled students regardless of batch
    const isGeneral: boolean = !!res.isGeneral;
    if (!isGeneral && !isVisibleToStudent(targetBatchIds, accessLevel, ctx.batchIds, ctx.studentType)) continue;
    if (isGeneral && ctx.batchIds.length === 0) continue; // unassigned student can't see general either

    // Layer 3: SACS access decision
    let access = { allowed: false, pendingRequest: false };
    try {
      const lockStatus = await sacsService.getLockStatus(userId, res.id, 'resource', tenantId);
      access = {
        allowed: lockStatus.decision.allowed,
        pendingRequest: !!lockStatus.pendingRequest,
      };
    } catch (e) {
      access = { allowed: false, pendingRequest: false };
    }

    // storagePath is encrypted - do not expose it; access goes through /resources/:id/access
    const { storagePath, ...safeRes } = res;
    visible.push({ ...safeRes, access });
  }

  return visible;
}
