// Tegucigalpa de bolsillo con detalle (paquete HD): edificios con pisos, ventanas, cornisas y tanques en el techo
// (casas.ts), aceras con bordillo y rampas, pasos de cebra, la Catedral con sus dos campanarios, la Basílica de
// Suyapa (famosos.ts), el Mercado San Isidro y el Estadio Nacional. Todo va en una sola lista de piezas para
// <Build>: lo que se ve no choca; las colisiones son EXACTAMENTE las de antes (las mismas cajas y cilindros), como
// piezas ocultas o como el cuerpo de cada edificio.
import { arco, campanario, casaHN, columna, edificioHN } from '../../../dept/casas';
import { famoso } from '../../../dept/famosos';
import { bl, bx, cy, type Pc, place, py, rng } from '../../../dept/lib';
import { art } from '../../../kit';
import { BORDE, CALLES, CUADRAS, ESPECIALES, MEDIA_CUADRA } from './calles';

export interface Edificio {
  pos: [number, number, number];
  size: [number, number, number];
  color: string;
  mat: 'stucco' | 'concrete' | 'brick' | 'glass';
}

const nf = (q: Pc): Pc => ({ ...q, solid: false });
/** colisión de antes que no se dibuja */
const choca = (q: Pc): Pc => ({ ...q, solid: true, hide: true });

