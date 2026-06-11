import { defineConfig } from 'vite';

// Фронт обслуживается Vite (dev) или собирается в dist/ (prod).
// Запросы к /api проксируются на Express-бэкенд фазы 1.
export default defineConfig({
  server: {
    port: Number(process.env.PORT) || 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
