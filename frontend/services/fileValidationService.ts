import { 
  ValidationResult, 
  SecurityScanResult, 
  SecurityThreat,
  DocumentProcessingConfig 
} from '../types/documentProcessing';

export class FileValidationService {
  private config: DocumentProcessingConfig;

  constructor(config: DocumentProcessingConfig) {
    this.config = config;
  }

  /**
   * Enhanced file validation with security scanning and optimization checks
   */
  async validateFile(file: File): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Basic file validation
    if (!file) {
      errors.push('No file provided');
      return this.createValidationResult(false, errors, warnings, file);
    }

    // File size validation
    if (file.size > this.config.maxFileSize) {
      errors.push(`File size exceeds maximum limit of ${this.config.maxFileSize / (1024 * 1024)}MB`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    // Extension and MIME type validation
    const extension = this.getFileExtension(file.name);
    const mimeType = this.detectMimeType(file, extension);
    
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/png',
      'image/jpeg',
      'image/jpg'
    ];

    const allowedExtensions = ['.pdf', '.docx', '.pptx', '.txt', '.png', '.jpg', '.jpeg'];

    if (!allowedTypes.includes(mimeType) || !allowedExtensions.includes(extension)) {
      errors.push(`Unsupported file type. Supported formats: PDF, DOCX, PPTX, TXT, PNG, JPG`);
    }

    // Suspicious file detection
    const isSuspicious = this.detectSuspiciousFile(file, extension);
    if (isSuspicious) {
      warnings.push('File may contain suspicious content');
    }

    // Check if conversion is required
    const requiresConversion = ['.docx', '.pptx'].includes(extension);
    
    // Size optimization warning
    if (file.size > 5 * 1024 * 1024 && this.config.enableSizeOptimization) {
      warnings.push('Large file detected - optimization recommended');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        fileSize: file.size,
        mimeType,
        extension,
        isSuspicious,
        requiresConversion
      }
    };
  }

  /**
   * Security scanning for malicious content and threats
   */
  async scanFile(file: File): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const threats: SecurityThreat[] = [];

    try {
      // Basic security checks
      await this.checkFileSignature(file);
      await this.scanFileContent(file, threats);
      await this.detectMacros(file, threats);
      await this.checkHiddenContent(file, threats);

      const scanTime = Date.now() - startTime;
      const isSafe = threats.filter(t => t.severity === 'high' || t.severity === 'critical').length === 0;

      return {
        isSafe,
        threats,
        scanTime
      };
    } catch (error) {
      // If scanning fails, consider it potentially unsafe
      threats.push({
        type: 'malicious_content',
        severity: 'medium',
        description: `Security scan failed: ${(error as Error).message}`
      });

      return {
        isSafe: false,
        threats,
        scanTime: Date.now() - startTime
      };
    }
  }

  /**
   * Optimize file size without compromising quality
   */
  async optimizeFile(file: File): Promise<File> {
    // For images - basic compression
    if (file.type.startsWith('image/')) {
      return this.optimizeImage(file);
    }

    // For Office documents, we'll note that they need conversion first
    const extension = this.getFileExtension(file.name);
    if (['.docx', '.pptx'].includes(extension)) {
      throw new Error('Office documents must be converted to PDF before optimization');
    }

    // For text files, basic compression
    if (file.type === 'text/plain') {
      return this.optimizeTextFile(file);
    }

    // For PDF files, return as-is (no optimization in browser environment)
    return file;
  }

  private getFileExtension(filename: string): string {
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex !== -1 ? filename.substring(lastDotIndex).toLowerCase() : '';
  }

  private detectMimeType(file: File, extension: string): string {
    // Use browser-detected type first, fallback to extension-based detection
    const mimeTypeMap: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };

    return file.type || mimeTypeMap[extension] || 'application/octet-stream';
  }

  private detectSuspiciousFile(file: File, extension: string): boolean {
    // Check for double extensions
    const doubleExtensions = ['.exe.pdf', '.scr.pdf', '.bat.pdf'];
    const filename = file.name.toLowerCase();
    
    if (doubleExtensions.some(ext => filename.includes(ext))) {
      return true;
    }

    // Check for unusual characters in filename
    const suspiciousChars = /[<>:"|?*]/;
    if (suspiciousChars.test(filename)) {
      return true;
    }

    // Check for very long filenames (potential hiding)
    if (filename.length > 255) {
      return true;
    }

    return false;
  }

  private async checkFileSignature(file: File): Promise<void> {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);
    
    // Check for common file signatures
    const signatures = {
      pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
      png: [0x89, 0x50, 0x4E, 0x47],
      jpeg: [0xFF, 0xD8, 0xFF],
      zip: [0x50, 0x4B], // DOCX/PPTX are ZIP-based
    };

    const extension = this.getFileExtension(file.name);
    
    // For Office documents, check ZIP signature
    if (['.docx', '.pptx'].includes(extension)) {
      if (!(bytes[0] === 0x50 && bytes[1] === 0x4B)) {
        throw new Error('Invalid Office document signature');
      }
    }
  }

  private async scanFileContent(file: File, threats: SecurityThreat[]): Promise<void> {
    // Basic content scanning for suspicious patterns
    if (file.type === 'text/plain') {
      const content = await file.text();
      
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /eval\s*\(/i,
        /document\.write/i,
        /window\.open/i
      ];

      for (const pattern of suspiciousPatterns) {
        if (pattern.test(content)) {
          threats.push({
            type: 'malicious_content',
            severity: 'medium',
            description: 'Potentially malicious script content detected'
          });
        }
      }
    }
  }

  private async detectMacros(file: File, threats: SecurityThreat[]): Promise<void> {
    // For Office documents, check for macro indicators
    const extension = this.getFileExtension(file.name);
    if (['.docx', '.pptx'].includes(extension)) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const content = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
        
        // Look for macro-related strings
        if (content.includes('vbaProject') || content.includes('VBA')) {
          threats.push({
            type: 'suspicious_macro',
            severity: 'high',
            description: 'Office document contains VBA macros',
            location: 'document structure'
          });
        }
      } catch (error) {
        // If we can't read the content, flag as potentially suspicious
        threats.push({
          type: 'suspicious_macro',
          severity: 'low',
          description: 'Unable to scan for macros'
        });
      }
    }
  }

  private async checkHiddenContent(file: File, threats: SecurityThreat[]): Promise<void> {
    // Check for hidden or suspicious content in Office documents
    const extension = this.getFileExtension(file.name);
    if (['.docx', '.pptx'].includes(extension)) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const content = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
        
        // Look for hidden content indicators
        const hiddenPatterns = [
          /hidden/i,
          /invisible/i,
          /private/i,
          /confidential/i
        ];

        for (const pattern of hiddenPatterns) {
          if (pattern.test(content)) {
            threats.push({
              type: 'hidden_content',
              severity: 'low',
              description: 'Potentially hidden or sensitive content detected'
            });
            break;
          }
        }
      } catch (error) {
        // Silent fail for content scanning
      }
    }
  }

  private async optimizeImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      const img = new Image();

      img.onload = () => {
        // Calculate optimal dimensions
        const maxWidth = 1920;
        const maxHeight = 1080;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.85);
      };

      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  private async optimizeTextFile(file: File): Promise<File> {
    const content = await file.text();
    // Basic text optimization - remove extra whitespace
    const optimized = content.replace(/\s+/g, ' ').trim();
    
    return new File([optimized], file.name, { 
      type: 'text/plain', 
      lastModified: Date.now() 
    });
  }

  private createValidationResult(
    isValid: boolean, 
    errors: string[], 
    warnings: string[], 
    file: File
  ): ValidationResult {
    const extension = this.getFileExtension(file.name);
    const mimeType = this.detectMimeType(file, extension);

    return {
      isValid,
      errors,
      warnings,
      metadata: {
        fileSize: file.size,
        mimeType,
        extension,
        isSuspicious: false,
        requiresConversion: ['.docx', '.pptx'].includes(extension)
      }
    };
  }
}