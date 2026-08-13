export type ActionCapability = 'SEARCH' | 'LOOKUP' | 'NAVIGATION' | 'ACTION' | 'SUGGESTION';

export interface IPluginCapabilities {
  SEARCH?: string[];     // roles that can search
  LOOKUP?: string[];     // roles that can fetch by ID
  NAVIGATION?: string[]; // roles that can navigate
  ACTION?: string[];     // roles that can execute mutations
  SUGGESTION?: string[]; // roles that get smart suggestions
}

export interface IPluginHealth {
  status: 'ok' | 'degraded' | 'offline';
  latencyMs: number;
  cacheHits: number;
  errors: number;
  version: string;
}

export interface IConversationSession {
  sessionId: string;
  userId: string;
  tenantId: string;
  role: string;
  context: {
    navigation: { activeScreen?: string; activeTab?: string };
    academic: { courseId?: string; subjectId?: string; topicId?: string };
    conversation: { lastIntent?: string; lastResource?: string; lastQuery?: string };
    user: { batchIds: string[]; permissions: string[] };
  };
  createdAt: number;
  updatedAt: number;
}

export interface IPluginResult {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  score?: number;     // search ranking score
  metadata?: any;     // arbitrary plugin data
  actions?: any[];    // interactive UI actions
}

export interface IKnowledgePlugin {
  name: string;
  priority: number;
  supportedIntents: string[];
  dependencies: string[];
  capabilities: IPluginCapabilities;

  getHealth(): IPluginHealth;
  execute(action: string, payload: any, session: IConversationSession): Promise<IPluginResult[]>;
}
