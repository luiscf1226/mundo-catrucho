// Objetos de juego con forma y material creíbles: olla de barro, comal, fogón, canasta tejida, balde, sombrero de
// paja, saco de yute, caja de madera, pana, plato y taza de peltre, mesa de tablas, pelota con gajos y cayuco.
// Cada objeto es UNA malla fusionada (una llamada de dibujo) con el material compartido del paquete de arte; la
// geometría se arma una sola vez por (tipo, color) y la comparten todas las copias. Con `uv` la textura viaja con el
// objeto (canastas que caen, el balde en la cabeza). Sin malla fusionada (Roblox) se dibuja una pieza sencilla.
// Todo es decorado: sin colisión. `pos` es el punto de apoyo (la base del objeto en y = 0 de su espacio).
import type { ReactNode } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../core/types';
import { art, Ball, Block, Cyl } from '../../kit';
import type { Molde, Pintura } from '../../kit/art/types';

export type ObjetoKind =
  | 'olla'
  | 'comal'
  | 'fogon'
  | 'canasta'
  | 'cesta'
  | 'balde'
  | 'sombrero'
  | 'saco'
  | 'caja'
  | 'pana'
  | 'plato'
  | 'taza'
  | 'mesa'
  | 'pelota'
  | 'cayuco'
  | 'pez';

/** Medidas de cada objeto a escala 1 (ancho, alto, fondo), para quien necesite encajarlo en un hueco. */
export const MEDIDA: Record<ObjetoKind, V3> = {
  olla: [0.5, 0.43, 0.5],
  comal: [0.67, 0.04, 0.67],
  fogon: [1.8, 0.98, 1.4],
  canasta: [0.62, 0.5, 0.62],
  cesta: [0.62, 0.3, 0.62],
  balde: [0.45, 0.35, 0.45],
  sombrero: [0.81, 0.17, 0.81],
  saco: [0.54, 0.64, 0.54],
  caja: [0.6, 0.36, 0.4],
  pana: [0.9, 0.2, 0.9],
  plato: [0.34, 0.036, 0.34],
  taza: [0.12, 0.1, 0.12],
  mesa: [1.2, 0.75, 0.7],
  pelota: [0.44, 0.44, 0.44],
  cayuco: [0.7, 0.32, 3],
  /** el pez va centrado en el origen, de largo en X (la cabeza hacia +X) */
  pez: [0.7, 0.3, 0.16],
};
/** Color principal de cada objeto (`c` lo cambia). */
const COLOR: Record<ObjetoKind, string> = {
  olla: '#a4552f',
  comal: '#6e4a33',
  fogon: '#a27552',
  canasta: '#c9a15a',
  cesta: '#c9a15a',
  balde: '#a7b1b7',
  sombrero: '#dcc185',
  saco: '#b59b6b',
  caja: '#b98a55',
  pana: '#a85a32',
  plato: '#f2f0ea',
  taza: '#f2f0ea',
  mesa: '#a8794c',
  pelota: '#f4f4f2',
  cayuco: '#7a5a38',
  pez: '#b9c6cf',
};

// ------------------------------------------------------------------ geometría
const PI = Math.PI;
/** sólido de revolución desde un perfil [radio, altura]; `su`/`sv` = repeticiones de la textura alrededor y a lo alto */
function torno(pts: [number, number][], seg = 20, su = 1, sv = 1): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(
    pts.map(([r, y]) => new THREE.Vector2(Math.max(0.0005, r), y)),
    seg,
  );
  escalaUv(g, su, sv);
  return g;
}
function escalaUv(g: THREE.BufferGeometry, su: number, sv: number) {
  const uv = g.attributes.uv;
  if (!uv) return g;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}
/** aro acostado (en el plano XZ) de radio R y grosor r; `arc` < 2π deja un asa */
const aro = (R: number, r: number, arc = PI * 2, rs = 6, ts = 24) => {
  const g = new THREE.TorusGeometry(R, r, rs, ts, arc);
  g.rotateX(PI / 2);
  return g;
};
/** tubo por una curva suave de puntos */
const tubo = (pts: V3[], r: number, seg = 16, rs = 6) =>
  new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, rs, false);
