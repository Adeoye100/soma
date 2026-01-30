import { EventEmitter } from 'events';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

/**
 * Enterprise Priority-Based Scheduling System
 * Features: Dynamic priority calculation, resource-aware scheduling, SLA management
 */

// Core scheduling interfaces
export interface PriorityLevel {
  name: string;
  weight: number;
  sla: {
    maxWaitTime: number; // milliseconds
    maxExecutionTime: number; // milliseconds
    minResourceGuarantee: number; // percentage
  };
  characteristics: {
    preemption: boolean;
    interruptible: boolean;
    dedicated: boolean;
  };
}

export interface Job {
  id: string;
  correlationId: string;
  name: string;
  priority: PriorityLevel;
  resourceRequirements: ResourceRequirements;
  schedulingConstraints: SchedulingConstraints;
  sla: ServiceLevelAgreement;
  metadata: Record<string, any>;
  submissionTime: Date;
  estimatedDuration: number;
  dependencies: string[];
}

export interface ResourceRequirements {
  cpu: number; // cores
  memory: number; // MB
  disk: number; // GB
  network: number; // Mbps
  gpu?: number;
  customResources?: Record<string, number>;
}

export interface SchedulingConstraints {
  preferredTimeWindow?: {
    start: Date;
    end: Date;
  };
  allowedWorkers?: string[];
  exclusiveResources?: string[];
  affinityRules?: AffinityRule[];
}

export interface AffinityRule {
  type: 'worker' | 'node' | 'zone';
  target: string;
  strength: 'hard' | 'soft';
}

export interface ServiceLevelAgreement {
  maxWaitTime: number;
  maxExecutionTime: number;
  minThroughput?: number;
  reliability?: number;
  priorityBoost?: number;
}

export interface SchedulingDecision {
  jobId: string;
  scheduledWorker?: string;
  estimatedStartTime: Date;
  estimatedCompletionTime: Date;
  resourceAllocation: ResourceAllocation;
  priorityScore: number;
  reasoning: string[];
}

export interface ResourceAllocation {
  workerId: string;
  resources: ResourceRequirements;
  timeSlot: {
    start: Date;
    end: Date;
  };
  preemptionAllowed: boolean;
}

export interface ClusterState {
  totalResources: ResourceRequirements;
  availableResources: ResourceRequirements;
  workers: Map<string, WorkerState>;
  currentLoad: number;
  estimatedCapacity: number;
}

export interface WorkerState {
  id: string;
  name: string;
  capabilities: ResourceRequirements;
  currentLoad: ResourceRequirements;
  activeJobs: string[];
  performanceMetrics: {
    averageExecutionTime: number;
    successRate: number;
    utilization: number;
  };
  status: 'idle' | 'busy' | 'overloaded' | 'maintenance';
}

export interface SchedulingPolicy {
  name: string;
  enabled: boolean;
  weights: {
    priority: number;
    waitTime: number;
    resourceUtilization: number;
    dependency: number;
    performance: number;
  };
  preemptionRules: PreemptionRule[];
}

export interface PreemptionRule {
  trigger: 'priority' | 'deadline' | 'resource' | 'performance';
  conditions: any;
  action: 'suspend' | 'migrate' | 'terminate';
  target: 'lower' | 'matching' | 'all';
}

/**
 * Enterprise Priority-Based Scheduling Engine
 */
export class PriorityScheduler extends EventEmitter {
  private logger: winston.Logger;
  private priorityLevels: Map<string, PriorityLevel> = new Map();
  private pendingJobs: Map<string, Job> = new Map();
  private scheduledJobs: Map<string, SchedulingDecision> = new Map();
  private clusterState: ClusterState;
  private schedulingPolicies: Map<string, SchedulingPolicy> = new Map();
  private activePolicy: string = 'enterprise-balanced';
  private schedulingInterval: NodeJS.Timeout | null = null;
  private metrics: {
    totalScheduled: number;
    averageWaitTime: number;
    averageExecutionTime: number;
    preemptionCount: number;
    deadlineMisses: number;
    resourceUtilization: number;
  };

  constructor() {
    super();
    this.logger = this.createLogger();
    this.clusterState = this.initializeClusterState();
    this.metrics = this.initializeMetrics();
    this.initializePriorityLevels();
    this.initializeDefaultPolicies();
    
    this.setupEventHandlers();
  }

