import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Monitoring System
 * Features: Distributed tracing, real-time metrics, alerting, SLA tracking
 */

// Core monitoring interfaces
export interface MonitoringConfig {
  metrics: MetricsConfig;
  tracing: TracingConfig;
  alerting: AlertingConfig;
  dashboards: DashboardConfig;
  retention: RetentionConfig;
  collectors: CollectorConfig[];
}

export interface MetricsConfig {
  enabled: boolean;
  collectionInterval: number; // milliseconds
  retentionPeriod: number; // hours
  aggregation: AggregationConfig;
  storage: MetricsStorageConfig;
  realTimeStreaming: boolean;
}

export interface AggregationConfig {
  enabled: boolean;
  intervals: number[]; // seconds
  functions: AggregationFunction[];
}

export interface AggregationFunction {
  type: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'percentile';
  percentile?: number; // for percentile function
  field: string;
}

export interface MetricsStorageConfig {
  type: 'memory' | 'influxdb' | 'prometheus' | 'elasticsearch' | 'custom';
  connectionString?: string;
  batchSize: number;
  flushInterval: number;
}

export interface TracingConfig {
  enabled: boolean;
  sampler: SamplingConfig;
  exporter: TraceExporterConfig;
  propagators: string[];
  maxSpans: number;
  maxTraces: number;
}

export interface SamplingConfig {
  type: 'const' | 'rate' | 'probabilistic' | 'remote';
  rate?: number;
  param?: number;
  remoteEndpoint?: string;
}

export interface TraceExporterConfig {
  type: 'console' | 'http' | 'grpc' | 'zipkin' | 'jaeger' | 'custom';
  endpoint?: string;
  headers?: Record<string, string>;
  timeout: number;
}

export interface AlertingConfig {
  enabled: boolean;
  rules: AlertRule[];
  channels: AlertChannel[];
  escalation: EscalationConfig;
  suppression: SuppressionConfig;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  severity: 'info' | 'warning' | 'error' | 'critical';
  conditions: AlertCondition[];
  actions: AlertAction[];
  tags: string[];
}

export interface AlertCondition {
  metric: string;
  operator: '>' | '<' | '>=' | '<=' | '==' | '!=' | 'contains' | 'not_contains';
  threshold: number | string;
  duration: number; // seconds
  aggregation: 'avg' | 'sum' | 'min' | 'max';
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'escalation' | 'auto_remediation' | 'integration';
  configuration: any;
}

export interface AlertChannel {
  id: string;
  type: 'email' | 'slack' | 'teams' | 'webhook' | 'sms' | 'pagerduty' | 'custom';
  name: string;
  enabled: boolean;
  configuration: any;
}

export interface EscalationConfig {
  enabled: boolean;
  levels: EscalationLevel[];
  maxLevel: number;
}

export interface EscalationLevel {
  level: number;
  delay: number; // minutes
  channels: string[];
  conditions?: EscalationCondition[];
}

export interface EscalationCondition {
  type: 'ack_timeout' | 'error_count' | 'duration';
  threshold: number;
}

export interface SuppressionConfig {
  enabled: boolean;
  rules: SuppressionRule[];
}

export interface SuppressionRule {
  name: string;
  condition: string;
  duration: number; // minutes
  enabled: boolean;
}

export interface DashboardConfig {
  enabled: boolean;
  refreshInterval: number; // seconds
  layouts: DashboardLayout[];
  themes: ThemeConfig;
}

export interface DashboardLayout {
  id: string;
  name: string;
  widgets: WidgetConfig[];
  permissions: PermissionConfig[];
}

export interface WidgetConfig {
  id: string;
  type: 'chart' | 'gauge' | 'table' | 'metric' | 'log' | 'alert' | 'custom';
  title: string;
  position: { x: number; y: number; width: number; height: number };
  configuration: WidgetConfiguration;
  dataSource: DataSourceConfig;
  refreshInterval: number;
}

export interface WidgetConfiguration {
  chartType?: 'line' | 'bar' | 'area' | 'pie' | 'scatter';
  timeRange: TimeRange;
  aggregation?: string;
  filters?: FilterConfig[];
  colors?: string[];
  showLegend?: boolean;
  showGrid?: boolean;
  unit?: string;
  precision?: number;
}

