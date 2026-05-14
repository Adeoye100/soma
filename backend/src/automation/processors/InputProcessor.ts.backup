import { InputProcessor as IInputProcessor, ProcessedInput, ValidationResult } from '../core/types';
import { BusinessRuleError, ValidationError } from '../../shared/errors';
import winston from 'winston';
import crypto from 'crypto';

/**
 * Base Input Processor - Provides common functionality for all input processors
 */
export abstract class BaseInputProcessor implements IInputProcessor {
  public abstract id: string;
  public abstract name: string;
  public abstract priority: number;

  protected logger: winston.Logger;

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/input-processors.log' })
      ]
    });
  }

  /**
   * Common validation logic
   */
  protected validateInput(input: any, requiredFields: string[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if input is provided
    if (!input) {
      errors.push('Input cannot be null or undefined');
      return { valid: false, errors, warnings };
    }

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in input) || input[field] === null || input[field] === undefined) {
        errors.push(`Required field '${field}' is missing`);
      }
    }

    // Additional validation can be added by subclasses
    const additionalValidation = this.validate(input);
    errors.push(...additionalValidation.errors);
    warnings.push(...(additionalValidation.warnings || []));

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Override this method for additional validation
   */
  public validate(input: any): ValidationResult {
    return { valid: true, errors: [] };
  }

  /**
   * Common processing logic
   */
  protected async processInput(input: any, transformationFn: (input: any) => any): Promise<ProcessedInput> {
    const startTime = Date.now();
    
    try {
      // Validate input
      const validation = this.validateInput(input, this.getRequiredFields());
      if (!validation.valid) {
        throw new ValidationError(`Input validation failed: ${validation.errors.join(', ')}`, {
          processor: this.id,
          validationErrors: validation.errors,
          warnings: validation.warnings
        });
      }

      // Transform input
      const transformedData = await transformationFn(input);
      
      // Generate metadata
      const metadata = {
        processorId: this.id,
        processorName: this.name,
        originalSize: JSON.stringify(input).length,
        processedSize: JSON.stringify(transformedData).length,
        processingTime: Date.now() - startTime,
        checksum: this.generateChecksum(transformedData),
        timestamp: new Date().toISOString(),
        validationWarnings: validation.warnings
      };

      this.logger.info(`Input processed successfully`, {
        processor: this.id,
        processingTime: metadata.processingTime,
        originalSize: metadata.originalSize,
        processedSize: metadata.processedSize
      });

      return {
        data: transformedData,
        metadata,
        validationErrors: validation.warnings || undefined
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(`Input processing failed`, {
        processor: this.id,
        error: (error as Error).message,
        processingTime,
        inputType: typeof input,
        inputKeys: input ? Object.keys(input) : []
      });

      throw new BusinessRuleError('INPUT_PROCESSING_FAILED', 
        `Input processing failed in ${this.name}: ${(error as Error).message}`, 
        { processor: this.id, processingTime, originalError: error }
      );
    }
  }

  /**
   * Get required fields for validation - override in subclasses
   */
  protected abstract getRequiredFields(): string[];

  /**
   * Generate checksum for data integrity
   */
  protected generateChecksum(data: any): string {
    const jsonString = JSON.stringify(data);
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Abstract methods to be implemented by subclasses
   */
  public abstract process(input: any): Promise<ProcessedInput>;
}

/**
 * Material Input Processor - Handles course materials and documents
 */
export class MaterialInputProcessor extends BaseInputProcessor {
  public id = 'material-processor';
  public name = 'Material Input Processor';
  public priority = 1;

  private supportedMimeTypes = new Set([
    'application/pdf',
    'text/plain',
    'text/markdown',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]);

  protected getRequiredFields(): string[] {
    return ['content', 'mimeType'];
  }

  public validate(input: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate MIME type
    if (!this.supportedMimeTypes.has(input.mimeType)) {
      warnings.push(`MIME type '${input.mimeType}' may not be fully supported. Consider converting to PDF or text.`);
    }

    // Validate content
    if (typeof input.content !== 'string') {
      errors.push('Content must be a string');
    } else if (input.content.trim().length === 0) {
      errors.push('Content cannot be empty');
    } else if (input.content.length > 1000000) { // 1MB limit
      errors.push('Content exceeds maximum size limit of 1MB');
    }

    // Validate title if provided
    if (input.title && typeof input.title !== 'string') {
      errors.push('Title must be a string if provided');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public async process(input: any): Promise<ProcessedInput> {
    return this.processInput(input, async (rawInput) => {
      // Clean and normalize content
      const cleanedContent = this.cleanContent(rawInput.content);
      
      // Extract metadata from content
      const extractedMetadata = this.extractMetadata(cleanedContent, rawInput);
      
      // Generate topics preview
      const topicsPreview = this.extractTopicsPreview(cleanedContent);

      return {
        ...rawInput,
        content: cleanedContent,
        processedAt: new Date().toISOString(),
        wordCount: cleanedContent.split(/\s+/).length,
        characterCount: cleanedContent.length,
        extractedMetadata,
        topicsPreview,
        processingVersion: '1.0'
      };
    });
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\t/g, '  ') // Replace tabs with spaces
      .replace(/[^\S\n]+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive line breaks
      .trim();
  }

  private extractMetadata(content: string, originalInput: any): any {
    const lines = content.split('\n');
    const metadata: any = {
      firstLine: lines[0] || '',
      lastLine: lines[lines.length - 1] || '',
      totalLines: lines.length,
      averageLineLength: lines.length > 0 ? content.length / lines.length : 0,
      hasHeaders: this.detectHeaders(content),
      estimatedReadingTime: Math.ceil(content.split(/\s+/).length / 200) // 200 words per minute
    };

    // Extract potential titles from headers
    if (originalInput.title) {
      metadata.providedTitle = originalInput.title;
    } else {
      const potentialTitle = this.extractPotentialTitle(content);
      if (potentialTitle) {
        metadata.extractedTitle = potentialTitle;
      }
    }

    return metadata;
  }

  private extractTopicsPreview(content: string): string[] {
    // Simple topic extraction based on frequency analysis
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Count word frequencies
    const wordCount: Record<string, number> = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Get top topics (excluding common words)
    const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time']);
    
    return Object.entries(wordCount)
      .filter(([word, count]) => !stopWords.has(word) && count > 2)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private detectHeaders(content: string): boolean {
    const headerPatterns = [
      /^#{1,6}\s+.+$/m, // Markdown headers
      /^[A-Z][^.!?]*:$/m, // All caps followed by colon
      /^\d+\.\s+.+$/m, // Numbered lists
    ];

    return headerPatterns.some(pattern => pattern.test(content));
  }

  private extractPotentialTitle(content: string): string | null {
    const lines = content.split('\n').filter(line => line.trim().length > 0);
    
    // Look for the first substantial line that's not a header
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      if (trimmed.length > 5 && trimmed.length < 100 && !trimmed.endsWith(':')) {
        return trimmed;
      }
    }

    return null;
  }
}

/**
 * Exam Configuration Input Processor - Handles exam setup parameters
 */
export class ExamConfigInputProcessor extends BaseInputProcessor {
  public id = 'exam-config-processor';
  public name = 'Exam Configuration Input Processor';
  public priority = 2;

  private validExamTypes = ['OBJECTIVE', 'SHORT_ANSWER', 'ESSAY'];
  private validDifficulties = ['easy', 'medium', 'hard'];

  protected getRequiredFields(): string[] {
    return ['type', 'difficulty', 'numQuestions'];
  }

  public validate(input: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate exam type
    if (!this.validExamTypes.includes(input.type)) {
      errors.push(`Invalid exam type '${input.type}'. Must be one of: ${this.validExamTypes.join(', ')}`);
    }

    // Validate difficulty
    if (!this.validDifficulties.includes(input.difficulty)) {
      errors.push(`Invalid difficulty '${input.difficulty}'. Must be one of: ${this.validDifficulties.join(', ')}`);
    }

    // Validate number of questions
    if (typeof input.numQuestions !== 'number' || input.numQuestions < 1 || input.numQuestions > 100) {
      errors.push('Number of questions must be between 1 and 100');
    }

    // Validate time limit if provided
    if (input.timeLimit && (typeof input.timeLimit !== 'number' || input.timeLimit < 1)) {
      errors.push('Time limit must be a positive number (in minutes)');
    }

    // Warnings for suboptimal configurations
    if (input.numQuestions > 50) {
      warnings.push('High number of questions may impact generation time and quality');
    }

    if (input.type === 'ESSAY' && input.numQuestions > 10) {
      warnings.push('Essay questions with high quantity may be time-consuming for students');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public async process(input: any): Promise<ProcessedInput> {
    return this.processInput(input, async (rawInput) => {
      // Normalize and enrich configuration
      const config = {
        ...rawInput,
        type: rawInput.type.toUpperCase(),
        difficulty: rawInput.difficulty.toLowerCase(),
        processedAt: new Date().toISOString(),
        estimatedGenerationTime: this.estimateGenerationTime(rawInput),
        suggestedTopics: rawInput.suggestedTopics || [],
        questionTypes: this.inferQuestionTypes(rawInput.type),
        scoring: {
          maxScore: rawInput.type === 'OBJECTIVE' ? rawInput.numQuestions * 10 : 100,
          passingScore: rawInput.type === 'OBJECTIVE' ? Math.ceil(rawInput.numQuestions * 6) : 60
        }
      };

      return config;
    });
  }

  private estimateGenerationTime(config: any): number {
    // Base time per question based on type and difficulty
    const baseTimePerQuestion = {
      'OBJECTIVE': { easy: 5, medium: 8, hard: 12 },
      'SHORT_ANSWER': { easy: 15, medium: 25, hard: 40 },
      'ESSAY': { easy: 30, medium: 45, hard: 60 }
    };

    const baseTime = (baseTimePerQuestion as any)[config.type][config.difficulty];
    const totalTime = baseTime * config.numQuestions;
    
    // Add overhead for processing and validation
    return Math.ceil(totalTime * 1.2);
  }

  private inferQuestionTypes(type: string): string[] {
    switch (type) {
      case 'OBJECTIVE':
        return ['multiple-choice', 'true-false', 'fill-in-blank'];
      case 'SHORT_ANSWER':
        return ['brief-response', 'definition', 'explanation'];
      case 'ESSAY':
        return ['analytical-essay', 'descriptive-essay', 'argumentative-essay'];
      default:
        return ['custom'];
    }
  }
}

/**
 * User Input Processor - Handles user profile and preferences
 */
export class UserInputProcessor extends BaseInputProcessor {
  public id = 'user-input-processor';
  public name = 'User Input Processor';
  public priority = 3;

  protected getRequiredFields(): string[] {
    return ['userId'];
  }

  public validate(input: any): ValidationResult {
    const errors: string[] = [];

    if (!input.userId || typeof input.userId !== 'string') {
      errors.push('Valid userId is required');
    }

    if (input.preferences && typeof input.preferences !== 'object') {
      errors.push('Preferences must be an object if provided');
    }

    return { valid: errors.length === 0, errors };
  }

  public async process(input: any): Promise<ProcessedInput> {
    return this.processInput(input, async (rawInput) => {
      // Enrich user data with default preferences
      const processedUser = {
        ...rawInput,
        preferences: {
          theme: rawInput.preferences?.theme || 'light',
          language: rawInput.preferences?.language || 'en',
          notifications: rawInput.preferences?.notifications ?? true,
          autoSave: rawInput.preferences?.autoSave ?? true,
          ...rawInput.preferences
        },
        processingMetadata: {
          processedAt: new Date().toISOString(),
          version: '1.0',
          source: rawInput.source || 'manual'
        }
      };

      return processedUser;
    });
  }
}

/**
 * Input Processor Registry - Manages all input processors
 */
export class InputProcessorRegistry {
  private processors = new Map<string, IInputProcessor>();
  private logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
  });

  register(processor: IInputProcessor): void {
    if (this.processors.has(processor.id)) {
      this.logger.warn(`Processor ${processor.id} is being overwritten`);
    }
    
    this.processors.set(processor.id, processor);
    this.logger.info(`Input processor registered: ${processor.id}`);
  }

  get(processorId: string): IInputProcessor | undefined {
    return this.processors.get(processorId);
  }

  getAll(): IInputProcessor[] {
    return Array.from(this.processors.values())
      .sort((a, b) => b.priority - a.priority); // Sort by priority (higher first)
  }

  async processInput(input: any, preferredProcessorId?: string): Promise<ProcessedInput> {
    let processor: IInputProcessor | undefined;

    // Use preferred processor if specified
    if (preferredProcessorId) {
      processor = this.get(preferredProcessorId);
      if (!processor) {
        throw new BusinessRuleError('PROCESSOR_NOT_FOUND', 
          `Preferred processor '${preferredProcessorId}' not found`);
      }
    } else {
      // Auto-select best processor
      processor = this.findBestProcessor(input);
    }

    if (!processor) {
      throw new BusinessRuleError('NO_SUITABLE_PROCESSOR', 
        'No suitable input processor found for the provided input');
    }

    return processor.process(input);
  }

  private findBestProcessor(input: any): IInputProcessor | undefined {
    const processors = this.getAll();
    
    // Try each processor to see if it can handle the input
    for (const processor of processors) {
      try {
        const validation = processor.validate(input);
        if (validation.valid) {
          return processor;
        }
      } catch (error) {
        // Continue to next processor
        continue;
      }
    }

    return undefined;
  }

  getStats() {
    const stats = {
      totalProcessors: this.processors.size,
      processors: Array.from(this.processors.values()).map(p => ({
        id: p.id,
        name: p.name,
        priority: p.priority
      }))
    };

    return stats;
  }
}

// Export singleton registry instance
export const inputProcessorRegistry = new InputProcessorRegistry();

// Register default processors
inputProcessorRegistry.register(new MaterialInputProcessor());
inputProcessorRegistry.register(new ExamConfigInputProcessor());
inputProcessorRegistry.register(new UserInputProcessor());