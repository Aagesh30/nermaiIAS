import { Router } from 'express';
import { NewAttendanceController } from './controller';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';

const router = Router();

router.post('/join', requireAuth, NewAttendanceController.recordJoin);
router.get('/check/:sessionId', requireAuth, NewAttendanceController.checkStudentAttendance);
router.get('/my-attendance', requireAuth, NewAttendanceController.getMyAttendance);

router.get(
  '/session/:sessionId',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']),
  NewAttendanceController.getBySession
);

router.get(
  '/admin/records',
  requireAuth,
  requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']),
  NewAttendanceController.getAdminRecords
);

export default router;

