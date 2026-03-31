import * as fs from 'fs/promises';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';
import { ILovePDFService } from '../../ilovepdf';

export interface ParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: {
    pageCount: number;
    fileName: string;
    parsedAt: string;
    version?: string;
    author?: string;
    title?: string;
    subject?: string;
    keywords?: string[];
    pages: Array<{
      pageNumber: number;
      text: string;
      length: number;
    }>;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class PdfParser {
  private sanitizer: TextSanitizer;

  constructor() {
    this.sanitizer = new TextSanitizer();
  }

  async parse(filePath: string): Promise<ParsedContent> {
    try {
      const fileName = path.basename(filePath);
      const text = await ILovePDFService.extractText(
        filePath,
        fileName,
        'application/pdf'
      );
      return this.buildResult(text, fileName);
    } catch (error) {
      throw new Error(
        `PdfParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      const text = await ILovePDFService.extractTextFromBuffer(
        buffer,
        fileName,
        'application/pdf'
      );
      return this.buildResult(text, fileName);
    } catch (error) {
      throw new Error(
        `PdfParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildResult(text: string, fileName: string): ParsedContent {
    const sanitized = this.sanitizer.sanitize(text);
    const pages = text.split('\n\n').map((pageText, index) => ({
      pageNumber: index + 1,
      text: pageText || '',
      length: (pageText || '').length
    }));

    return {
      text: sanitized.text,
      sanitized,
      metadata: {
        pageCount: pages.length,
        fileName,
        parsedAt: new Date().toISOString(),
        pages
      }
    };
  }

  canParse(mimeType: string): boolean {
    return mimeType === 'application/pdf';
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = await fs.readFile(filePath);

      if (buffer.length < 5) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PDF_SIZE',
            message: 'File is too small to be a valid PDF',
            details: { size: buffer.length }
          }
        };
      }

      const header = buffer.slice(0, 5).toString('utf-8');
      if (!header.startsWith('%PDF-')) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PDF_HEADER',
            message: 'File does not have a valid PDF header',
            details: { header }
          }
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'PDF_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate PDF',
          details: { filePath }
        }
      };
    }
  }
}

export default PdfParser;
