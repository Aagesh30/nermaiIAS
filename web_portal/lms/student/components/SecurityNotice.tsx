import React from 'react';
import { Shield } from 'lucide-react';

export const SecurityNotice: React.FC = () => {
  return (
    <div className="mt-4 p-4 rounded-xl flex items-center gap-3 bg-red-600/5 border border-red-600/15">
      <Shield className="text-red-600 w-5 h-5 shrink-0" />
      <p className="text-slate-500 text-xs leading-relaxed">
        This video is protected. Your name and email are watermarked on the video. Access tokens expire automatically to prevent unauthorized sharing.
      </p>
    </div>
  );
};

