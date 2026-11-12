// La pulpería: qué se puede comprar, cuánto cuesta y qué te podés poner. Los precios salen de
// apps/web/shared/data/shop.json; el servidor nunca acepta un precio que mande el navegador.
import shop from '../../../apps/web/shared/data/shop.json' with { type: 'json' };

export type Ranura = 'hair' | 'face' | 'shirt' | 'pants' | 'hat' | 'acc';
export interface Avatar {
  body?: 'h' | 'm';
  skin: string;
  hair: string;
  hairColor: string;
  face: string;
  shirt: string;
  shirtColor: string;
  pants: string;
  pantsColor: string;
  hat: string;
  hatColor: string;
  acc: string;
  accColor: string;
}
export interface Articulo {
  id: string;
  cat: string;
  price: number;
  set?: Record<string, string>;
  soloSet?: boolean;
}

export const ARTICULOS = shop.items as Articulo[];
export const AVATAR_INICIAL = shop.defaultAvatar as Avatar;
/** Lempiritas con las que empieza un perfil nuevo. */
export const MONEDAS_INICIALES = 100;
/** Lo que se tiene sin comprar: todo lo de precio 0 que se vende suelto. */
export const GRATIS = ARTICULOS.filter((i) => i.price === 0 && !i.soloSet).map((i) => i.id);
export const articuloPorId = (id: string) => ARTICULOS.find((i) => i.id === id);
/** Qué parte del avatar cambia cada categoría (atuendo y emote no tienen una sola). */
export const RANURA: Record<string, Ranura> = {
  cabello: 'hair',
  rostro: 'face',
  camisa: 'shirt',
  pantalon: 'pants',
  sombrero: 'hat',
  accesorio: 'acc',
};
const RANURAS = new Set<string>(Object.values(RANURA));
const COLOR = /^#[0-9a-f]{6}$/i;
const esColor = (k: string) => k.endsWith('Color') || k === 'skin';

/** Piezas que vienen con un atuendo (sin colores ni cuerpo). */
export const piezasDe = (a: Articulo | undefined): string[] =>
  Object.entries(a?.set ?? {})
    .filter(([k, v]) => RANURAS.has(k) && typeof v === 'string')
    .map(([, v]) => v);

/**
 * Todo lo que tiene quien compró `comprados`: lo gratis, lo comprado y las piezas de cada atuendo comprado.
 * Los atuendos gratis se pueden poner enteros, pero sus piezas con precio (la gorra de «De la cancha») se
 * compran aparte, igual que en el juego local.
 */
export function poseidos(comprados: Iterable<string>): Set<string> {
  const lista = [...comprados],
    tiene = new Set([...GRATIS, ...lista]);
  for (const id of lista) for (const p of piezasDe(articuloPorId(id))) tiene.add(p);
  return tiene;
}

export type Compra =
  | { ok: true; precio: number; saldo: number }
  | { ok: false; motivo: 'no' | 'ya' | 'caro'; falta?: number };
/** ¿Se puede comprar? `no` = no existe o no se vende suelto; `ya` = ya lo tenés; `caro` = no alcanza el saldo. */
export function decidirCompra({
  saldo,
  comprados,
  itemId,
}: {
  saldo: number;
  comprados: Iterable<string>;
  itemId: string;
}): Compra {
  const a = articuloPorId(itemId);
  if (!a || a.soloSet) return { ok: false, motivo: 'no' };
  if (poseidos(comprados).has(itemId)) return { ok: false, motivo: 'ya' };
  if (!Number.isFinite(saldo) || saldo < a.price) return { ok: false, motivo: 'caro', falta: a.price - saldo };
  return { ok: true, precio: a.price, saldo: saldo - a.price };
}

/** Lo que cambia en el avatar al ponerse un artículo (sin revisar si lo tenés). Null si no se pone: emotes. */
export function cambiosDe(itemId: string): Partial<Avatar> | null {
  const a = articuloPorId(itemId);
  if (!a) return null;
  if (a.cat === 'atuendo') {
    const cambios: Record<string, string> = {};
    for (const [k, v] of Object.entries(a.set ?? {})) if (k !== 'body' && k !== 'skin') cambios[k] = v;
    return cambios as Partial<Avatar>;
  }
  return RANURA[a.cat] ? { [RANURA[a.cat]]: itemId } : null;
}

export type Equipar = { ok: true; cambios: Partial<Avatar> } | { ok: false; motivo: 'no' | 'no-tenes' };
/** ¿Se puede poner? Solo lo que tenés según `comprados` (lo comprado en el servidor, sin lo gratis). */
export function decidirEquipar({ comprados, itemId }: { comprados: Iterable<string>; itemId: string }): Equipar {
  const cambios = cambiosDe(itemId);
  if (!cambios) return { ok: false, motivo: 'no' };
  if (!poseidos(comprados).has(itemId)) return { ok: false, motivo: 'no-tenes' };
  return { ok: true, cambios };
}

/**
 * Deja de un cambio de avatar solo lo permitido: colores `#rrggbb`, cuerpo `h`/`m` y piezas que tenés
 * y que van en esa ranura. Lo demás se ignora.
 */
export function limpiarAvatar(cambios: Record<string, unknown>, comprados: Iterable<string>): Partial<Avatar> {
  const tiene = poseidos(comprados),
    limpio: Record<string, string> = {};
  for (const [k, v] of Object.entries(cambios)) {
    if (typeof v !== 'string') continue;
    if (k === 'body') {
      if (v === 'h' || v === 'm') limpio[k] = v;
    } else if (esColor(k)) {
      if (k in AVATAR_INICIAL && COLOR.test(v)) limpio[k] = v;
    } else if (RANURAS.has(k)) {
      const a = articuloPorId(v);
      if (a && tiene.has(v) && RANURA[a.cat] === k) limpio[k] = v;
    }
  }
  return limpio as Partial<Avatar>;
}
