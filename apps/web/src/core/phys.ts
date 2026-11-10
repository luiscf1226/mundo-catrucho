// Física ligera hecha a mano: un personaje (círculo + altura) contra cajas y cilindros estáticos o móviles.
// Soporta gravedad, salto, pararse encima de cosas, subir escalones bajos y plataformas que se mueven.
// No hay rampas: el terreno con relieve se da con `phys.ground = (x, z) => altura`.
import type { V3 } from './types';

export interface BoxCol { type: 'box'; min: V3; max: V3; solid: boolean; tag?: string; vel?: V3 }
export interface CylCol { type: 'cyl'; x: number; z: number; r: number; y0: number; y1: number; solid: boolean; tag?: string; vel?: V3 }
export type Collider = BoxCol | CylCol;
export interface Body { pos: V3; vel: V3; radius: number; height: number; grounded: boolean; on: Collider | null }

export const GRAVITY = 26;
const STEP = 0.36;

class PhysWorld {
  colliders = new Set<Collider>();
  /** altura del suelo en (x, z); por defecto, plano en y = 0 */
  ground: (x: number, z: number) => number = () => 0;
  /** por debajo de esta altura el jugador reaparece */
  killY = -25;
  /** límite del mundo jugable: radio alrededor del origen, o caja */
  limit: { r: number } | { minX: number; maxX: number; minZ: number; maxZ: number } | null = null;
  reset() { this.colliders.clear(); this.ground = () => 0; this.killY = -25; this.limit = null; }
  add<T extends Collider>(c: T): T { this.colliders.add(c); return c; }
  remove(c: Collider) { this.colliders.delete(c); }
  box(center: V3, size: V3, extra: Partial<BoxCol> = {}): BoxCol {
    return this.add({ type: 'box', min: [center[0] - size[0] / 2, center[1] - size[1] / 2, center[2] - size[2] / 2], max: [center[0] + size[0] / 2, center[1] + size[1] / 2, center[2] + size[2] / 2], solid: true, ...extra });
  }
  cyl(x: number, z: number, r: number, y0: number, y1: number, extra: Partial<CylCol> = {}): CylCol { return this.add({ type: 'cyl', x, z, r, y0, y1, solid: true, ...extra }); }
}
export const phys = new PhysWorld();

const top = (c: Collider) => (c.type === 'box' ? c.max[1] : c.y1);
const bottom = (c: Collider) => (c.type === 'box' ? c.min[1] : c.y0);
/** ¿El punto (x, z) está sobre la huella del colisionador, con un margen? */
function over(c: Collider, x: number, z: number, pad: number) {
  if (c.type === 'box') return x > c.min[0] - pad && x < c.max[0] + pad && z > c.min[2] - pad && z < c.max[2] + pad;
  return Math.hypot(x - c.x, z - c.z) < c.r + pad;
}
/** Empuja el círculo (x, z, r) fuera del colisionador. Devuelve true si hubo contacto. */
function pushOut(c: Collider, p: V3, r: number) {
  if (c.type === 'cyl') {
    const dx = p[0] - c.x, dz = p[2] - c.z, d = Math.hypot(dx, dz), m = c.r + r;
    if (d >= m) return false;
    if (d < 1e-5) { p[0] += m; return true; }
    p[0] = c.x + (dx / d) * m; p[2] = c.z + (dz / d) * m; return true;
  }
  const cx = Math.max(c.min[0], Math.min(c.max[0], p[0])), cz = Math.max(c.min[2], Math.min(c.max[2], p[2]));
  const dx = p[0] - cx, dz = p[2] - cz, d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-8) { const d = Math.sqrt(d2); p[0] = cx + (dx / d) * r; p[2] = cz + (dz / d) * r; return true; }
  // el centro está dentro de la caja: sale por el lado más cercano
  const l = p[0] - c.min[0], rr = c.max[0] - p[0], n = p[2] - c.min[2], f = c.max[2] - p[2], m = Math.min(l, rr, n, f);
  if (m === l) p[0] = c.min[0] - r; else if (m === rr) p[0] = c.max[0] + r; else if (m === n) p[2] = c.min[2] - r; else p[2] = c.max[2] + r;
  return true;
}

