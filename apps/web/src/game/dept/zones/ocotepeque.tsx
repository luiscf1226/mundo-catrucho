import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, dist, distToPath, inR, PI, place, ss } from '../lib';
import { casa, flagOf, mont } from '../parts';
import { ZB, type ZoneSpec } from '../zone';

/** Ocotepeque: bosque nublado de Montecristo, árboles gigantes entre la neblina y el mojón del Trifinio en la cumbre. */
export function bosque(d: Department): ZoneSpec {
  const top = (x: number, z: number) => dist(x, z, 0, -26),
    way: [number, number][] = [
      [0, 52],
      [0, 34],
      [-10, 22],
      [8, 8],
      [-6, -8],
      [0, -20],
    ],
    side: [number, number][] = [
      [-6, -8],
      [-16, -6],
      [-25, -3.5],
    ];
  const Z = new ZB(d, (x, z) => 9 * ss(50, 8, top(x, z))),
    B = Z.bio,
    Y = 9;
  Z.layer('grass', B.grass)
    .layer('dirt', '#6b5236', (x, z) => (1.5 - Math.min(distToPath(x, z, way), distToPath(x, z, side) + 0.3)) * 2)
    .layer('dirt', '#8a7a5a', (x, z) => (6.8 - top(x, z)) / 1.5);
  Z.stop(0, 42);
  // mojón del Trifinio con las tres banderas
  const A = [0, (2 * PI) / 3, (4 * PI) / 3],
    NAMES = ['HONDURAS', 'EL SALVADOR', 'GUATEMALA'],
    COL = ['#00bce4', '#0f47af', '#4997d0'];
  Z.add(
    cy(0, Y + 0.15, -26, 2.5, 0.3, 'concrete', '#cfc9bb', { n: 3, e: [0, PI / 3, 0] }),
    cy(0, Y + 1.9, -26, 1.3, 3.2, 'concrete', '#f2efe6', { n: 3, rt: 0.4, e: [0, PI / 3, 0] }),
    bl(0, Y + 3.6, -26, 0.3, 'gold', '#d9a520', { n: 7 }),
  );
  A.forEach((a, i) => {
    const s = Math.sin(a),
      c = Math.cos(a);
    Z.plaque(NAMES[i], s * 0.7, Y + 1.35, -26 + c * 0.7, a, 0.2, COL[i]);
    Z.add(
      bx(s * 4.2, Y + 0.03, -26 + c * 4.2, 1.5, 0.06, 3.6, 'tile', COL[i], { r: a, solid: false }),
      bx(s * 4.2, Y + 0.04, -26 + c * 4.2, 0.5, 0.06, 3.6, 'tile', '#ffffff', { r: a, solid: false }),
    );
  });
  Z.n(<P.Flag pos={[2.6, Y, -20.4]} height={6} />)
    .put(flagOf(['#0f47af', '#ffffff', '#0f47af'], false, 6), 5.6, -29.4, 0)
    .put(flagOf(['#4997d0', '#ffffff', '#4997d0'], true, 6), -5.6, -29.4, 0)
    .n(<P.Sign pos={Z.at(-3.6, -19.4)} rot={0.4} text="Punto Trifinio" />)
    .n(<P.Sign pos={Z.at(-4.6, 31)} rot={0.3} text="Sendero al Trifinio" />);
  Z.label('Tres países en un cerro', 0, Y + 5, -26, 0.6);
  // tocones para trepar hasta la piña de ocote, con hongos que brillan
  const gy = Z.h(-30, -5);
  Z.add(
    cy(-27, gy - 1.3, -3, 1, 4, 'wood', '#6b4a2a', { n: 9 }),
    cy(-29.6, gy - 0.4, -5, 1, 4, 'wood', '#6b4a2a', { n: 9 }),
    cy(-32.6, gy + 0.6, -6.4, 1.45, 4, 'wood', '#5f4a30', { n: 10 }),
    cy(-32.6, gy + 2.62, -6.4, 1.2, 0.04, 'wood', '#c9a56b', { n: 10, solid: false }),
  );
  for (const [x, z] of [
    [-25.4, -1.2],
    [-26, -5.2],
    [-28.2, -1.4],
    [-30.6, -2.6],
    [-34.6, -4.4],
    [-31, -8.2],
  ]) {
    const y = Z.h(x, z);
    Z.add(
      cy(x, y + 0.2, z, 0.05, 0.4, 'plastic', '#f2efe6', { n: 5, solid: false }),
      bl(x, y + 0.42, z, 0.2, 'neon', '#7df9ff', { s: [1, 0.55, 1], n: 7 }),
    );
  }
  // cabaña del guardabosques, tronco caído
  Z.put(casa(6, 5, 2.8, '#8a5a34', '#3f5a3a', '#5a3d26'), 13.5, 34, -PI / 2).add(
    cy(12, Z.h(12, 14) + 0.7, 14, 0.8, 9, 'wood', '#5f4a30', { e: [PI / 2, 0.5, 0], n: 8 }),
  );
  for (const [x, z] of [
    [4.5, 26],
    [-5, 15],
    [12, 3],
    [-11, -3],
    [5, -13],
    [-7, -22],
  ])
    Z.n(<P.Pine pos={Z.at(x, z)} seed={x + z} scale={1.2} />);
  for (const [x, z] of [
    [3.6, 17],
    [-3, 2],
    [9, -9],
  ])
    Z.n(<P.Rock pos={Z.at(x, z)} seed={x} color="#5f7a5a" />);
  Z.n(<P.Bush pos={Z.at(-2.6, 27)} />)
    .n(<P.Bush pos={Z.at(11, 12)} />)
    .n(<P.Bench pos={Z.at(4.6, -22.4)} rot={-0.9} />);
  const ok = (x: number, z: number, m = 4.2) =>
    distToPath(x, z, way) > m &&
    distToPath(x, z, side) > m - 1 &&
    top(x, z) > 8.5 &&
    !inR(x, z, -9, 18, 29, 50) &&
    Math.hypot(x + 30, z + 5) > 6.5;
  Z.veg('giant', 26, (x, z) => ok(x, z, 5.5) && Math.abs(x) < 60 && Math.abs(z) < 60, {
    sep: 9.5,
    smin: 0.75,
    smax: 1.15,
  });
  Z.veg('pine', 70, ok, { sep: 4.2, smin: 1, smax: 1.7 });
  Z.veg('tree', 20, ok, { sep: 5 });
  Z.veg('fern', 90, (x, z) => ok(x, z, 2) && Math.abs(x) < 54 && Math.abs(z) < 54, { sep: 2 });
  Z.veg('rock', 16, (x, z) => ok(x, z, 2.5) && Math.abs(x) < 50, { sep: 4, colors: ['#5f7a5a', '#6a7a6a'] });
  Z.add(
    place(mont(110, 90, '#2a6140'), -150, 0, -180),
    place(mont(120, 100, '#24573a'), 130, 0, -200),
    place(mont(90, 70, '#2a6140'), 210, 0, 40),
  );
  Z.trail(way.slice(1), 9)
    .coin(-15.5, Z.h(-15.5, -6.2), -6.2)
    .coin(-27, gy + 0.7, -3)
    .coin(-29.6, gy + 1.6, -5);
  return Z.done({
    limit: { minX: -50, maxX: 50, minZ: -48, maxZ: 50 },
    sky: { weather: 'neblina' },
    npc: {
      pos: Z.at(4.8, 31.5),
      name: 'Nando',
      look: {
        hat: 'gorra',
        hatColor: '#386641',
        shirt: 'camisa_basica',
        shirtColor: '#a7c957',
        pants: 'pantalon_basico',
        pantsColor: '#5a4630',
        acc: 'mochila',
        accColor: '#8a5a34',
        skin: '#c98f5f',
      },
      icon: '🌲',
    },
    gem: [-32.6, gy + 2.6, -6.4],
    gemColor: '#a7c957',
  });
}
