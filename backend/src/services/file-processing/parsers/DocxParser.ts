import * as fs from 'fs/promises';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';

export interface ParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: {
    fileName: string;
    parsedAt: string;
    paragraphs: number;
    words: number;
    characters: number;
    styleAnalysis?: {
      headings: string[];
      lists: number;
    };
    relationships?: Array<{
      type: string;
      target: string;
    }>;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

interface MammothResult {
  messages: Array<{ type: string; message: string }>;
  value?: {
    paragraphs?: Array<{ text: string }>;
    body?: { text: string };
    text: string;
  };
}

export class DocxParser {
  private sanitizer: TextSanitizer;
  private mammoth: any;

  constructor() {
    this.sanitizer = new TextSanitizer();
    this.mammoth = require('mammoth');
  }

  async parse(filePath: string): Promise<ParsedContent> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return await this.parseBuffer(fileBuffer, path.basename(filePath));
    } catch (error) {
      throw new Error(`Failed to parse DOCX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      const result: MammothResult = await this.mammoth.extractRawText({ buffer });
      const messages = result.messages || [];

      if (messages.length > 0 && messages.some((m: any) => m.type === 'error')) {
        const errors = messages.filter((m: any) => m.type === 'error');
        if (errors.length > 0) {
          throw new Error(`DOCX extraction warnings: ${errors.map((e: any) => e.message).join(', ')}`);
        }
      }

      const rawText = result.value?.text || '';
      const sanitized = this.sanitizer.sanitize(rawText);

      const paragraphs = rawText.split(/\n\n+/).filter(p => p.trim().length > 0);
      const words = sanitized.text.split(/\s+/).filter(w => w.length > 0);
      const characters = sanitized.text.length;

      const styleAnalysis = await this.extractStyleAnalysis(buffer);

      return {
        text: sanitized.text,
        sanitized,
        metadata: {
          fileName,
          parsedAt: new Date().toISOString(),
          paragraphs: paragraphs.length,
          words: words.length,
          characters,
          styleAnalysis,
          relationships: []
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Invalid or corrupted')) {
          throw new Error(`DOCX parsing failed: File is corrupted or not a valid DOCX. ${error.message}`);
        }
        throw new Error(`DOCX parsing failed: ${error.message}`);
      }
      throw new Error('DOCX parsing failed: Unknown error');
    }
  }

  private async extractStyleAnalysis(buffer: Buffer): Promise<{ headings: string[]; lists: number }> {
    try {
      const result = await this.mammoth.extractRawText({ buffer });
      const text = result.value?.text || '';
      
      const headingPattern = /^#{1,6}\s+.+$/gm;
      const headings: string[] = [];
      let match;
      while ((match = headingPattern.exec(text)) !== null) {
        headings.push(match[0]);
      }

      const listPattern = /^[\-\*]\s+.+$|^\d+\.\s+.+$/gm;
      let listCount = 0;
      while (listPattern.exec(text) !== null) {
        listCount++;
      }

      return { headings, lists: listCount };
    } catch {
      return { headings: [], lists: 0 };
    }
  }

  async extractHtml(filePath: string): Promise<string> {
    try {
      const buffer = await fs.readFile(filePath);
      const result = await this.mammoth.convertToHtml({ buffer });
      const sanitized = this.sanitizer.preserveStructure(result.value);
      return sanitized.text;
    } catch (error) {
      throw new Error(`Failed to extract HTML from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
      const isZip = zipHeader[0] === 0x50 && zipHeader[1] === 0x4B && (zipHeader[2] === 0x03 || zipHeader[2] === 0x05 || zipHeader[2] === 0x07);
      
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

      const result = await this.mammoth.extractRawText({ buffer });
      if (result.messages?.some((m: any) => m.type === 'error')) {
        return {
          valid: false,
          error: {
            code: 'DOCX_CONTENT_ERROR',
            message: 'DOCX contains errors',
            details: { messages: result.messages.filter((m: any) => m.type === 'error') }
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
