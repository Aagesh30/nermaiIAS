import { IKnowledgePlugin, IPluginCapabilities, IPluginHealth, IConversationSession, IPluginResult } from '../types';
import { KnowledgeRepository } from '../repositories/knowledgeRepository';

export class FAQPlugin implements IKnowledgePlugin {
  name = 'FAQPlugin';
  priority = 10;
  supportedIntents = ['FAQ'];
  dependencies = [];
  capabilities: IPluginCapabilities = {
    SEARCH: ['student', 'teacher', 'admin'],
    LOOKUP: ['student', 'teacher', 'admin'],
    NAVIGATION: [],
    ACTION: []
  };

  private repo = new KnowledgeRepository();

  getHealth(): IPluginHealth {
    return { status: 'ok', latencyMs: 5, cacheHits: 100, errors: 0, version: '1.0.0' };
  }

  async execute(action: string, payload: any, session: IConversationSession): Promise<IPluginResult[]> {
    if (action === 'SEARCH') {
      const results = await this.repo.getScopedKnowledge(
        session.tenantId, 
        session.context.user.batchIds, 
        session.context.user.batchIds // fallback course mock for now
      );
      
      return results.map(r => ({
        id: r.id || Date.now().toString(),
        type: 'faq_card',
        title: r.title,
        subtitle: r.content,
        score: 40,
        actions: []
      }));
    }
    
    throw new Error(`Action ${action} not supported by ${this.name}`);
  }
}
