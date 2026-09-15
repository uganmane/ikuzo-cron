import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  base: './',
  plugins: [vue()],
  server: { port: 5181 },
  build: { outDir: 'dist', emptyOutDir: true },
});
