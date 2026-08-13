import { logger } from '../../logger';
import { extractKeywords, computeMatchScore } from './keywordSearch.util';
import { redisClient } from '../../../infrastructure/redis';
import { db } from '../../../infrastructure/firebase';

export interface IFAQKnowledge {
  id?: string;
  question: string;
  answer: string;
  keywords: string[];
}

export class FAQMatcher {
  private redis = redisClient;

  async findMatch(queryKeywords: string[]): Promise<{ answer: string, confidence: number, sourceId: string } | null> {
    if (queryKeywords.length === 0) return null;

    // 1. Try Redis Hot Cache First (Top 100 FAQs)
    const cachedFaqsStr = await this.redis.get('chatbot:idx:faq');
    let faqs: IFAQKnowledge[] = [];
    
    if (cachedFaqsStr) {
      faqs = JSON.parse(cachedFaqsStr);
    } else {
      // 2. Fallback to Firestore if Redis miss
      const snapshot = await db.collection('faq_knowledge').get();
      faqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as IFAQKnowledge));
      
      // Async re-hydrate cache (fire and forget)
      this.redis.set('chatbot:idx:faq', JSON.stringify(faqs), 'EX', 3600).catch(logger.error);
    }

    // 3. Local scoring
    let bestMatch = null;
    let highestScore = 0;

    for (const faq of faqs) {
      const score = computeMatchScore(queryKeywords, faq.keywords);
      if (score > highestScore && score >= 0.4) { // Minimum 40% keyword overlap
        highestScore = score;
        bestMatch = faq;
      }
    }

    if (bestMatch) {
      return { answer: bestMatch.answer, confidence: highestScore, sourceId: bestMatch.id || 'unknown' };
    }

    return null;
  }
}
