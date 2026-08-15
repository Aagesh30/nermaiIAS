/**
 * MeetingProviderResolver.ts
 * Pure TypeScript — NO JSX. Maps provider strings to component types.
 * JSX rendering is handled in MeetingPlayerFactory.tsx.
 */
import React from 'react';
import { ZoomDeepLinkPlayer } from './zoom/ZoomDeepLinkPlayer';
import { GMeetDeepLinkPlayer } from './gmeet/GMeetDeepLinkPlayer';
import { YoutubePlayer } from '../YoutubePlayer';

/**
 * Returns the correct React component class/function for a given provider.
 * Add new providers here — nothing else needs to change.
 */
export function resolveMeetingProvider(provider: string): React.ComponentType<any> {
  switch (provider?.toLowerCase()) {
    case 'zoom':
    case 'zoom_live':
      return ZoomDeepLinkPlayer;

    case 'google_meet':
    case 'gmeet':
      return GMeetDeepLinkPlayer;

    case 'youtube':
    case 'youtube_live':
      return YoutubePlayer as React.ComponentType<any>;

    default:
      // Unknown providers fall through to Zoom as a safe default
      // (will show "missing meetingId" error via ZoomStatusScreen)
      return ZoomDeepLinkPlayer;
  }
}
