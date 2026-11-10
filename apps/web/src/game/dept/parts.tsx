// Piezas compartidas por las zonas. Cada función devuelve piezas en coordenadas LOCALES (frente hacia +Z, apoyo en
// y = 0) para colocarlas con place() / z.put(), salvo la vegetación (VEG), que ya va en coordenadas del mundo.

import type { MatKind } from '../kit';
import { bl, bx, cy, type Pc, PI, py } from './lib';

const WOOD = '#7a5230',
  DARKWOOD = '#5a3d26',
  STRAW = '#d9b96a';

// --- vegetación fusionada (masa de fondo; cerca de los caminos se usa la utilería P.* del arte)
export type VegKind =
  | 'tree'
  | 'pine'
  | 'palm'
  | 'bush'
  | 'jungle'
  | 'dry'
  | 'giant'
  | 'reed'
  | 'rock'
  | 'fern'
  | 'banana';
type VegFn = (x: number, y: number, z: number, s: number, c: string, r: () => number) => Pc[];
export const VEG: Record<VegKind, VegFn> = {
  tree: (x, y, z, s, c) => [
    cy(x, y + 1.4 * s, z, 0.28 * s, 2.8 * s, 'wood', WOOD, { n: 6 }),
    bl(x, y + 3.7 * s, z, 1.9 * s, 'leaf', c, { n: 8 }),
    bl(x + 0.95 * s, y + 3.1 * s, z + 0.4 * s, 1.25 * s, 'leaf', c, { n: 7 }),
  ],
  pine: (x, y, z, s, c) => [
    cy(x, y + 1 * s, z, 0.22 * s, 2 * s, 'wood', '#6b4a2a', { n: 6 }),
    cy(x, y + 2.9 * s, z, 1.5 * s, 2.8 * s, 'leaf', c, { rt: 0.03, n: 7, solid: false }),
    cy(x, y + 4.5 * s, z, 1.05 * s, 2.4 * s, 'leaf', c, { rt: 0.02, n: 7, solid: false }),
    cy(x, y + 5.9 * s, z, 0.65 * s, 1.8 * s, 'leaf', c, { rt: 0.02, n: 7, solid: false }),
  ],
  palm: (x, y, z, s, c, r) => {
    const a0 = r() * 6;
    return [
      cy(x, y + 2.4 * s, z, 0.2 * s, 4.8 * s, 'wood', '#9c7a4d', { n: 6, rt: 0.7 }),
      ...[0, 1, 2, 3, 4, 5].map((i) => {
        const a = a0 + i * 1.047;
        return bx(
          x + Math.cos(a) * 1.15 * s,
          y + 4.65 * s,
          z + Math.sin(a) * 1.15 * s,
          2.5 * s,
          0.07,
          0.6 * s,
          'leaf',
          c,
          { e: [0, -a, -0.38], solid: false },
        );
      }),
      bl(x, y + 4.75 * s, z, 0.32 * s, 'wood', '#6b4a2a', { n: 6 }),
    ];
  },
  bush: (x, y, z, s, c) => [bl(x, y + 0.4 * s, z, 0.75 * s, 'leaf', c, { s: [1.25, 0.8, 1], n: 7 })],
  fern: (x, y, z, s, c) => [bl(x, y + 0.25 * s, z, 0.7 * s, 'leaf', c, { s: [1.3, 0.45, 1.3], n: 6 })],
  jungle: (x, y, z, s, c) => [
    cy(x, y + 3.2 * s, z, 0.4 * s, 6.4 * s, 'wood', '#5f4a30', { n: 6, rt: 0.75 }),
    bl(x, y + 7.4 * s, z, 2.9 * s, 'leaf', c, { s: [1.15, 0.7, 1.15], n: 8 }),
    bl(x + 1.6 * s, y + 6.2 * s, z - 0.8 * s, 1.8 * s, 'leaf', c, { s: [1.1, 0.7, 1.1], n: 7 }),
    bl(x - 1.4 * s, y + 6.5 * s, z + 1 * s, 1.6 * s, 'leaf', c, { s: [1.1, 0.7, 1.1], n: 7 }),
  ],
  dry: (x, y, z, s, c) => [
    cy(x, y + 1.3 * s, z, 0.2 * s, 2.6 * s, 'wood', '#8a6a48', { n: 5 }),
    bl(x, y + 3 * s, z, 1.9 * s, 'leaf', c, { s: [1.3, 0.42, 1.3], n: 7 }),
    bl(x + 0.9 * s, y + 2.5 * s, z + 0.5 * s, 1.1 * s, 'leaf', c, { s: [1.2, 0.4, 1.2], n: 6 }),
  ],
  giant: (x, y, z, s, c) => [
    cy(x, y + 9 * s, z, 1.25 * s, 18 * s, 'wood', '#4f3b28', { n: 8, rt: 0.6 }),
    cy(x, y + 1.2 * s, z, 2.1 * s, 2.4 * s, 'wood', '#4f3b28', { n: 7, rt: 0.55, solid: false }),
    bl(x, y + 19 * s, z, 6.5 * s, 'leaf', c, { s: [1.2, 0.55, 1.2], n: 9 }),
    bl(x + 3.4 * s, y + 16.5 * s, z + 1.5 * s, 3.8 * s, 'leaf', c, { s: [1.1, 0.6, 1.1], n: 8 }),
    bl(x - 3 * s, y + 17 * s, z - 2 * s, 3.4 * s, 'leaf', c, { s: [1.1, 0.6, 1.1], n: 8 }),
  ],
  reed: (x, y, z, s, _c, r) =>
    [0, 1, 2, 3].map((i) =>
      cy(
        x + (r() - 0.5) * 0.7,
        y + 0.7 * s,
        z + (r() - 0.5) * 0.7,
        0.045,
        (1.3 + r() * 0.5) * s,
        'leaf',
        i % 2 ? '#7a9a3a' : '#5f8a35',
        { n: 4, solid: false },
      ),
    ),
  rock: (x, y, z, s, c) => [bl(x, y + 0.3 * s, z, 0.9 * s, 'stone', c, { s: [1.25, 0.7, 1], n: 7 })],
  banana: (x, y, z, s, c, r) => {
    const a0 = r() * 6;
    return [
      cy(x, y + 1.1 * s, z, 0.16 * s, 2.2 * s, 'leaf', '#7aa84a', { n: 5 }),
      ...[0, 1, 2, 3, 4].map((i) => {
        const a = a0 + i * 1.257;
        return bx(
          x + Math.cos(a) * 0.8 * s,
          y + 2.35 * s,
          z + Math.sin(a) * 0.8 * s,
          1.8 * s,
          0.05,
          0.55 * s,
          'leaf',
          c,
          { e: [0, -a, 0.28], solid: false },
        );
      }),
    ];
  },
};

