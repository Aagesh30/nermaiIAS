import React from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { Activity, Database, Server, Video, Users, Disc, Monitor, User } from 'lucide-react';

const HealthIndicator: React.FC<{
  label: string;
  value: string;
  status: 'healthy' | 'warning' | 'error' | 'inactive';
  icon: React.ReactNode;
}> = ({ label, value, status, icon }) => {
  const colors = {
    healthy: 'text-green-400 bg-green-500/10 border-green-500/20',
    warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
    error: 'text-red-400 bg-red-500/10 border-red-500/20',
    inactive: 'text-gray-500 bg-gray-500/10 border-gray-500/20'
  };

  const dots = {
    healthy: 'bg-green-500',
    warning: 'bg-yellow-500',
    error: 'bg-red-500',
    inactive: 'bg-gray-600'
  };

  return (
    <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-[10px] font-medium tracking-wider whitespace-nowrap ${colors[status]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status]}`}></span>
      <span className="opacity-70">{icon}</span>
      <span className="uppercase text-gray-500 mr-1">{label}</span>
      <span className="text-gray-300">{value}</span>
    </div>
  );
};

export const ClassHealthWidget: React.FC = () => {
  const { academicState, zoomState, windowState, session } = useLiveSessionContext();

  const isLive = academicState === 'LIVE';
  
  const zoomHealth = zoomState === 'CONNECTED' ? 'healthy' : zoomState === 'RECONNECTING' ? 'warning' : 'inactive';
  const popupHealth = windowState === 'OPENED' || windowState === 'FOCUSED' ? 'healthy' : windowState === 'BLOCKED' ? 'error' : windowState === 'CRASHED' ? 'error' : 'inactive';
  
  const isRecording = session?.isRecording ? 'ON' : 'OFF';
  const isAttendanceOpen = session?.attendanceOpen ? 'OPEN' : 'CLOSED';
  
  const participantsCount = session?.participants?.length || 0;

  return (
    <div className="w-full bg-[#050505] border-b border-gray-800/60 flex items-center gap-3 px-6 py-2 overflow-x-auto select-none">
      <HealthIndicator label="Zoom" value={zoomState} status={zoomHealth} icon={<Video size={12} />} />
      <HealthIndicator label="Popup" value={windowState} status={popupHealth} icon={<Monitor size={12} />} />
      <HealthIndicator label="Host" value={isLive ? 'Online' : 'Waiting'} status={isLive ? 'healthy' : 'inactive'} icon={<User size={12} />} />
      <HealthIndicator label="Students" value={participantsCount.toString()} status={participantsCount > 0 ? 'healthy' : 'inactive'} icon={<Users size={12} />} />
      <HealthIndicator label="Recording" value={isRecording} status={isRecording === 'ON' ? 'healthy' : 'inactive'} icon={<Disc size={12} />} />
      <HealthIndicator label="Attendance" value={isAttendanceOpen} status={isAttendanceOpen === 'OPEN' ? 'healthy' : 'inactive'} icon={<CheckSquare size={12} />} />
      <HealthIndicator label="Firestore" value="Listening" status="healthy" icon={<Database size={12} />} />
      <HealthIndicator label="Redis" value="Healthy" status="healthy" icon={<Server size={12} />} />
    </div>
  );
};

// Lucide import missing above
import { CheckSquare } from 'lucide-react';
