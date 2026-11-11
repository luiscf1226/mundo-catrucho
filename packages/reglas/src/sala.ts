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
} as const;

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

/** Emote aceptable: un id corto. */
export const emoteValido = (id: unknown): id is string => typeof id === 'string' && id.length <= SALA.emoteMax;

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
