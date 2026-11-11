import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, inR, type Pc, PI, place, ss } from '../lib';
import { casa, champa, fence, mesa, mont, puesto, slab, vaca } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

const STEEL = '#c7ccd4';
/** Choluteca: el puente colgante sobre el río; se cruza a pie. El recuerdo espera en un islote del río. */
export function puente(d: Department): ZoneSpec {
  const zc = (x: number) => -6 + 3 * Math.sin(x * 0.06),
    dr = (x: number, z: number) => Math.abs(z - zc(x));
  const Z = new ZB(
      d,
      (x, z) =>
        -2.8 * ss(10, 5, dr(x, z)) +
        1.4 * ss(6.5, 3.5, Math.abs(x)) * (z > -6 ? ss(24, 10, z) : ss(-38, -22, z)) * ss(9, 11, dr(x, z)),
    ),
    B = Z.bio;
  Z.layer('grass', B.grass)
    .layer('sand', B.sand, (x, z) => (12.5 - dr(x, z) + Math.sin(x * 0.3)) / 2)
    .layer('asphalt', '#6a6660', (x, z) => Math.min(2.6 - Math.abs(x), dr(x, z) - 13.5) * 2);
  Z.sea(-0.7);
  Z.stop(0, 42);
  // puente: torres, tablero, cables y tirantes
  const seg = (x: number, z0: number, y0: number, z1: number, y1: number): Pc => {
    const dz = z1 - z0,
      dy = y1 - y0;
    return bx(x, (y0 + y1) / 2, (z0 + z1) / 2, 0.16, 0.16, Math.hypot(dz, dy) + 0.1, 'metal', STEEL, {
      e: [Math.atan2(-dy, dz), 0, 0],
    });
  };
  const span: [number, number][] = Array.from({ length: 9 }, (_, i) => {
    const z = 4 - i * 2.5;
    return [z, 3.4 + 8.1 * ((z + 6) / 10) ** 2];
  });
  const cable: [number, number][] = [[14, 1.6], ...span, [-26, 1.6]];
  for (const x of [-3.1, 3.1]) {
    for (let i = 0; i < cable.length - 1; i++)
      Z.add(seg(x, cable[i][0], cable[i][1], cable[i + 1][0], cable[i + 1][1]));
    for (const [z, y] of span.slice(1, -1))
      Z.add(cy(x * 0.8, (1.4 + y) / 2, z, 0.035, y - 1.4, 'metal', STEEL, { n: 4, solid: false }));
    for (const tz of [4, -16])
      Z.add(bx(x, 4.6, tz, 0.8, 14.2, 0.8, 'metal', STEEL), bx(x, -1.2, tz, 1.7, 3.2, 1.7, 'concrete', '#b9b4a8'));
    for (const az of [14, -26]) Z.add(bx(x, Z.h(x, az) + 0.4, az, 1.4, 1.6, 2.2, 'concrete', '#b9b4a8'));
    Z.add(
      bx(x * 0.8, 1.05, -6, 0.3, 0.6, 28.4, 'metal', STEEL, { solid: false }),
      bx(x * 0.78, 1.95, -6, 0.12, 1.1, 28.4, 'metal', STEEL),
    );
  }
  for (const tz of [4, -16])
    Z.add(
      bx(0, 11.4, tz, 7, 0.7, 0.7, 'metal', STEEL),
      bx(0, 7.6, tz, 6.2, 0.5, 0.5, 'metal', STEEL, { solid: false }),
    );
  Z.add(bx(0, 1.25, -6, 5, 0.3, 28.4, 'asphalt', '#5a5f66'));
  Z.plaque('Puente de Choluteca', 0, 11.4, 4.37, 0, 0.6, '#0d47a1').label('Río Choluteca', 24, 2.6, -5, 0.8);
  // piedras para saltar hasta el islote del marañón
  Z.add(
    slab(-14, 0.15, -0.6, 1.1, B.rock),
    slab(-15.2, 0.15, -4.2, 1.1, B.rock),
    slab(-13.6, 0.15, -7.8, 1.1, B.rock),
    slab(-14.6, 0.3, -12.2, 2.9, '#a89878', 4),
  );
  for (const [x, y, z] of [
    [-16.2, 2.5, -13.4],
    [-15.2, 2.9, -12.6],
    [-16, 3.1, -12.2],
    [-15.5, 2.4, -13.9],
  ])
    Z.add(bl(x, y, z, 0.16, 'plastic', '#e63946', { n: 6 }));
  Z.n(<P.Tree pos={[-15.8, 0.3, -13]} scale={0.8} color="#6f9a3a" seed={5} />).n(
    <P.Sign pos={Z.at(-10.5, 4.6)} rot={0.5} text="Islote del marañón" />,
  );
  // el pueblo (sur) y el mirador (norte)
  Z.n(<P.House pos={Z.at(-13, 24)} rot={PI / 2} color="#f2c4a4" sign="Rosquillas" />)
    .n(<P.House pos={Z.at(13, 21)} rot={-PI / 2} color="#f7f1e3" />)
    .n(<P.Stall pos={Z.at(8.5, 31)} rot={-PI / 2} sign="Marañón" color="#e85d04" />);
  Z.put(casa(6, 5, 3, '#ffe0a8'), -15, 35, PI / 2)
    .put(casa(7, 5, 3, '#f4b393'), 16, 34, -PI / 2)
    .put(puesto('#ffd166', ['#e63946', '#ffb703', '#8a5a34']), -7.5, 17, PI / 2);
  Z.put(champa(5, 4), 10, -32)
    .put(mesa(), 10, -32)
    .n(<P.Flag pos={Z.at(-7, -29)} />)
    .n(<P.Bench pos={Z.at(4.5, -27)} rot={PI} />);
  Z.put(fence(18), 26, -27)
    .put(fence(14), 35, -34, PI / 2)
    .put(fence(14), 17, -34, PI / 2)
    .put(vaca(), 22, -33, 0.6)
    .put(vaca('#8a5a34', '#f2efe6'), 28, -36, -1.2)
    .put(vaca('#f2efe6', '#1d1d1f'), 31, -31, 2.4);
  for (const [x, z] of [
    [-8, 30],
    [9, 12],
    [-22, -28],
  ])
    Z.n(<P.Tree pos={Z.at(x, z)} color="#8a9a3a" seed={x} />);
  for (const [x, z] of [
    [18, 10],
    [-24, 12],
    [-10, -25],
  ])
    Z.n(<P.Rock pos={Z.at(x, z)} seed={z} />);
  const open = (x: number, z: number) =>
    Math.abs(x) > 5.5 &&
    dr(x, z) > 13 &&
    !inR(x, z, -20, 21, 14, 48) &&
    !inR(x, z, 14, 38, -42, -25) &&
    Math.hypot(x - 10, z + 32) > 5;
  Z.veg('dry', 46, open, { sep: 6 });
  Z.veg('bush', 34, open, { sep: 3.5, colors: ['#a3a34a', '#8a9a3a', '#b7a24a'] });
  Z.veg('rock', 16, (x, z) => open(x, z) || (dr(x, z) > 9 && dr(x, z) < 12 && Math.abs(x) > 6), {
    sep: 4,
    colors: [B.rock],
  });
  Z.add(
    place(mont(70, 40, '#a8964a'), -150, 0, -110),
    place(mont(80, 48, '#9a8a48'), 130, 0, -150),
    place(mont(90, 36, '#b0a058'), 0, 0, -230),
    place(mont(70, 38, '#a8964a'), 170, 0, 90),
  );
  Z.trail(
    [
      [0, 36],
      [0, 11],
    ],
    4,
  );
  for (const zz of [4, -1, -6, -11, -16]) Z.coin(0, 1.4, zz);
  Z.trail(
    [
      [0, -24],
      [7, -30],
    ],
    2,
  ).coin(-15.2, 0.15, -4.2);
  return Z.done({
    limit: { minX: -50, maxX: 50, minZ: -46, maxZ: 50 },
    bad: (_x, y) => y < -1.35,
    badMsg: 'El río está muy hondo: cruzá por el puente',
    npc: {
      pos: Z.at(7.5, 16),
      name: 'Don Chepe',
      look: {
        hat: 'sombrero_vaquero',
        hatColor: '#c9a56b',
        shirt: 'guayabera',
        shirtColor: '#ffffff',
        face: 'cara_bigote',
        skin: '#a56b43',
      },
      icon: '🌉',
    },
    gem: [-13.4, 0.3, -11.4],
    gemColor: '#e9a23b',
  });
}
