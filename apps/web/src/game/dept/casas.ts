// Casas y detalle urbano hondureño hechos con piezas (Pc): repello con zócalo, ventanas de celosía con reja,
// puertas de metal, aleros con canaleta, techos de teja o de lámina con volumen, losas con varillas, tanques
// negros y antenas. Todo se fusiona en <Build> (una llamada de dibujo para lo opaco), así que el detalle cuesta
// vértices, no llamadas. Coordenadas locales: apoyado en y = 0, fachada hacia +Z. Solo el cuerpo es sólido.
import { useGame } from '../../core/store';
import { calidadEfectiva } from '../quality';
import { bl, bx, cy, type Pc, PI, place, py, rng } from './lib';

/** Colores de repello gastados por el sol (pastel con un poco de gris). */
export const PASTEL = [
  '#e6c9a2',
  '#a9cfc2',
  '#e9b5a0',
  '#c2d3e2',
  '#ebdc9f',
  '#d2b9d0',
  '#bcd3a3',
  '#efd0b6',
  '#9fbfcf',
  '#e2a88f',
  '#f1ead8',
];
const NEGRO = '#1d1f22',
  BLANCO = '#efece4',
  MARCO = '#e9e3d6',
  ALU = '#c3c7cb',
  ZINC = '#a7aeb4',
  OXIDO = '#93593a',
  TEJA = '#b0533a',
  TEJA2 = '#9c4732',
  MADERA = '#5e4029',
  INTERIOR = '#2d2a25';
export const VIDRIO = '#8fb8cc';
const REJAS = ['#1f2124', '#1f2124', '#e9e9e4', '#2f5a3a', '#7a2e2a'];
const PUERTAS = ['#3a6ea5', '#7a2e2a', '#2f5a3a', '#5e4029', '#d9d4c7', '#8a6a2a'];

/** Detalle fino (barrotes tupidos, tejas una por una) solo en calidad media y alta. */
export function detalleFino(): boolean {
  try {
    return calidadEfectiva(useGame.getState().profile.settings) !== 'baja';
  } catch {
    return true;
  }
}
const nf = (o: Pc): Pc => ({ ...o, solid: false });

/** Reja de hierro frente a un hueco de ancho w y alto h centrado en (x, y), a la distancia z de la pared. */
export function reja(x: number, y: number, z: number, w: number, h: number, c: string, fino: boolean): Pc[] {
  const out: Pc[] = [],
    paso = fino ? 0.13 : 0.24,
    n = Math.max(2, Math.round(w / paso));
  for (let i = 0; i <= n; i++)
    out.push(bx(x - w / 2 + (w * i) / n, y, z, 0.022, h, 0.022, 'metal', c, { solid: false }));
  for (const k of fino ? [-0.5, -0.17, 0.17, 0.5] : [-0.5, 0.5])
    out.push(bx(x, y + k * h, z, w + 0.04, 0.035, 0.03, 'metal', c, { solid: false }));
  // remate de arquito arriba (la reja «bonita» de la colonia)
  if (fino && w > 0.8)
    for (let i = 1; i < 4; i++) {
      const a = (i / 4) * PI;
      out.push(
        bx(x - Math.cos(a) * w * 0.32, y + h / 2 - 0.05 - Math.sin(a) * 0.16, z, 0.022, 0.12, 0.022, 'metal', c, {
          e: [0, 0, -a + PI / 2],
          solid: false,
        }),
      );
    }
  return out;
}

/** Fuerza de la luz de un cuarto encendido (0.6–1.3), fija para cada ventana: unas con foco, otras con la tele. */
const luzDe = (x: number, y: number, z: number) => {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
  return 0.6 + 0.7 * (h - Math.floor(h));
};
/** Ventana de celosía: marco de repello, alféizar, vidrio que refleja el cielo, interior que se enciende de noche
 *  y reja. (x, y) es el centro; z la cara de la pared. */
