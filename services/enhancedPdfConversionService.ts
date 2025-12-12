import mammoth from 'mammoth';
import html2pdf from 'html2pdf.js';
import pptx2html from 'pptx2html';
import { 
  ConversionResult, 
  ProcessingProgress, 
  ProcessingStage,
  DocumentProcessingConfig 
} from '../types/documentProcessing';

export class EnhancedPdfConversionService {
  private config: DocumentProcessingConfig;
  private progressCallbacks: Map<string, (progress: ProcessingProgress) => void> = new Map();

  constructor(config: DocumentProcessingConfig) {
    this.config = config;
  }

  /**
   * Enhanced PDF conversion with comprehensive error handling and progress tracking
   */
  async convertToPdf(file: File, onProgress?: (progress: ProcessingProgress) => void): Promise<ConversionResult> {
    const startTime = Date.now();
    const fileId = this.generateFileId();
    
    try {
      // Set up progress tracking
      if (onProgress) {
        this.progressCallbacks.set(fileId, onProgress);
      }

      this.updateProgress(fileId, {
        fileId,
        fileName: file.name,
        stage: ProcessingStage.VALIDATING,
        progress: 10,
        message: 'Validating file...',
        startTime: new Date()
      });

      const extension = this.getFileExtension(file.name);
      
      if (extension === 'docx') {
        return await this.convertDocxToPdf(file, fileId, startTime);
      } else if (extension === 'pptx') {
        return await this.convertPptxToPdf(file, fileId, startTime);
      } else {
        throw new Error(`Unsupported file type: ${extension}. Only .docx and .pptx files can be converted.`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown conversion error';
      
      this.updateProgress(fileId, {
        fileId,
        fileName: file.name,
        stage: ProcessingStage.FAILED,
        progress: 0,
        message: `Conversion failed: ${errorMessage}`,
        startTime: new Date()
      });

      return {
        success: false,
        originalFile: file,
        processingTime: Date.now() - startTime,
        error: errorMessage,
        metadata: {
          originalSize: file.size,
          pdfSize: 0,
          compressionRatio: 0,
          pages: 0,
          hasEmbeddedMedia: false
        }
      };
    } finally {
      this.progressCallbacks.delete(fileId);
    }
  }

  /**
   * Convert DOCX to PDF with enhanced formatting preservation
   */
  private async convertDocxToPdf(file: File, fileId: string, startTime: number): Promise<ConversionResult> {
    this.updateProgress(fileId, {
      fileId,
      fileName: file.name,
      stage: ProcessingStage.CONVERTING,
      progress: 25,
      message: 'Converting DOCX to PDF...',
      startTime: new Date()
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Enhanced mammoth options for better formatting
      const mammothOptions = {
        convertImage: mammoth.images.imgElement(async function(image) {
          try {
            return await image.read("base64");
          } catch (error) {
            console.warn('Failed to convert image:', error);
            return null;
          }
        }),
        styleMap: [
          "p[style-name='Normal'] => p:fresh",
          "h1[style-name='Heading 1'] => h1:fresh",
          "h2[style-name='Heading 2'] => h2:fresh",
          "h3[style-name='Heading 3'] => h3:fresh",
          "h4[style-name='Heading 4'] => h4:fresh",
          "table => table:fresh",
          "ul => ul:fresh",
          "ol => ol:fresh"
        ]
      };

      const result = await mammoth.convertToHtml({ arrayBuffer }, mammothOptions);
      const htmlContent = result.value;
      
      if (!htmlContent) {
        throw new Error('Failed to extract content from DOCX file');
      }

      // Check for embedded images
      const hasEmbeddedMedia = htmlContent.includes('<img') || htmlContent.includes('data:image');
      
      this.updateProgress(fileId, {
        fileId,
        fileName: file.name,
        stage: ProcessingStage.CONVERTING,
        progress: 50,
        message: 'Generating PDF...',
        startTime: new Date()
      });

      const pdfBlob = await this.generatePdfBlob(htmlContent, file.name.replace('.docx', '.pdf'), 'portrait');
      
      this.updateProgress(fileId, {
        fileId,
        fileName: file.name,
        stage: ProcessingStage.OPTIMIZING,
        progress: 75,
        message: 'Optimizing PDF...',
        startTime: new Date()
      });

      // Estimate number of pages (rough calculation)
      const estimatedPages = Math.max(1, Math.ceil(htmlContent.length / 2000));
      const compressionRatio = 1 - (pdfBlob.size / file.size);
      
      const pdfFile = new File([pdfBlob], file.name.replace('.docx', '.pdf'), { 
        type: 'application/pdf',
        lastModified: Date.now()
      });

      this.updateProgress(fileId, {
        fileId,
        fileName: file.name,
        stage: ProcessingStage.COMPLETED,
        progress: 100,
        message: 'DOCX conversion completed successfully',
        startTime: new Date()
      });

      return {
        success: true,
        pdfFile,
        originalFile: file,
        processingTime: Date.now() - startTime,
        metadata: {
          originalSize: file.size,
          pdfSize: pdfFile.size,
          compressionRatio,
          pages: estimatedPages,
          hasEmbeddedMedia
        }
      };
    } catch (error) {
      throw new Error(`DOCX conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert PPTX to PDF with enhanced formatting preservation
   */
  private async convertPptxToPdf(file: File, fileId: string, startTime: number): Promise<ConversionResult> {
    this.updateProgress(fileId, {
      fileId,
      fileName: file.name,
      stage: ProcessingStage.CONVERTING,
      progress: 25,
      message: 'Converting PPTX to PDF...',
      startTime: new Date()
    });

    try {
      const arrayBuffer = await file.arrayBuffer();
      
      // Convert PPTX to HTML using pptx2html
      const htmlContent = await pptx2html(arrayBuffer);
      
      if (!htmlContent) {
        throw new Error('Failed to extract content from PPTX file');
      }

      // Check for embedded media
      const hasEmbeddedMedia = htmlContent.includes('<img') || htmlContent.includes('data:image');
      
      this.updateProgress(fileId, {
        fileId,
        fileName: file.name,
        stage: ProcessingStage.CONVERTING,
        progress: 50,
        message: 'Generating PDF...',
        startTime: new Date()
      });

      const pdfBlob = await this.generatePdfBlob(htmlContent, file.name.replace('.pptx', '.pdf'), 'landscape');
      
      this.updateProgress(fileId, {
        fileId,
        fileName: file.name,
        stage: ProcessingStage.OPTIMIZING,
        progress: 75,
        message: 'Optimizing PDF...',
        startTime: new Date()
      });

      // Estimate number of slides (rough calculation)
      const estimatedPages = Math.max(1, Math.ceil(htmlContent.split('<div class="slide').length - 1));
      const compressionRatio = 1 - (pdfBlob.size / file.size);
      
      const pdfFile = new File([pdfBlob], file.name.replace('.pptx', '.pdf'), { 
        type: 'application/pdf',
        lastModified: Date.now()
      });

      this.updateProgress(fileId, {
        fileId,
        fileName: file.name,
        stage: ProcessingStage.COMPLETED,
        progress: 100,
        message: 'PPTX conversion completed successfully',
        startTime: new Date()
      });

      return {
        success: true,
        pdfFile,
        originalFile: file,
        processingTime: Date.now() - startTime,
        metadata: {
          originalSize: file.size,
          pdfSize: pdfFile.size,
          compressionRatio,
          pages: estimatedPages,
          hasEmbeddedMedia
        }
      };
    } catch (error) {
      throw new Error(`PPTX conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate PDF blob with enhanced formatting options
   */
  private async generatePdfBlob(htmlContent: string, filename: string, orientation: 'portrait' | 'landscape'): Promise<Blob> {
    return new Promise((resolve, reject) => {
      try {
        // Create a temporary container with enhanced styling
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlContent;
        
        // Enhanced CSS for better formatting
        const style = document.createElement('style');
        style.textContent = `
          body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            font-size: 12px;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            color: #333;
          }
          h1 { font-size: 24px; margin: 20px 0 10px 0; font-weight: bold; }
          h2 { font-size: 20px; margin: 18px 0 8px 0; font-weight: bold; }
          h3 { font-size: 16px; margin: 16px 0 6px 0; font-weight: bold; }
          h4 { font-size: 14px; margin: 14px 0 4px 0; font-weight: bold; }
          p { margin: 10px 0; text-align: justify; }
          table { border-collapse: collapse; width: 100%; margin: 15px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          ul, ol { margin: 10px 0; padding-left: 30px; }
          li { margin: 5px 0; }
          img { max-width: 100%; height: auto; margin: 10px 0; }
          .slide { 
            page-break-after: always; 
            min-height: 90vh; 
            padding: 20px; 
            border: 1px solid #eee;
            margin-bottom: 20px;
          }
          .slide:last-child { page-break-after: avoid; }
          @media print {
            body { font-size: 10px; }
            .slide { min-height: 100vh; }
          }
        `;
        
        tempDiv.appendChild(style);

        // Enhanced html2pdf options
        const options = {
          margin: [0.5, 0.5, 0.5, 0.5],
          filename,
          image: { 
            type: 'jpeg', 
            quality: 0.95,
            format: 'JPEG',
            compression: 'FAST'
          },
          html2canvas: { 
            scale: 2, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            letterRendering: true,
            logging: false
          },
          jsPDF: { 
            unit: 'in', 
            format: 'a4', 
            orientation,
            compress: true,
            putOnlyUsedFonts: true,
            floatPrecision: 16
          },
          pagebreak: { 
            mode: ['avoid-all', 'css', 'legacy'],
            before: '.slide'
          }
        };

        // Generate PDF
        const worker = html2pdf().set(options).from(tempDiv);
        worker.outputPdf('blob').then(resolve).catch(reject);
        
        // Cleanup after a delay to prevent memory leaks
        setTimeout(() => {
          document.head.removeChild(style);
        }, 1000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Update progress for a specific file
   */
  private updateProgress(fileId: string, progress: ProcessingProgress): void {
    const callback = this.progressCallbacks.get(fileId);
    if (callback) {
      callback(progress);
    }
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex).toLowerCase() : '';
  }

  /**
   * Generate unique file ID for progress tracking
   */
  private generateFileId(): string {
    return `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate if a file can be converted to PDF
   */
  canConvertToPdf(file: File): boolean {
    const extension = this.getFileExtension(file.name);
    return ['.docx', '.pptx'].includes(extension);
  }

  /**
   * Estimate conversion time based on file size and type
   */
  estimateConversionTime(file: File): number {
    const baseTime = file.size < 1024 * 1024 ? 2000 : 5000; // 2s for <1MB, 5s for larger
    const extension = this.getFileExtension(file.name);
    const multiplier = extension === '.pptx' ? 1.5 : 1.0; // PPTX takes longer
    return Math.round(baseTime * multiplier);
  }

  /**
   * Clean up resources and cancel pending conversions
   */
  cleanup(): void {
    this.progressCallbacks.clear();
  }
}