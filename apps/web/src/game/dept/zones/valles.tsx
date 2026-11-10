// Zonas de los valles: catedral de Comayagua (catedral), Copán Ruinas (ruinas), Cuevas de Talgua (cuevas)
// y la Lluvia de Peces de Yoro (lluvia).

import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { CaveCam, Darkness, FallingFish } from '../fx';
import { bl, bx, cliff, cy, distToPath, inR, type Pc, PI, place, py, ss } from '../lib';
import { casa, fence, fish, iglesia, mont, stairs, vaca } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

/** Comayagua: plaza colonial con la catedral y su torre del reloj; el engranaje está detrás de la torre, arriba. */
export function catedral(d: Department): ZoneSpec {
  const Z = new ZB(d, () => 0),
    W = '#f7f1e3',
    T = '#e9dcc0',
    K = '#3a3a3a';
  Z.layer('grass', Z.bio.grass).layer(
    'cobble',
    '#a8a094',
    (x, z) =>
      Math.max(Math.min(21 - Math.abs(x), 17 - Math.abs(z - 6)), Math.min(3 - Math.abs(x), z - 20, 52 - z)) * 1.5,
  );
  Z.stop(0, 42);
  // nave, cúpula y fachada escalonada
  Z.add(
    bx(0, 5, -27, 16, 10, 28, 'stucco', W),
    py(0, 10, -27, 17, 3, 29, 'roof', '#b5523b'),
    cy(0, 11.6, -34, 3.4, 3.2, 'stucco', W, { n: 10, solid: false }),
    bl(0, 13.2, -34, 3.4, 'tile', '#f4a261', { s: [1, 0.75, 1] }),
    bx(0, 6, -12.5, 17, 12, 1.2, 'stucco', W),
    bx(0, 13, -12.5, 11.5, 2.2, 1.2, 'stucco', W),
    bx(0, 15, -12.5, 6, 2, 1.2, 'stucco', W),
    bx(0, 16.9, -12.5, 0.25, 1.8, 0.25, 'stone', K, { solid: false }),
    bx(0, 17.2, -12.5, 1, 0.25, 0.25, 'stone', K, { solid: false }),
    ...[4.6, 8.6, 12].map((y) => bx(0, y, -11.85, y > 10 ? 11.9 : 17.4, 0.3, 0.3, 'stucco', T, { solid: false })),
    ...[-7.3, -4.6, -1.9, 1.9, 4.6, 7.3].map((x) => cy(x, 6, -11.75, 0.28, 12, 'stucco', T, { n: 8, solid: false })),
    bx(0, 2, -11.86, 2.6, 4, 0.12, 'wood', '#6b3f22', { solid: false }),
    cy(0, 4, -11.86, 1.3, 0.12, 'wood', '#6b3f22', { e: [PI / 2, 0, 0], n: 14 }),
    cy(0, 7, -11.86, 0.85, 0.12, 'glass', '#2b4a63', { e: [PI / 2, 0, 0], n: 14 }),
    ...[6.6, 10.4].flatMap((y) =>
      [-5.95, -3.25, 3.25, 5.95].flatMap((x) => [
        bx(x, y, -11.86, 1, 1.9, 0.12, 'stone', '#8a7a6a', { solid: false }),
        cy(x, y - 0.25, -11.72, 0.2, 1.2, 'stone', '#d9d0b8', { n: 6, solid: false }),
      ]),
    ),
  );
  // torre del reloj
  Z.add(
    bx(-13, 9, -13, 7, 18, 7, 'stucco', W),
    bx(-13, 18.15, -13, 7.5, 0.3, 7.5, 'stucco', T, { solid: false }),
    bx(-13, 20.8, -13, 6, 5, 6, 'stucco', '#f2e6cf'),
    bx(-13, 23.4, -13, 6.5, 0.3, 6.5, 'stucco', T, { solid: false }),
    bx(-13, 20.8, -9.96, 1.6, 3, 0.12, 'stone', K, { solid: false }),
    bx(-13, 20.8, -16.04, 1.6, 3, 0.12, 'stone', K, { solid: false }),
    bx(-9.96, 20.8, -13, 0.12, 3, 1.6, 'stone', K, { solid: false }),
    bx(-16.04, 20.8, -13, 0.12, 3, 1.6, 'stone', K, { solid: false }),
    bl(-13, 23.5, -13, 3, 'tile', '#f4a261', { s: [1, 0.85, 1] }),
    cy(-13, 26.4, -13, 0.5, 1.2, 'stucco', W, { n: 8, solid: false }),
    bx(-13, 27.8, -13, 0.2, 1.6, 0.2, 'stone', K, { solid: false }),
    bx(-13, 28.1, -13, 0.9, 0.2, 0.2, 'stone', K, { solid: false }),
    cy(-13, 13.5, -9.45, 1.8, 0.14, 'stone', K, { e: [PI / 2, 0, 0], n: 22 }),
    cy(-13, 13.5, -9.4, 1.55, 0.14, 'plastic', '#fffdf2', { e: [PI / 2, 0, 0], n: 22 }),
    bx(-13, 13.95, -9.3, 0.13, 1, 0.05, 'metal', '#1d1d1f', { solid: false }),
    bx(-12.6, 13.5, -9.3, 0.9, 0.13, 0.05, 'metal', '#1d1d1f', { solid: false }),
    ...[0, 1, 2, 3].map((i) =>
      bx(
        -13 + Math.sin((i * PI) / 2) * 1.3,
        13.5 + Math.cos((i * PI) / 2) * 1.3,
        -9.3,
        0.14,
        0.14,
        0.05,
        'metal',
        '#b5523b',
        { solid: false },
      ),
    ),
  );
  Z.plaque('Reloj de la catedral', -13, 11.1, -9.44, 0, 0.5)
    .plaque('Catedral de Comayagua', 0, 5.3, -11.62, 0, 0.55, '#7a4a2b')
    .plaque('Subida al reloj ↑', -17.6, 1.7, -8.6, 0, 0.34);
  // escalera y pasarela de madera hasta atrás de la torre
  Z.add(
    place(stairs(2.2, 16, 0.32, 0.45, 'wood', '#8a6a45'), -17.6, 0, -9.5),
    bx(-17.6, 5, -18.1, 2.2, 0.24, 2.8, 'wood', '#9a7448'),
    bx(-13, 5, -18.1, 7, 0.24, 2.8, 'wood', '#9a7448'),
    bx(-13.6, 5.65, -19.4, 10.2, 0.1, 0.1, 'wood', '#5a3d26'),
    ...[-18.6, -14.5, -9.7].map((x) => cy(x, 2.9, -19.3, 0.12, 5.8, 'wood', '#5a3d26', { n: 6 })),
    bx(-18.6, 5.65, -18.1, 0.1, 0.1, 2.8, 'wood', '#5a3d26'),
    bx(-9.55, 5.65, -18.1, 0.1, 1.1, 2.8, 'wood', '#5a3d26'),
    cy(-10.5, 5.6, -18.9, 0.5, 0.12, 'gold', '#d9a520', { e: [PI / 2, 0, 0], n: 10 }),
    cy(-11.3, 6.05, -19, 0.32, 0.1, 'metal', '#8a8f96', { e: [PI / 2, 0, 0], n: 8 }),
    cy(-10.2, 6.3, -19, 0.25, 0.1, 'gold', '#d9a520', { e: [PI / 2, 0, 0], n: 8 }),
  );
  // plaza: fuente, alfombras de aserrín, casas coloniales
  Z.n(<P.Fountain pos={[0, 0, 6]} />)
    .n(<P.Bench pos={[-6.5, 0, 6]} rot={PI / 2} />)
    .n(<P.Bench pos={[6.5, 0, 6]} rot={-PI / 2} />)
    .n(<P.Bench pos={[0, 0, 13]} rot={PI} />)
    .n(<P.Flag pos={[9, 0, -6]} />);
  for (const [x, z] of [
    [-10, -3],
    [10, 17],
    [-10, 17],
  ])
    Z.n(<P.Lamp pos={[x, 0, z]} />);
  for (const [x, z] of [
    [-14, 1],
    [14, 1],
    [-14, 13],
    [14, 13],
  ])
    Z.n(<P.Tree pos={[x, 0, z]} seed={x + z} />);
  for (const [x, z] of [
    [-3.4, 9.4],
    [3.4, 9.4],
    [-3.4, 2.6],
    [3.4, 2.6],
  ])
    Z.n(<P.Flowers pos={[x, 0, z]} />);
  [
    ['#e63946', '#ffd166', '#2ea44f'],
    ['#7b2cbf', '#f4a261', '#ffffff'],
    ['#00a3d7', '#ffd166', '#e63946'],
  ].forEach((c, i) => {
    const x = (i - 1) * 7.6;
    Z.add(
      bx(x, 0.03, -6.6, 6.6, 0.06, 3.4, 'cloth', '#f2e6cf', { solid: false }),
      bx(x, 0.05, -6.6, 6, 0.06, 2.8, 'cloth', c[0], { solid: false }),
      bx(x, 0.07, -6.6, 4.2, 0.06, 1.7, 'cloth', c[1], { solid: false }),
      bx(x, 0.09, -6.6, 1.2, 0.06, 1.2, 'cloth', c[2], { r: PI / 4, solid: false }),
    );
  });
  Z.n(<P.Sign pos={[15.5, 0, -7.5]} rot={-0.5} text="Alfombras de aserrín" />);
  Z.n(<P.House pos={[26.5, 0, 1]} rot={-PI / 2} color="#f4a261" sign="Museo" />)
    .n(<P.House pos={[26.5, 0, 14]} rot={-PI / 2} floors={2} color="#f7f1e3" w={7} />)
    .n(<P.House pos={[-27.5, 0, 9]} rot={PI / 2} color="#ffe0a8" />);
  Z.put(casa(7, 5, 3.2, '#f7d9c4'), -27.5, 21, PI / 2)
    .put(casa(8, 5, 3.2, '#f7f1e3'), 15, 30, PI)
    .put(casa(8, 5, 3.2, '#ffe6a7'), -16, 30, PI)
    .put(casa(6, 5, 3, '#f4c7a1'), 27, 27, -PI / 2)
    .put(casa(7, 5, 3.2, '#f7f1e3'), -27, -6, PI / 2);
  Z.veg('tree', 40, (x, z) => (Math.abs(x) > 33 || z > 50 || z < -44) && !inR(x, z, -12, 12, -44, -10), { sep: 5.5 });
  Z.veg(
    'bush',
    22,
    (x, z) => Math.abs(x) > 22 && Math.abs(x) < 46 && z > -20 && z < 46 && !inR(x, z, -32, 32, -10, 34),
    { sep: 3 },
  );
  Z.add(
    place(mont(80, 50, '#4a8a50'), -180, 0, -90),
    place(mont(90, 60, '#3f7f48'), 170, 0, -130),
    place(mont(80, 45, '#4a8a50'), 30, 0, -220),
  );
  Z.trail(
    [
      [0, 36],
      [0, 15],
      [4.5, 8],
      [0, -1],
      [0, -9],
    ],
    7,
  )
    .coin(-17.6, 2, -12.5)
    .coin(-17.6, 4.1, -15.5)
    .coin(-14.5, 5.12, -18.1)
    .coin(-9, 0, 12)
    .coin(9, 0, 12);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -24, maxZ: 50 },
    npc: {
      pos: [5, 0, 0.5],
      name: 'Don Beto',
      look: {
        hair: 'pelo_corto',
        hairColor: '#9e9e9e',
        face: 'cara_bigote',
        shirt: 'guayabera',
        shirtColor: '#ffffff',
        pants: 'pantalon_basico',
        pantsColor: '#3b2414',
        hat: 'sombrero_junco',
        skin: '#c98f5f',
      },
      icon: '🕰',
    },
    gem: [-11.6, 5.12, -17.9],
    gemColor: '#d9a520',
  });
}

