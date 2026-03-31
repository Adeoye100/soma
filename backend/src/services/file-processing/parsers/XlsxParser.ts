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
    sheets: number;
    words: number;
    characters: number;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class XlsxParser {
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
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return this.buildResult(text, fileName);
    } catch (error) {
      throw new Error(
        `XlsxParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      const text = await ILovePDFService.extractTextFromBuffer(
        buffer,
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      return this.buildResult(text, fileName);
    } catch (error) {
      throw new Error(
        `XlsxParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildResult(text: string, fileName: string): ParsedContent {
    const sanitized = this.sanitizer.sanitize(text);
    const words = sanitized.text.split(/\s+/).filter(w => w.length > 0);

    const sheetBlocks = sanitized.text.split(/\n\n+/).filter(s => s.trim().length > 0);

    return {
      text: sanitized.text,
      sanitized,
      metadata: {
        fileName,
        parsedAt: new Date().toISOString(),
        sheets: Math.max(1, sheetBlocks.length),
        words: words.length,
        characters: sanitized.text.length
      }
    };
  }

  canParse(mimeType: string): boolean {
    return [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ].includes(mimeType);
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = await fs.readFile(filePath);

      if (buffer.length < 4) {
        return {
          valid: false,
          error: {
            code: 'INVALID_XLSX_SIZE',
            message: 'File is too small to be a valid XLSX',
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
            code: 'INVALID_XLSX_FORMAT',
            message: 'File is not a valid ZIP archive (XLSX files are ZIP archives)',
            details: { header: zipHeader.toString('hex') }
          }
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'XLSX_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate XLSX',
          details: { filePath }
        }
      };
    }
  }
}

export default XlsxParser;
