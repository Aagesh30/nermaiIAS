import React from 'react';
import { PlayCircle, Tv } from 'lucide-react';
import { LiveBadge } from './LiveBadge';
import { AttendanceStatusBadge } from './AttendanceStatusBadge';

interface PlayerHeaderProps {
  classId: string;
  title: string;
  subjectName?: string;
  chapterName?: string;
  duration?: string;
  isLive?: boolean;
}

export const PlayerHeader: React.FC<PlayerHeaderProps> = ({
  classId,
  title,
  subjectName,
  chapterName,
  duration,
  isLive
}) => {
  return (
    <div className="mb-6 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <div className="mt-1 shrink-0">
          {isLive ? (
            <Tv className="w-6 h-6 text-red-500" />
          ) : (
            <PlayCircle className="w-6 h-6 text-red-600" />
          )}
        </div>
        <h1 className="text-2xl font-extrabold text-slate-100 leading-tight">
          {title}
        </h1>
      </div>
      
      <div className="flex flex-wrap items-center gap-2 pl-9">
        {subjectName && (
          <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-red-600/15 text-red-500 border border-red-600/10">
            {subjectName}
          </span>
        )}
        {chapterName && (
          <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-400/10 text-slate-400 border border-slate-400/10">
            {chapterName}
          </span>
        )}
        {isLive ? (
          <LiveBadge />
        ) : (
          duration && (
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/15 text-emerald-500 border border-emerald-500/10">
              {duration}
            </span>
          )
        )}
        <AttendanceStatusBadge classId={classId} />
      </div>
    </div>
  );
};

