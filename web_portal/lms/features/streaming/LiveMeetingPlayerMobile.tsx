import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getApiClient } from '@nermai/api';
import { MeetingRenderer } from './MeetingRenderer';
import { ProviderMobileEventAdapter } from './ProviderMobileEventAdapter';
import { liveEventBusMobile, LiveEventTypeMobile, LiveEventCallback } from './LiveEventBusMobile';
import { usePresenceLifecycleMobile } from './usePresenceLifecycleMobile';

interface LiveMeetingPlayerMobileProps {
  payload: any;
}

export const LiveMeetingPlayerMobile: React.FC<LiveMeetingPlayerMobileProps> = ({ payload }) => {
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  
  const navigation = useNavigation<any>();
  const sessionId = payload?.sessionId;
  const metadata = payload?.providerMetadata;

  // Setup Presence Lifecycle (handles heartbeat and leave API natively)
  const { leaveSession } = usePresenceLifecycleMobile(sessionId, isLive);

  useEffect(() => {
    let isMounted = true;
    const fetchToken = async () => {
      try {
        if (!sessionId) {
          setError('No session ID provided');
          return;
        }
        
        // Fetch short-lived Redis Join Token
        const res = await getApiClient().post(`/live-sessions/${sessionId}/join-token`);
        if (isMounted) {
          setJoinToken(res.data.token);
        }
      } catch (err: any) {
        console.error('Failed to get join token', err);
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to initialize meeting');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchToken();
    
    return () => { isMounted = false; };
  }, [sessionId]);

  // Clean up and Leave Logic
  const handleMeetingClosed = useCallback(async () => {
    console.log('[LiveMeetingPlayerMobile] Meeting Closed, initiating cleanup sequence.');
    
    // 1. Mark as no longer live
    setIsLive(false);

    // 2. Leave API
    await leaveSession();

    // 3. Navigate Back
    if (navigation.canGoBack()) {
       navigation.goBack();
    } else {
       navigation.navigate('StudentRoot');
    }
  }, [navigation, leaveSession]);

  useEffect(() => {
    // 4. Setup Event Listeners
    const onSessionConnected: LiveEventCallback = (msg) => {
      setIsLive(true);
    };

    const onSessionEnded: LiveEventCallback = (msg) => {
      handleMeetingClosed();
    };

    const onConnectionLost: LiveEventCallback = (msg) => {
      setIsLive(false);
    };

    const onReconnected: LiveEventCallback = (msg) => {
      setIsLive(true);
    };

    const unsubConnected = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_CONNECTED, onSessionConnected);
    const unsubEnded = liveEventBusMobile.on(LiveEventTypeMobile.SESSION_ENDED, onSessionEnded);
    const unsubLost = liveEventBusMobile.on(LiveEventTypeMobile.CONNECTION_LOST, onConnectionLost);
    const unsubRecon = liveEventBusMobile.on(LiveEventTypeMobile.RECONNECTED, onReconnected);

    return () => {
      // 5. Cleanup Listeners
      unsubConnected();
      unsubEnded();
      unsubLost();
      unsubRecon();
    };
  }, [handleMeetingClosed]);

  const handleWebViewMessage = (rawMessage: string) => {
    ProviderMobileEventAdapter.handleMessage(rawMessage);
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#D4AF37" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!joinToken || !metadata?.wrapperUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Missing required meeting configuration.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MeetingRenderer
        wrapperUrl={metadata.wrapperUrl}
        joinToken={joinToken}
        onMessage={handleWebViewMessage}
        onLoadError={() => setError('Failed to load meeting environment.')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000'
  },
  center: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 16
  }
});
