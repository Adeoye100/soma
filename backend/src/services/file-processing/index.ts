// src/services/file-processing/index.ts

// Main exports
export { TextSanitizer, SanitizedResult } from './TextSanitizer';
export { FileTypeRouter, ParserError } from './FileTypeRouter';
export { ParsedContent, PdfParser } from './parsers/PdfParser';
export { FileSecurityValidator, ValidationResult, FileValidationConfig } from './FileSecurityValidator';
export { SecureFileProcessor } from './SecureFileProcessor';

// Type exports
export type { 
  FileProcessorConfig,
  ProcessedFile, 
  ProcessingError, 
  ProcessingResult, 
  UploadLogEntry 
} from './SecureFileProcessor';
export type { 
  ParsedFile, 
  FileTypeRouterConfig 
} from './FileTypeRouter';
