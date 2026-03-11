import * as path from 'path';
import { sanitizePath, isPathTraversal, sanitizeFileName } from './pathUtils';

describe('pathUtils', () => {
  const basePath = '/app/data';

  describe('sanitizePath', () => {
    it('should allow valid paths within base directory', () => {
      const input = 'uploads/file.txt';
      const result = sanitizePath(basePath, input);
      expect(result).toBe(path.resolve(basePath, input));
    });

    it('should throw error for path traversal attempts with ..', () => {
      const input = '../../etc/passwd';
      expect(() => sanitizePath(basePath, input)).toThrow('Path traversal attempt detected');
    });

    it('should throw error for absolute paths outside base directory', () => {
      const input = '/etc/passwd';
      expect(() => sanitizePath(basePath, input)).toThrow('Path traversal attempt detected');
    });

    it('should allow valid paths with redundant components that stay within base', () => {
      const input = 'uploads/./../uploads/file.txt';
      const result = sanitizePath(basePath, input);
      expect(result).toBe(path.resolve(basePath, 'uploads/file.txt'));
    });
  });

  describe('isPathTraversal', () => {
    it('should detect ..', () => {
      expect(isPathTraversal('../../test')).toBe(true);
      expect(isPathTraversal('test/../test')).toBe(true);
    });

    it('should detect absolute paths', () => {
      expect(isPathTraversal('/etc/passwd')).toBe(true);
    });

    it('should not flag safe paths', () => {
      expect(isPathTraversal('uploads/file.txt')).toBe(false);
      expect(isPathTraversal('file.txt')).toBe(false);
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove path components', () => {
      expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
      expect(sanitizeFileName('folder/file.txt')).toBe('file.txt');
    });
  });
});
