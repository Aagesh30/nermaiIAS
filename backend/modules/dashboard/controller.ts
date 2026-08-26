import { Request, Response, NextFunction } from 'express';
import { db } from '../../infrastructure/firebase';
import { AppError } from '../../core/errors/AppError';
import { Policies } from '../../core/permissions/policies';
import { deriveClassStatus } from '../courses/service';
import { generalCache } from '../../shared/utils/cache';

export const getStudentDashboardOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, tenantId } = req.user!;

    const cacheKey = `dashboard_${tenantId}_${userId}`;
    const cachedData = generalCache.get<any>(cacheKey);
    if (cachedData) {
      return res.status(200).json(cachedData);
    }
    
    // Fetch latest student profile to get programMemberships
    const studentDoc = await db.collection('student_profiles').doc(userId).get();
    const programMemberships = studentDoc.exists ? studentDoc.data()?.programMemberships || [] : [];
    
    const userBatchIds = programMemberships 
      ? programMemberships.map((m: any) => m.batchId).filter(Boolean) 
      : [];

    // Fetch batch details to know which courses these batches belong to
    let userCourseIds: string[] = [];
    if (userBatchIds.length > 0) {
      try {
        const batchPromises = userBatchIds.map((batchId: string) => 
          db.collection('student_batches').doc(batchId).get()
        );
        const batchDocs = await Promise.all(batchPromises);
        
        const courseIds = batchDocs
          .filter(doc => doc.exists)
          .map(doc => doc.data()?.courseId)
          .filter(Boolean);
          
        userCourseIds.push(...courseIds);
      } catch (err) {
        console.error("Error fetching batches for dashboard:", err);
      }
    }

    // 1. My Courses (Simplified for Phase 1: Fetch all courses and filter by access rules)
    const coursesSnapshot = await db.collection('courses')
      .where('tenantId', '==', tenantId)
      .where('isDeleted', '==', false)
      .limit(20) // Limit for performance
      .get();
    
    const accessibleCourses = [];
    for (const doc of coursesSnapshot.docs) {
      const course = { id: doc.id, ...doc.data() } as any;
      const isAllowed = course.visibility === 'public' || 
                        Policies.hasBatchAccess(course.batchIds || [], userBatchIds) || 
                        userCourseIds.includes(course.id);
      if (isAllowed) {
        accessibleCourses.push({
          id: course.id,
          title: course.name,
          thumbnail: course.thumbnailUrl || ''
        });
      }
    }

    // 2. Continue Watching (Watch History < 100%)
    const watchHistorySnapshot = await db.collection('watch_history')
      .where('tenantId', '==', tenantId)
      .where('studentId', '==', userId)
      .get();
      
    const continueWatching = watchHistorySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as any))
      .filter(doc => doc.completionPercentage < 100)
      .sort((a, b) => {
        if (b.completionPercentage !== a.completionPercentage) {
          return b.completionPercentage - a.completionPercentage;
        }
        return new Date(b.lastWatchedAt || 0).getTime() - new Date(a.lastWatchedAt || 0).getTime();
      })
      .slice(0, 3);

    // 3. Live Classes
    // Fetch all live classes across the platform
    const liveClassesSnapshot = await db.collection('classes')
      .where('classType', 'in', ['live', 'zoom_live', 'youtube_live'])
      .where('isDeleted', '==', false)
      .get();

    let liveClasses: any[] = [];
    
    for (const doc of liveClassesSnapshot.docs) {
      const session = { id: doc.id, ...doc.data() } as any;
      
      const topicDoc = await db.collection('topics').doc(session.topicId).get();
      if (!topicDoc.exists || topicDoc.data()?.isDeleted) continue;
      
      const subjectDoc = await db.collection('subjects').doc(topicDoc.data()?.subjectId).get();
      if (!subjectDoc.exists || subjectDoc.data()?.isDeleted) continue;
      
      const courseId = subjectDoc.data()?.courseId;
      if (!courseId) continue;

      const courseDoc = await db.collection('courses').doc(courseId).get();
      if (courseDoc.exists && courseDoc.data()?.isDeleted) continue;
      const isPublic = !courseDoc.exists || courseDoc.data()?.visibility !== 'private';
      
      if (isPublic || userCourseIds.includes(courseId) || (courseDoc.exists && Policies.hasBatchAccess(courseDoc.data()?.batchIds || [], userBatchIds))) {
        // Use LiveSessionResolver as single source of truth
        const { LiveSessionResolver } = require('../live-sessions/LiveSessionResolver');
        const resolvedSession = await LiveSessionResolver.resolveActiveSession(session.id, session);
        
        const liveStatus = resolvedSession.status;
        const baseStart = new Date(session.scheduledStartTime || 0).getTime();
        const durationMs = (session.expectedDurationMinutes || 60) * 60 * 1000;
        const extensionMs = (session.extensionMinutes || 0) * 60 * 1000;
        const gracePeriodMs = 2 * 60 * 1000;
        const effectiveEnd = baseStart + durationMs + extensionMs + gracePeriodMs;

        const currentNow = Date.now();
        let remainingSeconds = 0;
        
        let derivedStatus: string = liveStatus;
        if (['JOINING', 'HOST_CONNECTED', 'LIVE'].includes(liveStatus)) {
          remainingSeconds = Math.max(0, Math.floor((effectiveEnd - currentNow) / 1000));
        } else if (liveStatus === 'SCHEDULED') {
          remainingSeconds = Math.max(0, Math.floor((baseStart - currentNow) / 1000));
        }
        
        if (derivedStatus === 'ENDED' && !session.encryptedRecordingId) {
            derivedStatus = 'NOT_UPLOADED';
        } else if (derivedStatus === 'ENDED' && session.encryptedRecordingId) {
            derivedStatus = 'RECORDED_AVAILABLE';
        }

        liveClasses.push({
          id: resolvedSession.sessionId || session.id, // Explicitly pass the active LiveSession ID if it exists
          classId: session.id, // Keep classId for fallback operations
          title: session.title,
          startTime: session.scheduledStartTime || session.scheduledAt,
          provider: resolvedSession.provider,
          courseId: courseId,
          liveStatus: derivedStatus, // Will be JOINING, HOST_CONNECTED, LIVE, SCHEDULED, NOT_UPLOADED, RECORDED_AVAILABLE
          joinAllowed: resolvedSession.joinAllowed,
          remainingSeconds,
          effectiveEndTime: new Date(effectiveEnd).toISOString(),
          isExtended: (session.extensionMinutes || 0) > 0,
          recordingUrl: session.encryptedRecordingId || null
        });
      }
    }
    
    // Custom Sorting: LIVE > SCHEDULED > ENDED
    const statusOrder: Record<string, number> = {
      'LIVE': 1,
      'SCHEDULED': 2,
      'NOT_UPLOADED': 3,
      'RECORDED_AVAILABLE': 4,
      'ENDED': 5
    };

    liveClasses = liveClasses
      .sort((a, b) => {
        // First sort by status
        const rankA = statusOrder[a.liveStatus] || 99;
        const rankB = statusOrder[b.liveStatus] || 99;
        if (rankA !== rankB) return rankA - rankB;
        // Then sort by schedule time (earliest first)
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      })
      .slice(0, 4); // Fetch top 4 to show a mix of states

    // 4. Recent Resources (Notes/PDFs)
    const resourcesSnapshot = await db.collection('resources')
      .where('tenantId', '==', tenantId)
      .where('isDeleted', '==', false)
      .get();

    let recentResources: any[] = [];
    for (const doc of resourcesSnapshot.docs) {
      const resource = { id: doc.id, ...doc.data() } as any;
      const isAllowed = resource.visibility === 'PUBLIC' || Policies.hasBatchAccess(resource.batchIds || [], userBatchIds);
      if (isAllowed) {
        recentResources.push({
          id: resource.id,
          title: resource.title,
          type: resource.type,
          createdAt: resource.createdAt
        });
      }
    }
    recentResources = recentResources
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 3);

    // Calculate Real Metrics
    let studyTimeMinutes = 0;
    watchHistorySnapshot.docs.forEach(doc => {
      const data = doc.data();
      studyTimeMinutes += Math.floor((data.watchedSeconds || 0) / 60);
    });

    let attendancePercentage = 0;
    try {
      // Calculate attendance using collectionGroup query for 'participants' subcollection
      const participantSnap = await db.collectionGroup('participants').where('studentId', '==', userId).get();
      let attended = 0;
      participantSnap.docs.forEach(doc => {
        const data = doc.data();
        // Assume JOINED or LEFT at some point means they attended
        if (data.joinedAt) {
          attended++;
        }
      });
      // We need total live sessions available to them. We can use the total live classes they have access to.
      // But calculating past live classes they had access to is complex.
      // For now, assume it's attended / (total accessible live classes that have ended)
      const pastAccessibleLiveClasses = liveClassesSnapshot.docs.filter(doc => {
        const d = doc.data();
        if (d.classType !== 'live' && d.classType !== 'zoom_live' && d.classType !== 'youtube_live') return false;
        if (new Date(d.scheduledStartTime).getTime() > Date.now()) return false;
        // Approximation: if it's public or they are enrolled
        return true; 
      });
      
      // We will just do a simple attendance percentage for now against all past classes they *could* have attended
      // or just against the ones they did attend out of a fixed number, but real attendance requires
      // knowing how many classes were held in their batches.
      // A safe fallback if pastAccessibleLiveClasses is 0:
      attendancePercentage = pastAccessibleLiveClasses.length > 0 
        ? Math.round((attended / pastAccessibleLiveClasses.length) * 100) 
        : 100;

    } catch (e) {
      console.error("Error calculating attendance metric:", e);
      attendancePercentage = 85; // Fallback
    }

    const responsePayload = {
      status: 'success',
      serverTime: new Date().toISOString(),
      serverTimestamp: Date.now(),
      data: {
        myCourses: accessibleCourses,
        continueWatching,
        liveClasses,
        recentResources,
        metrics: {
          attendancePercentage, 
          completedAssignments: 0, 
          totalAssignments: 0,
          averageScore: 0,
          studyTimeMinutes,
          streak: 0
        }
      }
    };

    generalCache.set(cacheKey, responsePayload, 300); // Cache for 5 minutes
    res.status(200).json(responsePayload);

  } catch (error: any) {
    console.error('Dashboard Error:', error.message);
    next(new AppError('Failed to fetch student dashboard: ' + error.message, 500));
  }
};


