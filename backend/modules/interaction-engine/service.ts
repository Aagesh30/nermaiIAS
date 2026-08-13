// @ts-nocheck
import { Response } from 'express';
import { redisClient } from '../../infrastructure/redis';
import { AppError } from '../../core/errors/AppError';
import { IInteraction, InteractionSettings } from './types';
import { v4 as uuidv4 } from 'uuid';
import { RedisConfig } from '../../core/constants';
import Redis from 'ioredis';

// Separate Redis client for subscribing (Redis requires dedicated client for pub/sub)
const isFirebaseDeploy = 
  !!process.env.GOOGLE_FUNCTION_TARGET ||
  !!process.env.FIREBASE_CONFIG ||
  (typeof process !== 'undefined' && process.argv && process.argv.some(arg => arg.includes('firebase') || arg.includes('functions-framework') || arg.includes('deploy')));

let redisSubscriber: any = null;
if (!isFirebaseDeploy) {
  redisSubscriber = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null, // Prevent infinite retries and log spam when offline
  });

  // Avoid unhandled errors when offline
  redisSubscriber.on('error', () => { /* ignore */ });
}

export class InteractionService {
  // Local state for SSE connections on this specific Node instance
  private clients = new Map<string, Response[]>();
  private pubSubInitialized = false;

  constructor() {
    // Lazy initialize on first SSE client registration
  }

  private initPubSub() {
    if (this.pubSubInitialized) return;
    this.pubSubInitialized = true;

    if (!redisSubscriber) return;
    // Subscribe to all interaction channels via pattern
    redisSubscriber.psubscribe('interaction:*', (err, count) => {
      if (err) {
        console.log('[InteractionEngine] Redis PubSub unavailable (running without Redis)');
      }
    });

    redisSubscriber.on('pmessage', (pattern, channel, message) => {
      // channel is e.g. interaction:tenant01:live_class:class123
      const parts = channel.split(':');
      if (parts.length >= 4) {
        const contextKey = parts.slice(1).join(':'); // tenant01:live_class:class123
        this.broadcastToLocalClients(contextKey, message);
      }
    });
  }

  /**
   * Register a new Server-Sent Events (SSE) connection
   */
  public addSSEClient(contextKey: string, res: Response) {
    this.initPubSub();
    const clients = this.clients.get(contextKey) || [];
    clients.push(res);
    this.clients.set(contextKey, clients);

    // Remove client on disconnect
    res.on('close', () => {
      const activeClients = this.clients.get(contextKey) || [];
      this.clients.set(contextKey, activeClients.filter(c => c !== res));
    });
  }

  private broadcastToLocalClients(contextKey: string, dataStr: string) {
    const clients = this.clients.get(contextKey);
    if (!clients || clients.length === 0) return;

    // Send SSE format
    const sseMessage = `data: ${dataStr}\n\n`;
    clients.forEach(client => client.write(sseMessage));
  }

  /**
   * Main entry point for any incoming interaction (Chat, Question, Voice, Reaction, etc.)
   */
  public async processInteraction(
    interaction: Partial<IInteraction>, 
    userId: string, 
    tenantId: string,
    settings: InteractionSettings
  ): Promise<IInteraction> {
    const now = Date.now();
    const contextKey = `${interaction.context!.tenantId}:${interaction.context!.contextType}:${interaction.context!.contextId}`;

    // 1. Permission & Mode Checks
    this.enforceSettings(interaction, settings, userId);

    // 2. Flood Protection & Deduplication
    await this.enforceRateLimits(interaction, userId, contextKey, settings, now);

    // 3. Hydrate Object
    const hydrated: IInteraction = {
      ...interaction as IInteraction,
      id: uuidv4(),
      userId,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 4. Publish to Redis (Distributes to all Node instances)
    await redisClient.publish(`interaction:${contextKey}`, JSON.stringify(hydrated));

    // 5. Send to Worker Queue for permanent persistence (or aggregate)
    await this.queueForPersistence(hydrated);

    return hydrated;
  }

  private enforceSettings(interaction: Partial<IInteraction>, settings: InteractionSettings, userId: string) {
    const type = interaction.interactionType;
    if (type === 'CHAT' && !settings.chatEnabled) throw new AppError('Chat is currently disabled', 403);
    if (type === 'QUESTION' && !settings.questionEnabled) throw new AppError('Questions are currently disabled', 403);
    if (type === 'VOICE' && !settings.voiceEnabled) throw new AppError('Voice asks are currently disabled', 403);
    if (type === 'REACTION' && !settings.reactionEnabled) throw new AppError('Reactions are disabled', 403);
    if (type === 'POLL' && !settings.pollEnabled) throw new AppError('Polls are disabled', 403);
    
    // Check teacherOnlyChat constraint
    // In a real system, we'd verify the role here. Assuming userId logic handles this or middleware did.
  }

  private async enforceRateLimits(
    interaction: Partial<IInteraction>, 
    userId: string, 
    contextKey: string,
    settings: InteractionSettings,
    now: number
  ) {
    const type = interaction.interactionType;
    const rateLimitKey = `rl:${type}:${contextKey}:${userId}`;
    const dedupeKey = `dedupe:${type}:${contextKey}:${userId}`;
    
    // Reaction limits: max 1 per 2 seconds
    if (type === 'REACTION') {
      const lastReact = await redisClient.get(rateLimitKey);
      if (lastReact && (now - parseInt(lastReact)) < 2000) {
         throw new AppError('Slow down your reactions', 429);
      }
      await redisClient.set(rateLimitKey, now.toString(), 'EX', 2);
    }

    // Chat / Question limits (Slow Mode)
    if (type === 'CHAT' || type === 'QUESTION') {
      if (settings.slowModeSeconds > 0) {
        const lastMsg = await redisClient.get(rateLimitKey);
        if (lastMsg && (now - parseInt(lastMsg)) < settings.slowModeSeconds * 1000) {
           throw new AppError(`Slow mode is on. Please wait ${settings.slowModeSeconds} seconds between messages.`, 429);
        }
        await redisClient.set(rateLimitKey, now.toString(), 'EX', settings.slowModeSeconds);
      }

      // Deduplication: prevent identical messages within 5 seconds
      if (interaction.payload?.message) {
        const lastHash = await redisClient.get(dedupeKey);
        if (lastHash === interaction.payload.message) {
           throw new AppError('Duplicate message detected', 429);
        }
        await redisClient.set(dedupeKey, interaction.payload.message, 'EX', 5);
      }
    }
  }

  private async queueForPersistence(interaction: IInteraction) {
    if (interaction.interactionType === 'HAND') {
      // Ephemeral: don't save hands to DB permanently, just broadcast
      return;
    }

    if (interaction.interactionType === 'REACTION') {
      // Aggregate in Redis instead of writing individual rows
      const aggKey = `agg:reaction:${interaction.context.tenantId}:${interaction.context.contextType}:${interaction.context.contextId}:${interaction.payload.reaction}`;
      await redisClient.incr(aggKey);
      return;
    }

    // Pass everything else to a BullMQ queue for batch saving to Firestore
    // For now we will mock the queue integration.
    // await queue.add('persist-interaction', interaction);
    
    // We will push to a Redis List that a Cron/Worker can pop from
    await redisClient.rpush('interaction-persistence-queue', JSON.stringify(interaction));
  }
}

export const interactionService = new InteractionService();

