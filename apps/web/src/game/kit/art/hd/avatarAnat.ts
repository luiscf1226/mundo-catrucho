// Anatomía del avatar HD en medidas reales (metros; pies en y = 0, mira a +Z): cabeza esculpida con ojos, párpados,
// orejas y relieve de cara, cuello, manos con dedos, zapatos y peinados con forma. Estas piezas van directo a su sitio
// (sin la deformación de proporciones de avatarGeo.ts). El atlas pinta la cara en la proyección frontal de la cabeza.
import * as THREE from 'three';
import type { V3 } from '../../../../core/types';
import { B } from './avatarGeo';
import { inverted, loft, type Rect, type WFn } from './skin';

export type AddN = (g: THREE.BufferGeometry, rect: Rect, w: WFn | number, m?: THREE.Matrix4) => void;

/** centro y semiejes de la cabeza (sin pelo) */
export const HC: V3 = [0, 1.588, 0.008],
  HA: V3 = [0.077, 0.112, 0.097];
/** cuánto bajó la cabeza respecto a las medidas con que se escribieron cola y trenzas */
const DY = HC[1] - 1.6;
/** ojo en coordenadas de la esfera unitaria de la cara (sx, sy) y radio del globo */
export const EYE = { x: 0.4, y: 0.06, r: 0.0118 };
/** rincón del atlas (dentro de la región de la cara, fuera del disco que usa la cara) con el iris pintado */
export const EYE_RECT: Rect = [3, 3, 30, 30];

