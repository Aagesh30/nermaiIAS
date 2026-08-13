import { logger } from '../../logger';
import { extractKeywords, computeMatchScore } from './keywordSearch.util';
import { redisClient } from '../../../infrastructure/redis';
import { db } from '../../../infrastructure/firebase';

export interface IChatbotEmbedding {
  id?: string;
  sourceType: string;
  sourceId: string;
  chunkText: string;
  keywords: string[];
}

export class EmbeddingRetriever {
  private redis = redisClient;

  async retrieveContext(queryKeywords: string[]): Promise<{ text: string, confidence: number, sourceId: string }[]> {
    if (queryKeywords.length === 0) return [];

    const cachedEmbeddingsStr = await this.redis.get('chatbot:idx:embeddings');
    let embeddings: IChatbotEmbedding[] = [];

    if (cachedEmbeddingsStr) {
      embeddings = JSON.parse(cachedEmbeddingsStr);
    } else {
      const snapshot = await db.collection('chatbot_embeddings').get();
      embeddings = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as IChatbotEmbedding));
      
      // Async re-hydrate cache
      this.redis.set('chatbot:idx:embeddings', JSON.stringify(embeddings), 'EX', 3600).catch(logger.error);
    }

    const results = [];
    for (const emb of embeddings) {
      const score = computeMatchScore(queryKeywords, emb.keywords);
      if (score >= 0.3) {
        results.push({ text: emb.chunkText, confidence: score, sourceId: emb.id || 'unknown' });
      }
    }

    // Sort by highest confidence and return top 3 chunks
    return results.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
}
