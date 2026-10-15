import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules', 'dist', 'e2e'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/', '**/*.d.ts', '**/*.config.*'],
      // [2026-08-04] B-P5: umbrales del gate de cobertura. Baseline medido:
      // 66.34% stmts / 46.59% branch / 62.06% funcs / 67.39% lines.
      // Valores con ~6pts de margen: bloquean regresiones sin fallar ya.
      thresholds: {
        statements: 60,
        branches: 40,
        functions: 55,
        lines: 62,
      },
    },
  },
});
