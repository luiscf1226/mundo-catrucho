// Lago de Yojoa (lago), Cristo del Picacho sobre Tegucigalpa (cristo), Río Plátano (rio) y el bosque nublado
// de Montecristo con el punto Trifinio (bosque).

import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, dist, distToPath, inR, type Pc, PI, place, py, rng, ss } from '../lib';
import { baranda, casa, champa, edificio, fish, flagOf, mesa, mont, pier, pipante, stairs } from '../parts';
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

const barrio = (seed: number, c = '#7aa060'): Pc[] => {
  const r = rng(seed),
    cols = ['#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#ffc6ff', '#ffadad', '#f1f1f1', '#bde0fe'];
  return [
    ...mont(48, 36, c),
    ...Array.from({ length: 44 }, () => {
      const a = r() * 6.28,
        rad = 6 + r() * 34,
        s = 2.2 + r() * 1.6;
      return bx(
        Math.cos(a) * rad,
        36 * (1 - rad / 48) * 0.92 - 2.4,
        Math.sin(a) * rad,
        s,
        s * 0.9,
        s,
        'stucco',
        cols[Math.floor(r() * cols.length)],
        { r: a, solid: false },
      );
    }),
  ];
};
/** Francisco Morazán: el Cristo del Picacho en lo alto del cerro, con el parque en la ladera y Tegucigalpa abajo. */
export function cristo(d: Department): ZoneSpec {
  const way: [number, number][] = [
      [0, 27],
      [0, 20],
      [-9, 10],
      [8, 0],
      [-6, -10],
      [0, -17],
      [0, -21],
    ],
    Y = 11,
    PZ = -28,
    S = '#f4f1ea';
  const Z = new ZB(d, (x, z) => Y * ss(18, -16, z) * ss(66, 46, Math.abs(x))),
    B = Z.bio;
  Z.layer('grass', B.grass)
    .layer('asphalt', '#5d6066', (_x, z) => (3.4 - Math.abs(z - 31)) * 2)
    .layer('dirt', '#b9a27c', (x, z) => (1.7 - distToPath(x, z, way)) * 2)
    .layer(
      'tile',
      '#d9d2c2',
      (x, z) =>
        Math.max(Math.min(9 - Math.abs(x), 9.5 - Math.abs(z + 27)), Math.min(12 - Math.abs(x), 5 - Math.abs(z - 24))) *
        1.5,
    );
  Z.stop(0, 42);
  // el Cristo
  Z.add(
    bx(0, Y + 0.15, PZ, 7.6, 0.3, 7.6, 'concrete', '#cfc9bb'),
    bx(0, Y + 1.8, PZ, 6, 3.6, 6, 'concrete', '#e6e2d8'),
    cy(0, Y + 7.8, PZ, 1.75, 8.4, 'stone', S, { rt: 0.6, n: 12 }),
    cy(0, Y + 4.8, PZ, 1.95, 2.4, 'stone', '#e9e5db', { rt: 0.86, n: 12, solid: false }),
    bx(0, Y + 11.6, PZ, 3.6, 1.5, 1.5, 'stone', S, { solid: false }),
    bx(2.4, Y + 10.2, PZ + 0.3, 0.85, 3.6, 0.85, 'stone', S, { e: [-0.3, 0, 0.45] }),
    bx(-2.4, Y + 10.2, PZ + 0.3, 0.85, 3.6, 0.85, 'stone', S, { e: [-0.3, 0, -0.45] }),
    bl(3.25, Y + 8.5, PZ + 0.85, 0.42, 'stone', S, { n: 7 }),
    bl(-3.25, Y + 8.5, PZ + 0.85, 0.42, 'stone', S, { n: 7 }),
    cy(0, Y + 12.4, PZ, 0.42, 0.6, 'stone', S, { n: 8, solid: false }),
    bl(0, Y + 13.3, PZ, 0.95, 'stone', S, { s: [0.9, 1.08, 0.92], n: 12 }),
    bl(0, Y + 13.2, PZ - 0.2, 1, 'stone', '#e3dfd3', { s: [0.98, 1.05, 0.9], n: 10 }),
    bx(0, Y + 0.6, PZ - 4.2, 2.2, 1.2, 2.2, 'stone', '#b9b2a0'),
    bx(2.3, Y + 1.2, PZ - 4.1, 2.2, 2.4, 2.2, 'stone', '#a8a294'),
  );
  Z.plaque('Cristo del Picacho', 0, Y + 2.1, PZ + 3.03, 0, 0.55, '#00a3d7')
    .put(baranda(12), -16, -15.2)
    .n(<P.Bench pos={Z.at(-16, -17.6)} />)
    .n(<P.Sign pos={Z.at(-8.6, -15.6)} rot={0.3} text="Mirador de Tegucigalpa" />);
  for (const [x, z] of [
    [10, 8],
    [-13, 2],
    [13, -8],
    [-14, -24],
    [15, -24],
    [-5, 15],
  ])
    Z.n(<P.Pine pos={Z.at(x, z)} seed={x - z} />);
  for (const [x, z] of [
    [-6.5, 12],
    [5.5, -3],
    [3, -18.5],
  ])
    Z.n(<P.Lamp pos={Z.at(x, z)} />);
  Z.n(<P.Bench pos={Z.at(10.4, 1)} rot={-PI / 2} />)
    .n(<P.Flowers pos={Z.at(-5.5, -22.5)} />)
    .n(<P.Flowers pos={Z.at(5.5, -22.5)} color="#ffffff" />);
  // la ciudad
  Z.n(<P.Statue pos={[-9, 0, 24]} color="#5f7a6a" />)
    .n(<P.Flag pos={[9, 0, 24]} />)
    .n(<P.Car pos={[-15, 0, 29.6]} rot={PI / 2} color="#e63946" />)
    .n(<P.Car pos={[19, 0, 32.4]} rot={-PI / 2} />)
    .n(<P.Mototaxi pos={[10, 0, 29.6]} rot={PI / 2} />);
  Z.plaque('Francisco Morazán', -9, 0.9, 24.73, 0, 0.26);
  (
    [
      [-30, 22, 8, 9, 8, '#ffe0b2'],
      [30, 22, 9, 12, 8, '#cfd8dc'],
      [-22, 42, 8, 14, 8, '#b0bec5'],
      [22, 42, 8, 11, 8, '#ffccbc'],
      [-38, 43, 9, 21, 9, '#c5cae9'],
      [40, 42, 10, 17, 9, '#b2dfdb'],
      [-44, 26, 8, 13, 8, '#d7ccc8'],
      [45, 25, 8, 19, 9, '#cfd8dc'],
    ] as [number, number, number, number, number, string][]
  ).forEach(([x, z, w, h, dd, c]) => Z.put(edificio(w, h, dd, c), x, z));
  Z.add(
    place(barrio(1), -125, 0, 30),
    place(barrio(2), 125, 0, 0),
    place(barrio(3), -20, 0, 160),
    place(barrio(4, '#6f9a5a'), 110, 0, 130),
    place(barrio(5, '#6f9a5a'), -110, 0, 140),
  );
  const park = (x: number, z: number) =>
    z < 17 && distToPath(x, z, way) > 3.2 && !inR(x, z, -11, 11, -38, -17) && !inR(x, z, -23, -8, -19, -13);
  Z.veg('pine', 60, park, { sep: 4.5 });
  Z.veg('tree', 18, (x, z) => park(x, z) || (z > 18 && z < 27 && Math.abs(x) > 14 && Math.abs(x) < 24), { sep: 5.5 });
  Z.veg('bush', 24, (x, z) => park(x, z) && Math.abs(x) < 48, { sep: 3 });
  Z.trail(way, 8)
    .coin(-5, Y, -22)
    .coin(5, Y, -22)
    .coin(0, Y + 1.2, PZ - 4.2)
    .coin(-16, Y, -17);
  return Z.done({
    limit: { minX: -50, maxX: 50, minZ: -38, maxZ: 50 },
    npc: {
      pos: [4.6, 0, 24],
      name: 'Sofía',
      look: {
        hair: 'pelo_largo',
        shirt: 'camisa_h',
        pants: 'jeans',
        acc: 'mochila',
        accColor: '#00a3d7',
        face: 'cara_feliz',
        skin: '#c98f5f',
      },
      icon: '🏙',
    },
    gem: [0, Y + 3.6, PZ - 2.4],
    gemColor: '#d8dee9',
  });
}

