import { Queue, Worker, Job, QueueEvents, ConnectionOptions } from 'bullmq';
import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Distributed Task Processing Engine
 * Simplified version focusing on core functionality
 */

// Core interfaces and types
export interface TaskDefinition {
  id: string;
  name: string;
  handler: string;
  queue: string;
  concurrency: number;
  timeout: number;
  retries: {
    attempts: number;
    backoff: {
      type: 'exponential' | 'linear' | 'fixed';
      delay: number;
      maxDelay?: number;
    };
  };
  priority: TaskPriority;
  resources?: {
    memory?: number;
    cpu?: number;
    disk?: number;
  };
  dependencies?: string[];
  environment?: Record<string, any>;
}

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface TaskExecution {
  id: string;
  taskId: string;
  correlationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: TaskPriority;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  retryCount: number;
  maxRetries: number;
  result?: any;
  error?: string;
  metadata: Record<string, any>;
}

export interface TaskMetrics {
  totalExecuted: number;
  successCount: number;
  failureCount: number;
  averageExecutionTime: number;
  throughput: number;
  errorRate: number;
  activeTasks: number;
  queuedTasks: number;
}

export interface TaskEngineConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    database?: number;
  };
  queues: {
    defaultConcurrency: number;
    defaultTimeout: number;
    priorityMapping: Record<TaskPriority, number>;
  };
  monitoring: {
    metricsInterval: number;
    healthCheckInterval: number;
  };
}

/**
 * Enterprise Distributed Task Processing Engine
 */
export class DistributedTaskEngine extends EventEmitter {
  private logger: winston.Logger;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker[]> = new Map();
  private queueEvents: Map<string, QueueEvents> = new Map();
  private taskDefinitions: Map<string, TaskDefinition> = new Map();
  private activeExecutions: Map<string, TaskExecution> = new Map();
  private metrics: TaskMetrics;
  private config: TaskEngineConfig;
  private isShuttingDown = false;

