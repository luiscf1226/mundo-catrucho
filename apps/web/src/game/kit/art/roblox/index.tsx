// Paquete de arte ROBLOX: bloques con studs, colores vivos y avatar clásico de piezas.
//   mats.ts   materiales (un sombreador con capas de textura generadas por código)
//   geo.ts    constructor de geometría fusionada      pk.tsx   utilidades de la utilería
//   props.tsx / props2.tsx   utilería      sky.tsx   cielo y luz      avatar.tsx / atlas.ts   personaje

import { basePack } from '../base';
import type { ArtPack } from '../types';
import { Avatar } from './avatar';
import { material } from './mats';
import { nature, town } from './props';
import { things } from './props2';
import { SkyRig } from './sky';

export const pack: ArtPack = {
  ...basePack,
  name: 'roblox',
  material,
  Avatar,
  SkyRig,
  props: { ...nature, ...town, ...things },
};
