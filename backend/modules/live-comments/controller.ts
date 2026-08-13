import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { liveCommentService } from './service';
import { AppError } from '../../core/errors/AppError';
import { CommentType, QuestionStatus, ReactionType } from './types';

// ─── VALIDATION ───────────────────────────────────────────────────────────────
const createCommentSchema = z.object({
  liveSessionId: z.string(),
  type: z.enum(['COMMENT', 'QUESTION', 'ANNOUNCEMENT', 'SYSTEM']),
  text: z.string().min(1).max(2000),
});

const addReplySchema = z.object({
  liveSessionId: z.string(),
  text: z.string().min(1).max(2000),
});

const toggleReactionSchema = z.object({
  reaction: z.enum(['LIKE', 'LOVE', 'HELPFUL']),
});

const statusSchema = z.object({
  status: z.enum(['OPEN', 'ANSWERED', 'CLOSED']),
});

const pinSchema = z.object({
  isPinned: z.boolean(),
});

const hideSchema = z.object({
  isHidden: z.boolean(),
});

// ─── STUDENT/STAFF CONTROLLERS ────────────────────────────────────────────────

export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const liveSessionId = req.params.liveSessionId as string;
    if (!liveSessionId) {
      throw new AppError('liveSessionId is required', 400);
    }
    const comments = await liveCommentService.getComments(liveSessionId);
    res.status(200).json({ status: 'success', data: comments });
  } catch (err) {
    next(err);
  }
};

import { createHash } from 'crypto';
import { redisClient } from '../../infrastructure/redis';

export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createCommentSchema.parse(req.body);
    const { userId, role } = req.user!;
    // userName is resolved from the JWT claims (name field) — NOT from req.body.
    // This prevents client-supplied display name spoofing.
    const userName = (req.user as any)?.name || '';

    // Deduplication: prevent identical comments within 5 seconds
    const textHash = createHash('sha256').update(`${userId}:${body.liveSessionId}:${body.text.trim().toLowerCase()}`).digest('hex');
    const dedupKey = `comment:dedup:${textHash}`;
    const isDuplicate = await redisClient.get(dedupKey);

    if (isDuplicate) {
      throw new AppError('Duplicate comment detected. Please wait before reposting.', 429);
    }

    // Set dedup key for 5 seconds
    await redisClient.set(dedupKey, '1', 'EX', 5);

    const comment = await liveCommentService.createComment({
      ...body,
      userId,
      userRole: role,
      userName,
    });
    res.status(201).json({ status: 'success', data: comment });
  } catch (err) {
    next(err);
  }
};

export const addReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id as string;
    const body = addReplySchema.parse(req.body);
    const { userId, role } = req.user!;
    // userName from JWT claims — NOT from req.body
    const userName = (req.user as any)?.name || '';

    const reply = await liveCommentService.addReply({
      commentId,
      liveSessionId: body.liveSessionId,
      userId,
      userRole: role,
      userName,
      text: body.text,
    });
    res.status(201).json({ status: 'success', data: reply });
  } catch (err) {
    next(err);
  }
};

export const toggleReaction = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id as string;
    const { reaction } = toggleReactionSchema.parse(req.body);
    const { userId } = req.user!;

    const result = await liveCommentService.toggleReaction(commentId, userId, reaction as ReactionType);
    res.status(200).json({ status: 'success', data: result });
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN/STAFF CONTROLLERS ──────────────────────────────────────────────────

export const updateStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id as string;
    const { status } = statusSchema.parse(req.body);
    
    await liveCommentService.updateStatus(commentId, status as QuestionStatus);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

export const togglePin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id as string;
    const { isPinned } = pinSchema.parse(req.body);
    
    await liveCommentService.togglePin(commentId, isPinned);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

export const setHidden = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id as string;
    const { isHidden } = hideSchema.parse(req.body);
    
    await liveCommentService.setHidden(commentId, isHidden);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

export const deleteComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const commentId = req.params.id as string;
    
    await liveCommentService.deleteComment(commentId);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};

export const deleteReply = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const replyId = req.params.id as string;
    
    await liveCommentService.deleteReply(replyId);
    res.status(200).json({ status: 'success' });
  } catch (err) {
    next(err);
  }
};
