import { EventEmitter } from './EventEmitter';
import { SystemMetrics } from './SystemMetrics';

export interface ProcessMetrics {
  pid: number;
  name: string;
  cpuUsage: number;
  memoryUsage: number;
  uptime: number;
  status: 'running' | 'stopped' | 'error';
  lastActivity: Date;
}

export interface ProcessConfig {
  maxMemoryUsage: number; // MB
  maxCpuUsage: number; // Percentage
  healthCheckInterval: number; // milliseconds
  autoRestart: boolean;
  restartAttempts: number;
  restartDelay: number; // milliseconds
}

export class ProcessMonitor {
  private processes = new Map<string, ProcessMetrics>();
  private configs = new Map<string, ProcessConfig>();
  private timers = new Map<string, NodeJS.Timeout>();
  private eventEmitter: EventEmitter;
  private metrics: SystemMetrics;

  constructor(eventEmitter: EventEmitter, metrics: SystemMetrics) {
    this.eventEmitter = eventEmitter;
    this.metrics = metrics;
  }

  async startMonitoring(processId: string, config: ProcessConfig): Promise<void> {
    this.configs.set(processId, config);
    
    const metrics = await this.collectProcessMetrics(processId);
    this.processes.set(processId, metrics);

    // Start health check interval
    const timer = setInterval(async () => {
      await this.checkProcessHealth(processId);
    }, config.healthCheckInterval);

    this.timers.set(processId, timer);

    this.eventEmitter.emit('processMonitored', { processId, action: 'start' });
    this.metrics.incrementCounter('automation_processes_monitored');
  }

  async stopMonitoring(processId: string): Promise<void> {
    const timer = this.timers.get(processId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(processId);
    }

    this.processes.delete(processId);
    this.configs.delete(processId);

    this.eventEmitter.emit('processMonitored', { processId, action: 'stop' });
    this.metrics.decrementCounter('automation_processes_monitored');
  }

  async getProcessMetrics(processId: string): Promise<ProcessMetrics | null> {
    return this.processes.get(processId) || null;
  }

  async getAllProcessMetrics(): Promise<ProcessMetrics[]> {
    return Array.from(this.processes.values());
  }

  private async collectProcessMetrics(processId: string): Promise<ProcessMetrics> {
    // Mock implementation - in real scenario, would collect actual process metrics
    return {
      pid: Math.floor(Math.random() * 65536),
      name: `process-${processId}`,
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 512,
      uptime: Date.now(),
      status: 'running',
      lastActivity: new Date()
    };
  }

  private async checkProcessHealth(processId: string): Promise<void> {
    const config = this.configs.get(processId);
    const metrics = this.processes.get(processId);
    
    if (!config || !metrics) return;

    const currentMetrics = await this.collectProcessMetrics(processId);
    currentMetrics.lastActivity = new Date();
    this.processes.set(processId, currentMetrics);

    let isHealthy = true;
    const issues: string[] = [];

    // Check memory usage
    if (currentMetrics.memoryUsage > config.maxMemoryUsage) {
      isHealthy = false;
      issues.push(`Memory usage ${currentMetrics.memoryUsage}MB exceeds limit ${config.maxMemoryUsage}MB`);
    }

    // Check CPU usage
    if (currentMetrics.cpuUsage > config.maxCpuUsage) {
      isHealthy = false;
      issues.push(`CPU usage ${currentMetrics.cpuUsage}% exceeds limit ${config.maxCpuUsage}%`);
    }

    // Update metrics
    this.metrics.recordGauge('automation_process_memory_usage', currentMetrics.memoryUsage);
    this.metrics.recordGauge('automation_process_cpu_usage', currentMetrics.cpuUsage);

    if (!isHealthy) {
      currentMetrics.status = 'error';
      this.eventEmitter.emit('processUnhealthy', {
        processId,
        issues,
        metrics: currentMetrics
      });

      // Auto-restart if configured
      if (config.autoRestart) {
        await this.attemptRestart(processId, config);
      }
    } else {
      currentMetrics.status = 'running';
    }
  }

  private async attemptRestart(processId: string, config: ProcessConfig): Promise<void> {
    // Implementation would depend on how processes are managed
    // This is a placeholder for the restart logic
    
    this.eventEmitter.emit('processRestartAttempted', { processId });
    
    try {
      // Simulate restart process
      await new Promise(resolve => setTimeout(resolve, config.restartDelay));
      
      this.eventEmitter.emit('processRestarted', { processId });
      this.metrics.incrementCounter('automation_processes_restarted');
    } catch (error) {
      this.eventEmitter.emit('processRestartFailed', { 
        processId, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  async getHealthReport(): Promise<{
    totalProcesses: number;
    healthyProcesses: number;
    unhealthyProcesses: number;
    averageCpuUsage: number;
    averageMemoryUsage: number;
  }> {
    const processes = Array.from(this.processes.values());
    const healthyProcesses = processes.filter(p => p.status === 'running').length;
    const unhealthyProcesses = processes.filter(p => p.status !== 'running').length;

    return {
      totalProcesses: processes.length,
      healthyProcesses,
      unhealthyProcesses,
      averageCpuUsage: processes.reduce((sum, p) => sum + p.cpuUsage, 0) / processes.length || 0,
      averageMemoryUsage: processes.reduce((sum, p) => sum + p.memoryUsage, 0) / processes.length || 0
    };
  }
}