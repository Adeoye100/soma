// Custom hook for exam-related API operations
import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../../services/api/ApiClient';
import { CONFIG } from '../../config/api';
import { ExamConfig, Material, Question, UserAnswer, EvaluationResult, ExamResult, UseApiResult } from '../../types/shared';

interface UseExamOptions {
  autoFetch?: boolean;
  cache?: {
    enabled: boolean;
    ttl?: number;
  };
  deduplicate?: boolean;
}

interface UseExamReturn extends UseApiResult<{
  questions: Question[];
  evaluations?: EvaluationResult[];
  result?: ExamResult;
}> {
  generateExam: (config: ExamConfig, materials: Material[]) => Promise<void>;
  submitAnswers: (answers: UserAnswer[]) => Promise<void>;
  clearCache: () => void;
}

/**
 * Custom hook for exam operations with caching, deduplication, and error handling
 */
export const useExam = (options: UseExamOptions = {}): UseExamReturn => {
  const {
    autoFetch = false,
    cache = { enabled: true, ttl: CONFIG.CACHE.ttl.SHORT },
    deduplicate = true
  } = options;

  const [data, setData] = useState<{
    questions: Question[];
    evaluations?: EvaluationResult[];
    result?: ExamResult;
  } | null>(null);
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  /**
   * Generate exam questions
   */
  const generateExam = useCallback(async (config: ExamConfig, materials: Material[]) => {
    setStatus('loading');
    setError(null);

    try {
      const result = await apiClient.post<{
        questions: Question[];
      }>(
        CONFIG.API.endpoints.exam.generate,
        { config, materials },
        {
          cache: {
            enabled: cache.enabled,
            ttl: cache.ttl
          },
          deduplicate,
          retries: {
            max: 3,
            delay: 1000
          }
        }
      );

      if (result.success && result.data) {
        setData({
          questions: result.data.questions
        });
        setStatus('success');
      } else {
        throw new Error(result.error?.message || 'Failed to generate exam');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setStatus('error');
      console.error('Exam generation error:', err);
    }
  }, [cache.enabled, cache.ttl, deduplicate]);

  /**
   * Submit exam answers
   */
  const submitAnswers = useCallback(async (answers: UserAnswer[]) => {
    if (!data?.questions || data.questions.length === 0) {
      setError('No questions available to submit answers for');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError(null);

    try {
      const result = await apiClient.post<{
        evaluations: EvaluationResult[];
        result: ExamResult;
      }>(
        CONFIG.API.endpoints.exam.submit,
        { answers, questions: data.questions },
        {
          deduplicate,
          retries: {
            max: 2,
            delay: 500
          }
        }
      );

      if (result.success && result.data) {
        setData(prevData => ({
          ...prevData!,
          evaluations: result.data!.evaluations,
          result: result.data!.result
        }));
        setStatus('success');
      } else {
        throw new Error(result.error?.message || 'Failed to submit answers');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit answers';
      setError(errorMessage);
      setStatus('error');
      console.error('Answer submission error:', err);
    }
  }, [data?.questions, deduplicate]);

  /**
   * Refetch data
   */
  const refetch = useCallback(async () => {
    if (!data) return;

    setIsRefetching(true);
    try {
      // In a real implementation, this would refetch the current exam data
      // For now, we'll just clear the cache and reset the state
      apiClient.clearCache();
      setData(null);
      setStatus('idle');
      setError(null);
    } catch (err) {
      console.error('Refetch error:', err);
    } finally {
      setIsRefetching(false);
    }
  }, [data]);

  /**
   * Clear cache
   */
  const clearCache = useCallback(() => {
    apiClient.clearCache();
    apiClient.clearDeduplicationHistory();
  }, []);

  /**
   * Auto-fetch if enabled
   */
  useEffect(() => {
    if (autoFetch) {
      // This would typically fetch the user's exam history or current exam
      // For now, we'll just set up the initial state
      setStatus('idle');
    }
  }, [autoFetch]);

  return {
    // Data and state
    data,
    status,
    error,
    isRefetching,
    
    // Computed values
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    isAuthenticated: true, // This would come from auth context
    
    // Actions
    generateExam,
    submitAnswers,
    refetch,
    clearCache,

    // Legacy compatibility
    success: status === 'success',
    metadata: {
      executionTime: 0, // This would be calculated from API responses
      cacheHit: false
    }
  };
};

/**
 * Hook for fetching exam history
 */
export const useExamHistory = (options: UseExamOptions = {}) => {
  const {
    cache = { enabled: true, ttl: CONFIG.CACHE.ttl.MEDIUM },
    deduplicate = true
  } = options;

  const [data, setData] = useState<ExamResult[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);

  const fetchHistory = useCallback(async () => {
    setStatus('loading');
    setError(null);

    try {
      const result = await apiClient.get<{
        examResults: ExamResult[];
      }>(
        CONFIG.API.endpoints.exam.history,
        {
          cache: {
            enabled: cache.enabled,
            ttl: cache.ttl
          },
          deduplicate
        }
      );

      if (result.success && result.data) {
        setData(result.data.examResults);
        setStatus('success');
      } else {
        throw new Error(result.error?.message || 'Failed to fetch exam history');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch exam history';
      setError(errorMessage);
      setStatus('error');
      console.error('Exam history fetch error:', err);
    }
  }, [cache.enabled, cache.ttl, deduplicate]);

  const refetch = useCallback(async () => {
    setIsRefetching(true);
    try {
      await fetchHistory();
    } finally {
      setIsRefetching(false);
    }
  }, [fetchHistory]);

  const clearCache = useCallback(() => {
    apiClient.clearCache();
    apiClient.clearDeduplicationHistory();
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return {
    data,
    status,
    error,
    isRefetching,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    refetch,
    clearCache,
    success: status === 'success',
    metadata: {
      executionTime: 0,
      cacheHit: false
    }
  };
};

export default useExam;
