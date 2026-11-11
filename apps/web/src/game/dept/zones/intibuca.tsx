import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cliff, cy, inR, PI, place } from '../lib';
import { baranda, basket, casa, mont, puesto, stairs } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

const LENCA = ['#7b2cbf', '#ffb703', '#e63946', '#00a3d7', '#ff5d9e', '#2ea44f'];
/** Intibucá: el mercado lenca de La Esperanza, con puestos de papas y fresas, textiles de colores y La Gruta al fondo. */
export function mercado(d: Department): ZoneSpec {
  const Z = new ZB(d, (x, z) => cliff(x, z, -25.6, 10, 0, 11)[0]),
    B = Z.bio;
  Z.layer('grass', B.grass)
    .layer(
      'cobble',
      '#a59d92',
      (x, z) => Math.max(Math.min(15 - Math.abs(x), z + 19, 33 - z), Math.min(3 - Math.abs(x), z - 30, 52 - z)) * 1.5,
    )
    .layer('stone', '#9a958a', (x, z) => {
      const zz = cliff(x, z, -25.6, 10, 0, 11)[1];
      return Math.min(-24.8 - zz, zz + 34) * 1.2;
    });
  Z.stop(0, 42);
  // dos filas de puestos
  const goods: string[][] = [
    ['#b98a55', '#c9a56b', '#a5744a'],
    ['#e63946', '#ff5d73', '#c9184a'],
    ['#ffb347', '#ff8c42'],
    ['#7fbf5a', '#a8d672', '#5a9a3a'],
    ['#b5523b', '#c96a4a'],
    ['#5a2a6a', '#7b2cbf'],
  ];
  [19, 12, -2].forEach((z, i) => {
    Z.put(puesto(LENCA[(i * 2) % 6], goods[i * 2]), -7, z, PI / 2).put(
      puesto(LENCA[(i * 2 + 3) % 6], goods[i * 2 + 1]),
      7,
      z,
      -PI / 2,
    );
  });
  Z.n(<P.Stall pos={[-7, 0, 26]} rot={PI / 2} sign="Papas" color="#7b2cbf" />)
    .n(<P.Stall pos={[7, 0, 26]} rot={-PI / 2} sign="Fresas" color="#e63946" />)
    .n(<P.Stall pos={[-7, 0, 5]} rot={PI / 2} sign="Textiles lencas" color="#ffb703" />)
    .n(<P.Stall pos={[7, 0, 5]} rot={-PI / 2} sign="Choros" color="#00a3d7" />);
  // textiles colgados sobre el pasillo
  for (const z of [22.5, 8.5, -5.5]) {
    Z.add(
      bx(-5.4, 2.2, z, 0.16, 4.4, 0.16, 'wood', '#5a3d26'),
      bx(5.4, 2.2, z, 0.16, 4.4, 0.16, 'wood', '#5a3d26'),
      bx(0, 4.15, z, 10.8, 0.05, 0.05, 'cloth', '#f2f2f2', { solid: false }),
    );
    for (let i = 0; i < 7; i++) {
      const x = -4.5 + i * 1.5,
        c = LENCA[(i + Math.abs(Math.round(z))) % 6];
      Z.add(
        bx(x, 3.35, z, 1.25, 1.55, 0.04, 'cloth', c, { solid: false }),
        bx(x, 3.6, z, 1.27, 0.22, 0.06, 'cloth', LENCA[(i + 3) % 6], { solid: false }),
        bx(x, 3.05, z, 1.27, 0.22, 0.06, 'cloth', '#ffffff', { solid: false }),
      );
    }
  }
  for (const [x, z, c] of [
    [-4.6, 22, '#b98a55'],
    [4.7, 15.5, '#e63946'],
    [-4.7, -4.5, '#b5523b'],
    [4.6, 1, '#7fbf5a'],
    [-4.5, 15, '#ffb347'],
    [4.6, 22.5, '#e63946'],
  ] as [number, number, string][])
    Z.add(basket(x, 0, z, 1.2), bl(x, 0.6, z, 0.3, 'plastic', c, { s: [1.2, 0.5, 1.2], n: 7 }));
  for (const [x, z, s] of [
    [-4.6, -7.5, 1],
    [-5.3, -8.6, 0.8],
    [-4.2, -9, 0.7],
  ])
    Z.add(
      bl(x, 0.42 * s, z, 0.42 * s, 'dirt', '#b5523b', { s: [1, 1.05, 1], n: 9 }),
      cy(x, 0.85 * s, z, 0.2 * s, 0.2 * s, 'dirt', '#b5523b', { n: 8, rt: 1.2, solid: false }),
    );
  Z.add(
    bx(-5.4, 2.4, 31, 0.22, 4.8, 0.22, 'wood', '#5a3d26'),
    bx(5.4, 2.4, 31, 0.22, 4.8, 0.22, 'wood', '#5a3d26'),
    bx(0, 4.3, 31, 10.8, 1.1, 0.1, 'cloth', '#7b2cbf', { solid: false }),
  );
  Z.plaque('Mercado Lenca de La Esperanza', 0, 4.3, 31.07, 0, 0.5, '#7b2cbf');
  // La Gruta: escalinata, terraza y capilla en la peña
  Z.add(
    place(stairs(5, 12, 0.32, 0.5, 'stone', '#b8b2a4'), 0, 0, -13),
    bx(0, 1.92, -22, 13, 3.84, 6, 'stone', '#a8a294'),
    place(baranda(3.8, '#e9e4d8', 'stone'), -4.5, 3.84, -19.25),
    place(baranda(3.8, '#e9e4d8', 'stone'), 4.5, 3.84, -19.25),
    bx(0, 6.6, -24.5, 5.6, 5.5, 1, 'stucco', '#ffffff'),
    bx(0, 5.2, -23.96, 1.8, 2.7, 0.1, 'stone', '#2b2b2b', { solid: false }),
    cy(0, 6.55, -23.96, 0.9, 0.1, 'stone', '#2b2b2b', { e: [PI / 2, 0, 0], n: 14 }),
    bx(0, 10, -24.5, 2.2, 1.4, 0.8, 'stucco', '#ffffff', { solid: false }),
    bl(0, 9.9, -24.05, 0.28, 'gold', '#d9a520', { n: 8 }),
    bx(0, 11.3, -24.5, 0.16, 1.2, 0.16, 'stone', '#3a3a3a', { solid: false }),
    bx(0, 11.5, -24.5, 0.7, 0.16, 0.16, 'stone', '#3a3a3a', { solid: false }),
    bx(-4.6, 4.3, -23.6, 1.5, 0.9, 1.5, 'stone', '#b8b2a4'),
    bl(-4.6, 5.1, -23.6, 0.7, 'leaf', '#2f6b3a', { n: 7 }),
    bx(4.6, 4.3, -23.6, 1.5, 0.9, 1.5, 'stone', '#b8b2a4'),
    bl(4.6, 5.1, -23.6, 0.7, 'leaf', '#2f6b3a', { n: 7 }),
    ...[-1.4, -1.1, 1.1, 1.4].map((x) => cy(x, 4, -23.8, 0.05, 0.32, 'neon', '#ffe9a0', { n: 5, solid: false })),
    bx(-7.4, 2.6, -24.6, 2.4, 5.2, 2, 'stone', '#9a958a'),
    bx(7.6, 2.2, -24.4, 2.6, 4.4, 2.2, 'stone', '#9a958a'),
  );
  Z.label('La Gruta', 0, 12.6, -24.5, 0.8)
    .n(<P.Flowers pos={[-2.2, 3.84, -23.4]} />)
    .n(<P.Flowers pos={[2.2, 3.84, -23.4]} color="#7b2cbf" />);
  Z.n(<P.House pos={[21, 0, 22]} rot={-PI / 2} color="#e9d8fd" />)
    .n(<P.House pos={[-21, 0, 12]} rot={PI / 2} color="#fff3c4" sign="Comedor lenca" />)
    .n(<P.House pos={[21, 0, 3]} rot={-PI / 2} color="#f7f1e3" />);
  Z.put(casa(6, 5, 3, '#ffd6e8'), -21, 28, PI / 2)
    .put(casa(6, 5, 3, '#fff3c4'), 21.5, -13, -PI / 2)
    .put(casa(7, 5, 3, '#d8f3dc'), -21.5, -6, PI / 2);
  for (const [x, z] of [
    [-12.5, 30],
    [12.5, 30],
    [-12.5, -14],
    [12.5, -14],
  ])
    Z.n(<P.Pine pos={[x, 0, z]} seed={x + z} />);
  const mk = (x: number, z: number) => inR(x, z, -27, 27, -26, 48);
  Z.veg('pine', 54, (x, z) => z > -24 && !mk(x, z), { sep: 4.5 });
  Z.veg('tree', 14, (x, z) => z > -24 && !mk(x, z), { sep: 5 });
  Z.veg('bush', 20, (x, z) => z > -24 && !mk(x, z) && Math.abs(x) < 48, { sep: 3 });
  Z.veg('pine', 40, (_x, z) => z < -32.5, { sep: 4.5 });
  Z.veg('rock', 12, (x, z) => z < -21 && z > -25 && Math.abs(x) > 10, {
    sep: 3,
    colors: ['#9a958a'],
    smin: 1,
    smax: 2,
  });
  Z.add(
    place(mont(90, 70, '#3f7a55'), -170, 0, -140),
    place(mont(110, 80, '#35704c'), 140, 0, -170),
    place(mont(80, 50, '#3f7a55'), -200, 0, 60),
  );
  Z.trail(
    [
      [0, 36],
      [0, -11],
    ],
    8,
  )
    .coin(0, 1.3, -15)
    .coin(0, 2.9, -17.5)
    .coin(3, 3.84, -21.5)
    .coin(-2.4, 3.84, -21.5);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -30, maxZ: 50 },
    bad: (_x, y) => y > 4.7,
    badMsg: 'La peña es muy empinada',
    badIcon: '⛰',
    npc: {
      pos: [-4.4, 0, 9],
      rot: PI / 2,
      name: 'Doña Tina',
      look: {
        hair: 'pelo_trenzas',
        hat: 'panuelo_lenca',
        hatColor: '#e63946',
        shirt: 'blusa_tipica',
        shirtColor: '#7b2cbf',
        pants: 'falda_tipica',
        acc: 'sin_accesorio',
        skin: '#a56b43',
        face: 'cara_feliz',
      },
      icon: '🧺',
    },
    gem: [-5.4, 3.84, -22],
    gemColor: '#ffb703',
  });
}
