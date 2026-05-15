import Tesseract from 'tesseract.js';
import mammoth from 'mammoth';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '@/shared/utils/logger';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

export interface ExtractionResult {
  text: string;
  confidence: number;
  pages: number;
  method: string;
  processingTimeMs: number;
}

export class FreeOcrService {

  async extractTextFromImage(filePath: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      logger.info('[FreeOcrService] Starting image OCR', { filePath });
      const { data: { text, confidence } } = await Tesseract.recognize(filePath, 'eng');
      const processingTime = Date.now() - startTime;
      logger.info('[FreeOcrService] Image OCR complete', {
        confidence: (confidence * 100).toFixed(2) + '%',
        textLength: text.length,
        processingTimeMs: processingTime
      });
      return {
        text: text || '',
        confidence: confidence || 0.8,
        pages: 1,
        method: 'tesseract-ocr',
        processingTimeMs: processingTime
      };
    } catch (error) {
      logger.error('[FreeOcrService] Image OCR failed:', error);
      throw new Error(`Image extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extractTextFromPdf(filePath: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      logger.info('[FreeOcrService] Starting PDF extraction', { filePath });
      const pdfBuffer = await fs.readFile(filePath);
      const pdfData = await pdfParse(pdfBuffer);
      const extractedText: string = pdfData.text || '';
      const numPages: number = pdfData.numpages || 1;
      const confidence = extractedText.trim().length > 100 ? 0.95 : 0.60;
      const processingTime = Date.now() - startTime;
      logger.info('[FreeOcrService] PDF extraction complete', {
        pages: numPages,
        textLength: extractedText.length,
        wordCount: extractedText.split(/\s+/).filter((w: string) => w.length > 0).length,
        confidence: (confidence * 100).toFixed(2) + '%',
        processingTimeMs: processingTime
      });
      return {
        text: extractedText,
        confidence,
        pages: numPages,
        method: 'pdf-parse',
        processingTimeMs: processingTime
      };
    } catch (error) {
      logger.error('[FreeOcrService] PDF extraction failed:', error);
      throw new Error(`PDF extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extractTextFromWord(filePath: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      logger.info('[FreeOcrService] Starting Word document extraction', { filePath });
      const docxBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: docxBuffer });
      const extractedText = result.value || '';
      const processingTime = Date.now() - startTime;
      logger.info('[FreeOcrService] Word extraction complete', {
        textLength: extractedText.length,
        wordCount: extractedText.split(/\s+/).filter((w: string) => w.length > 0).length,
        processingTimeMs: processingTime
      });
      return {
        text: extractedText,
        confidence: 0.99,
        pages: 1,
        method: 'mammoth-docx',
        processingTimeMs: processingTime
      };
    } catch (error) {
      logger.error('[FreeOcrService] Word extraction failed:', error);
      throw new Error(`Word extraction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extractTextFromPlainText(filePath: string): Promise<ExtractionResult> {
    const startTime = Date.now();
    try {
      logger.info('[FreeOcrService] Reading plain text file', { filePath });
      const text = await fs.readFile(filePath, 'utf-8');
      const processingTime = Date.now() - startTime;
      logger.info('[FreeOcrService] Text file read complete', {
        textLength: text.length,
        processingTimeMs: processingTime
      });
      return {
        text,
        confidence: 1.0,
        pages: 1,
        method: 'plain-text',
        processingTimeMs: processingTime
      };
    } catch (error) {
      logger.error('[FreeOcrService] Text file read failed:', error);
      throw new Error(`Text file read failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async extractText(filePath: string, mimeType: string): Promise<ExtractionResult> {
    const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
    logger.info('[FreeOcrService] Routing extraction', { ext, mimeType });

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'tiff', 'tif'].includes(ext)) {
      return this.extractTextFromImage(filePath);
    }
    if (ext === 'pdf') {
      return this.extractTextFromPdf(filePath);
    }
    if (ext === 'docx' || ext === 'doc') {
      return this.extractTextFromWord(filePath);
    }
    if (ext === 'txt' || ext === 'md') {
      return this.extractTextFromPlainText(filePath);
    }
    throw new Error(`Unsupported file type: .${ext}`);
  }
}

export const freeOcrService = new FreeOcrService();
