// Estilos musicales del motor «ritmo»: notas de cada carril, acompañamiento y generación del patrón.
import { type Partida, rng } from '../api';

export type Estilo = 'punta' | 'marimba' | 'banda' | 'tambor' | 'campanas' | 'sique' | 'dembow';
export interface Cfg {
  name: string;
  bpm: number;
  tone: OscillatorType;
  lanes: number[];
  len: number;
  gain: number;
  bass: number[];
  kick: number[];
  snare: number[];
  hat: number[];
  stab?: number[];
  drumLanes?: boolean;
  color: string;
}
// 16 pasos por compás (semicorcheas). Los carriles tocan la melodía; el resto es el acompañamiento.
export const ESTILOS: Record<Estilo, Cfg> = {
  punta: {
    name: 'Punta',
    bpm: 118,
    tone: 'triangle',
    lanes: [220, 261.6, 293.7, 329.6],
    len: 0.3,
    gain: 0.16,
    bass: [110, 110, 146.8, 164.8],
    kick: [0, 3, 6, 8, 11, 14],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    color: '#f4a261',
  },
  marimba: {
    name: 'Marimba',
    bpm: 98,
    tone: 'triangle',
    lanes: [261.6, 293.7, 329.6, 392],
    len: 0.45,
    gain: 0.2,
    bass: [130.8, 130.8, 98, 98],
    kick: [0, 8],
    snare: [],
    hat: [4, 12],
    color: '#e9c46a',
  },
  banda: {
    name: 'Banda',
    bpm: 124,
    tone: 'sawtooth',
    lanes: [196, 247, 293.7, 392],
    len: 0.22,
    gain: 0.07,
    bass: [98, 98, 123.5, 73.4],
    kick: [0, 8],
    snare: [4, 12],
    hat: [2, 6, 10, 14],
    stab: [4, 12],
    color: '#e76f51',
  },
  tambor: {
    name: 'Tambor',
    bpm: 104,
    tone: 'sine',
    lanes: [140, 180, 230, 300],
    len: 0.2,
    gain: 0.2,
    bass: [90, 90, 90, 110],
    kick: [0, 6, 10],
    snare: [4, 12],
    hat: [2, 8, 14],
    drumLanes: true,
    color: '#c1666b',
  },
  campanas: {
    name: 'Campanas',
    bpm: 84,
    tone: 'sine',
    lanes: [523.3, 587.3, 659.3, 784],
    len: 1.0,
    gain: 0.16,
    bass: [130.8, 130.8, 98, 110],
    kick: [0],
    snare: [],
    hat: [8],
    color: '#f2cc8f',
  },
  sique: {
    name: 'Sique',
    bpm: 110,
    tone: 'sine',
    lanes: [293.7, 349.2, 392, 440],
    len: 0.4,
    gain: 0.2,
    bass: [146.8, 146.8, 174.6, 130.8],
    kick: [0, 8, 10],
    snare: [12],
    hat: [2, 4, 6, 10, 14],
    color: '#8ecae6',
  },
  dembow: {
    name: 'Dembow',
    bpm: 98,
    tone: 'square',
    lanes: [220, 261.6, 329.6, 392],
    len: 0.18,
    gain: 0.07,
    bass: [55, 55, 82.4, 73.4],
    kick: [0, 4, 8, 12],
    snare: [3, 7, 11, 14],
    hat: [2, 6, 10, 15],
    color: '#6a4c93',
  },
};
export const LANE_COL = ['#e63946', '#ffd23f', '#2fbf71', '#3a86ff'];
export const estiloDe = (p: Partida): Estilo => (p.tema.estilo in ESTILOS ? p.tema.estilo : 'punta') as Estilo;
export type Toca = 'baila' | 'marimba' | 'tambor' | 'campana';
export const tocaDe = (p: Partida, e: Estilo): Toca =>
  ['baila', 'marimba', 'tambor', 'campana'].includes(p.tema.toca)
    ? p.tema.toca
    : e === 'marimba'
      ? 'marimba'
      : e === 'tambor'
        ? 'tambor'
        : e === 'campanas'
          ? 'campana'
          : 'baila';

