// Biblioteca de las zonas: piezas estáticas fusionadas por material (pocas llamadas de dibujo), terreno con relieve
// a partir de una función de altura, y utilidades de colocación. Todo usa los materiales del paquete de arte.
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../core/audio';
import { type Collider, phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { V3 } from '../../core/types';
import { art, boxCol, cylCol, type MatKind, useTick } from '../kit';
import type { FloraItem, HillDef } from '../kit/art/types';

export type XZ = [number, number];
export const PI = Math.PI;
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
/** Escalón suave entre a y b (funciona también con a > b). */
export const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export const dist = (x: number, z: number, cx: number, cz: number) => Math.hypot(x - cx, z - cz);
/** Generador pseudoaleatorio con semilla (mismo mundo en cada visita). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Distancia de un punto a una línea quebrada. */
export function distToPath(x: number, z: number, pts: XZ[]) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i],
      [bx_, bz] = pts[i + 1],
      dx = bx_ - ax,
      dz = bz - az,
      l2 = dx * dx + dz * dz || 1;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / l2);
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
/** n puntos repartidos a lo largo de una línea quebrada (para monedas). */
export function alongPath(pts: XZ[], n: number): XZ[] {
  const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1])),
    total = seg.reduce((a, b) => a + b, 0),
    out: XZ[] = [];
  for (let k = 0; k < n; k++) {
    let d = (total * (k + 0.5)) / n,
      i = 0;
    while (i < seg.length - 1 && d > seg[i]) d -= seg[i++];
    const t = seg[i] ? d / seg[i] : 0;
    out.push([pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t]);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Piezas: descripción ligera de una forma con material y color. <Build> las fusiona por (material, color).
export interface Pc {
  g: 'box' | 'cyl' | 'ball' | 'pyr' | 'rock';
  p: V3;
  s: V3;
  m: MatKind;
  c: string /** Euler YXZ */;
  e?: V3;
  rt?: number;
  n?: number;
  solid?: boolean;
  /** no se dibuja con <Build> (la dibuja otro: vegetación o cerro del paquete de arte); sigue contando como colisión */
  hide?: boolean;
  /** planta que dibuja art.Flora en lugar de estas piezas */
  flora?: FloraItem;
  /** cerro que dibuja art.Hills en lugar de estas piezas (centro relativo a p) */
  hill?: HillDef;
  /** emisión: >0 luz cálida que se enciende de noche (ventanas), <0 brillo propio siempre; ≥2 es una lámpara y
   *  además deja un charco de luz en el piso debajo */
  em?: number;
  /** caja sin bordes redondeados (12 triángulos en vez de ~300): para lo que se ve de lejos */
  liso?: boolean;
}
export interface PcOpt {
  /** giro en Y */ r?: number /** Euler [x, y, z] (orden YXZ: primero inclina, luego gira) */;
  e?: V3;
  solid?: boolean /** radio de arriba relativo (cilindro) */;
  rt?: number /** lados */;
  n?: number /** escala [x, y, z] de una bola */;
  s?: V3 /** emisión (ver Pc.em) */;
  em?: number;
}
const eul = (o: PcOpt): V3 | undefined => o.e ?? (o.r ? [0, o.r, 0] : undefined);
/** Caja; (x, y, z) es el centro. Sólida salvo que esté inclinada. */
export const bx = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  m: MatKind,
  c: string,
  o: PcOpt = {},
): Pc => ({ g: 'box', p: [x, y, z], s: [w, h, d], m, c, e: eul(o), solid: o.solid, em: o.em });
/** Cilindro vertical; (x, y, z) es el centro. */
export const cy = (
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  m: MatKind,
  c: string,
  o: PcOpt = {},
): Pc => ({ g: 'cyl', p: [x, y, z], s: [r, h, r], m, c, e: eul(o), rt: o.rt, n: o.n, solid: o.solid, em: o.em });
/** Bola decorativa (sin colisión). */
export const bl = (x: number, y: number, z: number, r: number, m: MatKind, c: string, o: PcOpt = {}): Pc => ({
  g: 'ball',
  p: [x, y, z],
  s: o.s ? [r * o.s[0], r * o.s[1], r * o.s[2]] : [r, r, r],
  m,
  c,
  e: eul(o),
  n: o.n,
  solid: false,
  em: o.em,
});
/** Roca con forma (sin colisión); (x, y, z) es el centro, r el radio y `s` la escala por eje. */
export const rk = (x: number, y: number, z: number, r: number, m: MatKind, c: string, o: PcOpt = {}): Pc => ({
  g: 'rock',
  p: [x, y, z],
  s: o.s ? [r * o.s[0], r * o.s[1], r * o.s[2]] : [r, r, r],
  m,
  c,
  e: eul(o),
  solid: false,
});
/** Pirámide de base rectangular (techos); (x, y, z) es el centro de la BASE. */
export const py = (
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  m: MatKind,
  c: string,
  o: PcOpt = {},
): Pc => ({ g: 'pyr', p: [x, y + h / 2, z], s: [w, h, d], m, c, e: eul(o), solid: o.solid ?? false, em: o.em });
/** Coloca un grupo de piezas definidas en coordenadas locales: gira en Y y traslada. */
export function place(pcs: Pc[], x: number, y: number, z: number, rot = 0): Pc[] {
  const c = Math.cos(rot),
    s = Math.sin(rot);
  return pcs.map((q) => ({
    ...q,
    p: [x + q.p[0] * c + q.p[2] * s, y + q.p[1], z - q.p[0] * s + q.p[2] * c] as V3,
    e: rot || q.e ? ([q.e?.[0] ?? 0, (q.e?.[1] ?? 0) + rot, q.e?.[2] ?? 0] as V3) : undefined,
    flora: q.flora && {
      ...q.flora,
      p: [x + q.flora.p[0] * c + q.flora.p[2] * s, y + q.flora.p[1], z - q.flora.p[0] * s + q.flora.p[2] * c] as V3,
      r: (q.flora.r ?? (q.flora.seed * 2.399) % 6.283) + rot,
    },
  }));
}
/** Con vegetación del paquete de arte: las piezas quedan solo como colisión y se dibuja `item` (fusionado en <Build>). */
export function conFlora(pcs: Pc[], item: FloraItem): Pc[] {
  if (art.Flora && pcs.length) {
    for (const q of pcs) q.hide = true;
    pcs[0].flora = item;
  }
  return pcs;
}
/** Gira un punto local (igual que place). */
export const rotXZ = (x: number, z: number, rot: number): XZ => [
  x * Math.cos(rot) + z * Math.sin(rot),
  -x * Math.sin(rot) + z * Math.cos(rot),
];

