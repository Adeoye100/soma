import { InputProcessor, ProcessingResult } from '../../../shared/types';
import { FileValidationService } from '../../services/FileValidationService';
import { ProcessingQueueService } from '../queue/ProcessingQueueService';
import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface FileProcessorConfig {
  watchDirectory: string;
  supportedFormats: string[];
  maxFileSize: number;
  batchSize: number;
  autoProcess: boolean;
  archiveProcessedFiles: boolean;
  archiveDirectory: string;
}

export interface FileProcessingResult {
  fileName: string;
  filePath: string;
  processedAt: string;
  recordCount: number;
  errors: string[];
  metadata: {
    size: number;
    format: string;
    checksum: string;
  };
}

export class FileInputProcessor extends EventEmitter implements InputProcessor {
  public id: string;
  public name: string;
  public type: 'file' = 'file';
  public enabled: boolean;
  private config: FileProcessorConfig;
  private fileWatcher?: fs.FSWatcher;
  private validationService: FileValidationService;
  private processingQueue: ProcessingQueueService;
  private isProcessing: boolean = false;

  constructor(
    id: string,
    name: string,
    config: FileProcessorConfig,
    validationService: FileValidationService,
    processingQueue: ProcessingQueueService
  ) {
    super();
    this.id = id;
    this.name = name;
    this.config = config;
    this.validationService = validationService;
    this.processingQueue = processingQueue;
    this.enabled = true;
  }

