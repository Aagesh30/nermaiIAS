import { getFirestore } from 'firebase-admin/firestore';
import { logger } from '../../../core/logger';

export interface IEnterpriseKnowledgeDoc {
  id?: string;
  tenantId: string;
  scope: 'SYSTEM' | 'GLOBAL' | 'TENANT' | 'COURSE' | 'BATCH';
  scopeId?: string;
  title: string;
  content: string;
  type: string;
  tags: string[];
  createdAt: string;
}

export class KnowledgeRepository {
  private collectionName = 'enterprise_knowledge';
  private cache: Map<string, { data: IEnterpriseKnowledgeDoc[], timestamp: number }> = new Map();
  private CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Retrieves knowledge scoped to the user's specific context.
   */
  async getScopedKnowledge(
    tenantId: string, 
    courseIds: string[], 
    batchIds: string[]
  ): Promise<IEnterpriseKnowledgeDoc[]> {
    const cacheKey = `${tenantId}_${courseIds.join(',')}_${batchIds.join(',')}`;
    
    // Check Cache
    const cached = this.cache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < this.CACHE_TTL_MS)) {
      return cached.data;
    }

    try {
      const db = getFirestore();
      
      // Fetch Global & Tenant Knowledge
      const globalQuery = db.collection(this.collectionName)
        .where('scope', 'in', ['SYSTEM', 'GLOBAL']);
        
      const tenantQuery = db.collection(this.collectionName)
        .where('tenantId', '==', tenantId)
        .where('scope', '==', 'TENANT');
        
      const queries = [globalQuery.get(), tenantQuery.get()];

      // Add Course specific queries if any
      if (courseIds.length > 0) {
        // Firestore 'in' limit is 10, split if necessary (omitted for brevity here)
        queries.push(
          db.collection(this.collectionName)
            .where('tenantId', '==', tenantId)
            .where('scope', '==', 'COURSE')
            .where('scopeId', 'in', courseIds.slice(0, 10))
            .get()
        );
      }

      // Add Batch specific queries if any
      if (batchIds.length > 0) {
        queries.push(
          db.collection(this.collectionName)
            .where('tenantId', '==', tenantId)
            .where('scope', '==', 'BATCH')
            .where('scopeId', 'in', batchIds.slice(0, 10))
            .get()
        );
      }

      const snapshots = await Promise.all(queries);
      
      const results: IEnterpriseKnowledgeDoc[] = [];
      snapshots.forEach(snap => {
        snap.docs.forEach(doc => {
          results.push({ id: doc.id, ...doc.data() } as IEnterpriseKnowledgeDoc);
        });
      });

      // Update Cache
      this.cache.set(cacheKey, { data: results, timestamp: Date.now() });

      return results;

    } catch (error) {
      logger.error('[KnowledgeRepository] Failed to fetch scoped knowledge', error);
      return [];
    }
  }

  /**
   * Manually invalidate cache when CMS content updates
   */
  invalidateCache(tenantId: string) {
    // In a real versioned system, this would bump the index version.
    // For now, we clear keys matching tenantId.
    for (const key of this.cache.keys()) {
      if (key.startsWith(tenantId) || key.startsWith('SYSTEM')) {
        this.cache.delete(key);
      }
    }
  }
}
