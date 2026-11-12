// Jugar con alguien de la sala (MC-25). Convex abre la partida (`partidas:abrirJuntos`) y le da a cada jugador un
// pase y un acta para la sala `juego:<partidaId>` (`salas:paseJuego`). La sala manda el reloj y la semilla, reparte
// los marcadores y al final firma un recibo que Convex paga una sola vez (`partidas:cerrarJuntos`).
// También guarda las invitaciones que llegan por la sala en vivo (partidas y viajes compartidos).
// Sin `VITE_SALAS_URL` y `VITE_CONVEX_URL` nada de esto existe y no hay peticiones.
import { type FilaRecibo, motorJuntos, PARTIDA } from '@mundo-catrucho/reglas';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { create } from 'zustand';
import { JUEGOS } from './data';
import { EN_VIVO, type Invitacion, net } from './net';
import { secretoInvitado } from './servidor';
import { useGame } from './store';

const URL_SALAS = (import.meta.env.VITE_SALAS_URL as string | undefined)?.replace(/\/+$/, '') ?? '';
const URL_CONVEX = import.meta.env.VITE_CONVEX_URL as string | undefined;
const PLAZO_MS = 6000;
let convex: ConvexHttpClient | null = null;
/** Llama una mutación de Convex con el invitado; null si no responde a tiempo. */
export async function mutar<T>(nombre: string, args: Record<string, unknown>): Promise<T | null> {
  if (!URL_CONVEX) return null;
  convex ??= new ConvexHttpClient(URL_CONVEX, { logger: false });
  const ref = makeFunctionReference<'mutation', Record<string, unknown>, T>(nombre);
  return Promise.race([
    convex.mutation(ref, { ...args, invitado: secretoInvitado() }),
    new Promise<null>((r) => setTimeout(() => r(null), PLAZO_MS)),
  ]).catch(() => null);
}
const nombrePropio = () => useGame.getState().profile.name;

// ------------------------------------------------------------------ canal a una sala cerrada
type Mensaje = Record<string, unknown>;
/**
 * Conexión a una sala cerrada (`juego:<id>` o `viaje:<id>`). Pide el pase justo antes de abrir (vale 60 s) y, si
 * se corta sin querer, reintenta tres veces. Otra pestaña con la misma cuenta la reemplaza y ya no vuelve.
 */
export class Canal {
  private ws: WebSocket | null = null;
  private cerrado = false;
  private intentos = 0;
  constructor(
    private readonly sala: string,
    private readonly pedirPase: () => Promise<{ pase: string; acta?: string } | null>,
    private readonly alMensaje: (m: Mensaje) => void,
    private readonly alCerrar: (codigo: number) => void,
  ) {}
  async abrir() {
    const p = await this.pedirPase();
    if (this.cerrado) return;
    if (!p) return this.alCerrar(0);
    const extra = p.acta ? `&acta=${encodeURIComponent(p.acta)}` : '';
    const ws = new WebSocket(
      `${URL_SALAS.replace(/^http/, 'ws')}/sala/${encodeURIComponent(this.sala)}?pase=${encodeURIComponent(p.pase)}${extra}`,
    );
    this.ws = ws;
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(String(e.data)) as Mensaje;
        if (m.t === 'hola') this.intentos = 0;
        this.alMensaje(m);
      } catch {
        /* mensaje roto */
      }
    };
    ws.onclose = (e) => {
      if (this.ws !== ws || this.cerrado) return;
      this.ws = null;
      // 4001–4010: rechazos de la sala (pase, llena, otra pestaña): no se reintenta
      if (e.code < 4000 && this.intentos++ < 3) setTimeout(() => void this.abrir(), 1500 * this.intentos);
      else this.alCerrar(e.code);
    };
  }
  enviar(m: Mensaje) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(m));
  }
  cerrar() {
    this.cerrado = true;
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = ws.onmessage = null;
      ws.close(1000, 'listo');
    }
  }
}

