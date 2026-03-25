import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';
import winston from 'winston';
import { sanitizeFileName } from '@/shared/utils/pathUtils';

export interface FileValidationConfig {
  maxFileSize: number;
  allowedMimeTypes: Map<string, string[]>;
  allowedExtensions: string[];
  scanForMalware: boolean;
  malwareScanEndpoint?: string;
}

export interface ValidationResult {
  valid: boolean;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  metadata?: {
    mimeType: string;
    detectedMimeType: string;
    extension: string;
    size: number;
    checksum: string;
    scanResult?: MalwareScanResult;
  };
}

export interface MalwareScanResult {
  scanned: boolean;
  clean: boolean;
  threats?: string[];
  error?: string;
}

export interface UploadLogEntry {
  timestamp: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  result: 'success' | 'rejected' | 'error';
  reason?: string;
  userId?: string;
  correlationId?: string;
}

export class FileSecurityValidator {
  private config: FileValidationConfig;
  private logger: winston.Logger;
  private mime: typeof import('mime-types');

  constructor(config: FileValidationConfig) {
    this.config = config;
    const isDev = process.env.NODE_ENV !== 'production';
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.File({ filename: 'logs/file-upload.log' })
      ]
    });
    if (this.logger.transports.length === 0 || isDev) {
      this.logger.add(new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple())
      }));
    }

    this.mime = require('mime-types');
  }

  async validate(filePath: string, originalName: string, userId?: string, correlationId?: string): Promise<ValidationResult> {
    const logEntry: Partial<UploadLogEntry> = {
      timestamp: new Date().toISOString(),
      fileName: originalName,
      userId,
      correlationId
    };

    try {
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      logEntry.fileSize = fileSize;

      const extension = path.extname(originalName).toLowerCase();
      logEntry.fileType = extension;

      if (fileSize > this.config.maxFileSize) {
        const error = {
          code: 'FILE_TOO_LARGE',
          message: `File size ${fileSize} bytes exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
          details: { maxSize: this.config.maxFileSize, actualSize: fileSize }
        };
        logEntry.result = 'rejected';
        logEntry.reason = error.code;
        await this.logUpload(logEntry as UploadLogEntry);
        return { valid: false, error };
      }

      if (!this.config.allowedExtensions.includes(extension)) {
        const error = {
          code: 'INVALID_EXTENSION',
          message: `File extension ${extension} is not allowed`,
          details: { extension, allowedExtensions: this.config.allowedExtensions }
        };
        logEntry.result = 'rejected';
        logEntry.reason = error.code;
        await this.logUpload(logEntry as UploadLogEntry);
        return { valid: false, error };
      }

      const declaredMimeType = this.mime.lookup(originalName) || 'application/octet-stream';
      const detectedMimeType = await this.detectMimeType(filePath);
      logEntry.fileType = detectedMimeType;

      const isMimeAllowed = this.isMimeTypeAllowed(detectedMimeType, extension);
      if (!isMimeAllowed) {
        const error = {
          code: 'MIME_TYPE_MISMATCH',
          message: `MIME type mismatch: declared as ${declaredMimeType}, detected as ${detectedMimeType}`,
          details: { declaredMimeType, detectedMimeType, extension }
        };
        logEntry.result = 'rejected';
        logEntry.reason = error.code;
        await this.logUpload(logEntry as UploadLogEntry);
        return { valid: false, error };
      }

      if (this.config.scanForMalware) {
        const scanResult = await this.scanForMalware(filePath);
        if (!scanResult.clean) {
          const error = {
            code: 'MALWARE_DETECTED',
            message: 'Malware detected in file',
            details: { threats: scanResult.threats }
          };
          logEntry.result = 'rejected';
          logEntry.reason = 'MALWARE_DETECTED';
          await this.logUpload(logEntry as UploadLogEntry);
          return { valid: false, error };
        }
      }

      const checksum = await this.calculateChecksum(filePath);

      logEntry.result = 'success';
      await this.logUpload(logEntry as UploadLogEntry);

      return {
        valid: true,
        metadata: {
          mimeType: declaredMimeType,
          detectedMimeType,
          extension,
          size: fileSize,
          checksum
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logEntry.result = 'error';
      logEntry.reason = errorMessage;
      await this.logUpload(logEntry as UploadLogEntry);

      return {
        valid: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessage,
          details: { originalError: error instanceof Error ? error.stack : String(error) }
        }
      };
    }
  }

  async validateBuffer(buffer: Buffer, originalName: string, userId?: string, correlationId?: string): Promise<ValidationResult> {
    const logEntry: Partial<UploadLogEntry> = {
      timestamp: new Date().toISOString(),
      fileName: originalName,
      fileSize: buffer.length,
      userId,
      correlationId
    };

    try {
      const extension = path.extname(originalName).toLowerCase();
      logEntry.fileType = extension;

      if (buffer.length > this.config.maxFileSize) {
        const error = {
          code: 'FILE_TOO_LARGE',
          message: `File size ${buffer.length} bytes exceeds maximum allowed size of ${this.config.maxFileSize} bytes`,
          details: { maxSize: this.config.maxFileSize, actualSize: buffer.length }
        };
        logEntry.result = 'rejected';
        logEntry.reason = error.code;
        await this.logUpload(logEntry as UploadLogEntry);
        return { valid: false, error };
      }

      if (!this.config.allowedExtensions.includes(extension)) {
        const error = {
          code: 'INVALID_EXTENSION',
          message: `File extension ${extension} is not allowed`,
          details: { extension, allowedExtensions: this.config.allowedExtensions }
        };
        logEntry.result = 'rejected';
        logEntry.reason = error.code;
        await this.logUpload(logEntry as UploadLogEntry);
        return { valid: false, error };
      }

      const declaredMimeType = this.mime.lookup(originalName) || 'application/octet-stream';
      const detectedMimeType = this.detectMimeTypeFromBuffer(buffer);
      logEntry.fileType = detectedMimeType;

      const isMimeAllowed = this.isMimeTypeAllowed(detectedMimeType, extension);
      if (!isMimeAllowed) {
        const error = {
          code: 'MIME_TYPE_MISMATCH',
          message: `MIME type mismatch: declared as ${declaredMimeType}, detected as ${detectedMimeType}`,
          details: { declaredMimeType, detectedMimeType, extension }
        };
        logEntry.result = 'rejected';
        logEntry.reason = error.code;
        await this.logUpload(logEntry as UploadLogEntry);
        return { valid: false, error };
      }

      if (this.config.scanForMalware) {
        const scanResult = await this.scanBufferForMalware(buffer);
        if (!scanResult.clean) {
          const error = {
            code: 'MALWARE_DETECTED',
            message: 'Malware detected in file',
            details: { threats: scanResult.threats }
          };
          logEntry.result = 'rejected';
          logEntry.reason = 'MALWARE_DETECTED';
          await this.logUpload(logEntry as UploadLogEntry);
          return { valid: false, error };
        }
      }

      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      logEntry.result = 'success';
      await this.logUpload(logEntry as UploadLogEntry);

      return {
        valid: true,
        metadata: {
          mimeType: declaredMimeType,
          detectedMimeType,
          extension,
          size: buffer.length,
          checksum
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logEntry.result = 'error';
      logEntry.reason = errorMessage;
      await this.logUpload(logEntry as UploadLogEntry);

      return {
        valid: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: errorMessage,
          details: { originalError: error instanceof Error ? error.stack : String(error) }
        }
      };
    }
  }

  private isMimeTypeAllowed(mimeType: string, extension: string): boolean {
    const allowedMimes = this.config.allowedMimeTypes.get(extension);
    if (!allowedMimes) {
      return false;
    }
    return allowedMimes.includes(mimeType);
  }

  private async detectMimeType(filePath: string): Promise<string> {
    const buffer = await fs.readFile(filePath);
    return this.detectMimeTypeFromBuffer(buffer);
  }

  private detectMimeTypeFromBuffer(buffer: Buffer): string {
    if (buffer.length < 4) {
      return 'application/octet-stream';
    }

    const signatures: Array<{ magic: number[]; mime: string; mask?: number[] }> = [
      { magic: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
      { magic: [0x50, 0x4B, 0x03, 0x04], mime: 'application/zip' },
      { magic: [0x50, 0x4B, 0x05, 0x06], mime: 'application/zip' },
      { magic: [0x50, 0x4B, 0x07, 0x08], mime: 'application/zip' },
      { magic: [0x89, 0x50, 0x4E, 0x47], mime: 'image/png' },
      { magic: [0xFF, 0xD8, 0xFF, 0xE0], mime: 'image/jpeg' },
      { magic: [0xFF, 0xD8, 0xFF, 0xE1], mime: 'image/jpeg' },
      { magic: [0xFF, 0xD8, 0xFF, 0xE8], mime: 'image/jpeg' },
      { magic: [0xFF, 0xD8, 0xFF, 0xDB], mime: 'image/jpeg' },
      { magic: [0xFF, 0xD8, 0xFF, 0xEE], mime: 'image/jpeg' },
      { magic: [0xD0, 0xCF, 0x11, 0xE0], mime: 'application/vnd.ms-office' },
    ];

    for (const sig of signatures) {
      const mask = sig.mask || [];
      let match = true;
      for (let i = 0; i < sig.magic.length; i++) {
        const expected = sig.magic[i];
        const actual = buffer[i];
        const maskVal = mask[i] || 0xFF;
        if (actual === undefined || expected === undefined) {
          throw new Error(
            'FileSecurityValidator: magic byte lookup returned undefined — ' +
            'file header validation cannot proceed'
          );
        }
        if ((actual & maskVal) !== (expected & maskVal)) {
          match = false;
          break;
        }
      }
      if (match) {
        return sig.mime;
      }
    }

    return 'application/octet-stream';
  }

  private async scanForMalware(filePath: string): Promise<MalwareScanResult> {
    if (this.config.malwareScanEndpoint) {
      try {
        return await this.cloudMalwareScan(filePath);
      } catch (error) {
        this.logger.error('Malware scan failed', { error });
        return { scanned: true, clean: false, threats: ['Malware scan service unavailable'] };
      }
    }

    return this.localMalwareScan(filePath);
  }

  private async scanBufferForMalware(buffer: Buffer): Promise<MalwareScanResult> {
    if (this.config.malwareScanEndpoint) {
      try {
        return await this.cloudBufferMalwareScan(buffer);
      } catch (error) {
        this.logger.error('Malware scan failed', { error });
        return { scanned: true, clean: false, threats: ['Malware scan service unavailable'] };
      }
    }

    return this.localBufferMalwareScan(buffer);
  }

  private async localMalwareScan(filePath: string): Promise<MalwareScanResult> {
    try {
      const { execSync } = require('child_process');
      const result = execSync('clamscan --no-summary --infected', { input: filePath, encoding: 'utf-8' });
      return { scanned: true, clean: !result.includes('FOUND'), threats: result.includes('FOUND') ? [result] : undefined };
    } catch (error: any) {
      if (error.status === 0) {
        return { scanned: true, clean: true };
      }
      return { scanned: true, clean: true, error: error.message };
    }
  }

  private async localBufferMalwareScan(buffer: Buffer): Promise<MalwareScanResult> {
    const tempFile = `/tmp/malware_scan_${Date.now()}.tmp`;
    try {
      await fs.writeFile(tempFile, buffer);
      const result = await this.localMalwareScan(tempFile);
      await fs.unlink(tempFile).catch(() => {});
      return result;
    } catch {
      await fs.unlink(tempFile).catch(() => {});
      return { scanned: true, clean: true };
    }
  }

  private async cloudMalwareScan(filePath: string): Promise<MalwareScanResult> {
    const FormData = require('form-data');
    const fsx = require('fs');
    const axios = require('axios');

    const form = new FormData();
    form.append('file', fsx.createReadStream(filePath));

    const response = await axios.post(this.config.malwareScanEndpoint, form, {
      headers: form.getHeaders(),
      timeout: 30000
    });

    return {
      scanned: true,
      clean: response.data.clean ?? true,
      threats: response.data.threats
    };
  }

  private async cloudBufferMalwareScan(buffer: Buffer): Promise<MalwareScanResult> {
    const axios = require('axios');

    const response = await axios.post(this.config.malwareScanEndpoint, buffer, {
      headers: { 'Content-Type': 'application/octet-stream' },
      timeout: 30000
    });

    return {
      scanned: true,
      clean: response.data.clean ?? true,
      threats: response.data.threats
    };
  }

  private async calculateChecksum(filePath: string): Promise<string> {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  private async logUpload(entry: UploadLogEntry): Promise<void> {
    this.logger.info('File upload attempt', entry);
  }
}

export function createFileValidationConfig(maxFileSize: number = 10 * 1024 * 1024, scanEnabled: boolean = true): FileValidationConfig {
  const allowedMimeTypes = new Map<string, string[]>();
  allowedMimeTypes.set('.pdf', ['application/pdf']);
  allowedMimeTypes.set('.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
  allowedMimeTypes.set('.pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation']);
  allowedMimeTypes.set('.txt', ['text/plain']);
  allowedMimeTypes.set('.png', ['image/png']);
  allowedMimeTypes.set('.jpg', ['image/jpeg']);
  allowedMimeTypes.set('.jpeg', ['image/jpeg']);

  return {
    maxFileSize,
    allowedMimeTypes,
    allowedExtensions: ['.pdf', '.docx', '.pptx', '.txt', '.png', '.jpg', '.jpeg'],
    scanForMalware: scanEnabled
  };
}

export default FileSecurityValidator;
