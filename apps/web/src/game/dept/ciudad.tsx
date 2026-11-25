// La ciudad de cada cabecera: lugares reales y reconocibles alrededor de la plaza de entrada, la pulpería del barrio
// y el ambiente de cualquier calle hondureña: postes con cables colgando y enredados, transformadores, rótulos
// pegados en los postes y zapatos colgando de los cables. Todo se fusiona en pocas mallas (Build).
import { type ReactNode, useEffect, useMemo } from 'react';
import { catDe } from '../../core/data';
import { useGame } from '../../core/store';
import type { Department, V3 } from '../../core/types';
import { art, Interactable, type MatKind, P, Plate } from '../kit';
import type { FloraKind } from '../kit/art/types';
import {
  antena,
  arco,
  campanario,
  casaHN,
  columna,
  detalleFino,
  PASTEL,
  type Techo,
  tanque as tanqueHN,
  techoLamina,
  ventana,
} from './casas';
import { CIUDADES, type SitioReal, type TipoSitio } from './ciudad-datos';
import { type Layout, layoutOf } from './ext';
import { Build, bl, bx, conFlora, cy, type Pc, PI, place, py, rng, rotXZ, type XZ } from './lib';
import { lugarDelMuro } from './muro';
import { Quieto } from './quieto';
import type { ZoneSpec } from './zone';

// paleta corta: cada (material, color) es una llamada de dibujo
const K = {
  cable: '#17181a',
  concreto: '#bdb8ac',
  madera: '#6b4a2e',
  teja: '#b5523b',
  zinc: '#a9b0b6',
  oxido: '#9a5a36',
  vidrio: '#8fc9df',
  oscuro: '#2a2d33',
  blanco: '#f4f2ec',
  amarillo: '#ffd23f',
  rojo: '#d1403a',
  azul: '#2f6db5',
  verde: '#3f9b4b',
  zacate: '#4f9a3f',
  piso: '#d8cfbd',
  tanque: '#26292e',
  gris: '#8e939a',
};
const FACHADAS = ['#ffd6a5', '#9bf6ff', '#ffadad', '#caffbf', '#bde0fe', '#ffc6ff', '#fdffb6'];

// ---------------------------------------------------------------------------------------------------------------
// Piezas sueltas

/** Barra recta de a hasta b (cables, rayos, cordones). Sin colisión. */
export function seg3(a: V3, b: V3, w: number, m: MatKind, c: string): Pc {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    hor = Math.hypot(dx, dz);
  return bx((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, w, w, Math.hypot(hor, dy) + 0.02, m, c, {
    e: [-Math.atan2(dy, hor), hor > 1e-4 ? Math.atan2(dx, dz) : 0, 0],
    solid: false,
  });
}
/** Punto de un cable colgado entre a y b con panza `sag` (t de 0 a 1). */
export const enCable = (a: V3, b: V3, sag: number, t: number): V3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t - 4 * sag * t * (1 - t),
  a[2] + (b[2] - a[2]) * t,
];
/** Cable colgado con panza. */
export function cable(out: Pc[], a: V3, b: V3, sag: number, w = 0.045, c = K.cable) {
  const n = Math.max(4, Math.min(10, Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]) / 2.2)));
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const p = enCable(a, b, sag, i / n);
    out.push(seg3(prev, p, w, 'metal', c));
    prev = p;
  }
}
/** Un par de tenis amarrados por los cordones, colgando de un cable. */
export function zapatos(out: Pc[], p: V3, yaw: number, color: string) {
  for (const [k, drop, tilt] of [
    [-0.2, 0.55, 0.3],
    [0.18, 0.85, -0.35],
  ]) {
    const [ox, oz] = rotXZ(k, 0, yaw),
      top: V3 = [p[0] + ox, p[1] - 0.05, p[2] + oz],
      bot: V3 = [top[0], top[1] - drop, top[2]];
    out.push(seg3([p[0], p[1], p[2]], top, 0.03, 'cloth', K.blanco), seg3(top, bot, 0.03, 'cloth', K.blanco));
    // el tenis cuelga de punta: caña arriba, suela blanca a un lado
    out.push(
      ...place(
        [
          bx(0, -0.27, 0, 0.21, 0.52, 0.19, 'cloth', color, { e: [0, 0, tilt], solid: false }),
          bx(0, -0.28, 0.11, 0.22, 0.56, 0.05, 'plastic', K.blanco, { e: [0, 0, tilt], solid: false }),
          bx(0, -0.5, -0.02, 0.2, 0.12, 0.2, 'plastic', K.blanco, { e: [0, 0, tilt], solid: false }),
          bx(0, -0.03, -0.03, 0.15, 0.08, 0.13, 'cloth', K.oscuro, { solid: false }),
        ],
        bot[0],
        bot[1],
        bot[2],
        yaw,
      ),
    );
  }
}
/** Rollo de cable mal enrollado: un aro torcido de segmentos. */
function rollo(out: Pc[], c: V3, r: number, yaw: number, tilt: number, seed: number) {
  const n = 9,
    pts: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * PI * 2,
      wob = 1 + 0.18 * Math.sin(a * 3 + seed),
      lx = Math.cos(a) * r * wob,
      ly = Math.sin(a) * r * wob,
      [rx, rz] = rotXZ(lx, ly * Math.sin(tilt), yaw);
    pts.push([c[0] + rx, c[1] + ly * Math.cos(tilt), c[2] + rz]);
  }
  for (let i = 0; i < n; i++) out.push(seg3(pts[i], pts[i + 1], 0.04, 'metal', K.cable));
}
/** La maraña de cables en lo alto de un poste: rollos, nudos y un cable suelto que cuelga. */
export function marana(out: Pc[], x: number, z: number, yaw: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < 4; i++)
    rollo(
      out,
      [x + (r() - 0.5) * 0.3, 5.5 + r() * 0.9, z + (r() - 0.5) * 0.3],
      0.35 + r() * 0.35,
      yaw + r() * 3,
      0.4 + r() * 1.2,
      i,
    );
  for (let i = 0; i < 3; i++)
    out.push(
      bl(x + (r() - 0.5) * 0.4, 5.7 + r() * 0.6, z + (r() - 0.5) * 0.4, 0.17 + r() * 0.1, 'metal', K.cable, { n: 6 }),
    );
  // cable suelto que baja haciendo curva
  const [ox, oz] = rotXZ(0.25, 0, yaw),
    a: V3 = [x + ox, 6.6, z + oz],
    [mx, mz] = rotXZ(0.9, 0.4, yaw),
    m: V3 = [x + mx, 3.4, z + mz],
    [ex, ez] = rotXZ(0.55, 0.9, yaw);
  out.push(seg3(a, m, 0.04, 'metal', K.cable), seg3(m, [x + ex, 2.3, z + ez], 0.04, 'metal', K.cable));
}

