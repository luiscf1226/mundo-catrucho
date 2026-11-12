// Chat moderado y amigos (MC-22, MC-24). Sin salas en vivo (`EN_VIVO` false) no existe nada de esto y no hay
// ninguna petición. Con salas:
// - chat de sala: viaja por el WebSocket; la sala filtra, pone ritmo, firma y no lo pasa entre bloqueados. Aquí solo
//   se guardan los últimos mensajes, se esconden los silenciados (solo esta sesión) y se avisa antes de mandar.
// - amigos, bloqueos, código de 5 letras, directos y reportes: Convex (`amigos:*`, `chat:*`, `moderacion:*`).
// Con «Chat» apagado en Ajustes no se guarda, no se muestra y no se manda nada.
import { CHAT, cubetaChat, filtrarChat, type MotivoReporte, partirSala, permitirChat } from '@mundo-catrucho/reglas';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { create } from 'zustand';
import { type ChatEntrante, EN_VIVO, net, type Union, useSala } from './net';
import { secretoInvitado } from './servidor';
import { useGame } from './store';

export type MensajeSala = Extract<ChatEntrante, { t: 'chat' }> & { mio: boolean };
export interface Amigo {
  amistadId: string;
  nombre: string;
  /** id público de sala */
  id: string;
  estado: 'amigos' | 'enviada' | 'recibida';
}
export interface Social {
  id: string | null;
  amigos: Amigo[];
  bloqueados: { id: string; nombre: string }[];
  codigo: { codigo: string; vence: number; sala: string | null } | null;
}
export interface Directo {
  id: string;
  mio: boolean;
  texto: string;
  tapado: boolean;
  ts: number;
}
type Fallo = { ok: false; motivo: string };
type R<T> = ({ ok: true } & T) | Fallo;

interface EstadoChat {
  /** últimos mensajes de la sala (sin silenciados ni bloqueados) */
  mensajes: MensajeSala[];
  /** ids silenciados en esta sesión */
  silenciados: string[];
  /** lo social que respondió Convex (null hasta la primera lectura) */
  social: Social | null;
  /** con quién se juntó por código (para pedirle amistad) */
  conocido: { id: string; nombre: string } | null;
  /** cómo terminó el último código usado (el viaje cierra el panel; al volver a abrirlo se ve) */
  union: { r: ResultadoCodigo; nombre?: string } | null;
}
export type ResultadoCodigo = Union | 'codigo' | 'vencido' | 'propio' | 'sin-conexion' | 'sin-sala';
export const useChat = create<EstadoChat>(() => ({
  mensajes: [],
  silenciados: [],
  social: null,
  conocido: null,
  union: null,
}));
const MAX_MENSAJES = 40;
const PLAZO_MS = 6000;
const chatEncendido = () => useGame.getState().profile.settings.chat;

// ------------------------------------------------------------------ Convex
const URL_CONVEX = import.meta.env.VITE_CONVEX_URL as string | undefined;
let cliente: ConvexHttpClient | null = null;
async function llamar<T>(
  tipo: 'query' | 'mutation',
  nombre: string,
  args: Record<string, unknown> = {},
): Promise<R<T>> {
  if (!EN_VIVO || !URL_CONVEX) return { ok: false, motivo: 'sin-red' };
  cliente ??= new ConvexHttpClient(URL_CONVEX, { logger: false });
  const c = cliente;
  const datos = { ...args, invitado: secretoInvitado() };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const r = await Promise.race([
      tipo === 'query'
        ? c.query(makeFunctionReference<'query'>(nombre), datos)
        : c.mutation(makeFunctionReference<'mutation'>(nombre), datos),
      new Promise<null>((res) => {
        timer = setTimeout(() => res(null), PLAZO_MS);
      }),
    ]);
    return (r as R<T> | null) ?? { ok: false, motivo: 'sin-conexion' };
  } catch {
    return { ok: false, motivo: 'sin-conexion' };
  } finally {
    clearTimeout(timer);
  }
}

/** Vuelve a leer amigos, pedidos, bloqueados y el código activo. */
export async function leerSocial() {
  const r = await llamar<Social>('query', 'amigos:lista');
  if (r.ok) {
    const { ok: _ok, ...social } = r;
    useChat.setState({ social });
    // quien bloqueaste ya no aparece en el chat de sala
    const fuera = new Set(social.bloqueados.map((b) => b.id));
    useChat.setState((s) => ({ mensajes: s.mensajes.filter((m) => !fuera.has(m.de)) }));
  }
  return r;
}
const nombreJuego = () => useGame.getState().profile.name;
const conRelectura = async <T>(p: Promise<R<T>>) => {
  const r = await p;
  void leerSocial();
  return r;
};