export function ventana(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  o: { reja?: string | null; luz?: boolean; marco?: string; fino?: boolean } = {},
): Pc[] {
  const fino = o.fino ?? true,
    m = o.marco ?? MARCO,
    t = 0.09;
  const out: Pc[] = [
    // interior oscuro (de noche, luz cálida) y el vidrio encima
    bx(x, y, z + 0.012, w, h, 0.02, 'plastic', INTERIOR, { solid: false, em: o.luz ? luzDe(x, y, z) : 0 }),
    bx(x, y, z + 0.035, w, h, 0.02, 'glass', VIDRIO, { solid: false }),
    // marco y alféizar
    bx(x, y + h / 2 + t / 2, z + 0.05, w + 2 * t, t, 0.1, 'concrete', m, { solid: false }),
    bx(x - w / 2 - t / 2, y, z + 0.05, t, h, 0.1, 'concrete', m, { solid: false }),
    bx(x + w / 2 + t / 2, y, z + 0.05, t, h, 0.1, 'concrete', m, { solid: false }),
    bx(x, y - h / 2 - 0.05, z + 0.09, w + 0.32, 0.08, 0.18, 'concrete', m, { solid: false }),
    // paleta del medio de la celosía
    bx(x, y, z + 0.05, 0.035, h, 0.03, 'metal', ALU, { solid: false }),
  ];
  if (fino)
    for (let k = 1; k < Math.round(h / 0.16); k++)
      out.push(bx(x, y - h / 2 + k * 0.16, z + 0.05, w, 0.018, 0.035, 'metal', ALU, { solid: false }));
  if (o.reja) out.push(...reja(x, y, z + 0.17, w + 0.12, h + 0.12, o.reja, fino));
  return out;
}

/** Puerta de metal con tableros, marco, grada y, a veces, puerta de reja delante. (x) centro; z la pared. */
export function puerta(
  x: number,
  z: number,
  c: string,
  o: { w?: number; h?: number; reja?: string | null; fino?: boolean } = {},
): Pc[] {
  const w = o.w ?? 1.0,
    h = o.h ?? 2.15,
    out: Pc[] = [
      bx(x, h / 2 + 0.02, z + 0.02, w, h, 0.05, 'metal', c, { solid: false }),
      bx(x, h + 0.08, z + 0.05, w + 0.2, 0.12, 0.1, 'concrete', MARCO, { solid: false }),
      bx(x - w / 2 - 0.05, h / 2, z + 0.05, 0.1, h, 0.1, 'concrete', MARCO, { solid: false }),
      bx(x + w / 2 + 0.05, h / 2, z + 0.05, 0.1, h, 0.1, 'concrete', MARCO, { solid: false }),
      bx(x, 0.06, z + 0.32, w + 0.5, 0.12, 0.6, 'concrete', '#b9b4a8', { solid: false }),
      bl(x + w / 2 - 0.14, 1.05, z + 0.07, 0.04, 'metal', '#c9b27a', { n: 6 }),
    ];
  // tableros en relieve
  for (const yy of [0.55, 1.2, 1.8])
    out.push(bx(x, yy, z + 0.05, w - 0.22, yy === 1.2 ? 0.5 : 0.42, 0.03, 'metal', c, { solid: false }));
  if (o.reja) out.push(...reja(x, h / 2 + 0.04, z + 0.2, w + 0.1, h, o.reja, o.fino ?? true));
  return out;
}

/** Tanque negro de plástico (el de 1100 litros) con su tapa; en (x, y, z) apoyado. */
export const tanque = (x: number, y: number, z: number, r = 0.52): Pc[] => [
  cy(x, y + r * 1.05, z, r, r * 2.1, 'plastic', NEGRO, { n: 14, solid: false }),
  bl(x, y + r * 2.1, z, r, 'plastic', NEGRO, { s: [1, 0.35, 1], n: 12 }),
  cy(x, y + r * 2.4, z, r * 0.42, 0.1, 'plastic', NEGRO, { n: 10, solid: false }),
  cy(x, y + r * 0.6, z, r * 1.02, 0.05, 'plastic', '#2b2e33', { n: 14, solid: false }),
  cy(x, y + r * 1.5, z, r * 1.02, 0.05, 'plastic', '#2b2e33', { n: 14, solid: false }),
];
/** Antena de televisión (de varillas) o antena de plato. */
export function antena(x: number, y: number, z: number, plato: boolean, rot = 0): Pc[] {
  if (plato)
    return [
      cy(x, y + 0.45, z, 0.03, 0.9, 'metal', ALU, { n: 6, solid: false }),
      bl(x, y + 0.95, z, 0.42, 'metal', '#dcdcd8', { s: [1, 1, 0.22], e: [-0.5, rot, 0], n: 12 }),
      bx(x, y + 1.05, z + 0.25, 0.03, 0.03, 0.5, 'metal', ALU, { e: [-0.5, rot, 0], solid: false }),
    ];
  const out: Pc[] = [cy(x, y + 1.3, z, 0.025, 2.6, 'metal', ALU, { n: 6, solid: false })];
  for (const [k, w] of [
    [2.5, 1.1],
    [2.2, 0.9],
    [1.95, 0.7],
  ])
    out.push(bx(x, y + k, z, w, 0.025, 0.025, 'metal', ALU, { r: rot, solid: false }));
  out.push(bx(x, y + 2.35, z, 0.025, 0.025, 1.1, 'metal', ALU, { r: rot, solid: false }));
  return out;
}
/** Varillas de construcción saliendo de una losa («el segundo piso viene»). */
export const varillas = (x: number, y: number, z: number, w: number, d: number): Pc[] =>
  [-1, 1].flatMap((sx) =>
    [-1, 1].flatMap((sz) =>
      [0, 1, 2, 3].map((k) =>
        bx(
          x + sx * (w / 2 - 0.15) + (k % 2) * 0.12 * -sx,
          y + 0.55 + k * 0.08,
          z + sz * (d / 2 - 0.15) + (k > 1 ? 0.12 : 0) * -sz,
          0.03,
          1.1 + k * 0.15,
          0.03,
          'metal',
          OXIDO,
          { e: [sz * 0.06 * k, 0, sx * 0.05 * k], solid: false },
        ),
      ),
    ),
  );
