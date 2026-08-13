import React from 'react';
import { useLiveSessionContext } from '../../../context/LiveSessionContext';
import { Play } from 'lucide-react';

import { meetingLauncher } from '../../../services/MeetingLauncherService';
import { LiveSessionControlPanel } from '../../../components/LiveSessionControlPanel';

export const AdminLobby: React.FC = () => {
  const { session, provider, startSession } = useLiveSessionContext();

  const handleStartClass = () => {
    meetingLauncher.preparePopup();
    startSession();
  };

  const isMeetingProvider = provider === "zoom" || provider === "gmeet";
  const liveStatus = session?.status;

  if (isMeetingProvider && liveStatus === "LIVE") {
    return <LiveSessionControlPanel />;
  }

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black font-sans text-center px-4">
      <div className="max-w-xl w-full bg-gray-900 border border-gray-800 p-10 rounded-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">{session?.title || 'Live Classroom'}</h1>
        
        {(session?.courseName || session?.subject) && (
          <p className="text-gray-400 mb-8">
            {[session?.courseName, session?.subject].filter(Boolean).join(' • ')}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-4 text-left mb-8">
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Students</span>
            <span className="text-white font-medium">{session?.participants?.length || 0} Expected</span>
          </div>
          <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Host</span>
            <span className="text-white font-medium capitalize">
              {session?.hostName || session?.host?.displayName || session?.host?.name || session?.teacherName || 'Not Assigned'}
            </span>
          </div>
        </div>

        <button 
          onClick={handleStartClass}
          className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          <Play size={20} />
          {session?.status === 'LIVE' ? 'Join Class' : `Start Class${window.location.search.includes('adminOverride=true') ? ' (Override)' : ''}`}
        </button>
      </div>
    </div>
  );
};
