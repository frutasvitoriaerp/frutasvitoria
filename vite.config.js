import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/frutasvitoria/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: 'index.html',
        dashboard: 'dashboard.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  }
});