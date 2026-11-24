import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// El modo autónomo incrusta todo; web conserva las fronteras import().
const web = process.env.VITE_BUILD_MODE === 'web';
// MC-07: Clerk solo entra a la compilación con su llave y con Convex; sin ellas `__CLERK__` es false y el módulo
// (y la red de Clerk) desaparece del resultado.
const clerk = !!process.env.VITE_CLERK_PUBLISHABLE_KEY && !!process.env.VITE_CONVEX_URL;
export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __CLERK__: JSON.stringify(clerk) },
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
