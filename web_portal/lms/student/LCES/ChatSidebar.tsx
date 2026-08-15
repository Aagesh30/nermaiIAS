import React, { useState, useEffect } from 'react';
import { CommentList } from './CommentList';
import { CommentInput } from './CommentInput';
import { useLiveComments } from '@nermai/shared';
import { MessageCircle } from 'lucide-react';
import { useAuth } from '../../core/auth/AuthProvider';

interface ChatSidebarProps {
  liveSessionId: string;
  className?: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({ liveSessionId, className = '' }) => {
  const { comments, pinnedComments, loading, error } = useLiveComments(liveSessionId);
  const [filterMode, setFilterMode] = useState<'CHAT' | 'DOUBTS'>('CHAT');
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  
  const { currentUser, role } = useAuth();
  const isAdmin = role === 'ADMIN' || role === 'TEACHER' || role === 'staff' || role === 'teacher' || role === 'super_admin';

  // We don't have a direct onRefresh provided by useLiveComments since it polls, 
  // but if we mutate, it will refresh in 3 seconds. 
  // A robust approach would expose mutate() from SWR/React Query. 
  // For now, we do a no-op or we can force refresh if we extended the hook.
  const handleRefresh = () => {
    // Polling handles it, but immediate UI updates are better done via optimistics or manual re-fetch.
  };

  if (!liveSessionId) {
    return (
      <div className={`flex items-center justify-center bg-[#0F172A] border-l border-white/10 ${className}`}>
        <p className="text-slate-500 text-sm">Class not active</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-[#0F172A] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 p-4 bg-[#1E293B] border-b border-white/10 shrink-0">
        <MessageCircle size={18} className="text-accent" />
        <h3 className="font-semibold text-white">Class Discussion</h3>
      </div>
      
      {/* List Area */}
      <div className="flex-1 overflow-hidden">
        {loading && comments.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500">
            <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error && comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 p-4 text-center">
            <p className="text-red-400 mb-2">Could not load chat</p>
            <p className="text-xs">Trying to reconnect...</p>
          </div>
        ) : (
          <CommentList 
            comments={comments}
            pinnedComments={pinnedComments}
            filterMode={filterMode}
            setFilterMode={setFilterMode}
            isAdmin={isAdmin}
            onRefresh={handleRefresh}
            onReply={(id, name) => setReplyTo({ id, name })}
          />
        )}
      </div>

      {/* Input Area */}
      <div className="shrink-0">
        <CommentInput 
          liveSessionId={liveSessionId}
          isAdmin={isAdmin}
          filterMode={filterMode}
          onRefresh={handleRefresh}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
};
