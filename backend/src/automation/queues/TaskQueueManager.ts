import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export interface QueueConfig {
  connection: IORedis;
  defaultJobOptions?: {
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
    removeOnComplete?: number | boolean;
    removeOnFail?: number | boolean;
  };
}

export interface QueueInfo {
  name: string;
  totalJobs: number;
  waitingJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  paused: boolean;
  isDefault: boolean;
}

export interface JobInfo {
  id: string;
  name: string;
  queue: string;
  status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed';
  progress: number;
  data: any;
  returnvalue?: any;
  failedReason?: string | null;
  finishedOn?: number | null;
  processedOn?: number | null;
  timestamp: number;
}

export interface QueueOverview {
  queues: QueueInfo[];
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export interface JobFilter {
  status?: string;
  queue?: string;
  limit?: number;
}

export class TaskQueueManager {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private connection: IORedis;
  private eventEmitter: EventEmitter;
  // Job Mappings: queueName -> processor
  private jobProcessors: Map<string, (job: Job) => Promise<any>> = new Map();

  constructor(connection: IORedis, eventEmitter: EventEmitter) {
    this.connection = connection;
    this.eventEmitter = eventEmitter;
    this.setupEventHandlers();
  }

  async createQueue(name: string, config: Partial<QueueConfig> = {}): Promise<Queue> {
    try {
      const queueConfig = {
        connection: this.connection as any,
        ...config
      } as any;

      const queue = new Queue(name, queueConfig);
      this.queues.set(name, queue);

      // Set up default job processors if none exist
      if (!this.jobProcessors.has(name)) {
        await this.setupDefaultProcessor(name);
      }

      this.eventEmitter.emit('queue:created', { queueName: name, timestamp: new Date() });
      return queue;
    } catch (error) {
      throw new Error(`Failed to create queue ${name}: ${error}`);
    }
  }

  async addJob(
    queueName: string,
    name: string,
    data: any,
    options: {
      priority?: number;
      delay?: number;
      attempts?: number;
      backoff?: any;
      removeOnComplete?: number | boolean;
      removeOnFail?: number | boolean;
      jobId?: string;
    } = {}
  ): Promise<string> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      const jobOptions = {
        priority: options.priority || 1,
        delay: options.delay || 0,
        attempts: options.attempts || 3,
        backoff: options.backoff || {
          type: 'exponential' as const,
          delay: 2000
        },
        removeOnComplete: options.removeOnComplete || 100,
        removeOnFail: options.removeOnFail || 50,
        jobId: options.jobId || randomUUID(),
        ...options
      };

      const job = await queue.add(name, data, jobOptions);
      
      this.eventEmitter.emit('job:added', {
        jobId: job.id,
        queueName,
        jobName: name,
        timestamp: new Date()
      });

