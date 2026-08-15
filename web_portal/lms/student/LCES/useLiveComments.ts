import { useEffect, useState, useRef } from 'react';
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
  const [comments, setComments] = useState<CommentData[]>([]);
  const [pinnedComments, setPinnedComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Use a ref to keep track of if we're mounted to prevent state updates on unmounted component
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    if (!liveSessionId) return;

    const fetchComments = async () => {
      try {
        const res = await LiveCommentsApi.getComments(liveSessionId);
        if (!mounted.current) return;
        
        const allComments = res.data.data as CommentData[];
        
        const pinned = allComments.filter(c => c.isPinned);
        const regular = allComments.filter(c => !c.isPinned);

        setPinnedComments(pinned);
        setComments(regular);
        setError(null);
      } catch (err: any) {
        console.error('[useLiveComments] Fetch error:', err);
        if (mounted.current) setError(err);
      } finally {
        if (mounted.current) setLoading(false);
      }
    };

    // Initial fetch
    fetchComments();

    // Poll every 3 seconds for live updates
    const interval = setInterval(fetchComments, 3000);

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, [liveSessionId]);

  return { comments, pinnedComments, loading, error };
};
