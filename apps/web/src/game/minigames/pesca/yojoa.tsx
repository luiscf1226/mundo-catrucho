// Escenario del lago (Yojoa y los demás juegos de pesca en lago): un solo terreno con relieve que baja bajo el agua
// (el fondo se oscurece con la hondura y se ve por el agua transparente), playa de lodo, carrizo en la orilla, un
// muelle de tablas con su comedor de pescado frito, cayucos amarrados, monte en las lomas y las montañas de Santa
// Bárbara y del Cerro Azul Meámbar al fondo con bruma. El agua es el mismo bloque de siempre (su color y nivel no
// cambian). Decorado sin colisión: en la pesca el jugador no camina.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { casaHN } from '../../dept/casas';
import { bx, cy, type Pc, PI, place, rk, rng, ss } from '../../dept/lib';
import { art } from '../../kit';
import type { FloraItem, HillDef } from '../../kit/art/types';
import { Fundido, type Rotulo, Rotulos } from '../kit/fundido';

/** cara de arriba del agua de la pesca (el bloque de agua va en y = −0.5 con alto 0.1) */
export const NIVEL = -0.45;
const LX = 30,
  LZ = -40,
  RX = 49,
  RZ = 66,
  PW = 2.4;

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function ruido(x: number, y: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi,
    u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi),
    b = hash(xi + 1, yi),
    c = hash(xi, yi + 1),
    d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) =>
  ruido(x, y) * 0.55 + ruido(x * 2.1 + 5, y * 2.1 - 3) * 0.3 + ruido(x * 4.3, y * 4.3) * 0.15;

/** 0 en el centro del lago, 1 en la orilla, >1 en tierra */
export function radioLago(x: number, z: number) {
  const a = Math.abs((x - LX) / RX),
    b = Math.abs((z - LZ) / RZ),
    ang = Math.atan2(z - LZ, x - LX),
    n = 1 + 0.07 * Math.sin(ang * 3 + 1) + 0.045 * Math.sin(ang * 7 + 2) + 0.05 * (ruido(x * 0.06, z * 0.06) - 0.5);
  return (a ** PW + b ** PW) ** (1 / PW) / n;
}
export function alturaLago(x: number, z: number) {
  const v = radioLago(x, z);
  if (v < 1) {
    const t = 1 - v;
    return NIVEL - 0.1 - 7.5 * ss(0, 0.55, t) * (0.8 + 0.4 * ruido(x * 0.05, z * 0.05)) - 0.25 * ss(0, 0.04, t);
  }
  const e = (v - 1) * 40;
  let h = NIVEL + 0.55 * ss(0, 5, e);
  // lomas bajas en la orilla (dejan ver las montañas de atrás) y la subida a la sierra lejos
  h += ss(3, 45, e) * (0.8 + 4.5 * fbm(x * 0.018 + 4, z * 0.018 - 2)) * (z < -90 ? 1 : 0.55 + 0.45 * ss(-20, -90, z));
  h += ss(-140, -230, z) * ss(10, 60, e) * 26 * (0.5 + 0.7 * fbm(x * 0.011, z * 0.011));
  return h;
}

const _a = new THREE.Color(),
  _b = new THREE.Color();
