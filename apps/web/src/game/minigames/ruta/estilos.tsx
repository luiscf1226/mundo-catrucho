// Aspecto de cada estilo de recorrido: cielo, piso lejano, materiales y utilería lateral.
import type { MatKind } from '../../kit';
import type { Estilo } from './gen';
export interface Look {
  time: 'dia' | 'tarde' | 'noche';
  indoor?: boolean;
  floor: [string, MatKind];
  deep?: boolean;
  plat: [MatKind, string];
  cap: string;
  beam: [MatKind, string];
  props: [string, number, number][];
  gem: string;
  fog: number;
}
export const LOOK: Record<Estilo, Look> = {
  cerro: {
    time: 'dia',
    floor: ['#5d9a48', 'grass'],
    plat: ['stone', '#a79f90'],
    cap: '#6fb45a',
    beam: ['wood', '#8a5a2c'],
    props: [
      ['Pine', 3.4, 12],
      ['Rock', 3, 9],
      ['Pine', 2.6, 15],
    ],
    gem: '#ffd23f',
    fog: 95,
  },
  cueva: {
    time: 'noche',
    indoor: true,
    floor: ['#1c1a1f', 'stone'],
    plat: ['stone', '#6f6a64'],
    cap: '#8b857c',
    beam: ['wood', '#6b4423'],
    props: [
      ['Rock', 4.5, 8],
      ['Rock', 6, 14],
      ['Rock', 3, 10],
    ],
    gem: '#5de0ff',
    fog: 70,
  },
  ciudad: {
    time: 'tarde',
    floor: ['#3d4047', 'asphalt'],
    plat: ['concrete', '#9aa0a6'],
    cap: '#d9d3c4',
    beam: ['metal', '#6b7078'],
    props: [
      ['House', 2.2, 11],
      ['House', 1.8, 14],
      ['Lamp', 1.4, 9],
    ],
    gem: '#ffd23f',
    fog: 100,
  },
  selva: {
    time: 'dia',
    floor: ['#2f5f2f', 'grass'],
    plat: ['wood', '#7c4f26'],
    cap: '#4f9a3f',
    beam: ['wood', '#5d3a1b'],
    props: [
      ['Tree', 3.2, 12],
      ['Palm', 3, 10],
      ['Bush', 3, 9],
    ],
    gem: '#7ee081',
    fog: 80,
  },
  ruinas: {
    time: 'tarde',
    floor: ['#6a5b3a', 'dirt'],
    plat: ['stone', '#c9b98a'],
    cap: '#e0d3a6',
    beam: ['stone', '#b8a878'],
    props: [
      ['Statue', 2.4, 10],
      ['Rock', 3, 9],
      ['Palm', 2.8, 14],
    ],
    gem: '#2fbf7f',
    fog: 90,
  },
  playa: {
    time: 'dia',
    floor: ['#3e9dc4', 'water'],
    deep: false,
    plat: ['wood', '#b98a52'],
    cap: '#e8d29c',
    beam: ['wood', '#8a5a2c'],
    props: [
      ['Palm', 2.6, 11],
      ['Boat', 1.6, 14],
      ['Rock', 2.2, 9],
    ],
    gem: '#ff9bd0',
    fog: 110,
  },
  canopy: {
    time: 'dia',
    floor: ['#2d6a30', 'leaf'],
    plat: ['wood', '#8a5a2c'],
    cap: '#5fb35a',
    beam: ['wood', '#6b3f1d'],
    props: [
      ['Tree', 4.5, 10],
      ['Tree', 5.5, 15],
      ['Macaw', 1.2, 8],
    ],
    gem: '#ff6b6b',
    fog: 120,
  },
  rio: {
    time: 'dia',
    floor: ['#3c8fb5', 'water'],
    plat: ['stone', '#8c8f94'],
    cap: '#6fa05a',
    beam: ['wood', '#8a5a2c'],
    props: [
      ['Tree', 2.6, 11],
      ['Rock', 2.2, 9],
      ['Bush', 2.2, 13],
    ],
    gem: '#7be3ff',
    fog: 95,
  },
  pueblo: {
    time: 'dia',
    floor: ['#8e8473', 'cobble'],
    plat: ['roof', '#c9674a'],
    cap: '#e7d3b0',
    beam: ['wood', '#7a4a24'],
    props: [
      ['House', 1.5, 11],
      ['Lamp', 1.3, 9],
      ['Palm', 2, 14],
    ],
    gem: '#ffd23f',
    fog: 100,
  },
  mina: {
    time: 'noche',
    indoor: true,
    floor: ['#1a1613', 'dirt'],
    plat: ['wood', '#7a5430'],
    cap: '#9a8a6a',
    beam: ['metal', '#5d6168'],
    props: [
      ['Barrel', 2.4, 8],
      ['Crate', 2.4, 10],
      ['Rock', 4.5, 14],
    ],
    gem: '#ffe066',
    fog: 65,
  },
};
