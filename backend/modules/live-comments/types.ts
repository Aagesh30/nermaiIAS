/**
 * LCES — Live Comment & Engagement System: Type Definitions
 */

export type CommentType = 'COMMENT' | 'QUESTION' | 'ANNOUNCEMENT' | 'SYSTEM';
export type QuestionStatus = 'OPEN' | 'ANSWERED' | 'CLOSED';
export type ReactionType = 'LIKE' | 'LOVE' | 'HELPFUL';

export interface ILiveComment {
  id: string;
  liveSessionId: string;
  userId: string;
  userName: string;
  userRole: string; // Used to auto-highlight Teacher replies

  type: CommentType;
  text: string;
  attachments?: any[]; // For future use (images, polls, links)

  // Question Status (only relevant if type === 'QUESTION')
  status?: QuestionStatus;

  replyCount: number;
  reactionCount: number; // Denormalized sum of all reactions

  isPinned: boolean;
  isHidden: boolean; // Moderation: hidden from students, visible to staff
  isDeleted: boolean; // Moderation: soft delete

  createdAt: string; // ISO timestamp
  updatedAt: string;
}

export interface ICommentReply {
  id: string;
  commentId: string; // Parent comment ID
  liveSessionId: string;
  userId: string;
  userName: string;
  userRole: string;
  text: string;
  
  isHidden: boolean;
  isDeleted: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface ICommentReaction {
  id: string; // format: `${commentId}_${userId}` to prevent duplicates
  commentId: string;
  userId: string;
  reaction: ReactionType;
  createdAt: string;
}
