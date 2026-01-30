import { EventEmitter } from 'events';
import { AutomationLogger } from '../../infrastructure/monitoring/AutomationLogger';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedError?: ErrorConstructor;
  fallback?: (...args: any[]) => Promise<any>;
}

export interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failures: number;
  lastFailureTime: number;
  nextAttempt: number;
}

export class CircuitBreaker extends EventEmitter {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private logger: AutomationLogger;
  private recentFailures: number[] = [];

  constructor(config: CircuitBreakerConfig, logger?: AutomationLogger) {
    super();
    this.config = {
      failureThreshold: 5,
      resetTimeout: 60000,
      monitoringPeriod: 10000,
      ...config
    };
    this.logger = logger || new AutomationLogger('CircuitBreaker');
    this.state = {
      status: 'CLOSED',
      failures: 0,
      lastFailureTime: 0,
      nextAttempt: 0
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    this.cleanupOldFailures();

    if (this.state.status === 'OPEN') {
      if (Date.now() < this.state.nextAttempt) {
        return this.handleOpenCircuit<T>();
      } else {
        this.state.status = 'HALF_OPEN';
        this.logger.info('Circuit breaker moved to HALF_OPEN state');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private cleanupOldFailures(): void {
    const now = Date.now();
    const cutoff = now - this.config.monitoringPeriod;
    this.recentFailures = this.recentFailures.filter(time => time > cutoff);
  }

  private onSuccess(): void {
    this.state.failures = 0;
    this.state.lastFailureTime = 0;
    
    if (this.state.status === 'HALF_OPEN') {
      this.state.status = 'CLOSED';
      this.recentFailures = [];
      this.logger.info('Circuit breaker moved to CLOSED state');
      this.emit('circuitClosed');
    }
  }

  private onFailure(error: unknown): void {
    const now = Date.now();
    this.state.failures++;
    this.state.lastFailureTime = now;
    this.recentFailures.push(now);

    // Check if failure threshold is reached
    const recentFailureCount = this.recentFailures.length;
    const shouldOpen = recentFailureCount >= this.config.failureThreshold;

    if (shouldOpen) {
      this.state.status = 'OPEN';
      this.state.nextAttempt = now + this.config.resetTimeout;
      this.logger.warn(`Circuit breaker moved to OPEN state after ${recentFailureCount} failures`);
      this.emit('circuitOpened', error);
    }

    this.emit('failure', error);
  }

  private async handleOpenCircuit<T>(): Promise<T> {
    this.logger.warn('Circuit breaker is OPEN, executing fallback if available');
    
    if (this.config.fallback) {
      try {
        return await this.config.fallback() as T;
      } catch (fallbackError) {
        this.logger.error('Fallback also failed', fallbackError);
        throw fallbackError;
      }
    }

    throw new Error('Circuit breaker is OPEN and no fallback is configured');
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  isClosed(): boolean {
    return this.state.status === 'CLOSED';
  }

  isOpen(): boolean {
    return this.state.status === 'OPEN';
  }

  isHalfOpen(): boolean {
    return this.state.status === 'HALF_OPEN';
  }

  // Manual reset for testing or administrative purposes
  reset(): void {
    this.state = {
      status: 'CLOSED',
      failures: 0,
      lastFailureTime: 0,
      nextAttempt: 0
    };
    this.recentFailures = [];
    this.logger.info('Circuit breaker manually reset');
    this.emit('circuitReset');
  }

  // Get statistics for monitoring
  getStatistics(): {
    status: string;
    failures: number;
    recentFailureCount: number;
    lastFailureTime: number;
    nextAttempt: number;
  } {
    this.cleanupOldFailures();
    return {
      status: this.state.status,
      failures: this.state.failures,
      recentFailureCount: this.recentFailures.length,
      lastFailureTime: this.state.lastFailureTime,
      nextAttempt: this.state.nextAttempt
    };
  }
}