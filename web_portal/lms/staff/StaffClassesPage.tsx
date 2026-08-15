import React, { useState, useEffect } from 'react';
import { Video, Calendar, Clock, Play, Users, ArrowRight, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthProvider';
import api from '../../core/api';

interface LiveSession {
  id: string;
  title: string;
  sessionRole: 'HOST' | 'CO_HOST';
  status: 'SCHEDULED' | 'LIVE' | 'ENDED';
  scheduledStartTime: string;
  expectedDurationMinutes: number;
}

export const StaffClassesPage = () => {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { role } = useAuth(); // role could be teacher or management

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const response = await api.get('/staff/me/live-sessions');
        // Sort by scheduledStartTime descending (newest first)
        const sorted = (response.data.data || []).sort((a: any, b: any) => 
          new Date(b.scheduledStartTime || 0).getTime() - new Date(a.scheduledStartTime || 0).getTime()
        );
        setSessions(sorted);
      } catch (error) {
        console.error('Failed to fetch assigned sessions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleAction = (session: LiveSession) => {
    if (session.status === 'ENDED') {
      // In MVP, maybe just alert or go to recording page
      alert('Recording viewing is not yet implemented in this view.');
      return;
    }
    
    // For Scheduled/Live
    navigate(`/staff/live/${session.id}`);
  };

  const getActionButton = (session: LiveSession) => {
    if (session.status === 'ENDED') {
      return (
        <button 
          onClick={() => handleAction(session)}
          className="w-full flex items-center justify-center px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors border border-white/10"
        >
          <Eye className="w-4 h-4 mr-2" /> View Recording
        </button>
      );
    }

    if (session.status === 'SCHEDULED' || session.status === 'LIVE' || session.status === 'JOINING') {
      // We check if they can start session. Both Teacher and Management can start if they are HOST.
      const canStart = ['teacher', 'management', 'super_admin'].includes((role || '').toLowerCase());
      
      if (session.sessionRole === 'HOST' && canStart) {
        return (
          <button 
            onClick={() => handleAction(session)}
            className="w-full flex items-center justify-center px-4 py-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 text-white rounded-lg transition-all shadow-lg"
          >
            <Play className="w-4 h-4 mr-2 fill-current" /> Start Session
          </button>
        );
      } else {
        return (
          <button 
            onClick={() => handleAction(session)}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg transition-all"
          >
            <ArrowRight className="w-4 h-4 mr-2" /> Join Session
          </button>
        );
      }
    }
    
    return (
      <button disabled className="w-full px-4 py-2 bg-white/5 text-white/40 rounded-lg cursor-not-allowed">
        Waiting for Admin
      </button>
    );
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-white/10 border-t-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">My Live Classes</h1>
        <p className="text-white/60">Live sessions where you are assigned as Host or Co-Host.</p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-white/5 rounded-2xl p-12 text-center">
          <Video className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Live Sessions</h3>
          <p className="text-white/50">You have not been assigned to any upcoming live sessions.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div key={session.id} className="bg-[#1A1A1A] border border-white/5 rounded-2xl overflow-hidden hover:border-white/20 transition-all group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase border ${
                    session.status === 'LIVE' ? 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse' :
                    session.status === 'COMPLETED' || session.status === 'ENDED' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    'bg-white/5 text-white/60 border-white/10'
                  }`}>
                    {session.status}
                  </span>
                  <span className={`text-xs font-bold tracking-wider uppercase ${
                    session.sessionRole === 'HOST' ? 'text-[#D4AF37]' : 'text-blue-400'
                  }`}>
                    {session.sessionRole}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-4 group-hover:text-red-400 transition-colors">{session.title}</h3>
                
                <div className="space-y-3 mb-6">
                  {session.scheduledStartTime && (
                    <div className="flex items-center text-sm text-white/60">
                      <Calendar className="w-4 h-4 mr-3 text-white/40" />
                      {new Date(session.scheduledStartTime).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                      <span className="mx-2">•</span>
                      {new Date(session.scheduledStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-white/60">
                    <Clock className="w-4 h-4 mr-3 text-white/40" />
                    {session.expectedDurationMinutes} minutes expected
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-white/5">
                  {getActionButton(session)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
