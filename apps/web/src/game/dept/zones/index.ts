import type { Department } from '../../../core/types';
import { openSouth } from '../ext';
import { autoFinds } from '../finds';
import { ZB, type ZoneSpec } from '../zone';

type Builder = (d: Department) => ZoneSpec;
const loaders: Record<string, () => Promise<Builder>> = {
  atlantida: () => import('./atlantida').then((m) => m.playa),
  choluteca: () => import('./choluteca').then((m) => m.puente),
  colon: () => import('./colon').then((m) => m.fortaleza),
  comayagua: () => import('./comayagua').then((m) => m.catedral),
  copan: () => import('./copan').then((m) => m.ruinas),
  cortes: () => import('./cortes').then((m) => m.lago),
  elparaiso: () => import('./elparaiso').then((m) => m.pueblo),
  franciscomorazan: () => import('./franciscomorazan').then((m) => m.cristo),
  graciasadios: () => import('./graciasadios').then((m) => m.rio),
  intibuca: () => import('./intibuca').then((m) => m.mercado),
  islas: () => import('./islas').then((m) => m.arrecife),
  lapaz: () => import('./lapaz').then((m) => m.cafetal),
  lempira: () => import('./lempira').then((m) => m.fuerte),
  ocotepeque: () => import('./ocotepeque').then((m) => m.bosque),
  olancho: () => import('./olancho').then((m) => m.cuevas),
  santabarbara: () => import('./santabarbara').then((m) => m.artesania),
  valle: () => import('./valle').then((m) => m.volcan),
  yoro: () => import('./yoro').then((m) => m.lluvia),
};
const builders = new Map<string, Builder>();
const pending = new Map<string, Promise<void>>();
const cache = new Map<string, ZoneSpec>();
export function loadZone(id: string): Promise<void> {
  let task = pending.get(id);
  if (!task) {
    task = (
      loaders[id]?.() ??
      Promise.resolve((d: Department) => {
        const z = new ZB(d, () => 0);
        z.stop(0, 42);
        return z.done({ limit: { r: 50 }, npc: { pos: [4, 0, 30], name: 'Vecino', look: {} }, gem: [0, 0, -10] });
      })
    ).then((builder) => {
      builders.set(id, builder);
    });
    pending.set(id, task);
  }
  return task;
}
export function zoneOf(d: Department): ZoneSpec {
  const builder = builders.get(d.id);
  if (!builder) throw loadZone(d.id);
  let spec = cache.get(d.id);
  if (!spec) {
    spec = builder(d);
    openSouth(spec);
    autoFinds(d, spec);
    cache.set(d.id, spec);
  }
  return spec;
}
// El HTML autónomo ya contiene las zonas; conserva las consultas síncronas de las pruebas.
if (import.meta.env.VITE_BUILD_MODE !== 'web') {
  for (const id of Object.keys(loaders)) void loadZone(id);
}
