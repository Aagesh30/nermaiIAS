import { Request, Response, NextFunction } from 'express';
import { AdminApprovalService } from './service';
import { AppError } from '../../core/errors/AppError';

const service = new AdminApprovalService();

const handle = (fn: (req: Request, res: Response) => Promise<any>) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await fn(req, res);
      res.json(result);
    } catch (err) {
      next(err);
    }
  };

// ─── Submit Approval Request ──────────────────────────────────────────────────
// Called internally by requirePermission middleware (edit_on_approval)
// POST /admin-approvals
export const submitRequest = handle(async (req) => {
  if (!req.user) throw new AppError('Unauthorized', 401);

  const {
    featureKey,
    actionType,
    targetCollection,
    docId,
    proposedPayload,
  } = req.body;

  if (!featureKey || !actionType || !proposedPayload) {
    throw new AppError('featureKey, actionType, and proposedPayload are required', 400);
  }

  if (!['create', 'edit', 'delete'].includes(actionType)) {
    throw new AppError("actionType must be 'create', 'edit', or 'delete'", 400);
  }

  const result = await service.submitRequest({
    featureKey,
    actionType,
    targetCollection: targetCollection || featureKey,
    docId: docId || null,
    proposedPayload,
    requestedBy: req.user.name || req.user.username || req.user.userId,
    requestedByUserId: req.user.userId,
    requestedByRole: req.user.role || 'unknown',
  });

  return {
    success: true,
    approvalRequired: true,
    requestId: result.id,
    message: 'Your request has been submitted to the Super Admin for approval.',
    data: result,
  };
});

// ─── List Pending Requests (super admin only) ─────────────────────────────────
// GET /admin-approvals/pending
export const listPending = handle(async (req) => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  if (!['super_admin', 'developer'].includes(req.user.role || '')) {
    throw new AppError('Forbidden: Super Admin only', 403);
  }

  const data = await service.listPending();
  return { success: true, data };
});

// ─── Approve & Apply ──────────────────────────────────────────────────────────
// POST /admin-approvals/:id/approve
export const approveRequest = handle(async (req) => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  if (!['super_admin', 'developer'].includes(req.user.role || '')) {
    throw new AppError('Forbidden: Super Admin only', 403);
  }

  const { id } = req.params;
  const result = await service.approveAndApply(id, req.user.userId);
  return result;
});

// ─── Reject ───────────────────────────────────────────────────────────────────
// POST /admin-approvals/:id/reject
export const rejectRequest = handle(async (req) => {
  if (!req.user) throw new AppError('Unauthorized', 401);
  if (!['super_admin', 'developer'].includes(req.user.role || '')) {
    throw new AppError('Forbidden: Super Admin only', 403);
  }

  const { id } = req.params;
  const { reason } = req.body;
  if (!reason) throw new AppError('Rejection reason is required', 400);

  const result = await service.rejectRequest(id, req.user.userId, reason);
  return result;
});