const tilted = (q: Pc) => !!q.e && (Math.abs(q.e[0]) > 0.01 || Math.abs(q.e[2]) > 0.01);
export const isSolid = (q: Pc) => q.solid ?? ((q.g === 'box' || q.g === 'cyl') && !tilted(q));
export function colliderOf(q: Pc): Collider {
  if (q.g === 'cyl') return cylCol(q.p, q.s[0], q.s[1]);
  const r = q.e?.[1] ?? 0,
    c = Math.abs(Math.cos(r)),
    s = Math.abs(Math.sin(r));
  return boxCol(q.p, [q.s[0] * c + q.s[2] * s, q.s[1], q.s[0] * s + q.s[2] * c]);
}
const M4 = new THREE.Matrix4(),
  Q = new THREE.Quaternion(),
  E = new THREE.Euler(),
  V = new THREE.Vector3(),
  S = new THREE.Vector3();
// Plantillas de tamaño 1 ya sin índice: cada pieza copia la suya y la escala, en vez de construir y desindexar una
// geometría nueva (con cientos de piezas por tramo eso era lo que más costaba al fusionar).
const PLANTILLA = new Map<string, THREE.BufferGeometry>();
function plantilla(k: string, hacer: () => THREE.BufferGeometry) {
  let g = PLANTILLA.get(k);
  if (!g) {
    g = hacer();
    if (g.index) g = g.toNonIndexed();
    PLANTILLA.set(k, g);
  }
  return g.clone();
}
function geoOf(q: Pc): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  S.set(1, 1, 1);
  if (q.g === 'box') {
    const tiny = q.liso || Math.max(q.s[0], q.s[1], q.s[2]) < 0.7 || Math.min(q.s[0], q.s[1], q.s[2]) < 0.13;
    const r = !tiny && art.boxGeometry?.(q.s[0], q.s[1], q.s[2]);
    if (r) g = r.clone();
    // con una medida en cero la escala no se puede invertir (normales en cero): esa caja se hace a su medida
    else if (!q.s[0] || !q.s[1] || !q.s[2]) g = new THREE.BoxGeometry(q.s[0], q.s[1], q.s[2]);
    else {
      S.set(q.s[0], q.s[1], q.s[2]);
      g = plantilla('box', () => new THREE.BoxGeometry(1, 1, 1));
    }
  } else if (q.g === 'cyl') {
    const rt = q.rt ?? 1,
      n = q.n ?? 10;
    if (!q.s[0] || !q.s[1]) g = new THREE.CylinderGeometry(q.s[0] * rt, q.s[0], q.s[1], n);
    else {
      S.set(q.s[0], q.s[1], q.s[0]);
      g = plantilla(`cyl|${rt}|${n}`, () => new THREE.CylinderGeometry(rt, 1, 1, n));
    }
  } else if (q.g === 'rock') {
    // roca con forma del paquete de arte (si no tiene, una bola facetada); s = radios
    const rg = art.rockGeometry?.(Math.round(q.p[0] * 13 + q.p[2] * 7));
    S.set(q.s[0], q.s[1], q.s[2]);
    g = rg ? rg.clone() : plantilla('ico', () => new THREE.IcosahedronGeometry(1, 1));
  } else if (q.g === 'ball') {
    const n = q.n ?? 10;
    S.set(q.s[0], q.s[1], q.s[2]);
    g = plantilla(`ball|${n}`, () => new THREE.SphereGeometry(1, n, Math.max(5, Math.round(n * 0.7))));
  } else {
    S.set(q.s[0] / Math.SQRT2, q.s[1], q.s[2] / Math.SQRT2);
    g = plantilla('pir', () => new THREE.CylinderGeometry(0, 1, 1, 4).rotateY(PI / 4));
  }
  if (g.index) {
    const ni = g.toNonIndexed();
    g.dispose();
    g = ni;
  }
  E.set(q.e?.[0] ?? 0, q.e?.[1] ?? 0, q.e?.[2] ?? 0, 'YXZ');
  Q.setFromEuler(E);
  V.set(q.p[0], q.p[1], q.p[2]);
  g.applyMatrix4(M4.compose(V, Q, S));
  return g;
}
export interface Merged {
  key: string;
  m: MatKind;
  c: string;
  geo: THREE.BufferGeometry;
  /** material propio (la malla fusionada con color y material por vértice) */
  mat?: THREE.Material;
}
/** transparentes y sin luz: siguen aparte, una malla por (material, color) */
const APARTE = new Set<MatKind>(['glass', 'water', 'neon']);
const _col = new THREE.Color();
/** Fusiona las piezas en una geometría por (material, color). Con `fuse` (y un arte que lo permita) todo lo opaco
 *  va en una sola malla con color, capa, rugosidad, metal y emisión por vértice: una llamada de dibujo. */
