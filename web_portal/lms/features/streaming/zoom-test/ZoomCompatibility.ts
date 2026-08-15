/**
 * ZoomCompatibility.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ISOLATED — Zoom SDK compatibility detection for Expo SDK 54.
 * Does NOT import anything from: PlayerAccess, ZoomMeetingPlayer, LiveSessionPlayer,
 * YoutubePlayer, CoursePlayer, or any existing live-session flow.
 *
 * Purpose: Determine at runtime whether the Zoom SDK native module is available
 * before any joining attempt is made. Documents the expected failure path for
 * Expo Go vs Development Build environments.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export type ZoomEnvironment =
  | 'expo-go'             // Standard Expo Go — native modules UNAVAILABLE
  | 'development-build'   // Custom Dev Client — native modules AVAILABLE
  | 'standalone'          // Production build — native modules AVAILABLE
  | 'unknown';

export interface ZoomCompatibilityResult {
  environment: ZoomEnvironment;
  sdkAvailable: boolean;
  expoSdkVersion: string | null;
  reactNativeVersion: string;
  platform: 'android' | 'ios';
  canRunInCurrentEnv: boolean;
  message: string;
  requiresAction: string | null;
}

/**
 * Detect which Expo environment we are running in.
 * Expo Go does not support native modules — the SDK will not load.
 */
function detectEnvironment(): ZoomEnvironment {
  const appOwnership = Constants.appOwnership;
  const executionEnv = (Constants as any).executionEnvironment;

  if (appOwnership === 'expo') return 'expo-go';
  if (appOwnership === 'guest') return 'expo-go';

  // Expo SDK 49+ uses executionEnvironment
  if (executionEnv === 'storeClient') return 'expo-go';
  if (executionEnv === 'standalone') return 'standalone';
  if (executionEnv === 'customClient') return 'development-build';

  // Fallback heuristic
  if (__DEV__ && !appOwnership) return 'development-build';
  if (!__DEV__) return 'standalone';

  return 'unknown';
}

/**
 * Try to require the Zoom SDK native module.
 * Returns true if the module loaded successfully, false if unavailable.
 *
 * NOTE: This will always return false in Expo Go because native modules
 * are sandboxed. An Expo Development Build is required.
 */
function probeZoomSdkNativeModule(): boolean {
  try {
    // Attempt to require the package. If native module is missing this throws.
    const mod = require('@zoom/meetingsdk-react-native');
    // Verify the primary export exists and is not a stub
    if (mod && (mod.ZoomUs || mod.default?.ZoomUs)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Run the full compatibility check and return a structured result.
 */
export function runZoomCompatibilityCheck(): ZoomCompatibilityResult {
  const environment = detectEnvironment();
  const sdkAvailable = probeZoomSdkNativeModule();
  const expoSdkVersion = Constants.expoConfig?.sdkVersion ?? null;
  const reactNativeVersion = Platform.constants.reactNativeVersion
    ? `${Platform.constants.reactNativeVersion.major}.${Platform.constants.reactNativeVersion.minor}.${Platform.constants.reactNativeVersion.patch}`
    : 'unknown';
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';

  const canRunInCurrentEnv = sdkAvailable;

  let message: string;
  let requiresAction: string | null = null;

  if (environment === 'expo-go') {
    message = '❌ Zoom SDK cannot run in Expo Go. Native modules are not supported in the Expo Go sandbox.';
    requiresAction = 'Create an Expo Development Build: npx expo run:android or npx expo run:ios';
  } else if (!sdkAvailable) {
    message = '❌ Zoom SDK native module not found. The package @zoom/meetingsdk-react-native is not installed or its native layer did not link correctly.';
    requiresAction = 'Run: npx expo install @zoom/meetingsdk-react-native && npx expo run:android';
  } else {
    message = '✅ Zoom SDK native module is available and loaded successfully.';
  }

  console.log({
    expoSdk: Constants.expoConfig?.sdkVersion,
    appOwnership: Constants.appOwnership,
    executionEnvironment: (Constants as any).executionEnvironment,
    platform: Platform.OS,
    zoomModulePresent: sdkAvailable,
  });

  return {
    environment,
    sdkAvailable,
    expoSdkVersion,
    reactNativeVersion,
    platform,
    canRunInCurrentEnv,
    message,
    requiresAction,
  };
}
