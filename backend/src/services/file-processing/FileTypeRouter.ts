// src/services/file-processing/FileTypeRouter.ts

const pdfParse = require('pdf-parse')
import { promises as fs } from 'fs'
import * as path from 'path'
import { PdfParser, ParsedContent as PdfParsedContent } from './parsers/PdfParser'
import { TextSanitizer, SanitizedResult } from './TextSanitizer'

/**
 * Configuration for FileTypeRouter
 */
export interface FileTypeRouterConfig {
  defaultLanguage?: string
  enableOcrEnhancement?: boolean
  maxParsingTime?: number
}

/**
 * Parsed file structure
 */
export interface ParsedFile {
  text: string
  sanitized: SanitizedResult
  metadata: {
    fileType: string
    pages?: number
    title?: string
    author?: string
    [key: string]: any
  }
}

/**
 * Custom error class for parsing errors
 */
export class ParserError extends Error {
  constructor(
      public code: string,
      public details?: Record<string, any>
  ) {
    super(`[${code}] ${details?.message || 'Unknown error'}`)
    this.name = 'ParserError'
    Object.setPrototypeOf(this, ParserError.prototype)
  }
}

/**
 * Routes files to appropriate parsers based on type
 */
export class FileTypeRouter {
  private config: FileTypeRouterConfig
  private pdfParser: PdfParser
  private sanitizer: TextSanitizer
  private supportedExtensions: Map<string, string> = new Map([
    ['.pdf', 'application/pdf'],
    ['.doc', 'application/msword'],
    ['.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['.txt', 'text/plain'],
    ['.md', 'text/markdown'],
    ['.jpg', 'image/jpeg'],
    ['.jpeg', 'image/jpeg'],
    ['.png', 'image/png'],
    ['.gif', 'image/gif'],
    ['.webp', 'image/webp']
  ])

  /**
   * Initialize FileTypeRouter with configuration
   */
  constructor(config: FileTypeRouterConfig = {}) {
    this.config = {
      defaultLanguage: config.defaultLanguage || 'eng',
      enableOcrEnhancement: config.enableOcrEnhancement ?? true,
      maxParsingTime: config.maxParsingTime || 120000
    }

    this.pdfParser = new PdfParser()
    this.sanitizer = new TextSanitizer()
  }

  /**
   * Parse file from buffer
   */
  async parseBuffer(fileBuffer: Buffer, originalName: string): Promise<ParsedFile> {
    const extension = path.extname(originalName).toLowerCase()
    const startTime = Date.now()

    try {
      // Check if supported
      if (!this.supportedExtensions.has(extension)) {
        throw new ParserError('UNSUPPORTED_FILE_TYPE', {
          extension,
          supported: Array.from(this.supportedExtensions.keys())
        })
      }

      // Check timeout
      const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
              () => reject(new ParserError('PARSING_TIMEOUT', { maxTime: this.config.maxParsingTime })),
              this.config.maxParsingTime
          )
      )

      let parsedResult: { text: string; metadata: Record<string, any> }

      if (extension === '.pdf') {
        parsedResult = await Promise.race([
          this.parsePdf(fileBuffer),
          timeoutPromise as Promise<any>
        ])
      } else if (['.txt', '.md'].includes(extension)) {
        parsedResult = await Promise.race([
          this.parseText(fileBuffer),
          timeoutPromise as Promise<any>
        ])
      } else {
        throw new ParserError('UNSUPPORTED_FILE_TYPE', { extension })
      }

      // Sanitize content
      const sanitized = this.sanitizer.sanitize(parsedResult.text)

      const elapsedTime = Date.now() - startTime

      return {
        text: sanitized.text,
        sanitized,
        metadata: {
          fileType: extension,
          parsingTime: elapsedTime,
          ...parsedResult.metadata
        }
      }
    } catch (error) {
      if (error instanceof ParserError) {
        throw error
      }

      throw new ParserError('PARSING_ERROR', {
        originalName,
        extension,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Parse file from file path
   */
  async parse(filePath: string): Promise<ParsedFile> {
    try {
      // Validate file exists
      const stats = await fs.stat(filePath)
      if (!stats.isFile()) {
        throw new ParserError('NOT_A_FILE', { filePath })
      }

      // Read file buffer
      const fileBuffer = await fs.readFile(filePath)
      const originalName = path.basename(filePath)

      // Parse using parseBuffer
      return await this.parseBuffer(fileBuffer, originalName)
    } catch (error) {
      if (error instanceof ParserError) {
        throw error
      }

      throw new ParserError('FILE_READ_ERROR', {
        filePath,
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Parse PDF file
   */
  private async parsePdf(buffer: Buffer): Promise<{ text: string; metadata: Record<string, any> }> {
    try {
      const data = await pdfParse(buffer, { max: 100 })

      const text = data.text
          .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '')
          .replace(/\s+/g, ' ')
          .trim()

      if (text.length < 10) {
        throw new ParserError('INSUFFICIENT_CONTENT', {
          textLength: text.length,
          minimum: 10
        })
      }

      return {
        text,
        metadata: {
          pages: data.numpages,
          title: data.info?.Title || 'Unknown',
          author: data.info?.Author || 'Unknown',
          subject: data.info?.Subject,
          keywords: data.info?.Keywords,
          creator: data.info?.Creator,
          producer: data.info?.Producer
        }
      }
    } catch (error) {
      if (error instanceof ParserError) {
        throw error
      }

      throw new ParserError('PDF_PARSING_ERROR', {
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Parse text file (TXT, MD, etc)
   */
  private async parseText(buffer: Buffer): Promise<{ text: string; metadata: Record<string, any> }> {
    try {
      const text = buffer.toString('utf-8').trim()

      if (text.length < 10) {
        throw new ParserError('INSUFFICIENT_CONTENT', {
          textLength: text.length,
          minimum: 10
        })
      }

      return {
        text,
        metadata: {
          encoding: 'utf-8',
          byteLength: buffer.length,
          charLength: text.length
        }
      }
    } catch (error) {
      if (error instanceof ParserError) {
        throw error
      }

      throw new ParserError('TEXT_PARSING_ERROR', {
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  /**
   * Get supported MIME types
   */
  getSupportedTypes(): string[] {
    return Array.from(this.supportedExtensions.values())
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.supportedExtensions.keys())
  }

  /**
   * Check if file extension is supported
   */
  isSupported(extension: string): boolean {
    const normalized = extension.startsWith('.') ? extension : `.${extension}`
    return this.supportedExtensions.has(normalized.toLowerCase())
  }

  /**
   * Add custom file type support
   */
  addSupportedType(extension: string, mimeType: string): void {
    const normalized = extension.startsWith('.') ? extension : `.${extension}`
    this.supportedExtensions.set(normalized.toLowerCase(), mimeType)
  }

  /**
   * Remove file type support
   */
  removeSupportedType(extension: string): void {
    const normalized = extension.startsWith('.') ? extension : `.${extension}`
    this.supportedExtensions.delete(normalized.toLowerCase())
  }
}

export default FileTypeRouter