/**
 * ZoomSdkTestScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ISOLATED EXPERIMENT — Determines if the Zoom SDK native module can run in the
 * current Expo environment.
 *
 * Requirements:
 * - NO imports from any existing live session components
 * - NO modifications to backend architecture
 * - Renders a standalone UI to prove native compatibility
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { runZoomCompatibilityCheck, ZoomCompatibilityResult } from './ZoomCompatibility';
import { initializeZoomSdk, joinZoomMeeting } from './ZoomSdkProvider';
import { fetchSdkTestSignature, TEST_NAME } from './ZoomSdkBridge';
import { ZoomStatusCard } from './components/ZoomStatusCard';
import { JoinButton } from './components/JoinButton';
import { colors } from '@nermai/theme';

export const ZoomSdkTestScreen = () => {
  const [compatCheck, setCompatCheck] = useState<ZoomCompatibilityResult | null>(null);
  
  const [meetingId, setMeetingId] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState(TEST_NAME);
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('Waiting to initialize...');
  const [error, setError] = useState<string | null>(null);

  // Checklist states
  const [sdkInitialized, setSdkInitialized] = useState(false);
  const [meetingJoined, setMeetingJoined] = useState(false);
  
  // Phase 1.5 Checklist States
  const [nativeUiOpened, setNativeUiOpened] = useState<boolean | null>(null);
  const [audioWorking, setAudioWorking] = useState<boolean | null>(null);
  const [videoWorking, setVideoWorking] = useState<boolean | null>(null);
  const [micWorking, setMicWorking] = useState<boolean | null>(null);
  const [participantsVisible, setParticipantsVisible] = useState<boolean | null>(null);
  const [leaveWorking, setLeaveWorking] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Run the static compatibility check on mount
    const check = runZoomCompatibilityCheck();
    setCompatCheck(check);
    if (!check.canRunInCurrentEnv) {
      setStatus('FAILED: Native module unavailable in ' + check.environment);
    }
  }, []);

  const handleTestFlow = async () => {
    if (!compatCheck?.canRunInCurrentEnv) return;
    
    setLoading(true);
    setError(null);
    setStatus('Fetching signature from backend...');

    try {
      // 2. Fetch signature
      const sigData = await fetchSdkTestSignature();
      setMeetingId(sigData.meetingId);
      setPassword(sigData.password);

      setStatus('Initializing Zoom SDK...');
      
      // 3. Initialize SDK
      const initRes = await initializeZoomSdk(sigData.sdkKey, sigData.sdkSecret || '');
      if (!initRes.success) {
        throw new Error(`Init failed: ${initRes.error}`);
      }
      setSdkInitialized(true);
      setStatus('Joining Meeting...');

      // 4. Join Meeting
      const joinRes = await joinZoomMeeting({
        jwtToken: sigData.signature,
        meetingNumber: sigData.meetingId,
        password: sigData.password,
        displayName: displayName,
        sdkKey: sigData.sdkKey,
      });

      console.log('Join Meeting Result:', joinRes);

      if (!joinRes.success) {
        throw new Error(`Join failed: ${joinRes.error}`);
      }
      
      setMeetingJoined(true);
      setStatus('READY: Zoom SDK Launched Successfully');

      // Note: Audio, Video, and Participants require manual verification in this isolated test,
      // as they involve native UI overlays rendering successfully on top of React Native.
      
    } catch (e: any) {
      console.error(e);
      setError(e.message || String(e));
      setStatus('FAILED');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Zoom SDK Test</Text>
          <Text style={styles.subtitle}>Isolated Compatibility Experiment</Text>
        </View>

        {compatCheck && (
          <ZoomStatusCard 
            environment={compatCheck.environment}
            sdkAvailable={compatCheck.sdkAvailable}
            message={compatCheck.message}
            requiresAction={compatCheck.requiresAction}
          />
        )}

        <View style={styles.formCard}>
          <Text style={styles.sectionTitle}>Meeting Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Meeting ID (Auto-filled from backend)</Text>
            <TextInput
              style={styles.input}
              value={meetingId}
              onChangeText={setMeetingId}
              placeholder="e.g. 87983691195"
              placeholderTextColor="rgba(255,255,255,0.3)"
              editable={false} // Since this is a signature test, it must match the backend
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="rgba(255,255,255,0.3)"
              secureTextEntry
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Enter name"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
          </View>
        </View>

        <View style={styles.statusBox}>
          <Text style={styles.statusLabel}>Live Status:</Text>
          <Text style={[
            styles.statusText,
            status.includes('READY') && styles.statusReady,
            status.includes('FAILED') && styles.statusFailed,
          ]}>
            {status}
          </Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
        </View>

        <View style={styles.checklistCard}>
          <Text style={styles.sectionTitle}>Diagnostic Checklist</Text>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistLabel}>Environment:</Text>
            <Text style={styles.checklistValue}>{compatCheck?.environment === 'expo-go' ? 'Expo Go' : 'Dev Build'}</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistLabel}>Native module detected:</Text>
            <Text style={styles.checklistValue}>{compatCheck?.sdkAvailable ? 'YES' : 'NO'}</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistLabel}>SDK initialized:</Text>
            <Text style={styles.checklistValue}>{sdkInitialized ? 'YES' : 'NO'}</Text>
          </View>
          <View style={styles.checklistItem}>
            <Text style={styles.checklistLabel}>Meeting joined:</Text>
            <Text style={styles.checklistValue}>{meetingJoined ? 'YES' : 'NO'}</Text>
          </View>
        </View>

        {!meetingJoined && (
          <JoinButton 
            title="Run Full SDK Test (Init + Join)"
            onPress={handleTestFlow}
            loading={loading}
            disabled={!compatCheck?.canRunInCurrentEnv}
          />
        )}
        
        {meetingJoined && nativeUiOpened === null && (
          <View style={styles.manualControls}>
             <Text style={styles.manualControlsTitle}>Join Status: SUCCESS</Text>
             <Text style={styles.questionText}>Did Zoom open the native meeting UI?</Text>
             <View style={styles.buttonRow}>
               <JoinButton title="YES" onPress={() => setNativeUiOpened(true)} loading={false} disabled={false} />
               <JoinButton title="NO" onPress={() => setNativeUiOpened(false)} loading={false} disabled={false} />
             </View>
          </View>
        )}

        {nativeUiOpened === true && (
          <View style={styles.manualControls}>
             <Text style={styles.manualControlsTitle}>Phase 1.5: Native Overlay Test</Text>
             
             <View style={styles.questionRow}>
               <Text style={styles.questionTextSmall}>Camera visible?</Text>
               <View style={styles.miniBtnRow}>
                 <JoinButton title="YES" onPress={() => setVideoWorking(true)} loading={false} disabled={videoWorking !== null} />
                 <JoinButton title="NO" onPress={() => setVideoWorking(false)} loading={false} disabled={videoWorking !== null} />
               </View>
             </View>

             <View style={styles.questionRow}>
               <Text style={styles.questionTextSmall}>Microphone working?</Text>
               <View style={styles.miniBtnRow}>
                 <JoinButton title="YES" onPress={() => setMicWorking(true)} loading={false} disabled={micWorking !== null} />
                 <JoinButton title="NO" onPress={() => setMicWorking(false)} loading={false} disabled={micWorking !== null} />
               </View>
             </View>

             <View style={styles.questionRow}>
               <Text style={styles.questionTextSmall}>Participants visible?</Text>
               <View style={styles.miniBtnRow}>
                 <JoinButton title="YES" onPress={() => setParticipantsVisible(true)} loading={false} disabled={participantsVisible !== null} />
                 <JoinButton title="NO" onPress={() => setParticipantsVisible(false)} loading={false} disabled={participantsVisible !== null} />
               </View>
             </View>

             <View style={styles.questionRow}>
               <Text style={styles.questionTextSmall}>Leave meeting button works?</Text>
               <View style={styles.miniBtnRow}>
                 <JoinButton title="YES" onPress={() => setLeaveWorking(true)} loading={false} disabled={leaveWorking !== null} />
                 <JoinButton title="NO" onPress={() => setLeaveWorking(false)} loading={false} disabled={leaveWorking !== null} />
               </View>
             </View>
             
          </View>
        )}

        {nativeUiOpened === false && (
          <View style={styles.statusBox}>
             <Text style={styles.errorText}>Native UI Failed. Continue using WebView strategy.</Text>
          </View>
        )}
        
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0a0a0a' },
  container: { padding: 20, paddingBottom: 60 },
  header: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.6)' },
  
  formCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 16,
  },
  
  statusBox: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  statusLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  statusText: { fontSize: 14, color: '#e5e5e5', fontWeight: '600' },
  statusReady: { color: '#4ade80' },
  statusFailed: { color: '#f87171' },
  errorText: {
    marginTop: 8,
    fontSize: 13,
    color: '#fca5a5',
    backgroundColor: 'rgba(239,68,68,0.1)',
    padding: 8,
    borderRadius: 6,
  },
  
  checklistCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 20,
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  checklistLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  checklistValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  manualControls: {
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)',
  },
  manualControlsTitle: {
    color: '#93c5fd',
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  questionText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  questionTextSmall: {
    color: '#fff',
    fontSize: 14,
    flex: 1,
  },
  miniBtnRow: {
    flexDirection: 'row',
    gap: 8,
  }
});
