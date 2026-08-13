import { ILLMProvider, AssistantContext, LLMResponse } from '../ILLMProvider';

export class AnthropicProvider implements ILLMProvider {
  readonly name = 'anthropic';
  private readonly apiKey: string;
  private readonly model = 'claude-haiku-20240307';
  private readonly baseUrl = 'https://api.anthropic.com/v1/messages';

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || '';
    if (!this.apiKey) throw new Error('[AnthropicProvider] ANTHROPIC_API_KEY is not set');
  }

  async generateResponse(query: string, context: AssistantContext, maxTokens = 500, timeoutMs = 5000): Promise<LLMResponse> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: this.model, max_tokens: maxTokens, system: this.buildSystemPrompt(context), messages: [{ role: 'user', content: query }] }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) { const err = await response.text(); throw new Error(`Anthropic API error ${response.status}: ${err}`); }
      const data = await response.json() as any;
      return { text: data.content?.[0]?.text?.trim() || 'No response generated.', provider: this.name, tokensUsed: data.usage?.input_tokens + data.usage?.output_tokens, latencyMs: Date.now() - start };
    } finally { clearTimeout(timeout); }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': this.apiKey, 'anthropic-version': '2023-06-01' }, signal: AbortSignal.timeout(2000) });
      return { healthy: response.ok, latencyMs: Date.now() - start };
    } catch { return { healthy: false, latencyMs: Date.now() - start }; }
  }

  private buildSystemPrompt(context: AssistantContext): string {
    return `You are NERMAI AI, a helpful academic assistant for an online learning academy.
Answer concisely in ${context.language === 'ta' ? 'Tamil' : 'English'}.
Focus only on educational topics: courses, schedules, fees, admissions, and study materials.
If you don't know, say so honestly. Keep responses brief (under 3 sentences).`;
  }
}
