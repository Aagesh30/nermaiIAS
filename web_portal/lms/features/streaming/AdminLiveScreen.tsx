import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { LiveMeetingPlayerMobile } from './LiveMeetingPlayerMobile';
import { ZoomWebViewPlayer } from './ZoomWebViewPlayer';
import { SessionHeader } from '../../components/live/SessionHeader';
import { BottomSheetWorkspace } from '../../components/live/BottomSheetWorkspace';
import { FloatingAIButton } from '../../components/live/FloatingAIButton';
import { liveEventBusMobile, LiveEventTypeMobile, LiveEventCallback } from './LiveEventBusMobile';

interface Props {
  provider: string;
  payload: any;
}

export const AdminLiveScreen: React.FC<Props> = ({ provider, payload }) => {
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const s1: LiveEventCallback = () => setIsLive(true);
    const s2: LiveEventCallback = () => setIsLive(false);

    const u1 = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_CONNECTED, s1);
    const u2 = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_ENDED, s2);

    return () => { u1(); u2(); };
  }, []);

  // Determine which player to render based on provider
  const isZoomProvider = provider === 'zoom_live' || provider === 'zoom' || provider?.includes('zoom');

  return (
    <View style={styles.container}>
      <SessionHeader title={payload?.classTitle || 'Live Session - Admin'} />
      <View style={styles.playerWrapper}>
        {isZoomProvider
          ? <ZoomWebViewPlayer payload={payload} />
          : <LiveMeetingPlayerMobile payload={payload} />}
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
  playerWrapper: { flex: 1, position: 'relative' }
});
