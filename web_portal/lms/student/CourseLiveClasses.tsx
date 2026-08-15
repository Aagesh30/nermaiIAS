import React from 'react';
import { Calendar } from 'lucide-react';

export const CourseLiveClasses: React.FC = () => {
  return (
    <div className="mt-8 p-12 bg-[#1A0A0A]/40 border border-white/5 rounded-3xl text-center animate-in fade-in slide-in-from-bottom-4">
      <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-white mb-2">Live Classes</h2>
      <p className="text-slate-400">Scheduled live sessions for this course will appear here.</p>
    </div>
  );
};
