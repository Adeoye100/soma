import { ServiceError } from '../../shared/errors';
import { ProcessingResult } from '../../shared/types';
import { Queue, Worker, Job } from 'bullmq';

/**
 * Types for queue configuration and job processing
 */
export interface QueueConfig {
  redisUrl?: string;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: number;
    removeOnFail?: number;
  };
}

export interface QueueJob {
  id?: string;
  name: string;
  data: Record<string, any>;
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
  };
}

export interface JobProcessor {
  process: (job: Job) => Promise<ProcessingResult>;
  concurrency?: number;
  removeOnComplete?: number;
  removeOnFail?: number;
}

/**
 * Processing Queue Service
 * 
 * Provides automated workflow processing with:
 * - Job queue management
 * - Configurable processors
 * - Error handling and retries
 * - Monitoring and observability
 * - Scalability features
 */
export class ProcessingQueueService {
  private queues: Map<string, Queue> = new Map();
  private processors: Map<string, JobProcessor> = new Map();
  private workers: Map<string, Worker> = new Map();
  private isInitialized: boolean = false;

  constructor(private config: QueueConfig = {}) {
    this.initializeDefaultConfig();
  }

  /**
   * Initialize queue service with default configuration
   */
  private initializeDefaultConfig(): void {
    if (!this.config.defaultJobOptions) {
      this.config.defaultJobOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000
        },
        removeOnComplete: 100,
        removeOnFail: 50
      };
    }
  }

  /**
   * Initialize the queue service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Validate Redis connection if URL provided
      if (this.config.redisUrl) {
        await this.validateRedisConnection(this.config.redisUrl);
      }

      this.isInitialized = true;
      console.log('ProcessingQueueService initialized successfully');
    } catch (error) {
      throw new ServiceError(
        'QUEUE_INIT_FAILED',
        `Failed to initialize processing queue: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Validate Redis connection
   */
  private async validateRedisConnection(redisUrl: string): Promise<void> {
    // This would validate Redis connection in a real implementation
    // For now, we'll just validate the URL format
    if (!redisUrl.startsWith('redis://') && !redisUrl.startsWith('rediss://')) {
      throw new Error('Invalid Redis URL format');
    }
  }

  /**
   * Create a new queue for specific job types
   */
  async createQueue(queueName: string, config?: Partial<QueueConfig>): Promise<Queue> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.queues.has(queueName)) {
      return this.queues.get(queueName)!;
    }

    const queueConfig = {
      ...this.config,
      ...config
    };

    const queue = new Queue(queueName, {
      connection: queueConfig.redisUrl ? { url: queueConfig.redisUrl } : undefined,
      defaultJobOptions: queueConfig.defaultJobOptions
    });

    this.queues.set(queueName, queue);
    return queue;
  }

  /**
   * Register a job processor for a specific queue
   */
  async registerProcessor(
    queueName: string,
    processor: JobProcessor,
    processorName: string = 'default'
  ): Promise<void> {
    if (!this.queues.has(queueName)) {
      await this.createQueue(queueName);
    }

    const queue = this.queues.get(queueName)!;
    
    // Remove existing worker if any
    const workerKey = `${queueName}:${processorName}`;
    if (this.workers.has(workerKey)) {
      await this.workers.get(workerKey)?.close();
      this.workers.delete(workerKey);
    }

    // Create new worker
    const worker = new Worker(
      queueName,
      async (job) => {
        return await processor.process(job);
      },
      {
        connection: queue.settings.connection,
        concurrency: processor.concurrency || 1,
        removeOnComplete: processor.removeOnComplete || 100,
        removeOnFail: processor.removeOnFail || 50
      }
    );

    // Set up error handling
    worker.on('error', (error) => {
      console.error(`Worker error for queue ${queueName}:`, error);
    });

    worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed in queue ${queueName}:`, error);
    });

    this.workers.set(workerKey, worker);
    this.processors.set(workerKey, processor);

    console.log(`Processor registered for queue ${queueName}`);
  }

  /**
   * Add job to queue for processing
   */
  async addJob(queueName: string, job: QueueJob): Promise<string> {
    if (!this.queues.has(queueName)) {
      await this.createQueue(queueName);
    }

    const queue = this.queues.get(queueName)!;
    
    const jobOptions = {
      ...job.options,
      ...this.config.defaultJobOptions
    };

    const jobId = await queue.add(job.name, job.data, jobOptions);
    return jobId.id!;
  }

  /**
   * Add multiple jobs to queue
   */
  async addJobs(queueName: string, jobs: QueueJob[]): Promise<string[]> {
    const jobIds: string[] = [];
    
    for (const job of jobs) {
      const jobId = await this.addJob(queueName, job);
      jobIds.push(jobId);
    }

    return jobIds;
  }

  /**
   * Get job status and information
   */
  async getJobStatus(queueName: string, jobId: string): Promise<any> {
    if (!this.queues.has(queueName)) {
      throw new ServiceError('QUEUE_NOT_FOUND', `Queue ${queueName} not found`);
    }

    const queue = this.queues.get(queueName)!;
    const job = await queue.getJob(jobId);
    
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
      returnvalue: job.returnvalue,
      status: await job.getState()
    };
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<any> {
    if (!this.queues.has(queueName)) {
      throw new ServiceError('QUEUE_NOT_FOUND', `Queue ${queueName} not found`);
    }

    const queue = this.queues.get(queueName)!;
    
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
   * Clean completed/failed jobs from queue
   */
  async cleanQueue(queueName: string, grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.queues.has(queueName)) {
      throw new ServiceError('QUEUE_NOT_FOUND', `Queue ${queueName} not found`);
    }

    const queue = this.queues.get(queueName)!;
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueName: string): Promise<void> {
    if (!this.queues.has(queueName)) {
      throw new ServiceError('QUEUE_NOT_FOUND', `Queue ${queueName} not found`);
    }

    const queue = this.queues.get(queueName)!;
    await queue.pause();
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueName: string): Promise<void> {
    if (!this.queues.has(queueName)) {
      throw new ServiceError('QUEUE_NOT_FOUND', `Queue ${queueName} not found`);
    }

    const queue = this.queues.get(queueName)!;
    await queue.resume();
  }

  /**
   * Shutdown all queues and workers
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    // Close all workers
    for (const [key, worker] of this.workers) {
      shutdownPromises.push(worker.close());
    }

    // Close all queues
    for (const [name, queue] of this.queues) {
      shutdownPromises.push(queue.close());
    }

    await Promise.all(shutdownPromises);
    
    this.workers.clear();
    this.queues.clear();
    this.processors.clear();
    this.isInitialized = false;

    console.log('ProcessingQueueService shutdown completed');
  }

  /**
   * Get all registered queues
   */
  getQueues(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Get all registered processors
   */
  getProcessors(): string[] {
    return Array.from(this.processors.keys());
  }
}

// Export singleton instance for global use
export const processingQueueService = new ProcessingQueueService();