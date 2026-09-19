import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        halong: resolve(__dirname, 'locations/halong.html'),
        hoian: resolve(__dirname, 'locations/hoi-an.html'),
        vanmieu: resolve(__dirname, 'locations/van-mieu.html')
      }
    }
  },
  server: {
    port: 3000,
    open: true,
    watch: {
      ignored: ['**/*.crdownload', '**/*.tmp', '**/*.partial'],
    },
  },
});
