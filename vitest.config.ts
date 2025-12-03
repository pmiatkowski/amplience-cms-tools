import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts}', 'src/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      exclude: [
        'node_modules/',
        'tests/',
        'dist/',
        'reports/',
        'types/',
        'src/**/index.{ts,js}',
        'src/**/*.{test,spec}.{ts,js}',
        './*.{mjs,ts,js}',
      ],
      all: true,
      thresholds: {
        lines: 21,
        functions: 34,
        branches: 21,
        statements: 21,
      },
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
    },
  },
});
