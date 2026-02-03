export interface SystemMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags: Record<string, string | number> | undefined;
}

export interface PerformanceMetric {
  responseTime: number;
  throughput: number;
  errorRate: number;
  successRate: number;
  timestamp: Date;
}

export interface BusinessMetric {
  totalProcessed: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageProcessingTime: number;
  peakConcurrentTasks: number;
  timestamp: Date;
}

export interface ResourceMetric {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkLatency: number;
  timestamp: Date;
}

export class SystemMetrics {
  private metrics: Map<string, SystemMetric[]> = new Map();
  private performanceHistory: PerformanceMetric[] = [];
  private businessHistory: BusinessMetric[] = [];
  private resourceHistory: ResourceMetric[] = [];
  private startTime: Date = new Date();
  private peakMemory = 0;
  private peakCPU = 0;

  // Track current state
  private currentTasks = 0;
  private totalTasks = 0;
  private successfulTasks = 0;
  private failedTasks = 0;
  private totalResponseTime = 0;

  constructor() {
    this.startResourceMonitoring();
  }

  private startResourceMonitoring(): void {
    // Monitor resource usage every 30 seconds
    setInterval(() => {
      this.collectResourceMetrics();
    }, 30000);
  }

  private collectResourceMetrics(): void {
    try {
      const usage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      const resourceMetric: ResourceMetric = {
        cpuUsage: this.calculateCPUPercentage(cpuUsage),
        memoryUsage: usage.heapUsed / usage.heapTotal * 100,
        diskUsage: 0, // Would need fs stats in real implementation
        networkLatency: 0, // Would need network monitoring in real implementation
        timestamp: new Date()
      };

      // Update peaks
      if (resourceMetric.cpuUsage > this.peakCPU) {
        this.peakCPU = resourceMetric.cpuUsage;
      }
      if (resourceMetric.memoryUsage > this.peakMemory) {
        this.peakMemory = resourceMetric.memoryUsage;
      }

      this.resourceHistory.push(resourceMetric);

      // Keep only last 100 entries
      if (this.resourceHistory.length > 100) {
        this.resourceHistory = this.resourceHistory.slice(-100);
      }
    } catch (error) {
      console.error('Error collecting resource metrics:', error);
    }
  }

  private calculateCPUPercentage(cpuUsage: { user: number; system: number }): number {
    // Simple CPU percentage calculation
    // In a real implementation, you'd want more sophisticated CPU monitoring
    return Math.min((cpuUsage.user + cpuUsage.system) / 1000000 * 100, 100);
  }

  // Performance metrics
  recordResponseTime(responseTime: number, tags?: Record<string, string | number>): void {
    this.totalResponseTime += responseTime;
    this.recordMetric('response_time', responseTime, 'ms', tags);
  }

  recordThroughput(throughput: number, tags?: Record<string, string | number>): void {
    this.recordMetric('throughput', throughput, 'ops/sec', tags);
  }

  // Task execution metrics
  taskStarted(): void {
    this.currentTasks++;
    this.totalTasks++;
    
    this.recordMetric('active_tasks', this.currentTasks, 'count');
    this.recordMetric('total_tasks', this.totalTasks, 'count');
  }

  taskCompleted(success: boolean, processingTime?: number): void {
    this.currentTasks--;
    
    if (success) {
      this.successfulTasks++;
    } else {
      this.failedTasks++;
    }

    if (processingTime !== undefined) {
      this.recordResponseTime(processingTime);
    }

    this.recordMetric('active_tasks', this.currentTasks, 'count');
    this.recordMetric('successful_tasks', this.successfulTasks, 'count');
    this.recordMetric('failed_tasks', this.failedTasks, 'count');

    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  private updatePerformanceMetrics(): void {
    const totalCompleted = this.successfulTasks + this.failedTasks;
    if (totalCompleted === 0) return;

    const avgResponseTime = totalCompleted > 0 ? this.totalResponseTime / totalCompleted : 0;
    const successRate = totalCompleted > 0 ? this.successfulTasks / totalCompleted : 0;
    const errorRate = 1 - successRate;

    // Calculate throughput (tasks per minute)
    const uptimeMinutes = (Date.now() - this.startTime.getTime()) / (1000 * 60);
    const throughput = uptimeMinutes > 0 ? totalCompleted / uptimeMinutes : 0;

    const performanceMetric: PerformanceMetric = {
      responseTime: avgResponseTime,
      throughput,
      errorRate,
      successRate,
      timestamp: new Date()
    };

    this.performanceHistory.push(performanceMetric);

    // Keep only last 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory = this.performanceHistory.slice(-100);
    }
  }

