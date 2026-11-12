// Topes de la sala en vivo (workers/salas): qué se acepta de cada jugador y con qué ritmo.

/** Animaciones que la sala reparte; cualquier otra llega como 'idle'. Son las `Anim` del kit del juego. */
export const ANIMACIONES = [
  'idle',
  'walk',
  'run',
  'jump',
  'fall',
  'dance',
  'dance2',
  'celebrate',
  'wave',
  'clap',
  'kick',
  'throw',
  'carry',
  'drive',
  'sit',
] as const;
export type Animacion = (typeof ANIMACIONES)[number];

export const SALA = {
  /** jugadores por sala */
  cupo: 24,
  /** largo máximo de un mensaje en caracteres */
  mensajeMax: 512,
  /** largo máximo del id de un emote */
  emoteMax: 32,
  /** largo máximo del nombre visible */
  nombreMax: 16,
  /** límites de cada coordenada; lo que se sale se recorta al borde */
  limites: {
    x: [-1000, 1000],
    y: [-50, 500],
    z: [-1000, 1000],
    yaw: [-10, 10],
  },
  /** cubeta de mensajes por jugador: `rafaga` de golpe y `porSegundo` sostenidos; lo demás se ignora */
  ritmo: { porSegundo: 20, rafaga: 40 },
  /** veces por segundo que el juego manda su posición (cabe en el ritmo y deja aire para emotes) */
  envioHz: 15,
  /** cuánto dura un pase firmado: solo tiene que servir para conectarse */
  paseMs: 60_000,
  /** tramos por zona: `mapa:0` … `mapa:39` */
  tramosMax: 40,
  /** códigos con que la sala cierra el WebSocket al rechazar (el navegador no deja leer el estado HTTP) */
  cierre: {
    /** pase ausente, roto, con otra firma o vencido */
    pase: 4001,
    /** pase de otra sala */
    otraSala: 4003,
    /** tramo lleno: probá el siguiente */
    llena: 4009,
    /** el mismo jugador entró desde otra pestaña */
    reemplazado: 4010,
  },
} as const;

/** Nombres de sala: `mapa:N` o `dept:<id>:N`, con N entre 0 y `tramosMax - 1`. */
const NOMBRE_SALA = /^(mapa|dept:[a-z]{2,24}):(\d{1,2})$/;
/** Zona de una sala (`mapa` o `dept:<id>`) y su tramo, o null si el nombre no vale. */
export function partirSala(nombre: unknown): { zona: string; tramo: number } | null {
  const m = typeof nombre === 'string' ? NOMBRE_SALA.exec(nombre) : null;
  if (!m) return null;
  const tramo = Number(m[2]);
  return tramo < SALA.tramosMax && String(tramo) === m[2] ? { zona: m[1], tramo } : null;
}
export const salaValida = (nombre: unknown): nombre is string => partirSala(nombre) !== null;
/** Zona válida para pedir tramo: `mapa` o `dept:<id>`. */
export const zonaValida = (zona: unknown): zona is string => typeof zona === 'string' && salaValida(`${zona}:0`);
export const nombreSala = (zona: string, tramo: number) => `${zona}:${tramo}`;
/** Salas cerradas: una partida entre amigos (`juego:<partidaId>`, MC-25) o un viaje compartido (`viaje:<id>`, MC-31). */
const SALA_CERRADA = /^(juego|viaje):([A-Za-z0-9_-]{6,40})$/;
export function partirSalaCerrada(nombre: unknown): { tipo: 'juego' | 'viaje'; id: string } | null {
  const m = typeof nombre === 'string' ? SALA_CERRADA.exec(nombre) : null;
  return m ? { tipo: m[1] as 'juego' | 'viaje', id: m[2] } : null;
}

const PERMITIDAS: ReadonlySet<string> = new Set(ANIMACIONES);
/** Animación válida o 'idle'. */
export const animacionPermitida = (a: unknown): Animacion =>
  typeof a === 'string' && PERMITIDAS.has(a) ? (a as Animacion) : 'idle';

/** Recorta una coordenada a sus límites; lo que no es un número finito vale 0. */
export function acotarEje(eje: keyof typeof SALA.limites, v: unknown): number {
  const [min, max] = SALA.limites[eje];
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : 0;
}

/** Nombre visible: solo letras, números, espacio, `_` y `-`, máximo `nombreMax`. */
export const limpiarNombre = (n: string | null | undefined) =>
  (n ?? 'Catracho').replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, SALA.nombreMax) || 'Catracho';

/** Emote aceptable: un id corto de la forma `emote_algo`. */
export const emoteValido = (id: unknown): id is string =>
  typeof id === 'string' && id.length <= SALA.emoteMax && /^emote_[a-z0-9_]{1,26}$/.test(id);

export interface Cubeta {
  fichas: number;
  /** milisegundos de la última recarga */
  t: number;
}
export const cubetaNueva = (ahora: number): Cubeta => ({ fichas: SALA.ritmo.rafaga, t: ahora });
/** Gasta una ficha si hay; devuelve false si el jugador va más rápido de lo permitido. Modifica la cubeta. */
export function permitirMensaje(c: Cubeta, ahora: number): boolean {
  const { porSegundo, rafaga } = SALA.ritmo;
  c.fichas = Math.min(rafaga, c.fichas + (Math.max(0, ahora - c.t) / 1000) * porSegundo);
  c.t = ahora;
  if (c.fichas < 1) return false;
  c.fichas -= 1;
  return true;
}