interface Poste {
  x: number;
  z: number;
  yaw: number;
  /** puntos donde amarran los cables: dos en la cruceta y uno abajo (teléfono y cable) */
  a: V3;
  b: V3;
  t: V3;
}
function poste(out: Pc[], x: number, z: number, yaw: number, seed: number, lado = 1): Poste {
  const r = rng(seed * 13 + 7),
    L = (lx: number, ly: number, lz = 0): V3 => {
      const [rx, rz] = rotXZ(lx, lz, yaw);
      return [x + rx, ly, z + rz];
    };
  out.push(
    cy(x, 3.9, z, 0.17, 7.8, 'concrete', K.concreto, { rt: 0.72, n: 8 }),
    ...place(
      [
        bx(0, 7.25, 0, 1.9, 0.14, 0.14, 'wood', K.madera, { solid: false }),
        bx(-0.55, 6.95, 0, 0.07, 0.6, 0.07, 'wood', K.madera, { e: [0, 0, -0.8], solid: false }),
        bx(0.55, 6.95, 0, 0.07, 0.6, 0.07, 'wood', K.madera, { e: [0, 0, 0.8], solid: false }),
        bl(-0.8, 7.38, 0, 0.07, 'plastic', K.blanco, { n: 6 }),
        bl(0.8, 7.38, 0, 0.07, 'plastic', K.blanco, { n: 6 }),
        // rótulos pegados: «se venden lotes», clases, se busca perro…
        bx(0, 2.0, 0.17, 0.32, 0.42, 0.02, 'cloth', r() < 0.5 ? K.amarillo : K.blanco, { solid: false }),
        bx(0.02, 1.45, -0.17, 0.3, 0.3, 0.02, 'cloth', r() < 0.5 ? K.rojo : K.blanco, { solid: false }),
      ],
      x,
      0,
      z,
      yaw,
    ),
  );
  // luminaria: brazo sobre la calle y lámpara que se enciende de noche
  out.push(
    ...place(
      [
        bx(-0.75, 6.2, 0, 1.5, 0.07, 0.07, 'metal', K.gris, { e: [0, 0, -0.12], solid: false }),
        bx(-1.5, 6.05, 0, 0.55, 0.12, 0.26, 'metal', K.gris, { solid: false }),
        bx(-1.5, 5.98, 0, 0.42, 0.03, 0.18, 'plastic', '#fff1cf', { solid: false, em: 2.4 }),
      ],
      x,
      0,
      z,
      yaw + (lado < 0 ? PI : 0),
    ),
  );
  if (r() < 0.45)
    out.push(
      ...place(
        [
          cy(0.38, 6.3, 0, 0.28, 0.85, 'metal', K.gris, { n: 10, solid: false }),
          cy(0.38, 6.78, 0, 0.3, 0.08, 'metal', K.gris, { n: 10, solid: false }),
        ],
        x,
        0,
        z,
        yaw,
      ),
    );
  return { x, z, yaw, a: L(-0.8, 7.36), b: L(0.8, 7.36), t: L(0.18, 6.2, 0.18) };
}
/** Tendido entre dos postes: dos cables de luz y una maraña de teléfono y cable con mucha panza. */
function tendido(out: Pc[], p: Poste, q: Poste, seed: number, extra = 0) {
  const r = rng(seed);
  cable(out, p.a, q.a, 0.45);
  cable(out, p.b, q.b, 0.45);
  for (let i = 0; i < 2 + extra; i++) {
    const dy = -i * 0.12;
    cable(out, [p.t[0], p.t[1] + dy, p.t[2]], [q.t[0], q.t[1] + dy, q.t[2]], 0.6 + r() * 0.9, 0.04);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Edificios: coordenadas locales, apoyados en y = 0, con la fachada mirando a +Z.

interface Obra {
  pcs: Pc[];
  /** ancho (x) y fondo (z) para reservar el terreno */
  w: number;
  d: number;
  /** rótulo en la fachada */
  sign: { y: number; z: number; h: number; bg: string; fg?: string };
  /** utilería del arte en coordenadas locales */
  props?: {
    k: 'Tree' | 'Palm' | 'Bench' | 'Lamp' | 'Boat' | 'Flag' | 'Car';
    x: number;
    z: number;
    rot?: number;
    color?: string;
  }[];
  /** dónde llega la acometida de luz (local) */
  luz: V3;
}
const ventanas = (w: number, y: number, z: number, n: number, c = K.oscuro, h = 1.3, ww = 1): Pc[] =>
  Array.from({ length: n }, (_, i) => bx(((i + 0.5) / n - 0.5) * w, y, z, ww, h, 0.08, 'glass', c, { solid: false }));
const tanque = (x: number, y: number, z: number): Pc[] => tanqueHN(x, y, z);
/** Varillas de construcción saliendo del techo: «el segundo piso viene». */
const varillas = (x: number, y: number, z: number, w: number): Pc[] =>
  [-1, -0.33, 0.33, 1].flatMap((k) => [
    bx(x + (k * w) / 2, y + 0.6, z - 0.3, 0.05, 1.2, 0.05, 'metal', K.oxido, { solid: false }),
    bx(x + (k * w) / 2, y + 0.7, z + 0.3, 0.05, 1.4, 0.05, 'metal', K.oxido, { e: [0.12, 0, 0], solid: false }),
  ]);

function iglesia(c: string): Obra {
  const fino = detalleFino(),
    oro = '#e0b45a',
    p: Pc[] = [
      bx(0, 0.2, 0, 11, 0.4, 15, 'stone', K.piso),
      bx(0, 3.6, -1, 8, 6.8, 12, 'stucco', c),
      bx(0, 4.6, 6.1, 10.6, 8.8, 1.0, 'stucco', c),
      py(0, 9.0, 6.1, 5.4, 2.2, 1.0, 'stucco', c),
      bx(-4.4, 6.6, 6.0, 2.6, 12.8, 2.6, 'stucco', c),
      bx(4.4, 6.6, 6.0, 2.6, 12.8, 2.6, 'stucco', c),
      // cúpula del crucero sobre su tambor, con linterna
      cy(0, 7.35, -3.5, 2.75, 0.5, 'stucco', c, { n: 20, solid: false }),
      bl(0, 7.6, -3.5, 2.6, 'roof', K.teja, { s: [1, 0.8, 1], n: 16 }),
      cy(0, 7.62, -3.5, 2.85, 0.16, 'stucco', oro, { n: 20, solid: false }),
      cy(0, 10.0, -3.5, 0.5, 0.9, 'stucco', c, { n: 10, solid: false }),
      bl(0, 10.45, -3.5, 0.55, 'stucco', c, { s: [1, 0.8, 1], n: 10 }),
      bx(0, 11.25, -3.5, 0.1, 0.9, 0.1, 'metal', K.oscuro, { solid: false }),
      bx(0, 11.4, -3.5, 0.5, 0.1, 0.1, 'metal', K.oscuro, { solid: false }),
      // techo de teja de la nave con su cumbrera
      bx(0, 7.1, -1, 8.4, 0.4, 12.4, 'roof', K.teja, { solid: false }),
      bx(0, 7.0, -1, 8.6, 0.25, 12.6, 'stucco', oro, { solid: false }),
      // puerta de madera bajo arco, campanas, cruz y reloj
      bx(0, 1.9, 6.65, 2.4, 3.4, 0.12, 'wood', K.madera, { solid: false }),
      cy(0, 3.6, 6.65, 1.2, 0.12, 'wood', K.madera, { e: [PI / 2, 0, 0], n: 16, solid: false }),
      cy(0, 3.6, 6.62, 1.45, 0.1, 'stucco', oro, { e: [PI / 2, 0, 0], n: 16, solid: false }),
      bx(0, 2.4, 6.72, 0.06, 3.4, 0.06, 'wood', '#3a2716', { solid: false }),
      // cornisas, pilastras y el frontón con su moldura
      bx(0, 8.95, 6.7, 10.8, 0.35, 0.3, 'stucco', oro, { solid: false }),
      bx(0, 9.15, 6.75, 11.2, 0.12, 0.4, 'stucco', oro, { solid: false }),
      bx(0, 5.3, 6.68, 10.8, 0.3, 0.26, 'stucco', oro, { solid: false }),
      bx(0, 5.48, 6.72, 11.0, 0.1, 0.34, 'stucco', oro, { solid: false }),
      bx(0, 0.55, 6.68, 10.8, 0.3, 0.2, 'stone', '#a9a294', { solid: false }),
      bx(-1.35, 10.1, 6.66, 3.5, 0.22, 0.24, 'stucco', oro, { e: [0, 0, 0.684], solid: false }),
      bx(1.35, 10.1, 6.66, 3.5, 0.22, 0.24, 'stucco', oro, { e: [0, 0, -0.684], solid: false }),
      bx(-2.2, 4.6, 6.66, 0.4, 8.6, 0.2, 'stucco', oro, { solid: false }),
      bx(2.2, 4.6, 6.66, 0.4, 8.6, 0.2, 'stucco', oro, { solid: false }),
      bx(0, 7.75, 6.7, 0.07, 0.6, 0.04, 'plastic', K.oscuro, { solid: false }),
      bx(0.2, 7.6, 6.7, 0.45, 0.07, 0.04, 'plastic', K.oscuro, { solid: false }),
      bl(-4.4, 10.0, 7.2, 0.35, 'gold', '#d9a531', { n: 8 }),
      bl(4.4, 10.0, 7.2, 0.35, 'gold', '#d9a531', { n: 8 }),
      cy(0, 7.6, 6.62, 0.8, 0.1, 'plastic', '#fffbe9', { e: [PI / 2, 0, 0], n: 16, solid: false }),
      cy(0, 7.6, 6.6, 0.95, 0.08, 'stucco', oro, { e: [PI / 2, 0, 0], n: 16, solid: false }),
      bx(0, 11.9, 6.1, 0.16, 1.3, 0.16, 'metal', K.oscuro, { solid: false }),
      bx(0, 12.1, 6.1, 0.7, 0.14, 0.16, 'metal', K.oscuro, { solid: false }),
      // columnas pareadas a los lados de la puerta, en dos cuerpos
      ...[-1.55, 1.55].flatMap((x) => [
        ...columna(x, 6.85, 0.7, 5.2, 0.2, c, oro),
        ...columna(x, 6.82, 5.55, 8.8, 0.16, c, oro),
      ]),
      // ventanas en arco de la fachada (encendidas de noche) y nichos del segundo cuerpo
      ...[-3.35, 3.35].flatMap((x) => arco(x, 3.6, 6.6, 0.95, 1.5, oro, '#2b2a2f', 0.9)),
      ...[-3.35, 3.35].flatMap((x) => [
        ...arco(x, 6.9, 6.6, 0.8, 1.0, oro, '#5b4a3a'),
        cy(x, 6.75, 6.75, 0.14, 0.9, 'stucco', '#f1ece0', { n: 8, solid: false }),
        bl(x, 7.3, 6.75, 0.13, 'stucco', '#f1ece0', { n: 8 }),
      ]),
      // remates (pináculos) en las esquinas del frontón
      ...[-2.8, 2.8].flatMap((x) => [
        cy(x, 9.55, 6.3, 0.12, 0.6, 'stucco', oro, { n: 6, solid: false }),
        bl(x, 9.95, 6.3, 0.17, 'stucco', oro, { n: 8 }),
      ]),
      // campanarios: cornisas, arcos en las cuatro caras y cúpula
      ...campanario(-4.4, 6.0, 2.6, 13.0, c, { cap: oro, fino, desde: 8.5 }),
      ...campanario(4.4, 6.0, 2.6, 13.0, c, { cap: oro, fino, desde: 8.5 }),
    ];
  // la nave: contrafuertes y ventanas altas en arco a los dos lados
  for (const sx of [-1, 1]) {
    for (const z of [-6.2, -2.6, 1.0, 4.2]) p.push(bx(sx * 4.15, 2.9, z, 0.3, 5.8, 0.7, 'stucco', c, { solid: false }));
    for (const z of [-4.4, -0.8, 2.6])
      p.push(...place(arco(0, 4.4, 0, 0.8, 1.4, oro, '#2b2a2f', 0.9), sx * 4.0, 0, z, (sx * PI) / 2));
  }
  return {
    pcs: p,
    w: 11,
    d: 15,
    sign: { y: 0.9, z: 7.6, h: 0.42, bg: '#5b3a1e' },
    props: [
      { k: 'Lamp', x: -4.6, z: 8.6 },
      { k: 'Lamp', x: 4.6, z: 8.6 },
    ],
    luz: [3.9, 5.5, 2],
  };
}
function almacen(c: string): Obra {
  const p: Pc[] = [
    bx(0, 5.2, 0, 16, 10.4, 11, 'concrete', c),
    // vitrinas y fajas de cada piso
    bx(0, 1.6, 5.53, 14, 2.6, 0.1, 'glass', K.vidrio, { solid: false }),
    bx(0, 4.9, 5.53, 14.6, 1.6, 0.1, 'glass', K.vidrio, { solid: false }),
    bx(0, 8.1, 5.53, 14.6, 1.6, 0.1, 'glass', K.vidrio, { solid: false }),
    bx(0, 3.35, 5.9, 16.4, 0.5, 0.9, 'concrete', K.rojo, { solid: false }),
    bx(0, 9.9, 5.62, 12, 1.0, 0.14, 'plastic', K.rojo, { solid: false }),
    bx(0, 1.4, 5.6, 2.6, 2.6, 0.12, 'plastic', K.oscuro, { solid: false }),
    // aires acondicionados colgando de la pared y tanques en el techo
    ...[-5.5, -2, 2.5, 6].map((x, i) =>
      bx(x, 6.4 + (i % 2) * 3.2, 5.72, 0.9, 0.55, 0.45, 'metal', K.blanco, { solid: false }),
    ),
    ...tanque(-5, 10.4, -2),
    ...tanque(-3.4, 10.4, -2.4),
    bx(5, 10.9, -1, 2.6, 1.0, 2.2, 'metal', K.gris, { solid: false }),
    // maniquíes en la vitrina
    ...[-5, -3.6, 3.6, 5].flatMap((x) => [
      cy(x, 1.0, 5.0, 0.22, 1.5, 'plastic', K.blanco, { n: 8, solid: false }),
      bl(x, 1.95, 5.0, 0.2, 'plastic', K.blanco, { n: 8 }),
      bx(x, 1.25, 5.0, 0.6, 0.8, 0.3, 'cloth', FACHADAS[Math.abs(Math.round(x)) % FACHADAS.length], { solid: false }),
    ]),
  ];
  return {
    pcs: p,
    w: 16.4,
    d: 11.8,
    sign: { y: 9.9, z: 5.72, h: 0.8, bg: K.rojo, fg: '#ffffff' },
    luz: [-7.6, 9, 3],
  };
}
function diversiones(): Obra {
  const p: Pc[] = [],
    R = 6,
    hubY = 7.6,
    wz = -4,
    n = 14;
  // rueda de Chicago
  for (const zz of [wz - 0.5, wz + 0.5]) {
    const rim: V3[] = Array.from({ length: n + 1 }, (_, i) => {
      const a = (i / n) * PI * 2;
      return [Math.cos(a) * R, hubY + Math.sin(a) * R, zz];
    });
    for (let i = 0; i < n; i++) {
      p.push(seg3(rim[i], rim[i + 1], 0.16, 'metal', K.rojo));
      p.push(seg3([0, hubY, zz], rim[i], 0.08, 'metal', K.blanco));
    }
  }
  for (let i = 0; i < n; i += 2) {
    const a = (i / n) * PI * 2,
      x = Math.cos(a) * R,
      y = hubY + Math.sin(a) * R;
    p.push(
      bx(x, y - 0.75, wz, 0.9, 0.8, 0.9, 'plastic', FACHADAS[(i / 2) % FACHADAS.length], { solid: false }),
      bx(x, y - 0.25, wz, 1.0, 0.1, 1.0, 'plastic', K.amarillo, { solid: false }),
    );
  }
  p.push(
    cy(0, hubY, wz, 0.45, 1.4, 'metal', K.amarillo, { e: [PI / 2, 0, 0], n: 12, solid: false }),
    seg3([-3.2, 0, wz - 1.2], [0, hubY, wz - 0.6], 0.3, 'metal', K.blanco),
    seg3([3.2, 0, wz - 1.2], [0, hubY, wz - 0.6], 0.3, 'metal', K.blanco),
    seg3([-3.2, 0, wz + 1.2], [0, hubY, wz + 0.6], 0.3, 'metal', K.blanco),
    seg3([3.2, 0, wz + 1.2], [0, hubY, wz + 0.6], 0.3, 'metal', K.blanco),
    bx(0, 0.3, wz, 8, 0.6, 3.2, 'concrete', K.concreto),
  );
  // carrusel
  const cx = -4.6,
    cz = 3.4;
  p.push(
    cy(cx, 0.25, cz, 3, 0.5, 'plastic', K.azul, { n: 16 }),
    cy(cx, 2.2, cz, 0.18, 3.4, 'gold', '#d9a531', { n: 8, solid: false }),
    cy(cx, 4.3, cz, 3.3, 1.4, 'cloth', K.rojo, { rt: 0.05, n: 16, solid: false }),
    cy(cx, 3.6, cz, 3.3, 0.3, 'cloth', K.amarillo, { n: 16, solid: false }),
  );
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2,
      x = cx + Math.cos(a) * 2.2,
      z = cz + Math.sin(a) * 2.2;
    p.push(
      cy(x, 2.0, z, 0.04, 3.0, 'gold', '#d9a531', { n: 5, solid: false }),
      bx(x, 1.35, z, 0.35, 0.5, 1.0, 'plastic', FACHADAS[i], { r: -a, solid: false }),
      bx(x, 1.75, z + 0.0, 0.25, 0.5, 0.25, 'plastic', FACHADAS[i], { r: -a, solid: false }),
    );
  }
  // puesto de algodón de azúcar y la entrada
  p.push(
    bx(4.6, 0.6, 3.6, 2, 1.2, 1.2, 'wood', K.blanco),
    bl(4.2, 1.6, 3.6, 0.35, 'cloth', '#ff8fab', { n: 8 }),
    bl(5.0, 1.6, 3.6, 0.35, 'cloth', '#9bf6ff', { n: 8 }),
    bx(-6.4, 2.6, 7.4, 0.7, 5.2, 0.7, 'plastic', K.azul),
    bx(6.4, 2.6, 7.4, 0.7, 5.2, 0.7, 'plastic', K.azul),
    bx(0, 5.6, 7.4, 14, 1.2, 0.5, 'plastic', K.amarillo, { solid: false }),
    bl(-6.4, 5.6, 7.4, 0.7, 'plastic', K.rojo, { n: 10 }),
    bl(6.4, 5.6, 7.4, 0.7, 'plastic', K.rojo, { n: 10 }),
    // cerco
    bx(-7.2, 0.6, 0, 0.12, 1.2, 14, 'metal', K.blanco),
    bx(7.2, 0.6, 0, 0.12, 1.2, 14, 'metal', K.blanco),
    bx(0, 0.6, -7.2, 14.4, 1.2, 0.12, 'metal', K.blanco),
  );
  return {
    pcs: p,
    w: 15,
    d: 15,
    sign: { y: 5.6, z: 7.68, h: 0.75, bg: '#7b2cbf', fg: '#ffffff' },
    luz: [6.4, 5.2, 7.4],
  };
}
function estadio(): Obra {
  const p: Pc[] = [bx(0, 0.06, 0, 15, 0.12, 9, 'grass', K.zacate, { solid: false })];
  // líneas de la cancha
  p.push(
    bx(0, 0.14, 0, 0.12, 0.02, 9, 'plastic', K.blanco, { solid: false }),
    cy(0, 0.14, 0, 1.4, 0.02, 'plastic', K.blanco, { n: 20, solid: false }),
    cy(0, 0.15, 0, 1.25, 0.02, 'grass', K.zacate, { n: 20, solid: false }),
    bx(-7.3, 1.0, 0, 0.12, 2, 3, 'metal', K.blanco, { solid: false }),
    bx(7.3, 1.0, 0, 0.12, 2, 3, 'metal', K.blanco, { solid: false }),
  );
  // graderías por los cuatro lados, con la entrada al frente
  for (let k = 0; k < 4; k++) {
    const y = 0.5 + k * 1.0,
      o = k * 1.0;
    p.push(
      bx(0, y, -5.2 - o, 17 + o * 2, 1.0, 1.0, 'concrete', k % 2 ? K.concreto : '#d4d0c6'),
      bx(-8.2 - o, y, 0, 1.0, 1.0, 11 + o * 2, 'concrete', k % 2 ? K.concreto : '#d4d0c6'),
      bx(8.2 + o, y, 0, 1.0, 1.0, 11 + o * 2, 'concrete', k % 2 ? K.concreto : '#d4d0c6'),
      bx(-5.6 - o / 2, y, 5.2 + o, 5.8 + o, 1.0, 1.0, 'concrete', k % 2 ? K.concreto : '#d4d0c6'),
      bx(5.6 + o / 2, y, 5.2 + o, 5.8 + o, 1.0, 1.0, 'concrete', k % 2 ? K.concreto : '#d4d0c6'),
    );
  }
  // techo de la tribuna, torres de luz y marcador
  p.push(bx(0, 6.2, -7.6, 18, 0.25, 4, 'metal', K.azul, { solid: false }));
  for (const [x, z] of [
    [-11, -8],
    [11, -8],
    [-11, 8],
    [11, 8],
  ])
    p.push(
      cy(x, 6, z, 0.2, 12, 'metal', K.gris, { n: 8 }),
      bx(x, 12.2, z, 2.2, 1.3, 0.3, 'metal', K.oscuro, { r: Math.atan2(-x, -z), solid: false }),
      bx(x, 12.2, z, 1.9, 1.0, 0.36, 'neon', '#fff8d6', { r: Math.atan2(-x, -z), solid: false }),
    );
  p.push(bx(0, 2.8, 8.6, 6, 0.8, 0.4, 'concrete', K.azul, { solid: false }));
  return {
    pcs: p,
    w: 24,
    d: 18,
    sign: { y: 2.8, z: 8.82, h: 0.5, bg: K.azul },
    luz: [11, 11, 8],
  };
}
function mercado(): Obra {
  const p: Pc[] = [bx(0, 0.1, 0, 14, 0.2, 9, 'concrete', '#9e9a91')];
  for (const x of [-6.6, -2.2, 2.2, 6.6])
    for (const z of [-4, 4]) p.push(bx(x, 2.1, z, 0.22, 4.2, 0.22, 'metal', K.oxido));
  // techo de láminas de zinc onduladas, unas nuevas y otras oxidadas, con su canaleta
  p.push(
    ...techoLamina(13.4, 8.2, 4.1, '#9e9a91', { fino: detalleFino(), seed: 9 }).filter(
      (q) => q.m !== 'stucco' && q.m !== 'concrete',
    ),
  );
  // puestos con fruta, verdura y sacos
  const FR = ['#ff9f1c', '#e63946', '#ffd23f', '#3f9b4b', '#8e5a2b'];
  for (let i = 0; i < 4; i++) {
    const x = -5 + i * 3.4,
      z = i % 2 ? -1.6 : 1.6;
    p.push(
      bx(x, 0.6, z, 2.4, 0.8, 1.4, 'wood', K.madera),
      bx(x, 2.6, z, 2.8, 0.06, 1.8, 'cloth', FACHADAS[i], { e: [0.2, 0, 0], solid: false }),
    );
    for (let k = 0; k < 6; k++)
      p.push(
        bl(x - 0.9 + (k % 3) * 0.9, 1.15, z - 0.3 + Math.floor(k / 3) * 0.6, 0.26, 'plastic', FR[(i + k) % FR.length], {
          n: 7,
        }),
      );
  }
  p.push(
    cy(-6, 0.55, 3.2, 0.35, 0.9, 'cloth', '#d9c38a', { n: 8, solid: false }),
    cy(-5.3, 0.5, 3.4, 0.33, 0.8, 'cloth', '#d9c38a', { n: 8, solid: false }),
    bx(0, 5.0, 4.6, 7, 1.0, 0.16, 'wood', K.verde, { solid: false }),
  );
  return {
    pcs: p,
    w: 14.4,
    d: 10,
    sign: { y: 5.0, z: 4.7, h: 0.6, bg: K.verde },
    luz: [6.6, 4.3, 4],
  };
}
function parque(): Obra {
  const p: Pc[] = [
    cy(0, 0.05, 0, 7, 0.1, 'tile', K.piso, { n: 24, solid: false }),
    // kiosko
    cy(0, 0.35, 0, 2.8, 0.7, 'stone', '#e6dfcf', { n: 8 }),
    cy(0, 4.4, 0, 3.2, 1.3, 'roof', K.teja, { rt: 0.08, n: 8, solid: false }),
  ];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI * 2 + PI / 8;
    p.push(cy(Math.cos(a) * 2.45, 2.2, Math.sin(a) * 2.45, 0.12, 3.0, 'stucco', K.blanco, { n: 6 }));
  }
  // bancas de concreto y la estatua del prócer
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI * 2,
      x = Math.cos(a) * 5.6,
      z = Math.sin(a) * 5.6;
    p.push(
      ...place(
        [
          bx(0, 0.45, 0, 1.8, 0.12, 0.5, 'concrete', K.concreto, { solid: false }),
          bx(0, 0.22, 0, 1.4, 0.44, 0.3, 'concrete', K.concreto),
        ],
        x,
        0,
        z,
        -a + PI / 2,
      ),
    );
  }
  p.push(
    bx(-4.4, 0.8, 4.2, 1.2, 1.6, 1.2, 'stone', '#b9b2a0'),
    cy(-4.4, 2.4, 4.2, 0.3, 1.6, 'metal', '#4f6b5a', { n: 8, solid: false }),
    bl(-4.4, 3.4, 4.2, 0.28, 'metal', '#4f6b5a', { n: 8 }),
  );
  return {
    pcs: p,
    w: 14,
    d: 14,
    sign: { y: 0.55, z: 3.0, h: 0.32, bg: '#3a2a1a' },
    props: [
      { k: 'Tree', x: 5, z: -4.6 },
      { k: 'Tree', x: -5, z: -4.6 },
      { k: 'Tree', x: 5.2, z: 4.2 },
      { k: 'Lamp', x: -2.2, z: 6.2 },
    ],
    luz: [0, 4.6, 0],
  };
}
function museo(c: string): Obra {
  const p: Pc[] = [
    bx(0, 2.4, -1, 14, 4.8, 7, 'stucco', c),
    // techo de teja a dos aguas
    bx(0, 5.25, 0.9, 14.6, 0.25, 4.6, 'roof', K.teja, { e: [0.32, 0, 0], solid: false }),
    bx(0, 5.25, -2.9, 14.6, 0.25, 4.6, 'roof', K.teja, { e: [-0.32, 0, 0], solid: false }),
    // portal con arcos (columnas) y viga
    bx(0, 3.9, 3.6, 14, 0.5, 0.5, 'stucco', c, { solid: false }),
    bx(0, 4.2, 3.4, 14.4, 0.15, 2.0, 'roof', K.teja, { e: [0.18, 0, 0], solid: false }),
    bx(0, 0.12, 2.2, 14, 0.24, 3.0, 'tile', '#c78a5a'),
    // puertas de madera y ventanas con barrotes
    bx(0, 1.7, 2.53, 1.8, 3.0, 0.1, 'wood', K.madera, { solid: false }),
    ...[-4.6, -2.4, 2.4, 4.6].flatMap((x) => [
      bx(x, 2.1, 2.53, 1.2, 1.6, 0.08, 'wood', K.madera, { solid: false }),
      ...[-0.4, 0, 0.4].map((k) => bx(x + k, 2.1, 2.62, 0.05, 1.6, 0.05, 'metal', K.oscuro, { solid: false })),
    ]),
    ...tanque(5.2, 4.8, -3.2),
  ];
  for (const x of [-6.6, -4.4, -2.2, 0, 2.2, 4.4, 6.6]) p.push(cy(x, 1.85, 3.6, 0.2, 3.5, 'stucco', c, { n: 8 }));
  return {
    pcs: p,
    w: 14.6,
    d: 9.6,
    sign: { y: 3.9, z: 3.88, h: 0.38, bg: '#5b3a1e' },
    luz: [-6.8, 4.4, 1],
  };
}
function fabrica(c: string): Obra {
  const p: Pc[] = [
    bx(0, 2.8, 0, 12, 5.6, 9, 'brick', c),
    bx(0, 6.2, 2.25, 12.6, 0.12, 5.2, 'metal', K.zinc, { e: [0.28, 0, 0], solid: false }),
    bx(0, 6.2, -2.25, 12.6, 0.12, 5.2, 'metal', K.oxido, { e: [-0.28, 0, 0], solid: false }),
    cy(4.4, 6.5, -2.6, 0.55, 13, 'brick', '#8a4b33', { n: 10 }),
    bx(-1.5, 2.0, 4.53, 4.2, 4.0, 0.1, 'metal', K.oscuro, { solid: false }),
    ...ventanas(10, 4.3, 4.53, 4, K.vidrio, 0.9, 1.4),
    // barriles y sacos en la entrada
    cy(3.4, 0.5, 5.6, 0.42, 1.0, 'wood', K.madera, { n: 10 }),
    cy(4.4, 0.5, 5.4, 0.42, 1.0, 'wood', K.madera, { n: 10 }),
    cy(4.0, 1.5, 5.5, 0.42, 1.0, 'wood', K.madera, { n: 10, solid: false }),
    bx(-4.6, 0.35, 5.6, 1.0, 0.7, 0.7, 'cloth', '#d9c38a'),
    bx(-4.4, 0.95, 5.6, 0.9, 0.5, 0.6, 'cloth', '#d9c38a', { solid: false }),
  ];
  return {
    pcs: p,
    w: 12.6,
    d: 11,
    sign: { y: 4.9, z: 4.62, h: 0.48, bg: '#3a2a1a' },
    luz: [-6, 5, 2],
  };
}
function muelle(): Obra {
  const p: Pc[] = [
    // agua de la bahía con su orilla de arena
    bx(0, 0.0, -2, 16, 0.08, 10, 'sand', '#e6d29b', { solid: false }),
    bx(0, 0.05, -3, 15, 0.08, 8, 'water', '#2aa7c4', { solid: false }),
    // tablones y pilotes
    bx(0, 0.75, -2, 3, 0.2, 12, 'wood', '#8a6240', { solid: false }),
    bx(0, 0.75, -7.4, 8, 0.2, 2.4, 'wood', '#8a6240', { solid: false }),
  ];
  for (let z = 3; z >= -8; z -= 2.2)
    p.push(
      cy(-1.4, 0.4, z, 0.14, 1.4, 'wood', K.madera, { n: 6 }),
      cy(1.4, 0.4, z, 0.14, 1.4, 'wood', K.madera, { n: 6 }),
    );
  p.push(
    bx(0, 0.4, 4.2, 3.2, 0.8, 0.5, 'concrete', K.concreto),
    cy(-3.6, 1.0, -7.4, 0.12, 0.5, 'metal', K.oscuro, { n: 8, solid: false }),
    cy(3.6, 1.0, -7.4, 0.12, 0.5, 'metal', K.oscuro, { n: 8, solid: false }),
    bx(-6.2, 0.4, 3.6, 1, 0.8, 1, 'wood', K.madera),
    bx(-6.6, 1.1, 3.6, 0.8, 0.6, 0.8, 'wood', K.madera, { solid: false }),
  );
  return {
    pcs: p,
    w: 16,
    d: 12,
    sign: { y: 1.6, z: 4.5, h: 0.42, bg: '#0b6e8a' },
    props: [
      { k: 'Boat', x: -4.6, z: -3.2, rot: 0.3 },
      { k: 'Boat', x: 4.4, z: -1.6, rot: -0.2, color: '#ffd23f' },
      { k: 'Palm', x: 6.6, z: 3.2 },
    ],
    luz: [0, 1.4, 4.2],
  };
}
function aduana(): Obra {
  const p: Pc[] = [
    bx(0, 0.06, 0, 16, 0.12, 9, 'asphalt', '#4f5258', { solid: false }),
    bx(0, 6.0, 0, 16, 0.4, 7, 'metal', K.blanco, { solid: false }),
    bx(-6, 3.0, -3, 0.4, 6, 0.4, 'metal', K.gris),
    bx(6, 3.0, -3, 0.4, 6, 0.4, 'metal', K.gris),
    bx(-6, 3.0, 3, 0.4, 6, 0.4, 'metal', K.gris),
    bx(6, 3.0, 3, 0.4, 6, 0.4, 'metal', K.gris),
    // caseta y pluma
    bx(0, 1.4, 0, 2.4, 2.8, 2.4, 'stucco', '#e8eef5'),
    bx(0, 1.7, 1.23, 1.8, 1.0, 0.06, 'glass', K.vidrio, { solid: false }),
    bx(0, 0.6, 2.4, 0.4, 1.2, 0.4, 'metal', K.amarillo),
    ...[0, 1, 2, 3, 4, 5].map((i) =>
      bx(-1.5 - i * 0.6 - 0.3, 1.15, 2.4, 0.6, 0.14, 0.14, 'plastic', i % 2 ? K.blanco : K.rojo, { solid: false }),
    ),
    bx(0, 5.4, 3.55, 9, 0.9, 0.12, 'metal', K.azul, { solid: false }),
    // conos y una rastra esperando
    ...[-4, -2.8, 2.8, 4].map((x) => cy(x, 0.35, 4, 0.22, 0.7, 'plastic', '#ff7a1a', { rt: 0.2, n: 8 })),
    bx(4.4, 1.6, -1, 2.6, 2.4, 2.4, 'metal', '#c0392b'),
    bx(4.4, 2.3, -6.4, 2.6, 3.6, 8, 'metal', '#dfe3e6'),
  ];
  return {
    pcs: p,
    w: 16,
    d: 15,
    sign: { y: 5.4, z: 3.63, h: 0.5, bg: K.azul },
    props: [
      { k: 'Flag', x: -7.4, z: 3.4 },
      { k: 'Flag', x: 7.4, z: 3.4 },
    ],
    luz: [-6, 6, 3],
  };
}
function peatonal(seed: number): Obra {
  const r = rng(seed),
    p: Pc[] = [
      bx(0, 0.04, -2, 6, 0.08, 18, 'tile', '#c78a5a', { solid: false }),
      // arco de entrada
      bx(-2.9, 2.0, 7.9, 0.3, 4.0, 0.3, 'metal', K.oscuro),
      bx(2.9, 2.0, 7.9, 0.3, 4.0, 0.3, 'metal', K.oscuro),
      bx(0, 4.0, 7.9, 6.2, 0.8, 0.2, 'metal', K.oscuro, { solid: false }),
    ];
  for (const side of [-1, 1])
    for (let i = 0; i < 4; i++) {
      const z = 5.5 - i * 4.4,
        h = 4.2 + r() * 2.6,
        c = FACHADAS[(i * 2 + (side > 0 ? 1 : 0)) % FACHADAS.length];
      p.push(
        bx(side * 5.2, h / 2, z, 4.4, h, 4.2, 'stucco', c),
        bx(side * 3.0, 1.3, z, 0.08, 2.4, 1.6, 'plastic', K.oscuro, { solid: false }),
        bx(side * 2.6, 2.7, z, 1.0, 0.08, 3.6, 'cloth', FACHADAS[(i + 3) % FACHADAS.length], {
          e: [0, 0, side * -0.25],
          solid: false,
        }),
        bx(side * 3.0, 3.5, z, 0.1, 0.6, 2.6, 'wood', K.blanco, { solid: false }),
      );
      if (r() < 0.5) p.push(...tanque(side * 5.2, h, z));
      else p.push(...varillas(side * 5.2, h, z, 2.6));
    }
  // guirnaldas de foquitos cruzando la calle
  for (let i = 0; i < 3; i++) {
    const z = 4 - i * 5,
      a: V3 = [-3.0, 4.2, z],
      b: V3 = [3.0, 4.2, z - 1.2];
    cable(p, a, b, 0.5, 0.03);
    for (let k = 1; k < 6; k++) {
      const q = enCable(a, b, 0.5, k / 6);
      p.push(bl(q[0], q[1] - 0.12, q[2], 0.09, 'neon', ['#ffd23f', '#ff6b6b', '#4cc9f0'][k % 3], { n: 6 }));
    }
  }
  return {
    pcs: p,
    w: 14.8,
    d: 18,
    sign: { y: 4.0, z: 8.02, h: 0.5, bg: '#3a2a1a' },
    props: [
      { k: 'Bench', x: 0, z: 1, rot: PI / 2 },
      { k: 'Lamp', x: 0, z: -6 },
    ],
    luz: [-5.2, 4, 5.5],
  };
}
function pista(): Obra {
  const p: Pc[] = [
    bx(0, 0.04, -3, 6, 0.08, 18, 'asphalt', '#55585e', { solid: false }),
    ...[-9, -5, -1, 3].map((z) => bx(0, 0.1, z, 0.3, 0.02, 2, 'plastic', K.blanco, { solid: false })),
    // terminalito con techo de zinc
    bx(-6.4, 1.6, 2.6, 4.4, 3.2, 4, 'stucco', '#9bf6ff'),
    bx(-6.4, 3.4, 2.6, 5, 0.12, 4.8, 'metal', K.zinc, { e: [0.08, 0, 0], solid: false }),
    bx(-6.4, 1.3, 4.63, 1.2, 2.4, 0.08, 'wood', K.madera, { solid: false }),
    // manga de viento
    cy(6, 2.5, 4, 0.08, 5, 'metal', K.gris, { n: 6 }),
    cy(6.6, 4.8, 4, 0.28, 1.2, 'cloth', '#ff7a1a', { rt: 0.5, e: [0, 0, PI / 2], n: 8, solid: false }),
    // avioneta
    bx(0, 1.2, -5, 1.1, 1.1, 5.2, 'metal', K.blanco, { solid: false }),
    bx(0, 1.7, -5.4, 8.6, 0.12, 1.3, 'metal', K.blanco, { solid: false }),
    bx(0, 1.25, -7.4, 3, 0.1, 0.8, 'metal', K.blanco, { solid: false }),
    bx(0, 2.0, -7.5, 0.1, 1.4, 0.8, 'metal', K.rojo, { solid: false }),
    bx(0, 1.25, -2.3, 0.1, 1.5, 0.12, 'metal', K.oscuro, { solid: false }),
    bx(0, 1.45, -3.6, 1.0, 0.5, 1.2, 'glass', K.vidrio, { solid: false }),
    cy(-0.9, 0.35, -4.4, 0.3, 0.16, 'plastic', K.oscuro, { e: [0, 0, PI / 2], n: 10, solid: false }),
    cy(0.9, 0.35, -4.4, 0.3, 0.16, 'plastic', K.oscuro, { e: [0, 0, PI / 2], n: 10, solid: false }),
    bx(0, 1.0, -5, 1.4, 2.0, 5.4, 'metal', K.blanco, { solid: true }),
  ];
  return {
    pcs: p,
    w: 16,
    d: 18,
    sign: { y: 2.6, z: 4.68, h: 0.38, bg: '#0b6e8a' },
    props: [{ k: 'Palm', x: -9, z: 6 }],
    luz: [-8.4, 3.2, 2.6],
  };
}
function salinera(): Obra {
  const p: Pc[] = [bx(0, 0.03, 0, 15, 0.06, 11, 'dirt', '#c9b48a', { solid: false })];
  for (let i = 0; i < 3; i++)
    for (let k = 0; k < 2; k++) {
      const x = -4.8 + i * 4.8,
        z = -2.6 + k * 4.8;
      p.push(
        bx(x, 0.1, z, 4.2, 0.2, 4.2, 'dirt', '#b5a07a', { solid: false }),
        bx(x, 0.16, z, 3.8, 0.06, 3.8, (i + k) % 2 ? 'water' : 'sand', (i + k) % 2 ? '#7fd3e6' : '#fbfbf5', {
          solid: false,
        }),
      );
    }
  p.push(
    cy(-6, 0.7, 5.4, 1.2, 1.4, 'sand', '#fbfbf5', { rt: 0.1, n: 10 }),
    cy(-3.4, 0.55, 5.6, 0.9, 1.1, 'sand', '#fbfbf5', { rt: 0.1, n: 10 }),
    bx(5, 1.2, 5, 3.2, 2.4, 2.4, 'wood', K.madera),
    bx(5, 2.6, 5, 3.8, 0.12, 3.0, 'metal', K.zinc, { e: [0.1, 0, 0], solid: false }),
    bx(2.6, 0.35, 5.6, 1.0, 0.7, 0.7, 'cloth', '#fbfbf5'),
  );
  return {
    pcs: p,
    w: 15,
    d: 12,
    sign: { y: 1.9, z: 6.25, h: 0.38, bg: '#3a2a1a' },
    luz: [5, 2.4, 5],
  };
}
/** La pulpería del barrio: reja en la ventana, rótulo pintado, sillas plásticas, tanque negro y varillas en el techo. */
function pulperia(c: string): Obra {
  const p: Pc[] = [
    bx(0, 1.6, 0, 5.6, 3.2, 4.6, 'stucco', c),
    ...techoLamina(5.6, 4.6, 3.2, c, { fino: detalleFino(), seed: 5 }),
    bx(0, 0.4, 0, 5.66, 0.8, 4.66, 'stucco', '#8f6a5a', { solid: false }),
    bx(0, 0.1, 2.9, 5.6, 0.2, 1.2, 'concrete', K.concreto),
    // marco de la puerta, ventana lateral con reja y el medidor de luz
    bx(1.6, 2.35, 2.36, 1.3, 0.12, 0.1, 'concrete', '#e9e3d6', { solid: false }),
    ...place(ventana(0, 1.7, 0, 1.0, 1.0, { reja: K.oscuro, luz: true }), 2.8, 0, -0.6, PI / 2),
    bx(2.75, 1.9, 1.6, 0.3, 0.4, 0.2, 'metal', '#c3c7cb', { solid: false }),
    cy(2.75, 1.9, 1.72, 0.08, 0.05, 'glass', K.vidrio, { e: [PI / 2, 0, 0], n: 10, solid: false }),
    // ventana con reja (por ahí se despacha) y la puerta
    bx(-1.1, 1.65, 2.33, 2.4, 1.3, 0.08, 'plastic', '#3a3027', { solid: false, em: 1.2 }),
    bx(-1.1, 0.95, 2.45, 2.6, 0.12, 0.35, 'wood', K.madera, { solid: false }),
    ...[-2.2, -1.85, -1.5, -1.15, -0.8, -0.45, -0.1].map((x) =>
      bx(x, 1.65, 2.42, 0.05, 1.4, 0.05, 'metal', K.oscuro, { solid: false }),
    ),
    bx(-1.1, 2.33, 2.42, 2.4, 0.05, 0.05, 'metal', K.oscuro, { solid: false }),
    bx(1.6, 1.15, 2.33, 1.1, 2.3, 0.08, 'metal', '#3a6ea5', { solid: false }),
    // rótulo pintado sobre la pared
    bx(0, 2.75, 2.33, 5.0, 0.7, 0.06, 'plastic', K.blanco, { solid: false }),
    // cajillas de fresco y silla plástica
    bx(2.2, 0.35, 3.0, 0.7, 0.3, 0.5, 'plastic', K.rojo, { solid: false }),
    bx(2.2, 0.66, 3.0, 0.7, 0.3, 0.5, 'plastic', K.amarillo, { solid: false }),
    bx(-2.3, 0.45, 3.1, 0.5, 0.08, 0.5, 'plastic', K.blanco, { solid: false }),
    bx(-2.3, 0.75, 2.88, 0.5, 0.6, 0.06, 'plastic', K.blanco, { solid: false }),
    ...tanqueHN(1.4, 3.9, -1.2),
    ...[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) =>
        bx(1.4 + sx * 0.45, 3.65, -1.2 + sz * 0.45, 0.05, 0.6, 0.05, 'metal', K.oxido, { solid: false }),
      ),
    ),
    bx(1.4, 3.9, -1.2, 1.2, 0.06, 1.2, 'metal', K.oxido, { solid: false }),
    ...antena(-1.8, 3.5, -1.4, true, 0.6),
  ];
  return {
    pcs: p,
    w: 6,
    d: 6,
    sign: { y: 2.75, z: 2.4, h: 0.42, bg: '#ffffff', fg: '#c62828' },
    luz: [2.5, 3.0, 1.8],
  };
}

