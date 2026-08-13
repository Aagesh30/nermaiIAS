import { useQuery } from '@tanstack/react-query';

export interface LiveSessionState {
  id: string;
  classId: string;
  title: string;
  status: 'SCHEDULED' | 'JOINING' | 'HOST_CONNECTED' | 'LIVE' | 'EXTENDED' | 'ENDED' | 'CANCELLED';
  scheduledStartTime: string;
  provider: string;
  teacherName?: string;
  subjectName?: string;
}

export function useLiveSessionsState(api: any, classId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: async () => {
      const response = await api.get('/live-sessions');
      return response.data?.data as LiveSessionState[];
    },
    refetchInterval: 15000,
    staleTime: 10000,
  });

  const activeSession = classId 
    ? data?.find(session => session.classId === classId) 
    : undefined;

  return {
    sessions: data || [],
    activeSession,
    isLoading,
    error,
    refetch,
  };
}

