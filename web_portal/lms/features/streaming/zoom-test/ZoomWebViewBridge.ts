import Constants from 'expo-constants';

const TEST_MEETING_ID = "87983691195";
const TEST_PASSWORD = "2s96yF";
const TEST_NAME = "SDK Test User";

function getApiUrl(): string {
  // Prefer the configured env variable; fall back to localhost for emulator
  const configured =
    (Constants.expoConfig?.extra as any)?.apiUrl ||
    process.env.EXPO_PUBLIC_API_URL;
  return configured ?? 'http://10.0.2.2:3000/api/v1';
}

export function getWebAppUrl(): string {
  const configured =
    (Constants.expoConfig?.extra as any)?.webAppUrl ||
    process.env.EXPO_PUBLIC_WEB_APP_URL;
  return configured ?? 'http://10.0.2.2:3001';
}

export interface ZoomWebViewSignature {
  sdkKey: string;
  signature: string;
  meetingId: string;
  password: string;
  displayName: string;
}

export async function fetchWebViewTestSignature(): Promise<ZoomWebViewSignature> {
  const url = `${getApiUrl()}/zoom/sdk-test-signature`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Failed to fetch test signature: ${response.status} ${text}`);
  }

  const json = await response.json();
  const data = json.data ?? json;

  return {
    sdkKey: data.sdkKey ?? '',
    signature: data.signature ?? '',
    meetingId: data.meetingId ?? TEST_MEETING_ID,
    password: data.password ?? TEST_PASSWORD,
    displayName: TEST_NAME,
  };
}

export { TEST_MEETING_ID, TEST_PASSWORD, TEST_NAME };
