import { IPluginResult } from '../types';
import { assistantSettings } from '../settings/assistantSettings';
import { synonymDictionary } from '../engine/synonymDictionary';

export class SearchIndex {
  
  /**
   * Re-ranks a set of plugin results based on dynamic weights from AssistantSettings.
   * Ensures the most relevant results surface first, regardless of which plugin returned them.
   */
  async rankResults(query: string, tenantId: string, results: IPluginResult[]): Promise<IPluginResult[]> {
    if (!results || results.length === 0) return [];

    const settings = await assistantSettings.getSettings(tenantId);
    const weights = settings.searchWeights;
    
    const normalizedQuery = query.toLowerCase().trim();
    const queryTokens = normalizedQuery.split(/\s+/);
    
    // Expand query with synonyms for matching
    const expandedTokens = new Set<string>(queryTokens);
    for (const token of queryTokens) {
      const syns = synonymDictionary.getSynonyms(token);
      syns.forEach(s => expandedTokens.add(s.toLowerCase()));
    }

    const rankedResults = results.map(result => {
      let score = result.score || 0; // Baseline score provided by plugin
      const titleLower = result.title.toLowerCase();
      const subtitleLower = result.subtitle?.toLowerCase() || '';
      const meta = result.metadata || {};

      // 1. Title Match
      if (titleLower === normalizedQuery) {
        score += weights.title; // Exact match
      } else {
        let titleMatches = 0;
        for (const token of expandedTokens) {
          if (titleLower.includes(token)) titleMatches++;
        }
        if (titleMatches > 0) {
          // Partial title match proportional to tokens matched
          score += (weights.title * 0.5) * (titleMatches / expandedTokens.size);
        }
      }

      // 2. Tags Match
      if (meta.tags && Array.isArray(meta.tags)) {
        for (const tag of meta.tags) {
          if (expandedTokens.has(tag.toLowerCase())) {
            score += weights.tag;
            break; // Max one tag bonus
          }
        }
      }

      // 3. Subject/Course Hierarchy Match (If metadata exposes it)
      if (meta.subject && expandedTokens.has(meta.subject.toLowerCase())) {
        score += weights.subject;
      }
      if (meta.course && expandedTokens.has(meta.course.toLowerCase())) {
        score += weights.course;
      }

      // 4. Popularity (If metadata exposes view counts or likes)
      if (meta.popularityScore && meta.popularityScore > 50) {
        score += weights.popularity;
      }

      // 5. Recency (If metadata exposes timestamps)
      if (meta.createdAt) {
        const ageDays = (Date.now() - new Date(meta.createdAt).getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < 7) {
          score += weights.recent; // Bonus for items less than a week old
        }
      }

      return { ...result, score };
    });

    // Sort descending by score
    return rankedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
  }
}

export const searchIndex = new SearchIndex();
