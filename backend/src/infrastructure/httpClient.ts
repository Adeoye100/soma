/**
 * Centralized HTTP client with proper retry logic, caching, and request deduplication
 */

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryOnStatusCodes: number[];
  retryOnErrors: string[];
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RequestConfig {
  timeout?: number;
  retries?: Partial<RetryConfig>;
  cache?: {
    ttl: number;
    key: string;
  };
  deduplicate?: boolean;
}

class RequestDeduplication {
  private pendingRequests = new Map<string, Promise<any>>();

  async deduplicate<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    const promise = requestFn()
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

class ResponseCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

export class HttpClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private retryConfig: RetryConfig;
  private cache: ResponseCache;
  private deduplicator: RequestDeduplication;

  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    };
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
      retryOnStatusCodes: [408, 429, 500, 502, 503, 504],
      retryOnErrors: ['network', 'timeout', 'ECONNRESET', 'ECONNREFUSED']
    };
    this.cache = new ResponseCache();
    this.deduplicator = new RequestDeduplication();
  }

  /**
   * Make HTTP request with retry logic, caching, and deduplication
   */
  async request<T>(
    method: string,
    endpoint: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const requestId = `${method}:${url}:${JSON.stringify(data)}`;
    const cacheKey = config.cache?.key || requestId;

    // Check cache first (for GET requests and cached requests)
    if (method === 'GET' && config.cache) {
      const cached = this.cache.get<T>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Use request deduplication if enabled
    const executeRequest = async () => {
      return this.executeWithRetry<T>(method, url, data, config);
    };

    const result = config.deduplicate 
      ? await this.deduplicator.deduplicate(requestId, executeRequest)
      : await executeRequest();

    // Cache successful GET responses
    if (method === 'GET' && config.cache && result) {
      this.cache.set(cacheKey, result, config.cache.ttl);
    }

    return result;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    method: string,
    url: string,
    data?: any,
    config: RequestConfig = {}
  ): Promise<T> {
    const retryConfig = { ...this.retryConfig, ...config.retries };
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(method, url, data, config.timeout);
        
        // Don't retry on 429 - let the caller handle rate limiting
        if (response.status === 429) {
          throw new HttpError('Too Many Requests', 429, await response.text());
        }

        if (response.ok) {
          return await response.json() as T;
        }

        // Retry on specific status codes
        if (retryConfig.retryOnStatusCodes.includes(response.status)) {
          throw new HttpError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            await response.text()
          );
        }

        // Don't retry on client errors (4xx except 429)
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
        if (attempt === retryConfig.maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error as Error, retryConfig)) {
          break;
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(retryConfig.backoffMultiplier, attempt),
          retryConfig.maxDelay
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
    url: string,
    data?: any,
    timeout: number = 30000
  ): Promise<Response> {
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
  private isRetryableError(error: Error, config: RetryConfig): boolean {
    if (error instanceof HttpError) {
      return config.retryOnStatusCodes.includes(error.status);
    }

    // Check for network errors
    const errorMessage = error.message.toLowerCase();
    return config.retryOnErrors.some(errorType => 
      errorMessage.includes(errorType.toLowerCase())
    );
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cache management
   */
  clearCache(): void {
    this.cache.clear();
  }

  deleteFromCache(key: string): void {
    this.cache.delete(key);
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Convenience methods
   */
  async get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('GET', endpoint, undefined, config);
  }

  async post<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>('POST', endpoint, data, config);
  }

  async put<T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> {
    return this.request<T>('PUT', endpoint, data, config);
  }

  async delete<T>(endpoint: string, config?: RequestConfig): Promise<T> {
    return this.request<T>('DELETE', endpoint, undefined, config);
  }
}

/**
 * Custom HTTP Error class
 */
export class HttpError extends Error {
  public status: number;
  public response?: string;

  constructor(message: string, status: number, response?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.response = response || undefined;
  }
}

export default HttpClient;