// Herramientas compartidas por la utilería Roblox: caché de geometría fusionada, colisionadores, rótulos de texto.
import { useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { boxCol, cylCol, textTexture, useCollider } from '../../core';
import type { PropBase } from '../types';
import { Build, type PartOpt, type V3 } from './geo';
import { vcGlass, vcMat, vcMat2, vcWater } from './mats';

const gc = new Map<string, THREE.BufferGeometry>();
/** geometría fusionada cacheada por clave (una pieza de utilería = una malla = una llamada de dibujo) */
export function geo(key: string, make: (b: Build) => void, mode: 'packed' | 'uv' = 'packed'): THREE.BufferGeometry {
  let g = gc.get(key);
  if (!g) { const b = new Build(); make(b); g = b.done(mode); gc.set(key, g); }
  return g;
}
export const useSolidCyl = (a: PropBase, r: number, h: number) => useCollider(() => cylCol([a.pos[0], a.pos[1] + (h * (a.scale ?? 1)) / 2, a.pos[2]], r * (a.scale ?? 1), h * (a.scale ?? 1), { solid: a.solid !== false }), [`${a.pos}|${a.scale}|${a.solid}|${r}|${h}`]);
export const useSolidBox = (a: PropBase, w: number, h: number, d: number) => useCollider(() => { const k = a.scale ?? 1, c = Math.abs(Math.cos(a.rot ?? 0)), s = Math.abs(Math.sin(a.rot ?? 0)); return boxCol([a.pos[0], a.pos[1] + (h * k) / 2, a.pos[2]], [(w * c + d * s) * k, h * k, (w * s + d * c) * k], { solid: a.solid !== false }); }, [`${a.pos}|${a.scale}|${a.rot}|${a.solid}|${w}|${h}|${d}`]);

export function Placed({ pos, rot = 0, scale = 1, children }: PropBase & { children?: ReactNode }) {
  return <group position={pos} rotation-y={rot} scale={scale}>{children}</group>;
}
const MATS = { solid: vcMat, two: vcMat2, glass: vcGlass, water: vcWater };
/** malla fusionada con el material compartido de color por vértice */
export function Mesh({ g, m = 'solid', cast = true, receive = true }: { g: THREE.BufferGeometry; m?: keyof typeof MATS; cast?: boolean; receive?: boolean }) {
  return <mesh geometry={g} material={MATS[m]()} castShadow={cast && m !== 'glass' && m !== 'water'} receiveShadow={receive} />;
}
/** variante estable 0..n-1 a partir de la semilla o de la posición */
export const variant = (a: PropBase, n = 4) => Math.abs(Math.floor(a.seed !== undefined ? a.seed : a.pos[0] * 7.31 + a.pos[2] * 3.17 + 0.5)) % n;

const planeGeo = new THREE.PlaneGeometry(1, 1);
const textMats = new WeakMap<THREE.Texture, THREE.Material>();
/** rótulo plano de una cara (se lee derecho solo de frente). `h` = alto en metros; el ancho sale del texto */
export function TextPlane({ text, pos, h, maxW = 99, fg = '#ffffff', bg, rotY = 0, radius = 0.15, stroke, size }: { text: string; pos: V3; h: number; maxW?: number; fg?: string; bg?: string; rotY?: number; radius?: number; stroke?: string; size?: number }) {
  const tex = useMemo(() => textTexture(text, { fg, bg, radius, stroke, size }), [text, fg, bg, radius, stroke, size]);
  const mat = useMemo(() => { let m = textMats.get(tex); if (!m) { m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, alphaTest: 0.05 }); textMats.set(tex, m); } return m; }, [tex]);
  const asp = (tex as any).aspect as number, w = Math.min(maxW, h * asp);
  return <mesh geometry={planeGeo} material={mat} position={pos} rotation-y={rotY} scale={[w, w / asp, 1]} />;
}
export const textWidth = (text: string, h: number, maxW = 99) => Math.min(maxW, h * ((textTexture(text, {}) as any).aspect as number));

const A = new THREE.Vector3(), B = new THREE.Vector3(), U = new THREE.Vector3(), N = new THREE.Vector3(), W = new THREE.Vector3();
/** cara inclinada (techo): pts[0]→pts[1] es el alero; el sombreador alinea las tejas con la pendiente */
export function slope(b: Build, pts: V3[], color: string, o: PartOpt = { k: 'roof' }) {
  A.set(...pts[0]); U.set(...pts[1]).sub(A).normalize(); B.set(...pts[2]).sub(A); N.crossVectors(U, B).normalize(); W.crossVectors(N, U);
  const v = pts.map(p => { B.set(...p).sub(A); return [p[0], p[1], p[2], B.dot(U), B.dot(W)]; });
  const tri = [v[0], v[1], v[2]]; if (v.length > 3) tri.push(v[0], v[2], v[3]);
  b.tris(tri, color, { ...o, slope: true });
}
/** caja tendida entre dos puntos (barandas, vigas): grosor t×t2 */
export function beam(b: Build, p: V3, q: V3, t: number, color: string, o: PartOpt = {}, t2 = t) {
  const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], len = Math.hypot(dx, dy, dz), flat = Math.hypot(dx, dz);
  b.box([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2], [len, t, t2], color, { ...o, r: [0, Math.atan2(-dz, dx), Math.atan2(dy, flat)] });
}
/** rueda acostada sobre el eje X (vehículos) */
export function wheel(b: Build, p: V3, r: number, w: number, hub = '#c9ccd1') {
  b.cyl(p, r, w, '#1b1b1e', { r: [0, 0, Math.PI / 2], sides: 14 });
  b.cyl(p, r * 0.52, w + 0.03, hub, { r: [0, 0, Math.PI / 2], sides: 10, k: 'shiny' });
  b.cyl(p, r * 0.18, w + 0.06, '#55585e', { r: [0, 0, Math.PI / 2], sides: 6 });
}
