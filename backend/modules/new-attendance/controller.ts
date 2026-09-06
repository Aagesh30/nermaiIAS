import { Request, Response } from 'express';
import { NewAttendanceService } from './service';

export class NewAttendanceController {

  /** POST /new-attendance/join — called by student on Zoom class join */
  static async recordJoin(req: Request, res: Response) {
    try {
      const { liveSessionId } = req.body;
      const studentId = (req as any).user?.studentId || (req as any).user?.userId || (req as any).user?.id;
      console.log('[NEW-ATT-DEBUG] recordJoin — req.body:', req.body);
      console.log('[NEW-ATT-DEBUG] recordJoin — resolved studentId:', studentId);
      console.log('[NEW-ATT-DEBUG] recordJoin — liveSessionId:', liveSessionId);
      console.log('[NEW-ATT-DEBUG] recordJoin — req.user raw:', (req as any).user);
      if (!liveSessionId || !studentId) {
        console.warn('[NEW-ATT-DEBUG] recordJoin — MISSING liveSessionId or studentId, returning 400');
        return res.status(400).json({ success: false, message: 'liveSessionId and auth required' });
      }
      // Non-blocking: respond immediately, write in background
      NewAttendanceService.recordJoin(liveSessionId, studentId).catch(err =>
        console.error('[NewAttendanceController] recordJoin error:', err)
      );
      console.log('[NEW-ATT-DEBUG] recordJoin — accepted, writing to Firestore in background');
      return res.status(200).json({ success: true });
    } catch (error: any) {
      console.error('[NEW-ATT-DEBUG] recordJoin — caught error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /** GET /new-attendance/check/:sessionId — check if student joined session */
  static async checkStudentAttendance(req: Request, res: Response) {
    try {
      const { sessionId } = req.params;
      const studentId = (req as any).user?.studentId || (req as any).user?.userId || (req as any).user?.id;
      console.log('[NEW-ATT-DEBUG] checkStudentAttendance — sessionId from params:', sessionId);
      console.log('[NEW-ATT-DEBUG] checkStudentAttendance — resolved studentId:', studentId);
      console.log('[NEW-ATT-DEBUG] checkStudentAttendance — req.user raw:', (req as any).user);
      if (!sessionId || !studentId) {
        console.warn('[NEW-ATT-DEBUG] checkStudentAttendance — missing sessionId or studentId, returning {joined:false}');
        return res.status(200).json({ success: true, data: { joined: false, joinedAt: null } });
      }
      const result = await NewAttendanceService.checkStudentAttendance(sessionId, studentId);
      console.log('[NEW-ATT-DEBUG] checkStudentAttendance — Firestore result:', result);
      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      console.error('[NEW-ATT-DEBUG] checkStudentAttendance — caught error:', error.message);
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /** GET /new-attendance/my-attendance — student history */
  static async getMyAttendance(req: Request, res: Response) {
    try {
      const studentId = (req as any).user?.studentId || (req as any).user?.userId || (req as any).user?.id;
      if (!studentId) {
        return res.status(400).json({ success: false, message: 'auth required' });
      }
      const records = await NewAttendanceService.getMyAttendance(studentId);
      return res.status(200).json({ success: true, data: records });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /** GET /new-attendance/session/:sessionId — admin reads attendance */
  static async getBySession(req: Request, res: Response) {
    try {
      const summary = await NewAttendanceService.getAttendanceBySession(req.params.sessionId);
      return res.status(200).json({ success: true, data: summary });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }

  /** GET /new-attendance/admin/records — admin full report view */
  static async getAdminRecords(req: Request, res: Response) {
    try {
      const records = await NewAttendanceService.getAdminRecords(req.query);
      return res.status(200).json({ success: true, data: records });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: error.message });
    }
  }
}

