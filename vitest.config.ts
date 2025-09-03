import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['tests/**/*.{test,spec}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', 'dist/', 'reports/'],
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '~types': resolve(__dirname, './types'),
    },
  },
});
