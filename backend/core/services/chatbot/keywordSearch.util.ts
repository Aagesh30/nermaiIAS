const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'for', 'if', 'in', 'into', 'is', 'it',
  'no', 'not', 'of', 'on', 'or', 'such', 'that', 'the', 'their', 'then', 'there', 'these',
  'they', 'this', 'to', 'was', 'will', 'with', 'what', 'when', 'where', 'who', 'how', 'why',
  'can', 'could', 'should', 'would', 'do', 'does', 'did', 'have', 'has', 'had', 'am', 'i',
  'my', 'me', 'we', 'us', 'you', 'your', 'he', 'his', 'him', 'she', 'her', 'they', 'them'
]);

export const extractKeywords = (text: string): string[] => {
  if (!text) return [];
  // Lowercase and remove punctuation
  const normalized = text.toLowerCase().replace(/[^\w\s]/g, '');
  const words = normalized.split(/\s+/);
  
  // Filter out stop words and short words
  const keywords = words.filter(word => word.length > 2 && !STOP_WORDS.has(word));
  
  // Return unique keywords
  return [...new Set(keywords)];
};

export const computeMatchScore = (queryKeywords: string[], targetKeywords: string[]): number => {
  if (queryKeywords.length === 0 || targetKeywords.length === 0) return 0;
  let matches = 0;
  for (const q of queryKeywords) {
    if (targetKeywords.includes(q)) {
      matches++;
    }
  }
  return matches / queryKeywords.length;
};
