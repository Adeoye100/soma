import { Request, Response, NextFunction } from 'express';
import { createClient, RedisClientType } from 'redis';
import winston from 'winston';
import { config } from '@/config';

interface ThrottlingOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  blockOnExceed?: boolean; // Whether to block requests that exceed the limit
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onThrottleTriggered?: (req: any, retryAfter: number, reason: string) => void;
}

interface ThrottlingInfo {
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
  blocked: boolean;
  reason?: string;
}

interface RequestRecord {
  userId: string;
  contentHash: string;
  timestamp: number;
  content: string;
}

export class RequestThrottler {
  private redisClient?: RedisClientType;
  private memoryStore = new Map<string, { count: number; resetTime: number; requests: RequestRecord[] }>();
  private options: ThrottlingOptions;
  private logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
  });

  constructor(options: ThrottlingOptions) {
    this.options = options;
    this.initializeRedis();
  }

  /**
   * Initialize Redis connection for distributed throttling
   */
  private async initializeRedis(): Promise<void> {
    if (!config.redisUrl) {
      this.logger.warn('Redis URL not configured, using memory store for request throttling');
      return;
    }

    try {
      this.redisClient = createClient({
        url: config.redisUrl,
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 3) return false;
            return Math.min(retries * 50, 500);
          }
        }
      });

      this.redisClient.on('error', (err) => {
        if (config.nodeEnv === 'development' && (err as any).code === 'ECONNREFUSED') {
          // Suppress in dev to avoid noise if Redis is not running
        } else {
          this.logger.error('Redis Client Error for throttling:', err);
        }
      });

      await this.redisClient.connect();
      this.logger.info('Redis connected successfully for request throttling');
    } catch (error) {
      this.logger.warn('Redis connection failed for throttling, falling back to memory store:', error);
    }
  }

  /**
   * Generate content hash for request deduplication
   */
  private generateContentHash(content: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(content.trim().toLowerCase()).digest('hex');
  }

  /**
   * Check if request should be throttled
   */
  async checkThrottle(req: any): Promise<ThrottlingInfo> {
    const userId = req.user?.id || req.ip || 'anonymous';
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Check for empty content
    const content = JSON.stringify(req.body) || '';
    if (content.trim() === '' || content === '{}') {
      const retryAfter = Math.ceil(this.options.windowMs / 1000);
      return {
        limit: this.options.maxRequests,
        remaining: 0,
        reset: now + this.options.windowMs,
        retryAfter,
        blocked: true,
        reason: 'empty_content'
      };
    }

    // Generate content hash for duplicate detection
    const contentHash = this.generateContentHash(content);
    
    let currentCount = 0;
    let resetTime = now + this.options.windowMs;
    let requests: RequestRecord[] = [];

    if (this.redisClient?.isReady) {
      // Use Redis for distributed throttling
      const userKey = `throttle:${userId}`;
      const contentKey = `content:${userId}:${contentHash}`;
      
      // Check for duplicate content within window
      const existingContent = await this.redisClient.get(contentKey);
      if (existingContent) {
        const retryAfter = Math.ceil(this.options.windowMs / 1000);
        return {
          limit: this.options.maxRequests,
          remaining: 0,
          reset: now + this.options.windowMs,
          retryAfter,
          blocked: true,
          reason: 'duplicate_content'
        };
      }

      // Get current request count for user
      const userData = await this.redisClient.get(userKey);
      if (userData) {
        const parsed = JSON.parse(userData);
        currentCount = parsed.count || 0;
        resetTime = parsed.resetTime || (now + this.options.windowMs);
        requests = parsed.requests || [];
      }

      // Check if limit exceeded
      if (currentCount >= this.options.maxRequests) {
        const retryAfter = Math.ceil((resetTime - now) / 1000);
        
        if (this.options.onThrottleTriggered) {
          this.options.onThrottleTriggered(req, retryAfter, 'rate_limit_exceeded');
        }
        
        this.logger.warn(`Request throttling triggered for user ${userId}`, {
          count: currentCount,
          limit: this.options.maxRequests,
          reason: 'rate_limit_exceeded',
          retryAfter
        });
        
        return {
          limit: this.options.maxRequests,
          remaining: 0,
          reset: resetTime,
          retryAfter,
          blocked: true,
          reason: 'rate_limit_exceeded'
        };
      }

      // Record this request
      const newRequest: RequestRecord = {
        userId,
        contentHash,
        timestamp: now,
        content: content.substring(0, 100) // Store first 100 chars for debugging
      };

      // Update user data
      currentCount += 1;
      requests.push(newRequest);
      
      // Clean old requests
      requests = requests.filter(r => r.timestamp > windowStart);
      
      const userDataToStore = {
        count: currentCount,
        resetTime: resetTime,
        requests: requests
      };

      // Store user data and content hash
      await this.redisClient.setEx(userKey, Math.ceil(this.options.windowMs / 1000), JSON.stringify(userDataToStore));
      await this.redisClient.setEx(contentKey, Math.ceil(this.options.windowMs / 1000), '1');
      
    } else {
      // Use memory store for single-instance throttling
      const record = this.memoryStore.get(userId);
      
      if (!record || record.resetTime <= now) {
        // Reset or create new record
        currentCount = 1;
        resetTime = now + this.options.windowMs;
        requests = [{
          userId,
          contentHash,
          timestamp: now,
          content: content.substring(0, 100)
        }];
      } else {
        // Check for duplicate content in existing requests
        const hasDuplicate = record.requests.some(r => 
          r.contentHash === contentHash && r.timestamp > windowStart
        );
        
        if (hasDuplicate) {
          const retryAfter = Math.ceil(this.options.windowMs / 1000);
          return {
            limit: this.options.maxRequests,
            remaining: 0,
            reset: resetTime,
            retryAfter,
            blocked: true,
            reason: 'duplicate_content'
          };
        }

        // Check rate limit
        if (record.count >= this.options.maxRequests) {
          const retryAfter = Math.ceil((record.resetTime - now) / 1000);
          
          if (this.options.onThrottleTriggered) {
            this.options.onThrottleTriggered(req, retryAfter, 'rate_limit_exceeded');
          }
          
          this.logger.warn(`Request throttling triggered for user ${userId}`, {
            count: record.count,
            limit: this.options.maxRequests,
            reason: 'rate_limit_exceeded',
            retryAfter
          });
          
          return {
            limit: this.options.maxRequests,
            remaining: 0,
            reset: record.resetTime,
            retryAfter,
            blocked: true,
            reason: 'rate_limit_exceeded'
          };
        }

        // Increment and add new request
        currentCount = record.count + 1;
        resetTime = record.resetTime;
        requests = [...record.requests, {
          userId,
          contentHash,
          timestamp: now,
          content: content.substring(0, 100)
        }].filter(r => r.timestamp > windowStart);
      }
      
      this.memoryStore.set(userId, { count: currentCount, resetTime, requests });
      
      // Clean up expired entries periodically
      if (Math.random() < 0.01) { // 1% chance
        this.cleanupMemoryStore();
      }
    }

    const remaining = Math.max(0, this.options.maxRequests - currentCount);
    
    return {
      limit: this.options.maxRequests,
      remaining,
      reset: resetTime,
      blocked: false
    };
  }

  /**
   * Get throttling headers
   */
  getThrottlingHeaders(info: ThrottlingInfo): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Throttle-Limit': info.limit.toString(),
      'X-Throttle-Remaining': info.remaining.toString(),
      'X-Throttle-Reset': Math.ceil(info.reset / 1000).toString()
    };

    if (info.retryAfter) {
      headers['Retry-After'] = info.retryAfter.toString();
      headers['X-Throttle-Retry-After'] = info.retryAfter.toString();
    }

    if (info.blocked && info.reason) {
      headers['X-Throttle-Reason'] = info.reason;
    }

    return headers;
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
   * Reset throttling for a specific user
   */
  async resetThrottle(userId: string): Promise<void> {
    if (this.redisClient?.isReady) {
      await this.redisClient.del(`throttle:${userId}`);
      // Note: We don't delete content keys here as they expire naturally
    } else {
      this.memoryStore.delete(userId);
    }
  }

  /**
   * Get current throttling statistics
   */
  async getStats(): Promise<{
    memoryStoreSize: number;
    redisConnected: boolean;
    options: ThrottlingOptions;
  }> {
    return {
      memoryStoreSize: this.memoryStore.size,
      redisConnected: this.redisClient?.isReady || false,
      options: this.options
    };
  }

  /**
   * Shutdown throttler
   */
  async shutdown(): Promise<void> {
    if (this.redisClient?.isReady) {
      await this.redisClient.quit();
    }
    this.memoryStore.clear();
  }
}

