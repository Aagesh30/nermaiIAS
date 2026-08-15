import React, { useState, useEffect, useRef } from 'react';
import { liveEventBus, LiveEventMap, LiveEvent } from '../orchestration/LiveEventBus';
import { Activity, UserPlus, UserMinus, MonitorUp, Info, AlertCircle, Video, CheckSquare } from 'lucide-react';

interface TimelineEvent {
  id: string;
  timestamp: number;
  type: keyof LiveEventMap;
  payload: any;
  title: string;
  description?: string;
  iconType: 'info' | 'join' | 'leave' | 'screen' | 'attendance' | 'alert';
}

export const TimelineWorkspace: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  const addEvent = (type: keyof LiveEventMap, title: string, payload: any, iconType: TimelineEvent['iconType'], description?: string) => {
    setEvents(prev => {
      const newEvents = [...prev, {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        type,
        payload,
        title,
        description,
        iconType
      }];
      return newEvents.slice(-500);
    });
  };

  useEffect(() => {
    // Scroll to bottom when new events arrive
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  useEffect(() => {
    // Initial event
    addEvent('SESSION_CONNECTING', 'Session Initialized', {}, 'info', 'Waiting for events from LiveEventBus...');

    const subs = [
      liveEventBus.on('HOST_CONNECTED', (e) => addEvent('HOST_CONNECTED', 'Host Joined', e.payload, 'join', e.payload.displayName)),
      liveEventBus.on('HOST_DISCONNECTED', (e) => addEvent('HOST_DISCONNECTED', 'Host Disconnected', e.payload, 'alert', e.payload.reason)),
      liveEventBus.on('PARTICIPANT_JOINED', (e) => addEvent('PARTICIPANT_JOINED', 'Participant Joined', e.payload, 'join', e.payload.displayName)),
      liveEventBus.on('PARTICIPANT_LEFT', (e) => addEvent('PARTICIPANT_LEFT', 'Participant Left', e.payload, 'leave', e.payload.displayName)),
      liveEventBus.on('ATTENDANCE_STARTED', (e) => addEvent('ATTENDANCE_STARTED', 'Attendance Started', e.payload, 'attendance', 'Teacher triggered attendance.')),
      liveEventBus.on('ATTENDANCE_STOPPED', (e) => addEvent('ATTENDANCE_STOPPED', 'Attendance Ended', e.payload, 'attendance', 'Teacher ended attendance.')),
      liveEventBus.on('SCREEN_SHARE_STARTED', (e) => addEvent('SCREEN_SHARE_STARTED', 'Screen Share Started', e.payload, 'screen')),
      liveEventBus.on('SCREEN_SHARE_STOPPED', (e) => addEvent('SCREEN_SHARE_STOPPED', 'Screen Share Stopped', e.payload, 'screen')),
      liveEventBus.on('HAND_RAISED', (e) => addEvent('HAND_RAISED', 'Hand Raised', e.payload, 'info', e.payload.displayName)),
      liveEventBus.on('SESSION_ENDED', (e) => addEvent('SESSION_ENDED', 'Meeting Ended', e.payload, 'alert', 'Session finalized.'))
    ];

    return () => {
      subs.forEach(unsub => unsub());
    };
  }, []);

  const renderIcon = (type: TimelineEvent['iconType']) => {
    switch (type) {
      case 'join': return <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><UserPlus size={14} /></div>;
      case 'leave': return <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400"><UserMinus size={14} /></div>;
      case 'screen': return <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400"><MonitorUp size={14} /></div>;
      case 'attendance': return <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><CheckSquare size={14} /></div>;
      case 'alert': return <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"><AlertCircle size={14} /></div>;
      case 'info':
      default: return <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center text-gray-400"><Info size={14} /></div>;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-[#050505] p-6 h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Activity size={20} className="text-blue-500" /> Live Timeline
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 relative">
        {/* Timeline track line */}
        <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-800"></div>
        
        <div className="space-y-6 relative z-10">
          {events.map((evt) => (
            <div key={evt.id} className="flex gap-4">
              <div className="shrink-0">{renderIcon(evt.iconType)}</div>
              <div className="flex-1 bg-gray-900/40 border border-gray-800/60 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold text-gray-200">{evt.title}</span>
                  <span className="text-xs font-mono text-gray-500">
                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                {evt.description && (
                  <p className="text-sm text-gray-400">{evt.description}</p>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>
    </div>
  );
};
