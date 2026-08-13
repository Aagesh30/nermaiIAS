import { ILLMProvider, AssistantContext, LLMResponse } from '../ILLMProvider';

export class MockProvider implements ILLMProvider {
  readonly name = 'mock';

  async generateResponse(query: string, context: AssistantContext, _maxTokens?: number, _timeoutMs?: number): Promise<LLMResponse> {
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 50));
    return {
      text: `[MOCK LLM] Thank you for your question about "${query}". Please contact the academy administrators for a detailed answer.`,
      provider: this.name,
      tokensUsed: 0,
      latencyMs: Date.now() - start,
    };
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    return { healthy: true, latencyMs: 0 };
  }
}
