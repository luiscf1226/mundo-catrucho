import { DEPARTMENTS, MAP_VIEWBOX } from '../../core/data';
import type { V3 } from '../../core/types';
export const LIMIT = { minX: -195, maxX: 195, minZ: -123, maxZ: 147 };
export const SPAWN: V3 = [-49, 0.18, 121];
export const MAPA = { cx: 0, cz: 0, s: 0.34, w: 340, d: 203.66, y: 0.18 };
export const mapPoint = (x: number, y: number): [number, number] => [
  (x - MAP_VIEWBOX[0] / 2) * MAPA.s,
  (y - MAP_VIEWBOX[1] / 2) * MAPA.s,
];
export function inRing(r: [number, number][], x: number, z: number) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i],
      b = r[j];
    if (a[1] > z !== b[1] > z && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}
const colors = {
  costa: '#a6c76c',
  sur: '#d2af59',
  valle: '#86b858',
  lago: '#75b17b',
  montana: '#598e66',
  capital: '#9bb285',
  selva: '#3d985b',
  isla: '#e2d28c',
  bosque: '#638d62',
};
export const DEPTOS = DEPARTMENTS.map((d, i) => {
  const rings = d.map.rings.map((r) => r.map(([x, y]) => mapPoint(x, y))),
    c = mapPoint(...d.map.center);
  const box: [number, number, number, number] = [Infinity, Infinity, -Infinity, -Infinity];
  let edge = Infinity;
  for (const r of rings)
    for (let j = 0; j < r.length; j++) {
      const a = r[j],
        b = r[(j + 1) % r.length];
      box[0] = Math.min(box[0], a[0]);
      box[1] = Math.min(box[1], a[1]);
      box[2] = Math.max(box[2], a[0]);
      box[3] = Math.max(box[3], a[1]);
      const dx = b[0] - a[0],
        dz = b[1] - a[1],
        t = Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
      edge = Math.min(edge, Math.hypot(c[0] - a[0] - t * dx, c[1] - a[1] - t * dz));
    }
  const height =
    d.biome === 'montana' ? 7 : d.biome === 'bosque' ? 5 : d.biome === 'capital' ? 4 : d.biome === 'valle' ? 2.3 : 0.7;
  return { ...d, i, rings, c, box, color: colors[d.biome], radius: Math.max(2, Math.min(edge * 0.88, 24)), height };
});
export function deptAt(x: number, z: number) {
  for (const d of DEPTOS) {
    if (x < d.box[0] || x > d.box[2] || z < d.box[1] || z > d.box[3]) continue;
    if (d.rings.some((r) => inRing(r, x, z))) return d.i;
  }
  return -1;
}
export function groundAt(x: number, z: number) {
  let h = MAPA.y;
  for (const d of DEPTOS) {
    const r = Math.hypot(x - d.c[0], z - d.c[1]) / d.radius;
    if (r < 1) h += d.height * (1 - r * r) ** 3;
  }
  return h;
}
export const deptNear = deptAt;
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
