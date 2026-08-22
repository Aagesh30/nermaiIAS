import { db } from '../../infrastructure/firebase';
import { AppError } from '../../core/errors/AppError';
import { v4 as uuidv4 } from 'uuid';

const ATTENDANCE_COL = 'lms_class_attendance';
const CORRECTIONS_COL = 'lms_attendance_corrections';
const CLASSES_COL = 'classes';

// Default threshold — overridden per-class by attendanceThresholdMinutes
const DEFAULT_THRESHOLD_MINUTES = 15;

// ─── Helper ───────────────────────────────────────────────────────────────────
function calcDurationMinutes(joinedAt: string, submittedAt: string): number {
  return Math.floor((new Date(submittedAt).getTime() - new Date(joinedAt).getTime()) / 60000);
}

// ─── Service ──────────────────────────────────────────────────────────────────
export class LmsAttendanceService {

  // ── STUDENT: Record Join ──────────────────────────────────────────────────
  // Called silently when student clicks "Join Now". Upserts a record.
  // If attendance already submitted for this class, skip to avoid overwriting.
  async recordJoin(
    studentId: string,
    studentName: string,
    classId: string,
    className: string,
    courseId: string,
    courseName: string,
    batchName: string
  ) {
    // Check if record already exists for this student+class
    const snap = await db.collection(ATTENDANCE_COL)
      .where('studentId', '==', studentId)
      .where('classId', '==', classId)
      .limit(1)
      .get();

    const now = new Date().toISOString();

    if (!snap.empty) {
      const existing = snap.docs[0].data();
      // If attendance already submitted, don't overwrite joinedAt
      if (existing.attendanceSubmittedAt) {
        return { id: snap.docs[0].id, ...existing };
      }
      // Update joinedAt (student re-joined before submitting)
      await snap.docs[0].ref.update({ joinedAt: now, updatedAt: now });
      return { id: snap.docs[0].id, ...existing, joinedAt: now };
    }

    // Create new record
    const id = uuidv4();
    const record = {
      id,
      studentId,
      studentName,
      classId,
      className,
      courseId,
      courseName,
      batchName,
      joinedAt: now,
      attendanceSubmittedAt: null,
      durationMinutes: null,
      status: 'PENDING',
      manuallyMarked: false,
      markedBy: null,
      manualNote: null,
      correctionRequested: false,
      correctionRequestId: null,
      createdAt: now,
      updatedAt: now,
    };

    await db.collection(ATTENDANCE_COL).doc(id).set(record);
    return record;
  }

  // ── STUDENT: Submit Attendance ─────────────────────────────────────────────
  async submitAttendance(studentId: string, classId: string) {
    const snap = await db.collection(ATTENDANCE_COL)
      .where('studentId', '==', studentId)
      .where('classId', '==', classId)
      .limit(1)
      .get();

    if (snap.empty) {
      throw new AppError('No join record found. Please join the class first.', 404);
    }

    const doc = snap.docs[0];
    const record = doc.data();

    if (record.attendanceSubmittedAt) {
      throw new AppError('Attendance already submitted for this class.', 409);
    }

    // Look up the class to get its configured attendance threshold
    let thresholdMinutes = DEFAULT_THRESHOLD_MINUTES;
    const classDoc = await db.collection(CLASSES_COL).doc(classId).get();
    if (classDoc.exists) {
      const cls = classDoc.data() as any;
      if (typeof cls.attendanceThresholdMinutes === 'number' && cls.attendanceThresholdMinutes > 0) {
        thresholdMinutes = cls.attendanceThresholdMinutes;
      }
    }

    const now = new Date().toISOString();
    const durationMinutes = calcDurationMinutes(record.joinedAt, now);
    const status = durationMinutes >= thresholdMinutes ? 'PRESENT' : 'ABSENT';

    await doc.ref.update({
      attendanceSubmittedAt: now,
      durationMinutes,
      thresholdMinutes,
      status,
      updatedAt: now,
    });

    return { id: doc.id, ...record, attendanceSubmittedAt: now, durationMinutes, thresholdMinutes, status };
  }

  // ── STUDENT: Get My Attendance ─────────────────────────────────────────────
  async getMyAttendance(studentId: string) {
    const snap = await db.collection(ATTENDANCE_COL)
      .where('studentId', '==', studentId)
      .get();

    const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Sort by joinedAt descending
    records.sort((a: any, b: any) =>
      new Date(b.joinedAt || b.createdAt).getTime() - new Date(a.joinedAt || a.createdAt).getTime()
    );

    // Compute summary
    const submitted = records.filter((r: any) => r.attendanceSubmittedAt);
    const presentCount = submitted.filter((r: any) => r.status === 'PRESENT').length;
    const absentCount = submitted.filter((r: any) => r.status === 'ABSENT').length;
    const totalMinutes = submitted
      .filter((r: any) => r.status === 'PRESENT')
      .reduce((sum: number, r: any) => sum + (r.durationMinutes || 0), 0);

    return {
      records,
      summary: {
        totalClasses: submitted.length,
        presentCount,
        absentCount,
        totalMinutes,
        totalHours: parseFloat((totalMinutes / 60).toFixed(1)),
      },
    };
  }

