// Puntos de interacción: el más cercano dentro de su radio muestra "E · etiqueta" y se activa con E o el botón táctil.
export interface Interaction { x: number; y: number; z: number; radius: number; label: string; icon?: string; onUse: () => void; enabled?: () => boolean }
export const interactions = new Set<Interaction>();
export function nearest(px: number, py: number, pz: number): Interaction | null {
  let best: Interaction | null = null, bd = Infinity;
  for (const i of interactions) {
    if (i.enabled && !i.enabled()) continue;
    const d = Math.hypot(i.x - px, i.z - pz); if (d > i.radius || Math.abs(i.y - py) > 3.5) continue;
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
