// Cuentas con Clerk (MC-07), integración oficial de Convex. Apagada mientras no exista `CLERK_JWT_ISSUER_DOMAIN` en
// el entorno de Convex (`npx convex env set CLERK_JWT_ISSUER_DOMAIN https://<algo>.clerk.accounts.dev`): sin ella no
// hay proveedores, `ctx.auth.getUserIdentity()` siempre da null y todos siguen siendo invitados. Pasos en
// docs/ENTORNOS.md («Cuentas con Clerk»).
declare const process: { env: { CLERK_JWT_ISSUER_DOMAIN?: string } };

/** El dominio emisor, o null. Convex rechaza publicar si se lee una variable que no existe: se pregunta antes. */
function dominioClerk(): string | null {
  try {
    return process.env.CLERK_JWT_ISSUER_DOMAIN || null;
  } catch {
    return null;
  }
}
const dominio = dominioClerk();

export default {
  // la plantilla JWT de Clerk se llama «convex» y su `aud` es `convex`
  providers: dominio ? [{ domain: dominio, applicationID: 'convex' }] : [],
};
