import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, inR, type Pc, PI, place, py, ss } from '../lib';
import { cannon, casa, garita, merlons, mont, stairs } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

const galeon = (): Pc[] => [
  bx(0, 1.2, 0, 5, 3.4, 16, 'wood', '#5a4028', { solid: false }),
  py(0, -0.5, 10.5, 5, 3.4, 5, 'wood', '#5a4028', { e: [PI / 2, 0, 0] }),
  bx(0, 3.6, -6, 5, 2.4, 4, 'wood', '#6b4a2a', { solid: false }),
  ...[-4, 1, 6].flatMap((z, i) => [
    cy(0, 9, z, 0.22, 15, 'wood', '#3d2a1a', { n: 6, solid: false }),
    bx(0, 8 + (i === 1 ? 1 : 0), z + 0.3, 7, 4.4, 0.15, 'cloth', '#f4efe2', { solid: false }),
    bx(0, 13 + (i === 1 ? 1 : 0), z + 0.3, 5, 3, 0.15, 'cloth', '#f4efe2', { solid: false }),
  ]),
];
/** Colón: la Fortaleza de Santa Bárbara de Trujillo frente a la bahía, con murallas que se recorren por arriba. */
export function fortaleza(d: Department): ZoneSpec {
  const Z = new ZB(d, (_x, z) => -2.6 * ss(-29, -46, z)),
    B = Z.bio,
    C = '#a89f8c',
    C2 = '#b8b2a4';
  Z.layer('sand', B.sand)
    .layer('grass', B.grass, (x, z) => (z + 27 + Math.sin(x * 0.17) * 1.5) / 2.5)
    .layer('dirt', '#b89a6a', (x, z) => Math.min(15.4 - Math.abs(x), 11.4 - Math.abs(z + 10)) * 1.5)
    .layer('cobble', '#9a948a', (x, z) => Math.min(2.2 - Math.abs(x), z - 1, 37 - z) * 2);
  Z.sea(-0.35)
    .plane('grass', B.grass, -0.06, [900, 520], [0, 0, 233])
    .plane('sand', B.sand, -0.08, [900, 6], [0, 0, -29]);
  Z.far = { mat: 'sand', color: B.sand, y: -2.62 };
  Z.stop(0, 42);
  // murallas (3 m de ancho, se camina por arriba)
  Z.add(
    bx(0, 1.6, -23, 37, 3.2, 3, 'stone', C),
    bx(-10.25, 1.6, 3, 16.5, 3.2, 3, 'stone', C),
    bx(10.25, 1.6, 3, 16.5, 3.2, 3, 'stone', C),
    bx(0, 2.85, 3, 4.2, 0.7, 3, 'stone', C2),
    bx(-17, 1.6, -10, 3, 3.2, 23, 'stone', C),
    bx(17, 1.6, -10, 3, 3.2, 23, 'stone', C),
  );
  Z.add(
    place(merlons(37, C2), 0, 3.2, -24.25),
    place(merlons(15, C2), -10.6, 3.2, 4.25),
    place(merlons(15, C2), 10.6, 3.2, 4.25),
    place(merlons(23, C2), -18.25, 3.2, -10, PI / 2),
    place(merlons(23, C2), 18.25, 3.2, -10, PI / 2),
  );
  Z.add(
    place(stairs(2.2, 10, 0.32, 0.5, 'stone', C2), -14.4, 0, -5),
    place(stairs(2.2, 10, 0.32, 0.5, 'stone', C2), 14.4, 0, -15, PI),
  );
  for (const x of [-12, -6, 0, 6, 12]) Z.add(place(cannon(), x, 3.2, -22.9, PI));
  Z.add(
    place(cannon(), -4.6, 0, 6.6),
    place(cannon(), 4.6, 0, 6.6),
    place(garita(C2), -17, 3.2, -23),
    place(garita(C2), -17, 3.2, 3),
    place(garita(C2), 17, 3.2, 3),
  );
  // plataforma del vigía (noreste) con el catalejo
  Z.add(
    bx(17, 3.65, -23, 3, 0.9, 3, 'stone', C2),
    place(stairs(3, 2, 0.3, 0.5, 'stone', C2), 14.5, 3.2, -23, -PI / 2),
    cy(17.9, 4.7, -24, 0.05, 1.2, 'wood', '#5a3d26', { n: 5 }),
    cy(17.9, 5.4, -24, 0.1, 1.2, 'gold', '#d9a520', { e: [PI / 2 - 0.15, 0.4, 0], rt: 0.6, n: 8 }),
  );
  // patio de armas
  Z.put(casa(9, 4.4, 2.8, '#cfc6b0', '#8d4a35', '#8a7f6c'), 6.5, -18.6).add(
    cy(-7, 0.5, -14, 1.1, 1, 'stone', C2, { n: 10 }),
    cy(-7, 0.9, -14, 0.85, 0.1, 'water', '#3aa6d8', { n: 10, solid: false }),
  );
  for (const [x, z, y] of [
    [-3, -19.5, 0.2],
    [-2.6, -19.5, 0.2],
    [-2.8, -19.15, 0.2],
    [-2.8, -19.38, 0.5],
  ])
    Z.add(bl(x, y, z, 0.2, 'metal', '#2b2b2b', { n: 7 }));
  Z.n(<P.Flag pos={[0, 0, -9]} />)
    .n(<P.Barrel pos={[-11, 0, -19.6]} color="#6b4a2a" />)
    .n(<P.Barrel pos={[-12.2, 0, -19.2]} color="#6b4a2a" />)
    .n(<P.Crate pos={[11.5, 0, -1]} />);
  Z.plaque('Fortaleza de Santa Bárbara', 0, 2.85, 4.56, 0, 0.5)
    .plaque('Patio de armas', 6.5, 2.35, -16.3, 0, 0.36)
    .label('Bahía de Trujillo', 0, 7, -44, 1.1);
  // cruz de Colón y pueblo
  Z.add(
    bx(11, 0.5, 16, 2.2, 1, 2.2, 'stone', C2),
    bx(11, 2.6, 16, 0.4, 3.2, 0.4, 'stone', '#e9e4d8'),
    bx(11, 3.3, 16, 1.7, 0.4, 0.4, 'stone', '#e9e4d8', { solid: false }),
  );
  Z.plaque('1502 · Cuarto viaje de Colón', 11, 0.55, 17.12, 0, 0.3);
  Z.n(<P.House pos={[-16, 0, 30]} rot={PI / 2} color="#f6e1a0" />)
    .put(casa(6, 5, 3, '#9fd3c7'), 17, 33, -PI / 2)
    .put(casa(6, 5, 3, '#ffb3a0'), -17, 18, PI / 2);
  for (const [x, z] of [
    [-23, 8],
    [23, 9],
    [-8, 21],
    [-27, -27],
    [27, -28],
    [8, 27],
  ])
    Z.n(<P.Palm pos={Z.at(x, z)} seed={x + z} />);
  Z.n(<P.Boat pos={[-9, -0.42, -39]} rot={0.6} />).add(place(galeon(), 34, -0.6, -92, 0.9));
  Z.veg(
    'palm',
    26,
    (x, z) => (Math.abs(x) > 22 && z > -33 && z < 46 && !inR(x, z, -24, 24, 20, 46)) || (z < -26.5 && z > -32.5),
    { sep: 4.5 },
  );
  Z.veg('tree', 26, (x, z) => (Math.abs(x) > 30 && z > -20) || z > 50, { sep: 5.5 });
  Z.veg(
    'bush',
    20,
    (x, z) => Math.abs(x) > 20 && Math.abs(x) < 46 && z > -24 && z < 44 && !inR(x, z, -24, 24, 20, 46),
    { sep: 3 },
  );
  Z.add(place(mont(60, 55, '#3a8a55'), -120, 0, 60), place(mont(70, 70, '#2f7d4a'), 60, 0, 150));
  Z.trail(
    [
      [0, 36],
      [0, 8],
    ],
    5,
  )
    .coin(0, 0, -4)
    .coin(-8, 0, -8)
    .coin(-14.4, 1.7, -7.5);
  for (const x of [-9, -3, 3, 9]) Z.coin(x, 3.2, -21.9);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -40, maxZ: 50 },
    bad: (_x, y) => y < -1.15,
    badMsg: 'El mar está muy hondo por ahí',
    npc: {
      pos: [-5, 0, 12],
      name: 'Wani',
      look: {
        hair: 'pelo_afro',
        shirt: 'camisa_rayas',
        shirtColor: '#ffc93c',
        pants: 'short_futbol',
        pantsColor: '#1d1d1f',
        acc: 'tambor_garifuna',
        skin: '#4f2f1c',
      },
      icon: '🏰',
    },
    gem: [16.7, 4.1, -22.6],
    gemColor: '#e9c46a',
  });
}
