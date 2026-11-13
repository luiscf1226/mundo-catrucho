// Chat de sala (MC-22). Quien decide es la sala: limpia y filtra cada mensaje con las reglas de
// @mundo-catrucho/reglas, le pone ritmo por id público y no se lo pasa a quien bloqueó (o fue bloqueado por) quien
// lo manda. Cada mensaje sale firmado: al reportarlo, Convex comprueba que el texto citado es el que mandó la sala.
//
// Entra:  { t: 'chat', texto }                  { t: 'bloquear', id, si }   (si = false desbloquea)
// Sale:   { t: 'chat', id, de, nombre, sala, ts, texto, tapado, firma }   { t: 'chat-no', motivo: 'ritmo' }
import { CHAT, filtrarChat, firmarMensaje } from '@mundo-catrucho/reglas';
import type { RitmoSala } from './ritmo';

/** Lo que el chat necesita del jugador guardado en el WebSocket. */
export interface JugadorChat {
  id: string;
  nombre: string;
  sala: string;
  bloqueados?: string[];
}

let serie = 0;

export const esDeChat = (m: Record<string, unknown>) => m.t === 'chat' || m.t === 'bloquear';
export async function bloqueadosEntre(ctx: DurableObjectState, a: JugadorChat, b: JugadorChat) {
  const x = (await ctx.storage.get<string[]>(`bloqueos:${a.id}`)) ?? a.bloqueados ?? [];
  const y = (await ctx.storage.get<string[]>(`bloqueos:${b.id}`)) ?? b.bloqueados ?? [];
  return x.includes(b.id) || y.includes(a.id);
}
const enviar = (w: WebSocket, s: string) => {
  try {
    w.send(s);
  } catch {
    /* se cerró */
  }
};

export async function recibirChat(
  ctx: DurableObjectState,
  sockets: WebSocket[],
  ws: WebSocket,
  yo: JugadorChat,
  m: Record<string, unknown>,
  secreto: string,
  ritmo: RitmoSala,
) {
  if (m.t === 'bloquear') {
    if (typeof m.id !== 'string' || !/^[\w-]{1,24}$/.test(m.id) || m.id === yo.id) return;
    const lista = ((await ctx.storage.get<string[]>(`bloqueos:${yo.id}`)) ?? []).filter((x) => x !== m.id);
    if (m.si !== false && lista.length >= CHAT.bloqueosEnPase) return;
    await ctx.storage.transaction(async (tx) => {
      await tx.put(`bloqueos:${yo.id}`, m.si === false ? lista : [m.id, ...lista]);
      await tx.put(`bloqueos-momento:${yo.id}`, Date.now());
    });
    return;
  }
  const ahora = Date.now();
  if (!ritmo.gastar(yo.id, 'chat')) return enviar(ws, JSON.stringify({ t: 'chat-no', motivo: 'ritmo' }));
  const f = filtrarChat(m.texto);
  if (!f) return;
  const msg = {
    id: `${ahora.toString(36)}${(serie++ % 1296).toString(36)}`,
    de: yo.id,
    sala: yo.sala,
    ts: ahora,
    texto: f.texto,
  };
  const firma = await firmarMensaje(msg, secreto);
  const salida = JSON.stringify({ t: 'chat', ...msg, nombre: yo.nombre, tapado: f.tapado, firma });
  for (const w of sockets) {
    if (w.readyState !== WebSocket.OPEN) continue;
    const otro = w.deserializeAttachment() as JugadorChat | null;
    if (!otro) continue;
    if (w !== ws && (await bloqueadosEntre(ctx, yo, otro))) continue;
    enviar(w, salida);
  }
}

export async function iniciarBloqueos(ctx: DurableObjectState, id: string, lista: string[], emitido = 0) {
  await ctx.storage.transaction(async (tx) => {
    const clave = `bloqueos:${id}`;
    const momento = (await tx.get<number>(`bloqueos-momento:${id}`)) ?? 0;
    if ((await tx.get<string[]>(clave)) === undefined || emitido > momento) {
      await tx.put(clave, lista);
      await tx.put(`bloqueos-momento:${id}`, emitido);
    }
  });
}
