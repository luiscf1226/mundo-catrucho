// Geometría del avatar HD: una sola malla con huesos. Cuerpo de formas redondeadas (torso, cuello, cabeza grande,
// brazos y piernas de dos segmentos con codos y rodillas suaves), más cabello, sombrero y accesorio según la
// configuración. Se cachea por estilo; los colores y estampados van en el atlas (avatarTex.ts).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { AvatarConfig, V3 } from '../../../../core/types';
import { ellipsoidPatch, headHalf, inverted, loft, type Rect, SkinBuilder, type WFn } from './skin';
import { rng } from './tex';

// --- huesos
export const B = {
  root: 0,
  hips: 1,
  chest: 2,
  head: 3,
  armL: 4,
  foreL: 5,
  armR: 6,
  foreR: 7,
  thighL: 8,
  shinL: 9,
  footL: 10,
  thighR: 11,
  shinR: 12,
  footR: 13,
  lid: 14,
  tail: 15,
  cape1: 16,
  cape2: 17,
  cape3: 18,
  skirt: 19,
} as const;
export const NB = 20;
export const PARENT = [-1, 0, 1, 2, 2, 4, 2, 6, 1, 8, 9, 1, 11, 12, 3, 3, 2, 16, 17, 1];
/** posición de reposo de cada hueso en el espacio del avatar (pies en y = 0, mira a +Z) */
export const REST: V3[] = [
  [0, 0, 0],
  [0, 0.8, 0],
  [0, 0.98, 0],
  [0, 1.2, 0],
  [0.262, 1.12, 0],
  [0.262, 0.885, 0],
  [-0.262, 1.12, 0],
  [-0.262, 0.885, 0],
  [0.102, 0.78, 0],
  [0.102, 0.44, 0],
  [0.102, 0.085, 0],
  [-0.102, 0.78, 0],
  [-0.102, 0.44, 0],
  [-0.102, 0.085, 0],
  [0, 1.475, 0],
  [0, 1.52, -0.24],
  [0, 1.15, -0.13],
  [0, 0.92, -0.15],
  [0, 0.7, -0.16],
  [0, 0.82, 0],
];
/** largo de muslo + pantorrilla, para agacharse sin que los pies se hundan */
export const LEG = 0.695;

// --- regiones del atlas (ver avatarTex.ts)
export const R = {
  face: [0, 0, 256, 256],
  torso: [256, 0, 512, 256],
  skirt: [768, 0, 256, 256],
  arm: [0, 256, 128, 256],
  leg: [128, 256, 128, 256],
  cape: [256, 256, 192, 256],
  patA: [448, 256, 192, 128],
  patB1: [448, 384, 96, 128],
  patB2: [544, 384, 96, 128],
} as const satisfies Record<string, Rect>;
export const SWATCH = [
  'skin',
  'lid',
  'hair',
  'hat',
  'hat2',
  'acc',
  'acc2',
  'shoe',
  'sole',
  'white',
  'black',
  'gold',
  'jade',
  'lens',
  'straw',
  'wood',
  'red',
  'blue',
  'green',
  'yellow',
  'pink',
  'purple',
  'leather',
  'drum',
] as const;
export type SwatchName = (typeof SWATCH)[number];
export const swatchCell = (n: SwatchName): Rect => {
  const i = SWATCH.indexOf(n);
  return [640 + (i % 6) * 64, 256 + Math.floor(i / 6) * 64, 64, 64];
};
const S = (n: SwatchName): Rect => {
  const c = swatchCell(n);
  return [c[0] + 12, c[1] + 12, 40, 40];
};

export const HC: V3 = [0, 1.45, 0],
  HR: V3 = [0.285, 0.262, 0.265];
const sm = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const _p = new THREE.Vector3(),
  _q = new THREE.Quaternion(),
  _e = new THREE.Euler(),
  _s = new THREE.Vector3();
const M = (p: V3, s: V3 | number = 1, r: V3 = [0, 0, 0]) => {
  _p.set(...p);
  _q.setFromEuler(_e.set(...r));
  if (typeof s === 'number') _s.set(s, s, s);
  else _s.set(...s);
  return new THREE.Matrix4().compose(_p, _q, _s);
};
const SPH = new THREE.SphereGeometry(1, 14, 10),
  SPH_LO = new THREE.SphereGeometry(1, 10, 7),
  DOME = new THREE.SphereGeometry(1, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2);
const lathe = (pts: [number, number][], seg = 22) =>
  new THREE.LatheGeometry(
    pts.map((p) => new THREE.Vector2(p[0], p[1])),
    seg,
  );

type Add = (g: THREE.BufferGeometry, rect: Rect, w: WFn | number, m?: THREE.Matrix4) => void;
const wArm =
  (s: number): WFn =>
  (_x, y) => {
    const k = sm(0.85, 0.92, y);
    return s > 0 ? [B.armL, k, B.foreL, 1 - k] : [B.armR, k, B.foreR, 1 - k];
  };
const wLeg =
  (s: number): WFn =>
  (_x, y) => {
    const k = sm(0.39, 0.49, y),
      f = sm(0.125, 0.07, y);
    return s > 0
      ? [B.thighL, k, B.shinL, (1 - k) * (1 - f), B.footL, (1 - k) * f]
      : [B.thighR, k, B.shinR, (1 - k) * (1 - f), B.footR, (1 - k) * f];
  };