/** Gracias a Dios: el Río Plátano en plena selva: casa sobre pilotes, pipantes, tronco para cruzar y petroglifos. */
export function rio(d: Department): ZoneSpec {
  const xr = (z: number) => 10 + 9 * Math.sin(z * 0.07),
    dr = (x: number, z: number) => Math.abs(x - xr(z));
  const t1: [number, number][] = [
      [-10, 52],
      [-10, 30],
      [-14, 14],
      [-6, 8],
      [-6, -4],
      [-7.5, -10],
    ],
    t2: [number, number][] = [
      [15.5, -10],
      [22, -15],
      [25, -17.5],
    ];
  const Z = new ZB(d, (x, z) => -2.6 * ss(9, 5, dr(x, z))),
    B = Z.bio;
  Z.layer('grass', B.grass)
    .layer('sand', '#a8946a', (x, z) => (11 - dr(x, z) + Math.sin(z * 0.4)) / 2)
    .layer('dirt', '#6b5236', (x, z) => (1.5 - Math.min(distToPath(x, z, t1), distToPath(x, z, t2))) * 2);
  Z.sea(-0.6, '#4a8f78');
  Z.stop(-10, 42);
  // casa sobre pilotes
  const house: Pc[] = [
    bx(0, 2, 0, 7, 0.3, 6, 'wood', '#8a6a45'),
    ...[-3.1, 0, 3.1].flatMap((x) => [-2.6, 2.6].map((z) => cy(x, 0.95, z, 0.15, 1.9, 'wood', '#5a4630', { n: 6 }))),
    bx(0, 3.25, -2.9, 7, 2.2, 0.15, 'wood', '#a5804a'),
    bx(-3.42, 3.25, -1, 0.15, 2.2, 4, 'wood', '#a5804a'),
    bx(3.42, 3.25, -1, 0.15, 2.2, 4, 'wood', '#a5804a'),
    cy(-3.3, 3.25, 2.8, 0.1, 2.2, 'wood', '#5a4630', { n: 6 }),
    cy(3.3, 3.25, 2.8, 0.1, 2.2, 'wood', '#5a4630', { n: 6 }),
    py(0, 4.35, 0, 8.6, 2.1, 7.6, 'roof', '#c9a55a'),
    ...place(stairs(1.6, 7, 0.3072, 0.45, 'wood', '#8a6a45'), 0, 0, 6.15),
    bx(-1.6, 2.75, -1.6, 2.6, 0.05, 0.9, 'cloth', '#e76f51', { e: [0, 0.3, 0] }),
    bx(2, 2.5, -1.8, 1, 0.7, 1, 'wood', '#7a5a38'),
  ];
  Z.put(house, -18, 3);
  // pipantes y lancha en el embarcadero
  Z.add(
    place(pipante(7), 8.4, -0.52, 9, 0.15),
    place(pipante(6, '#6b4a2a'), 10.4, -0.52, 16, 0.32),
    place(pipante(6, '#8a6a45'), 2.6, 0.02, 6.5, 1.25),
  )
    .n(<P.Boat pos={[11.4, -0.68, 1.5]} rot={-0.2} color="#2d6a4f" />)
    .n(<P.Sign pos={[1.6, 0, 11.5]} rot={-0.6} text="Embarcadero de pipantes" />);
  // tronco para cruzar
  Z.add(
    bx(4.2, 0.45, -10, 21, 0.5, 1.2, 'wood', '#6b4a2a'),
    cy(4.2, 0.32, -10, 0.64, 21, 'wood', '#5f4a30', { e: [0, 0, PI / 2], n: 8 }),
    bx(-7, 0.175, -10, 1.3, 0.35, 1.7, 'wood', '#5f4a30'),
    bx(15.4, 0.175, -10, 1.3, 0.35, 1.7, 'wood', '#5f4a30'),
    cy(-5, 1, -10.9, 0.14, 1.4, 'wood', '#5f4a30', { e: [-0.7, 0, 0.3], n: 5 }),
    cy(12, 0.9, -9.2, 0.12, 1.2, 'wood', '#5f4a30', { e: [0.8, 0, -0.2], n: 5 }),
  );
  // petroglifos (orilla este)
  const spiral: [number, number][] = [
    [0, 0],
    [0.3, 0],
    [0.3, 0.3],
    [0, 0.3],
    [-0.3, 0.3],
    [-0.3, 0],
    [-0.3, -0.3],
    [0, -0.3],
    [0.3, -0.3],
    [0.6, -0.3],
    [0.6, 0],
    [0.6, 0.3],
    [0.6, 0.6],
    [0.3, 0.6],
    [0, 0.6],
    [-0.3, 0.6],
    [-0.6, 0.6],
    [-0.6, 0.3],
  ];
  Z.add(
    cy(25, 1.1, -21.4, 2.4, 2.2, 'stone', '#7a8078', { n: 8, rt: 0.8 }),
    bl(25, 1.5, -21.4, 2.7, 'stone', '#7a8078', { s: [1.25, 0.85, 1], n: 9 }),
    bx(25, 1.25, -18.75, 3, 2.1, 0.4, 'stone', '#8a9088'),
    ...spiral.map(([a, b]) => bx(24.4 + a, 1.25 + b, -18.53, 0.2, 0.2, 0.06, 'stone', '#3f4640', { solid: false })),
    ...[
      [0, 0.5],
      [0, 0.2],
      [0, -0.1],
      [-0.25, 0.25],
      [0.25, 0.25],
      [-0.2, -0.4],
      [0.2, -0.4],
    ].map(([a, b]) => bx(26, 1.2 + b, -18.53, 0.16, 0.24, 0.06, 'stone', '#3f4640', { solid: false })),
    bl(21.4, 0.5, -22, 1, 'stone', '#6f7a70', { s: [1.2, 0.7, 1], n: 7 }),
  );
  Z.plaque('Petroglifos de Walpaulban Sirpi', 25, 0.36, -18.52, 0, 0.2).label('Río Plátano', 17, 3.4, 24, 0.9);
  // cocodrilo, guaras y selva
  Z.add(
    place(
      [
        bx(0, 0, 0, 0.7, 0.3, 2.4, 'leaf', '#4a6b3a', { solid: false }),
        bx(0, 0.02, 1.6, 0.5, 0.24, 1, 'leaf', '#4a6b3a', { solid: false }),
        bx(0, -0.04, -1.8, 0.32, 0.2, 1.5, 'leaf', '#4a6b3a', { solid: false }),
        bl(-0.17, 0.17, 1.3, 0.08, 'plastic', '#ffe066', { n: 5 }),
        bl(0.17, 0.17, 1.3, 0.08, 'plastic', '#ffe066', { n: 5 }),
      ],
      xr(-26) + 1.5,
      -0.6,
      -26,
      0.5,
    ),
  );
  Z.n(<P.Macaw pos={[5, 9, -4]} flying />)
    .n(<P.Macaw pos={[18, 10, -16]} flying />)
    .n(<P.Macaw pos={[-12, 8, 12]} flying />)
    .n(<P.Macaw pos={[-18, 6.42, 3]} rot={1} />)
    .n(<P.Macaw pos={[1, 0.7, -10]} rot={2.4} />);
  Z.n(<P.Tree pos={[-2, 0, 23]} scale={1.6} seed={1} />)
    .n(<P.Tree pos={[-24, 0, 20]} scale={1.7} seed={2} />)
    .n(<P.Tree pos={[20, 0, -7]} scale={1.6} seed={3} />)
    .n(<P.Palm pos={[-4, 0, 14]} seed={4} />)
    .n(<P.Palm pos={[-12, 0, -6]} seed={5} />)
    .n(<P.Bush pos={[-3, 0, 2]} />)
    .n(<P.Bush pos={[-11, 0, 20]} />)
    .n(<P.Rock pos={[2.5, 0, -3]} seed={2} />)
    .n(<P.Rock pos={[18, 0, -13]} seed={3} />);
  const ok = (x: number, z: number) =>
    dr(x, z) > 11.5 &&
    distToPath(x, z, t1) > 3 &&
    distToPath(x, z, t2) > 3 &&
    !inR(x, z, -23.5, -12, -2, 11) &&
    !inR(x, z, -18, 0, 34, 50) &&
    Math.hypot(x - 25, z + 21) > 5.5 &&
    Math.hypot(x - 28.4, z + 23.4) > 2.5;
  Z.veg('giant', 6, ok, { sep: 18, smin: 0.8, smax: 1.1 });
  Z.veg('jungle', 110, ok, { sep: 4.6 });
  Z.veg('palm', 26, ok, { sep: 4 });
  Z.veg('banana', 24, ok, { sep: 3.5 });
  Z.veg(
    'fern',
    80,
    (x, z) =>
      dr(x, z) > 10 && distToPath(x, z, t1) > 2 && distToPath(x, z, t2) > 2 && Math.abs(x) < 56 && Math.abs(z) < 56,
    { sep: 2 },
  );
  Z.trail(
    [
      [-10, 36],
      [-13.5, 16],
      [-6, 8],
      [-6, -6],
    ],
    7,
  )
    .coin(0, 0.7, -10)
    .coin(4.5, 0.7, -10)
    .coin(9, 0.7, -10)
    .trail(t2, 2);
  return Z.done({
    limit: { minX: -50, maxX: 50, minZ: -48, maxZ: 50 },
    bad: (_x, y) => y < -1.25,
    badMsg: 'El río está muy hondo: buscá el tronco para cruzar',
    sky: { fogFar: 190 },
    npc: {
      pos: [-8.6, 0, 9],
      name: 'Yampu',
      look: {
        hair: 'pelo_largo',
        shirt: 'camisa_manta',
        shirtColor: '#95d5b2',
        pants: 'pantalon_manta',
        pantsColor: '#f2e6cf',
        acc: 'collar_jade',
        skin: '#7a4a2b',
      },
      icon: '🛶',
    },
    gem: [28.4, 0, -23.4],
    gemColor: '#e63946',
  });
}