const sm = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const g2 = (x: number, y: number, cx: number, cy: number, sx: number, sy: number) =>
  Math.exp(-0.5 * (((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
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
let SPH: THREE.SphereGeometry | null = null;
const sph = () => (SPH ??= new THREE.SphereGeometry(1, 10, 7));

/** rasgos de la persona que se está construyendo: cada piel y cuerpo da una cara un poco distinta */
const F = { nose: 1, noseW: 1, jaw: 0.5, chin: 1, lips: 1, cheek: 1, brow: 1 };
/** elige los rasgos (semilla estable) antes de construir cabeza, pelo y adornos */
export function setFace(fem: boolean, seed: number) {
  let a = seed >>> 0;
  const r = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  F.nose = (fem ? 0.78 : 0.95) + r() * 0.25;
  F.noseW = (fem ? 0.85 : 0.95) + r() * 0.35;
  F.jaw = fem ? r() * 0.4 : 0.35 + r() * 0.65;
  F.chin = 0.75 + r() * 0.5;
  F.lips = (fem ? 1.15 : 0.85) + r() * 0.4;
  F.cheek = 0.7 + r() * 0.7;
  F.brow = fem ? 0.5 : 0.8 + r() * 0.5;
}
/** relieve de la cara (m hacia adelante) en coordenadas de la esfera unitaria */
function relief(sx: number, sy: number) {
  const ax = Math.abs(sx);
  let d = -0.0105 * g2(ax, sy, EYE.x, EYE.y, 0.2, 0.1); // cuencas de los ojos
  d += 0.0042 * F.brow * g2(ax, sy, 0.36, 0.27, 0.22, 0.065); // arco de las cejas
  d += 0.003 * g2(sx, sy, 0, 0.24, 0.1, 0.08); // entrecejo
  // nariz: tabique que crece hasta la punta y se corta abajo
  const np = sm(0.18, -0.27, sy) * (1 - sm(-0.29, -0.38, sy)),
    nw = (0.05 + 0.05 * sm(0.1, -0.3, sy)) * F.noseW;
  d += 0.022 * F.nose * np * Math.exp(-0.5 * (sx / nw) ** 2);
  d += 0.004 * F.noseW * g2(sx, sy, 0, -0.26, 0.08 * F.noseW, 0.06); // punta
  d += 0.0065 * g2(ax, sy, 0.11 * F.noseW, -0.3, 0.055, 0.05); // aletas
  d += 0.004 * F.cheek * g2(ax, sy, 0.5, -0.08, 0.16, 0.12); // pómulos
  d -= 0.0012 * g2(sx, sy, 0, -0.42, 0.03, 0.04); // surco del labio
  d += 0.0048 * F.lips * g2(sx, sy, 0, -0.49, 0.22, 0.05); // labio de arriba
  d += 0.0055 * F.lips * g2(sx, sy, 0, -0.6, 0.18, 0.045); // labio de abajo
  d -= 0.003 * g2(sx, sy, 0, -0.545, 0.25, 0.025); // línea de la boca
  d -= 0.0025 * g2(ax, sy, 0.27, -0.55, 0.04, 0.04); // comisuras
  d -= 0.002 * g2(sx, sy, 0, -0.69, 0.14, 0.03); // hoyo bajo el labio
  d += 0.006 * F.chin * g2(sx, sy, 0, -0.8, 0.22, 0.1); // mentón
  return d;
}
/** punto de la piel de la cabeza (relativo a HC) para la dirección (sx, sy, sz) de la esfera unitaria */
export function headPoint(sx: number, sy: number, sz: number, _fem: boolean, feat = 1, out = new THREE.Vector3()) {
  const front = sm(-0.2, 0.7, sz);
  let ax = HA[0],
    az = HA[2];
  ax *= 1 - (0.3 - 0.16 * F.jaw) * sm(-0.1, -0.95, sy) * (0.45 + 0.55 * front); // mandíbula
  ax *= 1 - 0.05 * sm(0.15, 0.55, sy) * sm(0.2, 0.8, sz); // sienes
  ax *= 1 + 0.09 * Math.sin(Math.max(0, sy) * Math.PI) * (1 - 0.6 * front); // cráneo ancho arriba
  if (sz < 0) az *= 1.05 - 0.22 * sm(-0.3, -1, sy); // occipital y nuca
  const y = sy * HA[1] * (sy < 0 ? 1 + 0.03 * sm(0.1, 0.7, sz) : 1 - 0.05 * sm(0.6, 1, sy));
  let z = sz * az;
  if (sz > 0) z -= az * 0.08 * sz ** 4;
  if (feat && sz > 0.2) z += relief(sx, sy) * sm(0.2, 0.65, sz) * feat;
  return out.set(sx * ax, y, z);
}
/** normal aproximada (del elipsoide) para separar pelo y adornos de la piel */
const nE = (sx: number, sy: number, sz: number, out = new THREE.Vector3()) =>
  out.set(sx / HA[0], sy / HA[1], sz / HA[2]).normalize();

/** reparte n + 1 valores entre a y b con más densidad donde `dens` es grande */
function spread(n: number, a: number, b: number, dens: (x: number) => number) {
  const K = 480,
    cum = [0];
  for (let i = 1; i <= K; i++) cum.push(cum[i - 1] + dens(a + ((b - a) * (i - 0.5)) / K));
  const out: number[] = [];
  let j = 0;
  for (let i = 0; i <= n; i++) {
    const t = (cum[K] * i) / n;
    while (j < K - 1 && cum[j + 1] < t) j++;
    const f = Math.min(1, (t - cum[j]) / (cum[j + 1] - cum[j] || 1));
    out.push(a + ((b - a) * (j + f)) / K);
  }
  return out;
}
function grid(
  lats: number[],
  lons: number[],
  fn: (sx: number, sy: number, sz: number, th: number, out: THREE.Vector3) => void,
  uvf: (sx: number, sy: number, th: number) => [number, number],
) {
  const pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    v = new THREE.Vector3();
  for (const ph of lats)
    for (const th of lons) {
      const sx = Math.sin(ph) * Math.sin(th),
        sy = Math.cos(ph),
        sz = Math.sin(ph) * Math.cos(th);
      fn(sx, sy, sz, th, v);
      pos.push(v.x, v.y, v.z);
      uv.push(...uvf(sx, sy, th));
    }
  const nl = lons.length;
  for (let i = 0; i < lats.length - 1; i++)
    for (let j = 0; j < nl - 1; j++) {
      const a = i * nl + j,
        b = a + 1,
        c = a + nl,
        d = c + 1;
      idx.push(a, c, d, a, d, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** iguala las normales de dos columnas que comparten posición (costuras) */
function weld(a: THREE.BufferGeometry, ca: number, na: number, b: THREE.BufferGeometry, cb: number, nb: number) {
  const A = a.attributes.normal,
    Bn = b.attributes.normal,
    rows = A.count / na,
    v = new THREE.Vector3();
  for (let i = 0; i < rows; i++) {
    const ia = i * na + ca,
      ib = i * nb + cb;
    v.set(A.getX(ia) + Bn.getX(ib), A.getY(ia) + Bn.getY(ib), A.getZ(ia) + Bn.getZ(ib)).normalize();
    A.setXYZ(ia, v.x, v.y, v.z);
    Bn.setXYZ(ib, v.x, v.y, v.z);
  }
}

/** cabeza esculpida: mitad delantera con la cara del atlas, mitad trasera con la piel lisa */
export function head(add: AddN, fem: boolean, face: Rect, skin: Rect) {
  const lats = spread(46, 0.015, Math.PI - 0.015, (p) => 1 + 2.4 * sm(0.95, 1.2, p) * (1 - sm(2.45, 2.75, p))),
    front = spread(32, -Math.PI / 2, Math.PI / 2, (t) => 1 + 2.6 * Math.exp(-((t / 0.55) ** 2))),
    back = spread(12, Math.PI / 2, Math.PI * 1.5, () => 1);
  const at = (sx: number, sy: number, sz: number, _t: number, o: THREE.Vector3) => {
    headPoint(sx, sy, sz, fem, 1, o);
    o.set(o.x + HC[0], o.y + HC[1], o.z + HC[2]);
  };
  const gf = grid(lats, front, at, (sx, sy) => [0.5 + sx * 0.5, 0.5 + sy * 0.5]),
    gb = grid(lats, back, at, () => [0.5, 0.5]);
  weld(gf, front.length - 1, front.length, gb, 0, back.length);
  weld(gf, 0, front.length, gb, back.length - 1, back.length);
  add(gf, face, B.head);
  add(gb, skin, B.head);
}

/** centro del globo del ojo (s = 1 izquierdo del muñeco, en +x) */
export function eyeCenter(s: number, fem: boolean): V3 {
  const sx = s * EYE.x,
    sy = EYE.y,
    p = headPoint(sx, sy, Math.sqrt(1 - sx * sx - sy * sy), fem, 0);
  return [HC[0] + p.x * 0.97, HC[1] + p.y, HC[2] + p.z - (EYE.r + 0.0012)];
}
function eyeball() {
  const g = new THREE.SphereGeometry(EYE.r, 18, 12),
    P = g.attributes.position,
    U = g.attributes.uv;
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i) / EYE.r,
      y = P.getY(i) / EYE.r,
      z = P.getZ(i);
    if (z > 0) U.setXY(i, 0.5 + x * 0.5, 0.5 + y * 0.5);
    else U.setXY(i, 0.5 + Math.sign(x || 1) * 0.48, 0.5);
  }
  return g;
}
/** casquete de párpado frente al ojo: de `t0` a `t1` radianes desde arriba */
const lidCap = (r: number, t0: number, t1: number, half = 1.85) =>
  new THREE.SphereGeometry(r, 18, 6, Math.PI / 2 - half, half * 2, t0, t1 - t0);

/** ojos con globo, párpados fijos y el párpado que parpadea (hueso `lid`, gira sobre la línea de los ojos) */
export function eyes(add: AddN, fem: boolean, closed: [boolean, boolean], lid: Rect) {
  for (const s of [-1, 1]) {
    const c = eyeCenter(s, fem),
      shut = closed[s > 0 ? 1 : 0];
    if (!shut) add(eyeball(), EYE_RECT, B.head, M(c));
    if (!shut) add(lidCap(EYE.r * 1.1, 0, 1.24), lid, B.head, M(c, 1, [0.12, 0, 0]));
    add(lidCap(EYE.r * 1.08, Math.PI - 1.02, Math.PI, 1.7), lid, B.head, M(c));
    if (shut) add(lidCap(EYE.r * 1.09, 0, 2.3), lid, B.head, M(c, 1, [0.05, 0, 0]));
    else add(lidCap(EYE.r * 1.05, 0, 2.25), lid, B.lid, M(c));
  }
}
/** posición del hueso del párpado: sobre la línea que une los centros de los ojos */
export const lidPivot = (fem: boolean): V3 => {
  const c = eyeCenter(1, fem);
  return [0, c[1], c[2]];
};

let EAR: THREE.BufferGeometry | null = null;
export function ears(add: AddN, skin: Rect) {
  EAR ??= new THREE.LatheGeometry(
    (
      [
        [0.001, -0.58],
        [0.4, -0.58],
        [0.82, -0.48],
        [1.02, -0.22],
        [1.06, 0.12],
        [0.98, 0.3],
        [0.86, 0.18],
        [0.6, -0.08],
        [0.3, -0.2],
        [0.001, -0.26],
      ] as const
    ).map(([r, y]) => new THREE.Vector2(r, y)),
    16,
  );
  for (const s of [-1, 1])
    add(
      EAR,
      skin,
      B.head,
      new THREE.Matrix4()
        .makeTranslation(s * 0.078, HC[1] - 0.008, HC[2] - 0.016)
        .multiply(new THREE.Matrix4().makeRotationY(-s * 0.25))
        .multiply(new THREE.Matrix4().makeRotationZ(-s * (Math.PI / 2)))
        .multiply(new THREE.Matrix4().makeScale(0.028, 0.016, 0.0155)),
    );
}

export function neck(add: AddN, fem: boolean, skin: Rect) {
  const k = fem ? 0.86 : 1;
  add(
    loft(
      [
        { y: 1.36, rx: 0.062 * k, rz: 0.064 * k, cz: -0.004 },
        { y: 1.42, rx: 0.056 * k, rz: 0.058 * k, cz: -0.002 },
        { y: 1.46, rx: 0.049 * k, rz: 0.053 * k, cz: -0.004 },
        { y: 1.52, rx: 0.047 * k, rz: 0.052 * k, cz: -0.012 },
        { y: 1.58, rx: 0.042 * k, rz: 0.046 * k, cz: -0.02 },
      ],
      14,
    ),
    skin,
    (_x, y) => {
      const t = sm(1.44, 1.54, y);
      return [B.chest, 1 - t, B.head, t];
    },
  );
}

/** mano relajada con palma, cuatro dedos un poco doblados y pulgar (s = 1 mano izquierda, en +x) */
export function hand(add: AddN, s: number, fem: boolean, wrist: V3, skin: Rect) {
  const f = s > 0 ? B.foreL : B.foreR,
    k = fem ? 0.9 : 1,
    base = M(wrist, [s * k, k, k], [0, 0, s * 0.04]);
  const put = (g: THREE.BufferGeometry, m: THREE.Matrix4) => add(g, skin, f, base.clone().multiply(m));
  put(sph(), M([0.001, -0.006, 0], [0.02, 0.028, 0.026]));
  put(sph(), M([0, -0.05, 0.002], [0.016, 0.05, 0.041]));
  put(sph(), M([-0.004, -0.05, 0.026], [0.013, 0.032, 0.016])); // base del pulgar
  const fz = [0.027, 0.009, -0.009, -0.026],
    fl = [0.068, 0.076, 0.071, 0.056],
    fr = [0.0082, 0.0086, 0.0081, 0.0072],
    spreadA = [0.06, 0.02, -0.02, -0.07];
  for (let i = 0; i < 4; i++) {
    const r = fr[i],
      L = fl[i],
      l1 = L * 0.55,
      l2 = L * 0.45,
      a1 = -0.28 - i * 0.04,
      a2 = a1 - 0.45 - i * 0.05;
    const j0 = new THREE.Vector3(-0.002, -0.094, fz[i]),
      d1 = new THREE.Vector3(Math.sin(a1), -Math.cos(a1), spreadA[i]).normalize(),
      j1 = j0.clone().addScaledVector(d1, l1),
      d2 = new THREE.Vector3(Math.sin(a2), -Math.cos(a2), spreadA[i] * 1.2).normalize();
    for (const [p, d, l, rr] of [
      [j0, d1, l1, r],
      [j1, d2, l2, r * 0.9],
    ] as const) {
      const c = p.clone().addScaledVector(d, l / 2),
        q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
      put(
        new THREE.CapsuleGeometry(rr, Math.max(0.001, l - rr), 3, 7),
        new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 0.92)),
      );
    }
  }
  // pulgar: sale de la base hacia adelante y abajo, doblado hacia la palma
  const t0 = new THREE.Vector3(-0.008, -0.05, 0.038),
    d1 = new THREE.Vector3(-0.25, -0.75, 0.6).normalize(),
    t1 = t0.clone().addScaledVector(d1, 0.032),
    d2 = new THREE.Vector3(-0.45, -0.85, 0.3).normalize();
  for (const [p, d, l, rr] of [
    [t0, d1, 0.032, 0.0098],
    [t1, d2, 0.028, 0.0088],
  ] as const) {
    const c = p.clone().addScaledVector(d, l / 2),
      q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
    put(new THREE.CapsuleGeometry(rr, l - rr, 3, 7), new THREE.Matrix4().compose(c, q, new THREE.Vector3(1, 1, 1)));
  }
}

/** zapato (empeine redondeado, punta, talón) o su suela; medidas desde el tobillo hacia adelante */
function shoeGeo(sole: boolean, boot: boolean) {
  const g = new THREE.SphereGeometry(1, 20, 12),
    P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const ux = P.getX(i),
      uy = P.getY(i),
      uz = P.getZ(i),
      t = (uz + 1) / 2,
      w = (0.033 + 0.016 * sm(0.15, 0.68, t) - 0.006 * sm(0.86, 1, t)) * (sole ? 1.07 : 1),
      h = (boot ? 0.13 : 0.084) - (boot ? 0.085 : 0.04) * sm(0.25, 0.85, t),
      z = -0.064 + t * 0.268;
    if (sole) P.setXYZ(i, ux * w, 0.012 + uy * (uy > 0 ? 0.01 : 0.012), z * 1.02 - 0.002);
    else P.setXYZ(i, ux * w, 0.02 + (uy > 0 ? uy * h : uy * 0.012), z);
  }
  g.computeVertexNormals();
  return g;
}
let SHOES: Record<string, THREE.BufferGeometry> = {};
export function shoes(add: AddN, ankle: V3, shoe: Rect, sole: Rect, boot = false) {
  const k = boot ? 'b' : 'z';
  SHOES[k] ??= shoeGeo(false, boot);
  SHOES.s ??= shoeGeo(true, false);
  for (const s of [-1, 1]) {
    const f = s > 0 ? B.footL : B.footR,
      m = M([s * (ankle[0] + 0.004), 0, 0], 1, [0, s * 0.1, 0]);
    add(SHOES[k], shoe, f, m);
    add(SHOES.s, sole, f, m);
  }
}
/** para pruebas en caliente: vuelve a construir las piezas cacheadas */
export function resetAnat() {
  SHOES = {};
  EAR = null;
}

// ---------------------------------------------------------------- pelo
/** borde del nacimiento del pelo: altura (sy) mínima para cada ángulo |θ| desde el frente */
export type Line = [number, number][];
const LINE_CORTO: Line = [
  [0, 0.56],
  [0.5, 0.5],
  [0.85, 0.4],
  [1.05, 0.05],
  [1.17, -0.2],
  [1.3, -0.16],
  [1.42, 0.3],
  [1.72, 0.3],
  [1.92, -0.25],
  [2.4, -0.48],
  [Math.PI + 0.01, -0.56],
];
const LINE_LARGO: Line = [
  [0, 0.58],
  [0.5, 0.5],
  [0.85, 0.36],
  [1.1, -0.1],
  [1.4, -0.45],
  [2.0, -0.6],
  [Math.PI + 0.01, -0.62],
];
export const LINE_AFRO: Line = [
  [0, 0.52],
  [0.6, 0.44],
  [1.0, 0.25],
  [1.2, -0.05],
  [1.42, 0.22],
  [1.72, 0.22],
  [1.95, -0.3],
  [Math.PI + 0.01, -0.55],
];
/** nacimiento del pelo de cada peinado (para pintar la sombra del pelo en la frente); null = calvo */
export const hairline = (style: string): Line | null =>
  style === 'calvo' ? null : style === 'pelo_largo' ? LINE_LARGO : style === 'pelo_afro' ? LINE_AFRO : LINE_CORTO;
export const lineAt = (L: Line, th: number) => {
  const a = Math.abs(th);
  for (let i = 1; i < L.length; i++)
    if (a <= L[i][0]) {
      const t = (a - L[i - 1][0]) / (L[i][0] - L[i - 1][0]),
        u = t * t * (3 - 2 * t);
      return L[i - 1][1] + (L[i][1] - L[i - 1][1]) * u;
    }
  return L[L.length - 1][1];
};
interface Shell {
  line: Line;
  /** grosor en metros (antes de recortar por sombrero) */
  thick: (sx: number, sy: number, sz: number, th: number) => number;
  lat?: number;
  lon?: number;
}
/** casco de pelo sobre el cuero cabelludo: el borde se mete bajo la piel, así el nacimiento queda limpio */
function shell(add: AddN, fem: boolean, hat: boolean, o: Shell, rect: Rect) {
  const NL = o.lat ?? 44,
    NO = o.lon ?? 64,
    lats = Array.from({ length: NL + 1 }, (_, i) => 0.02 + ((Math.PI * 0.86 - 0.02) * i) / NL),
    lons = Array.from({ length: NO + 1 }, (_, j) => -Math.PI + (2 * Math.PI * j) / NO),
    margin: number[] = [];
  const n = new THREE.Vector3();
  const g = grid(
    lats,
    lons,
    (sx, sy, sz, th, out) => {
      const m = sy - lineAt(o.line, th);
      margin.push(m);
      let t = o.thick(sx, sy, sz, th);
      if (hat) t = t + (Math.min(t, 0.006) - t) * sm(0.3, 0.42, sy);
      t = -0.004 + (t + 0.004) * sm(-0.05, 0.16, m);
      headPoint(sx, sy, sz, fem, 1, out);
      nE(sx, sy, sz, n);
      out.set(out.x + n.x * t + HC[0], out.y + n.y * t + HC[1], out.z + n.z * t + HC[2]);
    },
    (_sx, sy, th) => [0.5 + th / (Math.PI * 2), 0.5 + sy * 0.5],
  );
  weld(g, 0, lons.length, g, lons.length - 1, lons.length);
  // fuera los triángulos que quedan completos bajo la piel
  const I = g.index as THREE.BufferAttribute,
    keep: number[] = [];
  for (let i = 0; i < I.count; i += 3) {
    const a = I.getX(i),
      b = I.getX(i + 1),
      c = I.getX(i + 2);
    if (Math.max(margin[a], margin[b], margin[c]) > -0.045) keep.push(a, b, c);
  }
  g.setIndex(keep);
  add(g, rect, B.head);
}
const noise3 = (x: number, y: number, z: number, f: number, s = 0) =>
  Math.sin(x * f + 1.3 + s) * Math.sin(y * f * 0.93 + 0.7 + s * 2) * Math.sin(z * f * 1.07 + 2.1 - s);

/** el torso como elipses por altura, para que el pelo largo y las trenzas caigan por fuera */
function pushOut(p: THREE.Vector3, pad: number) {
  const y = p.y,
    sh = sm(1.44, 1.52, y),
    rx = (y > 1.24 ? 0.25 : 0.19) * (1 - sh) + 0.07 * sh + pad,
    rz = 0.13 * (1 - sh) + 0.068 * sh + pad,
    cz = -0.008,
    e = Math.hypot(p.x / rx, (p.z - cz) / rz);
  if (y < 1.56 && e < 1) {
    p.x /= e;
    p.z = cz + (p.z - cz) / e;
  }
}
/** igual que pushOut, pero solo hacia atrás (el pelo largo cae sobre la espalda, no se abre a los lados) */
function pushBack(p: THREE.Vector3, pad: number) {
  const y = p.y,
    sh = sm(1.42, 1.5, y),
    rx = 0.19 * (1 - sh) + 0.065 * sh + pad,
    rz = 0.13 * (1 - sh) + 0.066 * sh + pad,
    cz = -0.008;
  if (y > 1.56 || Math.abs(p.x) >= rx || p.z > cz) return;
  const zs = cz - rz * Math.sqrt(1 - (p.x / rx) ** 2);
  if (p.z > zs) p.z = zs;
}
const wHangN: WFn = (_x, y) => {
  const k = sm(1.4, 1.56, y);
  return [B.head, k, B.chest, 1 - k];
};

/** cortina de pelo largo que cae por la espalda, por fuera de hombros y cuello */
function curtain(add: AddN, rect: Rect, len: number) {
  const NA = 30,
    NY = 18,
    pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    v = new THREE.Vector3();
  for (let i = 0; i <= NY; i++) {
    const t = i / NY,
      amax = 2.3 - 0.95 * sm(0.25, 0.55, t);
    for (let j = 0; j <= NA; j++) {
      const a = -amax + (2 * amax * j) / NA,
        y = HC[1] + 0.06 - t * len + (i === NY ? Math.sin(a * 9) * 0.012 + Math.sin(a * 23) * 0.006 : 0),
        sy = Math.max(-1, Math.min(1, (y - HC[1]) / HA[1])),
        hk = Math.sqrt(Math.max(0, 1 - sy * sy)),
        lo = sm(1.56, 1.36, y),
        rx = Math.max(HA[0] * hk + 0.013, 0.082 + 0.018 * lo),
        rz = Math.max(HA[2] * 1.04 * hk + 0.014, 0.098 + 0.035 * lo);
      v.set(Math.sin(a) * rx, y, HC[2] - Math.cos(a) * rz);
      pushBack(v, 0.012);
      pos.push(v.x, v.y, v.z);
      uv.push(j / NA, 1 - t);
    }
  }
  for (let i = 0; i < NY; i++)
    for (let j = 0; j < NA; j++) {
      const a = i * (NA + 1) + j,
        b = a + 1,
        c = a + NA + 1,
        d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  add(g, rect, wHangN);
  add(inverted(g), rect, wHangN);
}
/** trenza: un tubo que baja por delante del hombro con los cruces marcados (el radio late a lo largo) */
function braid(add: AddN, s: number, rect: Rect, tie: Rect) {
  const pts = [
    [0.07, 1.6, -0.05],
    [0.088, 1.53, -0.035],
    [0.104, 1.46, 0.0],
    [0.112, 1.39, 0.06],
    [0.11, 1.31, 0.1],
    [0.104, 1.23, 0.11],
  ].map(([x, y, z]) => {
    const p = new THREE.Vector3(s * x, y + DY, z);
    pushOut(p, 0.02);
    return p;
  });
  const cur = new THREE.CatmullRomCurve3(pts),
    NS = 56,
    NR = 8,
    g = new THREE.TubeGeometry(cur, NS, 0.014, NR, false),
    P = g.attributes.position,
    c = new THREE.Vector3();
  for (let i = 0; i <= NS; i++) {
    const t = i / NS;
    cur.getPointAt(t, c);
    for (let j = 0; j <= NR; j++) {
      const k = i * (NR + 1) + j,
        a = (j / NR) * Math.PI * 2,
        lobe = 0.8 + 0.28 * Math.abs(Math.sin(t * Math.PI * 14 + (Math.cos(a) > 0 ? 0 : Math.PI / 2))),
        f = lobe * (1 - 0.3 * t) * (i === 0 || i === NS ? 0.4 : 1);
      P.setXYZ(k, c.x + (P.getX(k) - c.x) * f, c.y + (P.getY(k) - c.y) * f, c.z + (P.getZ(k) - c.z) * f);
    }
  }
  g.computeVertexNormals();
  add(g, rect, wHangN);
  const end = cur.getPointAt(1);
  add(sph(), tie, wHangN, M([end.x, end.y - 0.004, end.z], [0.011, 0.007, 0.011]));
  add(sph(), rect, wHangN, M([end.x, end.y - 0.022, end.z + 0.003], [0.01, 0.02, 0.01]));
}

/** peinados: casco de pelo + cortina, cola o trenzas */
export function hair(add: AddN, style: string, fem: boolean, hat: boolean, rect: Rect, tie: Rect) {
  const front = (th: number, sy: number) => Math.exp(-((th / 0.6) ** 2)) * sm(0.35, 0.65, sy);
  const side = (th: number) => sm(0.8, 1.2, Math.abs(th)) * (1 - sm(2.0, 2.5, Math.abs(th)));
  switch (style) {
    case 'calvo':
      return;
    case 'pelo_corto':
      shell(
        add,
        fem,
        hat,
        {
          line: LINE_CORTO,
          thick: (sx, sy, sz, th) =>
            (0.007 + 0.007 * sm(0.2, 0.95, sy) + 0.003 * front(th, sy)) * (1 - 0.45 * side(th)) +
            0.0018 * noise3(sx, sy, sz, 40) +
            0.001 * noise3(sx, sy, sz, 90, 1),
        },
        rect,
      );
      return;
    case 'pelo_rizado':
      shell(
        add,
        fem,
        hat,
        {
          line: LINE_CORTO,
          lat: 52,
          lon: 80,
          thick: (sx, sy, sz) =>
            (0.017 + 0.012 * sm(0.1, 1, sy)) * (1 + 0.42 * noise3(sx, sy, sz, 24) + 0.2 * noise3(sx, sy, sz, 47, 1)),
        },
        rect,
      );
      return;
    case 'pelo_afro':
      shell(
        add,
        fem,
        hat,
        {
          line: LINE_AFRO,
          lat: 52,
          lon: 80,
          thick: (sx, sy, sz) =>
            (0.036 + 0.026 * sm(-0.2, 0.9, sy)) *
            (hat ? 0.55 : 1) *
            (1 + 0.16 * noise3(sx, sy, sz, 30) + 0.1 * noise3(sx, sy, sz, 61, 2)),
        },
        rect,
      );
      return;
    case 'pelo_largo':
      shell(
        add,
        fem,
        hat,
        {
          line: LINE_LARGO,
          thick: (sx, sy, sz, th) =>
            0.009 +
            0.007 * sm(0.3, 1, sy) -
            0.006 * Math.exp(-(((th - 0.4) / 0.06) ** 2)) * sm(0.4, 0.7, sy) +
            0.0012 * noise3(sx, sy, sz, 50),
        },
        rect,
      );
      curtain(add, rect, fem ? 0.44 : 0.36);
      return;
    case 'pelo_coleta':
      shell(add, fem, hat, { line: LINE_CORTO, thick: (_x, sy) => 0.005 + 0.003 * sm(0.4, 1, sy) }, rect);
      add(new THREE.TorusGeometry(0.02, 0.0065, 6, 14), tie, B.head, M([0, 1.655 + DY, -0.104], 1, [1.0, 0, 0]));
      add(
        loft(
          [
            { y: 1.37 + DY, rx: 0.004, cz: -0.14 },
            { y: 1.39 + DY, rx: 0.013, cz: -0.142 },
            { y: 1.44 + DY, rx: 0.024, cz: -0.144 },
            { y: 1.51 + DY, rx: 0.031, rz: 0.028, cz: -0.141 },
            { y: 1.58 + DY, rx: 0.033, rz: 0.03, cz: -0.133 },
            { y: 1.63 + DY, rx: 0.027, rz: 0.024, cz: -0.12 },
            { y: 1.655 + DY, rx: 0.02, rz: 0.018, cz: -0.106 },
            { y: 1.665 + DY, rx: 0.004, cz: -0.1 },
          ],
          12,
        ),
        rect,
        B.tail,
      );
      return;
    case 'pelo_trenzas':
      shell(
        add,
        fem,
        hat,
        {
          line: LINE_CORTO,
          thick: (_x, sy, _z, th) =>
            0.005 + 0.003 * sm(0.4, 1, sy) - 0.003 * Math.exp(-((th / 0.05) ** 2)) * sm(0.3, 0.6, sy),
        },
        rect,
      );
      for (const s of [-1, 1]) braid(add, s, rect, tie);
      return;
  }
}
/** posición del hueso de la cola de caballo */
export const TAIL: V3 = [0, 1.655 + DY, -0.1];

/** bigote: mechones finos que bajan por las comisuras */
export function mustache(add: AddN, fem: boolean, rect: Rect) {
  const n = new THREE.Vector3(),
    p = new THREE.Vector3();
  for (let i = -7; i <= 7; i++) {
    const sx = i * 0.04,
      sy = -0.42 - 0.2 * (sx / 0.3) ** 2,
      sz = Math.sqrt(1 - sx * sx - sy * sy);
    headPoint(sx, sy, sz, fem, 1, p);
    nE(sx, sy, sz, n);
    add(
      sph(),
      rect,
      B.head,
      M(
        [HC[0] + p.x + n.x * 0.001, HC[1] + p.y - 0.001, HC[2] + p.z + 0.0008],
        [0.0085, 0.0048 - Math.abs(i) * 0.00016, 0.0018],
        [0.35, 0, -sx * 1.6],
      ),
    );
  }
}
/** lentes oscuros: dos micas curvas, puente y patas hasta las orejas */
export function sunglasses(add: AddN, fem: boolean, lens: Rect, frame: Rect) {
  const lensG = new THREE.SphereGeometry(1, 14, 8, Math.PI / 2 - 0.75, 1.5, Math.PI / 2 - 0.6, 1.2);
  for (const s of [-1, 1]) {
    const c = eyeCenter(s, fem),
      z = c[2] + EYE.r + 0.004;
    add(lensG, lens, B.head, M([c[0] + s * 0.002, c[1] - 0.001, z - 0.03], [0.04, 0.032, 0.032], [0, s * 0.12, 0]));
    add(
      new THREE.BoxGeometry(0.004, 0.004, 0.085),
      frame,
      B.head,
      M([s * 0.074, c[1] + 0.006, z - 0.045], 1, [0, -s * 0.06, 0]),
    );
  }
  const c = eyeCenter(1, fem);
  add(new THREE.BoxGeometry(0.115, 0.0045, 0.006), frame, B.head, M([0, c[1] + 0.012, c[2] + EYE.r + 0.005]));
}
