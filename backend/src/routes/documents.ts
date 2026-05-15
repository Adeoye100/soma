import { Router, Request, Response } from 'express';
import { query, body } from 'express-validator';
import multer from 'multer';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest, authMiddleware } from '@/middleware/auth';
import { checkValidationResult } from '@/middleware/requestValidator';
import { DocumentService } from '@/services/documentService';
import { config } from '@/config';
import { logger } from '@/shared/utils/logger';
import { googleVisionService } from '@/services/googleVisionService';
import { officeDocumentService } from '../services/officeDocumentService';

const router = Router();

// Multer config - expanded to support Office documents
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024  // 25MB for larger Office documents
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'pdf', 'txt', 'md',                                    // Basic documents
      'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif',  // Images
      'pptx', 'ppt', 'docx', 'doc'                          // Office documents
    ];
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    
    if (allowed.includes(ext ?? '')) {
      cb(null, true);
    } else {
      cb(new Error(`File type .${ext} not supported. Supported formats: ${allowed.join(', ')}`));
    }
  }
});

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a document for exam generation
 * @access  Private
 */
router.post('/upload',
  authMiddleware,
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const file = (req as any).file
    const userId = (req as any).user?.id

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
    }

    if (!file) {
      return res.status(400).json({ error: 'Bad Request', message: 'No file provided' });
    }

    try {
      const result = await DocumentService.uploadAndProcess(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId
      );

      logger.info(`Document uploaded: ${result.documentId} by user ${userId}`);

      return res.status(201).json({
        message: 'Document uploaded successfully',
        document: {
          documentId: result.documentId,
          filename: result.filename,
          fileUrl: result.fileUrl,
          preview: result.preview
        }
      });
    } catch (error: any) {
      logger.error('Document upload error:', error);
      return res.status(500).json({ error: 'Upload failed', message: error.message });
    }
  })
);

