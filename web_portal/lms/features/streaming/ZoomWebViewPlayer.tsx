import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { getApiClient } from '@nermai/api';

interface ZoomWebViewPlayerProps {
  payload: any;
}

export const ZoomWebViewPlayer: React.FC<ZoomWebViewPlayerProps> = ({ payload }) => {
  const [joinToken, setJoinToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // The backend API base URL (without /api/v1)
  const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  // In production, set EXPO_PUBLIC_WEB_APP_URL to the web app's base URL (e.g. https://app.nermai.com)
  // In local dev, we derive it by replacing the backend port with the web app port (3001)
  const webAppHost = process.env.EXPO_PUBLIC_WEB_APP_URL
    || rawApiUrl.replace('/api/v1', '').replace(':3000', ':3001');

  useEffect(() => {
    const fetchToken = async () => {
      try {
        if (!payload?.sessionId) return;
        const res = await getApiClient().post(`/live-sessions/${payload.sessionId}/join-token`);
        setJoinToken(res.data.token);
      } catch (err) {
        console.error('Failed to get join token', err);
      } finally {
        setLoading(false);
      }
    };
    fetchToken();
  }, [payload]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'ZOOM_EVENT') {
        const eventName = data.event;
        if (payload.sessionId) {
          try {
            await getApiClient().post(`/live-sessions/${payload.sessionId}/events`, { 
              event: eventName,
              connectionState: data.connectionState,
              role: data.role,
              displayName: data.displayName,
              providerParticipantId: data.providerParticipantId
            });
          } catch (e) {
            console.error('Failed to sync SDK event to backend', e);
          }
        }
      }
    } catch (e) {
      console.warn('Error parsing WebView message', e);
    }
  };

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = async (event: MessageEvent) => {
        try {
          if (typeof event.data === 'string') {
            const data = JSON.parse(event.data);
            if (data.type === 'ZOOM_EVENT' && payload?.sessionId) {
              await getApiClient().post(`/live-sessions/${payload.sessionId}/events`, { 
                event: data.event,
                connectionState: data.connectionState,
                role: data.role,
                displayName: data.displayName,
                providerParticipantId: data.providerParticipantId
              });
            }
          }
        } catch (e) {
          // Ignore parse errors from other messages
        }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [payload?.sessionId]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#2D8CFF" />
      </View>
    );
  }

  if (!joinToken) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF4444" />
      </View>
    );
  }

  const playerUrl = `${webAppHost}/meeting-hosts/zoom-client-launch.html?token=${joinToken}&sessionId=${payload.sessionId}&apiUrl=${encodeURIComponent(rawApiUrl)}`;

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        {/* @ts-ignore - iframe is valid in react-native-web but types may complain */}
        <iframe
          src={playerUrl}
          style={{ width: '100%', height: '100%', border: 'none' }}
          allow="camera; microphone; display-capture"
          title="Zoom SDK"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: playerUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onMessage={handleMessage}
        bounces={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center'
  },
  webview: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000'
  },
});