export const social = {
  pedir: (id: string) => conRelectura(llamar<{ estado: string }>('mutation', 'amigos:pedir', { id })),
  responder: (amistadId: string, aceptar: boolean) =>
    conRelectura(llamar('mutation', 'amigos:responder', { amistadId, aceptar })),
  quitar: (amistadId: string) => conRelectura(llamar('mutation', 'amigos:quitar', { amistadId })),
  /** bloquea en Convex y en la sala de una vez (deja de verse al momento) */
  bloquear: async (id: string) => {
    net.bloquearEnSala(id, true);
    useChat.setState((s) => ({ mensajes: s.mensajes.filter((m) => m.de !== id) }));
    return conRelectura(llamar('mutation', 'amigos:bloquear', { id }));
  },
  desbloquear: async (id: string) => {
    net.bloquearEnSala(id, false);
    return conRelectura(llamar('mutation', 'amigos:desbloquear', { id }));
  },
  crearCodigo: () =>
    conRelectura(
      llamar<{ codigo: string; vence: number }>('mutation', 'amigos:crearCodigo', {
        sala: useSala.getState().sala ?? undefined,
        nombre: nombreJuego(),
      }),
    ),
  directos: (amistadId: string) => llamar<{ mensajes: Directo[] }>('query', 'chat:directos', { amistadId }),
  enviarDirecto: (amistadId: string, texto: string) =>
    chatEncendido()
      ? llamar<{ texto: string; tapado: boolean }>('mutation', 'chat:enviarDirecto', { amistadId, texto })
      : Promise.resolve<R<never>>({ ok: false, motivo: 'apagado' }),
  reportarSala: (m: MensajeSala, motivo: MotivoReporte) =>
    llamar<{ quedan: number }>('mutation', 'moderacion:reportar', {
      motivo,
      mensaje: { id: m.id, de: m.de, sala: m.sala, ts: m.ts, texto: m.texto, firma: m.firma },
    }),
  reportarDirecto: (directoId: string, motivo: MotivoReporte) =>
    llamar<{ quedan: number }>('mutation', 'moderacion:reportar', { motivo, directoId }),
};

/**
 * Usa el código de un amigo: viaja a su zona y entra a su sala exacta. Devuelve el resultado y su nombre.
 * `llena` = esa sala tiene sus 24; el juego sigue en el tramo que toque.
 */
export async function unirseConCodigo(codigo: string): Promise<NonNullable<EstadoChat['union']>> {
  useChat.setState({ union: null });
  const union = await unirse(codigo);
  useChat.setState({ union });
  return union;
}
async function unirse(codigo: string): Promise<NonNullable<EstadoChat['union']>> {
  const u = await llamar<{ sala: string; nombre: string; id: string }>('mutation', 'amigos:usarCodigo', {
    codigo,
    nombre: nombreJuego(),
  });
  if (!u.ok)
    return { r: (['codigo', 'vencido', 'propio', 'sin-sala'] as const).find((m) => m === u.motivo) ?? 'sin-conexion' };
  useChat.setState({ conocido: { id: u.id, nombre: u.nombre } });
  const g = useGame.getState();
  const zona = partirSala(u.sala)?.zona;
  if (!zona) return { r: 'error' };
  if (g.profile.room.mode === 'solo') g.setRoom('publica');
  const union = net.unirseA(u.sala);
  // a su zona: el mapa o su departamento (si ya estás ahí, cambia de tramo sin viajar)
  const aqui = g.scene.kind === 'lobby' ? 'mapa' : g.scene.kind === 'dept' ? `dept:${g.scene.id}` : null;
  if (aqui !== zona) {
    if (zona === 'mapa') g.goLobby();
    else g.travel(zona.slice(5));
  }
  const r = await Promise.race([union, new Promise<Union>((res) => setTimeout(() => res('error'), 30_000))]);
  return { r, nombre: u.nombre };
}

// ------------------------------------------------------------------ chat de sala
const cubeta = cubetaChat(0);
export type Envio = 'ok' | 'vacio' | 'ritmo' | 'apagado' | 'sin-sala';
/**
 * Manda un mensaje a la sala. El filtro de aquí solo sirve para avisar («se tapó algo»): la sala filtra de nuevo y
 * lo que vuelve es lo que todos ven.
 */
export function enviarSala(texto: string): { envio: Envio; tapado: boolean } {
  if (!chatEncendido()) return { envio: 'apagado', tapado: false };
  if (useSala.getState().estado !== 'en-sala') return { envio: 'sin-sala', tapado: false };
  const f = filtrarChat(texto);
  if (!f) return { envio: 'vacio', tapado: false };
  if (!permitirChat(cubeta, Date.now())) return { envio: 'ritmo', tapado: f.tapado };
  net.sendChat(texto.slice(0, CHAT.largoMax * 2));
  return { envio: 'ok', tapado: f.tapado };
}
export const silenciar = (id: string) =>
  useChat.setState((s) => ({
    silenciados: s.silenciados.includes(id) ? s.silenciados : [...s.silenciados, id],
    mensajes: s.mensajes.filter((m) => m.de !== id),
  }));

let instalado = false;
/** Escucha la sala (una vez). Lo llama la interfaz del chat al montarse. */
export function instalarChat() {
  if (instalado || !EN_VIVO) return;
  instalado = true;
  const mc = (window as unknown as { __mc?: Record<string, unknown> }).__mc;
  if (mc) mc.chat = useChat;
  net.onChat((m) => {
    if (m.t !== 'chat' || !chatEncendido()) return;
    const { silenciados, social: s } = useChat.getState();
    if (silenciados.includes(m.de) || s?.bloqueados.some((b) => b.id === m.de)) return;
    const msg: MensajeSala = { ...m, mio: m.de === net.yo() };
    useChat.setState((st) => ({ mensajes: [...st.mensajes, msg].slice(-MAX_MENSAJES) }));
  });
  // al cambiar de sala: el chat de la anterior se va, y el código (si hay) apunta a la nueva
  useSala.subscribe((s, p) => {
    if (s.sala === p.sala) return;
    useChat.setState({ mensajes: [] });
    const c = useChat.getState().social?.codigo;
    if (s.sala && c && c.vence > Date.now()) void social.crearCodigo();
  });
  // apagar el chat borra lo que había
  useGame.subscribe((s, p) => {
    if (p.profile.settings.chat && !s.profile.settings.chat) useChat.setState({ mensajes: [] });
  });
  void leerSocial();
}
