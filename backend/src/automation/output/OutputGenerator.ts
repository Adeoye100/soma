import { OutputGenerator as IOutputGenerator, GeneratedOutput, ValidationResult } from '../core/types';
import { BusinessRuleError } from '../../shared/errors';
import winston from 'winston';
import crypto from 'crypto';

/**
 * Base Output Generator - Common functionality for all output generators
 */
export abstract class BaseOutputGenerator implements IOutputGenerator {
  public abstract id: string;
  public abstract name: string;
  public abstract format: 'json' | 'xml' | 'html' | 'pdf' | 'csv' | 'custom';

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
        new winston.transports.File({ filename: 'logs/output-generators.log' })
      ]
    });
  }

  /**
   * Common validation logic
   */
  public validate(data: any): ValidationResult {
    const errors: string[] = [];

    if (!data) {
      errors.push('Data cannot be null or undefined');
    } else if (typeof data !== 'object') {
      errors.push('Data must be an object');
    }

    // Additional validation can be added by subclasses
    const additionalValidation = this.validateSpecific(data);
    errors.push(...additionalValidation.errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings: additionalValidation.warnings
    };
  }

  /**
   * Override this method for specific validation
   */
  protected validateSpecific(data: any): ValidationResult {
    return { valid: true, errors: [] };
  }

  /**
   * Common generation logic with error handling and metadata
   */
  protected async generateOutput(
    data: any, 
    transformationFn: (data: any) => any,
    options?: any
  ): Promise<GeneratedOutput> {
    const startTime = Date.now();

    try {
      // Validate input data
      const validation = this.validate(data);
      if (!validation.valid) {
        throw new BusinessRuleError('OUTPUT_VALIDATION_FAILED',
          `Output data validation failed: ${validation.errors.join(', ')}`,
          { generator: this.id, validationErrors: validation.errors }
        );
      }

      // Transform data to output format
      const transformedData = await transformationFn(data);
      
      // Generate metadata
      const metadata = {
        generatorId: this.id,
        generatorName: this.name,
        format: this.format,
        originalSize: JSON.stringify(data).length,
        outputSize: this.calculateOutputSize(transformedData),
        generationTime: Date.now() - startTime,
        checksum: this.generateChecksum(transformedData),
        timestamp: new Date().toISOString(),
        options: options || {},
        validationWarnings: validation.warnings
      };

      this.logger.info(`Output generated successfully`, {
        generator: this.id,
        format: this.format,
        generationTime: metadata.generationTime,
        outputSize: metadata.outputSize
      });

      return {
        content: transformedData,
        format: this.format,
        metadata,
        size: metadata.outputSize,
        checksum: metadata.checksum
      };

    } catch (error) {
      const generationTime = Date.now() - startTime;
      this.logger.error(`Output generation failed`, {
        generator: this.id,
        format: this.format,
        error: (error as Error).message,
        generationTime
      });

      throw new BusinessRuleError('OUTPUT_GENERATION_FAILED',
        `Failed to generate ${this.format} output: ${(error as Error).message}`,
        { generator: this.id, format: this.format, generationTime, originalError: error }
      );
    }
  }

  /**
   * Calculate output size (override for specific formats)
   */
  protected calculateOutputSize(content: any): number {
    return JSON.stringify(content).length;
  }

  /**
   * Generate checksum for data integrity
   */
  protected generateChecksum(data: any): string {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  public abstract generate(data: any, options?: any): Promise<GeneratedOutput>;
}

/**
 * JSON Output Generator - Generates formatted JSON output
 */
export class JsonOutputGenerator extends BaseOutputGenerator {
  public id = 'json-output-generator';
  public name = 'JSON Output Generator';
  public format = 'json' as const;

