import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import * as CourseController from './controller';

const applyAuth = (router: Router) => {
  router.use(requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher']));
};

export const courseRoutes = Router();
courseRoutes.use(requireAuth);

// Allow students to list all courses for dropdowns
courseRoutes.get('/', requireRole(['super_admin', 'admin', 'staff', 'teacher', 'student']), CourseController.listCourses);
courseRoutes.post('/', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.createCourse);
courseRoutes.post('/syllabus/sync', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.syncSyllabusFromExcel);

// Students can read specific courses and their subjects
courseRoutes.get('/:id', requireRole(['super_admin', 'staff', 'teacher', 'student']), CourseController.getCourse);
courseRoutes.get('/:courseId/subjects', requireRole(['super_admin', 'staff', 'teacher', 'student']), CourseController.listSubjectsByCourse);

courseRoutes.put('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.updateCourse);
courseRoutes.delete('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.deleteCourse);
courseRoutes.post('/:courseId/subjects', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.createSubject);

courseRoutes.post('/:id/assign-staff', requireRole(['super_admin', 'admin']), CourseController.assignStaff);
courseRoutes.delete('/:id/unassign-staff/:staffId', requireRole(['super_admin', 'admin']), CourseController.unassignStaff);
courseRoutes.get('/:id/staff', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.getAssignedStaff);

export const subjectRoutes = Router();
subjectRoutes.use(requireAuth);
subjectRoutes.get('/', requireRole(['super_admin', 'admin', 'staff', 'teacher', 'student']), CourseController.listAllSubjects);
subjectRoutes.get('/:subjectId/topics', requireRole(['super_admin', 'staff', 'teacher', 'student']), CourseController.listTopicsBySubject);

subjectRoutes.put('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.updateSubject);
subjectRoutes.delete('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.deleteSubject);
subjectRoutes.post('/:subjectId/topics', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.createTopic);

export const topicRoutes = Router();
topicRoutes.use(requireAuth);
topicRoutes.get('/', requireRole(['super_admin', 'admin', 'staff', 'teacher', 'student']), CourseController.listAllTopics);
topicRoutes.get('/:topicId/classes', requireRole(['super_admin', 'staff', 'teacher', 'student']), CourseController.listClassesByTopic);
topicRoutes.get('/:topicId/subtopics', requireRole(['super_admin', 'staff', 'teacher', 'student']), CourseController.listSubtopicsByTopic);
topicRoutes.post('/:topicId/subtopics', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.createSubtopic);

topicRoutes.put('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.updateTopic);
topicRoutes.delete('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.deleteTopic);
topicRoutes.post('/:topicId/classes', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.createClass);

export const subtopicRoutes = Router();
subtopicRoutes.use(requireAuth);
subtopicRoutes.get('/', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.listAllSubtopics);
subtopicRoutes.get('/:subtopicId/classes', requireRole(['super_admin', 'staff', 'teacher', 'student']), CourseController.listClassesBySubtopic);
subtopicRoutes.put('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.updateSubtopic);
subtopicRoutes.delete('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.deleteSubtopic);

export const classRoutes = Router();
classRoutes.use(requireAuth);
// Access route available to all authenticated users (students)
classRoutes.get('/:id/access', requireRole(['super_admin', 'staff', 'teacher', 'student']), CourseController.getClassPlaybackAccess);

classRoutes.get('/', requireRole(['super_admin', 'admin', 'staff', 'teacher', 'student']), CourseController.listAllClasses);
classRoutes.put('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.updateClass);
classRoutes.put('/:id/recording', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.uploadClassRecording);
classRoutes.delete('/:id', requireRole(['super_admin', 'admin', 'staff', 'teacher']), CourseController.deleteClass);

// Re-export with the names that Folder 1's index.ts expects
export const CoursesRoutes = courseRoutes;
export const SubjectRoutes = subjectRoutes;
export const TopicRoutes = topicRoutes;
export const SubtopicRoutes = subtopicRoutes;
export const ClassRoutes = classRoutes;