  // ── STUDENT: Get attendance record for specific class ───────────────────────
  async getClassAttendance(studentId: string, classId: string) {
    const snap = await db.collection(ATTENDANCE_COL)
      .where('studentId', '==', studentId)
      .where('classId', '==', classId)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  }

  // ── STUDENT: Request Correction ───────────────────────────────────────────
  async requestCorrection(attendanceId: string, studentId: string, reason: string) {
    const attDoc = await db.collection(ATTENDANCE_COL).doc(attendanceId).get();
    if (!attDoc.exists) throw new AppError('Attendance record not found', 404);
    const att = attDoc.data()!;
    if (att.studentId !== studentId) throw new AppError('Unauthorized', 403);
    if (att.correctionRequested) throw new AppError('Correction already requested for this class', 409);

    const now = new Date().toISOString();
    const id = uuidv4();
    const correction = {
      id,
      attendanceId,
      studentId: att.studentId,
      studentName: att.studentName,
      classId: att.classId,
      className: att.className,
      courseId: att.courseId || '',
      courseName: att.courseName || '',
      joinedAt: att.joinedAt,
      attendanceSubmittedAt: att.attendanceSubmittedAt,
      durationMinutes: att.durationMinutes,
      currentStatus: att.status,
      reason,
      status: 'PENDING',
      adminNote: null,
      reviewedBy: null,
      reviewedAt: null,
      createdAt: now,
    };

    await db.collection(CORRECTIONS_COL).doc(id).set(correction);
    await attDoc.ref.update({ correctionRequested: true, correctionRequestId: id, updatedAt: now });

    return correction;
  }

  // ── ADMIN: List All Attendance Records ────────────────────────────────────
  async adminListAll(filters: {
    studentId?: string;
    studentName?: string;
    classId?: string;
    className?: string;
    batchName?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  } = {}) {
    let query: any = db.collection(ATTENDANCE_COL);

    if (filters.studentId) query = query.where('studentId', '==', filters.studentId);
    if (filters.classId) query = query.where('classId', '==', filters.classId);
    if (filters.status && filters.status !== 'ALL') query = query.where('status', '==', filters.status);

    const snap = await query.get();
    let records: any[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));

    // Post-filter (Firestore can't do compound inequalities + text)
    if (filters.studentName) {
      const q = filters.studentName.toLowerCase();
      records = records.filter((r: any) => (r.studentName || '').toLowerCase().includes(q));
    }
    if (filters.className) {
      const q = filters.className.toLowerCase();
      records = records.filter((r: any) => (r.className || '').toLowerCase().includes(q));
    }
    if (filters.batchName) {
      const q = filters.batchName.toLowerCase();
      records = records.filter((r: any) => (r.batchName || '').toLowerCase().includes(q));
    }
    if (filters.dateFrom) {
      records = records.filter((r: any) => r.joinedAt >= filters.dateFrom!);
    }
    if (filters.dateTo) {
      const to = filters.dateTo + 'T23:59:59.999Z';
      records = records.filter((r: any) => r.joinedAt <= to);
    }

    records.sort((a, b) =>
      new Date(b.joinedAt || b.createdAt).getTime() - new Date(a.joinedAt || a.createdAt).getTime()
    );