const wTorso: WFn = (_x, y) => {
  const k = sm(0.82, 0.98, y);
  return [B.hips, 1 - k, B.chest, k];
};
const wNeck: WFn = (_x, y) => {
  const k = sm(1.15, 1.22, y);
  return [B.chest, 1 - k, B.head, k];
};
const wHang: WFn = (_x, y) => {
  const k = sm(1.08, 1.28, y);
  return [B.head, k, B.chest, 1 - k];
};
const wSkirt: WFn = (x, y) => {
  const t = sm(0.86, 0.36, y),
    sl = sm(-0.12, 0.12, x);
  return [B.hips, 1 - t * 0.85, B.thighL, t * 0.4 * sl, B.thighR, t * 0.4 * (1 - sl), B.skirt, t * 0.45];
};
const wCape: WFn = (_x, y) => {
  const t = (1.165 - y) / 0.695,
    a = sm(0, 0.2, t),
    b = sm(0.25, 0.45, t),
    c = sm(0.57, 0.77, t);
  return [B.chest, 1 - a, B.cape1, a * (1 - b), B.cape2, b * (1 - c), B.cape3, c];
};

/** direcciones repartidas sobre el cuero cabelludo (sin la cara ni debajo de las orejas) */
function scalp(n: number, seed: number, maxY = 2): V3[] {
  const out: V3[] = [],
    r = rng(seed),
    ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n * 2 && out.length < n; i++) {
    const y = 1 - ((i + 0.5) / (n * 2)) * 1.5,
      rad = Math.sqrt(Math.max(0, 1 - y * y)),
      th = i * ga + r() * 0.3,
      x = Math.cos(th) * rad,
      z = Math.sin(th) * rad;
    if (y > maxY) continue;
    if (z > 0.3 && y < 0.5) continue;
    if (z > -0.2 ? y < 0.02 : y < -0.4) continue;
    out.push([x, y, z]);
  }
  return out;
}

function body(add: Add, c: AvatarConfig) {
  // torso (camisa arriba, pantalón o falda abajo: lo pinta el atlas)
  const fem = c.body === 'm';
  const TH: [number, number, number, number?][] = [
    [0.692, 0.004, 0.004],
    [0.7, 0.11, 0.09],
    [0.735, 0.18, 0.14],
    [0.8, 0.202, 0.158],
    [0.88, 0.194, 0.15],
    [0.98, 0.204, 0.155],
    [1.06, 0.216, 0.158],
    [1.11, 0.206, 0.146],
    [1.15, 0.152, 0.115],
    [1.175, 0.08, 0.075],
  ];
  const TM: [number, number, number, number?][] = [
    [0.692, 0.004, 0.004],
    [0.7, 0.12, 0.095],
    [0.735, 0.2, 0.152],
    [0.8, 0.214, 0.166],
    [0.88, 0.17, 0.136],
    [0.96, 0.178, 0.15, 0.01],
    [1.01, 0.188, 0.165, 0.016],
    [1.06, 0.19, 0.148, 0.006],
    [1.11, 0.184, 0.136],
    [1.15, 0.14, 0.11],
    [1.175, 0.076, 0.072],
  ];
  add(
    loft(
      (fem ? TM : TH).map(([y, rx, rz, cz]) => ({ y, rx, rz, cz, v: y < 0.7 ? 0 : (y - 0.7) / 0.475 })),
      20,
    ),
    R.torso,
    wTorso,
  );
  add(
    loft(
      [
        { y: 1.15, rx: 0.074 },
        { y: 1.24, rx: 0.072 },
      ],
      12,
    ),
    S('skin'),
    wNeck,
  );
  // cabeza: mitad delantera con la cara, mitad trasera lisa
  add(headHalf(HR[0], HR[1], HR[2], true), R.face, B.head, M(HC));
  add(headHalf(HR[0], HR[1], HR[2], false), S('skin'), B.head, M(HC));
  for (const s of [-1, 1]) add(SPH_LO, S('skin'), B.head, M([s * 0.278, 1.432, 0.0], [0.034, 0.056, 0.045]));
  add(SPH_LO, S('skin'), B.head, M([0, 1.405, 0.258], [0.03, 0.024, 0.026]));
  if (c.face !== 'cara_lentes')
    for (const s of [-1, 1])
      add(
        ellipsoidPatch(
          HR[0] * 1.014,
          HR[1] * 1.014,
          HR[2] * 1.014,
          s * 0.105 - 0.054,
          s * 0.105 + 0.054,
          -0.076,
          0.026,
        ),
        S('lid'),
        B.lid,
        M(HC),
      );
  // brazos y manos
  for (const s of [-1, 1]) {
    add(
      loft(
        [
          { y: 0.69, rx: 0.056 },
          { y: 0.78, rx: 0.062 },
          { y: 0.885, rx: 0.064 },
          { y: 1.0, rx: 0.07 },
          { y: 1.1, rx: 0.075 },
          { y: 1.15, rx: 0.068 },
          { y: 1.174, rx: 0.04 },
          { y: 1.182, rx: 0.003 },
        ].map((r) => ({ ...r, rx: r.rx * (fem ? 0.9 : 1), cx: s * (fem ? 0.255 : 0.262), v: (r.y - 0.69) / 0.488 })),
        12,
      ),
      R.arm,
      wArm(s),
    );
    const f = s > 0 ? B.foreL : B.foreR;
    add(SPH, S('skin'), f, M([s * 0.262, 0.635, 0.006], [0.058, 0.074, 0.066]));
    add(SPH_LO, S('skin'), f, M([s * 0.232, 0.655, 0.052], [0.024, 0.036, 0.027]));
  }
  // piernas y zapatos
  const wide = c.pants === 'pantalon_manta' || (cut(c) === 'pants' && c.pants !== 'falda_lenca') ? 1.14 : 1;
  for (const s of [-1, 1]) {
    add(
      loft(
        [
          { y: 0.07, rx: 0.064 },
          { y: 0.12, rx: 0.066 },
          { y: 0.21, rx: 0.07 * wide },
          { y: 0.3, rx: 0.075 * wide },
          { y: 0.44, rx: 0.08 * wide },
          { y: 0.6, rx: 0.092 },
          { y: 0.74, rx: 0.1 },
          { y: 0.8, rx: 0.08 },
          { y: 0.82, rx: 0.03 },
        ].map((r) => ({ ...r, cx: s * 0.102, v: (r.y - 0.07) / 0.75 })),
        12,
      ),
      R.leg,
      wLeg(s),
    );
    const f = s > 0 ? B.footL : B.footR;
    add(SPH, S('shoe'), f, M([s * 0.102, 0.064, 0.045], [0.082, 0.064, 0.14]));
    add(SPH, S('sole'), f, M([s * 0.102, 0.024, 0.045], [0.087, 0.024, 0.147]));
  }
  clothes(add, c);
  if (c.shirt === 'blusa_tipica')
    add(
      lathe(
        [
          [0.21, 1.095],
          [0.285, 1.058],
          [0.292, 1.07],
          [0.21, 1.15],
          [0.1, 1.19],
        ],
        24,
      ),
      R.patB2,
      B.chest,
      M([0, 0, 0], [1, 1, 0.78]),
    );
}

