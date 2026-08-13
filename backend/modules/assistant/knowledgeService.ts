import { KnowledgeBaseRepository } from '../knowledge-base/repository';
import { IStudentContext } from './contextService';
import { IKnowledgeArticle } from '../knowledge-base/types';
import { KnowledgeRepository } from './repositories/knowledgeRepository';

export class KnowledgeService {
  private kbRepo = new KnowledgeBaseRepository();
  private v2KnowledgeRepo = new KnowledgeRepository(); // Phase 1: Bridge to new CMS

  /**
   * Universal Deterministic Knowledge Search Engine (10-Tier Ranking)
   * Pipeline: Exact -> Alias -> Synonym -> Tag -> Keyword -> Category -> Priority -> Latest
   */
  async searchKnowledgePlatform(query: string, tenantId: string, context: IStudentContext | null) {
    const allArticles = await this.kbRepo.listArticles(tenantId);
    
    // Only search published articles
    const publishedArticles = allArticles.filter(a => a.status === 'published');
    const normalizedQuery = query.toLowerCase().trim();
    
    type ScoredArticle = { article: IKnowledgeArticle; score: number };
    const scored: ScoredArticle[] = [];

    for (const article of publishedArticles) {
      // 0. Context Filtering
      // If we have an active course, and the article targets specific courses, it must match.
      if (context && context.activeCourseId && article.targetCourseIds && article.targetCourseIds.length > 0) {
        if (!article.targetCourseIds.includes(context.activeCourseId)) {
          continue; // Skip out-of-context articles
        }
      }

      let score = 0;
      
      const enTitle = article.translations?.en?.title.toLowerCase() || '';
      const taTitle = article.translations?.ta?.title.toLowerCase() || '';
      
      // 1. Exact Match (Score 100)
      if (enTitle === normalizedQuery || taTitle === normalizedQuery) {
        score = Math.max(score, 100);
      }
      
      // 2. Alias Match (Score 90)
      if (article.aliases && article.aliases.some(a => a.toLowerCase() === normalizedQuery)) {
        score = Math.max(score, 90);
      }
      
      // 3. Synonym Match (Score 80)
      if (article.synonyms && article.synonyms.some(s => normalizedQuery.includes(s.toLowerCase()))) {
        score = Math.max(score, 80);
      }

      // 4. Tag Match (Score 70)
      if (article.tags && article.tags.some(t => normalizedQuery.includes(t.toLowerCase()))) {
        score = Math.max(score, 70);
      }

      // 5. Keyword Match (Score 60)
      if (article.keywords && article.keywords.some(k => normalizedQuery.includes(k.toLowerCase()))) {
        score = Math.max(score, 60);
      }

      // Partial Title Match (Score 55)
      if (enTitle.includes(normalizedQuery) || taTitle.includes(normalizedQuery)) {
        score = Math.max(score, 55);
      }

      // 6. Category Match (Score 50)
      if (article.category && article.category.toLowerCase().includes(normalizedQuery)) {
        score = Math.max(score, 50);
      }

      if (score > 0) {
        // 7 & 8. Add Priority Score as a tie-breaker (Max +10)
        score += Math.min(article.priority || 0, 10);
        
        scored.push({ article, score });
      }
    }

    // 9. Latest Updated Sorting (Sort by score DESC, then by Date DESC)
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const dateA = new Date(a.article.updatedAt).getTime();
      const dateB = new Date(b.article.updatedAt).getTime();
      return dateB - dateA; // Latest first
    });

    return scored;
  }

  async searchResources(query: string, tenantId: string, context: IStudentContext | null) {
    if (context && context.activeCourseId) {
      return [
        { id: 'res_1', title: 'Chapter 1 Notes', type: 'pdf', link: '/viewer/res_1' }
      ];
    }
    return [];
  }

  /**
   * Sync API: Generates a Knowledge Content Pack for mobile SQLite DBs
   */
  async getContentPack(tenantId: string, sinceTimestamp: string = '1970-01-01T00:00:00.000Z') {
    const [allArticles, allIntents, allQuickActions] = await Promise.all([
      this.kbRepo.listArticles(tenantId),
      this.kbRepo.listIntents(tenantId),
      this.kbRepo.listQuickActions(tenantId)
    ]);

    const sinceDate = new Date(sinceTimestamp).getTime();

    // Filter items updated since the timestamp
    const updatedArticles = allArticles.filter(a => new Date(a.updatedAt).getTime() >= sinceDate && a.status === 'published');
    const updatedIntents = allIntents.filter(i => new Date(i.updatedAt).getTime() >= sinceDate);
    const updatedQuickActions = allQuickActions.filter(q => new Date(q.updatedAt).getTime() >= sinceDate);

    return {
      version: Date.now(),
      timestamp: new Date().toISOString(),
      articles: updatedArticles,
      intents: updatedIntents,
      quickActions: updatedQuickActions
    };
  }
}
