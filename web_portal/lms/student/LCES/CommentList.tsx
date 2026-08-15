import React, { useState } from 'react';
import { View, FlatList, StyleSheet, Text, ActivityIndicator } from 'react-native';
import { CommentData, useLiveComments } from './useLiveComments';
import { CommentItem } from './CommentItem';
import { colors } from '@nermai/theme';
import { ActionSheet } from '../../components/ui/ActionSheet';
import { LiveCommentsApi } from '@nermai/api/services/liveComments';
// TouchableOpacity imported from react-native above

interface CommentListProps {
  liveSessionId: string;
  isAdmin?: boolean;
}

export const CommentList = ({ liveSessionId, isAdmin }: CommentListProps) => {
  const { comments, pinnedComments, loading, error } = useLiveComments(liveSessionId);
  const [selectedComment, setSelectedComment] = useState<CommentData | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [filterMode, setFilterMode] = useState<'CHAT' | 'DOUBTS'>('CHAT');

  const handleLongPress = (comment: CommentData) => {
    if (isAdmin) {
      setSelectedComment(comment);
      setActionSheetVisible(true);
    }
  };

  const renderAdminActions = () => {
    if (!selectedComment) return [];
    
    const actions: any[] = [];
    
    if (selectedComment.type === 'QUESTION') {
      const isAnswered = selectedComment.status === 'ANSWERED';
      actions.push({
        label: isAnswered ? 'Mark Open' : 'Mark Answered',
        onPress: () => {
          LiveCommentsApi.updateStatus(selectedComment.id, isAnswered ? 'OPEN' : 'ANSWERED');
          setActionSheetVisible(false);
        }
      });
    }

    actions.push({
      label: selectedComment.isPinned ? 'Unpin' : 'Pin to Top',
      onPress: () => {
        LiveCommentsApi.togglePin(selectedComment.id, !selectedComment.isPinned);
        setActionSheetVisible(false);
      }
    });

    actions.push({
      label: selectedComment.isHidden ? 'Unhide' : 'Hide from Students',
      onPress: () => {
        LiveCommentsApi.setHidden(selectedComment.id, !selectedComment.isHidden);
        setActionSheetVisible(false);
      }
    });

    actions.push({
      label: 'Delete',
      destructive: true,
      onPress: () => {
        LiveCommentsApi.deleteComment(selectedComment.id);
        setActionSheetVisible(false);
      }
    });

    return actions;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load comments.</Text>
      </View>
    );
  }

  const displayedComments = filterMode === 'DOUBTS' 
    ? comments.filter(c => c.type === 'QUESTION')
    : comments.filter(c => c.type !== 'QUESTION');

  return (
    <View style={styles.container}>
      {/* Filter Toggle */}
      <View style={styles.filterBar}>
        <TouchableOpacity 
          style={[styles.filterBtn, filterMode === 'CHAT' && styles.filterBtnActive]}
          onPress={() => setFilterMode('CHAT')}
        >
          <Text style={[styles.filterText, filterMode === 'CHAT' && styles.filterTextActive]}>Live Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.filterBtn, filterMode === 'DOUBTS' && styles.filterBtnActive]}
          onPress={() => setFilterMode('DOUBTS')}
        >
          <Text style={[styles.filterText, filterMode === 'DOUBTS' && styles.filterTextActive]}>Q&A Doubts</Text>
        </TouchableOpacity>
      </View>

      {/* Pinned Section */}
      {pinnedComments.length > 0 && (
        <View style={styles.pinnedSection}>
          <Text style={styles.pinnedTitle}>📌 PINNED</Text>
          {pinnedComments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              isAdmin={isAdmin}
              onLongPress={handleLongPress} 
            />
          ))}
        </View>
      )}

      {/* Main List */}
      <FlatList
        data={displayedComments}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <CommentItem 
            comment={item} 
            isAdmin={isAdmin}
            onLongPress={handleLongPress} 
          />
        )}
        contentContainerStyle={styles.listContent}
        inverted // Messages appear at bottom first usually, or ordered by date desc
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No comments yet. Be the first!</Text>
          </View>
        }
      />

      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        title="Moderate Comment"
        items={renderAdminActions()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  filterBar: {
    flexDirection: 'row',
    padding: 8,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  filterText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  filterTextActive: {
    color: colors.textPrimary,
  },
  pinnedSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
    backgroundColor: 'rgba(212,175,55,0.05)'
  },
  pinnedTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 12,
    letterSpacing: 1,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  errorText: {
    color: colors.accent,
  }
});