/**
 * @route   POST /api/documents/extract-text
 * @desc    Upload a file and extract text using Google Vision API and Office document processing
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
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const ext = file.originalname.split('.').pop()?.toLowerCase();
      logger.info(`[documents] Processing file: ${file.originalname} (${ext}, ${file.size} bytes)`);

      let extractedText: string;
      let confidence: number = 0;
      let metadata: any = {};
      let extractionMethod: string = 'unknown';

      try {
        // Route to appropriate processing method based on file type
        if (ext === 'pptx' || ext === 'ppt') {
          // PowerPoint files
          logger.info('[documents] Processing PPTX with Office Document Service');
          extractionMethod = 'office-document-service';
          
          const conversionResult = await officeDocumentService.extractFromPptx(file.buffer, file.originalname);
          extractedText = conversionResult.text;
          confidence = conversionResult.confidence;
          metadata = {
            ...conversionResult.metadata,
            slides: conversionResult.metadata.slides?.map((slide: any) => ({
              slideNumber: slide.slideNumber,
              text: slide.text,
              confidence: slide.confidence,
              textLength: slide.text.length,
            })),
          };

        } else if (ext === 'docx' || ext === 'doc') {
          // Word documents
          logger.info('[documents] Processing DOCX with Office Document Service');
          extractionMethod = 'office-document-service';
          
          const conversionResult = await officeDocumentService.extractFromDocx(file.buffer, file.originalname);
          extractedText = conversionResult.text;
          confidence = conversionResult.confidence;
          metadata = {
            ...conversionResult.metadata,
            pages: conversionResult.metadata.pages?.map((page: any) => ({
              pageNumber: page.pageNumber,
              text: page.text,
              confidence: page.confidence,
              textLength: page.text.length,
            })),
          };

        } else {
          // All other formats (PDF, images, text files) - use Google Vision
          logger.info('[documents] Processing with Google Vision API');
          extractionMethod = 'google-vision-api';
          
          const visionResult = await googleVisionService.extractText(
            file.buffer,
            file.originalname,
            file.mimetype
          );

          extractedText = visionResult.text;
          confidence = visionResult.confidence;
          metadata = visionResult.metadata;
        }

        const processingTime = Date.now() - processingStartTime;

        logger.info(`[documents] Text extraction succeeded:`, {
          filename: file.originalname,
          method: extractionMethod,
          textLength: extractedText.length,
          confidence: confidence,
          processingTimeMs: processingTime,
          detectedLanguages: metadata.detectedLanguages,
          pages: metadata.pages?.length || metadata.slides?.length || 1,
        });

        if (extractedText.length < 10) {
          return res.status(400).json({
            error: 'Insufficient text content',
            detail: 'The file must contain at least 10 characters of extractable text.',
            hint: 'Make sure the file contains readable text content.',
            confidence: confidence,
            metadata: {
              extractionMethod,
              processingTimeMs: processingTime,
            },
          });
        }

      } catch (extractionError: any) {
        logger.error(`[documents] Text extraction failed:`, extractionError.message);

        // Fallback for text files
        if (ext === 'txt' || ext === 'md') {
          extractedText = file.buffer.toString('utf-8').trim();
          confidence = 1.0;
          extractionMethod = 'direct-text-read';
          metadata = {
            processingMethod: 'direct',
            pages: [{ pageNumber: 1, text: extractedText, confidence: 1.0 }]
          };
        } else {
          const processingTime = Date.now() - processingStartTime;
          return res.status(500).json({
            error: 'Text extraction failed',
            detail: extractionError.message,
            hint: 'Please ensure the file contains readable text or try a different format.',
            metadata: {
              extractionMethod: extractionMethod || 'unknown',
              processingTimeMs: processingTime,
              fileType: ext,
            },
          });
        }
      }

      // Final validation
      if (!extractedText || extractedText.length < 10) {
        const processingTime = Date.now() - processingStartTime;
        return res.status(400).json({
          error: 'Insufficient content',
          detail: 'File must contain at least 10 characters of extractable text.',
          confidence: confidence,
          metadata: {
            extractionMethod,
            processingTimeMs: processingTime,
          },
        });
      }

      const finalProcessingTime = Date.now() - processingStartTime;

      // Return comprehensive extraction results
      return res.json({
        success: true,
        filename: file.originalname,
        fileSize: file.size,
        textLength: extractedText.length,
        preview: extractedText.slice(0, 300) + (extractedText.length > 300 ? '...' : ''),
        extractedText: extractedText,
        confidence: confidence,
        metadata: {
          extractionMethod,
          detectedLanguages: metadata.detectedLanguages || [],
          pageCount: metadata.pages?.length || 0,
          slideCount: metadata.slides?.length || 0,
          processingTimeMs: finalProcessingTime,
          processedAt: new Date().toISOString(),
          conversionDetails: metadata.processingDetails || {},
          // Include page/slide breakdown for detailed analysis
          pages: metadata.pages?.slice(0, 5) || [], // Limit to first 5 pages in response
          slides: metadata.slides?.slice(0, 5) || [], // Limit to first 5 slides in response
        },
        performance: {
          totalProcessingTimeMs: finalProcessingTime,
          fileSizeMB: (file.size / (1024 * 1024)).toFixed(2),
          processingSpeedCharsPerSec: Math.round(extractedText.length / (finalProcessingTime / 1000)),
        },
      });

    } catch (err: any) {
      const processingTime = Date.now() - processingStartTime;
      logger.error('[documents/extract-text] Unexpected error:', err);
      return res.status(500).json({
        error: 'File processing failed',
        detail: err.message,
        metadata: {
          processingTimeMs: processingTime,
        },
      });
    }
  })
);

/**
 * @route   GET /api/documents/supported-formats
 * @desc    Get comprehensive list of supported file formats
 * @access  Public
 */