/** Corte de la prenda de abajo. Algunas faldas de atuendo son pantalón en el cuerpo de hombre. */
export type Cut = 'pants' | 'skirt' | 'long' | 'punta' | 'faldellin' | 'escriba' | 'yugo';
export function cut(c: AvatarConfig): Cut {
  const m = c.body === 'm';
  switch (c.pants) {
    case 'falda_tipica':
      return 'skirt';
    case 'falda_lenca':
      return m ? 'long' : 'pants';
    case 'falda_garifuna':
      return m ? 'long' : 'pants';
    case 'falda_punta':
      return m ? 'punta' : 'pants';
    case 'faldellin_maya':
      return 'faldellin';
    case 'faldellin_escriba':
      return 'escriba';
    case 'yugo_pelota':
      return 'yugo';
    default:
      return 'pants';
  }
}
/** falda por anillos [y, rx, rz] de abajo (ruedo) hacia la cintura, con forro y vuelo opcional */
function skirtGeo(add: Add, rings: [number, number, number][], ripple = 0, waves = 11) {
  const g = loft(
    rings.map(([y, rx, rz]) => ({ y, rx, rz })),
    32,
  );
  if (ripple) {
    const P = g.attributes.position,
      y0 = rings[0][1] === 0 ? 0 : rings[0][0];
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i),
        y = P.getY(i),
        z = P.getZ(i),
        k = 1 + ripple * Math.sin(waves * Math.atan2(x, z)) * sm(y0 + 0.3, y0, y);
      P.setX(i, x * k);
      P.setZ(i, z * k);
    }
    g.computeVertexNormals();
  }
  add(g, R.skirt, wSkirt);
  add(inverted(g), S('black'), wSkirt);
}
function clothes(add: Add, c: AvatarConfig) {
  const k = cut(c),
    fem = c.body === 'm',
    top: [number, number, number][] = [
      [0.76, 0.24, 0.2],
      [0.845, 0.214, 0.17],
      [0.875, fem ? 0.2 : 0.204, fem ? 0.156 : 0.16],
    ];
  if (k === 'skirt')
    skirtGeo(add, [[0.33, 0.41, 0.38], [0.36, 0.4, 0.37], [0.46, 0.36, 0.33], [0.6, 0.3, 0.265], ...top]);
  else if (k === 'long')
    skirtGeo(add, [
      [0.12, 0.35, 0.32],
      [0.15, 0.345, 0.315],
      [0.3, 0.315, 0.285],
      [0.46, 0.285, 0.255],
      [0.6, 0.26, 0.225],
      ...top,
    ]);
  else if (k === 'punta') {
    skirtGeo(add, [[0.26, 0.5, 0.47], [0.29, 0.49, 0.46], [0.42, 0.4, 0.37], [0.6, 0.3, 0.265], ...top], 0.07, 13);
  } else if (k === 'faldellin' || k === 'escriba' || k === 'yugo') {
    const hem = k === 'escriba' ? 0.42 : k === 'yugo' ? 0.6 : 0.52;
    skirtGeo(add, [
      [hem, 0.27, 0.235],
      [hem + 0.03, 0.265, 0.23],
      [(hem + 0.875) / 2, 0.235, 0.195],
      [0.845, 0.214, 0.17],
      [0.875, 0.206, 0.162],
    ]);
    // paño delantero y trasero que cuelgan del cinturón
    const len = k === 'escriba' ? 0.5 : 0.44;
    for (const s of [1, -1])
      add(
        new RoundedBoxGeometry(0.17, len, 0.02, 1, 0.008),
        R.skirt,
        B.hips,
        M([0, 0.86 - len / 2, s * (0.205 + len * 0.1)], 1, [s * 0.1, 0, 0]),
      );
    if (k === 'yugo') {
      add(
        new THREE.TorusGeometry(0.235, 0.062, 8, 26),
        S('leather'),
        B.hips,
        M([0, 0.79, 0], [1, 1, 0.82], [Math.PI / 2, 0, 0]),
      );
      add(new RoundedBoxGeometry(0.15, 0.16, 0.05, 2, 0.02), S('hat'), B.hips, M([0, 0.79, 0.215], 1, [0.08, 0, 0]));
      for (const s of [-1, 1])
        add(SPH, S('leather'), s > 0 ? B.shinL : B.shinR, M([s * 0.102, 0.43, 0.04], [0.088, 0.075, 0.07]));
    } else
      add(
        lathe(
          [
            [0.215, 0.83],
            [0.228, 0.86],
            [0.22, 0.89],
          ],
          22,
        ),
        S(k === 'escriba' ? 'red' : 'gold'),
        B.hips,
        M([0, 0, 0], [1, 1, 0.8]),
      );
  }
}

