import React from 'react';
import { useLiveSessionContext } from '../../../context/LiveSessionContext';
import { Play, CheckCircle } from 'lucide-react';

import { meetingLauncher } from '../../../services/MeetingLauncherService';

export const TeacherLobby: React.FC = () => {
  const { session, startSession } = useLiveSessionContext();

  const handleStartClass = () => {
    meetingLauncher.preparePopup();
    startSession();
  };

  return (
    <div className="flex flex-col items-center justify-center w-full h-full bg-black font-sans text-center px-4">
      <div className="max-w-xl w-full bg-gray-900 border border-gray-800 p-10 rounded-2xl">
        <h1 className="text-3xl font-bold text-white mb-2">Today's Class</h1>
        <p className="text-gray-400 mb-8">{session?.title || 'Open Topic'}</p>
        
        <div className="flex flex-col gap-3 text-left mb-8 bg-gray-950 p-6 rounded-xl border border-gray-800">
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle size={18} />
            <span className="text-gray-200">Resources Ready</span>
          </div>
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle size={18} />
            <span className="text-gray-200">Assignments Ready</span>
          </div>
          <div className="flex items-center gap-3 text-green-400">
            <CheckCircle size={18} />
            <span className="text-gray-200">Announcements Ready</span>
          </div>
        </div>

        <button 
          onClick={handleStartClass}
          className="flex items-center justify-center gap-3 w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)]"
        >
          <Play size={20} />
          Start Class
        </button>
      </div>
    </div>
  );
};
