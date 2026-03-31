<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
=======
import { useState, useEffect } from 'react';
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
import { AdminApiService } from '@/services/admin/adminApiService';

interface UseAdminDataOptions {
  refetchInterval?: number;
  onError?: (error: string) => void;
}

export function useSystemHealth(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

<<<<<<< HEAD
  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getSystemHealth();
      setData(result);
      setError(null);
=======
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
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
  }, []);
=======
  };
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
<<<<<<< HEAD
  }, [fetchData, options?.refetchInterval]);
=======
  }, [options?.refetchInterval]);
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return { data, loading, error, refetch: fetchData };
}

<<<<<<< HEAD
export function useMonitoring(options?: UseAdminDataOptions) {
=======
export function useMonitoringStatus(options?: UseAdminDataOptions) {
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

<<<<<<< HEAD
  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getMonitoring();
      setData(result);
      setError(null);
=======
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
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);
=======
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
  }, [options?.refetchInterval]);
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return { data, loading, error, refetch: fetchData };
}

<<<<<<< HEAD
export function useAutomation(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getAutomation();
      setData(result);
      setError(null);
=======
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
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
  }, []);
=======
  };
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
<<<<<<< HEAD
  }, [fetchData, options?.refetchInterval]);
=======
  }, [options?.refetchInterval]);
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return { data, loading, error, refetch: fetchData };
}

export function useQueues(options?: UseAdminDataOptions) {
<<<<<<< HEAD
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getQueues();
      setData(result);
      setError(null);
=======
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
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
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
=======
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
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
  }, [fetchData, options?.refetchInterval]);
=======
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 30000);
    return () => clearInterval(interval);
  }, [options?.refetchInterval]);
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return { data, loading, error, refetch: fetchData };
}

export function useSystemInfo(options?: UseAdminDataOptions) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

<<<<<<< HEAD
  const fetchData = useCallback(async () => {
    try {
      const result = await AdminApiService.getSystemInfo();
      setData(result);
      setError(null);
=======
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
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba
    } catch (err: any) {
      setError(err.message);
      options?.onError?.(err.message);
    } finally {
      setLoading(false);
    }
<<<<<<< HEAD
  }, []);
=======
  };
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, options?.refetchInterval || 60000);
    return () => clearInterval(interval);
<<<<<<< HEAD
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
=======
  }, [options?.refetchInterval]);
>>>>>>> e102c8a33e923e35d0f947d6551aac6d394a06ba

  return { data, loading, error, refetch: fetchData };
}
