import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      host: true,
      // Proxy API calls to Anthropic when API key is configured
      proxy: env.VITE_ANTHROPIC_API_KEY
        ? {
            '/api/anthropic': {
              target: 'https://api.anthropic.com',
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api\/anthropic/, ''),
              headers: {
                'x-api-key': env.VITE_ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
              },
            },
          }
        : {},
    },
    // Test configuration for Vitest
    test: {
      globals: true,
      environment: 'node',
      include: ['tests/**/*.test.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/kernel/**/*.ts'],
      },
    },
  };
});