// ------------------------------------------------------------------ partida entre dos
export interface JugadorJuntos {
  id: string;
  nombre: string;
  puntos: number;
  salio: boolean;
}
export interface EstadoJuntos {
  estado: 'nada' | 'abriendo' | 'esperando' | 'cuenta' | 'jugando' | 'fin' | 'cancelada' | 'error';
  partidaId: string | null;
  juegoId: string | null;
  /** id público propio en la sala */
  yo: string | null;
  /** hora de la sala (ms Unix) en que arranca y termina el reloj */
  inicio: number | null;
  fin: number | null;
  /** hora de la sala − hora local, en ms */
  desfase: number;
  jugadores: JugadorJuntos[];
  /** en qué va el cobro del recibo */
  pago: null | 'pendiente' | 'rechazado' | { monedas: number; xp: number };
  motivo: string | null;
}
const VACIO: EstadoJuntos = {
  estado: 'nada',
  partidaId: null,
  juegoId: null,
  yo: null,
  inicio: null,
  fin: null,
  desfase: 0,
  jugadores: [],
  pago: null,
  motivo: null,
};
export const usePartida = create<EstadoJuntos>(() => ({ ...VACIO }));
let canal: Canal | null = null;

/** Juego del kit para jugar entre dos: el primero del departamento donde andás o, si no hay, la rosquilla. */
export function juegoParaJuntos() {
  const sc = useGame.getState().scene;
  const aqui = sc.kind === 'dept' ? JUEGOS.find((j) => j.dept === sc.id && motorJuntos(j.motor)) : undefined;
  return (
    aqui ??
    JUEGOS.find((j) => j.id === 'franciscomorazan.rosquilla-satelite') ??
    JUEGOS.find((j) => motorJuntos(j.motor))
  );
}

type DatosPartida = { ok: true; partidaId: string; juegoId: string; motor: string; etapa: number; semilla: number };
type Fallo = { ok: false; motivo: string };

/** «Jugar con alguien de la sala»: abre la partida, invita a los de la sala y espera en la tarjeta del juego. */
export async function jugarConAlguien(juegoId = juegoParaJuntos()?.id) {
  if (!EN_VIVO || !juegoId || usePartida.getState().estado !== 'nada') return false;
  usePartida.setState({ ...VACIO, estado: 'abriendo' });
  const r = await mutar<DatosPartida | Fallo>('partidas:abrirJuntos', { juegoId });
  if (!r?.ok) return fallo(r?.motivo ?? 'sin-conexion');
  net.sendInvite({ tipo: 'juego', sala: `juego:${r.partidaId}`, juego: r.juegoId });
  return entrar(r);
}

/**
 * Entra a una partida entre amigos ya abierta: la de una invitación de la sala o la de un código de amigo (MC-24).
 * Devuelve false si ya no existe, está llena o no hay conexión.
 */
export async function unirseAPartida(partidaId: string) {
  if (!EN_VIVO || usePartida.getState().estado !== 'nada') return false;
  usePartida.setState({ ...VACIO, estado: 'abriendo' });
  const r = await mutar<DatosPartida | Fallo>('partidas:unirseJuntos', { partidaId });
  if (!r?.ok) return fallo(r?.motivo ?? 'sin-conexion');
  return entrar(r);
}

function fallo(motivo: string) {
  usePartida.setState({ ...VACIO });
  useGame
    .getState()
    .toast(
      motivo === 'llena'
        ? 'Esa partida ya está llena'
        : motivo === 'sin-conexion'
          ? 'Sin conexión'
          : 'Esa partida ya no está',
      '⚠️',
    );
  return false;
}

function entrar(d: DatosPartida) {
  usePartida.setState({ ...VACIO, estado: 'abriendo', partidaId: d.partidaId, juegoId: d.juegoId });
  useGame.getState().startJuego(d.juegoId, { partidaId: d.partidaId, semilla: d.semilla, etapa: d.etapa });
  usePartida.setState({ estado: 'esperando' });
  canal?.cerrar();
  const c = new Canal(
    `juego:${d.partidaId}`,
    async () => {
      const p = await mutar<{ ok: true; pase: string; acta: string } | Fallo>('salas:paseJuego', {
        partidaId: d.partidaId,
        nombre: nombrePropio(),
      });
      return p?.ok ? p : null;
    },
    (m) => recibir(m),
    (codigo) => {
      if (canal !== c) return;
      const e = usePartida.getState().estado;
      if (e === 'esperando' || e === 'cuenta' || e === 'jugando')
        usePartida.setState({ estado: 'error', motivo: codigo === 4009 ? 'llena' : 'sin-conexion' });
    },
  );
  canal = c;
  void c.abrir();
  return true;
}

