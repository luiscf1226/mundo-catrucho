// Decorado de una estación según el tipo de lugar. Piezas locales (frente hacia +Z, apoyo en y = 0), centradas en el origen.
import type { LugarKind } from '../../core/types';
import { arco, campanario, columna } from './casas';
import { bl, bx, cy, type Pc, py, rng } from './lib';
import { casa, VEG } from './parts';

const W = '#7a5230',
  DW = '#5a3d26',
  STONE = '#9a958a',
  LEAF = '#3f9b4b',
  DLEAF = '#2f6b3a',
  WHITE = '#f7f1e3',
  ROOF = '#b5523b',
  SAND = '#f2dfa8',
  WATER = '#2f9fd0',
  DARK = '#1d1d1f';
const AW = ['#e63946', '#2a9d8f', '#f4a261', '#ffd23f'];

const tree = (x: number, z: number, s = 1, c = LEAF) => VEG.tree(x, 0, z, s, c, Math.random);
const palm = (x: number, z: number, s = 1, r = rng(Math.round(x * 13 + z * 7))) => VEG.palm(x, 0, z, s, LEAF, r);
const pine = (x: number, z: number, s = 1) => VEG.pine(x, 0, z, s, DLEAF, Math.random);
const fence = (x0: number, x1: number, z: number): Pc[] => {
  const o: Pc[] = [
    bx((x0 + x1) / 2, 0.75, z, x1 - x0, 0.1, 0.08, 'wood', W, { solid: false }),
    bx((x0 + x1) / 2, 0.4, z, x1 - x0, 0.1, 0.08, 'wood', W, { solid: false }),
  ];
  for (let x = x0; x <= x1 + 0.01; x += 1.5) o.push(bx(x, 0.5, z, 0.14, 1, 0.14, 'wood', DW));
  return o;
};
const muelle = (x: number, z: number, len = 7): Pc[] => [
  bx(x, 0.3, z, 2.2, 0.16, len, 'wood', W, { solid: false }),
  ...[0, 1, 2].map((i) =>
    cy(x - 1, 0.15, z - len / 2 + 1 + (i * (len - 2)) / 2, 0.12, 0.6, 'wood', DW, { solid: false }),
  ),
  ...[0, 1, 2].map((i) =>
    cy(x + 1, 0.15, z - len / 2 + 1 + (i * (len - 2)) / 2, 0.12, 0.6, 'wood', DW, { solid: false }),
  ),
];
const pond = (x: number, z: number, r: number): Pc[] => [
  cy(x, 0.02, z, r, 0.06, 'water', WATER, { solid: false, n: 20 }),
  cy(x, 0.01, z, r + 0.6, 0.04, 'sand', SAND, { solid: false, n: 20 }),
];
const stall = (x: number, z: number, c: string): Pc[] => [
  bx(x, 0.5, z, 2, 1, 1, 'wood', W),
  bx(x - 0.95, 1.3, z - 0.45, 0.1, 2.6, 0.1, 'wood', DW, { solid: false }),
  bx(x + 0.95, 1.3, z - 0.45, 0.1, 2.6, 0.1, 'wood', DW, { solid: false }),
  bx(x, 2.55, z, 2.4, 0.12, 1.6, 'cloth', c, { solid: false, e: [0.2, 0, 0] }),
  bl(x - 0.5, 1.15, z, 0.22, 'plastic', '#f4a261'),
  bl(x + 0.1, 1.15, z + 0.1, 0.2, 'plastic', '#e63946'),
  bl(x + 0.6, 1.12, z, 0.18, 'leaf', LEAF),
];

