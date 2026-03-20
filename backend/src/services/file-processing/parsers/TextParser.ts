import * as fs from 'fs/promises';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';

export interface ParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: {
    fileName: string;
    parsedAt: string;
    encoding: string;
    confidence: number;
    lines: number;
    words: number;
    characters: number;
    containsBom: boolean;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class TextParser {
  private sanitizer: TextSanitizer;
  private chardet: any;

  constructor() {
    this.sanitizer = new TextSanitizer();
    this.chardet = require('chardet');
  }

  async parse(filePath: string): Promise<ParsedContent> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return await this.parseBuffer(fileBuffer, path.basename(filePath));
    } catch (error) {
      throw new Error(`Failed to parse text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      const { encoding, confidence } = this.detectEncoding(buffer);
      const hasBom = this.hasBom(buffer, encoding);
      const text = this.decodeBuffer(buffer, encoding);
      const sanitized = this.sanitizer.sanitize(text);

      const lines = text.split(/\r?\n/).length;
      const words = sanitized.text.split(/\s+/).filter(w => w.length > 0).length;
      const characters = sanitized.text.length;

      return {
        text: sanitized.text,
        sanitized,
        metadata: {
          fileName,
          parsedAt: new Date().toISOString(),
          encoding,
          confidence,
          lines,
          words,
          characters,
          containsBom: hasBom
        }
      };
    } catch (error) {
      throw new Error(`Text parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private detectEncoding(buffer: Buffer): { encoding: string; confidence: number } {
    const sample = buffer.slice(0, Math.min(buffer.length, 10000));
    const result = this.chardet.detect(sample);

    if (!result) {
      return { encoding: 'utf-8', confidence: 0 };
    }

    const encoding = result.encoding || 'utf-8';
    const confidence = result.confidence || 0;

    const supportedEncodings = ['UTF-8', 'UTF-16', 'UTF-16LE', 'UTF-16BE', 'ISO-8859-1', 'WINDOWS-1252', 'ASCII'];
    if (!supportedEncodings.includes(encoding.toUpperCase())) {
      return { encoding: 'utf-8', confidence: 0 };
    }

    if (encoding.toUpperCase() === 'UTF-8' && confidence < 0.8) {
      if (this.isValidUtf8(buffer)) {
        return { encoding: 'UTF-8', confidence: 1.0 };
      }
    }

    return { encoding, confidence };
  }

  private isValidUtf8(buffer: Buffer): boolean {
    try {
      const text = buffer.toString('utf8');
      const reEncoded = Buffer.from(text, 'utf8');
      if (reEncoded.length !== buffer.length) {
        return false;
      }

      for (let i = 0; i < reEncoded.length; i++) {
        if (reEncoded[i] !== buffer[i]) {
          return false;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  private hasBom(buffer: Buffer, encoding: string): boolean {
    if (encoding.toUpperCase().includes('UTF-8') || encoding === 'UTF-8') {
      return buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF;
    }
    if (encoding.toUpperCase().includes('UTF-16LE')) {
      return buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE;
    }
    if (encoding.toUpperCase().includes('UTF-16BE')) {
      return buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF;
    }
    return false;
  }

  private decodeBuffer(buffer: Buffer, encoding: string): string {
    let bomOffset = 0;
    const normalizedEncoding = encoding.toUpperCase().replace('-', '').replace('_', '');

    if (normalizedEncoding === 'UTF8') {
      if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
        bomOffset = 3;
      }
      return buffer.slice(bomOffset).toString('utf8');
    }

    if (normalizedEncoding === 'UTF16LE') {
      if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
        bomOffset = 2;
      }
      return buffer.slice(bomOffset).toString('utf16le');
    }

    if (normalizedEncoding === 'UTF16BE') {
      if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
        bomOffset = 2;
      }
      const swapped = Buffer.alloc(buffer.length - bomOffset);
      for (let i = bomOffset; i < buffer.length - 1; i += 2) {
        swapped[i - bomOffset] = buffer[i + 1]!;
        swapped[i - bomOffset + 1] = buffer[i]!;
      }
      return swapped.toString('utf16le');
    }

    if (normalizedEncoding === 'ISO88591' || normalizedEncoding === 'WINDOWS1252') {
      return buffer.toString('latin1');
    }

    return buffer.toString('utf8');
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = await fs.readFile(filePath);
      const { encoding, confidence } = this.detectEncoding(buffer);

      if (confidence > 0 && confidence < 0.7) {
        return {
          valid: false,
          error: {
            code: 'LOW_ENCODING_CONFIDENCE',
            message: `Low confidence in detected encoding (${encoding}, ${(confidence * 100).toFixed(1)}%)`,
            details: { encoding, confidence }
          }
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'TEXT_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate text file',
          details: { filePath }
        }
      };
    }
  }

  estimateReadingTime(text: string): { minutes: number; seconds: number; words: number } {
    const words = text.split(/\s+/).filter(w => w.length > 0).length;
    const averageReadingSpeed = 200;
    const totalSeconds = Math.ceil((words / averageReadingSpeed) * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    return { minutes, seconds, words };
  }
}

export default TextParser;
