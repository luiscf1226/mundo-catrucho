import type { Settings } from '../core/store';

/** Celular (puntero grueso) o CPU de hasta cuatro hilos: arranca en calidad baja. */
export const COMPACT_QUALITY =
  matchMedia('(pointer: coarse)').matches || (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4);

/** La calidad que de verdad se usa: la baja automática solo mientras el jugador no elija otra en Ajustes. */
export const calidadEfectiva = (s: Pick<Settings, 'quality' | 'calidadElegida'>): Settings['quality'] =>
  COMPACT_QUALITY && !s.calidadElegida ? 'baja' : s.quality;
