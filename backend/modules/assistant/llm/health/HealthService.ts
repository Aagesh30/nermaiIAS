import { LLMFactory } from '../LLMFactory';
import { KnowledgeBaseRepository } from '../../../knowledge-base/repository';

export interface AssistantHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  kb: 'healthy' | 'error';
  llm: 'healthy' | 'disabled' | 'error';
  provider: string | null;
  llmLatencyMs?: number;
  timestamp: string;
}

const kbRepo = new KnowledgeBaseRepository();

/**
 * HealthService — checks the readiness of all assistant sub-systems.
 * Used by GET /api/assistant/health
 */
export class AssistantHealthService {
  async check(tenantId: string): Promise<AssistantHealthStatus> {
    const timestamp = new Date().toISOString();

    // 1. Check Knowledge Base connectivity
    let kbStatus: 'healthy' | 'error' = 'healthy';
    try {
      await kbRepo.listArticles(tenantId);
    } catch {
      kbStatus = 'error';
    }

    // 2. Check LLM provider
    let llmStatus: 'healthy' | 'disabled' | 'error' = 'disabled';
    let llmLatencyMs: number | undefined;
    const providerName = LLMFactory.getProviderName();

    if (providerName) {
      const provider = LLMFactory.getProvider();
      if (provider) {
        try {
          const result = await provider.healthCheck();
          llmStatus = result.healthy ? 'healthy' : 'error';
          llmLatencyMs = result.latencyMs;
        } catch {
          llmStatus = 'error';
        }
      }
    }

    // Overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (kbStatus === 'error') overallStatus = 'unhealthy';
    else if (llmStatus === 'error') overallStatus = 'degraded';

    return { status: overallStatus, kb: kbStatus, llm: llmStatus, provider: providerName, llmLatencyMs, timestamp };
  }
}

export const assistantHealthService = new AssistantHealthService();