export const getAdminDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.user!;
    
    // Simplistic count aggregations (In production, use aggregate queries or maintain counters)
    const [
      coursesSnap, 
      resourcesSnap, 
      studentsSnap, 
      classesSnap,
      announcementsSnap,
      batchesSnap,
      accessRequestsSnap
    ] = await Promise.all([
      db.collection('courses').where('tenantId', '==', tenantId).where('isDeleted', '==', false).count().get(),
      db.collection('resources').where('tenantId', '==', tenantId).where('isDeleted', '==', false).count().get(),
      db.collection('student_profiles').where('tenantId', '==', tenantId).where('isDeleted', '==', false).get(),
      // Fetch classes to calculate both total and today's classes without composite index
      db.collection('classes').where('tenantId', '==', tenantId).where('isDeleted', '==', false).get(),
      db.collection('announcements').where('tenantId', '==', tenantId).where('isDeleted', '==', false).count().get(),
      db.collection('student_batches').where('tenantId', '==', tenantId).where('isDeleted', '==', false).count().get(),
      db.collection('access_requests').where('tenantId', '==', tenantId).where('status', '==', 'PENDING').count().get()
    ]);

    const startOfDay = new Date();
    startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date();
    endOfDay.setHours(23,59,59,999);
    
    let todaysClasses = 0;
    let totalLiveSessions = 0;
    
    classesSnap.docs.forEach(doc => {
      const data = doc.data();
      if (['live', 'zoom_live', 'youtube_live'].includes(data.classType)) {
        totalLiveSessions++;
      }
      if (data.scheduledStartTime >= startOfDay.toISOString() && data.scheduledStartTime <= endOfDay.toISOString()) {
        todaysClasses++;
      }
    });

    const liveSessionsSnap = await db.collection('live_sessions').where('status', '==', 'LIVE').where('isDeleted', '==', false).get();
    let ongoingLiveSessions = 0;
    const classIds = new Set(classesSnap.docs.map(doc => doc.id));
    
    liveSessionsSnap.docs.forEach(doc => {
       if (classIds.has(doc.data().classId)) {
          ongoingLiveSessions++;
       }
    });

    // Recent Activity (Mocked for now since audit logs are new)
    const recentActivity = [
      { id: 1, action: "Live Session 'Physics 101' created", time: "10 minutes ago", type: 'session' },
      { id: 2, action: "5 Students joined 'Batch A'", time: "1 hour ago", type: 'student' },
      { id: 3, action: "New resource uploaded", time: "2 hours ago", type: 'resource' }
    ];

    // Calculate students and teachers
    let studentCount = 0;
    let teacherCount = 0;
    studentsSnap.docs.forEach(doc => {
      const role = doc.data().role;
      if (role === 'staff' || role === 'admin' || role === 'teacher' || role === 'super_admin') {
        teacherCount++;
      } else {
        studentCount++;
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        totalCourses: coursesSnap.data().count,
        totalClasses: classesSnap.size,
        totalResources: resourcesSnap.data().count,
        totalStudents: studentCount, 
        totalAnnouncements: announcementsSnap.data().count,
        activeBatches: batchesSnap.data().count,
        pendingAccessRequests: accessRequestsSnap.data().count,
        totalLiveSessions,
        ongoingLiveSessions,
        totalTeachers: teacherCount,  
        todaysClasses,
        averageAttendance: 0, 
        totalRevenue: 0, 
        recentActivity
      }
    });
  } catch (error) {
    next(new AppError('Failed to load admin dashboard metrics', 500));
  }
};