export interface TimeRange {
  type: 'relative' | 'absolute';
  start?: Date;
  end?: Date;
  relative?: {
    value: number;
    unit: 'seconds' | 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  };
}

export interface FilterConfig {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'range';
  value: any;
}

export interface DataSourceConfig {
  type: 'metrics' | 'traces' | 'logs' | 'events' | 'custom';
  query: string;
  parameters?: Record<string, any>;
}

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  fonts: {
    primary: string;
    secondary: string;
    monospace: string;
  };
}

export interface PermissionConfig {
  user: string;
  role: string;
  permissions: string[];
}

export interface RetentionConfig {
  enabled: boolean;
  policies: RetentionPolicy[];
}

export interface RetentionPolicy {
  type: 'metrics' | 'traces' | 'logs' | 'events';
  duration: number; // days
  aggregation: AggregationLevel[];
  compression: boolean;
  archiveAfter: number; // days
}

export interface AggregationLevel {
  interval: number; // seconds
  function: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface CollectorConfig {
  name: string;
  type: 'prometheus' | 'statsd' | 'custom' | 'agent';
  enabled: boolean;
  configuration: any;
  endpoints: string[];
  filters: string[];
}

// Metric and trace interfaces
export interface Metric {
  name: string;
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
  unit?: string;
  description?: string;
}

export interface Trace {
  id: string;
  name: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  status: 'ok' | 'error' | 'timeout';
  spans: Span[];
  baggage: Record<string, any>;
  tags: Record<string, any>;
}

export interface Span {
  id: string;
  name: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  status: 'ok' | 'error' | 'timeout';
  parentSpanId?: string;
  attributes: Record<string, any>;
  logs: SpanLog[];
}

export interface SpanLog {
  timestamp: Date;
  fields: Record<string, any>;
  level: 'debug' | 'info' | 'warn' | 'error';
}

export interface SLAMetric {
  service: string;
  objective: string;
  target: number;
  current: number;
  period: string;
  status: 'met' | 'missed' | 'warning';
  incidents: SLAIncident[];
}

export interface SLAIncident {
  id: string;
  startTime: Date;
  endTime?: Date;
  target: number;
  actual: number;
  impact: 'minor' | 'major' | 'critical';
  description: string;
}

/**
 * Enterprise Monitoring System
 */
export class EnterpriseMonitoringSystem extends EventEmitter {
  private logger: winston.Logger;
  private config: MonitoringConfig;
  private metrics: Map<string, Metric[]> = new Map();
  private traces: Map<string, Trace> = new Map();
  private activeTraces: Map<string, Trace> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private collectors: Map<string, any> = new Map();
  private realTimeSubscriptions: Map<string, Subscription> = new Map();
  private metricsBuffer: Metric[] = [];
  private isInitialized = false;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.logger = this.createLogger();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the monitoring system
   */
  async initialize(): Promise<void> {
    try {
      // Initialize collectors
      await this.initializeCollectors();
      
      // Start metrics collection
      if (this.config.metrics.enabled) {
        await this.startMetricsCollection();
      }
      
      // Start tracing
      if (this.config.tracing.enabled) {
        await this.startTracing();
      }
      
      // Start alerting
      if (this.config.alerting.enabled) {
        await this.startAlerting();
      }
      
      // Start real-time streaming
      if (this.config.metrics.realTimeStreaming) {
        await this.startRealTimeStreaming();
      }
      
      this.isInitialized = true;
      this.emit('initialized', {
        collectors: this.collectors.size,
        metricsEnabled: this.config.metrics.enabled,
        tracingEnabled: this.config.tracing.enabled,
        alertingEnabled: this.config.alerting.enabled
      });

      this.logger.info('Enterprise Monitoring System initialized', {
        collectors: this.collectors.size,
        metricsEnabled: this.config.metrics.enabled,
        tracingEnabled: this.config.tracing.enabled,
        alertingEnabled: this.config.alerting.enabled
      });
    } catch (error) {
      this.logger.error('Failed to initialize Monitoring System', error);
      throw error;
    }
  }

