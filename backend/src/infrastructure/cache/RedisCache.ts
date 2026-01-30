import Redis from 'ioredis';
import { config } from '@/config';
import winston from 'winston';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyPrefix?: string;
}

export class RedisCache {
  private client: Redis;
  private defaultTtl: number = 3600; // 1 hour default

  constructor() {
    this.client = new Redis(config.redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      reconnectOnError: (err) => {
        winston.warn('Redis reconnect on error:', err);
        return false;
      },
    });

    this.client.on('connect', () => {
      winston.info('Redis cache connected');
    });

    this.client.on('error', (err) => {
      winston.error('Redis cache error:', err);
    });

    this.client.on('ready', () => {
      winston.info('Redis cache ready');
    });
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (!value) return null;

      return JSON.parse(value) as T;
    } catch (error) {
      winston.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      const expiry = ttl || this.defaultTtl;

      await this.client.setex(key, expiry, serializedValue);
    } catch (error) {
      winston.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      winston.error('Cache delete error:', error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      winston.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      winston.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: { [key: string]: any }, ttl?: number): Promise<void> {
    try {
      const pipeline = this.client.pipeline();
      const expiry = ttl || this.defaultTtl;

      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const serializedValue = JSON.stringify(value);
        pipeline.setex(key, expiry, serializedValue);
      });

      await pipeline.exec();
    } catch (error) {
      winston.error('Cache mset error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      await this.client.flushall();
    } catch (error) {
      winston.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      winston.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      return await this.client.incrby(key, amount);
    } catch (error) {
      winston.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      await this.client.expire(key, ttl);
    } catch (error) {
      winston.error('Cache expire error:', error);
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      winston.error('Cache ttl error:', error);
      return -1;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      await this.client.quit();
      winston.info('Redis cache connection closed');
    } catch (error) {
      winston.error('Error closing Redis connection:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<any> {
    try {
      const info = await this.client.info();
      return {
        connected: this.client.status === 'ready',
        info: info
      };
    } catch (error) {
      winston.error('Cache stats error:', error);
      return { connected: false, error: (error as Error).message };
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();
export default redisCache;