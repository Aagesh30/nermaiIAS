import React, { useState, useEffect } from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';

export const HeaderRibbon: React.FC = () => {
  const { session, provider } = useLiveSessionContext();
  const [liveSince, setLiveSince] = useState<string>('00:00:00');

  useEffect(() => {
    const startTimeStr = session?.actualStartTime || (session as any)?.startedAt;
    if (!startTimeStr) return;
    
    const interval = setInterval(() => {
      const start = new Date(startTimeStr).getTime();
      const now = Date.now();
      const diffMs = Math.max(0, now - start);
      
      const hrs = Math.floor(diffMs / 3600000);
      const mins = Math.floor((diffMs % 3600000) / 60000);
      const secs = Math.floor((diffMs % 60000) / 1000);
      
      const formatted = `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      setLiveSince(formatted);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session?.actualStartTime, (session as any)?.startedAt]);

  return (
    <header className="w-full bg-gray-950 border-b border-gray-800 flex items-center justify-between px-6 py-3 select-none">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            N
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">{session?.title || 'Live Classroom'}</h1>
            <p className="text-xs text-gray-400">NERMAI Academy</p>
          </div>
        </div>
        
        <div className="h-6 w-px bg-gray-800 hidden md:block"></div>
        
        <div className="hidden md:flex items-center gap-4 text-xs font-medium text-gray-400">
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="text-gray-500">Course:</span> {session?.courseName || 'General'}
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="text-gray-500">Subject:</span> {session?.subject || 'Open Topic'}
          </span>
          <span className="flex items-center gap-1.5 text-gray-300">
            <span className="text-gray-500">Instructor:</span> {session?.teacherName || 'Admin'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-4 text-xs font-medium">
        {session?.status === 'LIVE' && (
          <div className="flex items-center gap-2 text-green-400 bg-green-950/40 border border-green-500/20 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            LIVE {liveSince}
          </div>
        )}
        
        <div className="flex items-center gap-2 text-gray-300 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-full capitalize">
          <span className="w-4 h-4 text-blue-400">⚡</span>
          {provider || 'zoom'}
        </div>
      </div>
    </header>
  );
};