  async start(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    try {
      // Ensure directories exist
      await fs.mkdir(this.config.watchDirectory, { recursive: true });
      if (this.config.archiveProcessedFiles) {
        await fs.mkdir(this.config.archiveDirectory, { recursive: true });
      }

      // Start file watcher
      this.fileWatcher = fs.watch(this.config.watchDirectory, { recursive: true }, async (eventType, filename) => {
        if (eventType === 'rename' || eventType === 'change') {
          await this.handleFileChange(filename as string);
        }
      });

      // Process existing files
      await this.processExistingFiles();

      this.isProcessing = true;
      this.emit('started', { processorId: this.id, timestamp: new Date().toISOString() });
      
      console.log(`FileInputProcessor ${this.name} started successfully`);
    } catch (error) {
      console.error(`Failed to start FileInputProcessor ${this.name}:`, error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = undefined;
    }
    
    this.isProcessing = false;
    this.emit('stopped', { processorId: this.id, timestamp: new Date().toISOString() });
    console.log(`FileInputProcessor ${this.name} stopped`);
  }

  async processFile(filePath: string): Promise<ProcessingResult<FileProcessingResult[]>> {
    const startTime = Date.now();
    
    try {
      const results: FileProcessingResult[] = [];

      // Check file exists and validate
      const stats = await fs.stat(filePath);
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File size ${stats.size} exceeds maximum ${this.config.maxFileSize}`);
      }

      const extension = path.extname(filePath).toLowerCase();
      if (!this.config.supportedFormats.includes(extension)) {
        throw new Error(`Unsupported file format: ${extension}`);
      }

      // Validate file
      const validationResult = await this.validationService.validateFile(filePath);
      if (!validationResult.success) {
        throw new Error(`File validation failed: ${validationResult.error?.message}`);
      }

      // Process based on file type
      switch (extension) {
        case '.csv':
          results.push(...await this.processCsvFile(filePath, stats));
          break;
        case '.json':
          results.push(...await this.processJsonFile(filePath, stats));
          break;
        case '.xlsx':
        case '.xls':
          results.push(...await this.processExcelFile(filePath, stats));
          break;
        default:
          throw new Error(`Unsupported file format: ${extension}`);
      }

      // Archive processed file if configured
      if (this.config.archiveProcessedFiles) {
        await this.archiveFile(filePath);
      }

      const executionTime = Date.now() - startTime;
      
      this.emit('fileProcessed', {
        processorId: this.id,
        filePath,
        recordCount: results.length,
        executionTime
      });

      return {
        success: true,
        data: results,
        metadata: {
          executionTime,
          processedItems: results.length,
          failedItems: 0
        }
      };

    } catch (error) {
      console.error(`File processing failed for ${filePath}:`, error);
      
      return {
        success: false,
        error: {
          code: 'FILE_PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: error
        },
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  private async processCsvFile(filePath: string, stats: fs.Stats): Promise<FileProcessingResult[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    const recordCount = Math.max(0, lines.length - 1); // Subtract header

    return [{
      fileName: path.basename(filePath),
      filePath,
      processedAt: new Date().toISOString(),
      recordCount,
      errors: [],
      metadata: {
        size: stats.size,
        format: 'csv',
        checksum: await this.calculateChecksum(filePath)
      }
    }];
  }

  private async processJsonFile(filePath: string, stats: fs.Stats): Promise<FileProcessingResult[]> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);
    const recordCount = Array.isArray(data) ? data.length : 1;

    return [{
      fileName: path.basename(filePath),
      filePath,
      processedAt: new Date().toISOString(),
      recordCount,
      errors: [],
      metadata: {
        size: stats.size,
        format: 'json',
        checksum: await this.calculateChecksum(filePath)
      }
    }];
  }

  private async processExcelFile(filePath: string, stats: fs.Stats): Promise<FileProcessingResult[]> {
    // Placeholder for Excel processing
    // In a real implementation, you would use a library like 'xlsx'
    return [{
      fileName: path.basename(filePath),
      filePath,
      processedAt: new Date().toISOString(),
      recordCount: 0, // Would be calculated based on sheets and rows
      errors: ['Excel processing not yet implemented'],
      metadata: {
        size: stats.size,
        format: 'excel',
        checksum: await this.calculateChecksum(filePath)
      }
    }];
  }

  private async handleFileChange(fileName: string): Promise<void> {
    if (!this.enabled || !this.config.autoProcess) {
      return;
    }

    const filePath = path.join(this.config.watchDirectory, fileName);
    
    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        await this.processingQueue.enqueue(async () => {
          await this.processFile(filePath);
        }, {
          priority: 'normal',
          tags: ['file-processing']
        });
      }
    } catch (error) {
      console.error(`Error handling file change ${fileName}:`, error);
    }
  }

  private async processExistingFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.config.watchDirectory);
      
      for (const file of files) {
        const filePath = path.join(this.config.watchDirectory, file);
        const stats = await fs.stat(filePath);
        
        if (stats.isFile()) {
          await this.processFile(filePath);
        }
      }
    } catch (error) {
      console.error(`Error processing existing files:`, error);
    }
  }

  private async archiveFile(filePath: string): Promise<void> {
    const fileName = path.basename(filePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivePath = path.join(this.config.archiveDirectory, `${timestamp}_${fileName}`);
    
    await fs.rename(filePath, archivePath);
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const content = await fs.readFile(filePath);
    // Simple checksum - in production, use a proper hash algorithm
    return content.toString().length.toString();
  }

  getMetrics(): {
    totalFilesProcessed: number;
    totalRecordsProcessed: number;
    averageProcessingTime: number;
    errorRate: number;
  } {
    // This would typically be tracked in a database
    // For now, return placeholder metrics
    return {
      totalFilesProcessed: 0,
      totalRecordsProcessed: 0,
      averageProcessingTime: 0,
      errorRate: 0
    };
  }

  async validateConfiguration(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!this.config.watchDirectory) {
      errors.push('Watch directory is required');
    }

    if (!this.config.supportedFormats || this.config.supportedFormats.length === 0) {
      errors.push('At least one supported format must be specified');
    }

    if (this.config.maxFileSize <= 0) {
      errors.push('Max file size must be greater than 0');
    }

    if (this.config.batchSize <= 0) {
      errors.push('Batch size must be greater than 0');
    }

    if (this.config.archiveProcessedFiles && !this.config.archiveDirectory) {
      errors.push('Archive directory is required when archive processed files is enabled');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}