// Lo que usa un minijuego para hablar con el resto del juego.

import { deptById, juegoById, minigameById } from '../../core/data';
import type { MgHud } from '../../core/store';
import { useGame } from '../../core/store';
import type { Department, Juego, MinigameId, MinigameResult, Modo } from '../../core/types';

/** Fase actual: 'intro' (tarjeta de inicio), 'playing', 'ended' (resultados). Cambia con re-render. */
export const useMgPhase = () => useGame((s) => s.mg?.phase ?? 'intro');
/** Reglas del minijuego tal como están en shared/data/minigames.json. */
export const rulesOf = (id: MinigameId) => minigameById(id).rules;
/** Actualiza el HUD del minijuego (cronómetro en segundos, marcador, objetivo, líneas extra). Llamar seguido es barato. */
export const setHud = (h: MgHud) => useGame.getState().setMgHud(h);
/** Termina la partida: calcula recompensas y muestra resultados. Solo cuenta la primera llamada. */
export const finish = (r: MinigameResult) => useGame.getState().finishMinigame(r);
/** Estrellas según umbrales: mayor es mejor (o menor es mejor con lowerIsBetter). */
export function starsFor(
  value: number,
  bronze: number,
  silver: number,
  gold: number,
  lowerIsBetter = false,
): 0 | 1 | 2 | 3 {
  const ok = (t: number) => (lowerIsBetter ? value <= t : value >= t);
  return ok(gold) ? 3 : ok(silver) ? 2 : ok(bronze) ? 1 : 0;
}
export const fmtTime = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.floor(Math.max(0, s) % 60)).padStart(2, '0')}`;

// ------------------------------------------------------------------ partida (catálogo, etapas y modos)
export interface Partida {
  /** juego del catálogo; null si el motor se abrió directo (pruebas) */ juego: Juego | null;
  /** tema del departamento para este motor; SIEMPRE con valores por defecto del lado del motor */ tema: Record<
    string,
    any
  >;
  /** etapa actual (0 = primera) y total */ etapa: number;
  etapas: number;
  /** dificultad 0..1 según la etapa */ dif: number;
  modo: Modo;
  dept: Department | null;
  /** semilla estable para esta etapa (cambia en cada intento) */ seed: number;
}
/** Foto de la partida actual. Llamala una vez al montar la escena: `const P = useMemo(partida, [])`. */
export function partida(): Partida {
  const mg = useGame.getState().mg,
    j = mg?.juego ? (juegoById(mg.juego) ?? null) : null;
  const etapas = j?.etapas ?? 1,
    etapa = Math.max(0, Math.min(etapas - 1, mg?.etapa ?? 0));
  let h = 2166136261;
  for (const c of `${j?.id ?? mg?.id}|${etapa}|${mg?.run ?? 0}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return {
    juego: j,
    tema: j?.tema ?? {},
    etapa,
    etapas,
    dif: etapas > 1 ? etapa / (etapas - 1) : 0.35,
    modo: mg?.modo ?? 'solo',
    dept: j ? deptById(j.dept) : null,
    // MC-25: entre dos, la semilla de la partida (la misma para los dos)
    seed: mg?.juntos?.semilla ?? h,
  };
}
/** Generador pseudoaleatorio con semilla (mulberry32). */
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
/** Lo que la tarjeta de inicio muestra de cada motor. Cada motor exporta `guia`. */
export interface Guia {
  goal: string;
  keys: [string, string][];
  touch: [string, string][] /** metas de 1, 2 y 3 estrellas */;
  metas: (p: Partida) => [string, string, string];
}
