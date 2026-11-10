// Constructor de geometría fusionada: cada pieza de utilería (o un avatar entero) termina en UNA malla, o sea una
// sola llamada de dibujo. En la utilería el color y la capa de textura de cada vértice viajan EMPAQUETADOS en el
// atributo `uv` (ver mats.ts): así la malla solo necesita position / normal / uv y sobrevive a los fusionadores de
// escena que descartan atributos propios (lobby/Baked).
import * as THREE from 'three';
import { KINDS, type Kind } from './mats';

export type V3 = [number, number, number];
/** rectángulo UV [u0, v0, u1, v1] */
export type Rect = [number, number, number, number];
export interface PartOpt {
  /** material (capa de textura) */ k?: Kind;
  /** rotación Euler XYZ */ r?: V3;
  /** brillo propio 0..1 (faroles, neón) */ em?: number;
  /** modo 'uv': usar los UV de la geometría multiplicados por esto */ uv?: [number, number];
  /** techos: proyecta la textura siguiendo la pendiente de la cara (columnas de teja hacia abajo) */ slope?: boolean;
  /** remapea los UV de la geometría a un rectángulo del atlas (avatar) */ rect?: Rect;
  /** por cara de caja (+x −x +y −y +z −z): rectángulo del atlas o null = blanco */ faces?: (Rect | null | undefined)[];
  /** ventana que se enciende de noche */ lit?: boolean;
  /** hueso (avatar) */ bone?: number;
  /** radio de bisel para cajas */ bevel?: number;
}
const M = new THREE.Matrix4(), M2 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), S = new THREE.Vector3(), V = new THREE.Vector3(), NM = new THREE.Matrix3(), C = new THREE.Color();
const ONE: V3 = [1, 1, 1], ZERO: V3 = [0, 0, 0];

// ------------------------------------------------------------ geometrías fuente (cacheadas, sin índice)
const gcache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry) { let g = gcache.get(key); if (!g) { const s = make(); g = s.index ? s.toNonIndexed() : s; gcache.set(key, g); } return g; }
export const unitBox = () => cached('box', () => new THREE.BoxGeometry(1, 1, 1));
export const cylGeo = (rt: number, sides: number, open = false) => cached(`cyl${rt.toFixed(3)}|${sides}|${open}`, () => new THREE.CylinderGeometry(rt, 1, 1, sides, 1, open));
export const sphGeo = (w = 12, h = 8) => cached(`sph${w}|${h}`, () => new THREE.SphereGeometry(1, w, h));
export const icoGeo = (d = 0) => cached(`ico${d}`, () => new THREE.IcosahedronGeometry(1, d));
export const dodGeo = () => cached('dod', () => new THREE.DodecahedronGeometry(1, 0));
export const octGeo = () => cached('oct', () => new THREE.OctahedronGeometry(1, 0));
export const torGeo = (tube: number, rs = 8, ts = 18, arc = Math.PI * 2) => cached(`tor${tube.toFixed(3)}|${rs}|${ts}|${arc.toFixed(3)}`, () => new THREE.TorusGeometry(1, tube, rs, ts, arc));
/** caja con aristas redondeadas (bisel suave de radio r). Las 6 caras conservan UV 0..1 por cara. */
export function rbox(w: number, h: number, d: number, r: number) {
  r = Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4);
  return cached(`rb${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}`, () => {
    const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3).toNonIndexed(), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, H = [w / 2, h / 2, d / 2];
    const per = p.count / 6, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let i = 0; i < p.count; i++) {
      const c = [p.getX(i), p.getY(i), p.getZ(i)], inner = [0, 0, 0], dir = [0, 0, 0];
      for (let a = 0; a < 3; a++) { if (Math.abs(c[a]) < H[a] - 1e-5) c[a] = Math.sign(c[a]) * (H[a] - r); inner[a] = Math.max(-(H[a] - r), Math.min(H[a] - r, c[a])); dir[a] = c[a] - inner[a]; }
      const l = Math.hypot(dir[0], dir[1], dir[2]) || 1;
      p.setXYZ(i, inner[0] + dir[0] / l * r, inner[1] + dir[1] / l * r, inner[2] + dir[2] / l * r); n.setXYZ(i, dir[0] / l, dir[1] / l, dir[2] / l);
      const f = Math.floor(i / per), fix = (t: number, size: number) => (Math.abs(t - 1 / 3) < 0.01 ? r / size : Math.abs(t - 2 / 3) < 0.01 ? 1 - r / size : t);
      uv.setXY(i, fix(uv.getX(i), dims[f][0]), fix(uv.getY(i), dims[f][1]));
    }
    return g;
  });
}

