// Tabla de clasificación local: rivales simulados con puntajes fijos + tu mejor marca.
// La interfaz `Row` es la misma que devolvería un servidor; cambiar la fuente no toca la UI.
import { BOT_NAMES, minigameById } from './data';
import type { MinigameId } from './types';
import type { Profile } from './store';

export interface Row { name: string; score: number; label: string; you?: boolean }
const RANGE: Partial<Record<MinigameId, [number, number]>> = { carrera: [300, 900], futbol: [0, 5], feria: [80, 430], exploradores: [4, 15], pulperia: [60, 280] };
export function scoreLabel(id: MinigameId, score: number): string {
  if (id === 'carrera') { const t = Math.max(0, minigameById('carrera').rules.timeLimit - score / 10); return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`; }
  if (id === 'futbol') return `${score} goles`;
  if (id === 'exploradores') return `${score} objetos`;
  return `${score} pts`;
}
export function leaderboard(id: MinigameId, profile: Profile): Row[] {
  const [lo, hi] = RANGE[id] ?? [60, 400];
  const rows: Row[] = BOT_NAMES.slice(0, 9).map((name, i) => {
    let h = 7; for (const c of name + id) h = (h * 33 + c.charCodeAt(0)) >>> 0;
    const score = Math.round(lo + ((h % 1000) / 1000) * (hi - lo) * (1 - i * 0.04));
    return { name, score, label: scoreLabel(id, score) };
  });
  const best = profile.best[id];
  if (best) rows.push({ name: profile.name, score: best.score, label: best.label, you: true });
  return rows.sort((a, b) => b.score - a.score);
}
