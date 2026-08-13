import { z } from 'zod';

const visibilityModes = ['public', 'batch', 'student', 'mixed', 'hidden'] as const;
const entityTypes = ['course', 'subject', 'topic', 'class', 'resource', 'assignment', 'test', 'live_session'] as const;
const cascadeModes = ['this_only', 'inheriting_children', 'force_all'] as const;
const requestReasons = ['revision', 'missed_live', 'medical_leave', 'purchased_later', 'other'] as const;
const batchTypes = ['online', 'offline', 'recorded', 'free'] as const;

export const SetPermissionSchema = z.object({
  permissionMode: z.enum(['inherit', 'override']),
  visibility: z.enum(visibilityModes).optional(),
  targetBatchIds: z.array(z.string()).optional().default([]),
  targetStudentIds: z.array(z.string()).optional().default([]),
  parentId: z.string().optional(),
  unlocksAt: z.string().datetime({ offset: true }).optional(),
  cascade: z.enum(cascadeModes).optional().default('this_only'),
}).refine(d => d.permissionMode === 'inherit' || d.visibility !== undefined, {
  message: "visibility is required when permissionMode is 'override'",
});

export const DetectConflictSchema = z.object({
  parentId: z.string(),
  childVisibility: z.enum(visibilityModes),
});

export const SubmitRequestSchema = z.object({
  entityType: z.enum(entityTypes),
  entityName: z.string().min(1),
  reason: z.enum(requestReasons),
  customReason: z.string().max(500).optional(),
});

export const ApproveRequestSchema = z.object({
  grantExpiresAt: z.string().datetime({ offset: true }).optional(),
});

export const BulkApproveSchema = z.object({
  requestIds: z.array(z.string()).min(1).max(500),
  grantExpiresAt: z.string().datetime({ offset: true }).optional(),
});

export const ApproveByFilterSchema = z.object({
  batchId: z.string().optional(),
  joinedBefore: z.string().datetime({ offset: true }).optional(),
  attendanceAbove: z.number().min(0).max(100).optional(),
  studentIds: z.array(z.string()).optional(),
  grantExpiresAt: z.string().datetime({ offset: true }).optional(),
});

export const SetBatchCapabilitiesSchema = z.object({
  batchType: z.enum(batchTypes),
  canAccessLiveClasses: z.boolean(),
  canAccessRecordedClasses: z.boolean(),
  canAccessNotes: z.boolean(),
  canAccessAssignments: z.boolean(),
  canAccessTests: z.boolean(),
  canRequestRecording: z.boolean(),
});

export const SaveTemplateSchema = z.object({
  name: z.string().min(1).max(100),
  visibility: z.enum(visibilityModes),
  targetBatchIds: z.array(z.string()).optional().default([]),
  targetStudentIds: z.array(z.string()).optional().default([]),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export const ApplyTemplateSchema = z.object({
  cascade: z.enum(cascadeModes).default('this_only'),
});
