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
    lines: number;
    words: number;
    characters: number;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class TextParser {
  private sanitizer: TextSanitizer;

  constructor() {
    this.sanitizer = new TextSanitizer();
  }

  async parse(filePath: string): Promise<ParsedContent> {
    try {
      const fileName = path.basename(filePath);
      const buffer = await fs.readFile(filePath);
      return this.buildResult(buffer, fileName);
    } catch (error) {
      throw new Error(
        `TextParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      return this.buildResult(buffer, fileName);
    } catch (error) {
      throw new Error(
        `TextParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private buildResult(buffer: Buffer, fileName: string): ParsedContent {
    const encoding = this.detectEncoding(buffer);
    const text = this.decodeBuffer(buffer, encoding);
    const sanitized = this.sanitizer.sanitize(text);

    const lines = text.split(/\r?\n/).length;
    const words = sanitized.text.split(/\s+/).filter(w => w.length > 0).length;

    return {
      text: sanitized.text,
      sanitized,
      metadata: {
        fileName,
        parsedAt: new Date().toISOString(),
        encoding,
        lines,
        words,
        characters: sanitized.text.length
      }
    };
  }

  private detectEncoding(buffer: Buffer): string {
    if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
      return 'utf-8';
    }
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return 'utf-16le';
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      return 'utf-16be';
    }

    try {
      const text = buffer.toString('utf8');
      const reEncoded = Buffer.from(text, 'utf8');
      if (reEncoded.length === buffer.length) {
        let matches = true;
        for (let i = 0; i < reEncoded.length; i++) {
          if (reEncoded[i] !== buffer[i]) {
            matches = false;
            break;
          }
        }
        if (matches) return 'utf-8';
      }
    } catch {
      // fall through
    }

    return 'utf-8';
  }

  private decodeBuffer(buffer: Buffer, encoding: string): string {
    const normalizedEncoding = encoding.toLowerCase().replace(/[-_]/g, '');

    if (normalizedEncoding === 'utf8') {
      let bomOffset = 0;
      if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        bomOffset = 3;
      }
      return buffer.slice(bomOffset).toString('utf8');
    }

    if (normalizedEncoding === 'utf16le') {
      let bomOffset = 0;
      if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
        bomOffset = 2;
      }
      return buffer.slice(bomOffset).toString('utf16le');
    }

    if (normalizedEncoding === 'utf16be') {
      let bomOffset = 0;
      if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
        bomOffset = 2;
      }
      const swapped = Buffer.alloc(buffer.length - bomOffset);
      for (let i = bomOffset; i < buffer.length - 1; i += 2) {
        swapped[i - bomOffset] = buffer[i + 1]!;
        swapped[i - bomOffset + 1] = buffer[i]!;
      }
      return swapped.toString('utf16le');
    }

    return buffer.toString('utf8');
  }

  canParse(mimeType: string): boolean {
    return mimeType === 'text/plain' || mimeType === 'text/csv';
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = await fs.readFile(filePath);

      if (buffer.length === 0) {
        return {
          valid: false,
          error: {
            code: 'EMPTY_FILE',
            message: 'Text file is empty',
            details: { filePath }
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
