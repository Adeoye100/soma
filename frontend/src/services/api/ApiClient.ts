// Enhanced API Client with comprehensive error handling, caching, and deduplication
import { CONFIG } from '../../config/api';
import { ServiceResult } from '../../types/shared';

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retries?: {
    max?: number;
    delay?: number;
  };
  cache?: {
    enabled: boolean;
    ttl?: number;
  };
  deduplicate?: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class RequestDeduplicationManager {
  private pendingRequests = new Map<string, Promise<any>>();
  private requestHistory = new Map<string, { timestamp: number; result?: any; error?: Error }>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>, ttl: number = 5000): Promise<T> {
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
      cachedResults: this.requestHistory.size
    };
  }
}

class IntelligentResponseCache {
  private cache = new Map<string, CacheEntry<any>>();
  private accessOrder: string[] = [];

  constructor(
    private readonly maxSize: number = 100,
    private readonly defaultTtl: number = 300000
  ) {}

  set<T>(key: string, data: T, ttl?: number): void {
    if (this.cache.has(key)) {
      this.removeFromAccessOrder(key);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTtl
    };

    this.cache.set(key, entry);
    this.addToAccessOrder(key);
    this.evictIfNeeded();
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key);
      return null;
    }

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
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      accessOrder: this.accessOrder.slice(0, 5)
    };
  }
}

export class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private deduplicationManager: RequestDeduplicationManager;
  private responseCache: IntelligentResponseCache;

  constructor(
    baseURL: string = CONFIG.API.baseURL,
    defaultHeaders: Record<string, string> = CONFIG.API.headers
  ) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
    this.deduplicationManager = new RequestDeduplicationManager();
    this.responseCache = new IntelligentResponseCache(
      CONFIG.API.cache.maxSize,
      CONFIG.API.cache.defaultTTL
    );
  }

  /**
   * Make HTTP request with comprehensive error handling, caching, and deduplication
   */
  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ServiceResult<T>> {
    const startTime = Date.now();
    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = `${config.method || 'GET'}:${url}:${JSON.stringify(config.body || {})}`;

    try {
      // Check cache for GET requests
      if ((config.method || 'GET') === 'GET' && config.cache?.enabled) {
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
      const requestFn = () => this.executeWithRetry<T>(url, config);
      
      const result = config.deduplicate 
        ? await this.deduplicationManager.deduplicate(cacheKey, requestFn)
        : await requestFn();

      // Cache successful GET responses
      if ((config.method || 'GET') === 'GET' && config.cache?.enabled) {
        this.responseCache.set(cacheKey, result, config.cache.ttl);
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
          code: this.getErrorCode(error),
          message: this.getErrorMessage(error),
          details: error
        },
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    url: string,
    config: RequestConfig
  ): Promise<T> {
    const maxRetries = config.retries?.max || CONFIG.API.retryAttempts;
    const baseDelay = config.retries?.delay || CONFIG.API.retryDelay;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(url, config);
        
        if (response.ok) {
          return await response.json();
        }

        // Don't retry on certain status codes
        if ([400, 401, 403, 404, 422].includes(response.status)) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Retry on server errors and rate limiting
        if ([429, 500, 502, 503, 504].includes(response.status) && attempt < maxRetries) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      } catch (error) {
        lastError = error as Error;

        // Don't retry on last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(baseDelay * Math.pow(2, attempt), 10000);
        await this.delay(delay);
      }
    }

    throw lastError;
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(
    url: string,
    config: RequestConfig
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout || CONFIG.API.timeout);

    try {
      const options: RequestInit = {
        method: config.method || 'GET',
        headers: { ...this.defaultHeaders, ...config.headers },
        signal: controller.signal,
        credentials: 'include'
      };

      if (config.body && options.method !== 'GET') {
        options.body = JSON.stringify(config.body);
      }

      return await fetch(url, options);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Get error code from error
   */
  private getErrorCode(error: any): string {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    if (error.name === 'AbortError') {
      return 'TIMEOUT_ERROR';
    }
    if (error.message.includes('429')) {
      return 'RATE_LIMIT_ERROR';
    }
    if (error.message.includes('401')) {
      return 'AUTHENTICATION_ERROR';
    }
    if (error.message.includes('403')) {
      return 'AUTHORIZATION_ERROR';
    }
    if (error.message.includes('404')) {
      return 'NOT_FOUND_ERROR';
    }
    if (error.message.includes('422')) {
      return 'VALIDATION_ERROR';
    }
    if (error.message.includes('5')) {
      return 'SERVER_ERROR';
    }
    return 'UNKNOWN_ERROR';
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(error: any): string {
    const code = this.getErrorCode(error);
    return CONFIG.ERROR.userFriendlyMessages[code as keyof typeof CONFIG.ERROR.userFriendlyMessages] || 
           error.message || 
           'An unexpected error occurred';
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods
  async get<T>(endpoint: string, config?: RequestConfig): Promise<ServiceResult<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ServiceResult<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<ServiceResult<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<ServiceResult<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // Cache management
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
}

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