// --- construcciones
/** Casa sencilla de pueblo con techo de teja a cuatro aguas. */
export const casa = (w = 6, d = 5, h = 3, col = '#f7f1e3', roof = '#b5523b', zocalo = '#a5694f'): Pc[] => [
  bx(0, h / 2, 0, w, h, d, 'stucco', col),
  bx(0, 0.35, 0, w + 0.1, 0.7, d + 0.1, 'stucco', zocalo, { solid: false }),
  py(0, h, 0, w + 1, 1.5, d + 1, 'roof', roof),
  bx(0, 1.05, d / 2 + 0.03, 1.1, 2.1, 0.1, 'wood', '#6b3f22', { solid: false }),
  bx(-w * 0.3, 1.75, d / 2 + 0.03, 0.9, 0.9, 0.1, 'glass', '#2b4a63', { solid: false }),
  bx(w * 0.3, 1.75, d / 2 + 0.03, 0.9, 0.9, 0.1, 'glass', '#2b4a63', { solid: false }),
];
/** Edificio de ciudad con franjas de ventanas. */
export const edificio = (w: number, h: number, d: number, col: string): Pc[] => [
  bx(0, h / 2, 0, w, h, d, 'concrete', col),
  ...Array.from({ length: Math.max(1, Math.floor((h - 1.5) / 3)) }, (_, i) =>
    bx(0, 2.4 + i * 3, 0, w + 0.06, 1.1, d + 0.06, 'glass', '#2b4a63', { solid: false }),
  ),
  bx(0, h + 0.2, 0, w + 0.3, 0.4, d + 0.3, 'concrete', '#d9d9d9', { solid: false }),
];
/** Champa abierta con techo de paja (comedores, talleres). */
export const champa = (w = 5, d = 4, roof = STRAW, h = 2.5): Pc[] => [
  ...[-1, 1].flatMap((sx) =>
    [-1, 1].map((sz) => cy(sx * (w / 2 - 0.2), h / 2, sz * (d / 2 - 0.2), 0.11, h, 'wood', DARKWOOD, { n: 6 })),
  ),
  py(0, h, 0, w + 1.2, 1.7, d + 1.2, 'roof', roof),
  bx(0, h - 0.05, 0, w + 0.3, 0.1, d + 0.3, 'wood', DARKWOOD, { solid: false }),
];
/** Mesa con dos bancas. */
export const mesa = (): Pc[] => [
  bx(0, 0.72, 0, 1.8, 0.1, 0.9, 'wood', '#8a5a34'),
  bx(0, 0.36, 0, 0.2, 0.7, 0.2, 'wood', DARKWOOD, { solid: false }),
  bx(0, 0.42, 0.8, 1.7, 0.08, 0.3, 'wood', '#8a5a34', { solid: false }),
  bx(0, 0.42, -0.8, 1.7, 0.08, 0.3, 'wood', '#8a5a34', { solid: false }),
];
/** Puesto de mercado con toldo de color y montones de producto. */
export const puesto = (toldo: string, goods: string[], gm: MatKind = 'plastic'): Pc[] => [
  bx(0, 0.5, 0, 2.6, 1, 1.2, 'wood', '#8a5a34'),
  ...[-1.2, 1.2].flatMap((x) =>
    [-0.5, 0.5].map((z) => cy(x, 1.25, z, 0.05, 2.5, 'wood', DARKWOOD, { n: 5, solid: false })),
  ),
  bx(0, 2.55, 0.1, 3, 0.1, 1.9, 'cloth', toldo, { e: [0.16, 0, 0] }),
  ...goods.flatMap((g, i) => {
    const x = -0.95 + i * (1.9 / Math.max(1, goods.length - 1));
    return [
      bl(x, 1.14, 0.1, 0.2, gm, g, { n: 6 }),
      bl(x + 0.22, 1.1, -0.15, 0.17, gm, g, { n: 6 }),
      bl(x - 0.2, 1.1, -0.1, 0.17, gm, g, { n: 6 }),
    ];
  }),
];
/** Escalera maciza: sube hacia −Z desde z = 0. Peldaños de `rise` (≤ 0.35) por `run`. */
export const stairs = (w: number, n: number, rise = 0.32, run = 0.5, m: MatKind = 'stone', c = '#b8b2a4'): Pc[] =>
  Array.from({ length: n }, (_, i) => bx(0, (rise * (i + 1)) / 2, -run * (i + 0.5), w, rise * (i + 1), run, m, c));