  /**
   * Initialize scheduler with cluster configuration
   */
  async initialize(options: {
    clusterState: ClusterState;
    activePolicy?: string;
    schedulingInterval?: number;
  }): Promise<void> {
    try {
      this.clusterState = options.clusterState;
      this.activePolicy = options.activePolicy || 'enterprise-balanced';
      
      // Start scheduling loop
      if (options.schedulingInterval) {
        this.startSchedulingLoop(options.schedulingInterval);
      }

      this.emit('initialized', {
        clusterState: this.clusterState,
        activePolicy: this.activePolicy
      });

      this.logger.info('Priority Scheduler initialized', {
        workers: this.clusterState.workers.size,
        policy: this.activePolicy
      });
    } catch (error) {
      this.logger.error('Failed to initialize Priority Scheduler', error);
      throw error;
    }
  }

  /**
   * Submit a job for scheduling
   */
  submitJob(job: Omit<Job, 'id' | 'submissionTime'>): string {
    const jobId = uuidv4();
    const fullJob: Job = {
      ...job,
      id: jobId,
      submissionTime: new Date()
    };

    this.pendingJobs.set(jobId, fullJob);
    
    this.emit('jobSubmitted', { jobId, job: fullJob });
    
    this.logger.info('Job submitted for scheduling', {
      jobId,
      name: job.name,
      priority: job.priority.name,
      estimatedDuration: job.estimatedDuration
    });

    // Trigger immediate scheduling if critical
    if (job.priority.characteristics.preemption) {
      this.scheduleJobs();
    }

    return jobId;
  }

