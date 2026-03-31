import * as fs from 'fs/promises';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';
import { ILovePDFService } from '../../ilovepdf';

export interface ParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: {
    fileName: string;
    parsedAt: string;
    slides: number;
    totalTextElements: number;
    slideContents: Array<{
      slideNumber: number;
      title?: string;
      content: string;
      notes?: string;
    }>;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class PptxParser {
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
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
      return this.buildResult(text, fileName);
    } catch (error) {
      throw new Error(
        `PptxParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      const text = await ILovePDFService.extractTextFromBuffer(
        buffer,
        fileName,
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      );
      return this.buildResult(text, fileName);
    } catch (error) {
      throw new Error(
        `PptxParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildResult(text: string, fileName: string): ParsedContent {
    const sanitized = this.sanitizer.sanitize(text);
    const slideBlocks = sanitized.text.split(/\n\n+/).filter(s => s.trim().length > 0);

    const slideContents = slideBlocks.map((content, index) => ({
      slideNumber: index + 1,
      content: content.trim()
    }));

    return {
      text: sanitized.text,
      sanitized,
      metadata: {
        fileName,
        parsedAt: new Date().toISOString(),
        slides: slideContents.length,
        totalTextElements: slideContents.length,
        slideContents
      }
    };
  }

  canParse(mimeType: string): boolean {
    return [
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-powerpoint'
    ].includes(mimeType);
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = await fs.readFile(filePath);

      if (buffer.length < 4) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PPTX_SIZE',
            message: 'File is too small to be a valid PPTX',
            details: { size: buffer.length }
          }
        };
      }

      const zipHeader = buffer.slice(0, 4);
      const isZip =
        zipHeader[0] === 0x50 &&
        zipHeader[1] === 0x4b &&
        (zipHeader[2] === 0x03 || zipHeader[2] === 0x05 || zipHeader[2] === 0x07);

      if (!isZip) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PPTX_FORMAT',
            message: 'File is not a valid ZIP archive (PPTX files are ZIP archives)',
            details: { header: zipHeader.toString('hex') }
          }
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'PPTX_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate PPTX',
          details: { filePath }
        }
      };
    }
  }
}

export default PptxParser;
