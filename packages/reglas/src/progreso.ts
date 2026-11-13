// Avance del jugador en el servidor (MC-15, MC-16): etapas por juego, misiones del día, logros, monedas sueltas,
// viajes y el avance que traiga el navegador. Funciones puras: Convex las llama y node --test las prueba.
// Los números salen de progress.json, rewards.json, shop.json y viajes.json; nunca del navegador.

import deptos from '../../../apps/web/shared/data/departments.json' with { type: 'json' };
import progreso from '../../../apps/web/shared/data/progress.json' with { type: 'json' };
import shop from '../../../apps/web/shared/data/shop.json' with { type: 'json' };
import viajes from '../../../docs/generador/viajes.json' with { type: 'json' };
import { acotarEstrellas, MONEDA_SUELTA, type Premio } from './premios.ts';

// ------------------------------------------------------------------ departamentos
export const DEPARTAMENTOS: readonly string[] = deptos.departments.map((d) => d.id);
export const esDepto = (id: unknown): id is string => typeof id === 'string' && DEPARTAMENTOS.includes(id);
/** Departamento de un juego del catálogo ('depto.juego'); los minijuegos sueltos son del lobby. */
export const deptoDeJuego = (juegoId: string) => {
  const d = juegoId.split('.')[0];
  return juegoId.includes('.') && esDepto(d) ? d : 'lobby';
};

// ------------------------------------------------------------------ avance por juego
export interface ProgresoJuego {
  /** etapas ganadas: la siguiente a jugar */
  etapa: number;
  estrellas: number[];
  mejor: number;
  veces: number;
}
/** La etapa más alta que se puede abrir con ese avance (la siguiente sin ganar, o la última). */
export const etapaAbierta = (p: Pick<ProgresoJuego, 'etapa'> | null, etapas: number) =>
  Math.max(0, Math.min(etapas - 1, p?.etapa ?? 0));
/** Suma una partida validada al avance del juego, igual que el juego local. `avance`: desbloqueó la siguiente. */
export function avanzarJuego(
  prev: ProgresoJuego | null,
  r: { etapa: number; etapas: number; puntos: number; estrellas: number; gano: boolean },
): ProgresoJuego & { avance: boolean } {
  const g = {
    etapa: prev?.etapa ?? 0,
    estrellas: [...(prev?.estrellas ?? [])],
    mejor: prev?.mejor ?? 0,
    veces: (prev?.veces ?? 0) + 1,
  };
  let avance = false;
  g.mejor = Math.max(g.mejor, r.puntos);
  if (r.gano) {
    for (let i = g.estrellas.length; i < r.etapa; i++) g.estrellas[i] = 0;
    g.estrellas[r.etapa] = Math.max(g.estrellas[r.etapa] ?? 0, acotarEstrellas(r.estrellas));
    if (r.etapa >= g.etapa && g.etapa < r.etapas) {
      g.etapa = r.etapa + 1;
      avance = true;
    }
  }
  return { ...g, avance };
}

// ------------------------------------------------------------------ misiones del día
export interface Mision {
  id: string;
  text: string;
  type: string;
  target?: string;
  count: number;
  coins: number;
  xp: number;
}
export const MISIONES = progreso.missions as Mision[];
export const MISIONES_DIARIAS = progreso.dailyCount;
export interface MisionDia {
  id: string;
  progreso: number;
  cobrada: boolean;
}
/** Honduras va en UTC−6 todo el año (sin horario de verano). */
export const HONDURAS_UTC = -6;
/** Fecha de Honduras ('AAAA-MM-DD') de un instante en milisegundos Unix. */
export const fechaHonduras = (ms: number) => new Date(ms + HONDURAS_UTC * 3600_000).toISOString().slice(0, 10);
/** Las misiones del día: las mismas para todos, sorteadas con la fecha como semilla. */
export function misionesDelDia(fecha: string): string[] {
  let h = 0;
  for (const c of fecha) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const bolsa = MISIONES.map((m) => m.id),
    out: string[] = [];
  while (out.length < MISIONES_DIARIAS && bolsa.length) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push(bolsa.splice(h % bolsa.length, 1)[0]);
  }
  return out;
}
export const misionesNuevas = (ids: readonly string[]): MisionDia[] =>
  ids.map((id) => ({ id, progreso: 0, cobrada: false }));

