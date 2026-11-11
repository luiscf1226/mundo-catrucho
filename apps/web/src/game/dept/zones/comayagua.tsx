import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, inR, PI, place, py } from '../lib';
import { casa, mont, stairs } from '../parts';
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