      return job.id as string;
    } catch (error) {
      throw new Error(`Failed to add job to queue ${queueName}: ${error}`);
    }
  }

  async startWorker(
    queueName: string,
    processor: (job: Job) => Promise<any>,
    options: {
      concurrency?: number;
      stalledInterval?: number;
      maxStalledCount?: number;
    } = {}
  ): Promise<Worker> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      const workerOptions = {
        concurrency: options.concurrency || 1,
        stalledInterval: options.stalledInterval || 30000,
        maxStalledCount: options.maxStalledCount || 1,
        connection: this.connection as any,
        ...options
      } as any;

      const worker = new Worker(queueName, processor, workerOptions);
      this.workers.set(queueName, worker);
      this.jobProcessors.set(queueName, processor);

      this.eventEmitter.emit('worker:started', { queueName, timestamp: new Date() });
      return worker;
    } catch (error) {
      throw new Error(`Failed to start worker for queue ${queueName}: ${error}`);
    }
  }

  async getJobStatus(jobId: string, queueName: string): Promise<JobInfo | null> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return null;
      }

      return {
        id: job.id as string,
        name: job.name,
        queue: queueName,
        status: job.finishedOn ? 'completed' : 
                job.processedOn ? 'active' : 
                job.timestamp + (job.opts.delay || 0) > Date.now() ? 'delayed' : 'waiting',
        progress: typeof job.progress === 'number' ? job.progress : 0,
        data: job.data,
        returnvalue: job.returnvalue,
        failedReason: job.failedReason || null,
        finishedOn: job.finishedOn || null,
        processedOn: job.processedOn || null,
        timestamp: job.timestamp
      };
    } catch (error) {
      throw new Error(`Failed to get job status: ${error}`);
    }
  }

  async getQueueOverview(): Promise<QueueOverview> {
    try {
      const queues = await Promise.all(Array.from(this.queues.entries()).map(async ([name, queue]) => {
        const [waiting, active, completed, failed] = await Promise.all([
          queue.getWaiting(),
          queue.getActive(),
          queue.getCompleted(),
          queue.getFailed()
        ]);

        return {
          name,
          totalJobs: waiting.length + active.length + completed.length + failed.length,
          waitingJobs: waiting.length,
          activeJobs: active.length,
          completedJobs: completed.length,
          failedJobs: failed.length,
          paused: await queue.isPaused(),
          isDefault: name === 'default'
        };
      }));

      return {
        queues,
        totalJobs: queues.reduce((sum, q) => sum + q.totalJobs, 0),
        activeJobs: queues.reduce((sum, q) => sum + q.activeJobs, 0),
        completedJobs: queues.reduce((sum, q) => sum + q.completedJobs, 0),
        failedJobs: queues.reduce((sum, q) => sum + q.failedJobs, 0)
      };
    } catch (error) {
      throw new Error(`Failed to get queue overview: ${error}`);
    }
  }

  async getJobs(filter: JobFilter): Promise<JobInfo[]> {
    try {
      const allJobs: JobInfo[] = [];

      for (const [queueName, queue] of this.queues.entries()) {
        if (filter.queue && filter.queue !== queueName) {
          continue;
        }

        let jobs: Job[] = [];

        if (filter.status === 'waiting') {
          jobs = await queue.getWaiting();
        } else if (filter.status === 'active') {
          jobs = await queue.getActive();
        } else if (filter.status === 'completed') {
          jobs = await queue.getCompleted(0, -1);
        } else if (filter.status === 'failed') {
          jobs = await queue.getFailed(0, -1);
        } else {
          // Get all jobs
          const [waiting, active, completed, failed] = await Promise.all([
            queue.getWaiting(),
            queue.getActive(),
            queue.getCompleted(0, -1),
            queue.getFailed(0, -1)
          ]);
          jobs = [...waiting, ...active, ...completed, ...failed];
        }

        const jobInfos: JobInfo[] = jobs.map(job => ({
          id: job.id as string,
          name: job.name,
          queue: queueName,
          status: job.finishedOn ? 'completed' : 
                  job.processedOn ? 'active' : 
                  job.timestamp + (job.opts.delay || 0) > Date.now() ? 'delayed' : 'waiting',
          progress: typeof job.progress === 'number' ? job.progress : 0,
          data: job.data,
          returnvalue: job.returnvalue,
          failedReason: job.failedReason || null,
          finishedOn: job.finishedOn || null,
          processedOn: job.processedOn || null,
          timestamp: job.timestamp
        }));

        allJobs.push(...jobInfos);
      }

      // Sort by timestamp (newest first) and limit if needed
      allJobs.sort((a, b) => b.timestamp - a.timestamp);
      
      if (filter.limit) {
        return allJobs.slice(0, filter.limit);
      }

      return allJobs;
    } catch (error) {
      throw new Error(`Failed to get jobs: ${error}`);
    }
  }

  async pauseQueue(queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      await queue.pause();
      this.eventEmitter.emit('queue:paused', { queueName, timestamp: new Date() });
    } catch (error) {
      throw new Error(`Failed to pause queue ${queueName}: ${error}`);
    }
  }

  async resumeQueue(queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      await queue.resume();
      this.eventEmitter.emit('queue:resumed', { queueName, timestamp: new Date() });
    } catch (error) {
      throw new Error(`Failed to resume queue ${queueName}: ${error}`);
    }
  }

  async cleanQueue(queueName: string, grace: number = 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      await Promise.all([
        queue.clean(grace, 'completed' as any),
        queue.clean(grace, 'failed' as any)
      ]);

      this.eventEmitter.emit('queue:cleaned', { queueName, timestamp: new Date() });
    } catch (error) {
      throw new Error(`Failed to clean queue ${queueName}: ${error}`);
    }
  }

  async removeJob(jobId: string, queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found in queue ${queueName}`);
      }

      await job.remove();
      this.eventEmitter.emit('job:removed', { jobId, queueName, timestamp: new Date() });
    } catch (error) {
      throw new Error(`Failed to remove job ${jobId}: ${error}`);
    }
  }

  async retryJob(jobId: string, queueName: string): Promise<void> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        throw new Error(`Queue ${queueName} does not exist`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found in queue ${queueName}`);
      }

      await job.retry();
      this.eventEmitter.emit('job:retried', { jobId, queueName, timestamp: new Date() });
    } catch (error) {
      throw new Error(`Failed to retry job ${jobId}: ${error}`);
    }
  }

  private async setupDefaultProcessor(queueName: string): Promise<void> {
    const defaultProcessor = async (job: Job) => {
      this.eventEmitter.emit('job:processing', {
        jobId: job.id,
        queueName,
        jobName: job.name,
        timestamp: new Date()
      });

      // Simulate some processing time
      await new Promise(resolve => setTimeout(resolve, 1000));

      this.eventEmitter.emit('job:completed', {
        jobId: job.id,
        queueName,
        jobName: job.name,
        result: { processed: true },
        timestamp: new Date()
      });

      return { processed: true };
    };

    await this.startWorker(queueName, defaultProcessor);
  }

  private setupEventHandlers(): void {
    // Queue event handlers
    this.eventEmitter.on('queue:created', (data) => {
      console.log(`Queue created: ${data.queueName}`);
    });

    this.eventEmitter.on('queue:paused', (data) => {
      console.log(`Queue paused: ${data.queueName}`);
    });

    this.eventEmitter.on('queue:resumed', (data) => {
      console.log(`Queue resumed: ${data.queueName}`);
    });

    // Job event handlers
    this.eventEmitter.on('job:added', (data) => {
      console.log(`Job added to ${data.queueName}: ${data.jobId}`);
    });

    this.eventEmitter.on('job:processing', (data) => {
      console.log(`Processing job ${data.jobId} in ${data.queueName}`);
    });

    this.eventEmitter.on('job:completed', (data) => {
      console.log(`Job completed: ${data.jobId}`);
    });

    this.eventEmitter.on('job:failed', (data) => {
      console.error(`Job failed: ${data.jobId} - ${data.error}`);
    });
  }

  async shutdown(): Promise<void> {
    try {
      // Close all workers
      for (const worker of this.workers.values()) {
        await worker.close();
      }

      // Close all queues
      for (const queue of this.queues.values()) {
        await queue.close();
      }

      // Close Redis connection
      await this.connection.quit();

      console.log('TaskQueueManager shutdown completed');
    } catch (error) {
      console.error('Error during TaskQueueManager shutdown:', error);
    }
  }
}