import * as path from 'path';
import { PdfParser, ParsedContent as PdfParsedContent } from './parsers/PdfParser';
import { DocxParser, ParsedContent as DocxParsedContent } from './parsers/DocxParser';
import { PptxParser, ParsedContent as PptxParsedContent } from './parsers/PptxParser';
import { XlsxParser, ParsedContent as XlsxParsedContent } from './parsers/XlsxParser';
import { TextParser, ParsedContent as TextParsedContent } from './parsers/TextParser';
import { ImageParser, ParsedContent as ImageParsedContent } from './parsers/ImageParser';
import { TextSanitizer, SanitizedResult } from './TextSanitizer';

export interface ParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: Record<string, unknown>;
}

export interface ParserError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface FileTypeRouterConfig {
  defaultLanguage?: string;
  enableOcrEnhancement?: boolean;
  maxParsingTime?: number;
}

interface UnifiedParsedContent {
  text: string;
  sanitized: SanitizedResult;
  metadata: {
    fileName: string;
    fileType: string;
    parsedAt: string;
    [key: string]: unknown;
  };
}

type SupportedFileType = "text" | "pdf" | "docx" | "pptx" | "xlsx" | "image";

function isSupportedFileType(value: string): value is SupportedFileType {
  return ["text", "pdf", "docx", "pptx", "xlsx", "image"].includes(value);
}

export class FileTypeRouter {
  private pdfParser: PdfParser;
  private docxParser: DocxParser;
  private pptxParser: PptxParser;
  private xlsxParser: XlsxParser;
  private textParser: TextParser;
  private imageParser: ImageParser;
  private sanitizer: TextSanitizer;
  private config: FileTypeRouterConfig;

  private readonly fileTypeMap: Map<string, SupportedFileType> = new Map([
    ['.pdf', 'pdf'],
    ['.docx', 'docx'],
    ['.pptx', 'pptx'],
    ['.xlsx', 'xlsx'],
    ['.xls', 'xlsx'],
    ['.txt', 'text'],
    ['.csv', 'text'],
    ['.png', 'image'],
    ['.jpg', 'image'],
    ['.jpeg', 'image']
  ]);

  constructor(config: FileTypeRouterConfig = {}) {
    this.pdfParser = new PdfParser();
    this.docxParser = new DocxParser();
    this.pptxParser = new PptxParser();
    this.xlsxParser = new XlsxParser();
    this.textParser = new TextParser();
    this.imageParser = new ImageParser();
    this.sanitizer = new TextSanitizer();
    this.config = {
      defaultLanguage: config.defaultLanguage || 'eng',
      enableOcrEnhancement: config.enableOcrEnhancement ?? true,
      maxParsingTime: config.maxParsingTime || 120000
    };
  }

