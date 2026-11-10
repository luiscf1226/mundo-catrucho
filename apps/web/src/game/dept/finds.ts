// Objetos de Exploradores para las zonas que no los traen a mano: nombres y datos salen del catálogo del departamento
// (lugares y comidas) y del propio departamento; las posiciones se buscan solas en suelo firme y caminable.
import { catDe } from '../../core/data';
import type { Department, V3 } from '../../core/types';
import { rectOf } from './ext';
import { colliderOf, isSolid, rng } from './lib';
import type { Find, ZoneSpec } from './zone';

const POR_TIPO: Record<string, [string, string, string]> = {
  ciudad: ['🗝️', 'Llave vieja', '#c9a227'],
  pueblo: ['🏺', 'Cántaro de barro', '#b5651d'],
  playa: ['🐚', 'Caracol', '#ffb4a2'],
  montana: ['🪨', 'Piedra del cerro', '#9a958a'],
  lago: ['🪝', 'Anzuelo', '#d8dee9'],
  rio: ['🛶', 'Remo chiquito', '#a0703c'],
  ruinas: ['🗿', 'Figurita tallada', '#b3ab92'],
  parque: ['🦋', 'Mariposa', '#4cc9f0'],
  isla: ['🐚', 'Concha', '#ffd6a5'],
  mercado: ['🧺', 'Canastita', '#d4a373'],
  iglesia: ['🔔', 'Campanita', '#e8c547'],
  estadio: ['⚽', 'Pelota firmada', '#ffffff'],
  cueva: ['🦇', 'Murciélago de barro', '#6d597a'],
  finca: ['☕', 'Grano de café', '#7f4f24'],
  selva: ['🦜', 'Pluma de guara', '#e63946'],
  puerto: ['⚓', 'Ancla', '#4a5560'],
  fuerte: ['💣', 'Bala de cañón', '#3f3f46'],
};

/** Nombres y datos del departamento (sin posición). */
function nombres(d: Department): Omit<Find, 'pos'>[] {
  const c = catDe(d.id),
    out: Omit<Find, 'pos'>[] = [];
  for (const l of c.lugares) {
    const [icon, n, color] = POR_TIPO[l.kind] ?? ['⭐', 'Recuerdo', '#ffd23f'];
    out.push({ id: `l-${l.id}`, name: `${n} de ${l.name}`, icon, color, fact: l.nota });
  }
  c.comidas.forEach((f, i) => out.push({ id: `c-${i}`, name: f.name, icon: '🍽️', color: '#f4a261', fact: f.nota }));
  out.push(
    { id: 'recuerdo', name: d.collectible, icon: '💎', color: d.colors[1], fact: d.fact },
    {
      id: 'postal',
      name: `Postal de ${d.landmark.name}`,
      icon: '🖼️',
      color: d.colors[0],
      fact: `${d.landmark.name} queda en ${d.name}. Cabecera: ${d.cabecera}.`,
    },
    { id: 'bandera', name: `Banderín de ${d.name}`, icon: '🚩', color: d.colors[0], fact: `Bienvenido a ${d.name}.` },
    {
      id: 'mapa',
      name: `Mapa de ${d.cabecera}`,
      icon: '🗺️',
      color: '#e9d8a6',
      fact: `${d.cabecera} es la cabecera de ${d.name}.`,
    },
  );
  // primero un poco de todo: lugares y comidas intercalados
  const ls = out.filter((f) => f.id.startsWith('l-')),
    cs = out.filter((f) => f.id.startsWith('c-')),
    rest = out.filter((f) => !/^[lc]-/.test(f.id)),
    mix: Omit<Find, 'pos'>[] = [];
  for (let i = 0; i < Math.max(ls.length, cs.length); i++) {
    if (ls[i]) mix.push(ls[i]);
    if (cs[i] && i < 2) mix.push(cs[i]);
  }
  return [...mix, ...rest];
}

/** Completa `spec.finds` hasta `n` objetos en lugares caminables y repartidos. */
export function autoFinds(d: Department, spec: ZoneSpec, n = 5) {
  const have = spec.finds ?? [];
  if (have.length >= n) return;
  const r = rng(d.id.length * 977 + d.id.charCodeAt(0)),
    rc = rectOf(spec.limit),
    h = spec.f.h,
    m = 5;
  const solids = spec.pcs.filter(isSolid).map(colliderOf),
    names = nombres(d).filter((x) => !have.some((f) => f.id === x.id));
  const blocked = (x: number, z: number) =>
    solids.some((c) =>
      c.type === 'box'
        ? x > c.min[0] - 1 && x < c.max[0] + 1 && z > c.min[2] - 1 && z < c.max[2] + 1
        : Math.hypot(x - c.x, z - c.z) < c.r + 1,
    );
  const pts: V3[] = have.map((f) => f.pos);
  for (let sep = 16; sep >= 4 && pts.length < n; sep -= 3)
    for (let k = 0; k < 400 && pts.length < n; k++) {
      const x = rc.minX + m + r() * (rc.maxX - rc.minX - 2 * m),
        z = rc.minZ + m + r() * (rc.maxZ - rc.minZ - 2 * m),
        y = h(x, z);
      if (
        Math.hypot(x - spec.spawn[0], z - spec.spawn[2]) < 9 ||
        y < -0.25 ||
        Math.abs(h(x + 1, z) - h(x - 1, z)) > 0.8 ||
        Math.abs(h(x, z + 1) - h(x, z - 1)) > 0.8
      )
        continue;
      if (spec.bad?.(x, y, z) || blocked(x, z) || pts.some((p) => Math.hypot(p[0] - x, p[2] - z) < sep)) continue;
      pts.push([+x.toFixed(2), +y.toFixed(2), +z.toFixed(2)]);
    }
  spec.finds = [
    ...have,
    ...pts.slice(have.length).map((pos, i) => ({
      ...names[i % names.length],
      id: `${names[i % names.length].id}${i >= names.length ? i : ''}`,
      pos,
    })),
  ];
}
