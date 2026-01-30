import { OutputGenerator as IOutputGenerator } from '../../../shared/types';
import { ServiceResult } from '../../../shared/types';
import { ProcessingResult } from '../../../shared/types';

/**
 * Base class for generating outputs from processed data
 * Handles formatting, validation, and distribution of results
 */
export abstract class OutputGenerator implements IOutputGenerator {
  public readonly id: string;
  public readonly name: string;
  public readonly version: string;
  public readonly supportedFormats: string[];
  public readonly config: any;
  public readonly enabled: boolean;

  constructor(generator: IOutputGenerator) {
    this.id = generator.id;
    this.name = generator.name;
    this.version = generator.version;
    this.supportedFormats = generator.supportedFormats;
    this.config = generator.config;
    this.enabled = generator.enabled;
  }

  /**
   * Generate output from processed data
   */
  abstract generate(data: any, format?: string): Promise<ServiceResult<ProcessingResult>>;

  /**
   * Validate output format
   */
  abstract validateFormat(format: string): Promise<ServiceResult<boolean>>;

  /**
   * Transform data for specific output format
   */
  abstract transform(data: any, format: string): Promise<ServiceResult<any>>;

  /**
   * Distribute output to target systems
   */
  abstract distribute(result: ProcessingResult, targets?: string[]): Promise<ServiceResult<any>>;

  /**
   * Get supported output formats
   */
  async getSupportedFormats(): Promise<ServiceResult<string[]>> {
    return {
      success: true,
      data: this.supportedFormats,
      metadata: { executionTime: 0 }
    };
  }

  /**
   * Check if a format is supported
   */
  async isFormatSupported(format: string): Promise<ServiceResult<boolean>> {
    return {
      success: true,
      data: this.supportedFormats.includes(format),
      metadata: { executionTime: 0 }
    };
  }

  /**
   * Generate multiple output formats
   */
  async generateMultipleFormats(data: any, formats: string[]): Promise<ServiceResult<ProcessingResult[]>> {
    try {
      const results: ProcessingResult[] = [];
      
      for (const format of formats) {
        if (this.supportedFormats.includes(format)) {
          const result = await this.generate(data, format);
          if (result.success) {
            results.push(result.data);
          }
        }
      }

      return {
        success: true,
        data: results,
        metadata: { 
          executionTime: 0,
          processedFormats: formats.length,
          successfulFormats: results.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'MULTI_FORMAT_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Multiple format generation failed',
          details: error
        }
      };
    }
  }

  /**
   * Format output for different destinations
   */
  async formatForDestination(data: any, destination: string): Promise<ServiceResult<any>> {
    try {
      // Default implementation - can be overridden
      let format = 'json';
      
      // Determine format based on destination
      switch (destination.toLowerCase()) {
        case 'email':
        case 'smtp':
          format = 'email';
          break;
        case 'webhook':
        case 'api':
          format = 'json';
          break;
        case 'database':
        case 'db':
          format = 'database';
          break;
        case 'file':
        case 'filesystem':
          format = 'file';
          break;
        default:
          format = 'json';
      }

      const result = await this.transform(data, format);
      return {
        success: true,
        data: {
          content: result.data,
          format: format,
          destination: destination,
          metadata: {
            generatedAt: new Date().toISOString(),
            generatorId: this.id
          }
        },
        metadata: { executionTime: 0 }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'DESTINATION_FORMATTING_FAILED',
          message: error instanceof Error ? error.message : 'Destination formatting failed',
          details: error
        }
      };
    }
  }

  /**
   * Get generator statistics
   */
  async getStats(): Promise<ServiceResult<any>> {
    return {
      success: true,
      data: {
        generatorId: this.id,
        generatorName: this.name,
        version: this.version,
        supportedFormats: this.supportedFormats,
        enabled: this.enabled,
        totalGenerations: 0,
        lastGenerated: null
      },
      metadata: { executionTime: 0 }
    };
  }

  /**
   * Validate output data
   */
  async validateOutput(data: any, format: string): Promise<ServiceResult<boolean>> {
    try {
      // Basic validation logic
      const isValid = data && typeof data === 'object';
      
      // Additional format-specific validation can be implemented
      if (format === 'json') {
        try {
          JSON.stringify(data);
        } catch {
          return {
            success: true,
            data: false,
            metadata: { executionTime: 0 }
          };
        }
      }

      return {
        success: true,
        data: isValid,
        metadata: { executionTime: 0 }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'OUTPUT_VALIDATION_FAILED',
          message: error instanceof Error ? error.message : 'Output validation failed',
          details: error
        }
      };
    }
  }

  /**
   * Compress output for storage or transmission
   */
  async compress(data: any, algorithm: string = 'gzip'): Promise<ServiceResult<any>> {
    try {
      // Basic compression logic - can be enhanced with actual compression libraries
      const compressed = {
        data: data,
        algorithm: algorithm,
        originalSize: JSON.stringify(data).length,
        compressed: false // Placeholder
      };

      return {
        success: true,
        data: compressed,
        metadata: { executionTime: 0 }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'COMPRESSION_FAILED',
          message: error instanceof Error ? error.message : 'Compression failed',
          details: error
        }
      };
    }
  }
}