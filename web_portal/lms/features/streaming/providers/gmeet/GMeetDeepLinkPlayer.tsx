/**
 * GMeetDeepLinkPlayer.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * MOBILE ONLY — Google Meet deep-link player for Expo Go.
 * Opens the meeting URL in Safari or the Google Meet app.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking } from 'react-native';

interface GMeetDeepLinkPlayerProps {
  payload: any;
  onSessionEnd?: () => void;
}

export const GMeetDeepLinkPlayer: React.FC<GMeetDeepLinkPlayerProps> = ({ payload, onSessionEnd }) => {
  const [launched, setLaunched] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const joinUrl = payload?.joinUrl ?? payload?.providerMetadata?.joinUrl ?? '';

  const handleOpen = useCallback(async () => {
    if (!joinUrl) {
      setError('No Google Meet URL was provided.');
      return;
    }
    setLaunching(true);
    setError(null);
    try {
      console.log('[GMeetDeepLinkPlayer] Opening URL:', joinUrl);
      await Linking.openURL(joinUrl);
      setLaunched(true);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to open Google Meet.');
    } finally {
      setLaunching(false);
    }
  }, [joinUrl]);

  // Auto-open on mount
  useEffect(() => {
    if (joinUrl) handleOpen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.icon}>📹</Text>
      <Text style={styles.title}>{payload?.classTitle ?? 'Google Meet Class'}</Text>
      <Text style={styles.status}>
        {launched ? 'Meeting opened in Google Meet.' : 'Opening Google Meet...'}
      </Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TouchableOpacity style={styles.btn} onPress={handleOpen} disabled={launching}>
        {launching
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.btnText}>{launched ? '↩ Rejoin' : '📹 Open Google Meet'}</Text>
        }
      </TouchableOpacity>
      {onSessionEnd && (
        <TouchableOpacity style={styles.backBtn} onPress={onSessionEnd}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 8, textAlign: 'center' },
  status: { fontSize: 15, color: 'rgba(255,255,255,0.55)', marginBottom: 20, textAlign: 'center' },
  error: { color: '#fca5a5', fontSize: 13, marginBottom: 16, textAlign: 'center' },
  btn: { backgroundColor: '#1a73e8', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12, marginBottom: 12, width: '100%', alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  backBtn: { paddingVertical: 10 },
  backBtnText: { color: 'rgba(255,255,255,0.4)', fontSize: 15 },
});
