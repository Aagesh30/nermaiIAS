import { z } from 'zod';

export const updateProgressSchema = z.object({
  classId: z.string(),
  position: z.number().min(0),
  watchPercent: z.number().min(0).max(100).optional(),
  completed: z.boolean().default(false),
});
