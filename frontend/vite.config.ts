import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        host: '0.0.0.0',
        proxy: {
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
