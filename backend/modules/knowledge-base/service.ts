import { KnowledgeBaseRepository } from './repository';
import { IIntent, IKnowledgeArticle, IKnowledgeCollection, IAssistantSettings, IAssistantQuickAction } from './types';
import { AppError } from '../../core/errors/AppError';

export class KnowledgeBaseService {
  private repo = new KnowledgeBaseRepository();

  async createIntent(data: Partial<IIntent>, adminId: string, tenantId: string) {
    if (!data.name || !data.keywords) {
      throw new AppError('Name and keywords are required', 400);
    }
    const now = new Date().toISOString();
    const intent: IIntent = {
      tenantId,
      name: data.name,
      keywords: data.keywords.map(k => k.toLowerCase().trim()),
      priority: data.priority || 0,
      createdBy: adminId,
      updatedBy: adminId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    };
    return await this.repo.createIntent(intent);
  }

  async listIntents(tenantId: string) {
    return await this.repo.listIntents(tenantId);
  }

  async updateIntent(id: string, updates: Partial<IIntent>, adminId: string) {
    if (updates.keywords) {
      updates.keywords = updates.keywords.map(k => k.toLowerCase().trim());
    }
    await this.repo.updateIntent(id, { ...updates, updatedBy: adminId });
  }

  async deleteIntent(id: string) {
    await this.repo.deleteIntent(id);
  }

  async createCollection(data: Partial<IKnowledgeCollection>, adminId: string, tenantId: string) {
    if (!data.name) throw new AppError('Collection name is required', 400);
    const now = new Date().toISOString();
    const collection: IKnowledgeCollection = {
      tenantId,
      name: data.name,
      description: data.description || '',
      isActive: data.isActive !== false,
      createdBy: adminId,
      updatedBy: adminId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    };
    return await this.repo.createCollection(collection);
  }

  async listCollections(tenantId: string) {
    return await this.repo.listCollections(tenantId);
  }

  async createArticle(data: Partial<IKnowledgeArticle>, adminId: string, tenantId: string) {
    if (!data.translations || !data.translations.en) {
      throw new AppError('At least English translation is required', 400);
    }
    if (!data.collectionId) {
      throw new AppError('Collection ID is required', 400);
    }
    const now = new Date().toISOString();
    const article: IKnowledgeArticle = {
      tenantId,
      collectionId: data.collectionId,
      keywords: data.keywords || [],
      synonyms: data.synonyms || [],
      tags: data.tags || [],
      aliases: data.aliases || [],
      category: data.category || 'General',
      translations: data.translations,
      visibility: data.visibility || 'all',
      targetCourseIds: data.targetCourseIds || [],
      targetSubjectIds: data.targetSubjectIds || [],
      targetTopicIds: data.targetTopicIds || [],
      relatedArticleIds: data.relatedArticleIds || [],
      relatedResourceIds: data.relatedResourceIds || [],
      relatedClassIds: data.relatedClassIds || [],
      status: data.status || 'draft',
      version: 1,
      priority: data.priority || 0,
      createdBy: adminId,
      updatedBy: adminId,
      createdAt: now,
      updatedAt: now,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null
    };
    
    if (article.status === 'published') {
      article.publishedAt = now;
      article.publishedBy = adminId;
    }
    
    return await this.repo.createArticle(article);
  }

  async listArticles(tenantId: string) {
    return await this.repo.listArticles(tenantId);
  }

  async updateArticle(id: string, updates: Partial<IKnowledgeArticle>, adminId: string) {
    if (updates.status === 'published' && !updates.publishedAt) {
      updates.publishedAt = new Date().toISOString();
      updates.publishedBy = adminId;
    }
    await this.repo.updateArticle(id, updates, adminId);
  }

  async deleteArticle(id: string) {
    await this.repo.deleteArticle(id);
  }

  // Settings
  async getSettings(tenantId: string) {
    let settings = await this.repo.getSettings(tenantId);
    if (!settings) {
      const now = new Date().toISOString();
      settings = {
        tenantId,
        memoryTTL: 900,
        enableSlashCommands: true,
        enableContext: true,
        enableSuggestions: true,
        defaultLanguage: 'en',
        fallbackIntent: 'help',
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
        isDeleted: false,
        deletedAt: null,
        deletedBy: null
      };
    }
    return settings;
  }

  async updateSettings(tenantId: string, settings: Partial<IAssistantSettings>, adminId: string) {
    await this.repo.upsertSettings(tenantId, { ...settings, updatedBy: adminId });
  }

  // Quick Actions
  async listQuickActions(tenantId: string) {
    return await this.repo.listQuickActions(tenantId);
  }

  async upsertQuickAction(tenantId: string, action: Partial<IAssistantQuickAction>, adminId: string) {
    await this.repo.upsertQuickAction({
      ...action,
      tenantId,
      updatedBy: adminId,
      createdBy: action.id ? undefined : adminId
    });
  }

  async deleteQuickAction(id: string) {
    await this.repo.deleteQuickAction(id);
  }
}
