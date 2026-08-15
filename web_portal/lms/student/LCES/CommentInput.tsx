import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Send, HelpCircle, MessageSquare } from 'lucide-react-native';
import { colors } from '@nermai/theme';
import { LiveCommentsApi } from '@nermai/api/services/liveComments';

interface CommentInputProps {
  liveSessionId: string;
  isAdmin?: boolean;
}

export const CommentInput = ({ liveSessionId, isAdmin }: CommentInputProps) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'COMMENT' | 'QUESTION' | 'ANNOUNCEMENT'>('COMMENT');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      setLoading(true);
      await LiveCommentsApi.createComment({
        liveSessionId,
        type: mode,
        text: text.trim(),
      });
      setText('');
      setMode('COMMENT');
    } catch (e) {
      console.warn('Failed to submit comment:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        {/* Mode Selector */}
        <View style={styles.modeSelector}>
          <TouchableOpacity 
            style={[styles.modeBtn, mode === 'COMMENT' && styles.modeBtnActive]}
            onPress={() => setMode('COMMENT')}
          >
            <MessageSquare size={14} color={mode === 'COMMENT' ? '#000' : colors.textSecondary} />
            <Text style={[styles.modeText, mode === 'COMMENT' && styles.modeTextActive]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeBtn, mode === 'QUESTION' && styles.modeQuestionActive]}
            onPress={() => setMode('QUESTION')}
          >
            <HelpCircle size={14} color={mode === 'QUESTION' ? '#000' : colors.textSecondary} />
            <Text style={[styles.modeText, mode === 'QUESTION' && styles.modeTextActive]}>Ask Question</Text>
          </TouchableOpacity>
          
          {isAdmin && (
            <TouchableOpacity 
              style={[styles.modeBtn, mode === 'ANNOUNCEMENT' && styles.modeAdminActive]}
              onPress={() => setMode('ANNOUNCEMENT')}
            >
              <Text style={[styles.modeText, mode === 'ANNOUNCEMENT' && styles.modeTextActive]}>Announce</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Input Area */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={mode === 'QUESTION' ? 'Ask a question...' : mode === 'ANNOUNCEMENT' ? 'Make an announcement...' : 'Type a message...'}
            placeholderTextColor={colors.textSecondary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.sendBtn, 
              !text.trim() && { opacity: 0.5 },
              mode === 'QUESTION' && { backgroundColor: colors.accent },
              mode === 'ANNOUNCEMENT' && { backgroundColor: colors.primary }
            ]}
            disabled={!text.trim() || loading}
            onPress={handleSubmit}
          >
            {loading ? <ActivityIndicator size="small" color="#000" /> : <Send size={20} color="#000" />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  modeSelector: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#2A2A2A',
  },
  modeBtnActive: {
    backgroundColor: colors.textPrimary,
  },
  modeQuestionActive: {
    backgroundColor: colors.accent,
  },
  modeAdminActive: {
    backgroundColor: colors.primary,
  },
  modeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  modeTextActive: {
    color: '#000',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: colors.textPrimary,
    minHeight: 48,
    maxHeight: 120,
  },
  sendBtn: {
    backgroundColor: colors.textPrimary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