/** Canaleta de lámina a lo largo de X (en y, z) con su bajante pegado a la pared (xb, zb). */
export function canaleta(w: number, y: number, z: number, xb: number, zb: number, c = ZINC): Pc[] {
  const s = Math.sign(z - zb) || 1;
  return [
    cy(0, y, z, 0.075, w, 'metal', c, { e: [0, 0, PI / 2], n: 6, solid: false }),
    bx(xb, y - 0.05, (z + zb) / 2, 0.08, 0.08, Math.abs(z - zb) + 0.08, 'plastic', '#d8d6cf', { solid: false }),
    cy(xb, (y - 0.05) / 2, zb, 0.045, y - 0.05, 'plastic', '#d8d6cf', { n: 6, solid: false }),
    bx(xb, 0.06, zb + s * 0.15, 0.1, 0.06, 0.3, 'plastic', '#d8d6cf', { solid: false }),
  ];
}

/**
 * Techo de dos aguas con teja de barro: dos faldones con lomos de teja que bajan, cumbrera, hastiales de repello,
 * vigas que asoman bajo el alero y canaleta al frente. La casa mide w × d y la pared llega a la altura h.
 */
export function techoTeja(w: number, d: number, h: number, col: string, o: { fino: boolean; roof?: string }): Pc[] {
  const a = 0.36,
    ox = 0.35,
    oz = 0.65,
    half = d / 2 + oz,
    yr = h + Math.tan(a) * (d / 2) + 0.12,
    L = half / Math.cos(a),
    roof = o.roof ?? TEJA,
    out: Pc[] = [];
  for (const s of [-1, 1]) {
    const zc = (s * half) / 2,
      yc = yr - (Math.tan(a) * half) / 2;
    out.push(bx(0, yc, zc, w + 2 * ox, 0.1, L, 'roof', roof, { e: [s * a, 0, 0], solid: false }));
    // lomos de teja: medias cañas que bajan por el faldón
    const paso = o.fino ? 0.27 : 0.5,
      n = Math.floor((w + 2 * ox) / paso);
    for (let i = 0; i <= n; i++) {
      const x = -(w / 2 + ox) + 0.12 + i * paso;
      if (x > w / 2 + ox - 0.05) break;
      out.push(
        cy(x, yc + 0.07 * Math.cos(a), zc + s * 0.07 * Math.sin(a), 0.085, L, 'roof', i % 3 === 1 ? TEJA2 : roof, {
          e: [s * a + PI / 2, 0, 0],
          n: 5,
          solid: false,
        }),
      );
    }
    // vigas bajo el alero y tabla de remate
    const ye = yr - Math.tan(a) * half;
    for (let x = -w / 2 + 0.3; x <= w / 2 - 0.2; x += 0.75)
      out.push(
        bx(x, h - 0.02 + 0.02, s * (d / 2 + oz / 2), 0.1, 0.12, oz, 'wood', MADERA, { e: [s * a, 0, 0], solid: false }),
      );
    out.push(bx(0, ye - 0.05, s * (half - 0.02), w + 2 * ox, 0.16, 0.05, 'wood', MADERA, { solid: false }));
  }
  out.push(
    cy(0, yr + 0.06, 0, 0.13, w + 2 * ox + 0.05, 'roof', TEJA2, { e: [0, 0, PI / 2], n: 6, solid: false }),
    // hastiales (el triángulo de pared en cada lado)
    py(-w / 2 + 0.06, h, 0, 0.12, yr - h, d, 'stucco', col),
    py(w / 2 - 0.06, h, 0, 0.12, yr - h, d, 'stucco', col),
    bx(0, h - 0.05, d / 2 + 0.04, w, 0.1, 0.08, 'stucco', col, { solid: false }),
    ...canaleta(w + 0.6, yr - Math.tan(a) * half - 0.12, half + 0.04, w / 2 - 0.12, d / 2 + 0.06),
  );
  return out;
}

