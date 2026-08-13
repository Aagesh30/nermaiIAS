import { IntentClassifier } from './intentClassifier';
import { FAQMatcher } from './faqMatcher';
import { EmbeddingRetriever } from './embeddingRetriever';
import { ContextBuilder } from './contextBuilder';
import { FallbackEngine } from './fallbackEngine';
import { extractKeywords } from './keywordSearch.util';

export class ResponseGenerator {
  private intentClassifier = new IntentClassifier();
  private faqMatcher = new FAQMatcher();
  private embeddingRetriever = new EmbeddingRetriever();
  private contextBuilder = new ContextBuilder();
  private fallbackEngine = new FallbackEngine();

  async generateResponse(query: string, studentId: string): Promise<{ response: string, intent: string, confidence: number, matchedSource: string }> {
    const intent = this.intentClassifier.classify(query);
    const keywords = extractKeywords(query);

    // Layer 1: FAQ Exact/Near Match (Fastest)
    const faqMatch = await this.faqMatcher.findMatch(keywords);
    if (faqMatch && faqMatch.confidence >= 0.5) {
      return {
        response: faqMatch.answer,
        intent,
        confidence: faqMatch.confidence,
        matchedSource: `faq:${faqMatch.sourceId}`
      };
    }

    // Layer 2: Embedding Retrieval (Courses, Subjects, Resources chunks)
    const chunks = await this.embeddingRetriever.retrieveContext(keywords);
    if (chunks.length > 0) {
      const topChunk = chunks[0];
      const contextResponse = this.contextBuilder.buildContext(chunks);
      return {
        response: contextResponse,
        intent,
        confidence: topChunk.confidence,
        matchedSource: `embedding:${topChunk.sourceId}`
      };
    }

    // Layer 3 (Placeholder for student-specific dynamic retrieval if needed)
    // Could check watch history or attendance here...

    // Layer 4: Fallback Response Engine
    const fallbackResponse = this.fallbackEngine.getFallbackResponse();
    return {
      response: fallbackResponse,
      intent,
      confidence: 0,
      matchedSource: 'fallback'
    };
  }
}
