import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';
import { rmSync, readdirSync } from 'fs';

// TODO: When moving to Capacitor, switch to OGG-only (better compression)
// and remove MP3 files. OGG works in native apps but not Safari web.
const EXCLUDE_OGG_FOR_WEB = true;

// Custom plugin to exclude OGG files from build
function excludeOggPlugin() {
  return {
    name: 'exclude-ogg-for-web',
    closeBundle() {
      if (!EXCLUDE_OGG_FOR_WEB) return;

      try {
        const soundsDir = resolve(__dirname, 'dist/sounds');
        const files = readdirSync(soundsDir);
        let removed = 0;
        for (const file of files) {
          if (file.endsWith('.ogg')) {
            rmSync(resolve(soundsDir, file));
            removed++;
          }
        }
        if (removed > 0) {
          console.log(`✓ Excluded ${removed} OGG files from build (web-only mode)`);
        }
      } catch {
        // Ignore if sounds dir doesn't exist
      }
    },
  };
}

export default defineConfig({
  plugins: [tsconfigPaths(), excludeOggPlugin()],
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