export function mergePieces(pieces: Pc[], fuse = false): Merged[] {
  const F = fuse ? art.fused : undefined;
  const groups = new Map<string, Pc[]>();
  for (const q of pieces) {
    if (q.hide) continue;
    const k = F && !APARTE.has(q.m) ? '~fused' : `${q.m}|${q.c}`;
    let l = groups.get(k);
    if (!l) groups.set(k, (l = []));
    l.push(q);
  }
  const out: Merged[] = [];
  for (const [key, list] of groups) {
    const geos = list.map(geoOf),
      attr = key === '~fused' && F;
    let n = 0;
    for (const g of geos) n += g.attributes.position.count;
    const pos = new Float32Array(n * 3),
      nor = new Float32Array(n * 3),
      uv = new Float32Array(n * 2),
      col = attr ? new Float32Array(n * 3) : null,
      mat = attr ? new Float32Array(n * 4) : null;
    let o = 0;
    geos.forEach((g, gi) => {
      const c = g.attributes.position.count;
      pos.set(g.attributes.position.array as Float32Array, o * 3);
      nor.set(g.attributes.normal.array as Float32Array, o * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array as Float32Array, o * 2);
      if (attr && col && mat) {
        const q = list[gi],
          [l, r, m] = attr.info(q.m),
          e = q.em ?? 0;
        _col.set(q.c);
        for (let i = o; i < o + c; i++) {
          col[i * 3] = _col.r;
          col[i * 3 + 1] = _col.g;
          col[i * 3 + 2] = _col.b;
          mat[i * 4] = l;
          mat[i * 4 + 1] = r;
          mat[i * 4 + 2] = m;
          mat[i * 4 + 3] = e;
        }
      }
      o += c;
      g.dispose();
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    if (col && mat) {
      geo.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('aMat', new THREE.BufferAttribute(mat, 4));
    }
    geo.computeBoundingSphere();
    out.push({ key, m: list[0].m, c: list[0].c, geo, mat: attr ? attr.material() : undefined });
  }
  return out;
}
/** Charcos de luz bajo las lámparas (piezas con em ≥ 2): un quad horizontal por lámpara, todos en una malla. */
export function poolGeometry(pieces: Pc[]): THREE.BufferGeometry | null {
  const ls = pieces.filter((q) => (q.em ?? 0) >= 2);
  if (!ls.length) return null;
  const pos = new Float32Array(ls.length * 18),
    uv = new Float32Array(ls.length * 12),
    k = new Float32Array(ls.length * 6),
    C = [-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1];
  ls.forEach((q, i) => {
    const r = clamp(q.p[1] * 0.6, 1.6, 3.8),
      y = 0.2;
    for (let v = 0; v < 6; v++) {
      const u = C[v * 2],
        w = C[v * 2 + 1];
      pos.set([q.p[0] + u * r, y, q.p[2] - w * r], (i * 6 + v) * 3);
      uv.set([u, w], (i * 6 + v) * 2);
      k[i * 6 + v] = clamp((q.em ?? 2) / 2.4, 0.5, 1.4);
    }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aK', new THREE.BufferAttribute(k, 1));
  g.computeBoundingSphere();
  return g;
}
function Pools({ pieces }: { pieces: Pc[] }) {
  const geo = useMemo(() => (art.fused?.pool ? poolGeometry(pieces) : null), [pieces]),
    mat = useMemo(() => art.fused?.pool?.(), []),
    ref = useRef<THREE.Mesh>(null);
  useEffect(() => () => geo?.dispose(), [geo]);
  // de día no cuesta nada: la malla se oculta (el material trae la fuerza de la noche en uNight)
  useTick(() => {
    const n = (mat as THREE.ShaderMaterial | undefined)?.uniforms?.uNight?.value ?? 1;
    if (ref.current) ref.current.visible = n > 0.02;
  });
  if (!geo || !mat) return null;
  return <mesh ref={ref} geometry={geo} material={mat} renderOrder={2} visible={false} />;
}
/** Dibuja muchas piezas estáticas con una malla por (material, color) y registra sus colisiones. */
export function Build({ pieces }: { pieces: Pc[] }) {
  const groups = useMemo(() => mergePieces(pieces, true), [pieces]),
    flora = useMemo(() => pieces.flatMap((q): FloraItem[] => (q.flora ? [q.flora] : [])), [pieces]);
  useLayoutEffect(() => {
    const cs = pieces.filter(isSolid).map((q) => phys.add(colliderOf(q)));
    return () => {
      for (const c of cs) phys.remove(c);
    };
  }, [pieces]);
  useEffect(
    () => () => {
      for (const g of groups) g.geo.dispose();
    },
    [groups],
  );
  return (
    <>
      {groups.map((g) => (
        <mesh
          key={g.key}
          geometry={g.geo}
          material={g.mat ?? art.material(g.m, g.c)}
          castShadow={g.m !== 'neon' && g.m !== 'water' && g.m !== 'glass'}
          receiveShadow
        />
      ))}
      <Pools pieces={pieces} />
      {art.Flora && flora.length > 0 && <art.Flora items={flora} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------------------------
// Terreno: una rejilla de alturas. La física y la malla usan exactamente la misma interpolación por triángulos.
export class Field {
  n: number;
  data: Float32Array;
  half: number;
  constructor(
    public size: number,
    public cell: number,
    fn: (x: number, z: number) => number,
  ) {
    this.n = Math.round(size / cell) + 1;
    this.half = size / 2;
    this.data = new Float32Array(this.n * this.n);
    for (let j = 0; j < this.n; j++)
      for (let i = 0; i < this.n; i++) this.data[j * this.n + i] = fn(-this.half + i * cell, -this.half + j * cell);
  }
  /** altura del terreno en (x, z) */
  h = (x: number, z: number) => {
    const n = this.n,
      fx = clamp((x + this.half) / this.cell, 0, n - 1.001),
      fz = clamp((z + this.half) / this.cell, 0, n - 1.001);
    const i = Math.floor(fx),
      j = Math.floor(fz),
      u = fx - i,
      v = fz - j,
      d = this.data,
      a = d[j * n + i],
      b = d[j * n + i + 1],
      c = d[(j + 1) * n + i],
      e = d[(j + 1) * n + i + 1];
    return u + v <= 1 ? a + u * (b - a) + v * (c - a) : e + (1 - u) * (c - e) + (1 - v) * (b - e);
  };
  /** punto apoyado en el terreno */
  at = (x: number, z: number, dy = 0): V3 => [x, this.h(x, z) + dy, z];
}
export interface Layer {
  mat: MatKind;
  color: string /** > 0 donde esta capa se ve; < 0 donde queda bajo la capa base */;
  w?: (x: number, z: number) => number;
}
/** Malla del terreno para una capa. Las capas con `w` se levantan unos centímetros donde w > 0 y se hunden donde w < 0. */
export function Terrain({ f, mat, color, w }: { f: Field } & Layer) {
  const geo = useMemo(() => {
    const n = f.n,
      pos = new Float32Array(n * n * 3),
      uv = new Float32Array(n * n * 2),
      ws = new Float32Array(n * n),
      idx: number[] = [];
    for (let j = 0; j < n; j++)
      for (let i = 0; i < n; i++) {
        const k = j * n + i,
          x = -f.half + i * f.cell,
          z = -f.half + j * f.cell,
          wv = w ? clamp(w(x, z), -1, 1) : 1;
        ws[k] = wv;
        pos[k * 3] = x;
        pos[k * 3 + 1] = f.data[k] + (w ? (wv > 0 ? 0.05 * wv : 0.7 * wv) : 0);
        pos[k * 3 + 2] = z;
        uv[k * 2] = i / (n - 1);
        uv[k * 2 + 1] = 1 - j / (n - 1);
      }
    for (let j = 0; j < n - 1; j++)
      for (let i = 0; i < n - 1; i++) {
        const a = j * n + i,
          b = a + 1,
          c = a + n,
          e = c + 1;
        if (w && ws[a] <= -1 && ws[b] <= -1 && ws[c] <= -1 && ws[e] <= -1) continue;
        idx.push(a, c, b, b, c, e);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [f, w]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={art.material(mat, color)} receiveShadow />;
}

/** Zonas prohibidas con empujón suave (agua honda, laderas muy empinadas). Si el jugador cayó desde alto, lo devuelve a la orilla. */
export function SoftBound({
  bad,
  msg = 'Por ahí no hay paso',
  icon = '🌊',
}: {
  bad: (x: number, y: number, z: number) => boolean;
  msg?: string;
  icon?: string;
}) {
  const safe = useRef<V3 | null>(null),
    cool = useRef(0);
  useTick((dt) => {
    const p = player.pos;
    cool.current -= dt;
    if (!bad(p[0], p[1], p[2])) {
      if (player.body.grounded) safe.current = [p[0], p[1], p[2]];
      return;
    }
    const s = safe.current;
    if (!s) {
      player.respawn();
      return;
    }
    if (s[1] - p[1] > 1.3 || Math.hypot(s[0] - p[0], s[2] - p[2]) > 5) {
      player.teleport(s[0], s[1], s[2]);
      audio.sfx('splash');
    } else {
      const k = Math.min(1, dt * 6);
      p[0] += (s[0] - p[0]) * k;
      p[2] += (s[2] - p[2]) * k;
      player.body.vel[0] *= 0.5;
      player.body.vel[2] *= 0.5;
    }
    if (cool.current <= 0) {
      cool.current = 5;
      useGame.getState().toast(msg, icon);
    }
  });
  return null;
}
/** ¿(x, z) está dentro del rectángulo? */
export const inR = (x: number, z: number, x0: number, x1: number, z0: number, z1: number) =>
  x > x0 && x < x1 && z > z0 && z < z1;
/** Peña o farallón que sube hacia −Z a partir de z0. Recta y de altura pareja cerca de xc (donde van cuevas y
 *  terrazas); ondulada y con relieve en lo demás. Devuelve [altura, z corregida] para pintar la franja de roca. */
export function cliff(x: number, z: number, z0: number, H: number, xc: number, flat: number): [number, number] {
  const k = ss(flat, flat + 12, Math.abs(x - xc)),
    zz = z - (2.6 * Math.sin(x * 0.13 + 1) + 1.2 * Math.sin(x * 0.31)) * k;
  return [
    H *
      ss(z0, z0 - 6, zz) *
      ss(79, 60, Math.abs(x)) *
      (1 + k * (0.2 * Math.sin(x * 0.07 + 2) + 0.12 * Math.sin(z * 0.11 + x * 0.05))),
    zz,
  ];
}

/** Suelo de una zona = terreno + «gradas»: la física base solo sube un escalón si el centro del jugador ya está
 *  encima de la pieza, cosa que el empuje lateral impide al caminar de frente. Aquí, si el jugador toca una pieza
 *  sólida cuyo tope queda a un escalón (≤ 0.38 m) por encima de sus pies, el suelo sube a ese tope y lo sostiene
 *  hasta que entra de lleno en la pieza. Así funcionan escaleras, aceras, muelles y tarimas hechas con <Build>. */
export function stepGround(terrain: (x: number, z: number) => number, pieces: Pc[]) {
  interface F {
    x0: number;
    x1: number;
    z0: number;
    z1: number;
    top: number;
    r: number;
  }
  const fl: F[] = pieces.filter(isSolid).map((q) => {
    const c = colliderOf(q);
    return c.type === 'box'
      ? { x0: c.min[0], x1: c.max[0], z0: c.min[2], z1: c.max[2], top: c.max[1], r: 0 }
      : { x0: c.x, x1: c.x, z0: c.z, z1: c.z, top: c.y1, r: c.r };
  });
  const near = (f: F, x: number, z: number, pad: number) =>
    f.r
      ? Math.hypot(x - f.x0, z - f.z0) < f.r + pad
      : x > f.x0 - pad && x < f.x1 + pad && z > f.z0 - pad && z < f.z1 + pad;
  let held: F | null = null;
  return (x: number, z: number) => {
    let best = terrain(x, z);
    const p = player.pos,
      y = p[1];
    if (Math.abs(x - p[0]) > 0.01 || Math.abs(z - p[2]) > 0.01) return best;
    if (held) {
      if (Math.abs(y - held.top) > 0.06 || !near(held, x, z, 0.47) || near(held, x, z, 0.2)) held = null;
      else best = Math.max(best, held.top);
    }
    if (player.body.vel[1] <= 0.01)
      for (const f of fl)
        if (f.top > y + 0.02 && f.top <= y + 0.38 && f.top > best && near(f, x, z, 0.47)) {
          best = f.top;
          held = f;
        }
    return best;
  };
}
