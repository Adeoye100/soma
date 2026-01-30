import { 
  FileProcessingJob, 
  ProcessingProgress, 
  ProcessingQueue,
  ProcessingEvent,
  ProcessingEventListener,
  ConversionResult,
  DocumentProcessingConfig,
  ProcessingStage
} from '../types/documentProcessing';
import { FileValidationService } from './fileValidationService';
import { EnhancedPdfConversionService } from './enhancedPdfConversionService';

export class DocumentProcessingQueue implements ProcessingQueue {
  private jobs: Map<string, FileProcessingJob> = new Map();
  private processing: boolean = false;
  private eventListeners: ProcessingEventListener[] = [];
  private maxConcurrent: number;
  private activeJobs: Set<string> = new Set();
  private validationService: FileValidationService;
  private conversionService: EnhancedPdfConversionService;

  constructor(
    config: DocumentProcessingConfig,
    validationService: FileValidationService,
    conversionService: EnhancedPdfConversionService
  ) {
    this.maxConcurrent = config.maxConcurrentConversions;
    this.validationService = validationService;
    this.conversionService = conversionService;
    
    // Start cleanup timer for expired jobs
    this.startCleanupTimer(config.cleanupInterval);
  }

  /**
   * Add a new file processing job to the queue
   */
  async addJob(file: File, priority: number = 0): Promise<string> {
    const jobId = this.generateJobId();
    
    const job: FileProcessingJob = {
      id: jobId,
      file,
      priority,
      status: 'pending',
      progress: {
        fileId: jobId,
        fileName: file.name,
        stage: ProcessingStage.VALIDATING,
        progress: 0,
        message: 'Job added to queue',
        startTime: new Date()
      },
      createdAt: new Date()
    };

    this.jobs.set(jobId, job);
    this.emitEvent('progress', jobId, job.progress);
    
    // Start processing if not at capacity
    this.processQueue();
    
    return jobId;
  }

  /**
   * Get the current status of a processing job
   */
  getJobStatus(jobId: string): ProcessingProgress | null {
    const job = this.jobs.get(jobId);
    return job ? job.progress : null;
  }

  /**
   * Cancel a pending or processing job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    
    if (!job) {
      return false;
    }

    if (job.status === 'pending') {
      job.status = 'cancelled';
      job.progress = {
        ...job.progress,
        message: 'Job cancelled',
        stage: ProcessingStage.FAILED
      };
      this.emitEvent('error', jobId, { message: 'Job cancelled by user' });
      return true;
    } else if (job.status === 'processing') {
      // Note: Cannot cancel processing jobs in browser environment
      // but we can mark them for cancellation
      job.status = 'cancelled';
      this.emitEvent('error', jobId, { message: 'Job marked for cancellation' });
      return true;
    }

    return false;
  }

  /**
   * Get the current queue length
   */
  getQueueLength(): number {
    return Array.from(this.jobs.values()).filter(job => job.status === 'pending').length;
  }

  /**
   * Check if the queue is currently processing
   */
  isProcessing(): boolean {
    return this.activeJobs.size > 0;
  }

