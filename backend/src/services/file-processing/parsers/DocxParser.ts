import * as fs from 'fs/promises';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';
import { officeDocumentService } from '../../officeDocumentService';

export interface ParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: {
    fileName: string;
    parsedAt: string;
    pageCount?: number;
    wordCount?: number;
    pages?: Array<{
      pageNumber: number;
      text: string;
      confidence?: number;
    }>;
    extractionMethod: string;
    confidence?: number;
    processingDetails?: any;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class DocxParser {
  private sanitizer: TextSanitizer;

  constructor() {
    this.sanitizer = new TextSanitizer();
  }

  async parse(filePath: string): Promise<ParsedContent> {
    try {
      const fileName = path.basename(filePath);
      const buffer = await fs.readFile(filePath);
      
      console.log(`[DocxParser] Processing file: ${fileName}`);

      const conversionResult = await officeDocumentService.extractFromDocx(buffer, fileName);
      return this.buildResult(conversionResult, fileName);
    } catch (error) {
      console.error(`[DocxParser] Error processing ${filePath}:`, error);
      throw new Error(
        `DocxParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      console.log(`[DocxParser] Processing buffer for file: ${fileName}`);

      const conversionResult = await officeDocumentService.extractFromDocx(buffer, fileName);
      return this.buildResult(conversionResult, fileName);
    } catch (error) {
      console.error(`[DocxParser] Error processing buffer for ${fileName}:`, error);
      throw new Error(
        `DocxParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildResult(conversionResult: any, fileName: string): ParsedContent {
    const sanitized = this.sanitizer.sanitize(conversionResult.text);

    // Count words
    const wordCount = sanitized.text.split(/\s+/).filter(word => word.length > 0).length;

    // Map pages from conversion result
    const pages = conversionResult.metadata.pages || [];

    return {
      text: sanitized.text,
      sanitized,
      metadata: {
        fileName,
        parsedAt: new Date().toISOString(),
        pageCount: pages.length,
        wordCount,
        pages: pages.map((page: any) => ({
          pageNumber: page.pageNumber,
          text: page.text,
          confidence: page.confidence,
        })),
        extractionMethod: conversionResult.metadata.conversionMethod,
        confidence: conversionResult.confidence,
        processingDetails: conversionResult.metadata.processingDetails,
      }
    };
  }

  canParse(mimeType: string): boolean {
    return [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ].includes(mimeType);
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = await fs.readFile(filePath);

      if (buffer.length < 4) {
        return {
          valid: false,
          error: {
            code: 'INVALID_DOCX_SIZE',
            message: 'File is too small to be a valid DOCX',
            details: { size: buffer.length }
          }
        };
      }

      // Check for ZIP file signature (DOCX files are ZIP archives)
      const zipHeader = buffer.slice(0, 4);
      const isZip =
        zipHeader[0] === 0x50 &&
        zipHeader[1] === 0x4b &&
        (zipHeader[2] === 0x03 || zipHeader[2] === 0x05 || zipHeader[2] === 0x07);

      if (!isZip) {
        return {
          valid: false,
          error: {
            code: 'INVALID_DOCX_FORMAT',
            message: 'File is not a valid ZIP archive (DOCX files are ZIP archives)',
            details: { header: zipHeader.toString('hex') }
          }
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'DOCX_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate DOCX',
          details: { filePath }
        }
      };
    }
  }

  /**
   * Get supported DOCX formats
   */
  static getSupportedFormats(): string[] {
    return ['.docx', '.doc'];
  }
}

export default DocxParser;