/**
 * Create throttling middleware factory
 */
export function createThrottlingMiddleware(options: ThrottlingOptions) {
  const throttler = new RequestThrottler(options);

  return async (req: any, res: any, next: any) => {
    try {
      const info = await throttler.checkThrottle(req);

      // Set throttling headers
      const headers = throttler.getThrottlingHeaders(info);
      Object.entries(headers).forEach(([key, value]) => {
        res.setHeader(key, value);
      });

      if (info.blocked) {
        const errorMessages = {
          empty_content: 'Request content cannot be empty. Please provide valid input.',
          duplicate_content: 'This request appears to be identical to a recent one. Please wait before submitting again.',
          rate_limit_exceeded: `Too many requests. Please wait ${info.retryAfter} seconds before making another request.`
        };

        const message = errorMessages[info.reason as keyof typeof errorMessages] || 
                       'Request throttled. Please try again later.';

        res.status(429).json({
          error: 'Request Throttled',
          message,
          code: info.reason || 'THROTTLED',
          retryAfter: info.retryAfter,
          throttling: {
            limit: info.limit,
            remaining: info.remaining,
            reset: info.reset,
            reason: info.reason
          }
        });
        return;
      }

      next();
    } catch (error) {
      // On throttler error, allow the request but log the error
      winston.error('Request throttling error:', error);
      next();
    }
  };
}

