import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bx, cy, dist, inR, type Pc, PI, place } from '../lib';
import { basket, bunting, casa, champa, hat, mont } from '../parts';
import { ZB, type ZoneSpec } from '../zone';
import { SantaBarbaraDescubrimientos } from './SantaBarbaraDescubrimientos';

/** Santa Bárbara: calle de talleres de junco (sombreros, canastas, petates) y el sombrero gigante de la plaza. */
export function artesania(d: Department): ZoneSpec {
  const Z = new ZB(d, () => 0),
    ST = '#e8d28a',
    r = Z.rand;
  Z.layer('grass', Z.bio.grass).layer(
    'cobble',
    '#a8a094',
    (x, z) => Math.max(Math.min(3.6 - Math.abs(x), z + 14, 52 - z), 9.6 - dist(x, z, 0, -21)) * 1.5,
  );
  Z.stop(0, 42);
  Z.n(<SantaBarbaraDescubrimientos altura={Z.h} />);
  const shelf: Pc[] = [
    bx(0, 0.9, -1.5, 4.6, 0.07, 0.75, 'wood', '#8a5a34'),
    bx(0, 1.6, -1.5, 4.6, 0.07, 0.75, 'wood', '#8a5a34'),
    bx(-2.2, 0.85, -1.5, 0.1, 1.7, 0.7, 'wood', '#5a3d26', { solid: false }),
    bx(2.2, 0.85, -1.5, 0.1, 1.7, 0.7, 'wood', '#5a3d26', { solid: false }),
  ];
  const taller = (kind: number): Pc[] => [
    ...champa(5.6, 4.2, '#b5523b'),
    ...shelf,
    ...(kind === 0
      ? [0.94, 1.64]
          .flatMap((y) => [-1.6, -0.55, 0.5, 1.55].flatMap((x) => hat(x, y, -1.5, 0.95, r() < 0.3 ? '#f2e6b8' : ST)))
          .concat(hat(0, 0.86, 0.6, 1.2), bx(0, 0.4, 0.6, 1.4, 0.8, 0.8, 'wood', '#8a5a34'))
      : kind === 1
        ? [0.94, 1.64]
            .flatMap((y) => [-1.5, 0, 1.5].flatMap((x) => basket(x, y, -1.5, 0.9)))
            .concat(basket(-1, 0, 0.7, 1.5), basket(0.4, 0, 0.9, 1.1), basket(1.4, 0, 0.4, 1.3, '#b98a45'))
        : kind === 2
          ? [
              ...[-1.2, 0, 1.2].map((x) => cy(x, 1.12, -1.5, 0.2, 0.7, 'cloth', ST, { e: [PI / 2, 0, 0], n: 8 })),
              bx(0, 0.03, 0.7, 2.6, 0.05, 1.6, 'cloth', ST, { solid: false }),
              bx(0, 0.05, 0.7, 2.6, 0.05, 0.25, 'cloth', '#c0392b', { solid: false }),
              bx(0, 0.05, 0.2, 2.6, 0.05, 0.12, 'cloth', '#2e7d32', { solid: false }),
              bx(0, 0.05, 1.2, 2.6, 0.05, 0.12, 'cloth', '#2e7d32', { solid: false }),
              cy(-1.8, 0.9, 0.9, 0.22, 1.8, 'cloth', ST, { n: 8 }),
            ]
          : [
              ...Array.from({ length: 9 }, (_, i) =>
                cy(-1.6 + i * 0.4, 1.1, -1.2, 0.05, 2.3, 'leaf', i % 2 ? '#a8b858' : '#8aa648', {
                  e: [-0.25, 0, (i - 4) * 0.03],
                  n: 5,
                }),
              ),
              bx(0, 0.25, 0.6, 1.6, 0.5, 0.5, 'leaf', '#a8b858', { solid: false }),
              bx(0, 0.55, 0.6, 1.7, 0.1, 0.12, 'wood', '#5a3d26', { solid: false }),
            ]),
  ];
  [
    [-9.6, 24, 0],
    [9.6, 24, 1],
    [-9.6, 10, 2],
    [9.6, 10, 3],
    [-9.6, -4, 1],
    [9.6, -4, 0],
  ].forEach(([x, z, k]) => Z.put(taller(k), x, z, x < 0 ? PI / 2 : -PI / 2));
  Z.n(<P.Stall pos={[4.9, 0, 17]} rot={-PI / 2} sign="Sombreros" color="#e76f51" />)
    .n(<P.Stall pos={[-4.9, 0, 3]} rot={PI / 2} sign="Canastas" color="#f4e285" />)
    .n(<P.Stall pos={[4.9, 0, -9.5]} rot={-PI / 2} sign="Petates" color="#2a9d8f" />);
  Z.add(
    place(bunting(7.2, 4.2, ['#e76f51', '#f4e285', '#2a9d8f']), -3.6, 0, 30.5),
    bx(-3.7, 2.2, 30.5, 0.16, 4.4, 0.16, 'wood', '#5a3d26'),
    bx(3.7, 2.2, 30.5, 0.16, 4.4, 0.16, 'wood', '#5a3d26'),
  );
  // el sombrero de junco gigante
  Z.add(
    cy(0, 0.15, -21, 5, 0.3, 'stone', '#cfc8b8', { n: 22 }),
    cy(0, 0.45, -21, 4.6, 0.3, 'stone', '#d9d2c2', { n: 22 }),
    cy(0, 0.8, -21, 4.2, 0.4, 'cloth', ST, { n: 26 }),
    cy(0, 1.95, -21, 1.9, 1.9, 'cloth', ST, { n: 22, rt: 0.88 }),
    cy(0, 1.2, -21, 1.96, 0.4, 'cloth', '#b5523b', { n: 22, solid: false }),
    cy(0, 1.02, -21, 4.22, 0.06, 'cloth', '#c9b060', { n: 26, solid: false }),
    cy(2.6, 1.375, -19.2, 0.8, 0.75, 'wood', '#c9a55a', { n: 12, rt: 1.1 }),
    cy(2.6, 1.72, -19.2, 0.92, 0.08, 'wood', '#a5803a', { n: 12, solid: false }),
  );
  Z.n(<P.Sign pos={[7.4, 0, -13.4]} rot={-0.6} text="Sombrero de junco gigante" />).label(
    'Artesanías de junco',
    0,
    5.2,
    -21,
    0.75,
  );
  Z.n(<P.House pos={[-21, 0, -19]} rot={PI / 2} color="#e76f51" sign="Museo del junco" />)
    .n(<P.House pos={[21, 0, -21]} rot={-PI / 2} color="#f4e285" />)
    .n(<P.Bench pos={[-7.5, 0, -15]} rot={0.9} />)
    .n(<P.Lamp pos={[-3.9, 0, 32]} />)
    .n(<P.Lamp pos={[3.9, 0, 3]} />)
    .n(<P.Lamp pos={[-3.9, 0, -11]} />);
  Z.put(casa(6, 5, 3, '#f7f1e3'), 22, 8, -PI / 2)
    .put(casa(6, 5, 3, '#ffd9c2'), -22, 5, PI / 2)
    .put(casa(7, 5, 3, '#f4e285'), 22, 30, -PI / 2)
    .put(casa(6, 5, 3, '#f7f1e3'), -22, 22, PI / 2)
    .put(casa(7, 5, 3, '#f7d9c4'), 0, -36, 0);
  Z.veg('reed', 60, (x, z) => inR(x, z, 30, 47, -12, 22), { sep: 1.8 });
  Z.n(<P.Sign pos={[28.5, 0, 16]} rot={-PI / 2} text="Junco creciendo" />);
  const town = (x: number, z: number) => inR(x, z, -27, 27, -40, 48) || inR(x, z, 27, 48, -14, 24);
  Z.veg('pine', 40, (x, z) => !town(x, z), { sep: 5 });
  Z.veg('tree', 26, (x, z) => !town(x, z), { sep: 5.5 });
  Z.veg('bush', 22, (x, z) => !town(x, z) && Math.abs(x) < 48 && Math.abs(z) < 50, { sep: 3 });
  for (const [x, z] of [
    [-13, -9],
    [13, -12],
    [-14, 17],
    [14, 17],
  ])
    Z.n(<P.Tree pos={[x, 0, z]} seed={x * z} />);
  Z.add(
    place(mont(130, 115, '#2f6b4a'), 10, 0, -240),
    place(mont(90, 60, '#3a7a55'), -190, 0, -120),
    place(mont(90, 65, '#3a7a55'), 200, 0, -110),
  );
  Z.trail(
    [
      [0, 36],
      [0, -10],
    ],
    8,
  )
    .coin(-6.6, 0, -21)
    .coin(0, 0.6, -25.6)
    .coin(-3, 1, -21)
    .coin(2.6, 1.75, -19.2);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -40, maxZ: 50 },
    npc: {
      pos: [-5.2, 0, 12.5],
      rot: PI / 2,
      name: 'Doña Mencha',
      look: {
        hair: 'pelo_coleta',
        hat: 'sombrero_junco',
        shirt: 'blusa_tipica',
        shirtColor: '#e76f51',
        pants: 'falda_tipica',
        skin: '#c98f5f',
        face: 'cara_feliz',
      },
      icon: '👒',
    },
    gem: [0, 2.9, -21],
    gemColor: '#f4e285',
  });
}