export function shade(hex: string, k: number) { C.set(hex); if (k >= 0) C.lerp(new THREE.Color('#ffffff'), k); else C.multiplyScalar(1 + k); return '#' + C.getHexString(); }
export function mixHex(a: string, b: string, t: number) { return '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString(); }
/** generador pseudoaleatorio con semilla */
export function rng(seed: number) { let s = (Math.floor(seed * 9973) ^ 0x9e3779b9) >>> 0; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }

const WHITE_UV: [number, number] = [0.99, 0.01];
export class Build {
  pos: number[] = []; nor: number[] = []; col: number[] = []; uv: number[] = []; pk: number[] = []; si: number[] = []; sw: number[] = [];
  private stack: THREE.Matrix4[] = []; private cur = new THREE.Matrix4();
  /** hueso por defecto y función opcional de pesos suaves (devuelve [huesoA, huesoB, pesoA]) */
  bone = 0; skinFn: null | ((x: number, y: number, z: number) => [number, number, number]) = null;
  /** UV de un texel blanco del atlas (para piezas que solo usan color por vértice) */
  white = WHITE_UV;
  push(p: V3 = ZERO, r: V3 = ZERO, s: V3 | number = 1) { this.stack.push(this.cur.clone()); this.cur.multiply(M2.compose(P.set(...p), Q.setFromEuler(E.set(...r)), typeof s === 'number' ? S.set(s, s, s) : S.set(...s))); return this; }
  pop() { this.cur = this.stack.pop()!; return this; }
  /** agrega una geometría transformada */
  add(g: THREE.BufferGeometry, p: V3, s: V3 | number, color: string, o: PartOpt = {}) {
    const src = g.index ? g.toNonIndexed() : g;
    M.compose(P.set(...p), Q.setFromEuler(E.set(...(o.r ?? ZERO))), typeof s === 'number' ? S.set(s, s, s) : S.set(...s)).premultiply(this.cur);
    NM.getNormalMatrix(M); const flip = M.determinant() < 0;
    const pa = src.attributes.position, na = src.attributes.normal, ua = src.attributes.uv, n = pa.count, K = KINDS[o.k ?? 'smooth'];
    C.set(color); const per = n / 6, bone = o.bone ?? this.bone, hex = C.getHex(), code = K[0] + K[1] * 32 + (o.slope ? 1024 : 0) + Math.min(15, Math.round((o.em ?? 0) * 8)) * 2048 + (o.lit ? 32768 : 0);
    for (let t = 0; t < n; t += 3) for (let j = 0; j < 3; j++) {
      const i = t + (flip ? 2 - j : j);
      V.fromBufferAttribute(pa, i).applyMatrix4(M); this.pos.push(V.x, V.y, V.z);
      if (this.skinFn) { const w = this.skinFn(V.x, V.y, V.z); this.si.push(w[0], w[1], 0, 0); this.sw.push(w[2], 1 - w[2], 0, 0); } else { this.si.push(bone, 0, 0, 0); this.sw.push(1, 0, 0, 0); }
      V.fromBufferAttribute(na, i).applyMatrix3(NM).normalize(); this.nor.push(V.x, V.y, V.z);
      this.col.push(C.r, C.g, C.b);
      const rect = o.faces ? o.faces[Math.floor(i / per)] : o.rect;
      if (rect && ua) this.uv.push(rect[0] + (rect[2] - rect[0]) * ua.getX(i), rect[1] + (rect[3] - rect[1]) * ua.getY(i));
      else if (o.uv && ua) this.uv.push(ua.getX(i) * o.uv[0], ua.getY(i) * o.uv[1]);
      else this.uv.push(this.white[0], this.white[1]);
      this.pk.push(hex, code);
    }
    return this;
  }
  /** caja: p = centro, s = tamaño */
  box(p: V3, s: V3, color: string, o: PartOpt = {}) { return o.bevel ? this.add(rbox(s[0], s[1], s[2], o.bevel), p, 1, color, o) : this.add(unitBox(), p, s, color, o); }
  /** cilindro vertical: p = centro. rt = radio de arriba */
  cyl(p: V3, r: number, h: number, color: string, o: PartOpt & { rt?: number; sides?: number; open?: boolean } = {}) { return this.add(cylGeo((o.rt ?? r) / r, o.sides ?? 14, o.open), p, [r, h, r], color, o); }
  sph(p: V3, r: number | V3, color: string, o: PartOpt & { w?: number; h?: number } = {}) { return this.add(sphGeo(o.w ?? 12, o.h ?? 8), p, r, color, o); }
  /** triángulos sueltos: lista de vértices [x,y,z, u,v] de 3 en 3; normal plana */
  tris(verts: number[][], color: string, o: PartOpt = {}) {
    const g = new THREE.BufferGeometry(), pp: number[] = [], uu: number[] = [];
    for (const v of verts) { pp.push(v[0], v[1], v[2]); uu.push(v[3] ?? 0, v[4] ?? 0); }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pp, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uu, 2)); g.computeVertexNormals();
    return this.add(g, ZERO, 1, color, o);
  }
  /** cuadrilátero a-b-c-d (antihorario visto de frente) con UV 0..1 */
  quad(a: V3, b: V3, c: V3, d: V3, color: string, o: PartOpt = {}, uvs: number[][] = [[0, 0], [1, 0], [1, 1], [0, 1]]) {
    return this.tris([[...a, ...uvs[0]], [...b, ...uvs[1]], [...c, ...uvs[2]], [...a, ...uvs[0]], [...c, ...uvs[2]], [...d, ...uvs[3]]], color, o);
  }
  get count() { return this.pos.length / 3; }
  /** 'packed' (utilería): uv = [color sRGB de 24 bits, capas + banderas]. 'skinned' (avatar): color + uv del atlas +
   *  huesos. 'color': posición + normal + color. 'uv': posición + normal + uv reales. */
  done(mode: 'packed' | 'skinned' | 'color' | 'uv' = 'packed') {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    if (mode === 'packed') g.setAttribute('uv', new THREE.Float32BufferAttribute(this.pk, 2));
    else {
      if (mode !== 'uv') g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
      if (mode !== 'color') g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
      if (mode === 'skinned') { g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4)); }
    }
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
export { ONE, ZERO };
