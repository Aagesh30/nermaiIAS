import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { LiveAttendanceApi } from '@nermai/api';

interface Props {
  sessionId: string;
  classId: string;
  isAttendanceRunning: boolean;
  lamsSessionId: string | null;
  onAttendanceStarted: (lamsId: string) => void;
  onAttendanceEnded: () => void;
}

export const AttendanceCard: React.FC<Props> = ({ 
  sessionId, 
  classId, 
  isAttendanceRunning, 
  lamsSessionId,
  onAttendanceStarted, 
  onAttendanceEnded 
}) => {
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const res = await LiveAttendanceApi.startAttendance({
        liveSessionId: sessionId,
        classId: classId,
      });
      const lamsId = res.data?.data?.id || res.data?.id;
      if (lamsId) onAttendanceStarted(lamsId);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to start attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!lamsSessionId) return;
    setLoading(true);
    try {
      await LiveAttendanceApi.endAttendance(lamsSessionId);
      onAttendanceEnded();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to end attendance');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Attendance</Text>
        <View style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: isAttendanceRunning ? '#2ECC71' : '#E74C3C' }]} />
          <Text style={styles.badgeText}>{isAttendanceRunning ? 'RUNNING' : 'STOPPED'}</Text>
        </View>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.desc}>
          {isAttendanceRunning 
            ? 'Students are currently being marked present. Their presence lifecycle is active.'
            : 'Start the attendance session to begin recording student presence and heartbeats.'}
        </Text>

        <TouchableOpacity 
          style={[styles.btn, isAttendanceRunning ? styles.btnDanger : styles.btnPrimary]}
          onPress={isAttendanceRunning ? handleEnd : handleStart}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.btnText}>
              {isAttendanceRunning ? 'END ATTENDANCE' : 'START ATTENDANCE'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#1E1E1E', borderRadius: 12, margin: 16, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#333' },
  title: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  content: { padding: 16 },
  desc: { color: '#AAA', fontSize: 13, lineHeight: 20, marginBottom: 20 },
  btn: { padding: 16, borderRadius: 8, alignItems: 'center' },
  btnPrimary: { backgroundColor: '#D4AF37' },
  btnDanger: { backgroundColor: '#FF6B6B' },
  btnText: { color: '#000', fontWeight: 'bold', fontSize: 14 }
});
