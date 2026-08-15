/**
 * ZoomSdkBridge.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * ISOLATED — Fetches the SDK test signature from the backend test endpoint
 * GET /zoom/sdk-test-signature
 *
 * Uses the same EXPO_PUBLIC_API_URL as the rest of the mobile app but reads it
 * directly from Constants so it has NO dependency on the existing api package
 * or any live-session module.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import Constants from 'expo-constants';

const TEST_MEETING_ID = '87983691195';
const TEST_PASSWORD   = '2s96yF';
const TEST_NAME       = 'SDK Test User';

function getApiUrl(): string {
  // Prefer the configured env variable; fall back to localhost for emulator
  const configured =
    (Constants.expoConfig?.extra as any)?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL;
  return configured ?? 'http://10.0.2.2:3000/api/v1';
}

export interface ZoomSdkTestSignature {
  sdkKey: string;
  sdkSecret?: string;  // may not be returned for security; signature is pre-generated
  signature: string;
  meetingId: string;
  password: string;
  displayName: string;
}

/**
 * Call the isolated test endpoint to get the SDK signature.
 * This endpoint must NOT require auth for the test to work without a full session.
 */
export async function fetchSdkTestSignature(): Promise<ZoomSdkTestSignature> {
  const url = `${getApiUrl()}/zoom/sdk-test-signature`;
  console.log('[ZoomSdkBridge] Fetching test signature from:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // Include auth token if available, but don't fail if missing
      ...(await getAuthHeader()),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to fetch SDK test signature: ${response.status} ${text}`);
  }

  const json = await response.json();
  const data = json.data ?? json;

  console.log('[ZoomSdkBridge] Signature received:', {
    sdkKey: data.sdkKey ? `${data.sdkKey.slice(0, 6)}***` : 'MISSING',
    meetingId: data.meetingId,
    hasSignature: !!data.signature,
  });

  return {
    sdkKey: data.sdkKey ?? '',
    sdkSecret: data.sdkSecret,
    signature: data.signature ?? '',
    meetingId: data.meetingId ?? TEST_MEETING_ID,
    password: data.password ?? TEST_PASSWORD,
    displayName: TEST_NAME,
  };
}

async function getAuthHeader(): Promise<Record<string, string>> {
  try {
    const { getItemAsync } = require('expo-secure-store');
    const token = await getItemAsync('authToken');
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
}

export { TEST_MEETING_ID, TEST_PASSWORD, TEST_NAME };
