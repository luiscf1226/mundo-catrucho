// Paisaje de los minijuegos (paquete HD): terreno con relieve que se asienta alrededor del llano donde se juega,
// cauce de río, cerros de fondo, vegetación del lugar y la base de la mesa de juego (tarima de tablas, bancal de
// tierra, mampostería o plancha) asentada en el suelo con borde natural. Todo es decorado: sin colisiones y sin
// mover nada de lo que se juega. Si el paquete de arte no tiene malla fusionada (Roblox), se dibuja lo de antes.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useGame } from '../../../core/store';
import type { V3 } from '../../../core/types';
import { bx, mergePieces, type Pc, rk, ss } from '../../dept/lib';
import { art } from '../../kit';
import type { FloraItem, FloraKind, HillDef, MatKind } from '../../kit/art/types';
import { calidadEfectiva } from '../../quality';
import type { Fondo } from '../corte/common';

export type Rect = [number, number, number, number];
const baja = () => calidadEfectiva(useGame.getState().profile.settings) === 'baja';

// ------------------------------------------------------------------ ruido
function hash2(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function ruido(x: number, y: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi,
    u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf),
    a = hash2(xi, yi),
    b = hash2(xi + 1, yi),
    c = hash2(xi, yi + 1),
    d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const fbm = (x: number, y: number) =>
  ruido(x, y) * 0.55 + ruido(x * 2.1 + 7, y * 2.1 - 3) * 0.3 + ruido(x * 4.3, y * 4.3) * 0.15;
function azar(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** el mismo color, un poco más claro u oscuro (variación de tablas, lajas y piedras) */
function tono(c: string, k: number) {
  const col = new THREE.Color(c);
  col.offsetHSL(0, 0, k);
  return `#${col.getHexString()}`;
}
const mezcla = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;

// ------------------------------------------------------------------ terreno
interface Suelo {
  /** cuánto sube y baja el terreno fuera del llano (m) */
  relieve: number;
  /** del agua de atrás (mar, lago o río ancho) */
  agua: boolean;
  /** color de la tierra de las orillas y bancos */
  tierra: string;
  /** cerros de fondo: color y altura relativa (0 = sin cerros) */
  cerro: string;
  alto: number;
  flora: [FloraKind, number][];
}
const SUELOS: Record<Fondo, Suelo> = {
  costa: {
    relieve: 2.5,
    agua: true,
    tierra: '#c9b07a',
    cerro: '#5f8a5a',
    alto: 0.4,
    flora: [
      ['palm', 5],
      ['bush', 3],
      ['oilpalm', 1],
      ['fern', 1],
    ],
  },
  montana: {
    relieve: 8,
    agua: false,
    tierra: '#6e5236',
    cerro: '#4f7352',
    alto: 1,
    flora: [
      ['pine', 6],
      ['fern', 2],
      ['bush', 2],
      ['tree', 1],
    ],
  },
  valle: {
    relieve: 4,
    agua: false,
    tierra: '#7d5f3c',
    cerro: '#6f8f5a',
    alto: 0.6,
    flora: [
      ['tree', 4],
      ['bush', 3],
      ['dry', 1],
      ['flowers', 1],
    ],
  },
  pueblo: { relieve: 0, agua: false, tierra: '#8a6d4c', cerro: '#6b8a63', alto: 0.6, flora: [['tree', 2]] },
  ciudad: { relieve: 0, agua: false, tierra: '#6d6458', cerro: '#7b9178', alto: 0.7, flora: [['tree', 2]] },
  lago: {
    relieve: 3,
    agua: true,
    tierra: '#8a7550',
    cerro: '#4f7a55',
    alto: 1,
    flora: [
      ['tree', 3],
      ['reed', 3],
      ['bush', 2],
      ['palm', 1],
    ],
  },
  selva: {
    relieve: 5,
    agua: false,
    tierra: '#5a4128',
    cerro: '#3f6a42',
    alto: 0.9,
    flora: [
      ['jungle', 4],
      ['giant', 1],
      ['fern', 3],
      ['banana', 2],
      ['palm', 1],
    ],
  },
  cueva: { relieve: 0, agua: false, tierra: '#4a4038', cerro: '#3a3530', alto: 0, flora: [] },
  estadio: { relieve: 1, agua: false, tierra: '#7a5f40', cerro: '#6f8f6a', alto: 0.6, flora: [['tree', 2]] },
  mar: {
    relieve: 1.5,
    agua: true,
    tierra: '#d1b98a',
    cerro: '#5f8a5a',
    alto: 0.35,
    flora: [
      ['palm', 5],
      ['bush', 2],
      ['fern', 1],
    ],
  },
  rio: {
    relieve: 4,
    agua: true,
    tierra: '#6b5236',
    cerro: '#56805a',
    alto: 0.8,
    flora: [
      ['tree', 3],
      ['jungle', 2],
      ['banana', 1],
      ['fern', 2],
      ['bush', 2],
    ],
  },
  finca: {
    relieve: 4,
    agua: false,
    tierra: '#7a5a38',
    cerro: '#628a58',
    alto: 0.7,
    flora: [
      ['tree', 3],
      ['cafe', 2],
      ['banana', 2],
      ['bush', 2],
    ],
  },
  mercado: { relieve: 0, agua: false, tierra: '#8a6d4c', cerro: '#6b8a63', alto: 0.6, flora: [['tree', 2]] },
  ruinas: {
    relieve: 5,
    agua: false,
    tierra: '#6a5034',
    cerro: '#466f48',
    alto: 0.8,
    flora: [
      ['giant', 1],
      ['jungle', 3],
      ['fern', 3],
      ['palm', 1],
      ['bush', 2],
    ],
  },
  feria: {
    relieve: 3,
    agua: false,
    tierra: '#7d5f3c',
    cerro: '#6f8f5a',
    alto: 0.6,
    flora: [
      ['tree', 4],
      ['bush', 2],
      ['flowers', 1],
    ],
  },
};
export const sueloDe = (f: Fondo) => SUELOS[f] ?? SUELOS.valle;
/** Cauce de un río que cruza el escenario a lo largo de z: centro en x y ancho del agua. */
export interface Cauce {
  x: number;
  w: number;
}
/** Llano donde se juega (y = 0) en los escenarios del kit: afuera empieza el relieve. */
const LLANO: Rect = [-26, 26, -20, 24];
/** Nivel del agua del cauce (más abajo que el llano, así se ven las orillas). */
export const NIVEL_CAUCE = -0.16;
/** Altura del terreno (visual): llano en y = 0 donde se juega; afuera, lomas; atrás, el fondo del agua o la subida. */
export function alturaTerreno(f: Fondo, x: number, z: number, cauce?: Cauce, llano: Rect = LLANO) {
  const s = sueloDe(f);
  let h = 0;
  const dx = Math.max(0, llano[0] - x, x - llano[1]),
    dz = Math.max(0, llano[2] - z, z - llano[3]),
    fuera = Math.hypot(dx, dz);
  if (s.relieve) {
    let r = ss(0, 30, fuera) * s.relieve * (fbm(x * 0.025 + 3, z * 0.025 - 5) - 0.3) * 1.6;
    // detrás del llano el terreno sube hacia los cerros (salvo donde hay agua)
    r += ss(24, 120, -z) * s.relieve * 0.9;
    if (s.agua) r *= ss(-27, -12, z);
    h += r;
  }
  // ondulación suave del llano lejos de donde se juega
  const und = llano === LLANO ? ss(14, 30, Math.hypot(x, z * 1.4)) : ss(0, 8, fuera);
  h += und * (ruido(x * 0.12, z * 0.12) - 0.5) * 0.35;
  if (s.agua) h -= ss(-25.5, -44, z) * 3.2;
  if (cauce) {
    const d = Math.abs(x - cauce.x);
    h = Math.min(
      h,
      h * ss(cauce.w * 0.5, cauce.w * 0.5 + 2, d) - 1.1 * (1 - ss(cauce.w * 0.18, cauce.w * 0.5 + 0.7, d)),
    );
  }
  return h;
}
const _c = new THREE.Color();
/** Terreno con relieve (una malla) con el material del piso del fondo; en calidad baja, rejilla más gruesa. */
export function Terreno({
  fondo,
  m,
  c,
  cauce,
  llano,
  hueco,
}: {
  fondo: Fondo;
  m: MatKind;
  c: string;
  cauce?: Cauce;
  /** llano propio (si la escena tiene su piso) */
  llano?: Rect;
  /** sin terreno aquí adentro (lo tapa el piso de la escena) */
  hueco?: Rect;
}) {
  const geo = useMemo(() => {
    const L = 320,
      cell = baja() ? 5 : 2.5,
      n = Math.round(L / cell) + 1,
      pos = new Float32Array(n * n * 3),
      idx: number[] = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i,
          x = -L / 2 + i * cell,
          z = -L / 2 + j * cell;
        pos[k * 3] = x;
        pos[k * 3 + 1] = alturaTerreno(fondo, x, z, cauce, llano);
        pos[k * 3 + 2] = z;
      }
    for (let j = 0; j < n - 1; j++)
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i;
        if (hueco) {
          const x = -L / 2 + i * cell,
            z = -L / 2 + j * cell;
          if (x >= hueco[0] && x + cell <= hueco[1] && z >= hueco[2] && z + cell <= hueco[3]) continue;
        }
        idx.push(a, a + n, a + 1, a + 1, a + n, a + n + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [fondo, cauce?.x, cauce?.w, `${llano}|${hueco}`]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={art.material(m, c)} receiveShadow />;
}

/** Cerros con relieve detrás del escenario (y a los lados si hay mar). */
export function cerrosDe(f: Fondo, seed = 7, llano?: Rect): HillDef[] {
  const s = sueloDe(f);
  if (!s.alto) return [];
  const r = azar(seed * 97 + f.length),
    out: HillDef[] = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const x = -170 + (340 * (i + 0.2 + r() * 0.6)) / n,
      lejos = s.agua && f !== 'rio' ? 210 : 115,
      z = -lejos - r() * 60 - (Math.abs(x) < 60 ? 0 : 15),
      R = 38 + r() * 34,
      H = R * (0.32 + r() * 0.4) * s.alto;
    _c.set(s.cerro).offsetHSL((r() - 0.5) * 0.03, 0, (r() - 0.5) * 0.08);
    out.push({
      p: [x, alturaTerreno(f, x, z, undefined, llano) - 1.5, z],
      r: R,
      h: H,
      c: `#${_c.getHexString()}`,
      seed: seed * 13 + i,
    });
  }
  return out;
}

/** ¿(x, z) dentro del rectángulo agrandado `m`? */
const dentro = (x: number, z: number, [x0, x1, z0, z1]: Rect, m = 0) =>
  x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;
const BAJITAS = new Set<FloraKind>(['fern', 'flowers', 'reed', 'bush', 'dry']);
/** Plantas alrededor del claro donde se juega: bajitas cerca de los lados, árboles atrás y a lo lejos. */
export function floraDe(f: Fondo, claro: Rect, cauce?: Cauce, seed = 3, llano?: Rect): FloraItem[] {
  const s = sueloDe(f);
  if (!s.flora.length) return [];
  const r = azar(seed * 131 + f.length * 7),
    total = s.flora.reduce((a, [, w]) => a + w, 0),
    especie = (bajita: boolean): FloraKind => {
      const lista = bajita ? s.flora.filter(([k]) => BAJITAS.has(k)) : s.flora;
      const opciones: [FloraKind, number][] = lista.length ? lista : [['bush', 1]];
      let t = r() * (bajita ? opciones.reduce((a, [, w]) => a + w, 0) : total);
      for (const [k, w] of opciones) if ((t -= w) <= 0) return k;
      return opciones[0][0];
    },
    out: FloraItem[] = [],
    poner = (k: FloraKind, x: number, z: number, sc: number) => {
      if (cauce && Math.abs(x - cauce.x) < cauce.w * 0.5 + (k === 'reed' ? 0.2 : 1.2)) return;
      out.push({
        k,
        p: [x, alturaTerreno(f, x, z, cauce) - 0.05, z],
        s: sc,
        seed: Math.floor(r() * 999),
        r: r() * 6.28,
      });
    };
  const urbano = f === 'pueblo' || f === 'ciudad' || f === 'mercado' || f === 'estadio';
  // cerca: un borde de matas y helechos (no tapa nada) y árboles detrás del claro
  if (!urbano && !llano) {
    for (let i = 0; i < 70; i++) {
      const x = (r() - 0.5) * 46,
        z = -20 + r() * 30;
      if (dentro(x, z, claro, 1.2)) continue;
      const atras = z < claro[2] - 3,
        lado = Math.abs(x) > Math.max(-claro[0], claro[1]) + 3;
      const alto = atras || (lado && z < claro[2] + 2 && r() < 0.5);
      const k = especie(!alto);
      poner(k, x, z, alto ? 0.75 + r() * 0.5 : 0.45 + r() * 0.4);
    }
    // orillas del cauce: carrizo y helechos
    if (cauce)
      for (let i = 0; i < 26; i++) {
        const lado = i % 2 ? 1 : -1,
          z = -18 + r() * 30,
          x = cauce.x + lado * (cauce.w * 0.5 + 0.3 + r() * 1.4);
        if (dentro(x, z, claro, 0.6)) continue;
        out.push({
          k: r() < 0.6 ? 'reed' : 'fern',
          p: [x, alturaTerreno(f, x, z, cauce) - 0.05, z],
          s: 0.5 + r() * 0.4,
          seed: Math.floor(r() * 999),
          r: r() * 6.28,
        });
      }
  }
  // lejos: monte en las lomas, a la vista de las cámaras bajas
  for (let i = 0; i < (urbano ? 14 : 60); i++) {
    const a = r() * Math.PI * 2,
      d = (llano ? Math.max(-llano[0], llano[1], -llano[2]) + 4 : 30) + r() * 60,
      x = Math.cos(a) * d * 1.3,
      z = -Math.abs(Math.sin(a)) * d - 4;
    if (llano && dentro(x, z, llano, 2)) continue;
    if (s.agua && alturaTerreno(f, x, z, undefined, llano) < 0.1) continue;
    poner(especie(false), x, z, 0.9 + r() * 0.7);
  }
  return out;
}

// ------------------------------------------------------------------ banco de tierra (borde de la mesa)
/** Banco de tierra alrededor de un rectángulo: baja desde el canto de arriba hasta el piso, con ruido y color que
 *  pasa de `arriba` a `pie`. Geometría con color y material por vértice para el material fusionado del arte. */
function bancoGeo(
  cx: number,
  cz: number,
  w: number,
  d: number,
  top: number,
  run: number,
  m: MatKind,
  arriba: string,
  medio: string,
  pie: string,
  seed: number,
) {
  const F = art.fused;
  if (!F) return null;
  const [l, ro, me] = F.info(m),
    a = w / 2,
    b = d / 2,
    lados = [
      // [x0, z0, x1, z1, nx, nz]
      [-a, b, a, b, 0, 1],
      [a, b, a, -b, 1, 0],
      [a, -b, -a, -b, 0, -1],
      [-a, -b, -a, b, -1, 0],
    ],
    ring: [number, number, number, number][] = [];
  // borde: a lo largo de cada lado y un abanico en cada esquina
  for (let si = 0; si < 4; si++) {
    const [x0, z0, x1, z1, nx, nz] = lados[si],
      len = Math.hypot(x1 - x0, z1 - z0),
      seg = Math.max(2, Math.round(len / 0.45));
    for (let k = 0; k < seg; k++) {
      const t = k / seg;
      ring.push([x0 + (x1 - x0) * t, z0 + (z1 - z0) * t, nx, nz]);
    }
    const [mx, mz] = [lados[(si + 1) % 4][4], lados[(si + 1) % 4][5]];
    for (let k = 0; k < 4; k++) {
      const t = (k / 4) * (Math.PI / 2),
        dx = nx * Math.cos(t) + mx * Math.sin(t),
        dz = nz * Math.cos(t) + mz * Math.sin(t);
      ring.push([x1, z1, dx, dz]);
    }
  }
  const R = 7,
    M = ring.length,
    pos = new Float32Array(M * (R + 1) * 3),
    col = new Float32Array(M * (R + 1) * 3),
    mat = new Float32Array(M * (R + 1) * 4),
    idx: number[] = [],
    ca = new THREE.Color(arriba),
    cm = new THREE.Color(medio),
    cp = new THREE.Color(pie),
    cc = new THREE.Color();
  for (let i = 0; i < M; i++) {
    const [px, pz, nx, nz] = ring[i],
      wx = cx + px,
      wz = cz + pz;
    for (let k = 0; k <= R; k++) {
      const t = k / R,
        q = i * (R + 1) + k,
        n1 = ruido(wx * 1.3 + seed, wz * 1.3) - 0.5,
        n2 = ruido(wx * 3.1, wz * 3.1 + seed) - 0.5,
        bulto = Math.sin(Math.PI * t),
        off = (k === 0 ? 0.015 : 0.04 + run * t) + n1 * 0.45 * run * bulto,
        y = k === R ? -0.06 : top * (1 - t) ** 2 - (k === 0 ? 0.01 : 0) + n2 * 0.1 * top * bulto;
      pos[q * 3] = wx + nx * off;
      pos[q * 3 + 1] = Math.max(-0.06, y);
      pos[q * 3 + 2] = wz + nz * off;
      if (t < 0.3) cc.copy(ca).lerp(cm, ss(0.05, 0.3, t));
      else cc.copy(cm).lerp(cp, ss(0.45, 0.95, t));
      cc.multiplyScalar(0.86 + (n1 + 0.5) * 0.28);
      col[q * 3] = cc.r;
      col[q * 3 + 1] = cc.g;
      col[q * 3 + 2] = cc.b;
      mat[q * 4] = l;
      mat[q * 4 + 1] = ro;
      mat[q * 4 + 2] = me;
    }
  }
  for (let i = 0; i < M; i++) {
    const j = (i + 1) % M;
    for (let k = 0; k < R; k++) {
      const p = i * (R + 1) + k,
        q = j * (R + 1) + k;
      idx.push(p, p + 1, q, q, p + 1, q + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(mat, 4));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(M * (R + 1) * 2), 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ------------------------------------------------------------------ mesa de juego
type Estilo = 'tablas' | 'bancal' | 'laja' | 'sillar' | 'plancha' | 'piso';
const estiloDe = (m: MatKind, f: Fondo): Estilo =>
  m === 'wood'
    ? 'tablas'
    : m === 'grass'
      ? 'bancal'
      : m === 'stone'
        ? f === 'ruinas'
          ? 'sillar'
          : 'laja'
        : m === 'concrete'
          ? 'plancha'
          : m === 'tile'
            ? 'piso'
            : 'tablas';

/** Piezas de la mesa (`top` es la cara de arriba, plana, a la altura de siempre) y su borde. */
function piezasMesa(
  estilo: Estilo,
  f: Fondo,
  cx: number,
  cz: number,
  w: number,
  d: number,
  top: number,
  color: string,
) {
  const r = azar(Math.round(cx * 31 + cz * 17 + w * 7 + d * 3) + estilo.length),
    pcs: Pc[] = [],
    s = sueloDe(f),
    off = { solid: false };
  const piedras = (n: number, sep: number, rMin: number, rMax: number, c: string, enBanco = 0) => {
    const per = 2 * (w + d);
    for (let i = 0; i < n; i++) {
      let t = r() * per,
        x: number,
        z: number,
        nx = 0,
        nz = 0;
      if (t < w) [x, z, nz] = [cx - w / 2 + t, cz + d / 2, 1];
      else if ((t -= w) < d) [x, z, nx] = [cx + w / 2, cz + d / 2 - t, 1];
      else if ((t -= d) < w) [x, z, nz] = [cx + w / 2 - t, cz - d / 2, -1];
      else [x, z, nx] = [cx - w / 2, cz - d / 2 + (t - w), -1];
      const o = sep * (0.6 + r() * 0.8),
        rr = rMin + r() * (rMax - rMin);
      pcs.push(
        rk(
          x + nx * o,
          enBanco ? enBanco * (1 - o / (sep * 1.4)) : rr * 0.25,
          z + nz * o,
          rr,
          'stone',
          tono(c, (r() - 0.5) * 0.12),
          {
            s: [1, 0.55 + r() * 0.3, 0.8 + r() * 0.4],
            r: r() * 6.28,
          },
        ),
      );
    }
  };
  let banco: Parameters<typeof bancoGeo> | null = null;
  if (estilo === 'tablas') {
    // tarima: tablas con juntas, viga de canto, horcones sobre piedras y la sombra de abajo
    const n = Math.max(4, Math.round(d / 0.46)),
      ancho = d / n;
    for (let i = 0; i < n; i++) {
      const z = cz - d / 2 + ancho * (i + 0.5);
      let x = cx - w / 2;
      while (x < cx + w / 2 - 0.05) {
        const largo = Math.min(cx + w / 2 - x, 2.4 + r() * 2.4);
        pcs.push(
          bx(
            x + largo / 2,
            top - 0.045,
            z,
            largo - 0.025,
            0.09,
            ancho - 0.03,
            'wood',
            tono(color, (r() - 0.5) * 0.1),
            off,
          ),
        );
        x += largo;
      }
    }
    const viga = tono(color, -0.2),
      oscuro = tono(color, -0.42);
    pcs.push(bx(cx, (top - 0.09) / 2, cz, w - 0.5, top - 0.09, d - 0.5, 'wood', oscuro, off));
    for (const [sx, sz] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const largo = sz ? w : d;
      pcs.push(
        bx(
          cx + (sx * (w - 0.1)) / 2,
          top - 0.2,
          cz + (sz * (d - 0.1)) / 2,
          sz ? largo : 0.1,
          0.22,
          sz ? 0.1 : largo,
          'wood',
          viga,
          off,
        ),
      );
    }
    const nx = Math.max(2, Math.round(w / 2.6)),
      nz = Math.max(2, Math.round(d / 2.6));
    for (let i = 0; i <= nx; i++)
      for (let j = 0; j <= nz; j++) {
        if (i > 0 && i < nx && j > 0 && j < nz) continue;
        const x = cx - w / 2 + 0.16 + ((w - 0.32) * i) / nx,
          z = cz - d / 2 + 0.16 + ((d - 0.32) * j) / nz;
        pcs.push(bx(x, (top - 0.3) / 2 + 0.06, z, 0.17, top - 0.3, 0.17, 'wood', viga, off));
        pcs.push(rk(x, 0.03, z, 0.24, 'stone', tono('#8d8578', (r() - 0.5) * 0.1), { s: [1, 0.35, 1], r: r() * 6 }));
      }
    banco = !s.relieve
      ? null
      : [cx, cz, w + 0.1, d + 0.1, 0.06, 0.55, 'dirt', s.tierra, s.tierra, mezcla(s.tierra, '#6a8a45', 0.45), 3];
    if (s.relieve) piedras(10, 0.5, 0.1, 0.22, '#8d8578');
  } else if (estilo === 'bancal') {
    // bancal: zacate arriba, tierra con piedras en el talud y matas al pie
    pcs.push(bx(cx, top - 0.14, cz, w, 0.28, d, 'grass', color, off));
    pcs.push(bx(cx, (top - 0.2) / 2, cz, w - 0.3, top - 0.2, d - 0.3, 'dirt', s.tierra, off));
    banco = [
      cx,
      cz,
      w,
      d,
      top - 0.005,
      0.85,
      'dirt',
      tono(color, -0.04),
      mezcla(s.tierra, '#b39370', 0.4),
      mezcla(s.tierra, '#6a8a45', 0.5),
      5,
    ];
    piedras(24, 0.4, 0.12, 0.28, '#8a8174', top * 0.5);
  } else if (estilo === 'laja') {
    // laja de río: una piedra lisa al centro y un brocal de lajas de tamaños distintos alrededor
    const br = 0.5;
    pcs.push(bx(cx, top - 0.07, cz, w - br * 2, 0.14, d - br * 2, 'stone', color, off));
    for (const [sx, sz] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ]) {
      const largo = sz ? w : d - br * 2;
      let u = -largo / 2;
      while (u < largo / 2 - 0.05) {
        const l = Math.min(largo / 2 - u, 0.6 + r() * 0.8),
          m = u + l / 2;
        pcs.push(
          bx(
            sz ? cx + m : cx + (sx * (w - br)) / 2,
            top - 0.07,
            sz ? cz + (sz * (d - br)) / 2 : cz + m,
            sz ? l - 0.05 : br - 0.05,
            0.14,
            sz ? br - 0.05 : l - 0.05,
            'stone',
            tono(color, (r() - 0.5) * 0.14 - 0.04),
            off,
          ),
        );
        u += l;
      }
    }
    pcs.push(bx(cx, (top - 0.1) / 2, cz, w - 0.08, top - 0.1, d - 0.08, 'stone', tono(color, -0.35), off));
    banco = [
      cx,
      cz,
      w,
      d,
      top - 0.12,
      1.1,
      'dirt',
      tono(s.tierra, -0.05),
      s.tierra,
      mezcla(s.tierra, '#5c7a3e', 0.4),
      7,
    ];
    piedras(46, 0.45, 0.14, 0.36, '#8f8a80', top * 0.5);
  } else if (estilo === 'sillar') {
    // plataforma maya: lajas cortadas arriba, hiladas de sillares a los lados y un escalón al pie
    const filas = Math.max(3, Math.round(d / 1.15));
    for (let i = 0; i < filas; i++) {
      const fz = d / filas,
        z = cz - d / 2 + fz * (i + 0.5);
      let x = cx - w / 2 + (i % 2 ? 0.6 : 0);
      if (i % 2)
        pcs.push(
          bx(cx - w / 2 + 0.3, top - 0.06, z, 0.56, 0.12, fz - 0.05, 'stone', tono(color, (r() - 0.5) * 0.1), off),
        );
      while (x < cx + w / 2 - 0.05) {
        const largo = Math.min(cx + w / 2 - x, 1.2);
        pcs.push(
          bx(x + largo / 2, top - 0.06, z, largo - 0.05, 0.12, fz - 0.05, 'stone', tono(color, (r() - 0.5) * 0.1), off),
        );
        x += largo;
      }
    }
    const junta = tono(color, -0.3),
      hil = Math.max(1, Math.round((top - 0.12) / 0.3)),
      hh = (top - 0.12) / hil;
    pcs.push(bx(cx, (top - 0.12) / 2, cz, w - 0.1, top - 0.12, d - 0.1, 'stone', junta, off));
    for (let k = 0; k < hil; k++) {
      const y = hh * (k + 0.5);
      for (const [sx, sz] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const largo = sz ? w : d;
        let u = -largo / 2 + (k % 2 ? 0.45 : 0);
        if (k % 2) {
          const x = sz ? cx - largo / 2 + 0.22 : cx + (sx * w) / 2,
            z = sz ? cz + (sz * d) / 2 : cz - largo / 2 + 0.22;
          pcs.push(
            bx(x, y, z, sz ? 0.42 : 0.12, hh - 0.04, sz ? 0.12 : 0.42, 'stone', tono(color, (r() - 0.5) * 0.12), off),
          );
        }
        while (u < largo / 2 - 0.05) {
          const l = Math.min(largo / 2 - u, 0.7 + r() * 0.5),
            m = u + l / 2,
            sale = 0.01 + r() * 0.03;
          pcs.push(
            bx(
              sz ? cx + m : cx + sx * (w / 2 + sale),
              y,
              sz ? cz + sz * (d / 2 + sale) : cz + m,
              sz ? l - 0.04 : 0.12,
              hh - 0.04,
              sz ? 0.12 : l - 0.04,
              'stone',
              tono(color, (r() - 0.5) * 0.14 - 0.03),
              off,
            ),
          );
          u += l;
        }
      }
    }
    pcs.push(bx(cx, 0.07, cz, w + 0.6, 0.14, d + 0.6, 'stone', tono(color, -0.12), off));
    banco = [cx, cz, w + 0.6, d + 0.6, 0.1, 0.8, 'dirt', s.tierra, s.tierra, mezcla(s.tierra, '#5c7a3e', 0.45), 9];
    piedras(14, 0.7, 0.12, 0.3, color);
  } else if (estilo === 'piso') {
    // piso de ladrillo o baldosa con su bordillo de cemento, asentado en la arena o la tierra
    pcs.push(bx(cx, top / 2, cz, w - 0.5, top, d - 0.5, 'tile', color, off));
    const cem = '#b9b2a4';
    for (const [sx, sz] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0],
    ])
      pcs.push(
        bx(
          cx + (sx * (w - 0.25)) / 2,
          (top + 0.03) / 2,
          cz + (sz * (d - 0.25)) / 2,
          sz ? w : 0.25,
          top + 0.03,
          sz ? 0.25 : d - 0.5,
          'concrete',
          tono(cem, (r() - 0.5) * 0.05),
          off,
        ),
      );
    const arena = f === 'costa' || f === 'mar' || f === 'lago';
    banco = [
      cx,
      cz,
      w,
      d,
      top + 0.02,
      0.7,
      arena ? 'sand' : 'dirt',
      arena ? '#d8c494' : s.tierra,
      arena ? '#d8c494' : s.tierra,
      arena ? '#e2cf9a' : mezcla(s.tierra, '#6a8a45', 0.4),
      13,
    ];
  } else {
    // plancha de concreto con juntas, bordillo y (en la costa) arena arrimada al pie
    const nx = Math.max(2, Math.round(w / 2)),
      nz = Math.max(2, Math.round(d / 2));
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++)
        pcs.push(
          bx(
            cx - w / 2 + (w / nx) * (i + 0.5),
            top - 0.06,
            cz - d / 2 + (d / nz) * (j + 0.5),
            w / nx - 0.03,
            0.12,
            d / nz - 0.03,
            'concrete',
            tono(color, (r() - 0.5) * 0.06),
            off,
          ),
        );
    pcs.push(bx(cx, (top - 0.1) / 2, cz, w + 0.08, top - 0.1, d + 0.08, 'concrete', tono(color, -0.12), off));
    const costa = f === 'costa' || f === 'mar' || f === 'lago';
    banco = costa
      ? [cx, cz, w + 0.08, d + 0.08, top * 0.55, 1.4, 'sand', '#d9c79a', '#d6c08c', '#cdb684', 11]
      : [cx, cz, w + 0.08, d + 0.08, 0.05, 0.5, 'concrete', '#8a8f93', '#7d8286', '#6a6e72', 11];
    if (costa) piedras(8, 0.9, 0.12, 0.26, '#9a9184');
  }
  return { pcs, banco };
}

/** Plantas al pie de la mesa: matas y helechos bajitos que no tapan lo que se juega ni el título. */
function floraMesa(f: Fondo, cx: number, cz: number, w: number, d: number, seed: number): FloraItem[] {
  const s = sueloDe(f);
  if (!s.flora.length || f === 'ciudad' || f === 'cueva' || f === 'pueblo' || f === 'mercado') return [];
  const r = azar(seed),
    kinds: FloraKind[] = f === 'costa' || f === 'mar' ? ['bush', 'fern'] : ['fern', 'bush', 'fern', 'flowers'],
    out: FloraItem[] = [],
    per = 2 * (w + d);
  for (let i = 0; i < 16; i++) {
    let t = r() * per,
      x: number,
      z: number;
    if (t < w) [x, z] = [cx - w / 2 + t, cz + d / 2 + 1.3 + r() * 0.8];
    else if ((t -= w) < d) [x, z] = [cx + w / 2 + 1.3 + r() * 0.9, cz + d / 2 - t];
    else if ((t -= d) < w) [x, z] = [cx + w / 2 - t, cz - d / 2 - 1.3 - r() * 0.9];
    else [x, z] = [cx - w / 2 - 1.3 - r() * 0.9, cz - d / 2 + (t - w)];
    // ni sobre el título (al frente, al centro) ni donde se paran los bots (a la derecha)
    if (z > cz + d / 2 && Math.abs(x - cx) < 4.5) continue;
    if (x > 3.6 && x < 10.4 && z > -2.6 && z < 0.8) continue;
    out.push({
      k: kinds[i % kinds.length],
      p: [x, 0, z],
      s: 0.38 + r() * 0.3,
      seed: Math.floor(r() * 999),
      r: r() * 6.28,
    });
  }
  return out;
}

/** Base de la mesa de juego asentada en el terreno. `pos` y `size` como en <Block>: la cara de arriba queda donde
 *  siempre (y = pos.y + size.y / 2). El estilo sale del material de siempre: madera = tarima de tablas, zacate =
 *  bancal de tierra, piedra = lajas (o sillares en las ruinas), concreto = plancha. */
export function MesaBase({
  pos,
  size,
  mat,
  color,
  fondo,
  matas = true,
}: {
  pos: V3;
  size: V3;
  mat: MatKind;
  color: string;
  fondo: Fondo;
  /** matas al pie (no donde la gente camina alrededor) */
  matas?: boolean;
}) {
  const top = pos[1] + size[1] / 2,
    hecho = useMemo(() => {
      const est = estiloDe(mat, fondo),
        { pcs, banco } = piezasMesa(est, fondo, pos[0], pos[2], size[0], size[2], top, color);
      return {
        grupos: mergePieces(pcs, true),
        banco: banco ? bancoGeo(...banco) : null,
        flora: matas ? floraMesa(fondo, pos[0], pos[2], size[0], size[2], Math.round(pos[0] * 7 + size[0] * 13)) : [],
      };
    }, [`${pos}|${size}|${mat}|${color}|${fondo}|${matas}`]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      for (const g of hecho.grupos) g.geo.dispose();
      hecho.banco?.dispose();
    },
    [hecho],
  );
  const F = art.fused;
  return (
    <>
      {hecho.grupos.map((g) => (
        <mesh key={g.key} geometry={g.geo} material={g.mat ?? art.material(g.m, g.c)} castShadow receiveShadow />
      ))}
      {hecho.banco && F && <mesh geometry={hecho.banco} material={F.material()} receiveShadow />}
      {art.Flora && hecho.flora.length > 0 && <art.Flora items={hecho.flora} />}
    </>
  );
}
/** ¿Hay paisaje HD? (sin malla fusionada, las escenas dibujan lo de siempre) */
export const hayPaisaje = () => !!art.fused;

/** Alrededores para una escena que ya tiene su propio piso (`llano`): terreno con relieve afuera (con hueco donde
 *  está el piso), monte y cerros del lugar. En Roblox no dibuja nada. */
export function Alrededores({
  fondo,
  llano,
  m,
  c,
  marDesde,
}: {
  fondo: Fondo;
  llano: Rect;
  m?: MatKind;
  c?: string;
  /** si el fondo es de agua, el mar empieza en esta z (por defecto, donde acaba el llano) */
  marDesde?: number;
}) {
  const hecho = useMemo(
    () => ({
      flora: art.Flora ? floraDe(fondo, llano, undefined, 5, llano) : [],
      cerros: art.Hills ? cerrosDe(fondo, 9, llano) : [],
    }),
    [fondo, `${llano}`], // eslint-disable-line react-hooks/exhaustive-deps
  );
  if (!hayPaisaje()) return null;
  const hueco: Rect = [llano[0] + 1, llano[1] - 1, llano[2] + 1, llano[3] - 1];
  return (
    <>
      <Terreno fondo={fondo} m={m ?? 'grass'} c={c ?? '#6a9f48'} llano={llano} hueco={hueco} />
      {sueloDe(fondo).agua && (
        <mesh
          position={[0, 0.03, (marDesde ?? llano[2]) - 120]}
          rotation-x={-Math.PI / 2}
          receiveShadow
          material={art.material('water', '#2f8fb0')}
        >
          <planeGeometry args={[420, 240]} />
        </mesh>
      )}
      {art.Flora && hecho.flora.length > 0 && <art.Flora items={hecho.flora} />}
      {art.Hills && hecho.cerros.length > 0 && <art.Hills hills={hecho.cerros} />}
    </>
  );
}
