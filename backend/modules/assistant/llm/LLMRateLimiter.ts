import { logger } from '../../../core/logger';

interface RateLimitState {
  dailyCount: number;
  perMinuteCount: number;
  dayKey: string;    // YYYY-MM-DD
  minuteKey: string; // YYYY-MM-DD-HH-MM
}

// In-memory store (Redis upgrade-ready for multi-instance deployments)
const state: Record<string, RateLimitState> = {};

const DAILY_LIMIT = parseInt(process.env.LLM_DAILY_LIMIT || '1000', 10);
const PER_MINUTE_LIMIT = parseInt(process.env.LLM_REQUESTS_PER_MINUTE || '20', 10);

/**
 * LLMRateLimiter — enforces per-tenant daily and per-minute request limits.
 */
export class LLMRateLimiter {
  static async checkAndIncrement(tenantId: string, tenantDailyLimit?: number): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    const now = new Date();
    const dayKey = now.toISOString().substring(0, 10);
    const minuteKey = `${dayKey}-${now.getHours()}-${now.getMinutes()}`;

    if (!state[tenantId]) {
      state[tenantId] = { dailyCount: 0, perMinuteCount: 0, dayKey, minuteKey };
    }

    const s = state[tenantId];

    if (s.dayKey !== dayKey) { s.dailyCount = 0; s.dayKey = dayKey; }
    if (s.minuteKey !== minuteKey) { s.perMinuteCount = 0; s.minuteKey = minuteKey; }

    const effectiveDailyLimit = tenantDailyLimit
      ? Math.min(DAILY_LIMIT, tenantDailyLimit)
      : DAILY_LIMIT;

    if (s.dailyCount >= effectiveDailyLimit) {
      logger.warn(`[LLMRateLimiter] Daily limit reached for tenant ${tenantId}: ${s.dailyCount}/${effectiveDailyLimit}`);
      return { allowed: false, reason: `The AI assistant has reached today's limit (${effectiveDailyLimit} requests). Please try again tomorrow.` };
    }

    if (s.perMinuteCount >= PER_MINUTE_LIMIT) {
      logger.warn(`[LLMRateLimiter] Per-minute limit reached for tenant ${tenantId}: ${s.perMinuteCount}/${PER_MINUTE_LIMIT}`);
      return { allowed: false, reason: `Too many requests. Please wait a moment before trying again.` };
    }

    s.dailyCount++;
    s.perMinuteCount++;
    return { allowed: true };
  }

  static getUsage(tenantId: string): { dailyCount: number; perMinuteCount: number } {
    const s = state[tenantId];
    if (!s) return { dailyCount: 0, perMinuteCount: 0 };
    return { dailyCount: s.dailyCount, perMinuteCount: s.perMinuteCount };
  }
}
