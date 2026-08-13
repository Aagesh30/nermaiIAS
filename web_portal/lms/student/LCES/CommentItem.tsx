import React, { useState } from 'react';
import { CommentData } from '../../core/shared/src';
import { ThumbsUp, MoreVertical, Pin, EyeOff, MessageSquare, Trash2, CheckCircle } from 'lucide-react';
import { LiveCommentsApi } from '../../core/services';

interface CommentItemProps {
  comment: CommentData;
  isAdmin?: boolean;
  onRefresh: () => void;
  onReply?: (commentId: string, userName: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({ comment, isAdmin, onRefresh, onReply }) => {
  const [showMenu, setShowMenu] = useState(false);
  
  // A simplistic UI for a comment
  const isQuestion = comment.type === 'QUESTION';
  const isAnnouncement = comment.type === 'ANNOUNCEMENT';
  const isSystem = comment.type === 'SYSTEM';

  const handleToggleReaction = async () => {
    try {
      await LiveCommentsApi.toggleReaction(comment.id, 'HELPFUL');
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleAdminAction = async (action: 'pin' | 'hide' | 'delete' | 'answered') => {
    setShowMenu(false);
    try {
      if (action === 'pin') {
        await LiveCommentsApi.togglePin(comment.id, !comment.isPinned);
      } else if (action === 'hide') {
        await LiveCommentsApi.setHidden(comment.id, !comment.isHidden);
      } else if (action === 'delete') {
        await LiveCommentsApi.deleteComment(comment.id);
      } else if (action === 'answered') {
        await LiveCommentsApi.updateStatus(comment.id, 'ANSWERED');
      }
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  if (isSystem) {
    return (
      <div className="flex items-center justify-center my-2 text-xs text-slate-500">
        <span className="bg-slate-800/50 px-3 py-1 rounded-full">{comment.text}</span>
      </div>
    );
  }

  // If not admin and comment is hidden, don't show
  if (comment.isHidden && !isAdmin) return null;

  return (
    <div className={`p-3 border-b border-white/5 relative group transition-colors hover:bg-white/[0.02]
      ${isAnnouncement ? 'bg-indigo-900/20 border-l-2 border-l-indigo-500' : ''}
      ${comment.isPinned ? 'bg-yellow-900/10' : ''}
      ${comment.isHidden ? 'opacity-50' : ''}
    `}>
      {/* Header */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-slate-200">
            {comment.userName}
          </span>
          {comment.userRole === 'TEACHER' || comment.userRole === 'ADMIN' ? (
            <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
              Staff
            </span>
          ) : null}
          <span className="text-[10px] text-slate-500">
            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {/* Admin Menu */}
        {isAdmin && (
          <div className="relative">
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical size={14} />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden text-sm">
                <button onClick={() => handleAdminAction('pin')} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700 text-slate-200">
                  <Pin size={14} /> {comment.isPinned ? 'Unpin' : 'Pin'}
                </button>
                {isQuestion && (
                  <button onClick={() => handleAdminAction('answered')} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700 text-green-400">
                    <CheckCircle size={14} /> Mark Answered
                  </button>
                )}
                <button onClick={() => onReply?.(comment.id, comment.userName)} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700 text-slate-200">
                  <MessageSquare size={14} /> Reply
                </button>
                <button onClick={() => handleAdminAction('hide')} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700 text-orange-400">
                  <EyeOff size={14} /> {comment.isHidden ? 'Unhide' : 'Hide'}
                </button>
                <div className="h-px bg-slate-700 my-1" />
                <button onClick={() => handleAdminAction('delete')} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-700 text-red-400">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      <p className="text-sm text-slate-300 leading-relaxed mb-2 break-words">
        {comment.text}
      </p>

      {/* Footer / Question Actions */}
      {isQuestion && (
        <div className="flex items-center gap-4 mt-2">
          <button 
            onClick={handleToggleReaction}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-accent transition-colors bg-slate-800/50 px-2 py-1 rounded"
          >
            <ThumbsUp size={12} />
            {comment.reactionCount > 0 ? (
              <span>{comment.reactionCount} Have this doubt</span>
            ) : (
              <span>I have this doubt too</span>
            )}
          </button>
          
          {comment.status === 'ANSWERED' && (
            <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
              <CheckCircle size={12} /> Answered
            </span>
          )}
        </div>
      )}
    </div>
  );
};