function hair(add: Add, c: AvatarConfig) {
  const h = c.hair,
    hat = c.hat !== 'sin_sombrero' && c.hat !== 'corona_carnaval' && c.hat !== 'flores_pelo',
    HS = S('hair');
  if (h === 'calvo') return;
  const cap = new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, 1.68);
  add(cap, HS, B.head, M([0, HC[1] + 0.02, -0.012], [0.303, 0.286, 0.293], [-0.5, 0, 0]));
  const at = (d: V3, k: number): V3 => [d[0] * HR[0] * k, HC[1] + d[1] * HR[1] * k, d[2] * HR[2] * k];
  if (h === 'pelo_corto') {
    if (!hat) {
      add(SPH_LO, HS, B.head, M([-0.09, 1.672, 0.15], [0.13, 0.05, 0.1], [0.5, 0, 0.25]));
      add(SPH_LO, HS, B.head, M([0.1, 1.668, 0.14], [0.13, 0.052, 0.1], [0.5, 0, -0.3]));
      add(SPH_LO, HS, B.head, M([0.02, 1.705, 0.05], [0.16, 0.04, 0.14], [0.2, 0, 0.1]));
    }
    for (const s of [-1, 1]) add(SPH_LO, HS, B.head, M([s * 0.272, 1.5, 0.06], [0.03, 0.07, 0.05]));
  } else if (h === 'pelo_largo') {
    add(
      loft(
        [
          { y: 0.99, rx: 0.1, rz: 0.03, cz: -0.15 },
          { y: 1.02, rx: 0.17, rz: 0.06, cz: -0.15 },
          { y: 1.1, rx: 0.22, rz: 0.09, cz: -0.145 },
          { y: 1.22, rx: 0.26, rz: 0.14, cz: -0.12 },
          { y: 1.34, rx: 0.3, rz: 0.2, cz: -0.09 },
          { y: 1.46, rx: 0.308, rz: 0.25, cz: -0.06 },
          { y: 1.6, rx: 0.26, rz: 0.2, cz: -0.05 },
        ],
        16,
      ),
      HS,
      wHang,
    );
    for (const s of [-1, 1]) add(SPH_LO, HS, wHang, M([s * 0.268, 1.36, 0.07], [0.048, 0.19, 0.075], [0.1, 0, 0]));
    if (!hat) add(SPH_LO, HS, B.head, M([0, 1.69, 0.1], [0.2, 0.05, 0.14], [0.45, 0, 0]));
  } else if (h === 'pelo_rizado') {
    for (const d of scalp(34, 5, hat ? 0.45 : 2)) add(SPH_LO, HS, B.head, M(at(d, 1.07), 0.078));
  } else if (h === 'pelo_afro') {
    for (const d of scalp(26, 9, hat ? 0.5 : 2)) add(SPH_LO, HS, B.head, M(at(d, 1.02), hat ? 0.115 : 0.155));
  } else if (h === 'pelo_coleta') {
    add(new THREE.TorusGeometry(0.045, 0.02, 6, 12), S('red'), B.head, M([0, 1.565, -0.275], 1, [0.9, 0, 0]));
    add(SPH_LO, HS, B.tail, M([0, 1.52, -0.335], [0.07, 0.085, 0.07]));
    add(SPH_LO, HS, B.tail, M([0, 1.4, -0.365], [0.066, 0.1, 0.06]));
    add(SPH_LO, HS, B.tail, M([0, 1.27, -0.36], [0.046, 0.085, 0.044]));
    if (!hat) add(SPH_LO, HS, B.head, M([0, 1.69, 0.1], [0.2, 0.05, 0.14], [0.45, 0, 0]));
  } else if (h === 'pelo_trenzas') {
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++)
        add(
          SPH_LO,
          HS,
          wHang,
          M(
            [s * (0.282 - i * 0.004), 1.42 - i * 0.068, -0.01 + i * 0.016 + (i % 2 ? 0.014 : -0.014)],
            [0.05 - i * 0.003, 0.055, 0.05 - i * 0.003],
          ),
        );
      add(SPH_LO, S('red'), wHang, M([s * 0.256, 0.95, 0.1], [0.036, 0.022, 0.036]));
      add(SPH_LO, HS, wHang, M([s * 0.256, 0.905, 0.1], [0.03, 0.045, 0.03]));
    }
  }
}

