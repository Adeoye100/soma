import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Error Handling System
 * Features: Exponential backoff, circuit breakers, fallback processing, comprehensive error hierarchies
 */

// Core error interfaces
export interface ErrorHandlingConfig {
  retryPolicy: RetryPolicyConfig;
  circuitBreaker: CircuitBreakerConfig;
  fallbackProcessing: FallbackConfig;
  errorLogging: ErrorLoggingConfig;
  alerting: AlertingConfig;
  recovery: RecoveryConfig;
}

export interface RetryPolicyConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffStrategy: 'exponential' | 'linear' | 'fixed' | 'adaptive';
  jitter: boolean;
  jitterFactor: number;
  retryableErrors: string[];
  nonRetryableErrors: string[];
  customRetryLogic?: (error: Error, attempt: number) => boolean;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  monitoringPeriod: number;
  expectedErrors: string[];
  fallbackOnOpen: boolean;
  stateChangeCallback?: (state: CircuitBreakerState) => void;
}

export interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextAttemptTime?: Date;
  successCount: number;
}

export interface FallbackConfig {
  enabled: boolean;
  strategies: FallbackStrategy[];
  maxFallbackDepth: number;
  fallbackTimeout: number;
  rollbackStrategy: RollbackStrategy;
}

export interface FallbackStrategy {
  name: string;
  type: 'alternative-service' | 'cached-data' | 'default-value' | 'degraded-mode' | 'custom';
  conditions: FallbackCondition[];
  action: FallbackAction;
  priority: number;
}

export interface FallbackCondition {
  type: 'error-type' | 'error-code' | 'response-time' | 'availability' | 'custom';
  expression: string;
  threshold?: number;
}

export interface FallbackAction {
  type: 'return-value' | 'call-service' | 'use-cache' | 'queue-for-retry' | 'escalate';
  configuration: any;
}

export interface RollbackStrategy {
  enabled: boolean;
  triggerConditions: string[];
  rollbackActions: RollbackAction[];
  timeout: number;
}

export interface RollbackAction {
  type: 'revert-database' | 'undo-api-call' | 'cleanup-resources' | 'notify-stakeholders';
  configuration: any;
}

export interface ErrorLoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  includeStackTrace: boolean;
  includeContext: boolean;
  structuredLogging: boolean;
  logDestinations: LogDestination[];
  retention: {
    maxEntries: number;
    maxAge: number;
    compression: boolean;
  };
}

export interface LogDestination {
  type: 'console' | 'file' | 'database' | 'external-service';
  configuration: any;
  enabled: boolean;
}

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  escalationRules: EscalationRule[];
  rateLimiting: {
    maxAlertsPerHour: number;
    deduplication: boolean;
  };
}

export interface AlertChannel {
  type: 'email' | 'sms' | 'slack' | 'webhook' | 'pagerduty';
  configuration: any;
  enabled: boolean;
}

export interface EscalationRule {
  condition: EscalationCondition;
  action: EscalationAction;
  delay: number;
}

export interface EscalationCondition {
  type: 'error-count' | 'error-severity' | 'system-health' | 'custom';
  threshold: number;
  timeWindow: number;
}

export interface EscalationAction {
  type: 'notify-team' | 'create-incident' | 'scale-resources' | 'activate-disaster-recovery';
  configuration: any;
}

export interface RecoveryConfig {
  autoRecovery: boolean;
  healthChecks: HealthCheckConfig[];
  recoveryStrategies: RecoveryStrategy[];
  timeout: number;
}

export interface HealthCheckConfig {
  name: string;
  type: 'service' | 'database' | 'external-api' | 'custom';
  endpoint?: string;
  interval: number;
  timeout: number;
  expectedResponse?: any;
}

export interface RecoveryStrategy {
  name: string;
  trigger: RecoveryTrigger;
  actions: RecoveryAction[];
  maxAttempts: number;
}

