import { db } from '../../infrastructure/firebase';
import { AppError } from '../../core/errors/AppError';
import { IClass, ITopic, ISubject, ICourse } from '../courses/types';
import { logger } from '../../core/logger';

export class TeachingAssignmentService {
  /**
   * Resolves the staff ID responsible for a class based on priority:
   * 1. Class Override (teacherId)
   * 2. Subject Default (defaultStaffId)
   * 3. Course Default (courseStaffId)
   */
  async getResponsibleStaff(classId: string): Promise<{ staffId: string | null; overrideLevel: 'class' | 'subtopic' | 'subject' | 'course' | 'none' }> {
    const classSnap = await db.collection('classes').doc(classId).get();
    if (!classSnap.exists) {
      throw new AppError('Class not found', 404);
    }
    const classData = classSnap.data() as IClass;

    // 1. Class Override
    if (classData.teacherId) {
      return { staffId: classData.teacherId, overrideLevel: 'class' };
    }

    let topicId = classData.topicId;

    // 2. Subtopic Default Override
    if (classData.subtopicId) {
      const subtopicSnap = await db.collection('subtopics').doc(classData.subtopicId).get();
      if (subtopicSnap.exists) {
        const subtopicData = subtopicSnap.data() as any;
        if (subtopicData.defaultStaffId) {
          return { staffId: subtopicData.defaultStaffId, overrideLevel: 'subtopic' };
        }
        topicId = subtopicData.topicId || topicId;
      }
    }

    // Traverse up to Topic
    const topicSnap = await db.collection('topics').doc(topicId).get();
    if (!topicSnap.exists) {
      throw new AppError('Topic not found', 404);
    }
    const topicData = topicSnap.data() as ITopic;

    const subjectSnap = await db.collection('subjects').doc(topicData.subjectId).get();
    if (!subjectSnap.exists) {
      throw new AppError('Subject not found', 404);
    }
    const subjectData = subjectSnap.data() as ISubject;

    // 3. Subject Default
    if (subjectData.defaultStaffId) {
      return { staffId: subjectData.defaultStaffId, overrideLevel: 'subject' };
    }

    // Traverse up to Course
    const courseSnap = await db.collection('courses').doc(subjectData.courseId).get();
    if (!courseSnap.exists) {
      throw new AppError('Course not found', 404);
    }
    const courseData = courseSnap.data() as ICourse;

    // 4. Course Default
    if (courseData.courseStaffId) {
      return { staffId: courseData.courseStaffId, overrideLevel: 'course' };
    }

    // 5. No Staff Assigned
    return { staffId: null, overrideLevel: 'none' };
  }

  /**
   * Checks if a specific staff member is strictly assigned to this class.
   */
  async isAssigned(classId: string, staffId: string): Promise<boolean> {
    const assignment = await this.getResponsibleStaff(classId);
    return assignment.staffId === staffId;
  }

  /**
   * Evaluates if the staff member is authorized to conduct this class.
   * This might involve `isAssigned` plus checking if they are a super_admin or have explicit temporary overrides.
   */
  async canConductClass(classId: string, staffId: string, userRoles: string[] = []): Promise<boolean> {
    if (userRoles.includes('super_admin') || userRoles.includes('admin')) return true;

    const assigned = await this.isAssigned(classId, staffId);
    if (assigned) return true;

    // Note: Future logic for "Teaching Assistants" or "Guest Faculty" would go here.
    return false;
  }

  /**
   * Placeholder for future teaching assistants
   */
  async getTeachingAssistants(classId: string): Promise<string[]> {
    return []; // Not implemented in Phase 1
  }
}

export const teachingAssignmentService = new TeachingAssignmentService();