function hats(add: Add, c: AvatarConfig) {
  const lift = c.hair === 'pelo_afro' ? 0.045 : c.hair === 'pelo_rizado' ? 0.02 : 0,
    k = c.hair === 'pelo_afro' ? 1.1 : 1;
  const G = new THREE.Matrix4()
    .makeTranslation(0, lift + 1.45 * (1 - k), 0)
    .multiply(new THREE.Matrix4().makeScale(k, k, k));
  const put: Add = (g, rect, w, m) => add(g, rect, w, m ? G.clone().multiply(m) : G);
  const H = B.head;
  switch (c.hat) {
    case 'gorra':
      put(DOME, S('hat'), H, M([0, 1.535, -0.012], [0.303, 0.212, 0.312]));
      put(SPH, S('hat2'), H, M([0, 1.548, 0.3], [0.185, 0.02, 0.175], [0.2, 0, 0]));
      put(SPH_LO, S('hat2'), H, M([0, 1.748, -0.012], [0.03, 0.016, 0.03]));
      put(
        lathe(
          [
            [0.3, 1.535],
            [0.307, 1.55],
            [0.3, 1.565],
          ],
          20,
        ),
        S('hat2'),
        H,
        M([0, 0, -0.012], [1, 1, 1.03]),
      );
      break;
    case 'sombrero_junco':
      put(
        lathe(
          [
            [0.26, 1.592],
            [0.47, 1.562],
            [0.478, 1.572],
            [0.3, 1.604],
            [0.276, 1.618],
            [0.268, 1.7],
            [0.24, 1.762],
            [0.14, 1.794],
            [0.002, 1.8],
          ],
          26,
        ),
        S('straw'),
        H,
        M([0, 0.15, -0.02], 1, [-0.09, 0, 0]),
      );
      put(
        lathe(
          [
            [0.272, 1.622],
            [0.28, 1.64],
            [0.276, 1.668],
            [0.266, 1.672],
          ],
          22,
        ),
        S('black'),
        H,
        M([0, 0.15, -0.02], 1, [-0.09, 0, 0]),
      );
      break;
    case 'sombrero_vaquero': {
      const g = lathe(
          [
            [0.25, 1.59],
            [0.5, 1.565],
            [0.508, 1.576],
            [0.3, 1.606],
            [0.262, 1.622],
            [0.25, 1.72],
            [0.215, 1.8],
            [0.11, 1.805],
            [0.002, 1.77],
          ],
          28,
        ),
        P = g.attributes.position;
      for (let i = 0; i < P.count; i++) {
        const x = P.getX(i),
          z = P.getZ(i),
          r = Math.hypot(x, z);
        if (r > 0.27) {
          const q = (r - 0.27) / 0.23;
          P.setY(i, P.getY(i) + q * q * (0.13 * (x / r) ** 2 - 0.04 * (z / r) ** 2));
        } else if (P.getY(i) > 1.7) P.setX(i, x * 0.86);
      }
      g.computeVertexNormals();
      put(g, S('leather'), H, M([0, 0.14, -0.02], 1, [-0.08, 0, 0]));
      put(
        lathe(
          [
            [0.258, 1.628],
            [0.266, 1.645],
            [0.26, 1.668],
            [0.25, 1.672],
          ],
          22,
        ),
        S('black'),
        H,
        M([0, 0.14, -0.02], 1, [-0.08, 0, 0]),
      );
      break;
    }
    case 'casco_explorador':
      put(DOME, S('hat'), H, M([0, 1.55, -0.01], [0.305, 0.225, 0.335]));
      put(
        lathe(
          [
            [0.27, 1.558],
            [0.425, 1.488],
            [0.432, 1.5],
            [0.31, 1.575],
          ],
          24,
        ),
        S('hat'),
        H,
        M([0, 0, -0.01], [1, 1, 1.14]),
      );
      put(
        lathe(
          [
            [0.306, 1.566],
            [0.313, 1.59],
            [0.3, 1.612],
          ],
          22,
        ),
        S('hat2'),
        H,
        M([0, 0, -0.01], [1, 1, 1.1]),
      );
      put(SPH_LO, S('hat2'), H, M([0, 1.778, -0.01], [0.035, 0.02, 0.035]));
      break;
    case 'panuelo_lenca':
      put(
        new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, 1.5),
        R.patA,
        H,
        M([0, HC[1] + 0.026, -0.014], [0.314, 0.294, 0.305], [-0.42, 0, 0]),
      );
      put(SPH_LO, R.patA, H, M([0, 1.46, -0.305], [0.055, 0.045, 0.045]));
      for (const s of [-1, 1])
        put(SPH_LO, R.patA, B.tail, M([s * 0.055, 1.35, -0.325], [0.04, 0.115, 0.014], [0.15, 0, s * 0.3]));
      break;
    case 'flores_pelo': {
      const cols = ['red', 'yellow', 'pink', 'purple', 'red'] as const;
      for (let i = 0; i < 5; i++) {
        const a = -0.9 + i * 0.32,
          x = 0.27 * Math.cos(a) * (i % 2 ? 1.08 : 1),
          y = 1.5 + 0.2 * Math.sin(a + 0.9) + (i % 2) * 0.03,
          z = 0.1 - i * 0.06;
        for (let p = 0; p < 5; p++) {
          const q = (p / 5) * Math.PI * 2;
          add(
            SPH_LO,
            S(cols[i]),
            H,
            M([x + 0.03, y + Math.cos(q) * 0.035, z + Math.sin(q) * 0.035], [0.028, 0.03, 0.03]),
          );
        }
        add(SPH_LO, S('yellow'), H, M([x + 0.05, y, z], 0.022));
      }
      add(SPH_LO, S('green'), H, M([0.29, 1.47, -0.02], [0.02, 0.07, 0.035], [0.4, 0, 0.3]));
      break;
    }
    case 'panuelo_garifuna':
    case 'panuelo_punta':
      put(
        new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, 1.6),
        R.patA,
        H,
        M([0, HC[1] + 0.05, -0.03], [0.318, 0.36, 0.33], [-0.35, 0, 0]),
      );
      put(SPH, R.patA, H, M([0.03, 1.79, 0.08], [0.11, 0.075, 0.09], [0.3, 0, 0.4]));
      put(SPH, R.patA, H, M([-0.07, 1.77, 0.12], [0.08, 0.06, 0.07], [0.2, 0, -0.5]));
      break;
    case 'tocado_plumas': {
      put(new THREE.CylinderGeometry(0.3, 0.29, 0.1, 22, 1, true), S('gold'), H, M([0, 1.62, -0.01]));
      put(
        lathe(
          [
            [0.3, 1.57],
            [0.31, 1.62],
            [0.3, 1.67],
          ],
          22,
        ),
        S('jade'),
        H,
        M([0, 0, -0.01], [1.01, 1, 1.01]),
      );
      put(SPH, S('jade'), H, M([0, 1.66, 0.29], [0.08, 0.09, 0.03]));
      put(SPH_LO, S('gold'), H, M([0, 1.66, 0.31], 0.035));
      for (const s of [-1, 1]) put(SPH, S('red'), H, M([s * 0.12, 1.66, 0.27], [0.045, 0.05, 0.02], [0, s * 0.4, 0]));
      const cols = [
        'green',
        'jade',
        'green',
        'blue',
        'green',
        'jade',
        'green',
        'blue',
        'green',
        'jade',
        'green',
      ] as const;
      for (let i = 0; i < 11; i++) {
        const a = (i - 5) * 0.25;
        put(
          SPH,
          S(cols[i]),
          H,
          M(
            [Math.sin(a) * 0.42, 1.88 + Math.cos(a) * 0.26, -0.16],
            [0.07, 0.36 - Math.abs(i - 5) * 0.02, 0.016],
            [-0.25, 0, -a],
          ),
        );
      }
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.3;
        put(
          SPH_LO,
          S(i % 2 ? 'red' : 'yellow'),
          H,
          M([Math.sin(a) * 0.3, 1.8 + Math.cos(a) * 0.12, -0.1], [0.05, 0.16, 0.014], [-0.15, 0, -a]),
        );
      }
      break;
    }
    case 'tocado_escriba':
      put(new THREE.CylinderGeometry(0.296, 0.288, 0.08, 22, 1, true), S('white'), H, M([0, 1.6, -0.01]));
      put(
        lathe(
          [
            [0.296, 1.635],
            [0.302, 1.645],
            [0.296, 1.655],
          ],
          22,
        ),
        S('red'),
        H,
        M([0, 0, -0.01]),
      );
      put(new THREE.CylinderGeometry(0.008, 0.012, 0.3, 6), S('wood'), H, M([0.2, 1.78, 0.12], 1, [0.2, 0, -0.5]));
      put(SPH_LO, S('black'), H, M([0.27, 1.9, 0.15], [0.02, 0.04, 0.02], [0.2, 0, -0.5]));
      put(SPH, S('green'), H, M([-0.16, 1.82, -0.1], [0.04, 0.17, 0.012], [-0.3, 0, 0.35]));
      break;
    case 'tocado_pelota':
      put(new THREE.CylinderGeometry(0.296, 0.288, 0.07, 22, 1, true), S('hat'), H, M([0, 1.6, -0.01]));
      for (let i = 0; i < 3; i++) {
        const a = (i - 1) * 0.35;
        put(
          SPH,
          S(i === 1 ? 'yellow' : 'red'),
          H,
          M([Math.sin(a) * 0.15, 1.78, -0.22], [0.035, 0.14, 0.012], [-0.5, 0, -a]),
        );
      }
      break;
    case 'corona_carnaval': {
      put(new THREE.CylinderGeometry(0.292, 0.28, 0.09, 22, 1, true), S('gold'), H, M([0, 1.64, -0.01]));
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2,
          x = Math.sin(a) * 0.288,
          z = Math.cos(a) * 0.288 - 0.01;
        put(new THREE.ConeGeometry(0.04, 0.1, 6), S('gold'), H, M([x, 1.73, z]));
        put(
          SPH_LO,
          S((['red', 'jade', 'blue'] as const)[i % 3]),
          H,
          M([Math.sin(a) * 0.296, 1.64, Math.cos(a) * 0.296 - 0.01], 0.024),
        );
      }
      const cols = ['purple', 'blue', 'green', 'yellow', 'red', 'pink', 'purple'] as const;
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.36;
        put(
          SPH,
          S(cols[i]),
          H,
          M(
            [Math.sin(a) * 0.34, 1.82 + Math.cos(a) * 0.17, -0.2],
            [0.075, 0.25 - Math.abs(i - 3) * 0.015, 0.016],
            [-0.22, 0, -a],
          ),
        );
      }
      for (let i = 0; i < 6; i++) {
        const a = (i - 2.5) * 0.4;
        put(
          SPH_LO,
          S(cols[(i + 3) % 7]),
          H,
          M([Math.sin(a) * 0.3, 1.76 + Math.cos(a) * 0.1, -0.15], [0.055, 0.15, 0.014], [-0.12, 0, -a]),
        );
      }
      break;
    }
  }
}

