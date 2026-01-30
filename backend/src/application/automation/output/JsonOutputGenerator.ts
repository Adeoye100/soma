import { OutputGenerator } from './OutputGenerator';
import { ServiceResult } from '../../../shared/types';
import { ProcessingResult } from '../../../shared/types';

/**
 * Concrete implementation of OutputGenerator for JSON format output
 * Handles JSON data formatting, validation, and distribution
 */
export class JsonOutputGenerator extends OutputGenerator {
  constructor() {
    super({
      id: 'json-output-generator',
      name: 'JSON Output Generator',
      version: '1.0.0',
      supportedFormats: ['json', 'json-pretty', 'json-minified'],
      config: {
        indent: 2,
        sortKeys: false,
        includeMetadata: true,
        compressionEnabled: false
      },
      enabled: true
    });
  }

  /**
   * Generate JSON output from processed data
   */
  async generate(data: any, format: string = 'json'): Promise<ServiceResult<ProcessingResult>> {
    try {
      const startTime = Date.now();
      
      // Transform data based on format
      const transformedData = await this.transform(data, format);
      
      if (!transformedData.success) {
        return transformedData as ServiceResult<ProcessingResult>;
      }

      // Create processing result
      const result: ProcessingResult = {
        id: this.generateResultId(),
        format: format,
        content: transformedData.data,
        metadata: {
          generatedAt: new Date().toISOString(),
          generatorId: this.id,
          dataSize: JSON.stringify(transformedData.data).length,
          format: format,
          version: this.version
        },
        status: 'completed',
        executionTime: Date.now() - startTime
      };

      return {
        success: true,
        data: result,
        metadata: { 
          executionTime: Date.now() - startTime,
          outputSize: JSON.stringify(result.content).length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'JSON_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'JSON generation failed',
          details: error
        }
      };
    }
  }

  /**
   * Validate JSON format
   */
  async validateFormat(format: string): Promise<ServiceResult<boolean>> {
    const supported = this.supportedFormats.includes(format);
    
    return {
      success: true,
      data: supported,
      metadata: { executionTime: 0 }
    };
  }

  /**
   * Transform data for JSON format
   */
  async transform(data: any, format: string): Promise<ServiceResult<any>> {
    try {
      let transformedData: any;

      switch (format) {
        case 'json-pretty':
          transformedData = this.formatJson(data, true);
          break;
        case 'json-minified':
          transformedData = this.formatJson(data, false);
          break;
        case 'json':
        default:
          transformedData = this.formatJson(data, true);
          break;
      }

      // Add metadata if enabled
      if (this.config.includeMetadata) {
        transformedData = {
          data: transformedData,
          metadata: {
            generatedAt: new Date().toISOString(),
            generatorId: this.id,
            version: this.version,
            originalDataSize: JSON.stringify(data).length,
            transformedDataSize: JSON.stringify(transformedData).length
          }
        };
      }

      return {
        success: true,
        data: transformedData,
        metadata: { executionTime: 0 }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'JSON_TRANSFORMATION_FAILED',
          message: error instanceof Error ? error.message : 'JSON transformation failed',
          details: error
        }
      };
    }
  }

  /**
   * Distribute JSON output to targets
   */
  async distribute(result: ProcessingResult, targets: string[] = []): Promise<ServiceResult<any>> {
    try {
      const distributions: any[] = [];
      
      for (const target of targets) {
        switch (target.toLowerCase()) {
          case 'api':
          case 'webhook':
            distributions.push({
              target,
              status: 'success',
              data: await this.sendToApi(result.content),
              timestamp: new Date().toISOString()
            });
            break;
          case 'database':
          case 'db':
            distributions.push({
              target,
              status: 'success',
              data: await this.saveToDatabase(result.content),
              timestamp: new Date().toISOString()
            });
            break;
          case 'file':
          case 'filesystem':
            distributions.push({
              target,
              status: 'success',
              data: await this.saveToFile(result.content),
              timestamp: new Date().toISOString()
            });
            break;
          case 'console':
          default:
            distributions.push({
              target,
              status: 'success',
              data: console.log(result.content),
              timestamp: new Date().toISOString()
            });
            break;
        }
      }

      return {
        success: true,
        data: {
          distributions,
          totalTargets: targets.length,
          successfulDistributions: distributions.filter(d => d.status === 'success').length
        },
        metadata: { executionTime: 0 }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'JSON_DISTRIBUTION_FAILED',
          message: error instanceof Error ? error.message : 'JSON distribution failed',
          details: error
        }
      };
    }
  }

  /**
   * Format JSON data
   */
  private formatJson(data: any, pretty: boolean = true): any {
    if (pretty) {
      return JSON.parse(JSON.stringify(data, null, this.config.indent));
    } else {
      return JSON.parse(JSON.stringify(data));
    }
  }

  /**
   * Generate unique result ID
   */
  private generateResultId(): string {
    return `json-result-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send data to API endpoint
   */
  private async sendToApi(data: any): Promise<any> {
    // Placeholder implementation
    return {
      endpoint: '/api/webhook',
      method: 'POST',
      status: 200,
      response: { success: true, message: 'Data sent to API' }
    };
  }

  /**
   * Save data to database
   */
  private async saveToDatabase(data: any): Promise<any> {
    // Placeholder implementation
    return {
      table: 'automation_outputs',
      operation: 'INSERT',
      status: 'success',
      recordsAffected: 1
    };
  }

  /**
   * Save data to file
   */
  private async saveToFile(data: any): Promise<any> {
    // Placeholder implementation
    return {
      filename: `output-${Date.now()}.json`,
      path: './outputs/',
      status: 'success',
      size: JSON.stringify(data).length
    };
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
        lastGenerated: null,
        averageOutputSize: 0,
        successRate: 100,
        compressionEnabled: this.config.compressionEnabled
      },
      metadata: { executionTime: 0 }
    };
  }
}