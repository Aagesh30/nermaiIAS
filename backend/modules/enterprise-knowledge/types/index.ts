export type KnowledgeScope = 'SYSTEM' | 'GLOBAL' | 'TENANT' | 'COURSE' | 'BATCH';
export type KnowledgeType = 
  | 'faq' 
  | 'policy' 
  | 'guide' 
  | 'notice' 
  | 'procedure' 
  | 'template' 
  | 'admission' 
  | 'holiday' 
  | 'contact' 
  | 'timetable' 
  | 'circular' 
  | 'release_notes' 
  | 'troubleshooting' 
  | 'video_guide' 
  | 'external_link';

export interface IEnterpriseKnowledgeDocument {
  id?: string;
  tenantId: string;
  scope: KnowledgeScope;
  scopeId?: string; // Target Course ID or Batch ID if scope is COURSE or BATCH
  
  type: KnowledgeType;
  title: string;
  content: string; // Markdown supported
  
  // Search Optimization
  tags: string[];
  aliases: string[];
  
  // Permissions & State
  status: 'draft' | 'published' | 'archived';
  visibilityRoles: string[]; // e.g. ['student', 'teacher', 'admin']
  
  // Analytics
  popularityScore: number;
  
  createdBy: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}