/** Techo de lámina ondulada de una agua (baja hacia atrás) escondido tras un pretil al frente. */
export function techoLamina(w: number, d: number, h: number, col: string, o: { fino: boolean; seed: number }): Pc[] {
  const r = rng(o.seed),
    a = 0.1,
    L = (d + 0.8) / Math.cos(a),
    yc = h + 0.36,
    W = w + 0.3,
    out: Pc[] = [
      // pretil con su remate de concreto
      bx(0, h + 0.45, d / 2 - 0.1, w + 0.02, 0.9, 0.2, 'stucco', col, { solid: false }),
      bx(0, h + 0.93, d / 2 - 0.1, w + 0.14, 0.08, 0.3, 'concrete', MARCO, { solid: false }),
      ...canaleta(W + 0.1, yc - Math.sin(a) * (L / 2) - 0.1, -d / 2 - 0.55, -w / 2 + 0.15, -d / 2 - 0.06),
    ];
  // hojas de ~0.9 m: unas nuevas y otras oxidadas, cada una con sus ondas (medias cañas a lo largo de la pendiente)
  const hojas = Math.max(2, Math.round(W / 0.9)),
    hw = W / hojas,
    paso = o.fino ? 0.18 : 0.45;
  for (let k = 0; k < hojas; k++) {
    const x0 = -W / 2 + k * hw,
      c = r() < 0.22 ? OXIDO : ZINC;
    out.push(bx(x0 + hw / 2, yc, -0.2, hw + 0.04, 0.05, L, 'metal', c, { e: [-a, 0, 0], solid: false }));
    for (let x = x0 + paso / 2; x < x0 + hw; x += paso)
      out.push(cy(x, yc + 0.025, -0.2, 0.035, L, 'metal', c, { e: [-a + PI / 2, 0, 0], n: 4, solid: false }));
  }
  // piedras y una llanta encima para que el viento no se lleve la lámina
  for (let i = 0; i < 3; i++)
    out.push(bl((r() - 0.5) * w * 0.8, yc + 0.14, (r() - 0.5) * d * 0.6, 0.16, 'stone', '#8f8b84', { n: 6 }));
  if (r() < 0.6)
    out.push(
      cy((r() - 0.5) * w * 0.6, yc + 0.12, (r() - 0.5) * d * 0.5, 0.33, 0.18, 'plastic', NEGRO, {
        n: 10,
        solid: false,
      }),
    );
  return out;
}

/** Losa de concreto con pretil bajo, varillas para el segundo piso y, a veces, tendedero con ropa. */
export function techoLosa(w: number, d: number, h: number, col: string, o: { fino: boolean; seed: number }): Pc[] {
  const r = rng(o.seed + 5),
    out: Pc[] = [
      bx(0, h + 0.1, 0, w + 0.3, 0.2, d + 0.3, 'concrete', '#bdb8ac', { solid: false }),
      bx(0, h + 0.45, d / 2 + 0.05, w + 0.3, 0.5, 0.15, 'stucco', col, { solid: false }),
      bx(-w / 2 - 0.08, h + 0.45, 0, 0.15, 0.5, d + 0.3, 'stucco', col, { solid: false }),
      bx(w / 2 + 0.08, h + 0.45, 0, 0.15, 0.5, d + 0.3, 'stucco', col, { solid: false }),
      bx(0, h + 0.45, -d / 2 - 0.05, w + 0.3, 0.5, 0.15, 'stucco', col, { solid: false }),
      // gotera de concreto (la franja de abajo de la losa) y su mancha
      bx(0, h - 0.05, d / 2 + 0.12, w + 0.3, 0.12, 0.08, 'concrete', MARCO, { solid: false }),
      ...varillas(0, h + 0.2, 0, w, d),
    ];
  if (o.fino && r() < 0.6) {
    const z = -d / 4,
      ropa = ['#e63946', '#f4f2ec', '#1d3557', '#ffd23f', '#2a9d8f', '#f4a261'];
    out.push(
      cy(-w / 2 + 0.6, h + 1.0, z, 0.03, 1.6, 'metal', ALU, { n: 5, solid: false }),
      cy(w / 2 - 0.6, h + 1.0, z, 0.03, 1.6, 'metal', ALU, { n: 5, solid: false }),
      bx(0, h + 1.75, z, w - 1.2, 0.015, 0.015, 'cloth', BLANCO, { solid: false }),
    );
    for (let i = 0; i < 5; i++)
      out.push(
        bx(
          -w / 2 + 1.1 + i * ((w - 2.2) / 4),
          h + 1.45,
          z,
          0.45,
          0.6,
          0.03,
          'cloth',
          ropa[Math.floor(r() * ropa.length)],
          {
            solid: false,
          },
        ),
      );
  }
  return out;
}

