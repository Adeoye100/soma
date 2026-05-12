import { Router, Request, Response } from 'express';
import { query, body } from 'express-validator';
import multer from 'multer';
import { asyncHandler } from '@/middleware/errorHandler';
import { AuthenticatedRequest } from '@/middleware/auth';
import { checkValidationResult } from '@/middleware/requestValidator';
import { DocumentService } from '@/services/documentService';
import { config } from '@/config';
import winston from 'winston';

import pdfParse from 'pdf-parse';
const pdf = pdfParse;

const router = Router();

// Multer config
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024  // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['pdf', 'txt', 'md']
    const ext = file.originalname.split('.').pop()?.toLowerCase()
    
    if (allowed.includes(ext ?? '')) {
      cb(null, true)
    } else {
      cb(new Error(`File type .${ext} not supported`) as any)
    }
  }
})

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a document for exam generation
 * @access  Private
 */
router.post('/upload',
  upload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    const file = (req as any).file
    const userId = (req as any).user?.id

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
router.post(
  '/extract-text',
  upload.single('file'),
  async (req: Request, res: Response) => {
    try {
      const file = (req as any).file
      const userId = (req as any).user?.id

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const ext = file.originalname.split('.').pop()?.toLowerCase()
      let extractedText: string

      // PDF extraction with pdf-parse (local, free)
      if (ext === 'pdf') {
        try {
          console.log('[documents] Local PDF extraction starting')
          
          const pdfData = await pdf(file.buffer, {
            max: 100  // Limit to first 100 pages
          })
          
          extractedText = pdfData.text
            .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')  // Remove control chars
            .trim()

          console.log('[documents] PDF extraction succeeded:', {
            pages: pdfData.numpages,
            textLength: extractedText.length
          })

          if (extractedText.length < 100) {
            return res.status(400).json({
              error: 'PDF contains insufficient text',
              detail: 'The PDF must contain at least 100 characters of extractable text.',
              hint: 'Scanned PDFs require OCR. Try a text-based PDF.'
            })
          }

        } catch (pdfError: any) {
          console.error('[documents] PDF extraction failed:', pdfError.message)
          return res.status(500).json({
            error: 'PDF extraction failed',
            detail: pdfError.message,
            hint: 'The PDF may be corrupted, encrypted, or scanned as images.'
          })
        }
      }

      // Plain text files
      else if (ext === 'txt' || ext === 'md') {
        extractedText = file.buffer.toString('utf-8').trim()
      }

      // Unsupported file type
      else {
        return res.status(400).json({
          error: `Unsupported file type: .${ext}`,
          detail: 'Only PDF and TXT files are currently supported.'
        })
      }

      // Validate extracted text
      if (!extractedText || extractedText.length < 50) {
        return res.status(400).json({
          error: 'Insufficient content',
          detail: 'File must contain at least 50 characters of text.'
        })
      }

      // Return extracted text
      res.json({
        success: true,
        filename: file.originalname,
        textLength: extractedText.length,
        preview: extractedText.slice(0, 200) + '...',
        extractedText
      })
      return;

    } catch (err: any) {
      console.error('[documents/extract-text] Error:', err)
      res.status(500).json({
        error: 'File processing failed',
        detail: err.message
      })
      return;
    }
  }
)

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
