// Geometría del paquete HD: cajas redondeadas cacheadas y un "constructor" que fusiona muchas piezas en una
// sola malla con color y material por vértice (así cada pieza de utilería es una sola llamada de dibujo).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { MatKind } from '../types';
import type { V3 } from '../../../../core/types';
import { kindInfo } from './materials';
import { layerIndex, rng, type LayerName } from './tex';

const boxes = new Map<string, THREE.BufferGeometry>();
/** caja con bordes redondeados (radio limitado por el tamaño). Cacheada. */
export function roundedBox(w: number, h: number, d: number, radius = 0.07, seg = 2): THREE.BufferGeometry {
  const key = `${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${radius}|${seg}`; let g = boxes.get(key); if (g) return g;
  const r = Math.max(0.002, Math.min(radius, Math.min(w, h, d) * 0.3));
  g = new RoundedBoxGeometry(w, h, d, seg, r);
  boxes.set(key, g); return g;
}

export type Kind = MatKind | LayerName;
export interface Paint { /** tipo de material o capa */ k?: Kind; /** color */ c: string | THREE.Color; /** rugosidad */ r?: number; /** metal */ m?: number; /** emisión: >0 luz cálida solo de noche, <0 brillo propio siempre */ e?: number; /** usar las UV de la pieza en vez de triplanar */ uv?: boolean; /** degradado vertical: [y0, y1, k] oscurece hasta k por debajo de y0 (sombra falsa) */ g?: [number, number, number] }
export interface Xf { p?: V3; r?: V3; s?: V3 | number }

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _n3 = new THREE.Matrix3(), _v = new THREE.Vector3(), _c = new THREE.Color();
export function xfMatrix(x: Xf | THREE.Matrix4 | undefined, out = new THREE.Matrix4()) {
  if (!x) return out.identity(); if (x instanceof THREE.Matrix4) return out.copy(x);
  const t = x as Xf, s = t.s ?? 1;
  _p.set(...(t.p ?? [0, 0, 0])); _e.set(...(t.r ?? [0, 0, 0])); _q.setFromEuler(_e); if (typeof s === 'number') _s.set(s, s, s); else _s.set(...s);
  return out.compose(_p, _q, _s);
}

/** Acumula piezas y las fusiona en una sola BufferGeometry con atributos position, normal, uv, aCol, aMat. */
export class Builder {
  pos: number[] = []; nor: number[] = []; uv: number[] = []; col: number[] = []; mat: number[] = []; idx: number[] = [];
  /** transformación que se aplica antes que la de cada pieza (para sub-grupos) */
  base = new THREE.Matrix4();
  add(geo: THREE.BufferGeometry, paint: Paint, xf?: Xf | THREE.Matrix4): this {
    const m = xfMatrix(xf, _m).premultiply(this.base), flip = m.determinant() < 0; _n3.getNormalMatrix(m);
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv, I = geo.index, off = this.pos.length / 3;
    const info = kindInfo(paint.k ?? 'plastic') ?? kindInfo('plastic')!, layer = layerIndex(info.l) + (paint.uv ? 100 : 0);
    const rough = paint.r ?? info.r, metal = paint.m ?? info.m, em = paint.e ?? 0;
    _c.set(paint.c as any);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(m); this.pos.push(_v.x, _v.y, _v.z);
      if (N) _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize(); else _v.set(0, 1, 0);
      this.nor.push(_v.x, _v.y, _v.z);
      let gk = 1; if (paint.g) { const y = this.pos[this.pos.length - 2], t = Math.max(0, Math.min(1, (y - paint.g[0]) / (paint.g[1] - paint.g[0]))); gk = paint.g[2] + (1 - paint.g[2]) * t * t * (3 - 2 * t); }
      this.uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0); this.col.push(_c.r * gk, _c.g * gk, _c.b * gk); this.mat.push(layer, rough, metal, em);
    }
    const n = I ? I.count : P.count;
    for (let i = 0; i < n; i += 3) { const a = off + (I ? I.getX(i) : i), b = off + (I ? I.getX(i + 1) : i + 1), c = off + (I ? I.getX(i + 2) : i + 2); if (flip) this.idx.push(a, c, b); else this.idx.push(a, b, c); }
    return this;
  }
  box(w: number, h: number, d: number, paint: Paint, p: V3 = [0, 0, 0], r?: V3, bevel = 0.04): this { return this.add(bevel > 0 ? gBox(w, h, d, bevel) : gBoxS(w, h, d), paint, { p, r }); }
  cyl(rTop: number, rBot: number, h: number, paint: Paint, p: V3 = [0, 0, 0], r?: V3, seg = 12): this { return this.add(gCyl(rTop, rBot, h, seg), paint, { p, r }); }
  sph(r: number, paint: Paint, p: V3 = [0, 0, 0], s: V3 = [1, 1, 1], ws = 12, hs = 8, rot?: V3): this { return this.add(gSph(1, ws, hs), paint, { p, s: [s[0] * r, s[1] * r, s[2] * r], r: rot }); }
  /** ejecuta fn con una transformación base extra (sub-grupo) */
  group(xf: Xf, fn: () => void): this { const prev = this.base.clone(); this.base.multiply(xfMatrix(xf, new THREE.Matrix4())); fn(); this.base.copy(prev); return this; }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2)); g.setAttribute('aCol', new THREE.Float32BufferAttribute(this.col, 3)); g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.mat, 4));
    g.setIndex(this.pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}

