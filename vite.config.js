import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const stableAssets = process.env.STABLE_ASSETS === 'true';
const pagesEntryBuild = process.env.PAGES_ENTRY_BUILD === 'true';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/codex004/' : '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api/metricool': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      input: pagesEntryBuild ? resolve(process.cwd(), '.pages-entry.html') : undefined,
      output: {
        entryFileNames: stableAssets ? 'assets/app.js' : 'assets/[name]-[hash].js',
        chunkFileNames: stableAssets ? 'assets/[name].js' : 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          if (stableAssets && assetInfo.name?.endsWith('.css')) {
            return 'assets/styles.css';
          }

          return stableAssets ? 'assets/[name][extname]' : 'assets/[name]-[hash][extname]';
        },
        manualChunks: stableAssets
          ? undefined
          : {
              charts: ['recharts'],
              icons: ['lucide-react'],
            },
      },
    },
  },
});
