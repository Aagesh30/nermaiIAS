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

import { generalCache } from '../../shared/utils/cache';
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
    const created = await this.courseRepo.create({ ...data, tenantId }, userId);
    generalCache.invalidatePrefix('courses:');
    return created;
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
    generalCache.invalidatePrefix('courses:');
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
    const cacheKey = `courses:list:${tenantId}`;
    const cached = generalCache.get<any[]>(cacheKey);
    if (cached) return cached;

    const res = await this.courseRepo.findAllByTenant(tenantId);
    generalCache.set(cacheKey, res, 60);
    return res;
  }

  async deleteCourse(id: string, userId: string, tenantId: string) {
    const course = await this.courseRepo.findById(id);
    if (!course || course.tenantId !== tenantId) throw new AppError('Course not found', 404);
    await this.courseRepo.softDelete(id, userId);
    generalCache.invalidatePrefix('courses:');
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
    
    generalCache.invalidatePrefix('courses:');
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
    const cacheKey = `courses:subjects:${tenantId}`;
    const cached = generalCache.get<any[]>(cacheKey);
    if (cached) return cached;

    const courses = await this.courseRepo.findAllByTenant(tenantId);
    if (courses.length === 0) return [];
    
    const subjectPromises = courses.map(c => this.subjectRepo.findByCourseId(c.id!));
    const results = await Promise.all(subjectPromises);
    const flat = results.flat();
    generalCache.set(cacheKey, flat, 60);
    return flat;
  }
  async updateSubject(id: string, data: Partial<ISubject>, userId: string, tenantId: string) {
    const subject = await this.subjectRepo.findById(id);
    if (!subject) throw new AppError('Subject not found', 404);
    
    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.subjectRepo.update(id, data, userId);
    generalCache.invalidatePrefix('courses:');
    return await this.subjectRepo.findById(id);
  }

  async deleteSubject(id: string, userId: string, tenantId: string) {
    const subject = await this.subjectRepo.findById(id);
    if (!subject) throw new AppError('Subject not found', 404);
    
    const course = await this.courseRepo.findById(subject.courseId);
    if (!course || (course.tenantId !== tenantId && !subject.courseId.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.subjectRepo.softDelete(id, userId);
    generalCache.invalidatePrefix('courses:');
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

    generalCache.invalidatePrefix('courses:');
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
    const cacheKey = `courses:topics:${tenantId}`;
    const cached = generalCache.get<any[]>(cacheKey);
    if (cached) return cached;

    const subjects = await this.listAllSubjects(tenantId);
    if (subjects.length === 0) return [];
    
    const topicPromises = subjects.map(s => this.topicRepo.findBySubjectId(s.id!));
    const results = await Promise.all(topicPromises);
    const flat = results.flat();
    generalCache.set(cacheKey, flat, 60);
    return flat;
  }

  async updateTopic(id: string, data: Partial<ITopic>, userId: string, tenantId: string) {
    const topic = await this.topicRepo.findById(id);
    if (!topic) throw new AppError('Topic not found', 404);
    
    const subject = await this.subjectRepo.findById(topic.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    if (!course || (course.tenantId !== tenantId && !subject?.courseId?.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.topicRepo.update(id, data, userId);
    generalCache.invalidatePrefix('courses:');
    return await this.topicRepo.findById(id);
  }

  async deleteTopic(id: string, userId: string, tenantId: string) {
    const topic = await this.topicRepo.findById(id);
    if (!topic) throw new AppError('Topic not found', 404);
    
    const subject = await this.subjectRepo.findById(topic.subjectId);
    const course = await this.courseRepo.findById(subject!.courseId);
    if (!course || (course.tenantId !== tenantId && !subject?.courseId?.startsWith('erp_course_') && course.tenantId !== 'default_tenant')) throw new AppError('Tenant mismatch', 403);
    
    await this.topicRepo.softDelete(id, userId);
    generalCache.invalidatePrefix('courses:');
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

    generalCache.invalidatePrefix('courses:');
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

    const createdClass = await this.classRepo.create(classData, userId);
    generalCache.invalidatePrefix('courses:');
    return createdClass;
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
    const isStaff = role && ['super_admin', 'admin', 'teacher', 'staff'].includes(role);
    const cacheKey = `courses:classes:${tenantId}:${isStaff ? 'staff' : 'student'}`;
    const cached = generalCache.get<any[]>(cacheKey);
    if (cached) return cached;

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
      if (isStaff && (cls.classType === 'recorded' || (cls.classType as string) === 'youtube_recorded') && (cls as any).encryptedVideoId) {
        try {
          (cls as any).recordingUrl = `https://youtube.com/watch?v=${decrypt((cls as any).encryptedVideoId)}`;
        } catch (e) {
          console.error("Failed to decrypt video ID for class:", cls.id);
        }
      }
      
      enrichedClasses.push(cls);
    }
    generalCache.set(cacheKey, enrichedClasses, 30);
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
    generalCache.invalidatePrefix('courses:');
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
    generalCache.invalidatePrefix('courses:');

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
      // Backward-compat: classes converted before the fix only have raw recordingUrl
      if (!classDoc.encryptedVideoId && (classDoc as any).recordingUrl) {
        const rawUrl: string = (classDoc as any).recordingUrl;
        const extractedId = rawUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\\w-]{11})/)?.[1]
          || rawUrl.match(/^([\w-]{11})$/)?.[1];
        if (extractedId) {
          // Persist the fix to Firestore so next call is instant
          await db.collection('classes').doc(classId).update({
            encryptedVideoId: encrypt(extractedId),
            classType: 'youtube_recorded',
            updatedAt: new Date().toISOString()
          }).catch(() => {});
          classDoc.encryptedVideoId = encrypt(extractedId);
        }
      }
      if (!classDoc.encryptedVideoId) throw new AppError('Video ID not configured for this class', 500);
      const videoId = decrypt(classDoc.encryptedVideoId);

      const resolvedStudentName = user.displayName || user.name || user.fullName || (user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : '') || 'Student';
      const resolvedStudentEmail = user.email || '';

      const access = await AccessEngine.evaluateAccess({
        userId: user.userId || user.id,
        tenantId: user.tenantId,
        resourceType: 'video',
        resourceId: classId,
        tokenPayload: {
          videoId,
          classId,
          videoTitle: classDoc.title || 'Nermai IAS Video',
          videoType: classDoc.classType,
          studentName: resolvedStudentName,
          studentEmail: resolvedStudentEmail
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

  async syncStructuredSyllabus(courseId: string, subjectsData: any[], userId: string, tenantId: string) {
    const course = await this.courseRepo.findById(courseId);
    if (!course && !courseId.startsWith('erp_course_') && !courseId.startsWith('course_')) {
      // allow fallback if valid course
    }

    const result: any[] = [];
    let subjectOrder = 1;

    for (const subj of subjectsData) {
      if (!subj || !subj.name) continue;
      const subjectName = String(subj.name).trim();
      if (!subjectName) continue;

      // 1. Find or create Subject
      const matchedSubjects = await this.subjectRepo.findByNameAndCourse(subjectName, courseId);
      let subject = matchedSubjects && matchedSubjects.length > 0 ? matchedSubjects[0] : null;

      if (!subject) {
        subject = await this.subjectRepo.create({
          courseId,
          name: subjectName,
          order: subj.order || subjectOrder++
        }, userId);
      }

      let topicOrder = 1;
      const topicsList = subj.topics || [];

      for (const top of topicsList) {
        if (!top || !top.name) continue;
        const topicName = String(top.name).trim();
        if (!topicName) continue;

        // 2. Find or create Topic
        const matchedTopics = await this.topicRepo.findByNameAndSubject(topicName, subject.id!);
        let topic = matchedTopics && matchedTopics.length > 0 ? matchedTopics[0] : null;

        if (!topic) {
          topic = await this.topicRepo.create({
            subjectId: subject.id!,
            name: topicName,
            order: top.order || topicOrder++
          }, userId);
        }

        let subtopicOrder = 1;
        const subtopicsList = top.subtopics || [];

        for (const st of subtopicsList) {
          if (!st || !st.name) continue;
          const subtopicName = String(st.name).trim();
          if (!subtopicName) continue;

          const isCompleted = st.coverageStatus?.toString().toLowerCase() === 'done' || st.completed === true;

          const subtopicPayload = {
            topicId: topic.id!,
            name: subtopicName,
            order: st.order || subtopicOrder++,
            description: st.remarks || st.description || '',
            completed: isCompleted,
            facultyName: st.facultyName || '',
            dateOfClass: st.dateOfClass || '',
            classNo: Number(st.classNo) || 0,
            durationHrs: Number(st.durationHrs) || 0,
            mode: st.mode || '',
            batchSection: st.batchSection || '',
            coverageStatus: st.coverageStatus || (isCompleted ? 'Done' : 'Pending'),
            percentCovered: Number(st.percentCovered) || (isCompleted ? 100 : 0),
            testConducted: st.testConducted || '',
            testDate: st.testDate || '',
            avgScore: Number(st.avgScore) || 0,
            remarks: st.remarks || ''
          };

          // 3. Find or create / update Subtopic
          const matchedSubtopics = await this.subtopicRepo.findByNameAndTopic(subtopicName, topic.id!);
          if (matchedSubtopics && matchedSubtopics.length > 0) {
            await this.subtopicRepo.update(matchedSubtopics[0].id!, subtopicPayload, userId);
          } else {
            await this.subtopicRepo.create(subtopicPayload, userId);
          }
        }
      }

      result.push({
        subjectName,
        topicsCount: topicsList.length,
        subtopicsCount: topicsList.reduce((acc: number, t: any) => acc + (t.subtopics?.length || 0), 0)
      });
    }

    generalCache.invalidatePrefix('courses:');
    return { status: 'success', result };
  }

  async syncSyllabusFromExcel(courseId: string, filePathOrBuffer: string | Buffer, userId: string, tenantId: string) {
    const XLSX = require('xlsx');
    const workbook = typeof filePathOrBuffer === 'string'
      ? XLSX.readFile(filePathOrBuffer)
      : XLSX.read(filePathOrBuffer, { type: 'buffer' });

    const subjectsData: any[] = [];
    const ignoreSheetNames = ['master syllabus', 'dashboard', 'summary', 'index', 'overview', 'instructions', 'template'];

    for (const sheetName of workbook.SheetNames) {
      const trimmedSheetName = String(sheetName).trim();
      if (!trimmedSheetName) continue;

      if (workbook.SheetNames.length > 1 && ignoreSheetNames.includes(trimmedSheetName.toLowerCase())) {
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (!rawRows || rawRows.length < 2) continue;

      // Find header row (the row containing 'Topic' and 'Sub-topic' / 'Subtopic')
      let headerRowIndex = -1;
      let topicColIndex = -1;
      let subtopicColIndex = -1;
      let facultyColIndex = -1;
      let dateColIndex = -1;
      let classNoColIndex = -1;
      let durationColIndex = -1;
      let modeColIndex = -1;
      let batchColIndex = -1;
      let coverageColIndex = -1;
      let percentColIndex = -1;
      let testConductedColIndex = -1;
      let testDateColIndex = -1;
      let avgScoreColIndex = -1;
      let remarksColIndex = -1;

      for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
        const row = rawRows[i];
        if (!Array.isArray(row)) continue;
        
        const tIdx = row.findIndex(c => typeof c === 'string' && /^topic$/i.test(c.trim()));
        const stIdx = row.findIndex(c => typeof c === 'string' && /sub[- ]?topic/i.test(c.trim()));

        if (tIdx !== -1 && stIdx !== -1) {
          headerRowIndex = i;
          topicColIndex = tIdx;
          subtopicColIndex = stIdx;

          // Map other columns
          row.forEach((colVal, colIdx) => {
            if (typeof colVal !== 'string') return;
            const h = colVal.toLowerCase().replace(/\s+/g, ' ');
            if (h.includes('faculty')) facultyColIndex = colIdx;
            else if (h.includes('date of class') || h.includes('class date')) dateColIndex = colIdx;
            else if (h.includes('class no')) classNoColIndex = colIdx;
            else if (h.includes('duration')) durationColIndex = colIdx;
            else if (h.includes('mode')) modeColIndex = colIdx;
            else if (h.includes('batch') || h.includes('section')) batchColIndex = colIdx;
            else if (h.includes('coverage') || h.includes('status')) coverageColIndex = colIdx;
            else if (h.includes('%') || h.includes('percent')) percentColIndex = colIdx;
            else if (h.includes('test conducted')) testConductedColIndex = colIdx;
            else if (h.includes('test date')) testDateColIndex = colIdx;
            else if (h.includes('avg score') || h.includes('score')) avgScoreColIndex = colIdx;
            else if (h.includes('remark')) remarksColIndex = colIdx;
          });
          break;
        }
      }

      if (headerRowIndex === -1 || topicColIndex === -1 || subtopicColIndex === -1) {
        continue; // Not a standard curriculum sheet
      }

      const topicsMap = new Map<string, any>();
      let currentTopicName = '';

      for (let r = headerRowIndex + 1; r < rawRows.length; r++) {
        const row = rawRows[r];
        if (!row || row.length === 0) continue;

        const rawTopic = row[topicColIndex];
        const rawSubtopic = row[subtopicColIndex];

        if (rawTopic !== undefined && rawTopic !== null && String(rawTopic).trim()) {
          currentTopicName = String(rawTopic).trim();
        }

        if (!currentTopicName) continue;

        if (!topicsMap.has(currentTopicName)) {
          topicsMap.set(currentTopicName, {
            name: currentTopicName,
            order: topicsMap.size + 1,
            subtopics: []
          });
        }

        if (rawSubtopic !== undefined && rawSubtopic !== null && String(rawSubtopic).trim()) {
          const subtopicName = String(rawSubtopic).trim();
          const topicObj = topicsMap.get(currentTopicName);

          topicObj.subtopics.push({
            name: subtopicName,
            order: topicObj.subtopics.length + 1,
            facultyName: facultyColIndex !== -1 && row[facultyColIndex] ? String(row[facultyColIndex]).trim() : '',
            dateOfClass: dateColIndex !== -1 && row[dateColIndex] ? String(row[dateColIndex]).trim() : '',
            classNo: classNoColIndex !== -1 && row[classNoColIndex] ? Number(row[classNoColIndex]) || 0 : 0,
            durationHrs: durationColIndex !== -1 && row[durationColIndex] ? Number(row[durationColIndex]) || 0 : 0,
            mode: modeColIndex !== -1 && row[modeColIndex] ? String(row[modeColIndex]).trim() : '',
            batchSection: batchColIndex !== -1 && row[batchColIndex] ? String(row[batchColIndex]).trim() : '',
            coverageStatus: coverageColIndex !== -1 && row[coverageColIndex] ? String(row[coverageColIndex]).trim() : 'Pending',
            percentCovered: percentColIndex !== -1 && row[percentColIndex] ? Number(row[percentColIndex]) || 0 : 0,
            testConducted: testConductedColIndex !== -1 && row[testConductedColIndex] ? String(row[testConductedColIndex]).trim() : '',
            testDate: testDateColIndex !== -1 && row[testDateColIndex] ? String(row[testDateColIndex]).trim() : '',
            avgScore: avgScoreColIndex !== -1 && row[avgScoreColIndex] ? Number(row[avgScoreColIndex]) || 0 : 0,
            remarks: remarksColIndex !== -1 && row[remarksColIndex] ? String(row[remarksColIndex]).trim() : ''
          });
        }
      }

      if (topicsMap.size > 0) {
        subjectsData.push({
          name: sheetName,
          order: subjectsData.length + 1,
          topics: Array.from(topicsMap.values())
        });
      }
    }

    return this.syncStructuredSyllabus(courseId, subjectsData, userId, tenantId);
  }

}
