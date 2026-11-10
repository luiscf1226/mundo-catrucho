// Un constructor de zona por tipo de lugar emblemático (department.landmark.kind).
import type { Department } from '../../../core/types';
import { openSouth } from '../ext';
import { autoFinds } from '../finds';
import { ZB, type ZoneSpec } from '../zone';
import { arrecife, fortaleza, playa } from './costa';
import { artesania, cafetal, fuerte, mercado, pueblo } from './montana';
import { bosque, cristo, lago, rio } from './otros';
import { puente, volcan } from './sur';
import { catedral, cuevas, lluvia, ruinas } from './valles';

/** Zona de reserva para un tipo de lugar que todavía no tenga constructor propio. */
const generic = (d: Department): ZoneSpec => {
  const Z = new ZB(d, () => 0);
  Z.stop(0, 42);
  Z.trail(
    [
      [0, 36],
      [0, 0],
    ],
    10,
  );
  Z.label(d.landmark.name, 0, 4, -10, 0.8);
  return Z.done({ limit: { r: 50 }, npc: { pos: [4, 0, 30], name: 'Vecino', look: {} }, gem: [0, 0, -10] });
};
export const ZONES: Record<string, (d: Department) => ZoneSpec> = {
  playa,
  puente,
  fortaleza,
  catedral,
  ruinas,
  lago,
  pueblo,
  cristo,
  rio,
  mercado,
  arrecife,
  cafetal,
  fuerte,
  bosque,
  cuevas,
  artesania,
  volcan,
  lluvia,
};
const cache = new Map<string, ZoneSpec>();
/** Devuelve (y recuerda) la descripción de la zona de un departamento. */
export function zoneOf(d: Department): ZoneSpec {
  let s = cache.get(d.id);
  if (!s) {
    s = (ZONES[d.landmark.kind] ?? generic)(d);
    openSouth(s);
    autoFinds(d, s);
    cache.set(d.id, s);
  }
  return s;
}