  // Custom metrics
  recordMetric(name: string, value: number, unit: string, tags?: Record<string, string | number>): void {
    const metric: SystemMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    this.metrics.get(name)!.push(metric);

    // Keep only last 1000 entries per metric
    const metricHistory = this.metrics.get(name)!;
    if (metricHistory.length > 1000) {
      this.metrics.set(name, metricHistory.slice(-1000));
    }
  }

  incrementCounter(name: string, tags?: Record<string, string | number>): void {
    const history = this.metrics.get(name) || [];
    const lastValue = history.length > 0 ? history[history.length - 1]!.value : 0;
    this.recordMetric(name, lastValue + 1, 'count', tags);
  }

  decrementCounter(name: string, tags?: Record<string, string | number>): void {
    const history = this.metrics.get(name) || [];
    const lastValue = history.length > 0 ? history[history.length - 1]!.value : 0;
    this.recordMetric(name, lastValue - 1, 'count', tags);
  }

  recordGauge(name: string, value: number, tags?: Record<string, string | number>): void {
    this.recordMetric(name, value, 'gauge', tags);
  }

  // Get current metrics
  getCurrentMetrics(): {
    performance: PerformanceMetric | null;
    business: BusinessMetric | null;
    resources: ResourceMetric | null;
  } {
    return {
      performance: this.performanceHistory[this.performanceHistory.length - 1] || null,
      business: this.getCurrentBusinessMetrics(),
      resources: this.resourceHistory[this.resourceHistory.length - 1] || null
    };
  }

  private getCurrentBusinessMetrics(): BusinessMetric {
    const totalCompleted = this.successfulTasks + this.failedTasks;
    const avgProcessingTime = totalCompleted > 0 ? this.totalResponseTime / totalCompleted : 0;

    return {
      totalProcessed: totalCompleted,
      successfulExecutions: this.successfulTasks,
      failedExecutions: this.failedTasks,
      averageProcessingTime: avgProcessingTime,
      peakConcurrentTasks: Math.max(...this.getMetricValues('active_tasks')),
      timestamp: new Date()
    };
  }

  private getMetricValues(metricName: string): number[] {
    const metricHistory = this.metrics.get(metricName);
    return metricHistory ? metricHistory.map(m => m.value) : [];
  }

  // Get historical data
  getMetricHistory(metricName: string, limit = 100): SystemMetric[] {
    const metricHistory = this.metrics.get(metricName);
    if (!metricHistory) return [];
    
    return metricHistory.slice(-limit);
  }

  getPerformanceHistory(limit = 50): PerformanceMetric[] {
    return this.performanceHistory.slice(-limit);
  }

  getBusinessHistory(limit = 50): BusinessMetric[] {
    return this.businessHistory.slice(-limit);
  }

  getResourceHistory(limit = 50): ResourceMetric[] {
    return this.resourceHistory.slice(-limit);
  }

  // Aggregated statistics
  getStatistics(): {
    uptime: number;
    totalTasks: number;
    successRate: number;
    averageResponseTime: number;
    peakMemory: number;
    peakCPU: number;
    currentActiveTasks: number;
  } {
    const uptime = Date.now() - this.startTime.getTime();
    const totalCompleted = this.successfulTasks + this.failedTasks;
    const successRate = totalCompleted > 0 ? this.successfulTasks / totalCompleted : 0;
    const avgResponseTime = totalCompleted > 0 ? this.totalResponseTime / totalCompleted : 0;

    return {
      uptime,
      totalTasks: this.totalTasks,
      successRate,
      averageResponseTime: avgResponseTime,
      peakMemory: this.peakMemory,
      peakCPU: this.peakCPU,
      currentActiveTasks: this.currentTasks
    };
  }

  // Reset metrics
  reset(): void {
    this.metrics.clear();
    this.performanceHistory = [];
    this.businessHistory = [];
    this.resourceHistory = [];
    this.startTime = new Date();
    this.peakMemory = 0;
    this.peakCPU = 0;
    this.currentTasks = 0;
    this.totalTasks = 0;
    this.successfulTasks = 0;
    this.failedTasks = 0;
    this.totalResponseTime = 0;
  }

  // Export metrics for external monitoring
  exportMetrics(): {
    current: ReturnType<SystemMetrics['getCurrentMetrics']>;
    statistics: ReturnType<SystemMetrics['getStatistics']>;
    history: {
      performance: PerformanceMetric[];
      resources: ResourceMetric[];
    };
  } {
    return {
      current: this.getCurrentMetrics(),
      statistics: this.getStatistics(),
      history: {
        performance: this.performanceHistory,
        resources: this.resourceHistory
      }
    };
  }
}