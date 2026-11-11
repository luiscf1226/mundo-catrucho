import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, distToPath, inR, type Pc, PI, place, py, ss } from '../lib';
import { champa, fish, mesa, mont, pier, pipante, stairs } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

const garza = (): Pc[] => [
  cy(-0.06, 0.4, 0, 0.02, 0.8, 'plastic', '#3a3a3a', { n: 4, solid: false }),
  cy(0.06, 0.4, 0, 0.02, 0.8, 'plastic', '#3a3a3a', { n: 4, solid: false }),
  bl(0, 0.98, 0, 0.26, 'plastic', '#ffffff', { s: [0.9, 0.85, 1.6], n: 7 }),
  cy(0, 1.42, 0.3, 0.05, 0.75, 'plastic', '#ffffff', { e: [0.4, 0, 0], n: 5 }),
  bl(0, 1.8, 0.46, 0.1, 'plastic', '#ffffff', { n: 6 }),
  bx(0, 1.79, 0.66, 0.04, 0.04, 0.28, 'plastic', '#ffb703', { solid: false }),
];
/** Cortés: el Lago de Yojoa con su muelle, lanchas, comedores de pescado frito, garzas y una torre para ver aves. */
export function lago(d: Department): ZoneSpec {
  const zs = (x: number) => 3 * Math.sin(x * 0.07),
    road: [number, number][] = [
      [-60, 6],
      [60, 6],
    ];
  const Z = new ZB(d, (x, z) => -2.4 * ss(-8, -26, z - zs(x))),
    B = Z.bio;
  Z.layer('grass', B.grass)
    .layer('sand', B.sand, (x, z) => (-4.5 - (z - zs(x)) + Math.sin(x * 0.3)) / 2)
    .layer(
      'dirt',
      '#9a8660',
      (x, z) => Math.max(2.2 - distToPath(x, z, road), Math.min(1.8 - Math.abs(x), z + 8, 52 - z)) * 2,
    );
  Z.sea(-0.35).plane('grass', B.grass, -0.06, [900, 520], [0, 0, 250]);
  Z.far = { mat: 'sand', color: B.sand, y: -2.42 };
  Z.stop(0, 42);
  // muelle en T con balsa
  Z.add(
    place(pier(30), 0, 0, -9.4),
    bx(0, 0.48, -41, 9, 0.24, 3.4, 'wood', '#9a7448'),
    ...[-4.2, 4.2].flatMap((x) =>
      [-42.4, -39.6].map((z) => cy(x, -0.9, z, 0.16, 4, 'wood', '#5a4630', { n: 6, solid: false })),
    ),
    bx(9.4, -0.05, -41, 3, 0.4, 3, 'wood', '#8a6a45'),
    cy(8.4, -0.3, -41, 0.45, 2.6, 'metal', '#1d7fc7', { e: [PI / 2, 0, 0], n: 8 }),
    cy(10.4, -0.3, -41, 0.45, 2.6, 'metal', '#1d7fc7', { e: [PI / 2, 0, 0], n: 8 }),
  );
  Z.n(<P.Crate pos={[-3.9, 0.6, -40.2]} />)
    .n(<P.Boat pos={[4.2, -0.42, -20]} rot={0.2} />)
    .n(<P.Boat pos={[-4.4, -0.42, -27]} rot={-0.3} color="#e63946" />)
    .n(<P.Boat pos={[4.6, -0.42, -34]} rot={0.1} color="#ffd166" />)
    .n(<P.Boat pos={Z.at(-9, -10.5, 0.05)} rot={1.1} color="#2a9d8f" />);
  Z.add(place(pipante(5, '#2a9d8f'), -6.5, -0.4, -37, 0.5)).label('Lago de Yojoa', 0, 6.5, -46, 1.1);
  // comedores de pescado frito a la orilla
  (
    [
      [-27, 'Mojarra frita'],
      [-13.5, 'Comedor El Lago'],
      [14, 'Pescado frito'],
      [27.5, 'Tajadas y pescado'],
    ] as [number, string][]
  ).forEach(([x, name]) => {
    Z.put(champa(5.6, 4.5), x, 0)
      .put(mesa(), x - 1, 0.2)
      .add(
        bx(x + 1.7, 0.45, -0.9, 1.1, 0.9, 0.7, 'metal', '#3a3a3a'),
        ...fish(x + 1.7, 0.92, -0.9, 0.4, 0.95, '#d9a05b'),
        ...fish(x + 1.75, 0.92, -1.15, 0.2, 0.8, '#c98f4a'),
        bx(x, 2.45, 2.92, 3.8, 0.62, 0.08, 'wood', '#5a3d26', { solid: false }),
      );
    Z.plaque(name, x, 2.45, 2.98, 0, 0.42, '#3a86ff');
  });
  Z.n(<P.Stall pos={[-6, 0, 0.6]} sign="Pescado frito" color="#3a86ff" />).n(
    <P.Stall pos={[6.4, 0, 0.6]} sign="Tajadas" color="#ffd166" />,
  );
  // torre para ver aves, garzas y juncos
  Z.add(
    bx(34, 3.1, -7, 3.4, 0.2, 3.4, 'wood', '#9a7448'),
    ...[-1.55, 1.55].flatMap((x) =>
      [-1.55, 1.55].map((z) => cy(34 + x, 2.8, -7 + z, 0.12, 5.6, 'wood', '#5a3d26', { n: 6 })),
    ),
    py(34, 5.6, -7, 4.6, 1.3, 4.6, 'roof', '#c9a55a'),
    place(stairs(1.6, 10, 0.32, 0.45, 'wood', '#8a6a45'), 34, 0, -0.8),
    bx(34, 4.1, -8.65, 3.4, 0.1, 0.1, 'wood', '#5a3d26'),
    bx(32.35, 4.1, -7, 0.1, 0.1, 3.4, 'wood', '#5a3d26'),
    bx(35.65, 4.1, -7, 0.1, 0.1, 3.4, 'wood', '#5a3d26'),
  );
  Z.plaque('Torre de aves', 34, 0.9, -0.3, 0, 0.3).add(
    bx(34, 0.9, -0.36, 1.9, 0.5, 0.08, 'wood', '#5a3d26', { solid: false }),
  );
  for (const [x, z, a] of [
    [-18, -11.5, 0.4],
    [-22, -13, 2],
    [19, -12.6, -0.6],
    [26, -11, 1.4],
    [40, -11, 2.8],
    [-36, -13.5, 0.2],
  ])
    Z.put(garza(), x, z + zs(x), a);
  Z.veg(
    'reed',
    90,
    (x, z) => {
      const h = Z.h(x, z);
      return h < -0.08 && h > -0.95 && Math.abs(x) > 3.5 && Math.abs(x) < 60;
    },
    { sep: 1.5 },
  );
  // cascada camino a Pulhapanzak (este) y bosque
  Z.add(
    bx(46.5, 2.6, 16, 5, 5.2, 8, 'stone', B.rock),
    bx(44.4, 1.3, 12, 3, 2.6, 3, 'stone', '#8a9494'),
    bx(44.6, 0.9, 20.2, 2.6, 1.8, 2.6, 'stone', '#8a9494'),
    bx(43.9, 2.7, 16, 0.16, 5.2, 2.4, 'water', '#cfefff', { solid: false }),
    cy(41.6, 0.04, 16, 2.6, 0.06, 'water', '#6ab8ff', { n: 14, solid: false }),
    bl(43.4, 0.25, 15.4, 0.5, 'plastic', '#ffffff', { n: 6 }),
    bl(43.3, 0.2, 16.7, 0.4, 'plastic', '#ffffff', { n: 6 }),
  );
  Z.n(<P.Sign pos={[37.5, 0, 21.5]} rot={-0.8} text="Hacia Pulhapanzak" />)
    .n(<P.Tree pos={[-30, 0, 16]} scale={1.5} seed={4} />)
    .n(<P.Tree pos={[-21, 0, 27]} seed={6} />)
    .n(<P.Tree pos={[25, 0, 26]} scale={1.3} seed={7} />)
    .n(<P.Tree pos={[10, 0, 18]} seed={9} />)
    .n(<P.Flowers pos={[-31.8, 0, 18.6]} color="#ff7ac8" />)
    .n(<P.Flowers pos={[-28.4, 0, 14]} color="#ffffff" />);
  const land = (x: number, z: number) =>
    z > 10 && Math.abs(x) > 4.5 && !inR(x, z, -10, 12, 30, 50) && !inR(x, z, 36, 50, 9, 25);
  Z.veg('tree', 44, land, { sep: 5.5 });
  Z.veg('bush', 26, land, { sep: 3 });
  Z.veg('jungle', 10, (x, z) => land(x, z) && Math.abs(x) > 30, { sep: 8 });
  Z.add(
    place(mont(100, 80, '#3f7a6a'), -80, 0, -230),
    place(mont(120, 100, '#35705f'), 70, 0, -270),
    place(mont(90, 70, '#3f7a6a'), 200, 0, -200),
    place(mont(90, 65, '#4a8474'), -220, 0, -170),
  );
  Z.trail(
    [
      [0, 36],
      [0, -7],
    ],
    6,
  );
  for (const zz of [-15, -22, -29, -36]) Z.coin(0, 0.6, zz);
  Z.coin(34, 1.7, -3.2).coin(34, 3.2, -7.8);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -47, maxZ: 50 },
    bad: (_x, y) => y < -1.15,
    badMsg: 'El lago está muy hondo por ahí',
    npc: {
      pos: [3.4, 0, -6.4],
      name: 'Don Toño',
      look: {
        hat: 'sombrero_junco',
        shirt: 'camisa_manta',
        shirtColor: '#8ecae6',
        pants: 'short_futbol',
        pantsColor: '#3b2414',
        face: 'cara_bigote',
        skin: '#a56b43',
      },
      icon: '🎣',
    },
    gem: [9.4, 0.15, -41],
    gemColor: '#d8dee9',
    finds: [
      {
        id: 'anzuelo',
        name: 'Anzuelo de pesca',
        icon: '🪝',
        color: '#d8dee9',
        pos: [-3.7, 0.6, -42],
        fact: 'El Lago de Yojoa es el lago natural más grande de Honduras.',
      },
      {
        id: 'orquidea',
        name: 'Orquídea',
        icon: '🌸',
        color: '#ff7ac8',
        pos: [-31.8, 0, 18.2],
        fact: 'En los bosques que rodean el lago crecen orquídeas. La flor nacional de Honduras es una orquídea.',
      },
      {
        id: 'pluma',
        name: 'Pluma de garza',
        icon: '🪶',
        color: '#ffffff',
        pos: [34.5, 3.2, -7.5],
        fact: 'En Yojoa se han visto cientos de especies de aves: es un paraíso para observarlas.',
      },
      {
        id: 'pescado',
        name: 'Pescado frito',
        icon: '🐟',
        color: '#d9a05b',
        pos: Z.at(-13.5, -4.2),
        fact: 'A la orilla del lago hay comedores famosos por su pescado frito con tajadas.',
      },
      {
        id: 'piedra',
        name: 'Piedra de la catarata',
        icon: '💧',
        color: '#8ecae6',
        pos: [40.6, 0, 19.6],
        fact: 'Muy cerca del lago está la catarata de Pulhapanzak, en el río Lindo.',
      },
    ],
  });
}
