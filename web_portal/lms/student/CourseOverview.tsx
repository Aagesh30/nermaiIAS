import React from 'react';
import { BookOpen } from 'lucide-react';

export const CourseOverview: React.FC<{ course: any }> = ({ course }) => {
  return (
    <div className="mt-8 p-8 bg-[#1A0A0A]/40 border border-white/5 rounded-3xl animate-in fade-in slide-in-from-bottom-4">
      <h2 className="text-2xl font-bold text-white mb-6">Course Overview</h2>
      <div className="text-slate-300 leading-relaxed max-w-4xl space-y-4">
        <p>{course.description || 'Welcome to the course. Comprehensive overview details will appear here.'}</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10">
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <BookOpen className="w-8 h-8 text-amber-500 mb-4" />
            <h3 className="font-bold text-white mb-2">Curriculum</h3>
            <p className="text-sm text-slate-400">Structured modules covering all critical topics.</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <BookOpen className="w-8 h-8 text-blue-500 mb-4" />
            <h3 className="font-bold text-white mb-2">Live Sessions</h3>
            <p className="text-sm text-slate-400">Interactive live classes with expert faculty.</p>
          </div>
          <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
            <BookOpen className="w-8 h-8 text-emerald-500 mb-4" />
            <h3 className="font-bold text-white mb-2">Assessments</h3>
            <p className="text-sm text-slate-400">Regular tests to track your preparation.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