export function decorFor(kind: LugarKind | string, seed: number): Pc[] {
  const r = rng(seed);
  switch (kind) {
    case 'ciudad':
      return [
        bx(-3.5, 4, 0, 4, 8, 4, 'stucco', '#8ecae6'),
        bx(0.8, 5.5, -1, 4, 11, 4, 'concrete', '#c9c4b8'),
        bx(4.6, 3, 0.4, 3.4, 6, 3.4, 'stucco', '#f4a261'),
        ...[1.5, 3.5, 5.5, 7.5, 9.5].map((y) => bx(0.8, y, 1.03, 3.2, 0.8, 0.1, 'glass', '#2b4a63', { solid: false })),
        ...[1.5, 3.5, 5.5].map((y) => bx(-3.5, y, 2.03, 3, 0.7, 0.1, 'glass', '#2b4a63', { solid: false })),
        bx(4.6, 1.2, 2.13, 1, 2.2, 0.1, 'wood', DW, { solid: false }),
      ];
    case 'pueblo':
      return [
        ...casa(5.5, 4.5, 3, WHITE, ROOF).map((q) => ({ ...q, p: [q.p[0] - 3, q.p[1], q.p[2]] as Pc['p'] })),
        ...casa(4.5, 4, 2.8, '#ffe6a7', ROOF).map((q) => ({
          ...q,
          p: [q.p[0] + 3.5, q.p[1], q.p[2] - 0.5] as Pc['p'],
        })),
        ...tree(7.5, 2.5, 0.8),
      ];
    case 'playa':
      return [
        cy(0, 0.03, 0, 7, 0.06, 'sand', SAND, { solid: false, n: 24 }),
        cy(0, 0.04, -4, 5.5, 0.06, 'water', '#19b5c8', { solid: false, n: 24 }),
        ...palm(-4, 0, 1.1),
        ...palm(4.5, -1, 0.95),
        cy(1.5, 1.2, 2, 0.06, 2.4, 'metal', '#eeeeee'),
        cy(1.5, 2.3, 2, 1.4, 0.4, 'cloth', '#e63946', { rt: 0.05, solid: false }),
      ];
    case 'montana':
      return [
        cy(0, 4, -2, 6, 8, 'grass', '#5f9a58', { rt: 0.12, n: 9 }),
        cy(0, 7.6, -2, 1.4, 1.4, 'stone', STONE, { rt: 0.3, n: 8, solid: false }),
        ...pine(-6, 2),
        ...pine(6, 1.5, 0.9),
        ...pine(-4.5, 4, 0.7),
      ];
    case 'lago':
      return [
        ...pond(0, -1.5, 6),
        ...muelle(0, 1, 6),
        ...VEG.reed(-5, 0, 1, 1, LEAF, r),
        ...VEG.reed(5.5, 0, 0, 1, LEAF, r),
        ...tree(-7, -4, 0.9),
      ];
    case 'rio':
      return [
        bx(0, 0.03, -1.5, 18, 0.06, 4, 'water', WATER, { solid: false }),
        bx(0, 0.4, -1.5, 2, 0.14, 6, 'wood', W),
        bx(-1, 1, -1.5, 0.1, 0.1, 6, 'wood', DW, { solid: false }),
        bx(1, 1, -1.5, 0.1, 0.1, 6, 'wood', DW, { solid: false }),
        ...VEG.rock(-5, 0, 0.6, 1, STONE, r),
        ...VEG.rock(4.5, 0, -3.8, 1.2, STONE, r),
        ...tree(-7, -5, 0.9),
        ...tree(7, -5.5, 1),
      ];
    case 'ruinas':
      return [
        ...[0, 1, 2, 3].map((i) =>
          bx(0, 0.6 + i * 1.2, -2, 10 - i * 2.2, 1.2, 8 - i * 2, 'stone', i % 2 ? '#a9a18a' : STONE),
        ),
        bx(-5, 1.8, 2.5, 1, 3.6, 0.8, 'stone', '#b3ab92'),
        bl(-5, 3.9, 2.5, 0.55, 'stone', '#b3ab92'),
        bx(5, 1.5, 2.5, 1, 3, 0.8, 'stone', '#b3ab92'),
        ...[0.6, 1.4, 2.2].map((y) => bx(-5, y, 2.93, 0.7, 0.18, 0.06, 'stone', '#6f6a5c', { solid: false })),
        ...tree(7.5, -3, 1.2, DLEAF),
      ];
    case 'parque':
      return [
        ...tree(-4, -2, 1.1),
        ...tree(3, -3, 1),
        ...tree(6.5, 1, 0.8),
        ...pine(-7, 1.5),
        bx(0, 0.45, 1, 2.4, 0.12, 0.6, 'wood', W),
        bx(-1, 0.22, 1, 0.12, 0.44, 0.5, 'metal', '#4a5560', { solid: false }),
        bx(1, 0.22, 1, 0.12, 0.44, 0.5, 'metal', '#4a5560', { solid: false }),
        ...fence(-8, 8, -6),
      ];
    case 'isla':
      return [
        ...pond(0, -1, 7),
        cy(0, 0.25, -1.5, 3.2, 0.5, 'sand', SAND, { n: 16, solid: false }),
        ...palm(0, -1.5, 1),
        ...muelle(3, 1.5, 5),
      ];
    case 'mercado':
      return [
        ...stall(-3.5, -1, AW[0]),
        ...stall(0, -2, AW[1]),
        ...stall(3.5, -1, AW[2]),
        bx(0, 0.5, -4.5, 8, 1, 0.6, 'wood', W),
        ...[-3, -1, 1, 3].map((x, i) => bl(x, 1.25, -4.5, 0.3, 'plastic', AW[i % 4])),
      ];
    case 'iglesia':
      // basílica o iglesia grande: nave, frontón, dos campanarios con cúpula y puerta en arco
      return [
        bx(0, 3.5, -2, 7, 7, 6, 'stucco', WHITE),
        py(0, 7, -2, 7.4, 2.4, 6.4, 'roof', ROOF),
        bx(-3.2, 5, 1.3, 1.8, 10, 1.8, 'stucco', WHITE),
        bx(3.2, 5, 1.3, 1.8, 10, 1.8, 'stucco', WHITE),
        ...campanario(-3.2, 1.3, 1.8, 10, WHITE, { cap: '#ffe6a7', cupula: '#d9e3ea', desde: 6.8 }),
        ...campanario(3.2, 1.3, 1.8, 10, WHITE, { cap: '#ffe6a7', cupula: '#d9e3ea', desde: 6.8 }),
        bx(0, 7.4, 1.05, 4.6, 1.4, 0.3, 'stucco', '#ffe6a7', { solid: false }),
        py(0, 8.1, 1.05, 4.6, 1.2, 0.3, 'stucco', WHITE),
        bx(0, 1.6, 1.05, 1.8, 3.2, 0.12, 'wood', DW, { solid: false }),
        ...arco(0, 1.6, 1.0, 1.8, 3.2, '#ffe6a7', DW),
        ...[-1.6, 1.6].flatMap((x) => columna(x, 1.2, 0, 6.6, 0.16, WHITE, '#ffe6a7')),
        bx(0, 8.5 + 0.9, 1.1, 0.2, 1.4, 0.15, 'gold', '#e8c547', { solid: false }),
        bx(0, 8.7 + 0.9, 1.1, 0.8, 0.2, 0.15, 'gold', '#e8c547', { solid: false }),
      ];
    case 'estadio':
      return [
        bx(-5, 3, 0, 1.6, 6, 1.6, 'concrete', '#c9c4b8'),
        bx(5, 3, 0, 1.6, 6, 1.6, 'concrete', '#c9c4b8'),
        bx(0, 6.4, 0, 11.6, 1.2, 1.8, 'concrete', '#c9c4b8', { solid: false }),
        bx(0, 5.6, 0.95, 8, 0.6, 0.1, 'neon', '#ffd23f', { solid: false }),
        ...[0, 1, 2, 3].map((i) =>
          bx(0, 0.4 + i * 0.8, -3 - i * 1, 14, 0.8, 1, 'concrete', i % 2 ? '#e63946' : '#0d47a1'),
        ),
        cy(-7, 4, -4, 0.15, 8, 'metal', '#4a5560'),
        bx(-7, 8.2, -4, 1.6, 0.8, 0.3, 'neon', '#ffffff', { solid: false }),
      ];
    case 'cueva':
      return [
        bl(0, 2, -2, 5, 'stone', STONE, { s: [1.4, 0.9, 1], n: 10 }),
        bl(-4, 1, 0, 2.2, 'stone', '#868c92', { n: 8 }),
        bl(4.5, 1.2, -0.5, 2.6, 'stone', '#868c92', { n: 8 }),
        bx(0, 1.5, 2.7, 3, 3, 0.4, 'stone', DARK, { solid: false }),
        bl(0, 3, 2.7, 1.5, 'stone', DARK, { s: [1, 0.5, 0.3] }),
        ...VEG.fern(-2.5, 0, 3.2, 1, LEAF, r),
        ...VEG.fern(2.8, 0, 3, 1, LEAF, r),
      ];
    case 'finca':
      return [
        ...casa(5, 4, 2.6, '#ffe6a7', ROOF).map((q) => ({ ...q, p: [q.p[0] - 4, q.p[1], q.p[2] - 1] as Pc['p'] })),
        ...[0, 1, 2, 3].flatMap((i) =>
          [0, 1, 2, 3].map((j) =>
            bl(2 + j * 1.4, 0.45, -4 + i * 1.5, 0.45, 'leaf', i % 2 ? '#3f8a4b' : '#6cb648', { s: [1, 0.9, 1], n: 6 }),
          ),
        ),
        ...fence(1, 7.5, 1.5),
        cy(-7, 0.5, 2, 0.5, 1, 'wood', W),
      ];
    case 'selva':
      return [
        ...VEG.jungle(-4, 0, -2, 0.9, '#1f6b34', r),
        ...VEG.jungle(4, 0, -3, 1, '#2a7d3c', r),
        ...VEG.banana(-6.5, 0, 2, 1, LEAF, r),
        ...VEG.banana(6.5, 0, 1.5, 1, LEAF, r),
        ...VEG.fern(0, 0, -1, 1.3, LEAF, r),
        ...VEG.fern(-2, 0, 2.5, 1, '#2a7d3c', r),
      ];
    case 'puerto':
      return [
        bx(0, 0.03, -3, 20, 0.06, 6, 'water', '#19b5c8', { solid: false }),
        ...muelle(-2, -2, 7),
        bx(3.5, 0.6, 0, 1.2, 1.2, 1.2, 'wood', '#a0703c'),
        bx(4.8, 0.5, 0.4, 1, 1, 1, 'wood', '#a0703c'),
        bx(4.1, 1.6, 0.2, 1, 0.8, 1, 'wood', '#a0703c'),
        cy(-5, 3, 1, 0.12, 6, 'metal', '#4a5560'),
        bx(-5, 5.8, 1, 1.4, 0.5, 0.2, 'neon', '#ffd23f', { solid: false }),
      ];
    case 'fuerte':
      return [
        bx(0, 2, -2, 12, 4, 1.4, 'stone', STONE),
        ...[-5, -3, -1, 1, 3, 5].map((x) => bx(x, 4.4, -2, 1, 0.8, 1.4, 'stone', STONE, { solid: false })),
        cy(-6.5, 2.6, -2, 1.6, 5.2, 'stone', '#a9a18a', { n: 10 }),
        cy(6.5, 2.6, -2, 1.6, 5.2, 'stone', '#a9a18a', { n: 10 }),
        bx(0, 1.4, -1.25, 2, 2.8, 0.2, 'wood', DW, { solid: false }),
        cy(-3, 0.5, 0.5, 0.5, 0.2, 'wood', DW, { e: [Math.PI / 2, 0, 0], solid: false }),
        cy(-3, 0.75, 1.1, 0.22, 1.6, 'metal', DARK, { e: [1.35, 0, 0], solid: false }),
      ];
    default:
      return [...tree(-4, -1, 1), ...tree(4, -2, 1.1), bx(0, 1, -2, 2, 2, 2, 'stone', STONE)];
  }
}
