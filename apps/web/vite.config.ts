import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// El modo autónomo incrusta todo; web conserva las fronteras import().
const web = process.env.VITE_BUILD_MODE === 'web';
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    manifest: web,
    rollupOptions: { output: { inlineDynamicImports: !web } },
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 5000,
    target: 'es2022',
  },
});
