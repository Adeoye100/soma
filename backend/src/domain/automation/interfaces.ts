import { 
  AutomationConfig, 
  AutomationResult, 
  AutomationEvent, 
  AutomationTrigger,
  ScheduledTask,
  AutomationRule,
  ExternalIntegration,
  BusinessRule,
  WorkflowContext,
  ActionConfig,
  ConditionConfig
} from './types';

export interface IAutomationEngine {
  execute(config: AutomationConfig): Promise<AutomationResult>;
  validateConfig(config: AutomationConfig): Promise<boolean>;
  getStatus(automationId: string): Promise<AutomationStatus>;
}

export interface IAutomationEventHandler {
  handle(event: AutomationEvent): Promise<void>;
  subscribe(trigger: AutomationTrigger): Promise<void>;
  unsubscribe(triggerId: string): Promise<void>;
}

export interface IWorkflowProcessor {
  processWorkflow(workflowId: string, context: WorkflowContext): Promise<AutomationResult>;
  validateWorkflow(workflowId: string): Promise<boolean>;
  getWorkflowHistory(workflowId: string): Promise<AutomationResult[]>;
}

export interface IScheduledTaskManager {
  scheduleTask(task: ScheduledTask): Promise<string>;
  cancelTask(taskId: string): Promise<boolean>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  listActiveTasks(): Promise<ScheduledTask[]>;
}

export interface IBusinessRuleEngine {
  evaluateRule(rule: BusinessRule, context: WorkflowContext): Promise<boolean>;
  executeAction(action: ActionConfig, context: WorkflowContext): Promise<any>;
  validateCondition(condition: ConditionConfig, context: WorkflowContext): Promise<boolean>;
}

export interface IExternalIntegration {
  connect(config: ExternalIntegration): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  sendData(endpoint: string, data: any): Promise<any>;
  receiveData(endpoint: string, params?: any): Promise<any>;
}

export interface IProcessingQueue {
  addJob(job: AutomationJob): Promise<string>;
  getJobStatus(jobId: string): Promise<JobStatus>;
  cancelJob(jobId: string): Promise<boolean>;
  getQueueStats(): Promise<QueueStats>;
}

export interface IConfigurationManager {
  getConfig(key: string): Promise<any>;
  setConfig(key: string, value: any): Promise<void>;
  validateConfig(config: any): Promise<boolean>;
  getAllConfigs(): Promise<Record<string, any>>;
}

export interface IEventBus {
  publish(event: string, data: any): Promise<void>;
  subscribe(event: string, handler: Function): Promise<void>;
  unsubscribe(event: string, handler: Function): Promise<void>;
  emit(event: string, data: any): Promise<void>;
}

export interface ILoggingService {
  log(level: LogLevel, message: string, context?: any): Promise<void>;
  debug(message: string, context?: any): Promise<void>;
  info(message: string, context?: any): Promise<void>;
  warn(message: string, context?: any): Promise<void>;
  error(message: string, error?: Error, context?: any): Promise<void>;
}

export interface IMetricsCollector {
  recordMetric(name: string, value: number, tags?: Record<string, string>): Promise<void>;
  incrementCounter(name: string, tags?: Record<string, string>): Promise<void>;
  recordTimer(name: string, duration: number, tags?: Record<string, string>): Promise<void>;
  getMetrics(): Promise<Record<string, any>>;
}

export interface IHealthChecker {
  checkHealth(): Promise<HealthStatus>;
  isHealthy(): Promise<boolean>;
  getDependencies(): Promise<string[]>;
  checkDependency(name: string): Promise<boolean>;
}

export interface IBackupManager {
  createBackup(path: string): Promise<BackupResult>;
  restoreBackup(backupId: string, targetPath: string): Promise<boolean>;
  listBackups(): Promise<BackupInfo[]>;
  deleteBackup(backupId: string): Promise<boolean>;
}

// Additional types for interfaces
export interface AutomationStatus {
  id: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'paused';
  progress: number;
  lastRun?: Date;
  nextRun?: Date;
  error?: string;
}

export interface TaskStatus {
  id: string;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  nextExecution?: Date;
  lastExecution?: Date;
  error?: string;
}

export interface AutomationJob {
  id: string;
  type: string;
  data: any;
  priority: number;
  retryCount: number;
  maxRetries: number;
  scheduledAt: Date;
  createdAt: Date;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  result?: any;
}

export interface QueueStats {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Record<string, boolean>;
  timestamp: Date;
  uptime: number;
  version: string;
}

export interface BackupResult {
  id: string;
  path: string;
  size: number;
  createdAt: Date;
  checksum: string;
}

export interface BackupInfo {
  id: string;
  name: string;
  path: string;
  size: number;
  createdAt: Date;
  checksum: string;
  type: 'full' | 'incremental';
}