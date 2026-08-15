import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { LiveAttendanceApi, LiveSessionApi } from '@nermai/api';
import { colors } from '@nermai/theme';
import { ChevronLeft, Users, Clock, LogOut, CheckCircle, AlertTriangle, Hand, ShieldAlert, UserCheck, UserX, Ban, RotateCcw, Video } from 'lucide-react-native';
import { db, auth } from '../../core/firebaseConfig';
import { useLiveSessionRealtime } from '@nermai/shared/src/hooks/useLiveSessionRealtime';
import { useLiveSessionModeration } from '@nermai/shared/src/hooks/useLiveSessionModeration';
import { LiveConsoleFactory } from '../../student/streaming/LiveConsoleFactory';

export const LiveAttendanceControlScreen = ({ route, navigation }: any) => {
  const { session } = route.params; // AdminLiveSessions passes a class/session object here
  const classId = session.classId || session.id;

  const [activeTab, setActiveTab] = useState<'attendance' | 'participants'>('attendance');
  const [joinData, setJoinData] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  // LAMS session ID — separate from the live_session ID
  const [lamsSessionId, setLamsSessionId] = useState<string | null>(null);

  const [globalBlocks, setGlobalBlocks] = useState<any[]>([]);

  const {
    activeSession,
    participants,
    activityLogs: liveLogs,
    loading: syncLoading,
    joinStatus,
    setJoinStatus
  } = useLiveSessionRealtime(sessionId, db, auth);

  const {
    handleParticipantAction,
    handleGlobalBlock,
    handleGlobalUnblock,
    loading: partLoading
  } = useLiveSessionModeration(sessionId);

  useEffect(() => {
    if (session.status === 'LIVE') {
      handleJoinClass(false); 
    }
  }, []);

  useEffect(() => {
    if (sessionId) {
      // No custom headers needed — backend uses JWT for role-based authorization
      LiveSessionApi.listGlobalBlocks().then(res => {
        setGlobalBlocks(res.data?.data || []);
      }).catch(() => {});
    }
  }, [sessionId]);

  useEffect(() => {
    if (activeSession?.status === 'LIVE' && activeSession.attendance?.status === 'LIVE') {
      const startMs = new Date(activeSession.attendance.startedAt).getTime();
      const int = setInterval(() => {
        setTimer(Math.floor((Date.now() - startMs) / 1000));
      }, 1000);
      return () => clearInterval(int);
    } else {
      setTimer(0);
    }
  }, [activeSession?.attendance?.status]);



  const handleJoinClass = async (launchProvider: boolean = true) => {
    try {
      setJoinStatus('JOINING');
      const res = await LiveSessionApi.joinByClass(classId);
      const data = res.data?.data;
      
      setJoinStatus('INITIALIZING');
      
      if (launchProvider && data) {
        setJoinData(data);
      }

      if (data?.sessionId) {
        setSessionId(data.sessionId);
        setJoinStatus('CONNECTED');
      } else {
        setJoinStatus('IDLE');
      }
    } catch (e: any) {
      Alert.alert('Join Failed', e.response?.data?.message || 'Failed to join the class.');
      setJoinStatus('IDLE');
    }
  };

  const handleStartAttendance = async () => {
    if (!activeSession) return;
    try {
      const res = await LiveAttendanceApi.startAttendance({
        liveSessionId: activeSession.id,
        classId: activeSession.classId,
      });
      // Store the LAMS session ID for endAttendance (different from live_session ID)
      const lamsId = res.data?.data?.id || res.data?.id;
      if (lamsId) setLamsSessionId(lamsId);
      // Firestore onSnapshot will update activeSession automatically
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to start attendance');
    } 
  };

  const handleEndAttendance = async () => {
    // Use the LAMS session ID (from startAttendance response), not the live_session ID
    const targetId = lamsSessionId || activeSession?.activeAttendanceSessionId;
    if (!targetId) {
      Alert.alert('Error', 'Cannot find active attendance session. Please reload.');
      return;
    }
    try {
      await LiveAttendanceApi.endAttendance(targetId);
      setLamsSessionId(null);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to end attendance');
    }
  };

  const handleEndStream = async () => {
    if (!activeSession) return;
    Alert.alert('End Stream', 'This will automatically end attendance, kick all users, and close the session. Proceed?', [
      { text: 'Cancel' },
      { text: 'Yes, End Stream', style: 'destructive', onPress: async () => {
        try {
          await getApiClient().post(`/live-sessions/${activeSession.id}/end`);
        } catch (e: any) {
          Alert.alert('Error', e.response?.data?.message || 'Failed to end stream');
        }
      }}
    ])
  };

  // Participant Moderation Actions are now provided by useLiveSessionModeration

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (syncLoading && !activeSession && joinStatus !== 'IDLE') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
           <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
             <ChevronLeft size={24} color="#F8F8F8" />
           </TouchableOpacity>
           <Text style={styles.pageTitle} numberOfLines={1}>{session.title}</Text>
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  const isLive = activeSession?.status === 'LIVE' || activeSession?.status === 'HOST_CONNECTED';
  const isHostConnected = activeSession?.status === 'HOST_CONNECTED' || activeSession?.status === 'LIVE';
  const isEnded = activeSession?.status === 'ENDED' || activeSession?.status === 'FINALIZED' || activeSession?.status === 'ENDING';
  const attendanceLive = activeSession?.attendance?.status === 'RUNNING';

  // Categorize participants
  const waitingParticipants = participants.filter((p) => p.moderationStatus === 'WAITING');
  const activeParticipants = participants.filter((p) => p.moderationStatus === 'APPROVED' || p.moderationStatus === 'NONE');
  const kickedParticipants = participants.filter((p) => p.moderationStatus === 'KICKED');
  const raisedHandParticipants = participants.filter((p) => p.isHandRaised);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#F8F8F8" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle} numberOfLines={1}>
            {session.title}
          </Text>
          <Text style={styles.headerSub}>Live Session Console</Text>
        </View>
      </View>

      {!isLive && !isEnded ? (
        // BEFORE JOIN STATE
        <View style={styles.centerStage}>
           <Video size={64} color={colors.primary} style={{ opacity: 0.8, marginBottom: 20 }} />
           <Text style={styles.stageTitle}>Class is Scheduled</Text>
           <Text style={styles.stageSub}>Click below to start the stream and unlock the console.</Text>
           
           <TouchableOpacity 
             style={[styles.bigJoinBtn, joinStatus !== 'IDLE' && { opacity: 0.7 }]} 
             onPress={() => handleJoinClass(true)}
             disabled={joinStatus !== 'IDLE'}
           >
             {joinStatus !== 'IDLE' ? (
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                 <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                 <Text style={styles.bigJoinText}>{joinStatus}...</Text>
               </View>
             ) : (
               <Text style={styles.bigJoinText}>JOIN LIVE CLASS</Text>
             )}
           </TouchableOpacity>
        </View>
      ) : (
        // AFTER JOIN STATE (LIVE or ENDED)
        <>
          {joinData && joinData.provider && (
            <View style={{ height: 250, width: '100%', backgroundColor: '#000' }}>
              <LiveConsoleFactory role="admin" provider={joinData.provider} payload={joinData} />
            </View>
          )}
          {/* Segmented Tab Bar */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'attendance' && styles.tabButtonActive]}
              onPress={() => setActiveTab('attendance')}
            >
              <Clock size={16} color={activeTab === 'attendance' ? colors.background : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'attendance' && styles.tabTextActive]}>Attendance</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'participants' && styles.tabButtonActive]}
              onPress={() => setActiveTab('participants')}
            >
              <Users size={16} color={activeTab === 'participants' ? colors.background : colors.textSecondary} />
              <Text style={[styles.tabText, activeTab === 'participants' && styles.tabTextActive]}>
                Participants ({participants.length})
              </Text>
              {waitingParticipants.length > 0 && <View style={styles.badgeDot} />}
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
            {activeTab === 'attendance' ? (
              <>
                {/* Main Controls */}
                <View style={styles.card}>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: attendanceLive ? colors.accent : isEnded ? colors.textSecondary : colors.primary },
                      ]}
                    />
                    <Text style={styles.statusText}>
                      {attendanceLive ? 'ATTENDANCE RUNNING' : isEnded ? 'SESSION ENDED' : 'ATTENDANCE NOT RUNNING'}
                    </Text>
                  </View>

                  {attendanceLive && (
                    <View style={styles.timerBox}>
                      <Clock size={20} color={colors.primary} style={{ marginRight: 8 }} />
                      <Text style={styles.timerText}>{formatTime(timer)}</Text>
                    </View>
                  )}

                  {!attendanceLive && !isEnded ? (
                    isHostConnected ? (
                      <TouchableOpacity style={styles.startBtn} onPress={handleStartAttendance}>
                        <Text style={styles.startBtnText}>START ATTENDANCE</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.startBtn, { backgroundColor: '#555' }]}>
                        <Text style={styles.startBtnText}>WAITING FOR INSTRUCTOR TO CONNECT...</Text>
                      </View>
                    )
                  ) : attendanceLive ? (
                    <TouchableOpacity style={styles.endBtn} onPress={handleEndAttendance}>
                      <Text style={styles.endBtnText}>END ATTENDANCE</Text>
                    </TouchableOpacity>
                  ) : null}

                  <TouchableOpacity
                    style={[styles.endClassBtn, isEnded && { opacity: 0.4 }]}
                    onPress={handleEndStream}
                    disabled={isEnded}
                  >
                    <LogOut size={16} color={isEnded ? '#888' : '#FF4444'} style={{ marginRight: 8 }} />
                    <Text style={[styles.endClassBtnText, isEnded && { color: '#888' }]}>
                      {isEnded ? 'SESSION HAS ENDED' : 'END STREAM'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Live Feed / Stats */}
                {(isLive || isEnded) && (
                  <View style={styles.feedCard}>
                    <Text style={styles.sectionTitle}>Live Activity Feed</Text>
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{participants.length}</Text>
                        <Text style={styles.statLabel}>Total Logs</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statNumber}>{waitingParticipants.length}</Text>
                        <Text style={styles.statLabel}>Waiting</Text>
                      </View>
                    </View>

                    {liveLogs.map((log: any) => (
                      <View key={log.id} style={styles.logItem}>
                        <View style={styles.logIconBox}>
                          <CheckCircle size={14} color={colors.success} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.logText}>
                            <Text style={{ fontWeight: '600' }}>{log.metadata?.displayName || log.studentId}</Text> {log.eventType === 'JOINED' ? 'joined' : log.eventType === 'LEFT' ? 'left' : log.eventType.toLowerCase().replace('_', ' ')}.
                          </Text>
                          <Text style={styles.logTime}>{new Date(log.timestamp).toLocaleTimeString()}</Text>
                        </View>
                      </View>
                    ))}
                    {liveLogs.length === 0 && (
                      <Text style={styles.emptyLogText}>No activity recorded yet.</Text>
                    )}
                  </View>
                )}
              </>
            ) : (
              /* Participants Tab */
              <View style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Waiting Room ({waitingParticipants.length})</Text>
                </View>
                {waitingParticipants.map((p) => (
                  <View key={p.studentId} style={styles.participantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.participantName}>{p.displayName || p.studentId}</Text>
                      <Text style={styles.participantSub}>Waiting since {new Date(p.requestedAt).toLocaleTimeString()}</Text>
                    </View>
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: 'rgba(76, 175, 80, 0.2)' }]}
                        onPress={() => handleParticipantAction(p.studentId, 'approve')}
                      >
                        <UserCheck size={16} color={colors.success} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: 'rgba(244, 67, 54, 0.2)' }]}
                        onPress={() => handleParticipantAction(p.studentId, 'reject')}
                      >
                        <UserX size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                  <Text style={styles.sectionTitle}>Active Participants ({activeParticipants.length})</Text>
                </View>
                {activeParticipants.map((p) => (
                  <View key={p.studentId} style={styles.participantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.participantName}>{p.displayName || p.studentId}</Text>
                      {p.isHandRaised && (
                        <View style={styles.handBadge}>
                          <Hand size={12} color="#fff" />
                          <Text style={styles.handBadgeText}>Hand Raised</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.actionRow}>
                      {p.isHandRaised && (
                        <TouchableOpacity
                          style={[styles.actionBtn, { backgroundColor: 'rgba(255, 193, 7, 0.2)' }]}
                          onPress={() => handleParticipantAction(p.studentId, 'lower-hand')}
                        >
                          <Hand size={16} color="#FFC107" />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: 'rgba(244, 67, 54, 0.1)' }]}
                        onPress={() => handleParticipantAction(p.studentId, 'kick', { kickReasonCode: 'DISRUPTION' })}
                      >
                        <LogOut size={16} color="#F44336" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: 'rgba(156, 39, 176, 0.1)' }]}
                        onPress={() => handleGlobalBlock(p.studentId, p.displayName)}
                      >
                        <Ban size={16} color="#9C27B0" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}

                {(kickedParticipants.length > 0 || globalBlocks.length > 0) && (
                  <View style={[styles.sectionHeader, { marginTop: 20 }]}>
                    <Text style={styles.sectionTitle}>Restricted Users</Text>
                  </View>
                )}
                
                {kickedParticipants.map((p) => (
                  <View key={p.studentId} style={styles.participantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.participantName}>{p.displayName || p.studentId}</Text>
                      <Text style={styles.participantSub}>Kicked from session</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.outlineBtn}
                      onPress={() => handleParticipantAction(p.studentId, 'allow-rejoin')}
                    >
                      <RotateCcw size={14} color={colors.primary} />
                      <Text style={styles.outlineBtnText}>Allow Rejoin</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                {globalBlocks.map((b) => (
                  <View key={b.studentId} style={styles.participantRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.participantName}>{b.displayName || b.studentId}</Text>
                      <Text style={styles.participantSub}>Globally Blocked</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.outlineBtn}
                      onPress={() => handleGlobalUnblock(b.studentId)}
                    >
                      <RotateCcw size={14} color={colors.primary} />
                      <Text style={styles.outlineBtnText}>Unblock</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10 },
  backButton: { marginRight: 12 },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.primary, marginTop: 2, letterSpacing: 1 },
  
  centerStage: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  stageTitle: { fontSize: 24, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 12 },
  stageSub: { fontSize: 16, color: colors.textSecondary, textAlign: 'center', marginBottom: 40 },
  bigJoinBtn: { backgroundColor: colors.primary, paddingVertical: 18, paddingHorizontal: 40, borderRadius: 30, elevation: 4 },
  bigJoinText: { color: colors.background, fontWeight: '900', fontSize: 16, letterSpacing: 1 },

  tabContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabButtonActive: { borderBottomColor: colors.primary },
  tabText: { marginLeft: 8, fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  tabTextActive: { color: colors.background },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF4444', marginLeft: 4 },
  
  content: { flex: 1, paddingHorizontal: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 20, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  dot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  statusText: { fontSize: 14, fontWeight: 'bold', color: colors.textPrimary, letterSpacing: 1 },
  
  timerBox: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', marginVertical: 20, backgroundColor: 'rgba(212,175,55,0.1)', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30 },
  timerText: { fontSize: 32, fontWeight: '300', color: colors.primary, fontVariant: ['tabular-nums'] },
  
  startBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  startBtnText: { color: colors.background, fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
  
  endBtn: { backgroundColor: '#FF4444', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  endBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, letterSpacing: 1 },
  
  endClassBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 24, paddingVertical: 12, borderWidth: 1, borderColor: '#FF4444', borderRadius: 12 },
  endClassBtnText: { color: '#FF4444', fontWeight: 'bold', fontSize: 13, letterSpacing: 1 },
  
  feedCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.textPrimary, marginBottom: 16 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, alignItems: 'center', marginHorizontal: 4 },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: colors.primary },
  statLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  
  logItem: { flexDirection: 'row', marginBottom: 16 },
  logIconBox: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(76,175,80,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  logText: { fontSize: 14, color: colors.textPrimary },
  logTime: { fontSize: 11, color: colors.textSecondary, marginTop: 2 },
  emptyLogText: { color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', marginTop: 10 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  participantRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  participantName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  participantSub: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  handBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFC107', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
  handBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#000', marginLeft: 4 },
  actionRow: { flexDirection: 'row' },
  actionBtn: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginLeft: 8 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.primary },
  outlineBtnText: { color: colors.primary, fontSize: 12, fontWeight: '600', marginLeft: 4 },
});