const C = '#b5ab95',
  CD = '#8f866f';
const estela = (): Pc[] => [
  bx(0, 1.7, 0, 0.95, 3.4, 0.6, 'stone', C),
  bx(0, 3.5, 0, 1.15, 0.25, 0.75, 'stone', CD, { solid: false }),
  bx(0, 2.55, 0.31, 0.5, 0.5, 0.06, 'stone', CD, { solid: false }),
  bx(0, 3.05, 0.31, 0.8, 0.3, 0.06, 'stone', CD, { solid: false }),
  bx(0, 1.55, 0.31, 0.6, 0.9, 0.06, 'stone', CD, { solid: false }),
  bx(-0.34, 2, 0.31, 0.12, 0.5, 0.06, 'stone', CD, { solid: false }),
  bx(0.34, 2, 0.31, 0.12, 0.5, 0.06, 'stone', CD, { solid: false }),
  bx(0, 0.7, 0.31, 0.75, 0.3, 0.06, 'stone', CD, { solid: false }),
  cy(0, 0.28, 1.5, 0.75, 0.56, 'stone', C, { n: 8 }),
];
/** Copán: la Gran Plaza con estelas, la pirámide de la Escalinata Jeroglífica (se sube), el Juego de Pelota y guacamayas. */
export function ruinas(d: Department): ZoneSpec {
  const Z = new ZB(d, () => 0);
  Z.layer('grass', Z.bio.grass).layer(
    'dirt',
    '#b89a6a',
    (x, z) =>
      (1.8 -
        distToPath(x, z, [
          [0, 50],
          [0, 17],
        ])) *
      2,
  );
  Z.stop(0, 42);
  // pirámide escalonada con escalinata central y templo arriba
  for (let i = 0; i < 6; i++) {
    const hf = 11 - 1.6 * i;
    Z.add(
      bx(0, 0.7 + 1.4 * i, -18, hf * 2, 1.4, hf * 2, 'stone', i % 2 ? '#aea48d' : C),
      bx(-2.95, 1.4 * i + 1.05, -7 - 1.6 * i + 0.28, 0.62, 0.62, 0.5, 'stone', CD, { solid: false }),
      bx(2.95, 1.4 * i + 1.05, -7 - 1.6 * i + 0.28, 0.62, 0.62, 0.5, 'stone', CD, { solid: false }),
    );
  }
  Z.add(
    place(stairs(5, 24, 0.35, 0.4, 'stone', '#cdbf9f'), 0, 0, -5.4),
    bx(0, 9.6, -20.5, 5.2, 2.4, 0.8, 'stone', C),
    bx(-2.3, 9.6, -19, 0.6, 2.4, 2.6, 'stone', C),
    bx(2.3, 9.6, -19, 0.6, 2.4, 2.6, 'stone', C),
    bx(0, 11.05, -19.3, 5.8, 0.5, 3.6, 'stone', CD),
    bx(0, 11.9, -19.6, 3.4, 1.2, 1, 'stone', C, { solid: false }),
    bx(0, 12.7, -19.6, 2, 0.5, 0.8, 'stone', CD, { solid: false }),
  );
  Z.n(<P.Sign pos={[5, 0, -4.4]} rot={-0.3} text="Escalinata Jeroglífica" />);
  // estelas de la Gran Plaza
  (
    [
      [-10, 10, 'Estela A'],
      [10, 10, 'Estela B'],
      [-14, 1, 'Estela C'],
      [14, 1, 'Estela H'],
      [-9, -4, 'Estela D'],
      [9, -4, 'Estela F'],
    ] as [number, number, string][]
  ).forEach(([x, z, name]) => {
    Z.put(estela(), x, z);
    Z.plaque(name, x, 0.3, z + 2.27, 0, 0.26);
  });
  Z.add(
    bx(-21, 0.55, -6, 1.8, 1.1, 1.8, 'stone', C),
    bx(-21, 1.15, -6, 2, 0.14, 2, 'stone', CD, { solid: false }),
    ...[-0.6, -0.2, 0.2, 0.6].map((o) => bx(-21 + o, 0.65, -5.07, 0.28, 0.6, 0.08, 'stone', CD, { solid: false })),
  );
  Z.plaque('Altar Q', -21, 0.2, -5.02, 0, 0.24);
  // acrópolis (oeste) con escalinata y templo
  Z.add(
    bx(-31, 1, -18, 16, 2, 20, 'stone', C),
    place(stairs(7, 6, 0.3334, 0.45, 'stone', '#cdbf9f'), -20.3, 0, -18, PI / 2),
    bx(-33, 3.4, -20, 7, 2.8, 7, 'stone', '#aea48d'),
    bx(-33, 5.05, -20, 7.6, 0.5, 7.6, 'stone', CD),
    bx(-33, 5.9, -20, 4, 1.2, 1.2, 'stone', C, { solid: false }),
    bx(-29.45, 3, -20, 0.12, 2, 1.4, 'stone', '#2b2b2b', { solid: false }),
  );
  Z.plaque('Acrópolis', -22.95, 1.4, -13.5, PI / 2, 0.4);
  // juego de pelota (este)
  const court: Pc[] = [-1, 1].flatMap((s) => [
    bx(s * 4.1, 0.35, 0, 2.2, 0.7, 20, 'stone', C),
    bx(s * 6.2, 0.85, 0, 3, 1.7, 20, 'stone', '#aea48d'),
    bx(s * 8, 1.7, 0, 2.6, 3.4, 16, 'stone', C),
    bx(s * 8, 3.6, 0, 3, 0.4, 16.4, 'stone', CD, { solid: false }),
    ...[-7, 0, 7].map((z) => bl(s * 5.1, 1.9, z, 0.3, 'plastic', '#c0392b', { s: [1.5, 1, 1], n: 7 })),
  ]);
  Z.put([...court, ...[-7, 0, 7].map((z) => cy(0, 0.03, z, 0.55, 0.06, 'stone', CD, { n: 10, solid: false }))], 27, 2);
  Z.label('Juego de Pelota', 27, 5.4, 2, 0.7).label('Gran Plaza de Copán', 0, 5.2, 12, 0.7);
  // guacamayas, ceiba y selva alrededor
  Z.n(<P.Macaw pos={[-10, 3.63, 10]} />)
    .n(<P.Macaw pos={[14, 3.63, 1]} rot={2} />)
    .n(<P.Macaw pos={[0, 9, 6]} flying />)
    .n(<P.Macaw pos={[20, 8, -8]} flying />)
    .n(<P.Macaw pos={[-18, 10, -2]} flying />);
  Z.n(<P.Tree pos={[-22, 0, 12]} scale={2.2} seed={3} />)
    .n(<P.Tree pos={[21, 0, 21]} scale={1.4} seed={8} />)
    .n(<P.Tree pos={[-12, 0, 27]} scale={1.3} seed={2} />)
    .n(<P.Stall pos={[8, 0, 29]} rot={-PI / 2} sign="Guías de Copán" color="#6a994e" />)
    .n(<P.Rock pos={[17, 0, 12]} />)
    .n(<P.Rock pos={[-17, 0, -9]} seed={4} />);
  const site = (x: number, z: number) => inR(x, z, -41, 38, -32, 48);
  Z.veg('jungle', 64, (x, z) => !site(x, z), { sep: 6 });
  Z.veg(
    'tree',
    26,
    (x, z) =>
      !site(x, z) || (inR(x, z, -40, -24, 2, 40) && Math.hypot(x + 22, z - 12) > 5) || inR(x, z, 16, 37, 24, 46),
    { sep: 5 },
  );
  Z.veg('bush', 26, (x, z) => !inR(x, z, -20, 38, -32, 48) && Math.abs(x) < 48 && !inR(x, z, -40, -18, -30, -5), {
    sep: 3,
  });
  Z.veg('fern', 30, (x, z) => !site(x, z) && Math.abs(x) < 52 && Math.abs(z) < 56, { sep: 2.5 });
  Z.add(
    place(mont(80, 45, '#3f7f48'), -170, 0, -120),
    place(mont(90, 55, '#35743f'), 150, 0, -160),
    place(mont(80, 40, '#3f7f48'), 190, 0, 60),
  );
  Z.trail(
    [
      [0, 36],
      [0, 0],
    ],
    6,
  )
    .coin(0, 1.4, -6.8)
    .coin(0, 3.5, -9.2)
    .coin(0, 5.6, -11.6)
    .coin(0, 7.7, -14)
    .coin(27, 0, -3)
    .coin(27, 0, 8);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -36, maxZ: 50 },
    npc: {
      pos: [4.2, 0, 21],
      name: 'Ixchel',
      look: {
        hair: 'pelo_trenzas',
        shirt: 'camisa_manta',
        shirtColor: '#f2e6cf',
        pants: 'jeans',
        hat: 'casco_explorador',
        acc: 'collar_jade',
        skin: '#a56b43',
      },
      icon: '🗿',
    },
    gem: [0, 8.4, -18.8],
    gemColor: '#3fbf7f',
    finds: [
      {
        id: 'mascara',
        name: 'Máscara de jade',
        icon: '🎭',
        color: '#3fbf7f',
        pos: [0, 8.4, -18.8],
        fact: 'Los mayas de Copán tallaban el jade, una piedra verde que valoraban muchísimo.',
      },
      {
        id: 'estela',
        name: 'Fragmento de estela',
        icon: '🗿',
        color: '#cdbf9f',
        pos: [14.5, 0, -0.9],
        fact: 'Varias estelas de la Gran Plaza retratan al gobernante 18 Conejo.',
      },
      {
        id: 'pluma',
        name: 'Pluma de guacamaya',
        icon: '🪶',
        color: '#e63946',
        pos: [-24.8, 0, 13.8],
        fact: 'La guacamaya roja es el ave nacional de Honduras y vuela libre en Copán.',
      },
      {
        id: 'glifo',
        name: 'Glifo tallado',
        icon: '📜',
        color: '#d9a05b',
        pos: [4.3, 0, -6.2],
        fact: 'La Escalinata Jeroglífica guarda el texto maya más largo que se conoce.',
      },
      {
        id: 'pelota',
        name: 'Pelota de hule',
        icon: '⚫',
        color: '#4a4a4a',
        pos: [27, 0, -9.4],
        fact: 'En el Juego de Pelota se usaba una pelota de hule; sus marcadores tienen forma de cabeza de guacamaya.',
      },
    ],
  });
}

