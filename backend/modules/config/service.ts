import { db } from '../../infrastructure/firebase';
import { redisClient } from '../../infrastructure/redis';

export interface TenantConfig {
  attendance: {
    defaultPercentage: number;
    recordingCompletionThreshold: number;
  };
  live: {
    graceMinutes: number;
    extensionOptions: number[];
    maxDurationHours: number;
  };
  dashboard: {
    scheduledRefresh: number;
    liveRefresh: number;
    liveRefresh10Min: number;
    liveRefresh2Min: number;
  };
  assistant: {
    contextTTL: number;
  };
  resources: {
    signedUrlTTL: number;
    cacheDays: number;
  };
}

const DEFAULT_CONFIG: TenantConfig = {
  attendance: {
    defaultPercentage: 50,
    recordingCompletionThreshold: 95
  },
  live: {
    graceMinutes: 2,
    extensionOptions: [5, 10, 15, 30, 45, 60],
    maxDurationHours: 12
  },
  dashboard: {
    scheduledRefresh: 120,
    liveRefresh: 60,
    liveRefresh10Min: 30,
    liveRefresh2Min: 15
  },
  assistant: {
    contextTTL: 900
  },
  resources: {
    signedUrlTTL: 900,
    cacheDays: 30
  }
};

export class ConfigService {
  private collection = db.collection('tenant_config');

  async getConfig(tenantId: string): Promise<TenantConfig> {
    const cacheKey = `config:${tenantId}`;
    const cached = await redisClient.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached) as TenantConfig;
    }

    const doc = await this.collection.doc(tenantId).get();
    let config = DEFAULT_CONFIG;

    if (doc.exists) {
      config = { ...DEFAULT_CONFIG, ...(doc.data() as Partial<TenantConfig>) };
    } else {
      // Seed default config for tenant
      await this.collection.doc(tenantId).set(config);
    }

    await redisClient.set(cacheKey, JSON.stringify(config), 'EX', 900); // 15 mins cache
    return config;
  }

  async updateConfig(tenantId: string, updates: Partial<TenantConfig>): Promise<TenantConfig> {
    const current = await this.getConfig(tenantId);
    const newConfig = { ...current, ...updates };
    
    await this.collection.doc(tenantId).set(newConfig, { merge: true });
    await redisClient.set(`config:${tenantId}`, JSON.stringify(newConfig), 'EX', 900);
    
    return newConfig;
  }
}

export const configService = new ConfigService();
