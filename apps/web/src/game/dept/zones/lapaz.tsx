import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, inR, PI, place, py, ss } from '../lib';
import { basket, mont, stairs } from '../parts';
import { ZB, type ZoneSpec } from '../zone';
import { cercaDeLocura, LaPazDescubrimientos } from './LaPazDescubrimientos';

/** La Paz: finca de café en la ladera de Marcala: surcos de cafetos, patio de secado, beneficio y mirador arriba. */
export function cafetal(d: Department): ZoneSpec {
  const Z = new ZB(d, (_x, z) => 13 * ss(-4, -46, z)),
    B = Z.bio,
    r = Z.rand;
  Z.layer('grass', B.grass).layer('dirt', '#8a6a48', (x, z) =>
    Math.max(Math.min(1.6 - Math.abs(x), 30 - z) * 2, Math.min(27 - Math.abs(x), z - 1, 21 - z) / 1.5),
  );
  Z.stop(0, 42);
  Z.n(<LaPazDescubrimientos />);
  // surcos de cafetos con cerezas rojas
  for (let z = -8; z > -43; z -= 3.4)
    for (let x = -44; x <= 44; x += 1.75) {
      if (Math.abs(x) < 2.5) continue;
      const px = x + (r() - 0.5) * 0.4,
        pz = z + (r() - 0.5) * 0.4,
        y = Z.h(px, pz),
        s = 0.62 + r() * 0.2;
      const c = r() < 0.5 ? '#2d6a3a' : '#357a42';
      Z.plant(
        [
          bl(px, y + s * 0.85, pz, s, 'leaf', c, { s: [1, 1, 1], n: 6 }),
          bx(px + s * 0.7, y + s, pz + s * 0.5, 0.15, 0.15, 0.15, 'plastic', '#d62828', { solid: false }),
          bx(px - s * 0.5, y + s * 1.3, pz - s * 0.7, 0.15, 0.15, 0.15, 'plastic', '#d62828', { solid: false }),
          bx(px - s * 0.3, y + s * 0.6, pz + s * 0.9, 0.15, 0.15, 0.15, 'plastic', '#e85d04', { solid: false }),
        ],
        { k: 'cafe', p: [px, y, pz], s: s * 1.25, c: '#3f8a40', seed: Math.round(px * 3 + pz * 7) },
      );
    }
  for (const [x, z] of [
    [-12, -14],
    [14, -24],
    [-22, -34],
    [24, -40],
    [34, -12],
    [-36, -22],
  ])
    Z.n(<P.Tree pos={Z.at(x, z)} seed={x} scale={1.3} />);
  Z.veg('banana', 22, (x, z) => z < -6 && z > -44 && Math.abs(x) > 4 && Math.abs(x) < 46, { sep: 7 });
  // beneficio (despulpado) y sacos
  Z.add(
    ...[-5, 0, 5].flatMap((x) =>
      [-3.3, 3.3].map((z) =>
        cy(-15 + x, 1.6 + (x + 5) * 0.06, 11 + z, 0.12, 3.2 + (x + 5) * 0.12, 'wood', '#5a3d26', { n: 6 }),
      ),
    ),
    bx(-15, 3.7, 11, 11.4, 0.12, 8.2, 'metal', '#a5523b', { e: [0, 0, 0.12] }),
    cy(-17, 1.15, 11, 0.6, 1.3, 'metal', '#3f6b4a', { e: [0, 0, PI / 2], n: 12, solid: true }),
    py(-17, 1.7, 11, 1.3, 1, 1.3, 'metal', '#3f6b4a', { e: [PI, 0, 0] }),
    bx(-17, 0.3, 11, 1.6, 0.6, 1, 'wood', '#5a3d26'),
    cy(-17, 1.15, 11.9, 0.5, 0.08, 'metal', '#2b2b2b', { e: [PI / 2, 0, 0], n: 12 }),
    bx(-12.2, 0.45, 12.5, 3.2, 0.9, 2.2, 'concrete', '#bdb7a8'),
    bx(-12.2, 0.86, 12.5, 2.8, 0.1, 1.8, 'water', '#6a8f6a', { solid: false }),
    ...[
      [0, 0.25, 0],
      [1.1, 0.25, 0.1],
      [0.5, 0.75, 0.05],
      [0.2, 0.25, 0.9],
      [1.2, 0.25, 1],
      [0.7, 0.75, 0.95],
      [0.55, 1.25, 0.5],
    ].map(([x, y, z]) => bx(-19.6 + x, y, 8.2 + z, 1, 0.5, 0.75, 'cloth', '#c9b48a')),
  );
  Z.plaque('Café de Marcala', -19, 0.85, 9.56, 0, 0.3, '#7f5539')
    .plaque('Beneficio', -15, 3.1, 15.2, 0, 0.5, '#7f5539')
    .add(bx(-15, 3.1, 15.12, 3.4, 0.7, 0.1, 'wood', '#5a3d26', { solid: false }));
  // patio de secado
  Z.add(
    bx(13, 0.06, 11, 16, 0.12, 10, 'concrete', '#cfc8b8', { solid: false }),
    ...Array.from({ length: 7 }, (_, i) =>
      bx(6.4 + i * 2.2, 0.15, 11, 1.6, 0.06, 8.6, 'dirt', i % 2 ? '#6b3f22' : '#8a5a34', { solid: false }),
    ),
    bx(21.6, 0.5, 14, 0.06, 0.06, 2.4, 'wood', '#c9a56b', { e: [0.5, 0.3, 0] }),
    bx(21.9, 0.08, 15, 0.9, 0.08, 0.08, 'wood', '#c9a56b', { r: 0.3, solid: false }),
  );
  Z.n(<P.Sign pos={[13, 0, 17.2]} text="Patio de secado" />)
    .n(<P.House pos={[25, 0, 30]} rot={-PI / 2} color="#f6e1a0" sign="Finca El Cafetal" />)
    .n(<P.Car pos={[-9, 0, 27]} rot={0.3} color="#d62828" />)
    .n(<P.Crate pos={[-10.8, 0, 14.5]} />)
    .n(<P.Fence pos={[-14, 0, 22.5]} length={18} />)
    .n(<P.Fence pos={[14, 0, 22.5]} length={18} />);
  for (const [x, z] of [
    [2.6, -3],
    [3.6, -4.2],
    [-2.8, -3.6],
    [5, 5],
  ])
    Z.add(
      basket(x, Z.h(x, z), z, 1.3),
      bl(x, Z.h(x, z) + 0.66, z, 0.36, 'plastic', '#d62828', { s: [1.1, 0.4, 1.1], n: 7 }),
    );
  // mirador en lo alto
  Z.add(
    bx(20, 15.1, -47, 4, 0.2, 4, 'wood', '#9a7448'),
    ...[-1.8, 1.8].flatMap((x) =>
      [-1.8, 1.8].map((z) => cy(20 + x, 15.4, -47 + z, 0.12, 4.8, 'wood', '#5a3d26', { n: 6 })),
    ),
    py(20, 17.7, -47, 5.2, 1.4, 5.2, 'roof', '#d9b96a'),
    place(stairs(1.6, 7, 0.3143, 0.45, 'wood', '#8a6a45'), 14.85, 13, -47, -PI / 2),
    bx(20, 16, -48.9, 4, 0.1, 0.1, 'wood', '#5a3d26'),
    bx(21.9, 16, -47, 0.1, 0.1, 4, 'wood', '#5a3d26'),
  );
  Z.n(<P.Bench pos={[0, 13, -48.4]} />)
    .label('Mirador del cafetal', 20, 19.4, -47, 0.6)
    .label('Cafetales de Marcala', 0, 7.5, -14, 0.8);
  Z.veg('pine', 34, (x, z) => (Math.abs(x) > 46 || z < -49 || z > 48) && !inR(x, z, 12, 26, -52, -44), { sep: 5 });
  Z.veg('tree', 22, (x, z) => z > 0 && (Math.abs(x) > 30 || z > 46) && !cercaDeLocura(x, z), { sep: 5.5 });
  Z.veg(
    'bush',
    18,
    (x, z) =>
      z > 23 &&
      Math.abs(x) > 5 &&
      Math.abs(x) < 46 &&
      !inR(x, z, 18, 32, 24, 36) &&
      !inR(x, z, -14, 10, 22, 48) &&
      !cercaDeLocura(x, z),
    { sep: 3 },
  );
  Z.add(
    place(mont(100, 70, '#3a6f4a'), -160, 0, -180),
    place(mont(110, 85, '#2f6442'), 150, 0, -200),
    place(mont(80, 50, '#3a6f4a'), 0, 0, -260),
  );
  Z.trail(
    [
      [0, 36],
      [0, 2],
    ],
    4,
  )
    .trail(
      [
        [0, -7],
        [0, -44],
      ],
      5,
    )
    .coin(8, 13, -47)
    .coin(16.6, 14.3, -47)
    .coin(13, 0, 19.5);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -50, maxZ: 50 },
    npc: {
      pos: [3.6, 0, 7],
      name: 'Don Rigo',
      look: {
        hat: 'sombrero_junco',
        shirt: 'camisa_cuadros',
        shirtColor: '#d62828',
        pants: 'jeans',
        face: 'cara_bigote',
        skin: '#c98f5f',
      },
      icon: '☕',
    },
    gem: [20.8, 15.2, -47],
    gemColor: '#b23a2a',
  });
}
