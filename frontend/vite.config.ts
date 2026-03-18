import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isProduction = mode === 'production';
    
    const csp = isProduction
      ? [
          "default-src 'self'",
          "script-src 'self' https://apis.google.com https://accounts.google.com",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
          "frame-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
          "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
          "font-src 'self' https://fonts.gstatic.com",
          "object-src 'none'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests"
        ].join('; ')
      : [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://accounts.google.com",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' ws://localhost:* http://localhost:* https://*.supabase.co wss://*.supabase.co https://accounts.google.com https://oauth2.googleapis.com https://www.googleapis.com",
          "frame-src 'self' https://accounts.google.com https://oauth2.googleapis.com",
          "img-src 'self' data: blob: https://*.supabase.co https://lh3.googleusercontent.com",
          "font-src 'self' https://fonts.gstatic.com",
          "object-src 'none'",
          "frame-ancestors 'none'"
        ].join('; ');

    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        headers: {
          'Content-Security-Policy': csp
        },
        proxy: {
          // Proxy API requests to backend
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false,
          },
        },
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.API_KEY),
        'process.env.GEMINI_API_KEYS': JSON.stringify(env.GEMINI_API_KEYS),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          './txml': path.resolve(__dirname, 'node_modules/pptx2html/src/tXml.js'),
        }
      },
      optimizeDeps: {
        esbuildOptions: {
          plugins: [
            {
              name: 'fix-pptx2html-case-sensitivity',
              setup(build) {
                build.onResolve({ filter: /^\.\/txml$/ }, args => {
                  if (args.importer.includes('pptx2html')) {
                    return { path: path.resolve(__dirname, 'node_modules/pptx2html/src/tXml.js') }
                  }
                })
              }
            }
          ]
        }
      }
    };
});
