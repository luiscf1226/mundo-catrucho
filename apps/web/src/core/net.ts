// Capa de red. Sin salas en vivo existe solo LocalNet (un jugador + compañeros simulados) y no hay ninguna petición.
// Con VITE_SALAS_URL y VITE_CONVEX_URL en la compilación, SalaNet conecta al jugador con la sala en vivo de su zona
// (workers/salas): pide a Convex un pase firmado (MC-18), entra al primer tramo con espacio (MC-20), manda su
// posición 15 veces por segundo y recibe a los demás para dibujarlos suavizados (MC-19) con sus emotes (MC-21).
import { partirSala, SALA } from '@mundo-catrucho/reglas';
import { ConvexHttpClient } from 'convex/browser';
import { makeFunctionReference } from 'convex/server';
import { create } from 'zustand';
import { SHOP } from './data';
import { secretoInvitado } from './servidor';
import type { Anim, AvatarConfig, V3 } from './types';

/** Una posición recibida, con la hora local en que llegó. */
export interface Muestra {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
}
export interface RemotePlayer {
  id: string;
  name: string;
  avatar: AvatarConfig;
  pos: V3;
  yaw: number;
  anim: Anim;
  /** últimas posiciones recibidas (la más nueva al final) para dibujarlo suavizado */
  muestras: Muestra[];
  /** emote que está haciendo y hasta cuándo (performance.now) */
  emote: { id: string; hasta: number } | null;
  /** false hasta que llega su primera posición (no se dibuja en el origen) */
  listo: boolean;
  /** MC-23: bot de relleno de la sala; camina su ruta (relativa al punto de aparición) y no cuenta como gente */
  bot?: { ruta: [number, number][]; vel: number; fase: number };
}
/** MC-25, MC-31: invitación que alguien de la sala manda a los demás (partida o viaje compartido). */
export interface Invitacion {
  tipo: 'juego' | 'viaje';
  /** `juego:<partidaId>` o `viaje:<id>` */
  sala: string;
  /** juego del catálogo (partida) */
  juego?: string;
  /** vehículo y destino (viaje) */
  veh?: string;
  a?: string;
}
export interface RoomInfo {
  code: string;
  mode: 'solo' | 'publica' | 'privada';
  players: number;
  max: number;
  name: string;
}
type Evento = 'join' | 'leave' | 'emote' | 'chat' | 'invita';
export interface NetAdapter {
  readonly online: boolean;
  listRooms(): Promise<RoomInfo[]>;
  createRoom(mode: 'publica' | 'privada'): Promise<RoomInfo>;
  joinRoom(code: string): Promise<RoomInfo | null>;
  leaveRoom(): void;
  /** zona donde anda el jugador: `mapa`, `dept:<id>` o null (minijuego, viaje, menú o jugando solo) */
  setZone(zona: string | null): void;
  /** vuelve a entrar a la sala de la zona actual (después de otra pestaña o sin conexión) */
  reconnect(): void;
  /** estado propio → sala (lo limita a `SALA.envioHz`) */
  sendState(pos: V3, yaw: number, anim: Anim): void;
  /** emote propio → los demás de la sala */
  sendEmote(id: string): void;
  /** invitación a los demás de la sala (le llega como evento 'invita' con la invitación en JSON) */
  sendInvite(inv: Invitacion): void;
  /** jugadores remotos de la sala actual */
  players(): RemotePlayer[];
  on(ev: Evento, cb: (p: RemotePlayer, data?: string) => void): () => void;
}

/** Cómo va la conexión, para la interfaz (panel de salas) y las pruebas. */
export interface EstadoSala {
  estado: 'apagada' | 'buscando' | 'en-sala' | 'sin-conexion' | 'otra-pestana';
  /** nombre de la sala (`mapa:0`) */
  sala: string | null;
  /** quiénes están, sin contarte a vos */
  otros: number;
}
export const useSala = create<EstadoSala>(() => ({ estado: 'apagada', sala: null, otros: 0 }));

