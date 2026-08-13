import React from 'react';
import {
  CheckSquare, Users, FileText, BookOpen, Megaphone,
  MessageSquare, Bot, BarChart2, Activity, ClipboardList
} from 'lucide-react';

export type WorkspaceId =
  | 'attendance'
  | 'participants'
  | 'resources'
  | 'assignments'
  | 'announcements'
  | 'notes'
  | 'ai'
  | 'polls'
  | 'questions'
  | 'whiteboard'
  | 'recording'
  | 'activity'
  | 'analytics';

export interface LiveWorkspacePlugin {
  id: WorkspaceId;
  title: string;
  icon: React.ElementType;
  /** If true, the workspace won't render until the academic session is LIVE */
  requiresSessionLive?: boolean;
  /** If true, the workspace won't render until Zoom is fully connected */
  requiresZoom?: boolean;
  /** Array of capabilities from LiveCapabilities that the user must possess */
  requiresCapabilities?: string[];
  /** Optional fallback component if requirements aren't met */
  fallbackComponent?: React.FC;
  component: React.FC;
  order: number;
}

const registry = new Map<WorkspaceId, LiveWorkspacePlugin>();

export const liveWorkspaceRegistry = {
  register(plugin: LiveWorkspacePlugin) {
    registry.set(plugin.id, plugin);
  },

  get(id: WorkspaceId): LiveWorkspacePlugin | undefined {
    return registry.get(id);
  },

  getAllForContext(context: { academicState: string, zoomState: string, capabilities: any }): LiveWorkspacePlugin[] {
    const plugins = Array.from(registry.values());
    return plugins
      .filter((p) => {
        if (p.requiresSessionLive && context.academicState !== 'LIVE') return false;
        if (p.requiresZoom && context.zoomState !== 'CONNECTED') return false;
        if (p.requiresCapabilities) {
          const hasAll = p.requiresCapabilities.every(cap => context.capabilities?.[cap] === true);
          if (!hasAll) return false;
        }
        return true;
      })
      .sort((a, b) => a.order - b.order);
  },
};
