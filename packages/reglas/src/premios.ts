// Premios y niveles. Los números salen de apps/web/shared/data/rewards.json, que también lee Roblox.
import rewards from '../../../apps/web/shared/data/rewards.json' with { type: 'json' };

export interface Premio {
  monedas: number;
  xp: number;
}
export interface TablaPremios {
  currency: string;
  level: { base: number; perLevel: number; max: number };
  minigame: {
    lose: { coins: number; xp: number };
    win: { coins: number; xp: number };
    perStar: { coins: number; xp: number };
  };
  world: { coinPickup: number; collectible: { coins: number; xp: number }; firstVisit: { coins: number; xp: number } };
  levelUp: { coins: number };
}

/** La tabla tal como está en rewards.json (nombres en inglés por compatibilidad con Roblox). */
export const PREMIOS: TablaPremios = rewards;
export const MONEDA = PREMIOS.currency;

export type Estrellas = 0 | 1 | 2 | 3;
/** Estrellas de una partida, siempre entre 0 y 3. */
export const acotarEstrellas = (n: number): Estrellas => Math.max(0, Math.min(3, n)) as Estrellas;

/** Premio por terminar una partida: ganar paga base + cada estrella; perder paga un consuelo fijo. */
export function premioPartida({ gano, estrellas }: { gano: boolean; estrellas: number }): Premio & {
  estrellas: Estrellas;
} {
  const R = PREMIOS.minigame,
    e = acotarEstrellas(estrellas);
  return gano
    ? { monedas: R.win.coins + e * R.perStar.coins, xp: R.win.xp + e * R.perStar.xp, estrellas: e }
    : { monedas: R.lose.coins, xp: R.lose.xp, estrellas: e };
}

// ------------------------------------------------------------------ niveles
export const NIVEL_MAX = PREMIOS.level.max;
/** XP necesaria para pasar del nivel n al n+1. */
export const xpParaNivel = (n: number) => PREMIOS.level.base + (n - 1) * PREMIOS.level.perLevel;

export interface Avance {
  nivel: number;
  xp: number;
}
/**
 * Suma XP y sube los niveles que alcancen (sin pasar de `NIVEL_MAX`; en el tope la XP se sigue juntando).
 * `monedas` es el premio por subir: `PREMIOS.levelUp.coins` por cada nivel ganado.
 */
export function ganarXp(a: Avance, n: number): Avance & { subidas: number; monedas: number } {
  let { nivel, xp } = a,
    subidas = 0;
  xp += n;
  while (nivel < NIVEL_MAX && xp >= xpParaNivel(nivel)) {
    xp -= xpParaNivel(nivel);
    nivel++;
    subidas++;
  }
  return { nivel, xp, subidas, monedas: subidas * PREMIOS.levelUp.coins };
}

// ------------------------------------------------------------------ mundo
/** Primera vez que se entra a un departamento. */
export const PREMIO_PRIMERA_VISITA: Premio = {
  monedas: PREMIOS.world.firstVisit.coins,
  xp: PREMIOS.world.firstVisit.xp,
};
/** Recuerdo (coleccionable) de un departamento, una sola vez. */
export const PREMIO_RECUERDO: Premio = { monedas: PREMIOS.world.collectible.coins, xp: PREMIOS.world.collectible.xp };
/** Moneda suelta del mapa. */
export const MONEDA_SUELTA = PREMIOS.world.coinPickup;
/** Tope del bono que paga un viaje por carretera al llegar. */
export const BONO_VIAJE_MAX = 30;
/** Monedas del bono de viaje: se redondea y nunca pasa de `BONO_VIAJE_MAX`. */
export const bonoViaje = (bono: number) => (bono > 0 ? Math.min(BONO_VIAJE_MAX, Math.round(bono)) : 0);
