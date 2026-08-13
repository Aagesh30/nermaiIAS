import React, { useEffect, useState } from 'react';
import { SessionExpired } from './components/SessionExpired';
import { InteractionOverlay } from './LCES/InteractionOverlay';

interface YoutubePlayerProps {
  playerToken: string;
  onRefresh: () => void;
}

export const YoutubePlayer: React.FC<YoutubePlayerProps> = ({ playerToken, onRefresh }) => {
  const [tokenExpired, setTokenExpired] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    // Show expiry warning after 115 seconds (assuming 120s TTL or 5 minutes TTL)
    // We'll use 4 minutes 55 seconds as warning if TTL is 5 minutes
    const warningTimer = setTimeout(() => setTokenExpired(true), 295000); 
    const expiredTimer = setTimeout(() => setSessionEnded(true), 300000);

    return () => {
      clearTimeout(warningTimer);
      clearTimeout(expiredTimer);
    };
  }, [playerToken]);

  // Determine the base URL from Expo environment variables
  // Note: Expo uses process.env.EXPO_PUBLIC_API_URL for public env vars
  const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
  const backendUrl = rawApiUrl.replace('/api/v1', '');

  return (
    <div className="flex flex-col gap-4">
      {tokenExpired && !sessionEnded && (
        <SessionExpired onRefresh={onRefresh} />
      )}
      
      {sessionEnded ? (
        <div className="relative w-full pt-[56.25%] bg-background rounded-xl overflow-hidden border border-accent/20">
           <div className="absolute inset-0 flex items-center justify-center">
             <div className="text-center">
               <h3 className="text-accent text-xl font-bold mb-2">Session Expired</h3>
               <p className="text-slate-400 text-sm mb-4">Your viewing session has ended.</p>
               <button 
                 onClick={onRefresh}
                 className="px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg transition-colors text-sm font-medium"
               >
                 Reload Video
               </button>
             </div>
           </div>
        </div>
      ) : (
        <div className="relative w-full pt-[56.25%] bg-black rounded-xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.4)] border border-white/10 group">
          <iframe 
            title="Video Player"
            className="absolute top-0 left-0 w-full h-full border-0"
            src={`${backendUrl}/player/${playerToken}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          />
          <InteractionOverlay liveSessionId={playerToken} />
        </div>
      )}
    </div>
  );
};