// --- primitivas (cacheadas por parámetros; el Builder copia los vértices, así que se pueden compartir)
const prim = new Map<string, THREE.BufferGeometry>();
const memo = (key: string, make: () => THREE.BufferGeometry) => { let g = prim.get(key); if (!g) { g = make(); prim.set(key, g); } return g; };
export const gBox = (w: number, h: number, d: number, r = 0.04) => roundedBox(w, h, d, r, 1);
/** caja de aristas vivas (24 vértices) para piezas pequeñas o muy repetidas */
export const gBoxS = (w: number, h: number, d: number) => memo(`x${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));
export const gCyl = (rTop: number, rBot: number, h: number, seg = 14, open = false) => memo(`c${rTop}|${rBot}|${h}|${seg}|${open}`, () => new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open));
export const gSph = (r: number, ws = 16, hs = 12) => memo(`s${r}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const gCone = (r: number, h: number, seg = 14) => memo(`k${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg));
export const gTorus = (r: number, tube: number, rs = 8, ts = 20, arc = Math.PI * 2) => memo(`t${r}|${tube}|${rs}|${ts}|${arc}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc));
export const gCaps = (r: number, len: number, cs = 6, rs = 12) => memo(`p${r}|${len}|${cs}|${rs}`, () => new THREE.CapsuleGeometry(r, len, cs, rs));
export const gPlane = (w: number, h: number, ws = 1, hs = 1) => memo(`q${w}|${h}|${ws}|${hs}`, () => new THREE.PlaneGeometry(w, h, ws, hs));
/** sólido de revolución a partir de un perfil [radio, altura][] */
export const gLathe = (pts: [number, number][], seg = 16) => memo(`l${pts}|${seg}`, () => new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), seg));

