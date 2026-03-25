import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import {
  FileSecurityValidator,
  FileValidationConfig,
  ValidationResult,
  createFileValidationConfig
} from './FileSecurityValidator';
import { TextSanitizer, SanitizedResult } from './TextSanitizer';
import { FileTypeRouter } from './FileTypeRouter';

export interface FileProcessorConfig {
  maxFileSize: number;
  uploadDirectory: string;
  tempDirectory: string;
  quarantineDirectory: string;
  enableMalwareScanning: boolean;
  malwareScanEndpoint?: string;
  defaultLanguage?: string;
  enableOcrEnhancement?: boolean;
  maxParsingTime?: number;
  cleanupAfterProcessing?: boolean;
}

export interface ProcessedFile {
  id: string;
  originalName: string;
  storedPath: string;
  fileType: string;
  size: number;
  checksum: string;
  parsedContent: {
    text: string;
    sanitized: SanitizedResult;
    metadata: Record<string, unknown>;
  };
  processedAt: string;
  processingTime: number;
  warnings: string[];
}

export interface ProcessingError {
  code: string;
  message: string;
  stage: 'validation' | 'storage' | 'scanning' | 'parsing' | 'sanitization';
  details?: Record<string, unknown>;
  recoverable: boolean;
}

export interface ProcessingResult {
  success: boolean;
  file?: ProcessedFile;
  error?: ProcessingError;
  correlationId: string;
}

export interface UploadLogEntry {
  timestamp: string;
  correlationId: string;
  userId?: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  result: 'success' | 'rejected' | 'error';
  reason?: string;
  processingTime?: number;
}

export class SecureFileProcessor {
  private config: FileProcessorConfig;
  private validator: FileSecurityValidator;
  private router: FileTypeRouter;
  private sanitizer: TextSanitizer;
  private logger: winston.Logger;
  private uploadLog: UploadLogEntry[] = [];

