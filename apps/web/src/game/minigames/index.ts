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
  'cortes.chuco': motor(() => import('./Chuco').then((m) => ({ ...m, default: m.Chuco }))),
  'cortes.gruas': motor(() => import('./Gruas').then((m) => ({ ...m, default: m.Gruas }))),
  'cortes.cortina': motor(() => import('./Cortina').then((m) => ({ ...m, default: m.Cortina }))),
  'cortes.garitas': motor(() => import('./Garitas').then((m) => ({ ...m, default: m.Garitas }))),
  'cortes.merendon': motor(() => import('./Merendon').then((m) => ({ ...m, default: m.Merendon }))),
  'cortes.cusuco': motor(() => import('./Cusuco').then((m) => ({ ...m, default: m.Cusuco }))),
  'cortes.topo': motor(() => import('./Topo').then((m) => ({ ...m, default: m.Topo }))),
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
