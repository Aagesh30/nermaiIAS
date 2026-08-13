import React, { useState } from 'react';
import {
  CheckSquare, Users, FileText, Megaphone, BarChart2,
  BookOpen, Activity, Bot, ClipboardList, MessageSquare
} from 'lucide-react';
import { useLiveSessionContext } from '../context/LiveSessionContext';

type TabId =
  | 'attendance'
  | 'participants'
  | 'resources'
  | 'assignments'
  | 'announcements'
  | 'notes'
  | 'ai_assistant'
  | 'polls'
  | 'questions'
  | 'whiteboard'
  | 'recording'
  | 'activity'
  | 'reports';

interface TabDef {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  /** Roles that can see this tab — undefined means all roles */
  roles?: string[];
}

const TABS: TabDef[] = [
  { id: 'attendance',    label: 'Attendance',    icon: <CheckSquare size={14} />,   roles: ['teacher', 'staff', 'admin', 'super_admin'] },
  { id: 'participants',  label: 'Participants',   icon: <Users size={14} /> },
  { id: 'resources',    label: 'Resources',      icon: <FileText size={14} /> },
  { id: 'assignments',  label: 'Assignments',    icon: <BookOpen size={14} /> },
  { id: 'announcements',label: 'Announcements',  icon: <Megaphone size={14} />,     roles: ['teacher', 'staff', 'admin', 'super_admin'] },
  { id: 'notes',        label: 'Teacher Notes',  icon: <MessageSquare size={14} />, roles: ['teacher', 'admin', 'super_admin'] },
  { id: 'ai_assistant', label: 'AI Assistant',   icon: <Bot size={14} /> },
  { id: 'polls',        label: 'Polls',          icon: <BarChart2 size={14} />,     roles: ['teacher', 'staff', 'admin', 'super_admin'] },
  { id: 'questions',    label: 'Questions',      icon: <MessageSquare size={14} /> },
  { id: 'whiteboard',   label: 'Whiteboard',     icon: <FileText size={14} /> },
  { id: 'recording',    label: 'Recording',      icon: <CheckSquare size={14} />,   roles: ['teacher', 'admin', 'super_admin'] },
  { id: 'activity',     label: 'Activity Feed',  icon: <Activity size={14} /> },
  { id: 'reports',      label: 'Reports',        icon: <ClipboardList size={14} />, roles: ['admin', 'super_admin'] },
];

// ── Placeholder panel ─────────────────────────────────────────────────────────

const PlaceholderPanel: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="flex flex-col items-center justify-center h-full text-gray-600 gap-2">
    <span className="opacity-40 scale-150">{icon}</span>
    <p className="text-xs text-center mt-2">{label} panel</p>
  </div>
);

// ── Sidebar ───────────────────────────────────────────────────────────────────

export const LiveSidebar: React.FC = () => {
  const { role } = useLiveSessionContext();
  const [activeTab, setActiveTab] = useState<TabId>('participants');

  const visibleTabs = TABS.filter(t => !t.roles || t.roles.includes(role));

  // If the current active tab became invisible due to role, fall back to participants
  const currentTab = visibleTabs.find(t => t.id === activeTab) ?? visibleTabs[0];

  return (
    <aside className="w-80 bg-gray-950 border-l border-gray-800 flex flex-col h-full text-white shrink-0">

      {/* Tab strip */}
      <div className="flex flex-wrap border-b border-gray-800 overflow-x-auto">
        {visibleTabs.map(tab => (
          <button
            key={tab.id}
            title={tab.label}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex items-center gap-1 px-3 py-2.5 text-xs font-medium whitespace-nowrap',
              'border-b-2 transition-colors shrink-0',
              currentTab?.id === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-300',
            ].join(' ')}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Active panel */}
      <div className="flex-1 overflow-y-auto p-3">
        {currentTab?.id === 'attendance'    && <PlaceholderPanel icon={<CheckSquare size={28} />}  label="Attendance" />}
        {currentTab?.id === 'participants'  && <PlaceholderPanel icon={<Users size={28} />}         label="Participants" />}
        {currentTab?.id === 'resources'     && <PlaceholderPanel icon={<FileText size={28} />}      label="Resources" />}
        {currentTab?.id === 'assignments'   && <PlaceholderPanel icon={<BookOpen size={28} />}      label="Assignments" />}
        {currentTab?.id === 'announcements' && <PlaceholderPanel icon={<Megaphone size={28} />}     label="Announcements" />}
        {currentTab?.id === 'notes'         && <PlaceholderPanel icon={<MessageSquare size={28} />} label="Teacher Notes" />}
        {currentTab?.id === 'ai_assistant'  && <PlaceholderPanel icon={<Bot size={28} />}           label="AI Assistant" />}
        {currentTab?.id === 'polls'         && <PlaceholderPanel icon={<BarChart2 size={28} />}     label="Polls" />}
        {currentTab?.id === 'questions'     && <PlaceholderPanel icon={<MessageSquare size={28} />} label="Questions" />}
        {currentTab?.id === 'whiteboard'    && <PlaceholderPanel icon={<FileText size={28} />}      label="Whiteboard Files" />}
        {currentTab?.id === 'recording'     && <PlaceholderPanel icon={<CheckSquare size={28} />}   label="Recording" />}
        {currentTab?.id === 'activity'      && <PlaceholderPanel icon={<Activity size={28} />}      label="Activity Feed" />}
        {currentTab?.id === 'reports'       && <PlaceholderPanel icon={<ClipboardList size={28} />} label="Session Reports" />}
      </div>
    </aside>
  );
};