/** la misma superficie vista desde adentro (caras y normales al revés) */
function adentro(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const o = g.index ? g.toNonIndexed() : g.clone(),
    p = o.attributes.position,
    n = o.attributes.normal,
    u = o.attributes.uv;
  for (let i = 0; i < p.count; i += 3) {
    for (const a of [p, n, u]) {
      if (!a) continue;
      for (let k = 0; k < a.itemSize; k++) {
        const t = a.getComponent(i + 1, k);
        a.setComponent(i + 1, k, a.getComponent(i + 2, k));
        a.setComponent(i + 2, k, t);
      }
    }
  }
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return o;
}
/** abolla un sólido de revolución (sacos, bultos): el radio cambia con el ángulo y la altura */
function abollar(g: THREE.BufferGeometry, k: number, seed: number) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      a = Math.atan2(z, x),
      f = 1 + k * (Math.sin(a * 3 + seed + y * 9) * 0.6 + Math.sin(a * 5 - seed * 2 + y * 15) * 0.4);
    p.setXYZ(i, x * f, y, z * f);
  }
  g.computeVertexNormals();
  return g;
}
const tono = (c: string, k: number) => `#${new THREE.Color(c).offsetHSL(0, 0, k).getHexString()}`;

type Arma = (b: Molde, c: string, c2?: string) => void;
const ARMA: Record<ObjetoKind, Arma> = {
  pez: (b, c) => armarPez(b, c),
  olla(b, c) {
    const barro: Pintura = { k: 'stucco', c, uv: true, g: [0.02, 0.22, 0.38], r: 0.9 };
    b.add(
      torno(
        [
          [0, 0],
          [0.1, 0.004],
          [0.17, 0.03],
          [0.225, 0.09],
          [0.25, 0.17],
          [0.245, 0.24],
          [0.22, 0.3],
          [0.18, 0.345],
          [0.155, 0.37],
          [0.158, 0.395],
          [0.18, 0.415],
          [0.19, 0.426],
          [0.176, 0.432],
          [0.152, 0.414],
          [0.14, 0.38],
          [0.13, 0.35],
          [0, 0.33],
        ],
        24,
        4,
        1,
      ),
      barro,
    );
    // franja de engobe (más clara) y las dos asas
    b.add(
      torno(
        [
          [0.2195, 0.3],
          [0.2465, 0.235],
          [0.2505, 0.2],
        ],
        24,
        4,
        0.3,
      ),
      { k: 'stucco', c: tono(c, 0.12), uv: true },
    );
    for (const s of [-1, 1])
      b.add(
        new THREE.TorusGeometry(0.045, 0.014, 6, 10, PI),
        { k: 'stucco', c, uv: true },
        {
          p: [s * 0.205, 0.3, 0],
          r: [0, 0, s > 0 ? -PI / 2 : PI / 2],
        },
      );
  },
  comal(b, c) {
    b.add(
      torno(
        [
          [0, 0],
          [0.3, 0.004],
          [0.33, 0.02],
          [0.335, 0.036],
          [0.322, 0.04],
          [0.3, 0.026],
          [0, 0.022],
        ],
        28,
        3,
        1,
      ),
      { k: 'stucco', c, uv: true, r: 0.8 },
    );
    // la cara de arriba, curtida por el fuego
    b.add(
      torno(
        [
          [0.29, 0.0295],
          [0.15, 0.0268],
          [0, 0.0262],
        ],
        28,
        3,
        1,
      ),
      { k: 'metal', c: '#2b2521', uv: true, r: 0.7, m: 0.2 },
    );
  },
  fogon(b, c) {
    // fogón de leña de adobe repellado: cuerpo, plancha de barro, boca con brasas y leña, comal encima
    const adobe: Pintura = { k: 'stucco', c, g: [0, 0.35, 0.72] };
    b.add(new THREE.BoxGeometry(1.8, 0.86, 1.4, 1, 1, 1), adobe, { p: [0, 0.43, 0] });
    b.add(new THREE.BoxGeometry(1.92, 0.08, 1.52), { k: 'stucco', c: tono(c, -0.06) }, { p: [0, 0.9, 0] });
    b.add(new THREE.BoxGeometry(0.72, 0.42, 0.04), { k: 'plastic', c: '#140d09', r: 1 }, { p: [0, 0.32, 0.705] });
    b.add(new THREE.BoxGeometry(0.84, 0.06, 0.06), { k: 'stucco', c: tono(c, -0.12) }, { p: [0, 0.56, 0.72] });
    for (let i = 0; i < 5; i++)
      b.add(
        new THREE.SphereGeometry(0.07 + (i % 2) * 0.03, 7, 5),
        { k: 'plastic', c: i % 2 ? '#ff7a1a' : '#ffb347', e: -1.4 },
        {
          p: [-0.22 + i * 0.11, 0.14, 0.74 + (i % 3) * 0.03],
          s: [1, 0.6, 1],
        },
      );
    for (const [x, a] of [
      [-0.16, 0.12],
      [0.02, -0.06],
      [0.18, -0.16],
    ] as [number, number][])
      b.add(
        new THREE.CylinderGeometry(0.045, 0.05, 0.9, 7),
        { k: 'bark', c: '#5b412b' },
        {
          p: [x, 0.2, 0.75],
          r: [PI / 2 - 0.12, a, 0],
        },
      );
    // comal (r 0.6) sobre la plancha
    b.add(
      new THREE.CylinderGeometry(0.6, 0.58, 0.04, 32),
      { k: 'metal', c: '#26221f', r: 0.62, m: 0.25 },
      { p: [0, 0.96, 0] },
    );
    b.add(aro(0.6, 0.018, PI * 2, 5, 32), { k: 'stucco', c: '#6e4a33' }, { p: [0, 0.975, 0] });
    // tizne sobre la boca
    b.add(new THREE.PlaneGeometry(0.9, 0.3), { k: 'stucco', c: '#2b211b', r: 1 }, { p: [0, 0.66, 0.702] });
  },
  canasta(b, c) {
    ARMA.cesta(b, c);
    b.add(
      tubo(
        [
          [-0.29, 0.29, 0],
          [-0.24, 0.42, 0],
          [0, 0.5, 0],
          [0.24, 0.42, 0],
          [0.29, 0.29, 0],
        ],
        0.017,
      ),
      { k: 'straw', c: tono(c, -0.12), uv: true },
    );
  },
  cesta(b, c) {
    const paja: Pintura = { k: 'straw', c, uv: true };
    b.add(
      torno(
        [
          [0, 0],
          [0.16, 0],
          [0.2, 0.02],
          [0.26, 0.14],
          [0.3, 0.28],
          [0.305, 0.3],
          [0.29, 0.3],
          [0.285, 0.28],
          [0.245, 0.14],
          [0.185, 0.035],
          [0, 0.03],
        ],
        24,
        9,
        2.6,
      ),
      paja,
    );
    b.add(aro(0.3, 0.02, PI * 2, 6, 28), { k: 'straw', c: tono(c, -0.1), uv: true }, { p: [0, 0.3, 0] });
    b.add(aro(0.205, 0.012, PI * 2, 5, 24), { k: 'straw', c: tono(c, -0.1), uv: true }, { p: [0, 0.03, 0] });
  },
  balde(b, c) {
    const lata: Pintura = { k: 'metal', c, uv: true, r: 0.45 };
    b.add(
      torno(
        [
          [0, 0],
          [0.165, 0],
          [0.172, 0.01],
          [0.212, 0.335],
          [0.222, 0.348],
          [0.212, 0.352],
          [0.2, 0.34],
          [0.162, 0.022],
          [0, 0.022],
        ],
        22,
        2,
        1,
      ),
      lata,
    );
    for (const y of [0.11, 0.24]) b.add(aro(0.183 + y * 0.12, 0.007, PI * 2, 4, 22), lata, { p: [0, y, 0] });
    b.add(
      new THREE.TorusGeometry(0.212, 0.007, 4, 18, PI),
      { k: 'metal', c: '#5f666b', r: 0.5 },
      { p: [0, 0.33, 0], r: [0, 0, 0] },
    );
    for (const s of [-1, 1]) b.add(new THREE.SphereGeometry(0.018, 6, 4), lata, { p: [s * 0.214, 0.31, 0] });
  },
  sombrero(b, c, c2) {
    const paja: Pintura = { k: 'straw', c, uv: true };
    b.add(
      torno(
        [
          [0, 0.17],
          [0.09, 0.166],
          [0.135, 0.152],
          [0.152, 0.12],
          [0.158, 0.05],
          [0.2, 0.032],
          [0.32, 0.024],
          [0.39, 0.036],
          [0.405, 0.05],
          [0.398, 0.054],
          [0.385, 0.042],
          [0.32, 0.012],
          [0.2, 0.018],
          [0.15, 0.03],
          [0.142, 0.12],
          [0.126, 0.148],
          [0, 0.156],
        ],
        28,
        10,
        3,
      ),
      paja,
    );
    b.add(
      torno(
        [
          [0.16, 0.04],
          [0.159, 0.08],
        ],
        28,
        1,
        1,
      ),
      { k: 'cloth', c: c2 ?? '#2b2b2b' },
    );
  },
  saco(b, c) {
    const yute: Pintura = { k: 'cloth', c, uv: true, g: [0, 0.12, 0.8] };
    b.add(
      abollar(
        torno(
          [
            [0, 0],
            [0.18, 0.004],
            [0.25, 0.05],
            [0.27, 0.15],
            [0.265, 0.3],
            [0.24, 0.42],
            [0.17, 0.5],
            [0.1, 0.545],
            [0.068, 0.565],
            [0.08, 0.59],
            [0.105, 0.625],
            [0.085, 0.64],
            [0.04, 0.628],
            [0, 0.62],
          ],
          22,
          5,
          3,
        ),
        0.045,
        2,
      ),
      yute,
    );
    b.add(aro(0.072, 0.014, PI * 2, 5, 14), { k: 'cloth', c: '#6b5434' }, { p: [0, 0.566, 0] });
  },
  caja(b, c) {
    const tabla: Pintura = { k: 'wood', c },
      poste: Pintura = { k: 'wood', c: tono(c, -0.1) },
      W = 0.6,
      D = 0.4;
    b.add(new THREE.BoxGeometry(W - 0.02, 0.02, D - 0.02), tabla, { p: [0, 0.01, 0] });
    for (let i = 0; i < 3; i++) {
      const y = 0.06 + i * 0.12;
      for (const s of [-1, 1]) {
        b.add(new THREE.BoxGeometry(W, 0.085, 0.016), tabla, {
          p: [0, y, s * (D / 2 - 0.008)],
          r: [0, 0, (i - 1) * 0.004],
        });
        b.add(new THREE.BoxGeometry(0.016, 0.085, D - 0.03), tabla, { p: [s * (W / 2 - 0.008), y, 0] });
      }
    }
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        b.add(new THREE.BoxGeometry(0.04, 0.36, 0.04), poste, {
          p: [sx * (W / 2 - 0.035), 0.18, sz * (D / 2 - 0.035)],
        });
  },
  pana(b, c) {
    b.add(
      torno(
        [
          [0, 0],
          [0.2, 0],
          [0.3, 0.04],
          [0.4, 0.14],
          [0.45, 0.2],
          [0.43, 0.205],
          [0.38, 0.15],
          [0.28, 0.06],
          [0, 0.035],
        ],
        26,
        4,
        1,
      ),
      { k: 'stucco', c, uv: true, g: [0, 0.1, 0.7] },
    );
    b.add(aro(0.442, 0.012, PI * 2, 5, 26), { k: 'stucco', c: tono(c, -0.1), uv: true }, { p: [0, 0.2, 0] });
  },
  plato(b, c, c2) {
    b.add(
      torno(
        [
          [0, 0],
          [0.09, 0],
          [0.1, 0.008],
          [0.16, 0.028],
          [0.166, 0.032],
          [0.152, 0.026],
          [0.09, 0.012],
          [0, 0.012],
        ],
        26,
        1,
        1,
      ),
      { k: 'plastic', c, r: 0.25 },
    );
    b.add(aro(0.164, 0.004, PI * 2, 4, 28), { k: 'plastic', c: c2 ?? '#1f4f8f', r: 0.25 }, { p: [0, 0.032, 0] });
  },
  taza(b, c, c2) {
    b.add(
      torno(
        [
          [0, 0],
          [0.036, 0],
          [0.046, 0.012],
          [0.054, 0.09],
          [0.056, 0.1],
          [0.05, 0.1],
          [0.046, 0.02],
          [0, 0.02],
        ],
        18,
        1,
        1,
      ),
      { k: 'plastic', c, r: 0.25 },
    );
    b.add(aro(0.055, 0.004, PI * 2, 4, 18), { k: 'plastic', c: c2 ?? '#1f4f8f', r: 0.25 }, { p: [0, 0.1, 0] });
    b.add(
      new THREE.TorusGeometry(0.026, 0.0075, 5, 12, PI * 1.3),
      { k: 'plastic', c, r: 0.25 },
      { p: [0.058, 0.055, 0], r: [0, 0, -PI * 0.65] },
    );
  },
  mesa(b, c) {
    ARMA_MESA(b, c, 1.2, 0.75, 0.7);
  },
  pelota(b, c, c2) {
    // pelota de gajos: 12 pentágonos oscuros sobre la piel clara (icosaedro truncado aproximado)
    const ico = new THREE.IcosahedronGeometry(1, 0).attributes.position,
      centros: THREE.Vector3[] = [];
    for (let i = 0; i < ico.count; i++) {
      const v = new THREE.Vector3().fromBufferAttribute(ico, i).normalize();
      if (!centros.some((q) => q.distanceTo(v) < 1e-3)) centros.push(v);
    }
    const g = new THREE.IcosahedronGeometry(0.22, 4),
      p = g.attributes.position,
      claro: number[] = [],
      oscuro: number[] = [],
      v = new THREE.Vector3();
    for (let i = 0; i < p.count; i += 3) {
      v.set(0, 0, 0);
      for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, i + k));
      v.normalize();
      const negro = centros.some((q) => q.dot(v) > 0.946);
      for (let k = 0; k < 3; k++) (negro ? oscuro : claro).push(p.getX(i + k), p.getY(i + k), p.getZ(i + k));
    }
    for (const [lista, col] of [
      [claro, c],
      [oscuro, c2 ?? '#1d1d1f'],
    ] as [number[], string][]) {
      const q = new THREE.BufferGeometry();
      q.setAttribute('position', new THREE.Float32BufferAttribute(lista, 3));
      const n = new Float32Array(lista.length);
      for (let i = 0; i < lista.length; i += 3) {
        v.set(lista[i], lista[i + 1], lista[i + 2]).normalize();
        n.set([v.x, v.y, v.z], i);
      }
      q.setAttribute('normal', new THREE.BufferAttribute(n, 3));
      b.add(q, { k: 'plastic', c: col, r: 0.38 }, { p: [0, 0.22, 0] });
    }
  },
  cayuco(b, c) {
    // tronco ahuecado: casco de media elipse, el hueco por dentro, borda redondeada y las dos bancas
    const L = 1.5,
      A = 0.35,
      H = 0.3,
      casco = new THREE.SphereGeometry(1, 20, 8, 0, PI * 2, PI / 2, PI / 2);
    b.add(casco, { k: 'wood', c, g: [0.0, 0.2, 0.55] }, { p: [0, H, 0], s: [A, H, L] });
    b.add(
      adentro(casco),
      { k: 'wood', c: tono(c, -0.08) },
      { p: [0, H + 0.005, 0], s: [A - 0.05, H - 0.05, L - 0.06] },
    );
    const borda: V3[] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * PI * 2;
      borda.push([Math.sin(a) * (A - 0.025), H, Math.cos(a) * (L - 0.03)]);
    }
    b.add(tubo(borda, 0.028, 48, 5), { k: 'wood', c: tono(c, 0.04) });
    for (const z of [-0.75, 0.6])
      b.add(new THREE.BoxGeometry(A * 1.6, 0.04, 0.2), { k: 'wood', c: tono(c, 0.08) }, { p: [0, H - 0.06, z] });
  },
};
/** pez de río o de mar: cuerpo aplanado de lado, lomo más oscuro, cola, aletas y ojos (centrado, cabeza a +X) */
function armarPez(b: Molde, c: string) {
  const cuerpo = torno(
    [
      [0, -0.35],
      [0.03, -0.3],
      [0.07, -0.2],
      [0.12, -0.05],
      [0.13, 0.06],
      [0.115, 0.17],
      [0.08, 0.26],
      [0.04, 0.32],
      [0, 0.35],
    ],
    16,
    3,
    2,
  );
  cuerpo.rotateZ(-PI / 2);
  b.add(cuerpo, { k: 'metal', c, uv: true, r: 0.35, m: 0.55 }, { s: [1, 1, 0.5] });
  const lomo = torno(
    [
      [0, -0.28],
      [0.05, -0.18],
      [0.09, -0.04],
      [0.095, 0.08],
      [0.075, 0.2],
      [0, 0.3],
    ],
    12,
    3,
    2,
  );
  lomo.rotateZ(-PI / 2);
  b.add(lomo, { k: 'metal', c: tono(c, -0.22), uv: true, r: 0.4, m: 0.45 }, { p: [0, 0.045, 0], s: [1, 0.75, 0.52] });
  const aleta = (pts: [number, number][]) => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ShapeGeometry(sh);
    return g;
  };
  const fino: Pintura = { k: 'plastic', c: tono(c, -0.12), r: 0.5 };
  // cola en V y aleta del lomo: lámina con cara de los dos lados
  for (const pts of [
    [
      [-0.3, 0],
      [-0.44, 0.13],
      [-0.4, 0],
      [-0.44, -0.13],
    ],
    [
      [-0.12, 0.1],
      [0.04, 0.2],
      [0.1, 0.11],
    ],
  ] as [number, number][][]) {
    const g = aleta(pts);
    b.add(g, fino, { p: [0, 0, 0.003] });
    b.add(adentro(g), fino, { p: [0, 0, -0.003] });
  }
  for (const z of [0.055, -0.055])
    b.add(new THREE.SphereGeometry(0.018, 8, 6), { k: 'plastic', c: '#101010', r: 0.2 }, { p: [0.25, 0.025, z] });
}
/** mesa rústica de tablas de ancho w, alto h y fondo d: tablero de cuatro tablas, faldón, patas y travesaño */
function ARMA_MESA(b: Molde, c: string, w: number, h: number, d: number) {
  const n = Math.max(3, Math.round(d / 0.2)),
    t = (d - 0.012 * (n - 1)) / n,
    pata: Pintura = { k: 'wood', c: tono(c, -0.1) };
  for (let i = 0; i < n; i++)
    b.add(
      new THREE.BoxGeometry(w, 0.05, t),
      { k: 'wood', c: tono(c, ((i * 7) % 3) * 0.025 - 0.02) },
      {
        p: [0, h - 0.025, -d / 2 + t / 2 + i * (t + 0.012)],
      },
    );
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(w - 0.16, 0.1, 0.03), pata, { p: [0, h - 0.1, s * (d / 2 - 0.08)] });
    b.add(new THREE.BoxGeometry(0.03, 0.1, d - 0.16), pata, { p: [s * (w / 2 - 0.08), h - 0.1, 0] });
  }
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      b.add(new THREE.BoxGeometry(0.07, h - 0.05, 0.07), pata, {
        p: [sx * (w / 2 - 0.09), (h - 0.05) / 2, sz * (d / 2 - 0.09)],
      });
  b.add(new THREE.BoxGeometry(w - 0.2, 0.05, 0.04), pata, { p: [0, h * 0.25, 0] });
  for (const sx of [-1, 1])
    b.add(new THREE.BoxGeometry(0.04, 0.05, d - 0.2), pata, { p: [sx * (w / 2 - 0.09), h * 0.25, 0] });
}

