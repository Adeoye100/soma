/**
 * Enhanced rate limiting service with Redis support and exponential backoff
 */

import { createClient, RedisClientType } from 'redis';
import winston from 'winston';
import { config } from '@/config';

interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (req: any, retryAfter: number) => void;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export class EnhancedRateLimiter {
  private redisClient?: RedisClientType;
  private memoryStore = new Map<string, { count: number; resetTime: number }>();
  private options: RateLimitOptions;
  private logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
  });

  constructor(options: RateLimitOptions) {
    this.options = options;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection if available
   */
  private async initializeRedis(): Promise<void> {
    if (!config.redisUrl) {
      this.logger.warn('Redis URL not configured, using memory store for rate limiting');
      return;
    }

    try {
      this.redisClient = createClient({
        url: config.redisUrl
      });

      this.redisClient.on('error', (err) => {
        this.logger.error('Redis Client Error', err);
      });

      await this.redisClient.connect();
      this.logger.info('Redis connected successfully for rate limiting');
    } catch (error) {
      this.logger.warn('Redis connection failed, falling back to memory store:', error);
    }
  }

  /**
   * Check if request is within rate limits
   */
  async checkLimit(req: any): Promise<RateLimitInfo> {
    const key = this.options.keyGenerator ? this.options.keyGenerator(req) : this.getClientIp(req);
    const now = Date.now();
    const windowStart = now - this.options.windowMs;

    let currentCount = 0;
    let resetTime = now + this.options.windowMs;

    if (this.redisClient?.isReady) {
      // Use Redis for distributed rate limiting
      const redisKey = `ratelimit:${key}`;
      
      // Clean up old entries and get current count
      await this.redisClient.zRemRangeByScore(redisKey, 0, windowStart);
      const count = await this.redisClient.zCard(redisKey);
      currentCount = count;
      
      // Set expiration for the key
      await this.redisClient.expire(redisKey, Math.ceil(this.options.windowMs / 1000));
      
      // Add current request
      await this.redisClient.zAdd(redisKey, { score: now, value: now.toString() });
      
    } else {
      // Use memory store for single-instance rate limiting
      const record = this.memoryStore.get(key);
      
      if (!record || record.resetTime <= now) {
        // Reset or create new record
        currentCount = 1;
        resetTime = now + this.options.windowMs;
      } else {
        // Increment existing record
        currentCount = record.count + 1;
        resetTime = record.resetTime;
      }
      
      this.memoryStore.set(key, { count: currentCount, resetTime });
      
      // Clean up expired entries periodically
      if (Math.random() < 0.01) { // 1% chance
        this.cleanupMemoryStore();
      }
    }

    const remaining = Math.max(0, this.options.maxRequests - currentCount);
    
    // If limit exceeded, calculate retry-after time
    if (currentCount >= this.options.maxRequests) {
      const retryAfter = Math.ceil((resetTime - now) / 1000);
      
      if (this.options.onLimitReached) {
        this.options.onLimitReached(req, retryAfter);
      }
      
      this.logger.warn(`Rate limit exceeded for ${key}`, {
        count: currentCount,
        limit: this.options.maxRequests,
        retryAfter
      });
      
      return {
        limit: this.options.maxRequests,
        remaining: 0,
        reset: resetTime,
        retryAfter
      };
    }

    return {
      limit: this.options.maxRequests,
      remaining,
      reset: resetTime
    };
  }

  /**
   * Get rate limit headers
   */
  getRateLimitHeaders(info: RateLimitInfo): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': info.limit.toString(),
      'X-RateLimit-Remaining': info.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(info.reset / 1000).toString()
    };

    if (info.retryAfter) {
      headers['Retry-After'] = info.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Check if request should be allowed
   */
  async isAllowed(req: any): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const info = await this.checkLimit(req);
    const allowed = info.remaining > 0;

    return { allowed, info };
  }

  /**
   * Clean up expired memory store entries
   */
  private cleanupMemoryStore(): void {
    const now = Date.now();
    for (const [key, record] of this.memoryStore.entries()) {
      if (record.resetTime <= now) {
        this.memoryStore.delete(key);
      }
    }
  }

  /**
   * Get client IP address
   */
  private getClientIp(req: any): string {
    return req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           'unknown';
  }

  /**
   * Get current rate limit statistics
   */
  async getStats(): Promise<{
    memoryStoreSize: number;
    redisConnected: boolean;
    options: RateLimitOptions;
  }> {
    return {
      memoryStoreSize: this.memoryStore.size,
      redisConnected: this.redisClient?.isReady || false,
      options: this.options
    };
  }

  /**
   * Reset rate limit for a specific key
   */
  async resetLimit(req: any): Promise<void> {
    const key = this.options.keyGenerator ? this.options.keyGenerator(req) : this.getClientIp(req);
    
    if (this.redisClient?.isReady) {
      await this.redisClient.del(`ratelimit:${key}`);
    } else {
      this.memoryStore.delete(key);
    }
  }

  /**
   * Shutdown rate limiter
   */
  async shutdown(): Promise<void> {
    if (this.redisClient?.isReady) {
      await this.redisClient.quit();
    }
    this.memoryStore.clear();
  }
}

/**
 * Rate limiting middleware factory
 */
export function createRateLimitMiddleware(options: RateLimitOptions) {
  const rateLimiter = new EnhancedRateLimiter(options);

  return async (req: any, res: any, next: any) => {
    try {
      const { allowed, info } = await rateLimiter.isAllowed(req);

      // Set rate limit headers
      const headers = rateLimiter.getRateLimitHeaders(info);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (!allowed) {
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: info.retryAfter || Math.ceil((info.reset - Date.now()) / 1000)
        });
        return;
      }

      next();
    } catch (error) {
      // On rate limiter error, allow the request but log the error
      winston.error('Rate limiter error:', error);
      next();
    }
  };
}

/**
 * Specialized rate limiters for different use cases
 */

// Strict rate limiting for authentication (5 attempts per 15 minutes)
export const authRateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5,
  onLimitReached: (req, retryAfter) => {
    winston.warn(`Auth rate limit exceeded for ${req.ip}, retry after ${retryAfter}s`);
  }
});

// Exam generation rate limiting (10 per hour)
export const examGenerationRateLimiter = createRateLimitMiddleware({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  onLimitReached: (req, retryAfter) => {
    winston.warn(`Exam generation rate limit exceeded for ${req.ip}, retry after ${retryAfter}s`);
  }
});

// General API rate limiting (100 per 15 minutes)
export const generalRateLimiter = createRateLimitMiddleware({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  onLimitReached: (req, retryAfter) => {
    winston.warn(`General rate limit exceeded for ${req.ip}, retry after ${retryAfter}s`);
  }
});

export default EnhancedRateLimiter;