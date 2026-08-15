import React, { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardApi } from '@nermai/api';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LivePulseBadge } from '../../components/ui/LivePulseBadge';
import { Radio, Clock, Calendar, ArrowLeft, Video } from 'lucide-react';


const CoursePlayer = React.lazy(() =>
  import('../LMS/CoursePlayer').then(m => ({ default: m.CoursePlayer }))
);

// ── Countdown helper ──────────────────────────────────────────────────────────
const useCountdown = (targetDate: string | null) => {
  const [text, setText] = useState('');
  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setText('Starting now'); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setText(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate]);
  return text;
};

// ── Session Card ──────────────────────────────────────────────────────────────
const SessionCard = ({ cls, onJoin }: { cls: any; onJoin: (courseId: string, classId: string) => void }) => {
  const isScheduled = cls.liveStatus === 'SCHEDULED' || cls.status === 'SCHEDULED';
  const startTime = cls.startTime || cls.scheduledAt || null;
  const countdown = useCountdown(isScheduled ? startTime : null);

  const borderClass = cls.joinAllowed
    ? 'border-green-500/40 bg-green-500/5 hover:border-green-500/70'
    : isScheduled
    ? 'border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50'
    : 'border-border hover:border-primary/50';

  const getStatusDisplay = () => {
    if (cls.liveStatus === 'JOINING') return { text: 'Host Starting...', badge: 'destructive' };
    if (cls.liveStatus === 'HOST_CONNECTED') return { text: 'Joining...', badge: 'destructive' };
    if (['LIVE', 'JOINING', 'HOST_CONNECTED'].includes(cls.liveStatus)) return { text: 'LIVE NOW', badge: 'destructive' };
    if (isScheduled) return { text: 'UPCOMING', badge: 'default' };
    return { text: cls.liveStatus || cls.status || 'ENDED', badge: 'default' };
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Card className={`transition-all duration-200 ${borderClass}`}>
      <CardContent className="p-6 flex flex-col gap-4">
        {/* Header row */}
        <div className="flex justify-between items-start">
          <div className={`p-3 rounded-lg ${cls.joinAllowed ? 'bg-red-500/15 text-red-400' : 'bg-primary/10 text-primary'}`}>
            <Radio size={22} />
          </div>
          <div className="flex items-center gap-2">
            {cls.joinAllowed && <LivePulseBadge />}
            <Badge variant={statusDisplay.badge as any}>
              {statusDisplay.text}
            </Badge>
          </div>
        </div>

        {/* Title & meta */}
        <div>
          <h3 className="text-lg font-bold text-textPrimary mb-1 leading-snug">{cls.title || cls.className}</h3>
          <div className="flex flex-wrap gap-2 items-center my-1.5">
            {cls.courseName && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Course: {cls.courseName}
              </span>
            )}
            {cls.batchName && (
              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Batch: {cls.batchName}
              </span>
            )}
          </div>
          {cls.subjectName && (
            <p className="text-xs text-textSecondary font-medium uppercase tracking-wide">{cls.subjectName}</p>
          )}
        </div>

        {/* Time info */}
        <div className="flex items-center gap-2 text-xs text-textSecondary">
          {isScheduled && countdown ? (
            <><Clock size={12} className="text-yellow-400" /><span className="text-yellow-400 font-medium">Starts in {countdown}</span></>
          ) : startTime ? (
            <><Calendar size={12} /><span>{new Date(startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span></>
          ) : null}
          {cls.provider && (
            <><span className="mx-1">·</span><Video size={12} /><span className="capitalize">{cls.provider === 'zoom' ? 'Zoom Live' : cls.provider}</span></>
          )}
        </div>

        {/* Action */}
        {cls.joinAllowed && (
          <Button
            id={`join-live-${cls.courseId || cls.id}`}
            variant="default"
            className="w-full"
            onClick={() => onJoin(cls.courseId || cls.id, cls.classId || cls.id)}
          >
            Join Now
          </Button>
        )}
        {isScheduled && (
          <div className="w-full py-2 px-4 text-center text-xs text-yellow-400/80 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            Available at start time
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export const StudentLiveClassesPage = () => {
  const navigate = useNavigate();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [initialClassId, setInitialClassId] = useState<string | null>(null);
  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['studentDashboard'],
    queryFn: async () => {
      const res = await DashboardApi.getStudentOverview();
      return res.data?.data || res.data;
    },
    refetchInterval: 15000,
  });

  const classes = dashboardData?.liveClasses || [];

  // ── CoursePlayer view ──
  if (selectedCourseId) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={() => { setSelectedCourseId(null); setInitialClassId(null); }}
          className="flex items-center gap-2 mb-6 text-sm text-textSecondary hover:text-textPrimary transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Live Classes
        </button>
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <CoursePlayer 
            courseId={selectedCourseId} 
            initialClassId={initialClassId || undefined} 
            onBack={() => { setSelectedCourseId(null); setInitialClassId(null); }} 
          />
        </Suspense>
      </div>
    );
  }

  // ── List view ──
  const live = classes.filter((c: any) => c.joinAllowed);
  const upcoming = classes.filter((c: any) => !c.joinAllowed && (c.liveStatus === 'SCHEDULED' || c.status === 'SCHEDULED'));
  const other = classes.filter((c: any) => !c.joinAllowed && !['SCHEDULED'].includes(c.liveStatus || c.status));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Live Classes"
        description="Join ongoing or upcoming live sessions."
      />

      {loading ? (
        <div className="flex items-center gap-3 text-textSecondary">
          <div className="w-5 h-5 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
          Loading live classes...
        </div>
      ) : classes.length === 0 ? (
        <div className="p-12 border border-dashed border-border rounded-2xl text-center">
          <Radio className="mx-auto text-textSecondary mb-4 w-12 h-12" />
          <h3 className="text-lg font-bold text-textPrimary">No Live Classes</h3>
          <p className="text-textSecondary mt-1">There are no live classes at this time.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {live.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-red-400 mb-4 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Live Now
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {live.map((cls: any, i: number) => (
                  <SessionCard 
                    key={i} 
                    cls={cls} 
                    onJoin={() => navigate(`/student/live-session/${cls.sessionId || cls.id}`)} 
                  />
                ))}
              </div>
            </section>
          )}

          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-yellow-400/80 mb-4 flex items-center gap-2">
                <Clock size={12} />
                Upcoming
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {upcoming.map((cls: any, i: number) => (
                  <SessionCard 
                    key={i} 
                    cls={cls} 
                    onJoin={() => navigate(`/student/live-session/${cls.sessionId || cls.id}`)} 
                  />
                ))}
              </div>
            </section>
          )}

          {other.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-widest text-textSecondary mb-4">Past Sessions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {other.map((cls: any) => (
                  <SessionCard 
                    key={cls.id} 
                    cls={cls} 
                    onJoin={() => navigate(`/student/live-session/${cls.sessionId || cls.id}`)} 
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
