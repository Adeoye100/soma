import * as fs from 'fs/promises';
import * as path from 'path';
import { TextSanitizer, SanitizedResult } from '../TextSanitizer';
import AdmZip from 'adm-zip';

type IZipEntry = ReturnType<InstanceType<typeof AdmZip>['getEntries']>[number];

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

interface SlideContent {
  slideNumber: number;
  title?: string;
  content: string;
  notes?: string;
}

interface TextExtractResult {
  title?: string;
  content: string;
  notes?: string;
  textElements: string[];
}

export class PptxParser {
  private sanitizer: TextSanitizer;
  private AdmZip: typeof AdmZip;

  constructor() {
    this.sanitizer = new TextSanitizer();
    this.AdmZip = AdmZip;
  }

  async parse(filePath: string): Promise<ParsedContent> {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return await this.parseBuffer(fileBuffer, path.basename(filePath));
    } catch (error) {
      throw new Error(`Failed to parse PPTX file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async parseBuffer(buffer: Buffer, fileName: string): Promise<ParsedContent> {
    try {
      const tempFile = `/tmp/pptx_parse_${Date.now()}.pptx`;

      await fs.writeFile(tempFile, buffer);

      const zip = new this.AdmZip(tempFile);
      const slideEntries = zip.getEntries().filter((entry) =>
        entry.entryName.match(/ppt\/slides\/slide\d+\.xml$/)
      );

      const slideContents: SlideContent[] = [];

      let totalTextElements = 0;

      for (const entry of slideEntries) {
        try {
          const slideXml = entry.getData().toString('utf8');
          const slideNumber = parseInt(entry.entryName.match(/slide(\d+)\.xml$/)?.[1] || '0', 10);

          const extractedContent = this.extractTextFromSlide(slideXml);
          totalTextElements += extractedContent.textElements.length;

          slideContents.push({
            slideNumber,
            title: extractedContent.title,
            content: extractedContent.content,
            notes: extractedContent.notes
          });
        } catch (slideError) {
          console.error(`Error processing slide: ${slideError}`);
        }
      }

      slideContents.sort((a, b) => a.slideNumber - b.slideNumber);

      const allText = slideContents.map((s: SlideContent) =>
        (s.title ? `## ${s.title}\n` : '') + s.content
      ).join('\n\n');

      const sanitized = this.sanitizer.sanitize(allText);

      await fs.unlink(tempFile);

      return {
        text: sanitized.text,
        sanitized,
        metadata: {
          fileName,
          parsedAt: new Date().toISOString(),
          slides: slideContents.length,
          totalTextElements,
          slideContents
        }
      };
    } catch (error) {
      throw error;
    }
  }

  private extractTextFromSlide(slideXml: string): TextExtractResult {
    const textElements: string[] = [];
    let title: string | undefined;
    let content = '';

    const textMatches = slideXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    for (const match of textMatches) {
      const textContent = match.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '');
      if (textContent.trim()) {
        textElements.push(textContent);
      }
    }

    const titlePattern = /<p:sp>[\s\S]*?<p:ph type="title"[\s\S]*?<\/p:sp>/g;
    const titleMatch = slideXml.match(titlePattern);
    if (titleMatch) {
      const titleTexts = titleMatch[0].match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
      title = titleTexts.map((t: string) => t.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, '')).join('').trim();
    }

    const nonTitleContent = slideXml.replace(/<p:sp>[\s\S]*?<p:ph type="title"[\s\S]*?<\/p:sp>/g, '');
    const contentTexts = nonTitleContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
    content = contentTexts
      .map((t: string) => t.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, ''))
      .filter((t: string) => t.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    return { title, content, textElements };
  }

  async extractNotes(filePath: string): Promise<Map<number, string>> {
    try {
      const tempFile = `/tmp/pptx_notes_${Date.now()}.pptx`;

      const fileBuffer = await fs.readFile(filePath);
      await fs.writeFile(tempFile, fileBuffer);

      const zip = new this.AdmZip(tempFile);
      const notesEntries = zip.getEntries().filter((entry) =>
        entry.entryName.match(/ppt\/notesSlides\/notesSlide\d+\.xml$/)
      );

      const notesMap = new Map<number, string>();

      for (const entry of notesEntries) {
        try {
          const notesXml = entry.getData().toString('utf8');
          const slideNumber = parseInt(entry.entryName.match(/notesSlide(\d+)\.xml$/)?.[1] || '0', 10);

          const textMatches = notesXml.match(/<a:t[^>]*>([^<]*)<\/a:t>/g) || [];
          const notesText = textMatches
            .map((t: string) => t.replace(/<a:t[^>]*>/, '').replace(/<\/a:t>/, ''))
            .filter((t: string) => t.trim())
            .join(' ')
            .trim();

          if (notesText) {
            notesMap.set(slideNumber, notesText);
          }
        } catch (error) {
          console.error(`Error processing notes slide: ${error}`);
        }
      }

      await fs.unlink(tempFile);

      return notesMap;
    } catch (error) {
      throw error;
    }
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
      const isZip = zipHeader[0] === 0x50 && zipHeader[1] === 0x4B && (zipHeader[2] === 0x03 || zipHeader[2] === 0x05 || zipHeader[2] === 0x07);

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

      const tempFile = `/tmp/pptx_validate_${Date.now()}.pptx`;
      await fs.writeFile(tempFile, buffer);

      const zip = new this.AdmZip(tempFile);
      const hasPresentation = zip.getEntry('ppt/presentation.xml') !== undefined;

      await fs.unlink(tempFile).catch(() => {});

      if (!hasPresentation) {
        return {
          valid: false,
          error: {
            code: 'INVALID_PPTX_STRUCTURE',
            message: 'PPTX does not contain required presentation.xml'
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