router.get('/supported-formats', (req: Request, res: Response) => {
  const supportedFormats = [
    // Basic Documents
    { extension: '.pdf', description: 'Portable Document Format', category: 'document', processor: 'google-vision' },
    { extension: '.txt', description: 'Plain Text', category: 'text', processor: 'direct-read' },
    { extension: '.md', description: 'Markdown', category: 'text', processor: 'direct-read' },
    
    // Images
    { extension: '.jpg', description: 'JPEG Image', category: 'image', processor: 'google-vision' },
    { extension: '.jpeg', description: 'JPEG Image', category: 'image', processor: 'google-vision' },
    { extension: '.png', description: 'PNG Image', category: 'image', processor: 'google-vision' },
    { extension: '.gif', description: 'GIF Image', category: 'image', processor: 'google-vision' },
    { extension: '.bmp', description: 'Bitmap Image', category: 'image', processor: 'google-vision' },
    { extension: '.webp', description: 'WebP Image', category: 'image', processor: 'google-vision' },
    { extension: '.tiff', description: 'TIFF Image', category: 'image', processor: 'google-vision' },
    { extension: '.tif', description: 'TIFF Image', category: 'image', processor: 'google-vision' },
    
    // Office Documents
    { extension: '.pptx', description: 'PowerPoint Presentation', category: 'office', processor: 'office-service' },
    { extension: '.ppt', description: 'PowerPoint Presentation (Legacy)', category: 'office', processor: 'office-service' },
    { extension: '.docx', description: 'Word Document', category: 'office', processor: 'office-service' },
    { extension: '.doc', description: 'Word Document (Legacy)', category: 'office', processor: 'office-service' },
  ];

  const categoryGroups = supportedFormats.reduce((acc, format) => {
    if (!acc[format.category]) {
      acc[format.category] = [];
    }
    acc[format.category].push(format);
    return acc;
  }, {} as Record<string, typeof supportedFormats>);

  res.json({
    supportedFormats,
    categoryGroups,
    totalFormats: supportedFormats.length,
    capabilities: {
      textExtraction: true,
      imageOCR: true,
      officeDocuments: true,
      multiPageDocuments: true,
      languageDetection: true,
      confidenceScoring: true,
    },
    processingEngines: {
      'google-vision': 'Google Vision API for OCR and document processing',
      'office-service': 'Office Document Service with LibreOffice/direct parsing',
      'direct-read': 'Direct file reading for text formats',
    },
  });
});

/**
 * @route   GET /api/documents/processing-status
 * @desc    Check the status of all processing services
 * @access  Private
 */
router.get('/processing-status',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const [visionHealth] = await Promise.all([
        googleVisionService.healthCheck(),
      ]);

      const officeServiceStatus = {
        status: 'ok' as const,
        message: 'Office Document Service available',
        details: {
          libreOfficeAvailable: await (officeDocumentService as any).isLibreOfficeAvailable(),
          directParsingAvailable: true,
        },
      };

      const overallStatus = visionHealth.status === 'ok' ? 'healthy' : 'degraded';

      return res.json({
        overall: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          googleVision: visionHealth,
          officeDocuments: officeServiceStatus,
        },
        capabilities: {
          pdfProcessing: visionHealth.status === 'ok',
          imageOCR: visionHealth.status === 'ok',
          officeDocuments: true,
          textFiles: true,
        },
      });
    } catch (error: any) {
      return res.status(500).json({
        overall: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      });
    }
  })
);
/**
 * @route   GET /api/documents
 * @desc    List user's documents
 * @access  Private
 */
router.get('/',
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  checkValidationResult,
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    try {
      const { data, total } = await DocumentService.getDocumentsByUser(userId, page, limit);

      return res.json({
        message: 'Documents retrieved successfully',
        documents: data.map(d => ({
          id: d.id,
          filename: d.filename,
          fileType: d.file_type,
          size: d.size_bytes,
          preview: d.preview,
          fileUrl: d.file_url,
          createdAt: d.created_at
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      });
    } catch (error: any) {
      logger.error('Get documents error:', error);
      return res.status(500).json({ error: 'Failed to retrieve documents', message: error.message });
    }
  })
);

/**
 * @route   GET /api/documents/:id/content
 * @desc    Get extracted text content from a document
 * @access  Private
 */
router.get('/:id/content',
  asyncHandler(async (req: Request, res: Response): Promise<any> => {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const content = await DocumentService.getDocumentContent(id!, userId);
      return res.json({ message: 'Content retrieved', content: content.substring(0, 10000) });
    } catch (error: any) {
      logger.error('Get document content error:', error);
      return res.status(500).json({ error: 'Failed to get content', message: error.message });
    }
  })
);

export default router;
