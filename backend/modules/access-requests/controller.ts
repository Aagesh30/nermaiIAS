import { Request, Response, NextFunction } from 'express';
import { AccessRequestService } from './service';
import { AppError } from '../../core/errors/AppError';

const service = new AccessRequestService();

const handle = (fn: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

// ─── Student: Create Request ─────────────────────────────────────────────────

export const createRequest = handle(async (req) => {
  const studentId = req.user?.userId;
  if (!studentId) throw new AppError('Unauthorized', 401);

  const { batchId, requestType, contentId, contentName, reason } = req.body;
  if (!requestType || !contentId || !reason) throw new AppError('Missing required fields', 400);

  const result = await service.createRequest(
    studentId, batchId || null, requestType, contentId, contentName || '', reason
  );
  return { success: true, data: result };
});

// ─── Student: My Requests ────────────────────────────────────────────────────

export const getMyRequests = handle(async (req) => {
  const studentId = req.user?.userId;
  if (!studentId) throw new AppError('Unauthorized', 401);
  return { success: true, data: await service.getMyRequests(studentId) };
});

// ─── Admin: List Pending ─────────────────────────────────────────────────────

export const listPendingRequests = handle(async (req) => {
  const { batchType, requestType } = req.query as any;
  return { success: true, data: await service.listPendingRequests({ batchType, requestType }) };
});

// ─── Admin: Approve ──────────────────────────────────────────────────────────

export const approveRequest = handle(async (req) => {
  const adminId = req.user?.userId;
  if (!adminId) throw new AppError('Unauthorized', 401);

  const { requestId } = req.params;
  const requestIdStr = requestId as string;
  const { durationHours, ignoreLimit, partialSelection } = req.body;

  return service.approveRequest(
    requestIdStr, adminId,
    durationHours !== undefined ? (Number(durationHours) || null) : null,
    ignoreLimit === true,
    Array.isArray(partialSelection) ? partialSelection : undefined
  );
});

// ─── Admin: Reject ───────────────────────────────────────────────────────────

export const rejectRequest = handle(async (req) => {
  const adminId = req.user?.userId;
  if (!adminId) throw new AppError('Unauthorized', 401);

  const { requestId } = req.params;
  const requestIdStr = requestId as string;
  const { reason } = req.body;
  if (!reason) throw new AppError('Rejection reason is required', 400);

  return service.rejectRequest(requestIdStr, adminId, reason as string);
});

// ─── Admin: Bulk Reject ──────────────────────────────────────────────────────

export const bulkReject = handle(async (req) => {
  const { requestIds, reason } = req.body;
  const adminId = (req as any).user?.id || 'admin';
  if (!requestIds || !Array.isArray(requestIds)) throw new AppError('requestIds array is required', 400);
  if (!reason) throw new AppError('Rejection reason is required', 400);

  return service.bulkReject(requestIds, adminId, reason as string);
});

// ─── Admin: Bulk Approve ─────────────────────────────────────────────────────

export const bulkApprove = handle(async (req) => {
  const adminId = req.user?.userId;
  if (!adminId) throw new AppError('Unauthorized', 401);

  const { 
    requestIds, 
    grantType = 'TEMPORARY', 
    durationHours, 
    consumeMonthlyUnits = true, 
    respectMonthlyLimit = true, 
    presetId = null, 
    overrideLimit = false 
  } = req.body;

  if (!Array.isArray(requestIds) || requestIds.length === 0) {
    throw new AppError('requestIds must be a non-empty array', 400);
  }

  return service.bulkApprove(
    requestIds, 
    adminId,
    grantType,
    durationHours !== undefined ? (Number(durationHours) || null) : null,
    consumeMonthlyUnits,
    respectMonthlyLimit,
    presetId,
    overrideLimit
  );
});

// ─── Admin: List Temporary Grants ────────────────────────────────────────────

export const listTemporaryGrants = handle(async () => {
  return { success: true, data: await service.listTemporaryGrants() };
});

// ─── Admin: Extend Grant ─────────────────────────────────────────────────────

export const extendGrant = handle(async (req) => {
  const adminId = req.user?.userId;
  if (!adminId) throw new AppError('Unauthorized', 401);

  const { grantId } = req.params;
  const grantIdStr = grantId as string;
  const { additionalHours } = req.body;
  if (!additionalHours) throw new AppError('additionalHours is required', 400);

  return service.extendGrant(grantIdStr, adminId, Number(additionalHours));
});

// ─── Admin: Revoke Grant ─────────────────────────────────────────────────────

export const revokeGrant = handle(async (req) => {
  const adminId = req.user?.userId;
  if (!adminId) throw new AppError('Unauthorized', 401);

  const { grantId } = req.params;
  const grantIdStr = grantId as string;
  const { reason } = req.body;
  if (!reason) throw new AppError('Revocation reason is required', 400);

  return service.revokeGrant(grantIdStr, adminId, reason as string);
});

// ─── Admin: Analytics ────────────────────────────────────────────────────────

export const getAnalytics = handle(async (req) => {
  const adminRoles = ['super_admin', 'admin', 'staff'];
  if (!adminRoles.includes(req.user?.role || '')) throw new AppError('Unauthorized', 403);
  return { success: true, data: await service.getAnalytics() };
});

export const exportAnalytics = handle(async (req) => {
  const adminRoles = ['super_admin', 'admin', 'staff'];
  if (!adminRoles.includes(req.user?.role || '')) throw new AppError('Unauthorized', 403);
  // Simple mock export payload for now
  return { success: true, data: "Mock CSV/PDF Export URL" };
});

// ─── Admin: Access Request History ───────────────────────────────────────────

export const listHistory = handle(async (req) => {
  const { status } = req.query as any;
  const validStatuses = ['APPROVED', 'REJECTED'];
  const statusFilter = validStatuses.includes(status) ? status : undefined;
  return { success: true, data: await service.listHistory(statusFilter) };
});

// ─── Admin: Permanent Grants ─────────────────────────────────────────────────

export const listPermanentGrants = handle(async () => {
  return { success: true, data: await service.listPermanentGrants() };
});

// ─── Admin: Convert Grant ─────────────────────────────────────────────────────

export const convertGrant = handle(async (req) => {
  const adminId = req.user?.userId;
  if (!adminId) throw new AppError('Unauthorized', 401);

  const { grantId } = req.params;
  const { newType, durationHours } = req.body;
  if (!newType || !['TEMPORARY', 'PERMANENT'].includes(newType)) {
    throw new AppError('newType must be TEMPORARY or PERMANENT', 400);
  }
  if (newType === 'TEMPORARY' && !durationHours) {
    throw new AppError('durationHours is required for TEMPORARY conversion', 400);
  }

  return service.convertGrant(grantId as string, adminId, newType, durationHours ? Number(durationHours) : undefined);
});