/** Algo que hizo el jugador y que puede avanzar una misión. */
export interface Evento {
  tipo: string;
  cantidad: number;
  /** motor del minijuego, para las misiones de un juego en particular */
  objetivo?: string;
}
/**
 * Avanza las misiones con un evento. `score` guarda el mejor puntaje; lo demás suma hasta la meta. Una misión sin
 * `target` acepta cualquier motor («Juega 2 minijuegos»); con `target`, solo el suyo («Atiende La Pulpería»).
 */
export function avanzarMisiones(
  misiones: readonly MisionDia[],
  ev: Evento,
): { misiones: MisionDia[]; cambio: boolean } {
  let cambio = false;
  const out = misiones.map((dm) => {
    const m = MISIONES.find((x) => x.id === dm.id);
    if (!m || dm.cobrada || m.type !== ev.tipo || (m.target && m.target !== ev.objetivo)) return dm;
    const n = Math.max(0, Math.floor(ev.cantidad));
    const progreso = Math.min(m.count, ev.tipo === 'score' ? Math.max(dm.progreso, n) : dm.progreso + n);
    if (progreso === dm.progreso) return dm;
    cambio = true;
    return { ...dm, progreso };
  });
  return { misiones: out, cambio };
}
/** Lo que una partida validada aporta a las misiones (los goles del fútbol son su puntaje). */
export function eventosDePartida(r: { motor: string; puntos: number; gano: boolean }): Evento[] {
  const ev: Evento[] = [
    { tipo: 'play', cantidad: 1, objetivo: r.motor },
    { tipo: 'score', cantidad: r.puntos, objetivo: r.motor },
  ];
  if (r.gano) ev.push({ tipo: 'win', cantidad: 1, objetivo: r.motor });
  if (r.motor === 'futbol' && r.puntos > 0) ev.push({ tipo: 'goals', cantidad: r.puntos });
  return ev;
}
export type Cobro =
  | { ok: true; premio: Premio; misiones: MisionDia[] }
  | { ok: false; motivo: 'no' | 'incompleta' | 'cobrada' };
/** ¿Se puede cobrar esta misión de hoy? Paga lo de progress.json una sola vez. */
export function decidirCobroMision(misiones: readonly MisionDia[], id: string): Cobro {
  const dm = misiones.find((x) => x.id === id),
    m = MISIONES.find((x) => x.id === id);
  if (!dm || !m) return { ok: false, motivo: 'no' };
  if (dm.cobrada) return { ok: false, motivo: 'cobrada' };
  if (dm.progreso < m.count) return { ok: false, motivo: 'incompleta' };
  return {
    ok: true,
    premio: { monedas: m.coins, xp: m.xp },
    misiones: misiones.map((x) => (x.id === id ? { ...x, cobrada: true } : x)),
  };
}

// ------------------------------------------------------------------ logros
export interface Logro {
  id: string;
  name: string;
  desc: string;
  icon: string;
  coins: number;
}
export const LOGROS = progreso.achievements as Logro[];
export const logroPorId = (id: string) => LOGROS.find((l) => l.id === id);
/** Cuántas prendas tradicionales lleva puestas el avatar (camisa, pantalón, sombrero y accesorio). */
export function prendasTipicas(avatar: Record<string, unknown>): number {
  const trad = new Set(shop.items.filter((i) => (i as { trad?: boolean }).trad).map((i) => i.id));
  return ['shirt', 'pants', 'hat', 'acc'].filter((k) => trad.has(String(avatar[k]))).length;
}
/** Lo que el servidor sabe del jugador para dar logros por estado. */
export interface EstadoLogros {
  entro: boolean;
  visitas: number;
  recuerdos: number;
  compras: number;
  tipicas: number;
  nivel: number;
  emotes: number;
}
const reglasEstado: Record<string, (e: EstadoLogros) => boolean> = {
  primer_paso: (e) => e.entro,
  viajero: (e) => e.visitas >= 5,
  catracho_de_corazon: (e) => e.visitas >= DEPARTAMENTOS.length,
  coleccionista: (e) => e.recuerdos >= 9,
  a_la_moda: (e) => e.compras >= 5,
  traje_tipico: (e) => e.tipicas >= 3,
  nivel_5: (e) => e.nivel >= 5,
  bailarin: (e) => e.emotes >= 10,
};
/** Logros que da una sola partida validada: basta con que una la cumpla (igual que la mejor marca local). */
const reglasPartida: Record<
  string,
  (r: { motor: string; puntos: number; estrellas: number; gano: boolean }) => boolean
