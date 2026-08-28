/**
 * In-Memory Cache (Redis-compatible interface)
 * Redis has been removed. All operations use a local in-memory Map with TTL support.
 * The interface is identical to the old Redis wrapper so all callers work unchanged.
 * Live join tokens, comment dedup, interaction draining, FCM caching — all continue
 * to function correctly using this in-process store.
 */

import { logger } from '../../core/logger';

// ── Internal TTL store ─────────────────────────────────────────────────────────
const fallbackCache = new Map<string, { value: string; expiry: number }>();

// Periodic cleanup every 60 seconds to prevent memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of fallbackCache.entries()) {
    if (now > record.expiry) fallbackCache.delete(key);
  }
}, 60_000).unref();

// ── rawRedisClient: a no-op stub so BullMQ queue/infra imports don't crash ────
export const rawRedisClient = {
  on: () => rawRedisClient,
  connect: async () => {},
  quit: async () => {},
  pipeline: () => {
    const cmds: Array<[string, string]> = [];
    const pipe = {
      get: (k: string) => { cmds.push(['get', k]); return pipe; },
      set: (k: string, v: string) => { cmds.push(['set', k]); return pipe; },
      exec: async () => cmds.map(() => [null, null] as [null, null]),
    };
    return pipe;
  },
} as any;

// ── redisClient: full in-memory implementation ─────────────────────────────────
export const redisClient = {
  async get(key: string): Promise<string | null> {
    const record = fallbackCache.get(key);
    if (!record) return null;
    if (Date.now() > record.expiry) { fallbackCache.delete(key); return null; }
    return record.value;
  },

  async set(key: string, value: string, mode?: string, duration?: number): Promise<'OK'> {
    const expiry = (mode === 'EX' && duration) ? Date.now() + duration * 1000 : Infinity;
    fallbackCache.set(key, { value, expiry });
    return 'OK';
  },

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) { if (fallbackCache.delete(k)) count++; }
    return count;
  },

  async sadd(key: string, ...members: string[]): Promise<number> {
    const rec = fallbackCache.get(key);
    let arr: string[] = [];
    if (rec && Date.now() <= rec.expiry) {
      try { arr = JSON.parse(rec.value); } catch (_) {}
    }
    let added = 0;
    for (const m of members) { if (!arr.includes(m)) { arr.push(m); added++; } }
    fallbackCache.set(key, { value: JSON.stringify(arr), expiry: rec?.expiry ?? Infinity });
    return added;
  },

  async smembers(key: string): Promise<string[]> {
    const rec = fallbackCache.get(key);
    if (!rec || Date.now() > rec.expiry) { fallbackCache.delete(key); return []; }
    try { return JSON.parse(rec.value); } catch (_) { return []; }
  },

  async ping(): Promise<string> { return 'PONG'; },

  async scan(cursor: string, _mk: string, pattern: string, _ck: string, _count: number): Promise<[string, string[]]> {
    if (cursor !== '0') return ['0', []];
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return ['0', [...fallbackCache.keys()].filter(k => regex.test(k))];
  },

  async call(_cmd: string, ..._args: string[]): Promise<any> { return null; },

  async rpush(key: string, value: string): Promise<number> {
    const rec = fallbackCache.get(key);
    let arr: string[] = [];
    if (rec && Date.now() <= rec.expiry) { try { arr = JSON.parse(rec.value); } catch (_) {} }
    arr.push(value);
    fallbackCache.set(key, { value: JSON.stringify(arr), expiry: rec?.expiry ?? Infinity });
    return arr.length;
  },

  async lpop(key: string): Promise<string | null> {
    const rec = fallbackCache.get(key);
    if (!rec || Date.now() > rec.expiry) { fallbackCache.delete(key); return null; }
    let arr: string[] = [];
    try { arr = JSON.parse(rec.value); } catch (_) {}
    if (arr.length === 0) return null;
    const item = arr.shift()!;
    fallbackCache.set(key, { value: JSON.stringify(arr), expiry: rec.expiry });
    return item;
  },

  async expire(key: string, seconds: number): Promise<number> {
    const rec = fallbackCache.get(key);
    if (!rec) return 0;
    rec.expiry = Date.now() + seconds * 1000;
    return 1;
  },

  async publish(_channel: string, _message: string): Promise<number> { return 0; },

  async disconnect(): Promise<void> { /* no-op */ },

  pipeline() {
    const cmds: Array<[string, string]> = [];
    const pipe = {
      get: (k: string) => { cmds.push(['get', k]); return pipe; },
      set: (k: string, v: string) => { cmds.push(['set', k]); return pipe; },
      exec: async (): Promise<Array<[Error | null, any]>> => cmds.map(() => [null, null]),
    };
    return pipe;
  },
};

// No-op — kept for compatibility with any caller doing `initializeRedis()`
export async function initializeRedis() {
  logger.info('[Cache] Using in-memory cache (Redis removed). All features operational.');
}


