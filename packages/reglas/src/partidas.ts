// Abrir y cerrar una partida. El servidor mide la duración con su propio reloj, valida el resultado con
// `validarResultado` y paga una sola vez con `premioPartida` y `ganarXp`. Funciones puras: Convex las llama.
import { type Avance, ganarXp, premioPartida } from './premios.ts';
import { DURACION_MAX_S, type Tema, validarResultado } from './topes.ts';

export interface JuegoDeCatalogo {
  motor: string;
  etapas: number;
  tema?: Tema;
}

/** Entre dos aperturas del mismo jugador tiene que pasar al menos esto (ms). */
export const APERTURA_MIN_MS = 1000;
export type Turno = { ok: true; abandonar: string[] } | { ok: false; motivo: string };
/**
 * Un jugador tiene como mucho una partida abierta. Al abrir otra, las anteriores quedan «abandonada» sin pagar
 * (también las que dejó al salir de un minijuego). Abrir más seguido que `APERTURA_MIN_MS` se rechaza.
 */
export function turnoDeApertura({
  abiertas,
  ahora,
}: {
  abiertas: readonly { id: string; inicio: number }[];
  ahora: number;
}): Turno {
  if (abiertas.some((p) => ahora - p.inicio < APERTURA_MIN_MS)) return { ok: false, motivo: 'muy seguido' };
  return { ok: true, abandonar: abiertas.map((p) => p.id) };
}
export type Apertura = { ok: true; motor: string; etapa: number; etapas: number } | { ok: false; motivo: string };
/**
 * ¿Se puede abrir esta partida? Con `juego` (del catálogo del servidor) el motor y las etapas salen de ahí;
 * sin juego (minijuego suelto) el motor tiene que existir en `motoresSueltos` y se juega una sola etapa.
 */
export function decidirApertura({
  motor,
  etapa,
  juego,
  motoresSueltos,
}: {
  motor: string;
  etapa: number;
  juego: JuegoDeCatalogo | null;
  motoresSueltos: readonly string[];
}): Apertura {
  if (!Number.isInteger(etapa) || etapa < 0) return { ok: false, motivo: 'etapa inválida' };
  if (juego) {
    if (juego.motor !== motor) return { ok: false, motivo: 'el motor no es el de ese juego' };
    if (!Number.isInteger(juego.etapas) || etapa >= juego.etapas) return { ok: false, motivo: 'etapa fuera del juego' };
    return { ok: true, motor, etapa, etapas: juego.etapas };
  }
  if (!motoresSueltos.includes(motor)) return { ok: false, motivo: 'motor desconocido' };
  if (etapa !== 0) return { ok: false, motivo: 'etapa fuera del juego' };
  return { ok: true, motor, etapa, etapas: 1 };
}

export interface PartidaAbierta {
  estado: string;
  jugadores: readonly string[];
  motor: string;
  etapa: number;
  etapas: number;
  /** milisegundos Unix del servidor al abrir */
  inicio: number;
  /** tema del juego en el catálogo, para los motores que sacan de ahí sus metas */
  tema?: Tema;
}
export interface Cierre {
  puntos: number;
  estrellas: number;
  gano: boolean;
}
export type DecisionCierre =
  /** no se toca la partida: no existe para este jugador o ya se cerró */
  | { tipo: 'error'; motivo: 'ajena' | 'cerrada' }
  /** se cierra sin pagar */
  | { tipo: 'rechazada' | 'vencida'; motivos: string[]; duracion: number }
  | {
      tipo: 'pagada';
      duracion: number;
      /** premio de la partida */
      monedas: number;
      /** premio por los niveles que subió */
      bono: number;
      xp: number;
      estrellas: number;
      avance: Avance & { subidas: number };
    };

/** Cierra una partida con la duración del servidor (`ahora − inicio`), nunca con la que diga el navegador. */
export function decidirCierre({
  partida,
  usuarioId,
  ahora,
  cierre,
  avance,
}: {
  partida: PartidaAbierta;
  usuarioId: string;
  ahora: number;
  cierre: Cierre;
  avance: Avance;
}): DecisionCierre {
  if (!partida.jugadores.includes(usuarioId)) return { tipo: 'error', motivo: 'ajena' };
  if (partida.estado !== 'abierta') return { tipo: 'error', motivo: 'cerrada' };
  const duracion = (ahora - partida.inicio) / 1000;
  if (duracion > DURACION_MAX_S) return { tipo: 'vencida', motivos: ['partida abandonada'], duracion };
  const v = validarResultado({
    motor: partida.motor,
    puntos: cierre.puntos,
    estrellas: cierre.estrellas,
    gano: cierre.gano,
    duracion,
    etapa: partida.etapa,
    etapas: partida.etapas,
    tema: partida.tema,
  });
  if (!v.ok) return { tipo: 'rechazada', motivos: v.motivos, duracion };
  // un motor sin tope no se puede validar: no paga
  if (!v.conocido) return { tipo: 'rechazada', motivos: ['motor sin tope'], duracion };
  const premio = premioPartida({ gano: cierre.gano, estrellas: cierre.estrellas }),
    nuevo = ganarXp(avance, premio.xp);
  return {
    tipo: 'pagada',
    duracion,
    monedas: premio.monedas,
    bono: nuevo.monedas,
    xp: premio.xp,
    estrellas: premio.estrellas,
    avance: { nivel: nuevo.nivel, xp: nuevo.xp, subidas: nuevo.subidas },
  };
}
