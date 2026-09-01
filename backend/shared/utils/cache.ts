/**
 * High-performance In-Memory TTL Cache Utility
 * Designed for low latency caching of static test questions, test metadata, and active attempt configurations.
 */

interface CacheEntry<T> {
    value: T;
    expiresAt: number;
}

class MemoryCache {
    private cache: Map<string, CacheEntry<any>> = new Map();
    private defaultTtlMs: number;

    /**
     * @param defaultTtlSeconds Default time to live in seconds (default 10 mins = 600s)
     */
    constructor(defaultTtlSeconds: number = 600) {
        this.defaultTtlMs = defaultTtlSeconds * 1000;
        // Periodic cleanup of expired keys every 60 seconds
        setInterval(() => this.purgeExpired(), 60000).unref();
    }

    /**
     * Get item from cache. Returns undefined if missing or expired.
     */
    get<T>(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.value as T;
    }

    /**
     * Store item in cache with optional TTL override in seconds.
     */
    set<T>(key: string, value: T, ttlSeconds?: number): void {
        const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
        this.cache.set(key, {
            value,
            expiresAt: Date.now() + ttlMs
        });
    }

    /**
     * Delete key from cache.
     */
    delete(key: string): boolean {
        return this.cache.delete(key);
    }

    /**
     * Clear all keys matching a prefix or pattern.
     */
    invalidatePrefix(prefix: string): void {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Clear all keys in cache.
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Purge all expired entries.
     */
    private purgeExpired(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Get size of active cache.
     */
    size(): number {
        return this.cache.size;
    }
}

// Global cache instances for Test Portal
// TTLs tuned for cost-efficiency:
//   - testQuestionsCache: 1 hour — questions never change mid-test
//   - testDetailsCache: 30 min — test config is stable
//   - attemptCache: 15 sec — kept short for live attempt accuracy
//   - generalCache: 1 hour — resource listings, batch info, course data
export const testQuestionsCache = new MemoryCache(3600);  // 1 hour TTL
export const testDetailsCache   = new MemoryCache(1800);  // 30 min TTL
export const attemptCache       = new MemoryCache(15);    // 15 sec TTL
export const generalCache       = new MemoryCache(3600);  // 1 hour TTL

