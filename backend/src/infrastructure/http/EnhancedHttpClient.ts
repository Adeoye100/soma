import { HttpError } from '../../shared/errors';
import { ServiceResult } from '../../shared/types';

/**
 * Token Bucket Rate Limiter Implementation
 * Provides more sophisticated rate limiting than simple sliding window
 */
class TokenBucketRateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly capacity: number,
    private readonly refillRate: number // tokens per millisecond
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  async acquireTokens(count: number = 1): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const timePassed = now - this.lastRefill;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * Leaky Bucket Rate Limiter Implementation
 * Alternative rate limiting strategy for different use cases
 */
class LeakyBucketRateLimiter {
  private queue: Array<() => void> = [];
  private processing: boolean = false;

  constructor(
    private readonly capacity: number,
    private readonly leakRate: number // requests per millisecond
  ) {}

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (this.queue.length < this.capacity) {
        this.queue.push(resolve);
        this.processQueue();
      } else {
        // Queue is full, reject the request
        resolve();
      }
    });
  }

  private processQueue(): void {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    
    setTimeout(() => {
      const request = this.queue.shift();
      if (request) {
        request();
      }
      this.processing = false;
      this.processQueue();
    }, this.leakRate);
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

/**
 * Request Deduplication Manager
 * Prevents duplicate requests from being made simultaneously
 */
class RequestDeduplicationManager {
  private pendingRequests = new Map<string, Promise<any>>();
  private requestHistory = new Map<string, {
    timestamp: number;
    result?: any;
    error?: Error;
  }>();

  async deduplicate<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = 5000 // 5 seconds default TTL
  ): Promise<T> {
    // Check if request is already pending
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Check if we have a recent cached result
    const cached = this.requestHistory.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      if (cached.error) {
        throw cached.error;
      }
      return cached.result;
    }

    // Create new request
    const promise = requestFn()
      .then(result => {
        this.requestHistory.set(key, {
          timestamp: Date.now(),
          result
        });
        return result;
      })
      .catch(error => {
        this.requestHistory.set(key, {
          timestamp: Date.now(),
          error
        });
        throw error;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  clearHistory(): void {
    this.requestHistory.clear();
  }

  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      cachedResults: this.requestHistory.size,
      keys: Array.from(this.requestHistory.keys())
    };
  }
}

/**
 * Intelligent Response Cache
 * Provides sophisticated caching with TTL, size limits, and cache invalidation
 */
class IntelligentResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder: string[] = []; // For LRU eviction

  constructor(
    private readonly maxSize: number = 1000,
    private readonly defaultTtl: number = 300000 // 5 minutes
  ) {}

  set<T>(key: string, data: T, ttl?: number): void {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl,
      accessCount: 0,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.addToAccessOrder(key);

    // Evict oldest entries if cache is full
    this.evictIfNeeded();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update access statistics for LRU
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.moveToEndOfAccessOrder(key);

    return entry.data;
  }

  delete(key: string): boolean {
    const existed = this.cache.delete(key);
    if (existed) {
      this.removeFromAccessOrder(key);
    }
    return existed;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  private evictIfNeeded(): void {
    while (this.cache.size > this.maxSize) {
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  private addToAccessOrder(key: string): void {
    this.accessOrder.push(key);
  }

  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  private moveToEndOfAccessOrder(key: string): void {
    this.removeFromAccessOrder(key);
    this.addToAccessOrder(key);
  }

  getStats() {
    const now = Date.now();
    let expiredCount = 0;

    this.cache.forEach(entry => {
      if (now - entry.timestamp > entry.ttl) {
        expiredCount++;
      }
    });

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      expiredCount,
      hitRate: this.calculateHitRate(),
      accessOrder: this.accessOrder.slice(0, 10) // First 10 accessed keys
    };
  }

  private calculateHitRate(): number {
    const totalAccesses = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.accessCount, 0);
    
    return totalAccesses > 0 ? totalAccesses / this.cache.size : 0;
  }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

/**
 * Enhanced HTTP Client with comprehensive rate limiting, caching, and deduplication
 */
export class EnhancedHttpClient {
  private readonly deduplicationManager: RequestDeduplicationManager;
  private readonly responseCache: IntelligentResponseCache;
  private readonly tokenBucketLimiters: Map<string, TokenBucketRateLimiter>;
  private readonly leakyBucketLimiters: Map<string, LeakyBucketRateLimiter>;

  constructor(
    private readonly baseURL: string,
    private readonly defaultHeaders: Record<string, string> = {},
    private readonly config: {
      rateLimiters?: {
        [key: string]: {
          type: 'token-bucket' | 'leaky-bucket';
          capacity: number;
          rate: number;
        };
      };
      cache?: {
        maxSize?: number;
        defaultTtl?: number;
      };
      retry?: {
        maxRetries: number;
        baseDelay: number;
        maxDelay: number;
        backoffMultiplier: number;
      };
    } = {}
  ) {
    this.deduplicationManager = new RequestDeduplicationManager();
    this.responseCache = new IntelligentResponseCache(
      config.cache?.maxSize || 1000,
      config.cache?.defaultTtl || 300000
    );
    this.tokenBucketLimiters = new Map();
    this.leakyBucketLimiters = new Map();

    // Initialize rate limiters
    if (config.rateLimiters) {
      Object.entries(config.rateLimiters).forEach(([key, limiterConfig]) => {
        if (limiterConfig.type === 'token-bucket') {
          this.tokenBucketLimiters.set(
            key,
            new TokenBucketRateLimiter(limiterConfig.capacity, limiterConfig.rate)
          );
        } else {
          this.leakyBucketLimiters.set(
            key,
            new LeakyBucketRateLimiter(limiterConfig.capacity, limiterConfig.rate)
          );
        }
      });
    }
  }

  /**
   * Make HTTP request with comprehensive rate limiting, caching, and deduplication
   */
  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: {
      rateLimiterKey?: string;
      cache?: {
        enabled: boolean;
        ttl?: number;
        key?: string;
      };
      deduplicate?: boolean;
      deduplicateKey?: string;
      timeout?: number;
      retries?: {
        max?: number;
        delay?: number;
        maxDelay?: number;
      };
    } = {}
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    const cacheKey = options.cache?.key || `${method}:${endpoint}:${JSON.stringify(data)}`;

    try {
      // Apply rate limiting
      await this.applyRateLimit(options.rateLimiterKey);

      // Check cache first (for GET requests and cached responses)
      if (method === 'GET' && options.cache?.enabled) {
        const cached = this.responseCache.get<T>(cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            metadata: {
              executionTime: Date.now() - startTime,
              cacheHit: true
            }
          };
        }
      }

      // Use request deduplication if enabled
      const requestFn = () => this.executeWithRetry<T>(method, endpoint, data, options);
      
      const result = options.deduplicate 
        ? await this.deduplicationManager.deduplicate(
            options.deduplicateKey || cacheKey,
            requestFn,
            5000 // 5 seconds TTL for deduplication
          )
        : await requestFn();

      // Cache successful GET responses
      if (method === 'GET' && options.cache?.enabled) {
        this.responseCache.set(cacheKey, result, options.cache.ttl);
      }

      return {
        success: true,
        data: result,
        metadata: {
          executionTime: Date.now() - startTime,
          cacheHit: false
        }
      };

    } catch (error) {
      return {
        success: false,
        error: {
          code: error instanceof HttpError ? `HTTP_${error.status}` : 'REQUEST_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        },
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Apply rate limiting using configured limiters
   */
  private async applyRateLimit(limiterKey?: string): Promise<void> {
    if (!limiterKey) return;

    const tokenBucket = this.tokenBucketLimiters.get(limiterKey);
    const leakyBucket = this.leakyBucketLimiters.get(limiterKey);

    if (tokenBucket) {
      const acquired = await tokenBucket.acquireTokens(1);
      if (!acquired) {
        throw new Error(`Rate limit exceeded for ${limiterKey}`);
      }
    } else if (leakyBucket) {
      await leakyBucket.acquire();
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    method: string,
    endpoint: string,
    data?: any,
    options: any = {}
  ): Promise<T> {
    const maxRetries = options.retries?.max || 3;
    const baseDelay = options.retries?.delay || 1000;
    const maxDelay = options.retries?.maxDelay || 30000;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(method, endpoint, data, options.timeout);
        
        // Don't retry on 429 - let the caller handle rate limiting
        if (response.status === 429) {
          throw new HttpError('Too Many Requests', 429, await response.text());
        }

        if (response.ok) {
          return await response.json() as T;
        }

        // Retry on specific status codes
        if ([408, 500, 502, 503, 504].includes(response.status)) {
          throw new HttpError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            await response.text()
          );
        }

        // Don't retry on client errors (4xx except 408)
        throw new HttpError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          await response.text()
        );

      } catch (error) {
        lastError = error as Error;

        // Don't retry on 429
        if (error instanceof HttpError && error.status === 429) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(2, attempt),
          maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitter = delay * 0.1 * Math.random();
        const totalDelay = delay + jitter;

        await this.delay(totalDelay);
      }
    }

    throw lastError;
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    data?: any,
    timeout: number = 30000
  ): Promise<Response> {
    const url = `${this.baseURL}${endpoint}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const options: RequestInit = {
        method,
        headers: { ...this.defaultHeaders },
        signal: controller.signal
      };

      if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
      }

      return await fetch(url, options);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: Error): boolean {
    if (error instanceof HttpError) {
      return [408, 500, 502, 503, 504].includes(error.status);
    }

    // Check for network errors
    const errorMessage = error.message.toLowerCase();
    return ['network', 'timeout', 'econnreset', 'econnrefused'].some(errorType => 
      errorMessage.includes(errorType)
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Convenience methods
   */
  async get<T>(endpoint: string, options?: any): Promise<ServiceResult<T>> {
    return this.request<T>('GET', endpoint, undefined, options);
  }

  async post<T>(endpoint: string, data?: any, options?: any): Promise<ServiceResult<T>> {
    return this.request<T>('POST', endpoint, data, options);
  }

  async put<T>(endpoint: string, data?: any, options?: any): Promise<ServiceResult<T>> {
    return this.request<T>('PUT', endpoint, data, options);
  }

  async delete<T>(endpoint: string, options?: any): Promise<ServiceResult<T>> {
    return this.request<T>('DELETE', endpoint, undefined, options);
  }

  /**
   * Cache and deduplication management
   */
  clearCache(): void {
    this.responseCache.clear();
  }

  clearDeduplicationHistory(): void {
    this.deduplicationManager.clearHistory();
  }

  getCacheStats() {
    return this.responseCache.getStats();
  }

  getDeduplicationStats() {
    return this.deduplicationManager.getStats();
  }

  getRateLimiterStats() {
    const stats: any = {};
    
    this.tokenBucketLimiters.forEach((limiter, key) => {
      stats[key] = {
        type: 'token-bucket',
        availableTokens: limiter.getAvailableTokens()
      };
    });

    this.leakyBucketLimiters.forEach((limiter, key) => {
      stats[key] = {
        type: 'leaky-bucket',
        queueSize: limiter.getQueueSize()
      };
    });

    return stats;
  }
}

export default EnhancedHttpClient;
