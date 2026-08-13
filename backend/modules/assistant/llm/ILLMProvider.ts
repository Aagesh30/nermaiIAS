/**
 * LLM Provider Interface
 * The LLM is the 9th and final tier of the assistant pipeline.
 * It is ONLY called when:
 *   - ENABLE_LLM_FALLBACK=true in env
 *   - enableLLMFallback=true in Firestore tenant settings
 *   - Daily rate limit has NOT been exceeded
 *   - The query has already been logged to unanswered_queries (tier 8)
 */

export interface AssistantContext {
  tenantId: string;
  userId: string;
  role: string;
  activeCourseId?: string;
  activeTopicId?: string;
  language?: string;
}

export interface LLMResponse {
  text: string;
  provider: string;
  tokensUsed?: number;
  latencyMs?: number;
}

export interface ILLMProvider {
  readonly name: string;
  generateResponse(
    query: string,
    context: AssistantContext,
    maxTokens?: number,
    timeoutMs?: number
  ): Promise<LLMResponse>;
  /**
   * Quick connectivity / health check — should complete in < 2s
   */
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number }>;
}
