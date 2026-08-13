import { db } from '../../infrastructure/firebase';
import { redisClient } from '../../infrastructure/redis';
import { AppError } from '../../core/errors/AppError';
import { logger } from '../../core/logger';
import {
  ILiveComment,
  ICommentReply,
  ICommentReaction,
  CommentType,
  QuestionStatus,
  ReactionType
} from './types';

// ─── Collection names ─────────────────────────────────────────────────────────
const COMMENTS_COL = 'live_comments';
const REPLIES_COL = 'comment_replies';
const REACTIONS_COL = 'comment_reactions';

export class LiveCommentService {

  // ── CREATE COMMENT ────────────────────────────────────────────────────────
  async createComment(
    payload: {
      liveSessionId: string;
      userId: string;
      userName: string;
      userRole: string;
      type: CommentType;
      text: string;
    }
  ): Promise<ILiveComment> {
    const { liveSessionId, userId, userName, userRole, type, text } = payload;
    const now = new Date().toISOString();

    // Basic profanity / spam check could go here
    if (this._containsProfanity(text)) {
      throw new AppError('Message contains inappropriate language', 400);
    }

    const docRef = db.collection(COMMENTS_COL).doc();
    const comment: ILiveComment = {
      id: docRef.id,
      liveSessionId,
      userId,
      userName,
      userRole,
      type,
      text,
      status: type === 'QUESTION' ? 'OPEN' : undefined,
      replyCount: 0,
      reactionCount: 0,
      isPinned: false,
      isHidden: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(comment);
    logger.debug(`[LCES] Comment created by ${userId} for session ${liveSessionId}`);
    return comment;
  }

  // ── GET COMMENTS ──────────────────────────────────────────────────────────
  async getComments(liveSessionId: string): Promise<ILiveComment[]> {
    const snapshot = await db.collection(COMMENTS_COL)
      .where('liveSessionId', '==', liveSessionId)
      .where('isDeleted', '==', false)
      .get();
      
    const comments: ILiveComment[] = [];
    snapshot.forEach(doc => {
      comments.push(doc.data() as ILiveComment);
    });

    // Sort descending by creation date
    comments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return comments;
  }

  // ── ADD REPLY ─────────────────────────────────────────────────────────────
  async addReply(
    payload: {
      commentId: string;
      liveSessionId: string;
      userId: string;
      userName: string;
      userRole: string;
      text: string;
    }
  ): Promise<ICommentReply> {
    const { commentId, liveSessionId, userId, userName, userRole, text } = payload;
    const now = new Date().toISOString();

    if (this._containsProfanity(text)) {
      throw new AppError('Message contains inappropriate language', 400);
    }

    const parentRef = db.collection(COMMENTS_COL).doc(commentId);
    const replyRef = db.collection(REPLIES_COL).doc();

    const reply: ICommentReply = {
      id: replyRef.id,
      commentId,
      liveSessionId,
      userId,
      userName,
      userRole,
      text,
      isHidden: false,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    };

    // Use a batch to insert the reply and increment the parent's reply count
    const batch = db.batch();
    batch.set(replyRef, reply);
    batch.update(parentRef, {
      replyCount: FirebaseFirestore.FieldValue.increment(1),
      updatedAt: now,
    });

    await batch.commit();
    logger.debug(`[LCES] Reply added by ${userId} to comment ${commentId}`);
    return reply;
  }

  // ── TOGGLE REACTION ───────────────────────────────────────────────────────
  async toggleReaction(
    commentId: string,
    userId: string,
    reaction: ReactionType
  ): Promise<{ status: 'added' | 'removed' | 'updated'; reactionCount: number }> {
    const reactionId = `${commentId}_${userId}`;
    const reactionRef = db.collection(REACTIONS_COL).doc(reactionId);
    const commentRef = db.collection(COMMENTS_COL).doc(commentId);

    return await db.runTransaction(async (transaction) => {
      const reactionDoc = await transaction.get(reactionRef);
      const commentDoc = await transaction.get(commentRef);
      
      if (!commentDoc.exists) throw new AppError('Comment not found', 404);
      let currentCount = commentDoc.data()?.reactionCount || 0;

      let resultStatus: 'added' | 'removed' | 'updated';

      if (reactionDoc.exists) {
        const existingData = reactionDoc.data() as ICommentReaction;
        if (existingData.reaction === reaction) {
          // Same reaction -> toggle off (remove)
          transaction.delete(reactionRef);
          currentCount = Math.max(0, currentCount - 1);
          transaction.update(commentRef, { reactionCount: currentCount });
          resultStatus = 'removed';
        } else {
          // Different reaction -> update
          transaction.update(reactionRef, { reaction });
          resultStatus = 'updated';
          // Count remains the same since it's just swapping the type
        }
      } else {
        // No existing reaction -> add
        const newReaction: ICommentReaction = {
          id: reactionId,
          commentId,
          userId,
          reaction,
          createdAt: new Date().toISOString()
        };
        transaction.set(reactionRef, newReaction);
        currentCount += 1;
        transaction.update(commentRef, { reactionCount: currentCount });
        resultStatus = 'added';
      }

      return { status: resultStatus, reactionCount: currentCount };
    });
  }

  // ── MODERATION ────────────────────────────────────────────────────────────
  async updateStatus(commentId: string, status: QuestionStatus): Promise<void> {
    await db.collection(COMMENTS_COL).doc(commentId).update({
      status,
      updatedAt: new Date().toISOString()
    });
  }

  async togglePin(commentId: string, isPinned: boolean): Promise<void> {
    await db.collection(COMMENTS_COL).doc(commentId).update({
      isPinned,
      updatedAt: new Date().toISOString()
    });
  }

  async setHidden(commentId: string, isHidden: boolean): Promise<void> {
    await db.collection(COMMENTS_COL).doc(commentId).update({
      isHidden,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteComment(commentId: string): Promise<void> {
    await db.collection(COMMENTS_COL).doc(commentId).update({
      isDeleted: true,
      updatedAt: new Date().toISOString()
    });
  }

  async deleteReply(replyId: string): Promise<void> {
    // Note: We don't decrement replyCount here intentionally to show "[Deleted Reply]" placeholder if we wanted to
    await db.collection(REPLIES_COL).doc(replyId).update({
      isDeleted: true,
      updatedAt: new Date().toISOString()
    });
  }

  // ── PRIVATE HELPERS ───────────────────────────────────────────────────────
  private _containsProfanity(text: string): boolean {
    const badWords = ['spam', 'abuse', 'swearword']; // Mock basic filter
    const lowerText = text.toLowerCase();
    return badWords.some(word => lowerText.includes(word));
  }
}

export const liveCommentService = new LiveCommentService();
