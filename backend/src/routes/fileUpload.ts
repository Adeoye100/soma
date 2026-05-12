import { Router, Request, Response } from 'express';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { SecureFileProcessor, FileProcessorConfig } from '@/services/file-processing';
import multer from 'multer';
import * as path from 'path';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';
import config from '@/config';

const router = Router();

const fileProcessorConfig: FileProcessorConfig = {
  maxFileSize: config.fileUpload.maxFileSize,
  uploadDirectory: config.fileUpload.uploadPath,
  tempDirectory: config.fileUpload.tempPath,
  quarantineDirectory: config.fileUpload.quarantinePath,
  enableMalwareScanning: config.fileUpload.malwareScanningEnabled,
  malwareScanEndpoint: config.fileUpload.malwareScanEndpoint,
  defaultLanguage: config.fileUpload.ocrLanguage,
  enableOcrEnhancement: config.fileUpload.ocrEnhancement,
  maxParsingTime: config.fileUpload.maxParsingTime,
  cleanupAfterProcessing: config.fileUpload.cleanupTempFiles
};

const fileProcessor = new SecureFileProcessor(fileProcessorConfig);

const storage = multer.memoryStorage();

const fileFilter = (req: any, file: any, cb: multer.FileFilterCallback) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const supportedExts = fileProcessor.getSupportedExtensions();
  
  if (supportedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not supported. Supported types: ${supportedExts.join(', ')}`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: fileProcessorConfig.maxFileSize,
    files: 10
  },
  fileFilter
});

router.post('/upload', upload.array('files', 10), asyncHandler(async (req: Request, res: Response) => {
  const files = (req as any).files as any[];
  const userId = (req as any).user?.id;
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  if (!files || files.length === 0) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'No files provided for upload',
      correlationId
    });
    return;
  }

  winston.info(`Processing ${files.length} file(s) for upload`, {
    correlationId,
    userId,
    fileCount: files.length
  });

  const results = [];
  const errors = [];

  for (const file of files) {
    const result = await fileProcessor.processUpload(
      file.buffer,
      file.originalname,
      userId,
      correlationId
    );

    if (result.success && result.file) {
      results.push({
        fileId: result.file.id,
        originalName: result.file.originalName,
        fileType: result.file.fileType,
        size: result.file.size,
        warnings: result.file.warnings,
        content: {
          text: result.file.parsedContent.text,
          sanitizedWarnings: result.file.parsedContent.sanitized.warnings,
          removedElements: result.file.parsedContent.sanitized.removedElements,
          metadata: result.file.parsedContent.metadata
        }
      });
    } else if (result.error) {
      errors.push({
        originalName: file.originalname,
        error: {
          code: result.error.code,
          message: result.error.message,
          stage: result.error.stage,
          recoverable: result.error.recoverable
        }
      });
    }
  }

  const response: any = {
    correlationId,
    timestamp: new Date().toISOString(),
    summary: {
      total: files.length,
      successful: results.length,
      failed: errors.length
    }
  };

  if (results.length > 0) {
    response.files = results;
  }

  if (errors.length > 0) {
    response.errors = errors;
  }

  if (results.length === 0 && errors.length > 0) {
    res.status(422).json({
      error: 'Processing Failed',
      message: 'None of the uploaded files could be processed',
      ...response
    });
    return;
  }

  winston.info('File upload processing completed', {
    correlationId,
    userId,
    successful: results.length,
    failed: errors.length
  });

  res.status(errors.length > 0 ? 207 : 201).json(response);
}));

router.post('/upload/single', upload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  const file = req.file;
  const userId = (req as AuthenticatedRequest).user?.id;
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  if (!file) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'No file provided for upload',
      correlationId
    });
    return;
  }

  winston.info('Processing single file upload', {
    correlationId,
    userId,
    fileName: file.originalname,
    fileSize: file.size
  });

  const result = await fileProcessor.processUpload(
    file.buffer,
    file.originalname,
    userId,
    correlationId
  );

  if (!result.success) {
    res.status(result.error?.recoverable ? 422 : 400).json({
      error: result.error?.code || 'Processing Failed',
      message: result.error?.message || 'File processing failed',
      correlationId,
      details: result.error?.details
    });
    return;
  }

  res.status(201).json({
    correlationId,
    timestamp: new Date().toISOString(),
    file: {
      fileId: result.file?.id,
      originalName: result.file?.originalName,
      fileType: result.file?.fileType,
      size: result.file?.size,
      checksum: result.file?.checksum,
      warnings: result.file?.warnings,
      content: {
        text: result.file?.parsedContent.text,
        sanitizedWarnings: result.file?.parsedContent.sanitized.warnings,
        removedElements: result.file?.parsedContent.sanitized.removedElements,
        metadata: result.file?.parsedContent.metadata
      },
      processedAt: result.file?.processedAt,
      processingTime: result.file?.processingTime
    }
  });
}));

router.post('/process-base64', asyncHandler(async (req: Request, res: Response) => {
  const { fileName, content } = req.body;
  const userId = (req as AuthenticatedRequest).user?.id;
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();

  if (!fileName || !content) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Both fileName and content (base64) are required',
      correlationId
    });
    return;
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(content, 'base64');
  } catch (error) {
    res.status(400).json({
      error: 'Bad Request',
      message: 'Invalid base64 content',
      correlationId
    });
    return;
  }

  winston.info('Processing base64 file upload', {
    correlationId,
    userId,
    fileName,
    fileSize: buffer.length
  });

  const result = await fileProcessor.processUpload(buffer, fileName, userId, correlationId);

  if (!result.success) {
    res.status(result.error?.recoverable ? 422 : 400).json({
      error: result.error?.code || 'Processing Failed',
      message: result.error?.message || 'File processing failed',
      correlationId,
      details: result.error?.details
    });
    return;
  }

  res.status(201).json({
    correlationId,
    timestamp: new Date().toISOString(),
    file: {
      fileId: result.file?.id,
      originalName: result.file?.originalName,
      fileType: result.file?.fileType,
      size: result.file?.size,
      checksum: result.file?.checksum,
      warnings: result.file?.warnings,
      content: {
        text: result.file?.parsedContent.text,
        sanitizedWarnings: result.file?.parsedContent.sanitized.warnings,
        removedElements: result.file?.parsedContent.sanitized.removedElements,
        metadata: result.file?.parsedContent.metadata
      },
      processedAt: result.file?.processedAt,
      processingTime: result.file?.processingTime
    }
  });
}));

router.get('/supported-types', asyncHandler(async (req: Request, res: Response) => {
  res.json({
    supportedTypes: fileProcessor.getSupportedTypes(),
    supportedExtensions: fileProcessor.getSupportedExtensions().map(ext => ext.substring(1)),
    allowedMimeTypes: config.fileUpload.allowedMimeTypes,
    allowedExtensions: config.fileUpload.allowedExtensions,
    maxFileSize: fileProcessorConfig.maxFileSize,
    maxFileSizeFormatted: `${(fileProcessorConfig.maxFileSize / (1024 * 1024)).toFixed(1)} MB`
  });
}));

router.get('/logs', asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;
  const logs = fileProcessor.getUploadLogs(limit);
  
  res.json({
    logs,
    count: logs.length
  });
}));

router.get('/health', asyncHandler(async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    processor: 'active',
    supportedTypes: fileProcessor.getSupportedTypes().length,
    uptime: process.uptime()
  };
  
  res.json(health);
}));

export default router;