  constructor(config: Partial<FileProcessorConfig> = {}) {
    this.config = {
      maxFileSize: config.maxFileSize || 10 * 1024 * 1024,
      uploadDirectory: config.uploadDirectory || './uploads',
      tempDirectory: config.tempDirectory || './temp',
      quarantineDirectory: config.quarantineDirectory || './quarantine',
      enableMalwareScanning: config.enableMalwareScanning ?? true,
      malwareScanEndpoint: config.malwareScanEndpoint,
      defaultLanguage: config.defaultLanguage || 'eng',
      enableOcrEnhancement: config.enableOcrEnhancement ?? true,
      maxParsingTime: config.maxParsingTime || 120000,
      cleanupAfterProcessing: config.cleanupAfterProcessing ?? true
    };

    const validationConfig: FileValidationConfig = createFileValidationConfig(
      this.config.maxFileSize,
      this.config.enableMalwareScanning
    );
    validationConfig.malwareScanEndpoint = this.config.malwareScanEndpoint;

    this.validator = new FileSecurityValidator(validationConfig);
    this.router = new FileTypeRouter({
      defaultLanguage: this.config.defaultLanguage,
      enableOcrEnhancement: this.config.enableOcrEnhancement,
      maxParsingTime: this.config.maxParsingTime
    });
    this.sanitizer = new TextSanitizer();

    const isDev = process.env.NODE_ENV !== 'production';
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/file-processing.log', maxsize: 10000000, maxFiles: 10 }),
        new winston.transports.File({ filename: 'logs/file-processing-error.log', level: 'error', maxsize: 10000000, maxFiles: 10 })
      ]
    });
    if (this.logger.transports.length === 0 || isDev) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple())
      }));
    }
  }

  async processUpload(
    fileBuffer: Buffer,
    originalName: string,
    userId?: string,
    correlationId?: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const processCorrelationId = correlationId || uuidv4();
    
    const logEntry: UploadLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: processCorrelationId,
      userId,
      originalName,
      fileType: path.extname(originalName).toLowerCase(),
      fileSize: fileBuffer.length,
      result: 'error'
    };

    try {
      const tempFilePath = await this.writeTempFile(fileBuffer, originalName);
      
      try {
        const validationResult = await this.validator.validate(tempFilePath, originalName, userId, processCorrelationId);
        logEntry.fileType = validationResult.metadata?.detectedMimeType || logEntry.fileType;
        
        if (!validationResult.valid) {
          logEntry.result = 'rejected';
          logEntry.reason = validationResult.error?.code;
          this.logUpload(logEntry);
          
          return {
            success: false,
            error: {
              code: validationResult.error?.code || 'VALIDATION_FAILED',
              message: validationResult.error?.message || 'File validation failed',
              stage: 'validation',
              details: validationResult.error?.details,
              recoverable: false
            },
            correlationId: processCorrelationId
          };
        }

        const storedPath = await this.storeFile(tempFilePath, originalName, validationResult.metadata?.checksum);
        
        let parsedContent;
        try {
          const parsed = await this.router.parseBuffer(fileBuffer, originalName);
          parsedContent = {
            text: parsed.text,
            sanitized: parsed.sanitized,
            metadata: parsed.metadata
          };
        } catch (parseError) {
          await this.quarantineFile(storedPath, `parse_error_${Date.now()}`);
          logEntry.result = 'error';
          logEntry.reason = 'PARSING_FAILED';
          this.logUpload(logEntry);

          return {
            success: false,
            error: {
              code: 'PARSING_FAILED',
              message: parseError instanceof Error ? parseError.message : 'Failed to parse file',
              stage: 'parsing',
              details: { originalName },
              recoverable: true
            },
            correlationId: processCorrelationId
          };
        }

        const processingTime = Date.now() - startTime;
        logEntry.result = 'success';
        logEntry.processingTime = processingTime;
        this.logUpload(logEntry);

        const processedFile: ProcessedFile = {
          id: uuidv4(),
          originalName,
          storedPath,
          fileType: parsedContent.metadata.fileType as string,
          size: fileBuffer.length,
          checksum: validationResult.metadata?.checksum || '',
          parsedContent,
          processedAt: new Date().toISOString(),
          processingTime,
          warnings: parsedContent.sanitized.warnings
        };

        this.logger.info('File processed successfully', {
          correlationId: processCorrelationId,
          fileId: processedFile.id,
          originalName,
          fileType: processedFile.fileType,
          processingTime
        });

        return {
          success: true,
          file: processedFile,
          correlationId: processCorrelationId
        };

      } finally {
        if (this.config.cleanupAfterProcessing) {
          await this.cleanupTempFile(tempFilePath);
        }
      }

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logEntry.result = 'error';
      logEntry.reason = error instanceof Error ? error.message : 'Unknown error';
      logEntry.processingTime = processingTime;
      this.logUpload(logEntry);

      this.logger.error('File processing failed', {
        correlationId: processCorrelationId,
        originalName,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          stage: 'parsing',
          details: { originalName },
          recoverable: false
        },
        correlationId: processCorrelationId
      };
    }
  }

  async processFilePath(
    filePath: string,
    userId?: string,
    correlationId?: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const processCorrelationId = correlationId || uuidv4();
    const originalName = path.basename(filePath);
    
    const logEntry: UploadLogEntry = {
      timestamp: new Date().toISOString(),
      correlationId: processCorrelationId,
      userId,
      originalName,
      fileType: path.extname(originalName).toLowerCase(),
      fileSize: 0,
      result: 'error'
    };

    try {
      const stats = await fs.stat(filePath);
      logEntry.fileSize = stats.size;

      const validationResult = await this.validator.validate(filePath, originalName, userId, processCorrelationId);
      logEntry.fileType = validationResult.metadata?.detectedMimeType || logEntry.fileType;
      
      if (!validationResult.valid) {
        logEntry.result = 'rejected';
        logEntry.reason = validationResult.error?.code;
        this.logUpload(logEntry);
        
        return {
          success: false,
          error: {
            code: validationResult.error?.code || 'VALIDATION_FAILED',
            message: validationResult.error?.message || 'File validation failed',
            stage: 'validation',
            details: validationResult.error?.details,
            recoverable: false
          },
          correlationId: processCorrelationId
        };
      }

      const storedPath = await this.storeFile(filePath, originalName, validationResult.metadata?.checksum);
      
      const parsed = await this.router.parse(storedPath);
      const parsedContent = {
        text: parsed.text,
        sanitized: parsed.sanitized,
        metadata: parsed.metadata
      };

      const processingTime = Date.now() - startTime;
      logEntry.result = 'success';
      logEntry.processingTime = processingTime;
      this.logUpload(logEntry);

      return {
        success: true,
        file: {
          id: uuidv4(),
          originalName,
          storedPath,
          fileType: parsedContent.metadata.fileType as string,
          size: stats.size,
          checksum: validationResult.metadata?.checksum || '',
          parsedContent,
          processedAt: new Date().toISOString(),
          processingTime,
          warnings: parsedContent.sanitized.warnings
        },
        correlationId: processCorrelationId
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logEntry.result = 'error';
      logEntry.reason = error instanceof Error ? error.message : 'Unknown error';
      logEntry.processingTime = processingTime;
      this.logUpload(logEntry);

      return {
        success: false,
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          stage: 'parsing',
          details: { originalName },
          recoverable: false
        },
        correlationId: processCorrelationId
      };
    }
  }

  private async writeTempFile(buffer: Buffer, originalName: string): Promise<string> {
    await fs.mkdir(this.config.tempDirectory, { recursive: true });
    const sanitizedName = this.sanitizeFileName(originalName);
    const tempPath = path.join(this.config.tempDirectory, `${uuidv4()}_${sanitizedName}`);
    await fs.writeFile(tempPath, buffer);
    return tempPath;
  }

  private async storeFile(sourcePath: string, originalName: string, checksum?: string): Promise<string> {
    await fs.mkdir(this.config.uploadDirectory, { recursive: true });
    const sanitizedName = this.sanitizeFileName(originalName);
    const fileName = checksum 
      ? `${checksum.substring(0, 16)}_${sanitizedName}`
      : `${uuidv4()}_${sanitizedName}`;
    const storedPath = path.join(this.config.uploadDirectory, fileName);
    await fs.copyFile(sourcePath, storedPath);
    return storedPath;
  }

  private async quarantineFile(filePath: string, reason: string): Promise<void> {
    try {
      await fs.mkdir(this.config.quarantineDirectory, { recursive: true });
      const quarantinedName = `${reason}_${path.basename(filePath)}`;
      const quarantinePath = path.join(this.config.quarantineDirectory, quarantinedName);
      await fs.rename(filePath, quarantinePath);
      this.logger.warn('File quarantined', { originalPath: filePath, quarantinePath, reason });
    } catch (error) {
      this.logger.error('Failed to quarantine file', { filePath, reason, error });
    }
  }

  private async cleanupTempFile(tempPath: string): Promise<void> {
    try {
      await fs.unlink(tempPath);
    } catch (error) {
      this.logger.warn('Failed to cleanup temp file', { tempPath, error });
    }
  }

  private sanitizeFileName(fileName: string): string {
    const sanitized = fileName.replace(/[<>:"|?*\\/\x00-\x1F]/g, '_');
    const ext = path.extname(sanitized);
    const baseName = path.basename(sanitized, ext);
    return `${baseName.substring(0, 100)}${ext}`.toLowerCase();
  }

  private logUpload(entry: UploadLogEntry): void {
    this.uploadLog.push(entry);
    this.logger.info('File upload processed', entry);
    
    if (this.uploadLog.length > 1000) {
      this.uploadLog = this.uploadLog.slice(-500);
    }
  }

  getUploadLogs(limit: number = 100): UploadLogEntry[] {
    return this.uploadLog.slice(-limit);
  }

  getSupportedTypes(): string[] {
    return this.router.getSupportedTypes();
  }

  getSupportedExtensions(): string[] {
    return this.router.getSupportedExtensions();
  }

  isSupported(extension: string): boolean {
    return this.router.isSupported(extension);
  }
}

export default SecureFileProcessor;
