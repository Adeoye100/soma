import { TempFileManager } from '../types/documentProcessing';
import { loggingService } from './loggingService';

interface TempFileInfo {
  path: string;
  createdAt: Date;
  size: number;
  mimeType: string;
  extension: string;
  cleanupTimer?: NodeJS.Timeout;
  accessCount: number;
  lastAccessed: Date;
}

export class SecureTempFileManager implements TempFileManager {
  private tempFiles: Map<string, TempFileInfo> = new Map();
  private maxFiles: number = 100;
  private maxFileSize: number = 50 * 1024 * 1024; // 50MB
  private cleanupInterval: NodeJS.Timeout;
  private memoryPressure: boolean = false;

  constructor() {
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.performCleanup();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Monitor memory usage
    this.startMemoryMonitoring();
    
    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.emergencyCleanup();
    });
  }

  /**
   * Create a temporary file with secure handling
   */
  createTempFile(extension: string = '.tmp'): { path: string; cleanup: () => void } {
    const fileId = this.generateFileId();
    const timestamp = Date.now();
    const path = `temp_${timestamp}_${fileId}${extension}`;

    // Check if we're at capacity
    if (this.tempFiles.size >= this.maxFiles) {
      this.cleanupOldestFiles(10); // Remove 10 oldest files
    }

    const tempFileInfo: TempFileInfo = {
      path,
      createdAt: new Date(),
      size: 0,
      mimeType: this.getMimeTypeForExtension(extension),
      extension,
      accessCount: 0,
      lastAccessed: new Date()
    };

    this.tempFiles.set(path, tempFileInfo);

    loggingService.debug('TempFileManager', `Created temp file: ${path}`);

    const cleanup = () => {
      this.deleteTempFile(path);
    };

    return { path, cleanup };
  }

  /**
   * Schedule cleanup for a specific file
   */
  scheduleCleanup(path: string, delay: number = 30 * 60 * 1000): void { // 30 minutes default
    const tempFile = this.tempFiles.get(path);
    if (!tempFile) {
      return;
    }

    // Clear existing timer
    if (tempFile.cleanupTimer) {
      clearTimeout(tempFile.cleanupTimer);
    }

    // Set new timer
    tempFile.cleanupTimer = setTimeout(() => {
      this.deleteTempFile(path);
    }, delay);

    loggingService.debug('TempFileManager', `Scheduled cleanup for ${path} in ${delay}ms`);
  }

  /**
   * Clean up expired files
   */
  cleanupExpired(): void {
    const now = Date.now();
    const expiredPaths: string[] = [];

    for (const [path, info] of this.tempFiles) {
      const age = now - info.createdAt.getTime();
      const maxAge = this.memoryPressure ? 10 * 60 * 1000 : 60 * 60 * 1000; // 10min if memory pressure, 1hr normally

      if (age > maxAge) {
        expiredPaths.push(path);
      }
    }

    for (const path of expiredPaths) {
      this.deleteTempFile(path);
    }

    loggingService.debug('TempFileManager', `Cleaned up ${expiredPaths.length} expired files`);
  }

  /**
   * Get current count of temporary files
   */
  getTempFilesCount(): number {
    return this.tempFiles.size;
  }

  /**
   * Get detailed info about all temporary files
   */
  getTempFilesInfo(): TempFileInfo[] {
    return Array.from(this.tempFiles.values());
  }

  /**
   * Check if memory pressure is detected
   */
  isMemoryPressure(): boolean {
    return this.memoryPressure;
  }

  /**
   * Force cleanup of oldest files
   */
  cleanupOldestFiles(count: number = 5): void {
    const files = Array.from(this.tempFiles.entries())
      .sort(([, a], [, b]) => a.createdAt.getTime() - b.createdAt.getTime());

    const toDelete = files.slice(0, Math.min(count, files.length));
    
    for (const [path] of toDelete) {
      this.deleteTempFile(path);
    }

    loggingService.debug('TempFileManager', `Force cleaned up ${toDelete.length} oldest files`);
  }

  /**
   * Get total size of all temporary files
   */
  getTotalTempFileSize(): number {
    return Array.from(this.tempFiles.values())
      .reduce((total, file) => total + file.size, 0);
  }

  /**
   * Access a temporary file (updates access info)
   */
  accessFile(path: string): TempFileInfo | null {
    const tempFile = this.tempFiles.get(path);
    if (tempFile) {
      tempFile.accessCount++;
      tempFile.lastAccessed = new Date();
      return tempFile;
    }
    return null;
  }

  /**
   * Update file size
   */
  updateFileSize(path: string, size: number): void {
    const tempFile = this.tempFiles.get(path);
    if (tempFile) {
      tempFile.size = size;
    }
  }

  /**
   * Check if file exists
   */
  fileExists(path: string): boolean {
    return this.tempFiles.has(path);
  }

  /**
   * Get file info by path
   */
  getFileInfo(path: string): TempFileInfo | null {
    return this.tempFiles.get(path) || null;
  }

  /**
   * Emergency cleanup - called when memory pressure is detected
   */
  emergencyCleanup(): void {
    loggingService.warn('TempFileManager', 'Performing emergency cleanup due to memory pressure');
    
    // Delete all files immediately
    for (const path of this.tempFiles.keys()) {
      this.deleteTempFile(path);
    }

    // Clear all timers
    for (const tempFile of this.tempFiles.values()) {
      if (tempFile.cleanupTimer) {
        clearTimeout(tempFile.cleanupTimer);
      }
    }

    this.tempFiles.clear();
  }

  /**
   * Shutdown the manager and cleanup all resources
   */
  shutdown(): void {
    loggingService.info('TempFileManager', 'Shutting down temporary file manager');
    
    // Clear cleanup interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Emergency cleanup
    this.emergencyCleanup();
  }

  /**
   * Delete a specific temporary file
   */
  private deleteTempFile(path: string): void {
    const tempFile = this.tempFiles.get(path);
    if (!tempFile) {
      return;
    }

    // Clear cleanup timer
    if (tempFile.cleanupTimer) {
      clearTimeout(tempFile.cleanupTimer);
    }

    // Remove from tracking
    this.tempFiles.delete(path);

    loggingService.debug('TempFileManager', `Deleted temp file: ${path}`);
  }

  /**
   * Perform regular cleanup
   */
  private performCleanup(): void {
    const initialCount = this.tempFiles.size;
    
    // Clean up expired files
    this.cleanupExpired();

    // If still over capacity, clean up oldest files
    if (this.tempFiles.size > this.maxFiles) {
      this.cleanupOldestFiles(this.tempFiles.size - this.maxFiles);
    }

    const finalCount = this.tempFiles.size;
    const cleanedCount = initialCount - finalCount;

    if (cleanedCount > 0) {
      loggingService.debug('TempFileManager', `Cleanup completed. Removed ${cleanedCount} files`);
    }
  }

  /**
   * Start memory monitoring
   */
  private startMemoryMonitoring(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memoryInfo = (performance as any).memory;
        const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024);
        const totalMB = memoryInfo.totalJSHeapSize / (1024 * 1024);
        const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024);

        const memoryUsagePercent = (usedMB / limitMB) * 100;

        if (memoryUsagePercent > 80) {
          this.memoryPressure = true;
          loggingService.warn('TempFileManager', `High memory usage detected: ${memoryUsagePercent.toFixed(1)}%`);
          this.cleanupOldestFiles(20); // Aggressive cleanup
        } else if (memoryUsagePercent > 60) {
          this.memoryPressure = true;
          this.cleanupOldestFiles(10); // Moderate cleanup
        } else {
          this.memoryPressure = false;
        }

        // Log memory stats periodically
        if (Math.random() < 0.1) { // 10% of the time
          loggingService.debug('TempFileManager', `Memory usage: ${usedMB.toFixed(1)}MB / ${totalMB.toFixed(1)}MB (${memoryUsagePercent.toFixed(1)}%)`);
        }
      }, 30 * 1000); // Check every 30 seconds
    }
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get MIME type for file extension
   */
  private getMimeTypeForExtension(extension: string): string {
    const mimeTypeMap: { [key: string]: string } = {
      '.tmp': 'application/octet-stream',
      '.pdf': 'application/pdf',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.txt': 'text/plain',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg'
    };

    return mimeTypeMap[extension.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * Get statistics about temporary file usage
   */
  getStatistics(): {
    totalFiles: number;
    totalSize: number;
    averageAge: number;
    memoryPressure: boolean;
    filesByExtension: { [key: string]: number };
  } {
    const files = Array.from(this.tempFiles.values());
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageAge = files.length > 0 
      ? files.reduce((sum, file) => sum + (Date.now() - file.createdAt.getTime()), 0) / files.length 
      : 0;

    const filesByExtension: { [key: string]: number } = {};
    for (const file of files) {
      filesByExtension[file.extension] = (filesByExtension[file.extension] || 0) + 1;
    }

    return {
      totalFiles: files.length,
      totalSize,
      averageAge,
      memoryPressure: this.memoryPressure,
      filesByExtension
    };
  }
}

// Create global temporary file manager instance
export const tempFileManager = new SecureTempFileManager();