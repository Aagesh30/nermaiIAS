import React from 'react';
import { PlayCircle } from 'lucide-react';

interface CourseSyllabusProps {
  syllabus: any[];
  onSelectVideo: (video: any) => void;
  realtimeLiveSessions?: any[];
}

export const CourseSyllabus: React.FC<CourseSyllabusProps> = ({ syllabus, onSelectVideo, realtimeLiveSessions = [] }) => {
  return (
    <div className="space-y-8 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {syllabus.map((subject: any, sIdx: number) => (
        <div key={subject.id || sIdx} className="bg-[#1A0A0A]/40 border border-white/5 rounded-3xl p-6 md:p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-amber-500 mb-6">{subject.name}</h2>
          <div className="space-y-8">
            {subject.topics?.map((topic: any, tIdx: number) => (
              <div key={topic.id || tIdx}>
                <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                  {topic.name || topic.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pl-4">
                  {topic.classes?.map((cls: any, cIdx: number) => {
                    const isLive = ['LIVE', 'JOINING', 'HOST_CONNECTED'].includes(realtimeLiveSessions.find(s => s.classId === cls.id)?.status || '');
                    return (
                      <button 
                        key={cls.id || cIdx}
                        onClick={() => onSelectVideo(cls)}
                        className="flex items-start p-4 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-red-500/30 rounded-2xl transition-all group text-left relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-red-600/0 to-red-600/5 group-hover:to-red-600/10 transition-colors" />
                        <PlayCircle className="w-10 h-10 text-slate-600 group-hover:text-red-500 mr-4 shrink-0 transition-colors relative z-10" />
                        <div className="relative z-10">
                          <p className="text-slate-200 font-bold group-hover:text-white transition-colors line-clamp-2">{cls.title}</p>
                          <div className="flex items-center gap-2 mt-2">
                            {isLive ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-500 animate-pulse">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                LIVE NOW
                              </span>
                            ) : (
                              <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-sm ${cls.classType?.includes('live') ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-300'}`}>
                                {cls.classType?.includes('live') ? 'Live Class' : 'Recorded'}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {topic.classes?.length === 0 && <p className="text-slate-500 italic text-sm pl-2">No classes available in this topic yet.</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {syllabus.length === 0 && (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-white/10">
          <PlayCircle className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-300">Syllabus is Empty</h3>
          <p className="text-slate-500 mt-2">Course content hasn't been uploaded yet.</p>
        </div>
      )}
    </div>
  );
};

