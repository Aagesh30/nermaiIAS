import { db } from '../../infrastructure/firebase';

const COLLECTION = 'new_attendance';

export class NewAttendanceService {

  /**
   * Record that a student joined a live session.
   * Resolves studentName, rollNo, and batchName automatically.
   */
  static async recordJoin(liveSessionId: string, studentId: string): Promise<void> {
    if (!liveSessionId || !studentId) {
      console.warn('[NEW-ATT-SVC] recordJoin — called with empty liveSessionId or studentId, aborting');
      return;
    }
    console.log('[NEW-ATT-SVC] recordJoin — START — liveSessionId:', liveSessionId, 'studentId:', studentId);

    // ── Resolve canonical studentId ──────────────────────────────────────────
    // The caller may pass either the Firebase Auth UID or the ERP students doc ID.
    // Both must map to the same canonical ID so the duplicate check works.
    let canonicalId = studentId;
    let rollNo = '-';
    let studentName = '-';
    let batchName = '-';

    try {
      // Try the value as-is first (it might already be the students doc ID)
      const directDoc = await db.collection('students').doc(studentId).get();
      if (directDoc.exists) {
        const d = directDoc.data()!;
        canonicalId = studentId; // it IS the students doc ID already
        rollNo = d.regNo || d.registrationNumber || d.rollNumber || d.rollNo || d.username || '-';
        studentName = d.name || d.fullName || d.studentName || d.username || '-';
        batchName = d.batchName || d.batch || d.batchId || '-';
        console.log('[NEW-ATT-SVC] recordJoin — canonical (direct students doc):', canonicalId, 'name:', studentName);
      } else {
        // Value is NOT a students doc ID — treat it as a Firebase Auth userId and resolve
        const byUserId = await db.collection('students').where('userId', '==', studentId).limit(1).get();
        if (!byUserId.empty) {
          const d = byUserId.docs[0].data()!;
          canonicalId = byUserId.docs[0].id; // ← use the students DOC ID as canonical
          rollNo = d.regNo || d.registrationNumber || d.rollNumber || d.rollNo || d.username || '-';
          studentName = d.name || d.fullName || d.studentName || d.username || '-';
          batchName = d.batchName || d.batch || d.batchId || '-';
          console.log('[NEW-ATT-SVC] recordJoin — canonical (via userId lookup):', canonicalId, 'name:', studentName);
        } else {
          // Fall back to student_profiles
          const profileDoc = await db.collection('student_profiles').doc(studentId).get();
          if (profileDoc.exists) {
            const d = profileDoc.data()!;
            canonicalId = studentId;
            rollNo = d.regNo || d.rollNumber || d.rollNo || '-';
            studentName = d.name || d.fullName || d.studentName || '-';
            batchName = d.batchName || d.batch || '-';
            console.log('[NEW-ATT-SVC] recordJoin — canonical (student_profiles):', canonicalId, 'name:', studentName);
          } else {
            console.warn('[NEW-ATT-SVC] recordJoin — student NOT found anywhere for id:', studentId);
          }
        }
      }
    } catch (err) {
      console.error('[NewAttendanceService] Student details fetch failed:', err);
    }

    // Duplicate check — always uses canonicalId, so UID-vs-docId can't slip through
    console.log('[NEW-ATT-SVC] recordJoin — checking Firestore for existing record (canonicalId:', canonicalId, ')...');
    const existing = await db.collection(COLLECTION)
      .where('liveSessionId', '==', liveSessionId)
      .where('studentId', '==', canonicalId)
      .limit(1)
      .get();
    console.log('[NEW-ATT-SVC] recordJoin — duplicate check result: empty?', existing.empty);
    
    if (!existing.empty) {
      console.log('[NEW-ATT-SVC] recordJoin — DUPLICATE found, skipping write');
      return;
    }

    const now = new Date().toISOString();
    const docPayload = {
      liveSessionId,
      studentId: canonicalId,  // ← always the canonical students doc ID
      studentName,
      rollNo,
      batchName,
      joinedAt: now,
      createdAt: now,
    };
    console.log('[NEW-ATT-SVC] recordJoin — writing to Firestore:', docPayload);
    await db.collection(COLLECTION).add(docPayload);
    console.log('[NEW-ATT-SVC] recordJoin — SUCCESS — document written to', COLLECTION);
  }

