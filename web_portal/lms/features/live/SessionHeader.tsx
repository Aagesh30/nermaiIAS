import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { liveEventBusMobile, LiveEventTypeMobile, LiveEventCallback } from '../../student/streaming/LiveEventBusMobile';
import { WifiOff, ChevronLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';

interface Props {
  title: string;
}

export const SessionHeader: React.FC<Props> = ({ title }) => {
  const [status, setStatus] = useState<'CONNECTING' | 'LIVE' | 'RECONNECTING' | 'ENDED' | 'DISCONNECTED'>('CONNECTING');
  const navigation = useNavigation<any>();

  useEffect(() => {
    const s1: LiveEventCallback = () => setStatus('LIVE');
    const s2: LiveEventCallback = () => setStatus('ENDED');
    const s3: LiveEventCallback = () => setStatus('RECONNECTING');
    const s4: LiveEventCallback = () => setStatus('DISCONNECTED');

    const u1 = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_CONNECTED, s1);
    const u2 = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_ENDED, s2);
    const u3 = liveEventBusMobile.on(LiveEventTypeMobile.CONNECTION_LOST, s3);
    const u4 = liveEventBusMobile.on(LiveEventTypeMobile.HOST_DISCONNECTED, s4);

    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const getStatusColor = () => {
    if (status === 'LIVE') return '#E74C3C'; // Red Live Dot
    if (status === 'CONNECTING') return '#D4AF37';
    if (status === 'RECONNECTING') return '#F39C12';
    return '#777';
  };

  const handleBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('StudentRoot');
  };

  return (
    <View style={styles.container}>
      {/* Network Reconnect Banner */}
      {status === 'RECONNECTING' && (
        <View style={styles.reconnectBanner}>
          <WifiOff size={14} color="#000" />
          <Text style={styles.reconnectText}>Connection unstable. Reconnecting...</Text>
        </View>
      )}

      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <ChevronLeft size={24} color="#FFF" />
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#121212', width: '100%', zIndex: 10 },
  reconnectBanner: { backgroundColor: '#F39C12', padding: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  reconnectText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  headerRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingTop: 40 },
  backBtn: { marginRight: 12 },
  titleContainer: { flex: 1 },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { color: '#AAA', fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }
});
