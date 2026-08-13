import { z } from 'zod';

export const createCourseSchema = z.object({
  name: z.string().min(1, 'Course name is required'),
  description: z.string().default(''),
  price: z.number().min(0, 'Price must be positive'),
  visibility: z.enum(['public', 'private', 'restricted']).default('private'),
  assignedStaffIds: z.array(z.string()).default([]),
  assignedStaff: z.array(z.object({
    userId: z.string(),
    staffRole: z.string(),
    assignedBy: z.string(),
    assignedAt: z.string(),
  })).default([]),
});

export const updateCourseSchema = createCourseSchema.partial();

export const createSubjectSchema = z.object({
  courseId: z.string().min(1, 'courseId is required'),
  name: z.string().min(1, 'Subject name is required'),
  order: z.number().int().default(0),
  defaultStaffId: z.string().optional(),
});

export const updateSubjectSchema = createSubjectSchema.partial();

export const createTopicSchema = z.object({
  subjectId: z.string().min(1, 'subjectId is required'),
  name: z.string().min(1, 'Topic name is required'),
  order: z.number().int().default(0),
  progress: z.number().min(0).max(100).optional(),
  // Direct topic tracking fields (for topics without subtopics)
  coverageStatus: z.string().optional(),
  percentCovered: z.number().optional(),
  facultyName: z.string().optional(),
  dateOfClass: z.string().optional(),
  durationHrs: z.number().optional(),
  remarks: z.string().optional(),
});

export const updateTopicSchema = createTopicSchema.partial();

export const createSubtopicSchema = z.object({
  topicId: z.string().min(1, 'topicId is required'),
  name: z.string().min(1, 'Subtopic name is required'),
  description: z.string().optional(),
  order: z.number().int().default(0),
  defaultStaffId: z.string().optional(),
  completed: z.boolean().optional(),
  // Tracking fields
  facultyName: z.string().optional(),
  dateOfClass: z.string().optional(),
  classNo: z.number().optional(),
  durationHrs: z.number().optional(),
  mode: z.string().optional(),
  batchSection: z.string().optional(),
  coverageStatus: z.string().optional(),
  percentCovered: z.number().optional(),
  testConducted: z.string().optional(),
  testDate: z.string().optional(),
  avgScore: z.number().optional(),
  remarks: z.string().optional(),
});

export const updateSubtopicSchema = createSubtopicSchema.partial();

const baseClassSchema = z.object({
  topicId: z.string().min(1, 'topicId is required'),
  subtopicId: z.string().optional(),
  title: z.string().min(1, 'Class title is required'),
  teacherId: z.string().optional(),
  order: z.number().int().default(0),
  accessLevel: z.enum(['free', 'premium', 'batch']).default('premium'),
  targetBatchIds: z.array(z.string()).optional().default([]),
  attendance: z.object({
    mode: z.enum(['percentage', 'fixed_minutes', 'full', 'manual', 'first_join_only', 'teacher_marked', 'hybrid']),
    value: z.number().min(0),
    version: z.number().int().default(1),
    lockAfterStart: z.boolean().default(true),
    allowEditBeforeStart: z.boolean().default(true)
  }).optional() // Optional for backward compatibility before migration
});

export const createClassSchema = z.discriminatedUnion('classType', [
  baseClassSchema.extend({
    classType: z.literal('recorded'),
    youtubeUrl: z.string().url().regex(/(youtube\.com|youtu\.be)/, 'Must be a valid YouTube URL'),
  }),
  baseClassSchema.extend({
    classType: z.literal('live')
  })
]);

export const updateClassSchema = z.object({
  topicId: z.string().optional(),
  subtopicId: z.string().optional(),
  title: z.string().optional(),
  teacherId: z.string().optional(),
  order: z.number().int().optional(),
  classType: z.enum(['recorded', 'live']).optional(),
  accessLevel: z.enum(['free', 'premium', 'batch']).optional(),
  targetBatchIds: z.array(z.string()).optional(),
  youtubeUrl: z.string().url().optional(),
  attendance: z.object({
    mode: z.enum(['percentage', 'fixed_minutes', 'full', 'manual', 'first_join_only', 'teacher_marked', 'hybrid']),
    value: z.number().min(0),
    version: z.number().int(),
    lockAfterStart: z.boolean(),
    allowEditBeforeStart: z.boolean()
  }).optional(),
});

export const extendClassSchema = z.object({
  minutes: z.union([
    z.literal(5),
    z.literal(10),
    z.literal(15),
    z.literal(30),
    z.literal(45),
    z.literal(60)
  ]),
  reason: z.string().optional(),
});

