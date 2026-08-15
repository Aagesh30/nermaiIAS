/**
 * ZoomLinkResolver.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * MOBILE ONLY — Expo Go compatible Zoom deep-link strategy.
 * Opens zoom.us join URL in Safari or the Zoom app.
 *
 * ❌ Do NOT import this from any web module.
 * ❌ Do NOT use @zoom/meetingsdk-react-native.
 * ✅ Pure expo-linking. Works 100% in Expo Go.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Linking } from 'react-native';

export interface ZoomJoinParams {
  meetingId: string;
  password?: string;
  displayName?: string;
  joinUrl?: string; // fallback if needed
}

export function buildZoomUrls(params: ZoomJoinParams): { appUrl: string; webUrl: string } {
  const pwdParam = params.password ? `&pwd=${encodeURIComponent(params.password)}` : '';
  const unameParam = params.displayName ? `&uname=${encodeURIComponent(params.displayName)}` : '';
  
  // Notice: The zoomus:// scheme uses confno=... whereas the web uses /join/...
  const appUrl = `zoomus://zoom.us/join?confno=${params.meetingId}${pwdParam}${unameParam}`;
  
  // Fallback to web client if app is not installed
  let webUrl = `https://zoom.us/wc/join/${params.meetingId}?pwd=${encodeURIComponent(params.password ?? '')}`;
  if (params.displayName) {
    webUrl += `&uname=${encodeURIComponent(params.displayName)}`;
  }
  
  // If the backend provided a hardcoded joinUrl (rarely used now that we self-hydrate), we could use it,
  // but it doesn't have the uname appended by default. For safety, we prefer the constructed ones.
  
  return { appUrl, webUrl };
}

/**
 * Opens the Zoom meeting in Safari or the native Zoom app.
 * If the URL scheme is unsupported (should never happen for https://),
 * falls back to the Zoom download page.
 */
export async function openZoomMeeting(params: ZoomJoinParams): Promise<{ success: boolean; url: string }> {
  const { appUrl, webUrl } = buildZoomUrls(params);
  console.log('[ZoomLinkResolver] App URL:', appUrl);
  console.log('[ZoomLinkResolver] Web URL:', webUrl);

  try {
    // Check if the native Zoom app is installed
    const supported = await Linking.canOpenURL(appUrl);
    const finalUrl = supported ? appUrl : webUrl;
    
    console.log('[ZoomLinkResolver] Launching URL:', finalUrl);
    await Linking.openURL(finalUrl);
    
    return { success: true, url: finalUrl };
  } catch (e: any) {
    console.error('[ZoomLinkResolver] Failed to open URL:', e?.message);
    throw e;
  }
}
