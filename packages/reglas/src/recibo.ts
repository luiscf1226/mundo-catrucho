// Partida entre amigos (MC-25). Convex abre la partida y firma un «acta» (motor, etapa, semilla y cupo) que cada
// jugador lleva a la sala `juego:<partidaId>`. La sala lleva el reloj, junta los puntajes acotados y al terminar
// firma un «recibo» con el mismo `SALA_SECRETO`. Convex lo verifica y paga una sola vez a cada jugador.
// Funciones puras: las usan la sala, Convex y las pruebas.

import { firmarDatos, leerFirmado } from './pase.ts';
import { premioPartida } from './premios.ts';
import { DURACION_MAX_S, difDe, estrellasPara, HOLGURA_S, TOPES, validarResultado } from './topes.ts';

export const PARTIDA = {
  /** jugadores por partida (dúo) */
  cupo: 2,
  /** cuenta regresiva desde que están todos hasta que arranca el reloj */
  cuentaMs: 3000,
  /** después del fin, cuánto espera la sala los últimos puntajes antes de firmar */
  graciaMs: 1500,
  /** si nadie más entra en este tiempo, la partida se cancela sin recibo */
  esperaMaxMs: 3 * 60_000,
  /** cuánto vale un acta para entrar a la sala */
  actaMs: 10 * 60_000,
  /** un recibo más viejo que esto ya no paga */
  reciboMaxMs: 15 * 60_000,
  /** veces por segundo que el juego manda su puntaje (cabe de sobra en el ritmo de la sala) */
  puntosHz: 4,
} as const;

/** Lo que Convex le dice a la sala de la partida. Viaja firmado junto al pase. */
export interface Acta {
  partidaId: string;
  motor: string;
  etapa: number;
  etapas: number;
  semilla: number;
  cupo: number;
  /** milisegundos Unix */
  vence: number;
}
export interface FilaRecibo {
  /** id público del jugador (el del pase) */
  id: string;
  nombre: string;
  puntos: number;
  estrellas: number;
  gano: boolean;
  /** se fue antes del final: cuenta con lo último que reportó */
  salio: boolean;
}
export interface Recibo {
  partidaId: string;
  motor: string;
  etapa: number;
  etapas: number;
  resultados: FilaRecibo[];
  /** segundos de juego según el reloj de la sala */
  duracion: number;
  /** milisegundos Unix en que la sala firmó */
  momento: number;
}

const entero = (n: unknown): n is number => typeof n === 'number' && Number.isInteger(n);
const finito = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const texto = (s: unknown, max = 64): s is string => typeof s === 'string' && s.length > 0 && s.length <= max;

/** ¿Este motor se puede jugar entre dos? Solo los del kit: reloj fijo y metas conocidas. */
export const motorJuntos = (motor: string) => !!TOPES[motor]?.kit;
/** Segundos que dura la partida de ese motor y etapa, igual que el reloj del kit en el juego. */
export function duracionPartida(motor: string, etapa: number, etapas: number) {
  const t = TOPES[motor];
  const s = t?.reloj?.(difDe(etapa, etapas));
  return finito(s) ? s : 0;
}
function metasDe(motor: string, etapa: number, etapas: number) {
  return TOPES[motor]?.metas?.(difDe(etapa, etapas), {}) ?? null;
}
/**
 * Recorta un puntaje reportado a lo que cabe en `segundos` de juego: nunca negativo, nunca más que el ritmo máximo
 * del motor (`TOPES`) ni que su tope absoluto. Lo que no es número vale 0.
 */
export function acotarPuntos(a: { motor: string; etapa: number; etapas: number; puntos: unknown; segundos: number }) {
  const t = TOPES[a.motor];
  if (!t || !finito(a.puntos)) return 0;
  const dif = difDe(a.etapa, a.etapas),
    pps = typeof t.puntosPorSegundo === 'function' ? t.puntosPorSegundo(dif, {}) : t.puntosPorSegundo,
    // un poco de holgura por la latencia, pero nunca más que el reloj completo (así lo mide `validarResultado`)
    segundos = Math.max(0, Math.min(a.segundos + HOLGURA_S, t.reloj?.(dif) ?? DURACION_MAX_S)),
    max = Math.min(t.puntosMax?.(dif) ?? Number.POSITIVE_INFINITY, pps * segundos);
  return Math.max(0, Math.min(Math.floor(max), Math.round(a.puntos)));
}
/** Fila del recibo para un puntaje ya acotado: estrellas por las metas y ganar al llegar a la primera. */
export function filaDe(
  p: { motor: string; etapa: number; etapas: number },
  j: { id: string; nombre: string; puntos: number; salio: boolean },
): FilaRecibo {
  const metas = metasDe(p.motor, p.etapa, p.etapas);
  return {
    id: j.id,
    nombre: j.nombre,
    puntos: j.puntos,
    estrellas: metas ? estrellasPara(j.puntos, metas) : 0,
    gano: metas ? j.puntos >= metas[0] : false,
    salio: j.salio,
  };
}

