import type { FC } from 'react';
import type { MinigameId } from '../../core/types';
import type { Guia } from './api';
import { Carrera } from './Carrera';
import { Futbol } from './Futbol';
import { Feria } from './Feria';
import { Exploradores } from './Exploradores';
import { Pulperia } from './Pulperia';
import { Corte, guia as gCorte } from './Corte';
import { Monta, guia as gMonta } from './Monta';
import { Ritmo, guia as gRitmo } from './Ritmo';
import { Ruta, guia as gRuta } from './Ruta';
import { Pesca, guia as gPesca } from './Pesca';
import { Atrapa, guia as gAtrapa } from './Atrapa';
import { Cocina, guia as gCocina } from './Cocina';
import { Trivia, guia as gTrivia } from './Trivia';
import { Manejo, guia as gManejo } from './Manejo';

export const MINIGAME_SCENES: Record<MinigameId, FC> = { carrera: Carrera, futbol: Futbol, feria: Feria, exploradores: Exploradores, pulperia: Pulperia, corte: Corte, monta: Monta, ritmo: Ritmo, ruta: Ruta, pesca: Pesca, atrapa: Atrapa, cocina: Cocina, trivia: Trivia, manejo: Manejo };
/** Guías de los motores nuevos (los cinco primeros tienen la suya en ui/screens/Minigame.tsx). */
export const MOTOR_GUIDES: Partial<Record<MinigameId, Guia>> = { corte: gCorte, monta: gMonta, ritmo: gRitmo, ruta: gRuta, pesca: gPesca, atrapa: gAtrapa, cocina: gCocina, trivia: gTrivia, manejo: gManejo };
