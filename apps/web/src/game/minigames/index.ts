import type { FC } from 'react';
import type { MinigameId } from '../../core/types';
import { Atrapa, guia as gAtrapa } from './Atrapa';
import type { Guia } from './api';
import { Carrera } from './Carrera';
import { Cocina, guia as gCocina } from './Cocina';
import { Corte, guia as gCorte } from './Corte';
import { Exploradores } from './Exploradores';
import { Feria } from './Feria';
import { Futbol } from './Futbol';
import { guia as gManejo, Manejo } from './Manejo';
import { guia as gMonta, Monta } from './Monta';
import { guia as gPesca, Pesca } from './Pesca';
import { Pulperia } from './Pulperia';
import { guia as gRitmo, Ritmo } from './Ritmo';
import { guia as gRosquilla, Rosquilla } from './Rosquilla';
import { guia as gRuta, Ruta } from './Ruta';
import { guia as gTrivia, Trivia } from './Trivia';

export const MINIGAME_SCENES: Record<MinigameId, FC> = {
  'franciscomorazan.rosquilla': Rosquilla,
  carrera: Carrera,
  futbol: Futbol,
  feria: Feria,
  exploradores: Exploradores,
  pulperia: Pulperia,
  corte: Corte,
  monta: Monta,
  ritmo: Ritmo,
  ruta: Ruta,
  pesca: Pesca,
  atrapa: Atrapa,
  cocina: Cocina,
  trivia: Trivia,
  manejo: Manejo,
};
/** Guías de los motores nuevos (los cinco primeros tienen la suya en ui/screens/Minigame.tsx). */
export const MOTOR_GUIDES: Partial<Record<MinigameId, Guia>> = {
  'franciscomorazan.rosquilla': gRosquilla,
  corte: gCorte,
  monta: gMonta,
  ritmo: gRitmo,
  ruta: gRuta,
  pesca: gPesca,
  atrapa: gAtrapa,
  cocina: gCocina,
  trivia: gTrivia,
  manejo: gManejo,
};
