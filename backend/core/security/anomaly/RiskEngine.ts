import { redisClient } from '../../../infrastructure/redis';
import { logger } from '../../logger';

export interface RiskAssessment {
  riskScore: number; // 0 to 100
  decision: 'ALLOW' | 'FLAG' | 'BLOCK';
  reasons: string[];
}

export class RiskEngine {
  /**
   * Assess risk for authentication attempts.
   */
  static async assessLoginRisk(ip: string, userId?: string): Promise<RiskAssessment> {
    const reasons: string[] = [];
    let riskScore = 0;

    // Check failed attempts for this IP in the last 15 minutes
    const ipFailKey = `risk:fail:ip:${ip}`;
    const ipFailuresStr = await redisClient.get(ipFailKey);
    const ipFailures = ipFailuresStr ? parseInt(ipFailuresStr, 10) : 0;

    if (ipFailures >= 5) {
      riskScore += 40;
      reasons.push(`High failed attempts from IP (${ipFailures})`);
    } else if (ipFailures >= 3) {
      riskScore += 20;
      reasons.push(`Multiple failed attempts from IP (${ipFailures})`);
    }

    // Check failed attempts for targeted user ID if known
    if (userId) {
      const userFailKey = `risk:fail:user:${userId}`;
      const userFailuresStr = await redisClient.get(userFailKey);
      const userFailures = userFailuresStr ? parseInt(userFailuresStr, 10) : 0;

      if (userFailures >= 5) {
        riskScore += 40;
        reasons.push(`Targeted brute force against user ${userId} (${userFailures} fails)`);
      }
    }

    let decision: 'ALLOW' | 'FLAG' | 'BLOCK' = 'ALLOW';
    if (riskScore >= 70) {
      decision = 'BLOCK';
    } else if (riskScore >= 30) {
      decision = 'FLAG';
    }

    return { riskScore, decision, reasons };
  }

  /**
   * Record a failed login to increase risk score.
   */
  static async recordFailedLogin(ip: string, userId?: string): Promise<void> {
    try {
      const ipFailKey = `risk:fail:ip:${ip}`;
      const current = await redisClient.get(ipFailKey);
      const count = current ? parseInt(current, 10) + 1 : 1;
      await redisClient.set(ipFailKey, String(count), 'EX', 900); // 15 mins TTL

      if (userId) {
        const userFailKey = `risk:fail:user:${userId}`;
        const userCurrent = await redisClient.get(userFailKey);
        const userCount = userCurrent ? parseInt(userCurrent, 10) + 1 : 1;
        await redisClient.set(userFailKey, String(userCount), 'EX', 900);
      }
    } catch (err) {
      logger.warn('[RiskEngine] Failed to record login failure', err);
    }
  }

  /**
   * Clear failed login counter on successful authentication.
   */
  static async clearLoginFailures(ip: string, userId?: string): Promise<void> {
    try {
      await redisClient.del(`risk:fail:ip:${ip}`);
      if (userId) {
        await redisClient.del(`risk:fail:user:${userId}`);
      }
    } catch (err) {
      logger.warn('[RiskEngine] Failed to clear login failures', err);
    }
  }
}
