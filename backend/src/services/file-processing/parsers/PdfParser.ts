const pdfParse = require('pdf-parse')
import { promises as fs } from 'fs'

export interface ParsedContent {
  text: string
  metadata?: {
    pages?: number
    title?: string
    author?: string
  }
}

export class PdfParser {
  async parse(buffer: Buffer): Promise<string> {
    const data = await pdfParse(buffer, { max: 100 })
    const text = data.text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '').trim()
    if (text.length < 50) throw new Error('Insufficient text')
    return text
  }

  async parseWithMetadata(buffer: Buffer): Promise<ParsedContent> {
    const data = await pdfParse(buffer, { max: 100 })
    const text = data.text.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '').trim()
    return {
      text,
      metadata: {
        pages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author
      }
    }
  }

  async validate(filePath: string): Promise<boolean> {
    try {
      const buffer = await fs.readFile(filePath)
      const signature = buffer.slice(0, 5).toString('ascii')
      if (!signature.startsWith('%PDF-')) return false
      await pdfParse(buffer, { max: 1 })
      return true
    } catch {
      return false
    }
  }

  async getMetadata(buffer: Buffer) {
    const data = await pdfParse(buffer, { max: 0 })
    return {
      pages: data.numpages,
      title: data.info?.Title,
      author: data.info?.Author
    }
  }
}