/** Sale de la partida (al salir del minijuego o volver a jugar solo). La partida sigue para los demás. */
export function salirDePartida() {
  canal?.cerrar();
  canal = null;
  usePartida.setState({ ...VACIO });
}

const jugadoresDe = (l: unknown): JugadorJuntos[] =>
  Array.isArray(l)
    ? l.map((j: Partial<JugadorJuntos>) => ({
        id: String(j.id),
        nombre: String(j.nombre ?? ''),
        puntos: Number(j.puntos) || 0,
        salio: !!j.salio,
      }))
    : [];
function reloj(m: Mensaje) {
  const ahora = Number(m.ahora) || Date.now();
  usePartida.setState({
    estado: 'cuenta',
    inicio: Number(m.inicio),
    fin: Number(m.fin),
    desfase: ahora - Date.now(),
  });
  // la tarjeta de inicio se salta: la cuenta la lleva la sala
  const g = useGame.getState();
  if (g.mg?.juntos && g.mg.phase === 'intro') g.beginMinigame();
}
function recibir(m: Mensaje) {
  const s = usePartida.getState();
  if (m.t === 'hola') {
    const p = (m.partida ?? {}) as Mensaje;
    usePartida.setState({ yo: String(m.id), jugadores: jugadoresDe(p.jugadores) });
    if (p.fase === 'juego') reloj({ ahora: m.ahora, inicio: p.inicio, fin: p.fin });
    if (p.fase === 'fin' && typeof p.recibo === 'string') terminar(p.recibo, jugadoresDe(p.jugadores));
    if (p.fase === 'cancelada') usePartida.setState({ estado: 'cancelada' });
  } else if (m.t === 'entra') {
    if (!s.jugadores.some((j) => j.id === m.id))
      usePartida.setState({
        jugadores: [...s.jugadores, { id: String(m.id), nombre: String(m.nombre), puntos: 0, salio: false }],
      });
    else usePartida.setState({ jugadores: s.jugadores.map((j) => (j.id === m.id ? { ...j, salio: false } : j)) });
  } else if (m.t === 'sale') {
    usePartida.setState({ jugadores: s.jugadores.map((j) => (j.id === m.id ? { ...j, salio: true } : j)) });
  } else if (m.t === 'reloj') reloj(m);
  else if (m.t === 'marcador')
    usePartida.setState({
      jugadores: s.jugadores.map((j) => (j.id === m.id ? { ...j, puntos: Number(m.puntos) || 0 } : j)),
    });
  else if (m.t === 'fin' && typeof m.recibo === 'string')
    terminar(
      m.recibo,
      (m.resultados as FilaRecibo[]).map((f) => ({ ...f })),
    );
  else if (m.t === 'cancelada') usePartida.setState({ estado: 'cancelada' });
}

/** Reloj de la partida para el kit de motores: null si no se juega entre dos; `transcurrido` null mientras espera. */
export function relojPartida(): { transcurrido: number | null } | null {
  const s = usePartida.getState();
  if (s.estado === 'nada' || useGame.getState().mg?.juntos?.partidaId !== s.partidaId) return null;
  if (s.inicio === null) return { transcurrido: null };
  return { transcurrido: (Date.now() + s.desfase - s.inicio) / 1000 };
}
let ultimoPuntaje = -1,
  ultimoEnvio = 0;
/** Puntaje propio → sala, como mucho `PARTIDA.puntosHz` veces por segundo (y uno por segundo si no cambia). */
export function reportarPuntos(puntos: number) {
  const s = usePartida.getState(),
    ahora = performance.now();
  if (s.estado !== 'cuenta' && s.estado !== 'jugando') return;
  if (s.estado === 'cuenta' && s.inicio !== null && Date.now() + s.desfase >= s.inicio)
    usePartida.setState({ estado: 'jugando' });
  if (ahora - ultimoEnvio < 1000 / PARTIDA.puntosHz) return;
  if (puntos === ultimoPuntaje && ahora - ultimoEnvio < 1000) return;
  ultimoPuntaje = puntos;
  ultimoEnvio = ahora;
  canal?.enviar({ t: 'puntos', puntos });
  // el propio se ve al instante; la sala lo confirma (acotado) en el marcador
  usePartida.setState({ jugadores: s.jugadores.map((j) => (j.id === s.yo ? { ...j, puntos } : j)) });
}

