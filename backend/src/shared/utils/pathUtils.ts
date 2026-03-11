import * as path from 'path';

/**
 * Sanitizes a file path to prevent path traversal attacks.
 * It resolves the path and ensures it stays within the intended base directory.
 * 
 * @param basePath The allowed base directory
 * @param inputPath The user-provided or potentially unsafe path
 * @returns The absolute, sanitized path
 * @throws Error if the resolved path is outside the base directory
 */
export function sanitizePath(basePath: string, inputPath: string): string {
  const resolvedBase = path.resolve(basePath);
  const resolvedInput = path.resolve(basePath, inputPath);

  if (!resolvedInput.startsWith(resolvedBase)) {
    throw new Error(`Path traversal attempt detected: ${inputPath} is outside of ${basePath}`);
  }

  return resolvedInput;
}

/**
 * Checks if a filename or path contains any path traversal sequences.
 * 
 * @param fileName The filename or path to check
 * @returns true if the path is potentially dangerous
 */
export function isPathTraversal(fileName: string): boolean {
  if (fileName.includes('..')) {
    return true;
  }
  const normalized = path.normalize(fileName);
  return normalized.includes('..') || path.isAbsolute(normalized);
}

/**
 * Simple filename sanitizer that removes any path components.
 * 
 * @param fileName The filename to sanitize
 * @returns The base filename without any path components
 */
export function sanitizeFileName(fileName: string): string {
  return path.basename(fileName);
}
