import { Router } from 'express';
import { LiveSessionController } from './controller';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import { tokenRateLimiter } from '../../core/middleware/rateLimiter';

const router = Router();

// Staff & Student Routes
router.get('/providers/capabilities', requireAuth, LiveSessionController.getCapabilities);
router.get('/', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'student', 'contributor', 'management']), LiveSessionController.listSessions);
router.post('/create', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.createSession);
router.patch('/:id/edit', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.editSession);
router.post('/:id/reschedule', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.rescheduleSession);
router.post('/:id/cancel', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.cancelSession);
router.delete('/:id', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.deleteSession);
router.post('/:id/duplicate', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.duplicateSession);
router.post('/:id/archive', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.archiveSession);

router.post('/:id/start', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.startSession);
router.post('/:id/extend', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.extendSession);
router.post('/:id/end', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.endSession);
router.post('/:id/attendance/start', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.startAttendance);
router.post('/:id/attendance/end', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.endAttendance);
router.post('/:id/heartbeat', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.heartbeat);

router.post('/:id/staff/assign', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.assignStaff);
router.post('/:id/staff/remove', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.removeStaff);

// Student & Staff Routes
router.get('/class/:classId/join', requireAuth, LiveSessionController.joinClass);
router.get('/:id/join', requireAuth, LiveSessionController.joinSession);
router.get('/:id/state', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.getSessionState);
router.post('/:id/join-token', requireAuth, LiveSessionController.generateJoinToken);
router.get('/token/:token', tokenRateLimiter, LiveSessionController.validateJoinToken);
router.post('/:id/events', requireAuth, LiveSessionController.handleSdkEvent);
router.post('/:id/participants/heartbeat', requireAuth, LiveSessionController.studentHeartbeat);
router.get('/:id/participants', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.listParticipants);
router.patch('/:id/participants/:studentId', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.patchParticipant);

// Global Moderation Block Routes
router.get('/blocks', requireAuth, requireRole(['super_admin', 'admin', 'staff']), LiveSessionController.listGlobalBlocks);
router.post('/blocks/:studentId', requireAuth, requireRole(['super_admin', 'admin']), LiveSessionController.blockStudent);
router.delete('/blocks/:studentId', requireAuth, requireRole(['super_admin', 'admin']), LiveSessionController.unblockStudent);

// Diagnostic Route
router.get('/:id/zoom-diagnostics', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.getZoomDiagnostics);

router.get('/:id/attendance', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.getAttendance);

// NEW: End session with optional YouTube conversion
router.post('/:id/end-with-conversion', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher', 'contributor', 'management']), LiveSessionController.endSessionWithConversion);

// NEW: Get history of ended sessions for admin
router.get('/history/ended', requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher']), LiveSessionController.getSessionHistory);

export default router;