function aceras(out: Pc[]) {
  const L = 2 * MEDIA_CUADRA;
  for (const cx of CUADRAS)
    for (const cz of CUADRAS) {
      const plaza = ESPECIALES.has(`${cx},${cz}`);
      out.push(
        bx(cx, 0.1, cz, L - 0.3, 0.2, L - 0.3, plaza ? 'tile' : 'concrete', plaza ? '#d9d2c2' : '#a9a59c', {
          solid: false,
        }),
      );
      // bordillo pintado (amarillo y gris en las esquinas) y la franja de juntas
      for (const [x, z, w, d] of [
        [cx, cz - L / 2 + 0.1, L, 0.2],
        [cx, cz + L / 2 - 0.1, L, 0.2],
        [cx - L / 2 + 0.1, cz, 0.2, L - 0.4],
        [cx + L / 2 - 0.1, cz, 0.2, L - 0.4],
      ])
        out.push(bx(x, 0.105, z, w, 0.21, d, 'concrete', '#c8c3b6', { solid: false }));
      for (const [sx, sz] of [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ])
        out.push(
          bx(cx + sx * (L / 2 - 0.6), 0.108, cz + sz * (L / 2 - 0.1), 1.2, 0.215, 0.21, 'plastic', '#d8b13a', {
            solid: false,
          }),
        );
    }
}
function calles(out: Pc[]) {
  // raya amarilla del centro (cortada en los cruces) y pasos de cebra en cada esquina
  const cruce = 4.5 + 0.6;
  for (const c of CALLES) {
    for (let k = 0; k < CALLES.length + 1; k++) {
      const a = k === 0 ? -BORDE : CALLES[k - 1] + cruce,
        b = k === CALLES.length ? BORDE : CALLES[k] - cruce;
      if (b - a < 0.5) continue;
      out.push(
        bx(c, 0.035, (a + b) / 2, 0.22, 0.02, b - a, 'plastic', '#f2d14b', { solid: false }),
        bx((a + b) / 2, 0.035, c, b - a, 0.02, 0.22, 'plastic', '#f2d14b', { solid: false }),
      );
    }
    for (const c2 of CALLES)
      for (const [dx, dz] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ]) {
        const x = c + dx * (cruce - 0.4),
          z = c2 + dz * (cruce - 0.4);
        for (let i = -3; i <= 3; i++)
          out.push(
            dx === 0
              ? bx(x + i * 1.1, 0.036, z, 0.55, 0.02, 1.6, 'plastic', '#ecebe4', { solid: false })
              : bx(x, 0.036, z + i * 1.1, 1.6, 0.02, 0.55, 'plastic', '#ecebe4', { solid: false }),
          );
      }
  }
}
function edificios(out: Pc[], lista: Edificio[]) {
  lista.forEach((e, i) => {
    const [x, , z] = e.pos,
      [w, h, d] = e.size;
    if (h < 6)
      out.push(...place(casaHN({ w, d, h, col: e.color, techo: 'losa', seed: i * 7 + 3, tanque: true }), x, 0, z));
    else out.push(...place(edificioHN(w, h, d, e.mat === 'brick' ? '#b5654a' : e.color, i * 5 + 1), x, 0, z));
  });
}
function catedral(out: Pc[]) {
  const W = '#f3ecdb',
    T = '#d9c9a3',
    cx = -12,
    fz = -14.2;
  out.push(
    bx(cx, 3.4, -17.3, 6.2, 6.8, 4.2, 'stucco', W, { solid: false }),
    py(cx, 6.8, -17.3, 6.6, 1.6, 4.6, 'roof', '#b5523b'),
    bx(cx, 4.2, fz - 0.3, 4.6, 8.4, 0.6, 'stucco', W, { solid: false }),
    py(cx, 8.4, fz - 0.3, 4.8, 1.4, 0.7, 'stucco', W),
    ...arco(cx, 1.5, fz, 1.6, 2.6, T, '#3b2a1e'),
    ...arco(cx, 5.6, fz, 1.0, 1.4, T),
    bx(cx, 4.0, fz + 0.05, 4.8, 0.22, 0.22, 'stucco', T, { solid: false }),
    bx(cx, 7.6, fz + 0.05, 4.8, 0.22, 0.22, 'stucco', T, { solid: false }),
    ...columna(cx - 1.6, fz + 0.1, 0.2, 3.9, 0.15, W, T),
    ...columna(cx + 1.6, fz + 0.1, 0.2, 3.9, 0.15, W, T),
    ...columna(cx - 1.2, fz + 0.1, 4.1, 7.5, 0.12, W, T),
    ...columna(cx + 1.2, fz + 0.1, 4.1, 7.5, 0.12, W, T),
    // cúpula sobre el crucero
    cy(cx, 7.6, -18, 1.5, 1.2, 'stucco', W, { n: 16, solid: false }),
  );
  out.push(
    bl(cx, 8.2, -18, 1.45, 'stucco', '#c98d3a', { s: [1, 0.85, 1], n: 16 }),
    cy(cx, 9.6, -18, 0.35, 0.6, 'stucco', W, { n: 10, solid: false }),
    bl(cx, 10, -18, 0.36, 'stucco', '#c98d3a', { s: [1, 0.8, 1], n: 10 }),
    bx(cx, 10.6, -18, 0.07, 0.7, 0.07, 'metal', '#2b2b2b', { solid: false }),
    bx(cx, 10.7, -18, 0.4, 0.07, 0.07, 'metal', '#2b2b2b', { solid: false }),
  );
  for (const x of [-15, -9]) {
    out.push(bx(x, 5, -16, 2.2, 10, 2.2, 'stucco', W, { solid: false }));
    out.push(...campanario(x, -16, 2.2, 10, W, { cap: T, cupula: '#c98d3a' }).map(nf));
  }
  // colisiones de antes: el cuerpo, las dos torres y el remate
  out.push(
    choca(bx(-12, 3, -16, 8, 6, 4, 'stucco', W)),
    choca(cy(-15, 5, -16, 1.1, 10, 'stucco', W)),
    choca(cy(-9, 5, -16, 1.1, 10, 'stucco', W)),
    choca(cy(-12, 7.2, -16, 1.6, 2.6, 'roof', W)),
  );
}
function suyapa(out: Pc[]) {
  const b = famoso('franciscomorazan', 'suyapa', 1);
  if (b) out.push(...place(b.map(nf), 36, 0.2, 35.2, 0));
  out.push(
    choca(bx(36, 4, 34, 7, 8, 7, 'stucco', '#ffffff')),
    choca(cy(33, 7, 38, 0.9, 14, 'stucco', '#ffffff')),
    choca(cy(39, 7, 38, 0.9, 14, 'stucco', '#ffffff')),
  );
}
function mercado(out: Pc[]) {
  // galera de ladrillo con arcos, rótulo pintado, techo de lámina y toldos
  const x = -36,
    z = 32,
    L = '#b5654a';
  out.push(bx(x, 2.5, z, 11, 5, 4, 'brick', L));
  for (let i = -2; i <= 2; i++) out.push(...arco(x + i * 2.1, 1.4, z + 2, 1.3, 2.2, '#e2d6bd', '#3a2c22', 0.8));
  out.push(
    bx(x, 4.2, z + 2.06, 7.5, 0.9, 0.06, 'stucco', '#f1e6c8', { solid: false }),
    bx(x, 5.25, z, 11.6, 0.18, 4.6, 'metal', '#9aa3a6', { e: [0.06, 0, 0], solid: false }),
    bx(x - 3.2, 2.9, z + 2.6, 3, 0.06, 1.2, 'cloth', '#e63946', { e: [0.3, 0, 0], solid: false }),
    bx(x + 3.2, 2.9, z + 2.6, 3, 0.06, 1.2, 'cloth', '#2a9d8f', { e: [0.3, 0, 0], solid: false }),
  );
}
function estadio(out: Pc[]) {
  // casco de concreto con contrafuertes, la visera azul, rampas de entrada y cuatro torres de luz
  const x = 36,
    z = -36,
    R = 6.6;
  out.push(cy(x, 3, z, R, 6, 'concrete', '#d4d1ca', { n: 24 }));
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    out.push(
      bx(x + Math.cos(a) * (R + 0.12), 3.1, z + Math.sin(a) * (R + 0.12), 0.45, 6.2, 0.35, 'concrete', '#bcb8ae', {
        r: -a,
        solid: false,
      }),
    );
  }
  out.push(
    cy(x, 6.2, z, 6.9, 0.5, 'plastic', '#2a6fdb', { rt: 7.4 / 6.9, n: 24, solid: false }),
    cy(x, 1.6, z, R + 0.06, 0.12, 'concrete', '#9a968c', { n: 24, solid: false }),
    bx(x, 1.6, z + R + 0.3, 2.6, 3.2, 0.6, 'concrete', '#bcb8ae', { solid: false }),
    bx(x, 1.4, z + R + 0.62, 1.8, 2.6, 0.06, 'plastic', '#2b2b2b', { solid: false }),
  );
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2,
      tx = x + Math.cos(a) * (R - 0.6),
      tz = z + Math.sin(a) * (R - 0.6);
    out.push(
      cy(tx, 8.5, tz, 0.12, 5, 'metal', '#6f767c', { n: 6, solid: false }),
      bx(tx, 11.2, tz, 1.6, 1.0, 0.18, 'metal', '#4b5156', { r: -a + Math.PI / 2, solid: false }),
      bx(tx - Math.cos(a) * 0.1, 11.2, tz - Math.sin(a) * 0.1, 1.4, 0.8, 0.06, 'plastic', '#fffbe8', {
        r: -a + Math.PI / 2,
        em: -0.5,
        solid: false,
      }),
    );
  }
}
/** árboles de acera (solo vegetación del paquete de arte: no chocan) */
function arboles(out: Pc[]) {
  if (!art.Flora) return;
  const r = rng(91);
  for (const cx of CUADRAS)
    for (const cz of CUADRAS) {
      if (ESPECIALES.has(`${cx},${cz}`)) continue;
      for (const [sx, sz] of [
        [-1, 1],
        [1, 1],
      ]) {
        if (r() < 0.45) continue;
        const x = cx + sx * (MEDIA_CUADRA - 0.55) * (0.3 + r() * 0.5),
          z = cz + sz * (MEDIA_CUADRA - 0.55);
        out.push({
          ...bx(x, 0.2, z, 0.1, 0.1, 0.1, 'wood', '#5b4632', { solid: false }),
          hide: true,
          flora: { k: 'tree', p: [x, 0.2, z], s: 0.5 + r() * 0.2, seed: Math.floor(r() * 999), r: r() * 6.28 },
        });
      }
    }
}

/** Todas las piezas de la ciudad (sin cerros, faroles ni utilería del kit, que se dibujan aparte). */
export function obrasCiudad(lista: Edificio[]): Pc[] {
  const out: Pc[] = [];
  aceras(out);
  calles(out);
  edificios(out, lista);
  catedral(out);
  suyapa(out);
  mercado(out);
  estadio(out);
  arboles(out);
  return out;
}
