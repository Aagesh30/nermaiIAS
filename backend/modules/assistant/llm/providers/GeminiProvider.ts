import { ILLMProvider, AssistantContext, LLMResponse } from '../ILLMProvider';

export class GeminiProvider implements ILLMProvider {
  readonly name = 'gemini';
  private readonly apiKey: string;
  private readonly model = 'gemini-1.5-flash';
  private get baseUrl() {
    return `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
  }

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    if (!this.apiKey) throw new Error('[GeminiProvider] GEMINI_API_KEY is not set');
  }

  async generateResponse(query: string, context: AssistantContext, maxTokens = 500, timeoutMs = 5000): Promise<LLMResponse> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: this.buildSystemPrompt(context) }, { text: `User question: ${query}` }] }], generationConfig: { maxOutputTokens: maxTokens, temperature: 0.3 } }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!response.ok) { const err = await response.text(); throw new Error(`Gemini API error ${response.status}: ${err}`); }
      const data = await response.json() as any;
      return { text: data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response generated.', provider: this.name, tokensUsed: data.usageMetadata?.totalTokenCount, latencyMs: Date.now() - start };
    } finally { clearTimeout(timeout); }
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${this.apiKey}`, { signal: AbortSignal.timeout(2000) });
      return { healthy: response.ok, latencyMs: Date.now() - start };
    } catch { return { healthy: false, latencyMs: Date.now() - start }; }
  }

  private buildSystemPrompt(context: AssistantContext): string {
    return `You are NERMAI AI, a helpful academic assistant for an online learning academy.
Answer concisely in ${context.language === 'ta' ? 'Tamil' : 'English'}.
Focus only on educational topics: courses, schedules, fees, admissions, and study materials.
If you don't know the answer, say so honestly. Keep responses brief (under 3 sentences).`;
  }
}
