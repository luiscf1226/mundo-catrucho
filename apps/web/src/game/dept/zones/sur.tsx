// Zonas del sur seco: puente colgante de Choluteca (puente) e Isla del Tigre con Amapala (volcan).

import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, distToPath, inR, type Pc, PI, place, ss } from '../lib';
import { casa, champa, fence, iglesia, mesa, mont, pier, pipante, puesto, slab, vaca } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

const STEEL = '#c7ccd4';
/** Choluteca: el puente colgante sobre el río; se cruza a pie. El recuerdo espera en un islote del río. */
export function puente(d: Department): ZoneSpec {
  const zc = (x: number) => -6 + 3 * Math.sin(x * 0.06),
    dr = (x: number, z: number) => Math.abs(z - zc(x));
  const Z = new ZB(
      d,
      (x, z) =>
        -2.8 * ss(10, 5, dr(x, z)) +
        1.4 * ss(6.5, 3.5, Math.abs(x)) * (z > -6 ? ss(24, 10, z) : ss(-38, -22, z)) * ss(9, 11, dr(x, z)),
    ),
    B = Z.bio;
  Z.layer('grass', B.grass)
    .layer('sand', B.sand, (x, z) => (12.5 - dr(x, z) + Math.sin(x * 0.3)) / 2)
    .layer('asphalt', '#6a6660', (x, z) => Math.min(2.6 - Math.abs(x), dr(x, z) - 13.5) * 2);
  Z.sea(-0.7);
  Z.stop(0, 42);
  // puente: torres, tablero, cables y tirantes
  const seg = (x: number, z0: number, y0: number, z1: number, y1: number): Pc => {
    const dz = z1 - z0,
      dy = y1 - y0;
    return bx(x, (y0 + y1) / 2, (z0 + z1) / 2, 0.16, 0.16, Math.hypot(dz, dy) + 0.1, 'metal', STEEL, {
      e: [Math.atan2(-dy, dz), 0, 0],
    });
  };
  const span: [number, number][] = Array.from({ length: 9 }, (_, i) => {
    const z = 4 - i * 2.5;
    return [z, 3.4 + 8.1 * ((z + 6) / 10) ** 2];
  });
  const cable: [number, number][] = [[14, 1.6], ...span, [-26, 1.6]];
  for (const x of [-3.1, 3.1]) {
    for (let i = 0; i < cable.length - 1; i++)
      Z.add(seg(x, cable[i][0], cable[i][1], cable[i + 1][0], cable[i + 1][1]));
    for (const [z, y] of span.slice(1, -1))
      Z.add(cy(x * 0.8, (1.4 + y) / 2, z, 0.035, y - 1.4, 'metal', STEEL, { n: 4, solid: false }));
    for (const tz of [4, -16])
      Z.add(bx(x, 4.6, tz, 0.8, 14.2, 0.8, 'metal', STEEL), bx(x, -1.2, tz, 1.7, 3.2, 1.7, 'concrete', '#b9b4a8'));
    for (const az of [14, -26]) Z.add(bx(x, Z.h(x, az) + 0.4, az, 1.4, 1.6, 2.2, 'concrete', '#b9b4a8'));
    Z.add(
      bx(x * 0.8, 1.05, -6, 0.3, 0.6, 28.4, 'metal', STEEL, { solid: false }),
      bx(x * 0.78, 1.95, -6, 0.12, 1.1, 28.4, 'metal', STEEL),
    );
  }
  for (const tz of [4, -16])
    Z.add(
      bx(0, 11.4, tz, 7, 0.7, 0.7, 'metal', STEEL),
      bx(0, 7.6, tz, 6.2, 0.5, 0.5, 'metal', STEEL, { solid: false }),
    );
  Z.add(bx(0, 1.25, -6, 5, 0.3, 28.4, 'asphalt', '#5a5f66'));
  Z.plaque('Puente de Choluteca', 0, 11.4, 4.37, 0, 0.6, '#0d47a1').label('Río Choluteca', 24, 2.6, -5, 0.8);
  // piedras para saltar hasta el islote del marañón
  Z.add(
    slab(-14, 0.15, -0.6, 1.1, B.rock),
    slab(-15.2, 0.15, -4.2, 1.1, B.rock),
    slab(-13.6, 0.15, -7.8, 1.1, B.rock),
    slab(-14.6, 0.3, -12.2, 2.9, '#a89878', 4),
  );
  for (const [x, y, z] of [
    [-16.2, 2.5, -13.4],
    [-15.2, 2.9, -12.6],
    [-16, 3.1, -12.2],
    [-15.5, 2.4, -13.9],
  ])
    Z.add(bl(x, y, z, 0.16, 'plastic', '#e63946', { n: 6 }));
  Z.n(<P.Tree pos={[-15.8, 0.3, -13]} scale={0.8} color="#6f9a3a" seed={5} />).n(
    <P.Sign pos={Z.at(-10.5, 4.6)} rot={0.5} text="Islote del marañón" />,
  );
  // el pueblo (sur) y el mirador (norte)
  Z.n(<P.House pos={Z.at(-13, 24)} rot={PI / 2} color="#f2c4a4" sign="Rosquillas" />)
    .n(<P.House pos={Z.at(13, 21)} rot={-PI / 2} color="#f7f1e3" />)
    .n(<P.Stall pos={Z.at(8.5, 31)} rot={-PI / 2} sign="Marañón" color="#e85d04" />);
  Z.put(casa(6, 5, 3, '#ffe0a8'), -15, 35, PI / 2)
    .put(casa(7, 5, 3, '#f4b393'), 16, 34, -PI / 2)
    .put(puesto('#ffd166', ['#e63946', '#ffb703', '#8a5a34']), -7.5, 17, PI / 2);
  Z.put(champa(5, 4), 10, -32)
    .put(mesa(), 10, -32)
    .n(<P.Flag pos={Z.at(-7, -29)} />)
    .n(<P.Bench pos={Z.at(4.5, -27)} rot={PI} />);
  Z.put(fence(18), 26, -27)
    .put(fence(14), 35, -34, PI / 2)
    .put(fence(14), 17, -34, PI / 2)
    .put(vaca(), 22, -33, 0.6)
    .put(vaca('#8a5a34', '#f2efe6'), 28, -36, -1.2)
    .put(vaca('#f2efe6', '#1d1d1f'), 31, -31, 2.4);
  for (const [x, z] of [
    [-8, 30],
    [9, 12],
    [-22, -28],
  ])
    Z.n(<P.Tree pos={Z.at(x, z)} color="#8a9a3a" seed={x} />);
  for (const [x, z] of [
    [18, 10],
    [-24, 12],
    [-10, -25],
  ])
    Z.n(<P.Rock pos={Z.at(x, z)} seed={z} />);
  const open = (x: number, z: number) =>
    Math.abs(x) > 5.5 &&
    dr(x, z) > 13 &&
    !inR(x, z, -20, 21, 14, 48) &&
    !inR(x, z, 14, 38, -42, -25) &&
    Math.hypot(x - 10, z + 32) > 5;
  Z.veg('dry', 46, open, { sep: 6 });
  Z.veg('bush', 34, open, { sep: 3.5, colors: ['#a3a34a', '#8a9a3a', '#b7a24a'] });
  Z.veg('rock', 16, (x, z) => open(x, z) || (dr(x, z) > 9 && dr(x, z) < 12 && Math.abs(x) > 6), {
    sep: 4,
    colors: [B.rock],
  });
  Z.add(
    place(mont(70, 40, '#a8964a'), -150, 0, -110),
    place(mont(80, 48, '#9a8a48'), 130, 0, -150),
    place(mont(90, 36, '#b0a058'), 0, 0, -230),
    place(mont(70, 38, '#a8964a'), 170, 0, 90),
  );
  Z.trail(
    [
      [0, 36],
      [0, 11],
    ],
    4,
  );
  for (const zz of [4, -1, -6, -11, -16]) Z.coin(0, 1.4, zz);
  Z.trail(
    [
      [0, -24],
      [7, -30],
    ],
    2,
  ).coin(-15.2, 0.15, -4.2);
  return Z.done({
    limit: { minX: -50, maxX: 50, minZ: -46, maxZ: 50 },
    bad: (_x, y) => y < -1.35,
    badMsg: 'El río está muy hondo: cruzá por el puente',
    npc: {
      pos: Z.at(7.5, 16),
      name: 'Don Chepe',
      look: {
        hat: 'sombrero_vaquero',
        hatColor: '#c9a56b',
        shirt: 'guayabera',
        shirtColor: '#ffffff',
        face: 'cara_bigote',
        skin: '#a56b43',
      },
      icon: '🌉',
    },
    gem: [-13.4, 0.3, -11.4],
    gemColor: '#e9a23b',
  });
}

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
