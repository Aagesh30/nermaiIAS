/**
 * TeacherLiveScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Teacher-facing live session screen.
 * Provider routing delegated to MeetingPlayerFactory (same as student).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { MeetingPlayerFactory } from './MeetingPlayerFactory';
import { SessionHeader } from '../../components/live/SessionHeader';
import { BottomSheetWorkspace } from '../../components/live/BottomSheetWorkspace';
import { FloatingAIButton } from '../../components/live/FloatingAIButton';
import { liveEventBusMobile, LiveEventTypeMobile, LiveEventCallback } from './LiveEventBusMobile';
import { useNavigation } from '@react-navigation/native';

interface Props {
  provider: string;
  payload: any;
}

export const TeacherLiveScreen: React.FC<Props> = ({ provider, payload }) => {
  const [isLive, setIsLive] = useState(false);
  const navigation = useNavigation<any>();

  useEffect(() => {
    const s1: LiveEventCallback = () => setIsLive(true);
    const s2: LiveEventCallback = () => setIsLive(false);

    const u1 = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_CONNECTED, s1);
    const u2 = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_ENDED, s2);

    return () => { u1(); u2(); };
  }, []);

  const handleSessionEnd = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <SessionHeader title={payload?.classTitle || 'Live Session - Instructor'} />
      <View style={styles.playerWrapper}>
        <MeetingPlayerFactory
          provider={provider}
          payload={payload}
          onSessionEnd={handleSessionEnd}
        />
      </View>
      <FloatingAIButton
        sessionId={payload?.sessionId || ''}
        courseId={payload?.courseId || ''}
        topicId={payload?.classId || ''}
      />
      <BottomSheetWorkspace capabilities={['canStartAttendance', 'canViewReports']} isLive={isLive} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  playerWrapper: { flex: 1, position: 'relative' },
});