export type Techo = 'teja' | 'lamina' | 'losa';
export interface CasaHN {
  w: number;
  d: number;
  h: number;
  col: string;
  zocalo?: string;
  techo?: Techo;
  roof?: string;
  seed?: number;
  /** adobe: pared gruesa con repello caído que deja ver los bloques */
  adobe?: boolean;
  rejas?: boolean;
  tanque?: boolean;
  antena?: boolean;
  /** frente de comercio: cortina metálica a medio subir y franja para el rótulo pintado */
  comercio?: string;
  fino?: boolean;
}

/** Casa hondureña completa. Solo el cuerpo (w × h × d) es sólido: el mismo colisionador que una caja. */
export function casaHN(o: CasaHN): Pc[] {
  const { w, d, h, col } = o,
    seed = o.seed ?? 1,
    r = rng(seed * 31 + 7),
    fino = o.fino ?? detalleFino(),
    techo = o.techo ?? 'teja',
    zf = d / 2,
    rj = o.rejas === false ? null : REJAS[Math.floor(r() * REJAS.length)],
    zoc = o.zocalo ?? (r() < 0.5 ? '#8f7d6a' : '#a6695a'),
    out: Pc[] = [
      bx(0, h / 2, 0, w, h, d, 'stucco', col),
      // zócalo pintado y la franja de abajo
      bx(0, 0.4, 0, w + 0.06, 0.8, d + 0.06, 'stucco', zoc, { solid: false }),
      bx(0, 0.82, zf + 0.035, w + 0.06, 0.05, 0.04, 'concrete', MARCO, { solid: false }),
    ];
  // puerta a un lado y ventanas en el resto de la fachada
  const dx = (r() < 0.5 ? -1 : 1) * Math.min(w / 2 - 0.9, w * 0.22),
    pc = PUERTAS[Math.floor(r() * PUERTAS.length)];
  if (o.comercio) {
    const cw = Math.min(w - 1.6, 2.8),
      cx = -dx * 0.3;
    out.push(
      // cortina metálica a medio subir: se ve el interior encendido abajo
      bx(cx, 1.15, zf + 0.012, cw, 2.3, 0.02, 'plastic', INTERIOR, { solid: false, em: 1.2 }),
      bx(cx, 1.95, zf + 0.04, cw, 0.7, 0.05, 'metal', '#b9bdc0', { solid: false }),
      bx(cx, 2.42, zf + 0.12, cw + 0.3, 0.24, 0.24, 'metal', '#8e9399', { solid: false }),
      bx(cx - cw / 2 - 0.06, 1.15, zf + 0.05, 0.1, 2.3, 0.1, 'metal', '#8e9399', { solid: false }),
      bx(cx + cw / 2 + 0.06, 1.15, zf + 0.05, 0.1, 2.3, 0.1, 'metal', '#8e9399', { solid: false }),
      // franja del rótulo pintado sobre la pared, toldito de lámina y la hielera roja afuera
      bx(0, h - 0.36, zf + 0.02, w - 0.3, 0.6, 0.04, 'stucco', o.comercio, { solid: false }),
      bx(cx, 2.68, zf + 0.5, cw + 0.8, 0.05, 1.0, 'metal', ZINC, { e: [0.22, 0, 0], solid: false }),
      bx(cx - cw / 2 - 0.45, 0.45, zf + 0.5, 0.5, 0.9, 0.5, 'plastic', '#d1403a', { solid: false }),
    );
    if (fino)
      for (let k = 0; k < 5; k++)
        out.push(bx(cx, 1.67 + k * 0.13, zf + 0.07, cw, 0.02, 0.02, 'metal', '#8e9399', { solid: false }));
  } else {
    out.push(...puerta(dx, zf, pc, { reja: r() < 0.55 ? rj : null, fino }));
    // ventanas en el lado opuesto a la puerta
    const lo = dx < 0 ? dx + 0.95 : -w / 2 + 0.35,
      hi = dx < 0 ? w / 2 - 0.35 : dx - 0.95,
      span = hi - lo,
      nv = Math.max(1, Math.min(3, Math.floor(span / 1.75)));
    if (span > 1.3)
      for (let i = 0; i < nv; i++) {
        const ww = Math.min(1.3, span / nv - 0.45);
        out.push(...ventana(lo + (span * (i + 0.5)) / nv, 1.65, zf, ww, 1.15, { reja: rj, luz: r() < 0.65, fino }));
      }
  }
  // segundo piso: fila de ventanas con su balconcito de reja
  if (h > 4.5) {
    const n2 = Math.max(1, Math.floor((w - 0.8) / 2));
    for (let i = 0; i < n2; i++)
      out.push(
        ...ventana(-w / 2 + (w * (i + 0.5)) / n2, h - 1.35, zf, 1.2, 1.2, {
          reja: i % 2 ? rj : null,
          luz: r() < 0.5,
          fino,
        }),
      );
    out.push(bx(0, 2.95, zf + 0.06, w + 0.08, 0.14, 0.14, 'concrete', MARCO, { solid: false }));
  }
  // ventana de lado
  if (d > 4.5)
    out.push(...place(ventana(0, 1.65, 0, 1.0, 1.0, { reja: rj, luz: r() < 0.5, fino }), w / 2, 0, -d * 0.15, PI / 2));
  if (o.adobe) {
    // repello caído: parches de adobe a la vista
    for (let i = 0; i < 3; i++) {
      const pw = 0.5 + r() * 0.7,
        ph = 0.3 + r() * 0.4;
      out.push(
        bx((r() - 0.5) * (w - 1.5), 1.0 + r() * (h - 1.6), zf + 0.012, pw, ph, 0.03, 'brick', '#a87a55', {
          solid: false,
        }),
      );
    }
  }
  if (techo === 'teja') out.push(...techoTeja(w, d, h, col, { fino, roof: o.roof }));
  else if (techo === 'lamina') out.push(...techoLamina(w, d, h, col, { fino, seed }));
  else out.push(...techoLosa(w, d, h, col, { fino, seed }));
  const top = techo === 'losa' ? h + 0.2 : techo === 'lamina' ? h + 0.4 : h;
  if (o.tanque ?? r() < 0.55) {
    // en lámina va sobre una base de hierro; en teja, sobre una tarima atrás
    const tx = (r() - 0.5) * (w - 2),
      tz = -d / 4;
    if (techo === 'losa') out.push(...tanque(tx, top, tz));
    else {
      const by = techo === 'teja' ? h + Math.tan(0.36) * (d / 2) + 0.2 : top + 0.6;
      out.push(
        ...[-1, 1].flatMap((sx) =>
          [-1, 1].map((sz) =>
            bx(tx + sx * 0.45, (top + by) / 2, tz + sz * 0.45, 0.05, by - top + 0.3, 0.05, 'metal', OXIDO, {
              solid: false,
            }),
          ),
        ),
        bx(tx, by, tz, 1.2, 0.06, 1.2, 'metal', OXIDO, { solid: false }),
        ...tanque(tx, by, tz),
      );
    }
  }
  if (o.antena ?? r() < 0.5) {
    const plato = r() < 0.5,
      ay = techo === 'teja' ? h + Math.tan(0.36) * (d / 2) - 0.2 : top;
    out.push(...antena(w / 2 - 0.6, ay, -d / 2 + 0.8, plato, r() * PI));
  }
  return out.map((q, i) => (i === 0 ? q : nf(q)));
}