/** Con vegetación del paquete de arte, los árboles y palmas de una obra van fusionados en <Build> (misma especie,
 *  semilla y colisión que P.Tree / P.Palm, pero una sola malla para toda la ciudad). Sin ella siguen como utilería. */
const ARBOL = { Tree: { k: 'tree', r: 0.35, h: 3 }, Palm: { k: 'palm', r: 0.25, h: 4 } } as const;
const esArbol = (k: string): k is keyof typeof ARBOL => !!art.Flora && k in ARBOL;
function arboles(o: Obra): Pc[] {
  return (o.props ?? []).flatMap((q, i) => {
    if (!esArbol(q.k)) return [];
    const a = ARBOL[q.k];
    return conFlora([cy(q.x, a.h / 2, q.z, a.r, a.h, 'wood', '#6b4a2a')], {
      k: a.k,
      p: [q.x, 0, q.z],
      s: 1,
      c: q.color,
      seed: i + 3,
      r: q.rot ?? 0,
    });
  });
}

/** La misma obra a escala k (para que quepa en un hueco más chico). */
function aEscala(o: Obra, k: number): Obra {
  return {
    ...o,
    pcs: o.pcs.map((q) => ({
      ...q,
      p: [q.p[0] * k, q.p[1] * k, q.p[2] * k] as V3,
      s: [q.s[0] * k, q.s[1] * k, q.s[2] * k] as V3,
    })),
    w: o.w * k,
    d: o.d * k,
    sign: { ...o.sign, y: o.sign.y * k, z: o.sign.z * k + 0.02, h: o.sign.h * Math.max(0.85, k) },
    props: o.props?.map((q) => ({ ...q, x: q.x * k, z: q.z * k })),
    luz: [o.luz[0] * k, o.luz[1] * k, o.luz[2] * k],
  };
}