/** esfera abultada de forma orgánica (copas de árbol, rocas, arbustos) */
export function gBlob(r: number, seed = 1, amp = 0.22, detail = 2, freq = 1.6): THREE.BufferGeometry {
  return memo(`b${r}|${seed}|${amp}|${detail}|${freq}`, () => {
    const g = new THREE.IcosahedronGeometry(1, detail), p = g.attributes.position, rr = rng(seed * 7919 + 1);
    // suma de ondas en direcciones al azar: bultos suaves, sin aristas
    const W: number[][] = []; for (let i = 0; i < 5; i++) { const a = rr() * 6.283, y = rr() * 2 - 1, q = Math.sqrt(1 - y * y), f = freq * (1.1 + i * 0.55); W.push([Math.cos(a) * q * f, y * f, Math.sin(a) * q * f, rr() * 6.283, 1 / (1 + i * 0.6)]); }
    for (let i = 0; i < p.count; i++) {
      _v.fromBufferAttribute(p, i).normalize(); let n = 0;
      for (const w of W) n += Math.sin(_v.x * w[0] + _v.y * w[1] + _v.z * w[2] + w[3]) * w[4];
      _v.multiplyScalar(r * (1 + n * amp * 0.62)); p.setXYZ(i, _v.x, _v.y, _v.z);
    }
    // el icosaedro viene sin índice: se sueldan los vértices para tener normales suaves
    const merged = weld(g); merged.computeVertexNormals(); return merged;
  });
}
/** suelda vértices coincidentes (para normales suaves en geometría sin índice) */
export function weld(g: THREE.BufferGeometry, tol = 1e-4): THREE.BufferGeometry {
  const p = g.attributes.position, uvA = g.attributes.uv, map = new Map<string, number>(), pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const n = g.index ? g.index.count : p.count;
  for (let i = 0; i < n; i++) { const vi = g.index ? g.index.getX(i) : i, x = p.getX(vi), y = p.getY(vi), z = p.getZ(vi), k = `${Math.round(x / tol)}|${Math.round(y / tol)}|${Math.round(z / tol)}`; let j = map.get(k); if (j === undefined) { j = pos.length / 3; pos.push(x, y, z); if (uvA) uv.push(uvA.getX(vi), uvA.getY(vi)); map.set(k, j); } idx.push(j); }
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); if (uvA) o.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); o.setIndex(idx); o.computeVertexNormals(); return o;
}
/** tubo a lo largo de una curva de puntos con radio variable (troncos, ramas, arcos, tubos doblados) */
export function gTube(pts: V3[], radii: number | number[], seg = 10, caps = true): THREE.BufferGeometry {
  const P = pts.map(p => new THREE.Vector3(...p)), n = P.length, rad = (i: number) => (typeof radii === 'number' ? radii : radii[Math.min(i, radii.length - 1)]);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3(), prevT = new THREE.Vector3(), q = new THREE.Quaternion();
  let len = 0;
  for (let i = 0; i < n; i++) {
    T.copy(P[Math.min(i + 1, n - 1)]).sub(P[Math.max(i - 1, 0)]).normalize();
    if (i === 0) { N.set(1, 0, 0); if (Math.abs(T.x) > 0.9) N.set(0, 0, 1); N.sub(_v.copy(T).multiplyScalar(N.dot(T))).normalize(); }
    else { q.setFromUnitVectors(prevT, T); N.applyQuaternion(q).normalize(); len += P[i].distanceTo(P[i - 1]); }
    B.crossVectors(T, N); prevT.copy(T);
    const r = rad(i);
    for (let j = 0; j <= seg; j++) { const a = (j / seg) * Math.PI * 2, cx = Math.cos(a), sy = Math.sin(a); _v.copy(N).multiplyScalar(cx).addScaledVector(B, sy); nor.push(_v.x, _v.y, _v.z); pos.push(P[i].x + _v.x * r, P[i].y + _v.y * r, P[i].z + _v.z * r); uv.push(j / seg, len); }
  }
  for (let i = 0; i < n - 1; i++) for (let j = 0; j < seg; j++) { const a = i * (seg + 1) + j, b = a + seg + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  if (caps) for (const end of [0, n - 1]) {
    const c = pos.length / 3, dir = end === 0 ? -1 : 1; T.copy(P[Math.min(end + 1, n - 1)]).sub(P[Math.max(end - 1, 0)]).normalize().multiplyScalar(dir);
    pos.push(P[end].x, P[end].y, P[end].z); nor.push(T.x, T.y, T.z); uv.push(0.5, 0.5);
    for (let j = 0; j <= seg; j++) { const s = end * (seg + 1) + j; pos.push(pos[s * 3], pos[s * 3 + 1], pos[s * 3 + 2]); nor.push(T.x, T.y, T.z); uv.push(0, 0); }
    for (let j = 0; j < seg; j++) { if (end === 0) idx.push(c, c + 1 + j, c + 2 + j); else idx.push(c, c + 2 + j, c + 1 + j); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); return g;
}
/** duplica las caras al revés para que una lámina se vea por los dos lados con un material de una cara */
export function twoSided(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const src = g.index ? g : (() => { const c = g.clone(); c.setIndex(Array.from({ length: g.attributes.position.count }, (_, i) => i)); return c; })();
  const P = src.attributes.position, N = src.attributes.normal, U = src.attributes.uv, n = P.count, I = src.index!;
  const pos = new Float32Array(n * 6), nor = new Float32Array(n * 6), uv = new Float32Array(n * 4), idx: number[] = [];
  for (let i = 0; i < n; i++) { for (let k = 0; k < 2; k++) { const o = (i + k * n) * 3, s = k ? -1 : 1; pos[o] = P.getX(i); pos[o + 1] = P.getY(i); pos[o + 2] = P.getZ(i); nor[o] = N.getX(i) * s; nor[o + 1] = N.getY(i) * s; nor[o + 2] = N.getZ(i) * s; if (U) { uv[(i + k * n) * 2] = U.getX(i); uv[(i + k * n) * 2 + 1] = U.getY(i); } } }
  for (let i = 0; i < I.count; i += 3) { const a = I.getX(i), b = I.getX(i + 1), c = I.getX(i + 2); idx.push(a, b, c, a + n, c + n, b + n); }
  const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.BufferAttribute(pos, 3)); o.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); o.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); o.setIndex(idx); return o;
}
/** mezcla dos colores hex (t = 0 → a, 1 → b) o aclara/oscurece con k */
export function tint(c: string | THREE.Color, k: number, to?: string): THREE.Color { const a = new THREE.Color(c as any); if (to) return a.lerp(new THREE.Color(to), k); return a.multiplyScalar(k); }
