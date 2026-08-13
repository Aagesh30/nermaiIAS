import { BaseAuditFields } from '../../core/types';

export interface IIntent extends BaseAuditFields {
  id?: string;
  tenantId: string;
  name: string; // e.g. "Password Reset"
  keywords: string[]; // e.g. ["password", "login", "reset", "account"]
  priority: number; // Higher number = higher priority
}

export type KnowledgeStatus = 'draft' | 'review' | 'published' | 'archived';

export interface IKnowledgeTranslation {
  title: string;
  content: string; // Markdown
}

export interface IKnowledgeArticle extends BaseAuditFields {
  id?: string;
  tenantId: string;
  collectionId: string; // Ref to IKnowledgeCollection
  
  // Deterministic Search Metadata
  keywords: string[];
  synonyms: string[];
  tags: string[];
  aliases: string[];
  category: string;
  
  // Localization
  translations: {
    en?: IKnowledgeTranslation;
    ta?: IKnowledgeTranslation;
    [key: string]: IKnowledgeTranslation | undefined;
  };
  
  // Context & Targeting
  visibility: 'all' | 'batch' | 'course' | 'topic';
  targetCourseIds?: string[];
  targetSubjectIds?: string[];
  targetTopicIds?: string[];
  
  // Dependency Graph (Visual Relationship Manager)
  relatedArticleIds: string[];
  relatedResourceIds: string[];
  relatedClassIds: string[];
  
  // CMS & Versioning
  status: KnowledgeStatus;
  version: number;
  priority: number; // Higher = top rank
  publishedAt?: string;
  publishedBy?: string;
}

export interface IKnowledgeCollection extends BaseAuditFields {
  id?: string;
  tenantId: string;
  name: string; // e.g. "LMS Help", "Academy Rules"
  description?: string;
  isActive: boolean;
}

export interface IContentPack {
  version: number;
  timestamp: string;
  articles: IKnowledgeArticle[];
  intents: IIntent[];
  quickActions: IAssistantQuickAction[];
}

export interface IAssistantSettings extends BaseAuditFields {
  tenantId: string;
  memoryTTL: number; // e.g., 900
  enableSlashCommands: boolean;
  enableContext: boolean;
  enableSuggestions: boolean;
  defaultLanguage: string;
  fallbackIntent: string;
}

export interface IAssistantQuickAction extends BaseAuditFields {
  id?: string;
  tenantId: string;
  label: string;
  intent: string; // e.g., "resources", "attendance", or a slash command "/notes"
  icon?: string;
  order: number;
  isActive: boolean;
}
