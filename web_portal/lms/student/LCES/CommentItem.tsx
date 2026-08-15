import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '@nermai/theme';
import { MessageSquare, HelpCircle, Megaphone, CheckCircle, Pin, ThumbsUp } from 'lucide-react-native';
import { CommentData } from './useLiveComments';
import { LiveCommentsApi } from '@nermai/api/services/liveComments';

interface CommentItemProps {
  comment: CommentData;
  onReplyPress?: (comment: CommentData) => void;
  onLongPress?: (comment: CommentData) => void;
  isAdmin?: boolean;
}

export const CommentItem = ({ comment, onReplyPress, onLongPress, isAdmin }: CommentItemProps) => {
  const isTeacher = comment.userRole === 'teacher' || comment.userRole === 'admin';
  
  // Icon based on type
  const renderIcon = () => {
    switch(comment.type) {
      case 'QUESTION': return <HelpCircle size={14} color={colors.accent} />;
      case 'ANNOUNCEMENT': return <Megaphone size={14} color={colors.primary} />;
      default: return <MessageSquare size={14} color={colors.textSecondary} />;
    }
  };

  // Border color based on type and status
  const getBorderColor = () => {
    if (comment.type === 'ANNOUNCEMENT') return colors.primary;
    if (comment.type === 'QUESTION' && comment.status === 'ANSWERED') return colors.success;
    if (comment.type === 'QUESTION') return colors.accent;
    return 'rgba(255,255,255,0.05)';
  };

  if (comment.isHidden && !isAdmin) {
    return null; // Hidden from students completely
  }

  return (
    <TouchableOpacity 
      style={[
        styles.container, 
        { borderColor: getBorderColor() },
        comment.isHidden && styles.hiddenContainer
      ]}
      onLongPress={() => onLongPress?.(comment)}
      delayLongPress={400}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, isTeacher && styles.teacherName]}>
            {comment.userName}
          </Text>
          {isTeacher && (
            <View style={styles.teacherBadge}>
              <CheckCircle size={10} color="#000" />
              <Text style={styles.teacherBadgeText}>STAFF</Text>
            </View>
          )}
        </View>
        <View style={styles.metaInfo}>
          {comment.isPinned && <Pin size={12} color={colors.primary} style={{ marginRight: 4 }} />}
          {renderIcon()}
        </View>
      </View>

      <Text style={[styles.text, comment.isHidden && styles.hiddenText]}>
        {comment.isHidden ? '⚠️ This comment is hidden from students' : comment.text}
      </Text>
      
      {/* Footer controls: Reactions & Replies */}
      {!comment.isHidden && (
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onReplyPress?.(comment)}>
              <MessageSquare size={14} color={colors.textSecondary} />
              <Text style={styles.actionText}>{comment.replyCount > 0 ? `${comment.replyCount} Replies` : 'Reply'}</Text>
            </TouchableOpacity>
            
            {comment.type === 'QUESTION' && (
              <TouchableOpacity 
                style={[styles.actionBtn, { marginLeft: 16 }]} 
                onPress={() => LiveCommentsApi.toggleReaction(comment.id, 'HELPFUL').catch(console.error)}
              >
                <ThumbsUp size={14} color={comment.reactionCount > 0 ? colors.accent : colors.textSecondary} />
                <Text style={[styles.actionText, comment.reactionCount > 0 && { color: colors.accent }]}>
                  {comment.reactionCount > 0 ? `${comment.reactionCount} Have this doubt` : 'I have this doubt too'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          {comment.type === 'QUESTION' && (
            <View style={[styles.statusBadge, comment.status === 'ANSWERED' && styles.answeredBadge]}>
              <Text style={[styles.statusText, comment.status === 'ANSWERED' && styles.answeredText]}>
                {comment.status}
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  hiddenContainer: {
    opacity: 0.5,
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  teacherName: {
    color: colors.primary,
  },
  teacherBadge: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  teacherBadgeText: {
    color: '#000',
    fontSize: 9,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  text: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
  },
  hiddenText: {
    color: colors.accent,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginLeft: 6,
  },
  statusBadge: {
    backgroundColor: 'rgba(212,175,55,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  answeredBadge: {
    backgroundColor: 'rgba(76,175,80,0.1)',
  },
  statusText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: 'bold',
  },
  answeredText: {
    color: colors.success,
  }
});
