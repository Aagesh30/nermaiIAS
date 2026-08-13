// @ts-nocheck
import { z } from 'zod';

export const interactionContextSchema = z.object({
  tenantId: z.string().min(1),
  contextType: z.enum([
    'live_class',
    'recorded_class',
    'course',
    'subject',
    'topic',
    'resource',
    'assignment',
    'announcement'
  ]),
  contextId: z.string().min(1),
  parentCourseId: z.string().optional(),
  parentSubjectId: z.string().optional(),
  parentTopicId: z.string().optional(),
});

export const interactionAttachmentSchema = z.object({
  type: z.enum(['image', 'pdf', 'audio', 'video']),
  url: z.string().url(),
  thumbnail: z.string().url().optional(),
  size: z.number().optional()
});

export const interactionReferenceSchema = z.object({
  videoPosition: z.number().optional(),
  pageNumber: z.number().optional(),
  assignmentQuestion: z.string().optional(),
  liveTimestamp: z.number().optional()
});

export const postInteractionSchema = z.object({
  context: interactionContextSchema,
  interactionType: z.enum([
    'CHAT', 'QUESTION', 'VOICE', 'REACTION', 'HAND', 
    'POLL', 'POLL_VOTE', 'TEACHER_REPLY', 'DELETE', 'PIN', 'MUTE',
    'SYSTEM', 'ASSISTANT', 'AI_REPLY', 'QUIZ', 'RESOURCE_SHARE', 'BADGE', 'CERTIFICATE'
  ]),
  payload: z.record(z.any()),
  attachments: z.array(interactionAttachmentSchema).optional(),
  reference: interactionReferenceSchema.optional(),
  parentId: z.string().optional(),
});