/** Olancho: potreros y el cerro de piedra caliza con las Cuevas de Talgua: túnel, galería y la sala de los cristales. */
export function cuevas(d: Department): ZoneSpec {
  const path: [number, number][] = [
      [0, -10],
      [0, -34],
      [15, -34],
    ],
    cheb = (x: number, z: number) => Math.max(Math.abs(x - 22), Math.abs(z + 36)),
    sz = (x: number) => 10 + 2 * Math.sin(x * 0.08);
  const Z = new ZB(
      d,
      (x, z) =>
        cliff(x, z, -13, 16, 12, 21)[0] * Math.min(ss(4.2, 6.4, distToPath(x, z, path)), ss(8.2, 10.4, cheb(x, z))) -
        0.9 * ss(3.5, 1.5, Math.abs(z - sz(x))),
    ),
    B = Z.bio,
    R = '#a8a294',
    R2 = '#b9b2a0';
  Z.layer('grass', B.grass)
    .layer('stone', R, (x, z) => {
      const zz = cliff(x, z, -13, 16, 12, 21)[1];
      return Math.min(-12.4 - zz, zz + 21.5) * 1.2;
    })
    .layer(
      'dirt',
      '#a5825a',
      (x, z) =>
        Math.max(
          1.8 -
            distToPath(x, z, [
              [0, 50],
              [0, 14],
            ]),
          1.8 -
            distToPath(x, z, [
              [0, 6],
              [0, -14],
            ]),
          Math.min(4.4 - distToPath(x, z, path), -13 - z),
          8.4 - cheb(x, z),
        ) * 2,
    )
    .layer('sand', B.sand, (x, z) => (4.2 - Math.abs(z - sz(x))) / 1.5);
  Z.sea(-0.35);
  Z.stop(0, 42);
  // paredes, techos y relleno de roca de la cueva
  Z.add(
    bx(-3.4, 2.5, -26.05, 2.4, 5, 25.1, 'stone', R),
    bx(3.4, 2.5, -22.65, 2.4, 5, 18.3, 'stone', R),
    bx(10.3, 2.5, -30.6, 11.4, 5, 2.4, 'stone', R),
    bx(6.9, 2.5, -37.4, 18.2, 5, 2.4, 'stone', R),
    bx(14.8, 3.75, -40.3, 2.4, 7.5, 8.2, 'stone', R),
    bx(14.8, 3.75, -29.7, 2.4, 7.5, 4.2, 'stone', R),
    bx(22, 3.75, -43.2, 16.8, 7.5, 2.4, 'stone', R),
    bx(22, 3.75, -28.8, 16.8, 7.5, 2.4, 'stone', R),
    bx(29.2, 3.75, -36, 2.4, 7.5, 16.8, 'stone', R),
    bx(0, 4.6, -26, 9.2, 1, 25.2, 'stone', '#8f897c'),
    bx(10.3, 4.6, -34, 11.4, 1, 4.6, 'stone', '#8f897c'),
    bx(22, 7, -36, 12.2, 1, 12.2, 'stone', '#8f897c'),
    bx(0, 10.65, -18.2, 9.2, 11.1, 5, 'stone', R),
    bx(0, 6.55, -14.6, 9.2, 2.9, 2.2, 'stone', R2),
    bx(0, 16.05, -29.7, 13.2, 0.3, 18, 'grass', B.grass, { solid: false }),
    bx(12, 16.05, -34, 13, 0.3, 13.2, 'grass', B.grass, { solid: false }),
    bx(22, 16.05, -36, 21, 0.3, 21, 'grass', B.grass, { solid: false }),
    bx(-5.4, 1.4, -13.2, 2, 2.8, 2, 'stone', R2),
    bx(5.6, 1, -13, 2.2, 2, 1.8, 'stone', R2),
    bx(0, 0.04, -24, 2.2, 0.08, 21, 'wood', '#8a6a45', { solid: false }),
  );
  Z.n(<Darkness pos={[13, 7.65, -33.4]} size={[39, 16.3, 25.2]} />).n(<CaveCam inside={(_x, z) => z < -14.5} />);
  Z.plaque('Cuevas de Talgua', 0, 6.4, -13.48, 0, 0.7, '#3a2a1a').plaque(
    'Las calaveras brillantes',
    22,
    2.2,
    -41.98,
    0,
    0.36,
  );
  // estalagmitas, estalactitas, cristales y calaveras
  const r = Z.rand;
  for (const [x, z] of [
    [-1.7, -18],
    [1.8, -23],
    [-1.8, -28],
    [1.6, -30.5],
    [4, -35.6],
    [9, -32.4],
    [12, -35.6],
    [17, -31],
    [17, -41],
    [27, -41],
    [27, -36],
  ])
    Z.add(cy(x, 0.6, z, 0.32, 1.2 + r(), 'stone', R2, { rt: 0.1, n: 6, solid: false }));
  for (const [x, z] of [
    [-1, -16.5],
    [1.2, -20],
    [-0.6, -25],
    [1, -29],
    [0, -33],
    [6, -34.5],
    [11, -33.4],
    [19, -33],
    [24, -38],
    [21, -40],
    [25, -32],
    [19, -38],
  ]) {
    const top = x > 16 ? 6.5 : 4.1,
      l = 0.7 + r() * 1.1;
    Z.add(cy(x, top - l / 2, z, 0.04, l, 'stone', R2, { rt: 7, n: 6, solid: false }));
  }
  const NE = ['#7df9ff', '#c77dff', '#ff9de2', '#aaffc3'];
  for (const [x, z] of [
    [17.6, -40.6],
    [26.6, -39.4],
    [27, -33.4],
    [18, -32],
    [22.5, -41.2],
    [10.5, -36],
    [-1.6, -32.6],
    [20.6, -31],
  ])
    for (let j = 0; j < 3; j++)
      Z.add(
        cy(x + (r() - 0.5) * 0.9, 0.45, z + (r() - 0.5) * 0.9, 0.2, 0.9 + r() * 0.8, 'neon', NE[Math.floor(r() * 4)], {
          rt: 0.05,
          n: 5,
          e: [(r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8],
        }),
      );
  Z.add(
    bx(22, 0.4, -41.2, 6, 0.8, 1.4, 'stone', '#9a9484'),
    ...[-2.2, -1.1, 0, 1.1, 2.2].flatMap((o) => [
      bl(22 + o, 1, -41.2, 0.21, 'neon', '#eafff2', { n: 8 }),
      bx(22 + o, 0.84, -41.14, 0.2, 0.12, 0.2, 'neon', '#d6f5e3', { solid: false }),
    ]),
    bx(26.6, 0.6, -31.4, 2.6, 1.2, 2.6, 'stone', '#9a9484'),
  );
  Z.n(<P.Lamp pos={[1.75, 0, -21]} />)
    .n(<P.Lamp pos={[1.75, 0, -33.4]} />)
    .n(<P.Lamp pos={[17, 0, -36.4]} />);
  // afuera: puentecito sobre el río Talgua, potrero, centro de visitantes
  Z.add(
    bx(0, 0.15, 10, 3, 0.3, 8, 'wood', '#9a7448'),
    bx(-1.45, 0.75, 10, 0.1, 0.9, 8, 'wood', '#5a3d26'),
    bx(1.45, 0.75, 10, 0.1, 0.9, 8, 'wood', '#5a3d26'),
  );
  Z.put(fence(16), -21, 17)
    .put(fence(16), -21, 31)
    .put(fence(14), -29, 24, PI / 2)
    .put(fence(14), -13, 24, PI / 2)
    .put(vaca(), -24, 22, 0.8)
    .put(vaca('#8a5a34', '#f2efe6'), -18, 27, -2)
    .put(vaca('#f2efe6', '#1d1d1f'), -20, 20, 2.6)
    .add(
      bx(-25, 0.5, 28.5, 2.4, 1, 1.6, 'cloth', '#d9b96a'),
      bx(-25, 1.4, 28.5, 1.6, 0.8, 1.4, 'cloth', '#d9b96a', { solid: false }),
    );
  Z.n(<P.House pos={[15, 0, -1]} rot={-PI / 2} color="#fefae0" sign="Centro de visitantes" />)
    .n(<P.Sign pos={[-5.5, 0, -8.5]} rot={0.3} text="Entrada a las cuevas" />)
    .put(casa(6, 5, 3, '#f2d9b0', '#8d4a35'), 22, 26, -PI / 2);
  for (const [x, z] of [
    [9, 20],
    [-9, 2],
    [24, 12],
    [-30, 4],
  ])
    Z.n(<P.Tree pos={Z.at(x, z)} seed={x} />);
  for (const [x, z] of [
    [8.5, -11.5],
    [-9, -11],
    [-14, -12],
  ])
    Z.n(<P.Rock pos={[x, 0, z]} seed={x} scale={1.4} />);
  const out = (x: number, z: number) =>
    z > -11 && Math.abs(x) > 5 && Math.abs(z - sz(x)) > 5 && !inR(x, z, -31, -11, 15, 33) && !inR(x, z, 9, 27, -6, 31);
  Z.veg('tree', 34, out, { sep: 6 });
  Z.veg('bush', 26, out, { sep: 3 });
  Z.veg('rock', 14, (x, z) => z < -8 && z > -12.5 && Math.abs(x) > 7, { sep: 3, colors: [R2], smin: 1, smax: 2 });
  Z.veg('tree', 30, (x, z) => z < -21 && Math.abs(x) < 46 && !inR(x, z, -8, 34, -48, -20), { sep: 5 });
  Z.veg('pine', 16, (x, z) => z < -21 && Math.abs(x) < 46 && !inR(x, z, -8, 34, -48, -20), { sep: 5 });
  Z.add(place(mont(90, 50, '#4a8a50'), -160, 0, -160), place(mont(100, 60, '#3f7f48'), 140, 0, -190));
  Z.trail(
    [
      [0, 36],
      [0, -12],
    ],
    6,
  )
    .coin(0, 0, -20)
    .coin(0, 0, -28)
    .coin(8, 0, -34)
    .coin(20, 0, -34)
    .coin(23.5, 0, -39)
    .coin(-21, 0, 24);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -45, maxZ: 50 },
    bad: (_x, y) => y > 2.6,
    badMsg: 'El cerro es muy empinado: entrá por la cueva',
    badIcon: '⛰',
    npc: {
      pos: [5.6, 0, -7.5],
      name: 'Don Polo',
      look: {
        hat: 'sombrero_vaquero',
        hatColor: '#8a5a34',
        shirt: 'camisa_cuadros',
        shirtColor: '#bc6c25',
        face: 'cara_bigote',
        pants: 'jeans',
        skin: '#c98f5f',
      },
      icon: '🦇',
    },
    gem: [26.6, 1.2, -31.4],
    gemColor: '#7df9ff',
  });
}

