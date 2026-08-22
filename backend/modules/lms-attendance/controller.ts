import { Request, Response } from 'express';
import { lmsAttendanceService } from './service';
import { AppError } from '../../core/errors/AppError';

const ok = (res: Response, data: any, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, err: any) =>
  res.status(err?.statusCode || 500).json({ success: false, message: err?.message || 'Server error' });

// ── STUDENT ───────────────────────────────────────────────────────────────────

export async function recordJoin(req: Request, res: Response) {
  try {
    const { userId, name } = req.user!;
    const { classId, className, courseId, courseName, batchName } = req.body;
    if (!classId) throw new AppError('classId required', 400);

    const record = await lmsAttendanceService.recordJoin(
      userId, name || 'Student', classId,
      className || '', courseId || '', courseName || '', batchName || ''
    );
    ok(res, record, 201);
  } catch (err) { fail(res, err); }
}

export async function submitAttendance(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { classId } = req.body;
    if (!classId) throw new AppError('classId required', 400);

    const record = await lmsAttendanceService.submitAttendance(userId, classId);
    ok(res, record);
  } catch (err) { fail(res, err); }
}

export async function getMyAttendance(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const result = await lmsAttendanceService.getMyAttendance(userId);
    ok(res, result);
  } catch (err) { fail(res, err); }
}

export async function getClassAttendance(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { classId } = req.params;
    const record = await lmsAttendanceService.getClassAttendance(userId, classId);
    ok(res, record || null);
  } catch (err) { fail(res, err); }
}

export async function requestCorrection(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason || reason.trim().length < 5) throw new AppError('Please provide a reason (min 5 chars)', 400);

    const corr = await lmsAttendanceService.requestCorrection(id, userId, reason.trim());
    ok(res, corr, 201);
  } catch (err) { fail(res, err); }
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────

export async function adminListRecords(req: Request, res: Response) {
  try {
    const filters = req.query as any;
    const records = await lmsAttendanceService.adminListAll(filters);
    ok(res, records);
  } catch (err) { fail(res, err); }
}

export async function adminManualMark(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { id } = req.params;
    const { status, note } = req.body;
    if (!['PRESENT', 'ABSENT'].includes(status)) throw new AppError('status must be PRESENT or ABSENT', 400);

    const result = await lmsAttendanceService.adminManualMark(id, userId, status, note || '');
    ok(res, result);
  } catch (err) { fail(res, err); }
}

export async function adminListCorrections(req: Request, res: Response) {
  try {
    const filters = req.query as any;
    const records = await lmsAttendanceService.adminListCorrections(filters);
    ok(res, records);
  } catch (err) { fail(res, err); }
}

export async function adminReviewCorrection(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { id } = req.params;
    const { approve, note } = req.body;
    if (typeof approve !== 'boolean') throw new AppError('approve (boolean) required', 400);

    const result = await lmsAttendanceService.adminReviewCorrection(id, userId, approve, note || '');
    ok(res, result);
  } catch (err) { fail(res, err); }
}

export async function adminCloseClassAttendance(req: Request, res: Response) {
  try {
    const { userId } = req.user!;
    const { classId } = req.params;
    if (!classId) throw new AppError('classId required', 400);

    const result = await lmsAttendanceService.markClassAbsentOnEnd(classId, userId);
    ok(res, result);
  } catch (err) { fail(res, err); }
}

export async function adminGetClassSummary(req: Request, res: Response) {
  try {
    const { classId } = req.params;
    if (!classId) throw new AppError('classId required', 400);

    const result = await lmsAttendanceService.getClassAttendanceSummary(classId);
    ok(res, result);
  } catch (err) { fail(res, err); }
}
