import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { promisify } from 'util';
import { googleVisionService } from './googleVisionService';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const mkdir = promisify(fs.mkdir);

export interface OfficeConversionResult {
  text: string;
  confidence: number;
  metadata: {
    originalFormat: string;
    conversionMethod: string;
    pages?: Array<{
      pageNumber: number;
      text: string;
      confidence: number;
    }>;
    slides?: Array<{
      slideNumber: number;
      text: string;
      confidence: number;
    }>;
    processingDetails: {
      tempFilesCreated: number;
      conversionTimeMs: number;
      totalImageCount: number;
    };
  };
}

export class OfficeDocumentService {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'temp', 'office-processing');
    this.ensureTempDirectory();
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      if (!fs.existsSync(this.tempDir)) {
        await mkdir(this.tempDir, { recursive: true });
      }
    } catch (error) {
      // Directory might already exist
      if (!fs.existsSync(this.tempDir)) {
        throw new Error(`Failed to create temp directory: ${this.tempDir}`);
      }
    }
  }

  /**
   * Extract text from PPTX files by converting slides to images
   */
  async extractFromPptx(buffer: Buffer, fileName: string): Promise<OfficeConversionResult> {
    const startTime = Date.now();
    console.log(`[OfficeDocument] Processing PPTX: ${fileName}`);

    try {
      // Method 1: Try LibreOffice conversion (if available)
      if (await this.isLibreOfficeAvailable()) {
        return await this.convertPptxWithLibreOffice(buffer, fileName);
      }

      // Method 2: Try Node.js PPTX parsing libraries
      return await this.parsePptxDirectly(buffer, fileName);

    } catch (error) {
      console.error(`[OfficeDocument] PPTX processing failed:`, error);
      throw new Error(`PPTX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      const processingTime = Date.now() - startTime;
      console.log(`[OfficeDocument] PPTX processing completed in ${processingTime}ms`);
    }
  }

  /**
   * Extract text from DOCX files
   */
  async extractFromDocx(buffer: Buffer, fileName: string): Promise<OfficeConversionResult> {
    const startTime = Date.now();
    console.log(`[OfficeDocument] Processing DOCX: ${fileName}`);

    try {
      // Method 1: Try LibreOffice conversion (if available)
      if (await this.isLibreOfficeAvailable()) {
        return await this.convertDocxWithLibreOffice(buffer, fileName);
      }

      // Method 2: Try Node.js DOCX parsing libraries
      return await this.parseDocxDirectly(buffer, fileName);

    } catch (error) {
      console.error(`[OfficeDocument] DOCX processing failed:`, error);
      throw new Error(`DOCX processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      const processingTime = Date.now() - startTime;
      console.log(`[OfficeDocument] DOCX processing completed in ${processingTime}ms`);
    }
  }

  /**
   * Convert PPTX to images using LibreOffice and then extract text with Google Vision
   */
  private async convertPptxWithLibreOffice(buffer: Buffer, fileName: string): Promise<OfficeConversionResult> {
    const timestamp = Date.now();
    const tempFilePath = path.join(this.tempDir, `${timestamp}_${fileName}`);
    const outputDir = path.join(this.tempDir, `output_${timestamp}`);

    try {
      // Write buffer to temporary file
      await writeFile(tempFilePath, buffer);
      if (!fs.existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // Convert PPTX to images using LibreOffice
      await this.executeLibreOfficeConversion(tempFilePath, outputDir, 'png');

      // Find generated image files
      const imageFiles = fs.readdirSync(outputDir)
        .filter(file => file.endsWith('.png'))
        .sort((a, b) => {
          // Sort by slide number
          const aNum = parseInt(a.match(/(\d+)/)?.[1] || '0');
          const bNum = parseInt(b.match(/(\d+)/)?.[1] || '0');
          return aNum - bNum;
        });

      if (imageFiles.length === 0) {
        throw new Error('No images generated from PPTX conversion');
      }

      // Extract text from each slide image using Google Vision
      const slides: Array<{ slideNumber: number; text: string; confidence: number }> = [];
      let totalConfidence = 0;

      for (let i = 0; i < imageFiles.length; i++) {
        const imagePath = path.join(outputDir, imageFiles[i]);
        const imageBuffer = fs.readFileSync(imagePath);

        console.log(`[OfficeDocument] Processing slide ${i + 1}/${imageFiles.length}`);

        try {
          const visionResult = await googleVisionService.extractTextFromBuffer(imageBuffer, 'image/png');
          slides.push({
            slideNumber: i + 1,
            text: visionResult.text,
            confidence: visionResult.confidence,
          });
          totalConfidence += visionResult.confidence;
        } catch (visionError) {
          console.warn(`[OfficeDocument] Failed to extract text from slide ${i + 1}:`, visionError);
          slides.push({
            slideNumber: i + 1,
            text: '',
            confidence: 0,
          });
        }
      }

      // Combine all slide text
      const combinedText = slides
        .map(slide => slide.text)
        .filter(text => text.trim())
        .join('\n\n---\n\n');

      const averageConfidence = slides.length > 0 ? totalConfidence / slides.length : 0;

      return {
        text: combinedText,
        confidence: averageConfidence,
        metadata: {
          originalFormat: 'pptx',
          conversionMethod: 'libreoffice + google-vision',
          slides,
          processingDetails: {
            tempFilesCreated: imageFiles.length + 1,
            conversionTimeMs: Date.now() - timestamp,
            totalImageCount: imageFiles.length,
          },
        },
      };

    } finally {
      // Cleanup temporary files
      await this.cleanupFiles([tempFilePath, outputDir]);
    }
  }

  /**
   * Convert DOCX to PDF/images using LibreOffice and then extract text with Google Vision
   */
  private async convertDocxWithLibreOffice(buffer: Buffer, fileName: string): Promise<OfficeConversionResult> {
    const timestamp = Date.now();
    const tempFilePath = path.join(this.tempDir, `${timestamp}_${fileName}`);
    const outputDir = path.join(this.tempDir, `output_${timestamp}`);

    try {
      // Write buffer to temporary file
      await writeFile(tempFilePath, buffer);
      if (!fs.existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // Convert DOCX to PDF first, then to images
      await this.executeLibreOfficeConversion(tempFilePath, outputDir, 'pdf');

      // Find generated PDF
      const pdfFiles = fs.readdirSync(outputDir).filter(file => file.endsWith('.pdf'));
      
      if (pdfFiles.length === 0) {
        throw new Error('No PDF generated from DOCX conversion');
      }

      const pdfPath = path.join(outputDir, pdfFiles[0]);
      const pdfBuffer = fs.readFileSync(pdfPath);

      // Extract text from PDF using Google Vision
      console.log('[OfficeDocument] Extracting text from converted PDF');
      const visionResult = await googleVisionService.extractTextFromPdfBuffer(pdfBuffer);

      return {
        text: visionResult.text,
        confidence: visionResult.confidence,
        metadata: {
          originalFormat: 'docx',
          conversionMethod: 'libreoffice + google-vision',
          pages: visionResult.metadata.pages,
          processingDetails: {
            tempFilesCreated: 2, // Original DOCX + PDF
            conversionTimeMs: Date.now() - timestamp,
            totalImageCount: visionResult.metadata.pages?.length || 1,
          },
        },
      };

    } finally {
      // Cleanup temporary files
      await this.cleanupFiles([tempFilePath, outputDir]);
    }
  }

  /**
   * Parse PPTX directly using Node.js libraries (fallback method)
   */
  private async parsePptxDirectly(buffer: Buffer, fileName: string): Promise<OfficeConversionResult> {
    try {
      // Install required: pnpm add officegen jszip xml2js
      const JSZip = require('jszip');
      const xml2js = require('xml2js');

      console.log('[OfficeDocument] Parsing PPTX directly with JSZip');

      const zip = await JSZip.loadAsync(buffer);
      const slides: Array<{ slideNumber: number; text: string; confidence: number }> = [];
      let slideNumber = 0;

      // Find slide files
      const slideFiles = Object.keys(zip.files).filter(name => 
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      ).sort();

      for (const slideFile of slideFiles) {
        slideNumber++;
        console.log(`[OfficeDocument] Processing slide ${slideNumber}: ${slideFile}`);

        try {
          const slideXml = await zip.files[slideFile].async('text');
          const parser = new xml2js.Parser();
          const result = await parser.parseStringPromise(slideXml);

          // Extract text content from XML structure
          const slideText = this.extractTextFromSlideXml(result);

          slides.push({
            slideNumber,
            text: slideText,
            confidence: 1.0, // Direct parsing has high confidence
          });
        } catch (slideError) {
          console.warn(`[OfficeDocument] Failed to parse slide ${slideNumber}:`, slideError);
          slides.push({
            slideNumber,
            text: '',
            confidence: 0,
          });
        }
      }

      // Combine all slide text
      const combinedText = slides
        .map(slide => slide.text)
        .filter(text => text.trim())
        .join('\n\n---\n\n');

      return {
        text: combinedText,
        confidence: 1.0,
        metadata: {
          originalFormat: 'pptx',
          conversionMethod: 'direct-parsing',
          slides,
          processingDetails: {
            tempFilesCreated: 0,
            conversionTimeMs: 0,
            totalImageCount: 0,
          },
        },
      };

    } catch (error) {
      throw new Error(`Direct PPTX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse DOCX directly using Node.js libraries (fallback method)
   */
  private async parseDocxDirectly(buffer: Buffer, fileName: string): Promise<OfficeConversionResult> {
    try {
      // Install required: pnpm add mammoth
      const mammoth = require('mammoth');

      console.log('[OfficeDocument] Parsing DOCX directly with Mammoth');

      const result = await mammoth.extractRawText({ buffer });

      return {
        text: result.value,
        confidence: 1.0,
        metadata: {
          originalFormat: 'docx',
          conversionMethod: 'direct-parsing',
          pages: [{
            pageNumber: 1,
            text: result.value,
            confidence: 1.0,
          }],
          processingDetails: {
            tempFilesCreated: 0,
            conversionTimeMs: 0,
            totalImageCount: 0,
          },
        },
      };

    } catch (error) {
      throw new Error(`Direct DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute LibreOffice conversion
   */
  private async executeLibreOfficeConversion(
    inputPath: string, 
    outputDir: string, 
    format: 'pdf' | 'png'
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const args = [
        '--headless',
        '--convert-to',
        format,
        '--outdir',
        outputDir,
        inputPath
      ];

      console.log(`[OfficeDocument] Executing: libreoffice ${args.join(' ')}`);

      const proc = spawn('libreoffice', args);

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log('[OfficeDocument] LibreOffice conversion successful');
          resolve();
        } else {
          console.error('[OfficeDocument] LibreOffice conversion failed:', stderr);
          reject(new Error(`LibreOffice conversion failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        reject(new Error(`Failed to start LibreOffice: ${error.message}`));
      });
    });
  }

  /**
   * Extract text content from PowerPoint slide XML
   */
  private extractTextFromSlideXml(xmlData: any): string {
    const texts: string[] = [];

    const extractText = (obj: any) => {
      if (typeof obj === 'string') {
        texts.push(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(extractText);
      } else if (typeof obj === 'object' && obj !== null) {
        Object.values(obj).forEach(extractText);
      }
    };

    // Focus on text content areas
    if (xmlData && xmlData['p:sld'] && xmlData['p:sld']['p:cSld']) {
      extractText(xmlData['p:sld']['p:cSld']);
    }

    return texts.join(' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Check if LibreOffice is available on the system
   */
  public async isLibreOfficeAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('libreoffice', ['--version']);
      
      proc.on('close', (code) => {
        resolve(code === 0);
      });

      proc.on('error', () => {
        resolve(false);
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        proc.kill();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Cleanup temporary files and directories
   */
  private async cleanupFiles(paths: string[]): Promise<void> {
    for (const filePath of paths) {
      try {
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
          } else {
            await unlink(filePath);
          }
        }
      } catch (error) {
        console.warn(`[OfficeDocument] Failed to cleanup ${filePath}:`, error);
      }
    }
  }

  /**
   * Get supported Office document formats
   */
  static getSupportedFormats(): Array<{ extension: string; description: string; category: string }> {
    return [
      { extension: '.pptx', description: 'PowerPoint Presentation', category: 'office' },
      { extension: '.ppt', description: 'PowerPoint Presentation (Legacy)', category: 'office' },
      { extension: '.docx', description: 'Word Document', category: 'office' },
      { extension: '.doc', description: 'Word Document (Legacy)', category: 'office' },
    ];
  }
}

// Export singleton instance
export const officeDocumentService = new OfficeDocumentService();
export default OfficeDocumentService;