export const getTeacherDashboardMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.user!;
    
    const [
      liveSessionsSnap,
      resourcesSnap,
    ] = await Promise.all([
      db.collection('live_sessions').where('hostId', '==', userId).where('isDeleted', '==', false).get(),
      db.collection('resources').where('uploadedBy', '==', userId).where('isDeleted', '==', false).count().get(),
    ]);

    const liveSessions = liveSessionsSnap.docs.map(d => d.data());
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);
    
    let todaysClasses = 0;
    let pendingAttendance = 0;
    let nextSession = null;
    let weeklyHours = 0; // simplified mock

    const now = new Date().toISOString();
    let minTimeDiff = Infinity;

    liveSessions.forEach(session => {
      const scheduledAt = session.scheduledStartTime;
      if (!scheduledAt) return;
      
      // Today's classes
      if (scheduledAt >= startOfDay.toISOString() && scheduledAt <= endOfDay.toISOString()) {
        todaysClasses++;
      }
      
      // Pending attendance (Ended classes where attendance was never started/ended)
      if (session.status === 'ENDED' && session.attendance?.status !== 'ENDED' && session.attendance?.status !== 'LOCKED') {
        pendingAttendance++;
      }

      // Next session countdown
      if (session.status === 'SCHEDULED' && scheduledAt > now) {
        const diff = new Date(scheduledAt).getTime() - new Date(now).getTime();
        if (diff < minTimeDiff) {
          minTimeDiff = diff;
          nextSession = {
            id: session.id,
            title: session.title || 'Live Class',
            scheduledStartTime: scheduledAt
          };
        }
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        assignedCourses: 0, 
        assignedSubjects: 0, 
        liveToday: todaysClasses,
        pendingAttendance,
        resourcesUploaded: resourcesSnap.data().count,
        weeklyHours: 0, 
        nextSession
      }
    });
  } catch (error) {
    next(new AppError('Failed to load teacher dashboard metrics', 500));
  }
};
