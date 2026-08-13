/**
 * NERMAI Live Shared UI
 * 
 * This shared package maps Provider strings to the correct UI Player components
 * for Web and Mobile, adhering to the architecture where the Provider does not
 * dictate the Player directly.
 */

// Define the generic launch payload that any provider returns
export interface LiveLaunch {
  type: 'html_sdk' | 'native_sdk' | 'iframe' | 'custom';
  url?: string;
  sdkKey?: string;
  signature?: string;
  meetingNumber?: string;
  passcode?: string;
  role?: 0 | 1; // 0=participant, 1=host
  userName?: string;
  userEmail?: string;
}

/**
 * Interface that all player components (Web/Mobile) should accept.
 */
export interface PlayerProps {
  launchPayload: LiveLaunch;
  onLeave: () => void;
  onError?: (error: any) => void;
}

// In a real implementation, you would dynamically import or map React components here.
// Example:
// import { ZoomWebPlayer } from './components/ZoomWebPlayer';
// import { YouTubeWebPlayer } from './components/YouTubeWebPlayer';

export class PlayerResolver {
  /**
   * Returns the canonical string identifier for the player component 
   * required by the given provider and launch payload.
   */
  static resolvePlayerType(provider: string, launchData: LiveLaunch): string {
    switch (provider) {
      case 'zoom':
        // If native SDK payload, route to native zoom player, else html zoom player
        return launchData.type === 'native_sdk' ? 'zoom_native' : 'zoom_html';
      case 'youtube':
        return 'youtube_iframe';
      case 'google_meet':
        return 'google_meet_iframe';
      default:
        return 'unknown_player';
    }
  }

  // Frontend apps would use something like this (pseudo-code):
  // static resolveWebComponent(provider: string): React.ComponentType<PlayerProps> { ... }
  // static resolveMobileComponent(provider: string): React.ComponentType<PlayerProps> { ... }
}
