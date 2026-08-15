/**
 * ZoomStatusScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Waiting room + status UI for Zoom deep-link flow.
 * States: SCHEDULED | WAITING | LIVE | RETURNED | ENDED | CANCELLED | FAILED
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';

export type ZoomSessionState =
  | 'SCHEDULED'
  | 'WAITING'
  | 'LIVE'
  | 'RETURNED'
  | 'ENDED'
  | 'CANCELLED'
  | 'FAILED'
  | 'LOADING'
  | 'LOADING_CREDENTIALS';

interface ZoomStatusScreenProps {
  state: ZoomSessionState;
  classTitle?: string;
  teacherName?: string;
  scheduledTime?: string;
  error?: string | null;
  onOpenZoom: () => void;
  onRetry: () => void;
  onBack?: () => void;
  launching?: boolean;
}

const STATE_CONFIG: Record<
  ZoomSessionState,
  { icon: string; label: string; color: string; description: string }
> = {
  LOADING:    { icon: '⏳', label: 'Loading...',              color: '#94a3b8', description: 'Fetching class details.' },
  LOADING_CREDENTIALS: { icon: '🔐', label: 'Loading meeting credentials...', color: '#60a5fa', description: 'Getting secure access to Zoom.' },
  SCHEDULED:  { icon: '📅', label: 'Class Scheduled',         color: '#60a5fa', description: 'The class has not started yet.' },
  WAITING:    { icon: '⏳', label: 'Waiting for host...',     color: '#fbbf24', description: 'The teacher will start the class shortly.' },
  LIVE:       { icon: '🔴', label: 'Class is Live!',          color: '#4ade80', description: 'Tap below to join the Zoom meeting.' },
  RETURNED:   { icon: '🔄', label: 'Back from Zoom',          color: '#a78bfa', description: 'Did you leave early? The class is still live.' },
  ENDED:      { icon: '✅', label: 'Class Ended',             color: '#6b7280', description: 'This live session has ended.' },
  CANCELLED:  { icon: '❌', label: 'Class Cancelled',         color: '#f87171', description: 'This class has been cancelled.' },
  FAILED:     { icon: '⚠️', label: 'Unable to Join',         color: '#f97316', description: 'Something went wrong. Please retry.' },
};

export const ZoomStatusScreen: React.FC<ZoomStatusScreenProps> = ({
  state,
  classTitle,
  teacherName,
  scheduledTime,
  error,
  onOpenZoom,
  onRetry,
  onBack,
  launching,
}) => {
  const config = STATE_CONFIG[state];
  const showOpenZoom = state === 'LIVE' || state === 'RETURNED';
  const showRetry = state === 'FAILED' || state === 'WAITING' || state === 'SCHEDULED';
  const showBack = !!onBack && (state === 'ENDED' || state === 'CANCELLED' || state === 'FAILED');

  return (
    <View style={styles.root}>
      {/* Header info */}
      <View style={styles.card}>
        {classTitle ? (
          <Text style={styles.classTitle}>{classTitle}</Text>
        ) : (
          <Text style={styles.classTitle}>Live Zoom Class</Text>
        )}
        {teacherName ? (
          <Text style={styles.meta}>Teacher: {teacherName}</Text>
        ) : null}
        {scheduledTime ? (
          <Text style={styles.meta}>Scheduled: {scheduledTime}</Text>
        ) : null}
      </View>

      {/* Status */}
      <View style={styles.statusCard}>
        {state === 'LOADING' || state === 'LOADING_CREDENTIALS' || launching ? (
          <ActivityIndicator size="large" color={config.color} style={{ marginBottom: 16 }} />
        ) : (
          <Text style={styles.statusIcon}>{config.icon}</Text>
        )}
        <Text style={[styles.statusLabel, { color: config.color }]}>{config.label}</Text>
        <Text style={styles.statusDesc}>{config.description}</Text>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {showOpenZoom && (
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary]}
            onPress={onOpenZoom}
            disabled={!!launching}
            activeOpacity={0.8}
          >
            {launching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>
                {state === 'RETURNED' ? '↩ Rejoin Zoom' : '📹 Open Zoom'}
              </Text>
            )}
          </TouchableOpacity>
        )}

        {showRetry && (
          <TouchableOpacity style={[styles.btn, styles.btnSecondary]} onPress={onRetry}>
            <Text style={styles.btnTextSecondary}>↻ Retry</Text>
          </TouchableOpacity>
        )}

        {showBack && (
          <TouchableOpacity style={[styles.btn, styles.btnGhost]} onPress={onBack}>
            <Text style={styles.btnTextGhost}>← Go Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    padding: 24,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  classTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  meta: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  statusCard: {
    backgroundColor: '#111',
    borderRadius: 14,
    padding: 28,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#222',
  },
  statusIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 13,
    color: '#fca5a5',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 10,
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
  },
  actions: {
    gap: 10,
  },
  btn: {
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimary: {
    backgroundColor: '#2D8CFF',
  },
  btnSecondary: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#333',
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnTextSecondary: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '600',
  },
  btnTextGhost: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 15,
  },
});
