import { type FC, lazy } from 'react';
import type { MinigameId } from '../../core/types';
import type { Guia } from './api';

function motor(load: () => Promise<{ default: FC; guia?: Guia }>) {
  let module: { default: FC; guia?: Guia } | undefined;
  let pending: ReturnType<typeof load> | undefined;
  const resolve = () =>
    (pending ??= load().then((m) => {
      module = m;
      return m;
    }));
  return {
    Scene: lazy(resolve),
    guide: () => {
      if (!module) throw resolve();
      return module.guia;
    },
  };
}
const MOTORS = {
  'franciscomorazan.niebla': motor(() =>
    import('./franciscomorazan/Niebla').then((m) => ({ ...m, default: m.Niebla })),
  ),
  'franciscomorazan.baleada': motor(() =>
    import('./franciscomorazan/Baleada').then((m) => ({ ...m, default: m.Baleada })),
  ),
  'franciscomorazan.repartidor': motor(() =>
    import('./franciscomorazan/Repartidor').then((m) => ({ ...m, default: m.Repartidor })),
  ),
  'franciscomorazan.artesania': motor(() =>
    import('./franciscomorazan/Artesania').then((m) => ({ ...m, default: m.Artesania })),
  ),

  'franciscomorazan.rosquilla': motor(() => import('./Rosquilla').then((m) => ({ ...m, default: m.Rosquilla }))),
  carrera: motor(() => import('./Carrera').then((m) => ({ ...m, default: m.Carrera }))),
  futbol: motor(() => import('./Futbol').then((m) => ({ ...m, default: m.Futbol }))),
  feria: motor(() => import('./Feria').then((m) => ({ ...m, default: m.Feria }))),
  exploradores: motor(() => import('./Exploradores').then((m) => ({ ...m, default: m.Exploradores }))),
  pulperia: motor(() => import('./Pulperia').then((m) => ({ ...m, default: m.Pulperia }))),
  corte: motor(() => import('./Corte').then((m) => ({ ...m, default: m.Corte }))),
  monta: motor(() => import('./Monta').then((m) => ({ ...m, default: m.Monta }))),
  ritmo: motor(() => import('./Ritmo').then((m) => ({ ...m, default: m.Ritmo }))),
  ruta: motor(() => import('./Ruta').then((m) => ({ ...m, default: m.Ruta }))),
  pesca: motor(() => import('./Pesca').then((m) => ({ ...m, default: m.Pesca }))),
  atrapa: motor(() => import('./Atrapa').then((m) => ({ ...m, default: m.Atrapa }))),
  cocina: motor(() => import('./Cocina').then((m) => ({ ...m, default: m.Cocina }))),
  trivia: motor(() => import('./Trivia').then((m) => ({ ...m, default: m.Trivia }))),
  manejo: motor(() => import('./Manejo').then((m) => ({ ...m, default: m.Manejo }))),
} satisfies Record<MinigameId, ReturnType<typeof motor>>;
export const MINIGAME_SCENES = MOTORS;
export function motorGuide(id: MinigameId) {
  return MOTORS[id].guide();
}
