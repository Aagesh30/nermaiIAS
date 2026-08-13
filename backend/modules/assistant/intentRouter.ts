import { KnowledgeBaseRepository } from '../knowledge-base/repository';

export interface IIntentMatch {
  intentId: string;
  name: string;
  confidence: number;
}

export class IntentRouter {
  private kbRepo = new KnowledgeBaseRepository();

  /**
   * Deterministically match a user string query against the dynamic Intent Dictionary.
   * Ranking Order: Exact Match (100) > Synonym/Strong Keyword (80-99) > Keyword (60-79) > Priority Tie-breaker
   */
  async routeQuery(query: string, tenantId: string): Promise<IIntentMatch[]> {
    const intents = await this.kbRepo.listIntents(tenantId);
    
    if (intents.length === 0) return [];

    const normalizedQuery = query.toLowerCase().trim();
    const matches: IIntentMatch[] = [];

    for (const intent of intents) {
      let score = 0;
      
      // 1. Exact Name Match
      if (intent.name.toLowerCase() === normalizedQuery) {
        score = 100;
      } else {
        // 2. Keyword matching
        let matchCount = 0;
        let exactKeywordMatch = false;

        for (const keyword of intent.keywords) {
          if (normalizedQuery === keyword) {
            exactKeywordMatch = true;
          } else if (normalizedQuery.includes(keyword)) {
            matchCount += 1;
          }
        }

        if (exactKeywordMatch) {
          score = 90; // Synonym/Exact Keyword
        } else if (matchCount > 0) {
          // Base score 60 + up to 20 points based on match ratio
          const ratio = matchCount / intent.keywords.length;
          score = 60 + Math.floor(ratio * 20);
        }
      }

      if (score > 0) {
        // Add priority fraction as a tie-breaker (e.g. priority 5 -> +0.05)
        score += (intent.priority * 0.01);
        
        matches.push({
          intentId: intent.id!,
          name: intent.name,
          confidence: score
        });
      }
    }

    // Sort descending by confidence
    return matches.sort((a, b) => b.confidence - a.confidence);
  }
}