/** Cañón colonial apuntando a +Z. */
export const cannon = (): Pc[] => [
  cy(0, 0.8, 0.35, 0.2, 2.1, 'metal', '#2b2b2b', { e: [PI / 2 - 0.14, 0, 0], rt: 0.68, n: 10 }),
  bx(0, 0.42, -0.15, 0.8, 0.5, 1.4, 'wood', DARKWOOD),
  cy(-0.5, 0.42, 0.1, 0.42, 0.12, 'wood', '#3d2a1a', { e: [0, 0, PI / 2], n: 10 }),
  cy(0.5, 0.42, 0.1, 0.42, 0.12, 'wood', '#3d2a1a', { e: [0, 0, PI / 2], n: 10 }),
];
/** Muelle de madera: sale hacia −Z desde z = 0 con la cubierta a la altura y. Incluye dos gradas de subida. */
export const pier = (len: number, w = 3.4, y = 0.6, deep = 3): Pc[] => [
  bx(0, y - 0.12, -len / 2, w, 0.24, len, 'wood', '#9a7448'),
  bx(0, y / 2 - 0.2, 0.45, w, y / 2 + 0.1, 0.9, 'wood', '#8a6a45'),
  ...Array.from({ length: Math.floor(len / 4) + 1 }, (_, i) =>
    [-1, 1].map((s) =>
      cy(s * (w / 2 - 0.15), (y + 0.5 - deep) / 2, -i * 4 - 0.3, 0.16, y + 0.5 + deep, 'wood', '#5a4630', {
        n: 6,
        solid: false,
      }),
    ),
  ).flat(),
];
/** Garita redonda de fortaleza con cupulita. */
export const garita = (c = '#b9b1a0', roof = '#b5523b'): Pc[] => [
  cy(0, 1.2, 0, 1.15, 2.4, 'stone', c, { n: 8 }),
  bx(0, 1.45, 1.1, 0.5, 0.7, 0.2, 'stone', '#3a3a3a', { solid: false }),
  cy(0, 2.9, 0, 1.3, 1, 'roof', roof, { rt: 0.05, n: 8, solid: false }),
];
/** Almenas a lo largo de X sobre un muro de largo `len`. */
export const merlons = (len: number, c: string, m: MatKind = 'stone', h = 0.7, t = 0.5): Pc[] =>
  Array.from({ length: Math.floor(len / 1.6) }, (_, i) => bx(-len / 2 + 0.8 + i * 1.6, h / 2, 0, 0.8, h, t, m, c));
