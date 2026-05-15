import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { asyncHandler } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';
import { checkValidationResult } from '@/middleware/requestValidator';
import { freeOcrService, ExtractionResult } from '@/services/file-processing/FreeOcrService';
import { logger } from '@/shared/utils/logger';

const router = Router();

// Configure multer for file upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024  // 50MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'pdf', 'txt', 'md',
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif',
      'docx', 'doc'
    ];
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowed.includes(ext ?? '')) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} not supported`));
    }
  }
});

/**
 * @route   POST /api/documents/extract-text
 * @desc    Upload a file and extract text using FREE open-source libraries
 * @access  Private
 */
router.post(
  '/extract-text',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const processingStartTime = Date.now();
    
    try {
      const file = (req as any).file;
      const userId = (req as any).user?.id;

      if (!file) {
        return res.status(400).json({ 
          error: 'No file uploaded',
          success: false 
        });
      }

      const ext = file.originalname.split('.').pop()?.toLowerCase();
      logger.info(`[documents] Processing file: ${file.originalname}`, {
        extension: ext,
        size: file.size,
        mimeType: file.mimetype,
        userId
      });

      // Save file temporarily to disk (Tesseract needs file path)
      const tmpDir = '/tmp';
      const tmpFileName = `soma_${Date.now()}_${Math.random().toString(36).substring(7)}_${file.originalname}`;
      const tmpFilePath = path.join(tmpDir, tmpFileName);

      await require('fs/promises').writeFile(tmpFilePath, file.buffer);

      // Extract text using free service
      let extractionResult: ExtractionResult;
      try {
        extractionResult = await freeOcrService.extractText(tmpFilePath, file.mimetype);
      } finally {
        // Clean up temporary file
        try {
          await require('fs/promises').unlink(tmpFilePath);
        } catch (e) {
          logger.warn('[documents] Failed to delete temporary file', { tmpFilePath });
        }
      }

      const processingTime = Date.now() - processingStartTime;

      // Build response
      const response = {
        success: true,
        data: {
          text: extractionResult.text,
          statistics: {
            textLength: extractionResult.text.length,
            wordCount: extractionResult.text.split(/\s+/).filter(w => w.length > 0).length,
            pages: extractionResult.pages,
            confidence: extractionResult.confidence,
            method: extractionResult.method
          },
          metadata: {
            fileName: file.originalname,
            fileSize: file.size,
            fileType: ext,
            processingTimeMs: processingTime,
            extractionTimeMs: extractionResult.processingTimeMs,
            uploadedAt: new Date().toISOString(),
            userId: userId || 'anonymous'
          }
        }
      };

      logger.info('[documents] Extraction successful', {
        method: extractionResult.method,
        wordCount: response.data.statistics.wordCount,
        processingTimeMs: processingTime,
        confidence: extractionResult.confidence
      });

      return res.status(200).json(response);

    } catch (err: any) {
      const processingTime = Date.now() - processingStartTime;
      
      logger.error('[documents/extract-text] Error:', {
        error: err.message,
        stack: err.stack,
        processingTimeMs: processingTime
      });

      return res.status(500).json({
        success: false,
        error: 'File processing failed',
        detail: err.message,
        metadata: {
          processingTimeMs: processingTime
        }
      });
    }
  })
);

/**
 * @route   GET /api/documents/supported-formats
 * @desc    Get list of supported file formats
 * @access  Public
 */
router.get('/supported-formats', (req: Request, res: Response) => {
  const supportedFormats = [
    {
      extension: '.pdf',
      description: 'Portable Document Format',
      category: 'document',
      processor: 'pdf-parse',
      notes: 'Text-based and scanned PDFs supported'
    },
    {
      extension: '.docx',
      description: 'Microsoft Word Document',
      category: 'document',
      processor: 'mammoth',
      notes: 'Modern Word documents'
    },
    {
      extension: '.txt',
      description: 'Plain Text File',
      category: 'document',
      processor: 'native',
      notes: 'UTF-8 encoded text files'
    },
    {
      extension: '.md',
      description: 'Markdown File',
      category: 'document',
      processor: 'native',
      notes: 'Markdown formatted text'
    },
    {
      extension: '.png',
      description: 'PNG Image',
      category: 'image',
      processor: 'tesseract-ocr',
      notes: 'OCR for text in images'
    },
    {
      extension: '.jpg',
      description: 'JPEG Image',
      category: 'image',
      processor: 'tesseract-ocr',
      notes: 'OCR for text in images'
    },
    {
      extension: '.gif',
      description: 'GIF Image',
      category: 'image',
      processor: 'tesseract-ocr',
      notes: 'OCR for text in images'
    }
  ];

  return res.status(200).json({
    success: true,
    supported_formats: supportedFormats,
    total_formats: supportedFormats.length
  });
});

/**
 * @route   GET /api/documents/health
 * @desc    Check if document processing service is healthy
 * @access  Public
 */
router.get('/health', (req: Request, res: Response) => {
  return res.status(200).json({
    success: true,
    service: 'document-extraction',
    status: 'healthy',
    processors: [
      'tesseract-ocr (images)',
      'pdf-parse (PDFs)',
      'mammoth (Word documents)',
      'native (text files)'
    ],
    note: 'All processors are free and open-source. No API keys required.'
  });
});

export default router;
