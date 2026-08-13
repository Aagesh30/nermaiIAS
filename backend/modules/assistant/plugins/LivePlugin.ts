import { IKnowledgePlugin, IPluginCapabilities, IPluginHealth, IConversationSession, IPluginResult } from '../types';

export class LivePlugin implements IKnowledgePlugin {
  name = 'LivePlugin';
  priority = 90;
  supportedIntents = ['LIVE_SESSION'];
  dependencies = ['CoursePlugin'];
  capabilities: IPluginCapabilities = {
    SEARCH: ['student', 'teacher', 'admin'],
    LOOKUP: ['student', 'teacher', 'admin'],
    NAVIGATION: ['student', 'teacher', 'admin'],
    ACTION: ['student', 'teacher'] // JOIN
  };

  getHealth(): IPluginHealth {
    return { status: 'ok', latencyMs: 20, cacheHits: 10, errors: 0, version: '1.0.0' };
  }

  async execute(action: string, payload: any, session: IConversationSession): Promise<IPluginResult[]> {
    if (action === 'SEARCH') {
      return [
        {
          id: 'live_demo_1',
          type: 'live_card',
          title: 'Upcoming History Class',
          subtitle: 'Starts in 30 mins',
          score: 60,
          actions: [{ type: 'JOIN_LIVE', label: 'Join Class' }]
        }
      ];
    }
    
    throw new Error(`Action ${action} not supported by ${this.name}`);
  }
}
