import { db } from '../../infrastructure/firebase';
import { ILiveSession } from './types';
import { redisClient } from '../../infrastructure/redis';
import { ProviderManager } from './providers/ProviderManager';
import { AppError } from '../../core/errors/AppError';
import { ClassRepository } from '../courses/repository';
import { interactionEventBus } from '../interaction-engine/eventBus';
import { NotificationService } from '../notifications/service';

const notificationService = new NotificationService();

export class LiveSessionService {
  private static collection = 'live_sessions';

  static async getSession(sessionId: string): Promise<ILiveSession | null> {
    const doc = await db.collection(this.collection).doc(sessionId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() } as ILiveSession;
  }
  
  static async listSessions(filters?: { teacherId?: string }): Promise<ILiveSession[]> {
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
    const classesSnap = await db.collection('classes')
       .where('classType', '==', 'live')
       .get();

    const enriched = [];
    for (const doc of classesSnap.docs) {
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

       // AUTO DELETE / AUTO END IF DURATION HAS PASSED
       if (startTimeMs > 0 && now > endTimeMs) {
         db.collection('classes').doc(cls.id).update({ isDeleted: true, updatedAt: new Date().toISOString() }).catch(() => {});
         if (liveSession?.id) {
           db.collection(this.collection).doc(liveSession.id).update({ isDeleted: true, status: 'ENDED', updatedAt: new Date().toISOString() }).catch(() => {});
         }
         continue; // Exclude expired/passed session from listing
       }

       const courseName = courseMap.get(cls.courseId) || cls.courseName || '';
       const targetBatchIds: string[] = cls.targetBatchIds || cls.targetBatches || [];
       const accessLevel = cls.accessLevel || 'premium';
       let batchName = '';
       if (targetBatchIds.length > 0) {
         batchName = targetBatchIds.map(bId => batchMap.get(bId) || bId).join(', ');
       } else if (accessLevel === 'premium' || accessLevel === 'all_paid') {
         batchName = 'All Paid Students';
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

    return (enriched as any[]).sort((a, b) => new Date(b.scheduledStartTime || 0).getTime() - new Date(a.scheduledStartTime || 0).getTime());
  }
  
  static async getStudentLiveSessions(studentId: string, tenantId: string): Promise<any[]> {
    const now = Date.now();

    // Cache courses and batches
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

    // 1. Fetch student memberships from 'students' and 'student_profiles' collections
    const rawBatchIds: string[] = [];
    let userCourseIds: string[] = [];
    
    const studentDoc = await db.collection('students').doc(studentId).get();
    let studentData: any = studentDoc.exists ? studentDoc.data() : null;
    
    if (!studentData) {
      const byUserId = await db.collection('students').where('userId', '==', studentId).limit(1).get();
      if (!byUserId.empty) {
        studentData = byUserId.docs[0].data();
      }
    }
    
    if (studentData) {
      if (studentData.batchId) rawBatchIds.push(studentData.batchId);
      if (studentData.batch) rawBatchIds.push(studentData.batch);
      if (studentData.courseId) userCourseIds.push(studentData.courseId);
      if (studentData.enrolledCourseIds && Array.isArray(studentData.enrolledCourseIds)) {
        userCourseIds.push(...studentData.enrolledCourseIds);
      }
    }

    let profileDoc = await db.collection('student_profiles').doc(studentId).get();
    if (!profileDoc.exists) {
      const pByUserId = await db.collection('student_profiles').where('userId', '==', studentId).limit(1).get();
      if (!pByUserId.empty) profileDoc = pByUserId.docs[0] as any;
    }
    if (profileDoc.exists) {
      const pData = profileDoc.data();
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

    // 2. Fetch all live classes
    const classesSnap = await db.collection('classes')
       .where('classType', '==', 'live')
       .where('isDeleted', '==', false)
       .get();

    const result = [];
    for (const doc of classesSnap.docs) {
      const cls = { id: doc.id, ...doc.data() } as any;
      const targetBatches: string[] = cls.targetBatchIds || cls.targetBatches || [];
      const accessLevel = cls.accessLevel || 'premium';

      // Check access: free, all, premium, all_paid, batch, course matching
      let hasAccess = false;
      if (
        accessLevel === 'free' || 
        accessLevel === 'all' || 
        accessLevel === 'premium' || 
        accessLevel === 'all_paid' ||
        targetBatches.includes('all') || 
        targetBatches.includes('all_paid') || 
        targetBatches.includes('all_free')
      ) {
        hasAccess = true;
      } else if (targetBatches.length > 0) {
        hasAccess = targetBatches.some(bId => userBatchIds.includes(bId));
      } else if (cls.courseId) {
        hasAccess = uniqueUserCourseIds.length === 0 || uniqueUserCourseIds.includes(cls.courseId);
      } else {
        hasAccess = true;
      }

      if (hasAccess) {
        // Find active live session for this class
        const liveSessionSnap = await db.collection(this.collection)
          .where('classId', '==', cls.id)
          .get();

        const validDocs = liveSessionSnap.docs
          .map(d => ({ id: d.id, ...d.data() } as any))
          .filter(d => d.isDeleted !== true)
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

        const liveSession = validDocs.length > 0 ? validDocs[0] : null;

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

        // AUTO DELETE / AUTO END IF DURATION HAS PASSED
        if (startTimeMs > 0 && now > endTimeMs) {
          db.collection('classes').doc(cls.id).update({ isDeleted: true, updatedAt: new Date().toISOString() }).catch(() => {});
          if (liveSession?.id) {
            db.collection(this.collection).doc(liveSession.id).update({ isDeleted: true, status: 'ENDED', updatedAt: new Date().toISOString() }).catch(() => {});
          }
          continue; // Exclude expired/passed session
        }

        const courseName = courseMap.get(cls.courseId) || cls.courseName || '';
        let batchName = '';
        if (targetBatches.length > 0) {
          batchName = targetBatches.map(bId => batchMap.get(bId) || bId).join(', ');
        } else if (accessLevel === 'premium' || accessLevel === 'all_paid') {
          batchName = 'All Paid Students';
        } else if (accessLevel === 'free' || accessLevel === 'all') {
          batchName = 'All Students';
        } else {
          batchName = 'All Batches';
        }

        result.push({
          id: liveSession?.id || cls.id,
          classId: cls.id,
          title: cls.title,
          status: liveSession?.status || 'SCHEDULED',
          scheduledStartTime,
          expectedDurationMinutes: durationMinutes,
          provider: liveSession?.provider || 'zoom',
          teacherName: cls.teacherName || 'Teacher',
          subjectName: cls.subjectName || 'Subject',
          courseId: cls.courseId || '',
          courseName,
          batchName
        });
      }
    }

    // Sort by scheduledStartTime desc
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
        // You could also return this as a graceful payload, but throwing AppError is standard here
        throw new AppError(decision.reason || 'Access denied by policy engine', 403);
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

  static async createSession(data: { classId: string, provider: string, teacherId?: string, customProviderId?: string, providerPasscode?: string, providerAccountId?: string, meetingMode?: string, hostUrl?: string, participantUrl?: string, hostKey?: string, meetingCode?: string }): Promise<ILiveSession> {
    const classRepo = new ClassRepository();
    const classData = await classRepo.findById(data.classId);
    if (!classData) throw new AppError('Class not found', 404);

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

      // 4. Mark JOINING (Will move to HOST_CONNECTED and LIVE when Zoom webhook fires)
      await db.collection(this.collection).doc(sessionId).update({
        status: 'JOINING',
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
        status: 'JOINING',
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
    const isInstructor = user && ['super_admin', 'admin', 'teacher', 'staff'].includes(user.role);
    let finalDisplayName = user.name || user.displayName || user.email?.split('@')[0] || 'User';

    if (isInstructor) {
      if (user.role === 'admin' || user.role === 'super_admin') {
        finalDisplayName = `Administrator - ${user.name || user.displayName || 'Staff'}`;
      } else {
        finalDisplayName = `Prof. ${user.name || user.displayName || 'Instructor'}`;
      }
    } else if (user.role === 'student' || !user.role) {
      let rollNumber = user.rollNumber;
      if (!rollNumber) {
        try {
          const profileSnap = await db.collection('student_profiles').doc(user.userId || user.id).get();
          rollNumber = profileSnap.data()?.rollNumber;
        } catch(e) {}
      }
      if (rollNumber) {
        finalDisplayName = `${rollNumber} - ${user.name || user.displayName || user.email?.split('@')[0]}`;
      }
    }
    
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
            providerAccountId: newProviderData.providerAccountId || null,
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
    
    const isInstructor = user && (user.role === 'admin' || user.role === 'super_admin' || user.role === 'teacher' || user.role === 'staff');
    
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
}
