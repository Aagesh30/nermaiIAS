import React, { useState, useCallback } from 'react';
import { AccessRequestApi } from '../../core/services';
import { Lock, CheckCircle2, ChevronRight, MessageSquare, AlertCircle, Video, Film, Radio, FileWarning } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RequestScope {
  type: 'CLASS' | 'TOPIC' | 'SUBJECT' | 'COURSE';
  contentId: string;
  count: number;
  units: number;
  allowed: boolean;
  reason?: string;
  isPending?: boolean;
}

interface DeniedPayload {
  status: 'DENIED';
  reason: string;
  context?: {
    batchType?: 'online' | 'offline' | 'recorded' | 'free' | null;
    classType?: string;
    batchName?: string;
  };
  allowedRequestScopes?: RequestScope[];
  remainingRecordedUnits?: number;
  monthlyLimit?: number;
}

interface AccessRequestCardProps {
  classId: string;
  deniedPayload: DeniedPayload;
}

const DENIAL_CONFIG: Record<string, {
  icon: any;
  iconColor: string;
  title: string;
  subtitle: string;
  showRequest: boolean;
}> = {
  NOT_ENROLLED: { icon: FileWarning, iconColor: 'text-red-500', title: 'Not Enrolled', subtitle: 'You are not registered as a student. Please contact the institute to enroll.', showRequest: false },
  FREE_PLAN: { icon: Lock, iconColor: 'text-yellow-500', title: 'Premium Content', subtitle: 'This class is available only for enrolled students. View our plans to get access.', showRequest: false },
  RECORDED_REQUIRES_APPROVAL: { icon: Film, iconColor: 'text-yellow-500', title: 'Recorded Video', subtitle: 'Your batch does not include recorded access by default. You can request temporary access.', showRequest: true },
  LIVE_REQUIRES_APPROVAL: { icon: Radio, iconColor: 'text-red-500', title: 'Live Class', subtitle: 'Live classes require special approval for your batch.', showRequest: true },
  COURSE_NOT_ASSIGNED: { icon: Lock, iconColor: 'text-red-500', title: 'Course Not Assigned', subtitle: 'This course is not assigned to any of your active batches.', showRequest: false },
  NO_CAPABILITY: { icon: Lock, iconColor: 'text-yellow-500', title: 'Access Required', subtitle: 'Your current batch does not include access to this content.', showRequest: true },
  LIMIT_EXCEEDED: { icon: AlertCircle, iconColor: 'text-red-500', title: 'Monthly Limit Reached', subtitle: 'You have used all your recorded access units for this month.', showRequest: false }
};

const SCOPE_LABELS: Record<string, string> = { CLASS: 'This Class', TOPIC: 'Entire Topic', SUBJECT: 'Entire Subject', COURSE: 'Complete Course' };

export const AccessRequestCard: React.FC<AccessRequestCardProps> = ({ classId, deniedPayload }) => {
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  const config = DENIAL_CONFIG[deniedPayload.reason] ?? DENIAL_CONFIG['NO_CAPABILITY'];
  const Icon = config.icon;

  const handleRequestAccess = useCallback(async (scope: RequestScope) => {
    if (!scope.allowed || submitting) return;
    setSubmitting(scope.type);
    setErrorMessage('');
    
    try {
      await AccessRequestApi.createRequest({
        requestType: scope.type,
        contentId: scope.contentId,
        contentName: 'Requested Content',
        reason: `Student requested ${scope.type.toLowerCase()} access`
      });
      setSubmitted(scope.type);
    } catch (err: any) {
      setErrorMessage(err.response?.data?.message || err.response?.data?.error || 'Failed to submit request.');
    } finally {
      setSubmitting(null);
    }
  }, [submitting]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-[#0A0D14] text-white p-8 rounded-2xl relative overflow-hidden overflow-y-auto">
      <div className="flex flex-col items-center max-w-lg w-full mt-10 mb-10">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-6 border bg-opacity-10 ${config.iconColor.replace('text-', 'bg-').replace('500', '500/10')} ${config.iconColor.replace('text-', 'border-').replace('500', '500/20')}`}>
          <Icon className={`w-8 h-8 ${config.iconColor}`} />
        </div>

        <h3 className={`text-2xl font-bold mb-2 ${config.iconColor}`}>{config.title}</h3>
        <p className="text-slate-400 text-center mb-6 text-lg">{config.subtitle}</p>
        
        {deniedPayload.context?.batchName && (
          <div className="bg-[#1E1E1E] px-4 py-1.5 rounded-full mb-8 text-sm text-slate-300">
            Assigned to: {deniedPayload.context.batchName}
          </div>
        )}

        {config.showRequest && deniedPayload.allowedRequestScopes && deniedPayload.allowedRequestScopes.length > 0 && (
          <div className="w-full mt-4">
            <div className="bg-[#111] border border-[#222] rounded-xl p-4 mb-6">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-slate-400">Monthly Units</span>
                <span className="font-semibold">{deniedPayload.remainingRecordedUnits} / {deniedPayload.monthlyLimit} remaining</span>
              </div>
              <div className="h-1.5 bg-[#222] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${deniedPayload.remainingRecordedUnits! > 0 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                  style={{ width: `${Math.max(4, (deniedPayload.remainingRecordedUnits! / (deniedPayload.monthlyLimit || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <h4 className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Request Access</h4>
            
            {deniedPayload.allowedRequestScopes.map((scope) => (
              <div key={scope.type} className={`flex items-center justify-between p-4 bg-[#111] border border-[#222] rounded-xl mb-3 ${!scope.allowed && 'opacity-50'}`}>
                <div className="flex flex-col">
                  <span className="font-semibold text-white">{SCOPE_LABELS[scope.type]}</span>
                  <span className="text-sm text-slate-400">
                    {scope.count > 0 ? `${scope.count} video${scope.count !== 1 ? 's' : ''}` : '1 video'} • 
                    <span className={scope.units <= deniedPayload.remainingRecordedUnits! ? 'text-yellow-500' : 'text-red-500'}> {scope.units} unit{scope.units !== 1 ? 's' : ''}</span>
                  </span>
                  {!scope.allowed && scope.reason && <span className="text-xs text-red-400 mt-1 italic">{scope.reason}</span>}
                </div>

                {scope.isPending || submitted === scope.type ? (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm font-semibold">Sent</span>
                  </div>
                ) : scope.allowed ? (
                  <button 
                    onClick={() => handleRequestAccess(scope)}
                    disabled={!!submitting}
                    className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition-all disabled:opacity-50"
                  >
                    {submitting === scope.type ? '...' : 'Request'}
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 w-full mt-8">
          <button 
            onClick={() => navigate('/student/plans')}
            className="flex-1 px-6 py-3.5 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all flex items-center justify-center group"
          >
            View Plans
            <ChevronRight className="w-4 h-4 ml-1 opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </button>
          <button 
            onClick={() => document.dispatchEvent(new CustomEvent('open-assistant-with-intent', { detail: '/help' }))}
            className="p-3.5 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 text-slate-300 transition-all flex items-center justify-center"
            title="Contact Admin"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