> = {
  primera_victoria: (r) => r.gano,
  goleador: (r) => r.motor === 'futbol' && r.puntos >= 3,
  punteria: (r) => r.motor === 'feria' && r.estrellas >= 3,
  explorador: (r) => r.motor === 'exploradores' && r.estrellas >= 1,
  pulpero: (r) => r.motor === 'pulperia' && r.estrellas >= 3,
};
/** Logros nuevos (que no estén en `ya`) por el estado y, si la hay, por la partida recién validada. */
export function logrosNuevos({
  ya,
  estado,
  partida,
}: {
  ya: Iterable<string>;
  estado?: EstadoLogros;
  partida?: { motor: string; puntos: number; estrellas: number; gano: boolean };
}): Logro[] {
  const tiene = new Set(ya);
  return LOGROS.filter(
    (l) =>
      !tiene.has(l.id) && ((estado && reglasEstado[l.id]?.(estado)) || (partida && reglasPartida[l.id]?.(partida))),
  );
}

// ------------------------------------------------------------------ monedas sueltas y emotes
/** Ritmo de las monedas sueltas del mundo: una cubeta que se llena sola y un tope por día de Honduras. */
export const MONEDAS_SUELTAS = { cubeta: 20, recargaMs: 1500, porDia: 300 } as const;
export interface EstadoMonedas {
  fecha: string;
  hoy: number;
  fichas: number;
  /** milisegundos de la última recarga */
  t: number;
}
/** Cuántas monedas de las `pedidas` se pagan ahora. Lo que pase del ritmo o del tope del día se ignora. */
export function decidirMonedas(
  prev: EstadoMonedas | null,
  { ahora, pedidas }: { ahora: number; pedidas: number },
): { pagadas: number; monedas: number; estado: EstadoMonedas } {
  const fecha = fechaHonduras(ahora),
    base = prev && prev.fecha === fecha ? prev : { fecha, hoy: 0, fichas: MONEDAS_SUELTAS.cubeta, t: ahora };
  const recargadas = Math.floor(Math.max(0, ahora - base.t) / MONEDAS_SUELTAS.recargaMs),
    fichas = Math.min(MONEDAS_SUELTAS.cubeta, base.fichas + recargadas),
    t = fichas >= MONEDAS_SUELTAS.cubeta ? ahora : base.t + recargadas * MONEDAS_SUELTAS.recargaMs;
  const n = Number.isInteger(pedidas) && pedidas > 0 ? pedidas : 0,
    pagadas = Math.max(0, Math.min(n, fichas, MONEDAS_SUELTAS.porDia - base.hoy));
  return {
    pagadas,
    monedas: pagadas * MONEDA_SUELTA,
    estado: { fecha, hoy: base.hoy + pagadas, fichas: fichas - pagadas, t },
  };
}
/** Un emote cuenta (para logros y misiones) como mucho cada tanto. */
export const EMOTE_MIN_MS = 2000;
export const emoteCuenta = (ultimo: number | undefined, ahora: number) =>
  ultimo === undefined || ahora - ultimo >= EMOTE_MIN_MS;

// ------------------------------------------------------------------ viajes
/**
 * Pasaje de cada vehículo. Copia los precios de apps/web/src/core/data.ts (`TRANSPORTES`) y
 * apps/web/src/game/viaje/opciones.ts; `progreso.test.mjs` revisa que no se desfasen.
 */
export const PASAJES: Readonly<Record<string, number>> = {
  rapidito: 4,
  bus: 2,
  taxi: 12,
  pickup: 6,
  mototaxi: 3,
  lancha: 14,
  ferry: 10,
  avioneta: 20,
  cayuco: 1,
  bicitaxi: 1,
};
/** Ningún viaje dura menos que esto (viajes.json); el bono solo se paga si pasó, con la holgura de partidas. */
export const VIAJE_MIN_S = viajes.reglasDeViaje.segundosMinimos;
/** Tope de un viaje abierto: después ya no paga bono. */
export const VIAJE_MAX_S = 30 * 60;
export type Salida = { ok: true; precio: number; saldo: number } | { ok: false; motivo: 'no' | 'caro'; falta?: number };
/** ¿Puede salir de viaje? El pasaje sale de `PASAJES`; el destino tiene que ser un departamento. */
export function decidirSalida({ veh, de, a, saldo }: { veh: string; de: string; a: string; saldo: number }): Salida {
  const precio = PASAJES[veh];
  if (precio === undefined || !esDepto(de) || !esDepto(a) || de === a) return { ok: false, motivo: 'no' };
  if (!(saldo >= precio)) return { ok: false, motivo: 'caro', falta: precio - saldo };
  return { ok: true, precio, saldo: saldo - precio };
}
/**
 * Bono al llegar. El navegador lo calcula con los choques y el servidor no los puede ver, así que con servidor el
 * bono no se paga hasta que la sala del viaje firme lo que pasó (como el recibo de partida). Por ahora solo se
 * valida la duración, para que el motivo diga por qué no pagó.
 */
