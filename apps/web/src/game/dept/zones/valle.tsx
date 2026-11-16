import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bx, distToPath, inR, PI, place, ss } from '../lib';
import { casa, iglesia, mont, pier, pipante, slab } from '../parts';
import { ZB, type ZoneSpec } from '../zone';
import { ValleDescubrimientos } from './ValleDescubrimientos';

/** Valle: la Isla del Tigre en el Golfo de Fonseca, con su volcán, el muelle de Amapala y la Playa Negra. */
export function volcan(d: Department): ZoneSpec {
  const RI = (x: number, z: number) => Math.hypot(x, z + 6),
    RV = (x: number, z: number) => Math.hypot(x, z + 16);
  const trail: [number, number][] = [
    [-5, 24],
    [-3, 12],
    [0, 0],
  ];
  const Z = new ZB(d, (x, z) => {
      const rv = RV(x, z),
        v = rv < 4 ? 21.2 - (4 - rv) * 1.6 : 33 * Math.exp(-rv / 9);
      return 0.8 - 3.4 * ss(40, 52, RI(x, z)) + v * (1 - 0.9 * ss(24, 34, rv));
    }),
    B = Z.bio;
  Z.layer('sand', B.sand)
    .layer('grass', B.grass, (x, z) => (43 - RI(x, z) + Math.sin(x * 0.3 + z * 0.2)) / 2.5)
    .layer('dirt', '#7a6650', (x, z) => (17 - RV(x, z) + Math.sin(x * 0.5) * 1.5) / 3)
    .layer('stone', '#4a4440', (x, z) => (7.5 - RV(x, z)) / 2)
    .layer('sand', '#4a4a52', (x, z) => Math.min(-27 - x, RI(x, z) - 39, 51 - RI(x, z)) / 2)
    .layer('dirt', '#c9a36a', (x, z) => (1.5 - distToPath(x, z, trail)) * 2);
  Z.sea(-0.35, '#2f9ab8');
  Z.far = { mat: 'sand', color: B.sand, y: -2.62 };
  Z.stop(-6, 28);
  Z.n(<ValleDescubrimientos altura={Z.h} />);
  // Amapala: casas de colores, iglesia y muelle
  Z.n(<P.House pos={Z.at(13, 24)} rot={-0.4} color="#ffd166" sign="Hotel Amapala" />).n(
    <P.House pos={Z.at(-21, 22)} rot={0.5} color="#7fd6c2" />,
  );
  Z.put(casa(6, 5, 3, '#ff8fab'), 23, 16, -0.9)
    .put(casa(6, 5, 3, '#c8f2a0'), -30, 12, 1.1)
    .put(casa(5, 5, 3, '#9fd3ff'), -16, 33, 2.6)
    .put(iglesia(), 29, 29, -PI / 2 - 0.3);
  Z.add(place(pier(22), 12, 0.1, 36.5, PI))
    .n(<P.Boat pos={[16.5, -0.42, 46]} rot={0.3} />)
    .n(<P.Boat pos={[7.5, -0.42, 52]} rot={-0.5} color="#e63946" />)
    .add(place(pipante(5, '#ffd166'), 16.2, -0.4, 55, 0.2));
  Z.plaque('Muelle de Amapala', 12, 1.5, 36.2, PI, 0.4, '#0d47a1').add(
    bx(10.6, 0.9, 36.2, 0.14, 1.8, 0.14, 'wood', '#5a3d26'),
    bx(13.4, 0.9, 36.2, 0.14, 1.8, 0.14, 'wood', '#5a3d26'),
  );
  // Playa Negra y las piedras hasta la caracola
  Z.add(
    slab(-47.6, 0.1, -6, 1.15, '#3a3a40'),
    slab(-51.3, 0.1, -5.2, 1.15, '#3a3a40'),
    slab(-54.9, 0.1, -6.6, 1.15, '#3a3a40'),
    slab(-59.2, 0.25, -6, 2.4, '#3a3a40', 4),
  );
  Z.n(<P.Sign pos={Z.at(-37, -1)} rot={PI / 2} text="Playa Negra" />)
    .n(<P.Sign pos={Z.at(2.4, 1.5)} text="Mirador del Tigre" />)
    .n(<P.Flag pos={Z.at(-2.4, 0.5)} />)
    .n(<P.Bench pos={Z.at(0, 3)} />);
  Z.label('Volcán de la Isla del Tigre', 0, 30, -16, 1.8);
  for (const [x, z] of [
    [-14, 38],
    [3, 38],
    [22, 36],
    [-33, 24],
    [36, 10],
  ])
    Z.n(<P.Palm pos={Z.at(x, z)} seed={x} />);
  const town = (x: number, z: number) => inR(x, z, -36, 36, 8, 44) || distToPath(x, z, trail) < 3;
  Z.veg('dry', 44, (x, z) => RI(x, z) < 41 && RV(x, z) > 16 && !town(x, z), { sep: 5.5 });
  Z.veg('bush', 36, (x, z) => RI(x, z) < 42 && RV(x, z) > 11 && !town(x, z), {
    sep: 3.5,
    colors: ['#a3a34a', '#8a9a3a'],
  });
  Z.veg('rock', 26, (x, z) => RV(x, z) > 5 && RV(x, z) < 20 && distToPath(x, z, trail) > 2.5, {
    sep: 3.5,
    colors: ['#4a4440', '#5a524a'],
    smin: 0.6,
    smax: 1.1,
  });
  Z.veg('palm', 14, (x, z) => RI(x, z) > 37 && RI(x, z) < 43 && x > -26 && !inR(x, z, 6, 18, 30, 44), { sep: 5 });
  Z.add(
    place(mont(70, 55, '#6f8a6a'), -240, 0, -170),
    place(mont(80, 62, '#6f8a6a'), 210, 0, -230),
    place(mont(60, 44, '#7a947a'), 280, 0, 60),
    place(mont(60, 40, '#7a947a'), -260, 0, 110),
  );
  Z.trail(trail, 6);
  for (const zz of [41, 47, 53]) Z.coin(12, 0.7, zz);
  Z.coin(-41, Z.h(-41, -5), -5).coin(-51.3, 0.1, -5.2).coin(21, Z.h(21, 25), 25);
  return Z.done({
    limit: { minX: -63, maxX: 62, minZ: -60, maxZ: 60 },
    bad: (_x, y) => y < -1.2 || y > 8.6,
    badMsg: 'Por ahí no hay paso',
    badIcon: '⛔',
    npc: {
      pos: Z.at(8.5, 33),
      name: 'Don Nacho',
      look: {
        hat: 'gorra',
        hatColor: '#e85d04',
        shirt: 'camisa_rayas',
        shirtColor: '#48cae4',
        pants: 'short_futbol',
        pantsColor: '#1d1d1f',
        skin: '#a56b43',
      },
      icon: '🌋',
    },
    gem: [-59.2, 0.25, -6],
    gemColor: '#ffd9c2',
  });
}