  constructor(config: TaskEngineConfig) {
    super();
    this.config = config;
    this.logger = this.createLogger();
    this.metrics = this.initializeMetrics();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize the task engine
   */
  async initialize(): Promise<void> {
    try {
      this.logger.info('Initializing Distributed Task Engine...');
      
      // Initialize queues and workers
      await this.initializeQueues();
      await this.initializeWorkers();
      
      // Start monitoring
      this.startMonitoring();
      
      this.emit('initialized');
      this.logger.info('Distributed Task Engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Distributed Task Engine', error);
      throw error;
    }
  }

  /**
   * Register a task definition
   */
  registerTask(task: TaskDefinition): void {
    this.taskDefinitions.set(task.id, task);
    this.logger.info(`Task registered: ${task.id}`, {
      queue: task.queue,
      priority: task.priority,
      concurrency: task.concurrency
    });
  }

  /**
   * Execute a task with priority scheduling
   */
  async executeTask(
    taskId: string,
    data: any,
    options: {
      priority?: TaskPriority;
      correlationId?: string;
      delay?: number;
      timeout?: number;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const task = this.taskDefinitions.get(taskId);
    if (!task) {
      throw new Error(`Task definition not found: ${taskId}`);
    }

    const correlationId = options.correlationId || uuidv4();
    const execution: TaskExecution = {
      id: correlationId,
      taskId,
      correlationId,
      status: 'pending',
      priority: options.priority || task.priority,
      retryCount: 0,
      maxRetries: task.retries.attempts,
      metadata: {
        ...options.metadata,
        taskName: task.name,
        queuedAt: new Date().toISOString()
      }
    };

    this.activeExecutions.set(correlationId, execution);
    this.emit('taskQueued', { executionId: correlationId, taskId, data });

    try {
      const queue = await this.getQueue(task.queue);
      const job = await queue.add(
        task.handler,
        {
          correlationId,
          taskId,
          data,
          taskDefinition: task
        },
        {
          priority: this.getPriorityValue(options.priority || task.priority),
          delay: options.delay || 0,
          attempts: task.retries.attempts,
          backoff: task.retries.backoff
        }
      );

      this.logger.info(`Task queued: ${taskId}`, {
        correlationId,
        jobId: job.id,
        priority: options.priority || task.priority
      });

      return correlationId;
    } catch (error) {
      this.activeExecutions.delete(correlationId);
      this.logger.error(`Failed to queue task: ${taskId}`, error);
      throw error;
    }
  }

  /**
   * Execute multiple tasks in parallel with dependency management
   */
  async executeTaskBatch(
    tasks: Array<{
      taskId: string;
      data: any;
      options?: {
        priority?: TaskPriority;
        delay?: number;
        metadata?: Record<string, any>;
      };
    }>
  ): Promise<string[]> {
    const executionIds: string[] = [];
    const taskDefinitions = tasks.map(t => this.taskDefinitions.get(t.taskId));

    // Validate dependencies
    for (let i = 0; i < tasks.length; i++) {
      const taskDef = taskDefinitions[i];
      const task = tasks[i];
      if (!taskDef || !task) {
        throw new Error(`Task definition not found: ${task ? task.taskId : 'unknown'}`);
      }

      if (taskDef.dependencies) {
        const missingDeps = taskDef.dependencies.filter(dep => 
          !tasks.find(t => t.taskId === dep)
        );
        if (missingDeps.length > 0) {
          throw new Error(`Missing dependencies for task ${taskDef.id}: ${missingDeps.join(', ')}`);
        }
      }
    }

    // Execute tasks in parallel
    const executionPromises = tasks.map(async (task, index) => {
      const correlationId = await this.executeTask(
        task.taskId,
        task.data,
        task.options
      );
      executionIds.push(correlationId);
      return correlationId;
    });

    await Promise.allSettled(executionPromises);
    return executionIds;
  }

  /**
   * Get task execution status
   */
  getExecutionStatus(correlationId: string): TaskExecution | undefined {
    return this.activeExecutions.get(correlationId);
  }

  /**
   * Cancel a running task
   */
  async cancelTask(correlationId: string): Promise<boolean> {
    const execution = this.activeExecutions.get(correlationId);
    if (!execution) {
      return false;
    }

    try {
      const task = this.taskDefinitions.get(execution.taskId);
      if (!task) {
        return false;
      }

      const queue = await this.getQueue(task.queue);
      const jobs = await queue.getWaiting();
      
      // Find and remove the job
      const job = jobs.find(j => j.data?.correlationId === correlationId);
      if (job) {
        await job.remove();
      }

      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - (execution.startTime?.getTime() || Date.now());
      
      this.emit('taskCancelled', { correlationId });
      this.logger.info(`Task cancelled: ${correlationId}`);
      
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel task: ${correlationId}`, error);
      return false;
    }
  }

  /**
   * Get system metrics
   */
  getMetrics(): TaskMetrics {
    return { ...this.metrics };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<any> {
    const queue = await this.getQueue(queueName);
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed()
    ]);

    return {
      queueName,
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      total: waiting.length + active.length + completed.length + failed.length
    };
  }

  /**
   * Shutdown the task engine
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    this.logger.info('Shutting down Distributed Task Engine...');

    try {
      // Close all workers
      const workerPromises = Array.from(this.workers.values())
        .flat()
        .map(worker => worker.close());
      
      // Close all queues
      const queuePromises = Array.from(this.queues.values())
        .map(queue => queue.close());
      
      // Close all event listeners
      const eventsPromises = Array.from(this.queueEvents.values())
        .map(events => events.close());

      await Promise.all([
        ...workerPromises,
        ...queuePromises,
        ...eventsPromises
      ]);

      this.emit('shutdown');
      this.logger.info('Distributed Task Engine shutdown complete');
    } catch (error) {
      this.logger.error('Error during shutdown', error);
      throw error;
    }
  }

  // Private helper methods

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
          filename: 'logs/distributed-task-engine.log',
          maxsize: 10000000,
          maxFiles: 10
        })
      ]
    });
  }

  private async initializeQueues(): Promise<void> {
    const uniqueQueues = new Set(
      Array.from(this.taskDefinitions.values()).map(task => task.queue)
    );

    for (const queueName of uniqueQueues) {
      const queue = new Queue(queueName, {
        connection: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.database
        }
      });

      const events = new QueueEvents(queueName, {
        connection: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.database
        }
      });

      this.queues.set(queueName, queue);
      this.queueEvents.set(queueName, events);

      // Setup event handlers for this queue
      this.setupQueueEventHandlers(queueName, events);
    }
  }

  private async initializeWorkers(): Promise<void> {
    const tasksByQueue = this.groupTasksByQueue();
    
    for (const [queueName, tasks] of tasksByQueue) {
      // Create a worker for each task type
      for (const task of tasks) {
        const worker = new Worker(
          queueName,
          async (job) => {
            return await this.processTask(job);
          },
          {
            connection: {
              host: this.config.redis.host,
              port: this.config.redis.port,
              password: this.config.redis.password,
              db: this.config.redis.database
            },
            concurrency: task.concurrency
          }
        );

        worker.on('error', (error) => {
          this.logger.error(`Worker error for ${task.id}`, error);
        });

        worker.on('failed', (job, error) => {
          this.logger.error(`Job ${job?.id} failed for ${task.id}`, error);
        });

        if (!this.workers.has(queueName)) {
          this.workers.set(queueName, []);
        }
        this.workers.get(queueName)!.push(worker);
      }
    }
  }

  private async processTask(job: Job): Promise<any> {
    const { correlationId, taskId, data, taskDefinition } = job.data;
    
    try {
      // Update execution status
      const execution = this.activeExecutions.get(correlationId);
      if (execution) {
        execution.status = 'running';
        execution.startTime = new Date();
      }

      this.emit('taskStarted', { correlationId, taskId });

      // Process the task based on handler type
      let result: any;
      switch (taskDefinition.handler) {
        case 'compute-task':
          result = await this.processComputeTask(data);
          break;
        case 'api-call':
          result = await this.processApiCall(data);
          break;
        case 'file-processing':
          result = await this.processFileTask(data);
          break;
        default:
          result = { message: `Task ${taskId} processed`, data };
      }

      // Update execution status
      if (execution) {
        execution.status = 'completed';
        execution.endTime = new Date();
        execution.result = result;
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      }

      this.emit('taskCompleted', {
        correlationId,
        taskId,
        result,
        duration: execution?.duration || 0
      });

      return result;
    } catch (error) {
      const execution = this.activeExecutions.get(correlationId);
      if (execution) {
        execution.status = 'failed';
        execution.endTime = new Date();
        execution.error = (error as Error).message;
        execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
        execution.retryCount++;
      }

      this.emit('taskFailed', {
        correlationId,
        taskId,
        error: (error as Error).message,
        duration: execution?.duration || 0
      });

      throw error;
    }
  }

  private async processComputeTask(data: any): Promise<any> {
    // Simulate compute-intensive task
    await new Promise(resolve => setTimeout(Math.random() * 5000, resolve));
    return { result: `Compute task completed with data: ${JSON.stringify(data)}` };
  }

  private async processApiCall(data: any): Promise<any> {
    // Simulate API call
    await new Promise(resolve => setTimeout(Math.random() * 2000, resolve));
    return { result: `API call completed for: ${data.url || 'unknown endpoint'}` };
  }

  private async processFileTask(data: any): Promise<any> {
    // Simulate file processing
    await new Promise(resolve => setTimeout(Math.random() * 3000, resolve));
    return { result: `File processing completed for: ${data.filename || 'unknown file'}` };
  }

  private groupTasksByQueue(): Map<string, TaskDefinition[]> {
    const tasksByQueue = new Map<string, TaskDefinition[]>();
    
    for (const task of this.taskDefinitions.values()) {
      if (!tasksByQueue.has(task.queue)) {
        tasksByQueue.set(task.queue, []);
      }
      tasksByQueue.get(task.queue)!.push(task);
    }
    
    return tasksByQueue;
  }

  private async getQueue(queueName: string): Promise<Queue> {
    let queue = this.queues.get(queueName);
    if (!queue) {
      queue = new Queue(queueName, {
        connection: {
          host: this.config.redis.host,
          port: this.config.redis.port,
          password: this.config.redis.password,
          db: this.config.redis.database
        }
      });
      this.queues.set(queueName, queue);
    }
    return queue;
  }

  private getPriorityValue(priority: TaskPriority): number {
    return this.config.queues.priorityMapping[priority];
  }

  private initializeMetrics(): TaskMetrics {
    return {
      totalExecuted: 0,
      successCount: 0,
      failureCount: 0,
      averageExecutionTime: 0,
      throughput: 0,
      errorRate: 0,
      activeTasks: 0,
      queuedTasks: 0
    };
  }

  private setupEventHandlers(): void {
    this.on('taskCompleted', (data) => {
      this.metrics.totalExecuted++;
      this.metrics.successCount++;
      this.metrics.activeTasks--;
      
      // Update average execution time
      const totalTime = this.metrics.averageExecutionTime * (this.metrics.totalExecuted - 1);
      this.metrics.averageExecutionTime = (totalTime + data.duration) / this.metrics.totalExecuted;
      
      // Update throughput and error rate
      this.metrics.throughput = this.metrics.totalExecuted / (Date.now() / 1000);
      this.metrics.errorRate = this.metrics.failureCount / this.metrics.totalExecuted;
    });

    this.on('taskFailed', (data) => {
      this.metrics.totalExecuted++;
      this.metrics.failureCount++;
      this.metrics.activeTasks--;
      
      const totalTime = this.metrics.averageExecutionTime * (this.metrics.totalExecuted - 1);
      this.metrics.averageExecutionTime = (totalTime + data.duration) / this.metrics.totalExecuted;
      this.metrics.throughput = this.metrics.totalExecuted / (Date.now() / 1000);
      this.metrics.errorRate = this.metrics.failureCount / this.metrics.totalExecuted;
    });

    this.on('taskQueued', () => {
      this.metrics.queuedTasks++;
    });
  }

  private setupQueueEventHandlers(queueName: string, events: QueueEvents): void {
    events.on('completed', ({ jobId, returnvalue }) => {
      const correlationId = (jobId as any)?.data?.correlationId;
      if (correlationId) {
        this.emit('taskCompleted', {
          correlationId,
          jobId,
          result: returnvalue,
          duration: 0
        });
      }
    });

    events.on('failed', ({ jobId, failedReason }) => {
      const correlationId = (jobId as any)?.data?.correlationId;
      if (correlationId) {
        this.emit('taskFailed', {
          correlationId,
          jobId,
          error: failedReason,
          duration: 0
        });
      }
    });
  }

  private startMonitoring(): void {
    // Start metrics collection
    setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoring.metricsInterval);
  }

  private collectMetrics(): void {
    // Update metrics from active executions
    let activeCount = 0;
    let queuedCount = 0;
    
    for (const execution of this.activeExecutions.values()) {
      if (execution.status === 'running') {
        activeCount++;
      } else if (execution.status === 'pending') {
        queuedCount++;
      }
    }

    this.metrics.activeTasks = activeCount;
    this.metrics.queuedTasks = queuedCount;
  }
}

export default DistributedTaskEngine;