/** Edificio de ciudad (Tegucigalpa, San Pedro): pisos de 3 m con cornisa, ventanas con marco en las cuatro caras
 *  (algunas encendidas de noche), aires acondicionados colgando, local comercial abajo y techo con tanques. */
export function edificioHN(w: number, h: number, d: number, col: string, seed = 1): Pc[] {
  const r = rng(seed * 17 + 3),
    fino = detalleFino(),
    pisos = Math.max(1, Math.floor((h - 0.5) / 3)),
    out: Pc[] = [bx(0, h / 2, 0, w, h, d, 'concrete', col)];
  // cada cara: (largo, giro); las ventanas se arman en local con la cara en z = largo de la otra mitad
  for (const [len, prof, rot] of [
    [w, d, 0],
    [d, w, PI / 2],
    [w, d, PI],
    [d, w, -PI / 2],
  ] as [number, number, number][]) {
    const cara: Pc[] = [],
      zf = prof / 2,
      n = Math.max(1, Math.floor(len / 2.3));
    for (let p = 0; p < pisos; p++) {
      const y0 = p * 3;
      // cornisa de cada piso
      cara.push(bx(0, y0 + 3 - 0.08, zf + 0.06, len + 0.12, 0.16, 0.14, 'concrete', MARCO, { solid: false }));
      if (p === 0 && rot === 0) {
        // local comercial: vitrina, cortina y toldo
        cara.push(
          bx(-len * 0.18, 1.3, zf + 0.012, len * 0.5, 2.1, 0.02, 'plastic', INTERIOR, { solid: false, em: 1.1 }),
          bx(-len * 0.18, 1.3, zf + 0.035, len * 0.5, 2.1, 0.02, 'glass', VIDRIO, { solid: false }),
          bx(-len * 0.18, 2.55, zf + 0.5, len * 0.55, 0.06, 1.0, 'cloth', ['#d1403a', '#2f6db5', '#3f9b4b'][seed % 3], {
            e: [0.25, 0, 0],
            solid: false,
          }),
          ...puerta(len * 0.28, zf, '#8e9399', { w: 1.4, h: 2.3, fino }),
        );
        continue;
      }
      for (let i = 0; i < n; i++) {
        const x = -len / 2 + (len * (i + 0.5)) / n;
        cara.push(
          ...ventana(x, y0 + 1.55, zf, 1.25, 1.35, {
            luz: r() < 0.55,
            fino,
            reja: p === 1 && r() < 0.5 ? '#1f2124' : null,
          }),
        );
        if (fino && r() < 0.18)
          cara.push(
            bx(x + 0.35, y0 + 0.55, zf + 0.25, 0.8, 0.5, 0.42, 'metal', BLANCO, { solid: false }),
            bx(x + 0.35, y0 + 0.55, zf + 0.47, 0.6, 0.36, 0.02, 'metal', '#9aa0a6', { solid: false }),
          );
      }
    }
    out.push(...place(cara, 0, 0, 0, rot));
  }
  out.push(
    bx(0, h + 0.35, d / 2, w + 0.1, 0.7, 0.16, 'concrete', MARCO, { solid: false }),
    bx(0, h + 0.35, -d / 2, w + 0.1, 0.7, 0.16, 'concrete', MARCO, { solid: false }),
    bx(w / 2, h + 0.35, 0, 0.16, 0.7, d, 'concrete', MARCO, { solid: false }),
    bx(-w / 2, h + 0.35, 0, 0.16, 0.7, d, 'concrete', MARCO, { solid: false }),
    ...tanque(-w / 4, h, -d / 4),
    ...tanque(-w / 4 + 1.2, h, -d / 4),
    bx(w / 4, h + 1.0, d / 5, 2.0, 2.0, 2.0, 'concrete', '#bdb8ac', { solid: false }),
    ...antena(w / 4, h + 2, d / 5, false, r() * PI),
    ...antena(-w / 3, h, d / 4, true, r() * PI),
  );
  return out.map((q, i) => (i === 0 ? q : nf(q)));
}