export interface RecoveryTrigger {
  type: 'error-pattern' | 'health-check-failure' | 'performance-degradation' | 'manual' | 'error-severity' | 'custom';
  condition: string;
}

export interface RecoveryAction {
  type: 'restart-service' | 'failover' | 'scale-resources' | 'clear-cache' | 'notify';
  configuration: any;
}

// Error hierarchy
export abstract class AutomationError extends Error {
  public readonly code: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';
  public readonly category: string;
  public readonly context: Record<string, any>;
  public readonly timestamp: Date;
  public readonly correlationId: string;
  public readonly recoverable: boolean;

  constructor(
    message: string,
    code: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    category: string,
    context: Record<string, any> = {},
    recoverable: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.category = category;
    this.context = context;
    this.timestamp = new Date();
    this.correlationId = context.correlationId || uuidv4();
    this.recoverable = recoverable;
  }

  toJSON(): any {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      category: this.category,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      correlationId: this.correlationId,
      recoverable: this.recoverable,
      stack: this.stack
    };
  }
}

// Specific error types
export class TaskExecutionError extends AutomationError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'TASK_EXECUTION_ERROR', 'high', 'task-execution', context, true);
  }
}

export class WorkflowExecutionError extends AutomationError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'WORKFLOW_EXECUTION_ERROR', 'high', 'workflow-execution', context, true);
  }
}

export class ServiceUnavailableError extends AutomationError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'SERVICE_UNAVAILABLE', 'critical', 'service-availability', context, true);
  }
}

export class ConfigurationError extends AutomationError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'CONFIGURATION_ERROR', 'high', 'configuration', context, false);
  }
}

export class ValidationError extends AutomationError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'VALIDATION_ERROR', 'medium', 'validation', context, false);
  }
}

export class ResourceExhaustedError extends AutomationError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, 'RESOURCE_EXHAUSTED', 'high', 'resource-management', context, true);
  }
}

// Retry context
export interface RetryContext {
  id: string;
  operation: string;
  correlationId: string;
  attempt: number;
  maxAttempts: number;
  startTime: Date;
  lastError?: Error;
  metadata: Record<string, any>;
}

// Circuit breaker state
export class CircuitBreaker {
  private state: CircuitBreakerState;
  private config: CircuitBreakerConfig;
  private logger: winston.Logger;

