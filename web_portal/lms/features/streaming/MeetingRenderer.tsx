import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';

interface MeetingRendererProps {
  wrapperUrl: string;
  joinToken: string;
  onMessage: (rawMessage: string) => void;
  onLoadError?: () => void;
}

// Trusted domains. 
// In a real app, you would inject this via env vars.
const TRUSTED_DOMAINS = [
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
  '192.168.0.101' // Current dev machine – update if IP changes
];

export const MeetingRenderer: React.FC<MeetingRendererProps> = ({ wrapperUrl, joinToken, onMessage, onLoadError }) => {
  const webViewRef = useRef<WebView>(null);
  
  useEffect(() => {
    return () => {
      // Security/Performance: Ensure the webview unloads its content completely
      // preventing any background media playback or orphaned intervals on Android.
      if (webViewRef.current) {
        try {
          webViewRef.current.injectJavaScript("window.location.href = 'about:blank'; true;");
        } catch (e) {}
      }
    };
  }, []);

  // Construct the full URL to the wrapper
  // In development, this would point to the local backend/frontend serving the wrapper.
  // Using a relative-to-absolute resolution assuming it's loaded from the backend or web frontend host.
  // We'll require the host to be passed or derived, but for now let's assume an env var or a hardcoded dev url.
  
  // Actually, since we need to pass the join token, we can pass it via query param or hash.
  // The web wrapper should extract it from URL.
  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
  const WEB_HOST_URL = API_BASE_URL.replace('/api/v1', ''); // Or wherever the static HTML is served
  const sourceUrl = `${WEB_HOST_URL}${wrapperUrl}?token=${joinToken}`;

  const handleMessage = (event: WebViewMessageEvent) => {
    const rawMessage = event.nativeEvent.data;
    onMessage(rawMessage);
  };

  const handleShouldStartLoadWithRequest = (request: any) => {
    // Basic Security: Prevent navigating to external sites
    const url = new URL(request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        // Allow intent:// or zoomus:// if desired, but we want strict Expo Go isolation
        return false;
    }

    const isTrusted = TRUSTED_DOMAINS.some(domain => url.hostname.includes(domain));
    
    // In production, enforce HTTPS and strict domain matches
    if (!isTrusted && !url.hostname.includes('nermai.com')) {
      console.warn(`[Security] Blocked unauthorized navigation to: ${request.url}`);
      return false;
    }
    
    return true;
  };

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: sourceUrl }}
        style={styles.webview}
        
        // Strict WebView Configuration per Architecture Contract
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback={true}
        mixedContentMode="never"
        thirdPartyCookiesEnabled={true}
        cacheEnabled={false}
        
        // Security
        originWhitelist={['https://*', 'http://*']} // Needs http for dev
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        
        // Messaging
        onMessage={handleMessage}
        
        // Error handling
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
          Alert.alert('Connection Error', 'Failed to load the meeting environment.');
          if (onLoadError) onLoadError();
        }}
        
        // Loading UI
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
