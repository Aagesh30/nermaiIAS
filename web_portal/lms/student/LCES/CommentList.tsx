import React, { useRef, useEffect } from 'react';
import { CommentData } from '../../core/shared/src';
import { CommentItem } from './CommentItem';

interface CommentListProps {
  comments: CommentData[];
  pinnedComments: CommentData[];
  filterMode: 'CHAT' | 'DOUBTS';
  setFilterMode: (mode: 'CHAT' | 'DOUBTS') => void;
  isAdmin?: boolean;
  onRefresh: () => void;
  onReply?: (commentId: string, userName: string) => void;
}

export const CommentList: React.FC<CommentListProps> = ({ 
  comments, 
  pinnedComments, 
  filterMode, 
  setFilterMode, 
  isAdmin, 
  onRefresh, 
  onReply 
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Filter based on mode
  const displayedComments = filterMode === 'DOUBTS'
    ? comments.filter(c => c.type === 'QUESTION')
    : comments.filter(c => c.type !== 'QUESTION');

  // Auto-scroll to bottom logic
  useEffect(() => {
    if (scrollRef.current) {
      // In a more complex implementation, we'd only auto-scroll if already at the bottom
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [displayedComments]);

  return (
    <div className="flex flex-col h-full bg-[#0F172A] border-l border-white/10">
      
      {/* Tabs */}
      <div className="flex bg-[#1E293B] p-1 gap-1">
        <button 
          onClick={() => setFilterMode('CHAT')}
          className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${filterMode === 'CHAT' ? 'bg-[#334155] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          Live Chat
        </button>
        <button 
          onClick={() => setFilterMode('DOUBTS')}
          className={`flex-1 py-2 text-sm font-medium rounded transition-colors ${filterMode === 'DOUBTS' ? 'bg-[#334155] text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}
        >
          Q&A Doubts
        </button>
      </div>

      {/* Pinned Messages */}
      {pinnedComments.length > 0 && (
        <div className="flex-shrink-0 bg-yellow-900/20 border-b border-yellow-500/20">
          <div className="px-3 py-1 bg-yellow-900/40 border-b border-yellow-500/10 text-[10px] font-bold text-yellow-500 uppercase tracking-wider flex items-center gap-1">
            <span>📌 Pinned</span>
          </div>
          <div className="max-h-32 overflow-y-auto">
            {pinnedComments.map(c => (
              <CommentItem 
                key={c.id} 
                comment={c} 
                isAdmin={isAdmin} 
                onRefresh={onRefresh} 
                onReply={onReply}
              />
            ))}
          </div>
        </div>
      )}

      {/* Messages List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar flex flex-col-reverse"
      >
        {/* We reverse the mapping because the flex-col-reverse makes new items appear at bottom */}
        {displayedComments.map(c => (
          <CommentItem 
            key={c.id} 
            comment={c} 
            isAdmin={isAdmin} 
            onRefresh={onRefresh} 
            onReply={onReply}
          />
        ))}
        
        {displayedComments.length === 0 && (
          <div className="flex items-center justify-center h-full text-slate-500 text-sm">
            {filterMode === 'CHAT' ? 'No messages yet.' : 'No doubts yet.'}
          </div>
        )}
      </div>

    </div>
  );
};

