import { IConversationSession } from '../types';
import { toolRegistry } from '../registry/toolRegistry';
import { logger } from '../../../core/logger';

export interface ICommandResult {
  status: 'success' | 'failed' | 'unauthorized';
  message: string;
  data?: any;
}

export class CommandEngine {
  
  /**
   * Executes a specific command against a registered plugin.
   * Typical commands: "JOIN", "DOWNLOAD", "FAVORITE", "OPEN"
   */
  async executeCommand(
    intent: string, 
    action: string, 
    payload: any, 
    session: IConversationSession
  ): Promise<ICommandResult> {
    logger.info(`[CommandEngine] Executing ${action} via ${intent}`);
    
    // 1. Locate Plugins supporting the target intent
    const plugins = toolRegistry.getPluginsForIntent(intent);
    
    if (plugins.length === 0) {
      return { status: 'failed', message: `No plugin found handling intent: ${intent}` };
    }

    // 2. Select highest priority plugin with ACTION capability for this role
    let targetPlugin = null;
    for (const plugin of plugins) {
      if (plugin.capabilities.ACTION && plugin.capabilities.ACTION.includes(session.role)) {
        targetPlugin = plugin;
        break;
      }
    }

    if (!targetPlugin) {
      return { 
        status: 'unauthorized', 
        message: `You do not have permission to execute ${action} on ${intent}.` 
      };
    }

    // 3. Delegate execution
    try {
      const results = await targetPlugin.execute(action, payload, session);
      return {
        status: 'success',
        message: `Successfully executed ${action}`,
        data: results
      };
    } catch (error) {
      logger.error(`[CommandEngine] Plugin ${targetPlugin.name} failed to execute ${action}`, error);
      return {
        status: 'failed',
        message: `Failed to execute ${action}. Please try again later.`
      };
    }
  }
}

export const commandEngine = new CommandEngine();
