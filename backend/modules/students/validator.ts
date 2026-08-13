import { z } from 'zod';

export const updateStudentSchema = z.object({
  displayName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phoneNumber: z.string().optional(),
  rollNo: z.string().optional(),
  accessTier: z.enum(['free', 'paid', 'scholarship', 'blocked']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  currentBatchId: z.string().optional(),
});

export const enrollStudentSchema = z.object({
  studentId: z.string().min(1, 'Student ID is required'),
  courseId: z.string().min(1, 'Course ID is required'),
  validUntil: z.string().datetime().optional(), // ISO date string
});

export const updateEnrollmentSchema = z.object({
  status: z.enum(['active', 'completed', 'dropped', 'suspended']).optional(),
  validUntil: z.string().datetime().optional(),
  progressPercentage: z.number().min(0).max(100).optional(),
});

export const createBatchSchema = z.object({
  name: z.string().min(3),
  courseId: z.string().min(1),
  maxCapacity: z.number().int().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['upcoming', 'active', 'completed']).default('upcoming'),
});

export const updateBatchSchema = createBatchSchema.partial();
