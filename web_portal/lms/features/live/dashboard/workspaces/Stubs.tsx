import React from 'react';
import { liveWorkspaceRegistry } from '../registry/LiveWorkspaceRegistry';
import { FileText, CheckSquare, Bot, Activity, Users, TrendingUp } from 'lucide-react';
import { useLiveSessionContext } from '../../context/LiveSessionContext';

// Import newly implemented workspaces
import { AttendanceWorkspace } from './AttendanceWorkspace';
import { ParticipantsWorkspace } from './ParticipantsWorkspace';
import { TimelineWorkspace } from './TimelineWorkspace';
import { AIWorkspace } from './AIWorkspace';
import { AnalyticsWorkspace } from './AnalyticsWorkspace';

// Kept as frozen module since it's functionally complete for now.
export const ResourcesWorkspace: React.FC = () => {
  return (
    <div className="flex-1 p-6 flex items-center justify-center text-gray-500">
      <div className="text-center">
        <FileText size={48} className="mx-auto mb-4 opacity-50 text-purple-400" />
        <p>Resources module is frozen for Phase 4.</p>
        <p className="text-sm mt-2">Will be connected to backend when un-frozen.</p>
      </div>
    </div>
  );
};

// Re-export workspaces so existing imports don't break
export { AttendanceWorkspace, ParticipantsWorkspace, TimelineWorkspace, AIWorkspace, AnalyticsWorkspace };

// --- Registration ---
// We register these once. In a real app, this might happen in a bootstrapper.

liveWorkspaceRegistry.register({
  id: 'resources',
  title: 'Resources',
  icon: FileText,
  component: ResourcesWorkspace,
  order: 1,
});

liveWorkspaceRegistry.register({
  id: 'attendance',
  title: 'Attendance',
  icon: CheckSquare,
  component: AttendanceWorkspace,
  order: 2,
  requiresSessionLive: true,
  requiresCapabilities: ['canStartAttendance']
});

liveWorkspaceRegistry.register({
  id: 'participants',
  title: 'Participants',
  icon: Users,
  component: ParticipantsWorkspace,
  order: 3,
  requiresSessionLive: true,
  requiresCapabilities: ['canManageParticipants']
});

liveWorkspaceRegistry.register({
  id: 'ai',
  title: 'AI Assistant',
  icon: Bot,
  component: AIWorkspace,
  order: 4,
});

liveWorkspaceRegistry.register({
  id: 'activity',
  title: 'Timeline',
  icon: Activity,
  component: TimelineWorkspace,
  order: 5,
});

liveWorkspaceRegistry.register({
  id: 'analytics',
  title: 'Analytics',
  icon: TrendingUp,
  component: AnalyticsWorkspace,
  order: 6,
  requiresCapabilities: ['canViewReports'] // E.g., for admins/teachers
});
