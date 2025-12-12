// Comprehensive logging service for document processing

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  data?: any;
  stack?: string;
  userId?: string;
  sessionId?: string;
}

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  CRITICAL = 4
}

export interface LogConfig {
  enableConsoleLogging: boolean;
  enableLocalStorage: boolean;
  maxEntries: number;
  enableRemoteLogging: boolean;
  remoteEndpoint?: string;
  logRetentionDays: number;
  enablePerformanceLogging: boolean;
}

export class LoggingService {
  private config: LogConfig;
  private logs: LogEntry[] = [];
  private performanceMarks: Map<string, number> = new Map();

  constructor(config: LogConfig) {
    this.config = config;
    this.loadLogsFromStorage();
    this.startRetentionCleanup();
  }

  /**
   * Log a debug message
   */
  debug(source: string, message: string, data?: any, userId?: string, sessionId?: string): void {
    this.log(LogLevel.DEBUG, source, message, data, userId, sessionId);
  }

  /**
   * Log an info message
   */
  info(source: string, message: string, data?: any, userId?: string, sessionId?: string): void {
    this.log(LogLevel.INFO, source, message, data, userId, sessionId);
  }

  /**
   * Log a warning message
   */
  warn(source: string, message: string, data?: any, userId?: string, sessionId?: string): void {
    this.log(LogLevel.WARN, source, message, data, userId, sessionId);
  }