  /**
   * Check if a student joined a given session.
   */
  static async checkStudentAttendance(liveSessionId: string, studentId: string): Promise<{ joined: boolean; joinedAt: string | null }> {
    if (!liveSessionId || !studentId) {
      console.warn('[NEW-ATT-SVC] checkStudentAttendance — empty params, returning {joined:false}');
      return { joined: false, joinedAt: null };
    }
    console.log('[NEW-ATT-SVC] checkStudentAttendance — querying Firestore — liveSessionId:', liveSessionId, 'studentId:', studentId);

    const studentIdsToCheck = [studentId];
    try {
      const uDoc = await db.collection('users').doc(studentId).get();
      if (uDoc.exists && uDoc.data()?.studentId) {
        studentIdsToCheck.push(uDoc.data()!.studentId);
      }
      const sDoc = await db.collection('students').doc(studentId).get();
      if (sDoc.exists && sDoc.data()?.userId) {
        studentIdsToCheck.push(sDoc.data()!.userId);
      }
    } catch (e) {}

    const sessionIdsToCheck = [liveSessionId];
    try {
      const lsDoc = await db.collection('live_sessions').doc(liveSessionId).get();
      if (lsDoc.exists && lsDoc.data()?.classId) {
        sessionIdsToCheck.push(lsDoc.data()!.classId);
      } else {
        const lsSnap = await db.collection('live_sessions').where('classId', '==', liveSessionId).limit(1).get();
        if (!lsSnap.empty) {
          sessionIdsToCheck.push(lsSnap.docs[0].id);
        }
      }
    } catch (e) {}

    for (const sId of sessionIdsToCheck) {
      for (const stId of studentIdsToCheck) {
        const snap = await db.collection(COLLECTION)
          .where('liveSessionId', '==', sId)
          .where('studentId', '==', stId)
          .limit(1)
          .get();
        if (!snap.empty) {
          const doc = snap.docs[0].data();
          console.log('[NEW-ATT-SVC] checkStudentAttendance — RECORD FOUND for sId:', sId, 'stId:', stId, doc);
          return { joined: true, joinedAt: doc.joinedAt || doc.createdAt || null };
        }
      }
    }

    console.log('[NEW-ATT-SVC] checkStudentAttendance — NO record found in Firestore for these IDs');
    return { joined: false, joinedAt: null };
  }

  /**
   * Get attendance history for a single student.
   */
  static async getMyAttendance(studentId: string): Promise<any[]> {
    if (!studentId) return [];
    const snap = await db.collection(COLLECTION)
      .where('studentId', '==', studentId)
      .get();
    const records = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
    return records.sort((a: any, b: any) => (b.joinedAt || '').localeCompare(a.joinedAt || ''));
  }

  /**
   * Get all attendance records for a session (admin view).
   */
  static async getAttendanceBySession(liveSessionId: string): Promise<any> {
    const sessionIdsToCheck = [liveSessionId];
    try {
      const lsDoc = await db.collection('live_sessions').doc(liveSessionId).get();
      if (lsDoc.exists && lsDoc.data()?.classId) {
        sessionIdsToCheck.push(lsDoc.data()!.classId);
      } else {
        const lsSnap = await db.collection('live_sessions').where('classId', '==', liveSessionId).limit(1).get();
        if (!lsSnap.empty) {
          sessionIdsToCheck.push(lsSnap.docs[0].id);
        }
      }
    } catch (e) {}

    const recordsMap = new Map<string, any>();
    for (const sId of sessionIdsToCheck) {
      const snap = await db.collection(COLLECTION)
        .where('liveSessionId', '==', sId)
        .get();
      for (const doc of snap.docs) {
        if (!recordsMap.has(doc.id)) {
          recordsMap.set(doc.id, { id: doc.id, ...doc.data() });
        }
      }
    }

    const records = Array.from(recordsMap.values());

    return {
      totalJoined: records.length,
      present: records.length,
      absent: 0,
      pending: 0,
      records,
    };
  }

  /**
   * Get all attendance records for admin report table.
   */
  static async getAdminRecords(filters: any = {}): Promise<any[]> {
    let query: any = db.collection(COLLECTION);
    
    if (filters.sessionId) {
      query = query.where('liveSessionId', '==', filters.sessionId);
    }
    
    const snap = await query.get();
    let records = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));


    if (filters.studentName) {
      const q = filters.studentName.toLowerCase();
      records = records.filter((r: any) => (r.studentName || '').toLowerCase().includes(q) || (r.rollNo || '').toLowerCase().includes(q));
    }
    if (filters.batchName) {
      const q = filters.batchName.toLowerCase();
      records = records.filter((r: any) => (r.batchName || '').toLowerCase().includes(q));
    }

    return records.sort((a: any, b: any) => (b.joinedAt || '').localeCompare(a.joinedAt || ''));
  }

  /**
   * Delete all records for a session before the session is deleted.
   */
  static async deleteBySession(liveSessionId: string): Promise<void> {
    const snap = await db.collection(COLLECTION)
      .where('liveSessionId', '==', liveSessionId)
      .get();
    if (snap.empty) return;
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

