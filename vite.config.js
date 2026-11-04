import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { offline } from './scripts/offline-plugin.mjs';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'copy-sample-photos',
    closeBundle() {
      if (existsSync('sample')) cpSync('sample', resolve('dist/sample'), { recursive: true });
    },
  },
  // dist/sw.js: the game keeps working without a network once opened. It runs after the copy above, so the sample
  // photos are in the list; the woff files are skipped (browsers take the woff2 ones).
  offline({ name: 'legho', skip: [/\.woff$/] })],
  build: {
    chunkSizeWarningLimit: 800,
    // three.js in its own chunk: it changes rarely, so the browser keeps it cached while the game code evolves.
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
