import React, { useState, useEffect, useRef } from 'react';
import { CourseApi  } from '@nermai/api';
import { LoadingPlayer } from './components/LoadingPlayer';
import { ErrorState } from './components/ErrorState';
import { YoutubePlayer } from './YoutubePlayer';
import { AccessRequestCard } from './components/AccessRequestCard';

// ── Player registry ───────────────────────────────────────────────────────────
// Maps provider/contentType strings returned by the backend to the correct
// player component. Recorded content always maps to YoutubePlayer regardless
// of whether the backend sends 'youtube', 'youtube_recorded', or 'recorded'.
const MeetingPlayerRegistry: Record<string, React.FC<any>> = {
  youtube: YoutubePlayer,
  youtube_recorded: YoutubePlayer,
  recorded: YoutubePlayer,
};

interface MeetingPlayerFactoryProps {
  classId: string;
  onAccessLoaded?: (data: any) => void;
}

export const MeetingPlayerFactory: React.FC<MeetingPlayerFactoryProps> = ({ classId, onAccessLoaded }) => {
  const [loading, setLoading] = useState(true);
  const [accessData, setAccessData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAccess = async () => {
    if (!classId) return;
    setLoading(true);
    setError('');
    
    try {
      const response = await CourseApi.getClassPlaybackAccess(classId);
      const data = response.data?.data || response.data;
      setAccessData(data);
      if (onAccessLoaded) onAccessLoaded(data);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Unable to access this video. Please try again.';
      setError(msg);
      
      // If waiting for teacher, automatically retry
      if (msg.includes('Waiting for teacher')) {
        if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
        fetchTimeoutRef.current = setTimeout(fetchAccess, 10000);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccess();
    return () => {
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
    };
  }, [classId]);

  if (loading) {
    return <LoadingPlayer />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchAccess} />;
  }

  if (!accessData) return null;

  const currentStatus = accessData.status || accessData.liveStatus;
  const contentType = accessData.contentType; // 'RECORDED' | 'LIVE' | undefined (from backend)
  const provider = accessData.provider as string | undefined;

  // ── DENIED ────────────────────────────────────────────────────────────────
  if (currentStatus === 'DENIED') {
    return (
      <AccessRequestCard 
        classId={classId} 
        deniedPayload={accessData as any} 
      />
    );
  }

  // ── RECORDED content: always go directly to the player ───────────────────
  // Recorded YouTube classes must NEVER show ENDED/SCHEDULED screens.
  // Check both the explicit contentType field (new backend) and the provider
  // string (legacy backend) to ensure backwards compatibility.
  const isRecorded =
    contentType === 'RECORDED' ||
    provider === 'youtube' ||
    provider === 'youtube_recorded' ||
    provider === 'recorded';

  if (isRecorded) {
    const RecordedPlayer = MeetingPlayerRegistry[provider || 'youtube'] ?? YoutubePlayer;
    return (
      <RecordedPlayer
        accessData={accessData}
        onRefresh={fetchAccess}
        playerToken={accessData.playerToken}
      />
    );
  }

  // ── LIVE content only: intercept scheduling/end states ───────────────────
  // These states are only meaningful for live sessions (zoom, gmeet, youtube_live).
  // Recorded content must never reach this branch.
  if (currentStatus === 'SCHEDULED' || currentStatus === 'STARTING') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1A0A0A] text-white p-8 border border-yellow-500/20 rounded-xl">
        <h3 className="text-2xl font-bold text-yellow-400 mb-2">Class has not started</h3>
        <p className="text-gray-400 text-center">This live session is scheduled but hasn't started yet. Check back closer to the scheduled time!</p>
      </div>
    );
  }

  if (currentStatus === 'ENDED') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#1A0A0A] text-white p-8 border border-red-500/20 rounded-xl">
        <h3 className="text-2xl font-bold text-red-400 mb-2">Class Ended</h3>
        <p className="text-gray-400 text-center">The live session has ended. The recording will be available here shortly once uploaded by the administration.</p>
      </div>
    );
  }

  // ── Live player: resolve by provider ─────────────────────────────────────
  const PlayerComponent = provider ? MeetingPlayerRegistry[provider] : undefined;

  if (!PlayerComponent) {
    return (
      <ErrorState 
        error={`Unsupported provider: ${provider}`} 
        onRetry={fetchAccess} 
      />
    );
  }

  return <PlayerComponent accessData={accessData} onRefresh={fetchAccess} playerToken={accessData.playerToken} />;
};
