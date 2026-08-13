import { getApiClient } from '../client';

export interface CreateCommentPayload {
  liveSessionId: string;
  type: 'COMMENT' | 'QUESTION' | 'ANNOUNCEMENT' | 'SYSTEM';
  text: string;
  userName?: string; // Optional if we want frontend to pass it
}

export interface AddReplyPayload {
  liveSessionId: string;
  text: string;
  userName?: string;
}

export const LiveCommentsApi = {
  // Shared
  getComments: (liveSessionId: string) =>
    getApiClient().get(`/live-comments/${liveSessionId}`),

  createComment: (payload: CreateCommentPayload) =>
    getApiClient().post('/live-comments', payload),

  addReply: (commentId: string, payload: AddReplyPayload) =>
    getApiClient().post(`/live-comments/${commentId}/reply`, payload),

  toggleReaction: (commentId: string, reaction: 'LIKE' | 'LOVE' | 'HELPFUL') =>
    getApiClient().post(`/live-comments/${commentId}/react`, { reaction }),

  // Admin/Staff Controls
  updateStatus: (commentId: string, status: 'OPEN' | 'ANSWERED' | 'CLOSED') =>
    getApiClient().put(`/live-comments/admin/${commentId}/status`, { status }),

  togglePin: (commentId: string, isPinned: boolean) =>
    getApiClient().put(`/live-comments/admin/${commentId}/pin`, { isPinned }),

  setHidden: (commentId: string, isHidden: boolean) =>
    getApiClient().put(`/live-comments/admin/${commentId}/hide`, { isHidden }),

  deleteComment: (commentId: string) =>
    getApiClient().delete(`/live-comments/admin/${commentId}`),

  deleteReply: (replyId: string) =>
    getApiClient().delete(`/live-comments/admin/reply/${replyId}`),
};
