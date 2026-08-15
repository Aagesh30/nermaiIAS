/**
 * ZoomWebViewTestScreen.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * ISOLATED EXPERIMENT — Progressive test to determine the correct Zoom join
 * strategy for Expo Go on iOS.
 *
 * Stage 1 → Inline HTML (PROVEN WORKING ✅)
 * Stage 2 → External URL (google.com → proves networking works)
 * Stage 3 → Zoom HTML URL (proves if Web SDK loads in WebView)
 * Stage 4 → Linking.openURL (opens Zoom in Safari / Zoom app — guaranteed work)
 * ─────────────────────────────────────────────────────────────────────────────
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import {
  fetchWebViewTestSignature,
  getWebAppUrl,
  TEST_MEETING_ID,
  TEST_PASSWORD,
  TEST_NAME,
} from './ZoomWebViewBridge';
import { logWebViewEnvironment, logWebViewEvent } from './ZoomDiagnostics';
import Constants from 'expo-constants';

console.log('[ZoomTest] 🟡 MODULE LOADED');

type Stage = 'form' | 'inline-html' | 'google' | 'zoom-webview' | 'zoom-link';

/* ─── Inline Btn ─── */
const Btn = ({
  title, onPress, loading, color = '#3b82f6', small = false,
}: {
  title: string; onPress: () => void; loading?: boolean; color?: string; small?: boolean;
}) => (
  <TouchableOpacity
    style={[styles.btn, { backgroundColor: color }, small && styles.btnSmall]}
    onPress={onPress}
    disabled={!!loading}
    activeOpacity={0.75}
  >
    {loading ? <ActivityIndicator color="#fff" size="small" /> : (
      <Text style={[styles.btnText, small && styles.btnTextSmall]}>{title}</Text>
    )}
  </TouchableOpacity>
);