// ---------------------------------------------------------------------------------------------------------------
// Iglesias coloniales: arcos, campanarios con cúpula y cornisas

/** Hueco de arco (medio punto) en una pared que mira a +Z: fondo oscuro, rosca de color y clave. (x, y) es el
 *  centro del rectángulo de abajo; z la cara de la pared. `em` enciende el fondo de noche. */
export function arco(
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  c: string,
  fondo = '#26221d',
  em = 0,
): Pc[] {
  const r = w / 2;
  return [
    bx(x, y, z + 0.03, w + 0.24, h, 0.05, 'stucco', c, { solid: false }),
    cy(x, y + h / 2, z + 0.03, r + 0.12, 0.05, 'stucco', c, { e: [PI / 2, 0, 0], n: 16, solid: false }),
    bx(x, y, z + 0.06, w, h, 0.03, 'plastic', fondo, { solid: false, em }),
    cy(x, y + h / 2, z + 0.06, r, 0.03, 'plastic', fondo, { e: [PI / 2, 0, 0], n: 16, solid: false, em }),
    bx(x, y + h / 2 + r + 0.08, z + 0.07, 0.18, 0.26, 0.08, 'stucco', c, { solid: false }),
  ];
}
/** Columna con basa y capitel, de y0 a y1, apoyada contra una pared que mira a +Z. */
export const columna = (x: number, z: number, y0: number, y1: number, rr: number, c: string, cap: string): Pc[] => [
  bx(x, y0 + 0.12, z, rr * 2.6, 0.24, rr * 2.6, 'stucco', cap, { solid: false }),
  cy(x, (y0 + y1) / 2, z, rr, y1 - y0 - 0.4, 'stucco', c, { rt: 0.9, n: 10, solid: false }),
  bx(x, y1 - 0.12, z, rr * 2.8, 0.24, rr * 2.8, 'stucco', cap, { solid: false }),
];