  async parse(filePath: string, fileType?: string): Promise<UnifiedParsedContent> {
    const extension = path.extname(filePath).toLowerCase();
    const detectedType = fileType || this.fileTypeMap.get(extension);

    if (!detectedType) {
      throw new Error(`Unsupported file type: ${extension}`);
    }

    if (!isSupportedFileType(detectedType)) {
      throw new Error(
        `FileTypeRouter: unsupported file type detected — "${detectedType}". ` +
        `Accepted types: text, pdf, docx, pptx, xlsx, image`
      );
    }

    const timeout = this.config.maxParsingTime;
    const parsePromise = this.performParse(filePath, detectedType);

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Parsing timed out after ${timeout}ms for file type: ${detectedType}`));
      }, timeout);
    });

    return Promise.race([parsePromise, timeoutPromise]);
  }

  private async performParse(filePath: string, fileType: SupportedFileType): Promise<UnifiedParsedContent> {
    try {
      switch (fileType) {
        case 'pdf': {
          const result: PdfParsedContent = await this.pdfParser.parse(filePath);
          return this.normalizeResult(result, filePath, 'pdf');
        }

        case 'docx': {
          const result: DocxParsedContent = await this.docxParser.parse(filePath);
          return this.normalizeResult(result, filePath, 'docx');
        }

        case 'pptx': {
          const result: PptxParsedContent = await this.pptxParser.parse(filePath);
          return this.normalizeResult(result, filePath, 'pptx');
        }

        case 'xlsx': {
          const result: XlsxParsedContent = await this.xlsxParser.parse(filePath);
          return this.normalizeResult(result, filePath, 'xlsx');
        }

        case 'text': {
          const result: TextParsedContent = await this.textParser.parse(filePath);
          return this.normalizeResult(result, filePath, 'text');
        }

        case 'image': {
          const result: ImageParsedContent = await this.imageParser.parse(filePath, {
            language: this.config.defaultLanguage,
            enhance: this.config.enableOcrEnhancement
          });
          return this.normalizeResult(result, filePath, 'image');
        }

        default:
          throw new Error(`No parser available for file type: ${fileType}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse ${fileType} file: ${error.message}`);
      }
      throw new Error(`Failed to parse ${fileType} file: Unknown error`);
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string, fileType?: string): Promise<UnifiedParsedContent> {
    const extension = path.extname(fileName).toLowerCase();
    const detectedType = fileType || this.fileTypeMap.get(extension);

    if (!detectedType) {
      throw new Error(`Unsupported file type: ${extension}`);
    }

    if (!isSupportedFileType(detectedType)) {
      throw new Error(
        `FileTypeRouter: unsupported file type detected — "${detectedType}". ` +
        `Accepted types: text, pdf, docx, pptx, xlsx, image`
      );
    }

    try {
      switch (detectedType) {
        case 'pdf': {
          const result: PdfParsedContent = await this.pdfParser.parseBuffer(buffer, fileName);
          return this.normalizeResult(result, fileName, 'pdf');
        }

        case 'docx': {
          const result: DocxParsedContent = await this.docxParser.parseBuffer(buffer, fileName);
          return this.normalizeResult(result, fileName, 'docx');
        }

        case 'pptx': {
          const result: PptxParsedContent = await this.pptxParser.parseBuffer(buffer, fileName);
          return this.normalizeResult(result, fileName, 'pptx');
        }

        case 'xlsx': {
          const result: XlsxParsedContent = await this.xlsxParser.parseBuffer(buffer, fileName);
          return this.normalizeResult(result, fileName, 'xlsx');
        }

        case 'text': {
          const result: TextParsedContent = await this.textParser.parseBuffer(buffer, fileName);
          return this.normalizeResult(result, fileName, 'text');
        }

        case 'image': {
          const result: ImageParsedContent = await this.imageParser.parseBuffer(buffer, fileName, {
            language: this.config.defaultLanguage,
            enhance: this.config.enableOcrEnhancement
          });
          return this.normalizeResult(result, fileName, 'image');
        }

        default:
          throw new Error(`No parser available for file type: ${detectedType}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse ${detectedType} file: ${error.message}`);
      }
      throw new Error(`Failed to parse ${detectedType} file: Unknown error`);
    }
  }

  async validate(filePath: string): Promise<{ valid: boolean; error?: ParserError }> {
    const extension = path.extname(filePath).toLowerCase();
    const fileType = this.fileTypeMap.get(extension);

    if (!fileType) {
      return {
        valid: false,
        error: {
          code: 'UNSUPPORTED_FILE_TYPE',
          message: `File type ${extension} is not supported`
        }
      };
    }

    switch (fileType) {
      case 'pdf':
        return this.pdfParser.validate(filePath);
      case 'docx':
        return this.docxParser.validate(filePath);
      case 'pptx':
        return this.pptxParser.validate(filePath);
      case 'xlsx':
        return this.xlsxParser.validate(filePath);
      case 'text':
        return this.textParser.validate(filePath);
      case 'image':
        return this.imageParser.validate(filePath);
      default:
        return {
          valid: false,
          error: {
            code: 'UNKNOWN_FILE_TYPE',
            message: `Unable to validate file type: ${fileType}`
          }
        };
    }
  }

  private normalizeResult(result: any, filePath: string, fileType: SupportedFileType): UnifiedParsedContent {
    return {
      text: result.text,
      sanitized: result.sanitized,
      metadata: {
        ...result.metadata,
        fileName: path.basename(filePath),
        fileType,
        parsedAt: new Date().toISOString()
      }
    };
  }

  isSupported(extension: string): boolean {
    return this.fileTypeMap.has(extension.toLowerCase());
  }

  getSupportedTypes(): string[] {
    return Array.from(new Set(this.fileTypeMap.values()));
  }

  getSupportedExtensions(): string[] {
    return Array.from(this.fileTypeMap.keys());
  }
}

export default FileTypeRouter;
