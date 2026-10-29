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
        denhung: resolve(__dirname, 'locations/den-hung.html'),
        namnha: resolve(__dirname, 'locations/nam-nha.html'),
        buihuunghia: resolve(__dirname, 'locations/bui-huu-nghia.html')
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
