import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'MinimaChat',
      fileName: 'minima-chat',
      formats: ['es', 'umd']
    },
    outDir: 'dist',
    sourcemap: true
  }
});
