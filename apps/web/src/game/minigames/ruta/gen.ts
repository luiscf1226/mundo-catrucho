// Generador de la carrera de obstáculos: lista de piezas a lo largo de −Z, hecha con la semilla de la etapa.

import type { V3 } from '../../../core/types';
import { type Partida, rng } from '../api';

export type Estilo = 'cerro' | 'cueva' | 'ciudad' | 'selva' | 'ruinas' | 'playa' | 'canopy' | 'rio' | 'pueblo' | 'mina';
export type Tipo = 'start' | 'plat' | 'beam' | 'stone' | 'step' | 'mov' | 'movz' | 'sink' | 'cp' | 'goal';
export interface Pieza {
  id: number;
  tipo: Tipo;
  x: number;
  y: number;
  z: number;
  w: number;
  len: number;
  amp?: number;
  spd?: number;
  ph?: number;
}
export interface Seg {
  z0: number;
  z1: number;
  y: number;
  x: number;
}
export const ESTILOS_RUTA: Estilo[] = [
  'cerro',
  'cueva',
  'ciudad',
  'selva',
  'ruinas',
  'playa',
  'canopy',
  'rio',
  'pueblo',
  'mina',
];
export const limiteDe = (p: Partida) => Math.round(70 + 40 * p.dif);
export const TH = 0.8;

export function generar(p: Partida) {
  const R = rng(p.seed ^ 0x9e37),
    d = p.dif,
    n = 12 + Math.round(14 * d),
    gapMax = 2.3 + 1.2 * d;
  const plats: Pieza[] = [],
    segs: Seg[] = [],
    cps: V3[] = [],
    gems: V3[] = [];
  let z = 4,
    y = 0,
    id = 0,
    k = 0;
  const put = (tipo: Tipo, len: number, w: number, x: number, dy: number, gap: number, extra: Partial<Pieza> = {}) => {
    const zf = z - gap;
    y += dy;
    plats.push({ id: id++, tipo, x, y, z: zf - len / 2, w, len, ...extra });
    segs.push({ z0: zf, z1: zf - len, y, x });
    z = zf - len;
    if ((tipo === 'plat' || tipo === 'beam' || tipo === 'stone') && R() < 0.55) gems.push([x, y + 1.05, zf - len / 2]);
    return plats[plats.length - 1];
  };
  put('start', 8, 9, 0, 0, 0);
  z = -4; // el borde delantero de la salida
  plats[0].z = 0;
  segs[0] = { z0: 4, z1: -4, y: 0, x: 0 };
  cps.push([0, 0, 0]);
  for (let i = 0; i < n; i++) {
    if (i > 0 && i % 5 === 0) {
      const c = put('cp', 6, 7, 0, 0, 1.4 + R() * 0.8);
      cps.push([0, y, c.z]);
      continue;
    }
    const dy = [0, 0, 0.35, -0.4, 0.3][Math.floor(R() * 5)],
      gap = 1.2 + R() * (gapMax - 1.2);
    const wts: [Tipo | 'stairs', number][] = [
      ['plat', 3],
      ['beam', 0.8 + d],
      ['stone', 1 + d],
      ['stairs', 1],
      ['mov', i > 1 ? 0.8 + 1.2 * d : 0],
      ['movz', d > 0.3 ? d * 1.3 : 0],
      ['sink', d > 0.4 ? 1.3 * d : 0],
    ];
    let r = R() * wts.reduce((a, b) => a + b[1], 0),
      pick: Tipo | 'stairs' = 'plat';
    for (const [t, w] of wts) {
      if ((r -= w) <= 0) {
        pick = t;
        break;
      }
    }
    if (pick === 'plat')
      put('plat', 5 + R() * 4, 6 - 2.4 * d * R(), (R() - 0.5) * 2, dy + (gap < 2.4 && d > 0.3 ? 0.6 : 0), gap);
    else if (pick === 'beam') put('beam', 6 + R() * 4, 1.5, (R() - 0.5) * 1.5, 0, gap * 0.8);
    else if (pick === 'stone') {
      const m = 4 + Math.floor(R() * 2 + 2 * d);
      for (let j = 0; j < m; j++)
        put(
          'stone',
          2.2,
          2.2,
          (j % 2 ? 1 : -1) * 1.3,
          j ? (R() < 0.4 ? 0.2 : 0) : 0,
          j ? 1.4 + R() * (0.8 + d * 0.5) : gap,
        );
    } else if (pick === 'stairs') {
      const up = R() < 0.6 ? 1 : -1;
      for (let j = 0; j < 6; j++) put('step', 1.5, 5, 0, 0.3 * up, j ? 0 : gap * 0.6);
      put('plat', 4, 5, 0, 0, 0);
    } else if (pick === 'mov') {
      put('mov', 3.4, 3.6, 0, 0, 1.8, { amp: 2.3, spd: 0.7 + 0.5 * d, ph: R() * 6 });
      z -= 1.8;
      put('plat', 5, 6, 0, 0, 0);
    } else if (pick === 'movz') {
      put('movz', 3, 3.6, 0, 0, 2.4, { amp: 2.2, spd: 0.6 + 0.5 * d, ph: R() * 6 });
      z -= 2.4 + 2.2;
      put('plat', 5, 6, 0, 0, 0);
    } else {
      put('sink', 4.2, 4.2, 0, 0, 1.6 + R());
      put('plat', 5, 5, 0, 0, 1.6 + R());
    }
  }
  const goal = put('goal', 12, 9, 0, 0, 2);
  const ys = plats.map((q) => q.y);
  return { plats, segs, cps, gems, goal, length: 4 - z, minY: Math.min(...ys), maxY: Math.max(...ys) };
}
/** Altura del recorrido en z (para los bots): sobre la pieza, o un arco al saltar entre piezas. */
export function yAt(segs: Seg[], z: number): { y: number; x: number; air: boolean } {
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (z <= s.z0 && z >= s.z1) return { y: s.y, x: s.x, air: false };
    const n = segs[i + 1];
    if (n && z < s.z1 && z > n.z0) {
      const u = (s.z1 - z) / (s.z1 - n.z0);
      return { y: s.y + (n.y - s.y) * u + Math.sin(u * Math.PI) * 0.9, x: s.x + (n.x - s.x) * u, air: true };
    }
  }
  const l = segs[segs.length - 1];
  return { y: l.y, x: l.x, air: false };
}
