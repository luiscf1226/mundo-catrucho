import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { CaveCam, Darkness } from '../fx';
import { bl, bx, cliff, cy, distToPath, inR, PI, place, ss } from '../lib';
import { bunting, casa, fence, hat, iglesia, mont } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

/** El Paraíso: Yuscarán, pueblo minero de casas blancas, con su bocamina y una milpa donde se esconde la mazorca dorada. */
export function pueblo(d: Department): ZoneSpec {
  const mine: [number, number][] = [
      [14, -10],
      [14, -32],
    ],
    cheb = (x: number, z: number) => Math.max(Math.abs(x - 14), Math.abs(z + 36));
  const Z = new ZB(
      d,
      (x, z) =>
        cliff(x, z, -14, 14, 14, 9)[0] * Math.min(ss(4.2, 6.4, distToPath(x, z, mine)), ss(6.2, 8.4, cheb(x, z))),
    ),
    B = Z.bio,
    R = '#9a958a',
    WH = '#fbfaf5',
    r = Z.rand;
  Z.layer('grass', B.grass)
    .layer('stone', R, (x, z) => {
      const zz = cliff(x, z, -14, 14, 14, 9)[1];
      return Math.min(-13.2 - zz, zz + 22.5) * 1.2;
    })
    .layer(
      'cobble',
      '#a39c90',
      (x, z) =>
        Math.max(Math.min(2.6 - Math.abs(x), z + 10, 52 - z), Math.min(2.6 - Math.abs(z + 8), x + 16, 15.5 - x)) * 2,
    )
    .layer('dirt', '#8a6a48', (x, z) =>
      Math.max(
        Math.min(x - 18, 46 - x, z - 6, 36 - z) / 1.5,
        Math.min(2.6 - Math.abs(x - 14), -5.5 - z, z + 14) * 2,
        Math.min(4.6 - Math.abs(x - 14), -13 - z),
        6.6 - cheb(x, z),
      ),
    );
  Z.stop(0, 42);
  // bocamina: túnel con marcos de madera, rieles y galería con vetas
  Z.add(
    bx(10.6, 2.2, -23.25, 2.4, 4.4, 17.5, 'stone', R),
    bx(17.4, 2.2, -23.25, 2.4, 4.4, 17.5, 'stone', R),
    bx(14, 2.5, -41.2, 12.8, 5, 2.4, 'stone', R),
    bx(8.8, 2.5, -36, 2.4, 5, 8, 'stone', R),
    bx(19.2, 2.5, -36, 2.4, 5, 8, 'stone', R),
    bx(14, 4.2, -23.5, 9.2, 0.8, 18, 'stone', '#7f7a70'),
    bx(14, 5.4, -36.4, 12.8, 0.8, 10.4, 'stone', '#7f7a70'),
    bx(14, 9.4, -18.4, 9.2, 9.6, 5, 'stone', R),
    bx(14, 5.8, -15, 9.2, 2.4, 1.9, 'stone', '#a8a398'),
    bx(14, 14.05, -26.5, 13.2, 0.3, 12, 'grass', B.grass, { solid: false }),
    bx(14, 14.05, -37, 17, 0.3, 13.5, 'grass', B.grass, { solid: false }),
    ...[-15, -18, -21, -24, -27, -30].flatMap((z) => [
      bx(12.05, 1.9, z, 0.3, 3.8, 0.3, 'wood', '#6b4a2a', { solid: false }),
      bx(15.95, 1.9, z, 0.3, 3.8, 0.3, 'wood', '#6b4a2a', { solid: false }),
      bx(14, 3.64, z, 4.3, 0.3, 0.3, 'wood', '#6b4a2a', { solid: false }),
    ]),
    bx(13.5, 0.05, -17, 0.1, 0.1, 35, 'metal', '#5a5f66', { solid: false }),
    bx(14.5, 0.05, -17, 0.1, 0.1, 35, 'metal', '#5a5f66', { solid: false }),
    ...Array.from({ length: 24 }, (_, i) =>
      bx(14, 0.02, 0 - i * 1.5, 1.5, 0.05, 0.25, 'wood', '#5a3d26', { solid: false }),
    ),
    bx(14, 0.72, -3, 1.3, 0.85, 1.9, 'metal', '#6b6f75'),
    ...[-0.7, 0.7].flatMap((z) =>
      [-0.55, 0.55].map((x) => cy(14 + x, 0.25, -3 + z, 0.25, 0.1, 'metal', '#2b2b2b', { e: [0, 0, PI / 2], n: 8 })),
    ),
    bl(13.8, 1.2, -3.2, 0.35, 'gold', '#c9a23b', { n: 6 }),
    bl(14.3, 1.25, -2.7, 0.3, 'stone', '#8a8f96', { n: 6 }),
    ...[
      [10.05, 1.5, -34.5],
      [10.05, 2.4, -37.5],
      [17.95, 1.2, -35],
      [17.95, 2.8, -38],
      [12, 2, -39.95],
      [16, 1.3, -39.95],
      [14.6, 3, -39.95],
    ].map(([x, y, z]) => bx(x, y, z, 0.5, 0.35, 0.5, 'gold', '#e0b030', { r: 0.6, solid: false })),
    bx(11.6, 0.4, -38.4, 1.2, 0.8, 1.2, 'wood', '#8a5a34'),
    bx(16.6, 0.5, -38.8, 1, 1, 1, 'wood', '#8a5a34'),
  );
  Z.n(<Darkness pos={[14, 6.65, -32]} size={[14, 14.3, 22]} />)
    .n(<CaveCam inside={(x, z) => z < -15.6 && x > 7 && x < 21} />)
    .n(<P.Lamp pos={[15.7, 0, -22.5]} />)
    .n(<P.Lamp pos={[11.2, 0, -33]} />);
  Z.plaque('Mina de Yuscarán', 14, 5.8, -14.03, 0, 0.6);
  // calle real empedrada con casas blancas, iglesia y pancarta del maíz
  Z.n(<P.House pos={[10.5, 0, 30]} rot={-PI / 2} color={WH} />)
    .n(<P.House pos={[-10.5, 0, 26]} rot={PI / 2} color={WH} sign="Pulpería" />)
    .n(<P.House pos={[-10.5, 0, 6]} rot={PI / 2} color={WH} floors={2} />)
    .n(<P.House pos={[10.5, 0, 5]} rot={-PI / 2} color={WH} />);
  Z.put(casa(6, 5, 3, WH), 10.5, 18, -PI / 2)
    .put(casa(6, 5, 3, WH), -10.5, 16, PI / 2)
    .put(casa(7, 5, 3, WH), -22, 31, 0)
    .put(casa(6, 5, 3, WH), -23, 18, PI / 2)
    .put(casa(6, 5, 3, WH), -11, 36.5, PI / 2);
  Z.put(iglesia(7, 5, 10), -22, -1, PI / 2).n(<P.Fountain pos={[-9, 0, -1.5]} />);
  for (const [x, z] of [
    [3.5, 34],
    [-3.5, 21],
    [3.5, 10],
    [-3.5, -4],
  ])
    Z.n(<P.Lamp pos={[x, 0, z]} />);
  Z.add(
    bx(-4.2, 2.5, 12, 0.2, 5, 0.2, 'wood', '#5a3d26'),
    bx(4.2, 2.5, 12, 0.2, 5, 0.2, 'wood', '#5a3d26'),
    bx(0, 4.4, 12, 8.4, 1, 0.08, 'cloth', '#ffe066', { solid: false }),
    place(bunting(8.4, 3.75, ['#ffe066', '#2ea44f', '#ffffff']), -4.2, 0, 12),
  );
  Z.plaque('Festival del Maíz', 0, 4.4, 12.06, 0, 0.5, '#2e7d32');
  // milpa con espantapájaros
  for (let x = 19.6; x < 45.5; x += 1.7)
    for (let z = 7.6; z < 35; z += 2.1) {
      if (Math.hypot(x - 32.6, z - 22) < 2.6 || (Math.abs(z - 22) < 1.3 && x < 32)) continue;
      const px = x + (r() - 0.5) * 0.5,
        pz = z + (r() - 0.5) * 0.5,
        a = r() * 3,
        hh = 1.7 + r() * 0.6;
      Z.add(
        bx(px, hh / 2, pz, 0.1, hh, 0.1, 'leaf', '#5f9a3a', { solid: false }),
        bx(px, hh * 0.6, pz, 1, 0.04, 0.22, 'leaf', '#6aa842', { e: [0, a, 0.5], solid: false }),
        bx(px, hh * 0.8, pz, 0.9, 0.04, 0.2, 'leaf', '#6aa842', { e: [0, a + 2, -0.5], solid: false }),
        bx(px + 0.1, hh * 0.55, pz, 0.13, 0.36, 0.13, 'plastic', '#ffe066', { solid: false }),
      );
    }
  Z.add(
    bx(31.6, 1.2, 22, 0.14, 2.4, 0.14, 'wood', '#5a3d26'),
    bx(31.6, 1.7, 22, 1.8, 0.12, 0.12, 'wood', '#5a3d26', { solid: false }),
    bx(31.6, 1.45, 22, 0.8, 0.8, 0.3, 'cloth', '#c0392b', { solid: false }),
    bl(31.6, 2.25, 22, 0.28, 'cloth', '#e8d28a', { n: 7 }),
    ...hat(31.6, 2.46, 22, 0.9),
  );
  Z.put(fence(28), 32, 6)
    .put(fence(28), 32, 36)
    .put(fence(30), 46, 21, PI / 2)
    .put(fence(13), 18, 13, PI / 2)
    .put(fence(11.5), 18, 30, PI / 2)
    .n(<P.Sign pos={[16.6, 0, 25.5]} rot={-PI / 2} text="Milpa de maíz" />);
  const town = (x: number, z: number) =>
    inR(x, z, -30, 16, -24, 48) || inR(x, z, 16, 48, 4, 38) || inR(x, z, 8, 20, -14, 4);
  Z.veg('pine', 42, (x, z) => z > -11.5 && !town(x, z), { sep: 5 });
  Z.veg('tree', 16, (x, z) => z > -11.5 && !town(x, z), { sep: 5 });
  Z.veg('bush', 22, (x, z) => z > -11.5 && !town(x, z) && Math.abs(x) < 48, { sep: 3 });
  Z.veg('pine', 40, (x, z) => z < -21.5 && Math.abs(x) < 47 && !inR(x, z, 6, 23, -46, -19), { sep: 4.5 });
  Z.veg('rock', 12, (x, z) => z < -8.5 && z > -12.5 && (x < -12 || x > 20), {
    sep: 3,
    colors: [R],
    smin: 1,
    smax: 1.9,
  });
  Z.add(
    place(mont(90, 70, '#3a6f4a'), -170, 0, -120),
    place(mont(100, 85, '#2f6442'), 120, 0, -190),
    place(mont(80, 55, '#3a6f4a'), 200, 0, 20),
  );
  Z.trail(
    [
      [0, 36],
      [0, -6],
    ],
    6,
  )
    .trail(
      [
        [4, -8],
        [13, -9],
      ],
      2,
    )
    .coin(14, 0, -20)
    .coin(14, 0, -28)
    .coin(14, 0, -36.5)
    .coin(25, 0, 22);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -41, maxZ: 50 },
    bad: (_x, y) => y > 2.6,
    badMsg: 'El cerro es muy empinado',
    badIcon: '⛰',
    npc: {
      pos: [10.4, 0, -11],
      name: 'Don Lencho',
      look: {
        hat: 'casco_explorador',
        hatColor: '#ffc93c',
        face: 'cara_bigote',
        shirt: 'camisa_cuadros',
        shirtColor: '#8d6e63',
        pants: 'jeans',
        skin: '#a56b43',
      },
      icon: '⛏',
    },
    gem: [33.8, 0, 22],
    gemColor: '#ffd23f',
  });
}
