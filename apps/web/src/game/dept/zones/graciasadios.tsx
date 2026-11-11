import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, distToPath, inR, type Pc, PI, place, py, ss } from '../lib';
import { pipante, stairs } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

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
    ].map(([_a, b]) => bx(26, 1.2 + b, -18.53, 0.16, 0.24, 0.06, 'stone', '#3f4640', { solid: false })),
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
