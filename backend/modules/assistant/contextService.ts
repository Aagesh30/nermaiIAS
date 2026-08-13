import { redisClient } from '../../infrastructure/redis';

export interface IStudentContext {
  activeCourseId?: string;
  activeTopicId?: string;
  activeVideoId?: string;
  timestamp?: number;
  lastUpdated: number;
}

export interface IAssistantMemory {
  context: Partial<IStudentContext>;
  lastResults: any[];
  history: Array<{ query: string; intent: string; timestamp: number }>;
}

export interface IClassContext {
  courseId: string;
  subjectId: string;
  topicId: string;
  classId: string;
  recordingId?: string;
  resourceIds: string[];
  announcementIds: string[];
  lastUpdated: number;
}

export class ContextService {
  private getCacheKey(userId: string): string {
    return `context:${userId}`;
  }

  private getMemoryKey(userId: string): string {
    return `assistant:${userId}`;
  }

  async setContext(userId: string, contextPayload: Partial<IStudentContext>): Promise<void> {
    // Merge with existing context if it exists, or just overwrite (depending on business rules).
    // Usually, context is completely replaced when they navigate to a new course.
    const key = this.getCacheKey(userId);
    
    const newContext: IStudentContext = {
      ...contextPayload,
      lastUpdated: Date.now()
    };

    // 15-minute TTL (900 seconds)
    await redisClient.set(key, JSON.stringify(newContext), 'EX', 900);
  }

  async getContext(userId: string): Promise<IStudentContext | null> {
    const key = this.getCacheKey(userId);
    const data = await redisClient.get(key);
    
    if (!data) return null;
    
    try {
      return JSON.parse(data) as IStudentContext;
    } catch {
      return null;
    }
  }

  async clearContext(userId: string): Promise<void> {
    const key = this.getCacheKey(userId);
    await redisClient.del(key);
  }

  // --- Assistant Session Memory ---

  async getMemory(userId: string): Promise<IAssistantMemory> {
    const key = this.getMemoryKey(userId);
    const data = await redisClient.get(key);
    
    if (data) {
      try {
        return JSON.parse(data) as IAssistantMemory;
      } catch { /* ignore */ }
    }
    
    return {
      context: {},
      lastResults: [],
      history: []
    };
  }

  async updateMemory(userId: string, updates: { query?: string, intent?: string, results?: any[], currentContext?: IStudentContext }, ttlSeconds: number = 900): Promise<void> {
    const memory = await this.getMemory(userId);
    
    if (updates.currentContext) {
      memory.context = updates.currentContext;
    }
    
    if (updates.query && updates.intent) {
      memory.history.unshift({ query: updates.query, intent: updates.intent, timestamp: Date.now() });
      if (memory.history.length > 5) memory.history.pop();
    }
    
    if (updates.results) {
      memory.lastResults = updates.results.slice(0, 5); // keep last 5
    }

    const key = this.getMemoryKey(userId);
    await redisClient.set(key, JSON.stringify(memory), 'EX', ttlSeconds);
  }

  async clearMemory(userId: string): Promise<void> {
    const key = this.getMemoryKey(userId);
    await redisClient.del(key);
  }

  // --- Ordinal Parsing for Conversation Flow ---
  async resolveOrdinal(query: string, userId: string): Promise<any | null> {
    const normalized = query.toLowerCase();
    
    // Simple ordinal mapping
    const ordinals: Record<string, number> = {
      'first': 0, '1st': 0, 'one': 0, '1': 0,
      'second': 1, '2nd': 1, 'two': 1, '2': 1,
      'third': 2, '3rd': 2, 'three': 2, '3': 2,
      'fourth': 3, '4th': 3, 'four': 3, '4': 3,
      'fifth': 4, '5th': 4, 'five': 4, '5': 4,
      'last': -1
    };

    let matchedIndex = -2; // -2 means no match

    for (const [key, index] of Object.entries(ordinals)) {
      if (normalized.includes(`open ${key}`) || normalized.includes(key)) {
        matchedIndex = index;
        break; // Match first found
      }
    }

    if (matchedIndex === -2) return null;

    const memory = await this.getMemory(userId);
    if (!memory || !memory.lastResults || memory.lastResults.length === 0) return null;

    if (matchedIndex === -1) {
      return memory.lastResults[memory.lastResults.length - 1]; // 'last'
    }

    if (matchedIndex >= 0 && matchedIndex < memory.lastResults.length) {
      return memory.lastResults[matchedIndex];
    }

    return null; // Out of bounds
  }

  // --- Global Class Context ---
  async setGlobalClassContext(classId: string, contextPayload: Omit<IClassContext, 'lastUpdated'>, ttlSeconds: number = 86400): Promise<void> {
    const key = `class_context:${classId}`;
    const newContext: IClassContext = {
      ...contextPayload,
      lastUpdated: Date.now()
    };
    // Keep class context around for 24 hours by default
    await redisClient.set(key, JSON.stringify(newContext), 'EX', ttlSeconds);
  }

  async getGlobalClassContext(classId: string): Promise<IClassContext | null> {
    const key = `class_context:${classId}`;
    const data = await redisClient.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as IClassContext;
    } catch {
      return null;
    }
  }
}