export interface Nota {
  lane: number;
  time: number;
  hit?: boolean;
  done?: boolean;
  slot?: number;
}
export const START = 2.8;
/** Patrón de la etapa: el número de notas depende solo de la dificultad y del estilo (no de la semilla). */
export function chartDe(p: Partida) {
  const E = ESTILOS[estiloDe(p)],
    step = 60 / E.bpm / 2,
    L = 60 + 26 * p.dif, // la canción dura de ~64 s (etapa 1) a ~90 s (última)
    steps = Math.floor(L / step),
    rho = 0.55 + 0.3 * p.dif,
    R = rng(p.seed ^ 0x51ed);
  const notas: Nota[] = [];
  let last = -1,
    rep = 0,
    idx = 0;
  for (let s = 0; s < steps; s++) {
    if (Math.floor((s + 1) * rho) === Math.floor(s * rho)) continue;
    let lane = Math.floor(R() * 4);
    if (lane === last && ++rep >= 2) {
      lane = (lane + 1 + Math.floor(R() * 3)) % 4;
      rep = 0;
    }
    if (lane !== last) rep = 0;
    last = lane;
    const time = START + s * step;
    notas.push({ lane, time });
    if (p.dif > 0.25 && idx++ % 6 === 5) notas.push({ lane: (lane + 2) % 4, time });
  }
  let max = 0;
  notas.forEach((_, i) => {
    max += 100 * (1 + Math.min(3, Math.floor(i / 10)));
  });
  return { notas, max, end: (notas[notas.length - 1]?.time ?? START) + 1.4, step, cfg: E };
}
export const metasDe = (p: Partida): [number, number, number] => {
  const m = chartDe(p).max;
  // `max` supone racha perfecta (×4 desde la nota 30): con unos pocos fallos se saca ~30 % y tocando muy fino ~55 %
  const f = (k: number) => Math.round((m * k) / 10) * 10;
  return [f(0.15 + 0.08 * p.dif), f(0.3 + 0.1 * p.dif), f(0.45 + 0.07 * p.dif)];
};

export interface Evento {
  t: number;
  k: 'drum' | 'tone';
  a: [number, number, number, ('sine' | 'triangle' | 'square' | 'sawtooth')?];
}
/** Acompañamiento de toda la canción como lista de eventos con su hora. */
export function acompanamiento(e: Estilo, fin: number): Evento[] {
  const E = ESTILOS[e],
    sx = 60 / E.bpm / 4,
    out: Evento[] = [],
    bars = Math.ceil(fin / (sx * 16));
  for (let b = 0; b < bars; b++)
    for (let s = 0; s < 16; s++) {
      const t = (b * 16 + s) * sx,
        bass = E.bass[b % 4];
      if (E.kick.includes(s)) out.push({ t, k: 'drum', a: [e === 'dembow' ? 70 : 95, 0.16, 0.26] });
      if (E.snare.includes(s)) out.push({ t, k: 'drum', a: [e === 'tambor' ? 210 : 260, 0.1, 0.16] });
      if (E.hat.includes(s)) out.push({ t, k: 'drum', a: [1100, 0.035, 0.05] });
      if (s % 8 === 0 || (e === 'punta' && (s === 6 || s === 14)) || (e === 'dembow' && (s === 3 || s === 11)))
        out.push({
          t,
          k: 'tone',
          a: [
            bass,
            e === 'campanas' ? 1.4 : 0.32,
            e === 'banda' ? 0.1 : 0.15,
            e === 'banda' || e === 'dembow' ? 'triangle' : 'sine',
          ],
        });
      if (E.stab?.includes(s)) {
        out.push({ t, k: 'tone', a: [bass * 3, 0.12, 0.05, 'sawtooth'] });
        out.push({ t, k: 'tone', a: [bass * 3.78, 0.12, 0.05, 'sawtooth'] });
      }
      if (e === 'campanas' && s === 0) out.push({ t, k: 'tone', a: [bass * 4, 1.8, 0.05, 'sine'] });
    }
  return out;
}
