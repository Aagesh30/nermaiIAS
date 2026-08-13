import { z } from 'zod';

export const createFaqSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  category: z.string().default('General'),
  order: z.number().int().default(0),
  status: z.enum(['published', 'draft']).default('draft'),
});

export const updateFaqSchema = createFaqSchema.partial();
