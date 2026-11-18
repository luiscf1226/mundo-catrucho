// Paquete de arte HD (Mundo Catrucho 3D): formas suaves, materiales con textura, sombras, día y noche, clima.
//   tex.ts        texturas procedurales (lienzo → DataArrayTexture)
//   materials.ts  materiales triplanares cacheados por (tipo, color)
//   geo.ts        cajas redondeadas y constructor de geometría fusionada
//   avatar.tsx    personaje con huesos (avatarGeo.ts, avatarTex.ts, anim.ts, skin.ts)
//   props1-3.tsx  utilería fusionada (naturaleza, pueblo, vehículos); pk.tsx = utilidades comunes
//   sky.tsx       cielo, sol y luna, ciclo de día y noche, clima
//   post.tsx      posproceso en media y alta: oclusión ambiental, resplandor y viñeta
//   flora.tsx     vegetación: atlas de hojas, especies y fusión por escena;  relief.tsx  cerros de fondo

import { basePack } from '../base';
import type { ArtPack } from '../types';
import { Avatar } from './avatar';
import { Flora } from './flora';
import { gRock, roundedBox } from './geo';
import { GroundCover } from './grass';
import { hdMaterial } from './materials';
import { Effects } from './post';
import { props1 } from './props1';
import { props2 } from './props2';
import { props3 } from './props3';
import { Hills } from './relief';
import { SkyRig } from './sky';

export const pack: ArtPack = {
  ...basePack,
  name: 'hd',
  material: hdMaterial,
  boxGeometry: (w, h, d) => roundedBox(w, h, d),
  rockGeometry: gRock,
  SkyRig,
  Avatar,
  Effects,
  Flora,
  Hills,
  GroundCover,
  props: { ...props1, ...props2, ...props3 },
};
