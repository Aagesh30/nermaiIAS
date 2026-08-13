import React from 'react';

export const LiveBadge: React.FC = () => {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-500 tracking-wider animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
      LIVE
    </span>
  );
};

