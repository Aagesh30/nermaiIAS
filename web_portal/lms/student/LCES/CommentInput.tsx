import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { LiveCommentsApi } from '../../core/services';

interface CommentInputProps {
  liveSessionId: string;
  isAdmin?: boolean;
  filterMode: 'CHAT' | 'DOUBTS';
  onRefresh: () => void;
  replyTo: { id: string; name: string } | null;
  onCancelReply: () => void;
}

export const CommentInput: React.FC<CommentInputProps> = ({ 
  liveSessionId, 
  isAdmin, 
  filterMode, 
  onRefresh,
  replyTo,
  onCancelReply
}) => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [asAnnouncement, setAsAnnouncement] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || loading) return;

    setLoading(true);
    try {
      // Determine message type based on UI state
      let type: 'COMMENT' | 'QUESTION' | 'ANNOUNCEMENT' = 
        filterMode === 'DOUBTS' ? 'QUESTION' : 'COMMENT';
        
      if (isAdmin && asAnnouncement) {
        type = 'ANNOUNCEMENT';
      }

      await LiveCommentsApi.createComment({
        liveSessionId,
        text: text.trim(),
        type,
      });

      setText('');
      if (replyTo) onCancelReply();
      if (asAnnouncement) setAsAnnouncement(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to post comment', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#1E293B] border-t border-white/10 p-3 flex flex-col gap-2">
      
      {/* Reply Context Bar */}
      {replyTo && (
        <div className="flex items-center justify-between bg-slate-800 px-3 py-1.5 rounded text-sm text-slate-300">
          <span>Replying to <span className="font-semibold text-white">{replyTo.name}</span></span>
          <button type="button" onClick={onCancelReply} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Admin Announcement Toggle */}
      {isAdmin && !replyTo && (
        <div className="flex items-center gap-2 px-1">
          <input 
            type="checkbox" 
            id="announcement-toggle"
            checked={asAnnouncement}
            onChange={(e) => setAsAnnouncement(e.target.checked)}
            className="rounded border-slate-600 text-accent focus:ring-accent/20 bg-slate-800"
          />
          <label htmlFor="announcement-toggle" className="text-xs text-slate-400 select-none cursor-pointer">
            Send as Announcement
          </label>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={filterMode === 'DOUBTS' ? 'Ask a question...' : 'Type a message...'}
          className="flex-1 bg-[#0F172A] text-sm text-white placeholder-slate-500 border border-slate-700 rounded-lg px-3 py-2.5 max-h-32 min-h-[44px] resize-none focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          rows={1}
        />
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="flex-shrink-0 w-[44px] h-[44px] flex items-center justify-center bg-accent text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </form>
  );
};

