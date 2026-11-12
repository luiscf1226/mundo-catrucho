import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../..', '');
  return {
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_CONVEX_URL': JSON.stringify(env.VITE_CONVEX_URL || env.CONVEX_URL || '') },
  };
});
