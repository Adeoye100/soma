import { Request, Response, NextFunction } from 'express';
import winston from 'winston';

export interface ValidationRule {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => { valid: boolean; message?: string };
}

export interface RequestValidationOptions {
  rules: ValidationRule[];
  allowEmpty?: boolean;
  sanitize?: boolean;
  onValidationError?: (req: any, errors: ValidationError[]) => void;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  code: string;
}

/**
 * Enhanced request validation with content analysis
 */
export class RequestValidator {
  private options: RequestValidationOptions;
  private logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
  });

  constructor(options: RequestValidationOptions) {
    this.options = options;
  }

  /**
   * Check if content is essentially empty (whitespace only, common filler words)
   */
  private isEmptyContent(content: string): boolean {
    if (!content || typeof content !== 'string') return true;
    
    const trimmed = content.trim().toLowerCase();
    
    // Check for empty or whitespace-only content
    if (!trimmed) return true;
    
    // Common empty/filler patterns
    const emptyPatterns = [
      /^(none|na|n\/a|nothing|empty|blank|test|example|sample)$/i,
      /^(please|help|generate|create|make).*(exam|test|questions?).*$/i,
      /^(test|example|sample|demo)$/i,
      /^[0-9\s\-\_\.]+$/, // Numbers, spaces, dashes, underscores, periods
      /^[\s\W]*$/ // Only whitespace and non-word characters
    ];
    
    return emptyPatterns.some(pattern => pattern.test(trimmed));
  }

  /**
   * Check for suspicious/duplicate content patterns
   */
  private analyzeContent(content: any): { suspicious: boolean; reasons: string[] } {
    const reasons: string[] = [];
    
    if (typeof content === 'string') {
      // Check for repeated characters
      if (/(.)\1{10,}/.test(content)) {
        reasons.push('excessive_repeated_characters');
      }
      
      // Check for very short content that might be spam
      if (content.length < 3 && !this.isEmptyContent(content)) {
        reasons.push('content_too_short');
      }
      
      // Check for very long content that might be abuse
      if (content.length > 10000) {
        reasons.push('content_too_long');
      }
    }
    
    // Check for object with suspicious patterns
    if (typeof content === 'object' && content !== null) {
      const contentStr = JSON.stringify(content);
      
      // Check for repeated patterns in JSON
      const repeatedPatterns = contentStr.match(/"[^"]*"\s*:\s*"[^"]*"\s*,\s*"[^"]*"\s*:\s*"[^"]*"/g);
      if (repeatedPatterns && repeatedPatterns.length > 5) {
        reasons.push('excessive_repeated_patterns');
      }
    }
    
    return {
      suspicious: reasons.length > 0,
      reasons
    };
  }

  /**
   * Validate request content
   */
  validateContent(content: any): { valid: boolean; errors: ValidationError[]; sanitized?: any } {
    const errors: ValidationError[] = [];
    let sanitized = content;
    
    // Check for empty content
    if (this.isEmptyContent(JSON.stringify(content))) {
      errors.push({
        field: 'content',
        message: 'Request content cannot be empty. Please provide meaningful input.',
        value: content,
        code: 'EMPTY_CONTENT'
      });
      return { valid: false, errors };
    }
    
    // Analyze for suspicious patterns
    const analysis = this.analyzeContent(content);
    if (analysis.suspicious) {
      errors.push({
        field: 'content',
        message: `Request content appears suspicious: ${analysis.reasons.join(', ')}`,
        value: content,
        code: 'SUSPICIOUS_CONTENT'
      });
    }
    
    // Validate individual fields if rules are provided
    if (this.options.rules && Array.isArray(this.options.rules)) {
      const validationErrors = this.validateFields(content, this.options.rules);
      errors.push(...validationErrors);
    }
    
    // Sanitize content if requested and no errors
    if (this.options.sanitize && errors.length === 0) {
      sanitized = this.sanitizeContent(content);
    }
    
    return {
      valid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Validate individual fields based on rules
   */
  private validateFields(data: any, rules: ValidationRule[]): ValidationError[] {
    const errors: ValidationError[] = [];
    
    for (const rule of rules) {
      const value = this.getNestedValue(data, rule.field);
      
      // Required field validation
      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({
          field: rule.field,
          message: `${rule.field} is required`,
          value,
          code: 'REQUIRED_FIELD_MISSING'
        });
        continue;
      }
      
      // Skip other validations if field is empty and not required
      if (value === undefined || value === null || value === '') {
        continue;
      }
      
      // String-specific validations
      if (typeof value === 'string') {
        // Length validation
        if (rule.minLength && value.length < rule.minLength) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must be at least ${rule.minLength} characters long`,
            value,
            code: 'MIN_LENGTH_VIOLATION'
          });
        }
        
        if (rule.maxLength && value.length > rule.maxLength) {
          errors.push({
            field: rule.field,
            message: `${rule.field} must not exceed ${rule.maxLength} characters`,
            value,
            code: 'MAX_LENGTH_VIOLATION'
          });
        }
        
        // Pattern validation
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push({
            field: rule.field,
            message: `${rule.field} format is invalid`,
            value,
            code: 'PATTERN_VIOLATION'
          });
        }
      }
      
      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value);
        if (!customResult.valid) {
          errors.push({
            field: rule.field,
            message: customResult.message || `${rule.field} is invalid`,
            value,
            code: 'CUSTOM_VALIDATION_FAILED'
          });
        }
      }
    }
    
    return errors;
  }

  /**
   * Get nested object value using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Sanitize content by removing potentially harmful content
   */
  private sanitizeContent(content: any): any {
    if (typeof content === 'string') {
      // Remove excessive whitespace
      return content.replace(/\s+/g, ' ').trim();
    }
    
    if (typeof content === 'object' && content !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(content)) {
        if (typeof value === 'string') {
          sanitized[key] = this.sanitizeContent(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }
    
    return content;
  }

  /**
   * Generate validation error response
   */
  generateErrorResponse(errors: ValidationError[]): {
    error: string;
    message: string;
    code: string;
    details: ValidationError[];
  } {
    const primaryError = errors[0];
    const errorMessages = {
      EMPTY_CONTENT: 'Request content cannot be empty. Please provide meaningful input.',
      SUSPICIOUS_CONTENT: 'Request content appears to be invalid or suspicious.',
      REQUIRED_FIELD_MISSING: 'Required fields are missing from the request.',
      MIN_LENGTH_VIOLATION: 'One or more fields are too short.',
      MAX_LENGTH_VIOLATION: 'One or more fields exceed maximum length.',
      PATTERN_VIOLATION: 'One or more fields have invalid format.',
      CUSTOM_VALIDATION_FAILED: 'One or more fields failed custom validation.'
    };

    if (!primaryError) {
      return {
        error: 'Validation Failed',
        message: 'Request validation failed',
        code: 'VALIDATION_FAILED',
        details: errors
      };
    }

    return {
      error: 'Validation Failed',
      message: errorMessages[primaryError.code as keyof typeof errorMessages] || 
               primaryError.message || 
               'Request validation failed',
      code: primaryError.code,
      details: errors
    };
  }
}

/**
 * Create validation middleware
 */
export function createValidationMiddleware(options: RequestValidationOptions) {
  const validator = new RequestValidator(options);

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const content = req.body || req.query || req.params;
      const validation = validator.validateContent(content);

      if (!validation.valid) {
        const errorResponse = validator.generateErrorResponse(validation.errors);
        
        // Log validation failures for monitoring
        winston.warn('Request validation failed', {
          ip: req.ip,
          userId: (req as any).user?.id,
          path: req.path,
          method: req.method,
          errors: validation.errors.map(e => ({ field: e.field, code: e.code }))
        });

        // Call custom error handler if provided
        if (options.onValidationError) {
          options.onValidationError(req, validation.errors);
        }

        res.status(400).json(errorResponse);
        return;
      }

      // Replace req.body with sanitized content if available
      if (validation.sanitized && req.body) {
        req.body = validation.sanitized;
      }

      next();
    } catch (error) {
      winston.error('Request validation error:', error);
      res.status(500).json({
        error: 'Validation System Error',
        message: 'An error occurred during request validation',
        code: 'VALIDATION_SYSTEM_ERROR'
      });
    }
  };
}

/**
 * Predefined validation rules for common scenarios
 */

// Exam generation validation
export const examGenerationValidation = createValidationMiddleware({
  rules: [
    {
      field: 'topics',
      required: true,
      minLength: 2,
      maxLength: 500,
    },
    {
      field: 'type',
      required: true,
      custom: (value) => ({
        valid: ['OBJECTIVE', 'SHORT_ANSWER', 'ESSAY'].includes(value),
        message: 'Type must be OBJECTIVE, SHORT_ANSWER, or ESSAY'
      })
    },
    {
      field: 'difficulty',
      required: true,
      custom: (value) => ({
        valid: ['easy', 'medium', 'hard'].includes(value),
        message: 'Difficulty must be easy, medium, or hard'
      })
    },
    {
      field: 'numQuestions',
      required: true,
      custom: (value) => ({
        valid: typeof value === 'number' && value >= 1 && value <= 50,
        message: 'Number of questions must be between 1 and 50'
      })
    },
    {
      field: 'materials',
      required: true,
      custom: (value) => ({
        valid: Array.isArray(value) && value.length > 0 && value.length <= 10,
        message: 'Materials must be a non-empty array with maximum 10 items'
      })
    }
  ],
  sanitize: true,
  onValidationError: (req, errors) => {
    winston.warn('Exam generation validation failed', {
      userId: (req as any).user?.id,
      ip: req.ip,
      errors: errors.map(e => e.code)
    });
  }
});

// Answer submission validation
export const answerSubmissionValidation = createValidationMiddleware({
  rules: [
    {
      field: 'answer',
      required: true,
      minLength: 1,
      maxLength: 2000,
      custom: (value) => ({
        valid: typeof value === 'string' && value.trim().length > 0,
        message: 'Answer cannot be empty'
      })
    }
  ],
  sanitize: true
});

// Search/query validation
export const searchValidation = createValidationMiddleware({
  rules: [
    {
      field: 'query',
      required: true,
      minLength: 2,
      maxLength: 500,
      pattern: /^[a-zA-Z0-9\s\-\_\.\,\!\?\:\"\'\(\)\[\]\@\#\$\%\^\&\*\+\=]+$/
    }
  ],
  sanitize: true
});

/**
 * Empty content detection middleware (lightweight version)
 */
export const detectEmptyContent = (req: Request, res: Response, next: NextFunction) => {
  const content = JSON.stringify(req.body || req.query || req.params);
  
  // Quick empty content check
  const trimmed = content.trim().toLowerCase();
  const emptyPatterns = [
    '{}', '[]', '""', "''", 'null', 'undefined',
    'none', 'na', 'n/a', 'nothing', 'empty', 'blank'
  ];
  
  if (emptyPatterns.includes(trimmed) || !trimmed || trimmed === '""') {
    res.status(400).json({
      error: 'Invalid Content',
      message: 'Request cannot be empty. Please provide meaningful input.',
      code: 'EMPTY_CONTENT'
    });
    return;
  }
  
  next();
};

export default RequestValidator;