  /**
   * Schedule jobs based on current policy and cluster state
   */
  async scheduleJobs(): Promise<SchedulingDecision[]> {
    const decisions: SchedulingDecision[] = [];
    const policy = this.schedulingPolicies.get(this.activePolicy);
    
    if (!policy || !policy.enabled) {
      this.logger.warn('Scheduling policy not found or disabled', { policy: this.activePolicy });
      return decisions;
    }

    try {
      // Sort pending jobs by priority score
      const scoredJobs = this.scorePendingJobs(policy);
      
      for (const { job, score } of scoredJobs) {
        const decision = await this.scheduleJob(job, policy, score);
        if (decision) {
          decisions.push(decision);
          this.scheduledJobs.set(job.id, decision);
          this.pendingJobs.delete(job.id);
          
          this.emit('jobScheduled', { jobId: job.id, decision });
        }
      }

      // Update metrics
      this.updateSchedulingMetrics(decisions);

      this.logger.info('Job scheduling completed', {
        decisions: decisions.length,
        pendingJobs: this.pendingJobs.size
      });

      return decisions;
    } catch (error) {
      this.logger.error('Job scheduling failed', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled job
   */
  async cancelJob(jobId: string, reason: string = 'user-request'): Promise<boolean> {
    const job = this.pendingJobs.get(jobId) || this.scheduledJobs.get(jobId);
    if (!job) {
      return false;
    }

    // Remove from pending jobs
    this.pendingJobs.delete(jobId);

    // If scheduled, we may need to preempt
    const decision = this.scheduledJobs.get(jobId);
    if (decision) {
      await this.preemptJob(jobId, reason);
    }

    this.emit('jobCancelled', { jobId, reason });
    
    this.logger.info('Job cancelled', { jobId, reason });
    return true;
  }

  /**
   * Update job priority dynamically
   */
  updateJobPriority(jobId: string, newPriority: PriorityLevel): boolean {
    const job = this.pendingJobs.get(jobId);
    if (!job) {
      return false;
    }

    const oldPriority = job.priority.name;
    job.priority = newPriority;

    this.emit('jobPriorityUpdated', {
      jobId,
      oldPriority,
      newPriority: newPriority.name
    });

    this.logger.info('Job priority updated', {
      jobId,
      oldPriority,
      newPriority: newPriority.name
    });

    return true;
  }

  /**
   * Get scheduling status and metrics
   */
  getSchedulingStatus(): {
    pendingJobs: number;
    scheduledJobs: number;
    clusterUtilization: number;
    averageWaitTime: number;
    deadlineCompliance: number;
    policy: string;
    metrics: any;
  } {
    const pendingJobs = Array.from(this.pendingJobs.values());
    const scheduledJobs = Array.from(this.scheduledJobs.values());

    const clusterUtilization = this.calculateClusterUtilization();
    const deadlineCompliance = this.calculateDeadlineCompliance();
    
    return {
      pendingJobs: pendingJobs.length,
      scheduledJobs: scheduledJobs.length,
      clusterUtilization,
      averageWaitTime: this.metrics.averageWaitTime,
      deadlineCompliance,
      policy: this.activePolicy,
      metrics: { ...this.metrics }
    };
  }

  /**
   * Update cluster state
   */
  updateClusterState(newState: Partial<ClusterState>): void {
    this.clusterState = {
      ...this.clusterState,
      ...newState,
      workers: new Map([...this.clusterState.workers, ...(newState.workers || [])])
    };

    this.emit('clusterStateUpdated', { clusterState: this.clusterState });
    
    // Trigger rescheduling if significant changes
    if (this.shouldReschedule()) {
      this.scheduleJobs();
    }
  }

  /**
   * Configure scheduling policy
   */
  configurePolicy(policy: SchedulingPolicy): void {
    this.schedulingPolicies.set(policy.name, policy);
    this.activePolicy = policy.name;
    
    this.emit('policyConfigured', { policy });
    
    this.logger.info('Scheduling policy configured', {
      policy: policy.name,
      enabled: policy.enabled
    });
  }

  /**
   * Shutdown scheduler
   */
  shutdown(): void {
    if (this.schedulingInterval) {
      clearInterval(this.schedulingInterval);
      this.schedulingInterval = null;
    }

    this.pendingJobs.clear();
    this.scheduledJobs.clear();
    
    this.emit('shutdown');
    this.logger.info('Priority Scheduler shutdown complete');
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
          filename: 'logs/priority-scheduler.log',
          maxsize: 10000000,
          maxFiles: 10
        })
      ]
    });
  }

  private initializeClusterState(): ClusterState {
    return {
      totalResources: { cpu: 0, memory: 0, disk: 0, network: 0 },
      availableResources: { cpu: 0, memory: 0, disk: 0, network: 0 },
      workers: new Map(),
      currentLoad: 0,
      estimatedCapacity: 0
    };
  }

  private initializeMetrics() {
    return {
      totalScheduled: 0,
      averageWaitTime: 0,
      averageExecutionTime: 0,
      preemptionCount: 0,
      deadlineMisses: 0,
      resourceUtilization: 0
    };
  }

  private initializePriorityLevels(): void {
    // Define standard priority levels
    const levels: PriorityLevel[] = [
      {
        name: 'CRITICAL',
        weight: 100,
        sla: {
          maxWaitTime: 5000, // 5 seconds
          maxExecutionTime: 300000, // 5 minutes
          minResourceGuarantee: 80
        },
        characteristics: {
          preemption: true,
          interruptible: true,
          dedicated: true
        }
      },
      {
        name: 'HIGH',
        weight: 80,
        sla: {
          maxWaitTime: 30000, // 30 seconds
          maxExecutionTime: 600000, // 10 minutes
          minResourceGuarantee: 60
        },
        characteristics: {
          preemption: true,
          interruptible: false,
          dedicated: false
        }
      },
      {
        name: 'NORMAL',
        weight: 50,
        sla: {
          maxWaitTime: 300000, // 5 minutes
          maxExecutionTime: 1800000, // 30 minutes
          minResourceGuarantee: 40
        },
        characteristics: {
          preemption: false,
          interruptible: false,
          dedicated: false
        }
      },
      {
        name: 'LOW',
        weight: 20,
        sla: {
          maxWaitTime: 1800000, // 30 minutes
          maxExecutionTime: 3600000, // 1 hour
          minResourceGuarantee: 20
        },
        characteristics: {
          preemption: false,
          interruptible: true,
          dedicated: false
        }
      }
    ];

    for (const level of levels) {
      this.priorityLevels.set(level.name, level);
    }
  }

  private initializeDefaultPolicies(): void {
    const policies: SchedulingPolicy[] = [
      {
        name: 'enterprise-balanced',
        enabled: true,
        weights: {
          priority: 0.4,
          waitTime: 0.2,
          resourceUtilization: 0.2,
          dependency: 0.1,
          performance: 0.1
        },
        preemptionRules: [
          {
            trigger: 'priority',
            conditions: { priorityGap: 30 },
            action: 'suspend',
            target: 'lower'
          }
        ]
      },
      {
        name: 'performance-optimized',
        enabled: false,
        weights: {
          priority: 0.2,
          waitTime: 0.1,
          resourceUtilization: 0.4,
          dependency: 0.1,
          performance: 0.2
        },
        preemptionRules: []
      },
      {
        name: 'sla-focused',
        enabled: false,
        weights: {
          priority: 0.3,
          waitTime: 0.4,
          resourceUtilization: 0.1,
          dependency: 0.1,
          performance: 0.1
        },
        preemptionRules: [
          {
            trigger: 'deadline',
            conditions: { timeRemaining: 60000 },
            action: 'suspend',
            target: 'all'
          }
        ]
      }
    ];

    for (const policy of policies) {
      this.schedulingPolicies.set(policy.name, policy);
    }

    this.activePolicy = 'enterprise-balanced';
  }

  private scorePendingJobs(policy: SchedulingPolicy): Array<{ job: Job; score: number }> {
    const scoredJobs: Array<{ job: Job; score: number }> = [];

    for (const job of this.pendingJobs.values()) {
      let score = 0;

      // Priority weight
      score += job.priority.weight * policy.weights.priority;

      // Wait time factor (older jobs get higher score)
      const waitTime = Date.now() - job.submissionTime.getTime();
      score += Math.min(waitTime / 1000, 3600) * policy.weights.waitTime; // Cap at 1 hour

      // Resource efficiency
      const resourceEfficiency = this.calculateResourceEfficiency(job);
      score += resourceEfficiency * policy.weights.resourceUtilization;

      // Dependency factor
      if (job.dependencies.length > 0) {
        const dependencyScore = this.calculateDependencyScore(job);
        score += dependencyScore * policy.weights.dependency;
      }

      // Performance factor
      const performanceScore = this.calculatePerformanceScore(job);
      score += performanceScore * policy.weights.performance;

      scoredJobs.push({ job, score });
    }

    // Sort by score (highest first)
    return scoredJobs.sort((a, b) => b.score - a.score);
  }

  private async scheduleJob(
    job: Job, 
    policy: SchedulingPolicy, 
    priorityScore: number
  ): Promise<SchedulingDecision | null> {
    // Find best available worker
    const suitableWorkers = this.findSuitableWorkers(job);
    
    if (suitableWorkers.length === 0) {
      this.logger.debug('No suitable workers found for job', { jobId: job.id });
      return null;
    }

    // Select best worker based on current load and performance
    const selectedWorker = this.selectBestWorker(suitableWorkers, job);
    
    // Calculate time estimates
    const estimatedStartTime = new Date(Date.now() + 1000); // 1 second from now
    const estimatedCompletionTime = new Date(
      estimatedStartTime.getTime() + job.estimatedDuration
    );

    // Create scheduling decision
    const decision: SchedulingDecision = {
      jobId: job.id,
      scheduledWorker: selectedWorker.id,
      estimatedStartTime,
      estimatedCompletionTime,
      resourceAllocation: {
        workerId: selectedWorker.id,
        resources: job.resourceRequirements,
        timeSlot: {
          start: estimatedStartTime,
          end: estimatedCompletionTime
        },
        preemptionAllowed: job.priority.characteristics.preemption
      },
      priorityScore,
      reasoning: [
        `Selected worker ${selectedWorker.id} based on load and performance`,
        `Priority score: ${priorityScore.toFixed(2)}`,
        `Estimated duration: ${job.estimatedDuration}ms`
      ]
    };

    return decision;
  }

  private findSuitableWorkers(job: Job): WorkerState[] {
    const suitable: WorkerState[] = [];

    for (const worker of this.clusterState.workers.values()) {
      // Check if worker can handle the job
      if (this.canWorkerHandleJob(worker, job)) {
        suitable.push(worker);
      }
    }

    return suitable;
  }

  private canWorkerHandleJob(worker: WorkerState, job: Job): boolean {
    // Check resource availability
    const available = this.getAvailableResources(worker);
    
    return (
      available.cpu >= job.resourceRequirements.cpu &&
      available.memory >= job.resourceRequirements.memory &&
      available.disk >= job.resourceRequirements.disk &&
      available.network >= job.resourceRequirements.network
    );
  }

  private getAvailableResources(worker: WorkerState): ResourceRequirements {
    return {
      cpu: worker.capabilities.cpu - worker.currentLoad.cpu,
      memory: worker.capabilities.memory - worker.currentLoad.memory,
      disk: worker.capabilities.disk - worker.currentLoad.disk,
      network: worker.capabilities.network - worker.currentLoad.network
    };
  }

  private selectBestWorker(workers: WorkerState[], job: Job): WorkerState {
    // Score workers based on multiple factors
    if (workers.length === 0) {
      throw new Error('No workers available for job scheduling');
    }

    let bestWorker: WorkerState = workers[0];
    let bestScore = -Infinity;

    for (const worker of workers) {
      const score = this.calculateWorkerScore(worker, job);
      if (score > bestScore) {
        bestScore = score;
        bestWorker = worker;
      }
    }

    return bestWorker;
  }

  private calculateWorkerScore(worker: WorkerState, job: Job): number {
    let score = 0;

    // Performance factor (higher success rate = better)
    score += worker.performanceMetrics.successRate * 100;

    // Utilization factor (prefer less utilized workers for fairness)
    const utilization = worker.performanceMetrics.utilization;
    score += (100 - utilization) * 0.5;

    // Average execution time factor
    const avgTime = worker.performanceMetrics.averageExecutionTime;
    score += Math.max(0, 100 - (avgTime / job.estimatedDuration) * 100);

    return score;
  }

  private calculateResourceEfficiency(job: Job): number {
    const total = job.resourceRequirements.cpu + job.resourceRequirements.memory;
    const efficiency = total / Math.max(total, job.estimatedDuration / 1000);
    return Math.min(efficiency, 1);
  }

  private calculateDependencyScore(job: Job): number {
    // Higher score for jobs with more dependencies
    return Math.min(job.dependencies.length * 10, 100);
  }

  private calculatePerformanceScore(job: Job): number {
    // This would be based on historical performance for similar jobs
    return 50; // Placeholder
  }

  private async preemptJob(jobId: string, reason: string): Promise<void> {
    const decision = this.scheduledJobs.get(jobId);
    if (!decision) {
      return;
    }

    // Update job status
    const job = this.pendingJobs.get(jobId);
    if (job) {
      job.metadata.preempted = true;
      job.metadata.preemptionReason = reason;
      this.pendingJobs.set(jobId, job);
    }

    // Remove from scheduled jobs
    this.scheduledJobs.delete(jobId);

    // Update metrics
    this.metrics.preemptionCount++;

    this.emit('jobPreempted', { jobId, reason });
    
    this.logger.info('Job preempted', { jobId, reason });
  }

  private calculateClusterUtilization(): number {
    const totalResources = this.clusterState.totalResources;
    const usedResources = {
      cpu: totalResources.cpu - this.clusterState.availableResources.cpu,
      memory: totalResources.memory - this.clusterState.availableResources.memory,
      disk: totalResources.disk - this.clusterState.availableResources.disk,
      network: totalResources.network - this.clusterState.availableResources.network
    };

    const utilization = (
      (usedResources.cpu / totalResources.cpu) +
      (usedResources.memory / totalResources.memory) +
      (usedResources.disk / totalResources.disk) +
      (usedResources.network / totalResources.network)
    ) / 4;

    return utilization * 100;
  }

  private calculateDeadlineCompliance(): number {
    const recentJobs = Array.from(this.scheduledJobs.values()).slice(-100);
    const compliantJobs = recentJobs.filter(job => {
      // This would check actual completion time vs SLA
      return true; // Placeholder
    });

    return recentJobs.length > 0 ? (compliantJobs.length / recentJobs.length) * 100 : 100;
  }

  private shouldReschedule(): boolean {
    // Check if significant cluster changes require rescheduling
    return this.pendingJobs.size > 10; // Simple heuristic
  }

  private updateSchedulingMetrics(decisions: SchedulingDecision[]): void {
    this.metrics.totalScheduled += decisions.length;

    // Update average wait time
    const totalWaitTime = decisions.reduce((sum, decision) => {
      const job = this.pendingJobs.get(decision.jobId);
      if (job) {
        return sum + (Date.now() - job.submissionTime.getTime());
      }
      return sum;
    }, 0);

    if (decisions.length > 0) {
      this.metrics.averageWaitTime = totalWaitTime / decisions.length;
    }
  }

  private startSchedulingLoop(interval: number): void {
    this.schedulingInterval = setInterval(() => {
      this.scheduleJobs();
    }, interval);
  }

  private setupEventHandlers(): void {
    this.on('jobScheduled', (data) => {
      this.logger.debug('Job scheduled', {
        jobId: data.jobId,
        worker: data.decision.scheduledWorker
      });
    });

    this.on('jobFailed', (data) => {
      this.metrics.deadlineMisses++;
    });
  }
}

export default PriorityScheduler;