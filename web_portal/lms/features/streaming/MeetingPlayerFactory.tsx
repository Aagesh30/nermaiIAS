/**
 * MeetingPlayerFactory.tsx
 * Resolves provider → component and renders it. All JSX lives here.
 */
import React from 'react';
import { resolveMeetingProvider } from './providers/MeetingProviderResolver';

interface MeetingPlayerProps {
  provider: string;
  payload: any;
  onSessionEnd?: () => void;
}

export const MeetingPlayerFactory: React.FC<MeetingPlayerProps> = ({ provider, payload, onSessionEnd }) => {
  const Player = resolveMeetingProvider(provider);
  return <Player payload={payload} onSessionEnd={onSessionEnd} />;
};