/** Nombre corto para la interfaz: «Mapa · tramo 1», «Olancho · tramo 2». */
export function nombreDeSala(sala: string | null, deptName: (id: string) => string = (id) => id) {
  const p = partirSala(sala);
  if (!p) return 'Sin sala';
  const zona = p.zona === 'mapa' ? 'Mapa' : deptName(p.zona.slice(5));
  return `${zona} · tramo ${p.tramo + 1}`;
}

/** Retraso con que se dibuja a los demás: dos envíos, para tener siempre entre qué dos posiciones interpolar. */
export const RETRASO_MS = Math.round((2 * 1000) / SALA.envioHz);
const angLerp = (a: number, b: number, k: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;
/** Posición interpolada de un remoto en la hora `t`. Si faltan datos se queda en la última (sin adivinar). */
export function muestraEn(m: Muestra[], t: number, out: Muestra): Muestra {
  const last = m[m.length - 1];
  if (!last) return out;
  let a = last,
    b = last;
  for (let i = m.length - 1; i > 0; i--)
    if (m[i - 1].t <= t) {
      a = m[i - 1];
      b = m[i];
      break;
    }
  if (t <= m[0].t) a = b = m[0];
  const k = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 1;
  out.t = t;
  out.x = a.x + (b.x - a.x) * k;
  out.y = a.y + (b.y - a.y) * k;
  out.z = a.z + (b.z - a.z) * k;
  out.yaw = angLerp(a.yaw, b.yaw, k);
  return out;
}

const code = () =>
  Array.from({ length: 5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
export class LocalNet implements NetAdapter {
  readonly online = false;
  private rooms: RoomInfo[] = [
    { code: 'TEGUS', mode: 'publica', players: 7, max: 16, name: 'Plaza de Tegus' },
    { code: 'CEIBA', mode: 'publica', players: 12, max: 16, name: 'Carnaval ceibeño' },
    { code: 'COPAN', mode: 'publica', players: 4, max: 16, name: 'Exploradores de Copán' },
  ];
  async listRooms() {
    return this.rooms;
  }
  async createRoom(mode: 'publica' | 'privada') {
    const r: RoomInfo = {
      code: code(),
      mode,
      players: 1,
      max: mode === 'privada' ? 8 : 16,
      name: mode === 'privada' ? 'Sala privada' : 'Sala nueva',
    };
    if (mode === 'publica') this.rooms.unshift(r);
    return r;
  }
  async joinRoom(c: string) {
    const k = c.trim().toUpperCase();
    return (
      this.rooms.find((r) => r.code === k) ??
      (/^[A-Z0-9]{5}$/.test(k) ? { code: k, mode: 'privada' as const, players: 1, max: 8, name: 'Sala privada' } : null)
    );
  }
  leaveRoom() {
    /* local */
  }
  setZone() {
    /* local */
  }
  reconnect() {
    /* local */
  }
  sendState() {
    /* local */
  }
  sendEmote() {
    /* local */
  }
  sendInvite() {
    /* local */
  }
  players() {
    return [];
  }
  on() {
    return () => {};
  }
}

// ------------------------------------------------------------------ sala en vivo
type Respuesta = { ok: true; pase: string; id: string } | { ok: false; motivo: string };
const paseRef = makeFunctionReference<'mutation', { invitado: string; sala: string; nombre?: string }, Respuesta>(
  'salas:pase',
);
const MOVIMIENTO: ReadonlySet<Anim> = new Set(['walk', 'run', 'jump', 'fall']);
/** Plazo de cada paso (preguntar el tramo, pedir el pase, abrir la conexión). */
const PLAZO_MS = 6000;
const conPlazo = <T>(p: Promise<T>, ms = PLAZO_MS) =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]).catch(() => null);
const avatarDe = (a: Record<string, string> | undefined): AvatarConfig => ({
  ...SHOP.defaultAvatar,
  ...(a ?? {}),
});
type Entrante = {
  id: string;
  nombre: string;
  bot?: boolean;
  ruta?: [number, number][];
  vel?: number;
  fase?: number;
  avatar?: Record<string, string>;
  x?: number;
  y?: number;
  z?: number;
  yaw?: number;
  anim?: string;
};

export class SalaNet implements NetAdapter {
  readonly online = true;
  private remotos = new Map<string, RemotePlayer>();
  private oyentes = new Map<Evento, Set<(p: RemotePlayer, data?: string) => void>>();
  private zona: string | null = null;
  private ws: WebSocket | null = null;
  /** sube cada vez que se cambia de zona: una conexión vieja que termina tarde no pisa a la nueva */
  private turno = 0;
  private reintento: ReturnType<typeof setTimeout> | undefined;
  private espera = 2000;
  private ultimoEnvio = 0;
  private proximo = 0;
  private ultimo = '';
  private convex: ConvexHttpClient;
  /** nombre propio (lo pone el juego); va al pase */
  nombre = () => 'Catracho';

  constructor(
    private readonly base: string,
    convexUrl: string,
  ) {
    this.convex = new ConvexHttpClient(convexUrl, { logger: false });
  }

  async listRooms(): Promise<RoomInfo[]> {
    const { sala, otros } = useSala.getState();
    return sala ? [{ code: sala, mode: 'publica', players: otros + 1, max: SALA.cupo, name: nombreDeSala(sala) }] : [];
  }
  async createRoom(): Promise<RoomInfo> {
    // las salas en vivo se reparten solas por zona y tramo; las privadas con código todavía no existen
    const [r] = await this.listRooms();
    return r ?? { code: '', mode: 'publica', players: 1, max: SALA.cupo, name: 'Sala en vivo' };
  }
  async joinRoom() {
    return null;
  }
  leaveRoom() {
    this.setZone(null);
  }

  setZone(zona: string | null) {
    if (zona === this.zona) return;
    this.zona = zona;
    this.espera = 2000;
    void this.conectar();
  }

  reconnect() {
    if (useSala.getState().estado === 'en-sala' || useSala.getState().estado === 'buscando') return;
    this.espera = 2000;
    void this.conectar();
  }

  private soltar() {
    clearTimeout(this.reintento);
    const ws = this.ws;
    this.ws = null;
    if (ws) {
      ws.onclose = ws.onmessage = null;
      try {
        ws.close(1000, 'cambio');
      } catch {
        /* ya estaba cerrado */
      }
    }
    for (const r of this.remotos.values()) this.emitir('leave', r);
    this.remotos.clear();
  }

  private async conectar() {
    const turno = ++this.turno;
    this.soltar();
    const zona = this.zona;
    if (!zona) {
      useSala.setState({ estado: 'apagada', sala: null, otros: 0 });
      return;
    }
    useSala.setState({ estado: 'buscando', sala: null, otros: 0 });
    let desde = 0;
    for (let intento = 0; intento < SALA.tramosMax && turno === this.turno; intento++) {
      const libre = await conPlazo(
        fetch(`${this.base}/libre/${encodeURIComponent(zona)}?desde=${desde}`).then(
          (r) => r.json() as Promise<{ sala: string | null }>,
        ),
      );
      if (turno !== this.turno) return;
      if (!libre?.sala) return this.fallar(turno, !libre);
      const r = await conPlazo(
        this.convex.mutation(paseRef, { invitado: secretoInvitado(), sala: libre.sala, nombre: this.nombre() }),
      );
      if (turno !== this.turno) return;
      if (!r?.ok) return this.fallar(turno, true);
      const fin = await this.abrir(turno, libre.sala, r.pase);
      if (fin === 'ok' || turno !== this.turno) return;
      if (fin !== SALA.cierre.llena) return this.fallar(turno, true);
      // se llenó entre la pregunta y la entrada: el siguiente tramo
      desde = (partirSala(libre.sala)?.tramo ?? 0) + 1;
    }
    if (turno === this.turno) this.fallar(turno, false);
  }

  /** Abre el WebSocket; devuelve 'ok' al recibir la bienvenida o el código con que la sala cerró. */
  private abrir(turno: number, sala: string, pase: string) {
    const url = `${this.base.replace(/^http/, 'ws')}/sala/${encodeURIComponent(sala)}?pase=${encodeURIComponent(pase)}`;
    return new Promise<'ok' | number>((res) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      let dentro = false;
      const plazo = setTimeout(() => {
        if (!dentro) {
          ws.close();
          res(0);
        }
      }, PLAZO_MS);
      ws.onmessage = (e) => {
        if (turno !== this.turno) return;
        let m: Record<string, unknown>;
        try {
          m = JSON.parse(String(e.data));
        } catch {
          return;
        }
        if (m.t === 'hola' && !dentro) {
          dentro = true;
          clearTimeout(plazo);
          this.espera = 2000;
          for (const j of (m.jugadores as Entrante[]) ?? []) this.agregar(j);
          for (const b of (m.bots as Entrante[]) ?? []) this.agregar({ ...b, bot: true });
          useSala.setState({ estado: 'en-sala', sala, otros: this.gente() });
          this.ultimo = '';
          res('ok');
        } else this.recibir(m);
      };
      ws.onclose = (e) => {
        clearTimeout(plazo);
        if (!dentro) return res(e.code);
        if (turno !== this.turno) return;
        this.ws = null;
        for (const r of this.remotos.values()) this.emitir('leave', r);
        this.remotos.clear();
        if (e.code === SALA.cierre.reemplazado) {
          useSala.setState({ estado: 'otra-pestana', sala: null, otros: 0 });
          return;
        }
        this.fallar(turno, true);
      };
    });
  }

  /** Sin sala: avisa y reintenta más tarde (cada vez más despacio, hasta 30 s). */
  private fallar(turno: number, reintentar: boolean) {
    if (turno !== this.turno) return;
    useSala.setState({ estado: 'sin-conexion', sala: null, otros: 0 });
    if (!reintentar) return;
    clearTimeout(this.reintento);
    this.reintento = setTimeout(() => {
      if (turno === this.turno) void this.conectar();
    }, this.espera);
    this.espera = Math.min(30000, this.espera * 2);
  }

  private agregar(j: Entrante) {
    const ahora = performance.now();
    const m: Muestra = { t: ahora, x: j.x ?? 0, y: j.y ?? 0, z: j.z ?? 0, yaw: j.yaw ?? 0 };
    const r: RemotePlayer = {
      id: j.id,
      name: j.nombre,
      avatar: avatarDe(j.avatar),
      pos: [m.x, m.y, m.z],
      yaw: m.yaw,
      anim: (j.anim as Anim) ?? 'idle',
      muestras: [m],
      emote: null,
      listo: m.x !== 0 || m.y !== 0 || m.z !== 0,
    };
    if (j.bot && Array.isArray(j.ruta) && j.ruta.length > 1) {
      r.bot = { ruta: j.ruta, vel: Number(j.vel) || 1.4, fase: Number(j.fase) || 0 };
      r.name = `🤖 ${j.nombre} · bot`;
      r.anim = 'walk';
      r.listo = true;
    }
    this.remotos.set(j.id, r);
    this.emitir('join', r);
  }

  private recibir(m: Record<string, unknown>) {
    const r = typeof m.id === 'string' ? this.remotos.get(m.id) : undefined;
    if (m.t === 'entra') {
      this.agregar(m as unknown as Entrante);
      useSala.setState({ otros: this.gente() });
    } else if (m.t === 'sale' && r) {
      this.remotos.delete(r.id);
      this.emitir('leave', r);
      useSala.setState({ otros: this.gente() });
    } else if (m.t === 'invita' && r && !r.bot) {
      this.emitir('invita', r, JSON.stringify({ tipo: m.tipo, sala: m.sala, juego: m.juego, veh: m.veh, a: m.a }));
    } else if (m.t === 'pos' && r) {
      const x = Number(m.x) || 0,
        y = Number(m.y) || 0,
        z = Number(m.z) || 0,
        yaw = Number(m.yaw) || 0;
      const t = performance.now();
      // la primera posición real reemplaza a la de bienvenida: que no se deslice desde el origen
      if (!r.listo) r.muestras.length = 0;
      r.listo = true;
      r.muestras.push({ t, x, y, z, yaw });
      if (r.muestras.length > 6) r.muestras.shift();
      r.pos = [x, y, z];
      r.yaw = yaw;
      r.anim = (m.anim as Anim) ?? 'idle';
      // si se pone a caminar o saltar, el emote se acaba (como en PlayerController)
      if (r.emote && MOVIMIENTO.has(r.anim)) r.emote = null;
    } else if (m.t === 'emote' && r && typeof m.emote === 'string') {
      r.emote = { id: m.emote, hasta: performance.now() + 4200 };
      this.emitir('emote', r, m.emote);
    }
  }

  private emitir(ev: Evento, p: RemotePlayer, data?: string) {
    for (const cb of this.oyentes.get(ev) ?? []) cb(p, data);
  }

  sendState(pos: V3, yaw: number, anim: Anim) {
    const ws = this.ws,
      ahora = performance.now();
    if (!ws || ws.readyState !== WebSocket.OPEN || ahora < this.proximo) return;
    // reloj fijo de `envioHz`: los cuadros irregulares no bajan el ritmo, y si se atrasó no manda en ráfaga
    const periodo = 1000 / SALA.envioHz;
    this.proximo = ahora - this.proximo > periodo ? ahora + periodo : this.proximo + periodo;
    const r = (v: number) => Math.round(v * 100) / 100;
    const msg = JSON.stringify({ t: 'pos', x: r(pos[0]), y: r(pos[1]), z: r(pos[2]), yaw: r(yaw), anim });
    // quieto: basta un recordatorio por segundo
    if (msg === this.ultimo && ahora - this.ultimoEnvio < 1000) return;
    this.ultimoEnvio = ahora;
    this.ultimo = msg;
    ws.send(msg);
  }
  sendEmote(id: string) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: 'emote', id }));
  }
  sendInvite(inv: Invitacion) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify({ t: 'invita', ...inv }));
  }
  /** gente de verdad en la sala, sin contarte a vos ni a los bots */
  private gente() {
    let n = 0;
    for (const r of this.remotos.values()) if (!r.bot) n++;
    return n;
  }
  players() {
    return [...this.remotos.values()];
  }
  on(ev: Evento, cb: (p: RemotePlayer, data?: string) => void) {
    let s = this.oyentes.get(ev);
    if (!s) this.oyentes.set(ev, (s = new Set()));
    s.add(cb);
    return () => {
      s.delete(cb);
    };
  }
}

const URL_SALAS = import.meta.env.VITE_SALAS_URL as string | undefined,
  URL_CONVEX = import.meta.env.VITE_CONVEX_URL as string | undefined;
/** ¿Hay salas en vivo? Solo si la compilación trae las dos direcciones (la sala y Convex para el pase). */
export const EN_VIVO = !!URL_SALAS && !!URL_CONVEX;
export const net: NetAdapter =
  URL_SALAS && URL_CONVEX ? new SalaNet(URL_SALAS.replace(/\/+$/, ''), URL_CONVEX) : new LocalNet();
/** Zona de una escena: el mapa gigante o un departamento; lo demás no tiene sala en vivo. */
export const zonaDeEscena = (scene: { kind: string; id?: string }) =>
  scene.kind === 'lobby' ? 'mapa' : scene.kind === 'dept' && scene.id ? `dept:${scene.id}` : null;
