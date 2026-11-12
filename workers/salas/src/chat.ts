// Chat de sala (MC-22). Quien decide es la sala: limpia y filtra cada mensaje con las reglas de
// @mundo-catrucho/reglas, le pone ritmo por conexión y no se lo pasa a quien bloqueó (o fue bloqueado por) quien
// lo manda. Cada mensaje sale firmado: al reportarlo, Convex comprueba que el texto citado es el que mandó la sala.
//
// Entra:  { t: 'chat', texto }                  { t: 'bloquear', id, si }   (si = false desbloquea)
// Sale:   { t: 'chat', id, de, nombre, sala, ts, texto, tapado, firma }   { t: 'chat-no', motivo: 'ritmo' }
import { type CubetaChat, cubetaChat, filtrarChat, firmarMensaje, permitirChat } from '@mundo-catrucho/reglas';

/** Lo que el chat necesita del jugador guardado en el WebSocket. */
export interface JugadorChat {
  id: string;
  nombre: string;
  sala: string;
  bloqueados?: string[];
}
const ritmo = new WeakMap<WebSocket, CubetaChat>();
let serie = 0;

export const esDeChat = (m: Record<string, unknown>) => m.t === 'chat' || m.t === 'bloquear';
const bloquea = (a: JugadorChat, id: string) => !!a.bloqueados?.includes(id);
const enviar = (w: WebSocket, s: string) => {
  try {
    w.send(s);
  } catch {
    /* se cerró */
  }
};

export async function recibirChat(
  sockets: WebSocket[],
  ws: WebSocket,
  yo: JugadorChat,
  m: Record<string, unknown>,
  secreto: string,
) {
  if (m.t === 'bloquear') {
    if (typeof m.id !== 'string' || !/^[\w-]{1,24}$/.test(m.id) || m.id === yo.id) return;
    const lista = (yo.bloqueados ?? []).filter((x) => x !== m.id);
    // los nuevos van primero; con el tope del pase cabe en el adjunto del WebSocket
    yo.bloqueados = m.si === false ? lista : [m.id, ...lista].slice(0, 64);
    ws.serializeAttachment(yo);
    return;
  }
  const ahora = Date.now();
  let c = ritmo.get(ws);
  if (!c) ritmo.set(ws, (c = cubetaChat(ahora)));
  if (!permitirChat(c, ahora)) return enviar(ws, JSON.stringify({ t: 'chat-no', motivo: 'ritmo' }));
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
    if (w !== ws && (bloquea(otro, yo.id) || bloquea(yo, otro.id))) continue;
    enviar(w, salida);
  }
}
