// Geometría con huesos para el avatar HD: un constructor que fusiona piezas en UNA sola malla con pesos de
// piel (skinIndex / skinWeight) y UV dentro de un atlas, más superficies de revolución con anillos elípticos.
import * as THREE from 'three';

/** tamaño del atlas del avatar en píxeles */
export const AW = 1024,
  AH = 512;
/** región del atlas: x, y, ancho, alto (píxeles, y hacia abajo como en el lienzo) */
export type Rect = readonly [number, number, number, number];
/** pesos de un vértice: [hueso, peso, hueso, peso, ...] (hasta 4 pares) */
export type WFn = (x: number, y: number, z: number) => number[];

const _v = new THREE.Vector3(),
  _n3 = new THREE.Matrix3(),
  _I = new THREE.Matrix4();
export class SkinBuilder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  si: number[] = [];
  sw: number[] = [];
  idx: number[] = [];
  add(geo: THREE.BufferGeometry, rect: Rect, w: WFn | number, m: THREE.Matrix4 = _I): this {
    const flip = m.determinant() < 0;
    _n3.getNormalMatrix(m);
    const P = geo.attributes.position,
      N = geo.attributes.normal,
      U = geo.attributes.uv,
      I = geo.index,
      off = this.pos.length / 3;
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(m);
      const x = _v.x,
        y = _v.y,
        z = _v.z;
      this.pos.push(x, y, z);
      _v.fromBufferAttribute(N, i).applyMatrix3(_n3).normalize();
      this.nor.push(_v.x, _v.y, _v.z);
      const u = U ? U.getX(i) : 0.5,
        v = U ? U.getY(i) : 0.5;
      this.uv.push((rect[0] + u * rect[2]) / AW, 1 - (rect[1] + (1 - v) * rect[3]) / AH);
      const ws = typeof w === 'number' ? [w, 1] : w(x, y, z);
      let s = 0;
      for (let k = 1; k < ws.length; k += 2) s += ws[k];
      for (let k = 0; k < 4; k++) {
        const wt = ws[k * 2 + 1];
        this.si.push(wt ? ws[k * 2] : 0);
        this.sw.push(wt ? wt / s : 0);
      }
    }
    const n = I ? I.count : P.count;
    for (let i = 0; i < n; i += 3) {
      const a = off + (I ? I.getX(i) : i),
        b = off + (I ? I.getX(i + 1) : i + 1),
        c = off + (I ? I.getX(i + 2) : i + 2);
      if (flip) this.idx.push(a, c, b);
      else this.idx.push(a, b, c);
    }
    return this;
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(this.si, 4));
    g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(this.sw, 4));
    g.setIndex(this.idx);
    return g;
  }
}

export interface Ring {
  y: number;
  rx: number;
  rz?: number;
  cx?: number;
  cz?: number;
  v?: number;
}
/** Superficie por anillos elípticos ordenados de abajo hacia arriba. u = 0.5 queda al frente (+Z); v sube con y. */
export function loft(rings: Ring[], seg = 14): THREE.BufferGeometry {
  const n = rings.length,
    pos: number[] = [],
    uv: number[] = [],
    idx: number[] = [],
    y0 = rings[0].y,
    y1 = rings[n - 1].y;
  for (let i = 0; i < n; i++) {
    const r = rings[i],
      v = r.v ?? (r.y - y0) / (y1 - y0 || 1);
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg - 0.5) * Math.PI * 2;
      pos.push((r.cx ?? 0) + Math.sin(th) * r.rx, r.y, (r.cz ?? 0) + Math.cos(th) * (r.rz ?? r.rx));
      uv.push(j / seg, v);
    }
  }
  for (let i = 0; i < n - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j,
        b = a + 1,
        c = a + seg + 1,
        d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // la costura (j = 0 y j = seg) comparte posición: se promedian las normales para que no se note
  const N = g.attributes.normal;
  for (let i = 0; i < n; i++) {
    const a = i * (seg + 1),
      b = a + seg;
    _v.set(N.getX(a) + N.getX(b), N.getY(a) + N.getY(b), N.getZ(a) + N.getZ(b)).normalize();
    N.setXYZ(a, _v.x, _v.y, _v.z);
    N.setXYZ(b, _v.x, _v.y, _v.z);
  }
  return g;
}
/** Medio elipsoide (delantero o trasero) con normales exactas. El delantero lleva UV plana (x, y) para la cara. */
export function headHalf(rx: number, ry: number, rz: number, front: boolean, lat = 14, lon = 12): THREE.BufferGeometry {
  const pos: number[] = [],
    nor: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= lat; i++)
    for (let j = 0; j <= lon; j++) {
      const th = (i / lat) * Math.PI,
        ph = (j / lon - 0.5) * Math.PI + (front ? 0 : Math.PI),
        sx = Math.sin(th) * Math.sin(ph),
        sy = Math.cos(th),
        sz = Math.sin(th) * Math.cos(ph);
      pos.push(sx * rx, sy * ry, sz * rz);
      _v.set(sx / rx, sy / ry, sz / rz).normalize();
      nor.push(_v.x, _v.y, _v.z);
      if (front) uv.push(0.5 + sx * 0.5, 0.5 + sy * 0.5);
      else uv.push(0.5, 0.5);
    }
  for (let i = 0; i < lat; i++)
    for (let j = 0; j < lon; j++) {
      const a = i * (lon + 1) + j,
        b = a + 1,
        c = a + lon + 1,
        d = c + 1;
      idx.push(a, c, d, a, d, b);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
/** Parche sobre un elipsoide (para los párpados): cubre x0..x1, y0..y1 visto de frente. */
export function ellipsoidPatch(
  rx: number,
  ry: number,
  rz: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  nx = 5,
  ny = 4,
): THREE.BufferGeometry {
  const pos: number[] = [],
    nor: number[] = [],
    uv: number[] = [],
    idx: number[] = [];
  for (let i = 0; i <= ny; i++)
    for (let j = 0; j <= nx; j++) {
      const x = x0 + ((x1 - x0) * j) / nx,
        y = y0 + ((y1 - y0) * i) / ny,
        z = rz * Math.sqrt(Math.max(0, 1 - (x * x) / (rx * rx) - (y * y) / (ry * ry)));
      pos.push(x, y, z);
      _v.set(x / (rx * rx), y / (ry * ry), z / (rz * rz)).normalize();
      nor.push(_v.x, _v.y, _v.z);
      uv.push(j / nx, i / ny);
    }
  for (let i = 0; i < ny; i++)
    for (let j = 0; j < nx; j++) {
      const a = i * (nx + 1) + j,
        b = a + 1,
        c = a + nx + 1,
        d = c + 1;
      idx.push(a, b, d, a, d, c);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
/** copia con las caras invertidas (forro interior de faldas y capas) */
export function inverted(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const o = g.clone(),
    I = o.index!,
    N = o.attributes.normal;
  for (let i = 0; i < I.count; i += 3) {
    const b = I.getX(i + 1);
    I.setX(i + 1, I.getX(i + 2));
    I.setX(i + 2, b);
  }
  for (let i = 0; i < N.count; i++) N.setXYZ(i, -N.getX(i), -N.getY(i), -N.getZ(i));
  return o;
}
