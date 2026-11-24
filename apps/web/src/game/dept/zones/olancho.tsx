import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { CaveCam, Darkness } from '../fx';
import { bl, bx, cliff, cy, distToPath, inR, PI, place, ss } from '../lib';
import { casa, fence, mont, vaca } from '../parts';
import { ZB, type ZoneSpec } from '../zone';
import { OlanchoDescubrimientos } from './OlanchoDescubrimientos';

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
  Z.n(<OlanchoDescubrimientos altura={Z.h} />);
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
