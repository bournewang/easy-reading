import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import fs from 'fs';
import manifest from './src/manifest';

export default defineConfig(({ mode }) => {
  // Load env from shared package
  const sharedEnvPath = resolve(__dirname, '../shared/.env.production');
  const sharedEnv = fs.existsSync(sharedEnvPath) 
    ? Object.fromEntries(
        fs.readFileSync(sharedEnvPath, 'utf8')
          .split('\n')
          .filter(line => line && !line.startsWith('#'))
          .map(line => line.split('='))
      )
    : {};

  // Load extension's own env
  const env = loadEnv(mode, process.cwd(), '');

  // Merge shared and extension env, with extension taking precedence
  const combinedEnv = { ...sharedEnv, ...env };

  console.log('Building with env:', {
    mode,
    NEXT_PUBLIC_API_URL: combinedEnv.NEXT_PUBLIC_API_URL
  });

  return {
    plugins: [
      react(),
      crx({ manifest }),
    ],
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: {
          'src/background': resolve(__dirname, 'src/background.ts'),
          'src/content': resolve(__dirname, 'src/content.ts'),
          'src/popup': resolve(__dirname, 'src/popup.ts')
        },
        output: {
          entryFileNames: '[name].js',
          format: 'es',
        }
      }
    },
    define: {
      // Make env variables available to the app
      'process.env.NEXT_PUBLIC_API_URL': JSON.stringify(combinedEnv.NEXT_PUBLIC_API_URL),
      'process.env.NEXT_PUBLIC_TTS_API_KEY': JSON.stringify(combinedEnv.NEXT_PUBLIC_TTS_API_KEY),
      'process.env.NEXT_PUBLIC_TTS_LOCATION': JSON.stringify(combinedEnv.NEXT_PUBLIC_TTS_LOCATION)
    },
    css: {
      modules: false,
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@easy-reading/shared': resolve(__dirname, '../shared/src')
      }
    },
    optimizeDeps: {
      include: ['@easy-reading/shared']
    }
  };
});