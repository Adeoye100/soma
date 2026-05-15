// src/services/file-processing/TextSanitizer.ts

/**
 * Result of text sanitization
 */
export interface SanitizedResult {
  text: string              // ✅ This is the cleaned text property
  warnings: string[]
  removedPatterns: {
    malicious: number
    suspicious: number
    problematic: number
  }
  statistics: {
    originalLength: number
    sanitizedLength: number
    reductionPercent: number
  }
}

/**
 * Sanitizes user input text to remove malicious content
 */
export class TextSanitizer {
  private readonly maliciousPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /on\w+\s*=\s*["'][^"']*["']/gi,
    /javascript:/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi
  ]

  private readonly suspiciousPatterns = [
    /eval\(/gi,
    /expression\(/gi,
    /import\(/gi,
    /require\(/gi
  ]

  private readonly problematicPatterns = [
    /[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g,
    /[\uFDD0-\uFDEF\uFFFE\uFFFF]/g
  ]

  /**
   * Sanitize text input
   */
  sanitize(text: string): SanitizedResult {
    if (!text || typeof text !== 'string') {
      return {
        text: '',
        warnings: ['Input is not a valid string'],
        removedPatterns: { malicious: 0, suspicious: 0, problematic: 0 },
        statistics: {
          originalLength: 0,
          sanitizedLength: 0,
          reductionPercent: 0
        }
      }
    }

    const originalLength = text.length
    let sanitized = text
    let maliciousCount = 0
    let suspiciousCount = 0
    let problematicCount = 0
    const warnings: string[] = []

    // Remove malicious patterns
    this.maliciousPatterns.forEach(pattern => {
      const matches = sanitized.match(pattern)
      if (matches) {
        maliciousCount += matches.length
        warnings.push(`Removed ${matches.length} malicious pattern(s)`)
        sanitized = sanitized.replace(pattern, '')
      }
    })

    // Remove suspicious patterns
    this.suspiciousPatterns.forEach(pattern => {
      const matches = sanitized.match(pattern)
      if (matches) {
        suspiciousCount += matches.length
        warnings.push(`Removed ${matches.length} suspicious pattern(s)`)
        sanitized = sanitized.replace(pattern, '')
      }
    })

    // Remove problematic patterns
    this.problematicPatterns.forEach(pattern => {
      const matches = sanitized.match(pattern)
      if (matches) {
        problematicCount += matches.length
        sanitized = sanitized.replace(pattern, '')
      }
    })

    // Normalize whitespace
    sanitized = sanitized
        .replace(/\s+/g, ' ')
        .trim()

    // Escape HTML entities for safety
    sanitized = this.escapeHtml(sanitized)

    const sanitizedLength = sanitized.length
    const reductionPercent = originalLength > 0
        ? Math.round(((originalLength - sanitizedLength) / originalLength) * 100)
        : 0

    return {
      text: sanitized,  // ✅ THIS IS THE PROPERTY NAME
      warnings,
      removedPatterns: {
        malicious: maliciousCount,
        suspicious: suspiciousCount,
        problematic: problematicCount
      },
      statistics: {
        originalLength,
        sanitizedLength,
        reductionPercent
      }
    }
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;'
    }

    return text.replace(/[&<>"'\/]/g, char => escapeMap[char] || char)
  }

  /**
   * Check if text contains malicious content
   */
  isMalicious(text: string): boolean {
    return this.maliciousPatterns.some(pattern => pattern.test(text))
  }

  /**
   * Get sanitization statistics
   */
  getStatistics(original: string, sanitized: string): {
    reduction: number
    percent: number
  } {
    const reduction = original.length - sanitized.length
    const percent = original.length > 0
        ? Math.round((reduction / original.length) * 100)
        : 0

    return { reduction, percent }
  }
}

export default TextSanitizer