/** Yoro: el pueblo donde «llueven peces». Llueve, hay peces en el suelo y pececitos cayendo del cielo. */
export function lluvia(d: Department): ZoneSpec {
  const Z = new ZB(d, () => 0),
    r = Z.rand;
  Z.layer('grass', Z.bio.grass)
    .layer(
      'cobble',
      '#9a9a94',
      (x, z) =>
        Math.max(Math.min(16 - Math.abs(x), 14 - Math.abs(z + 2)), Math.min(3 - Math.abs(x), z - 10, 52 - z)) * 1.5,
    )
    .layer('dirt', '#7a6248', (x, z) => Math.min(-21 - x, 27 - Math.abs(z - 4)) / 2);
  Z.stop(0, 42);
  Z.put(iglesia(9, 6, 13, '#fdfbf3'), 0, -26)
    .n(<P.Kiosk pos={[0, 0, -2]} />)
    .plaque('Parroquia de Yoro', 0, 3.4, -18.92, 0, 0.4, '#4d908e');
  // monumento al pez
  Z.add(
    cy(11, 0.3, 6, 2.2, 0.6, 'stone', '#cfd3d6', { n: 12 }),
    cy(11, 0.57, 6, 1.9, 0.1, 'water', '#3aa6d8', { n: 12, solid: false }),
    cy(11, 1.3, 6, 0.4, 2, 'stone', '#cfd3d6', { n: 8 }),
    bl(11, 3, 6, 1.05, 'metal', '#c9d6df', { s: [1.9, 0.8, 0.5], e: [0, 0.5, 0.45] }),
    py(9.7, 2.1, 6.7, 1, 1.2, 0.3, 'metal', '#c9d6df', { e: [0, 0.5, 2.0] }),
    bx(11.2, 3.75, 5.9, 0.7, 0.6, 0.1, 'metal', '#9fb4c2', { e: [0, 0.5, 0.45] }),
    bl(11.95, 3.65, 5.75, 0.12, 'plastic', '#1d1d1f', { n: 6 }),
  );
  Z.plaque('Monumento a la Lluvia de Peces', 11, 0.95, 8.3, 0, 0.3, '#4d908e').add(
    bx(11, 0.95, 8.22, 4.6, 0.5, 0.12, 'stone', '#cfd3d6'),
  );
  // mercadito de techo plano: se sube por las cajas hasta el recuerdo
  Z.add(
    bx(-12, 1.6, -10, 5, 3.2, 4, 'stucco', '#f9c74f'),
    bx(-12, 2.6, -7.5, 5, 0.1, 1.3, 'cloth', '#e63946', { e: [0.25, 0, 0] }),
    bx(-12, 1.1, -7.97, 1.2, 2.2, 0.08, 'wood', '#6b3f22', { solid: false }),
    bx(-12, 3.3, -10, 5.3, 0.2, 4.3, 'stucco', '#e0a92f', { solid: false }),
  );
  Z.plaque('Mercadito', -12, 2.95, -7.96, 0, 0.36, '#4d908e')
    .n(<P.Crate pos={[-8.7, 0, -8.9]} />)
    .n(<P.Crate pos={[-8.95, 0, -10.4]} />)
    .n(<P.Crate pos={[-8.95, 1, -10.4]} />);
  // pancarta del festival y casas
  Z.add(
    bx(-4.6, 2.6, 15, 0.2, 5.2, 0.2, 'wood', '#5a3d26'),
    bx(4.6, 2.6, 15, 0.2, 5.2, 0.2, 'wood', '#5a3d26'),
    bx(0, 4.5, 15, 9.2, 1.1, 0.08, 'cloth', '#f9c74f', { solid: false }),
  );
  Z.plaque('Festival de la Lluvia de Peces', 0, 4.5, 15.06, 0, 0.5, '#4d908e');
  Z.n(<P.House pos={[13, 0, 23]} rot={-PI / 2} color="#f9c74f" sign="Comedor" />)
    .n(<P.House pos={[-13, 0, 24]} rot={PI / 2} color="#bfe3df" />)
    .n(<P.House pos={[23, 0, -6]} rot={-PI / 2} color="#f7f1e3" />);
  Z.put(casa(6, 5, 3, '#ffd9a0'), 23, 7, -PI / 2)
    .put(casa(6, 5, 3, '#f4c7a1'), 13.5, 36, -PI / 2)
    .put(casa(7, 5, 3, '#cfe8c0'), 21, -20, -PI / 2)
    .put(casa(6, 5, 3, '#f7f1e3'), -20, -26, PI / 2);
  for (const [x, z] of [
    [-9, 8],
    [9, -11],
    [-9, -1],
  ])
    Z.n(<P.Lamp pos={[x, 0, z]} />);
  Z.n(<P.Bench pos={[-6, 0, -2]} rot={PI / 2} />)
    .n(<P.Bench pos={[6, 0, -2]} rot={-PI / 2} />)
    .n(<P.Tree pos={[13, 0, -13]} seed={1} />)
    .n(<P.Tree pos={[-13, 0, 9]} seed={2} />)
    .n(<P.Tree pos={[13.5, 0, 12]} seed={3} />);
  Z.n(<P.Sign pos={[-19.5, 0, 9]} rot={PI / 2} text="El Pantano: aquí llueven peces" />);
  // peces en el suelo y charcos
  const blocked = (x: number, z: number) =>
    inR(x, z, -15, -7, -13, -7) ||
    inR(x, z, -5, 5, -33, -18) ||
    Math.hypot(x, z + 2) < 3.4 ||
    Math.hypot(x - 11, z - 6) < 2.6 ||
    inR(x, z, 9, 27, -24, 40) ||
    inR(x, z, -17, -9, 20, 28);
  for (let i = 0, n = 0; n < 74 && i < 2000; i++) {
    const field = r() < 0.5,
      x = field ? -24 - r() * 22 : (r() * 2 - 1) * 18,
      z = field ? -20 + r() * 46 : -16 + r() * 60;
    if (blocked(x, z)) continue;
    n++;
    Z.add(fish(x, 0.04, z, r() * 6.3, 0.75 + r() * 0.7, r() < 0.75 ? '#c9d6df' : '#8fb8d0'));
  }
  for (let i = 0; i < 13; i++) {
    const x = i < 9 ? -25 - r() * 20 : (r() * 2 - 1) * 14,
      z = i < 9 ? -18 + r() * 42 : 14 + r() * 30;
    Z.add(cy(x, 0.04, z, 1 + r() * 1.6, 0.05, 'water', '#6aa9c9', { n: 12, solid: false }));
  }
  Z.n(<FallingFish ground={Z.h} />);
  Z.veg('tree', 40, (x, z) => (Math.abs(x) > 30 && !inR(x, z, -48, -20, -24, 32)) || z > 50 || z < -36, { sep: 5.5 });
  Z.veg('bush', 20, (x, z) => Math.abs(x) > 27 && Math.abs(x) < 47 && !inR(x, z, -48, -20, -24, 32), { sep: 3 });
  Z.veg('reed', 30, (x, z) => inR(x, z, -47, -23, -22, 30), { sep: 2.5 });
  Z.add(
    place(mont(90, 55, '#35743f'), -180, 0, -100),
    place(mont(100, 65, '#2f6b3a'), 170, 0, -140),
    place(mont(90, 50, '#35743f'), 20, 0, -230),
  );
  Z.trail(
    [
      [0, 36],
      [0, 15],
      [5, 6],
      [4.5, -9],
      [0, -16.5],
    ],
    7,
  )
    .coin(-28, 0, 0)
    .coin(-34, 0, 10)
    .coin(-30, 0, -12)
    .coin(-8.95, 2, -10.4)
    .coin(11, 0, 12);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -34, maxZ: 50 },
    sky: { weather: 'lluvia' },
    npc: {
      pos: [4.6, 0, 4],
      name: 'Doña Rosa',
      look: {
        hair: 'pelo_coleta',
        shirt: 'blusa_tipica',
        shirtColor: '#f9c74f',
        pants: 'falda_tipica',
        skin: '#a56b43',
        face: 'cara_feliz',
      },
      icon: '🐟',
    },
    gem: [-12, 3.4, -10],
    gemColor: '#c9d6df',
  });
}
