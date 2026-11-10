// Escenario estático fusionado. Las piezas se describen igual que <Block>/<Cyl>/<Ball> del kit (forma + mat +
// color) pero se juntan en UNA malla por (material, color), así todo el pueblo cuesta unas pocas decenas de
// llamadas de dibujo. El aspecto lo sigue poniendo el paquete de arte: art.material() y art.boxGeometry().
import { useEffect, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { art, Plate, type MatKind } from '../kit';
import { phys, type Collider } from '../../core/phys';
import type { V3 } from '../../core/types';

export interface Piece { g: 'box' | 'cyl' | 'ball'; m: THREE.Matrix4; dims: number[]; color: string; mat: MatKind; cast: boolean }
export interface PlateSpec { pos: V3; rot: number; text: string; h: number; fg?: string; bg?: string }
export interface Opt { /** giro en Y, o Euler XYZ completo */ rot?: number | V3; solid?: boolean; cast?: boolean }

const Q = new THREE.Quaternion(), E = new THREE.Euler(), ONE = new THREE.Vector3(1, 1, 1), V = new THREE.Vector3();
const local = (pos: V3, rot?: number | V3, scale?: V3) => {
  if (typeof rot === 'number') E.set(0, rot, 0); else if (rot) E.set(rot[0], rot[1], rot[2]); else E.set(0, 0, 0);
  return new THREE.Matrix4().compose(new THREE.Vector3(pos[0], pos[1], pos[2]), Q.setFromEuler(E), scale ? new THREE.Vector3(scale[0], scale[1], scale[2]) : ONE);
};

/** Acumulador de piezas con un marco local (origen + giro en Y) para armar edificios en coordenadas propias. */
export class Kit {
  pieces: Piece[] = []; colliders: Collider[] = []; plates: PlateSpec[] = [];
  private frame = new THREE.Matrix4(); private yaw = 0;
  /** Ejecuta `fn` con el origen y el giro dados: dentro, +Z local es el frente. */
  at(origin: V3, yaw: number, fn: () => void) {
    const prev = this.frame.clone(), py = this.yaw;
    this.frame.multiply(local(origin, yaw)); this.yaw += yaw; fn(); this.frame.copy(prev); this.yaw = py;
  }
  /** punto local → mundo */
  w(p: V3): V3 { V.set(p[0], p[1], p[2]).applyMatrix4(this.frame); return [V.x, V.y, V.z]; }
  private aabb(m: THREE.Matrix4, h: V3) {
    const min: V3 = [Infinity, Infinity, Infinity], max: V3 = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < 8; i++) { V.set(i & 1 ? h[0] : -h[0], i & 2 ? h[1] : -h[1], i & 4 ? h[2] : -h[2]).applyMatrix4(m); min[0] = Math.min(min[0], V.x); min[1] = Math.min(min[1], V.y); min[2] = Math.min(min[2], V.z); max[0] = Math.max(max[0], V.x); max[1] = Math.max(max[1], V.y); max[2] = Math.max(max[2], V.z); }
    return { min, max };
  }
  /** Caja. `pos` es el centro. Sólida por defecto (colisión = caja alineada a los ejes que la envuelve). */
  box(pos: V3, size: V3, color: string, mat: MatKind = 'plastic', o: Opt = {}) {
    const m = this.frame.clone().multiply(local(pos, o.rot));
    this.pieces.push({ g: 'box', m, dims: size, color, mat, cast: o.cast !== false });
    if (o.solid !== false) this.colliders.push({ type: 'box', ...this.aabb(m, [size[0] / 2, size[1] / 2, size[2] / 2]), solid: true });
    return this;
  }
  /** Losa o adorno sin colisión ni sombra propia. */
  flat(pos: V3, size: V3, color: string, mat: MatKind = 'plastic', rot?: number | V3) { return this.box(pos, size, color, mat, { rot, solid: false, cast: false }); }
  /** Adorno sin colisión (con sombra). */
  deco(pos: V3, size: V3, color: string, mat: MatKind = 'plastic', rot?: number | V3) { return this.box(pos, size, color, mat, { rot, solid: false }); }
  /** Cilindro vertical (o inclinado con `rot`). Sólido solo si está vertical y no se pide lo contrario. */
  cyl(pos: V3, r: number, h: number, color: string, mat: MatKind = 'plastic', o: Opt & { rTop?: number; sides?: number } = {}) {
    const m = this.frame.clone().multiply(local(pos, o.rot));
    this.pieces.push({ g: 'cyl', m, dims: [r, h, o.rTop ?? r, o.sides ?? 16], color, mat, cast: o.cast !== false });
    if (o.solid === true || (o.solid === undefined && (o.rot === undefined || typeof o.rot === 'number'))) { const c = this.w(pos); this.colliders.push({ type: 'cyl', x: c[0], z: c[2], r: Math.max(r, o.rTop ?? 0) * 0.92, y0: c[1] - h / 2, y1: c[1] + h / 2, solid: true }); }
    return this;
  }
  /** Esfera o elipsoide decorativo (sin colisión). */
  ball(pos: V3, r: number, color: string, mat: MatKind = 'plastic', scale?: V3, cast = true) {
    this.pieces.push({ g: 'ball', m: this.frame.clone().multiply(local(pos, 0, scale)), dims: [r], color, mat, cast });
    return this;
  }
  /** Colisión invisible. */
  wall(pos: V3, size: V3) { const m = this.frame.clone().multiply(local(pos)); this.colliders.push({ type: 'box', ...this.aabb(m, [size[0] / 2, size[1] / 2, size[2] / 2]), solid: true }); return this; }
  /** Rótulo plano. `rot` es local: 0 = mira hacia el frente (+Z) del marco actual. */
  plate(pos: V3, text: string, h = 0.5, o: { rot?: number; fg?: string; bg?: string } = {}) { this.plates.push({ pos: this.w(pos), rot: this.yaw + (o.rot ?? 0), text, h, fg: o.fg, bg: o.bg }); return this; }
}

