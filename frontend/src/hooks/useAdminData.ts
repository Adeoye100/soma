import { useState, useEffect } from 'react';
import { AdminApiService } from '@/services/admin/adminApiService';

interface UseAdminDataOptions {
  refetchInterval?: number;
  onError?: (error: string) => void;
}

export function useSystemHealth(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.getSystemHealth();
      if (result.error) {
        setError(result.error);
        options?.onError?.(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
  }, [options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useMonitoringStatus(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.getMonitoringStatus();
      if (result.error) {
        setError(result.error);
        options?.onError?.(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
  }, [options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useWorkflows(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.getWorkflows();
      if (result.error) {
        setError(result.error);
        options?.onError?.(result.error);
      } else {
        setData(result.data || []);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
  }, [options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useQueues(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any[]>([]);
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.getQueueOverview();
      if (result.error) {
        setError(result.error);
        options?.onError?.(result.error);
      } else {
        setData(result.data?.queues || []);
        setOverview(result.data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
  }, [options?.refetchInterval]);

  return { data, overview, loading, error, refetch: fetchData };
}

export function useAlerts(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.getAlerts({ limit: 50 });
      if (result.error) {
        setError(result.error);
        options?.onError?.(result.error);
      } else {
        setData(result.data || []);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
  }, [options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}

export function useSystemInfo(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const result = await AdminApiService.getSystemInfo();
      if (result.error) {
        setError(result.error);
        options?.onError?.(result.error);
      } else {
        setData(result.data);
        setError(null);
      }
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
  }, [options?.refetchInterval]);

  return { data, loading, error, refetch: fetchData };
}
