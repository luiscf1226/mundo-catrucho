// Datos compartidos por las dos versiones. La misma carpeta shared/data alimenta el proyecto de Roblox (Rojo
// convierte cada .json en un ModuleScript), así que las reglas y los precios no se duplican.

import catCentro from '../../shared/data/catalogo/centro.json';
import catNorte from '../../shared/data/catalogo/norte.json';
import catOccidente from '../../shared/data/catalogo/occidente.json';
import catSurOriente from '../../shared/data/catalogo/sur-oriente.json';
import departmentsJson from '../../shared/data/departments.json';
import minigamesJson from '../../shared/data/minigames.json';
import progressJson from '../../shared/data/progress.json';
import rewardsJson from '../../shared/data/rewards.json';
import shopJson from '../../shared/data/shop.json';
import type { AvatarConfig, Department, DeptCat, Juego, MinigameId, MinigameInfo, ShopItem, Vehiculo } from './types';

export const MAP_VIEWBOX = departmentsJson.viewBox as [number, number];
export const MAP_CREDIT = departmentsJson.credit;
export const DEPARTMENTS = departmentsJson.departments as unknown as Department[];
export const deptById = (id: string) => DEPARTMENTS.find((d) => d.id === id)!;
export const MINIGAMES = minigamesJson as unknown as MinigameInfo[];
export const minigameById = (id: MinigameId) => MINIGAMES.find((m) => m.id === id)!;
export const REWARDS = rewardsJson;
export const SHOP = shopJson as unknown as {
  skin: string[];
  palette: string[];
  hairColors: string[];
  items: ShopItem[];
  defaultAvatar: AvatarConfig;
};
export const itemById = (id: string) => SHOP.items.find((i) => i.id === id);
export const ACHIEVEMENTS = progressJson.achievements;
export const MISSIONS = progressJson.missions as {
  id: string;
  text: string;
  type: string;
  target?: string;
  count: number;
  coins: number;
  xp: number;
}[];
export const DAILY_COUNT = progressJson.dailyCount;
export const BOT_NAMES = progressJson.bots;
/** XP necesario para pasar del nivel n al n+1. */
export const xpForLevel = (n: number) => REWARDS.level.base + (n - 1) * REWARDS.level.perLevel;

// ------------------------------------------------------------------ catálogo por departamento
// Los JSON van en tuplas para que sean cortos de escribir:
//   lugares  [id, nombre, tipo, nota]      comidas [nombre, lugarId, nota]      palabras [se dice, significa]
//   juegos   [id, nombre, motor, lugarId, icono, descripción, guiño, tema, etapas]
type RawCat = { tipos: string; lugares: any[][]; comidas: any[][]; palabras: any[][]; juegos: any[][] };
const RAW = { ...catCentro, ...catNorte, ...catOccidente, ...catSurOriente } as unknown as Record<string, RawCat>;
const EMPTY: DeptCat = { id: '', tipos: '', lugares: [], comidas: [], palabras: [], juegos: [] };
export const CATALOGO: Record<string, DeptCat> = Object.fromEntries(
  Object.entries(RAW).map(([id, r]) => [
    id,
    {
      id,
      tipos: r.tipos ?? '',
      lugares: (r.lugares ?? []).map(([lid, name, kind, nota]) => ({ id: lid, name, kind, nota: nota ?? '' })),
      comidas: (r.comidas ?? []).map(([name, lugar, nota]) => ({ name, lugar, nota: nota ?? '' })),
      palabras: (r.palabras ?? []).map(([dice, es]) => ({ dice, es })),
      juegos: (r.juegos ?? []).map(([jid, name, motor, lugar, icon, desc, guino, tema, etapas]) => ({
        id: `${id}.${jid}`,
        dept: id,
        lugar,
        name,
        motor,
        icon,
        desc,
        guino: guino ?? '',
        tema: tema ?? {},
        etapas: etapas ?? 3,
      })),
    },
  ]),
);
export const catDe = (dept: string): DeptCat => CATALOGO[dept] ?? { ...EMPTY, id: dept };
export const JUEGOS: Juego[] = Object.values(CATALOGO).flatMap((c) => c.juegos);
export const juegoById = (id: string) => JUEGOS.find((j) => j.id === id);
/** Palabras de todo el país, para las opciones falsas de las trivias. */
export const PALABRAS = Object.values(CATALOGO).flatMap((c) => c.palabras);
export const TRANSPORTES: { id: Vehiculo; name: string; precio: number; nota: string; icon: string }[] = [
  { id: 'rapidito', name: 'Rapidito', precio: 4, nota: 'Rápido y loco. Música a todo volumen.', icon: '🚐' },
  { id: 'bus', name: 'Bus amarillo', precio: 2, nota: 'Lento pero aguanta todo.', icon: '🚌' },
  { id: 'taxi', name: 'Taxi', precio: 12, nota: 'Directo y más tranquilo.', icon: '🚕' },
];
