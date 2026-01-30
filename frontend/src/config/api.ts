// API Configuration
export const API_CONFIG = {
  baseURL: process.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  cache: {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
  },
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 60,
    burstLimit: 10,
  },
  endpoints: {
    auth: {
      login: '/auth/login',
      signup: '/auth/signup',
      logout: '/auth/logout',
      refresh: '/auth/refresh',
      profile: '/auth/me',
    },
    exam: {
      generate: '/exam/generate',
      submit: '/exam/submit',
      history: '/exam/history',
      results: '/exam/results',
    },
    material: {
      upload: '/material/upload',
      process: '/material/process',
      list: '/material/list',
    },
    health: {
      check: '/health',
      status: '/health/status',
    },
  },
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// HTTP Client Configuration
export const HTTP_CLIENT_CONFIG = {
  baseURL: API_CONFIG.baseURL,
  timeout: API_CONFIG.timeout,
  defaultHeaders: API_CONFIG.headers,
  retry: {
    maxRetries: API_CONFIG.retryAttempts,
    baseDelay: API_CONFIG.retryDelay,
    maxDelay: 10000,
    backoffMultiplier: 2,
    retryOnStatusCodes: [408, 429, 500, 502, 503, 504],
  },
  rateLimiters: {
    general: {
      type: 'token-bucket' as const,
      capacity: API_CONFIG.rateLimiting.requestsPerMinute,
      rate: API_CONFIG.rateLimiting.requestsPerMinute / (60 * 1000), // per millisecond
    },
    burst: {
      type: 'leaky-bucket' as const,
      capacity: API_CONFIG.rateLimiting.burstLimit,
      rate: 1, // 1 request per 100ms
    },
  },
  cache: {
    maxSize: API_CONFIG.cache.maxSize,
    defaultTtl: API_CONFIG.cache.defaultTTL,
  },
};

// Error handling configuration
export const ERROR_CONFIG = {
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'RATE_LIMIT_ERROR',
    'SERVER_ERROR',
  ],
  nonRetryableErrors: [
    'VALIDATION_ERROR',
    'AUTHENTICATION_ERROR',
    'AUTHORIZATION_ERROR',
    'NOT_FOUND_ERROR',
  ],
  userFriendlyMessages: {
    NETWORK_ERROR: 'Connection error. Please check your internet connection.',
    TIMEOUT_ERROR: 'Request timed out. Please try again.',
    RATE_LIMIT_ERROR: 'Too many requests. Please wait a moment.',
    SERVER_ERROR: 'Server error. Please try again later.',
    VALIDATION_ERROR: 'Please check your input and try again.',
    AUTHENTICATION_ERROR: 'Please log in to continue.',
    AUTHORIZATION_ERROR: 'You don\'t have permission to perform this action.',
    NOT_FOUND_ERROR: 'The requested resource was not found.',
    UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
  },
};

// Cache configuration
export const CACHE_CONFIG = {
  keys: {
    USER_PROFILE: 'user:profile',
    EXAM_HISTORY: 'exam:history',
    MATERIALS: 'materials:list',
    SETTINGS: 'app:settings',
  },
  ttl: {
    SHORT: 5 * 60 * 1000, // 5 minutes
    MEDIUM: 30 * 60 * 1000, // 30 minutes
    LONG: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// Request deduplication configuration
export const DEDUPLICATION_CONFIG = {
  enabled: true,
  ttl: 10000, // 10 seconds
  maxPendingRequests: 50,
};

// Authentication configuration
export const AUTH_CONFIG = {
  tokenStorage: 'localStorage', // 'localStorage' | 'sessionStorage' | 'memory'
  tokenKey: 'auth_token',
  refreshTokenKey: 'refresh_token',
  tokenExpiryBuffer: 5 * 60 * 1000, // 5 minutes before expiry
  autoRefresh: true,
  refreshAttempts: 3,
  logoutOnTokenExpiry: true,
};

// Feature flags
export const FEATURE_FLAGS = {
  enableOfflineMode: false,
  enablePushNotifications: false,
  enableAnalytics: true,
  enableErrorReporting: true,
  enablePerformanceMonitoring: true,
  enableCachePersistence: true,
};

// Export all configurations as a single object
export const CONFIG = {
  API: API_CONFIG,
  HTTP_CLIENT: HTTP_CLIENT_CONFIG,
  ERROR: ERROR_CONFIG,
  CACHE: CACHE_CONFIG,
  DEDUPLICATION: DEDUPLICATION_CONFIG,
  AUTH: AUTH_CONFIG,
  FEATURES: FEATURE_FLAGS,
};

export default CONFIG;
