import React from 'react';
import { LucideIcon } from 'lucide-react-native';

export interface MobileWorkspaceConfig {
  id: string;
  title: string;
  icon: LucideIcon;
  component: React.FC<any>;
  order: number;
  requiresSessionLive?: boolean;
  requiresCapabilities?: string[];
}

class MobileWorkspaceRegistry {
  private workspaces: Map<string, MobileWorkspaceConfig> = new Map();

  register(config: MobileWorkspaceConfig) {
    this.workspaces.set(config.id, config);
  }

  getWorkspace(id: string): MobileWorkspaceConfig | undefined {
    return this.workspaces.get(id);
  }

  getAll(): MobileWorkspaceConfig[] {
    return Array.from(this.workspaces.values()).sort((a, b) => a.order - b.order);
  }

  getAvailableWorkspaces(capabilities: string[] = [], isLive: boolean = false): MobileWorkspaceConfig[] {
    return this.getAll().filter(ws => {
      if (ws.requiresSessionLive && !isLive) return false;
      if (ws.requiresCapabilities) {
        if (!ws.requiresCapabilities.some(cap => capabilities.includes(cap))) {
          return false;
        }
      }
      return true;
    });
  }
}

export const mobileWorkspaceRegistry = new MobileWorkspaceRegistry();
