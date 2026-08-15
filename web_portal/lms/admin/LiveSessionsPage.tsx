import React, { useEffect, useState } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '../components/ui/DataTable';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { LiveSessionApi, LiveAttendanceApi } from '../core/services';
import { Video, Plus } from 'lucide-react';

export const LiveSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState<Record<string, boolean>>({});

  const handleStartAttendance = async (sessionId: string, classId: string) => {
    setAttendanceLoading(prev => ({ ...prev, [sessionId]: true }));
    try {
      await LiveAttendanceApi.startAttendance({
        liveSessionId: sessionId,
        classId: classId || sessionId,
      });
      alert('Attendance started successfully.');
      fetchLiveSessions();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to start attendance');
    } finally {
      setAttendanceLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const handleEndAttendance = async (sessionId: string) => {
    setAttendanceLoading(prev => ({ ...prev, [sessionId]: true }));
    try {
      await LiveAttendanceApi.endAttendance(sessionId);
      alert('Attendance ended successfully.');
      fetchLiveSessions();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to end attendance');
    } finally {
      setAttendanceLoading(prev => ({ ...prev, [sessionId]: false }));
    }
  };

  const fetchLiveSessions = async () => {
    try {
      const res = await LiveSessionApi.listSessions(undefined, { headers: { 'X-Is-Admin': 'true' } });
      setSessions(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch live sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const [startConfirm, setStartConfirm] = useState<string | null>(null);
  const [startingSession, setStartingSession] = useState<boolean>(false);

  const handleStart = (sessionId: string) => {
    setStartConfirm(sessionId);
  };

  const performStart = async (sessionId: string) => {
    const session = sessions.find((s: any) => s.id === sessionId);
    let adminOverride = false;
    const currentUid = (currentUser?.userId || currentUser?.uid)?.toLowerCase();
    
    if (session) {
      const isHost = session.hostId?.toLowerCase() === currentUid || session.host?.userId?.toLowerCase() === currentUid;
      if (!isHost) {
        const confirmOverride = window.confirm("You are not the assigned host for this session. Do you want to use Admin Override to start it anyway?");
        if (!confirmOverride) return;
        adminOverride = true;
      }
    }

    setStartingSession(true);
    try {
      await LiveSessionApi.startSession(sessionId, adminOverride);
      
      if (session) {
        handleJoin(sessionId, session.provider, adminOverride);
      } else {
        navigate(`/admin/live-session/${sessionId}${adminOverride ? '?adminOverride=true' : ''}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to start session');
    } finally {
      setStartingSession(false);
      setStartConfirm(null);
    }
  };

  const handleJoin = async (sessionId: string, provider: string, adminOverride?: boolean) => {
    try {
      if (provider?.toLowerCase() === 'google_meet') {
        const res = await LiveSessionApi.joinSession(sessionId, adminOverride);
        const payload = res.data?.data || res.data;
        
        if (payload.meetUrl) {
          window.open(payload.meetUrl, '_blank');
        } else {
          window.open(payload.joinUrl || payload.hostUrl || payload.url, '_blank');
        }
      } else {
        navigate(`/admin/live-session/${sessionId}${adminOverride ? '?adminOverride=true' : ''}`);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to join session');
    }
  };

  const handleDelete = (row: any) => {
    setDeleteConfirm(row.id);
  };

  const performDelete = async (id: string) => {
    try {
      await LiveSessionApi.deleteSession(id);
      fetchLiveSessions();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete session');
    } finally {
      setDeleteConfirm(null);
    }
  };

  useEffect(() => {
    fetchLiveSessions();
  }, []);

  const columns = [
    {
      header: 'Session Title',
      cell: (row: any) => (
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${row.liveStatus === 'LIVE' ? 'bg-primary/10 text-primary animate-pulse' : 'bg-surfaceHighlight'}`}>
            <Video size={16} />
          </div>
          <span className="font-semibold text-white">{row.title}</span>
        </div>
      )
    },
    {
      header: 'Start Time',
      cell: (row: any) => (row.startTime ? new Date(row.startTime).toLocaleString() : 'TBD')
    },
    {
      header: 'Provider',
      cell: (row: any) => <span className="uppercase text-gray-400 text-sm">{row.provider}</span>
    },
    {
      header: 'Host',
      cell: (row: any) => (
        <span className="text-sm font-medium text-gray-200 capitalize">
          {row.hostName || row.host?.displayName || row.host?.name || row.host?.userId || row.hostId || 'Unassigned'}
        </span>
      )
    },
    {
      header: 'Co-Hosts',
      cell: (row: any) => {
        const names = row.coHostNames || [];
        if (names.length === 0) return <span className="text-sm text-gray-500">-</span>;
        return (
          <div className="flex flex-col gap-1">
            {names.map((name: string, i: number) => (
              <span key={i} className="text-sm text-gray-300 capitalize">{name}</span>
            ))}
          </div>
        );
      }
    },
    {
      header: 'Status',
      cell: (row: any) => (
        <Badge variant={row.liveStatus === 'LIVE' ? 'success' : 'default'}>
          {row.liveStatus || 'SCHEDULED'}
        </Badge>
      )
    },
    {
      header: 'Attendance',
      cell: (row: any) => (
        <Badge variant={row.lamsStatus === 'ATTENDANCE_ACTIVE' ? 'destructive' : 'default'}>
          {row.lamsStatus || 'INACTIVE'}
        </Badge>
      )
    },
    {
      header: 'Actions',
      cell: (row: any) => (
        <div className="flex items-center gap-2">
          {(row.liveStatus === 'SCHEDULED' || !row.liveStatus) && (
            <Button size="sm" onClick={() => handleStart(row.id)}>Start</Button>
          )}
          {(row.liveStatus === 'JOINING' || row.liveStatus === 'HOST_CONNECTED' || row.liveStatus === 'LIVE' || row.liveStatus === 'ATTENDANCE_RUNNING') && (
            <Button size="sm" variant="primary" onClick={() => handleJoin(row.id, row.provider)}>Join Live Session</Button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Live Sessions</h1>
          <p className="text-gray-400">Manage active and scheduled live streaming sessions and LAMS controls.</p>
        </div>
        <Button onClick={() => navigate('/admin/schedule')}>
          <Plus size={16} className="mr-2" />
          Schedule Session
        </Button>
      </div>

      <DataTable 
        columns={columns} 
        data={sessions} 
        isLoading={loading}
      />

      {startConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500/50 to-purple-500/50"></div>
            <h3 className="text-xl font-bold text-white mb-2">Start Session</h3>
            <p className="text-gray-400 mb-6 text-sm">
              Are you sure you want to manually start this live session now? Students will be allowed to join.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setStartConfirm(null)} 
                disabled={startingSession}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={() => performStart(startConfirm)} 
                disabled={startingSession}
                className="px-4 py-2 text-sm font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-colors border border-blue-500/20 shadow-lg shadow-blue-500/10 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {startingSession ? 'Starting...' : 'Start Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500"></div>
            <h3 className="text-xl font-bold text-white mb-2">Delete Live Session</h3>
            <p className="text-gray-400 mb-6 text-sm">
              Are you sure you want to delete this live session? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)} 
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => performDelete(deleteConfirm)} 
                className="px-4 py-2 text-sm font-medium bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-colors border border-red-500/20 shadow-lg shadow-red-500/10"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
