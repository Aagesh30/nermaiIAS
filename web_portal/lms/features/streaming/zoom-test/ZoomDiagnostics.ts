import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function logWebViewEnvironment() {
  console.log({
    expoSdk: Constants.expoConfig?.sdkVersion,
    appOwnership: Constants.appOwnership,
    executionEnvironment: (Constants as any).executionEnvironment,
    platform: Platform.OS
  });
}

export function logWebViewEvent(eventName: string, details?: any) {
  if (details) {
    console.log(`[WebViewDiagnostics] ${eventName}`, details);
  } else {
    console.log(`[WebViewDiagnostics] ${eventName}`);
  }
}
