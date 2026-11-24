// Cuentas con Clerk (MC-07): entrar con Google o correo. Este módulo solo entra a la compilación cuando existen
// VITE_CLERK_PUBLISHABLE_KEY y VITE_CONVEX_URL (`__CLERK__`, ver vite.config.ts); sin ellas no se importa y el juego
// no le pide nada a Clerk. Usa la integración oficial (`ConvexProviderWithClerk`, plantilla JWT «convex»): en vez
// del cliente WebSocket de Convex, el puente le pasa el token al cliente HTTP del juego (`autenticacion`).
import { esUY } from '@clerk/localizations/es-UY';
import { ClerkProvider, SignInButton, UserButton, useAuth } from '@clerk/react';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { ReactNode } from 'react';
import { autenticacion, servidor } from './servidor';
import { useGame } from './store';

type BuscarToken = (o: { forceRefreshToken: boolean }) => Promise<string | null | undefined>;

/** Al entrar con Clerk: une la cuenta con el invitado de este dispositivo (MC-08) y vuelve a leer todo. */
async function alEntrar() {
  const r = await servidor.vincular();
  if (!r.ok) return;
  const g = useGame.getState();
  await g.sincronizar();
  if (r.resumen) g.toast('Tu avance de este dispositivo se juntó con tu cuenta', '🔗');
}

/** Lo que `ConvexProviderWithClerk` espera de un cliente de Convex, sobre el cliente HTTP del juego. */
const puente = {
  setAuth(buscar: BuscarToken, alCambiar: (dentro: boolean) => void) {
    autenticacion.token = async () => (await buscar({ forceRefreshToken: false })) ?? null;
    void buscar({ forceRefreshToken: false }).then((t) => {
      alCambiar(!!t);
      if (t) void alEntrar();
    });
  },
  clearAuth() {
    if (!autenticacion.token) return;
    autenticacion.token = null;
    // al salir, el juego vuelve a ser el invitado de este dispositivo
    void useGame.getState().sincronizar();
  },
};

export function ConClerk({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY} localization={esUY}>
      {/* el puente solo implementa lo que usa la autenticación (setAuth / clearAuth) */}
      <ConvexProviderWithClerk client={puente as never} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

/** Botón de la tarjeta «Tu cuenta» en Ajustes: entrar, o el menú de la cuenta si ya entró. */
export function BotonCuenta() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded) return <span className="text-xs font-bold text-muted">Cargando…</span>;
  return isSignedIn ? (
    <UserButton />
  ) : (
    <SignInButton mode="modal">
      <button type="button" data-testid="cuenta-entrar" data-tone="primary" data-size="sm" className="mc-btn">
        Entrar con Google o correo
      </button>
    </SignInButton>
  );
}
