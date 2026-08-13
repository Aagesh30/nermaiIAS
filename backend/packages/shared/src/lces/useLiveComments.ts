import { useQuery } from '@tanstack/react-query';
import { LiveCommentsApi } from '@nermai/api/services/liveComments';

export interface CommentData {
  id: string;
  liveSessionId: string;
  userId: string;
  userName: string;
  userRole: string;
  type: 'COMMENT' | 'QUESTION' | 'ANNOUNCEMENT' | 'SYSTEM';
  text: string;
  status?: 'OPEN' | 'ANSWERED' | 'CLOSED';
  replyCount: number;
  reactionCount: number;
  isPinned: boolean;
  isHidden: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export const useLiveComments = (liveSessionId: string) => {
  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['liveComments', liveSessionId],
    queryFn: async () => {
      if (!liveSessionId) return [];
      const res = await LiveCommentsApi.getComments(liveSessionId);
      return res.data.data as CommentData[];
    },
    enabled: !!liveSessionId,
    refetchInterval: 3000,
  });

  const allComments = data || [];
  const pinnedComments = allComments.filter(c => c.isPinned);
  const comments = allComments.filter(c => !c.isPinned);

  return { comments, pinnedComments, loading, error };
};
