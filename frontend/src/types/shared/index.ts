// Shared TypeScript types for the frontend application

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    pagination?: PaginationMeta;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    executionTime: number;
    cacheHit?: boolean;
    attempts?: number;
  };
}

// User types
export interface User {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
    avatar_url?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
}

export interface UserProfile extends User {
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    notifications: boolean;
  };
  statistics: {
    totalExams: number;
    completedExams: number;
    averageScore: number;
    lastExamDate?: string;
  };
}

// Authentication types
export interface AuthSession {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  email: string;
  password: string;
  fullName?: string;
}

// Exam types
export interface ExamConfig {
  type: 'OBJECTIVE' | 'SHORT_ANSWER' | 'ESSAY';
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number;
}

export interface Material {
  content: string;
  mimeType: string;
  title?: string;
  id?: string;
  uploadedAt?: string;
}

export interface Question {
  id?: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  topic: string;
  examId?: string;
  order?: number;
}

export interface UserAnswer {
  questionId: string;
  answer: string;
}

export interface EvaluationResult {
  score: number;
  feedback: string;
  isCorrect: boolean;
  topic: string;
}

export interface ExamResult {
  id: string;
  userId: string;
  examId: string;
  questions: Question[];
  userAnswers: UserAnswer[];
  evaluations: EvaluationResult[];
  totalScore: number;
  maxScore: number;
  completedAt: string;
  duration: number; // in seconds
  config: ExamConfig;
}

export interface ExamHistory {
  id: string;
  userId: string;
  examResults: ExamResult[];
  totalExams: number;
  averageScore: number;
  lastExamDate: string;
}

// API Error types
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  status?: number;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  size: number;
  maxSize: number;
  hitRate: number;
  keys: string[];
}

// Component types
export interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingState {
  isLoading: boolean;
  error?: string | null;
}

export interface FormState<T = any> {
  data: T;
  errors: Record<string, string>;
  isSubmitting: boolean;
  isDirty: boolean;
}

// UI types
export interface Theme {
  name: 'light' | 'dark';
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
  };
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
  }>;
}

// Event types
export interface DomEvent<T = HTMLElement> extends React.SyntheticEvent<T> {
  target: EventTarget & T & {
    value: any;
    name?: string;
    type?: string;
    checked?: boolean;
    files?: FileList;
  };
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// Hook return types
export interface UseApiResult<T> extends ServiceResult<T> {
  refetch: () => Promise<void>;
  isRefetching: boolean;
}

export interface UseAuthResult {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  signup: (data: SignupRequest) => Promise<void>;
  error: string | null;
}

// Status types
export type Status = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  data: T | null;
  status: Status;
  error: string | null;
}

// Feature flags
export interface FeatureFlags {
  enableOfflineMode: boolean;
  enablePushNotifications: boolean;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  enablePerformanceMonitoring: boolean;
  enableCachePersistence: boolean;
}
