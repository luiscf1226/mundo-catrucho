// Memes catrachos: frases, imágenes y álbum. Los datos viven en shared/data/memes.json (sin 3D, portátil).
// Desbloquear un meme no da monedas ni XP: solo llena el álbum.
import memesJson from '../../shared/data/memes.json';
import type { MinigameId } from './types';

export type Escena =
  | 'pulperia'
  | 'bus'
  | 'calor'
  | 'frio'
  | 'lluvia'
  | 'comida'
  | 'cafe'
  | 'futbol'
  | 'playa'
  | 'montana'
  | 'mercado'
  | 'fiesta'
  | 'casa'
  | 'luz'
  | 'maiz'
  | 'pesca'
  | 'ruinas'
  | 'trafico';
/** Motores que se repiten en varios departamentos (los exclusivos, como 'cortes.chuco', solo ven 'todos'). */
export type MotorComun = Extract<
  MinigameId,
  | 'carrera'
  | 'futbol'
  | 'feria'
  | 'exploradores'
  | 'pulperia'
  | 'corte'
  | 'monta'
  | 'ritmo'
  | 'ruta'
  | 'pesca'
  | 'atrapa'
  | 'cocina'
  | 'trivia'
  | 'manejo'
>;
/** 'todos' = sale en cualquier juego; si no, solo en los juegos de esos motores. */
export type TemaMeme = 'todos' | MotorComun;
export interface Meme {
  id: string;
  /** null = de todo Honduras */
  dept: string | null;
  tipo: 'frase' | 'dicho' | 'viral' | 'rivalidad';
  nombre: string;
  /** línea corta que sale como aviso durante los juegos */
  frase: string;
  arriba: string;
  abajo: string;
  escena: Escena;
  emoji: string;
  temas: TemaMeme[];
  queEs: string;
  fuente: string;
}

/** El contenido lo revisa `tools/test-memes.mjs --datos` (dentro de `pnpm check`). */
export const MEMES: readonly Meme[] = memesJson as Meme[];
const POR_ID = new Map(MEMES.map((m) => [m.id, m]));
export const memeById = (id: string) => POR_ID.get(id);
export const memesDeDept = (dept: string | null) => MEMES.filter((m) => m.dept === dept);

/** Memes de un juego: los de su departamento y los nacionales de ese motor (o de todos). Nunca vacío si hay nacionales. */
export function memesDelJuego(dept: string | undefined, motor: MinigameId): Meme[] {
  const propios = dept ? memesDeDept(dept) : [],
    nacionales = memesDeDept(null),
    delMotor = nacionales.filter((m) => m.temas.some((t) => t === 'todos' || t === motor));
  const pool = [...propios, ...delMotor];
  return pool.length ? pool : nacionales;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
};
/** Escoge siempre el mismo meme para la misma semilla, prefiriendo los que no están en `vistos`. */
export function elegirMeme(pool: readonly Meme[], seed: string, vistos: readonly string[]): Meme | undefined {
  const nuevos = pool.filter((m) => !vistos.includes(m.id)),
    de = nuevos.length ? nuevos : pool;
  return de.length ? de[hash(seed) % de.length] : undefined;
}