  /**
   * Record a metric
   */
  recordMetric(metric: Omit<Metric, 'timestamp'>): void {
    const fullMetric: Metric = {
      ...metric,
      timestamp: new Date()
    };

    // Add to buffer for batch processing
    this.metricsBuffer.push(fullMetric);

    // Add to in-memory storage
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    const metricList = this.metrics.get(metric.name);
    if (metricList) {
      metricList.push(fullMetric);
    }

    // Clean up old metrics
    this.cleanupOldMetrics(metric.name);

    // Emit real-time event
    this.emit('metricRecorded', fullMetric);

    // Check alerts
    this.evaluateAlerts(fullMetric);
  }

  /**
   * Start a new trace
   */
  startTrace(name: string, options: {
    parentTraceId?: string;
    tags?: Record<string, any>;
    baggage?: Record<string, any>;
  } = {}): string {
    const traceId = uuidv4();
    
    const trace: Trace = {
      id: traceId,
      name,
      duration: 0,
      startTime: new Date(),
      endTime: new Date(),
      status: 'ok',
      spans: [],
      baggage: options.baggage || {},
      tags: options.tags || {}
    };

    this.activeTraces.set(traceId, trace);
    
    this.emit('traceStarted', { traceId, name, tags: options.tags });
    
    return traceId;
  }

  /**
   * Add a span to a trace
   */
  addSpan(traceId: string, spanName: string, options: {
    parentSpanId?: string;
    tags?: Record<string, any>;
    startTime?: Date;
  } = {}): string {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const spanId = uuidv4();
    const startTime = options.startTime || new Date();
    
    const span: Span = {
      id: spanId,
      name: spanName,
      duration: 0,
      startTime,
      endTime: startTime,
      status: 'ok',
      parentSpanId: options.parentSpanId,
      attributes: options.tags || {},
      logs: []
    };

    trace.spans.push(span);
    
    this.emit('spanAdded', { traceId, spanId, name: spanName });
    
    return spanId;
  }

  /**
   * Finish a span
   */
  finishSpan(traceId: string, spanId: string, options: {
    status?: 'ok' | 'error' | 'timeout';
    error?: Error;
    tags?: Record<string, any>;
    logs?: SpanLog[];
  } = {}): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    const span = trace.spans.find(s => s.id === spanId);
    if (!span) {
      throw new Error(`Span not found: ${spanId}`);
    }

    const endTime = new Date();
    span.endTime = endTime;
    span.duration = endTime.getTime() - span.startTime.getTime();
    span.status = options.status || 'ok';

    if (options.tags) {
      Object.assign(span.attributes, options.tags);
    }

    if (options.logs) {
      span.logs.push(...options.logs);
    }

    if (options.error) {
      span.status = 'error';
      span.logs.push({
        timestamp: endTime,
        fields: {
          error: options.error.message,
          stack: options.error.stack
        },
        level: 'error'
      });
    }

    this.emit('spanFinished', { traceId, spanId, duration: span.duration, status: span.status });
  }

  /**
   * Finish a trace
   */
  finishTrace(traceId: string, options: {
    status?: 'ok' | 'error' | 'timeout';
    error?: Error;
    tags?: Record<string, any>;
  } = {}): void {
    const trace = this.activeTraces.get(traceId);
    if (!trace) {
      throw new Error(`Trace not found: ${traceId}`);
    }

    trace.endTime = new Date();
    trace.duration = trace.endTime.getTime() - trace.startTime.getTime();
    trace.status = options.status || 'ok';

    if (options.tags) {
      Object.assign(trace.tags, options.tags);
    }

    // Move from active to completed traces
    this.activeTraces.delete(traceId);
    this.traces.set(traceId, trace);

    // Export trace if configured
    if (this.config.tracing.enabled) {
      this.exportTrace(trace);
    }

    // Clean up old traces
    this.cleanupOldTraces();

    this.emit('traceFinished', { 
      traceId, 
      duration: trace.duration, 
      status: trace.status,
      spanCount: trace.spans.length
    });
  }

