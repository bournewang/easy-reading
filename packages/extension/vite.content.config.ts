import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/content.ts'),
      name: 'ContentScript',
      formats: ['iife'],
      fileName: () => 'src/content.js',
    },
    rollupOptions: {
      external: ['chrome'], // Don't bundle Chrome API
      output: {
        inlineDynamicImports: true,
        globals: {
          chrome: 'chrome'
        }
      }
    },
    outDir: 'dist',
    emptyOutDir: false, // Important: don't empty the dist directory
  },
  resolve: {
    alias: {
      '@easy-reading/shared': resolve(__dirname, '../shared/src'),
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production')
  }
}); 