import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, distToPath, inR, type Pc, PI, place, rng, ss } from '../lib';
import { baranda, edificio, mont } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

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
