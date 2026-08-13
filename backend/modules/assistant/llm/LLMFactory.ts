import { ILLMProvider } from './ILLMProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { GeminiProvider } from './providers/GeminiProvider';
import { AnthropicProvider } from './providers/AnthropicProvider';
import { MockProvider } from './providers/MockProvider';
import { logger } from '../../../core/logger';

export type LLMProviderName = 'openai' | 'gemini' | 'anthropic' | 'mock';

/**
 * LLMFactory — reads env vars and returns the configured provider, or null if LLM is disabled.
 *
 * Priority gate:
 *   ENABLE_LLM_FALLBACK=false → always returns null (no LLM, no API cost)
 *   ENABLE_LLM_FALLBACK=true + valid provider + key → returns provider
 *
 * The factory caches the instance to avoid re-constructing on every request.
 */
export class LLMFactory {
  private static cachedProvider: ILLMProvider | null | undefined = undefined;

  /**
   * Returns the configured LLM provider, or null if LLM is disabled / not configured.
   * Returns cached instance after first call.
   */
  static getProvider(): ILLMProvider | null {
    // Return cached result after first initialization
    if (this.cachedProvider !== undefined) {
      return this.cachedProvider;
    }

    const enabled = process.env.ENABLE_LLM_FALLBACK === 'true';

    if (!enabled) {
      logger.info('[LLMFactory] LLM fallback is DISABLED (ENABLE_LLM_FALLBACK=false). No API cost incurred.');
      this.cachedProvider = null;
      return null;
    }

    const providerName = (process.env.LLM_PROVIDER || 'mock') as LLMProviderName;

    try {
      switch (providerName) {
        case 'openai':
          this.cachedProvider = new OpenAIProvider();
          break;
        case 'gemini':
          this.cachedProvider = new GeminiProvider();
          break;
        case 'anthropic':
          this.cachedProvider = new AnthropicProvider();
          break;
        case 'mock':
          this.cachedProvider = new MockProvider();
          break;
        default:
          logger.warn(`[LLMFactory] Unknown provider "${providerName}". Falling back to null.`);
          this.cachedProvider = null;
      }

      if (this.cachedProvider) {
        logger.info(`[LLMFactory] LLM provider initialized: ${this.cachedProvider.name}`);
      }
    } catch (error: any) {
      logger.error(`[LLMFactory] Failed to initialize provider "${providerName}": ${error.message}`);
      this.cachedProvider = null;
    }

    return this.cachedProvider;
  }

  /**
   * Force re-initialization (e.g., after admin changes settings).
   */
  static reset() {
    this.cachedProvider = undefined;
    logger.info('[LLMFactory] Provider cache cleared — will re-initialize on next request.');
  }

  /**
   * Returns provider name without creating it (for health checks / diagnostics).
   */
  static getProviderName(): string | null {
    if (process.env.ENABLE_LLM_FALLBACK !== 'true') return null;
    return process.env.LLM_PROVIDER || 'mock';
  }
}
