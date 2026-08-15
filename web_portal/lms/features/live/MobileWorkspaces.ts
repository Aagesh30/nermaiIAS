import { mobileWorkspaceRegistry } from './MobileWorkspaceRegistry';
import { ParticipantList } from './ParticipantList';
import { TimelineList } from './TimelineList';
import { AttendanceCard } from './AttendanceCard';
import { AnalyticsCard } from './AnalyticsCard';
import { Users, Clock, Activity, BarChart2 } from 'lucide-react-native';

export const registerMobileWorkspaces = () => {
  // Prevent duplicate registration in dev mode hot reloads
  if (mobileWorkspaceRegistry.getAll().length > 0) return;

  mobileWorkspaceRegistry.register({
    id: 'attendance',
    title: 'Attendance',
    icon: Clock,
    component: AttendanceCard,
    order: 1,
    requiresCapabilities: ['canStartAttendance']
  });

  mobileWorkspaceRegistry.register({
    id: 'participants',
    title: 'Participants',
    icon: Users,
    component: ParticipantList,
    order: 2,
  });

  mobileWorkspaceRegistry.register({
    id: 'timeline',
    title: 'Timeline',
    icon: Activity,
    component: TimelineList,
    order: 3,
  });

  mobileWorkspaceRegistry.register({
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart2,
    component: AnalyticsCard,
    order: 4,
    requiresCapabilities: ['canViewReports']
  });
};
