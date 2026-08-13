import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { liveAttendanceService } from './service';
import { AppError } from '../../core/errors/AppError';

// ─── Validation schemas ───────────────────────────────────────────────────────

const startSchema = z.object({
  liveSessionId: z.string(),
  classId: z.string(),
  lateThresholdMinutes: z.number().min(0).max(60).optional(),
  earlyLeaveThresholdPct: z.number().min(0).max(100).optional(),
  minAttendancePct: z.number().min(0).max(100).optional(),
});

const studentEventSchema = z.object({
  studentId: z.string().min(1),
});

// ─── Staff / Admin controllers ────────────────────────────────────────────────

/**
 * POST /live-attendance/start
 * Staff starts the attendance window for a live session.
 */
export const startAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = startSchema.parse(req.body);
    const { userId: staffId, tenantId, role } = req.user!;

    const session = await liveAttendanceService.startAttendance(
      body.liveSessionId,
      staffId,
      tenantId,
      body.classId,
      {
        lateThresholdMinutes: body.lateThresholdMinutes,
        earlyLeaveThresholdPct: body.earlyLeaveThresholdPct,
        minAttendancePct: body.minAttendancePct,
      },
      role
    );

    res.status(201).json({ status: 'success', data: session });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /live-attendance/:sessionId/end
 * Staff ends the attendance window. Calculates summaries.
 */
export const endAttendance = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { userId: staffId, role } = req.user!;

    const session = await liveAttendanceService.endAttendance(sessionId, staffId as string, role);
    res.status(200).json({ status: 'success', data: session });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /live-attendance/:liveSessionId/active
 * Returns the currently active LAMS session (or null).
 * Used by staff on page load for crash recovery.
 */
export const getActiveSession = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const liveSessionId = req.params.liveSessionId as string;
    const session = await liveAttendanceService.getActiveSession(liveSessionId);
    res.status(200).json({ status: 'success', data: session });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /live-attendance/:sessionId/summary
 * Returns attendance summaries for all students in a session.
 */
export const getSessionSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const summaries = await liveAttendanceService.getSessionSummary(sessionId);
    res.status(200).json({ status: 'success', data: summaries });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /live-attendance/:sessionId/logs
 * Returns raw join/leave logs for a session (admin analytics).
 */
export const getSessionLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const logs = await liveAttendanceService.getLiveLogs(sessionId);
    res.status(200).json({ status: 'success', data: logs });
  } catch (err) {
    next(err);
  }
};

// ─── Student controllers ──────────────────────────────────────────────────────

/**
 * POST /live-attendance/:sessionId/join
 * Student joins the attendance-tracked live session.
 */
export const studentJoin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { userId: studentId } = req.user!;

    const log = await liveAttendanceService.logStudentJoin(sessionId, studentId as string);
    res.status(200).json({ status: 'success', data: log });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /live-attendance/:sessionId/leave
 * Student leaves / closes the live stream.
 */
export const studentLeave = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.params.sessionId as string;
    const { userId: studentId } = req.user!;

    await liveAttendanceService.logStudentLeave(sessionId, studentId as string);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};
