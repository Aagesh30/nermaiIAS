import { getFirestore } from 'firebase-admin/firestore';

export interface IAnalyticsLog {
  tenantId: string;
  userId: string;
  query: string;
  intent: string;
  confidence: number;
  pluginsUsed: string[];
  latencyMs: number;
  success: boolean;
  timestamp: string;
}

export class AssistantAnalytics {
  private logCollection = 'assistant_audit_logs';

  /**
   * Logs every interaction for dashboard analytics and performance tuning.
   * Runs non-blockingly so it doesn't affect user latency.
   */
  logInteraction(log: IAnalyticsLog): void {
    const db = getFirestore();
    
    // Fire and forget
    db.collection(this.logCollection).add(log).catch(err => {
      console.error('[AssistantAnalytics] Failed to write log:', err);
    });
  }

  /**
   * Retrieves aggregated analytics for the admin dashboard
   */
  async getDashboardMetrics(tenantId: string, days: number = 7) {
    const db = getFirestore();
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    try {
      const snapshot = await db.collection(this.logCollection)
        .where('tenantId', '==', tenantId)
        .where('timestamp', '>=', sinceDate.toISOString())
        .get();

      let totalQueries = 0;
      let failedQueries = 0;
      let totalLatency = 0;
      const intentCounts: Record<string, number> = {};

      snapshot.forEach(doc => {
        const data = doc.data() as IAnalyticsLog;
        totalQueries++;
        if (!data.success || data.intent === 'GENERAL_SEARCH') failedQueries++;
        totalLatency += data.latencyMs;
        
        intentCounts[data.intent] = (intentCounts[data.intent] || 0) + 1;
      });

      return {
        totalQueries,
        unansweredRate: totalQueries > 0 ? (failedQueries / totalQueries) : 0,
        averageLatencyMs: totalQueries > 0 ? (totalLatency / totalQueries) : 0,
        topIntents: Object.entries(intentCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
      };
    } catch (err) {
      console.error('[AssistantAnalytics] Failed to aggregate metrics:', err);
      return null;
    }
  }
}

export const assistantAnalytics = new AssistantAnalytics();