/** Avanza un cuerpo un paso de tiempo. `vel` horizontal la decide quien controla el cuerpo. */
export function stepBody(b: Body, dt: number) {
  const p = b.pos, v = b.vel;
  if (b.grounded && b.on?.vel) { p[0] += b.on.vel[0] * dt; p[1] += b.on.vel[1] * dt; p[2] += b.on.vel[2] * dt; }
  v[1] -= GRAVITY * dt;
  // horizontal, en dos subpasos para no atravesar paredes delgadas
  for (let i = 0; i < 2; i++) {
    p[0] += v[0] * dt * 0.5; p[2] += v[2] * dt * 0.5;
    for (const c of phys.colliders) {
      if (!c.solid) continue;
      const t = top(c), bo = bottom(c);
      if (p[1] + b.height <= bo + 0.02 || p[1] >= t - 0.02) continue;
      if (b.grounded && t - p[1] <= STEP && over(c, p[0], p[2], b.radius * 0.9)) { p[1] = t; continue; } // escalón: sube en cuanto lo toca
      pushOut(c, p, b.radius);
    }
  }
  const lim = phys.limit;
  if (lim) {
    if ('r' in lim) { const d = Math.hypot(p[0], p[2]); if (d > lim.r) { p[0] *= lim.r / d; p[2] *= lim.r / d; } }
    else { p[0] = Math.max(lim.minX, Math.min(lim.maxX, p[0])); p[2] = Math.max(lim.minZ, Math.min(lim.maxZ, p[2])); }
  }
  // vertical
  const y0 = p[1], y1 = y0 + v[1] * dt;
  let support = phys.ground(p[0], p[2]), on: Collider | null = null;
  for (const c of phys.colliders) {
    if (!c.solid || !over(c, p[0], p[2], b.radius * 0.9)) continue;
    const t = top(c);
    if (t <= y0 + 0.05 && t > support) { support = t; on = c; }
    if (v[1] > 0) { const bo = bottom(c); if (y0 + b.height <= bo + 0.05 && y1 + b.height > bo) { v[1] = 0; } } // techo
  }
  const ny = y0 + v[1] * dt;
  if (v[1] <= 0 && ny <= support + 1e-4) { p[1] = support; v[1] = 0; b.grounded = true; b.on = on; }
  else { p[1] = ny; b.grounded = false; b.on = null; }
}

/** Colisión simple de una esfera (pelota, proyectil) contra el mundo: rebota y devuelve el colisionador tocado. */
export function bounceSphere(pos: V3, vel: V3, r: number, restitution = 0.6): Collider | null {
  let hit: Collider | null = null;
  for (const c of phys.colliders) {
    if (!c.solid) continue;
    if (pos[1] - r >= top(c) || pos[1] + r <= bottom(c)) {
      continue;
    }
    const before: V3 = [pos[0], pos[1], pos[2]];
    if (pos[1] > top(c) - r * 0.5 && over(c, pos[0], pos[2], 0) && vel[1] < 0) { pos[1] = top(c) + r; vel[1] = -vel[1] * restitution; hit = c; continue; }
    if (!pushOut(c, pos, r)) continue;
    const nx = pos[0] - before[0], nz = pos[2] - before[2], n = Math.hypot(nx, nz) || 1, dot = (vel[0] * nx + vel[2] * nz) / n;
    if (dot < 0) { vel[0] -= (1 + restitution) * dot * (nx / n); vel[2] -= (1 + restitution) * dot * (nz / n); }
    hit = c;
  }
  const g = phys.ground(pos[0], pos[2]);
  if (pos[1] - r < g) { pos[1] = g + r; if (vel[1] < 0) vel[1] = -vel[1] * restitution; if (Math.abs(vel[1]) < 1.2) vel[1] = 0; }
  return hit;
}
