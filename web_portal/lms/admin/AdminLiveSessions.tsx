import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, SafeAreaView, TouchableOpacity, Alert, Platform } from 'react-native';
import { AdminFAB } from '../../components/admin/AdminFAB';
import { ActionSheet } from '../../components/admin/ActionSheet';
import { ChevronLeft, Video, MoreVertical } from 'lucide-react-native';
import { AnimatedStagger } from '../../core/animations';
import { colors } from '@nermai/theme';

export const AdminLiveSessions = ({ navigation }: { navigation: any }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  useEffect(() => {
    fetchLiveSessions();
  }, []);

  const fetchLiveSessions = async () => {
    try {
      const { LiveSessionApi } = require('@nermai/api');
      const res = await LiveSessionApi.listSessions(undefined, { headers: { 'X-Is-Admin': 'true' } });
      setSessions(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateToAttendance = (session: any) => {
    setSheetVisible(false);
    // Assumes LiveAttendanceControl is registered in the Stack Navigator
    navigation.navigate('LiveAttendanceControl', { session });
  };

  const renderItem = ({ item, index }: { item: any, index: number }) => (
    <AnimatedStagger index={index} style={{ marginBottom: 12 }}>
      <TouchableOpacity style={[styles.card, item.lamsStatus === 'ATTENDANCE_ACTIVE' && styles.liveCard]} activeOpacity={0.8}>
        <View style={styles.headerRow}>
          <Text style={styles.badge}>
            {item.lamsStatus === 'ATTENDANCE_ACTIVE' ? 'ATTENDANCE ACTIVE' : item.liveStatus === 'LIVE' ? 'LIVE NOW' : 'SCHEDULED'}
          </Text>
          {item.lamsStatus === 'ATTENDANCE_ACTIVE' && <View style={styles.pulseDot} />}
          <View style={{ flex: 1 }} />
          <TouchableOpacity 
            onPress={() => {
              setSelectedSession(item);
              setSheetVisible(true);
            }} 
            style={{ padding: 4 }}
          >
            <MoreVertical size={20} color="#888" />
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.time}>{new Date(item.startTime).toLocaleString()} • {item.provider.toUpperCase()}</Text>
        
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.manageBtn}
            onPress={() => navigateToAttendance(item)}
          >
            <Text style={styles.manageBtnText}>Manage Attendance</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </AnimatedStagger>
  );

  const handleDelete = () => {
    if (!selectedSession) return;
    const msg = `Are you sure you want to delete the session "${selectedSession.title}"?`;
    
    const executeDelete = async () => {
      try {
        setSheetVisible(false);
        const { LiveSessionApi } = require('@nermai/api');
        await LiveSessionApi.deleteSession(selectedSession.id);
        await fetchLiveSessions();
      } catch (err: any) {
        if (Platform.OS === 'web') {
          window.alert(err?.response?.data?.message || err.message || 'Failed to delete session.');
        } else {
          Alert.alert('Error', err?.response?.data?.message || err.message || 'Failed to delete session.');
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(msg)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Session?',
        msg,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <ChevronLeft size={24} color="#F8F8F8" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Live Sessions</Text>
        </View>
        
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        ) : sessions.length === 0 ? (
          <View style={styles.center}>
            <Video size={48} color="#444" />
            <Text style={styles.emptyText}>No live sessions found.</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
        <AdminFAB label="Schedule" onPress={() => navigation.navigate('ClassForm', { breadcrumb: 'Live Sessions' })} icon={<Video size={20} color={colors.background} />} />

        <ActionSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          title={selectedSession ? `Manage ${selectedSession.title}` : ''}
          items={[
            { label: 'Edit Class', onPress: () => { setSheetVisible(false); setTimeout(() => navigation.navigate('ClassForm', { cls: selectedSession, breadcrumb: 'Live Sessions' }), 400); } },
            { label: 'LAMS Control', onPress: () => navigateToAttendance(selectedSession) },
            { label: 'Delete', onPress: handleDelete, destructive: true }
          ]}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingTop: 10 },
  backButton: { marginRight: 12, padding: 4 },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary },
  listContent: { paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: colors.textSecondary, fontSize: 16, marginTop: 12 },
  card: { backgroundColor: colors.surface, borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1, padding: 20, borderRadius: 16 },
  liveCard: { backgroundColor: 'rgba(139, 0, 0, 0.1)', borderColor: 'rgba(178, 34, 34, 0.4)' },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'space-between' },
  badge: { color: colors.accent, fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  title: { color: colors.textPrimary, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  time: { color: '#E5E5E5', fontSize: 14, opacity: 0.8 },
  footer: { marginTop: 16, flexDirection: 'row', justifyContent: 'flex-end' },
  manageBtn: { backgroundColor: 'rgba(212, 175, 55, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(212, 175, 55, 0.3)' },
  manageBtnText: { color: colors.primary, fontWeight: 'bold', fontSize: 13 }
});