const hechos = new Map<string, THREE.BufferGeometry | null>();
/** geometría fusionada del objeto (cacheada); null si el paquete de arte no tiene malla fusionada */
export function geoObjeto(k: ObjetoKind, c?: string, c2?: string, medida?: V3): THREE.BufferGeometry | null {
  const key = `${k}|${c ?? ''}|${c2 ?? ''}|${medida ?? ''}`;
  if (hechos.has(key)) return hechos.get(key) ?? null;
  const b = art.fused?.molde?.() ?? null;
  if (b) {
    if (k === 'mesa' && medida) ARMA_MESA(b, c ?? COLOR.mesa, medida[0], medida[1], medida[2]);
    else ARMA[k](b, c ?? COLOR[k], c2);
  }
  const g = b?.build() ?? null;
  hechos.set(key, g);
  return g;
}

/** Un objeto de juego. `pos` = punto de apoyo; `rot` giro en Y (o Euler); `c` color principal, `c2` el de detalle
 *  (cinta del sombrero, filo del peltre, gajos de la pelota); `medida` solo para la mesa (ancho, alto, fondo). */
export function Objeto({
  k,
  pos = [0, 0, 0],
  rot = 0,
  scale = 1,
  c,
  c2,
  medida,
  cast = true,
}: {
  k: ObjetoKind;
  pos?: V3;
  rot?: number | V3;
  scale?: number | V3;
  c?: string;
  c2?: string;
  medida?: V3;
  cast?: boolean;
}) {
  const g = geoObjeto(k, c, c2, medida),
    r: V3 = typeof rot === 'number' ? [0, rot, 0] : rot,
    s: V3 = typeof scale === 'number' ? [scale, scale, scale] : scale;
  const F = art.fused;
  if (g && F)
    return (
      <mesh
        geometry={g}
        material={F.material()}
        position={pos}
        rotation={r}
        scale={s}
        castShadow={cast}
        receiveShadow
      />
    );
  return (
    <group position={pos} rotation={r} scale={s}>
      <Sencillo k={k} c={c ?? COLOR[k]} medida={medida} />
    </group>
  );
}
/** lo mismo con piezas del kit (paquete sin malla fusionada) */
function Sencillo({ k, c, medida }: { k: ObjetoKind; c: string; medida?: V3 }): ReactNode {
  const [w, h, d] = k === 'mesa' && medida ? medida : MEDIDA[k];
  if (k === 'pelota') return <Ball pos={[0, h / 2, 0]} r={w / 2} color={c} />;
  if (k === 'pez')
    return (
      <group scale={[1.6, 0.85, 0.6]}>
        <Ball pos={[0, 0, 0]} r={0.22} color={c} mat="metal" />
      </group>
    );
  if (k === 'caja' || k === 'mesa' || k === 'fogon')
    return <Block pos={[0, h / 2, 0]} size={[w, h, d]} color={c} mat="wood" solid={false} />;
  return (
    <Cyl
      pos={[0, h / 2, 0]}
      r={w / 2}
      rTop={k === 'olla' || k === 'saco' ? w * 0.35 : w / 2}
      h={h}
      color={c}
      mat={k === 'balde' ? 'metal' : k === 'saco' ? 'cloth' : 'wood'}
      solid={false}
    />
  );
}
