import React, { useState, useEffect } from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { Users, Clock, TrendingUp, Activity } from 'lucide-react';
import { liveEventBus } from '../orchestration/LiveEventBus';

export const AnalyticsWorkspace: React.FC = () => {
  const { session } = useLiveSessionContext();
  
  const [activeCount, setActiveCount] = useState(0);
  const [peakCount, setPeakCount] = useState(0);
  const [joinCount, setJoinCount] = useState(0);
  const [leaveCount, setLeaveCount] = useState(0);
  
  // Calculate duration
  const [durationStr, setDurationStr] = useState('00:00:00');

  useEffect(() => {
    // Initial sync with session if available
    if (session?.participants) {
      const active = session.participants.filter((p: any) => p.presenceStatus === 'JOINED' || p.presenceStatus === 'RECONNECTING' || p.presenceStatus === 'CONNECTED').length;
      setActiveCount(active);
      setPeakCount(active);
      setJoinCount(session.participants.length);
    }
  }, [session]);

  useEffect(() => {
    const unsubJoin = liveEventBus.on('PARTICIPANT_JOINED', () => {
      setActiveCount(prev => {
        const next = prev + 1;
        setPeakCount(p => Math.max(p, next));
        return next;
      });
      setJoinCount(prev => prev + 1);
    });

    const unsubLeave = liveEventBus.on('PARTICIPANT_LEFT', () => {
      setActiveCount(prev => Math.max(0, prev - 1));
      setLeaveCount(prev => prev + 1);
    });

    return () => {
      unsubJoin();
      unsubLeave();
    };
  }, []);

  useEffect(() => {
    if (!session?.actualStartTime && !session?.startTime) return;
    
    const start = new Date(session.actualStartTime || session.startTime).getTime();
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diffMs = now - start;
      const h = Math.floor(diffMs / 3600000).toString().padStart(2, '0');
      const m = Math.floor((diffMs % 3600000) / 60000).toString().padStart(2, '0');
      const s = Math.floor((diffMs % 60000) / 1000).toString().padStart(2, '0');
      setDurationStr(`${h}:${m}:${s}`);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session?.actualStartTime, session?.startTime]);

  return (
    <div className="flex-1 flex flex-col bg-[#050505] p-6 h-full overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-500" /> Live Analytics
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Active Participants */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Users size={16} />
            <span className="text-sm font-medium">Active Participants</span>
          </div>
          <div className="text-3xl font-bold text-white">{activeCount}</div>
        </div>

        {/* Peak Attendance */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <TrendingUp size={16} />
            <span className="text-sm font-medium">Peak Attendance</span>
          </div>
          <div className="text-3xl font-bold text-blue-400">{peakCount}</div>
        </div>

        {/* Session Duration */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Clock size={16} />
            <span className="text-sm font-medium">Elapsed Duration</span>
          </div>
          <div className="text-3xl font-bold text-gray-200 font-mono">{durationStr}</div>
        </div>

        {/* Churn (Joins/Leaves) */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5 flex flex-col justify-between">
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <Activity size={16} />
            <span className="text-sm font-medium">Total Joins / Leaves</span>
          </div>
          <div className="flex items-baseline gap-2 text-3xl font-bold text-white">
            <span className="text-green-400">{joinCount}</span>
            <span className="text-gray-500 text-xl">/</span>
            <span className="text-orange-400">{leaveCount}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-900/10 border border-blue-900/30 rounded-xl">
        <p className="text-sm text-blue-400 flex items-center gap-2">
          <Info size={16} />
          More detailed analytics will be available in the post-session reports.
        </p>
      </div>
    </div>
  );
};

const Info = ({ size }: { size: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
);
