import React, { useEffect, useState } from 'react';
import { useAuth } from '../core/auth/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { AdminTable, AdminButton as Button } from '../components/admin-ui';
import { Badge } from '../components/ui/Badge';
import { LiveSessionApi, LiveAttendanceApi } from '../core/services';
import { Video, Plus } from 'lucide-react';
import { ScheduleSessionDialog } from './ScheduleSessionDialog';

export const LiveSessionsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [attendanceLoading, setAttendanceLoading] = useState<Record<string, boolean>>({});
  
  // Schedule dialog state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<any>(null);

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
    const currentUid = currentUser?.uid?.toLowerCase();
    
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
      
      // The backend intentionally keeps the status as SCHEDULED until the host connects via Zoom.
      // Therefore, fetching the table here will still show 'SCHEDULED' and the 'Start' button.
      // We must automatically transition the host into the room now.
      if (session) {
        handleJoin(sessionId, session.provider, adminOverride);
      } else {
        // Fallback if not found in current table state
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
      if (provider.toLowerCase() === 'google_meet') {
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
    { key: 'title', label: 'Session Title', render: (val: any, row: any) => (
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${row.liveStatus === 'LIVE' ? 'bg-[#8B0000]/10 text-[#8B0000] dark:text-[#ff8a80] animate-pulse' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
          <Video size={16} />
        </div>
        <span className="font-bold text-gray-905 dark:text-white text-sm">{row.title}</span>
      </div>
    ) },
    { key: 'startTime', label: 'Start Time', render: (val: any, row: any) => <span className="font-medium text-gray-800 dark:text-gray-300">{new Date(row.startTime).toLocaleString()}</span> },
    { key: 'provider', label: 'Provider', render: (val: any, row: any) => <span className="uppercase text-gray-500 dark:text-gray-400 text-xs font-semibold">{row.provider}</span> },
    { key: 'host', label: 'Host', render: (val: any, row: any) => (
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize">
        {row.hostName || row.host?.displayName || row.host?.name || row.host?.userId || row.hostId || 'Unassigned'}
      </span>
    ) },
    { key: 'coHosts', label: 'Co-Hosts', render: (val: any, row: any) => {
      const names = row.coHostNames || [];
      if (names.length === 0) return <span className="text-sm text-gray-400">—</span>;
      return (
        <div className="flex flex-col gap-1">
          {names.map((name: string, i: number) => (
            <span key={i} className="text-sm text-gray-600 dark:text-gray-400 capitalize font-medium">{name}</span>
          ))}
        </div>
      );
    } },
    { key: 'liveStatus', label: 'Status', render: (val: any, row: any) => (
      <Badge variant={row.liveStatus === 'LIVE' ? 'success' : 'default'}>
        {row.liveStatus || 'SCHEDULED'}
      </Badge>
    )},
    { key: 'lamsStatus', label: 'Attendance', render: (val: any, row: any) => (
      <Badge variant={row.lamsStatus === 'ATTENDANCE_ACTIVE' ? 'destructive' : 'default'}>
        {row.lamsStatus || 'INACTIVE'}
      </Badge>
    )},
    { key: 'actions', label: 'Actions', render: (val: any, row: any) => (
      <div className="flex items-center gap-2">
        {(row.liveStatus === 'SCHEDULED' || !row.liveStatus) && (
          <Button onClick={() => handleStart(row.id)}>Start</Button>
        )}
        {(row.liveStatus === 'JOINING' || row.liveStatus === 'HOST_CONNECTED' || row.liveStatus === 'LIVE' || row.liveStatus === 'ATTENDANCE_RUNNING') && (
          <>
            <Button variant="primary" onClick={() => handleJoin(row.id, row.provider)}>Join Live Session</Button>
          </>
        )}
      </div>
    )}
  ];

  return (
    <div className="space-y-6 w-full text-gray-900 dark:text-white">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#1a1a2e] p-6 rounded-2xl border border-gray-200 dark:border-[#8B0000]/30 shadow-sm">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-1">Live Sessions</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Manage active and scheduled live streaming sessions and LAMS controls.</p>
        </div>
        <Button onClick={() => { setEditingClass(null); setIsModalOpen(true); }}>
          <Plus size={16} />
          Schedule Session
        </Button>
      </div>

      <AdminTable 
        columns={columns} 
        data={sessions} 
        isLoading={loading}
        onEdit={(row) => {
          // Wrap the session row in the expected class structure if editing
          setEditingClass({
            id: row.classId || row.id,
            title: row.title,
            description: row.description || '',
            topicId: row.topicId || '',
            liveSession: row
          });
          setIsModalOpen(true);
        }}
        onDelete={handleDelete}
      />

      <ScheduleSessionDialog 
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClass(null);
        }}
        onSuccess={() => {
          setIsModalOpen(false);
          setEditingClass(null);
          fetchLiveSessions();
        }}
        editingClass={editingClass}
      />

      {startConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-nermai-gray-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
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
                {startingSession ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Starting...
                  </>
                ) : (
                  'Start Session'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-nermai-gray-900 border border-red-500/20 rounded-2xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden">
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


