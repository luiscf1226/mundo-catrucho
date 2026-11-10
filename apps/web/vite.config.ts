import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Todo se empaqueta en un solo archivo JS + un CSS; tools/build.mjs los incrusta en un único HTML.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: { assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false, chunkSizeWarningLimit: 5000, target: 'es2022' },
});
