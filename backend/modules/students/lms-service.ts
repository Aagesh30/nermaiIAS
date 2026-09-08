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
  role: string;
  batchIds: string[];          // resolved UUID batch IDs
  studentType: string;         // 'offline' | 'online' | 'recorded' | ''
  studentTypes: string[];      // all allowed modes
  batchModes: Record<string, string[]>; // batch name -> modes
  batchNameMap: Record<string, string>; // batch UUID -> batch name
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
  const result: StudentContext = {
    role: '',
    batchIds: [],
    studentType: '',
    studentTypes: [],
    batchModes: {},
    batchNameMap: {},
    studentId: null
  };

  // Resolve legacy users -> students path to get the rich student details
  const userDoc = await db.collection('users').doc(userId).get();
  let studentData: any = null;
  if (userDoc.exists) {
    const userData = userDoc.data();
    result.role = userData?.role || '';
    if (userData?.studentId) {
      result.studentId = userData.studentId;
      const sDoc = await db.collection('students').doc(userData.studentId).get();
      if (sDoc.exists) {
        studentData = sDoc.data();
      }
    }
  }

  if (studentData) {
    result.studentType = studentData.type || 'offline';
    result.batchModes = studentData.batchModes || {};
    
    // Resolve multiple batches
    const studentBatches: string[] = studentData.batches || (studentData.batch ? [studentData.batch] : []);
    for (const bName of studentBatches) {
      if (bName) {
        if (!result.batchIds.includes(String(bName))) {
          result.batchIds.push(String(bName));
        }
        const batchSnap = await db.collection('batches')
          .where('batchName', '==', String(bName))
          .where('isDeleted', '==', false)
          .limit(1)
          .get();

        if (!batchSnap.empty) {
          const bId = batchSnap.docs[0].id;
          if (!result.batchIds.includes(bId)) {
            result.batchIds.push(bId);
          }
          result.batchNameMap[bId] = bName;
        }
      }
    }

    // Resolve all modes/types
    let allTypes: string[] = [];
    Object.values(result.batchModes).forEach((modes: any) => {
      if (Array.isArray(modes)) {
        allTypes.push(...modes);
      }
    });
    if (studentData.type) allTypes.push(studentData.type);
    result.studentTypes = Array.from(new Set(allTypes)).filter(Boolean);
  }

  // Fallback to profile path if no batches resolved
  if (result.batchIds.length === 0) {
    const profileDoc = await db.collection(STUDENT_COLLECTIONS.PROFILES).doc(userId).get();
    if (profileDoc.exists) {
      const profile = profileDoc.data() as IStudentProfile;
      (profile.programMemberships || []).forEach((m) => {
        if (m.status === 'active' && m.batchId) {
          result.batchIds.push(m.batchId);
          result.batchNameMap[m.batchId] = m.batchId; // fallback to ID as name
        }
      });
      result.studentType = profile.status === 'active' ? 'online' : 'offline';
      result.studentTypes = [result.studentType];
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
  studentType: string,
  userRole?: string
): boolean {
  const isOffline = studentType === 'offline';
  const isEnrolled = studentBatchIds.length > 0;
  const isGuestUser = userRole === 'guest' || (!isEnrolled && userRole !== 'student');

  // Guest Only: Only visible if user is a guest user (unenrolled guest)
  if (accessLevel === 'guest') {
    return isGuestUser;
  }

  // Enroll Only (premium): Visible to any enrolled student
  if (accessLevel === 'premium') {
    return isEnrolled;
  }

  // Enroll Batch Wise (batch): Visible ONLY if user is enrolled and matches batch
  if (accessLevel === 'batch') {
    return isEnrolled && (
      targetBatchIds.length === 0 ||
      targetBatchIds.includes('all') ||
      targetBatchIds.includes('all_paid') ||
      studentBatchIds.some((bId) => targetBatchIds.includes(bId))
    );
  }

  // Guest + Enroll (public / free / all): Visible to all users
  const isPublicOrFree = accessLevel === 'public' || accessLevel === 'free' || accessLevel === 'all' || targetBatchIds.includes('all') || targetBatchIds.includes('all_free');

  // If not enrolled and content is not public/free and not guest → hide
  if (!isEnrolled && !isPublicOrFree) return false;

  // If enrolled student and accessLevel is guest → hide from enrolled student!
  if (isEnrolled && accessLevel === 'guest') return false;

  // ── Batch matching ──────────────────────────────────────────────────────────
  let batchMatches: boolean;
  if (targetBatchIds.length === 0) {
    // No batch restriction → visible to all users (unless accessLevel is restricted above)
    batchMatches = accessLevel !== 'guest' || !isEnrolled;
  } else if (targetBatchIds.includes('all') || targetBatchIds.includes('all_free')) {
    batchMatches = true;
  } else if (targetBatchIds.includes('all_paid') && isEnrolled) {
    batchMatches = true;
  } else if (!isEnrolled) {
    batchMatches = isPublicOrFree;
  } else {
    // Specific batch targeting
    batchMatches = studentBatchIds.some((bId) => targetBatchIds.includes(bId));
  }

  if (!batchMatches) return false;

  // ── Student type visibility gating ─────────────────────────────────────────
  if (isOffline) return true;

  if (accessLevel === 'public' || accessLevel === 'free' || accessLevel === 'all') return true;
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

  // ── Pre-fetch courses for cross-course enrollment gate ───────────────────────
  // Prevents UDC students from seeing LDC content (and vice versa) when class-level
  // targetBatchIds are absent or too broad (e.g. empty = "all").
  const coursesSnap = await db.collection('courses').get();
  const courseTargetBatches = new Map<string, string[]>();
  for (const cdoc of coursesSnap.docs) {
    const cdata = cdoc.data() as any;
    courseTargetBatches.set(cdoc.id, cdata.targetBatchIds || []);
  }

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

    // ── Course-level enrollment gate (Bug fix: cross-course contamination) ──────
    // A student must belong to a batch that is targeted by the CLASS'S COURSE.
    // This stops UDC students from seeing LDC recorded classes and vice versa,
    // even when individual class targetBatchIds are missing or set to "all".
    if (cls.courseId) {
      const courseBatches = courseTargetBatches.get(cls.courseId) || [];
      if (
        courseBatches.length > 0 &&
        !courseBatches.includes('all') &&
        !ctx.batchIds.some(bId => courseBatches.includes(bId))
      ) {
        continue; // Student's batch is not enrolled in this course
      }
    }

    const targetBatchIds: string[] = cls.targetBatchIds || [];
    const accessLevel: string = cls.accessLevel || '';

    // Layer 1 + 2: Visibility check
    if (!isVisibleToStudent(targetBatchIds, accessLevel, ctx.batchIds, ctx.studentType, ctx.role)) continue;

    // Layer 3: SACS access decision (additive — does NOT affect visibility)
    let access = { allowed: false, pendingRequest: false };
    try {
      const lockStatus = await sacsService.getLockStatus(userId, cls.id, 'class', tenantId);

      let isAllowed = lockStatus.decision.allowed;

      // ── Recorded-content mode gate (Bug fix: online+offline can play) ─────────
      // Only students explicitly enrolled with the 'recorded' student type are
      // auto-granted playback. 'online', 'offline', and combined 'online+offline'
      // students must submit an access request — identical to pure offline behaviour.
      // A SACS temporary grant always overrides this restriction.
      const hasRecordedStudentType = ctx.studentTypes.includes('recorded');
      if (!hasRecordedStudentType && !lockStatus.decision.hasTemporaryGrant) {
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

    // Check visibility against targetBatchIds & accessLevel
    if (!isVisibleToStudent(targetBatchIds, accessLevel, ctx.batchIds, ctx.studentType, ctx.role)) continue;
    if (res.isGeneral && ctx.batchIds.length === 0 && accessLevel !== 'public' && accessLevel !== 'guest' && accessLevel !== 'free') continue;

    // Layer 3: SACS access decision
    let access = { allowed: false, pendingRequest: false };
    if (accessLevel === 'public' || accessLevel === 'guest' || accessLevel === 'free' || targetBatchIds.includes('all_free')) {
      access = { allowed: true, pendingRequest: false };
    } else {
      try {
        const lockStatus = await sacsService.getLockStatus(userId, res.id, 'resource', tenantId);
        access = {
          allowed: lockStatus.decision.allowed,
          pendingRequest: !!lockStatus.pendingRequest,
        };
      } catch (e) {
        access = { allowed: false, pendingRequest: false };
      }
    }

    // storagePath is encrypted - do not expose it; access goes through /resources/:id/access
    const { storagePath, ...safeRes } = res;
    visible.push({ ...safeRes, access });
  }

  return visible;
}
