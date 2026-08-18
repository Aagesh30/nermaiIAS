import { CourseRepository, SubjectRepository, TopicRepository, SubtopicRepository, ClassRepository } from './repository';
import { ICourse, ISubject, ITopic, ISubtopic, IClass } from './types';
import { AppError } from '../../core/errors/AppError';
import { encrypt, decrypt } from '../../core/utils/encryption';
import { randomUUID } from 'crypto';
import { redisClient } from '../../infrastructure/redis';
import { db } from '../../infrastructure/firebase';
import { AccessEngine } from '../../core/security/AccessEngine';
import { AccessPolicyEngine } from '../../core/sape/AccessPolicyEngine';
import { NotificationService } from '../notifications/service';
import { analyticsWorker } from '../analytics/worker';
import { ContextService } from '../assistant/contextService';
import { LiveSessionService } from '../live-sessions/service';

import { env } from '../../config/env';
import jwt from 'jsonwebtoken';
const notificationService = new NotificationService();
const contextService = new ContextService();

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|live)\/|.*[?&]v=))([^"&?\/\s]{11})/);
  return match ? match[1] : null;
}

export function deriveClassStatus(classDoc: any): 'SCHEDULED' | 'LIVE' | 'ENDED' {
  if (classDoc.classType === 'youtube_recorded') return 'ENDED';
  if (classDoc.actualEndTime) return 'ENDED';

  const now = new Date().getTime();
  const baseStart = classDoc.actualStartTime ? new Date(classDoc.actualStartTime).getTime() : new Date(classDoc.scheduledStartTime || 0).getTime();
  let durationMs = (classDoc.expectedDurationMinutes || 60) * 60 * 1000;
  const extensionMs = (classDoc.extensionMinutes || 0) * 60 * 1000;
  const gracePeriodMs = 2 * 60 * 1000; // 2 minutes grace period
  const effectiveEndTime = baseStart + durationMs + extensionMs + gracePeriodMs;

  if (now < baseStart) return 'SCHEDULED';
  if (now >= baseStart && now < effectiveEndTime) return 'LIVE';
  
  return 'ENDED';
}

export class CourseService {
  private courseRepo = new CourseRepository();
  private subjectRepo = new SubjectRepository();
  private topicRepo = new TopicRepository();
  private subtopicRepo = new SubtopicRepository();
  private classRepo = new ClassRepository();

  // ----- COURSE -----
  async createCourse(data: Omit<ICourse, keyof import('../../core/types').BaseAuditFields | 'tenantId'>, userId: string, tenantId: string) {
    const existing = await this.courseRepo.findByNameAndTenant(data.name, tenantId);
    if (existing.length > 0) {
      throw new AppError(`Course with name "${data.name}" already exists in this tenant.`, 409);
    }
    return await this.courseRepo.create({ ...data, tenantId }, userId);
  }

  async updateCourse(id: string, data: Partial<ICourse>, userId: string, tenantId: string) {
    const course = await this.courseRepo.findById(id);
    if (!course || course.tenantId !== tenantId) {
      throw new AppError('Course not found', 404);
    }
    
    if (data.name && data.name !== course.name) {
      const existing = await this.courseRepo.findByNameAndTenant(data.name, tenantId);
      if (existing.length > 0) {
        throw new AppError(`Course with name "${data.name}" already exists.`, 409);
      }
    }
    
    await this.courseRepo.update(id, data, userId);
    return await this.courseRepo.findById(id);
  }

  async getCourse(id: string, tenantId: string) {
    const course = await this.courseRepo.findById(id);
    if (!course || course.tenantId !== tenantId) {
      throw new AppError('Course not found', 404);
    }
    return course;
  }

  async listCourses(tenantId: string) {
    return await this.courseRepo.findAllByTenant(tenantId);
  }

  async deleteCourse(id: string, userId: string, tenantId: string) {
    const course = await this.courseRepo.findById(id);
    if (!course || course.tenantId !== tenantId) throw new AppError('Course not found', 404);
    await this.courseRepo.softDelete(id, userId);
  }

  async assignStaff(courseId: string, staffData: any, userId: string, tenantId: string) {
    const course = await this.courseRepo.findById(courseId);
    if (!course || course.tenantId !== tenantId) {
      throw new AppError('Course not found', 404);
    }
    const assignedStaff = course.assignedStaff || [];
    const assignedStaffIds = course.assignedStaffIds || [];
    if (assignedStaffIds.includes(staffData.userId)) {
      throw new AppError('Staff already assigned to this course', 400);
    }
    assignedStaff.push({
      ...staffData,
      assignedBy: userId,
      assignedAt: new Date().toISOString()
    });
    assignedStaffIds.push(staffData.userId);
    await this.courseRepo.update(courseId, { assignedStaff, assignedStaffIds }, userId);
    return await this.courseRepo.findById(courseId);
  }

  async unassignStaff(courseId: string, staffId: string, userId: string, tenantId: string) {
    const course = await this.courseRepo.findById(courseId);
    if (!course || course.tenantId !== tenantId) {
      throw new AppError('Course not found', 404);
    }
    const assignedStaff = course.assignedStaff || [];
    const assignedStaffIds = course.assignedStaffIds || [];
    if (!assignedStaffIds.includes(staffId)) {
      throw new AppError('Staff not assigned to this course', 400);
    }
    const newAssignedStaff = assignedStaff.filter((s: any) => s.userId !== staffId);
    const newAssignedStaffIds = assignedStaffIds.filter((id: string) => id !== staffId);
    await this.courseRepo.update(courseId, { assignedStaff: newAssignedStaff, assignedStaffIds: newAssignedStaffIds }, userId);
    return await this.courseRepo.findById(courseId);
  }

  // ----- SUBJECT -----
  async createSubject(data: Omit<ISubject, keyof import('../../core/types').BaseAuditFields>, userId: string, tenantId: string) {
    const course = await this.courseRepo.findById(data.courseId);
    if (!course || (course.tenantId !== tenantId && !data.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) {
      throw new AppError('Parent course not found', 404);
    }

    const existing = await this.subjectRepo.findByNameAndCourse(data.name, data.courseId);
    if (existing.length > 0) {
      throw new AppError(`Subject with name "${data.name}" already exists in this course.`, 409);
    }
    
    return await this.subjectRepo.create(data, userId);
  }

  async listSubjectsByCourse(courseId: string, tenantId: string) {
    const course = await this.courseRepo.findById(courseId);
    if (!course || (course.tenantId !== tenantId && !courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) {
      throw new AppError('Parent course not found', 404);
    }
    return await this.subjectRepo.findByCourseId(courseId);
  }

  async listAllSubjects(tenantId: string) {
    const courses = await this.courseRepo.findAllByTenant(tenantId);
    if (courses.length === 0) return [];
    
    const subjectPromises = courses.map(c => this.subjectRepo.findByCourseId(c.id!));
    const results = await Promise.all(subjectPromises);
    return results.flat();
  }
  async updateSubject(id: string, data: Partial<ISubject>, userId: string, tenantId: string) {
    const subject = await this.subjectRepo.findById(id);
    if (!subject) throw new AppError('Subject not found', 404);
    
    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.subjectRepo.update(id, data, userId);
    return await this.subjectRepo.findById(id);
  }

  async deleteSubject(id: string, userId: string, tenantId: string) {
    const subject = await this.subjectRepo.findById(id);
    if (!subject) throw new AppError('Subject not found', 404);
    
    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.subjectRepo.softDelete(id, userId);
  }

  // ----- TOPIC -----
  async createTopic(data: Omit<ITopic, keyof import('../../core/types').BaseAuditFields>, userId: string, tenantId: string) {
    const subject = await this.subjectRepo.findById(data.subjectId);
    if (!subject) {
      throw new AppError('Parent subject not found', 404);
    }
    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) {
      throw new AppError('Tenant mismatch or course not found', 403);
    }

    const existing = await this.topicRepo.findByNameAndSubject(data.name, data.subjectId);
    if (existing.length > 0) {
      throw new AppError(`Topic with name "${data.name}" already exists in this subject.`, 409);
    }

    return await this.topicRepo.create(data, userId);
  }

  async listTopicsBySubject(subjectId: string, tenantId: string) {
    const subject = await this.subjectRepo.findById(subjectId);
    if (!subject) throw new AppError('Subject not found', 404);
    
    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    return await this.topicRepo.findBySubjectId(subjectId);
  }

  async listAllTopics(tenantId: string) {
    const subjects = await this.listAllSubjects(tenantId);
    if (subjects.length === 0) return [];
    
    const topicPromises = subjects.map(s => this.topicRepo.findBySubjectId(s.id!));
    const results = await Promise.all(topicPromises);
    return results.flat();
  }

  async updateTopic(id: string, data: Partial<ITopic>, userId: string, tenantId: string) {
    const topic = await this.topicRepo.findById(id);
    if (!topic) throw new AppError('Topic not found', 404);
    
    const subject = await this.subjectRepo.findById(topic.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    if (!course || (course.tenantId !== tenantId && !subject?.courseId?.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.topicRepo.update(id, data, userId);
    return await this.topicRepo.findById(id);
  }

  async deleteTopic(id: string, userId: string, tenantId: string) {
    const topic = await this.topicRepo.findById(id);
    if (!topic) throw new AppError('Topic not found', 404);
    
    const subject = await this.subjectRepo.findById(topic.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    if (!course || (course.tenantId !== tenantId && !subject?.courseId?.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.topicRepo.softDelete(id, userId);
  }

  // ----- SUBTOPIC -----
  async createSubtopic(data: Omit<ISubtopic, keyof import('../../core/types').BaseAuditFields>, userId: string, tenantId: string) {
    const topic = await this.topicRepo.findById(data.topicId);
    if (!topic) throw new AppError('Parent topic not found', 404);
    
    const subject = await this.subjectRepo.findById(topic.subjectId);
    if (!subject) throw new AppError('Parent subject not found', 404);

    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) {
      throw new AppError('Tenant mismatch or course not found', 403);
    }

    const existing = await this.subtopicRepo.findByNameAndTopic(data.name, data.topicId);
    if (existing.length > 0) {
      throw new AppError(`Subtopic with name "${data.name}" already exists in this topic.`, 409);
    }

    return await this.subtopicRepo.create(data, userId);
  }

  async listSubtopicsByTopic(topicId: string, tenantId: string) {
    const topic = await this.topicRepo.findById(topicId);
    if (!topic) throw new AppError('Topic not found', 404);
    
    const subject = await this.subjectRepo.findById(topic.subjectId);
    if (!subject) throw new AppError('Parent subject not found', 404);

    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    return await this.subtopicRepo.findByTopicId(topicId);
  }

  async listAllSubtopics(tenantId: string) {
    const topics = await this.listAllTopics(tenantId);
    if (topics.length === 0) return [];
    
    const subtopicPromises = topics.map(t => this.subtopicRepo.findByTopicId(t.id!));
    const results = await Promise.all(subtopicPromises);
    return results.flat();
  }

  async updateSubtopic(id: string, data: Partial<ISubtopic>, userId: string, tenantId: string) {
    const subtopic = await this.subtopicRepo.findById(id);
    if (!subtopic) throw new AppError('Subtopic not found', 404);
    
    const topic = await this.topicRepo.findById(subtopic.topicId);
    if (!topic) throw new AppError('Parent topic not found', 404);

    const subject = await this.subjectRepo.findById(topic.subjectId);
    if (!subject) throw new AppError('Parent subject not found', 404);

    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.subtopicRepo.update(id, data, userId);
    return await this.subtopicRepo.findById(id);
  }

  async deleteSubtopic(id: string, userId: string, tenantId: string) {
    const subtopic = await this.subtopicRepo.findById(id);
    if (!subtopic) throw new AppError('Subtopic not found', 404);
    
    const topic = await this.topicRepo.findById(subtopic.topicId);
    if (!topic) throw new AppError('Parent topic not found', 404);

    const subject = await this.subjectRepo.findById(topic.subjectId);
    if (!subject) throw new AppError('Parent subject not found', 404);

    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.subtopicRepo.softDelete(id, userId);
  }

  async listClassesBySubtopic(subtopicId: string, tenantId: string) {
    const subtopic = await this.subtopicRepo.findById(subtopicId);
    if (!subtopic) throw new AppError('Subtopic not found', 404);
    
    const topic = await this.topicRepo.findById(subtopic.topicId);
    if (!topic) throw new AppError('Parent topic not found', 404);

    const subject = await this.subjectRepo.findById(topic.subjectId);
    if (!subject) throw new AppError('Parent subject not found', 404);

    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    const classes = await this.classRepo.findBySubtopicId(subtopicId);
    const enrichedClasses = [];
    for (const cls of classes) {
      if (['live', 'zoom_live', 'youtube_live'].includes(cls.classType)) {
        const snapshot = await db.collection('live_sessions').where('classId', '==', cls.id).get();
        if (!snapshot.empty) {
          const validDocs = snapshot.docs.filter(d => d.data().isDeleted !== true);
          if (validDocs.length > 0) {
            (cls as any).liveSession = { id: validDocs[0].id, ...validDocs[0].data() };
          }
        }
      }
      enrichedClasses.push(cls);
    }
    return enrichedClasses;
  }

  async createClass(data: any, userId: string, tenantId: string) {
    const topic = await this.topicRepo.findById(data.topicId);
    if (!topic) throw new AppError('Parent topic not found', 404);
    
    const subject = await this.subjectRepo.findById(topic.subjectId);
    if (!subject) throw new AppError('Parent subject not found', 404);
    
    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);

    const existing = await this.classRepo.findByTitleAndTopic(data.title, data.topicId);
    if (existing.length > 0) {
      throw new AppError(`Class with title "${data.title}" already exists in this topic.`, 409);
    }

    const classData: any = { 
      ...data,
      tenantId,
      courseId: course.id,
      subjectId: subject.id
    };
    
    if (data.classType === 'recorded' && data.youtubeUrl) {
      const videoId = extractYoutubeId(data.youtubeUrl);
      if (!videoId) throw new AppError('Invalid YouTube URL', 400);
      classData.encryptedVideoId = encrypt(videoId);
      delete classData.youtubeUrl;
    }

    return await this.classRepo.create(classData, userId);
  }

  async listClassesByTopic(topicId: string, tenantId: string) {
    const topic = await this.topicRepo.findById(topicId);
    if (!topic) throw new AppError('Topic not found', 404);
    
    const subject = await this.subjectRepo.findById(topic.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    if (!course || (course.tenantId !== tenantId && !subject?.courseId?.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    const classes = await this.classRepo.findByTopicId(topicId);
    const enrichedClasses = [];
    for (const cls of classes) {
      if (['live', 'zoom_live', 'youtube_live'].includes(cls.classType)) {
        const snapshot = await db.collection('live_sessions').where('classId', '==', cls.id).get();
        if (!snapshot.empty) {
          const validDocs = snapshot.docs.filter(d => d.data().isDeleted !== true);
          if (validDocs.length > 0) {
            (cls as any).liveSession = { id: validDocs[0].id, ...validDocs[0].data() };
          }
        }
      }
      enrichedClasses.push(cls);
    }
    return enrichedClasses;
  }

  async listAllClasses(tenantId: string, role?: string, userId?: string) {
    const classes = await this.classRepo.findByTenantId(tenantId);

    const enrichedClasses = [];
    for (const cls of classes) {
      if (['live', 'zoom_live', 'youtube_live'].includes(cls.classType)) {
        const snapshot = await db.collection('live_sessions').where('classId', '==', cls.id).get();
        if (!snapshot.empty) {
          const validDocs = snapshot.docs.filter(d => d.data().isDeleted !== true);
          if (validDocs.length > 0) {
            (cls as any).liveSession = { id: validDocs[0].id, ...validDocs[0].data() };
          }
        }
      }
      
      // Decrypt the raw YouTube URL ONLY for staff/admins so they can view it in the edit form.
      // Students will NOT receive this field to prevent inspection extraction.
      if (role && ['super_admin', 'admin', 'teacher', 'staff'].includes(role) && (cls.classType === 'recorded' || (cls.classType as string) === 'youtube_recorded') && (cls as any).encryptedVideoId) {
        try {
          (cls as any).recordingUrl = `https://youtube.com/watch?v=${decrypt((cls as any).encryptedVideoId)}`;
        } catch (e) {
          console.error("Failed to decrypt video ID for class:", cls.id);
        }
      }
      
      enrichedClasses.push(cls);
    }
    return enrichedClasses;
  }

  async getClass(id: string) {
    const classDoc = await this.classRepo.findById(id);
    if (!classDoc) {
      throw new AppError('Class not found', 404);
    }
    return classDoc;
  }

  async updateClass(id: string, data: Partial<IClass>, userId: string, tenantId: string) {
    const classDoc = await this.classRepo.findById(id);
    if (!classDoc) throw new AppError('Class not found', 404);
    
    const topic = await this.topicRepo.findById(classDoc.topicId);
    const subject = await this.subjectRepo.findById(topic!.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    if (!course || (course.tenantId !== tenantId && !subject?.courseId?.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    const classData: any = { ...data };
    
    if (classData.youtubeUrl) {
      const videoId = extractYoutubeId(classData.youtubeUrl);
      if (!videoId) throw new AppError('Invalid YouTube URL', 400);
      classData.encryptedVideoId = encrypt(videoId);
      delete classData.youtubeUrl;
    }

    await this.classRepo.update(id, classData, userId);
    return await this.classRepo.findById(id);
  }

  async uploadClassRecording(id: string, youtubeUrl: string, userId: string, tenantId: string) {
    const classDoc = await this.classRepo.findById(id);
    if (!classDoc) throw new AppError('Class not found', 404);
    
    const topic = await this.topicRepo.findById(classDoc.topicId);
    const subject = await this.subjectRepo.findById(topic!.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    if (!course || course.tenantId !== tenantId) throw new AppError('Tenant mismatch', 403);
    
    const videoId = extractYoutubeId(youtubeUrl);
    if (!videoId) throw new AppError('Invalid YouTube URL', 400);
    
    const encryptedRecordingId = encrypt(videoId);
    const now = new Date();
    await this.classRepo.update(id, { 
      encryptedVideoId: encryptedRecordingId,
    }, userId);
    
    const actualEndMs = (classDoc as any).actualEndTime ? new Date((classDoc as any).actualEndTime).getTime() : now.getTime();
    const recordingDelayMinutes = Math.floor((now.getTime() - actualEndMs) / 60000);
    analyticsWorker.queueDeferredAnalytics(id, recordingDelayMinutes).catch(e => console.error(e));
    
    // Inject context for Assistant
    try {
      await contextService.setGlobalClassContext(id, {
        courseId: course?.id || 'unknown',
        subjectId: subject?.id || 'unknown',
        topicId: topic?.id || 'unknown',
        classId: id,
        recordingId: encryptedRecordingId,
        resourceIds: [], // Resources could be fetched here or left to async jobs
        announcementIds: []
      });
    } catch (err) {
      console.error('Failed to inject assistant context:', err);
    }
    
    // Notify users
    try {
      await notificationService.dispatchNotification({
        tenantId,
        title: 'Recording Uploaded',
        body: `The recording for ${classDoc.title} is now available.`,
        visibility: 'topic',
        metadata: { classId: id, courseId: course?.id || 'unknown' }
      });
    } catch (err) {}
    
    return await this.classRepo.findById(id);
  }

  async deleteClass(id: string, userId: string, tenantId: string) {
    const classDoc = await this.classRepo.findById(id);
    if (!classDoc) throw new AppError('Class not found', 404);
    
    const topic = await this.topicRepo.findById(classDoc.topicId);
    const subject = await this.subjectRepo.findById(topic!.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    if (!course || course.tenantId !== tenantId) throw new AppError('Tenant mismatch', 403);
    
    await this.classRepo.softDelete(id, userId);

    const anyClassDoc = classDoc as any;
    if (anyClassDoc.liveSessionId) {
      try {
        await LiveSessionService.deleteSession(anyClassDoc.liveSessionId, userId);
      } catch (err) {
        console.error(`Failed to delete associated live session ${anyClassDoc.liveSessionId} for class ${id}:`, err);
      }
    }
  }

  async getClassPlaybackAccess(classId: string, user: any) {
    const classDoc = await this.classRepo.findById(classId);
    console.log("=== SERVICE ===");
    console.log("classId =", classId);
    console.log("class =", classDoc);
    if (!classDoc) throw new AppError('Class not found', 404);
    
    const topic = await this.topicRepo.findById(classDoc.topicId);
    const subject = await this.subjectRepo.findById(topic!.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    
    // ================== DIAGNOSTICS ==================
    console.log("=== WATCH RECORDING DIAGNOSTICS ===");
    console.log("FIREBASE_PROJECT_ID:", process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'not-set');
    console.log("authenticated role:", user.role);
    console.log("authenticated user tenantId:", user.tenantId);
    console.log("requested classId:", classId);
    console.log("course/class tenantId:", course?.tenantId);
    console.log("class exists:", !!classDoc);
    console.log("encryptedVideoId exists:", !!(classDoc as any).encryptedVideoId);
    console.log("=====================================");

    if (!course || course.tenantId !== user.tenantId) throw new AppError('Tenant mismatch', 403);

    // Determine if this user is a staff/admin previewing LMS content.
    // The existing AccessPolicyEngine.evaluateAccess() already has a built-in
    // isAdminOverride param (defaulting to false) that immediately returns allowed=true.
    // We activate it here for authorized staff roles, which is the intended use.
    const isStaffPreview = ['super_admin', 'admin', 'teacher', 'staff'].includes(user.role || '');

    // Use the SAPE engine — with isAdminOverride for staff, without for students
    const sape = new AccessPolicyEngine();
    let sapeDecision = await sape.evaluateAccess(user.userId || user.id, 'CLASS', classId, isStaffPreview);
    
    const isFreeCourse = course.isFree || course.price === 0;

    if (isFreeCourse) {
        sapeDecision = {
            allowed: true,
            reason: 'PUBLIC course',
            source: 'PUBLIC'
        } as any;
    }

    console.log("SAPE Decision:", sapeDecision.allowed, sapeDecision.reason, "| isStaffPreview:", isStaffPreview);

    if (!sapeDecision.allowed) {
      return {
        status: 'DENIED',
        denialReason: 'SAPE: ' + sapeDecision.reason,
        allowedRequestScopes: sapeDecision.allowedRequestScopes,
        remainingRecordedUnits: sapeDecision.remainingRecordedUnits
      };
    }

    // Evaluate specific recorded class access via SACS (student only)
    // Staff roles always have LMS preview access — SACS is a student batch/visibility system
    if (!isStaffPreview) {
      const { AccessRulesService } = require('../access-rules/service');
      const accessRulesService = new AccessRulesService();
      const tenantId = user.tenantId || 'default';
      const sacsDecision = await accessRulesService.evaluateEntityAccess(
        user.userId || user.id,
        classId,
        'class',
        tenantId
      );

      console.log("SACS Decision:", sacsDecision.allowed, sacsDecision.lockMessage);

      if (!sacsDecision.allowed) {
        return {
          status: 'DENIED',
          denialReason: 'SACS: ' + (sacsDecision.lockMessage || 'Class Access Denied'),
          // Instruct UI that a request can be made for this class
          allowedRequestScopes: ['class']
        };
      }
    } else {
      console.log("SACS: Skipped — staff preview (isStaffPreview=true)");
    }

    if (classDoc.classType === 'recorded' || (classDoc.classType as string) === 'youtube_recorded') {
      if (!classDoc.encryptedVideoId) throw new AppError('Video ID not configured for this class', 500);
      const videoId = decrypt(classDoc.encryptedVideoId);

      const access = await AccessEngine.evaluateAccess({
        userId: user.userId || user.id,
        tenantId: user.tenantId,
        resourceType: 'video',
        resourceId: classId,
        tokenPayload: {
          videoId,
          classId,
          videoTitle: classDoc.title || 'Nermai IAS Video',
          videoType: classDoc.classType
        },
        visibilityRule: { visibility: 'public' }
      });
      
      return {
        provider: 'youtube',
        contentType: 'RECORDED',
        status: 'READY',
        playerToken: access.token
      };
    } else if (classDoc.classType === 'live' || classDoc.classType === 'youtube_live' || classDoc.classType === 'zoom_live') {
      const { LiveSessionResolver } = require('../live-sessions/LiveSessionResolver');
      const resolvedSession = await LiveSessionResolver.resolveActiveSession(classId, classDoc);
      
      if (!resolvedSession.provider || resolvedSession.provider === 'live') {
        throw new AppError('Invalid provider configuration. Session provider could not be resolved.', 400);
      }

      if (!resolvedSession.sessionId) {
        return {
          provider: resolvedSession.provider,
          status: resolvedSession.status, // SCHEDULED
          waiting: true
        };
      }

      if (resolvedSession.status === 'SCHEDULED') {
        return {
          provider: resolvedSession.provider,
          status: resolvedSession.status,
          sessionId: resolvedSession.sessionId,
          waiting: true
        };
      }

      if (resolvedSession.status === 'JOINING') {
        return {
          provider: resolvedSession.provider,
          status: resolvedSession.status,
          sessionId: resolvedSession.sessionId,
          waiting: true
        };
      }

      const token = await LiveSessionService.generateJoinToken(resolvedSession.sessionId!, user);
      
      return {
        provider: resolvedSession.provider,
        status: resolvedSession.status,
        sessionId: resolvedSession.sessionId,
        playerToken: token
      };
    }
    
    throw new AppError('Unknown class type', 400);
  }

  async syncSyllabusFromExcel(courseId: string, filePath: string, userId: string, tenantId: string) {
    const course = await this.courseRepo.findById(courseId);
    if (!course || (course.tenantId !== tenantId && !courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) {
      throw new AppError('Course not found', 404);
    }

    const XLSX = require('xlsx');
    const workbook = XLSX.readFile(filePath);
    
    // We only process sheets that represent subjects:
    const subjectSheetNames = [
      'History',
      'Geography',
      'Polity',
      'Economy',
      'Environment',
      'Science',
      'Maths',
      'Aptitude',
      'Reasoning',
      'World History'
    ];

    const result: any[] = [];

    for (const sheetName of workbook.SheetNames) {
      if (!subjectSheetNames.includes(sheetName)) continue;

      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      // Find or create subject
      let subject = await this.subjectRepo.findByNameAndCourse(sheetName, courseId).then(res => res[0]);
      if (!subject) {
        subject = await this.subjectRepo.create({
          courseId,
          name: sheetName,
          order: subjectSheetNames.indexOf(sheetName) + 1
        }, userId);
      }

      let currentTopicName = '';
      let currentTopic: any = null;
      let orderIndex = 1;

      for (const row of rows) {
        const keys = Object.keys(row);
        const sNoKey = keys.find(k => k.startsWith('NERMAI IAS ACADEMY') || k.includes('S.No'));
        if (!sNoKey) continue;
        const sNo = row[sNoKey];
        if (sNo === 'S.No') continue;

        const topicVal = row['__EMPTY'];
        const subtopicVal = row['__EMPTY_1'];

        if (topicVal) {
          currentTopicName = String(topicVal).trim();
          currentTopic = null; // Reset current topic so we query/create it
        }

        if (!subtopicVal) continue; // Skip rows without subtopics
        const subtopicName = String(subtopicVal).trim();

        // 1. Find or create Topic
        if (currentTopicName && !currentTopic) {
          const matchedTopics = await this.topicRepo.findByNameAndSubject(currentTopicName, subject.id!);
          if (matchedTopics.length > 0) {
            currentTopic = matchedTopics[0];
          } else {
            currentTopic = await this.topicRepo.create({
              subjectId: subject.id!,
              name: currentTopicName,
              order: orderIndex++
            }, userId);
          }
        }

        if (!currentTopic) continue;

        // Extract tracking attributes
        const facultyName = row['__EMPTY_2'] ? String(row['__EMPTY_2']).trim() : '';
        const dateOfClass = row['__EMPTY_3'] ? String(row['__EMPTY_3']).trim() : '';
        const classNo = row['__EMPTY_4'] ? Number(row['__EMPTY_4']) : 0;
        const durationHrs = row['__EMPTY_5'] ? Number(row['__EMPTY_5']) : 0;
        const mode = row['__EMPTY_6'] ? String(row['__EMPTY_6']).trim() : '';
        const batchSection = row['__EMPTY_7'] ? String(row['__EMPTY_7']).trim() : '';
        const coverageStatus = row['__EMPTY_8'] ? String(row['__EMPTY_8']).trim() : '';
        const percentCovered = row['__EMPTY_9'] ? Number(row['__EMPTY_9']) : 0;
        const testConducted = row['__EMPTY_10'] ? String(row['__EMPTY_10']).trim() : '';
        const testDate = row['__EMPTY_11'] ? String(row['__EMPTY_11']).trim() : '';
        const avgScore = row['__EMPTY_12'] ? Number(row['__EMPTY_12']) : 0;
        const remarks = row['__EMPTY_13'] ? String(row['__EMPTY_13']).trim() : '';

        const subtopicPayload = {
          topicId: currentTopic.id!,
          name: subtopicName,
          order: orderIndex++,
          description: remarks || '',
          completed: coverageStatus.toLowerCase() === 'done',
          // Additional tracking properties
          facultyName,
          dateOfClass,
          classNo,
          durationHrs,
          mode,
          batchSection,
          coverageStatus,
          percentCovered,
          testConducted,
          testDate,
          avgScore,
          remarks
        };

        // 2. Find or create / update Subtopic
        const matchedSubtopics = await this.subtopicRepo.findByNameAndTopic(subtopicName, currentTopic.id!);
        if (matchedSubtopics.length > 0) {
          const subtopic = matchedSubtopics[0];
          await this.subtopicRepo.update(subtopic.id!, subtopicPayload, userId);
        } else {
          await this.subtopicRepo.create(subtopicPayload, userId);
        }
      }

      result.push({ subjectName: sheetName, rowsCount: rows.length });
    }

    return { status: 'success', result };
  }

}
