import React from 'react';
import { RefreshCw } from 'lucide-react';

interface SessionExpiredProps {
  onRefresh: () => void;
}

export const SessionExpired: React.FC<SessionExpiredProps> = ({ onRefresh }) => {
  return (
    <div className="mb-4 flex items-center justify-between p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
      <div className="text-amber-500 text-sm">
        Your session is expiring. The video continues to play, but click Refresh to start a new session.
      </div>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-500 text-sm font-medium rounded-lg transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Refresh Session
      </button>
    </div>
  );
};

