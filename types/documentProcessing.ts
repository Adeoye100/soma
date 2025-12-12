// Document processing types and interfaces

export interface DocumentProcessingConfig {
  maxFileSize: number; // in bytes
  maxConcurrentConversions: number;
  cleanupInterval: number; // in milliseconds
  enableSecurityScanning: boolean;
  enableSizeOptimization: boolean;
  tempFileRetention: number; // in milliseconds
}

export interface ProcessingProgress {
  fileId: string;
  fileName: string;
  stage: ProcessingStage;
  progress: number; // 0-100
  message: string;
  startTime: Date;
  estimatedTimeRemaining?: number; // in seconds
}

export enum ProcessingStage {
  VALIDATING = 'validating',
  SCANNING = 'scanning',
  CONVERTING = 'converting',
  OPTIMIZING = 'optimizing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    fileSize: number;
    mimeType: string;
    extension: string;
    isSuspicious: boolean;
    requiresConversion: boolean;
  };
}

export interface SecurityScanResult {
  isSafe: boolean;
  threats: SecurityThreat[];
  scanTime: number;
}

export interface SecurityThreat {
  type: 'malicious_content' | 'suspicious_macro' | 'hidden_content' | 'unusual_encoding';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: string;
}

export interface ConversionResult {
  success: boolean;
  pdfFile?: File;
  originalFile: File;
  processingTime: number;
  error?: string;
  metadata: {
    originalSize: number;
    pdfSize: number;
    compressionRatio: number;
    pages: number;
    hasEmbeddedMedia: boolean;
  };
}

export interface FileProcessingJob {
  id: string;
  file: File;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: ProcessingProgress;
  result?: ConversionResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export interface ProcessingQueue {
  addJob(file: File, priority?: number): Promise<string>;
  getJobStatus(jobId: string): ProcessingProgress | null;
  cancelJob(jobId: string): boolean;
  getQueueLength(): number;
  isProcessing(): boolean;
}

export interface DocumentProcessor {
  processFile(file: File): Promise<ConversionResult>;
  validateFile(file: File): Promise<ValidationResult>;
  scanFile(file: File): Promise<SecurityScanResult>;
  optimizeFile(file: File): Promise<File>;
}

export interface TempFileManager {
  createTempFile(extension?: string): { path: string; cleanup: () => void };
  scheduleCleanup(path: string, delay?: number): void;
  cleanupExpired(): void;
  getTempFilesCount(): number;
}

// Event types for progress tracking
export interface ProcessingEvent {
  type: 'progress' | 'error' | 'complete' | 'validation' | 'security_scan';
  jobId: string;
  data: any;
  timestamp: Date;
}

export type ProcessingEventListener = (event: ProcessingEvent) => void;