/** Montaña de fondo (sin colisión). */
export const mont = (r: number, h: number, c: string, cap?: string): Pc[] => [
  cy(0, h / 2 - 3, 0, r, h, 'grass', c, { rt: 0.1, n: 9, solid: false }),
  cy(r * 0.55, h * 0.3 - 3, r * 0.2, r * 0.7, h * 0.6, 'grass', c, { rt: 0.15, n: 8, solid: false }),
  cy(-r * 0.5, h * 0.25 - 3, -r * 0.15, r * 0.65, h * 0.5, 'grass', c, { rt: 0.2, n: 8, solid: false }),
  ...(cap ? [cy(0, h * 0.93 - 3, 0, r * 0.19, h * 0.16, 'plastic', cap, { rt: 0.1, n: 9, solid: false })] : []),
];
/** Canoa larga (pipante o cayuco) orientada a lo largo de Z. */
export const pipante = (len = 6, c = '#7a5a38'): Pc[] => [
  bx(0, 0.22, 0, 0.8, 0.36, len, 'wood', c, { solid: false }),
  bx(0, 0.3, len / 2 + 0.3, 0.5, 0.3, 0.7, 'wood', c, { solid: false }),
  bx(0, 0.3, -len / 2 - 0.3, 0.5, 0.3, 0.7, 'wood', c, { solid: false }),
  bx(0, 0.42, 0, 0.82, 0.06, 0.25, 'wood', '#5a4028', { solid: false }),
  cy(0.2, 1.1, len * 0.3, 0.035, 2.6, 'wood', '#c9a56b', { e: [0.5, 0, 0.2], n: 5 }),
];
/** Banderines de colores colgados entre (0,0,0) y (len,0,0), a la altura h. */
export const bunting = (len: number, h: number, cols: string[]): Pc[] => [
  bx(len / 2, h, 0, len, 0.04, 0.04, 'cloth', '#f2f2f2', { solid: false }),
  ...Array.from({ length: Math.floor(len / 0.8) }, (_, i) =>
    bx(0.4 + i * 0.8, h - 0.28, 0, 0.42, 0.5, 0.03, 'cloth', cols[i % cols.length], { solid: false }),
  ),
];
/** Farol o poste con cuerda no hace falta: postes simples. */
export const post = (h: number, c = DARKWOOD, r = 0.09): Pc[] => [cy(0, h / 2, 0, r, h, 'wood', c, { n: 6 })];
/** Sombrero de junco. */
export const hat = (x: number, y: number, z: number, s = 1, c = '#e8d28a'): Pc[] => [
  cy(x, y + 0.03 * s, z, 0.46 * s, 0.05 * s, 'cloth', c, { n: 12, solid: false }),
  cy(x, y + 0.17 * s, z, 0.22 * s, 0.26 * s, 'cloth', c, { n: 10, rt: 0.85, solid: false }),
  cy(x, y + 0.09 * s, z, 0.235 * s, 0.06 * s, 'cloth', '#7a4a2b', { n: 10, solid: false }),
];
/** Canasta tejida. */
export const basket = (x: number, y: number, z: number, s = 1, c = '#c9a55a'): Pc[] => [
  cy(x, y + 0.25 * s, z, 0.3 * s, 0.5 * s, 'wood', c, { n: 9, rt: 1.25, solid: false }),
  cy(x, y + 0.5 * s, z, 0.4 * s, 0.07 * s, 'wood', '#a5803a', { n: 9, solid: false }),
];
/** Pez plateado tirado en el suelo. */
export const fish = (x: number, y: number, z: number, rot: number, s = 1, c = '#c9d6df'): Pc[] => [
  bl(x, y + 0.09 * s, z, 0.26 * s, 'metal', c, { s: [1.9, 0.35, 0.75], r: rot, n: 7 }),
  py(x - Math.cos(rot) * 0.55 * s, y + 0.03, z + Math.sin(rot) * 0.55 * s, 0.3 * s, 0.1, 0.42 * s, 'metal', c, {
    r: rot,
  }),
];
/** Roca grande de tope plano que sirve de plataforma. */
export const slab = (x: number, top: number, z: number, r: number, c = '#8a8f96', depth = 3): Pc[] => [
  cy(x, top - depth / 2, z, r, depth, 'stone', c, { n: 7, rt: 0.82 }),
];
/** Asta con bandera de franjas (verticales u horizontales) para países vecinos. */
export const flagOf = (cols: [string, string, string], vertical = false, h = 5): Pc[] => [
  cy(0, h / 2, 0, 0.06, h, 'metal', '#dddddd', { n: 6 }),
  ...cols.map((c, i) =>
    vertical
      ? bx(0.35 + i * 0.6, h - 0.6, 0, 0.6, 1.1, 0.04, 'cloth', c, { solid: false })
      : bx(0.95, h - 0.23 - i * 0.37, 0, 1.8, 0.37, 0.04, 'cloth', c, { solid: false }),
  ),
];
/** Cerca de postes y dos travesaños a lo largo de X. */
export const fence = (len: number, c = '#8a6a48'): Pc[] => [
  bx(0, 0.8, 0, len, 0.1, 0.08, 'wood', c),
  bx(0, 0.45, 0, len, 0.1, 0.08, 'wood', c, { solid: false }),
  ...Array.from({ length: Math.round(len / 2) + 1 }, (_, i) =>
    bx(-len / 2 + i * (len / Math.round(len / 2)), 0.5, 0, 0.14, 1, 0.14, 'wood', c, { solid: false }),
  ),
];
/** Balaustrada baja de piedra a lo largo de X. */
export const baranda = (len: number, c = '#e9e4d8', m: MatKind = 'concrete'): Pc[] => [
  bx(0, 0.92, 0, len, 0.16, 0.3, m, c, { solid: false }),
  bx(0, 0.5, 0, len, 1, 0.16, m, c),
  ...Array.from({ length: Math.round(len / 3) + 1 }, (_, i) =>
    bx(-len / 2 + i * (len / Math.round(len / 3)), 0.55, 0, 0.36, 1.1, 0.36, m, c, { solid: false }),
  ),
];
/** Vaca de potrero mirando a +Z. */
export const vaca = (c = '#f2efe6', spot = '#5a3d26'): Pc[] => [
  bx(0, 0.95, 0, 0.75, 0.7, 1.5, 'plastic', c),
  bx(0, 1.2, 0.95, 0.45, 0.45, 0.55, 'plastic', c, { solid: false }),
  bx(0, 1.1, 1.25, 0.3, 0.25, 0.15, 'plastic', '#e8b9a8', { solid: false }),
  bx(0.2, 1.05, -0.2, 0.4, 0.45, 0.6, 'plastic', spot, { solid: false }),
  bx(-0.25, 1.15, 0.35, 0.3, 0.32, 0.4, 'plastic', spot, { solid: false }),
  ...[-0.25, 0.25].flatMap((x) =>
    [-0.55, 0.55].map((z) => bx(x, 0.3, z, 0.18, 0.6, 0.18, 'plastic', c, { solid: false })),
  ),
  bx(-0.22, 1.48, 0.95, 0.07, 0.16, 0.07, 'plastic', '#e9e4d8', { solid: false }),
  bx(0.22, 1.48, 0.95, 0.07, 0.16, 0.07, 'plastic', '#e9e4d8', { solid: false }),
];
/** Iglesia blanca de pueblo con dos torrecitas; fachada hacia +Z. */
export const iglesia = (w = 7, h = 5, len = 11, c = '#ffffff', roof = '#b5523b'): Pc[] => [
  bx(0, h / 2, 0, w, h, len, 'stucco', c),
  py(0, h, 0, w + 0.6, 1.8, len + 0.6, 'roof', roof),
  bx(0, h / 2 + 0.9, len / 2 + 0.25, w * 0.5, h + 1.8, 0.5, 'stucco', c),
  ...[-1, 1].flatMap((s) => [
    bx(s * (w / 2 - 0.9), (h + 2.6) / 2, len / 2 - 0.2, 2, h + 2.6, 2, 'stucco', c),
    py(s * (w / 2 - 0.9), h + 2.6, len / 2 - 0.2, 2.3, 1.5, 2.3, 'roof', roof),
    bx(s * (w / 2 - 0.9), h + 1.5, len / 2 + 0.82, 0.7, 1.1, 0.08, 'stone', '#3a3a3a', { solid: false }),
  ]),
  bx(0, 1.3, len / 2 + 0.52, 1.5, 2.6, 0.1, 'wood', '#6b3f22', { solid: false }),
  bx(0, h + 3.2, len / 2 + 0.25, 0.16, 1.2, 0.16, 'stone', '#e9e4d8', { solid: false }),
  bx(0, h + 3.4, len / 2 + 0.25, 0.7, 0.16, 0.16, 'stone', '#e9e4d8', { solid: false }),
];
