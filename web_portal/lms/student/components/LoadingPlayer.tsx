import React from 'react';
import { Lock } from 'lucide-react';

export const LoadingPlayer: React.FC = () => {
  return (
    <div className="relative w-full pt-[56.25%] bg-[#0A0F1E]">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-red-600" />
          <p className="text-red-600 font-semibold text-sm">
            Generating secure access…
          </p>
        </div>
        <p className="text-slate-500 text-xs text-center max-w-xs">
          Validating your session and generating a temporary player token.
        </p>
      </div>
    </div>
  );
};