const pinaculo = (x: number, y: number, z: number, c: string): Pc[] => [
  cy(x, y + 0.35, z, 0.09, 0.5, 'stucco', c, { n: 6, solid: false }),
  bl(x, y + 0.68, z, 0.13, 'stucco', c, { n: 8 }),
];
/** Lo de arriba de un campanario cuadrado de lado s cuyo cuerpo ya llega a la altura h en (x, z): cornisas, arcos
 *  del campanario en las cuatro caras, pináculos en las esquinas y cúpula con linterna y cruz. */
export function campanario(
  x: number,
  z: number,
  s: number,
  h: number,
  c: string,
  o: { cap?: string; cupula?: string; fino?: boolean; desde?: number; sinCupula?: boolean } = {},
): Pc[] {
  const cap = o.cap ?? MARCO,
    cup = o.cupula ?? c,
    fino = o.fino ?? true,
    yb = o.desde ?? h * 0.7,
    out: Pc[] = [];
  // cornisas: a media torre, al pie del campanario y arriba (doble moldura)
  for (const [y, k] of [
    [h * 0.42, 0.24],
    [yb, 0.36],
    [h - 0.1, 0.44],
  ])
    out.push(
      bx(x, y, z, s + k, 0.22, s + k, 'stucco', cap, { solid: false }),
      bx(x, y + 0.17, z, s + k * 0.6, 0.12, s + k * 0.6, 'stucco', cap, { solid: false }),
    );
  // arcos del campanario y pilastras en las esquinas
  const ah = Math.max(0.6, (h - yb) * 0.42),
    ay = yb + 0.3 + ah / 2;
  for (let k = 0; k < 4; k++) {
    const rot = (k * PI) / 2,
      a = arco(0, ay, s / 2, s * 0.42, ah, cap);
    out.push(...place(a, x, 0, z, rot));
  }
  if (fino)
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        out.push(
          bx(x + sx * (s / 2 - 0.08), (yb + h) / 2, z + sz * (s / 2 - 0.08), 0.26, h - yb - 0.2, 0.26, 'stucco', cap, {
            solid: false,
          }),
          ...(o.sinCupula ? [] : pinaculo(x + sx * (s / 2 + 0.05), h, z + sz * (s / 2 + 0.05), cap)),
        );
  // cúpula: tambor, media naranja, linterna y cruz
  const r = s * 0.42;
  if (!o.sinCupula)
    out.push(
      cy(x, h + 0.3, z, r, 0.6, 'stucco', c, { n: 16, solid: false }),
      bl(x, h + 0.6, z, r, 'stucco', cup, { s: [1, 0.9, 1], n: 16 }),
      cy(x, h + 0.6 + r * 0.9 + 0.25, z, r * 0.3, 0.5, 'stucco', c, { n: 10, solid: false }),
      bl(x, h + 0.6 + r * 0.9 + 0.5, z, r * 0.32, 'stucco', cup, { s: [1, 0.8, 1], n: 10 }),
      bx(x, h + 0.6 + r * 0.9 + 1.05, z, 0.07, 0.8, 0.07, 'metal', '#2b2b2b', { solid: false }),
      bx(x, h + 0.6 + r * 0.9 + 1.2, z, 0.42, 0.07, 0.07, 'metal', '#2b2b2b', { solid: false }),
    );
  return out;
}
