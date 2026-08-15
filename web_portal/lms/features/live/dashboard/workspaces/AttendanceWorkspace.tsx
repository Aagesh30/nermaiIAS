import React, { useState, useEffect } from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { LiveSessionApi } from '@nermai/api';

export const AttendanceWorkspace: React.FC = () => {
  const { session, role, capabilities } = useLiveSessionContext();
  const [participants, setParticipants] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{type: 'error' | 'success', text: string} | null>(null);

  // We should ideally fetch participants from session?.participants or use LiveSessionApi.listParticipants
  useEffect(() => {
    if (session?.id) {
      LiveSessionApi.listParticipants(session.id)
        .then((res) => {
          setParticipants(res.data?.data || []);
        })
        .catch(console.error);
    }
  }, [session?.id]);

  const handleStartAttendance = async () => {
    if (!session?.id || isProcessing) return;
    setIsProcessing(true);
    setMessage(null);
    try {
      await LiveSessionApi.startAttendance(session.id);
      setMessage({ type: 'success', text: 'Attendance started successfully.' });
    } catch (err: any) {
      console.error('Failed to start attendance', err);
      if (err?.response?.status === 409 || err?.response?.data?.message?.includes('already')) {
        setMessage({ type: 'error', text: 'Attendance is already running.' });
      } else {
        setMessage({ type: 'error', text: 'Network failure or server error. Please try again.' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleEndAttendance = async () => {
    if (!session?.id || isProcessing) return;
    setIsProcessing(true);
    setMessage(null);
    try {
      await LiveSessionApi.endAttendance(session.id);
      setMessage({ type: 'success', text: 'Attendance ended successfully.' });
    } catch (err: any) {
      console.error('Failed to end attendance', err);
      if (err?.response?.status === 409 || err?.response?.data?.message?.includes('already ended')) {
        setMessage({ type: 'error', text: 'Attendance is already ended.' });
      } else {
        setMessage({ type: 'error', text: 'Network failure or server error. Please try again.' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = () => {
    if (!participants || participants.length === 0) return;
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Student,Role,Status,Joined At,Left At\n"
      + participants.map(p => {
          return `${p.displayName},${p.role},${p.presenceStatus},${p.joinedAt || ''},${p.leftAt || ''}`;
      }).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `attendance_${session?.id}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link); 
  };

  if (!session) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-gray-500">
        Loading session data...
      </div>
    );
  }

  const isAttendanceRunning = session.attendance?.status === 'RUNNING';
  const isSessionEnded = session.status === 'ENDED';
  const attendanceEnabled = session.status === 'LIVE' && capabilities.includes('START_ATTENDANCE');
  const mode = session.attendanceMode || 'MANUAL';
  const startedAt = session.attendance?.startedAt;
  const startedBy = session.attendance?.startedBy;
  const endedAt = session.attendance?.endedAt;

  return (
    <div className="flex-1 p-6 overflow-y-auto flex flex-col bg-[#0a0a0a]">
      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-green-500/10 border-green-500/30 text-green-400'}`}>
          {message.text}
        </div>
      )}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">Live Attendance</h2>
        <div className="flex gap-2">
          {capabilities.canStartAttendance && attendanceEnabled && !isAttendanceRunning && !isSessionEnded && (
            <button 
              onClick={handleStartAttendance} 
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Start Attendance'}
            </button>
          )}
          {capabilities.canEndAttendance && attendanceEnabled && isAttendanceRunning && !isSessionEnded && (
            <button 
              onClick={handleEndAttendance} 
              disabled={isProcessing}
              className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-sm transition-colors"
            >
              {isProcessing ? 'Processing...' : 'End Attendance'}
            </button>
          )}
          <button onClick={handleExportCSV} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition-colors">
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Mode</p>
          <p className="font-semibold text-blue-400">{mode}</p>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Status</p>
          <p className="font-semibold text-gray-200">
            {session.attendance?.status || 'NOT_STARTED'}
            {startedBy === 'system' && <span className="ml-2 text-xs bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded-full">AUTO OVERRIDE</span>}
          </p>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Timeline</p>
          <p className="text-sm text-gray-300">Start: {startedAt ? new Date(startedAt).toLocaleTimeString() : '--'}</p>
          <p className="text-sm text-gray-300">End: {endedAt ? new Date(endedAt).toLocaleTimeString() : '--'}</p>
        </div>
        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Heartbeat Health</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
            <p className="text-sm text-green-400">Stable (Queue: 0)</p>
          </div>
        </div>
      </div>

      <div className="flex-1 border border-gray-800 rounded-xl overflow-hidden bg-gray-900/30 shadow-lg shadow-black/50">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-gray-950 text-gray-300 uppercase text-xs border-b border-gray-800">
            <tr>
              <th className="px-6 py-4">Student</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Joined At</th>
              <th className="px-6 py-4">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {participants.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">No participants recorded yet.</td>
              </tr>
            ) : (
              participants.map(p => (
                <tr key={p.studentId} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold border border-indigo-500/30">
                      {p.displayName ? p.displayName.charAt(0).toUpperCase() : '?'}
                    </div>
                    <span className="text-gray-200 font-medium">{p.displayName}</span>
                    {p.role === 'HOST' || p.role === 'CO_HOST' ? (
                      <span className="text-[10px] px-2 py-0.5 bg-blue-900/50 text-blue-400 rounded-full border border-blue-800">Teacher</span>
                    ) : null}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${p.presenceStatus === 'OFFLINE' || p.presenceStatus === 'LEFT' ? 'bg-red-500' : p.presenceStatus === 'RECONNECTING' ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]'}`}></div>
                      <span className="capitalize text-gray-300">{p.presenceStatus?.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-400">
                    {p.joinedAt ? new Date(p.joinedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '-'}
                  </td>
                  <td className="px-6 py-4 font-mono text-gray-400">
                    {p.joinedAt ? (() => {
                      const start = new Date(p.joinedAt).getTime();
                      const end = p.leftAt ? new Date(p.leftAt).getTime() : Date.now();
                      const diff = Math.floor((end - start) / 60000);
                      return `${diff} min`;
                    })() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
