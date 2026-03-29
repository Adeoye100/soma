import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

interface FileUploadConfig {
  uploadPath: string;
  maxFileSize: number;
  tempPath: string;
  quarantinePath: string;
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  malwareScanningEnabled: boolean;
  malwareScanEndpoint?: string;
  ocrLanguage: string;
  ocrEnhancement: boolean;
  maxParsingTime: number;
  cleanupTempFiles: boolean;
}

interface Config {
  nodeEnv: string;
  port: number;
  host: string;
  
  jwtSecret: string;
  jwtRefreshSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  
  openRouterApiKeys: string[];
  openRouterModel: string;
  
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  redisUrl: string;
  redisEnabled: boolean;
  queueMaxConcurrent: number;
  queueMaxQueueSize: number;
  
  corsOrigins: string[];
  corsCredentials: boolean;
  
  logLevel: string;
  logFilePath: string;
  logMaxSize: string;
  logMaxFiles: number;
  
  dbHost: string;
  dbPort: number;
  dbName: string;
  dbUser: string;
  dbPassword: string;
  dbSsl: boolean;
  
  helmetEnabled: boolean;
  hstsMaxAge: number;
  
  healthCheckInterval: number;
  metricsEnabled: boolean;
  performanceMonitoring: boolean;
  
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;

  mockExternalApis: boolean;

  automationEnabled: boolean;
  automationMaxConcurrentWorkflows: number;
  automationWorkflowTimeout: number;
  automationHealthCheckInterval: number;
  automationMetricsRetention: number;
  automationCircuitBreakerEnabled: boolean;
  automationRetryMaxAttempts: number;
  automationMonitoringEnabled: boolean;

  fileUpload: FileUploadConfig;
}

const getRequiredEnvVar = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
};

const getOptionalEnvVar = (name: string, defaultValue: string): string => {
  return process.env[name] || defaultValue;
};

const getOptionalEnvVarAsNumber = (name: string, defaultValue: number): number => {
  const value = process.env[name];
  return value ? parseInt(value, 10) : defaultValue;
};

const getOptionalEnvVarAsBoolean = (name: string, defaultValue: boolean): boolean => {
  const value = process.env[name];
  return value ? value.toLowerCase() === 'true' : defaultValue;
};

const getEnvVarAsArray = (name: string): string[] => {
  const value = process.env[name];
  return value ? value.split(',').map(v => v.trim()).filter(v => v) : [];
};

