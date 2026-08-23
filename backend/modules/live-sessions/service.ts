import { db } from '../../infrastructure/firebase';
import { ILiveSession } from './types';
import { redisClient } from '../../infrastructure/redis';
import { ProviderManager } from './providers/ProviderManager';
import { AppError } from '../../core/errors/AppError';
import { ClassRepository } from '../courses/repository';
import { interactionEventBus } from '../interaction-engine/eventBus';
import { NotificationService } from '../notifications/service';
import { LiveSessionResolver } from './LiveSessionResolver';
import { encrypt } from '../../core/utils/encryption';

// Extract YouTube video ID from any YouTube URL format
function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([\w-]{11})/,
    /^([\w-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

const notificationService = new NotificationService();

export class LiveSessionService {
  private static collection = 'live_sessions';

  static async getSession(sessionId: string): Promise<ILiveSession | null> {
    const doc = await db.collection(this.collection).doc(sessionId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as ILiveSession;
  }
  
  static async listSessions(filters?: { teacherId?: string }, user?: { userId: string; role: string }): Promise<ILiveSession[]> {
    const now = Date.now();

    // Cache courses and batches for fast lookup
    const coursesSnap = await db.collection('courses').get();
    const courseMap = new Map<string, string>();
    coursesSnap.docs.forEach(d => {
      courseMap.set(d.id, d.data().title || d.data().name || '');
    });

    const batchesSnap = await db.collection('student_batches').get();
    const batchMap = new Map<string, string>();
    batchesSnap.docs.forEach(d => {
      batchMap.set(d.id, d.data().name || d.data().code || d.data().batchName || d.id);
    });

    // Query all live classes from 'classes' collection
    const liveClassesSnap = await db.collection('classes')
       .where('classType', '==', 'live')
       .get();
       
    const convertedClassesSnap = await db.collection('classes')
       .where('convertedFromLive', '==', true)
       .get();
       
    const allClassDocsMap = new Map();
    liveClassesSnap.docs.forEach(doc => allClassDocsMap.set(doc.id, doc));
    convertedClassesSnap.docs.forEach(doc => allClassDocsMap.set(doc.id, doc));
    const classesDocs = Array.from(allClassDocsMap.values());

    const enriched = [];
    for (const doc of classesDocs) {
       const cls = { id: doc.id, ...doc.data() } as any;
       if (cls.isDeleted === true) continue;

       // Find active live session for this class
       const liveSessionSnap = await db.collection(this.collection)
         .where('classId', '==', cls.id)
         .get();

       const validDocs = liveSessionSnap.docs
         .map(d => ({ id: d.id, ...d.data() } as any))
         .filter(d => d.isDeleted !== true)
         .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

       const liveSession = validDocs.length > 0 ? validDocs[0] : null;

       if (filters?.teacherId) {
         const hostId = liveSession?.hostId || cls.teacherId || cls.hostId;
         if (hostId !== filters.teacherId) continue;
       }

       // Apply visibility check!
       if (user && !this.canSeeLiveClass(user, cls, liveSession)) {
         continue;
       }

       const scheduledStartTime = liveSession?.scheduledStartTime || cls.scheduledStartTime;
       const durationMinutes = liveSession?.expectedDurationMinutes || cls.expectedDurationMinutes || 60;
       
       let startTimeMs = 0;
       if (scheduledStartTime) {
         if (typeof scheduledStartTime === 'object' && (scheduledStartTime as any)._seconds) {
           startTimeMs = (scheduledStartTime as any)._seconds * 1000;
         } else {
           startTimeMs = new Date(scheduledStartTime).getTime();
         }
       }

       const endTimeMs = startTimeMs + durationMinutes * 60 * 1000;

       // AUTO DELETE logic removed based on user request - duration is approximate.

       const courseName = courseMap.get(cls.courseId) || cls.courseName || '';
       const targetBatchIds: string[] = cls.targetBatchIds || cls.targetBatches || [];
       const accessLevel = cls.accessLevel || '';
       let batchName = '';
       if (targetBatchIds.length > 0) {
         batchName = targetBatchIds.map(bId => batchMap.get(bId) || bId).join(', ');
       } else if (accessLevel === 'free' || accessLevel === 'all') {
         batchName = 'All Students';
       } else {
         batchName = 'All Batches';
       }

       enriched.push({
         id: liveSession?.id || cls.id,
         classId: cls.id,
         title: cls.title || cls.name || 'Live Class',
         topicId: cls.topicId || '',
         subjectId: cls.subjectId || '',
         courseId: cls.courseId || '',
         courseName,
         batchName,
         targetBatchIds,
         accessLevel,
         liveStatus: liveSession?.status || 'SCHEDULED',
         status: liveSession?.status || 'SCHEDULED',
         lamsStatus: liveSession?.attendance?.status === 'LIVE' ? 'ATTENDANCE_ACTIVE' : liveSession?.attendance?.status || 'NOT_STARTED',
         startTime: scheduledStartTime,
         scheduledStartTime,
         expectedDurationMinutes: durationMinutes,
         provider: liveSession?.provider || 'zoom',
         teacherName: cls.teacherName || 'Teacher',
         liveSession
       });
    }
    console.log('DEBUG: Returning enriched sessions, count:', enriched.length);
    return (enriched as any[]).sort((a, b) => new Date(b.scheduledStartTime || 0).getTime() - new Date(a.scheduledStartTime || 0).getTime());
  }
  
  static async getStudentLiveSessions(userId: string, tenantId: string): Promise<any[]> {
    console.log('DEBUG: getStudentLiveSessions started', userId);
    const now = Date.now();

    // Cache courses and batches
    console.log('DEBUG: Fetching courses...');
    const coursesSnap = await db.collection('courses').get();
    console.log('DEBUG: Fetched courses, count:', coursesSnap.docs.length);
    const courseMap = new Map<string, string>();
    coursesSnap.docs.forEach(d => {
      courseMap.set(d.id, d.data().title || d.data().name || '');
    });

    console.log('DEBUG: Fetching student_batches...');

    const batchesSnap = await db.collection('student_batches').get();
    const batchMap = new Map<string, string>();
    batchesSnap.docs.forEach(d => {
      batchMap.set(d.id, d.data().name || d.data().code || d.data().batchName || d.id);
    });

    // 1. Fetch user to resolve studentId
    let studentId = userId;
    let studentType = 'offline';

    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.studentId) {
        studentId = userData.studentId;
      }
      if (userData?.type) studentType = userData.type;
      if (userData?.studentType) studentType = userData.studentType;
    }

    // 2. Fetch student
    console.log('DEBUG: Fetching studentDoc...');
    const studentDoc = await db.collection('students').doc(studentId).get();
    console.log('DEBUG: Fetched studentDoc. exists?', studentDoc.exists);
    let studentData: any = studentDoc.exists ? studentDoc.data() : null;
    
    if (!studentData) {
      console.log('DEBUG: Fetching student by userId...');
      const byUserId = await db.collection('students').where('userId', '==', userId).limit(1).get();
      if (!byUserId.empty) {
        studentData = byUserId.docs[0].data();
      } else {
        const byUsername = await db.collection('students').where('loginUsername', '==', userDoc.data()?.username || '').limit(1).get();
        if (!byUsername.empty) {
          studentData = byUsername.docs[0].data();
        }
      }
    }
    
    const rawBatchIds: string[] = [];
    let userCourseIds: string[] = [];
    
    if (studentData) {
      if (studentData.type) studentType = studentData.type;
      if (studentData.studentType) studentType = studentData.studentType;

      if (studentData.batchId) rawBatchIds.push(studentData.batchId);
      if (studentData.batch) {
        rawBatchIds.push(studentData.batch);
        // Legacy support: map human-readable batch name to UUID
        for (const [id, name] of batchMap.entries()) {
          if (name === studentData.batch) {
            rawBatchIds.push(id);
          }
        }
      }
      
      if (studentData.courseId) userCourseIds.push(studentData.courseId);
      if (studentData.course) {
        userCourseIds.push(studentData.course);
        // Legacy support: map human-readable course name to UUID
        for (const [id, name] of courseMap.entries()) {
          if (name === studentData.course) {
            userCourseIds.push(id);
          }
        }
      }
      
      if (studentData.enrolledCourseIds && Array.isArray(studentData.enrolledCourseIds)) {
        userCourseIds.push(...studentData.enrolledCourseIds);
      }
    }

    console.log('DEBUG: Fetching profileDoc...');
    let profileDoc = await db.collection('student_profiles').doc(studentId).get();
    console.log('DEBUG: Fetched profileDoc. exists?', profileDoc.exists);
    if (!profileDoc.exists) {
      console.log('DEBUG: Fetching profile by userId...');
      const pByUserId = await db.collection('student_profiles').where('userId', '==', studentId).limit(1).get();
      if (!pByUserId.empty) profileDoc = pByUserId.docs[0] as any;
    }
    if (profileDoc.exists) {
      const pData = profileDoc.data();
      
      if (pData?.type) studentType = pData.type;
      if (pData?.studentType) studentType = pData.studentType;
      
      (pData?.programMemberships || []).forEach((m: any) => { 
        if (m.batchId) rawBatchIds.push(m.batchId); 
        if (m.courseId) userCourseIds.push(m.courseId);
      });
      if (pData?.enrolledCourseIds && Array.isArray(pData.enrolledCourseIds)) {
        userCourseIds.push(...pData.enrolledCourseIds);
      }
    }

    const userBatchIds = Array.from(new Set(rawBatchIds.filter(Boolean)));

    if (userBatchIds.length > 0) {
      const batchDocs = await Promise.all(userBatchIds.map((b: string) => db.collection('student_batches').doc(b).get()));
      batchDocs.forEach(d => {
        const cId = d.data()?.courseId;
        if (cId) userCourseIds.push(cId);
      });
    }

    const uniqueUserCourseIds = Array.from(new Set(userCourseIds.filter(Boolean)));
    console.log('DEBUG: Fetched student data, uniqueUserCourseIds:', uniqueUserCourseIds);

    // 2. Fetch all live classes
    const liveClassesSnap = await db.collection('classes')
       .where('classType', '==', 'live')
       .where('isDeleted', '==', false)
       .get();
       
    const convertedClassesSnap = await db.collection('classes')
       .where('convertedFromLive', '==', true)
       .where('isDeleted', '==', false)
       .get();

    const allClassDocsMap = new Map();
    liveClassesSnap.docs.forEach(doc => allClassDocsMap.set(doc.id, doc));
    convertedClassesSnap.docs.forEach(doc => allClassDocsMap.set(doc.id, doc));
    const classesDocs = Array.from(allClassDocsMap.values());
    console.log('DEBUG: Fetched classesDocs, count:', classesDocs.length);

    const result = [];

    // ── Fetch approved content_access grants for this student (once, before loop) ──
    const grantsSnap = await db.collection('content_access')
      .where('studentId', '==', userId)
      .where('status', '==', 'ACTIVE')
      .get();
    // Also check by the resolved studentId (legacy students collection)
    const grantsSnap2 = studentId !== userId
      ? await db.collection('content_access')
          .where('studentId', '==', studentId)
          .where('status', '==', 'ACTIVE')
          .get()
      : null;

    const activeGrantEntityIds = new Set<string>();
    const processGrant = (d: FirebaseFirestore.QueryDocumentSnapshot) => {
      const g = d.data();
      const expired = g.expiresAt && new Date(g.expiresAt).getTime() < now;
      if (!expired) activeGrantEntityIds.add(g.entityId);
    };
    grantsSnap.docs.forEach(processGrant);
    if (grantsSnap2) grantsSnap2.docs.forEach(processGrant);

    for (const doc of classesDocs) {
      const cls = { id: doc.id, ...doc.data() } as any;
      const targetBatches: string[] = cls.targetBatchIds || cls.targetBatches || [];
      const accessLevel = cls.accessLevel || '';

      // Check access: free, all, batch, course matching, or an approved content_access grant
      let hasAccess = false;
      const isEnrolled = userBatchIds.length > 0 || uniqueUserCourseIds.length > 0;
      const isOffline = studentType?.toLowerCase() === 'offline';
      
      const targetCourses = cls.targetCourses || (cls.courseId ? [cls.courseId] : []);
      const isTargeted = targetBatches.length > 0 || targetCourses.length > 0;
      const matchBatch = targetBatches.length > 0 ? targetBatches.some((bId: string) => userBatchIds.includes(bId)) : false;
      const matchCourse = targetCourses.length > 0 ? targetCourses.some((cId: string) => uniqueUserCourseIds.includes(cId)) : false;

      // ── Grant-based override: admin approved a CLASS or higher-level grant ──
      const hasGrant = activeGrantEntityIds.has(cls.id);

      if (hasGrant) {
        hasAccess = true;
      } else if (
        accessLevel === 'free' || 
        accessLevel === 'all' || 
        targetBatches.includes('all') || 
        targetBatches.includes('all_free')
      ) {
        hasAccess = true;
      } else if (!isEnrolled) {
        hasAccess = false;
      } else if (isOffline) {
        hasAccess = false; // Offline must request access
      } else if (isTargeted) {
        // Online/Recorded student: must match either batch OR course
        hasAccess = matchBatch || matchCourse;
      } else {
        // Not targeted to anyone specifically, but student is enrolled
        hasAccess = true;
      }

      if (hasAccess) {
        console.log('DEBUG: Resolving session for classId:', cls.id);
         const resolvedSession = await LiveSessionResolver.resolveActiveSession(cls.id, cls);
        const liveStatus = resolvedSession.status;
        let isJoinAllowed = resolvedSession.joinAllowed;
        
        let derivedStatus: string = liveStatus;

        // ── Time-based override ───────────────────────────────────────────────
        // scheduledStartTime is stored on the live_session doc, not the class doc.
        if (derivedStatus === 'SCHEDULED' && !resolvedSession.actualStartTime) {
          const scheduledMs = resolvedSession.scheduledStartTime
            ? new Date(resolvedSession.scheduledStartTime).getTime()
            : cls.scheduledStartTime
              ? new Date(cls.scheduledStartTime).getTime()
              : 0;
          const durMins = resolvedSession.expectedDurationMinutes || cls.expectedDurationMinutes || 60;
          const durationMs = durMins * 60 * 1000;
          const graceMs = 10 * 60 * 1000; // 10-min grace period
          if (scheduledMs > 0 && now > scheduledMs + durationMs + graceMs) {
            derivedStatus = 'ENDED';
            isJoinAllowed = false;
          }
        }

        if (derivedStatus === 'SCHEDULED' && resolvedSession.actualStartTime) {
          derivedStatus = 'LIVE'; // Fallback if webhook failed
          isJoinAllowed = true;
        }
        
        if (derivedStatus === 'ENDED' && !cls.encryptedRecordingId) {
            derivedStatus = 'NOT_UPLOADED';
        } else if (derivedStatus === 'ENDED' && cls.encryptedRecordingId) {
            derivedStatus = 'RECORDED_AVAILABLE';
        }

        const scheduledStartTime = cls.scheduledStartTime || null;
        const durationMinutes = cls.expectedDurationMinutes || 60;

        const courseName = courseMap.get(cls.courseId) || cls.courseName || '';
        let batchName = '';
        if (targetBatches.length > 0) {
          batchName = targetBatches.map(bId => batchMap.get(bId) || bId).join(', ');
        } else if (accessLevel === 'free' || accessLevel === 'all') {
          batchName = 'All Students';
        } else {
          batchName = 'All Batches';
        }

        result.push({
          id: resolvedSession.sessionId || cls.id,
          classId: cls.id,
          title: cls.title,
          status: derivedStatus,
          liveStatus: derivedStatus,
          joinAllowed: isJoinAllowed,
          scheduledStartTime,
          expectedDurationMinutes: durationMinutes,
          provider: resolvedSession.provider || 'zoom',
          teacherName: cls.teacherName || 'Teacher',
          subjectId: cls.subjectId || '',
          subjectName: cls.subjectName || 'Subject',
          topicId: cls.topicId || '',
          topicName: cls.topicName || '',
          courseId: cls.courseId || '',
          courseName,
          batchName,
          accessDenied: false
        });
      } else {
        // NEW: Include SCHEDULED upcoming classes without access so students can request access
        const resolvedSession = await LiveSessionResolver.resolveActiveSession(cls.id, cls);
        const sessionStatus = resolvedSession.status;
        
        let derivedStatus: string = sessionStatus;

        // Time-based override for denied-access classes too
        if (derivedStatus === 'SCHEDULED' && !resolvedSession.actualStartTime) {
          const scheduledMs = resolvedSession.scheduledStartTime
            ? new Date(resolvedSession.scheduledStartTime).getTime()
            : cls.scheduledStartTime
              ? new Date(cls.scheduledStartTime).getTime()
              : 0;
          const durMins = resolvedSession.expectedDurationMinutes || cls.expectedDurationMinutes || 60;
          const durationMs = durMins * 60 * 1000;
          const graceMs = 10 * 60 * 1000;
          if (scheduledMs > 0 && now > scheduledMs + durationMs + graceMs) {
            derivedStatus = 'ENDED';
          }
        }

        if (derivedStatus === 'ENDED' && !cls.encryptedRecordingId) {
            derivedStatus = 'NOT_UPLOADED';
        } else if (derivedStatus === 'ENDED' && cls.encryptedRecordingId) {
            derivedStatus = 'RECORDED_AVAILABLE';
        }

        // Only show denied-access classes if they are still upcoming/scheduled (not ended)
        const endedStatuses = ['ENDED', 'CANCELLED', 'EXPIRED', 'ARCHIVED', 'NOT_UPLOADED', 'RECORDED_AVAILABLE'];
        if (!endedStatuses.includes(derivedStatus)) {
          const scheduledStartTime = cls.scheduledStartTime || null;
          const durationMinutes = cls.expectedDurationMinutes || 60;
          const courseName = courseMap.get(cls.courseId) || cls.courseName || '';
          let batchName = '';
          if (targetBatches.length > 0) {
            batchName = targetBatches.map(bId => batchMap.get(bId) || bId).join(', ');
          } else if (accessLevel === 'free' || accessLevel === 'all') {
            batchName = 'All Students';
          } else {
            batchName = 'All Batches';
          }
          result.push({
            id: resolvedSession.sessionId || cls.id,
            classId: cls.id,
            title: cls.title,
            status: derivedStatus,
            liveStatus: derivedStatus,
            joinAllowed: false,
            scheduledStartTime,
            expectedDurationMinutes: durationMinutes,
            provider: resolvedSession.provider || 'zoom',
            teacherName: cls.teacherName || 'Teacher',
            subjectId: cls.subjectId || '',
            subjectName: cls.subjectName || 'Subject',
            topicId: cls.topicId || '',
            topicName: cls.topicName || '',
            courseId: cls.courseId || '',
            courseName,
            batchName,
            accessDenied: true // Explicit flag for frontend to show "Request Access"
          });
        }
      }
    }

    return result.sort((a, b) => new Date(b.scheduledStartTime || 0).getTime() - new Date(a.scheduledStartTime || 0).getTime());
  }
  
  static async recordHistory(sessionId: string, action: string, userId: string, metadata?: any) {
    const session = await this.getSession(sessionId);
    if (!session) return;
    const history = session.history || [];
    history.push({
      action,
      userId,
      timestamp: new Date().toISOString(),
      metadata
    });
    await db.collection(this.collection).doc(sessionId).update({ history });
  }
  
  static async getActiveSessionForClass(classId: string): Promise<ILiveSession | null> {
    const snapshot = await db.collection(this.collection)
      .where('classId', '==', classId)
      .where('status', 'in', ['SCHEDULED', 'JOINING', 'HOST_CONNECTED', 'LIVE', 'ATTENDANCE_RUNNING'])
      .limit(1)
      .get();
      
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as ILiveSession;
  }

  static async joinLiveClass(classId: string, user: any) {
    const isInstructor = ['super_admin', 'admin', 'teacher', 'staff'].includes(user.role);

    if (isInstructor) {
      const { teachingAssignmentService } = require('../staff/TeachingAssignmentService');
      const canConduct = await teachingAssignmentService.canConductClass(classId, user.userId || user.id, [user.role]);
      if (!canConduct) {
        throw new AppError('You are not authorized to conduct this class.', 403);
      }
    }

    let session = await this.getActiveSessionForClass(classId);

    if (isInstructor) {
      if (!session) {
        // Create session
        const { ClassRepository } = require('../courses/repository');
        const classData = await new ClassRepository().findById(classId);
        if (!classData) throw new AppError('Class not found', 404);

        let provider = 'zoom';
        if (classData.classType === 'youtube_live') provider = 'youtube';

        const created = await this.createSession({
          classId,
          provider,
          teacherId: user.userId || user.id,
        });
        session = await this.getSession(created.id!);
      }

      // If scheduled, start it
      if (session!.status === 'SCHEDULED' || session!.status === 'DRAFT') {
        await this.startSession(session!.id!);
        // startSession marks it as LIVE
        session = await this.getSession(session!.id!);
      }

      // Return join payload
      return this.getJoinPayload(session!.id!, user);
    } else {
      // Student join
      const { AccessPolicyEngine } = require('../../core/sape/AccessPolicyEngine');
      const sape = new AccessPolicyEngine();
      const decision = await sape.evaluateAccess(user.userId || user.id, 'CLASS', classId);

      if (!decision.allowed) {
        throw new AppError(decision.reason || 'Access denied by policy engine', 403);
      }

      if (session) {
        const { AccessRulesService } = require('../access-rules/service');
        const accessRulesService = new AccessRulesService();
        const tenantId = user.tenantId || 'default';
        const sessionDecision = await accessRulesService.evaluateEntityAccess(
          user.userId || user.id, 
          session.id!, 
          'live_session', 
          tenantId
        );

        if (!sessionDecision.allowed) {
          throw new AppError(sessionDecision.lockMessage || 'Live Session Access Denied', 403);
        }
      }

      if (!session) {
        return { status: 'SCHEDULED', waiting: true };
      }
      if (session.status === 'SCHEDULED' || session.status === 'JOINING' || session.status === 'HOST_CONNECTED') {
        return { status: session.status, waiting: true, sessionId: session.id, provider: session.provider };
      }

      return this.getJoinPayload(session.id!, user);
    }
  }

  static async validateParticipants(
    hostUserId: string | undefined,
    adminIds: string[] | undefined,
    teacherIds: string[] | undefined
  ) {
    const allIds = new Set<string>();
    if (hostUserId) allIds.add(hostUserId);

    if (adminIds) {
      for (const id of adminIds) {
        if (!id) continue;
        if (allIds.has(id)) {
          throw new AppError(`User ${id} cannot be added multiple times`, 400);
        }
        allIds.add(id);

        const userDoc = await db.collection('users').doc(id).get();
        if (!userDoc.exists || userDoc.data()?.isDeleted === true) {
          throw new AppError(`Admin/User ${id} does not exist or is deleted`, 400);
        }
        const role = userDoc.data()?.role;
        const validAdminRoles = ['admin', 'super_admin', 'management', 'contributor'];
        if (!validAdminRoles.includes(role)) {
          throw new AppError(`User ${id} does not have an admin-compatible role (role is ${role})`, 400);
        }
      }
    }

    if (teacherIds) {
      for (const id of teacherIds) {
        if (!id) continue;
        if (allIds.has(id)) {
          throw new AppError(`User ${id} cannot be added multiple times`, 400);
        }
        allIds.add(id);

        const userDoc = await db.collection('users').doc(id).get();
        if (!userDoc.exists || userDoc.data()?.isDeleted === true) {
          throw new AppError(`Teacher/User ${id} does not exist or is deleted`, 400);
        }
        const role = userDoc.data()?.role;
        const validTeacherRoles = ['teacher', 'staff', 'admin', 'super_admin', 'management', 'contributor'];
        if (!validTeacherRoles.includes(role) && role !== 'student') {
          // If it's some custom staff role, we allow it. Just prevent students.
        } else if (role === 'student') {
          throw new AppError(`User ${id} is a student and cannot be assigned as a teacher`, 400);
        }
      }
    }
  }

  static canSeeLiveClass(user: { userId: string; role: string }, cls: any, liveSession: any): boolean {
    if (user.role === 'super_admin') return true;

    // 1. Host or Creator check
    const hostUserId = liveSession?.host?.userId || liveSession?.hostId || cls.teacherId || cls.hostId;
    if (hostUserId === user.userId) return true;
    if (cls.createdBy === user.userId) return true;

    // 2. Participant admins check
    const participantAdminIds = liveSession?.participantAdminIds || cls.participantAdminIds || [];
    if (participantAdminIds.includes(user.userId)) return true;

    // 3. Participant teachers check
    const participantTeacherIds = liveSession?.participantTeacherIds || cls.participantTeacherIds || [];
    if (participantTeacherIds.includes(user.userId)) return true;

    // 4. Assigned staff check
    const assignedStaffIds = liveSession?.assignedStaffIds || [];
    if (assignedStaffIds.includes(user.userId)) return true;

    return false;
  }

  static async createSession(data: { 
    classId: string, 
    provider: string, 
    teacherId?: string, 
    customProviderId?: string, 
    providerPasscode?: string, 
    providerAccountId?: string, 
    meetingMode?: string, 
    hostUrl?: string, 
    participantUrl?: string, 
    hostKey?: string, 
    meetingCode?: string,
    host?: any,
    coHosts?: any[],
    participantAdminIds?: string[],
    participantTeacherIds?: string[]
  }): Promise<ILiveSession> {
    const classRepo = new ClassRepository();
    const classData = await classRepo.findById(data.classId);
    if (!classData) throw new AppError('Class not found', 404);

    const hostUserId = data.host?.userId || data.teacherId;
    await this.validateParticipants(hostUserId, data.participantAdminIds, data.participantTeacherIds);

    let providerSessionId = null;
    let launchPayload = null;

    if (data.customProviderId || data.meetingMode === 'use_existing') {
      providerSessionId = data.customProviderId;
      launchPayload = {
        passcode: data.providerPasscode || '',
        hostUrl: data.hostUrl,
        participantUrl: data.participantUrl,
        hostKey: data.hostKey
      };
    }

    const newSession: ILiveSession = {
      classId: data.classId,
      provider: data.provider as any,
      providerSessionId,
      hostId: data.customProviderId ? 'manual' : undefined,
      providerAccountId: data.providerAccountId,
      launchPayload,
      status: 'SCHEDULED',
      scheduledStartTime: classData.scheduledStartTime,
      expectedDurationMinutes: classData.expectedDurationMinutes,
      attendance: { status: 'NOT_STARTED' },
      assignedStaffIds: data.teacherId ? [data.teacherId] : [],
      host: data.host || null,
      coHosts: data.coHosts || [],
      participantAdminIds: data.participantAdminIds || [],
      participantTeacherIds: data.participantTeacherIds || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false
    } as ILiveSession;

    const docRef = await db.collection(this.collection).add(newSession);
    return { id: docRef.id, ...newSession };
  }

  static async startSession(sessionId: string, user?: any) {
    let session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    if (session.status === 'ENDED') throw new AppError('Session already ended', 400);

    const { LiveSessionPolicy } = require('./policy');
    if (user) {
      await LiveSessionPolicy.enforce(sessionId, user, 'START_SESSION', session);
    }

    // 1. Mark as JOINING to indicate host is requesting connection
    await db.collection(this.collection).doc(sessionId).update({
      status: 'JOINING',
      sessionStartedBy: user?.userId || user?.id || 'system',
      updatedAt: new Date().toISOString()
    });

    const providerInstance = ProviderManager.getProvider(session.provider);
    
    try {
      // 1.5 Verify the existing meeting is still valid
      if (session.providerSessionId && providerInstance.verifySession) {
        const { logger } = require('../../core/logger');
        logger.info(`
[Pre-Verify Audit] startSession
Session ID: ${session.id}
Provider: ${session.provider}
Provider Account ID: ${session.providerAccountId}
Provider Session ID: ${session.providerSessionId}
Host ID: ${session.hostId}
Launch Payload Exists: ${!!session.launchPayload}
        `);
        const verifyResult = await providerInstance.verifySession(session);
        if (!verifyResult.valid) {
          
          if (verifyResult.state === 'ENDED' || verifyResult.state === 'NOT_FOUND' || verifyResult.state === 'DELETED') {
             logger.warn(`[LiveSessionService] Provider session ${session.providerSessionId} is invalid (state: ${verifyResult.state}). Recreating it.`);
             // For confirmed invalid meeting states, we clear the data to trigger recreation
             session.providerSessionId = undefined;
             session.launchPayload = undefined;
             session.hostId = undefined;
             session.providerAccountId = undefined;
             
             // Also invalidate any cached join tokens for the stale meeting
             await LiveSessionService.invalidateCachedPayloads(sessionId);
          } else {
             // For AUTH_FAILED, INVALID_HOST, ACCOUNT_MISMATCH, etc. we fail loudly
             if (verifyResult.state === 'INSUFFICIENT_SCOPES') {
               throw new AppError(`Zoom configuration error\n\nThe Zoom Server-to-Server OAuth application does not have permission to verify meetings.\nRequired scopes:\n- meeting:read:meeting\n- meeting:read:meeting:admin\n\nUpdate the Zoom Marketplace Server-to-Server OAuth app, then reinstall/reauthorize it if required and restart the backend.`, 502);
             }
             throw new AppError(`Cannot start session. Provider verification failed with state: ${verifyResult.state}`, 502);
          }
        }
      }

      // 2. If it's an auto-generated meeting (no manual ID) and hasn't been created yet
      if (!session.providerSessionId && !session.launchPayload) {
        const classData = await new ClassRepository().findById(session.classId);
        const providerResult = await providerInstance.createSession({
          title: classData?.title || 'Live Class',
          startTime: new Date().toISOString(),
          durationMinutes: classData?.expectedDurationMinutes || 60,
          teacherId: session.hostId,
          meetingMode: 'create_new',
          providerAccountId: session.providerAccountId
        });
        
        session.providerSessionId = providerResult.providerSessionId;
        session.hostId = providerResult.hostId;
        session.providerAccountId = providerResult.providerAccountId || session.providerAccountId;
        session.launchPayload = providerResult.launchPayload;

        await db.collection(this.collection).doc(sessionId).update({
          providerSessionId: session.providerSessionId,
          hostId: session.hostId,
          launchPayload: session.launchPayload,
          updatedAt: new Date().toISOString()
        });
      }

      // 3. Start Session
      const launchData = await providerInstance.startSession(session);

      // 4. Mark LIVE immediately (Bypassing Zoom Webhook requirement for local dev)
      await db.collection(this.collection).doc(sessionId).update({
        status: 'LIVE',
        actualStartTime: session.actualStartTime || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // 5. Fallback Timeout: If the host never connects (SDK crash, network drop), revert to SCHEDULED after 5 mins
      setTimeout(async () => {
        try {
          const checkSession = await this.getSession(sessionId);
          if (checkSession && checkSession.status === 'JOINING') {
            await db.collection(this.collection).doc(sessionId).update({
              status: 'SCHEDULED',
              updatedAt: new Date().toISOString()
            });
            const { logger } = require('../../core/logger');
            logger.info(`[LiveSession] Session ${sessionId} reverted from JOINING to SCHEDULED due to timeout.`);
          }
        } catch (e) {
          console.error('Failed to run JOINING timeout check', e);
        }
      }, 5 * 60 * 1000); // 5 minutes

      // We emit class:joining instead of live here
      interactionEventBus.emit('class:joining', { classId: session.classId, sessionId: session.id });

      return {
        sessionId: session.id,
        provider: session.provider,
        status: 'LIVE',
        launch: launchData,
        attendance: { started: false }
      };
    } catch (error: any) {
      // Revert to SCHEDULED if something failed during creation
      await db.collection(this.collection).doc(sessionId).update({
        status: 'SCHEDULED',
        updatedAt: new Date().toISOString()
      });
      throw error;
    }
  }

  static async editSession(sessionId: string, updates: Partial<ILiveSession>, adminId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    
    const hostUserId = updates.host?.userId || session.host?.userId || session.hostId;
    await this.validateParticipants(
      hostUserId, 
      updates.participantAdminIds !== undefined ? updates.participantAdminIds : session.participantAdminIds,
      updates.participantTeacherIds !== undefined ? updates.participantTeacherIds : session.participantTeacherIds
    );

    // Removed strict status check to allow admins to edit Zoom room details anytime
    await db.collection(this.collection).doc(sessionId).update({
      ...updates,
      updatedAt: new Date().toISOString()
    });
    await this.recordHistory(sessionId, 'EDITED', adminId, { updates });
    return { success: true };
  }

  static async rescheduleSession(sessionId: string, newStartTime: string, adminId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    if (session.status !== 'SCHEDULED') {
      throw new AppError('Only SCHEDULED sessions can be rescheduled.', 400);
    }
    await db.collection(this.collection).doc(sessionId).update({
      scheduledStartTime: newStartTime,
      updatedAt: new Date().toISOString()
    });
    await this.recordHistory(sessionId, 'RESCHEDULED', adminId, { newStartTime });
    
    // Notify
    try {
      const classRepo = new ClassRepository();
      const cls = await classRepo.findById(session.classId);
      if (cls) {
        await notificationService.dispatchNotification({
          tenantId: 'default',
          title: 'Session Rescheduled',
          body: `Live Session ${cls.title} has been rescheduled to ${new Date(newStartTime).toLocaleString()}`,
          visibility: 'topic',
          metadata: { classId: session.classId, topicId: cls.topicId }
        });
      }
    } catch (e) {}

    return { success: true };
  }

  static async cancelSession(sessionId: string, adminId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    if (session.status === 'ENDED' || session.status === 'CANCELLED') {
      throw new AppError('Session already ended or cancelled.', 400);
    }
    await db.collection(this.collection).doc(sessionId).update({
      status: 'CANCELLED',
      updatedAt: new Date().toISOString()
    });
    await this.recordHistory(sessionId, 'CANCELLED', adminId);
    
    try {
      const classRepo = new ClassRepository();
      const cls = await classRepo.findById(session.classId);
      if (cls) {
        await notificationService.dispatchNotification({
          tenantId: 'default',
          title: 'Session Cancelled',
          body: `Live Session ${cls.title} has been cancelled.`,
          visibility: 'topic',
          metadata: { classId: session.classId, topicId: cls.topicId }
        });
      }
    } catch (e) {}
    
    return { success: true };
  }

  static async deleteSession(sessionId: string, adminId: string) {
    let session = await this.getSession(sessionId);
    let targetClassId = session?.classId || sessionId;

    if (session && session.id) {
      await db.collection(this.collection).doc(session.id).update({
        isDeleted: true,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
      await this.recordHistory(session.id, 'DELETED', adminId).catch(() => {});
    }

    // Also soft delete matching live_sessions by classId if sessionId is a classId
    const matchingSessions = await db.collection(this.collection).where('classId', '==', targetClassId).get();
    for (const d of matchingSessions.docs) {
      await db.collection(this.collection).doc(d.id).update({
        isDeleted: true,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    }

    // Soft delete the class record in 'classes' collection
    if (targetClassId) {
      try {
        const classRepo = new ClassRepository();
        await classRepo.softDelete(targetClassId, adminId);
      } catch (err) {
        await db.collection('classes').doc(targetClassId).update({
          isDeleted: true,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
    }

    return { success: true };
  }

  static async duplicateSession(sessionId: string, adminId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    
    const newSession = {
      ...session,
      status: 'DRAFT',
      providerSessionId: null,
      launchPayload: null,
      actualStartTime: null,
      actualEndTime: null,
      history: [],
      attendance: { status: 'NOT_STARTED' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    delete newSession.id;

    const docRef = await db.collection(this.collection).add(newSession);
    await this.recordHistory(docRef.id, 'DUPLICATED', adminId, { originalSessionId: sessionId });
    return { id: docRef.id, ...newSession };
  }

  static async archiveSession(sessionId: string, adminId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    if (session.status !== 'ENDED' && session.status !== 'CANCELLED') {
      throw new AppError('Only ENDED or CANCELLED sessions can be archived.', 400);
    }
    await db.collection(this.collection).doc(sessionId).update({
      status: 'ARCHIVED',
      updatedAt: new Date().toISOString()
    });
    await this.recordHistory(sessionId, 'ARCHIVED', adminId);
    return { success: true };
  }

  static async extendSession(sessionId: string, minutes: number, reason?: string, adminId?: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    if (session.status === 'ENDED') throw new AppError('Session already ended', 400);

    const currentExt = session.extensionMinutes || 0;
    const newExt = currentExt + minutes;
    
    // Max 12 hours total duration
    const totalDuration = (session.expectedDurationMinutes || 0) + newExt;
    if (totalDuration > 720) {
      throw new AppError('Total session duration cannot exceed 12 hours', 400);
    }

    const logEntry = {
      minutes,
      reason,
      timestamp: new Date().toISOString(),
      adminId: adminId || 'system'
    };
    const extensionLog = [...(session.extensionLog || []), logEntry];

    await db.collection(this.collection).doc(sessionId).update({
      extensionMinutes: newExt,
      extensionLog,
      updatedAt: new Date().toISOString()
    });

    interactionEventBus.emit('class:extended', { classId: session.classId, sessionId: session.id, minutes });
    return { success: true };
  }

  static async markHostConnected(sessionId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    
    // Only transition if it's currently SCHEDULED or JOINING
    if (session.status !== 'SCHEDULED' && session.status !== 'JOINING') {
      return; 
    }

    const now = new Date().toISOString();
    await db.collection(this.collection).doc(sessionId).update({
      status: 'HOST_CONNECTED',
      updatedAt: now
    });
    
    // Immediately transition to LIVE to unlock attendance/features
    await db.collection(this.collection).doc(sessionId).update({
      status: 'LIVE',
      actualStartTime: now,
      updatedAt: now
    });
  }

  // ── Centralized State Machine Validator ──
  static validateTransition(currentStatus: string, action: 'JOIN' | 'START_ATTENDANCE' | 'END_ATTENDANCE' | 'END_SESSION'): void {
    if (currentStatus === 'CANCELLED' || currentStatus === 'ARCHIVED') {
      throw new AppError(`Cannot perform ${action} on a ${currentStatus} session.`, 400);
    }
    
    switch (action) {
      case 'JOIN':
        if (currentStatus === 'ENDED' || currentStatus === 'ENDING') {
          throw new AppError('Cannot join a session that has already ended.', 403);
        }
        if (currentStatus === 'DRAFT') {
          throw new AppError('Cannot join a DRAFT session.', 400);
        }
        break;
      case 'START_ATTENDANCE':
        if (currentStatus !== 'LIVE' && currentStatus !== 'HOST_CONNECTED') {
          throw new AppError(`Attendance can only be started when the session is LIVE or HOST_CONNECTED. Current state: ${currentStatus}`, 400);
        }
        break;
      case 'END_ATTENDANCE':
        if (currentStatus !== 'LIVE' && currentStatus !== 'HOST_CONNECTED') {
          throw new AppError(`Cannot end attendance. Session is not LIVE. Current state: ${currentStatus}`, 400);
        }
        break;
      case 'END_SESSION':
        if (currentStatus === 'ENDED' || currentStatus === 'ENDING') {
          throw new AppError('Session is already ending or ended.', 400);
        }
        break;
    }
  }

  static async endSession(sessionId: string, user?: any) {
    const sessionRef = db.collection(this.collection).doc(sessionId);
    let sessionData: any;
    
    if (user) {
      const { LiveSessionPolicy } = require('./policy');
      await LiveSessionPolicy.enforce(sessionId, user, 'END_SESSION');
    }

    // Idempotent State Transition using Transaction
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(sessionRef);
      if (!doc.exists) throw new AppError('Live session not found', 404);
      
      sessionData = doc.data();
      
      // If already ending/ended, safely return without throwing to make it idempotent
      if (sessionData.status === 'ENDED' || sessionData.status === 'ENDING' || sessionData.status === 'CANCELLED') {
        return; // Idempotency check passed
      }

      transaction.update(sessionRef, {
        status: 'ENDING',
        updatedAt: new Date().toISOString()
      });
    });

    if (!sessionData) return;
    if (sessionData.status === 'ENDED' || sessionData.status === 'ENDING' || sessionData.status === 'CANCELLED') {
      return; // Already processed
    }

    const providerInstance = ProviderManager.getProvider(sessionData.provider);
    
    try {
      await providerInstance.endSession(sessionData);
    } catch (error) {
      console.error(`Failed to end session gracefully on provider side for ${sessionId}`, error);
    } finally {
      let attendanceUpdate = sessionData.attendance || { status: 'NOT_STARTED' };
      if (sessionData.attendance?.status === 'RUNNING') {
        attendanceUpdate = {
          ...sessionData.attendance,
          status: 'FINALIZED',
          endedAt: new Date().toISOString(),
          endedBy: 'system'
        };
      }

      await sessionRef.update({
        status: 'ENDED',
        attendance: attendanceUpdate,
        sessionEndedBy: user?.userId || user?.id || 'system',
        actualEndTime: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Batch update all remaining participants to LEFT
      const { ParticipantService } = require('./participantService');
      await ParticipantService.markAllParticipantsLeft(sessionId);

      interactionEventBus.emit('class:ended', { classId: sessionData.classId, sessionId });
    }
  }

  static async startAttendance(sessionId: string, user: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    
    const { LiveSessionPolicy } = require('./policy');
    await LiveSessionPolicy.enforce(sessionId, user, 'START_ATTENDANCE', session);

    this.validateTransition(session.status, 'START_ATTENDANCE');

    if ((session.attendance?.status as any) === 'RUNNING') return { message: 'Attendance already active.' };

    const attendance: any = {
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      startedBy: user?.userId || user?.id || 'system'
    };

    await db.collection(this.collection).doc(sessionId).update({ 
      attendance, 
      updatedAt: new Date().toISOString() 
    });
    return { success: true, message: 'Attendance started.' };
  }

  static async endAttendance(sessionId: string, user: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    
    const { LiveSessionPolicy } = require('./policy');
    await LiveSessionPolicy.enforce(sessionId, user, 'END_ATTENDANCE', session);

    // We allow ending attendance even if ENDING just in case
    if (session.status !== 'ENDING') {
      this.validateTransition(session.status, 'END_ATTENDANCE');
    }

    if ((session.attendance?.status as any) !== 'RUNNING') {
       throw new AppError(`Cannot end attendance. Attendance is not RUNNING. Current attendance state: ${session.attendance?.status || 'NOT_STARTED'}`, 400);
    }

    if ((session.attendance?.status as any) === 'FINALIZED' || session.attendance?.status === 'LOCKED') return { message: 'Attendance already ended.' };

    const attendance = {
      ...session.attendance,
      status: 'FINALIZED',
      endedAt: new Date().toISOString(),
      endedBy: user?.userId || user?.id || 'system'
    };

    await db.collection(this.collection).doc(sessionId).update({ 
      attendance, 
      status: 'LIVE', // return to normal LIVE state
      updatedAt: new Date().toISOString() 
    });
    return { success: true, message: 'Attendance ended.' };
  }

  static async assignStaff(sessionId: string, targetUserId: string, admin: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    
    const { LiveSessionPolicy } = require('./policy');
    await LiveSessionPolicy.enforce(sessionId, admin, 'ASSIGN_STAFF', session);
    
    const assignedStaffIds = session.assignedStaffIds || [];
    if (assignedStaffIds.includes(targetUserId)) {
      return { success: true, message: 'Staff already assigned.' };
    }
    assignedStaffIds.push(targetUserId);
    
    const history = session.staffAssignmentsHistory || [];
    history.push({
      action: 'ASSIGNED',
      userId: targetUserId,
      adminId: admin.userId || admin.id || 'system',
      timestamp: new Date().toISOString()
    });
    
    await db.collection(this.collection).doc(sessionId).update({
      assignedStaffIds,
      staffAssignmentsHistory: history,
      updatedAt: new Date().toISOString()
    });
    return { success: true, message: 'Staff assigned successfully.' };
  }
  
  static async removeStaff(sessionId: string, targetUserId: string, admin: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    
    const { LiveSessionPolicy } = require('./policy');
    await LiveSessionPolicy.enforce(sessionId, admin, 'ASSIGN_STAFF', session);
    
    let assignedStaffIds = session.assignedStaffIds || [];
    assignedStaffIds = assignedStaffIds.filter(id => id !== targetUserId);
    
    const history = session.staffAssignmentsHistory || [];
    history.push({
      action: 'REMOVED',
      userId: targetUserId,
      adminId: admin.userId || admin.id || 'system',
      timestamp: new Date().toISOString()
    });
    
    await db.collection(this.collection).doc(sessionId).update({
      assignedStaffIds,
      staffAssignmentsHistory: history,
      updatedAt: new Date().toISOString()
    });
    return { success: true, message: 'Staff removed successfully.' };
  }

  static async handleHeartbeat(sessionId: string, teacherId: string) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);
    
    await db.collection(this.collection).doc(sessionId).update({
      lastHeartbeat: new Date().toISOString(),
      heartbeatBy: teacherId
    });
    return { success: true };
  }

  static async getJoinPayload(sessionId: string, user: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);

    const { LiveSessionPolicy } = require('./policy');
    if (user) {
      await LiveSessionPolicy.enforce(sessionId, user, 'JOIN_SESSION', session);
    }

    this.validateTransition(session.status, 'JOIN');

    if (user) {
      try {
        const userId = user.id || user.userId;
        if (userId) {
          const joinedUser = {
            id: userId,
            name: user.name || user.displayName || user.firstName || 'Unknown',
            role: user.role || 'student',
            regNo: user.regNo || user.employeeId || '-',
            joinedAt: new Date().toISOString()
          };
          const db = require('firebase-admin').firestore();
          await db.collection(this.collection).doc(sessionId).update({
            [`joinedParticipantsDetails.${userId}`]: joinedUser
          });
        }
      } catch (err) {
        console.error("Failed to append joined participant to live session:", err);
      }
    }

    // Enforce participant moderation & waiting room for student roles
    if (user && (user.role === 'student' || !user.role)) {
      if (session.status === 'SCHEDULED' || session.status === 'DRAFT') {
         const now = new Date().getTime();
         const startTime = new Date(session.scheduledStartTime || 0).getTime();
         const hasMeetingLinks = !!(session.launchPayload?.start_url || session.launchPayload?.join_url || session.launchPayload?.meetUrl || session.providerSessionId);
         const isTimeStarted = startTime > 0 && (now >= startTime - 10 * 60 * 1000);

         if (isTimeStarted || hasMeetingLinks) {
           session.status = 'JOINING';
           db.collection(this.collection).doc(sessionId).update({ status: 'JOINING', updatedAt: new Date().toISOString() }).catch(() => {});
         } else {
           throw new AppError('Cannot join a scheduled session. Please wait for the class to start.', 400);
         }
      }
      
      const { ParticipantService } = require('./participantService');
      const joinResult = await ParticipantService.requestJoin(
        sessionId,
        user.userId || user.id,
        user.name || user.displayName || 'Unknown Student',
        user.platform || 'web',
        user.device
      );

      if (joinResult.status === 'BLOCKED') {
        throw new AppError('You have been globally blocked from participating in live sessions.', 403);
      }
      if (joinResult.status === 'KICKED') {
        throw new AppError('You were removed from this live session by an instructor.', 403);
      }
      if (joinResult.status === 'REJECTED') {
        throw new AppError('Your request to join this live session was declined by the host.', 403);
      }
      if (joinResult.status === 'WAITING_ROOM') {
        return {
          status: 'WAITING_ROOM',
          waiting: true,
          sessionId,
          provider: session.provider,
        };
      }
    }

    // 1. Identity Display Formatting
    const isInstructor = user && ['super_admin', 'admin', 'teacher', 'staff', 'contributor', 'management', 'developer'].includes(user.role);
    const name = user.name || user.displayName || user.email?.split('@')[0] || '';
    let roleStr = user.role || 'student';
    
    if (roleStr === 'teacher' || roleStr === 'staff') {
      roleStr = 'faculty';
    } else if (roleStr === 'super_admin') {
      roleStr = 'superadmin';
    } else if (roleStr === 'admin') {
      roleStr = 'admin';
    } else if (roleStr === 'contributor') {
      roleStr = 'contributor';
    } else if (roleStr === 'developer') {
      roleStr = 'developer';
    } else {
      roleStr = 'student';
    }

    let rollNumber = user.rollNumber || '';
    if (!rollNumber && (!user.role || user.role === 'student')) {
      try {
        const profileSnap = await db.collection('student_profiles').doc(user.userId || user.id).get();
        rollNumber = profileSnap.data()?.rollNumber || '';
      } catch(e) {}
    }

    // Format: name - rollNumber - role (leaving blanks if missing)
    let finalDisplayName = `${name} - ${rollNumber} - ${roleStr}`;
    
    // Pass the formatted name to the provider payload generator
    const userWithIdentity = { ...user, displayName: finalDisplayName };

    const providerInstance = ProviderManager.getProvider(session.provider);

    // ---- STRICT MEETING REUSE ENFORCEMENT ----
    if (isInstructor && session.providerSessionId) {
      if (providerInstance.verifySession) {
        const { logger } = require('../../core/logger');
        logger.info(`
[Pre-Verify Audit] generateJoinPayload
Session ID: ${session.id}
Provider: ${session.provider}
Provider Account ID: ${session.providerAccountId}
Provider Session ID: ${session.providerSessionId}
Host ID: ${session.hostId}
Launch Payload Exists: ${!!session.launchPayload}
        `);
        const verifyResult = await providerInstance.verifySession(session);
        
        logger.info(`
[Meeting Reuse Audit] verifySession()
Session ID: ${session.id}
Meeting ID: ${session.providerSessionId}
Result:     ${verifyResult.valid}
Reason:     ${verifyResult.state}
        `);

        if (!verifyResult.valid && (verifyResult.state === 'ENDED' || verifyResult.state === 'NOT_FOUND' || verifyResult.state === 'DELETED')) {
          logger.warn(`Existing meeting invalid. Creating replacement meeting...`);
          const newMeetingConfig = {
            title: (session as any).title || 'Live Session',
            startTime: session.scheduledStartTime || new Date().toISOString(),
            durationMinutes: session.expectedDurationMinutes || 60,
            providerAccountId: session.providerAccountId || 'auto',
            meetingMode: (session as any).meetingMode || 'MEETING'
          };
          const newProviderData = await providerInstance.createSession(newMeetingConfig);
          
          logger.warn(`Old Meeting ID: ${session.providerSessionId} -> New Meeting ID: ${newProviderData.providerSessionId}`);

          await db.collection(this.collection).doc(sessionId).update({
            providerSessionId: newProviderData.providerSessionId,
            launchPayload: newProviderData.launchPayload || null,
            hostId: newProviderData.hostId || session.hostId, // Preserve old hostId if new doesn't specify
            providerAccountId: newProviderData.providerAccountId || session.providerAccountId || null,
            updatedAt: new Date().toISOString()
          });

          // Invalidate cache since meeting changed
          await LiveSessionService.invalidateCachedPayloads(sessionId);

          // Update local session reference for payload generation
          session.providerSessionId = newProviderData.providerSessionId;
          session.hostId = newProviderData.hostId || session.hostId;
          session.providerAccountId = newProviderData.providerAccountId || session.providerAccountId;
          session.launchPayload = newProviderData.launchPayload || null;

          logger.info(`[Meeting Reuse Audit] New meeting persisted to Firestore successfully.`);
          
          Object.assign(session, newProviderData);
        } else if (!verifyResult.valid) {
          if (verifyResult.state === 'INSUFFICIENT_SCOPES') {
            throw new AppError(`Zoom configuration error\n\nThe Zoom Server-to-Server OAuth application does not have permission to verify meetings.\nRequired scopes:\n- meeting:read:meeting\n- meeting:read:meeting:admin\n\nUpdate the Zoom Marketplace Server-to-Server OAuth app, then reinstall/reauthorize it if required and restart the backend.`, 502);
          }
          throw new AppError(`Cannot generate join payload. Provider verification failed with state: ${verifyResult.state}`, 502);
        }
      }
    }
    // ------------------------------------------

    const payload = await providerInstance.generateJoinPayload(session, userWithIdentity);
    
    // 2. Map Provider UI Capabilities
    const usesNativeMeetingUI = session.provider === 'zoom' || session.provider === 'google_meet';
    
    const capabilities: any = {
      startSession: false,
      startAttendance: false,
      endAttendance: false,
      endSession: false,
      kickParticipant: false,
      assignStaff: false,
      viewParticipants: false,
      
      // UI Responsibilities
      usesNativeMeetingUI,
      nativeChat: usesNativeMeetingUI,
      nativeParticipants: usesNativeMeetingUI,
      nativeQA: usesNativeMeetingUI,
      nativeToolbar: usesNativeMeetingUI,
      nativeAudioVideo: usesNativeMeetingUI,
      nativeScreenShare: usesNativeMeetingUI,
      nativeReactions: usesNativeMeetingUI
    };


    if (isInstructor) {
      capabilities.startSession = await LiveSessionPolicy.can(sessionId, user, 'START_SESSION', session);
      capabilities.startAttendance = await LiveSessionPolicy.can(sessionId, user, 'START_ATTENDANCE', session);
      capabilities.endAttendance = await LiveSessionPolicy.can(sessionId, user, 'END_ATTENDANCE', session);
      capabilities.endSession = await LiveSessionPolicy.can(sessionId, user, 'END_SESSION', session);
      capabilities.kickParticipant = await LiveSessionPolicy.can(sessionId, user, 'KICK_PARTICIPANT', session);
      capabilities.assignStaff = await LiveSessionPolicy.can(sessionId, user, 'ASSIGN_STAFF', session);
      capabilities.viewParticipants = true; 
    }

    return {
      ...payload,
      sessionId,
      participantRole: payload.participantRole ? payload.participantRole : (isInstructor ? 'HOST' : 'PARTICIPANT'),
      status: session.status,
      capabilities,
      session: {
        status: session.status,
        attendanceStatus: session.attendance?.status || 'NOT_STARTED',
        attendanceStartedAt: session.attendance?.startedAt || null,
        attendanceEndedAt: session.attendance?.endedAt || null
      }
    };
  }

  static async getSessionState(sessionId: string, user: any) {
    const session = await this.getSession(sessionId);
    if (!session) throw new AppError('Live session not found', 404);

    const { LiveSessionPolicy } = require('./policy');
    const isInstructor = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher' || user.role === 'staff' || user.role === 'developer');
    
    const capabilities = {
      startSession: false,
      startAttendance: false,
      endAttendance: false,
      endSession: false,
      kickParticipant: false,
      assignStaff: false,
      viewParticipants: false
    };

    if (isInstructor) {
      capabilities.startSession = await LiveSessionPolicy.can(sessionId, user, 'START_SESSION', session);
      capabilities.startAttendance = await LiveSessionPolicy.can(sessionId, user, 'START_ATTENDANCE', session);
      capabilities.endAttendance = await LiveSessionPolicy.can(sessionId, user, 'END_ATTENDANCE', session);
      capabilities.endSession = await LiveSessionPolicy.can(sessionId, user, 'END_SESSION', session);
      capabilities.kickParticipant = await LiveSessionPolicy.can(sessionId, user, 'KICK_PARTICIPANT', session);
      capabilities.assignStaff = await LiveSessionPolicy.can(sessionId, user, 'ASSIGN_STAFF', session);
      capabilities.viewParticipants = true; 
    }
    
    const version = session.updatedAt ? new Date(session.updatedAt).getTime() : Date.now();

    return {
      version,
      session: {
        status: session.status,
        hostConnected: session.status === 'HOST_CONNECTED' || session.status === 'LIVE',
        startedAt: session.actualStartTime || null,
        updatedAt: session.updatedAt || null,
        attendance: {
           status: session.attendance?.status || 'NOT_STARTED',
           startedAt: session.attendance?.startedAt || null,
           endedAt: session.attendance?.endedAt || null
        }
      },
      capabilities
    };
  }

  static async generateJoinToken(sessionId: string, user: any) {
    const { randomBytes } = require('crypto');
    const token = randomBytes(32).toString('hex');
    
    // Generate the payload
    const payload = await this.getJoinPayload(sessionId, user);
    
    // Store in redis with a 5 minute TTL
    await redisClient.set(`live_join_token:${token}`, JSON.stringify(payload), 'EX', 300);
    
    // Track token by session to allow mass invalidation when meeting regenerates
    await redisClient.sadd(`live_session_tokens:${sessionId}`, token);
    await redisClient.expire(`live_session_tokens:${sessionId}`, 600);
    
    return token;
  }

  static async validateJoinToken(token: string) {
    const data = await redisClient.get(`live_join_token:${token}`);
    if (!data) throw new AppError('Invalid or expired join token', 400);
    // Delete token immediately to ensure one-time use
    await redisClient.del(`live_join_token:${token}`);
    return JSON.parse(data);
  }

  static async invalidateCachedPayloads(sessionId: string) {
    try {
      const tokens = await redisClient.smembers(`live_session_tokens:${sessionId}`);
      if (tokens && tokens.length > 0) {
        const keys = tokens.map((t: string) => `live_join_token:${t}`);
        await redisClient.del(...keys);
        await redisClient.del(`live_session_tokens:${sessionId}`);
        const { logger } = require('../../core/logger');
        logger.info(`[LiveSessionService] Invalidated ${tokens.length} cached join payloads for session ${sessionId}`);
      }
    } catch (e) {
      console.error('Failed to invalidate cached payloads', e);
    }
  }

  /**
   * End a live session and optionally convert it to a YouTube Recorded Class.
   * This is strictly additive — it calls the existing endSession internally and
   * then (optionally) updates the class record. The Zoom module is NOT affected.
   */
  static async endSessionWithConversion(
    sessionId: string,
    user: any,
    convertToYoutube: boolean = false,
    youtubeUrl?: string
  ) {
    // 1. End the session using the existing method
    await this.endSession(sessionId, user);

    if (!convertToYoutube || !youtubeUrl) {
      return { success: true, converted: false };
    }

    // 2. Fetch the session to get classId
    const session = await this.getSession(sessionId);
    if (!session?.classId) {
      return { success: true, converted: false, warning: 'classId not found; could not convert.' };
    }

    // 3. Extract and encrypt the YouTube video ID (same as createClass)
    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) {
      return { success: true, converted: false, warning: 'Invalid YouTube URL; could not extract video ID.' };
    }
    const encryptedVideoId = encrypt(videoId);

    // 4. Update the class record to become a YouTube recorded class
    try {
      await db.collection('classes').doc(session.classId).update({
        classType: 'youtube_recorded',
        encryptedVideoId,              // ← what CoursePlayer uses to play
        encryptedRecordingId: encryptedVideoId,
        convertedFromLive: true,
        convertedAt: new Date().toISOString(),
        convertedBy: user?.userId || user?.id || 'system',
        updatedAt: new Date().toISOString(),
      });

      // Also mark the live session as converted
      await db.collection(this.collection).doc(sessionId).update({
        convertedToRecorded: true,
        recordingUrl: youtubeUrl,
        updatedAt: new Date().toISOString(),
      });

      return { success: true, converted: true, classId: session.classId };
    } catch (err: any) {
      console.error('[LiveSessionService] Failed to convert to recorded class:', err);
      return { success: true, converted: false, warning: err.message };
    }
  }

  /**
   * Fetch ended/history sessions with class info for the admin history view.
   * Returns sessions with status ENDED, CANCELLED, EXPIRED, ARCHIVED.
   */
  static async getEndedSessionHistory(): Promise<any[]> {
    const snap = await db.collection(this.collection)
      .where('isDeleted', '!=', true)
      .get();

    const endedStatuses = ['ENDED', 'CANCELLED', 'EXPIRED', 'ARCHIVED'];
    const docs = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as any))
      .filter(d => d.isDeleted !== true && endedStatuses.includes(d.status));

    // Enrich with class info
    const enriched = await Promise.all(docs.map(async (session: any) => {
      let classTitle = session.classTitle || '';
      let provider = session.provider || 'zoom';
      let convertedToRecorded = session.convertedToRecorded || false;
      let recordingUrl = session.recordingUrl || '';

      if (session.classId && !classTitle) {
        try {
          const classDoc = await db.collection('classes').doc(session.classId).get();
          if (classDoc.exists) {
            const cls = classDoc.data() as any;
            classTitle = cls.title || cls.name || '';
          }
        } catch (_) {}
      }

      return {
        id: session.id,
        classId: session.classId,
        classTitle,
        provider,
        status: session.status,
        scheduledStartTime: session.scheduledStartTime,
        actualStartTime: session.actualStartTime,
        actualEndTime: session.actualEndTime,
        sessionEndedBy: session.sessionEndedBy,
        convertedToRecorded,
        recordingUrl,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      };
    }));

    return enriched.sort((a, b) =>
      new Date(b.actualEndTime || b.updatedAt || 0).getTime() -
      new Date(a.actualEndTime || a.updatedAt || 0).getTime()
    );
  }
}

