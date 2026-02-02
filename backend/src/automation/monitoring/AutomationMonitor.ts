import { EventEmitter } from 'events';
import { MonitoringMetrics, HealthStatus, AutomationEvent } from '../core/types';
import { automationOrchestrator } from '../AutomationOrchestrator';
import winston from 'winston';

/**
 * Automation Monitor - Provides monitoring and reliability features for the automation system
 * Tracks performance metrics, monitors system health, and provides alerting capabilities
 */
export class AutomationMonitor extends EventEmitter {
  private logger: winston.Logger;
  private metrics: MonitoringMetrics[] = [];
  private healthCheckInterval?: NodeJS.Timeout | null;
  private metricsRetentionPeriod = 24 * 60 * 60 * 1000; // 24 hours
  private maxMetricsEntries = 10000;
  private isMonitoring = false;

  constructor() {
    super();
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/automation-monitor.log' })
      ]
    });

    this.setupEventHandlers();
  }

  /**
   * Start monitoring the automation system
   */
  startMonitoring(options: {
    healthCheckInterval?: number;
    metricsRetentionPeriod?: number;
    maxMetricsEntries?: number;
  } = {}): void {
    if (this.isMonitoring) {
      this.logger.warn('Monitoring is already active');
      return;
    }

    const {
      healthCheckInterval = 60000, // 1 minute
      metricsRetentionPeriod = this.metricsRetentionPeriod,
      maxMetricsEntries = this.maxMetricsEntries
    } = options;

    this.metricsRetentionPeriod = metricsRetentionPeriod;
    this.maxMetricsEntries = maxMetricsEntries;
    this.isMonitoring = true;

    // Start periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, healthCheckInterval);

    // Setup event monitoring
    this.setupEventMonitoring();

    this.logger.info('Automation monitoring started', {
      healthCheckInterval,
      metricsRetentionPeriod,
      maxMetricsEntries
    });

    this.emit('monitoringStarted', {
      timestamp: new Date().toISOString(),
      config: { healthCheckInterval, metricsRetentionPeriod, maxMetricsEntries }
    });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.removeAllListeners();
    this.metrics = [];

    this.logger.info('Automation monitoring stopped');
    this.emit('monitoringStopped', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Record a custom metric
   */
  recordMetric(metric: Omit<MonitoringMetrics, 'timestamp'>): void {
    const fullMetric: MonitoringMetrics = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Clean up old metrics
    this.cleanupOldMetrics();

    // Check for alerts
    this.checkAlerts(fullMetric);

    this.logger.debug('Metric recorded', {
      componentId: metric.componentId,
      workflowId: metric.workflowId,
      metrics: metric.metrics
    });
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    try {
      const automationHealth = await automationOrchestrator.healthCheck();
      
      const metrics = this.getRecentMetrics(5); // Last 5 minutes
      const averageExecutionTime = this.calculateAverageExecutionTime(metrics);
      const errorRate = this.calculateErrorRate(metrics);
      const throughput = this.calculateThroughput(metrics);

      const healthy = automationHealth.healthy && 
                     errorRate < 0.1 && // Less than 10% error rate
                     averageExecutionTime < 300000; // Less than 5 minutes average

      return {
        healthy,
        message: healthy ? 'System is healthy' : 'System has issues',
        details: {
          automationHealth: automationHealth.details,
          performanceMetrics: {
            averageExecutionTime,
            errorRate,
            throughput
          },
          metricsCount: metrics.length
        },
        lastCheck: new Date(),
        uptime: process.uptime()
      };

    } catch (error) {
      return {
        healthy: false,
        message: 'Health check failed',
        details: {
          error: (error as Error).message
        },
        lastCheck: new Date(),
        uptime: process.uptime()
      };
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(options: {
    startTime?: Date;
    endTime?: Date;
    componentId?: string;
    workflowId?: string;
    limit?: number;
  } = {}): MonitoringMetrics[] {
    const {
      startTime,
      endTime,
      componentId,
      workflowId,
      limit = 100
    } = options;

    let filteredMetrics = [...this.metrics];

    // Apply filters
    if (startTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp >= startTime);
    }

    if (endTime) {
      filteredMetrics = filteredMetrics.filter(m => m.timestamp <= endTime);
    }

    if (componentId) {
      filteredMetrics = filteredMetrics.filter(m => m.componentId === componentId);
    }

    if (workflowId) {
      filteredMetrics = filteredMetrics.filter(m => m.workflowId === workflowId);
    }

    // Sort by timestamp (newest first) and limit
    return filteredMetrics
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get system statistics
   */
  getStatistics(): any {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    const recentMetrics = this.getRecentMetrics(60); // Last 60 minutes
    const last24hMetrics = this.getMetrics({ startTime: last24Hours });
    const lastHourMetrics = this.getMetrics({ startTime: lastHour });

    return {
      monitoring: {
        isActive: this.isMonitoring,
        uptime: process.uptime(),
        totalMetrics: this.metrics.length,
        retentionPeriod: this.metricsRetentionPeriod,
        maxEntries: this.maxMetricsEntries
      },
      performance: {
        last24Hours: this.analyzeMetrics(last24hMetrics),
        lastHour: this.analyzeMetrics(lastHourMetrics),
        recent: this.analyzeMetrics(recentMetrics)
      },
      components: this.getComponentStatistics(),
      alerts: this.getActiveAlerts()
    };
  }

  /**
   * Configure alerts
   */
  configureAlerts(alerts: Array<{
    name: string;
    condition: (metric: MonitoringMetrics) => boolean;
    severity: 'info' | 'warning' | 'error';
    message: string;
  }>): void {
    // Store alert configurations
    // In a real implementation, you'd persist these and implement the logic
    this.logger.info('Alert configuration updated', {
      alertCount: alerts.length
    });
  }

  // Private methods

  private setupEventHandlers(): void {
    // Handle workflow events from automation orchestrator
    automationOrchestrator.on('workflowCompleted', (data) => {
      this.recordMetric({
        workflowId: data.workflowId,
        metrics: {
          executionTime: data.duration,
          successCount: 1,
          throughput: 1
        }
      });
    });

    automationOrchestrator.on('workflowFailed', (data) => {
      this.recordMetric({
        workflowId: data.workflowId,
        metrics: {
          executionTime: data.duration,
          errorCount: 1
        }
      });

      // Emit alert for workflow failure
      this.emit('alert', {
        type: 'workflow_failed',
        severity: 'error',
        message: `Workflow ${data.workflowId} failed: ${data.error}`,
        data
      });
    });

    automationOrchestrator.on('rulesEvaluated', (data) => {
      this.recordMetric({
        componentId: 'business-rules-engine',
        metrics: {
          successCount: data.result.summary.passed,
          errorCount: data.result.summary.failed
        }
      });
    });
  }

  private setupEventMonitoring(): void {
    // Set up comprehensive event monitoring
    this.logger.info('Event monitoring configured');
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const health = await this.getHealthStatus();
      
      if (!health.healthy) {
        this.emit('alert', {
          type: 'health_check_failed',
          severity: 'warning',
          message: 'System health check failed',
          data: health
        });
      }

      this.recordMetric({
        componentId: 'health-monitor',
        metrics: {
          executionTime: 0,
          successCount: health.healthy ? 1 : 0,
          errorCount: health.healthy ? 0 : 1
        }
      });

    } catch (error) {
      this.logger.error('Health check failed', error);
      
      this.emit('alert', {
        type: 'health_check_error',
        severity: 'error',
        message: 'Health check encountered an error',
        data: { error: (error as Error).message }
      });
    }
  }

  private getRecentMetrics(minutes: number): MonitoringMetrics[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.getMetrics({ startTime: cutoff });
  }

  private calculateAverageExecutionTime(metrics: MonitoringMetrics[]): number {
    const executionTimes = metrics
      .map(m => m.metrics.executionTime)
      .filter(time => time !== undefined);

    if (executionTimes.length === 0) return 0;

    return executionTimes.reduce((sum, time) => sum + time, 0) / executionTimes.length;
  }

  private calculateErrorRate(metrics: MonitoringMetrics[]): number {
    const total = metrics.length;
    const errors = metrics.filter(m => (m.metrics.errorCount || 0) > 0).length;
    
    return total > 0 ? errors / total : 0;
  }

  private calculateThroughput(metrics: MonitoringMetrics[]): number {
    if (metrics.length < 2) return 0;
    
    const firstMetric = metrics[0];
    const lastMetric = metrics[metrics.length - 1];
    
    if (!firstMetric || !lastMetric) return 0;
    
    const timeSpan = (firstMetric.timestamp.getTime() - lastMetric.timestamp.getTime()) / 1000;
    return timeSpan > 0 ? metrics.length / timeSpan : 0;
  }

  private analyzeMetrics(metrics: MonitoringMetrics[]): any {
    if (metrics.length === 0) {
      return {
        count: 0,
        averageExecutionTime: 0,
        errorRate: 0,
        throughput: 0
      };
    }

    return {
      count: metrics.length,
      averageExecutionTime: this.calculateAverageExecutionTime(metrics),
      errorRate: this.calculateErrorRate(metrics),
      throughput: this.calculateThroughput(metrics)
    };
  }

  private getComponentStatistics(): Record<string, any> {
    const componentStats: Record<string, any> = {};
    
    const componentIds = new Set(
      this.metrics.map(m => m.componentId).filter(Boolean)
    );

    componentIds.forEach(componentId => {
      if (componentId) {
        const componentMetrics = this.metrics.filter(m => m.componentId === componentId);
        componentStats[componentId] = this.analyzeMetrics(componentMetrics);
      }
    });

    return componentStats;
  }

  private getActiveAlerts(): any[] {
    // Return recent alerts (in a real implementation, you'd store and manage alerts)
    return [];
  }

  private checkAlerts(metric: MonitoringMetrics): void {
    // Check for threshold violations and emit alerts
    const executionTime = metric.metrics.executionTime;
    
    if (executionTime && executionTime > 300000) { // 5 minutes
      this.emit('alert', {
        type: 'slow_execution',
        severity: 'warning',
        message: `Slow execution detected: ${executionTime}ms`,
        data: metric
      });
    }

    const errorCount = metric.metrics.errorCount || 0;
    if (errorCount > 5) {
      this.emit('alert', {
        type: 'high_error_rate',
        severity: 'error',
        message: `High error count: ${errorCount}`,
        data: metric
      });
    }
  }

  private cleanupOldMetrics(): void {
    const cutoff = new Date(Date.now() - this.metricsRetentionPeriod);
    
    // Remove old metrics
    this.metrics = this.metrics.filter(m => m.timestamp > cutoff);
    
    // Limit total entries
    if (this.metrics.length > this.maxMetricsEntries) {
      this.metrics = this.metrics.slice(-this.maxMetricsEntries);
    }
  }
}

// Export singleton instance
export const automationMonitor = new AutomationMonitor();

// Export utility functions
export const startAutomationMonitoring = (options?: any) => {
  automationMonitor.startMonitoring(options);
};

export const stopAutomationMonitoring = () => {
  automationMonitor.stopMonitoring();
};

export const recordCustomMetric = (metric: Omit<MonitoringMetrics, 'timestamp'>) => {
  automationMonitor.recordMetric(metric);
};

export const getAutomationHealth = () => {
  return automationMonitor.getHealthStatus();
};

export const getAutomationMetrics = (options?: any) => {
  return automationMonitor.getMetrics(options);
};

export const getAutomationStatistics = () => {
  return automationMonitor.getStatistics();
};

export default AutomationMonitor;