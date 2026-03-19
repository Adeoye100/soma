import { 
  DocumentProcessor,
  ConversionResult,
  ValidationResult,
  SecurityScanResult,
  DocumentProcessingConfig
} from '../types/documentProcessing';
import { Material } from '../types';
import { FileValidationService } from './fileValidationService';
import { EnhancedPdfConversionService } from './enhancedPdfConversionService';
import { DocumentProcessingQueue } from './processingQueue';
import { loggingService } from './loggingService';
import { tempFileManager } from './tempFileManager';

const MAX_CONTENT_CHARS = 50_000;

async function extractPdfText(file: File | Blob): Promise<string> {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    
    if (pdfjsLib.version && parseInt(pdfjsLib.version.split('.')[0]) >= 4) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '2.16.105'}/pdf.worker.min.js`;
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    const textParts: string[] = [];
    const numPages = pdf.numPages;
    
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      let pageText = '';
      for (const item of textContent.items as Array<{ str?: string }>) {
        if (item.str) {
          pageText += item.str + ' ';
        }
      }
      
      textParts.push(pageText.trim());
    }
    
    const fullText = textParts.join('\n\n').trim();
    
    if (!fullText || fullText.length < 10) {
      loggingService.warn('DocumentProcessor', `PDF ${file instanceof File ? file.name : 'blob'} appears to contain minimal text (may be scanned images)`);
      return `[Content from ${file instanceof File ? file.name : 'PDF'} - This PDF contains scanned images rather than selectable text. Exam questions will be based on limited content.]`;
    }
    
    return fullText;
  } catch (err) {
    loggingService.warn('DocumentProcessor', `Failed to extract text from PDF`, err);
    return `[Content from PDF - Text extraction failed. The file may be corrupted, password-protected, or contain scanned images.]`;
  }
}

async function extractTextFromFile(file: File): Promise<string> {
  const mimeType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  
  if (mimeType === 'text/plain' || mimeType === 'text/markdown' || 
      fileName.endsWith('.txt') || fileName.endsWith('.md')) {
    return await file.text();
  }
  
  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractPdfText(file);
  }
  
  if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value || `[Content from ${file.name} - DOCX was empty]`;
    } catch (err) {
      loggingService.warn('DocumentProcessor', `Failed to extract text from DOCX: ${file.name}`, err);
      return `[Content from ${file.name} - DOCX extraction failed]`;
    }
  }
  
  if (mimeType === 'application/vnd.ms-powerpoint' || 
      mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      fileName.endsWith('.ppt') || fileName.endsWith('.pptx')) {
    try {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
      return result.value || `[Content from ${file.name} - PowerPoint was empty]`;
    } catch (err) {
      loggingService.warn('DocumentProcessor', `PPTX text extraction failed: ${file.name}`, err);
      return `[Content from ${file.name} - PowerPoint extraction not fully supported]`;
    }
  }
  
  if (mimeType.startsWith('image/')) {
    return `[Image content from ${file.name} - Image text cannot be extracted client-side. Consider using OCR tools to convert images to text first.]`;
  }
  
  return await file.text().catch(() => `[Content from ${file.name} - Unable to extract text]`);
}

export class RobustDocumentProcessor implements DocumentProcessor {
  private config: DocumentProcessingConfig;
  private validationService: FileValidationService;
  private conversionService: EnhancedPdfConversionService;
  private processingQueue: DocumentProcessingQueue;
  private isInitialized: boolean = false;

  constructor(config?: Partial<DocumentProcessingConfig>) {
    this.config = {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxConcurrentConversions: 3,
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      enableSecurityScanning: true,
      enableSizeOptimization: true,
      tempFileRetention: 60 * 60 * 1000, // 1 hour
      ...config
    };

    this.validationService = new FileValidationService(this.config);
    this.conversionService = new EnhancedPdfConversionService(this.config);
    this.processingQueue = new DocumentProcessingQueue(
      this.config,
      this.validationService,
      this.conversionService
    );

    this.initialize();
  }

  /**
   * Initialize the document processor
   */
  private initialize(): void {
    if (this.isInitialized) {
      return;
    }

    loggingService.info('DocumentProcessor', 'Initializing document processor');

    // Set up event listeners for the processing queue
    this.processingQueue.addEventListener((event) => {
      this.handleProcessingEvent(event);
    });

    // Start resource monitoring
    this.startResourceMonitoring();

    this.isInitialized = true;
    loggingService.info('DocumentProcessor', 'Document processor initialized successfully');
  }

  /**
   * Process a file with comprehensive validation, security scanning, and conversion
   */
  async processFile(file: File): Promise<ConversionResult> {
    const startTime = Date.now();
    const fileId = this.generateProcessingId();

    loggingService.startPerformanceMark(`process_${fileId}`);
    loggingService.logFileProcessing('upload_start', file.name, file.size, undefined);

    try {
      // Step 1: Validation
      loggingService.logFileProcessing('validation_start', file.name, file.size);
      const validationResult = await this.validateFile(file);
      
      if (!validationResult.isValid) {
        throw new Error(`File validation failed: ${validationResult.errors.join(', ')}`);
      }

      loggingService.logFileProcessing('validation_complete', file.name, file.size, validationResult);

      // Step 2: Security scanning (if enabled)
      if (this.config.enableSecurityScanning) {
        const scanResult = await this.scanFile(file);
        
        if (!scanResult.isSafe) {
          loggingService.logSecurityEvent('threat_detected', file.name, scanResult);
          throw new Error(`Security scan failed: ${scanResult.threats.map(t => t.description).join(', ')}`);
        }
      }

      // Step 3: Conversion (if needed)
      let conversionResult: ConversionResult;
      
      if (validationResult.metadata.requiresConversion) {
        loggingService.logFileProcessing('conversion_start', file.name, file.size);
        conversionResult = await this.conversionService.convertToPdf(file);
        
        if (!conversionResult.success) {
          loggingService.logFileProcessing('error', file.name, file.size, conversionResult);
          throw new Error(conversionResult.error || 'Conversion failed');
        }

        loggingService.logFileProcessing('conversion_complete', file.name, file.size, conversionResult);
      } else {
        // File doesn't need conversion, create a result for the original file
        conversionResult = {
          success: true,
          originalFile: file,
          processingTime: Date.now() - startTime,
          metadata: {
            originalSize: file.size,
            pdfSize: file.size,
            compressionRatio: 0,
            pages: 1,
            hasEmbeddedMedia: false
          }
        };
      }

      // Step 4: Optimization (if enabled and file is large)
      if (this.config.enableSizeOptimization && file.size > 2 * 1024 * 1024) { // 2MB
        try {
          const optimizedFile = await this.optimizeFile(file);
          if (optimizedFile.size < file.size) {
            loggingService.info('DocumentProcessor', `File optimized: ${file.name} (${file.size} -> ${optimizedFile.size} bytes)`);
          }
        } catch (error) {
          loggingService.warn('DocumentProcessor', `Optimization failed for ${file.name}: ${error}`);
          // Continue without optimization if it fails
        }
      }

      const processingTime = loggingService.endPerformanceMark(`process_${fileId}`, 'DocumentProcessor');
      
      loggingService.info('DocumentProcessor', `File processed successfully: ${file.name}`, {
        processingTime,
        result: conversionResult
      });

      return conversionResult;

    } catch (error) {
      loggingService.logFileProcessing('error', file.name, file.size, { error: error });
      loggingService.error('DocumentProcessor', `File processing failed: ${file.name}`, error);
      throw error;
    }
  }

  /**
   * Validate a file for processing
   */
  async validateFile(file: File): Promise<ValidationResult> {
    loggingService.startPerformanceMark(`validate_${file.name}`);
    
    try {
      const result = await this.validationService.validateFile(file);
      
      loggingService.debug('DocumentProcessor', `File validation completed: ${file.name}`, result);
      return result;
    } finally {
      loggingService.endPerformanceMark(`validate_${file.name}`, 'DocumentProcessor');
    }
  }

  /**
   * Security scan a file for threats
   */
  async scanFile(file: File): Promise<SecurityScanResult> {
    if (!this.config.enableSecurityScanning) {
      return {
        isSafe: true,
        threats: [],
        scanTime: 0
      };
    }

    loggingService.startPerformanceMark(`scan_${file.name}`);
    
    try {
      const result = await this.validationService.scanFile(file);
      
      loggingService.debug('DocumentProcessor', `Security scan completed: ${file.name}`, result);
      return result;
    } finally {
      loggingService.endPerformanceMark(`scan_${file.name}`, 'DocumentProcessor');
    }
  }

  /**
   * Optimize a file for better performance
   */
  async optimizeFile(file: File): Promise<File> {
    loggingService.startPerformanceMark(`optimize_${file.name}`);
    
    try {
      const result = await this.validationService.optimizeFile(file);
      
      loggingService.debug('DocumentProcessor', `File optimization completed: ${file.name}`, {
        originalSize: file.size,
        optimizedSize: result.size,
        compressionRatio: 1 - (result.size / file.size)
      });
      
      return result;
    } finally {
      loggingService.endPerformanceMark(`optimize_${file.name}`, 'DocumentProcessor');
    }
  }

  /**
   * Process multiple files concurrently with resource management
   */
  async processFiles(files: File[], options: {
    onProgress?: (completed: number, total: number) => void;
    maxConcurrency?: number;
  } = {}): Promise<ConversionResult[]> {
    const maxConcurrency = options.maxConcurrency || this.config.maxConcurrentConversions;
    const results: ConversionResult[] = [];
    let completed = 0;

    loggingService.info('DocumentProcessor', `Processing ${files.length} files with max concurrency ${maxConcurrency}`);

    // Process files in batches to manage resources
    for (let i = 0; i < files.length; i += maxConcurrency) {
      const batch = files.slice(i, i + maxConcurrency);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.processFile(file);
          completed++;
          options.onProgress?.(completed, files.length);
          return result;
        } catch (error) {
          completed++;
          options.onProgress?.(completed, files.length);
          loggingService.error('DocumentProcessor', `Batch processing failed for ${file.name}`, error);
          throw error;
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const batchResult of batchResults) {
        if (batchResult.status === 'fulfilled') {
          results.push(batchResult.value);
        } else {
          loggingService.error('DocumentProcessor', 'Batch processing failed', batchResult.reason);
          // For now, we'll skip failed files and continue
        }
      }

      // Small delay between batches to prevent overwhelming the system
      if (i + maxConcurrency < files.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    loggingService.info('DocumentProcessor', `Batch processing completed: ${results.length}/${files.length} files processed successfully`);
    return results;
  }

  /**
   * Convert files to Materials format for exam processing
   */
  async convertToMaterials(files: File[]): Promise<Material[]> {
    const materials: Material[] = [];
    
    for (const file of files) {
      try {
        let text: string;
        let sourceFile: File | Blob = file;
        
        const result = await this.processFile(file);
        
        if (result.success && result.pdfFile) {
          sourceFile = result.pdfFile;
          loggingService.debug('DocumentProcessor', `Extracting text from converted PDF for ${file.name}`);
        }
        
        if (sourceFile.type === 'application/pdf' || (sourceFile as File).name?.toLowerCase().endsWith('.pdf')) {
          text = await extractPdfText(sourceFile);
        } else {
          text = await extractTextFromFile(sourceFile as File);
        }
        
        const safeText = text.length > MAX_CONTENT_CHARS
          ? text.slice(0, MAX_CONTENT_CHARS)
          : text;
        
        if (text.length > MAX_CONTENT_CHARS) {
          loggingService.warn('DocumentProcessor', 
            `Content from ${file.name} truncated from ${text.length} to ${MAX_CONTENT_CHARS} chars`);
        }
        
        materials.push({
          name: file.name,
          content: safeText,
          mimeType: file.type
        });
        
      } catch (error) {
        loggingService.error('DocumentProcessor', `Failed to convert file to material: ${file.name}`, error);
      }
    }

    return materials;
  }

  /**
   * Get processing statistics
   */
  getProcessingStats(): {
    queueLength: number;
    isProcessing: boolean;
    tempFilesCount: number;
    tempFileSize: number;
    memoryPressure: boolean;
  } {
    return {
      queueLength: this.processingQueue.getQueueLength(),
      isProcessing: this.processingQueue.isProcessing(),
      tempFilesCount: tempFileManager.getTempFilesCount(),
      tempFileSize: tempFileManager.getTotalTempFileSize(),
      memoryPressure: tempFileManager.isMemoryPressure()
    };
  }

  /**
   * Handle processing events
   */
  private handleProcessingEvent(event: any): void {
    switch (event.type) {
      case 'progress':
        loggingService.debug('DocumentProcessor', `Processing progress: ${event.jobId}`, event.data);
        break;
      case 'error':
        loggingService.error('DocumentProcessor', `Processing error: ${event.jobId}`, event.data);
        break;
      case 'complete':
        loggingService.info('DocumentProcessor', `Processing completed: ${event.jobId}`, event.data);
        break;
      case 'validation':
        loggingService.info('DocumentProcessor', `Validation warnings: ${event.jobId}`, event.data);
        break;
      case 'security_scan':
        loggingService.warn('DocumentProcessor', `Security threats detected: ${event.jobId}`, event.data);
        break;
    }
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    setInterval(() => {
      const stats = this.getProcessingStats();
      
      // Log resource usage periodically
      if (Math.random() < 0.1) { // 10% of the time
        loggingService.debug('DocumentProcessor', 'Resource usage stats', stats);
      }

      // Check for resource pressure and take action if needed
      if (stats.memoryPressure || stats.tempFilesCount > 80) {
        loggingService.warn('DocumentProcessor', 'Resource pressure detected', stats);
        tempFileManager.cleanupOldestFiles(20);
      }
    }, 60 * 1000); // Every minute
  }

  /**
   * Convert file to base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Generate unique processing ID
   */
  private generateProcessingId(): string {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Shutdown the document processor
   */
  shutdown(): void {
    loggingService.info('DocumentProcessor', 'Shutting down document processor');
    
    // Shutdown all services
    tempFileManager.shutdown();
    this.conversionService.cleanup();
    
    loggingService.info('DocumentProcessor', 'Document processor shutdown complete');
  }

  /**
   * Check if processor is healthy
   */
  isHealthy(): boolean {
    const stats = this.getProcessingStats();
    
    // Consider unhealthy if memory pressure is severe or too many temp files
    return !stats.memoryPressure || stats.tempFilesCount < 50;
  }

  /**
   * Force cleanup of all resources
   */
  forceCleanup(): void {
    loggingService.info('DocumentProcessor', 'Forcing cleanup of all resources');
    tempFileManager.cleanupOldestFiles(tempFileManager.getTempFilesCount());
  }
}

// Create and export default instance
export const documentProcessor = new RobustDocumentProcessor();