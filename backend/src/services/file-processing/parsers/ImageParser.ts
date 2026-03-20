import * as fs from 'fs/promises';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';

export interface ParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: {
    fileName: string;
    parsedAt: string;
    format: string;
    width: number;
    height: number;
    ocrConfidence: number;
    language?: string;
    orientation?: string;
    textBlocks: Array<{
      text: string;
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export class ImageParser {
  private sanitizer: TextSanitizer;
  private tesseract: any;
  private sharp: any;

  constructor() {
    this.sanitizer = new TextSanitizer();
    this.tesseract = require('tesseract.js');
    this.sharp = require('sharp');
  }

  async parse(filePath: string, options: { language?: string; enhance?: boolean } = {}): Promise<ParsedContent> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return await this.parseBuffer(fileBuffer, path.basename(filePath), options);
    } catch (error) {
      throw new Error(`Failed to parse image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string, options: { language?: string; enhance?: boolean } = {}): Promise<ParsedContent> {
    try {
      const format = await this.detectImageFormat(buffer);
      const dimensions = await this.getImageDimensions(buffer);
      
      let processedBuffer = buffer;
      if (options.enhance !== false) {
        processedBuffer = await this.enhanceImage(buffer);
      }

      const { text, confidence, blocks, orientation } = await this.runOcr(processedBuffer, options.language);
      const sanitized = this.sanitizer.sanitize(text);

      return {
        text: sanitized.text,
        sanitized,
        metadata: {
          fileName,
          parsedAt: new Date().toISOString(),
          format,
          width: dimensions.width,
          height: dimensions.height,
          ocrConfidence: confidence,
          language: options.language || 'eng',
          orientation: orientation || 'UNKNOWN',
          textBlocks: blocks
        }
      };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('Tesseract') || error.message.includes('OCR')) {
          throw new Error(`OCR processing failed: ${error.message}`);
        }
        throw new Error(`Image parsing failed: ${error.message}`);
      }
      throw new Error('Image parsing failed: Unknown error');
    }
  }

  private async detectImageFormat(buffer: Buffer): Promise<string> {
    if (buffer.length < 4) {
      return 'unknown';
    }

    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
      return 'PNG';
    }
    if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
      return 'JPEG';
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return 'GIF';
    }
    if (buffer[0] === 0x42 && buffer[1] === 0x4D) {
      return 'BMP';
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      return 'WEBP';
    }

    return 'unknown';
  }

  private async getImageDimensions(buffer: Buffer): Promise<{ width: number; height: number }> {
    try {
      const metadata = await this.sharp(buffer).metadata();
      return {
        width: metadata.width || 0,
        height: metadata.height || 0
      };
    } catch {
      return { width: 0, height: 0 };
    }
  }

  private async enhanceImage(buffer: Buffer): Promise<Buffer> {
    try {
      return await this.sharp(buffer)
        .greyscale()
        .normalize()
        .sharpen()
        .toBuffer();
    } catch {
      return buffer;
    }
  }

  private async runOcr(buffer: Buffer, language?: string): Promise<{
    text: string;
    confidence: number;
    blocks: Array<{
      text: string;
      confidence: number;
      boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    orientation?: string;
  }> {
    const worker = await this.tesseract.createWorker(language || 'eng');

    try {
      const result = await worker.recognize(buffer);
      
      const blocks = (result.data.blocks || []).map((block: any) => ({
        text: block.text || '',
        confidence: block.confidence || 0,
        boundingBox: block.boundingBox ? {
          x: block.boundingBox.x0 || 0,
          y: block.boundingBox.y0 || 0,
          width: (block.boundingBox.x1 || 0) - (block.boundingBox.x0 || 0),
          height: (block.boundingBox.y1 || 0) - (block.boundingBox.y0 || 0)
        } : undefined
      }));

      const paragraphs = (result.data.paragraphs || []).map((para: any) => ({
        text: para.text || '',
        confidence: para.confidence || 0,
        boundingBox: para.boundingBox ? {
          x: para.boundingBox.x0 || 0,
          y: para.boundingBox.y0 || 0,
          width: (para.boundingBox.x1 || 0) - (para.boundingBox.x0 || 0),
          height: (para.boundingBox.y1 || 0) - (para.boundingBox.y0 || 0)
        } : undefined
      }));

      if (blocks.length === 0 && paragraphs.length > 0) {
        blocks.push(...paragraphs);
      }

      const lines = (result.data.lines || []).map((line: any) => ({
        text: line.text || '',
        confidence: line.confidence || 0,
        boundingBox: line.boundingBox ? {
          x: line.boundingBox.x0 || 0,
          y: line.boundingBox.y0 || 0,
          width: (line.boundingBox.x1 || 0) - (line.boundingBox.x0 || 0),
          height: (line.boundingBox.y1 || 0) - (line.boundingBox.y0 || 0)
        } : undefined
      }));

      if (blocks.length === 0 && lines.length > 0) {
        blocks.push(...lines);
      }

      return {
        text: result.data.text || '',
        confidence: result.data.confidence || 0,
        blocks,
        orientation: result.data.orientation
      };
    } finally {
      await worker.terminate();
    }
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = await fs.readFile(filePath);
      
      if (buffer.length < 12) {
        return {
          valid: false,
          error: {
            code: 'INVALID_IMAGE_SIZE',
            message: 'File is too small to be a valid image',
            details: { size: buffer.length }
          }
        };
      }

      const format = await this.detectImageFormat(buffer);
      if (format === 'unknown') {
        return {
          valid: false,
          error: {
            code: 'INVALID_IMAGE_FORMAT',
            message: 'File does not have a valid image header',
            details: { detected: format }
          }
        };
      }

      try {
        await this.sharp(buffer).metadata();
      } catch {
        return {
          valid: false,
          error: {
            code: 'CORRUPTED_IMAGE',
            message: 'Image file appears to be corrupted'
          }
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'IMAGE_VALIDATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to validate image',
          details: { filePath }
        }
      };
    }
  }

  async preprocessForOcr(buffer: Buffer, options: {
    threshold?: number;
    deskew?: boolean;
    removeNoise?: boolean;
  } = {}): Promise<Buffer> {
    let processed = this.sharp(buffer);

    processed = processed.grayscale();

    if (options.threshold) {
      processed = processed.threshold(options.threshold);
    }

    if (options.deskew) {
      processed = processed.rotate();
    }

    if (options.removeNoise) {
      processed = processed.blur(0.5);
    }

    processed = processed.normalize();
    processed = processed.sharpen();

    return processed.toBuffer();
  }
}

export default ImageParser;
