import { useEffect, useRef, useState } from 'react';
import { LiveSessionRealtimeService, ILiveParticipant, IActivityLog } from '../realtime/LiveSessionRealtimeService';
import { Firestore } from 'firebase/firestore';
import { Auth } from 'firebase/auth';

interface UseLiveSessionRealtimeResult {
  activeSession: any | null;
  participants: ILiveParticipant[];
  activityLogs: IActivityLog[];
  loading: boolean;
  error: Error | null;
  joinStatus: 'IDLE' | 'JOINING' | 'INITIALIZING' | 'CONNECTED';
  setJoinStatus: (status: 'IDLE' | 'JOINING' | 'INITIALIZING' | 'CONNECTED') => void;
}

export function useLiveSessionRealtime(
  sessionId: string | null,
  db: Firestore,
  auth: Auth
): UseLiveSessionRealtimeResult {
  const [activeSession, setActiveSession] = useState<any | null>(null);
  const [participants, setParticipants] = useState<ILiveParticipant[]>([]);
  const [activityLogs, setActivityLogs] = useState<IActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [joinStatus, setJoinStatus] = useState<'IDLE' | 'JOINING' | 'INITIALIZING' | 'CONNECTED'>('IDLE');
  
  const realtimeServiceRef = useRef<LiveSessionRealtimeService | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setActiveSession(null);
      setParticipants([]);
      setActivityLogs([]);
      return;
    }

    setLoading(true);
    setError(null);

    if (!realtimeServiceRef.current) {
      realtimeServiceRef.current = new LiveSessionRealtimeService(db, auth);
    }

    realtimeServiceRef.current.subscribe(sessionId, {
      onSessionUpdate: (sessionData) => {
        setActiveSession(sessionData);
        setLoading(false);
      },
      onParticipantsUpdate: (parts) => {
        setParticipants(parts);
      },
      onActivityUpdate: (logs) => {
        setActivityLogs(logs);
      },
      onError: (err) => {
        setError(err);
        setJoinStatus('IDLE');
        setLoading(false);
      }
    });

    return () => {
      if (realtimeServiceRef.current) {
        realtimeServiceRef.current.cleanup();
      }
    };
  }, [sessionId, db, auth]);

  return {
    activeSession,
    participants,
    activityLogs,
    loading,
    error,
    joinStatus,
    setJoinStatus
  };
}
