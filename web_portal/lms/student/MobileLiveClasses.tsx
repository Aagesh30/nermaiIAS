import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LiveSessionApi } from '@nermai/api';
import { AnimatedStagger, AnimatedFadeIn } from '../../core/animations';
import { colors, typography, spacing, radius } from '@nermai/theme';
import { Radio, Clock, PlayCircle, ChevronRight, Wifi } from 'lucide-react-native';

// ─── Countdown hook ───────────────────────────────────────────────────────────
const useCountdown = (targetTime: string | null) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!targetTime) return;
    const update = () => {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Starting now'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);
  return timeLeft;
};

// ─── Session Card ─────────────────────────────────────────────────────────────
const SessionCard = ({ item, index, onJoin, onViewRecording }: { item: any; index: number; onJoin: (id: string) => void; onViewRecording: (session: any) => void }) => {
  const isLive = ['LIVE', 'JOINING', 'HOST_CONNECTED', 'ongoing'].includes(item.status);
  const isScheduled = item.status === 'SCHEDULED' || item.status === 'scheduled';
  const isRecorded = item.status === 'ENDED' || item.status === 'ended' || item.status === 'RECORDED_AVAILABLE';
  const countdown = useCountdown(isScheduled ? (item.scheduledStartTime || item.startTime) : null);

  return (
    <AnimatedStagger index={index}>
      <View style={[styles.card, isLive && styles.cardLive, isScheduled && styles.cardScheduled]}>
        {/* Status Badge */}
        <View style={styles.cardHeader}>
          <View style={[styles.badge, isLive && styles.badgeLive, isScheduled && styles.badgeScheduled, isRecorded && styles.badgeRecorded]}>
            {isLive && <View style={styles.livePulse} />}
            <Text style={styles.badgeText}>
              {isLive ? 'LIVE NOW' : isScheduled ? 'UPCOMING' : 'COMPLETED'}
            </Text>
          </View>
          {item.platform && (
            <Text style={styles.platform}>{item.provider || item.platform}</Text>
          )}
        </View>

        {/* Title & Subject */}
        <Text style={styles.cardTitle} numberOfLines={2}>{item.title || item.className || 'Live Session'}</Text>
        {item.subjectName && (
          <Text style={styles.cardSubject}>{item.subjectName}</Text>
        )}

        {/* Meta */}
        <View style={styles.cardMeta}>
          {isLive && (
            <View style={styles.metaItem}>
              <Wifi size={12} color={colors.accent} />
              <Text style={[styles.metaText, { color: colors.accent }]}>Live in progress</Text>
            </View>
          )}
          {isScheduled && countdown && (
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.primary} />
              <Text style={[styles.metaText, { color: colors.primary }]}>Starts in {countdown}</Text>
            </View>
          )}
          {!isLive && !isScheduled && item.scheduledStartTime && (
            <View style={styles.metaItem}>
              <Clock size={12} color={colors.textSecondary} />
              <Text style={styles.metaText}>{new Date(item.scheduledStartTime || item.startTime).toLocaleString()}</Text>
            </View>
          )}
          {item.teacherName && (
            <Text style={styles.teacherText}>👤 {item.teacherName}</Text>
          )}
        </View>

        {/* Action Button */}
        {isLive && (
          <TouchableOpacity style={styles.joinBtn} onPress={() => onJoin(item.id)} activeOpacity={0.8}>
            <Wifi size={16} color="#fff" />
            <Text style={styles.joinBtnText}>Join Now</Text>
          </TouchableOpacity>
        )}
        {isScheduled && (
          <View style={styles.scheduledInfo}>
            <Text style={styles.scheduledInfoText}>Class will be available at start time</Text>
          </View>
        )}
        {isRecorded && item.recordingUrl && (
          <TouchableOpacity
            style={styles.recordingBtn}
            onPress={() => onViewRecording(item)}
            activeOpacity={0.8}
          >
            <PlayCircle size={16} color={colors.primary} />
            <Text style={styles.recordingBtnText}>View Recording</Text>
          </TouchableOpacity>
        )}
      </View>
    </AnimatedStagger>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────
export const MobileLiveClasses = ({ navigation }: { navigation: any }) => {
  const [allSessions, setAllSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'upcoming' | 'completed'>('ongoing');

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await LiveSessionApi.listSessions();
      const data = res.data?.data || res.data || [];
      setAllSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('MobileLiveClasses: Failed to fetch sessions', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, [fetchSessions])
  );

  const handleJoin = async (sessionId: string) => {
    try {
      const res = await LiveSessionApi.joinSession(sessionId);
      const data = res.data?.data;

      console.log("=== JOIN PAYLOAD ===");
      console.log(JSON.stringify(data, null, 2));

      if (data?.status === 'WAITING_ROOM') {
        Alert.alert(
          'Waiting Room',
          'The host has enabled a waiting room for this live session. You will automatically be admitted once approved by an instructor.'
        );
        return;
      }

      // Always navigate through PlayerAccess which handles the full SDK player flow,
      // access checks, waiting states, and LAMS join/leave recording.
      navigation.navigate('PlayerAccess', { 
        classId: data?.classId || sessionId, 
        classTitle: 'Live Session',
        sessionId,
        livePayload: data
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err?.message || 'Failed to join live session';
      Alert.alert('Access Restricted', msg);
    }
  };

  const handleViewRecording = (session: any) => {
    navigation.navigate('PlayerAccess', {
      classId: session.classId || session.id,
      classTitle: session.title || 'Recorded Session',
      sessionId: session.id
    });
  };

  // Filter sessions by status
  const ongoing = allSessions.filter(s => ['LIVE', 'JOINING', 'HOST_CONNECTED', 'ongoing'].includes(s.status));
  const upcoming = allSessions.filter(s => s.status === 'SCHEDULED' || s.status === 'scheduled');
  const completed = allSessions.filter(s => s.status === 'ENDED' || s.status === 'ended' || s.status === 'RECORDED_AVAILABLE' || s.status === 'completed');

  const displayData = activeTab === 'ongoing' ? ongoing : activeTab === 'upcoming' ? upcoming : completed;

  const TABS: { key: 'ongoing' | 'upcoming' | 'completed'; label: string; count: number }[] = [
    { key: 'ongoing', label: 'Live Now', count: ongoing.length },
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'completed', label: 'Completed', count: completed.length },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <AnimatedFadeIn style={styles.header}>
        <View style={styles.headerLeft}>
          <Radio size={22} color={colors.accent} />
          <Text style={styles.pageTitle}>Live Classes</Text>
        </View>
        {ongoing.length > 0 && (
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveCount}>{ongoing.length} Active</Text>
          </View>
        )}
      </AnimatedFadeIn>

      {/* Segmented Tab Bar */}
      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.key && styles.tabBadgeActive]}>
                <Text style={styles.tabBadgeText}>{tab.count}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: spacing.md }}>Fetching sessions...</Text>
        </View>
      ) : displayData.length === 0 ? (
        <View style={styles.center}>
          <Radio size={48} color={colors.textSecondary} strokeWidth={1} />
          <Text style={styles.emptyTitle}>
            {activeTab === 'ongoing' ? 'No live sessions right now' : activeTab === 'upcoming' ? 'No upcoming sessions' : 'No completed sessions'}
          </Text>
          <Text style={styles.emptySubtext}>
            {activeTab === 'ongoing' ? 'Check the Upcoming tab for scheduled classes.' : activeTab === 'upcoming' ? 'Your schedule is clear.' : 'Completed classes will appear here.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={displayData}
          keyExtractor={(item) => item.id || String(Math.random())}
          renderItem={({ item, index }) => (
            <SessionCard item={item} index={index} onJoin={handleJoin} onViewRecording={handleViewRecording} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.md },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pageTitle: { fontSize: typography.sizes.h1, fontWeight: 'bold', color: colors.textPrimary },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${colors.accent}20`, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: `${colors.accent}40` },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  liveCount: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  tabBar: { flexDirection: 'row', marginHorizontal: spacing.lg, marginBottom: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, padding: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, gap: 6 },
  tabActive: { backgroundColor: colors.background, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.4, shadowRadius: 4, elevation: 3 },
  tabText: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  tabTextActive: { color: colors.primary, fontWeight: '800' },
  tabBadge: { width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  tabBadgeActive: { backgroundColor: `${colors.primary}30` },
  tabBadgeText: { fontSize: 9, color: colors.textSecondary, fontWeight: 'bold' },
  listContent: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  emptyTitle: { color: colors.textPrimary, fontSize: typography.sizes.h3, fontWeight: '600', marginTop: spacing.md, textAlign: 'center' },
  emptySubtext: { color: colors.textSecondary, fontSize: typography.sizes.body2, marginTop: spacing.sm, textAlign: 'center' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardLive: { borderColor: `${colors.accent}40`, backgroundColor: `rgba(255,59,48,0.07)` },
  cardScheduled: { borderColor: `${colors.primary}30` },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  badgeLive: { backgroundColor: `${colors.accent}25`, borderWidth: 1, borderColor: `${colors.accent}50` },
  badgeScheduled: { backgroundColor: `${colors.primary}20`, borderWidth: 1, borderColor: `${colors.primary}40` },
  badgeRecorded: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  badgeText: { fontSize: 10, fontWeight: '800', color: colors.textPrimary, letterSpacing: 0.8 },
  livePulse: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
  platform: { fontSize: 11, color: colors.textSecondary, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cardTitle: { fontSize: typography.sizes.h3, fontWeight: '700', color: colors.textPrimary, marginBottom: 4, lineHeight: 22 },
  cardSubject: { fontSize: typography.sizes.body2, color: colors.textSecondary, marginBottom: spacing.sm },
  cardMeta: { gap: 4, marginBottom: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: colors.textSecondary },
  teacherText: { fontSize: 12, color: colors.textSecondary },
  joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 12, marginTop: 4 },
  joinBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  scheduledInfo: { alignItems: 'center', paddingVertical: spacing.sm, backgroundColor: `${colors.primary}10`, borderRadius: radius.sm, borderWidth: 1, borderColor: `${colors.primary}20` },
  scheduledInfoText: { color: colors.primary, fontSize: 12 },
  recordingBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderColor: colors.primary, borderWidth: 1, borderRadius: radius.sm, paddingVertical: 12, marginTop: 4 },
  recordingBtnText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
});