/* ─── Main Screen ─── */
export const ZoomWebViewTestScreen = () => {
  console.log('[ZoomTest] ✅ Component function called');

  const [stage, setStage] = useState<Stage>('form');
  const [loading, setLoading] = useState(false);
  const [sig, setSig] = useState<any>(null);
  const [webviewLog, setWebviewLog] = useState<string[]>([]);
  const webViewRef = useRef<any>(null);

  const isExpoGo = Constants.appOwnership === 'expo' || Constants.appOwnership === 'guest';
  const zoomWebUrl = `${getWebAppUrl()}/meeting-hosts/zoom-sdk-launch.html`;

  useEffect(() => {
    console.log('[ZoomTest] ✅ useEffect mounted');
    logWebViewEnvironment();
  }, []);

  const addLog = (msg: string) => {
    console.log(msg);
    setWebviewLog(prev => [...prev.slice(-9), msg]);
  };

  const fetchSig = async () => {
    setLoading(true);
    try {
      const data = await fetchWebViewTestSignature();
      setSig(data);
      addLog('[ZoomTest] ✅ Signature received, meetingId=' + data.meetingId);
      return data;
    } catch (e: any) {
      addLog('[ZoomTest] ❌ Fetch failed: ' + e?.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  /* ─── Stage: Inline HTML test ─── */
  if (stage === 'inline-html') {
    return (
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        <View style={styles.bar}>
          <Text style={styles.barTitle}>Stage 1: Inline HTML</Text>
          <Btn title="Back" onPress={() => setStage('form')} color="#555" small />
        </View>
        <WebView
          source={{ html: '<html><body style="background:blue;color:white;font-size:40px"><h1>✅ WEBVIEW WORKS</h1></body></html>' }}
          style={{ flex: 1 }}
          onLoad={() => addLog('[ZoomTest] WEBVIEW LOADED')}
          onLoadEnd={() => addLog('[ZoomTest] WEBVIEW LOAD END')}
          onError={(e) => addLog('[ZoomTest] WEBVIEW ERROR: ' + e.nativeEvent.description)}
        />
      </View>
    );
  }

  /* ─── Stage: Google URL test ─── */
  if (stage === 'google') {
    return (
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        <View style={styles.bar}>
          <Text style={styles.barTitle}>Stage 2: Google.com</Text>
          <Btn title="Back" onPress={() => setStage('form')} color="#555" small />
        </View>
        <WebView
          source={{ uri: 'https://google.com' }}
          style={{ flex: 1 }}
          onLoad={() => addLog('[ZoomTest] GOOGLE LOADED ✅')}
          onLoadEnd={() => addLog('[ZoomTest] GOOGLE LOAD END ✅')}
          onError={(e) => addLog('[ZoomTest] GOOGLE ERROR ❌: ' + e.nativeEvent.description)}
        />
      </View>
    );
  }

  /* ─── Stage: Zoom WebView test ─── */
  if (stage === 'zoom-webview') {
    const zoomUrl = sig
      ? `${zoomWebUrl}?meetingId=${sig.meetingId}&password=${sig.password}&displayName=${encodeURIComponent(sig.displayName)}&sdkKey=${sig.sdkKey}&signature=${sig.signature}`
      : zoomWebUrl;
    console.log('[ZoomTest] ZOOM URL =', zoomUrl);
    return (
      <View style={{ flex: 1, backgroundColor: '#111' }}>
        <View style={styles.bar}>
          <Text style={styles.barTitle}>Stage 3: Zoom Web SDK</Text>
          <Btn title="Back" onPress={() => setStage('form')} color="#555" small />
        </View>
        <Text style={styles.urlText} numberOfLines={2}>{zoomUrl}</Text>
        <WebView
          source={{ uri: zoomUrl }}
          style={{ flex: 1 }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          onLoad={() => addLog('[ZoomTest] ZOOM PAGE LOADED ✅')}
          onLoadEnd={() => addLog('[ZoomTest] ZOOM LOAD END ✅')}
          onError={(e) => addLog('[ZoomTest] ZOOM ERROR ❌: ' + e.nativeEvent.description)}
          onHttpError={(e) => addLog('[ZoomTest] HTTP ERROR: ' + e.nativeEvent.statusCode)}
        />
      </View>
    );
  }

  /* ─── Stage: Linking.openURL ─── */
  if (stage === 'zoom-link') {
    const joinUrl = sig
      ? `https://zoom.us/wc/join/${sig.meetingId}?pwd=${sig.password}`
      : `https://zoom.us/wc/join/${TEST_MEETING_ID}?pwd=${TEST_PASSWORD}`;
    console.log('[ZoomTest] ZOOM LINKING URL =', joinUrl);
    return (
      <View style={[styles.root, { justifyContent: 'center', alignItems: 'center', padding: 32 }]}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔗</Text>
        <Text style={styles.title}>Linking Strategy</Text>
        <Text style={styles.subtitle}>
          Opens Zoom in Safari / Zoom App{'\n'}(guaranteed to work on iOS)
        </Text>
        <Text style={styles.urlText}>{joinUrl}</Text>
        <Btn
          title="Open Zoom Join URL"
          onPress={() => {
            addLog('[ZoomTest] Opening Zoom via Linking...');
            Linking.openURL(joinUrl);
          }}
          color="#2D8CFF"
        />
        <Btn title="← Back" onPress={() => setStage('form')} color="#555" />
      </View>
    );
  }

  /* ─── Form / main menu ─── */
  console.log('[ZoomTest] Rendering form screen');
  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll}>

        <Text style={styles.title}>Zoom Test Lab</Text>
        <Text style={styles.subtitle}>Expo Go • SDK {Constants.expoConfig?.sdkVersion} • iOS</Text>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {isExpoGo ? '📱 Expo Go' : '🛠 Dev Build'}
          </Text>
        </View>

        {/* Stage 1 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stage 1 — Inline HTML ✅ PROVEN</Text>
          <Text style={styles.sectionDesc}>Proves WebView component works inside this navigator.</Text>
          <Btn title="Test Inline HTML" onPress={() => setStage('inline-html')} />
        </View>

        {/* Stage 2 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stage 2 — External URL</Text>
          <Text style={styles.sectionDesc}>Proves HTTPS URLs load in WebView on this device.</Text>
          <Btn title="Load Google.com" onPress={() => setStage('google')} color="#16a34a" />
        </View>

        {/* Stage 3 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stage 3 — Zoom Web SDK in WebView</Text>
          <Text style={styles.sectionDesc}>
            Loads {zoomWebUrl}{'\n'}
            ⚠️ Zoom Web SDK often blocks iOS WebView user-agent.
          </Text>
          <Btn
            title={loading ? 'Fetching...' : 'Fetch Sig + Load Zoom Page'}
            loading={loading}
            onPress={async () => {
              const data = await fetchSig();
              if (data) setStage('zoom-webview');
            }}
            color="#d97706"
          />
        </View>

        {/* Stage 4 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stage 4 — Linking (Recommended ✅)</Text>
          <Text style={styles.sectionDesc}>
            Opens Zoom join URL in Safari or the Zoom app.{'\n'}
            This is the only approach guaranteed to work on iOS.
          </Text>
          <Btn
            title={loading ? 'Fetching...' : 'Open via Linking.openURL'}
            loading={loading}
            onPress={async () => {
              const data = sig ?? await fetchSig();
              if (data) setStage('zoom-link');
            }}
            color="#2D8CFF"
          />
        </View>

        {/* Logs */}
        {webviewLog.length > 0 && (
          <View style={styles.logBox}>
            <Text style={styles.logTitle}>Live Logs</Text>
            {webviewLog.map((l, i) => (
              <Text key={i} style={styles.logLine}>{l}</Text>
            ))}
          </View>
        )}

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0f0f0f' },
  scroll: { padding: 24, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16, lineHeight: 20 },
  badge: {
    backgroundColor: 'rgba(59,130,246,0.15)',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6,
    alignSelf: 'flex-start', marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)',
  },
  badgeText: { color: '#93c5fd', fontSize: 13, fontWeight: '600' },

  section: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12, padding: 16, marginBottom: 16,
    borderWidth: 1, borderColor: '#2a2a2a',
  },
  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 6 },
  sectionDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 18, marginBottom: 12 },

  btn: { paddingVertical: 14, borderRadius: 10, alignItems: 'center', marginTop: 6 },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnTextSmall: { fontSize: 13 },

  urlText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, padding: 8, fontFamily: 'monospace', backgroundColor: '#1a1a1a' },

  logBox: {
    backgroundColor: '#111', borderRadius: 8, padding: 12,
    borderWidth: 1, borderColor: '#333', marginTop: 8,
  },
  logTitle: { color: '#4ade80', fontSize: 12, fontWeight: '700', marginBottom: 6 },
  logLine: { color: '#e5e5e5', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },

  /* WebView full-screen bar */
  bar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1a1a1a', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#333',
  },
  barTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
