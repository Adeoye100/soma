import * as fs from 'fs/promises';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';

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

interface PdfPage {
  pageNumber: number;
  text: string;
  length: number;
}

interface PdfParseResult {
  numpages: number;
  pages: string[];
  pdfinfo?: {
    PDfVersion?: string;
    Version?: string;
    Author?: string;
    Title?: string;
    Subject?: string;
    Keywords?: string;
  };
}

export class PdfParser {
  private sanitizer: TextSanitizer;
  private pdfParse: (buffer: Buffer, options?: Record<string, unknown>) => Promise<PdfParseResult>;

  constructor() {
    this.sanitizer = new TextSanitizer();
    this.pdfParse = require('pdf-parse') as (buffer: Buffer, options?: Record<string, unknown>) => Promise<PdfParseResult>;
  }

  async parse(filePath: string): Promise<ParsedContent> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return await this.parseBuffer(fileBuffer, path.basename(filePath));
    } catch (error) {
      throw new Error(`Failed to parse PDF file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      const data = await this.pdfParse(buffer, {
        pagerender: (pageData: unknown) => {
          const pd = pageData as {
            getTextContent: () => Promise<{ items: Array<{ str: string }> }>;
          };
          return pd.getTextContent().then((textContent) => {
            return textContent.items.map((item) => item.str).join(' ');
          });
        }
      });

      const pages: PdfPage[] = data.pages.map((pageText: string, index: number) => ({
        pageNumber: index + 1,
        text: pageText || '',
        length: (pageText || '').length
      }));

      const fullText = pages.map((p: PdfPage) => p.text).join('\n\n');
      const sanitized = this.sanitizer.sanitize(fullText);

      return {
        text: sanitized.text,
        sanitized,
        metadata: {
          pageCount: data.numpages,
          fileName,
          parsedAt: new Date().toISOString(),
          version: data.pdfinfo?.PDfVersion || data.pdfinfo?.Version,
          author: data.pdfinfo?.Author,
          title: data.pdfinfo?.Title,
          subject: data.pdfinfo?.Subject,
          keywords: data.pdfinfo?.Keywords ? data.pdfinfo.Keywords.split(',').map((k: string) => k.trim()) : undefined,
          pages
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid PDF structure') || error.message.includes('Failed to parse')) {
          throw new Error(`PDF parsing failed: File may be corrupted or password-protected. ${error.message}`);
        }
        throw new Error(`PDF parsing failed: ${error.message}`);
      }
      throw new Error('PDF parsing failed: Unknown error');
    }
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = await fs.readFile(filePath);
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
