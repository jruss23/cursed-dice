import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  publicDir: 'assets', // Serve assets directory as public files
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    outDir: 'dist',
    // Don't inline large assets (audio files)
    assetsInlineLimit: 4096,
  },
  server: {
    port: 3000,
    open: true,
  },
});
