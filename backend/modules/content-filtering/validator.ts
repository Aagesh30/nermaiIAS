import { z } from 'zod';

export const attachRuleSchema = z.object({
  entityType: z.enum(['resource', 'video', 'test']),
  entityId: z.string().min(1),
  accessType: z.enum(['premium', 'free', 'batch', 'individual']),
  targetRefId: z.string().nullable().optional(),
});

export const bulkAttachSchema = z.object({
  entityType: z.enum(['resource', 'video', 'test']),
  entityId: z.string().min(1),
  rules: z.array(z.object({
    accessType: z.enum(['premium', 'free', 'batch', 'individual']),
    targetRefId: z.string().nullable().optional(),
  })).min(1),
});
