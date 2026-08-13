import { IKnowledgePlugin, IPluginCapabilities, IPluginHealth, IConversationSession, IPluginResult } from '../types';
import { ResourceService } from '../../resources/service';

export class ResourcePlugin implements IKnowledgePlugin {
  name = 'ResourcePlugin';
  priority = 100; // High priority for notes/pdfs
  supportedIntents = ['RESOURCE_SEARCH'];
  dependencies = ['CoursePlugin']; // Needs course context sometimes
  capabilities: IPluginCapabilities = {
    SEARCH: ['student', 'teacher', 'admin'],
    LOOKUP: ['student', 'teacher', 'admin'],
    NAVIGATION: ['student', 'teacher', 'admin'],
    ACTION: ['student', 'teacher', 'admin'] // e.g. DOWNLOAD, FAVORITE
  };

  private resourceService = new ResourceService();

  getHealth(): IPluginHealth {
    return { status: 'ok', latencyMs: 25, cacheHits: 50, errors: 0, version: '1.0.0' };
  }

  async execute(action: string, payload: any, session: IConversationSession): Promise<IPluginResult[]> {
    if (action === 'SEARCH') {
      const resources = await this.resourceService.listResources({ tenantId: session.tenantId });
      
      return resources.map(r => ({
        id: r.id!,
        type: 'resource_card',
        title: r.title,
        subtitle: r.description,
        score: 50,
        actions: [
          { type: 'OPEN_RESOURCE', label: 'View Document' },
          { type: 'DOWNLOAD', label: 'Download' }
        ]
      }));
    }
    
    throw new Error(`Action ${action} not supported by ${this.name}`);
  }
}
