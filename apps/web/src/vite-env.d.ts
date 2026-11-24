/// <reference types="vite/client" />

/** MC-07: true solo si la compilación trae VITE_CLERK_PUBLISHABLE_KEY y VITE_CONVEX_URL (vite.config.ts). */
declare const __CLERK__: boolean;

interface ImportMetaEnv {
  readonly VITE_CONVEX_URL?: string;
  readonly VITE_SALAS_URL?: string;
  readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}
