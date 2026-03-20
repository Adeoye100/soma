export interface SanitizationOptions {
  stripScripts: boolean;
  normalizeUnicode: boolean;
  preventPathTraversal: boolean;
  maxLength?: number;
  allowedTags?: string[];
}

export interface SanitizedResult {
  text: string;
  warnings: string[];
  removedElements: string[];
}

export class TextSanitizer {
  private options: SanitizationOptions;

  constructor(options: Partial<SanitizationOptions> = {}) {
    this.options = {
      stripScripts: options.stripScripts ?? true,
      normalizeUnicode: options.normalizeUnicode ?? true,
      preventPathTraversal: options.preventPathTraversal ?? true,
      maxLength: options.maxLength ?? 10 * 1024 * 1024,
      allowedTags: options.allowedTags ?? []
    };
  }

  sanitize(input: string): SanitizedResult {
    const warnings: string[] = [];
    const removedElements: string[] = [];
    let text = input;

    if (text.length > this.options.maxLength!) {
      warnings.push(`Text truncated from ${text.length} to ${this.options.maxLength} characters`);
      text = text.substring(0, this.options.maxLength!);
    }

    if (this.options.stripScripts) {
      const { cleaned, removed } = this.stripScriptsAndDangerousContent(text);
      text = cleaned;
      removedElements.push(...removed);
    }

    if (this.options.normalizeUnicode) {
      text = this.normalizeUnicode(text);
    }

    if (this.options.preventPathTraversal) {
      text = this.preventPathTraversal(text);
    }

    return {
      text: text.trim(),
      warnings,
      removedElements
    };
  }

  private stripScriptsAndDangerousContent(text: string): { cleaned: string; removed: string[] } {
    const removed: string[] = [];

    const scriptPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
      /<embed\b[^>]*>/gi,
      /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
      /<!--[\s\S]*?-->/g,
      /<![CDATA\[[\s\S]*?\]]>/g
    ];

    for (const pattern of scriptPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        removed.push(...matches);
        text = text.replace(pattern, '');
      }
    }

    const eventHandlers = [
      /\s+on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]*)/gi,
      /javascript\s*:/gi,
      /data\s*:\s*text\/html/gi,
      /vbscript\s*:/gi
    ];

    for (const pattern of eventHandlers) {
      const matches = text.match(pattern);
      if (matches) {
        removed.push(...matches);
        text = text.replace(pattern, '');
      }
    }

    const dangerousAttrs = [
      /formaction\s*=/gi,
      /xlink:href\s*=/gi,
      /dynsrc\s*=/gi,
      /lowsrc\s*=/gi
    ];

    for (const pattern of dangerousAttrs) {
      if (pattern.test(text)) {
        removed.push(pattern.source);
        text = text.replace(pattern, '');
      }
    }

    return { cleaned: text, removed };
  }

  private normalizeUnicode(text: string): string {
    return text
      .normalize('NFC')
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
      .replace(/\uFEFF/g, '')
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/[\u00A0\u202F\u205F\u3000]/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  private preventPathTraversal(text: string): string {
    return text
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '')
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .replace(/[\x00-\x1F]/g, '');
  }

  preserveStructure(html: string): SanitizedResult {
    const warnings: string[] = [];
    const removedElements: string[] = [];
    let text = html;

    if (this.options.maxLength && text.length > this.options.maxLength) {
      warnings.push(`Text truncated from ${text.length} to ${this.options.maxLength} characters`);
      text = text.substring(0, this.options.maxLength!);
    }

    const scriptPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi
    ];

    for (const pattern of scriptPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        removedElements.push(...matches);
        text = text.replace(pattern, '');
      }
    }

    const eventHandlers = /\s+on\w+\s*=\s*(['"][^'"]*['"]|[^\s>]*)/gi;
    const handlerMatches = text.match(eventHandlers);
    if (handlerMatches) {
      removedElements.push(...handlerMatches);
      text = text.replace(eventHandlers, '');
    }

    const dangerousProtocols = /javascript\s*:/gi;
    text = text.replace(dangerousProtocols, '');

    text = this.normalizeUnicode(text);

    return {
      text: text.trim(),
      warnings,
      removedElements
    };
  }
}

export default TextSanitizer;
