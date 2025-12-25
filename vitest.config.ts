import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      exclude: [
        'src/systems/responsive.ts',
        'src/config.ts',
        'node_modules/**',
        '**/*.test.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
