import React, { useState, useEffect, useRef } from 'react';
import { useLiveSessionContext } from '../context/LiveSessionContext';
import { Play, Users, Video, Database, Server, Clock, Power, Shield, Link, Key, CheckSquare, StopCircle, Lock, Download, List, Pause, MoreVertical, Settings, User, AlertCircle, UserPlus, UserMinus, MonitorUp, Info, MicOff, Mic, MessageSquareOff, MessageSquare } from 'lucide-react';
import { meetingLauncher } from '../services/MeetingLauncherService';
import { LiveSessionApi } from '@nermai/api';
import { liveEventBus, LiveEventMap } from '../dashboard/orchestration/LiveEventBus';
import { liveSessionService } from '@nermai/live-core';

interface TimelineEvent {
  id: string;
  timestamp: number;
  type: keyof LiveEventMap;
  title: string;
  description?: string;
  iconType: 'info' | 'join' | 'leave' | 'screen' | 'attendance' | 'alert';
}

export const LiveSessionControlPanel: React.FC = () => {
  const { session, provider, zoomState, windowState, hostConnected, startSession } = useLiveSessionContext();
  
  // Local transient state for Modals & Actions (Zero Orchestration State)
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [endConfirmText, setEndConfirmText] = useState('');
  const [isEnding, setIsEnding] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);

  // Timeline events state
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  useEffect(() => {
    const addEvent = (type: keyof LiveEventMap, title: string, iconType: TimelineEvent['iconType'], description?: string) => {
      setEvents(prev => [...prev, { id: Math.random().toString(36).substring(7), timestamp: Date.now(), type, title, description, iconType }].slice(-100));
    };

    const subs = [
      liveEventBus.on('HOST_CONNECTED', (e) => addEvent('HOST_CONNECTED', 'Host Joined', 'join', e.payload?.displayName)),
      liveEventBus.on('HOST_DISCONNECTED', (e) => addEvent('HOST_DISCONNECTED', 'Host Disconnected', 'alert', e.payload?.reason)),
      liveEventBus.on('PARTICIPANT_JOINED', (e) => addEvent('PARTICIPANT_JOINED', 'Participant Joined', 'join', e.payload?.displayName)),
      liveEventBus.on('PARTICIPANT_LEFT', (e) => addEvent('PARTICIPANT_LEFT', 'Participant Left', 'leave', e.payload?.displayName)),
      liveEventBus.on('ATTENDANCE_STARTED', () => addEvent('ATTENDANCE_STARTED', 'Attendance Opened', 'attendance', 'Admin started attendance')),
      liveEventBus.on('ATTENDANCE_STOPPED', () => addEvent('ATTENDANCE_STOPPED', 'Attendance Closed', 'attendance', 'Admin stopped attendance')),
      liveEventBus.on('SESSION_ENDED', () => addEvent('SESSION_ENDED', 'Meeting Ended', 'alert', 'Session forcefully ended'))
    ];

    return () => subs.forEach(unsub => unsub());
  }, []);

  const handleRejoin = async () => {
    if (session?.status !== 'LIVE') return;
    
    setIsGeneratingToken(true);
    try {
      // 1. Generate Fresh Token to avoid stale/single-use errors
      const tokenRes = await LiveSessionApi.generateJoinToken(session.id);
      const freshToken = tokenRes.data?.token || tokenRes.data;
      
      meetingLauncher.preparePopup();
      // 2. Launch with fresh token, bypassing startSession() state initialization
      meetingLauncher.launch({
        provider: provider || 'zoom',
        token: freshToken,
        sessionId: session.id
      });
    } catch (e) {
      console.error('Failed to generate fresh token for rejoin:', e);
      alert('Failed to generate secure rejoin token. Please refresh the page and try again.');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleForceEnd = async () => {
    if (endConfirmText !== 'END SESSION') return;
    setIsEnding(true);
    try {
      // End session using atomic backend transaction
      await LiveSessionApi.endSession(session!.id);
      // We don't orchestrate stopping attendance or recording here; backend does it natively.
      setShowEndConfirm(false);
    } catch (e) {
      console.error("Failed to end session", e);
      alert("Failed to force end session. Check console for details.");
    } finally {
      setIsEnding(false);
    }
  };

  const handleExtend = async () => {
    try {
      await LiveSessionApi.extendSession(session!.id, { minutes: 15 });
      alert("Session extended by 15 minutes.");
    } catch(e) {
      alert("Failed to extend session.");
    }
  };

  const handleToggleAttendance = async (action: 'open' | 'close') => {
    try {
      if (action === 'open') {
        await LiveSessionApi.startAttendance(session!.id);
      } else {
        await LiveSessionApi.endAttendance(session!.id);
      }
    } catch (e) {
      alert(`Failed to ${action} attendance.`);
    }
  };

  const handleCopyLink = () => {
    if (session?.participantUrl) {
      navigator.clipboard.writeText(session.participantUrl);
      alert("Copied link to clipboard!");
    } else {
      alert("No participant URL available.");
    }
  };

  // State derivations (Zero local state)
  const isMeetingProvider = provider === "zoom" || provider === "gmeet";
  const liveStatus = session?.status;
  const isAttendanceOpen = session?.attendance?.status === 'RUNNING' || session?.attendanceStatus === 'RUNNING';
  
  let hostConnectionState: 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' = 'DISCONNECTED';
  if (hostConnected || zoomState === 'CONNECTED') {
    hostConnectionState = 'CONNECTED';
  } else if (zoomState === 'RECONNECTING' || zoomState === 'JOINING' || zoomState === 'LAUNCHING') {
    hostConnectionState = 'RECONNECTING';
  }

  const durationMs = session?.actualStartTime ? Date.now() - new Date(session.actualStartTime).getTime() : 0;
  
  const formatDuration = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex w-screen h-screen bg-black font-sans text-white overflow-hidden p-6 gap-6">
      
      {/* Left Column: Controls */}
      <div className="w-2/3 flex flex-col gap-6 overflow-y-auto pr-2 pb-10">
        
        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl flex justify-between items-center">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold">{session?.title || 'Live Classroom'}</h1>
              <span className="px-3 py-1 bg-red-500/20 text-red-500 text-[10px] font-bold rounded-full uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span> {liveStatus || 'UNKNOWN'}
              </span>
            </div>
            <p className="text-gray-400 text-sm">{session?.courseName} • {session?.subject}</p>
          </div>
          <div className={`px-4 py-2 rounded-xl text-sm font-medium border flex flex-col items-end ${
            hostConnectionState === 'CONNECTED' ? 'bg-green-500/10 border-green-500/20' : 
            hostConnectionState === 'RECONNECTING' ? 'bg-yellow-500/10 border-yellow-500/20' : 
            'bg-red-500/10 border-red-500/20'
          }`}>
             <div className={`flex items-center gap-2 ${hostConnectionState === 'CONNECTED' ? 'text-green-400' : hostConnectionState === 'RECONNECTING' ? 'text-yellow-400' : 'text-red-400'}`}>
                {hostConnectionState === 'CONNECTED' ? <Shield size={16} /> : <Power size={16} />}
                {hostConnectionState === 'CONNECTED' ? "Host Connected" : hostConnectionState === 'RECONNECTING' ? "Reconnecting..." : "Host Disconnected"}
             </div>
          </div>
        </div>

        {/* 1. Session Controls */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 flex items-center gap-2"><Power size={14}/> Session Controls</h2>
          <div className="grid grid-cols-4 gap-3">
            <button onClick={handleRejoin} disabled={isGeneratingToken} className="col-span-1 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2 transition-colors disabled:opacity-50">
              <Play size={20} /> Rejoin
            </button>
            {session?.capabilities?.canForceEndSession ? (
              <button onClick={() => setShowEndConfirm(true)} className="col-span-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2 transition-colors">
                <StopCircle size={20} /> Force End
              </button>
            ) : session?.capabilities?.canEndMeeting ? (
              <button onClick={() => setShowEndConfirm(true)} className="col-span-1 bg-gray-800 hover:bg-gray-700 text-gray-300 p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2 transition-colors">
                <StopCircle size={20} /> End Class
              </button>
            ) : null}
            <button onClick={handleExtend} className="col-span-1 bg-gray-800 hover:bg-gray-700 text-gray-300 p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2 transition-colors">
              <Clock size={20} /> Extend +15m
            </button>
            <button onClick={handleCopyLink} className="col-span-1 bg-gray-800 hover:bg-gray-700 text-gray-300 p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2 transition-colors">
              <Link size={20} /> Copy Link
            </button>
          </div>
        </div>

        {/* 2. Attendance Controls */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 flex items-center gap-2"><CheckSquare size={14}/> Attendance Controls</h2>
          <div className="grid grid-cols-5 gap-3">
            {!isAttendanceOpen ? (
              <button onClick={() => handleToggleAttendance('open')} className="col-span-1 bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2 transition-colors">
                <CheckSquare size={18} /> Open
              </button>
            ) : (
              <button onClick={() => handleToggleAttendance('close')} className="col-span-1 bg-orange-600 hover:bg-orange-500 text-white p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2 transition-colors">
                <StopCircle size={18} /> Close
              </button>
            )}
            <button disabled title="Backend API not available yet" className="col-span-1 bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2">
              <Lock size={18} /> Lock
            </button>
            <button disabled title="Backend API not available yet" className="col-span-1 bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2">
              <Download size={18} /> Export
            </button>
            <button disabled title="Backend API not available yet" className="col-span-1 bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2">
              <Clock size={18} /> Late
            </button>
            <button disabled title="Backend API not available yet" className="col-span-1 bg-gray-800 text-gray-600 opacity-50 cursor-not-allowed p-3 rounded-lg font-medium flex flex-col items-center justify-center gap-2">
              <UserMinus size={18} /> Absent
            </button>
          </div>
        </div>

      </div>

      {/* Right Column: Diagnostics & Timeline */}
      <div className="w-1/3 flex flex-col gap-6">
        
        {/* Diagnostics Panel */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shrink-0">
          <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold mb-4 flex items-center gap-2"><Activity size={14}/> Diagnostics</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center"><span className="text-gray-400">Firestore</span> <span className="text-green-400">Listening</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Redis</span> <span className="text-green-400">Connected</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Meeting ID</span> <span className="text-white font-mono">{session?.meetingNumber || 'N/A'}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Host Account</span> <span className="text-white">{session?.teacherName || 'Admin'}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Session Status</span> <span className="text-blue-400">{session?.status || 'UNKNOWN'}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Provider</span> <span className="text-white capitalize">{provider}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Heartbeat</span> <span className="text-white">Active</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-400">Duration</span> <span className="text-white font-mono">{formatDuration(durationMs)}</span></div>
          </div>
        </div>

        {/* Session Timeline Panel */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-800 shrink-0">
            <h2 className="text-sm uppercase tracking-widest text-gray-500 font-bold flex items-center gap-2"><List size={14}/> Session Timeline</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 relative">
             {events.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-500">
                  <Activity size={32} className="mb-2 opacity-50" />
                  <p className="text-sm">No provider events available</p>
               </div>
             ) : (
               <div className="space-y-4">
                 {events.map((evt) => (
                   <div key={evt.id} className="flex gap-3">
                     <div className="shrink-0 mt-1">
                       {evt.iconType === 'join' && <UserPlus size={14} className="text-green-400" />}
                       {evt.iconType === 'leave' && <UserMinus size={14} className="text-red-400" />}
                       {evt.iconType === 'attendance' && <CheckSquare size={14} className="text-blue-400" />}
                       {evt.iconType === 'alert' && <AlertCircle size={14} className="text-orange-400" />}
                       {evt.iconType === 'info' && <Info size={14} className="text-gray-400" />}
                     </div>
                     <div className="flex-1">
                       <div className="flex justify-between items-start">
                         <span className="text-sm font-medium text-gray-200">{evt.title}</span>
                         <span className="text-[10px] font-mono text-gray-500">
                           {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                         </span>
                       </div>
                       {evt.description && <p className="text-xs text-gray-400 mt-0.5">{evt.description}</p>}
                     </div>
                   </div>
                 ))}
                 <div ref={endRef} />
               </div>
             )}
          </div>
        </div>

      </div>

      {/* Force End Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl max-w-md w-full">
            <div className="flex items-center gap-3 text-red-500 mb-4">
              <AlertCircle size={28} />
              <h2 className="text-2xl font-bold">Force End Session</h2>
            </div>
            <p className="text-gray-300 mb-4 text-sm leading-relaxed">
              This will forcefully end the session, close attendance, stop recording, and remove all participants. 
              This action cannot be undone.
            </p>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg mb-6">
              <label className="text-xs text-red-400 uppercase tracking-widest font-bold mb-2 block">
                Type "END SESSION" to confirm
              </label>
              <input 
                type="text" 
                value={endConfirmText}
                onChange={(e) => setEndConfirmText(e.target.value)}
                className="w-full bg-black border border-red-500/30 text-white rounded-lg p-3 outline-none focus:border-red-500"
                placeholder="END SESSION"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setShowEndConfirm(false); setEndConfirmText(''); }}
                className="px-5 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleForceEnd}
                disabled={endConfirmText !== 'END SESSION' || isEnding}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors font-medium disabled:opacity-50 flex items-center gap-2"
              >
                {isEnding ? "Ending..." : "Force End"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
