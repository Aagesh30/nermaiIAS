export class SynonymDictionary {
  private dictionary: Record<string, string[]> = {
    'resource': ['resource', 'resources', 'note', 'notes', 'pdf', 'material', 'materials', 'study material', 'document', 'handout', 'lecture note'],
    'live': ['live', 'class', 'meeting', 'session', 'google meet', 'zoom', 'today\'s class', 'ongoing', 'broadcast'],
    'course': ['course', 'courses', 'program', 'curriculum', 'subject'],
    'faq': ['faq', 'help', 'question', 'issue', 'problem', 'how to', 'explain', 'what is', 'guide'],
    'announcement': ['announcement', 'notice', 'update', 'news', 'circular'],
    'assignment': ['assignment', 'homework', 'task', 'test', 'exam', 'quiz'],
  };

  /**
   * Returns a list of all synonyms for a given base word.
   * If the word is not in the dictionary, returns an array containing just the word itself.
   */
  getSynonyms(word: string): string[] {
    const normalized = word.toLowerCase();
    
    // Reverse lookup: if the input is a synonym, return all siblings including the base word
    for (const [base, synonyms] of Object.entries(this.dictionary)) {
      if (synonyms.includes(normalized) || base === normalized) {
        // Return a deduplicated array of all synonyms + base
        return Array.from(new Set([base, ...synonyms]));
      }
    }

    return [normalized];
  }

  /**
   * Translates a user query into a canonical intent string by replacing synonyms with base intents.
   * e.g. "show me my lecture notes" -> contains synonym "lecture note" -> maps to "RESOURCE"
   */
  findBaseIntent(query: string): string | null {
    const normalized = query.toLowerCase();
    for (const [base, synonyms] of Object.entries(this.dictionary)) {
      if (synonyms.some(s => normalized.includes(s))) {
        return base.toUpperCase();
      }
    }
    return null;
  }
}

export const synonymDictionary = new SynonymDictionary();
