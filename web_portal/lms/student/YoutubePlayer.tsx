import React from 'react';
import { InteractionOverlay } from './LCES/InteractionOverlay';

interface YoutubePlayerProps {
  playerToken: string;
  onRefresh: () => void;
}

export const YoutubePlayer: React.FC<YoutubePlayerProps> = ({ playerToken, onRefresh }) => {
  // Recorded videos have no artificial session timer.
  // Access is already controlled by SAPE + SACS batch-access checks on the backend.
  // The player token itself carries a 4-hour JWT expiry on the backend side,
  // so there is no need for a frontend countdown that interrupts playback.

  const getBackendUrl = () => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.startsWith('172.')) {
        return `http://${hostname}:5000`;
      }
      return `https://${hostname}`;
    }
    return 'https://nermaiiasacademy-519c8.web.app';
  };
  const backendUrl = getBackendUrl();

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.4)] border border-white/10 group">
        <iframe 
          title="Video Player"
          className="absolute top-0 left-0 w-full h-full border-0"
          src={`${backendUrl}/player/${playerToken}`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        />
        <InteractionOverlay liveSessionId={playerToken} />
      </div>
    </div>
  );
};