    return records;
  }

  // ── ADMIN: Manual Mark ────────────────────────────────────────────────────
  async adminManualMark(attendanceId: string, adminId: string, status: 'PRESENT' | 'ABSENT', note: string) {
    const doc = await db.collection(ATTENDANCE_COL).doc(attendanceId).get();
    if (!doc.exists) throw new AppError('Attendance record not found', 404);

    const now = new Date().toISOString();
    await doc.ref.update({
      status,
      manuallyMarked: true,
      markedBy: adminId,
      manualNote: note || '',
      updatedAt: now,
    });

    return { success: true };
  }

  // ── ADMIN: List Correction Requests ──────────────────────────────────────
  async adminListCorrections(filters: { status?: string } = {}) {
    let query: any = db.collection(CORRECTIONS_COL);
    if (filters.status && filters.status !== 'ALL') {
      query = query.where('status', '==', filters.status);
    }
    const snap = await query.get();
    const records: any[] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    records.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return records;
  }

  // ── ADMIN: Review Correction ──────────────────────────────────────────────
  async adminReviewCorrection(correctionId: string, adminId: string, approve: boolean, note: string) {
    const corrDoc = await db.collection(CORRECTIONS_COL).doc(correctionId).get();
    if (!corrDoc.exists) throw new AppError('Correction request not found', 404);
    const corr = corrDoc.data()!;

    const now = new Date().toISOString();
    const newStatus = approve ? 'APPROVED' : 'REJECTED';

    await corrDoc.ref.update({
      status: newStatus,
      adminNote: note || '',
      reviewedBy: adminId,
      reviewedAt: now,
    });

    // If approved, update the attendance record too
    if (approve) {
      const attDoc = await db.collection(ATTENDANCE_COL).doc(corr.attendanceId).get();
      if (attDoc.exists) {
        await attDoc.ref.update({
          status: 'PRESENT',
          manuallyMarked: true,
          markedBy: adminId,
          manualNote: `Correction approved: ${note || 'Approved by admin'}`,
          updatedAt: now,
        });
      }
    }

    return { success: true, newStatus };
  }

  // ── ADMIN: Close Class Attendance (auto-mark pending joins as ABSENT) ──────
  // Called when a class session ends. Any student who joined but never clicked
  // "Give Attendance" is automatically marked ABSENT.
  async markClassAbsentOnEnd(classId: string, adminId: string) {
    const snap = await db.collection(ATTENDANCE_COL)
      .where('classId', '==', classId)
      .get();

    const now = new Date().toISOString();
    const batch = db.batch();
    let closedCount = 0;

    // Look up configured threshold for this class
    let thresholdMinutes = DEFAULT_THRESHOLD_MINUTES;
    const classDoc = await db.collection(CLASSES_COL).doc(classId).get();
    if (classDoc.exists) {
      const cls = classDoc.data() as any;
      if (typeof cls.attendanceThresholdMinutes === 'number' && cls.attendanceThresholdMinutes > 0) {
        thresholdMinutes = cls.attendanceThresholdMinutes;
      }
    }

    for (const doc of snap.docs) {
      const record = doc.data();
      if (!record.attendanceSubmittedAt) {
        const durationMinutes = record.joinedAt
          ? calcDurationMinutes(record.joinedAt, now)
          : 0;
        const status = durationMinutes >= thresholdMinutes ? 'PRESENT' : 'ABSENT';
        batch.update(doc.ref, {
          attendanceSubmittedAt: now,
          durationMinutes,
          thresholdMinutes,
          status,
          manuallyMarked: true,
          markedBy: adminId,
          manualNote: 'Auto-marked: class ended without attendance submission',
          updatedAt: now,
        });
        closedCount++;
      }
    }

    await batch.commit();
    return { closedCount };
  }

  // ── ADMIN: Get per-class attendance summary ───────────────────────────────
  async getClassAttendanceSummary(classId: string) {
    const snap = await db.collection(ATTENDANCE_COL)
      .where('classId', '==', classId)
      .get();

    const records = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));

    // Enrich records with student info (name, regNo, batchName)
    const enriched = await Promise.all(records.map(async (rec: any) => {
      let studentName = rec.studentName || '';
      let regNo = rec.regNo || rec.username || '';
      let batchName = rec.batchName || '';

      if (!studentName && rec.studentId) {
        // Try student_profiles first, then users
        let profileDoc = await db.collection('student_profiles').doc(rec.studentId).get();
        let profile: any = profileDoc.exists ? profileDoc.data() : null;
        if (!profile) {
          const userDoc = await db.collection('users').doc(rec.studentId).get();
          profile = userDoc.exists ? userDoc.data() : null;
        }
        if (profile) {
          studentName = profile.displayName || profile.name || profile.fullName
            || profile.studentName || profile.username || '';
          regNo = profile.regNo || profile.username || profile.rollNumber || '';
          batchName = batchName || profile.batchName || '';
        }
      }

      return {
        ...rec,
        studentName: studentName || 'Unknown',
        regNo,
        batchName,
      };
    }));

    const submitted = enriched.filter(r => r.attendanceSubmittedAt);
    const pending   = enriched.filter(r => !r.attendanceSubmittedAt);
    const present   = submitted.filter(r => r.status === 'PRESENT');
    const absent    = submitted.filter(r => r.status === 'ABSENT');

    return {
      totalJoined: enriched.length,
      submitted: submitted.length,
      pending: pending.length,
      present: present.length,
      absent: absent.length,
      records: enriched,
    };
  }
}

export const lmsAttendanceService = new LmsAttendanceService();