function obraDe(tipo: TipoSitio, s: SitioReal | null, seed: number): Obra {
  const c = s?.color;
  switch (tipo) {
    case 'iglesia':
      return iglesia(c ?? K.blanco);
    case 'almacen':
      return almacen(c ?? '#e9e2d0');
    case 'diversiones':
      return diversiones();
    case 'estadio':
      return estadio();
    case 'mercado':
      return mercado();
    case 'parque':
      return parque();
    case 'museo':
      return museo(c ?? '#efe3c8');
    case 'fabrica':
      return fabrica(c ?? '#c98f5f');
    case 'muelle':
      return muelle();
    case 'aduana':
      return aduana();
    case 'peatonal':
      return peatonal(seed);
    case 'pista':
      return pista();
    case 'salinera':
      return salinera();
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Dónde va cada cosa

const distSeg = (x: number, z: number, [ax, az]: XZ, [bx_, bz]: XZ) => {
  const dx = bx_ - ax,
    dz = bz - az,
    k = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(x - ax - k * dx, z - az - k * dz);
};

export interface SitioPuesto {
  id: string;
  nombre: string;
  nota: string;
  tipo: TipoSitio | 'pulperia';
  pos: V3;
  rot: number;
  use: V3;
  obra: Obra;
}
export interface PlanCiudad {
  sitios: SitioPuesto[];
  faltan: string[];
  pcs: Pc[];
  postes: number;
  zapatos: number;
  maranas: number;
  /** dónde cuelgan los zapatos y dónde están las marañas (para pruebas y capturas) */
  zapatosEn: V3[];
  maranasEn: V3[];
  /** rótulos pintados de los comercios del barrio */
  rotulos: { pos: V3; rot: number; text: string; bg: string; fg: string }[];
  /** cuántas casas del barrio salieron (para pruebas) */
  casas: number;
  /** dónde quedaron las plantas de los jardines del barrio y un punto de la calle para verlas (capturas) */
  jardines: { p: XZ; cam: XZ; k: string }[];
}

/** Huella de un edificio (rectángulo girado) muestreada cada ~2 m, con margen. */
function huella(x: number, z: number, rot: number, w: number, d: number, m = 0): XZ[] {
  const out: XZ[] = [],
    nx = Math.max(2, Math.ceil((w + 2 * m) / 2)),
    nz = Math.max(2, Math.ceil((d + 2 * m) / 2));
  for (let i = 0; i <= nx; i++)
    for (let k = 0; k <= nz; k++) {
      const [rx, rz] = rotXZ(-w / 2 - m + ((w + 2 * m) * i) / nx, -d / 2 - m + ((d + 2 * m) * k) / nz, rot);
      out.push([x + rx, z + rz]);
    }
  return out;
}
const dentroDe = (pt: XZ, s: { pos: V3; rot: number; obra: Obra }, m: number) => {
  const [lx, lz] = rotXZ(pt[0] - s.pos[0], pt[1] - s.pos[2], -s.rot);
  return Math.abs(lx) < s.obra.w / 2 + m && Math.abs(lz) < s.obra.d / 2 + m;
};

export function planCiudad(d: Department, spec: ZoneSpec): PlanCiudad | null {
  const datos = CIUDADES[d.id],
    lugares = catDe(d.id).lugares;
  if (!datos || !lugares.length) return null;
  const lay: Layout = layoutOf(spec, lugares),
    [cx, cz] = lay.c,
    muro = lugarDelMuro(d, spec),
    r = rng(d.id.length * 977 + d.name.charCodeAt(0)),
    // caminos de la plaza a cada estación
    caminos = lay.st.map((s) => [lay.c, s.pos] as [XZ, XZ]),
    main = lay.main;
  const pcs: Pc[] = [],
    sitios: SitioPuesto[] = [],
    faltan: string[] = [];
  const libre = (pts: XZ[], hol = 0) =>
    pts.every(
      ([x, z]) =>
        x > main.minX + 1.5 &&
        x < main.maxX - 1.5 &&
        z > main.minZ + 1.5 &&
        z < main.maxZ - 1.5 &&
        Math.hypot(x - cx, z - cz) > 11 &&
        lay.st.every((s) => Math.hypot(x - s.pos[0], z - s.pos[1]) > 15.5 - hol * 1.5) &&
        caminos.every((cm) => distSeg(x, z, cm[0], cm[1]) > 3.4 - hol * 0.6) &&
        (!muro || Math.hypot(x - muro.pos[0], z - muro.pos[2]) > 4.5) &&
        sitios.every((s) => !dentroDe([x, z], s, 1.5)),
    );
  /** el hueco libre más cercano a la plaza donde cabe la obra, mirando hacia la plaza */
  const ubicar = (o: Obra): { x: number; z: number; rot: number } | null => {
    // primero de frente a la plaza y con holgura; si no cabe, de lado y más apretado
    for (const [hol, giros] of [
      [0, [0]],
      [0, [PI / 2, -PI / 2]],
      [1, [0, PI / 2, -PI / 2]],
    ] as [number, number[]][]) {
      let best: { x: number; z: number; rot: number } | null = null,
        bd = Infinity;
      for (let x = main.minX; x <= main.maxX; x += 1.5)
        for (let z = main.minZ; z <= main.maxZ; z += 1.5) {
          const dd = Math.hypot(x - cx, z - cz);
          if (dd >= bd || dd < 11 + Math.min(o.w, o.d) / 2) continue;
          for (const gi of giros) {
            const rot = Math.atan2(cx - x, cz - z) + gi;
            if (libre(huella(x, z, rot, o.w, o.d), hol)) {
              best = { x, z, rot };
              bd = dd;
              break;
            }
          }
        }
      if (best) return best;
    }
    return null;
  };
  const pulp = pulperia(FACHADAS[Math.floor(r() * FACHADAS.length)]);
  const pedidos: { id: string; nombre: string; nota: string; tipo: SitioPuesto['tipo']; obra: Obra }[] = [
    {
      id: 'pulperia',
      nombre: datos.pulperia,
      nota: `La pulpería de la esquina en ${datos.ciudad}: fresco de bolsa, tajaditas, pan dulce y saldo para el celular. Si no traés suelto, te lo apuntan en el cuaderno.`,
      tipo: 'pulperia',
      obra: pulp,
    },
    ...datos.sitios.map((s, i) => ({
      id: s.id,
      nombre: s.nombre,
      nota: s.nota,
      tipo: s.tipo,
      obra: obraDe(s.tipo, s, i + 11),
    })),
  ];
  // los grandes primero, para que encuentren hueco
  const orden = [...pedidos].sort((a, b) =>
    a.tipo === 'pulperia' ? -1 : b.tipo === 'pulperia' ? 1 : b.obra.w * b.obra.d - a.obra.w * a.obra.d,
  );
  for (const q of orden) {
    let u = ubicar(q.obra);
    for (const k of [0.82, 0.68]) {
      if (u) break;
      const chica = aEscala(q.obra, k);
      u = ubicar(chica);
      if (u) q.obra = chica;
    }
    if (!u) {
      faltan.push(q.id);
      continue;
    }
    const [ux, uz] = rotXZ(0, q.obra.d / 2 + 1.6, u.rot);
    sitios.push({
      id: q.id,
      nombre: q.nombre,
      nota: q.nota,
      tipo: q.tipo,
      pos: [u.x, 0, u.z],
      rot: u.rot,
      use: [u.x + ux, 0, u.z + uz],
      obra: q.obra,
    });
    pcs.push(...place(q.obra.pcs, u.x, 0, u.z, u.rot), ...place(arboles(q.obra), u.x, 0, u.z, u.rot));
  }
  sitios.sort((a, b) => pedidos.findIndex((p) => p.id === a.id) - pedidos.findIndex((p) => p.id === b.id));

  // calles: asfalto, cunetas, bordillo pintado, aceras, túmulos y casas del barrio a los dos lados
  const barrio = calles(pcs, lay, sitios, muro?.pos ?? null, r, datos.ciudad);

  // tendido eléctrico: una fila de postes a un lado de cada camino, amarrada alrededor de la plaza
  const libreDePoste = (x: number, z: number) =>
    sitios.every((s) => !dentroDe([x, z], s, 0.8)) &&
    (!muro || Math.hypot(x - muro.pos[0], z - muro.pos[2]) > 3.8) &&
    lay.st.every((s) => Math.hypot(x - s.pos[0], z - s.pos[1]) > 15);
  let nPostes = 0,
    seed = 1;
  const zapatosEn: V3[] = [],
    maranasEn: V3[] = [];
  const primeros: Poste[] = [],
    todos: Poste[] = [];
  const COLORES_TENIS = ['#e63946', '#1d3557', '#f4f2ec', '#2a9d8f', '#111111', '#ff9f1c'];
  lay.st.forEach((s, si) => {
    const dx = s.pos[0] - cx,
      dz = s.pos[1] - cz,
      len = Math.hypot(dx, dz),
      ux = dx / len,
      uz = dz / len,
      side = si % 2 ? 1 : -1,
      yaw = Math.atan2(ux, uz),
      fila: Poste[] = [];
    for (let t = 10; t < len - 15; t += 12) {
      const x = cx + ux * t + uz * 2.4 * side,
        z = cz + uz * t - ux * 2.4 * side;
      if (!libreDePoste(x, z)) break;
      fila.push(poste(pcs, x, z, yaw, seed++, side));
    }
    for (let i = 0; i < fila.length - 1; i++) {
      tendido(pcs, fila[i], fila[i + 1], seed++, i % 2);
      if ((si + i) % 2 === 0) {
        const p = enCable(fila[i].a, fila[i + 1].a, 0.45, 0.4 + r() * 0.2);
        zapatos(pcs, p, yaw + PI / 2, COLORES_TENIS[zapatosEn.length % COLORES_TENIS.length]);
        zapatosEn.push(p);
      }
    }
    if (fila[0]) primeros.push(fila[0]);
    todos.push(...fila);
    nPostes += fila.length;
  });
  // los primeros postes de cada fila se amarran entre sí sobre la plaza: el enredo que se ve al llegar
  for (let i = 0; i < primeros.length - 1; i++) {
    const p = primeros[i],
      q = primeros[i + 1];
    cable(pcs, p.a, q.b, 0.5);
    cable(pcs, p.t, q.t, 1.1, 0.04);
    cable(pcs, [p.t[0], p.t[1] - 0.15, p.t[2]], [q.t[0], q.t[1] - 0.15, q.t[2]], 1.6, 0.04);
    if (i % 2 === 0) {
      const z = enCable(p.t, q.t, 1.1, 0.5);
      zapatos(
        pcs,
        z,
        Math.atan2(q.x - p.x, q.z - p.z) + PI / 2,
        COLORES_TENIS[zapatosEn.length % COLORES_TENIS.length],
      );
      zapatosEn.push(z);
    }
  }
  todos.forEach((p, i) => {
    if (i % 2 === 0) {
      marana(pcs, p.x, p.z, p.yaw, i + 3);
      maranasEn.push([p.x, 6, p.z]);
    }
  });
  // acometidas: un cable del poste más cercano a cada edificio
  for (const s of sitios) {
    let best: Poste | null = null,
      bd = Infinity;
    for (const p of todos) {
      const dd = Math.hypot(p.x - s.pos[0], p.z - s.pos[2]);
      if (dd < bd) {
        bd = dd;
        best = p;
      }
    }
    if (!best || bd > 34) continue;
    const [lx, lz] = rotXZ(s.obra.luz[0], s.obra.luz[2], s.rot);
    cable(pcs, best.t, [s.pos[0] + lx, s.obra.luz[1], s.pos[2] + lz], 0.7, 0.035);
  }
  return {
    sitios,
    faltan,
    pcs,
    postes: nPostes,
    zapatos: zapatosEn.length,
    maranas: maranasEn.length,
    zapatosEn,
    maranasEn,
    rotulos: barrio.rotulos,
    casas: barrio.casas,
    jardines: barrio.jardines,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// Calles del barrio

/** ancho de media calzada, fin del bordillo y fin de la acera, medidos desde el centro del camino */
const CALZ = 2.0,
  BORD = 2.16,
  ACERA = 3.36;
const COMERCIOS: [string, string, string][] = [
  ['Comedor Doña Tere', '#c62828', '#fff8e1'],
  ['Ferretería El Martillo', '#1d4e89', '#ffffff'],
  ['Barbería El Estilo', '#ffffff', '#1d3557'],
  ['Llantera El Gordo', '#ffd23f', '#1b1b1b'],
  ['Tortillería Doña Mari', '#2e7d32', '#ffffff'],
  ['Farmacia Popular', '#ffffff', '#2e7d32'],
  ['Repuestos El Catracho', '#263238', '#ffd23f'],
  ['Baleadas La Bendición', '#ff8f00', '#ffffff'],
  ['Panadería San José', '#f6e3c3', '#6d3b1f'],
  ['Taller El Primo', '#455a64', '#ffffff'],
  ['Mini Súper La Económica', '#d32f2f', '#ffffff'],
  ['Cyber y Copias', '#0277bd', '#ffffff'],
];
const CORDON = { amarillo: '#e2b83a', blanco: '#e9e6dd', rojo: '#c0392b', gris: '#b9b4a8' };

function calles(
  pcs: Pc[],
  lay: Layout,
  sitios: SitioPuesto[],
  muro: V3 | null,
  r: () => number,
  ciudad: string,
): { rotulos: PlanCiudad['rotulos']; casas: number; jardines: PlanCiudad['jardines'] } {
  const [cx, cz] = lay.c,
    jardines: PlanCiudad['jardines'] = [],
    fino = detalleFino(),
    grande = ciudad === 'Tegucigalpa' || ciudad === 'San Pedro Sula' || ciudad === 'La Ceiba',
    rotulos: PlanCiudad['rotulos'] = [],
    hechas: { pos: V3; rot: number; obra: Obra }[] = [],
    caminos = lay.st.map((s) => [lay.c, s.pos] as [XZ, XZ]),
    angs = lay.st.map((s) => s.ang);
  let nCasas = 0,
    nCom = Math.floor(r() * COMERCIOS.length);
  const libreCasa = (pts: XZ[]) =>
    pts.every(
      ([x, z]) =>
        x > lay.main.minX + 1 &&
        x < lay.main.maxX - 1 &&
        z > lay.main.minZ + 1 &&
        z < lay.main.maxZ - 1 &&
        Math.hypot(x - cx, z - cz) > 11 &&
        lay.st.every((s) => Math.hypot(x - s.pos[0], z - s.pos[1]) > 16) &&
        caminos.every((cm) => distSeg(x, z, cm[0], cm[1]) > ACERA - 0.05) &&
        (!muro || Math.hypot(x - muro[0], z - muro[2]) > 6) &&
        sitios.every((s) => !dentroDe([x, z], s, 1.2) && Math.hypot(x - s.use[0], z - s.use[2]) > 3.5) &&
        hechas.every((s) => !dentroDe([x, z], s, 0.05)),
    );
  /** un tramo de acera o bordillo solo si no se mete en un sitio ni en el muro */
  const tramoLibre = (x: number, z: number) =>
    sitios.every((s) => !dentroDe([x, z], s, 0.3)) && (!muro || Math.hypot(x - muro[0], z - muro[2]) > 3);
  lay.st.forEach((s, si) => {
    const dx = s.pos[0] - cx,
      dz = s.pos[1] - cz,
      len = Math.hypot(dx, dz),
      ux = dx / len,
      uz = dz / len,
      yaw = Math.atan2(ux, uz),
      r0 = 7.4,
      r1 = len - 13.3,
      // dónde arranca la acera de cada lado: lejos de la calle vecina
      gap = (k: number) => {
        const o = angs[si + k];
        return o === undefined ? 9 : Math.max(9, (ACERA + 0.3) / Math.sin(Math.abs(o - s.ang) / 2));
      },
      W = (lx: number, lz: number): XZ => {
        const [rx, rz] = rotXZ(lx, lz, yaw);
        return [cx + rx, cz + rz];
      },
      loc: Pc[] = [];
    if (r1 < r0 + 4) return;
    const L = r1 - r0,
      mid = (r0 + r1) / 2;
    loc.push(
      bx(0, 0.035, mid, 2 * CALZ, 0.07, L, 'asphalt', '#56585c', { solid: false }),
      // cunetas: la orilla de la calzada, más oscura y gastada
      bx(-CALZ + 0.17, 0.073, mid, 0.34, 0.012, L, 'concrete', '#77736b', { solid: false }),
      bx(CALZ - 0.17, 0.073, mid, 0.34, 0.012, L, 'concrete', '#77736b', { solid: false }),
    );
    // línea del centro, discontinua, y paso de cebra al salir de la plaza
    for (let z = r0 + 4; z < r1 - 1; z += 4)
      loc.push(bx(0, 0.076, z, 0.12, 0.012, 1.8, 'plastic', '#e2c044', { solid: false }));
    for (let x = -CALZ + 0.4; x < CALZ - 0.2; x += 0.6)
      loc.push(bx(x, 0.076, r0 + 1.8, 0.36, 0.012, 1.8, 'plastic', '#ece9e0', { solid: false }));
    // túmulos (pintados de amarillo y negro)
    for (const t of [0.42, 0.78]) {
      const z = r0 + L * t;
      if (z > r1 - 3) continue;
      for (let k = 0; k < 6; k++)
        loc.push(
          cy(
            -CALZ + (2 * CALZ * (k + 0.5)) / 6,
            -0.33,
            z,
            0.5,
            (2 * CALZ) / 6,
            'asphalt',
            k % 2 ? '#2a2a2c' : '#d9b23a',
            {
              e: [0, 0, PI / 2],
              n: 14,
              solid: false,
            },
          ),
        );
    }
    // bordillo y acera por tramos de 1.5 m (se cortan donde hay un sitio o el muro)
    for (const sx of [-1, 1]) {
      const z0 = gap(sx < 0 ? -1 : 1),
        pinta = (si + (sx > 0 ? 1 : 0)) % 3;
      for (let z = z0; z < r1 - 0.5; z += 1.5) {
        const [wx, wz] = W(sx * ((BORD + ACERA) / 2), z + 0.75);
        if (!tramoLibre(wx, wz)) continue;
        const k = Math.round((z - z0) / 1.5),
          c =
            z < z0 + 6
              ? k % 2
                ? CORDON.rojo
                : CORDON.blanco
              : pinta === 0
                ? CORDON.amarillo
                : pinta === 1
                  ? CORDON.gris
                  : k % 8 < 4
                    ? CORDON.amarillo
                    : CORDON.gris;
        loc.push(
          bx(sx * (CALZ + 0.08), 0.11, z + 0.75, 0.16, 0.22, 1.48, 'concrete', c, { solid: false }),
          bx(sx * ((BORD + ACERA) / 2), 0.09, z + 0.75, ACERA - BORD, 0.18, 1.5, 'concrete', '#c7c1b3'),
        );
      }
      // casas del barrio, pared con pared, con el frente a la acera; donde no cabe una casa, tapial de bloque
      let z = z0 + 1.5,
        tapial = 0;
      while (z < r1 - 2) {
        const w = 5.4 + r() * 2.6,
          zc = z + w / 2,
          rot = yaw - (sx * PI) / 2;
        if (zc + w / 2 > r1 - 1) break;
        let ok = 0,
          hx = 0,
          hz = 0;
        for (const d of [6 + r() * 2.5, 5, 4.2]) {
          [hx, hz] = W(sx * (ACERA + 0.12 + d / 2), zc);
          if (libreCasa(huella(hx, hz, rot, w, d, 0.1))) {
            ok = d;
            break;
          }
        }
        if (!ok) {
          // tapial: bloque repellado con alambre de púas arriba; cada tanto un portón abierto para pasar
          const [tx, tz] = W(sx * (ACERA + 0.2), z + 0.75),
            [bx_, bz] = W(sx * (ACERA + 0.2), z + 0.75 + 0.8);
          const lejos = ([x, z]: XZ) =>
            sitios.every((st) => !dentroDe([x, z], st, 3) && Math.hypot(x - st.use[0], z - st.use[2]) > 4.5);
          if (
            libreCasa([[tx, tz]]) &&
            libreCasa([[bx_, bz]]) &&
            lejos([tx, tz]) &&
            lejos([bx_, bz]) &&
            tapial++ % 5 !== 4
          )
            loc.push(
              bx(sx * (ACERA + 0.2), 1.0, z + 0.75, 0.18, 2.0, 1.5, 'stucco', tapial % 9 < 5 ? '#d8d2c4' : '#b9c7c0'),
              bx(sx * (ACERA + 0.2), 2.04, z + 0.75, 0.26, 0.08, 1.5, 'concrete', '#bdb8ac', { solid: false }),
              ...(fino
                ? [0.15, 0.3].map((k) =>
                    bx(sx * (ACERA + 0.2), 2.08 + k, z + 0.75, 0.015, 0.015, 1.5, 'metal', '#5d5a55', { solid: false }),
                  )
                : []),
              bx(sx * (ACERA + 0.2), 2.3, z + 0.02, 0.03, 0.6, 0.03, 'metal', '#5d5a55', { solid: false }),
              ...jardinTapial(sx, z + 0.75, si),
            );
          z += 1.5;
          continue;
        }
        const d = ok,
          o: Obra = { pcs: [], w, d, sign: { y: 0, z: 0, h: 0, bg: '' }, luz: [0, 0, 0] },
          t = r(),
          techo: Techo = grande
            ? t < 0.4
              ? 'losa'
              : t < 0.75
                ? 'lamina'
                : 'teja'
            : t < 0.5
              ? 'teja'
              : t < 0.8
                ? 'lamina'
                : 'losa',
          dos = techo === 'losa' && grande && r() < 0.35,
          com = r() < 0.3 ? COMERCIOS[nCom++ % COMERCIOS.length] : null,
          hh = dos ? 5.6 : com ? 3.4 + r() * 0.3 : 2.9 + r() * 0.5,
          casa = casaHN({
            w,
            d,
            h: hh,
            col: PASTEL[Math.floor(r() * PASTEL.length)],
            techo,
            adobe: techo === 'teja' && r() < 0.5,
            comercio: com?.[1],
            seed: nCasas * 7 + si * 131 + 3,
            fino,
          });
        pcs.push(...place(casa, hx, 0, hz, rot));
        hechas.push({ pos: [hx, 0, hz], rot, obra: o });
        if (com) {
          const [lx, lz] = rotXZ(0, d / 2 + 0.07, rot);
          rotulos.push({ pos: [hx + lx, hh - 0.36, hz + lz], rot, text: com[0], bg: com[1], fg: com[2] });
          // lámpara de brazo sobre el rótulo: de noche el bombillo brilla y deja su charco en la acera
          pcs.push(
            ...place(
              [
                bx(0, hh + 0.04, d / 2 + 0.28, 0.04, 0.04, 0.56, 'metal', '#2b2d30', { solid: false }),
                bx(0, hh - 0.02, d / 2 + 0.56, 0.34, 0.1, 0.18, 'metal', '#2b2d30', { solid: false }),
                bx(0, hh - 0.08, d / 2 + 0.56, 0.28, 0.02, 0.12, 'plastic', '#fff1cf', { solid: false, em: 2 }),
              ],
              hx,
              0,
              hz,
              rot,
            ),
          );
        }
        nCasas++;
        const hueco = r() < 0.6 ? 0 : 0.6 + r() * 1.2;
        if (hueco > 0.9) loc.push(...jardinHueco(sx, z + w + hueco / 2, hueco, si));
        z += w + hueco;
      }
    }
    for (const q of loc)
      if (q.flora && q.flora.k !== 'seto') {
        const [fx, , fz] = q.flora.p,
          sx = Math.sign(fx);
        jardines.push({ p: W(fx, fz), cam: W(fx - sx * 5.2, fz - 3.5), k: q.flora.k });
      }
    pcs.push(...place(loc, cx, 0, cz, yaw));
  });
  return { rotulos, casas: nCasas, jardines };
}

// --- jardines del barrio (solo con vegetación del paquete de arte; azar propio para no mover las casas). Coordenadas
// locales de la calle: x = de lado (sx), z = a lo largo; el frente de los lotes está en x = sx · ACERA.
const semilla = (sx: number, z: number, si: number) => rng(Math.round(z * 13.7 + sx * 7 + si * 1009) >>> 0);
/** Una planta del jardín: solo se dibuja (una pieza escondida y sin colisión la lleva hasta <Build>). */
const mata = (k: FloraKind, x: number, z: number, s: number, seed: number, rot = 0): Pc[] =>
  conFlora([bx(x, 0.3, z, 0.3, 0.6, 0.3, 'leaf', '#4a8a40', { solid: false })], {
    k,
    p: [x, 0, z],
    s,
    seed,
    r: rot,
  });
/** Detrás de un tramo de tapial: veranera que se derrama por encima de la pared o un izote que asoma. */
function jardinTapial(sx: number, z: number, si: number): Pc[] {
  if (!art.Flora) return [];
  const g = semilla(sx, z, si),
    t = g();
  if (t < 0.34)
    return mata('veranera', sx * (ACERA + 0.2), z, 0.85 + g() * 0.2, 1 + Math.floor(g() * 9), (-sx * PI) / 2);
  if (t < 0.52) return mata('izote', sx * (ACERA + 1.2), z + (g() - 0.5) * 0.6, 1.05 + g() * 0.3, Math.floor(g() * 9));
  return [];
}
/** Entre dos casas: seto podado a la orilla de la acera y detrás un izote o un tulipán en el patio. */
function jardinHueco(sx: number, z: number, ancho: number, si: number): Pc[] {
  if (!art.Flora) return [];
  const g = semilla(sx, z, si + 50),
    out = mata('seto', sx * (ACERA + 0.45), z, Math.min(1, (ancho - 0.1) / 1.2), Math.floor(g() * 9), PI / 2);
  out.push(
    ...(g() < 0.55
      ? mata('izote', sx * (ACERA + 1.7), z, 0.95 + g() * 0.3, Math.floor(g() * 9))
      : mata('tulipan', sx * (ACERA + 1.5), z, 0.8 + g() * 0.25, Math.floor(g() * 9))),
  );
  return out;
}

// ---------------------------------------------------------------------------------------------------------------

const PROPS = { Tree: P.Tree, Palm: P.Palm, Bench: P.Bench, Lamp: P.Lamp, Boat: P.Boat, Flag: P.Flag, Car: P.Car };

/** Lugares reales, pulpería y ambiente de la cabecera, alrededor de la plaza de entrada. */
export function Ciudad({ d, spec }: { d: Department; spec: ZoneSpec }) {
  const plan = useMemo(() => planCiudad(d, spec), [d, spec]);
  useEffect(() => {
    if (!plan || !(location.hash.includes('test') || location.hash.includes('fotos'))) return;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    (w.__mcTest ??= {}).ciudad = {
      dept: d.id,
      sitios: plan.sitios.map((s) => ({
        id: s.id,
        nombre: s.nombre,
        tipo: s.tipo,
        pos: s.pos,
        use: s.use,
        w: s.obra.w,
        d: s.obra.d,
        rot: s.rot,
      })),
      faltan: plan.faltan,
      postes: plan.postes,
      zapatos: plan.zapatos,
      maranas: plan.maranas,
      zapatosEn: plan.zapatosEn,
      maranasEn: plan.maranasEn,
      casas: plan.casas,
      jardines: plan.jardines,
      comercios: plan.rotulos.length,
    };
    return () => {
      if (w.__mcTest) delete w.__mcTest.ciudad;
    };
  }, [plan, d]);
  if (!plan) return null;
  const g = useGame.getState;
  // todo lo de la ciudad es fijo (las lámparas solo se prenden y se apagan): matrices congeladas
  return (
    <Quieto>
      <Build pieces={plan.pcs} />
      {plan.rotulos.map((q, i) => (
        <Plate key={`r${i}`} pos={q.pos} rot={q.rot} h={0.34} text={q.text} bg={q.bg} fg={q.fg} />
      ))}
      {plan.sitios.map((s) => {
        const o = s.obra,
          L = (lx: number, lz: number, y = 0): V3 => {
            const [rx, rz] = rotXZ(lx, lz, s.rot);
            return [s.pos[0] + rx, y, s.pos[2] + rz];
          };
        const nodes: ReactNode[] = (o.props ?? []).map((q, i) => {
          if (esArbol(q.k)) return null;
          const C = PROPS[q.k];
          return <C key={i} pos={L(q.x, q.z)} rot={s.rot + (q.rot ?? 0)} color={q.color} seed={i + 3} />;
        });
        return (
          <group key={s.id}>
            {nodes}
            <Plate
              pos={L(0, o.sign.z, o.sign.y)}
              rot={s.rot}
              h={o.sign.h}
              text={s.nombre}
              bg={o.sign.bg}
              fg={o.sign.fg}
            />
            <Interactable
              pos={s.use}
              radius={2.4}
              label={`Conocer: ${s.nombre}`}
              icon={s.tipo === 'pulperia' ? '🛒' : '🏛'}
              marker={false}
              onUse={() => g().showDialog({ title: s.nombre, text: s.nota, icon: s.tipo === 'pulperia' ? '🛒' : '🏛' })}
            />
          </group>
        );
      })}
    </Quieto>
  );
}
