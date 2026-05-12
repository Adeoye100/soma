import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Use local proxy in development to avoid CORS issues
// In production, you would configure CORS on Supabase or use a server-side proxy
const isDevelopment = import.meta.env.DEV;

// Supabase project URL
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration:', {
    url: !!supabaseUrl,
    key: !!supabaseAnonKey
  });
  throw new Error('Supabase URL and anon key are required. Please check your .env file.');
}

// Helper to get URL string from RequestInfo
const getUrlString = (input: RequestInfo | URL): string => {
  if (typeof input === 'string') return input;
  if (input instanceof Request) return input.url;
  return input.toString();
};

// Custom fetch with retry logic and better error handling
const customFetch: typeof fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  // If we're in development, we can still use the proxy for data but avoid it for auth
  // if it's causing issues. However, the best approach is to fix the proxy or 
  // use the direct URL if CORS is handled.
  
  // Retry logic for network errors
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(input, init);
      return response;
    } catch (error) {
      lastError = error as Error;
      console.warn(`Fetch attempt ${attempt + 1} failed:`, error);
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
      }
    }
  }
  
  // If all retries failed, throw the last error
  throw lastError || new Error('Fetch failed after retries');
};

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: customFetch,
  },
});

/**
 * Reset user password with new password
 * @param newPassword - The new password to set
 * @returns Promise with success status and error if any
 */
export const resetPassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};
