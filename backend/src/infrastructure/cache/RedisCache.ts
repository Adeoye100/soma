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
  private isConnected: boolean = false;
  private memoryFallback = new Map<string, { value: string, expiry: number }>();
  private redisErrorLogged: boolean = false;

  constructor() {
    if (!config.redisEnabled) {
      winston.info('Redis disabled via REDIS_ENABLED=false, cache using memory store');
      // Create a dummy client that will never connect
      this.client = new Redis({ lazyConnect: true, host: '127.0.0.1', port: 1, maxRetriesPerRequest: 0 });
      setInterval(() => this.cleanupMemoryFallback(), 60000);
      return;
    }

    this.client = new Redis(config.redisUrl, {
      enableReadyCheck: false,
      maxRetriesPerRequest: 1, // Minimize retries on failure
      lazyConnect: true,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        if (times > 3) {
          return null; // Stop retrying after 3 attempts
        }
        return delay;
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      winston.info('Redis cache connected');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      if (!this.redisErrorLogged) {
        this.redisErrorLogged = true;
        winston.warn('Redis cache unavailable, using memory fallback');
      }
    });

    this.client.on('ready', () => {
      this.isConnected = true;
      winston.info('Redis cache ready');
    });

    this.client.on('close', () => {
      this.isConnected = false;
    });

    // Start cleanup interval for memory fallback
    setInterval(() => this.cleanupMemoryFallback(), 60000);
  }

  private cleanupMemoryFallback() {
    const now = Date.now();
    for (const [key, data] of this.memoryFallback.entries()) {
      if (data.expiry < now) {
        this.memoryFallback.delete(key);
      }
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isConnected) {
        const value = await this.client.get(key);
        if (!value) return null;
        return JSON.parse(value) as T;
      }
      
      const record = this.memoryFallback.get(key);
      if (record && record.expiry > Date.now()) {
        return JSON.parse(record.value) as T;
      }
      return null;
    } catch (error) {
      if (this.isConnected) winston.error('Cache get error:', error);
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

      if (this.isConnected) {
        await this.client.setex(key, expiry, serializedValue);
      } else {
        this.memoryFallback.set(key, {
          value: serializedValue,
          expiry: Date.now() + (expiry * 1000)
        });
      }
    } catch (error) {
      if (this.isConnected) winston.error('Cache set error:', error);
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.del(key);
      } else {
        this.memoryFallback.delete(key);
      }
    } catch (error) {
      if (this.isConnected) winston.error('Cache delete error:', error);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.isConnected) {
        const result = await this.client.exists(key);
        return result === 1;
      }
      const record = this.memoryFallback.get(key);
      return !!(record && record.expiry > Date.now());
    } catch (error) {
      if (this.isConnected) winston.error('Cache exists error:', error);
      return false;
    }
  }

  /**
   * Get multiple keys
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      if (this.isConnected) {
        const values = await this.client.mget(keys);
        return values.map(value => value ? JSON.parse(value) : null);
      }
      return keys.map(key => {
        const record = this.memoryFallback.get(key);
        return (record && record.expiry > Date.now()) ? JSON.parse(record.value) : null;
      });
    } catch (error) {
      if (this.isConnected) winston.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple key-value pairs
   */
  async mset(keyValuePairs: { [key: string]: any }, ttl?: number): Promise<void> {
    try {
      const expiry = ttl || this.defaultTtl;

      if (this.isConnected) {
        const pipeline = this.client.pipeline();
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          const serializedValue = JSON.stringify(value);
          pipeline.setex(key, expiry, serializedValue);
        });
        await pipeline.exec();
      } else {
        const now = Date.now();
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          this.memoryFallback.set(key, {
            value: JSON.stringify(value),
            expiry: now + (expiry * 1000)
          });
        });
      }
    } catch (error) {
      if (this.isConnected) winston.error('Cache mset error:', error);
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.flushall();
      }
      this.memoryFallback.clear();
    } catch (error) {
      if (this.isConnected) winston.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache keys matching pattern
   */
  async keys(pattern: string): Promise<string[]> {
    try {
      if (this.isConnected) {
        return await this.client.keys(pattern);
      }
      // Simple regex conversion for basic pattern matching
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const now = Date.now();
      return Array.from(this.memoryFallback.keys()).filter(key => {
        const record = this.memoryFallback.get(key);
        return record && record.expiry > now && regex.test(key);
      });
    } catch (error) {
      if (this.isConnected) winston.error('Cache keys error:', error);
      return [];
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(key: string, amount: number = 1): Promise<number> {
    try {
      if (this.isConnected) {
        return await this.client.incrby(key, amount);
      }
      const record = this.memoryFallback.get(key);
      const currentVal = (record && record.expiry > Date.now()) ? parseInt(JSON.parse(record.value)) : 0;
      const newVal = currentVal + amount;
      this.memoryFallback.set(key, {
        value: JSON.stringify(newVal),
        expiry: Date.now() + (this.defaultTtl * 1000)
      });
      return newVal;
    } catch (error) {
      if (this.isConnected) winston.error('Cache increment error:', error);
      return 0;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.expire(key, ttl);
      } else {
        const record = this.memoryFallback.get(key);
        if (record) {
          record.expiry = Date.now() + (ttl * 1000);
        }
      }
    } catch (error) {
      if (this.isConnected) winston.error('Cache expire error:', error);
    }
  }

  /**
   * Get TTL for a key
   */
  async ttl(key: string): Promise<number> {
    try {
      if (this.isConnected) {
        return await this.client.ttl(key);
      }
      const record = this.memoryFallback.get(key);
      if (record && record.expiry > Date.now()) {
        return Math.ceil((record.expiry - Date.now()) / 1000);
      }
      return -1;
    } catch (error) {
      if (this.isConnected) winston.error('Cache ttl error:', error);
      return -1;
    }
  }

  /**
   * Close Redis connection
   */
  async close(): Promise<void> {
    try {
      this.isConnected = false;
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
      if (this.isConnected) {
        const info = await this.client.info();
        return {
          connected: true,
          type: 'redis',
          info: info
        };
      }
      return {
        connected: false,
        type: 'memory',
        size: this.memoryFallback.size
      };
    } catch (error) {
      return { connected: false, type: 'memory', error: (error as Error).message };
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();
export default redisCache;