  /**
   * Add an event listener for processing events
   */
  addEventListener(listener: ProcessingEventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove an event listener
   */
  removeEventListener(listener: ProcessingEventListener): void {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  /**
   * Process the queue with concurrency control
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.activeJobs.size >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    try {
      // Get pending jobs sorted by priority
      const pendingJobs = Array.from(this.jobs.values())
        .filter(job => job.status === 'pending')
        .sort((a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime());

      // Process up to max concurrent jobs
      for (const job of pendingJobs) {
        if (this.activeJobs.size >= this.maxConcurrent) {
          break;
        }

        this.processJob(job);
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: FileProcessingJob): Promise<void> {
    if (this.activeJobs.has(job.id)) {
      return;
    }

    this.activeJobs.add(job.id);
    job.status = 'processing';
    job.startedAt = new Date();

    try {
      // Step 1: Validation
      await this.validateJob(job);

      // Step 2: Security scanning (if enabled)
      await this.scanJob(job);

      // Step 3: Conversion (if needed)
      await this.convertJob(job);

      // Step 4: Optimization (if needed)
      await this.optimizeJob(job);

      // Job completed successfully
      job.status = 'completed';
      job.completedAt = new Date();
      job.progress = {
        ...job.progress,
        message: 'Processing completed successfully',
        stage: ProcessingStage.COMPLETED,
        progress: 100
      };
      this.emitEvent('complete', job.id, job.result);

    } catch (error) {
      // Job failed
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.progress = {
        ...job.progress,
        message: `Processing failed: ${job.error}`,
        stage: ProcessingStage.FAILED
      };
      this.emitEvent('error', job.id, { error: job.error });
    } finally {
      this.activeJobs.delete(job.id);
      this.processQueue(); // Process next job
    }
  }

  /**
   * Validate a job file
   */
  private async validateJob(job: FileProcessingJob): Promise<void> {
    job.progress = {
      ...job.progress,
      stage: ProcessingStage.VALIDATING,
      progress: 10,
      message: 'Validating file...'
    };
    this.emitEvent('progress', job.id, job.progress);

    try {
      const validationResult = await this.validationService.validateFile(job.file);
      
      if (!validationResult.isValid) {
        throw new Error(`Validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Add warnings to job
      if (validationResult.warnings.length > 0) {
        this.emitEvent('validation', job.id, { warnings: validationResult.warnings });
      }

    } catch (error) {
      throw new Error(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Security scan a job file
   */
  private async scanJob(job: FileProcessingJob): Promise<void> {
    job.progress = {
      ...job.progress,
      stage: ProcessingStage.SCANNING,
      progress: 25,
      message: 'Scanning for security threats...'
    };
    this.emitEvent('progress', job.id, job.progress);

    try {
      const scanResult = await this.validationService.scanFile(job.file);
      
      if (!scanResult.isSafe) {
        throw new Error(`Security scan failed: ${scanResult.threats.map(t => t.description).join(', ')}`);
      }

      if (scanResult.threats.length > 0) {
        this.emitEvent('security_scan', job.id, { threats: scanResult.threats });
      }

    } catch (error) {
      throw new Error(`Security scan error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert a job file to PDF if needed
   */
  private async convertJob(job: FileProcessingJob): Promise<void> {
    const extension = this.getFileExtension(job.file.name);
    
    // Only convert if it's an Office file
    if (!['.docx', '.pptx'].includes(extension)) {
      return;
    }

    job.progress = {
      ...job.progress,
      stage: ProcessingStage.CONVERTING,
      progress: 40,
      message: 'Converting to PDF...'
    };
    this.emitEvent('progress', job.id, job.progress);

    try {
      const conversionResult = await this.conversionService.convertToPdf(
        job.file,
        (progress) => {
          job.progress = progress;
          this.emitEvent('progress', job.id, progress);
        }
      );

      if (!conversionResult.success) {
        throw new Error(conversionResult.error || 'Conversion failed');
      }

      job.result = conversionResult;

    } catch (error) {
      throw new Error(`Conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Optimize a job file if needed
   */
  private async optimizeJob(job: FileProcessingJob): Promise<void> {
    // For now, optimization is handled during validation
    // This is a placeholder for future enhancement
    
    job.progress = {
      ...job.progress,
      stage: ProcessingStage.OPTIMIZING,
      progress: 80,
      message: 'Optimizing file...'
    };
    this.emitEvent('progress', job.id, job.progress);

    // Add a small delay to show the optimizing stage
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * Emit an event to all listeners
   */
  private emitEvent(type: ProcessingEvent['type'], jobId: string, data: any): void {
    const event: ProcessingEvent = {
      type,
      jobId,
      data,
      timestamp: new Date()
    };

    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    });
  }

  /**
   * Start cleanup timer for expired jobs
   */
  private startCleanupTimer(interval: number): void {
    setInterval(() => {
      this.cleanupExpiredJobs();
    }, interval);
  }

  /**
   * Clean up expired jobs
   */
  private cleanupExpiredJobs(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const [jobId, job] of this.jobs) {
      if (now - job.createdAt.getTime() > maxAge && 
          (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled')) {
        this.jobs.delete(jobId);
      }
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex).toLowerCase() : '';
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all jobs (for debugging)
   */
  getAllJobs(): FileProcessingJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Clear all jobs (for testing)
   */
  clearAllJobs(): void {
    this.jobs.clear();
    this.activeJobs.clear();
  }
}