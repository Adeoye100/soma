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
    paragraphs: number;
    words: number;
    characters: number;
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
      const text = await ILovePDFService.extractText(
        filePath,
        fileName,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      return this.buildResult(text, fileName);
    } catch (error) {
      throw new Error(
        `DocxParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      const text = await ILovePDFService.extractTextFromBuffer(
        buffer,
        fileName,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      return this.buildResult(text, fileName);
    } catch (error) {
      throw new Error(
        `DocxParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildResult(text: string, fileName: string): ParsedContent {
    const sanitized = this.sanitizer.sanitize(text);
    const paragraphs = sanitized.text.split(/\n\n+/).filter(p => p.trim().length > 0);
    const words = sanitized.text.split(/\s+/).filter(w => w.length > 0);

    return {
      text: sanitized.text,
      sanitized,
      metadata: {
        fileName,
        parsedAt: new Date().toISOString(),
        paragraphs: paragraphs.length,
        words: words.length,
        characters: sanitized.text.length
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
}

export default DocxParser;
