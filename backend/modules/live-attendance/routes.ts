import { Router } from 'express';
import { requireAuth, requireRole } from '../../core/middleware/auth.middleware';
import * as LamsController from './controller';

export const liveAttendanceRoutes = Router();

// ─── Staff routes (teachers/admins) ──────────────────────────────────────────
const staffRouter = Router();
staffRouter.use(requireAuth, requireRole(['super_admin', 'admin', 'staff', 'teacher']));

// Start attendance window
staffRouter.post('/start', LamsController.startAttendance);

// End attendance window
staffRouter.post('/:sessionId/end', LamsController.endAttendance);

// Get active session (for crash recovery on page load)
staffRouter.get('/:liveSessionId/active', LamsController.getActiveSession);

// Get finalized summary
staffRouter.get('/:sessionId/summary', LamsController.getSessionSummary);

// Get raw logs
staffRouter.get('/:sessionId/logs', LamsController.getSessionLogs);

liveAttendanceRoutes.use('/staff', staffRouter);

// ─── Student routes ───────────────────────────────────────────────────────────
const studentRouter = Router();
studentRouter.use(requireAuth);

// Student joins live attendance session
studentRouter.post('/:sessionId/join', LamsController.studentJoin);

// Student leaves live attendance session
studentRouter.post('/:sessionId/leave', LamsController.studentLeave);

liveAttendanceRoutes.use('/student', studentRouter);

// ─── Shared admin read routes (no sub-prefix) ─────────────────────────────────
// Active session check — used by both staff dashboard and student-facing class page
liveAttendanceRoutes.get(
  '/active/:liveSessionId',
  requireAuth,
  LamsController.getActiveSession
);
