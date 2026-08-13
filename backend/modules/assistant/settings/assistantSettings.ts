import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../../../core/logger';

export interface IAssistantSettings {
  intentThresholds: {
    minimumConfidence: number; // e.g. 50
    directMatchThreshold: number; // e.g. 90
  };
  searchWeights: {
    title: number;
    tag: number;
    subject: number;
    course: number;
    popularity: number;
    recent: number;
    synonym: number;
  };
  pluginPriorities: Record<string, number>; // e.g. { "ResourcePlugin": 100 }
  disabledPlugins: string[];
  cacheTTLMinutes: number;
  maxSuggestionLimits: number;
}

const DEFAULT_SETTINGS: IAssistantSettings = {
  intentThresholds: { minimumConfidence: 50, directMatchThreshold: 90 },
  searchWeights: {
    title: 40,
    tag: 20,
    subject: 15,
    course: 10,
    popularity: 5,
    recent: 5,
    synonym: 5
  },
  pluginPriorities: {
    'ResourcePlugin': 100,
    'LivePlugin': 90,
    'CoursePlugin': 80,
    'AnnouncementPlugin': 70,
    'EnterpriseKnowledgePlugin': 60
  },
  disabledPlugins: [],
  cacheTTLMinutes: 5,
  maxSuggestionLimits: 3
};

export class AssistantSettingsManager {
  private collectionName = 'assistant_settings';
  private cachedSettings: IAssistantSettings | null = null;
  private lastFetched = 0;

  async getSettings(tenantId: string): Promise<IAssistantSettings> {
    // Return cached settings if fetched within last 10 minutes
    if (this.cachedSettings && Date.now() - this.lastFetched < 10 * 60 * 1000) {
      return this.cachedSettings;
    }

    try {
      const db = getFirestore();
      const doc = await db.collection(this.collectionName).doc(tenantId).get();
      
      if (doc.exists) {
        this.cachedSettings = { ...DEFAULT_SETTINGS, ...doc.data() } as IAssistantSettings;
      } else {
        this.cachedSettings = DEFAULT_SETTINGS;
      }
      this.lastFetched = Date.now();
      return this.cachedSettings;
    } catch (error) {
      logger.error('[AssistantSettingsManager] Failed to fetch settings', error);
      return DEFAULT_SETTINGS;
    }
  }

  async updateSettings(tenantId: string, updates: Partial<IAssistantSettings>): Promise<void> {
    const db = getFirestore();
    await db.collection(this.collectionName).doc(tenantId).set(updates, { merge: true });
    this.cachedSettings = null; // Invalidate cache
  }
}

export const assistantSettings = new AssistantSettingsManager();