/** Ocotepeque: bosque nublado de Montecristo, árboles gigantes entre la neblina y el mojón del Trifinio en la cumbre. */
export function bosque(d: Department): ZoneSpec {
  const top = (x: number, z: number) => dist(x, z, 0, -26),
    way: [number, number][] = [
      [0, 52],
      [0, 34],
      [-10, 22],
      [8, 8],
      [-6, -8],
      [0, -20],
    ],
    side: [number, number][] = [
      [-6, -8],
      [-16, -6],
      [-25, -3.5],
    ];
  const Z = new ZB(d, (x, z) => 9 * ss(50, 8, top(x, z))),
    B = Z.bio,
    Y = 9;
  Z.layer('grass', B.grass)
    .layer('dirt', '#6b5236', (x, z) => (1.5 - Math.min(distToPath(x, z, way), distToPath(x, z, side) + 0.3)) * 2)
    .layer('dirt', '#8a7a5a', (x, z) => (6.8 - top(x, z)) / 1.5);
  Z.stop(0, 42);
  // mojón del Trifinio con las tres banderas
  const A = [0, (2 * PI) / 3, (4 * PI) / 3],
    NAMES = ['HONDURAS', 'EL SALVADOR', 'GUATEMALA'],
    COL = ['#00bce4', '#0f47af', '#4997d0'];
  Z.add(
    cy(0, Y + 0.15, -26, 2.5, 0.3, 'concrete', '#cfc9bb', { n: 3, e: [0, PI / 3, 0] }),
    cy(0, Y + 1.9, -26, 1.3, 3.2, 'concrete', '#f2efe6', { n: 3, rt: 0.4, e: [0, PI / 3, 0] }),
    bl(0, Y + 3.6, -26, 0.3, 'gold', '#d9a520', { n: 7 }),
  );
  A.forEach((a, i) => {
    const s = Math.sin(a),
      c = Math.cos(a);
    Z.plaque(NAMES[i], s * 0.7, Y + 1.35, -26 + c * 0.7, a, 0.2, COL[i]);
    Z.add(
      bx(s * 4.2, Y + 0.03, -26 + c * 4.2, 1.5, 0.06, 3.6, 'tile', COL[i], { r: a, solid: false }),
      bx(s * 4.2, Y + 0.04, -26 + c * 4.2, 0.5, 0.06, 3.6, 'tile', '#ffffff', { r: a, solid: false }),
    );
  });
  Z.n(<P.Flag pos={[2.6, Y, -20.4]} height={6} />)
    .put(flagOf(['#0f47af', '#ffffff', '#0f47af'], false, 6), 5.6, -29.4, 0)
    .put(flagOf(['#4997d0', '#ffffff', '#4997d0'], true, 6), -5.6, -29.4, 0)
    .n(<P.Sign pos={Z.at(-3.6, -19.4)} rot={0.4} text="Punto Trifinio" />)
    .n(<P.Sign pos={Z.at(-4.6, 31)} rot={0.3} text="Sendero al Trifinio" />);
  Z.label('Tres países en un cerro', 0, Y + 5, -26, 0.6);
  // tocones para trepar hasta la piña de ocote, con hongos que brillan
  const gy = Z.h(-30, -5);
  Z.add(
    cy(-27, gy - 1.3, -3, 1, 4, 'wood', '#6b4a2a', { n: 9 }),
    cy(-29.6, gy - 0.4, -5, 1, 4, 'wood', '#6b4a2a', { n: 9 }),
    cy(-32.6, gy + 0.6, -6.4, 1.45, 4, 'wood', '#5f4a30', { n: 10 }),
    cy(-32.6, gy + 2.62, -6.4, 1.2, 0.04, 'wood', '#c9a56b', { n: 10, solid: false }),
  );
  for (const [x, z] of [
    [-25.4, -1.2],
    [-26, -5.2],
    [-28.2, -1.4],
    [-30.6, -2.6],
    [-34.6, -4.4],
    [-31, -8.2],
  ]) {
    const y = Z.h(x, z);
    Z.add(
      cy(x, y + 0.2, z, 0.05, 0.4, 'plastic', '#f2efe6', { n: 5, solid: false }),
      bl(x, y + 0.42, z, 0.2, 'neon', '#7df9ff', { s: [1, 0.55, 1], n: 7 }),
    );
  }
  // cabaña del guardabosques, tronco caído
  Z.put(casa(6, 5, 2.8, '#8a5a34', '#3f5a3a', '#5a3d26'), 13.5, 34, -PI / 2).add(
    cy(12, Z.h(12, 14) + 0.7, 14, 0.8, 9, 'wood', '#5f4a30', { e: [PI / 2, 0.5, 0], n: 8 }),
  );
  for (const [x, z] of [
    [4.5, 26],
    [-5, 15],
    [12, 3],
    [-11, -3],
    [5, -13],
    [-7, -22],
  ])
    Z.n(<P.Pine pos={Z.at(x, z)} seed={x + z} scale={1.2} />);
  for (const [x, z] of [
    [3.6, 17],
    [-3, 2],
    [9, -9],
  ])
    Z.n(<P.Rock pos={Z.at(x, z)} seed={x} color="#5f7a5a" />);
  Z.n(<P.Bush pos={Z.at(-2.6, 27)} />)
    .n(<P.Bush pos={Z.at(11, 12)} />)
    .n(<P.Bench pos={Z.at(4.6, -22.4)} rot={-0.9} />);
  const ok = (x: number, z: number, m = 4.2) =>
    distToPath(x, z, way) > m &&
    distToPath(x, z, side) > m - 1 &&
    top(x, z) > 8.5 &&
    !inR(x, z, -9, 18, 29, 50) &&
    Math.hypot(x + 30, z + 5) > 6.5;
  Z.veg('giant', 26, (x, z) => ok(x, z, 5.5) && Math.abs(x) < 60 && Math.abs(z) < 60, {
    sep: 9.5,
    smin: 0.75,
    smax: 1.15,
  });
  Z.veg('pine', 70, ok, { sep: 4.2, smin: 1, smax: 1.7 });
  Z.veg('tree', 20, ok, { sep: 5 });
  Z.veg('fern', 90, (x, z) => ok(x, z, 2) && Math.abs(x) < 54 && Math.abs(z) < 54, { sep: 2 });
  Z.veg('rock', 16, (x, z) => ok(x, z, 2.5) && Math.abs(x) < 50, { sep: 4, colors: ['#5f7a5a', '#6a7a6a'] });
  Z.add(
    place(mont(110, 90, '#2a6140'), -150, 0, -180),
    place(mont(120, 100, '#24573a'), 130, 0, -200),
    place(mont(90, 70, '#2a6140'), 210, 0, 40),
  );
  Z.trail(way.slice(1), 9)
    .coin(-15.5, Z.h(-15.5, -6.2), -6.2)
    .coin(-27, gy + 0.7, -3)
    .coin(-29.6, gy + 1.6, -5);
  return Z.done({
    limit: { minX: -50, maxX: 50, minZ: -48, maxZ: 50 },
    sky: { weather: 'neblina' },
    npc: {
      pos: Z.at(4.8, 31.5),
      name: 'Nando',
      look: {
        hat: 'gorra',
        hatColor: '#386641',
        shirt: 'camisa_basica',
        shirtColor: '#a7c957',
        pants: 'pantalon_basico',
        pantsColor: '#5a4630',
        acc: 'mochila',
        accColor: '#8a5a34',
        skin: '#c98f5f',
      },
      icon: '🌲',
    },
    gem: [-32.6, gy + 2.6, -6.4],
    gemColor: '#a7c957',
  });
}
