import { useEffect } from 'react';
import { supabase } from '../../services/supabase';

const HEARTBEAT_INTERVAL = 30 * 60 * 1000;

export function useSessionHeartbeat(): void {
  useEffect(() => {
    const heartbeat = async (): Promise<void> => {
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          return;
        }

        if (!sessionData.session) {
          return;
        }

        const { error: refreshError } = await supabase.auth.refreshSession();

        if (refreshError) {
          console.log(`[Heartbeat] ${new Date().toISOString()} - Refresh failed:`, refreshError.message);
          return;
        }

        console.log(`[Heartbeat] ${new Date().toISOString()} - Session refreshed successfully`);
      } catch (error) {
        console.log(`[Heartbeat] ${new Date().toISOString()} - Heartbeat error:`, error);
      }
    };

    heartbeat();

    const intervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL);

    return () => {
      clearInterval(intervalId);
    };
  }, []);
}