type Cobro =
  | { ok: true; ya: boolean; monedas: number; xp: number; saldo?: { monedas: number; xp: number; nivel: number } }
  | Fallo;
/** Llegó el recibo: termina la partida propia con lo que contó la sala y lo cobra en Convex. */
async function terminar(recibo: string, filas: JugadorJuntos[] | FilaRecibo[]) {
  const s = usePartida.getState();
  if (s.estado === 'fin' || !s.partidaId) return;
  const jugadores = jugadoresDe(filas);
  usePartida.setState({ estado: 'fin', jugadores, pago: 'pendiente' });
  const mia = (filas as FilaRecibo[]).find((f) => f.id === s.yo);
  const g = useGame.getState();
  // si este navegador se quedó atrás, la partida termina con lo que contó la sala
  if (g.mg?.juntos?.partidaId === s.partidaId && g.mg.phase === 'playing' && mia)
    g.finishMinigame({
      won: mia.gano,
      stars: mia.estrellas as 0 | 1 | 2 | 3,
      score: mia.puntos,
      label: `${mia.puntos} pts`,
    });
  const partidaId = s.partidaId;
  const r = await mutar<Cobro>('partidas:cerrarJuntos', { partidaId, recibo });
  if (usePartida.getState().partidaId !== partidaId) return;
  const mg = useGame.getState().mg;
  const misma = mg?.juntos?.partidaId === partidaId && mg.phase === 'ended' ? mg : null;
  if (!r?.ok) {
    usePartida.setState({ pago: 'rechazado' });
    if (misma) useGame.setState({ mg: { ...misma, pago: r ? 'rechazado' : 'sin-conexion' } });
    return;
  }
  usePartida.setState({ pago: { monedas: r.monedas, xp: r.xp } });
  const saldo = r.saldo;
  if (saldo)
    useGame.setState((st) => ({
      profile: { ...st.profile, coins: saldo.monedas, xp: saldo.xp, level: saldo.nivel },
    }));
  if (misma?.rewards)
    useGame.setState({ mg: { ...misma, pago: 'pagado', rewards: { ...misma.rewards, coins: r.monedas, xp: r.xp } } });
}

// ------------------------------------------------------------------ invitaciones de la sala
export interface InvitacionRecibida extends Invitacion {
  de: string;
  deId: string;
  /** performance.now() en que vence */
  hasta: number;
}
/** Cuánto se ve una invitación. */
export const INVITACION_MS = 60_000;
export const useInvitaciones = create<{ lista: InvitacionRecibida[] }>(() => ({ lista: [] }));
export function quitarInvitacion(sala: string) {
  useInvitaciones.setState((s) => ({ lista: s.lista.filter((i) => i.sala !== sala) }));
}
if (net.online) {
  net.on('invita', (p, data) => {
    let inv: Invitacion;
    try {
      inv = JSON.parse(data ?? '') as Invitacion;
    } catch {
      return;
    }
    if (inv.tipo !== 'juego' && inv.tipo !== 'viaje') return;
    const hasta = performance.now() + INVITACION_MS;
    useInvitaciones.setState((s) => ({
      lista: [
        ...s.lista.filter((i) => i.sala !== inv.sala && i.hasta > performance.now()),
        { ...inv, de: p.name, deId: p.id, hasta },
      ].slice(-4),
    }));
    setTimeout(() => quitarInvitacion(inv.sala), INVITACION_MS);
  });
  // al salir del minijuego (o volver a jugar solo) se deja la partida
  useGame.subscribe((g) => {
    const s = usePartida.getState();
    if (s.estado === 'nada' || s.estado === 'abriendo') return;
    if (g.mg?.juntos?.partidaId !== s.partidaId) salirDePartida();
  });
}
