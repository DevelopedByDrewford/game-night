import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    globals: true,
    // functions/ is a separate deployable with its own package.json/vitest —
    // run its tests via `npm test` inside functions/, not from here.
    exclude: ['**/node_modules/**', 'functions/**'],
  },
});
