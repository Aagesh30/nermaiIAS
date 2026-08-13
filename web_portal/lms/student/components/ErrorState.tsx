import React from 'react';
import { RefreshCw, Lock } from 'lucide-react';

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  const isLocked = error.includes('Waiting for teacher');

  if (isLocked) {
    return (
      <div className="mb-6 p-10 text-center bg-[#1A0808]/80 rounded-2xl border border-amber-500/30">
        <Lock className="w-16 h-16 text-amber-600 mx-auto mb-4 animate-pulse" />
        <h3 className="text-2xl font-bold text-slate-100 mb-2">Class Locked</h3>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          The class hasn't started yet. We are waiting for the teacher to join. This page will automatically refresh once the teacher arrives.
        </p>
        <div className="w-8 h-8 border-2 border-amber-600 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="mb-4 flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
      <div className="text-red-500 text-sm">{error}</div>
      <button
        onClick={onRetry}
        className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-500 text-sm font-medium rounded-lg transition-colors"
      >
        <RefreshCw className="w-4 h-4" />
        Retry
      </button>
    </div>
  );
};

