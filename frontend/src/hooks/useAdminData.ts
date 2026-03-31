import { useState, useEffect, useCallback } from 'react';
import { AdminApiService } from '@/services/admin/adminApiService';

interface UseAdminDataOptions {
  refetchInterval?: number;
  onError?: (error: string) => void;
}

export function useSystemHealth(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getSystemHealth();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useMonitoring(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getMonitoring();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useAutomation(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getAutomation();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useQueues(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getQueues();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 15000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useAlerts(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getAlerts();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useSystemInfo(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getSystemInfo();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useDashboard(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getDashboard();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useConfiguration(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getConfiguration();
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
