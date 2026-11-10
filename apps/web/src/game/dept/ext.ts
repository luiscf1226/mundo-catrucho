// Ampliación de cada zona hacia +Z (detrás de la parada): ahí van las estaciones de los lugares del departamento.
// Aplana el terreno de esa franja, quita lo que estorba y calcula el trazado (plaza, estaciones, límites).
import type { ZoneSpec } from './zone';
import type { Lugar } from '../../core/types';
import { clamp, ss, type XZ } from './lib';

export interface Rect { minX: number; maxX: number; minZ: number; maxZ: number }
export const rectOf = (l: ZoneSpec['limit']): Rect => ('r' in l ? { minX: -l.r, maxX: l.r, minZ: -l.r, maxZ: l.r } : l);

/** Aplana el terreno al sur del borde de la zona y quita piezas y utilería que queden ahí. Se llama una vez por zona. */
export function openSouth(spec: ZoneSpec) {
  const z0 = rectOf(spec.limit).maxZ, f = spec.f, n = f.n;
  for (let j = 0; j < n; j++) {
    const z = -f.half + j * f.cell, k = ss(z0 - 1, z0 + 5, z); if (k <= 0) continue;
    for (let i = 0; i < n; i++) f.data[j * n + i] *= 1 - k;
  }
  spec.pcs = spec.pcs.filter(q => q.p[2] < z0 + 2);
  spec.nodes = spec.nodes.filter(nd => { const p = (nd as any)?.props?.children?.props?.pos; return !Array.isArray(p) || p[2] < z0 + 2; });
  spec.plaques = spec.plaques.filter(p => p.pos[2] < z0 + 2);
}

export interface StationLay { lugar: Lugar; pos: XZ; rot: number; ang: number }
export interface Layout { z0: number; c: XZ; r: number; st: StationLay[]; old: Rect; neck: Rect; main: Rect; ground: { size: [number, number]; pos: [number, number, number] } }

/** Trazado en abanico: plaza en la entrada sur, estaciones en un arco alrededor de ella mirando a la plaza. */
export function layoutOf(spec: ZoneSpec, lugares: Lugar[]): Layout {
  const old = rectOf(spec.limit), z0 = old.maxZ, c: XZ = [0, z0 + 9], n = lugares.length;
  const r = n <= 1 ? 28 : clamp((28 * (n - 1)) / 2.5, 34, 92), A = n <= 1 ? 0 : Math.min(1.25, 0.32 * (n - 1));
  const st = lugares.map((lugar, i) => { const ang = n <= 1 ? 0 : -A + (2 * A * i) / (n - 1); return { lugar, ang, rot: ang + Math.PI, pos: [c[0] + Math.sin(ang) * r, c[1] + Math.cos(ang) * r] as XZ }; });
  const W = Math.max(old.maxX, ...st.map(s => Math.abs(s.pos[0]) + 17)), zMax = Math.max(c[1] + 14, ...st.map(s => s.pos[1] + 17));
  const neck: Rect = { minX: Math.max(old.minX, -14), maxX: Math.min(old.maxX, 14), minZ: z0 - 1, maxZ: z0 + 7 };
  const main: Rect = { minX: -W, maxX: W, minZ: z0 + 6, maxZ: zMax };
  return { z0, c, r, st, old, neck, main, ground: { size: [2 * W + 60, zMax - z0 + 40], pos: [0, 0, (z0 + 4 + zMax + 36) / 2] } };
}

/** Punto más cercano dentro de la unión de rectángulos. */
export function clampTo(rs: Rect[], x: number, z: number): XZ {
  let best: XZ = [x, z], bd = Infinity;
  for (const r of rs) {
    const cx = clamp(x, r.minX, r.maxX), cz = clamp(z, r.minZ, r.maxZ), d = (cx - x) ** 2 + (cz - z) ** 2;
    if (d === 0) return [x, z]; if (d < bd) { bd = d; best = [cx, cz]; }
  }
  return best;
}
