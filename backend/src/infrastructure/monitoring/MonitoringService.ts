/**
 * Monitoring and logging service for automation workflows
 */
import { MonitoringEvent, Configuration } from '../../domain/automation/types';

export type MonitoringEventHandler = (event: MonitoringEvent) => Promise<void> | void;

export class MonitoringService {
  private handlers: Map<string, MonitoringEventHandler[]> = new Map();
  private metrics: Map<string, number> = new Map();
  private events: MonitoringEvent[] = [];
  private logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private maxRetentionDays = 7;

  constructor(config?: Partial<Configuration['monitoring']>) {
    if (config?.logLevel) {
      this.logLevel = config.logLevel;
    }
    if (config?.retentionDays) {
      this.maxRetentionDays = config.retentionDays;
    }
    
    // Set up default console handler
    this.addHandler('console', (event) => {
      this.logToConsole(event);
    });
  }

  /**
   * Register an event handler for specific event types
   */
  addHandler(eventType: string, handler: MonitoringEventHandler): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }

  /**
   * Emit an event and notify all registered handlers
   */
  async emit(event: MonitoringEvent): Promise<void> {
    try {
      // Store event
      this.events.push(event);
      this.updateMetrics(event);

      // Clean up old events
      this.cleanupOldEvents();

      // Notify handlers
      const handlers = this.handlers.get(event.type) || [];
      await Promise.all(
        handlers.map(handler => this.safeExecute(handler, event))
      );

      // Notify wildcard handlers
      const wildcardHandlers = this.handlers.get('*') || [];
      await Promise.all(
        wildcardHandlers.map(handler => this.safeExecute(handler, event))
      );
    } catch (error) {
      console.error('Error in MonitoringService.emit:', error);
    }
  }

  /**
   * Get metrics for a specific metric type
   */
  getMetric(metricType: string): number {
    return this.metrics.get(metricType) || 0;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }

  /**
   * Get recent events
   */
  getRecentEvents(count: number = 100): MonitoringEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: string): MonitoringEvent[] {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Clear all events and metrics
   */
  clear(): void {
    this.events = [];
    this.metrics.clear();
  }

  private async safeExecute(handler: MonitoringEventHandler, event: MonitoringEvent): Promise<void> {
    try {
      await handler(event);
    } catch (error) {
      console.error('Error in monitoring event handler:', error);
    }
  }

  private logToConsole(event: MonitoringEvent): void {
    const level = this.getLogLevel(event.type);
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${event.type}: ${JSON.stringify(event.data)}`;

    switch (level) {
      case 'debug':
        console.debug(message);
        break;
      case 'info':
        console.info(message);
        break;
      case 'warn':
        console.warn(message);
        break;
      case 'error':
        console.error(message);
        break;
    }
  }

  private getLogLevel(eventType: string): 'debug' | 'info' | 'warn' | 'error' {
    // Map event types to log levels
    const levelMap: Record<string, 'debug' | 'info' | 'warn' | 'error'> = {
      'workflow.started': 'info',
      'workflow.completed': 'info',
      'workflow.failed': 'error',
      'task.started': 'debug',
      'task.completed': 'debug',
      'task.failed': 'warn',
      'retry.attempt': 'info',
      'recovery.executed': 'warn',
      'error': 'error'
    };

    return levelMap[eventType] || 'info';
  }

  private updateMetrics(event: MonitoringEvent): void {
    const key = `events.${event.type}`;
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);

    // Update time-based metrics
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (event.type) {
      case 'workflow.execution':
        this.metrics.set(`executions.${today}`, (this.metrics.get(`executions.${today}`) || 0) + 1);
        break;
      case 'workflow.completed':
        this.metrics.set(`successes.${today}`, (this.metrics.get(`successes.${today}`) || 0) + 1);
        break;
      case 'workflow.failed':
        this.metrics.set(`failures.${today}`, (this.metrics.get(`failures.${today}`) || 0) + 1);
        break;
    }
  }

  private cleanupOldEvents(): void {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.maxRetentionDays);
    
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }
}