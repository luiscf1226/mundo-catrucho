import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, inR, type Pc, PI, place, py, ss } from '../lib';
import { champa, mesa, pier } from '../parts';
import { ZB, type ZoneSpec } from '../zone';
import { IslasDescubrimientos } from './IslasDescubrimientos';

const CORAL = ['#ff6f91', '#ff9671', '#ffc75f', '#845ec2', '#f9f871', '#00c9a7', '#ff8066', '#d65db1'];
/** Islas de la Bahía: una islita de arena blanca en Roatán, con muelle, arrecife bajo que se camina y un naufragio. */
export function arrecife(d: Department): ZoneSpec {
  const R = (x: number, z: number) => Math.hypot(x * 0.82, z - 10);
  const Z = new ZB(d, (x, z) => {
      const r = R(x, z);
      return 0.9 * ss(30, 15, r) - 0.75 * ss(27, 34, r) - 2.7 * ss(57, 66, r);
    }),
    B = Z.bio;
  Z.layer('sand', B.sand).layer('grass', B.grass, (x, z) => (12.5 - R(x, z) + Math.sin(x * 0.4 + z * 0.3)) / 3);
  Z.sea(-0.3);
  Z.far = { mat: 'sand', color: B.sand, y: -3.47 };
  Z.stop(0, 30);
  Z.n(<IslasDescubrimientos altura={(x, z) => Z.h(x, z)} />);
  Z.add(place(pier(26), 0, 0, -19.5), place(champa(3.2, 3.2, '#c9a55a'), 0, 0.6, -43.4));
  Z.label('Arrecife Mesoamericano', 0, 5.4, -43.4, 0.8);
  // naufragio sobre el arrecife
  const wreck: Pc[] = [
    bx(0, 0.5, -3.6, 3, 2.3, 5, 'wood', '#5a4028', { e: [0.1, 0, 0.3], solid: true }),
    bx(0, 0.4, 3.8, 2.7, 1.9, 4.6, 'wood', '#5a4028', { e: [-0.12, 0.1, 0.3], solid: true }),
    py(0.1, 0.1, 6, 2.5, 3, 1.9, 'wood', '#5a4028', { e: [PI / 2 - 0.1, 0.1, 0.3] }),
    cy(1.1, 2.9, -3.2, 0.18, 6.4, 'wood', '#4a3420', { e: [0.2, 0, -0.5], n: 6 }),
    bx(2.2, 4.5, -2.8, 0.14, 0.14, 3.6, 'wood', '#4a3420', { e: [0.2, 0, -0.5] }),
    bx(2.4, 3.4, -2.6, 0.06, 2, 2.6, 'cloth', '#d9d0b8', { e: [0.2, 0, -0.5] }),
    ...[-0.6, 0.1, 0.8].map((z) => bx(0, 0.7, z, 2.7, 1.7, 0.16, 'wood', '#4a3420', { e: [0, 0, 0.3] })),
    bx(-1.6, 0.3, 0.2, 0.9, 0.6, 0.6, 'wood', '#7a4a1c'),
    bx(-1.6, 0.63, 0.2, 0.94, 0.1, 0.64, 'gold', '#e0b030', { solid: false }),
    cy(-0.9, 0.04, 0.8, 0.13, 0.05, 'gold', '#ffc93c', { n: 8, solid: false }),
    cy(-1.2, 0.04, -0.6, 0.13, 0.05, 'gold', '#ffc93c', { n: 8, solid: false }),
  ];
  Z.add(place(wreck, -24, -0.78, -30, 0.5));
  // corales de colores sobre la plataforma del arrecife
  const r = Z.rand;
  for (let i = 0, n = 0; n < 76 && i < 4000; i++) {
    const x = (r() * 2 - 1) * 64,
      z = (r() * 2 - 1) * 60,
      rr = R(x, z);
    if (rr < 35.5 || rr > 56 || Math.abs(x) < 3.2 || Math.hypot(x + 24, z + 30) < 8) continue;
    n++;
    const c = CORAL[Math.floor(r() * CORAL.length)],
      y = Z.h(x, z),
      k = r(),
      s = 1.2 + r() * 0.8;
    if (k < 0.3) Z.add(bl(x, y + 0.3 * s, z, (0.55 + r() * 0.4) * s, 'plastic', c, { s: [1, 0.62, 1], n: 8 }));
    else if (k < 0.55)
      for (let j = 0; j < 4; j++)
        Z.add(
          cy(x + (r() - 0.5) * s, y + 0.45 * s, z + (r() - 0.5) * s, 0.15 * s, (0.7 + r() * 0.6) * s, 'plastic', c, {
            n: 6,
            rt: 1.35,
            solid: false,
          }),
        );
    else if (k < 0.8)
      Z.add(
        bx(x, y + 0.55 * s, z, 1.3 * s, 1.1 * s, 0.14, 'plastic', c, { r: r() * 3, solid: false }),
        bx(x + 0.3, y + 0.4 * s, z + 0.2, 0.9 * s, 0.8 * s, 0.14, 'plastic', c, { r: r() * 3, solid: false }),
      );
    else
      for (let j = 0; j < 4; j++)
        Z.add(cy(x, y + 0.45 * s, z, 0.09 * s, 1.1 * s, 'plastic', c, { e: [0.5, j * 1.6, 0], n: 5 }));
  }
  // playa
  for (const [x, z] of [
    [-20, 2],
    [-14, -9],
    [14, -10],
    [21, 3],
    [24, 16],
    [-24, 18],
    [-11, 29],
    [13, 25],
  ])
    Z.n(<P.Palm pos={Z.at(x, z)} seed={x * 3 + z} />);
  Z.veg(
    'palm',
    18,
    (x, z) =>
      R(x, z) > 9 &&
      R(x, z) < 26 &&
      Math.abs(x) > 3.5 &&
      !inR(x, z, -9, 9, 22, 34) &&
      Math.hypot(x + 12, z - 2) > 5 &&
      Math.hypot(x + 15, z + 11) > 6,
    { sep: 4.5 },
  );
  Z.veg('bush', 14, (x, z) => R(x, z) < 13 && Math.abs(x) > 3, { sep: 3 });
  Z.put(champa(5, 4), -12, 2, PI / 2).put(mesa(), -12, 2, PI / 2);
  Z.n(<P.House pos={Z.at(-15, -11)} rot={0.5} w={5} d={4} color="#7fe0d8" sign="Buceo Roatán" />).n(
    <P.Stall pos={Z.at(8, -13)} rot={PI} sign="Pan de coco" color="#ffd166" />,
  );
  Z.put(
    [
      cy(0, 1.2, 0, 0.1, 2.4, 'wood', '#5a3d26', { n: 6 }),
      cy(3.2, 1.2, 0, 0.1, 2.4, 'wood', '#5a3d26', { n: 6 }),
      bx(0.6, 1.25, 0, 1.2, 0.05, 0.9, 'cloth', '#ff7a3d', { e: [0, 0, -0.45] }),
      bx(1.6, 1.02, 0, 1, 0.05, 0.9, 'cloth', '#ffd166', { solid: false }),
      bx(2.6, 1.25, 0, 1.2, 0.05, 0.9, 'cloth', '#ff7a3d', { e: [0, 0, 0.45] }),
    ],
    16,
    -2,
    0.4,
  );
  for (const [x, z, s] of [
    [6.3, -13.6, 1],
    [7, -14.6, 0.8],
    [5.6, -14.7, 0.7],
  ]) {
    const y = Z.h(x, z);
    Z.add(
      cy(x, y + 0.4 * s, z, 0.32 * s, 0.8 * s, 'wood', '#8a5a34', { n: 10, rt: 1.15 }),
      cy(x, y + 0.81 * s, z, 0.37 * s, 0.04, 'cloth', '#f2e6cf', { n: 10, solid: false }),
    );
  }
  Z.n(<P.Boat pos={[10, -0.36, -31]} rot={0.5} />)
    .n(<P.Boat pos={[-9, -0.36, -27]} rot={-0.4} color="#ffd166" />)
    .n(<P.Boat pos={Z.at(21, -9, 0.1)} rot={1} color="#e63946" />);
  Z.trail(
    [
      [0, 26],
      [0, -17],
    ],
    5,
  );
  for (const zz of [-24, -31, -38]) Z.coin(0, 0.6, zz);
  for (const [x, z] of [
    [-8, -38],
    [-14, -35],
    [-19, -33],
    [14, -37],
    [22, -31],
  ])
    Z.coin(x, Z.h(x, z), z);
  const at = Z.at;
  return Z.done({
    limit: { minX: -64, maxX: 64, minZ: -52, maxZ: 60 },
    bad: (_x, y) => y < -1.35,
    badMsg: 'Ahí se acaba el arrecife: el mar está muy hondo',
    npc: {
      pos: at(3.6, -15.5),
      name: 'Kenia',
      look: {
        hair: 'pelo_trenzas',
        face: 'cara_lentes',
        shirt: 'camisa_basica',
        shirtColor: '#ffd166',
        pants: 'short_futbol',
        pantsColor: '#00a3d7',
        skin: '#7a4a2b',
      },
      icon: '🐠',
    },
    gem: [-24.4, -0.75, -29.6],
    gemColor: '#ffb3c6',
    finds: [
      {
        id: 'concha',
        name: 'Concha de caracol',
        icon: '🐚',
        color: '#ffd9c2',
        pos: at(25.8, 17.4),
        fact: 'Roatán es la isla más grande de las Islas de la Bahía.',
      },
      {
        id: 'coral',
        name: 'Coral de colores',
        icon: '🪸',
        color: '#ff6f91',
        pos: at(20, -34),
        fact: 'Roatán está sobre el Arrecife Mesoamericano, el segundo más grande del mundo.',
      },
      {
        id: 'moneda',
        name: 'Moneda pirata',
        icon: '🪙',
        color: '#ffc93c',
        pos: [-24.4, -0.75, -29.6],
        fact: 'Hace siglos, piratas ingleses usaron las bahías de Roatán como escondite.',
      },
      {
        id: 'tambor',
        name: 'Tambor garífuna',
        icon: '🪘',
        color: '#c98f5f',
        pos: at(-14.6, 4.8),
        fact: 'El pueblo garífuna llegó a Punta Gorda, Roatán, el 12 de abril de 1797.',
      },
      {
        id: 'estrella',
        name: 'Estrella de mar',
        icon: '⭐',
        color: '#ff9671',
        pos: at(2.9, -33),
        fact: 'En las aguas claras del arrecife viven tortugas, estrellas de mar y peces de colores.',
      },
    ],
  });
}