const mezcla = (a: string, b: string, t: number) => _a.set(a).lerp(_b.set(b), Math.max(0, Math.min(1, t)));
/** malla del terreno con color y capa por vértice para el material fusionado del arte */
function terrenoGeo() {
  const F = art.fused;
  if (!F) return null;
  const x0 = -230,
    x1 = 230,
    z0 = -330,
    z1 = 40,
    cell = 2.5,
    nx = Math.round((x1 - x0) / cell) + 1,
    nz = Math.round((z1 - z0) / cell) + 1,
    pos = new Float32Array(nx * nz * 3),
    col = new Float32Array(nx * nz * 3),
    mat = new Float32Array(nx * nz * 4),
    uv = new Float32Array(nx * nz * 2),
    idx: number[] = [],
    capa = { grass: F.info('grass'), dirt: F.info('dirt'), sand: F.info('sand') };
  for (let j = 0; j < nz; j++)
    for (let i = 0; i < nx; i++) {
      const k = j * nx + i,
        x = x0 + i * cell,
        z = z0 + j * cell,
        y = alturaLago(x, z),
        n = ruido(x * 0.3, z * 0.3);
      pos.set([x, y, z], k * 3);
      uv.set([x / 6, z / 6], k * 2);
      let c: THREE.Color, l: [number, number, number];
      const sobre = y - NIVEL;
      if (sobre < 0) {
        // bajo el agua: arena clara en lo bajito, lama verde y lo hondo casi negro
        const d = -sobre;
        c = d < 0.9 ? mezcla('#b3a272', '#7a7652', (d - 0.1) / 0.8) : mezcla('#6d7350', '#1f3b3d', (d - 0.9) / 3.2);
        l = capa.sand;
      } else if (sobre < 0.42) {
        c = mezcla('#5a4936', '#7d6a4c', sobre / 0.42);
        l = capa.dirt;
      } else {
        const alto = ss(4, 30, sobre);
        c = mezcla('#5f8f45', '#3e6a36', ss(0.5, 3, sobre) * 0.8 + n * 0.25);
        c.lerp(_b.set('#5c7550'), alto * 0.6);
        l = capa.grass;
      }
      c.multiplyScalar(0.9 + n * 0.2);
      col.set([c.r, c.g, c.b], k * 3);
      mat.set([l[0], l[1], l[2], 0], k * 4);
    }
  for (let j = 0; j < nz - 1; j++)
    for (let i = 0; i < nx - 1; i++) {
      const a = j * nx + i;
      idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(mat, 4));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** punto de la orilla en el ángulo a (desde el centro del lago), un poco adentro (k < 1) o afuera (k > 1) */
function orilla(a: number, k = 1): [number, number] {
  // se busca el radio donde radioLago = k a lo largo del rayo
  let lo = 0,
    hi = 3;
  for (let i = 0; i < 22; i++) {
    const m = (lo + hi) / 2,
      x = LX + Math.cos(a) * RX * m,
      z = LZ + Math.sin(a) * RZ * m;
    if (radioLago(x, z) < k) lo = m;
    else hi = m;
  }
  return [LX + Math.cos(a) * RX * lo, LZ + Math.sin(a) * RZ * lo];
}

const MADERA = ['#7a5434', '#8a6341', '#6d4a2e', '#946c47'];
/** Muelle de tablas sobre horcones: de (x0, z) en la orilla hacia +X hasta x1; la cubierta queda en y. */
function muelle(out: Pc[], x0: number, x1: number, z: number, w: number, y: number, r: () => number) {
  for (let x = x0; x < x1; x += 0.34)
    out.push(
      bx(x + 0.15, y, z + (r() - 0.5) * 0.05, 0.28, 0.06, w + (r() - 0.5) * 0.12, 'wood', MADERA[Math.floor(r() * 4)], {
        e: [0, (r() - 0.5) * 0.03, (r() - 0.5) * 0.02],
        solid: false,
      }),
    );
  for (const s of [-1, 1])
    out.push(bx((x0 + x1) / 2, y - 0.1, z + s * (w / 2 - 0.15), x1 - x0, 0.14, 0.12, 'wood', '#5e3d22'));
  for (let x = x0 + 0.5; x < x1; x += 2.2)
    for (const s of [-1, 1]) {
      const pz = z + s * (w / 2 - 0.1),
        fondo = alturaLago(x, pz) - 0.3;
      out.push(cy(x, (y + fondo) / 2, pz, 0.11, y - fondo + 0.25, 'wood', '#4f3420', { n: 7, solid: false }));
    }
  // bitas para amarrar y una baranda a medio muelle
  out.push(cy(x1 - 0.3, y + 0.25, z - w / 2 + 0.2, 0.09, 0.5, 'wood', '#4f3420', { n: 7, solid: false }));
  out.push(cy(x1 - 0.3, y + 0.25, z + w / 2 - 0.2, 0.09, 0.5, 'wood', '#4f3420', { n: 7, solid: false }));
}
/** Cayuco tallado de un tronco, apoyado en el agua (o varado) con su canalete. */
function cayuco(out: Pc[], x: number, y: number, z: number, rot: number, largo = 4.4, c = '#7a5430') {
  const p: Pc[] = [];
  for (let i = 0; i < 7; i++) {
    const t = i / 6,
      zz = -largo / 2 + 0.25 + t * (largo - 0.5),
      a = Math.sin(PI * (0.1 + t * 0.8)),
      w = 0.95 * Math.max(0.3, a);
    p.push(
      bx(0, 0.12, zz, w, 0.32, largo / 7 + 0.05, 'wood', c, { solid: false }),
      bx(0, 0.3, zz, w * 0.82, 0.04, largo / 7 + 0.05, 'wood', '#3e2a18', { solid: false }),
    );
  }
  p.push(
    bx(0, 0.18, -largo / 2 + 0.08, 0.2, 0.26, 0.4, 'wood', c, { e: [0, PI / 4, 0], solid: false }),
    bx(0, 0.18, largo / 2 - 0.08, 0.2, 0.26, 0.4, 'wood', c, { e: [0, PI / 4, 0], solid: false }),
    bx(0, 0.3, 0.4, 0.75, 0.04, 0.22, 'wood', '#5e3d22', { solid: false }),
    bx(0.25, 0.36, -0.2, 0.06, 0.03, 1.7, 'wood', '#c9a46a', { e: [0, 0.25, 0.1], solid: false }),
  );
  out.push(...place(p, x, y, z, rot));
}
/** Lancha de fibra pintada (azul y blanco) para la orilla del lago. */
function lanchaVarada(out: Pc[], x: number, y: number, z: number, rot: number) {
  const p: Pc[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5,
      zz = -2 + t * 4,
      w = 1.6 * Math.min(1, 0.3 + t * 1.5);
    p.push(
      bx(0, 0.2, zz, w, 0.4, 0.75, 'plastic', '#f1f1ec', { solid: false }),
      bx(0, 0.05, zz, w * 0.8, 0.1, 0.75, 'plastic', '#1f6fb5', { solid: false }),
      bx(0, 0.42, zz, w + 0.04, 0.06, 0.75, 'plastic', '#1f6fb5', { solid: false }),
    );
  }
  p.push(bx(0, 0.5, 1.2, 1.2, 0.08, 0.35, 'wood', '#8a6341', { solid: false }));
  p.push(bx(0, 0.55, 2.05, 0.34, 0.5, 0.32, 'plastic', '#22262a', { solid: false }));
  out.push(...place(p, x, y, z, rot));
}

/** Escenario completo del lago. */
export function LagoYojoa() {
  const hecho = useMemo(() => {
    const r = rng(1957),
      pcs: Pc[] = [],
      flora: FloraItem[] = [],
      rot: Rotulo[] = [];
    // carrizo y juncos en todo el filo del agua, más tupido en la orilla de cerca
    for (let i = 0; i < 260; i++) {
      const a = (i / 260) * PI * 2 + r() * 0.02,
        [x, z] = orilla(a, 0.985 + r() * 0.035);
      if (z > 18) continue;
      if (Math.abs(z + 22) < 2.4 && x < -10) continue; // el muelle
      const cerca = x < 0 && z > -50;
      if (!cerca && r() < 0.45) continue;
      flora.push({
        k: r() < 0.75 ? 'reed' : 'fern',
        p: [x, NIVEL - 0.05, z],
        s: 0.55 + r() * 0.45,
        seed: Math.floor(r() * 999),
      });
    }
    // piedras en la playa de la orilla de cerca
    for (let i = 0; i < 26; i++) {
      const a = PI * (0.62 + r() * 0.55),
        [x, z] = orilla(a, 1 + r() * 0.06);
      if (z > 18) continue;
      pcs.push(rk(x, alturaLago(x, z) + 0.05, z, 0.25 + r() * 0.55, 'stone', ['#8c8478', '#77705f', '#9b9384'][i % 3]));
    }
    // monte en las lomas: árboles de hoja cerca, pinos arriba
    for (let i = 0; i < 360; i++) {
      const x = -220 + r() * 440,
        z = -320 + r() * 345,
        v = radioLago(x, z);
      if (v < 1.06) continue;
      if (z > 16 && x > -40) continue; // detrás de la cámara no se ve
      if (Math.abs(z + 22) < 9 && x > -40 && x < -14) continue; // el comedor y el muelle
      const y = alturaLago(x, z),
        alto = y - NIVEL;
      const k =
        alto > 14
          ? r() < 0.75
            ? 'pine'
            : 'tree'
          : r() < 0.15
            ? 'banana'
            : r() < 0.2
              ? 'cafe'
              : r() < 0.7
                ? 'tree'
                : 'jungle';
      flora.push({ k, p: [x, y - 0.1, z], s: 0.9 + r() * 0.8, seed: Math.floor(r() * 999) });
    }
    // el comedor de la orilla: casa con su rótulo, champa de manaca para las mesas y mesas de plástico
    const [ox, oz] = [-31, -22];
    const yc = alturaLago(ox, oz);
    pcs.push(
      ...place(
        casaHN({ w: 8, d: 6, h: 3.1, col: '#e9c39a', techo: 'lamina', comercio: '#1f6f8b', seed: 31, rejas: false }),
        ox,
        yc,
        oz,
        PI / 2,
      ),
    );
    rot.push({
      p: [ox + 3.05, yc + 3.1 - 0.36, oz],
      r: PI / 2,
      w: 7.2,
      h: 0.5,
      text: 'PESCADO FRITO · LAGO DE YOJOA',
      fg: '#fffdf4',
      bg: '#1f6f8b',
    });
    const ch = [-25, -15.5];
    const ych = alturaLago(ch[0], ch[1]);
    for (const [sx, sz] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      pcs.push(cy(ch[0] + sx * 2.2, ych + 1.2, ch[1] + sz * 2.6, 0.1, 2.4, 'wood', '#5e3d22', { n: 7, solid: false }));
    pcs.push(
      bx(ch[0], ych + 2.55, ch[1], 5.6, 0.12, 6.4, 'roof', '#b8a26a', { solid: false }),
      bx(ch[0], ych + 2.8, ch[1], 4.2, 0.4, 5.4, 'roof', '#a89060', { solid: false }),
    );
    for (const [tx, tz] of [
      [-25.9, -17],
      [-24.1, -14.2],
    ]) {
      const ty = alturaLago(tx, tz);
      pcs.push(
        cy(tx, ty + 0.72, tz, 0.5, 0.04, 'plastic', '#f2f0ea', { n: 16, solid: false }),
        cy(tx, ty + 0.36, tz, 0.05, 0.72, 'plastic', '#f2f0ea', { n: 6, solid: false }),
      );
      for (const k of [-1, 1])
        pcs.push(
          bx(tx + k * 0.75, ty + 0.22, tz, 0.42, 0.44, 0.42, 'plastic', k > 0 ? '#c0392b' : '#2e7d32', {
            solid: false,
          }),
          bx(tx + k * 0.95, ty + 0.62, tz, 0.06, 0.5, 0.42, 'plastic', k > 0 ? '#c0392b' : '#2e7d32', { solid: false }),
        );
    }
    // muelle de tablas desde la orilla hacia el lago, con un cayuco y una lancha amarrados
    muelle(pcs, -24, -11.5, -22, 2.2, 0.12, r);
    cayuco(pcs, -14.5, NIVEL - 0.08, -24.2, PI / 2 + 0.08);
    lanchaVarada(pcs, -16.5, NIVEL - 0.15, -19.6, PI / 2 - 0.1);
    // cayuco varado en la playa y otro pescador a lo lejos
    cayuco(pcs, -21.5, alturaLago(-21.5, -7) + 0.02, -7, 0.4, 4, '#6d4a2e');
    lanchaVarada(pcs, 34, NIVEL - 0.15, -50, 0.9);
    cayuco(pcs, 21, NIVEL - 0.08, -40, -0.6, 4.2, '#5e3d22');
    // jacinto de agua flotando cerca de la orilla de la izquierda
    for (let i = 0; i < 18; i++) {
      const [x, z] = orilla(PI * (0.7 + r() * 0.35), 0.9 + r() * 0.06);
      if (z > 10) continue;
      pcs.push(
        cy(x, NIVEL + 0.01, z, 0.5 + r() * 0.6, 0.04, 'leaf', r() < 0.5 ? '#4f7f3a' : '#5d8c40', {
          n: 9,
          solid: false,
        }),
      );
    }
    rot.push({
      p: [-11.9, 0.75, -22],
      r: PI / 2,
      w: 1.4,
      h: 0.4,
      text: 'SE ALQUILAN LANCHAS',
      fg: '#1d1f22',
      bg: '#f2d27a',
    });
    pcs.push(
      cy(-11.95, 0.45, -22.9, 0.05, 0.9, 'wood', '#4f3420', { n: 6, solid: false }),
      bx(-11.95, 0.75, -22, 0.04, 0.46, 1.5, 'wood', '#6d4a2e', { solid: false }),
    );
    // montañas: Santa Bárbara a la izquierda, el Meámbar a la derecha, más cerros detrás
    const cerros: HillDef[] = [];
    for (let i = 0; i < 11; i++) {
      const x = -320 + i * 64 + (r() - 0.5) * 30,
        z = -230 - r() * 90 - (Math.abs(x) > 180 ? 0 : 20),
        R = 80 + r() * 60,
        H = (i === 2 || i === 8 ? 120 : 55 + r() * 45) * (Math.abs(x) > 250 ? 0.7 : 1);
      cerros.push({ p: [x, alturaLago(x, z) - 4, z], r: R, h: H, c: i % 2 ? '#4d6e52' : '#587a5a', seed: 40 + i });
    }
    for (const s of [-1, 1])
      for (let i = 0; i < 3; i++)
        cerros.push({
          p: [s * (120 + i * 40), alturaLago(s * 120, -60 - i * 50) - 3, -60 - i * 55],
          r: 55 + i * 10,
          h: 28 + i * 12,
          c: '#5a7d56',
          seed: 70 + i + (s > 0 ? 5 : 0),
        });
    return { pcs, flora, rot, cerros, suelo: terrenoGeo() };
  }, []);
  useEffect(() => () => hecho.suelo?.dispose(), [hecho]);
  const F = art.fused;
  return (
    <>
      {hecho.suelo && F && <mesh geometry={hecho.suelo} material={F.material()} receiveShadow />}
      <Fundido pcs={hecho.pcs} />
      <Rotulos items={hecho.rot} />
      {art.Flora && <art.Flora items={hecho.flora} />}
      {art.Hills && <art.Hills hills={hecho.cerros} />}
    </>
  );
}
