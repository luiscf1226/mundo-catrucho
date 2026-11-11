import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, dist, distToPath, inR, PI, place, ss } from '../lib';
import { cannon, casa, garita, iglesia, mont, stairs } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

/** Lempira: el Fuerte San Cristóbal en su cerro sobre Gracias: muros blancos, garitas, cañones y bandera. */
export function fuerte(d: Department): ZoneSpec {
  const Z = new ZB(d, (x, z) => 8 * ss(43, 17, dist(x, z, 0, -20))),
    B = Z.bio,
    W = '#f2efe6',
    Y = 8,
    way: [number, number][] = [
      [0, 52],
      [0, -9],
    ];
  Z.layer('grass', B.grass)
    .layer('cobble', '#a59d92', (x, z) => (1.9 - distToPath(x, z, way)) * 2)
    .layer('dirt', '#c2a878', (x, z) => Math.min(12.4 - Math.abs(x), 10.4 - Math.abs(z + 20)) * 1.5);
  Z.stop(0, 42);
  Z.add(
    bx(0, Y + 1.3, -31, 27.2, 2.6, 1.2, 'stucco', W),
    bx(-7.65, Y + 1.3, -9, 11.9, 2.6, 1.2, 'stucco', W),
    bx(7.65, Y + 1.3, -9, 11.9, 2.6, 1.2, 'stucco', W),
    bx(0, Y + 2.9, -9, 5.4, 1.2, 1.4, 'stucco', W),
    bx(0, Y + 3.9, -9, 2.2, 0.9, 1, 'stucco', W, { solid: false }),
    bl(0, Y + 3.85, -8.5, 0.22, 'gold', '#d9a520', { n: 7 }),
    bx(-13, Y + 1.3, -20, 1.2, 2.6, 20.8, 'stucco', W),
    bx(13, Y + 1.3, -20, 1.2, 2.6, 20.8, 'stucco', W),
    ...[-1, 1].flatMap((s) => [
      bx(s * 13, Y + 1.3, -31, 3.6, 2.6, 3.6, 'stucco', W),
      bx(s * 13, Y + 1.3, -9, 3.2, 2.6, 3.2, 'stucco', W),
      ...place(garita(W), s * 13, Y + 2.6, -9),
    ]),
    ...place(garita(W), -13, Y + 2.6, -31),
    bx(0, Y + 0.3, -31.65, 30, 0.6, 0.12, 'stucco', '#dda15e', { solid: false }),
    bx(0, Y + 0.3, -8.35, 30, 0.6, 0.12, 'stucco', '#dda15e', { solid: false }),
    bx(-13.65, Y + 0.3, -20, 0.12, 0.6, 24, 'stucco', '#dda15e', { solid: false }),
    bx(13.65, Y + 0.3, -20, 0.12, 0.6, 24, 'stucco', '#dda15e', { solid: false }),
    bx(0, Y + 0.7, -29.6, 24.8, 1.4, 1.6, 'stone', '#cfc8b8'),
    place(stairs(2, 4, 0.35, 0.5, 'stone', '#cfc8b8'), -8, Y, -26.8),
    place(cannon(), -5, Y, -6.2),
    place(cannon(), 5, Y, -6.2),
    place(cannon(), -6, Y + 1.4, -29.7, PI),
    place(cannon(), 6, Y + 1.4, -29.7, PI),
    bx(7, Y + 0.6, -24.6, 2.8, 1.2, 1.6, 'stone', '#e9e4d8'),
    bx(7, Y + 1.27, -24.6, 3.1, 0.14, 1.9, 'stone', '#cfc8b8', { solid: false }),
    bx(7, Y + 1.9, -24.6, 0.16, 1.1, 0.16, 'stone', '#3a3a3a', { solid: false }),
    bx(7, Y + 2.1, -24.6, 0.6, 0.16, 0.16, 'stone', '#3a3a3a', { solid: false }),
    cy(-7, Y + 0.45, -15, 0.95, 0.9, 'stone', '#cfc8b8', { n: 10 }),
    cy(-7, Y + 0.86, -15, 0.75, 0.1, 'water', '#3aa6d8', { n: 10, solid: false }),
  );
  Z.put(casa(6, 3.6, 2.4, W, '#b5523b', '#dda15e'), 9.4, -15.5, -PI / 2);
  Z.plaque('Fuerte San Cristóbal', 0, Y + 2.95, -8.27, 0, 0.45, '#7a4a2b')
    .plaque('Mausoleo de Juan Lindo', 7, Y + 0.7, -23.77, 0, 0.22)
    .n(<P.Flag pos={[0, Y, -20]} height={9} />);
  // Gracias, al pie del cerro
  Z.n(<P.House pos={[13, 0, 31]} rot={-PI / 2} color="#f7f1e3" />)
    .n(<P.House pos={[-14, 0, 34]} rot={PI / 2} color="#dda15e" />)
    .n(<P.Statue pos={[-9, 0, 23.5]} color="#8a6a3a" />)
    .n(<P.Bench pos={[-12.5, 0, 26]} rot={PI / 2} />)
    .n(<P.Lamp pos={[3.4, 0, 28]} />)
    .n(<P.Lamp pos={[-3.4, Z.h(-3.4, 14), 14]} />)
    .n(<P.Flowers pos={[-7, 0, 25.6]} />);
  Z.plaque('Cacique Lempira', -9, 0.9, 24.23, 0, 0.26)
    .put(casa(6, 5, 3, '#f7f1e3'), 15, 44, -PI / 2)
    .put(casa(6, 5, 3, '#ffe0a8'), -24, 26, PI / 2)
    .put(casa(7, 5, 3, '#f7f1e3'), 24, 36, -PI / 2)
    .put(iglesia(7, 5, 10), 31, 22, -PI / 2);
  const hill = (x: number, z: number) => dist(x, z, 0, -20);
  Z.veg('pine', 50, (x, z) => hill(x, z) > 20 && distToPath(x, z, way) > 4 && !inR(x, z, -30, 38, 16, 50), { sep: 5 });
  Z.veg('tree', 18, (x, z) => hill(x, z) > 30 && distToPath(x, z, way) > 5 && !inR(x, z, -30, 38, 16, 50), {
    sep: 5.5,
  });
  Z.veg('bush', 22, (x, z) => hill(x, z) > 19 && hill(x, z) < 46 && distToPath(x, z, way) > 3, { sep: 3 });
  Z.veg('rock', 14, (x, z) => hill(x, z) > 18.5 && hill(x, z) < 34 && distToPath(x, z, way) > 3, {
    sep: 4,
    colors: [B.rock],
  });
  Z.add(
    place(mont(120, 110, '#2f6b4a'), -150, 0, -230),
    place(mont(90, 70, '#3a7a55'), 120, 0, -210),
    place(mont(80, 55, '#3a7a55'), -230, 0, -20),
  );
  Z.trail(
    [
      [0, 36],
      [0, -7],
    ],
    7,
  )
    .coin(0, Y, -14)
    .coin(-4, Y, -22)
    .coin(2, Y + 1.4, -29.6)
    .coin(9, Y + 1.4, -29.6)
    .coin(9.5, Y + 2.6, -31);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -44, maxZ: 50 },
    npc: {
      pos: [-5.4, 0, 25],
      name: 'Don Macario',
      look: {
        hat: 'sombrero_junco',
        shirt: 'camisa_manta',
        shirtColor: '#f2e6cf',
        pants: 'pantalon_manta',
        pantsColor: '#f2e6cf',
        acc: 'banda_bandera',
        skin: '#a56b43',
      },
      icon: '🏹',
    },
    gem: [13, Y + 2.6, -31],
    gemColor: '#dda15e',
  });
}
