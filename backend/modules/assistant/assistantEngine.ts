import { IStudentContext } from './contextService';
import { LLMFactory } from './llm/LLMFactory';
import { AssistantContext } from './llm/ILLMProvider';
import { logger } from '../../core/logger';

export class AssistantEngine {
  /**
   * DeterministicEngine: Current active engine mapping queries to exact records.
   * Runs first for precision, bandwidth efficiency, and data privacy.
   * Returns null if the query couldn't be answered deterministically.
   */
  async deterministicFallback(query: string, context: IStudentContext | null): Promise<string | null> {
    logger.info(`[AssistantEngine] Deterministic fallback for query: "${query}"`);
    return null; // Signals controller that it couldn't be answered deterministically beyond basic FAQs
  }

  /**
   * LLMEngine — Tier 9 (Optional, behind feature flag).
   *
   * Called ONLY when:
   *   1. ENABLE_LLM_FALLBACK=true in env
   *   2. Tenant settings allow LLM (checked by controller before calling)
   *   3. Rate limit has NOT been exceeded (checked by controller before calling)
   *   4. The query has ALREADY been logged to unanswered_queries (Tier 8)
   *
   * The logging at Tier 8 is done BEFORE this call so unanswered questions
   * are captured even if this call fails or times out.
   */
  async llmFallback(
    query: string,
    context: IStudentContext | null,
    assistantContext?: AssistantContext
  ): Promise<string | null> {
    const provider = LLMFactory.getProvider();

    if (!provider) {
      logger.info('[AssistantEngine] LLM provider is null — ENABLE_LLM_FALLBACK=false or not configured.');
      return null;
    }

    const maxTokens = parseInt(process.env.LLM_MAX_TOKENS || '500', 10);
    const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '5000', 10);

    const ctx: AssistantContext = assistantContext || {
      tenantId: context ? 'unknown' : 'unknown',
      userId: 'unknown',
      role: 'student',
      language: 'en',
    };

    try {
      logger.info(`[AssistantEngine] Calling LLM provider "${provider.name}" for query: "${query}"`);
      const result = await provider.generateResponse(query, ctx, maxTokens, timeoutMs);
      logger.info(`[AssistantEngine] LLM responded in ${result.latencyMs}ms (${result.tokensUsed || 0} tokens)`);
      return result.text;
    } catch (error: any) {
      logger.error(`[AssistantEngine] LLM provider "${provider.name}" failed: ${error.message}`);
      return null;
    }
  }
}
