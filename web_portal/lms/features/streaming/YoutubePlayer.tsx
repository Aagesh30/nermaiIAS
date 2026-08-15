import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { ClassResources } from '../LMS/ClassResources';
import { LiveSessionApi } from '@nermai/api';
import { Hand } from 'lucide-react-native';
import { colors } from '@nermai/theme';

interface YoutubePlayerProps {
  playerToken: string;
  classId: string;
}

export const YoutubePlayer: React.FC<YoutubePlayerProps> = ({ playerToken, classId }) => {
  const webviewRef = useRef<any>(null);
  const [handRaised, setHandRaised] = useState(false);

  useEffect(() => {
    // Start 15s Heartbeat Ping for Presence Tracking
    const hbInterval = setInterval(() => {
      if (classId) {
        LiveSessionApi.studentHeartbeat(classId).catch(() => {});
      }
    }, 15000);

    return () => {
      clearInterval(hbInterval);
    };
  }, [classId]);

  const toggleRaiseHand = async () => {
    try {
      const nextState = !handRaised;
      setHandRaised(nextState);
      const studentId = 'me'; // Resolved by token/JWT on backend
      await LiveSessionApi.patchParticipant(classId, studentId, {
        action: nextState ? 'raise-hand' : 'lower-hand',
      });
      if (nextState) {
        Alert.alert('Hand Raised', 'Your instructor has been notified.');
      }
    } catch (err: any) {
      console.warn('Failed to toggle hand raise', err);
    }
  };

  const deviceId = 'mobile-device-id';
  const sessionId = 'mobile-session-id';
  const rawApiUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  const API_BASE_URL = rawApiUrl.replace('/api/v1', '');

  const iframeSrc = `${API_BASE_URL}/player/${playerToken}?deviceId=${deviceId}&sessionId=${sessionId}`;

  return (
    <ScrollView style={styles.container} bounces={false}>
      <View style={styles.videoContainer}>
        {Platform.OS === 'web' ? (
          <iframe
            src={iframeSrc}
            style={{ border: 'none', width: '100%', height: '100%', backgroundColor: 'black' }}
            allowFullScreen
          />
        ) : (
          <WebView
            ref={webviewRef}
            source={{ uri: iframeSrc }}
            style={styles.webview}
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            onRenderProcessGone={() => webviewRef.current?.reload()}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            allowFileAccess={false}
            allowUniversalAccessFromFileURLs={false}
          />
        )}

        {/* Raise Hand Floating Control */}
        <TouchableOpacity
          style={[styles.raiseHandBtn, handRaised && styles.raiseHandActive]}
          onPress={toggleRaiseHand}
          activeOpacity={0.8}
        >
          <Hand size={18} color={handRaised ? colors.background : '#FFF'} />
          <Text style={[styles.raiseHandText, handRaised && styles.raiseHandTextActive]}>
            {handRaised ? 'Hand Raised' : 'Raise Hand'}
          </Text>
        </TouchableOpacity>
      </View>

      <ClassResources classId={classId} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#000',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  raiseHandBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  raiseHandActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  raiseHandText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  raiseHandTextActive: {
    color: colors.background,
  },
});
