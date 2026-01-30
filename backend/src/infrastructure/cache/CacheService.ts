import { redisCache, RedisCache } from './RedisCache';
import winston from 'winston';

export interface CacheConfig {
  ttl: number;
  keyPrefix: string;
}

export class CacheService {
  private cache: RedisCache;
  private defaultConfig: CacheConfig = {
    ttl: 3600, // 1 hour
    keyPrefix: 'smart_exam:'
  };

  constructor(cache: RedisCache = redisCache) {
    this.cache = cache;
  }

  /**
   * Generate cache key with prefix
   */
  private generateKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.defaultConfig.keyPrefix;
    return `${keyPrefix}${key}`;
  }

  /**
   * Cache database query results
   */
  async cacheQuery<T>(
    key: string,
    queryFn: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    const cacheKey = this.generateKey(key, config?.keyPrefix);
    const ttl = config?.ttl || this.defaultConfig.ttl;

    try {
      // Try to get from cache first
      const cached = await this.cache.get<T>(cacheKey);
      if (cached !== null) {
        winston.debug(`Cache hit for key: ${cacheKey}`);
        return cached;
      }

      // Cache miss - execute query
      winston.debug(`Cache miss for key: ${cacheKey}`);
      const result = await queryFn();

      // Cache the result
      await this.cache.set(cacheKey, result, ttl);

      return result;
    } catch (error) {
      winston.error('Cache query error:', error);
      // On cache error, execute query directly
      return await queryFn();
    }
  }

  /**
   * Cache API response
   */
  async cacheResponse<T>(
    key: string,
    responseFn: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    return this.cacheQuery(key, responseFn, config);
  }

  /**
   * Invalidate cache by key pattern
   */
  async invalidate(pattern: string, prefix?: string): Promise<void> {
    try {
      const keyPattern = this.generateKey(pattern, prefix);
      const keys = await this.cache.keys(keyPattern + '*');

      if (keys.length > 0) {
        winston.info(`Invalidating ${keys.length} cache keys matching: ${keyPattern}`);
        for (const key of keys) {
          await this.cache.delete(key);
        }
      }
    } catch (error) {
      winston.error('Cache invalidation error:', error);
    }
  }

  /**
   * Invalidate specific cache key
   */
  async invalidateKey(key: string, prefix?: string): Promise<void> {
    try {
      const cacheKey = this.generateKey(key, prefix);
      await this.cache.delete(cacheKey);
      winston.debug(`Invalidated cache key: ${cacheKey}`);
    } catch (error) {
      winston.error('Cache key invalidation error:', error);
    }
  }

  /**
   * Cache user-specific data
   */
  async cacheUserData<T>(
    userId: string,
    key: string,
    dataFn: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    const userKey = `user:${userId}:${key}`;
    return this.cacheQuery(userKey, dataFn, config);
  }

  /**
   * Invalidate all user cache
   */
  async invalidateUserCache(userId: string): Promise<void> {
    await this.invalidate(`user:${userId}:*`);
  }

  /**
   * Cache exam data
   */
  async cacheExamData<T>(
    examId: string,
    key: string,
    dataFn: () => Promise<T>,
    config?: Partial<CacheConfig>
  ): Promise<T> {
    const examKey = `exam:${examId}:${key}`;
    return this.cacheQuery(examKey, dataFn, config);
  }

  /**
   * Invalidate exam cache
   */
  async invalidateExamCache(examId: string): Promise<void> {
    await this.invalidate(`exam:${examId}:*`);
  }

  /**
   * Cache with custom TTL based on data type
   */
  async cacheWithSmartTTL<T>(
    key: string,
    dataFn: () => Promise<T>,
    dataType: 'static' | 'dynamic' | 'frequent' | 'rare' = 'dynamic'
  ): Promise<T> {
    const ttlMap = {
      static: 86400,    // 24 hours
      dynamic: 3600,    // 1 hour
      frequent: 1800,   // 30 minutes
      rare: 7200        // 2 hours
    };

    const config = { ttl: ttlMap[dataType] };
    return this.cacheQuery(key, dataFn, config);
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    return await this.cache.getStats();
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    await this.cache.clear();
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmupCache(warmupFns: Array<{ key: string; fn: () => Promise<any>; config?: Partial<CacheConfig> }>): Promise<void> {
    winston.info(`Starting cache warmup with ${warmupFns.length} items`);

    for (const { key, fn, config } of warmupFns) {
      try {
        await this.cacheQuery(key, fn, config);
        winston.debug(`Warmed up cache for key: ${key}`);
      } catch (error) {
        winston.error(`Failed to warmup cache for key ${key}:`, error);
      }
    }

    winston.info('Cache warmup completed');
  }
}

// Export singleton instance
export const cacheService = new CacheService();
export default cacheService;