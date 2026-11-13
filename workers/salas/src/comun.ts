// Lo que comparten las salas cerradas (partida y viaje) con la sala de zona: conexiones abiertas, repartir un
// mensaje y rechazar con un código que el navegador sí puede leer.
import { partirSalaCerrada } from '@mundo-catrucho/reglas';

export interface Persona {
  id: string;
  nombre: string;
  avatar: Record<string, string>;
}
export const abiertas = (ctx: DurableObjectState) =>
  ctx.getWebSockets().filter((w) => w.readyState === WebSocket.OPEN && w.deserializeAttachment());
export const quien = (w: WebSocket) => w.deserializeAttachment() as (Persona & Record<string, unknown>) | null;
export function difundir(ctx: DurableObjectState, msg: unknown, menos?: WebSocket) {
  const s = JSON.stringify(msg);
  for (const w of abiertas(ctx))
    if (w !== menos) {
      try {
        w.send(s);
      } catch {
        /* se cerró */
      }
    }
}
/** Acepta el WebSocket solo para cerrarlo con un motivo que el navegador sí puede leer. */
export function rechazar(codigo: number, motivo: string) {
  const [cliente, servidor] = Object.values(new WebSocketPair());
  servidor.accept();
  servidor.close(codigo, motivo);
  return new Response(null, { status: 101, webSocket: cliente });
}
/** Acepta a alguien (si ya estaba en otra pestaña, cierra la vieja sin avisar a los demás) y le pone su ficha. */
export function aceptar(ctx: DurableObjectState, ficha: Persona & Record<string, unknown>, cierreReemplazo: number) {
  for (const w of abiertas(ctx))
    if (quien(w)?.id === ficha.id) {
      w.serializeAttachment(null);
      w.close(cierreReemplazo, 'reemplazado');
    }
  const [cliente, servidor] = Object.values(new WebSocketPair());
  ctx.acceptWebSocket(servidor);
  servidor.serializeAttachment(ficha);
  return { cliente, servidor };
}

/**
 * Invitación de la sala de zona a una partida (MC-25) o a un viaje compartido (MC-31). Solo pasa lo conocido y
 * corto; para entrar igual hace falta el pase de Convex.
 */
export function invitacionValida(m: Record<string, unknown>) {
  const c = partirSalaCerrada(m.sala);
  if (!c || c.tipo !== m.tipo) return null;
  const corto = (v: unknown, re: RegExp) => (typeof v === 'string' && re.test(v) ? v : undefined);
  return {
    tipo: c.tipo,
    sala: m.sala as string,
    juego: corto(m.juego, /^[a-z0-9.-]{3,64}$/),
    veh: corto(m.veh, /^[a-z]{2,12}$/),
    a: corto(m.a, /^[a-z]{2,24}$/),
  };
}
