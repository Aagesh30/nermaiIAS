import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { liveEventBusMobile, LiveEventTypeMobile, LiveEventCallback } from '../../student/streaming/LiveEventBusMobile';
import { Users, TrendingUp, Activity } from 'lucide-react-native';

export const AnalyticsCard: React.FC = () => {
  const [activeCount, setActiveCount] = useState(0);
  const [peakCount, setPeakCount] = useState(0);
  const [joins, setJoins] = useState(0);
  const [leaves, setLeaves] = useState(0);

  useEffect(() => {
    const onJoin: LiveEventCallback = () => {
      setActiveCount(prev => {
        const next = prev + 1;
        setPeakCount(p => Math.max(p, next));
        return next;
      });
      setJoins(prev => prev + 1);
    };

    const onLeave: LiveEventCallback = () => {
      setActiveCount(prev => Math.max(0, prev - 1));
      setLeaves(prev => prev + 1);
    };

    const s1 = liveEventBusMobile.on(LiveEventTypeMobile.PARTICIPANT_JOINED, onJoin);
    const s2 = liveEventBusMobile.on(LiveEventTypeMobile.PARTICIPANT_LEFT, onLeave);

    return () => { s1(); s2(); };
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Real-time Analytics</Text>
      </View>
      <View style={styles.grid}>
        <View style={styles.box}>
          <Users size={20} color="#3498DB" />
          <Text style={styles.val}>{activeCount}</Text>
          <Text style={styles.lbl}>Active</Text>
        </View>
        <View style={styles.box}>
          <TrendingUp size={20} color="#D4AF37" />
          <Text style={styles.val}>{peakCount}</Text>
          <Text style={styles.lbl}>Peak</Text>
        </View>
        <View style={styles.box}>
          <Activity size={20} color="#2ECC71" />
          <Text style={styles.val}>{joins}</Text>
          <Text style={styles.lbl}>Joins</Text>
        </View>
        <View style={styles.box}>
          <Activity size={20} color="#E74C3C" />
          <Text style={styles.val}>{leaves}</Text>
          <Text style={styles.lbl}>Leaves</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#1E1E1E', borderRadius: 12, margin: 16 },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  box: { width: '50%', padding: 16, alignItems: 'center', justifyContent: 'center' },
  val: { fontSize: 28, fontWeight: 'bold', color: '#FFF', marginTop: 8 },
  lbl: { fontSize: 12, color: '#777', marginTop: 4, textTransform: 'uppercase' }
});