// ------------------------------------------------------------------ acta
export const firmarActa = (acta: Acta, secreto: string) => firmarDatos('acta', acta, secreto);
/** El acta si la firma cuadra, no venció y trae todo; si no, null. */
export async function leerActa(token: unknown, secreto: string, ahora = Date.now()): Promise<Acta | null> {
  const a = (await leerFirmado('acta', token, secreto, 2048)) as Partial<Acta> | null;
  if (!a || !texto(a.partidaId, 40) || !texto(a.motor) || !motorJuntos(a.motor)) return null;
  if (!entero(a.etapa) || !entero(a.etapas) || a.etapa < 0 || a.etapa >= a.etapas) return null;
  if (!entero(a.semilla) || !entero(a.cupo) || a.cupo < 2 || a.cupo > 8) return null;
  if (!finito(a.vence) || a.vence < ahora) return null;
  return {
    partidaId: a.partidaId,
    motor: a.motor,
    etapa: a.etapa,
    etapas: a.etapas,
    semilla: a.semilla,
    cupo: a.cupo,
    vence: a.vence,
  };
}

// ------------------------------------------------------------------ recibo
export const firmarRecibo = (r: Recibo, secreto: string) => firmarDatos('recibo', r, secreto);
/** El recibo si la firma cuadra y trae la forma correcta; si no, null. No decide si paga: eso es `decidirRecibo`. */
export async function verificarRecibo(token: unknown, secreto: string): Promise<Recibo | null> {
  const r = (await leerFirmado('recibo', token, secreto, 8192)) as Partial<Recibo> | null;
  if (!r || !texto(r.partidaId, 40) || !texto(r.motor) || !entero(r.etapa) || !entero(r.etapas)) return null;
  if (!finito(r.duracion) || !finito(r.momento) || !Array.isArray(r.resultados) || r.resultados.length > 8) return null;
  const filas: FilaRecibo[] = [];
  for (const f of r.resultados as Partial<FilaRecibo>[]) {
    if (!f || !texto(f.id, 24) || typeof f.nombre !== 'string' || !finito(f.puntos)) return null;
    if (!entero(f.estrellas) || typeof f.gano !== 'boolean') return null;
    filas.push({
      id: f.id,
      nombre: f.nombre.slice(0, 16),
      puntos: f.puntos,
      estrellas: f.estrellas,
      gano: f.gano,
      salio: !!f.salio,
    });
  }
  return { ...(r as Recibo), resultados: filas };
}

export interface JugadorPartida<U> {
  usuarioId: U;
  /** el id público con que entró a la sala (`idPublico`) */
  idPublico: string;
}
export interface PagoRecibo<U> {
  usuarioId: U;
  puntos: number;
  estrellas: number;
  gano: boolean;
  /** null: su resultado no pasó `validarResultado` y no cobra */
  premio: { monedas: number; xp: number; estrellas: number } | null;
  motivos: string[];
}
export type DecisionRecibo<U> =
  | { tipo: 'error'; motivo: 'cerrada' | 'otra-partida' | 'vencido' | 'muy-pronto' | 'vacio' }
  | { tipo: 'pagar'; pagos: PagoRecibo<U>[] };
/**
 * ¿Paga este recibo? Solo una vez (partida abierta), solo para esta partida y su motor, con una duración que el
 * reloj del servidor confirma y sin estar vencido. Cada fila se valida con `validarResultado` y paga `premioPartida`.
 * Las filas de ids que no son jugadores de la partida se ignoran; un id repetido cuenta una vez.
 */
export function decidirRecibo<U>({
  partidaId,
  recibo,
  partida,
  ahora,
}: {
  partidaId: string;
  recibo: Recibo;
  partida: {
    estado: string;
    motor: string;
    etapa: number;
    etapas: number;
    /** milisegundos Unix del servidor al abrir */
    inicio: number;
    jugadores: readonly JugadorPartida<U>[];
  };
  ahora: number;
}): DecisionRecibo<U> {
  if (partida.estado !== 'abierta') return { tipo: 'error', motivo: 'cerrada' };
  if (
    recibo.partidaId !== partidaId ||
    recibo.motor !== partida.motor ||
    recibo.etapa !== partida.etapa ||
    recibo.etapas !== partida.etapas
  )
    return { tipo: 'error', motivo: 'otra-partida' };
  if (ahora - recibo.momento > PARTIDA.reciboMaxMs || recibo.momento - ahora > 60_000)
    return { tipo: 'error', motivo: 'vencido' };
  // la partida no pudo durar más de lo que lleva abierta en el servidor
  if ((ahora - partida.inicio) / 1000 < recibo.duracion - HOLGURA_S) return { tipo: 'error', motivo: 'muy-pronto' };
  const vistos = new Set<string>(),
    pagos: PagoRecibo<U>[] = [];
  for (const f of recibo.resultados) {
    const j = partida.jugadores.find((x) => x.idPublico === f.id);
    if (!j || vistos.has(f.id)) continue;
    vistos.add(f.id);
    const v = validarResultado({
      motor: partida.motor,
      puntos: f.puntos,
      estrellas: f.estrellas,
      gano: f.gano,
      duracion: recibo.duracion,
      etapa: partida.etapa,
      etapas: partida.etapas,
    });
    const ok = v.ok && v.conocido;
    pagos.push({
      usuarioId: j.usuarioId,
      puntos: f.puntos,
      estrellas: f.estrellas,
      gano: f.gano,
      premio: ok ? premioPartida({ gano: f.gano, estrellas: f.estrellas }) : null,
      motivos: ok ? [] : v.conocido ? v.motivos : ['motor sin tope'],
    });
  }
  if (!pagos.length) return { tipo: 'error', motivo: 'vacio' };
  return { tipo: 'pagar', pagos };
}
