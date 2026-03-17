import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/services/supabase';

const AuthCallback = (): JSX.Element => {
  const navigate = useNavigate();
  const hasExchanged = useRef<boolean>(false);

  useEffect(() => {
    console.log('[AuthCallback] Mount fired. href:', window.location.href);
    console.log('[AuthCallback] hasExchanged:', hasExchanged.current);

    if (hasExchanged.current) {
      console.log('[AuthCallback] Already exchanged, skipping');
      return;
    }
    hasExchanged.current = true;

    const processCallback = async (): Promise<void> => {
      try {
        const url = new URL(window.location.href);
        const params = url.searchParams;
        const hash = new URLSearchParams(url.hash.replace('#', ''));

        console.log('[AuthCallback] URL on arrival:', window.location.href);
        console.log('[AuthCallback] params:', Object.fromEntries(params.entries()));
        console.log('[AuthCallback] hash:', Object.fromEntries(hash.entries()));

        const errorParam = params.get('error');
        if (errorParam) {
          console.error('[AuthCallback] Upstream error from URL:', errorParam);
          navigate(`/login?error=oauth_failed&reason=${errorParam}`, { replace: true });
          return;
        }

        const code = params.get('code');
        if (!code || code.trim() === '') {
          console.error('[AuthCallback] No code in URL');
          navigate('/login?error=oauth_failed&reason=no_code_in_url', { replace: true });
          return;
        }

        console.log('[AuthCallback] Exchanging code for session...');
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('[AuthCallback] Exchange error:', error.message);
          navigate('/login?error=oauth_failed&reason=exchange_failed', { replace: true });
          return;
        }

        if (!data.session) {
          console.error('[AuthCallback] No session returned');
          navigate('/login?error=oauth_failed&reason=exchange_failed', { replace: true });
          return;
        }

        const { data: sessionCheck } = await supabase.auth.getSession();
        console.log('[AuthCallback] Session available:', !!sessionCheck.session);
        
        if (!sessionCheck.session) {
          console.error('[AuthCallback] Session not available after exchange');
          navigate('/login?error=oauth_failed&reason=exchange_failed', { replace: true });
          return;
        }

        console.log('[AuthCallback] Success, redirecting to dashboard');
        navigate('/dashboard', { replace: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown OAuth error';
        console.error('[AuthCallback] Session exchange failed:', message);
        navigate(`/login?error=oauth_failed&reason=exchange_failed`, { replace: true });
      }
    };

    void processCallback();
  }, [navigate]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0f172a', color: '#f8fafc' }}>
      <div role="status" aria-live="polite" style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '3px solid #3b82f6', 
          borderTopColor: 'transparent', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p>Authenticating, please wait...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
