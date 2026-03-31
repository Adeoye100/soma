import * as fs from 'fs';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';
import { config } from '@/config';

export interface ParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: {
    fileName: string;
    parsedAt: string;
    format: string;
    language?: string;
  };
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
};

const FORMAT_MAP: Record<string, string> = {
  '.jpg': 'JPEG',
  '.jpeg': 'JPEG',
  '.png': 'PNG',
  '.gif': 'GIF',
  '.webp': 'WEBP',
  '.bmp': 'BMP',
};

export class ImageParser {
  private sanitizer: TextSanitizer;
  private apiKeys: string[];
  private model: string;
  private currentKeyIndex = 0;

  constructor() {
    this.sanitizer = new TextSanitizer();
    this.apiKeys = config.openRouterApiKeys;
    this.model = config.openRouterModel;
  }

  async parse(
    filePath: string,
    options: { language?: string; enhance?: boolean } = {}
  ): Promise<ParsedContent> {
    try {
      const fileName = path.basename(filePath);
      const imageData = fs.readFileSync(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_MAP[ext] || 'image/jpeg';

      const text = await this.extractTextViaVision(
        imageData,
        mimeType,
        options.language
      );

      return this.buildResult(text, fileName, ext);
    } catch (error) {
      throw new Error(
        `ImageParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async parseBuffer(
    buffer: Buffer,
    fileName: string,
    options: { language?: string; enhance?: boolean } = {}
  ): Promise<ParsedContent> {
    try {
      const ext = path.extname(fileName).toLowerCase();
      const mimeType = MIME_MAP[ext] || 'image/jpeg';

      const text = await this.extractTextViaVision(
        buffer,
        mimeType,
        options.language
      );

      return this.buildResult(text, fileName, ext);
    } catch (error) {
      throw new Error(
        `ImageParser failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private async extractTextViaVision(
    imageBuffer: Buffer,
    mimeType: string,
    language?: string
  ): Promise<string> {
    if (!this.apiKeys.length) {
      throw new Error(
        'No OpenRouter API keys configured. Set OPENROUTER_API_KEYS in .env'
      );
    }

    const base64 = imageBuffer.toString('base64');
    const langHint = language ? ` Respond in ${language}.` : '';

    const prompt =
      `Extract and transcribe ALL text content from this image. ` +
      `Return only the extracted text, preserving line breaks where ` +
      `appropriate. If no text is present, describe the visual content ` +
      `that could be used as exam material.${langHint}`;

    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: {
              url: `data:${mimeType};base64,${base64}`,
            },
          },
          {
            type: 'text',
            text: prompt,
          },
        ],
      },
    ];

    const data = await this.callOpenRouter(messages);

    const content =
      data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from vision model');
    }

    return content;
  }

  private async callOpenRouter(messages: any[]): Promise<any> {
    const maxRetries = Math.max(this.apiKeys.length, 3);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const apiKey = this.apiKeys[this.currentKeyIndex % this.apiKeys.length];

      try {
        const response = await fetch(
          'https://openrouter.ai/api/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'HTTP-Referer': 'https://smart-examination.app',
              'X-Title': 'Smart Examination App',
            },
            body: JSON.stringify({
              model: this.model,
              messages,
              temperature: 0.1,
              max_tokens: 4096,
            }),
          }
        );

        if (response.ok) {
          return await response.json();
        }

        const errorText = await response.text();

        if (response.status === 429 || response.status >= 500) {
          lastError = new Error(
            `OpenRouter ${response.status}: ${errorText}`
          );
          this.currentKeyIndex =
            (this.currentKeyIndex + 1) % this.apiKeys.length;
          await new Promise((r) =>
            setTimeout(r, Math.pow(2, attempt) * 500)
          );
          continue;
        }

        throw new Error(`OpenRouter ${response.status}: ${errorText}`);
      } catch (error) {
        lastError = error as Error;
        this.currentKeyIndex =
          (this.currentKeyIndex + 1) % this.apiKeys.length;
      }
    }

    throw lastError || new Error('OpenRouter vision call failed after retries');
  }

  private buildResult(
    text: string,
    fileName: string,
    ext: string
  ): ParsedContent {
    const sanitized = this.sanitizer.sanitize(text);

    return {
      text: sanitized.text,
      sanitized,
      metadata: {
        fileName,
        parsedAt: new Date().toISOString(),
        format: FORMAT_MAP[ext] || 'UNKNOWN',
      },
    };
  }

  canParse(mimeType: string): boolean {
    return mimeType.startsWith('image/');
  }

  async validate(
    filePath: string
  ): Promise<{ valid: boolean; error?: ParserError }> {
    try {
      const buffer = fs.readFileSync(filePath);

      if (buffer.length < 12) {
        return {
          valid: false,
          error: {
            code: 'INVALID_IMAGE_SIZE',
            message: 'File is too small to be a valid image',
            details: { size: buffer.length },
          },
        };
      }

      const ext = path.extname(filePath).toLowerCase();
      if (!MIME_MAP[ext]) {
        return {
          valid: false,
          error: {
            code: 'INVALID_IMAGE_FORMAT',
            message: `Unsupported image format: ${ext}`,
            details: { detected: ext },
          },
        };
      }

      const format = this.detectFormatFromHeader(buffer);
      if (format === 'unknown') {
        return {
          valid: false,
          error: {
            code: 'INVALID_IMAGE_HEADER',
            message: 'File does not have a valid image header',
          },
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: {
          code: 'IMAGE_VALIDATION_ERROR',
          message:
            error instanceof Error
              ? error.message
              : 'Failed to validate image',
          details: { filePath },
        },
      };
    }
  }

  private detectFormatFromHeader(buffer: Buffer): string {
    if (buffer.length < 4) return 'unknown';
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47)
      return 'PNG';
    if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'JPEG';
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'GIF';
    if (buffer[0] === 0x42 && buffer[1] === 0x4d) return 'BMP';
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46
    )
      return 'WEBP';
    return 'unknown';
  }
}

export default ImageParser;