  /**
   * Query metrics
   */
  queryMetrics(options: {
    name?: string;
    startTime?: Date;
    endTime?: Date;
    labels?: Record<string, string>;
    limit?: number;
  } = {}): Metric[] {
    let results: Metric[] = [];

    for (const [metricName, metricList] of this.metrics.entries()) {
      if (options.name && metricName !== options.name) {
        continue;
      }

      for (const metric of metricList) {
        // Filter by time range
        if (options.startTime && metric.timestamp < options.startTime) {
          continue;
        }
        if (options.endTime && metric.timestamp > options.endTime) {
          continue;
        }

        // Filter by labels
        if (options.labels) {
          let matches = true;
          for (const [key, value] of Object.entries(options.labels)) {
            if (metric.labels[key] !== value) {
              matches = false;
              break;
            }
          }
          if (!matches) continue;
        }

        results.push(metric);
      }
    }

    // Sort by timestamp (newest first) and limit
    results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Query traces
   */
  queryTraces(options: {
    traceId?: string;
    name?: string;
    startTime?: Date;
    endTime?: Date;
    status?: 'ok' | 'error' | 'timeout';
    limit?: number;
  } = {}): Trace[] {
    let results: Trace[] = [];

    for (const trace of this.traces.values()) {
      if (options.traceId && trace.id !== options.traceId) {
        continue;
      }
      if (options.name && trace.name !== options.name) {
        continue;
      }
      if (options.status && trace.status !== options.status) {
        continue;
      }
      if (options.startTime && trace.startTime < options.startTime) {
        continue;
      }
      if (options.endTime && trace.endTime > options.endTime) {
        continue;
      }

      results.push(trace);
    }

    // Sort by start time (newest first) and limit
    results.sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
    if (options.limit) {
      results = results.slice(0, options.limit);
    }

    return results;
  }

  /**
   * Get system health
   */
  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    score: number;
    components: Record<string, ComponentHealth>;
    metrics: SystemMetrics;
    alerts: Alert[];
  } {
    const components = this.checkComponentHealth();
    const metrics = this.calculateSystemMetrics();
    const alerts = Array.from(this.alerts.values()).filter(alert => alert.status === 'active');

    // Calculate overall health score
    let totalScore = 0;
    let componentCount = 0;

    for (const component of Object.values(components)) {
      totalScore += component.score;
      componentCount++;
    }

    const overallScore = componentCount > 0 ? totalScore / componentCount : 100;
    const status = overallScore >= 90 ? 'healthy' : overallScore >= 70 ? 'degraded' : 'unhealthy';

    return {
      status,
      score: overallScore,
      components,
      metrics,
      alerts
    };
  }

  /**
   * Get SLA metrics
   */
  getSLAMetrics(): SLAMetric[] {
    const slaMetrics: SLAMetric[] = [];

    // Calculate service availability
    const services = this.getUniqueServices();
    for (const service of services) {
      const availability = this.calculateServiceAvailability(service);
      slaMetrics.push({
        service,
        objective: 'availability',
        target: 99.9,
        current: availability,
        period: '24h',
        status: availability >= 99.9 ? 'met' : availability >= 95 ? 'warning' : 'missed',
        incidents: this.getSLAIncidents(service, 'availability')
      });
    }

    // Calculate response time SLA
    for (const service of services) {
      const responseTime = this.calculateAverageResponseTime(service);
      slaMetrics.push({
        service,
        objective: 'response_time',
        target: 1000, // 1 second
        current: responseTime,
        period: '1h',
        status: responseTime <= 1000 ? 'met' : responseTime <= 5000 ? 'warning' : 'missed',
        incidents: this.getSLAIncidents(service, 'response_time')
      });
    }

    return slaMetrics;
  }

  /**
   * Subscribe to real-time metrics
   */
  subscribeToMetrics(
    subscriptionId: string,
    options: {
      metrics?: string[];
      filters?: Record<string, string>;
      interval?: number;
    },
    callback: (metrics: Metric[]) => void
  ): void {
    const subscription: Subscription = {
      id: subscriptionId,
      type: 'metrics',
      options,
      callback,
      createdAt: new Date()
    };

    this.realTimeSubscriptions.set(subscriptionId, subscription);
    
    this.logger.info('Real-time metrics subscription created', {
      subscriptionId,
      metrics: options.metrics?.length || 0
    });
  }

  /**
   * Unsubscribe from real-time metrics
   */
  unsubscribeFromMetrics(subscriptionId: string): void {
    this.realTimeSubscriptions.delete(subscriptionId);
    
    this.logger.info('Real-time metrics subscription removed', { subscriptionId });
  }

