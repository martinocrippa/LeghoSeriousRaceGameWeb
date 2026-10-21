import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'copy-sample-photos',
    closeBundle() {
      if (existsSync('sample')) cpSync('sample', resolve('dist/sample'), { recursive: true });
    },
  }],
  build: {
    chunkSizeWarningLimit: 800,
    // three.js in its own chunk: it changes rarely, so the browser keeps it cached while the game code evolves.
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
