import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as path from 'path';

export interface VisionConfig {
  keyFilename?: string;
  projectId?: string;
  apiKey?: string;
  [key: string]: any;
}

export interface VisionResult {
  text: string;
  confidence: number;
  metadata: {
    detectedLanguages?: string[];
    pages?: Array<{
      pageNumber: number;
      text: string;
      confidence: number;
    }>;
    textAnnotations?: Array<{
      text: string;
      boundingBox: Array<{ x: number; y: number }>;
      confidence?: number;
    }>;
    processingMethod: 'direct' | 'document' | 'ocr';
    extractionDetails?: any;
  };
}

export class GoogleVisionService {
  private client!: ImageAnnotatorClient;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = false;
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      const config: VisionConfig = {};

      // Priority order: Service Account Key > API Key > Default credentials
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        config.keyFilename = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        console.log('🔑 Using Google Service Account credentials');
      } else if (process.env.GOOGLE_CLOUD_API_KEY) {
        config.apiKey = process.env.GOOGLE_CLOUD_API_KEY;
        console.log('🔑 Using Google Cloud API key');
      } else if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        config.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        console.log('🔑 Using Google Cloud project ID with default credentials');
      }

      this.client = new ImageAnnotatorClient(config);
      this.isConfigured = true;

      console.log('✅ Google Vision API initialized successfully');
    } catch (error) {
      console.warn('⚠️ Google Vision API not configured:', error instanceof Error ? error.message : 'Unknown error');
      this.isConfigured = false;
    }
  }

  /**
   * Extract text from image buffer using Google Vision API
   */
  async extractTextFromBuffer(buffer: Buffer, mimeType: string = 'image/jpeg'): Promise<VisionResult> {
    if (!this.isConfigured) {
      throw new Error('Google Vision API not configured. Please set GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_CLOUD_API_KEY, or GOOGLE_CLOUD_PROJECT_ID');
    }

    try {
      console.log(`[GoogleVision] Processing ${mimeType} buffer (${buffer.length} bytes)`);
      
      const [result] = await this.client.textDetection({
        image: { content: buffer },
      });

      const detections = result.textAnnotations || [];
      const fullText = detections[0]?.description || '';

      if (!fullText) {
        console.warn('[GoogleVision] No text detected in image');
        return {
          text: '',
          confidence: 0,
          metadata: {
            pages: [],
            processingMethod: 'ocr',
          },
        };
      }

      // Extract detailed annotations
      const textAnnotations = detections.slice(1).map(detection => ({
        text: detection.description || '',
        boundingBox: detection.boundingPoly?.vertices?.map((v: any) => ({ x: v.x || 0, y: v.y || 0 })) || [],
        confidence: (detection as any).confidence || 0,
      }));

      // Detect languages
      const detectedLanguages = result.textAnnotations?.[0]?.locale ? [result.textAnnotations[0].locale] : [];

      console.log(`[GoogleVision] Text detected: ${fullText.length} characters, confidence: ${(detections[0] as any).confidence || 0}`);

      return {
        text: fullText,
        confidence: (detections[0] as any).confidence || 0,
        metadata: {
          detectedLanguages,
          textAnnotations,
          pages: [{
            pageNumber: 1,
            text: fullText,
            confidence: (detections[0] as any).confidence || 0,
          }],
          processingMethod: 'ocr',
          extractionDetails: {
            annotationCount: detections.length,
            averageConfidence: detections.reduce((sum, d: any) => sum + (d.confidence || 0), 0) / Math.max(detections.length, 1),
          },
        },
      };
    } catch (error) {
      console.error('[GoogleVision] Error during text extraction:', error);
      throw new Error(`Google Vision API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract text from PDF buffer using Google Vision Document API
   */
  async extractTextFromPdfBuffer(buffer: Buffer): Promise<VisionResult> {
    if (!this.isConfigured) {
      throw new Error('Google Vision API not configured');
    }

    try {
      console.log(`[GoogleVision] Processing PDF buffer (${buffer.length} bytes) with Document API`);

      const [result] = await this.client.documentTextDetection({
        image: { content: buffer },
      });

      const fullTextAnnotation = result.fullTextAnnotation;
      if (!fullTextAnnotation || !fullTextAnnotation.text) {
        console.warn('[GoogleVision] No text detected in PDF');
        return {
          text: '',
          confidence: 0,
          metadata: { 
            pages: [], 
            processingMethod: 'document',
          },
        };
      }

      const pages = fullTextAnnotation.pages?.map((page, index) => {
        const pageText = page.blocks?.map(block => 
          block.paragraphs?.map(paragraph => 
            paragraph.words?.map(word => 
              word.symbols?.map(symbol => symbol.text).join('')
            ).join(' ')
          ).join('\n')
        ).join('\n\n') || '';

        return {
          pageNumber: index + 1,
          text: pageText,
          confidence: page.confidence || 0,
        };
      }) || [];

      // confidence and detectedLanguages are on fullTextAnnotation
      const totalConfidence = (fullTextAnnotation as any).confidence || 0;
      const detectedLanguages = (fullTextAnnotation as any).detectedLanguages?.map((lang: any) => lang.languageCode || '') || [];

      console.log(`[GoogleVision] PDF processed: ${pages.length} pages, ${fullTextAnnotation.text.length} characters, confidence: ${totalConfidence}`);

      return {
        text: fullTextAnnotation.text,
        confidence: totalConfidence,
        metadata: {
          pages,
          detectedLanguages,
          processingMethod: 'document',
          extractionDetails: {
            pageCount: pages.length,
            averagePageConfidence: pages.reduce((sum, p) => sum + p.confidence, 0) / Math.max(pages.length, 1),
          },
        },
      };
    } catch (error) {
      console.error('[GoogleVision] Error during PDF processing:', error);
      throw new Error(`PDF processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process multiple file formats with intelligent routing
   */
  async extractText(buffer: Buffer, fileName: string, mimeType: string): Promise<VisionResult> {
    const ext = path.extname(fileName).toLowerCase();

    console.log(`[GoogleVision] Processing file: ${fileName} (${ext}, ${mimeType})`);

    switch (ext) {
      case '.pdf':
        return this.extractTextFromPdfBuffer(buffer);
      
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.bmp':
      case '.webp':
      case '.tiff':
      case '.tif':
        return this.extractTextFromBuffer(buffer, mimeType);
      
      case '.txt':
      case '.md':
        // For text files, return content directly
        const text = buffer.toString('utf-8');
        console.log(`[GoogleVision] Text file processed: ${text.length} characters`);
        return {
          text,
          confidence: 1.0,
          metadata: {
            pages: [{
              pageNumber: 1,
              text,
              confidence: 1.0,
            }],
            processingMethod: 'direct',
          },
        };

      default:
        throw new Error(`Unsupported file type: ${ext}. Supported formats: .pdf, .jpg, .jpeg, .png, .gif, .bmp, .webp, .tiff, .tif, .txt, .md`);
    }
  }

  /**
   * Health check for Google Vision API
   */
  async healthCheck(): Promise<{ status: 'ok' | 'error'; message: string; details?: any }> {
    if (!this.isConfigured) {
      return {
        status: 'error',
        message: 'Google Vision API not configured',
        details: {
          requiredEnvVars: ['GOOGLE_APPLICATION_CREDENTIALS', 'GOOGLE_CLOUD_API_KEY', 'GOOGLE_CLOUD_PROJECT_ID'],
          configuredEnvVars: [
            !!process.env.GOOGLE_APPLICATION_CREDENTIALS && 'GOOGLE_APPLICATION_CREDENTIALS',
            !!process.env.GOOGLE_CLOUD_API_KEY && 'GOOGLE_CLOUD_API_KEY',
            !!process.env.GOOGLE_CLOUD_PROJECT_ID && 'GOOGLE_CLOUD_PROJECT_ID',
          ].filter(Boolean),
        },
      };
    }

    try {
      // Create a minimal test image (1x1 white pixel PNG)
      const testImage = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
        0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
        0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
        0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
        0x42, 0x60, 0x82
      ]);

      console.log('[GoogleVision] Running health check...');
      const startTime = Date.now();
      
      await this.client.textDetection({ image: { content: testImage } });
      
      const responseTime = Date.now() - startTime;
      
      console.log(`[GoogleVision] Health check successful (${responseTime}ms)`);
      
      return {
        status: 'ok',
        message: 'Google Vision API is working correctly',
        details: {
          responseTimeMs: responseTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('[GoogleVision] Health check failed:', error);
      return {
        status: 'error',
        message: `Google Vision API error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          timestamp: new Date().toISOString(),
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
        },
      };
    }
  }

  /**
   * Get supported file formats
   */
  static getSupportedFormats(): Array<{ extension: string; description: string; category: string }> {
    return [
      { extension: '.pdf', description: 'Portable Document Format', category: 'document' },
      { extension: '.txt', description: 'Plain Text', category: 'text' },
      { extension: '.md', description: 'Markdown', category: 'text' },
      { extension: '.jpg', description: 'JPEG Image', category: 'image' },
      { extension: '.jpeg', description: 'JPEG Image', category: 'image' },
      { extension: '.png', description: 'PNG Image', category: 'image' },
      { extension: '.gif', description: 'GIF Image', category: 'image' },
      { extension: '.bmp', description: 'Bitmap Image', category: 'image' },
      { extension: '.webp', description: 'WebP Image', category: 'image' },
      { extension: '.tiff', description: 'TIFF Image', category: 'image' },
      { extension: '.tif', description: 'TIFF Image', category: 'image' },
    ];
  }
}

// Export singleton instance
export const googleVisionService = new GoogleVisionService();
export default GoogleVisionService;
