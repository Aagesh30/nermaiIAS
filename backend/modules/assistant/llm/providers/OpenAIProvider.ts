import { ILLMProvider, AssistantContext, LLMResponse } from '../ILLMProvider';

export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';
  private readonly apiKey: string;
  private readonly model = 'gpt-3.5-turbo';
  private readonly baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) throw new Error('[OpenAIProvider] OPENAI_API_KEY is not set');
  }

  async generateResponse(query: string, context: AssistantContext, maxTokens = 500, timeoutMs = 5000): Promise<LLMResponse> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}` },
        body: JSON.stringify({ model: this.model, max_tokens: maxTokens, messages: [{ role: 'system', content: this.buildSystemPrompt(context) }, { role: 'user', content: query }] }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) { const err = await response.text(); throw new Error(`OpenAI API error ${response.status}: ${err}`); }
      const data = await response.json() as any;
      return { text: data.choices?.[0]?.message?.content?.trim() || 'No response generated.', provider: this.name, tokensUsed: data.usage?.total_tokens, latencyMs: Date.now() - start };
    } finally { clearTimeout(timeout); }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/models`, { headers: { 'Authorization': `Bearer ${this.apiKey}` }, signal: AbortSignal.timeout(2000) });
      return { healthy: response.ok, latencyMs: Date.now() - start };
    } catch { return { healthy: false, latencyMs: Date.now() - start }; }
  }

  private buildSystemPrompt(context: AssistantContext): string {
    return `You are NERMAI AI, a helpful academic assistant for an online learning academy.
Answer concisely in ${context.language === 'ta' ? 'Tamil' : 'English'}.
Focus only on educational topics related to the academy: courses, schedules, fees, admissions, and study materials.
If you don't know the answer, say so honestly. Do NOT make up information. Keep responses under 3 sentences when possible.`;
  }
}