export const config: Config = {
  nodeEnv: getOptionalEnvVar('NODE_ENV', 'development'),
  port: getOptionalEnvVarAsNumber('PORT', 3000),
  host: getOptionalEnvVar('HOST', 'localhost'),
  
  jwtSecret: getRequiredEnvVar('JWT_SECRET'),
  jwtRefreshSecret: getRequiredEnvVar('JWT_REFRESH_SECRET'),
  jwtExpiresIn: getOptionalEnvVar('JWT_EXPIRES_IN', '15m'),
  jwtRefreshExpiresIn: getOptionalEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
  bcryptRounds: getOptionalEnvVarAsNumber('BCRYPT_ROUNDS', 12),
  
  openRouterApiKeys: getEnvVarAsArray('OPENROUTER_API_KEYS'),
  openRouterModel: getOptionalEnvVar('OPENROUTER_MODEL', 'google/gemini-2.0-flash-001'),
  
  rateLimitWindowMs: getOptionalEnvVarAsNumber('RATE_LIMIT_WINDOW_MS', 900000),
  rateLimitMaxRequests: getOptionalEnvVarAsNumber('RATE_LIMIT_MAX_REQUESTS', 100),
  redisUrl: getOptionalEnvVar('REDIS_URL', 'redis://localhost:6379'),
  redisEnabled: getOptionalEnvVarAsBoolean('REDIS_ENABLED', true),
  queueMaxConcurrent: getOptionalEnvVarAsNumber('QUEUE_MAX_CONCURRENT', 5),
  queueMaxQueueSize: getOptionalEnvVarAsNumber('QUEUE_MAX_QUEUE_SIZE', 100),
  
  corsOrigins: getEnvVarAsArray('CORS_ORIGIN'),
  corsCredentials: getOptionalEnvVarAsBoolean('CORS_CREDENTIALS', true),
  
  logLevel: getOptionalEnvVar('LOG_LEVEL', 'info'),
  logFilePath: getOptionalEnvVar('LOG_FILE_PATH', 'logs/app.log'),
  logMaxSize: getOptionalEnvVar('LOG_MAX_SIZE', '10m'),
  logMaxFiles: getOptionalEnvVarAsNumber('LOG_MAX_FILES', 5),
  
  dbHost: getOptionalEnvVar('DB_HOST', 'localhost'),
  dbPort: getOptionalEnvVarAsNumber('DB_PORT', 5432),
  dbName: getOptionalEnvVar('DB_NAME', 'smart_examination'),
  dbUser: getOptionalEnvVar('DB_USER', 'postgres'),
  dbPassword: getOptionalEnvVar('DB_PASSWORD', ''),
  dbSsl: getOptionalEnvVarAsBoolean('DB_SSL', false),
  
  helmetEnabled: getOptionalEnvVarAsBoolean('HELMET_ENABLED', true),
  hstsMaxAge: getOptionalEnvVarAsNumber('HSTS_MAX_AGE', 31536000),
  
  healthCheckInterval: getOptionalEnvVarAsNumber('HEALTH_CHECK_INTERVAL', 30000),
  metricsEnabled: getOptionalEnvVarAsBoolean('METRICS_ENABLED', true),
  performanceMonitoring: getOptionalEnvVarAsBoolean('PERFORMANCE_MONITORING', true),
  
  supabaseUrl: getOptionalEnvVar('SUPABASE_URL', ''),
  supabaseAnonKey: getOptionalEnvVar('SUPABASE_ANON_KEY', ''),
  supabaseServiceKey: getOptionalEnvVar('SUPABASE_SERVICE_KEY', ''),

  mockExternalApis: getOptionalEnvVarAsBoolean('MOCK_EXTERNAL_APIS', false),

  automationEnabled: getOptionalEnvVarAsBoolean('AUTOMATION_ENABLED', true),
  automationMaxConcurrentWorkflows: getOptionalEnvVarAsNumber('AUTOMATION_MAX_CONCURRENT_WORKFLOWS', 10),
  automationWorkflowTimeout: getOptionalEnvVarAsNumber('AUTOMATION_WORKFLOW_TIMEOUT', 300000),
  automationHealthCheckInterval: getOptionalEnvVarAsNumber('AUTOMATION_HEALTH_CHECK_INTERVAL', 60000),
  automationMetricsRetention: getOptionalEnvVarAsNumber('AUTOMATION_METRICS_RETENTION', 86400000),
  automationCircuitBreakerEnabled: getOptionalEnvVarAsBoolean('AUTOMATION_CIRCUIT_BREAKER_ENABLED', true),
  automationRetryMaxAttempts: getOptionalEnvVarAsNumber('AUTOMATION_RETRY_MAX_ATTEMPTS', 3),
  automationMonitoringEnabled: getOptionalEnvVarAsBoolean('AUTOMATION_MONITORING_ENABLED', true),

  // File upload configuration — see src/middleware/upload.ts
  fileUpload: {
    uploadPath: getOptionalEnvVar('UPLOAD_PATH', './uploads'),
    maxFileSize: getOptionalEnvVarAsNumber('MAX_FILE_SIZE', 10485760),
    tempPath: getOptionalEnvVar('TEMP_PATH', './temp'),
    quarantinePath: getOptionalEnvVar('QUARANTINE_PATH', './quarantine'),
    allowedMimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'image/png',
      'image/jpeg',
    ],
    allowedExtensions: [
      '.pdf',
      '.docx',
      '.pptx',
      '.txt',
      '.png',
      '.jpg',
      '.jpeg',
    ],
    malwareScanningEnabled: getOptionalEnvVarAsBoolean('MALWARE_SCANNING_ENABLED', true),
    malwareScanEndpoint: getOptionalEnvVar('MALWARE_SCAN_ENDPOINT', ''),
    ocrLanguage: getOptionalEnvVar('OCR_LANGUAGE', 'eng'),
    ocrEnhancement: getOptionalEnvVarAsBoolean('OCR_ENHANCEMENT', true),
    maxParsingTime: getOptionalEnvVarAsNumber('MAX_PARSING_TIME', 120000),
    cleanupTempFiles: getOptionalEnvVarAsBoolean('CLEANUP_TEMP_FILES', true),
  },
};

export const validateConfig = (): void => {
  const errors: string[] = [];
  
  if (!config.openRouterApiKeys.length) {
    errors.push('At least one OpenRouter API key is required');
  }
  
  const isSupabaseConfigured = 
    config.supabaseUrl && 
    config.supabaseUrl !== 'your_supabase_url_here' && 
    (() => {
      try {
        const url = new URL(config.supabaseUrl);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    })() &&
    config.supabaseAnonKey && 
    config.supabaseAnonKey !== 'your_supabase_anon_key_here';

  if (!isSupabaseConfigured && !config.mockExternalApis && config.nodeEnv === 'production') {
    errors.push('Supabase URL and anon key are required');
  }
  
  if (config.nodeEnv === 'production') {
    if (!config.supabaseServiceKey) {
      errors.push('Supabase service key is required in production');
    }
    
    if (config.jwtSecret.length < 32) {
      errors.push('JWT secret must be at least 32 characters in production');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
  }
};

export default config;