  /**
   * Log an error message
   */
  error(source: string, message: string, error?: Error | any, userId?: string, sessionId?: string): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    this.log(LogLevel.ERROR, source, message, errorData, userId, sessionId);
  }

  /**
   * Log a critical message
   */
  critical(source: string, message: string, error?: Error | any, userId?: string, sessionId?: string): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;

    this.log(LogLevel.CRITICAL, source, message, errorData, userId, sessionId);
  }

  /**
   * Start performance tracking
   */
  startPerformanceMark(name: string): void {
    if (this.config.enablePerformanceLogging) {
      this.performanceMarks.set(name, performance.now());
    }
  }

  /**
   * End performance tracking and log the result
   */
  endPerformanceMark(name: string, source: string, userId?: string, sessionId?: string): number | null {
    if (!this.config.enablePerformanceLogging) {
      return null;
    }

    const startTime = this.performanceMarks.get(name);
    if (!startTime) {
      this.warn(source, `Performance mark "${name}" was not started`, undefined, userId, sessionId);
      return null;
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(name);

    this.info(source, `Performance: ${name}`, { duration }, userId, sessionId);
    return duration;
  }

  /**
   * Log file processing events
   */
  logFileProcessing(
    event: 'upload_start' | 'validation_start' | 'validation_complete' | 'conversion_start' | 'conversion_complete' | 'error',
    fileName: string,
    fileSize: number,
    additionalData?: any,
    userId?: string,
    sessionId?: string
  ): void {
    const source = 'FileProcessing';
    const data = { fileName, fileSize, ...additionalData };

    switch (event) {
      case 'upload_start':
        this.info(source, `File upload started: ${fileName}`, data, userId, sessionId);
        break;
      case 'validation_start':
        this.info(source, `File validation started: ${fileName}`, data, userId, sessionId);
        break;
      case 'validation_complete':
        this.info(source, `File validation completed: ${fileName}`, data, userId, sessionId);
        break;
      case 'conversion_start':
        this.info(source, `File conversion started: ${fileName}`, data, userId, sessionId);
        break;
      case 'conversion_complete':
        this.info(source, `File conversion completed: ${fileName}`, data, userId, sessionId);
        break;
      case 'error':
        this.error(source, `File processing error: ${fileName}`, additionalData, userId, sessionId);
        break;
    }
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: 'threat_detected' | 'file_blocked' | 'suspicious_activity',
    fileName: string,
    threatDetails?: any,
    userId?: string,
    sessionId?: string
  ): void {
    const source = 'Security';
    const data = { fileName, ...threatDetails };

    switch (event) {
      case 'threat_detected':
        this.warn(source, `Security threat detected: ${fileName}`, data, userId, sessionId);
        break;
      case 'file_blocked':
        this.warn(source, `File blocked due to security policy: ${fileName}`, data, userId, sessionId);
        break;
      case 'suspicious_activity':
        this.critical(source, `Suspicious activity detected: ${fileName}`, data, userId, sessionId);
        break;
    }
  }

  /**
   * Log user actions
   */
  logUserAction(
    action: string,
    details?: any,
    userId?: string,
    sessionId?: string
  ): void {
    this.info('UserAction', action, details, userId, sessionId);
  }

  /**
   * Get logs filtered by criteria
   */
  getLogs(options: {
    level?: LogLevel;
    source?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (options.level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= options.level);
    }

    if (options.source) {
      filteredLogs = filteredLogs.filter(log => log.source === options.source);
    }

    if (options.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === options.userId);
    }

    if (options.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= options.startDate!);
    }

    if (options.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= options.endDate!);
    }

    // Sort by timestamp (newest first)
    filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options.limit) {
      filteredLogs = filteredLogs.slice(0, options.limit);
    }

    return filteredLogs;
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
  }

  /**
   * Export logs as JSON
   */
  exportLogs(options: {
    level?: LogLevel;
    source?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): string {
    const logs = this.getLogs(options);
    return JSON.stringify({
      exportDate: new Date(),
      totalLogs: logs.length,
      logs
    }, null, 2);
  }

  /**
   * Get log statistics
   */
  getLogStatistics(days: number = 7): {
    total: number;
    byLevel: Record<string, number>;
    bySource: Record<string, number>;
    recentErrors: LogEntry[];
  } {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const recentLogs = this.getLogs({ startDate });
    
    const byLevel: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const log of recentLogs) {
      byLevel[LogLevel[log.level]] = (byLevel[LogLevel[log.level]] || 0) + 1;
      bySource[log.source] = (bySource[log.source] || 0) + 1;
    }

    const recentErrors = recentLogs
      .filter(log => log.level >= LogLevel.ERROR)
      .slice(0, 10);

    return {
      total: recentLogs.length,
      byLevel,
      bySource,
      recentErrors
    };
  }

  /**
   * Internal logging method
   */
  private log(
    level: LogLevel,
    source: string,
    message: string,
    data?: any,
    userId?: string,
    sessionId?: string
  ): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      source,
      message,
      data,
      userId,
      sessionId
    };

    // Add stack trace for errors and critical messages
    if (level >= LogLevel.ERROR) {
      entry.stack = new Error().stack;
    }

    this.logs.push(entry);

    // Console logging
    if (this.config.enableConsoleLogging) {
      this.logToConsole(entry);
    }

    // Local storage logging
    if (this.config.enableLocalStorage) {
      this.saveLogsToStorage();
    }

    // Remote logging (if configured)
    if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
      this.sendToRemoteEndpoint(entry);
    }

    // Enforce max entries limit
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }
  }

  /**
   * Log to console with appropriate styling
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const levelText = LogLevel[entry.level];
    const formattedMessage = `[${timestamp}] ${levelText} [${entry.source}] ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, entry.data);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, entry.data);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, entry.data);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        console.error(formattedMessage, entry.data, entry.stack);
        break;
    }
  }

  /**
   * Save logs to localStorage
   */
  private saveLogsToStorage(): void {
    try {
      const serializedLogs = JSON.stringify(this.logs);
      localStorage.setItem('documentProcessingLogs', serializedLogs);
    } catch (error) {
      console.warn('Failed to save logs to localStorage:', error);
    }
  }

  /**
   * Load logs from localStorage
   */
  private loadLogsFromStorage(): void {
    try {
      const storedLogs = localStorage.getItem('documentProcessingLogs');
      if (storedLogs) {
        const parsedLogs = JSON.parse(storedLogs);
        this.logs = parsedLogs.map((log: any) => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }));
      }
    } catch (error) {
      console.warn('Failed to load logs from localStorage:', error);
    }
  }

  /**
   * Send log to remote endpoint
   */
  private async sendToRemoteEndpoint(entry: LogEntry): Promise<void> {
    try {
      await fetch(this.config.remoteEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(entry)
      });
    } catch (error) {
      console.warn('Failed to send log to remote endpoint:', error);
    }
  }

  /**
   * Start automatic log retention cleanup
   */
  private startRetentionCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredLogs();
    }, 60 * 60 * 1000); // Run every hour
  }

  /**
   * Clean up expired logs based on retention policy
   */
  private cleanupExpiredLogs(): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.logRetentionDays);

    const initialCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp >= cutoffDate);
    const removedCount = initialCount - this.logs.length;

    if (removedCount > 0) {
      this.debug('LoggingService', `Cleaned up ${removedCount} expired log entries`);
      this.saveLogsToStorage();
    }
  }
}

// Create global logging service instance
export const loggingService = new LoggingService({
  enableConsoleLogging: true,
  enableLocalStorage: true,
  maxEntries: 1000,
  enableRemoteLogging: false,
  logRetentionDays: 30,
  enablePerformanceLogging: true
});