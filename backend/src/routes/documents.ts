import { Router, Request, Response } from 'express';
import { query, body } from 'express-validator';
import multer from 'multer';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { checkValidationResult } from '@/middleware/requestValidator';
import { DocumentService } from '@/services/documentService';
import { config } from '@/config';
import winston from 'winston';

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: config.fileUpload.maxFileSize },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.ms-powerpoint',
      'application/vnd.ms-excel',
      'text/plain',
      'text/csv',
      'image/png',
      'image/jpeg',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported. Allowed: PDF, DOCX, PPTX, XLSX, TXT, CSV, PNG, JPG`));
    }
  }
});

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a document for exam generation
 * @access  Private
 */
router.post('/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'Bad Request', message: 'No file provided' });
      return;
    }

    try {
      const result = await DocumentService.uploadAndProcess(
        file.buffer,
        file.originalname,
        file.mimetype,
        userId
      );

      winston.info(`Document uploaded: ${result.documentId} by user ${userId}`);

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
      winston.error('Document upload error:', error);
      return res.status(500).json({ error: 'Upload failed', message: error.message });
    }
  })
);

/**
 * @route   POST /api/documents/extract-text
 * @desc    Upload a file and get extracted text (for exam generation)
 * @access  Private
 */
router.post('/extract-text',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = req.file;
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    if (!file) {
      res.status(400).json({ error: 'Bad Request', message: 'No file provided' });
      return;
    }

    try {
      const text = await DocumentService.extractText(
        file.buffer,
        file.originalname,
        file.mimetype
      );

      // Validate extracted text
      if (!text || text.trim().length < 50) {
        return res.status(400).json({
          error: 'File contains insufficient text',
          detail: 'The file must contain at least 50 characters of text.',
          hint: 'Ensure the file is not scanned as an image-only PDF.'
        });
      }

      return res.json({
        message: 'Text extracted successfully',
        filename: file.originalname,
        mimeType: file.mimetype,
        text: text.substring(0, 50000),
        truncated: text.length > 50000
      });
    } catch (error: any) {
      winston.error(`Text extraction error for ${file.originalname}:`, error);
      
      // Determine if it's an iLovePDF configuration error
      if (error.message.includes('iLovePDF API keys not configured')) {
        return res.status(503).json({
          error: 'File processing service unavailable',
          hint: 'iLovePDF keys not configured. Admin must configure iLovePDF service.'
        });
      }

      return res.status(502).json({ 
        error: 'File processing failed', 
        detail: error.message,
        hint: 'The file may be corrupted, scanned as image, or in an unsupported format.'
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
  asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
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
      winston.error('Get documents error:', error);
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
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = (req as AuthenticatedRequest).user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    try {
      const content = await DocumentService.getDocumentContent(id!, userId);
      return res.json({ message: 'Content retrieved', content: content.substring(0, 10000) });
    } catch (error: any) {
      winston.error('Get document content error:', error);
      return res.status(500).json({ error: 'Failed to get content', message: error.message });
    }
  })
);

export default router;
