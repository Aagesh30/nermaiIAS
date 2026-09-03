import React, { useState, useEffect } from 'react';
import { CourseApi } from '../../core/services';
import { CheckCircle2, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  classId: string;
}

export const AttendanceStatusBadge: React.FC<Props> = ({ classId }) => {
  const [statusData, setStatusData] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    let timerId: NodeJS.Timeout | null = null;

    const fetchStatus = async () => {
      try {
        const response = await (CourseApi as any).getAttendanceStatus?.(classId) || await fetch(`/api/v1/attendance/status/${classId}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }).then(res => res.json());
        if (mounted && response.data) {
          setStatusData(response.data);
          
          // Stop polling once attendance status has finalized to save network & DB read operations
          const st = response.data.status;
          const fnSt = response.data.finalResult?.status;
          const isTerminal = st === 'COMPLETED' || st === 'FINALIZED' || st === 'Present' || st === 'Absent' || st === 'Late' || fnSt === 'Present' || fnSt === 'Absent' || fnSt === 'Late';
          if (isTerminal && timerId) {
            clearInterval(timerId);
          }
        }
      } catch (err) {
        // Silent catch for polling
      }
    };

    fetchStatus();
    timerId = setInterval(fetchStatus, 30000); // poll every 30s until finalized
    return () => {
      mounted = false;
      if (timerId) clearInterval(timerId);
    };
  }, [classId]);

  if (!statusData) return null;

  const { status, percentage } = statusData;

  const getBadgeStyle = () => {
    const finalResultStatus = statusData.finalResult?.status;
    
    if (finalResultStatus === 'Present' || status === 'COMPLETED' || status === 'Present') {
      return { bg: 'bg-emerald-500/15', text: 'text-emerald-500', border: 'border-emerald-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Attendance Met' };
    }
    
    if (finalResultStatus === 'Absent' || status === 'Absent') {
      return { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/20', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Absent' };
    }

    if (finalResultStatus === 'Late' || status === 'Late') {
      return { bg: 'bg-amber-500/15', text: 'text-amber-500', border: 'border-amber-500/20', icon: <AlertCircle className="w-3.5 h-3.5" />, label: 'Late' };
    }

    if (status === 'FINALIZED') {
      // Fallback if no finalResult, but status is finalized
      return { bg: 'bg-gray-500/15', text: 'text-gray-500', border: 'border-gray-500/20', icon: <CheckCircle2 className="w-3.5 h-3.5" />, label: 'Finalized' };
    }

    if (status === 'PROCESSING') {
      return { bg: 'bg-blue-500/15', text: 'text-blue-500', border: 'border-blue-500/20', icon: <RefreshCw className="w-3.5 h-3.5 animate-spin" />, label: 'Processing...' };
    }
    
    // IN_PROGRESS or NOT_STARTED
    return { bg: 'bg-amber-500/15', text: 'text-amber-500', border: 'border-amber-500/20', icon: <Clock className="w-3.5 h-3.5" />, label: `Watching (${Math.round(percentage || 0)}%)` };
  };

  const style = getBadgeStyle();

  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border ${style.bg} ${style.text} ${style.border}`}>
      {style.icon}
      <span>{style.label}</span>
    </div>
  );
};

