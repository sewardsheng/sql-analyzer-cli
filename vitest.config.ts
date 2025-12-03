import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/setupTests.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
    ],
    exclude: [
      'node_modules',
      'dist',
      '**/*.d.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@services': resolve(__dirname, './src/services'),
      '@core': resolve(__dirname, './src/core'),
      '@utils': resolve(__dirname, './src/utils'),
      '@cli': resolve(__dirname, './src/cli'),
      '@api': resolve(__dirname, './src/api'),
    },
  },
});