/**
 * Specialized throttling configurations
 */

// User request throttling (5-10 seconds between requests)
export const userRequestThrottler = createThrottlingMiddleware({
  windowMs: 10000, // 10 seconds
  maxRequests: 1, // One request per window
  blockOnExceed: true,
  onThrottleTriggered: (req, retryAfter, reason) => {
    winston.warn(`User request throttling triggered for ${req.user?.id || req.ip}`, {
      reason,
      retryAfter,
      userId: req.user?.id,
      ip: req.ip
    });
  }
});

// AI generation specific throttling (stricter for AI endpoints)
export const aiGenerationThrottler = createThrottlingMiddleware({
  windowMs: 15000, // 15 seconds for AI operations
  maxRequests: 1,
  blockOnExceed: true,
  onThrottleTriggered: (req, retryAfter, reason) => {
    winston.warn(`AI generation throttling triggered for ${req.user?.id || req.ip}`, {
      reason,
      retryAfter,
      endpoint: req.path,
      userId: req.user?.id
    });
  }
});

// Search/thinking throttling (more lenient for search operations)
export const searchThrottler = createThrottlingMiddleware({
  windowMs: 5000, // 5 seconds for search operations
  maxRequests: 3, // Allow 3 searches per 5 seconds
  blockOnExceed: true,
  onThrottleTriggered: (req, retryAfter, reason) => {
    winston.warn(`Search throttling triggered for ${req.user?.id || req.ip}`, {
      reason,
      retryAfter,
      endpoint: req.path
    });
  }
});

export default RequestThrottler;