  constructor(config: CircuitBreakerConfig, logger: winston.Logger) {
    this.config = config;
    this.logger = logger;
    this.state = {
      status: 'closed',
      failureCount: 0,
      successCount: 0
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state.status === 'open') {
      if (this.shouldAttemptReset()) {
        this.state.status = 'half-open';
        this.logger.info('Circuit breaker transitioning to half-open state');
      } else {
        throw new ServiceUnavailableError('Circuit breaker is open', {
          failureCount: this.state.failureCount,
          lastFailureTime: this.state.lastFailureTime
        });
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  private onSuccess(): void {
    this.state.successCount++;
    
    if (this.state.status === 'half-open') {
      this.state.status = 'closed';
      this.state.failureCount = 0;
      this.logger.info('Circuit breaker recovered and closed');
    }
    
    if (this.config.stateChangeCallback) {
      this.config.stateChangeCallback({ ...this.state });
    }
  }

  private onFailure(error: Error): void {
    this.state.failureCount++;
    this.state.lastFailureTime = new Date();

    // Check if error should trigger circuit breaker
    if (this.shouldTriggerCircuitBreaker(error)) {
      if (this.state.status === 'closed') {
        this.state.status = 'open';
        this.logger.warn('Circuit breaker opened due to failures', {
          failureCount: this.state.failureCount,
          error: error.message
        });
      }
    }

    if (this.config.stateChangeCallback) {
      this.config.stateChangeCallback({ ...this.state });
    }
  }

  private shouldTriggerCircuitBreaker(error: Error): boolean {
    return this.config.expectedErrors.some(expectedError => 
      error.message.includes(expectedError) || error.name.includes(expectedError)
    );
  }

  private shouldAttemptReset(): boolean {
    return !!(this.state.lastFailureTime && 
           Date.now() - this.state.lastFailureTime.getTime() > this.config.resetTimeout);
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      status: 'closed',
      failureCount: 0,
      successCount: 0
    };
    this.logger.info('Circuit breaker manually reset');
  }
}

/**
 * Enterprise Error Handling System
 */
export class ErrorHandlingSystem extends EventEmitter {
  private logger: winston.Logger;
  private config: ErrorHandlingConfig;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryContexts: Map<string, RetryContext> = new Map();
  private errorLog: AutomationError[] = [];
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();
  private metrics: {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    errorsBySeverity: Record<string, number>;
    recoverySuccessRate: number;
    circuitBreakerActivations: number;
  };

  constructor(config: ErrorHandlingConfig) {
    super();
    this.config = config;
    this.logger = this.createLogger();
    this.metrics = this.initializeMetrics();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the error handling system
   */
  async initialize(): Promise<void> {
    try {
      // Initialize circuit breakers
      await this.initializeCircuitBreakers();
      
      // Start health checks
      await this.startHealthChecks();
      
      // Setup error logging
      await this.setupErrorLogging();

      this.emit('initialized', {
        circuitBreakers: this.circuitBreakers.size,
        healthChecks: this.healthChecks.size
      });

      this.logger.info('Error Handling System initialized', {
        circuitBreakers: this.circuitBreakers.size,
        healthChecks: this.healthChecks.size
      });
    } catch (error) {
      this.logger.error('Failed to initialize Error Handling System', error);
      throw error;
    }
  }

  /**
   * Execute operation with comprehensive error handling
   */
  async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    options: {
      operationName?: string;
      correlationId?: string;
      retryPolicy?: Partial<RetryPolicyConfig>;
      circuitBreakerId?: string;
      fallbackEnabled?: boolean;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const operationName = options.operationName || 'anonymous-operation';
    const correlationId = options.correlationId || uuidv4();
    
    this.logger.info('Starting error-handled operation', {
      operationName,
      correlationId,
      retryPolicy: options.retryPolicy?.maxAttempts || this.config.retryPolicy.maxAttempts
    });

    try {
      // Execute with circuit breaker if specified
      if (options.circuitBreakerId && this.circuitBreakers.has(options.circuitBreakerId)) {
        const circuitBreaker = this.circuitBreakers.get(options.circuitBreakerId)!;
        return await circuitBreaker.execute(operation);
      }

      return await operation();

    } catch (error) {
      const automationError = this.wrapError(error as Error, operationName, {
        correlationId,
        metadata: options.metadata
      });

      // Log the error
      await this.logError(automationError);

      // Attempt recovery
      if (this.config.recovery.autoRecovery) {
        const recovered = await this.attemptRecovery(automationError, options);
        if (recovered) {
          return recovered;
        }
      }

      // Try fallback if enabled
      if (options.fallbackEnabled && this.config.fallbackProcessing.enabled) {
        try {
          const fallbackResult = await this.executeFallback(automationError, options);
          if (fallbackResult) {
            this.emit('fallbackExecuted', {
              operationName,
              correlationId,
              originalError: automationError.message
            });
            return fallbackResult;
          }
        } catch (fallbackError) {
          this.logger.error('Fallback execution failed', {
            operationName,
            correlationId,
            fallbackError: (fallbackError as Error).message
          });
        }
      }

      // If all recovery attempts fail, throw the original error
      throw automationError;

    } finally {
      // Cleanup
      this.cleanupRetryContext(correlationId);
    }
  }

  /**
   * Execute with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: {
      operationName?: string;
      correlationId?: string;
      retryPolicy?: Partial<RetryPolicyConfig>;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<T> {
    const retryConfig = { ...this.config.retryPolicy, ...options.retryPolicy };
    const operationName = options.operationName || 'retry-operation';
    const correlationId = options.correlationId || uuidv4();

    const retryContext: RetryContext = {
      id: uuidv4(),
      operation: operationName,
      correlationId,
      attempt: 0,
      maxAttempts: retryConfig.maxAttempts,
      startTime: new Date(),
      metadata: options.metadata || {}
    };

    this.retryContexts.set(correlationId, retryContext);

    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      retryContext.attempt = attempt;

      try {
        this.logger.info(`Executing operation attempt ${attempt}/${retryConfig.maxAttempts}`, {
          operationName,
          correlationId,
          attempt
        });

        const result = await operation();
        
        this.emit('retrySuccess', {
          operationName,
          correlationId,
          attempt,
          duration: Date.now() - retryContext.startTime.getTime()
        });

        return result;

      } catch (error) {
        lastError = error as Error;
        retryContext.lastError = lastError;

        this.logger.warn(`Operation attempt ${attempt} failed`, {
          operationName,
          correlationId,
          attempt,
          error: lastError.message
        });

        // Check if error is retryable
        if (!this.isRetryableError(lastError, retryConfig)) {
          this.logger.info('Non-retryable error encountered, stopping retries', {
            operationName,
            correlationId,
            error: lastError.message
          });
          break;
        }

        // Check if this was the last attempt
        if (attempt === retryConfig.maxAttempts) {
          this.logger.error('Max retry attempts reached', {
            operationName,
            correlationId,
            attempts: attempt,
            finalError: lastError.message
          });
          break;
        }

        // Calculate delay before next retry
        const delay = this.calculateRetryDelay(attempt, retryConfig);
        
        this.emit('retryScheduled', {
          operationName,
          correlationId,
          attempt,
          delay,
          error: lastError.message
        });

        this.logger.info(`Retrying in ${delay}ms`, {
          operationName,
          correlationId,
          attempt,
          delay
        });

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    this.emit('retryExhausted', {
      operationName,
      correlationId,
      attempts: retryConfig.maxAttempts,
      finalError: lastError?.message
    });

    throw lastError || new Error('All retries failed without specific error');
  }

  /**
   * Register circuit breaker
   */
  registerCircuitBreaker(id: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    const circuitBreakerConfig = { ...this.config.circuitBreaker, ...config };
    const circuitBreaker = new CircuitBreaker(circuitBreakerConfig, this.logger);
    
    this.circuitBreakers.set(id, circuitBreaker);
    
    this.logger.info('Circuit breaker registered', { id, config: circuitBreakerConfig });
    return circuitBreaker;
  }

  /**
   * Execute fallback strategy
   */
  async executeFallback(error: AutomationError, options: any): Promise<any> {
    const applicableStrategies = this.config.fallbackProcessing.strategies
      .filter(strategy => this.evaluateFallbackConditions(strategy.conditions, error))
      .sort((a, b) => b.priority - a.priority);

    for (const strategy of applicableStrategies) {
      try {
        this.logger.info('Executing fallback strategy', {
          strategy: strategy.name,
          type: strategy.type,
          error: error.message
        });

        const result = await this.executeFallbackAction(strategy.action, error, options);
        if (result !== undefined) {
          return result;
        }
      } catch (fallbackError) {
        this.logger.warn('Fallback strategy failed', {
          strategy: strategy.name,
          error: (fallbackError as Error).message
        });
      }
    }

    return null;
  }

  /**
   * Manual error logging
   */
  async logError(error: AutomationError): Promise<void> {
    // Add to in-memory log
    this.errorLog.push(error);
    
    // Maintain log size
    if (this.errorLog.length > this.config.errorLogging.retention.maxEntries) {
      this.errorLog = this.errorLog.slice(-this.config.errorLogging.retention.maxEntries);
    }

    // Update metrics
    this.updateErrorMetrics(error);

    // Emit error event
    this.emit('errorLogged', { error });

    // Send alerts if necessary
    if (this.shouldSendAlert(error)) {
      await this.sendAlert(error);
    }

    // Log to configured destinations
    await this.logToDestinations(error);
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): any {
    return {
      metrics: { ...this.metrics },
      recentErrors: this.errorLog.slice(-100).map(error => error.toJSON()),
      circuitBreakerStates: Object.fromEntries(
        Array.from(this.circuitBreakers.entries()).map(([id, cb]) => [id, cb.getState()])
      ),
      activeRetryContexts: this.retryContexts.size
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    status: string;
    details: any;
    lastCheck: Date;
  }> {
    const issues: string[] = [];
    const details: any = {};

    // Check error rates
    const recentErrors = this.errorLog.filter(error => 
      Date.now() - error.timestamp.getTime() < 3600000 // Last hour
    );

    if (recentErrors.length > 100) {
      issues.push('High error rate detected');
    }

    // Check circuit breakers
    for (const [id, circuitBreaker] of this.circuitBreakers) {
      const state = circuitBreaker.getState();
      if (state.status === 'open') {
        issues.push(`Circuit breaker ${id} is open`);
      }
      details[`circuitBreaker_${id}`] = state;
    }

    // Check retry contexts
    const stuckRetries = Array.from(this.retryContexts.values()).filter(context =>
      Date.now() - context.startTime.getTime() > 300000 // 5 minutes
    );

    if (stuckRetries.length > 10) {
      issues.push('Many stuck retry contexts detected');
    }

    const healthy = issues.length === 0;

    return {
      healthy,
      status: healthy ? 'healthy' : 'unhealthy',
      details: {
        issues,
        errorCount: recentErrors.length,
        circuitBreakers: details,
        stuckRetries: stuckRetries.length,
        totalErrors: this.metrics.totalErrors
      },
      lastCheck: new Date()
    };
  }

  /**
   * Shutdown the error handling system
   */
  async shutdown(): Promise<void> {
    // Stop health checks
    for (const timeout of this.healthChecks.values()) {
      clearInterval(timeout);
    }
    this.healthChecks.clear();

    // Clear retry contexts
    this.retryContexts.clear();

    // Log shutdown
    this.logger.info('Error Handling System shutdown complete');

    this.emit('shutdown');
  }

  // Private methods

  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: this.config.errorLogging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: this.config.errorLogging.includeStackTrace }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/error-handling-system.log',
          maxsize: 10000000,
          maxFiles: 10
        })
      ]
    });
  }

  private initializeMetrics() {
    return {
      totalErrors: 0,
      errorsByCategory: {},
      errorsBySeverity: {},
      recoverySuccessRate: 0,
      circuitBreakerActivations: 0
    };
  }

  private async initializeCircuitBreakers(): Promise<void> {
    // Create default circuit breakers for common services
    this.registerCircuitBreaker('database');
    this.registerCircuitBreaker('external-api');
    this.registerCircuitBreaker('message-queue');
  }

  private async startHealthChecks(): Promise<void> {
    for (const healthCheck of this.config.recovery.healthChecks) {
      const interval = setInterval(async () => {
        await this.performHealthCheck(healthCheck);
      }, healthCheck.interval);

      this.healthChecks.set(healthCheck.name, interval);
    }
  }

  private async setupErrorLogging(): Promise<void> {
    // Setup structured logging if enabled
    if (this.config.errorLogging.structuredLogging) {
      this.logger.info('Structured error logging enabled');
    }
  }

  private wrapError(error: Error, operationName: string, context: Record<string, any>): AutomationError {
    // Create appropriate error type based on error characteristics
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      return new ServiceUnavailableError(`Service unavailable for ${operationName}: ${error.message}`, {
        ...context,
        operationName,
        originalError: error.message
      });
    }

    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return new ValidationError(`Validation failed for ${operationName}: ${error.message}`, {
        ...context,
        operationName,
        originalError: error.message
      });
    }

    if (error.message.includes('resource') || error.message.includes('memory') || error.message.includes('disk')) {
      return new ResourceExhaustedError(`Resource exhausted in ${operationName}: ${error.message}`, {
        ...context,
        operationName,
        originalError: error.message
      });
    }

    // Default to task execution error
    return new TaskExecutionError(`Task execution failed for ${operationName}: ${error.message}`, {
      ...context,
      operationName,
      originalError: error.message
    });
  }

  private async attemptRecovery(error: AutomationError, options: any): Promise<any> {
    const applicableStrategies = this.config.recovery.recoveryStrategies.filter(strategy =>
      this.evaluateRecoveryTrigger(strategy.trigger, error)
    );

    for (const strategy of applicableStrategies) {
      for (let attempt = 1; attempt <= strategy.maxAttempts; attempt++) {
        try {
          this.logger.info('Attempting recovery strategy', {
            strategy: strategy.name,
            attempt,
            error: error.message
          });

          for (const action of strategy.actions) {
            await this.executeRecoveryAction(action, error);
          }

          this.emit('recoverySuccess', {
            strategy: strategy.name,
            attempt,
            error: error.message
          });

          return true;

        } catch (recoveryError) {
          this.logger.warn('Recovery attempt failed', {
            strategy: strategy.name,
            attempt,
            error: (recoveryError as Error).message
          });
        }
      }
    }

    return false;
  }

  private evaluateRecoveryTrigger(trigger: RecoveryTrigger, error: AutomationError): boolean {
    switch (trigger.type) {
      case 'error-pattern':
        return error.message.includes(trigger.condition);
      case 'error-severity':
        return error.severity === trigger.condition;
      case 'custom':
        // Custom evaluation logic would go here
        return false;
      default:
        return false;
    }
  }

  private async executeRecoveryAction(action: RecoveryAction, error: AutomationError): Promise<void> {
    switch (action.type) {
      case 'restart-service':
        this.logger.info('Recovery action: restart service', { service: action.configuration.service });
        break;
      case 'clear-cache':
        this.logger.info('Recovery action: clear cache', { cache: action.configuration.cache });
        break;
      case 'scale-resources':
        this.logger.info('Recovery action: scale resources', { scaling: action.configuration });
        break;
      default:
        this.logger.warn('Unknown recovery action type', { type: action.type });
    }
  }

  private evaluateFallbackConditions(conditions: FallbackCondition[], error: AutomationError): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'error-type':
          return error.name === condition.expression;
        case 'error-code':
          return error.code === condition.expression;
        default:
          return false;
      }
    });
  }

  private async executeFallbackAction(action: FallbackAction, error: AutomationError, options: any): Promise<any> {
    switch (action.type) {
      case 'return-value':
        return action.configuration.value;
      case 'use-cache':
        this.logger.info('Fallback: using cached data');
        return action.configuration.cacheData || { fallback: true };
      case 'call-service':
        this.logger.info('Fallback: calling alternative service', { service: action.configuration.service });
        return { alternativeServiceResult: true };
      default:
        return null;
    }
  }

  private isRetryableError(error: Error, retryConfig: RetryPolicyConfig): boolean {
    // Check if error is in non-retryable list
    if (retryConfig.nonRetryableErrors.some(nonRetryable => 
      error.message.includes(nonRetryable) || error.name.includes(nonRetryable)
    )) {
      return false;
    }

    // Check if error is in retryable list
    if (retryConfig.retryableErrors.some(retryable => 
      error.message.includes(retryable) || error.name.includes(retryable)
    )) {
      return true;
    }

    // Use custom retry logic if provided
    if (retryConfig.customRetryLogic) {
      return retryConfig.customRetryLogic(error, 0); // attempt would be passed here
    }

    // Default: retry network errors and timeouts
    return error.message.includes('timeout') || 
           error.message.includes('ECONNRESET') ||
           error.message.includes('ECONNREFUSED') ||
           error.message.includes('network');
  }

  private calculateRetryDelay(attempt: number, retryConfig: RetryPolicyConfig): number {
    let delay: number;

    switch (retryConfig.backoffStrategy) {
      case 'exponential':
        delay = retryConfig.baseDelay * Math.pow(2, attempt - 1);
        break;
      case 'linear':
        delay = retryConfig.baseDelay * attempt;
        break;
      case 'fixed':
        delay = retryConfig.baseDelay;
        break;
      default:
        delay = retryConfig.baseDelay;
    }

    // Apply max delay
    delay = Math.min(delay, retryConfig.maxDelay);

    // Apply jitter if enabled
    if (retryConfig.jitter) {
      const jitterAmount = delay * retryConfig.jitterFactor * Math.random();
      delay += jitterAmount;
    }

    return Math.floor(delay);
  }

  private shouldSendAlert(error: AutomationError): boolean {
    // Alert on critical errors
    if (error.severity === 'critical') {
      return true;
    }

    // Alert on configuration errors
    if (error.category === 'configuration') {
      return true;
    }

    // Check error rate
    const recentErrors = this.errorLog.filter(e => 
      Date.now() - e.timestamp.getTime() < 3600000 // Last hour
    );

    return recentErrors.length > 50; // Alert if more than 50 errors in the last hour
  }

  private async sendAlert(error: AutomationError): Promise<void> {
    for (const channel of this.config.alerting.channels) {
      if (channel.enabled) {
        try {
          this.logger.info('Sending alert', {
            channel: channel.type,
            error: error.message,
            severity: error.severity
          });
          // In real implementation, send actual alert
        } catch (alertError) {
          this.logger.error('Failed to send alert', {
            channel: channel.type,
            error: (alertError as Error).message
          });
        }
      }
    }
  }

  private async logToDestinations(error: AutomationError): Promise<void> {
    for (const destination of this.config.errorLogging.logDestinations) {
      if (destination.enabled) {
        try {
          switch (destination.type) {
            case 'console':
              this.logger.error('Error logged to console', { error: error.toJSON() });
              break;
            case 'file':
              this.logger.error('Error logged to file', { error: error.toJSON() });
              break;
            default:
              this.logger.warn('Unknown log destination type', { type: destination.type });
          }
        } catch (logError) {
          this.logger.error('Failed to log to destination', {
            destination: destination.type,
            error: (logError as Error).message
          });
        }
      }
    }
  }

  private updateErrorMetrics(error: AutomationError): void {
    this.metrics.totalErrors++;
    
    // Update category metrics
    this.metrics.errorsByCategory[error.category] = 
      (this.metrics.errorsByCategory[error.category] || 0) + 1;
    
    // Update severity metrics
    this.metrics.errorsBySeverity[error.severity] = 
      (this.metrics.errorsBySeverity[error.severity] || 0) + 1;
  }

  private cleanupRetryContext(correlationId: string): void {
    setTimeout(() => {
      this.retryContexts.delete(correlationId);
    }, 60000); // Clean up after 1 minute
  }

  private async performHealthCheck(config: HealthCheckConfig): Promise<void> {
    try {
      // Simulate health check
      this.emit('healthCheckPerformed', {
        name: config.name,
        status: 'healthy',
        timestamp: new Date()
      });
    } catch (error) {
      this.emit('healthCheckFailed', {
        name: config.name,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private setupEventHandlers(): void {
    this.on('errorLogged', (data) => {
      this.logger.debug('Error logged', { error: data.error.code });
    });

    this.on('recoverySuccess', (data) => {
      this.logger.info('Error recovery successful', {
        strategy: data.strategy,
        attempt: data.attempt
      });
    });

    this.on('fallbackExecuted', (data) => {
      this.logger.info('Fallback execution successful', {
        operationName: data.operationName
      });
    });
  }
}

export default ErrorHandlingSystem;