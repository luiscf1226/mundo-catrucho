// Bots de relleno (MC-23): con poca gente en una sala de zona, la sala agrega bots que caminan en circuitos
// sencillos alrededor del punto de aparición. No mandan posiciones: se reparten una vez con su ruta y cada
// juego los mueve con el reloj (todos los ven en el mismo sitio). Van marcados `bot: true` y no cuentan como gente.

export const BOTS = {
  /** con menos de esta gente en la sala hay bots */
  gente: 4,
  /** como mucho tantos bots */
  max: 3,
} as const;
/** Cuántos bots tocan con `humanos` personas: ninguno si la sala está vacía (nadie los vería). */
export const cuantosBots = (humanos: number) =>
  humanos <= 0 ? 0 : Math.min(BOTS.max, Math.max(0, BOTS.gente - humanos));

export interface BotSala {
  id: string;
  nombre: string;
  avatar: Record<string, string>;
  bot: true;
  /** circuito cerrado en metros, relativo al punto de aparición de la escena: [dx, dz][] */
  ruta: [number, number][];
  /** metros por segundo */
  vel: number;
  /** segundos de ventaja en el circuito, para que no caminen juntos */
  fase: number;
}
const NOMBRES = ['Chepe', 'Lupita', 'Toño', 'Marlen', 'Wilmer', 'Yeni'];
const CAMISAS = ['#e76f51', '#2a9d8f', '#e9c46a', '#8338ec', '#3a86ff', '#ff006e'];
const PIELES = ['#8d5524', '#c68642', '#e0ac69', '#a26b3f'];
function azar(semilla: string) {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return () => {
    h = (h + 0x6d2b79f5) >>> 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** Los primeros `n` bots de una sala. Siempre los mismos para esa sala: entran y salen por el final de la lista. */
export function botsDe(sala: string, n: number): BotSala[] {
  // nombres seguidos desde un punto de la lista: nunca dos iguales en la misma sala
  const base = Math.floor(azar(sala)() * NOMBRES.length);
  return Array.from({ length: Math.min(n, BOTS.max) }, (_, i) => {
    const r = azar(`${sala}|${i}`),
      ang = (i / BOTS.max) * Math.PI * 2 + r() * 0.8,
      lejos = 6 + r() * 3,
      cx = Math.sin(ang) * lejos,
      cz = -Math.cos(ang) * lejos,
      radio = 2 + r() * 1.5;
    const ruta = Array.from({ length: 6 }, (_, k): [number, number] => {
      const a = (k / 6) * Math.PI * 2;
      return [Math.round((cx + Math.cos(a) * radio) * 100) / 100, Math.round((cz + Math.sin(a) * radio) * 100) / 100];
    });
    return {
      id: `bot-${i}`,
      nombre: NOMBRES[(base + i) % NOMBRES.length],
      avatar: {
        shirtColor: CAMISAS[Math.floor(r() * CAMISAS.length)],
        skin: PIELES[Math.floor(r() * PIELES.length)],
        pantsColor: '#2b2d42',
      },
      bot: true,
      ruta,
      vel: Math.round((1.2 + r() * 0.6) * 100) / 100,
      fase: Math.round(r() * 20),
    };
  });
}
/** Mensajes para pasar de `antes` a `despues` humanos: bots que se van (`sale`) o que entran (`entra` con bot). */
export function cambiosDeBots(sala: string, antes: number, despues: number) {
  const a = cuantosBots(antes),
    d = cuantosBots(despues);
  if (d < a)
    return botsDe(sala, a)
      .slice(d)
      .map((b) => ({ t: 'sale', id: b.id, bot: true }));
  return botsDe(sala, d)
    .slice(a)
    .map((b) => ({ t: 'entra', ...b }));
}
