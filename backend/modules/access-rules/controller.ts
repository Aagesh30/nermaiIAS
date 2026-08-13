import { Request, Response, NextFunction } from 'express';
import { AccessRulesService } from './service';
import { EntityType } from './types';
import {
  SetPermissionSchema, DetectConflictSchema, SubmitRequestSchema,
  ApproveRequestSchema, BulkApproveSchema, ApproveByFilterSchema,
  SetBatchCapabilitiesSchema, SaveTemplateSchema, ApplyTemplateSchema,
} from './validator';

const svc = new AccessRulesService();

/** Express params are `string | string[]` — cast to string for safety. */
const p = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

// ─── Admin Controllers ────────────────────────────────────────────────────────

export const setEntityPermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = p(req.params.type);
    const id   = p(req.params.id);
    const body = SetPermissionSchema.parse(req.body);
    const admin = (req as any).user;

    await svc.setEntityPermission(id, type as EntityType, body, admin.userId, admin.tenantId);
    res.status(200).json({ status: 'success', message: 'Permission updated.' });
  } catch (err) { next(err); }
};

export const getEffectivePermission = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = p(req.params.type);
    const id   = p(req.params.id);
    const admin = (req as any).user;
    const perm = await svc.resolveEffectivePermission(id, type as EntityType, admin.tenantId);
    res.status(200).json({ status: 'success', data: perm });
  } catch (err) { next(err); }
};

export const detectConflict = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { parentId, childVisibility } = DetectConflictSchema.parse(req.query);
    const admin = (req as any).user;
    const conflict = await svc.detectConflict(p(parentId as any), childVisibility, admin.tenantId);
    res.status(200).json({ status: 'success', data: conflict });
  } catch (err) { next(err); }
};

export const getPermissionMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = p(req.params.courseId);
    const admin = (req as any).user;
    const matrix = await svc.getPermissionMatrix(courseId, admin.tenantId);
    res.status(200).json({ status: 'success', data: matrix });
  } catch (err) { next(err); }
};

export const getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = p(req.params.entityId);
    const log = await svc.getAuditLog(entityId);
    res.status(200).json({ status: 'success', data: log });
  } catch (err) { next(err); }
};

export const listAccessRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = (req as any).user;
    const { status, entityId, studentId, limit, startAfter } = req.query as any;
    const requests = await svc.listAccessRequests(admin.tenantId, {
      status,
      entityId,
      studentId,
      limit: limit ? parseInt(limit) : 50,
      startAfter,
    });
    res.status(200).json({ status: 'success', data: requests });
  } catch (err) { next(err); }
};

export const approveRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req.params.id);
    const { grantExpiresAt } = ApproveRequestSchema.parse(req.body);
    const admin = (req as any).user;
    await svc.approveRequest(id, admin.userId, admin.tenantId, grantExpiresAt);
    res.status(200).json({ status: 'success', message: 'Request approved.' });
  } catch (err) { next(err); }
};

export const rejectRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req.params.id);
    const admin = (req as any).user;
    await svc.rejectRequest(id, admin.userId, admin.tenantId);
    res.status(200).json({ status: 'success', message: 'Request rejected.' });
  } catch (err) { next(err); }
};

export const bulkApproveRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { requestIds, grantExpiresAt } = BulkApproveSchema.parse(req.body);
    const admin = (req as any).user;
    const result = await svc.bulkApproveRequests(requestIds, admin.userId, admin.tenantId, grantExpiresAt);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
};

export const approveByFilter = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const entityId = p(req.params.entityId);
    const filter = ApproveByFilterSchema.parse(req.body);
    const admin = (req as any).user;
    const result = await svc.approveByFilter(entityId, filter, admin.userId, admin.tenantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
};

export const setBatchCapabilities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batchId = p(req.params.batchId);
    const data = SetBatchCapabilitiesSchema.parse(req.body);
    const admin = (req as any).user;
    await svc.setBatchCapabilities(batchId, data, admin.userId, admin.tenantId);
    res.status(200).json({ status: 'success', message: 'Batch capabilities updated.' });
  } catch (err) { next(err); }
};

export const getBatchCapabilities = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const batchId = p(req.params.batchId);
    const admin = (req as any).user;
    const caps = await svc.getBatchCapabilities(batchId, admin.tenantId);
    res.status(200).json({ status: 'success', data: caps });
  } catch (err) { next(err); }
};

export const listTemplates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const admin = (req as any).user;
    const templates = await svc.listTemplates(admin.tenantId);
    res.status(200).json({ status: 'success', data: templates });
  } catch (err) { next(err); }
};

export const saveTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = SaveTemplateSchema.parse(req.body);
    const admin = (req as any).user;
    const id = await svc.saveTemplate(body.name, body, admin.userId, admin.tenantId);
    res.status(201).json({ status: 'success', data: { id } });
  } catch (err) { next(err); }
};

export const applyTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const templateId = p(req.params.templateId);
    const type       = p(req.params.type);
    const entityId   = p(req.params.entityId);
    const { cascade } = ApplyTemplateSchema.parse(req.body);
    const admin = (req as any).user;
    await svc.applyTemplate(entityId, type as EntityType, templateId, cascade, admin.userId, admin.tenantId);
    res.status(200).json({ status: 'success', message: 'Template applied.' });
  } catch (err) { next(err); }
};

// ─── Student Controllers ──────────────────────────────────────────────────────

export const getLockStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = p(req.params.type);
    const id   = p(req.params.id);
    const student = (req as any).user;
    const result = await svc.getLockStatus(student.userId, id, type as EntityType, student.tenantId);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) { next(err); }
};

export const submitAccessRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = p(req.params.id);
    const body = SubmitRequestSchema.parse(req.body);
    const student = (req as any).user;
    const requestId = await svc.submitAccessRequest(
      student.userId, id, body.entityType, body.entityName,
      body.reason, body.customReason, student.tenantId,
    );
    res.status(201).json({ status: 'success', data: { requestId } });
  } catch (err) { next(err); }
};

export const getMyAccessRequests = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const student = (req as any).user;
    const requests = await svc.getMyAccessRequests(student.userId, student.tenantId);
    res.status(200).json({ status: 'success', data: requests });
  } catch (err) { next(err); }
};
