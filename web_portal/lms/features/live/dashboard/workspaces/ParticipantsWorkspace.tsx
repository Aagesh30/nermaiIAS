import React, { useState, useEffect } from 'react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';
import { LiveSessionApi } from '@nermai/api';
import { liveEventBus } from '../orchestration/LiveEventBus';
import { Search, Mic, MicOff, Hand, Video } from 'lucide-react';

export const ParticipantsWorkspace: React.FC = () => {
  const { session } = useLiveSessionContext();
  const [participants, setParticipants] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchParticipants = () => {
    if (session?.id) {
      LiveSessionApi.listParticipants(session.id)
        .then((res) => {
          setParticipants(res.data?.data || []);
        })
        .catch(console.error);
    }
  };

  useEffect(() => {
    fetchParticipants();

    // Subscribe to LiveEventBus to update participants in real time
    const onParticipantJoined = () => fetchParticipants();
    const onParticipantLeft = () => fetchParticipants();
    const onHandRaised = (e: any) => fetchParticipants(); // Naive refresh, could optimize
    
    const u1 = liveEventBus.on('PARTICIPANT_JOINED', onParticipantJoined);
    const u2 = liveEventBus.on('PARTICIPANT_LEFT', onParticipantLeft);
    const u3 = liveEventBus.on('HAND_RAISED', onHandRaised);
    // You could also add HOST_CONNECTED, etc.

    return () => {
      u1(); u2(); u3();
    };
  }, [session?.id]);

  const filteredParticipants = participants.filter(p => 
    !search || p.displayName?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col bg-[#050505] p-6 h-full overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          Participants <span className="bg-gray-800 text-gray-300 text-xs px-2 py-0.5 rounded-full">{participants.length}</span>
        </h2>
      </div>

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-2.5 text-gray-500" size={16} />
        <input 
          type="text" 
          placeholder="Search participants..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-gray-900 border border-gray-800 rounded-lg py-2 pl-10 pr-4 text-sm text-gray-200 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      <div className="flex-1 overflow-y-auto pr-2 space-y-2">
        {filteredParticipants.map(p => (
          <div key={p.studentId} className="flex items-center justify-between bg-gray-900/40 border border-gray-800/60 p-3 rounded-lg hover:bg-gray-800/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-900/30 flex items-center justify-center text-blue-400 font-bold border border-blue-900/50">
                  {p.displayName ? p.displayName.charAt(0).toUpperCase() : '?'}
                </div>
                {p.presenceStatus === 'OFFLINE' || p.presenceStatus === 'LEFT' ? (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-[#050505] rounded-full"></div>
                ) : p.presenceStatus === 'RECONNECTING' ? (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-yellow-500 border-2 border-[#050505] rounded-full"></div>
                ) : (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#050505] rounded-full shadow-[0_0_5px_rgba(34,197,94,0.5)]"></div>
                )}
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-200 font-medium text-sm">{p.displayName}</span>
                  {p.role === 'HOST' || p.role === 'CO_HOST' ? (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-blue-900/50 text-blue-400 rounded-sm border border-blue-800/50">Host</span>
                  ) : null}
                  {p.moderationStatus === 'WAITING' ? (
                    <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-orange-900/50 text-orange-400 rounded-sm border border-orange-800/50">Waiting Room</span>
                  ) : null}
                </div>
                <div className="text-xs text-gray-500 mt-0.5 capitalize">{p.presenceStatus?.toLowerCase()}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 text-gray-500">
              {p.isHandRaised && <Hand size={16} className="text-yellow-500 fill-yellow-500/20" />}
              {p.capabilities?.canSpeak ? (
                p.isMuted ? <MicOff size={16} className="text-red-400" /> : <Mic size={16} className="text-green-400" />
              ) : null}
            </div>
          </div>
        ))}

        {filteredParticipants.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm">
            {search ? 'No participants match your search.' : 'Waiting for participants to join...'}
          </div>
        )}
      </div>
    </div>
  );
};