  protected validateSpecific(data: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular references
    try {
      JSON.stringify(data);
    } catch (error) {
      errors.push('Data contains circular references or non-serializable values');
    }

    // Check data size
    const size = JSON.stringify(data).length;
    if (size > 10000000) { // 10MB limit
      warnings.push('Large data size may impact performance');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  public async generate(data: any, options: {
    pretty?: boolean;
    includeMetadata?: boolean;
    filter?: (key: string, value: any) => boolean;
  } = {}): Promise<GeneratedOutput> {
    const { pretty = true, includeMetadata = true, filter } = options;

    return this.generateOutput(data, async (rawData) => {
      let processedData = rawData;

      // Apply filter if provided
      if (filter) {
        processedData = this.filterData(rawData, filter);
      }

      // Include metadata if requested
      if (includeMetadata) {
        processedData = {
          ...processedData,
          _metadata: {
            generatedAt: new Date().toISOString(),
            generator: this.id,
            format: this.format,
            version: '1.0'
          }
        };
      }

      // Generate JSON string
      const jsonString = pretty 
        ? JSON.stringify(processedData, null, 2)
        : JSON.stringify(processedData);

      return jsonString;
    }, options);
  }

  private filterData(data: any, filter: (key: string, value: any) => boolean): any {
    if (Array.isArray(data)) {
      return data.map(item => this.filterData(item, filter));
    } else if (typeof data === 'object' && data !== null) {
      const filtered: any = {};
      for (const [key, value] of Object.entries(data)) {
        if (filter(key, value)) {
          filtered[key] = this.filterData(value, filter);
        }
      }
      return filtered;
    }
    return data;
  }
}

/**
 * HTML Output Generator - Generates formatted HTML output
 */
export class HtmlOutputGenerator extends BaseOutputGenerator {
  public id = 'html-output-generator';
  public name = 'HTML Output Generator';
  public format = 'html' as const;

  protected validateSpecific(data: any): ValidationResult {
    const errors: string[] = [];

    // Check if data has content that can be rendered as HTML
    if (!data.content && !data.questions && !data.results) {
      errors.push('Data must contain content, questions, or results for HTML generation');
    }

    return { valid: errors.length === 0, errors };
  }

  public async generate(data: any, options: {
    title?: string;
    includeStyles?: boolean;
    template?: 'exam' | 'report' | 'dashboard' | 'custom';
  } = {}): Promise<GeneratedOutput> {
    const { title = 'Generated Report', includeStyles = true, template = 'report' } = options;

    return this.generateOutput(data, async (rawData) => {
      let htmlContent = '';

      switch (template) {
        case 'exam':
          htmlContent = this.generateExamHtml(rawData, title, includeStyles);
          break;
        case 'report':
          htmlContent = this.generateReportHtml(rawData, title, includeStyles);
          break;
        case 'dashboard':
          htmlContent = this.generateDashboardHtml(rawData, title, includeStyles);
          break;
        default:
          htmlContent = this.generateCustomHtml(rawData, title, includeStyles);
      }

      return htmlContent;
    }, options);
  }

  private generateExamHtml(data: any, title: string, includeStyles: boolean): string {
    const styles = includeStyles ? this.getExamStyles() : '';
    const questions = data.questions || [];
    const config = data.config || {};

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${styles}
</head>
<body>
    <div class="exam-container">
        <header class="exam-header">
            <h1>${title}</h1>
            <div class="exam-info">
                <p><strong>Type:</strong> ${config.type}</p>
                <p><strong>Difficulty:</strong> ${config.difficulty}</p>
                <p><strong>Questions:</strong> ${questions.length}</p>
                ${config.timeLimit ? `<p><strong>Time Limit:</strong> ${config.timeLimit} minutes</p>` : ''}
            </div>
        </header>
        
        <main class="exam-content">
            ${questions.map((q: any, index: number) => `
                <div class="question">
                    <h3>Question ${index + 1}</h3>
                    <p class="question-text">${q.question}</p>
                    ${q.options ? `
                        <div class="options">
                            ${q.options.map((opt: string, optIndex: number) => `
                                <div class="option">
                                    <input type="radio" id="q${index}_opt${optIndex}" name="q${index}" value="${opt}">
                                    <label for="q${index}_opt${optIndex}">${String.fromCharCode(65 + optIndex)}. ${opt}</label>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                    <div class="question-topic">
                        <small><strong>Topic:</strong> ${q.topic}</small>
                    </div>
                </div>
            `).join('')}
        </main>
    </div>
</body>
</html>`;
  }

  private generateReportHtml(data: any, title: string, includeStyles: boolean): string {
    const styles = includeStyles ? this.getReportStyles() : '';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${styles}
</head>
<body>
    <div class="report-container">
        <header class="report-header">
            <h1>${title}</h1>
            <p class="generated-at">Generated on ${new Date().toLocaleDateString()}</p>
        </header>
        
        <main class="report-content">
            ${this.renderDataAsHtml(data)}
        </main>
    </div>
</body>
</html>`;
  }

  private generateDashboardHtml(data: any, title: string, includeStyles: boolean): string {
    const styles = includeStyles ? this.getDashboardStyles() : '';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${styles}
</head>
<body>
    <div class="dashboard-container">
        <header class="dashboard-header">
            <h1>${title}</h1>
        </header>
        
        <main class="dashboard-content">
            <div class="metrics-grid">
                ${this.renderMetricsAsHtml(data)}
            </div>
            ${this.renderChartsAsHtml(data)}
        </main>
    </div>
</body>
</html>`;
  }

  private generateCustomHtml(data: any, title: string, includeStyles: boolean): string {
    const styles = includeStyles ? this.getBasicStyles() : '';
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    ${styles}
</head>
<body>
    <div class="custom-container">
        <h1>${title}</h1>
        <pre>${JSON.stringify(data, null, 2)}</pre>
    </div>
</body>
</html>`;
  }

  private renderDataAsHtml(data: any): string {
    if (Array.isArray(data)) {
      return `<ul>${data.map(item => `<li>${this.escapeHtml(JSON.stringify(item))}</li>`).join('')}</ul>`;
    } else if (typeof data === 'object') {
      return `<table>${Object.entries(data).map(([key, value]) => 
        `<tr><td><strong>${this.escapeHtml(key)}:</strong></td><td>${this.escapeHtml(String(value))}</td></tr>`
      ).join('')}</table>`;
    } else {
      return `<p>${this.escapeHtml(String(data))}</p>`;
    }
  }

  private renderMetricsAsHtml(data: any): string {
    const metrics = data.metrics || {};
    return Object.entries(metrics).map(([key, value]) => `
        <div class="metric-card">
            <h3>${this.escapeHtml(key)}</h3>
            <div class="metric-value">${value}</div>
        </div>
    `).join('');
  }

  private renderChartsAsHtml(data: any): string {
    // Simple placeholder for charts - in a real implementation, you'd use a charting library
    return `
        <div class="charts-section">
            <h2>Analytics</h2>
            <div class="chart-placeholder">
                <p>Charts would be rendered here based on data</p>
            </div>
        </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  private getExamStyles(): string {
    return `
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .exam-container { max-width: 800px; margin: 0 auto; }
            .exam-header { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .question { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
            .question-text { font-weight: bold; margin-bottom: 10px; }
            .options { margin: 10px 0; }
            .option { margin: 5px 0; }
            .question-topic { margin-top: 10px; color: #666; }
        </style>
    `;
  }

  private getReportStyles(): string {
    return `
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
            .report-container { max-width: 900px; margin: 0 auto; }
            .report-header { background: #f9f9f9; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
        </style>
    `;
  }

  private getDashboardStyles(): string {
    return `
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
            .dashboard-container { max-width: 1200px; margin: 0 auto; }
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
            .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .metric-value { font-size: 2em; font-weight: bold; color: #333; }
        </style>
    `;
  }

  private getBasicStyles(): string {
    return `
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            pre { background: #f4f4f4; padding: 15px; border-radius: 5px; overflow-x: auto; }
        </style>
    `;
  }
}

/**
 * CSV Output Generator - Generates CSV format output
 */
export class CsvOutputGenerator extends BaseOutputGenerator {
  public id = 'csv-output-generator';
  public name = 'CSV Output Generator';
  public format = 'csv' as const;

  protected validateSpecific(data: any): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(data)) {
      errors.push('CSV output requires array data');
    }

    return { valid: errors.length === 0, errors };
  }

  public async generate(data: any[], options: {
    delimiter?: string;
    headers?: string[];
    includeBOM?: boolean;
  } = {}): Promise<GeneratedOutput> {
    const { delimiter = ',', headers, includeBOM = false } = options;

    return this.generateOutput(data, async (rawData) => {
      if (!Array.isArray(rawData) || rawData.length === 0) {
        return '';
      }

      // Extract headers if not provided
      const csvHeaders = headers || this.extractHeaders(rawData);
      
      // Generate CSV content
      const csvRows = [
        csvHeaders.join(delimiter),
        ...rawData.map(row => this.formatCsvRow(row, csvHeaders, delimiter))
      ];

      let csvContent = csvRows.join('\\n');
      
      // Add BOM if requested (for Excel compatibility)
      if (includeBOM) {
        csvContent = '\\uFEFF' + csvContent;
      }

      return csvContent;
    }, options);
  }

  private extractHeaders(data: any[]): string[] {
    const headers = new Set<string>();
    data.forEach(row => {
      if (typeof row === 'object' && row !== null) {
        Object.keys(row).forEach(key => headers.add(key));
      }
    });
    return Array.from(headers);
  }

  private formatCsvRow(row: any, headers: string[], delimiter: string): string {
    return headers.map(header => {
      const value = row[header];
      return this.escapeCsvValue(value, delimiter);
    }).join(delimiter);
  }

  private escapeCsvValue(value: any, delimiter: string): string {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);
    
    // If value contains delimiter, quotes, or newlines, wrap in quotes and escape internal quotes
    if (stringValue.includes(delimiter) || stringValue.includes('"') || stringValue.includes('\\n')) {
      return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    
    return stringValue;
  }
}

/**
 * XML Output Generator - Generates XML format output
 */
export class XmlOutputGenerator extends BaseOutputGenerator {
  public id = 'xml-output-generator';
  public name = 'XML Output Generator';
  public format = 'xml' as const;

  public async generate(data: any, options: {
    rootElement?: string;
    encoding?: string;
    prettyPrint?: boolean;
  } = {}): Promise<GeneratedOutput> {
    const { rootElement = 'root', encoding = 'UTF-8', prettyPrint = true } = options;

    return this.generateOutput(data, async (rawData) => {
      const xmlDeclaration = `<?xml version="1.0" encoding="${encoding}"?>`;
      const xmlContent = this.objectToXml(rawData, rootElement, 0, prettyPrint);
      
      return `${xmlDeclaration}\\n${xmlContent}`;
    }, options);
  }

  private objectToXml(obj: any, elementName: string, indent: number, prettyPrint: boolean): string {
    const spaces = prettyPrint ? ' '.repeat(indent) : '';
    const newline = prettyPrint ? '\\n' : '';

    if (obj === null || obj === undefined) {
      return `${spaces}<${elementName}/>${newline}`;
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
      return `${spaces}<${elementName}>${this.escapeXml(String(obj))}</${elementName}>${newline}`;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.objectToXml(item, elementName, indent, prettyPrint)).join('');
    }

    if (typeof obj === 'object') {
      let xml = `${spaces}<${elementName}>${newline}`;
      
      for (const [key, value] of Object.entries(obj)) {
        xml += this.objectToXml(value, key, indent + 2, prettyPrint);
      }
      
      xml += `${spaces}</${elementName}>${newline}`;
      return xml;
    }

    return `${spaces}<${elementName}>${this.escapeXml(String(obj))}</${elementName}>${newline}`;
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/'/g, '&#x27;');
  }
}

/**
 * Output Generator Registry - Manages all output generators
 */
export class OutputGeneratorRegistry {
  private generators = new Map<string, IOutputGenerator>();
  private logger = winston.createLogger({
    level: 'info',
    format: winston.format.simple(),
    transports: [new winston.transports.Console()]
  });

  register(generator: IOutputGenerator): void {
    if (this.generators.has(generator.id)) {
      this.logger.warn(`Output generator ${generator.id} is being overwritten`);
    }
    
    this.generators.set(generator.id, generator);
    this.logger.info(`Output generator registered: ${generator.id}`);
  }

  get(generatorId: string): IOutputGenerator | undefined {
    return this.generators.get(generatorId);
  }

  getByFormat(format: string): IOutputGenerator | undefined {
    for (const generator of this.generators.values()) {
      if (generator.format === format) {
        return generator;
      }
    }
    return undefined;
  }

  getAll(): IOutputGenerator[] {
    return Array.from(this.generators.values());
  }

  async generateOutput(
    data: any, 
    format: string, 
    options?: any
  ): Promise<GeneratedOutput> {
    const generator = this.getByFormat(format);
    
    if (!generator) {
      throw new BusinessRuleError('OUTPUT_GENERATOR_NOT_FOUND',
        `No output generator found for format: ${format}`);
    }

    return generator.generate(data, options);
  }

  getSupportedFormats(): string[] {
    return Array.from(new Set(
      Array.from(this.generators.values()).map(g => g.format)
    ));
  }

  getStats() {
    const stats = {
      totalGenerators: this.generators.size,
      generators: Array.from(this.generators.values()).map(g => ({
        id: g.id,
        name: g.name,
        format: g.format
      })),
      supportedFormats: this.getSupportedFormats()
    };

    return stats;
  }
}

// Export singleton registry instance
export const outputGeneratorRegistry = new OutputGeneratorRegistry();

// Register default generators
outputGeneratorRegistry.register(new JsonOutputGenerator());
outputGeneratorRegistry.register(new HtmlOutputGenerator());
outputGeneratorRegistry.register(new CsvOutputGenerator());
outputGeneratorRegistry.register(new XmlOutputGenerator());