export function decidirLlegada({ inicio, ahora }: { inicio: number; ahora: number; bono?: number; bonoMax?: number }): {
  bono: number;
  motivo?: string;
} {
  const s = (ahora - inicio) / 1000;
  if (s > VIAJE_MAX_S) return { bono: 0, motivo: 'viaje vencido' };
  if (s < VIAJE_MIN_S - 2) return { bono: 0, motivo: 'llegó antes de tiempo' };
  return { bono: 0, motivo: 'sin verificar' };
}
/**
 * Tope de bonos de viaje por día de Honduras. El bono lo calcula el navegador (choques), así que sin tope un viaje
 * local barato repetido sería una fuente sin fin.
 */
export const BONOS_VIAJE_DIA = 90;
export interface EstadoBonos {
  fecha: string;
  suma: number;
}
/** Cuánto del bono cabe hoy. */
export function topeBonoDia(prev: EstadoBonos | null, { ahora, bono }: { ahora: number; bono: number }) {
  const fecha = fechaHonduras(ahora),
    suma = prev && prev.fecha === fecha ? prev.suma : 0,
    pagado = Math.max(0, Math.min(bono, BONOS_VIAJE_DIA - suma));
  return { bono: pagado, estado: { fecha, suma: suma + pagado } };
}
/** Gastos sueltos del viaje (comida, peaje): enteros y chicos. Gastar nunca da nada. */
export const GASTO_MAX = 50;
export const gastoValido = (n: number, saldo: number) => Number.isInteger(n) && n > 0 && n <= GASTO_MAX && saldo >= n;

// ------------------------------------------------------------------ avance del navegador (MC-08)
export interface AvanceLocal {
  visitados?: unknown;
  recuerdos?: unknown;
  juegos?: unknown;
}
export interface AvanceLimpio {
  visitas: string[];
  recuerdos: string[];
  juegos: { juegoId: string; etapa: number; estrellas: number[]; veces: number }[];
}
/** Veces que se aceptan por juego al subir avance local (solo es un contador, no paga). */
export const VECES_MAX_LOCAL = 500;
/**
 * Lo que se acepta del avance guardado en el navegador: departamentos que existen, recuerdos de departamentos
 * visitados y, por juego del catálogo, cuántas veces jugó. Etapas, estrellas y marcas no suben: solo una partida
 * validada desbloquea o entra a la clasificación. Nada de esto paga.
 */
export function limpiarAvanceLocal(local: AvanceLocal, etapasDe: (juegoId: string) => number | null): AvanceLimpio {
  const lista = (x: unknown) => (Array.isArray(x) ? x : []);
  const visitas = [...new Set(lista(local.visitados).filter(esDepto))];
  const recuerdos = [...new Set(lista(local.recuerdos).filter(esDepto))].filter((d) => visitas.includes(d));
  const juegos: AvanceLimpio['juegos'] = [];
  const crudos = local.juegos && typeof local.juegos === 'object' ? Object.entries(local.juegos) : [];
  for (const [juegoId, g] of crudos.slice(0, 1000)) {
    const etapas = etapasDe(juegoId);
    if (!etapas || !g || typeof g !== 'object') continue;
    const { etapa, veces } = g as { etapa?: unknown; veces?: unknown };
    const e = Number.isInteger(etapa) ? Math.max(0, Math.min(etapas, etapa as number)) : 0;
    const v = Number.isInteger(veces) ? Math.max(0, Math.min(VECES_MAX_LOCAL, veces as number)) : 0;
    if (e === 0 && v === 0) continue;
    // las etapas y estrellas del navegador no se pueden probar: no desbloquean nada en el servidor (solo la
    // partida validada lo hace). Se guarda cuántas veces jugó, que no paga ni abre etapas.
    juegos.push({ juegoId, etapa: 0, estrellas: [], veces: Math.max(v, e) });
  }
  return { visitas, recuerdos, juegos };
}