function geoOf(p: Piece): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  if (p.g === 'box') { const b = art.boxGeometry?.(p.dims[0], p.dims[1], p.dims[2]); g = b ? b.clone() : new THREE.BoxGeometry(p.dims[0], p.dims[1], p.dims[2]); }
  else if (p.g === 'cyl') g = new THREE.CylinderGeometry(p.dims[2], p.dims[0], p.dims[1], p.dims[3]);
  else g = new THREE.SphereGeometry(p.dims[0], 16, 10);
  if (g.index) { const n = g.toNonIndexed(); g.dispose(); g = n; }
  g.applyMatrix4(p.m); g.morphAttributes = {}; return g;
}
const signature = (g: THREE.BufferGeometry) => Object.keys(g.attributes).sort().map(k => k + g.attributes[k].itemSize).join(',');

interface Built { key: string; geo: THREE.BufferGeometry; mat: MatKind; color: string; cast: boolean }
function build(pieces: Piece[]): Built[] {
  const groups = new Map<string, { mat: MatKind; color: string; cast: boolean; geos: THREE.BufferGeometry[] }>();
  for (const p of pieces) {
    const g = geoOf(p), key = `${p.mat}|${p.color}|${p.cast ? 1 : 0}|${signature(g)}`;
    let e = groups.get(key); if (!e) groups.set(key, e = { mat: p.mat, color: p.color, cast: p.cast, geos: [] });
    e.geos.push(g);
  }
  const out: Built[] = [];
  for (const [key, e] of groups) {
    const geo = e.geos.length === 1 ? e.geos[0] : mergeGeometries(e.geos, false);
    if (geo) { if (e.geos.length > 1) e.geos.forEach(g => g.dispose()); out.push({ key, geo, mat: e.mat, color: e.color, cast: e.cast }); }
    else e.geos.forEach((g, i) => out.push({ key: key + i, geo: g, mat: e.mat, color: e.color, cast: e.cast }));
  }
  return out;
}

/** Dibuja y registra la colisión de todo lo acumulado en un Kit. */
export function Static({ kit, shadows = true }: { kit: Kit; shadows?: boolean }) {
  const built = useMemo(() => build(kit.pieces), [kit]);
  useLayoutEffect(() => { for (const c of kit.colliders) phys.add(c); return () => { for (const c of kit.colliders) phys.remove(c); }; }, [kit]);
  useEffect(() => () => { built.forEach(b => b.geo.dispose()); }, [built]);
  return <>
    {built.map(b => <mesh key={b.key} geometry={b.geo} material={art.material(b.mat, b.color)} castShadow={shadows && b.cast} receiveShadow />)}
    {kit.plates.map((p, i) => <Plate key={i} pos={p.pos} rot={p.rot} text={p.text} h={p.h} fg={p.fg} bg={p.bg} />)}
  </>;
}
/** Cuántas mallas (llamadas de dibujo) produce un Kit; útil para vigilar el presupuesto. */
export const drawCount = (kit: Kit) => new Set(kit.pieces.map(p => `${p.mat}|${p.color}|${p.cast ? 1 : 0}`)).size;