function accessory(add: Add, c: AvatarConfig) {
  const C = B.chest;
  switch (c.acc) {
    case 'mochila':
      add(new RoundedBoxGeometry(0.33, 0.4, 0.17, 3, 0.07), S('acc'), C, M([0, 1.0, -0.23]));
      add(new RoundedBoxGeometry(0.24, 0.17, 0.07, 2, 0.03), S('acc2'), C, M([0, 0.92, -0.325]));
      add(new THREE.TorusGeometry(0.045, 0.014, 6, 12, Math.PI), S('acc2'), C, M([0, 1.2, -0.215]));
      add(SPH_LO, S('gold'), C, M([0, 0.985, -0.36], [0.02, 0.012, 0.01]));
      break;
    case 'collar_jade': {
      const o = c.shirt === 'blusa_tipica' ? 0.055 : 0;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2,
          f = 0.5 + 0.5 * Math.cos(a);
        add(
          SPH_LO,
          S(i % 4 === 0 ? 'gold' : 'jade'),
          C,
          M(
            [
              Math.sin(a) * (0.12 + (0.035 + o) * f),
              1.182 - (0.085 + o * 0.4) * f,
              -0.02 + Math.cos(a) * 0.105 + (0.09 + o * 1.3) * f,
            ],
            0.023,
          ),
        );
      }
      add(SPH, S('jade'), C, M([0, 1.045 - o * 0.5, 0.178 + o * 1.3], [0.038, 0.048, 0.022]));
      add(SPH_LO, S('gold'), C, M([0, 1.088 - o * 0.5, 0.176 + o * 1.3], 0.015));
      break;
    }
    case 'guitarra': {
      const G = M([0.02, 0.98, -0.235], 1, [0, 0, 0.62]),
        put: Add = (g, r, w, m) => add(g, r, w, G.clone().multiply(m!));
      const disc = (r: number) => new THREE.CylinderGeometry(r, r, 0.075, 20);
      put(disc(0.155), S('wood'), C, M([0, -0.1, 0], 1, [Math.PI / 2, 0, 0]));
      put(disc(0.118), S('wood'), C, M([0, 0.085, 0], 1, [Math.PI / 2, 0, 0]));
      put(
        new THREE.CylinderGeometry(0.045, 0.045, 0.006, 14),
        S('black'),
        C,
        M([0, 0.0, -0.039], 1, [Math.PI / 2, 0, 0]),
      );
      put(new RoundedBoxGeometry(0.1, 0.022, 0.016, 1, 0.005), S('black'), C, M([0, -0.14, -0.042]));
      put(new RoundedBoxGeometry(0.042, 0.36, 0.028, 1, 0.008), S('leather'), C, M([0, 0.37, -0.02]));
      put(new RoundedBoxGeometry(0.062, 0.1, 0.026, 1, 0.01), S('black'), C, M([0, 0.59, -0.02]));
      for (const s of [-1, 1])
        for (let i = 0; i < 3; i++) put(SPH_LO, S('gold'), C, M([s * 0.04, 0.56 + i * 0.03, -0.02], 0.01));
      break;
    }
    case 'tambor_garifuna': {
      const G = M([0.03, 0.86, 0.235], 1, [-0.5, 0, 0.12]),
        put: Add = (g, r, w, m) => add(g, r, w, m ? G.clone().multiply(m) : G),
        w: WFn = () => [B.hips, 0.5, B.chest, 0.5];
      put(
        lathe(
          [
            [0.002, -0.13],
            [0.1, -0.13],
            [0.12, -0.12],
            [0.148, 0.0],
            [0.152, 0.1],
            [0.146, 0.13],
          ],
          20,
        ),
        R.patB1,
        w,
      );
      put(new THREE.CylinderGeometry(0.15, 0.15, 0.014, 20), S('drum'), w, M([0, 0.137, 0]));
      put(new THREE.TorusGeometry(0.15, 0.013, 6, 22), S('red'), w, M([0, 0.128, 0], 1, [Math.PI / 2, 0, 0]));
      break;
    }
    case 'panuelo_cuello':
      add(
        new THREE.TorusGeometry(0.085, 0.024, 6, 16),
        S('red'),
        C,
        M([0, 1.165, 0.005], [1, 1, 0.95], [Math.PI / 2 + 0.25, 0, 0]),
      );
      add(
        new THREE.ConeGeometry(0.075, 0.13, 4),
        S('red'),
        C,
        M([0, 1.09, 0.13], [1, 1, 0.3], [Math.PI - 0.25, Math.PI / 4, 0]),
      );
      break;
    case 'guantes_portero':
      for (const s of [-1, 1]) {
        const f = s > 0 ? B.foreL : B.foreR;
        add(SPH, S('acc'), f, M([s * 0.262, 0.63, 0.008], [0.078, 0.095, 0.085]));
        add(
          lathe(
            [
              [0.06, 0.69],
              [0.07, 0.7],
              [0.07, 0.74],
              [0.06, 0.75],
            ],
            12,
          ),
          S('acc2'),
          f,
          M([s * 0.262, 0, 0.006]),
        );
      }
      break;
    case 'pectoral_jade': {
      const o = c.body === 'm' ? 0.01 : 0;
      add(
        lathe(
          [
            [0.27, 1.02],
            [0.275, 1.035],
            [0.2, 1.13],
            [0.1, 1.19],
            [0.085, 1.2],
          ],
          26,
        ),
        S('jade'),
        C,
        M([0, 0, 0.012 + o], [1, 1, 0.82]),
      );
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        add(
          SPH_LO,
          S(i % 3 ? 'jade' : 'gold'),
          C,
          M([Math.sin(a) * 0.24, 1.055 + (1 - Math.cos(a)) * 0.02, Math.cos(a) * 0.2 + 0.01 + o], 0.024),
        );
      }
      add(SPH, S('gold'), C, M([0, 1.03, 0.2 + o], [0.06, 0.06, 0.02]));
      add(SPH, S('jade'), C, M([0, 1.03, 0.212 + o], [0.035, 0.035, 0.015]));
      break;
    }
    case 'codice':
      add(new RoundedBoxGeometry(0.06, 0.16, 0.13, 1, 0.01), S('drum'), B.foreR, M([-0.3, 0.64, 0.05]));
      add(new RoundedBoxGeometry(0.064, 0.165, 0.02, 1, 0.006), S('red'), B.foreR, M([-0.3, 0.64, 0.12]));
      break;
    case 'capa_bandera': {
      const nx = 6,
        ny = 9,
        pos: number[] = [],
        uv: number[] = [],
        idx: number[] = [];
      for (let i = 0; i <= ny; i++)
        for (let j = 0; j <= nx; j++) {
          const t = i / ny,
            u = j / nx,
            w = 0.48 + 0.2 * t,
            x = (u - 0.5) * w,
            wrap = (1 - sm(0, 0.35, t)) * 0.16 * (2 * u - 1) ** 2;
          pos.push(
            x * (1 - wrap * 0.6),
            1.165 - t * 0.695,
            -0.14 - 0.075 * sm(0, 0.5, t) + wrap - 0.02 * Math.sin(u * Math.PI * 3) * t,
          );
          uv.push(1 - u, 1 - t);
        }
      for (let i = 0; i < ny; i++)
        for (let j = 0; j < nx; j++) {
          const a = i * (nx + 1) + j,
            b = a + 1,
            cc = a + nx + 1,
            d = cc + 1;
          idx.push(a, b, d, a, d, cc);
        }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      g.computeVertexNormals();
      add(g, R.cape, wCape);
      add(inverted(g), R.cape, wCape);
      add(
        lathe(
          [
            [0.085, 1.15],
            [0.108, 1.165],
            [0.1, 1.19],
            [0.075, 1.2],
          ],
          14,
        ),
        S('blue'),
        C,
      );
      add(SPH_LO, S('gold'), C, M([0, 1.165, 0.105], 0.022));
      break;
    }
  }
}

export const styleKey = (c: AvatarConfig) =>
  [
    c.body ?? 'h',
    c.hair,
    c.hat,
    c.acc,
    cut(c),
    c.pants === 'pantalon_manta' || (cut(c) === 'pants' && c.pants.startsWith('falda')) ? c.pants : '',
    c.shirt === 'blusa_tipica' ? 'b' : '',
    c.face === 'cara_lentes' ? 'l' : '',
  ].join('|');
const cache = new Map<string, THREE.BufferGeometry>();
/** geometría con huesos del avatar, cacheada por estilo (cabello, sombrero, accesorio, tipo de prenda) */
export function avatarGeometry(c: AvatarConfig): THREE.BufferGeometry {
  const key = styleKey(c);
  let g = cache.get(key);
  if (g) return g;
  const b = new SkinBuilder(),
    add: Add = (geo, rect, w, m) => {
      b.add(geo, rect, w, m);
    };
  body(add, c);
  hair(add, c);
  hats(add, c);
  accessory(add, c);
  g = b.build();
  cache.set(key, g);
  return g;
}