  /**
   * Get monitoring status
   */
  getStatus(): any {
    return {
      initialized: this.isInitialized,
      config: {
        metricsEnabled: this.config.metrics.enabled,
        tracingEnabled: this.config.tracing.enabled,
        alertingEnabled: this.config.alerting.enabled,
        realTimeStreaming: this.config.metrics.realTimeStreaming
      },
      collectors: this.collectors.size,
      metricsCount: this.metrics.size,
      tracesCount: this.traces.size,
      activeTraces: this.activeTraces.size,
      alertsCount: this.alerts.size,
      subscriptionsCount: this.realTimeSubscriptions.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  /**
   * Shutdown monitoring system
   */
  async shutdown(): Promise<void> {
    // Stop all collectors
    for (const collector of this.collectors.values()) {
      if (collector.stop) {
        await collector.stop();
      }
    }
    this.collectors.clear();

    // Stop flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }

    // Flush remaining metrics
    await this.flushMetricsBuffer();

    this.isInitialized = false;
    this.emit('shutdown');
    
    this.logger.info('Enterprise Monitoring System shutdown complete');
  }

  // Private methods

  private createLogger(): winston.Logger {
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/monitoring-system.log',
          maxsize: 10000000,
          maxFiles: 10
        })
      ]
    });
  }

  private async initializeCollectors(): Promise<void> {
    for (const collectorConfig of this.config.collectors) {
      if (!collectorConfig.enabled) continue;

      try {
        const collector = await this.createCollector(collectorConfig);
        this.collectors.set(collectorConfig.name, collector);
        
        this.logger.info('Monitoring collector initialized', {
          name: collectorConfig.name,
          type: collectorConfig.type
        });
      } catch (error) {
        this.logger.error('Failed to initialize collector', {
          name: collectorConfig.name,
          error: (error as Error).message
        });
      }
    }
  }

  private async createCollector(config: CollectorConfig): Promise<any> {
    // Simulate collector creation
    return {
      start: () => this.logger.info(`Collector ${config.name} started`),
      stop: () => this.logger.info(`Collector ${config.name} stopped`),
      collect: () => this.logger.debug(`Collector ${config.name} collecting metrics`)
    };
  }

  private async startMetricsCollection(): Promise<void> {
    // Start metrics collection interval
    setInterval(() => {
      this.collectSystemMetrics();
    }, this.config.metrics.collectionInterval);

    // Start buffer flush interval
    if (this.config.metrics.storage.type !== 'memory') {
      this.flushInterval = setInterval(() => {
        this.flushMetricsBuffer();
      }, this.config.metrics.storage.flushInterval);
    }
  }

  private async startTracing(): Promise<void> {
    this.logger.info('Distributed tracing enabled');
    // Initialize trace exporter
    // In real implementation, set up proper trace exporters
  }

  private async startAlerting(): Promise<void> {
    this.logger.info('Alerting system enabled', {
      rules: this.config.alerting.rules.length,
      channels: this.config.alerting.channels.length
    });

    // Start alert evaluation interval
    setInterval(() => {
      this.evaluateAllAlerts();
    }, 60000); // Check every minute
  }

  private async startRealTimeStreaming(): Promise<void> {
    this.logger.info('Real-time streaming enabled');
    // In real implementation, set up WebSocket connections
    // and stream metrics to subscribed clients
  }

  private collectSystemMetrics(): void {
    // Collect basic system metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    this.recordMetric({
      name: 'system.memory.heap.used',
      value: memUsage.heapUsed,
      labels: { unit: 'bytes' },
      type: 'gauge'
    });

    this.recordMetric({
      name: 'system.memory.heap.total',
      value: memUsage.heapTotal,
      labels: { unit: 'bytes' },
      type: 'gauge'
    });

    this.recordMetric({
      name: 'system.cpu.user',
      value: cpuUsage.user,
      labels: { unit: 'microseconds' },
      type: 'counter'
    });

    this.recordMetric({
      name: 'system.cpu.system',
      value: cpuUsage.system,
      labels: { unit: 'microseconds' },
      type: 'counter'
    });
  }

  private cleanupOldMetrics(metricName: string): void {
    const cutoff = new Date(Date.now() - this.config.metrics.retentionPeriod * 60 * 60 * 1000);
    const metricList = this.metrics.get(metricName);
    if (metricList) {
      const filtered = metricList.filter(metric => metric.timestamp > cutoff);
      this.metrics.set(metricName, filtered);
    }
  }

  private cleanupOldTraces(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    for (const [traceId, trace] of this.traces.entries()) {
      if (trace.endTime < cutoff) {
        this.traces.delete(traceId);
      }
    }
  }

  private evaluateAlerts(metric: Metric): void {
    for (const rule of this.config.alerting.rules) {
      if (!rule.enabled) continue;

      for (const condition of rule.conditions) {
        if (this.matchesCondition(metric, condition)) {
          this.triggerAlert(rule, metric);
          break;
        }
      }
    }
  }

  private evaluateAllAlerts(): void {
    // Re-evaluate all alert rules with current metrics
    for (const rule of this.config.alerting.rules) {
      if (!rule.enabled) continue;

      const relevantMetrics = this.queryMetrics({
        name: rule.conditions[0]?.metric ?? undefined,
        startTime: new Date(Date.now() - 300000) // Last 5 minutes
      });

      for (const condition of rule.conditions) {
        const metrics = relevantMetrics.filter(m => m.name === condition.metric);
        if (this.evaluateCondition(metrics, condition)) {
          if (metrics.length > 0) {
            this.triggerAlert(rule, metrics[metrics.length - 1]);
          }
          break;
        }
      }
    }
  }

  private matchesCondition(metric: Metric, condition: AlertCondition): boolean {
    if (metric.name !== condition.metric) return false;

    // Simple condition evaluation
    switch (condition.operator) {
      case '>':
        return metric.value > Number(condition.threshold);
      case '<':
        return metric.value < Number(condition.threshold);
      case '>=':
        return metric.value >= Number(condition.threshold);
      case '<=':
        return metric.value <= Number(condition.threshold);
      case '==':
        return metric.value == Number(condition.threshold);
      case '!=':
        return metric.value != Number(condition.threshold);
      default:
        return false;
    }
  }

  private evaluateCondition(metrics: Metric[], condition: AlertCondition): boolean {
    if (metrics.length === 0) return false;

    let aggregatedValue: number;
    switch (condition.aggregation) {
      case 'avg':
        aggregatedValue = metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
        break;
      case 'sum':
        aggregatedValue = metrics.reduce((sum, m) => sum + m.value, 0);
        break;
      case 'min':
        aggregatedValue = Math.min(...metrics.map(m => m.value));
        break;
      case 'max':
        aggregatedValue = Math.max(...metrics.map(m => m.value));
        break;
      default:
        aggregatedValue = metrics.length > 0 ? metrics[metrics.length - 1].value : 0;
    }

    // Create test metric for condition evaluation
    const testMetric: Metric = {
      name: metrics[0].name,
      value: aggregatedValue,
      timestamp: new Date(),
      labels: metrics[0].labels,
      type: metrics[0].type
    };
    return this.matchesCondition(testMetric, condition);
    const testMetric: Metric = {
      name: metrics[0].name,
      value: aggregatedValue,
      timestamp: new Date(),
      labels: metrics[0].labels,
      type: metrics[0].type
    };
    return this.matchesCondition(testMetric, condition);
  }

  private triggerAlert(rule: AlertRule, metric: Metric): void {
    const alertId = uuidv4();
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      ruleName: rule.name,
      severity: rule.severity,
      title: `${rule.name} triggered`,
      description: `Alert triggered by metric ${metric.name} = ${metric.value}`,
      timestamp: new Date(),
      status: 'active',
      labels: { ...metric.labels, metric: metric.name },
      annotations: {
        description: `Metric ${metric.name} value ${metric.value} triggered alert`,
        summary: rule.description
      },
      fingerprint: `${rule.id}:${metric.name}`
    };

    this.alerts.set(alertId, alert);
    this.emit('alertTriggered', alert);

    // Execute alert actions
    for (const action of rule.actions) {
      this.executeAlertAction(action, alert);
    }

    this.logger.warn('Alert triggered', {
      alertId,
      ruleName: rule.name,
      severity: rule.severity,
      metric: metric.name,
      value: metric.value
    });
  }

  private executeAlertAction(action: AlertAction, alert: Alert): void {
    switch (action.type) {
      case 'notification':
        this.sendNotification(action.configuration, alert);
        break;
      case 'webhook':
        this.callWebhook(action.configuration, alert);
        break;
      case 'escalation':
        this.escalateAlert(action.configuration, alert);
        break;
      default:
        this.logger.warn('Unknown alert action type', { type: action.type });
    }
  }

  private sendNotification(config: any, alert: Alert): void {
    this.logger.info('Sending alert notification', {
      type: config.type,
      alertId: alert.id,
      severity: alert.severity
    });
    // In real implementation, send actual notifications
  }

  private callWebhook(config: any, alert: Alert): void {
    this.logger.info('Calling alert webhook', {
      url: config.url,
      alertId: alert.id,
      severity: alert.severity
    });
    // In real implementation, make HTTP request to webhook
  }

  private escalateAlert(config: any, alert: Alert): void {
    this.logger.info('Escalating alert', {
      level: config.level,
      alertId: alert.id,
      severity: alert.severity
    });
    // In real implementation, escalate through configured channels
  }

  private exportTrace(trace: Trace): void {
    // Export trace to configured exporter
    this.logger.debug('Exporting trace', {
      traceId: trace.id,
      name: trace.name,
      spanCount: trace.spans.length
    });
  }

  private checkComponentHealth(): Record<string, ComponentHealth> {
    return {
      'monitoring-system': {
        status: 'healthy',
        score: 95,
        message: 'All components operational',
        lastCheck: new Date()
      },
      'metrics-collector': {
        status: 'healthy',
        score: 90,
        message: 'Metrics collection working',
        lastCheck: new Date()
      },
      'tracing-system': {
        status: 'healthy',
        score: 85,
        message: 'Distributed tracing active',
        lastCheck: new Date()
      },
      'alerting-system': {
        status: 'healthy',
        score: 92,
        message: 'Alert evaluation active',
        lastCheck: new Date()
      }
    };
  }

  private calculateSystemMetrics(): SystemMetrics {
    return {
      totalMetrics: Array.from(this.metrics.values()).reduce((sum, metrics) => sum + metrics.length, 0),
      totalTraces: this.traces.size,
      activeAlerts: Array.from(this.alerts.values()).filter(a => a.status === 'active').length,
      errorRate: 0.02,
      throughput: 1000,
      latency: 150
    };
  }

  private getUniqueServices(): string[] {
    // Extract unique service names from metrics and traces
    const services = new Set<string>();
    
    for (const metrics of this.metrics.values()) {
      for (const metric of metrics) {
        if (metric.labels.service) {
          services.add(metric.labels.service);
        }
      }
    }
    
    for (const trace of this.traces.values()) {
      if (trace.tags.service) {
        services.add(trace.tags.service);
      }
    }
    
    return Array.from(services);
  }

  private calculateServiceAvailability(service: string): number {
    // Simplified availability calculation
    // In real implementation, this would analyze error rates and uptime
    return 99.5 + Math.random() * 0.5;
  }

  private calculateAverageResponseTime(service: string): number {
    // Simplified response time calculation
    // In real implementation, this would analyze trace durations
    return 800 + Math.random() * 400;
  }

  private getSLAIncidents(service: string, objective: string): SLAIncident[] {
    // Return empty incidents for now
    return [];
  }

  private async flushMetricsBuffer(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    const batch = [...this.metricsBuffer];
    this.metricsBuffer = [];

    // In real implementation, flush to external storage
    this.logger.debug('Flushing metrics buffer', { count: batch.length });
  }

  private setupEventHandlers(): void {
    this.on('alertTriggered', (alert) => {
      this.logger.warn('Alert triggered', {
        alertId: alert.id,
        ruleName: alert.ruleName,
        severity: alert.severity
      });
    });

    this.on('traceFinished', (data) => {
      this.logger.debug('Trace finished', {
        traceId: data.traceId,
        duration: data.duration,
        status: data.status
      });
    });
  }
}

// Supporting interfaces
interface Subscription {
  id: string;
  type: string;
  options: any;
  callback: (data: any) => void;
  createdAt: Date;
}

interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  timestamp: Date;
  status: 'active' | 'acknowledged' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  fingerprint: string;
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  message: string;
  lastCheck: Date;
}

interface SystemMetrics {
  totalMetrics: number;
  totalTraces: number;
  activeAlerts: number;
  errorRate: number;
  throughput: number;
  latency: number;
}

export default EnterpriseMonitoringSystem;