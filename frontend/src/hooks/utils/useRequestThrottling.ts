import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounce hook for preventing rapid successive calls
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook for limiting function call frequency
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCall = useRef<number>(0);
  const timeout = useRef<NodeJS.Timeout | null>(null);
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  return useCallback(((...args: any[]) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCall.current;

    if (timeSinceLastCall >= delay) {
      lastCall.current = now;
      return savedCallback.current(...args);
    } else {
      // Clear existing timeout and set a new one
      if (timeout.current) {
        clearTimeout(timeout.current);
      }
      
      timeout.current = setTimeout(() => {
        lastCall.current = Date.now();
        savedCallback.current(...args);
      }, delay - timeSinceLastCall);
    }
  }) as T, [delay]);
}

/**
 * Request throttling state and utilities
 */
export interface ThrottlingState {
  isThrottled: boolean;
  remainingTime: number;
  lastRequest: number;
  canMakeRequest: boolean;
}

export interface UseRequestThrottlingOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  onThrottleStart?: () => void;
  onThrottleEnd?: () => void;
  onThrottleUpdate?: (remainingTime: number) => void;
}

/**
 * Hook for managing request throttling state
 */
export function useRequestThrottling(options: UseRequestThrottlingOptions) {
  const [state, setState] = useState<ThrottlingState>({
    isThrottled: false,
    remainingTime: 0,
    lastRequest: 0,
    canMakeRequest: true
  });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const updateRemainingTime = useCallback(() => {
    const now = Date.now();
    const timeSinceLastRequest = now - state.lastRequest;
    const remaining = Math.max(0, options.windowMs - timeSinceLastRequest);
    
    setState(prev => ({
      ...prev,
      remainingTime: remaining,
      canMakeRequest: remaining === 0,
      isThrottled: remaining > 0
    }));

    if (remaining > 0) {
      options.onThrottleUpdate?.(remaining);
    } else {
      setState(prev => ({
        ...prev,
        isThrottled: false,
        canMakeRequest: true
      }));
      options.onThrottleEnd?.();
      clearTimers();
    }
  }, [state.lastRequest, options.windowMs, options.onThrottleUpdate, options.onThrottleEnd, clearTimers]);

  const startThrottling = useCallback(() => {
    const now = Date.now();
    setState(prev => ({
      ...prev,
      lastRequest: now,
      isThrottled: true,
      canMakeRequest: false,
      remainingTime: options.windowMs
    }));

    options.onThrottleStart?.();

    // Update remaining time periodically
    intervalRef.current = setInterval(updateRemainingTime, 100);

    // Clear throttling after window expires
    timeoutRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isThrottled: false,
        canMakeRequest: true,
        remainingTime: 0
      }));
      options.onThrottleEnd?.();
      clearTimers();
    }, options.windowMs);
  }, [options.windowMs, options.onThrottleStart, options.onThrottleEnd, updateRemainingTime, clearTimers]);

  const canMakeRequest = useCallback(() => {
    return state.canMakeRequest && !state.isThrottled;
  }, [state.canMakeRequest, state.isThrottled]);

  const recordRequest = useCallback(() => {
    if (canMakeRequest()) {
      startThrottling();
      return true;
    }
    return false;
  }, [canMakeRequest, startThrottling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, [clearTimers]);

  return {
    ...state,
    canMakeRequest,
    recordRequest,
    clearThrottling: clearTimers
  };
}

/**
 * Content deduplication utilities
 */
export class ContentDeduplicator {
  private cache = new Map<string, { hash: string; timestamp: number }>();
  private readonly maxCacheSize = 100;
  private readonly cacheExpirationMs = 10000; // 10 seconds

  /**
   * Generate hash for content
   */
  private generateHash(content: string): string {
    let hash = 0;
    if (content.length === 0) return hash.toString();
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString();
  }

  /**
   * Check if content is duplicate
   */
  isDuplicate(content: string): boolean {
    const normalizedContent = content.trim().toLowerCase();
    const hash = this.generateHash(normalizedContent);
    const now = Date.now();

    // Clean expired entries
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheExpirationMs) {
        this.cache.delete(key);
      }
    }

    // Check if similar content exists
    for (const [_, value] of this.cache.entries()) {
      if (value.hash === hash) {
        return true;
      }
    }

    // Store new content
    this.addToCache(normalizedContent, hash);
    return false;
  }

  /**
   * Add content to cache
   */
  private addToCache(content: string, hash: string): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(content, {
      hash,
      timestamp: Date.now()
    });
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize
    };
  }
}

/**
 * Request queue for managing pending requests
 */
export interface QueuedRequest {
  id: string;
  timestamp: number;
  content: string;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

export class RequestQueue {
  private queue: QueuedRequest[] = [];
  private isProcessing = false;
  private readonly maxQueueSize = 10;
  private readonly maxWaitTime = 30000; // 30 seconds

  /**
   * Add request to queue
   */
  add(content: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        content,
        resolve,
        reject
      };

      // Remove expired requests
      this.cleanup();

      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error('Request queue is full. Please try again later.'));
        return;
      }

      this.queue.push(request);

      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const request = this.queue.shift()!;
      
      // Check if request has expired
      if (Date.now() - request.timestamp > this.maxWaitTime) {
        request.reject(new Error('Request timeout'));
        continue;
      }

      try {
        // Simulate request processing (replace with actual API call)
        const result = await this.processRequest(request.content);
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }

      // Small delay between requests to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }

  /**
   * Simulate request processing (replace with actual implementation)
   */
  private async processRequest(content: string): Promise<any> {
    // This would be replaced with actual API call
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ processed: true, content: content.substring(0, 50) });
      }, 500);
    });
  }

  /**
   * Clean up expired requests
   */
  private cleanup(): void {
    const now = Date.now();
    this.queue = this.queue.filter(request => 
      now - request.timestamp <= this.maxWaitTime
    );
  }

  /**
   * Get queue statistics
   */
  getStats(): { 
    pending: number; 
    maxSize: number; 
    isProcessing: boolean; 
  } {
    return {
      pending: this.queue.length,
      maxSize: this.maxQueueSize,
      isProcessing: this.isProcessing
    };
  }

  /**
   * Clear all queued requests
   */
  clear(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Request queue cleared'));
    });
    this.queue = [];
  }
}

// Global instances
export const contentDeduplicator = new ContentDeduplicator();
export const requestQueue = new RequestQueue();

export default {
  useDebounce,
  useThrottle,
  useRequestThrottling,
  ContentDeduplicator,
  RequestQueue,
  contentDeduplicator,
  requestQueue
};