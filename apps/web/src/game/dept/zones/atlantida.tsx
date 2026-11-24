import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { bl, bx, cy, inR, PI, place, ss } from '../lib';
import { baranda, bunting, casa, champa, mont, pier, puesto } from '../parts';
import { ZB, type ZoneSpec } from '../zone';
import { AtlantidaDescubrimientos } from './AtlantidaDescubrimientos';

const CARN = ['#e63946', '#ffd166', '#19b5c8', '#7b2cbf', '#2ea44f', '#ff7a3d'];
/** Atlántida: malecón de La Ceiba con su muelle, tarima de carnaval y el Pico Bonito al fondo. */
export function playa(d: Department): ZoneSpec {
  const Z = new ZB(d, (_x, z) => -2.6 * ss(-16, -40, z)),
    B = Z.bio;
  Z.layer('sand', B.sand)
    .layer('grass', B.grass, (x, z) => (z - 1.5 + Math.sin(x * 0.2) * 1.2) / 2.5)
    .layer('asphalt', '#5d6066', (x, z) => Math.min(2.8 - Math.abs(x), z - 13, 52 - z) * 2);
  Z.sea(-0.35)
    .plane('grass', B.grass, -0.06, [900, 500], [0, 0, 248])
    .plane('sand', B.sand, -0.08, [900, 20], [0, 0, -7]);
  Z.far = { mat: 'sand', color: B.sand, y: -2.62 };
  Z.stop(0, 42);
  Z.n(<AtlantidaDescubrimientos altura={(x, z) => Z.h(x, z)} />);
  // malecón
  Z.add(
    bx(0, 0.1, -11, 76, 0.2, 7, 'tile', '#eadfc8'),
    place(baranda(33), -20, 0.2, -14.3),
    place(baranda(33), 20, 0.2, -14.3),
  );
  Z.add(
    place(pier(30), 0, 0, -14.4),
    place(champa(3.2, 3.2), 0, 0.6, -42.4),
    bx(-1.9, 2, -14.2, 0.3, 3.6, 0.3, 'wood', '#5a3d26'),
    bx(1.9, 2, -14.2, 0.3, 3.6, 0.3, 'wood', '#5a3d26'),
    bx(0, 3.6, -14.2, 4.6, 0.9, 0.3, 'wood', '#19b5c8', { solid: false }),
  );
  Z.plaque('Muelle de La Ceiba', 0, 3.6, -14.03, 0, 0.5, '#0d47a1');
  'CEIBA'.split('').forEach((ch, i) => {
    const x = 9 + i * 2.2,
      c = CARN[i % CARN.length];
    Z.add(bx(x, 1.2, -8.7, 1.9, 2, 0.6, 'plastic', c));
    Z.plaque(ch, x, 1.2, -8.38, 0, 1.5, c);
  });
  // tarima de carnaval
  Z.add(
    bx(-16, 0.6, 8, 8, 1.2, 5, 'wood', '#7b2cbf'),
    bx(-16, 3.1, 5.65, 8, 3.8, 0.3, 'cloth', '#e63946'),
    bx(-19.3, 1.9, 8, 1.2, 1.4, 1.2, 'plastic', '#1d1d1f'),
    bx(-12.7, 1.9, 8, 1.2, 1.4, 1.2, 'plastic', '#1d1d1f'),
    bx(-20.4, 2.8, 10.6, 0.2, 5.6, 0.2, 'metal', '#888'),
    bx(-11.6, 2.8, 10.6, 0.2, 5.6, 0.2, 'metal', '#888'),
    place(bunting(8.8, 5.5, CARN), -20.4, 0, 10.6),
    place(bunting(26, 4.6, CARN), -13, 0.2, -8),
    cy(-19.3, 2, 8.62, 0.4, 0.06, 'plastic', '#555', { e: [PI / 2, 0, 0], n: 12 }),
    cy(-12.7, 2, 8.62, 0.4, 0.06, 'plastic', '#555', { e: [PI / 2, 0, 0], n: 12 }),
    bx(-13, 2.5, -8, 0.16, 4.6, 0.16, 'metal', '#888'),
    bx(13, 2.5, -8, 0.16, 4.6, 0.16, 'metal', '#888'),
  );
  Z.plaque('Carnaval de la Amistad', -16, 3.7, 5.82, 0, 0.62, '#7b2cbf');
  Z.n(<P.Crate pos={[-11.2, 0, 8.6]} />)
    .n(<P.Stall pos={[-8, 0.2, -10]} sign="Baleadas" />)
    .n(<P.Stall pos={[-14, 0.2, -10]} sign="Pan de coco" color="#19b5c8" />);
  Z.put(puesto('#ffd166', ['#ff7a3d', '#ffd166', '#2ea44f']), -20, -10, 0, 0.2).put(
    puesto('#ff5d9e', ['#e63946', '#f2f2f2']),
    28,
    -10,
    0,
    0.2,
  );
  for (const x of [-32, -11, 11, 32]) Z.n(<P.Lamp pos={[x, 0.2, -13.4]} />);
  for (const x of [-24, 5, 24]) Z.n(<P.Bench pos={[x, 0.2, -12.9]} rot={PI} />);
  for (const [x, z] of [
    [-35, -6.6],
    [-26, -6.6],
    [-5, -6.6],
    [5, -6.6],
    [22.5, -6.6],
    [35, -6.6],
  ])
    Z.n(<P.Palm pos={[x, 0, z]} seed={x} />);
  Z.n(<P.House pos={[-15, 0, 24]} rot={PI / 2} color="#7fd6c2" sign="Hotel El Malecón" />).n(
    <P.House pos={[15, 0, 26]} rot={-PI / 2} color="#ffd166" />,
  );
  Z.put(casa(6, 5, 3, '#ff8fab'), 15, 14, -PI / 2)
    .put(casa(6, 5, 3, '#9fd3ff'), -15, 36, PI / 2)
    .put(casa(7, 5, 3, '#ffe6a7'), 16, 37, -PI / 2)
    .put(casa(6, 5, 3, '#c8f2a0'), 27, 4, PI);
  Z.n(<P.Boat pos={[6, -0.42, -25]} rot={0.4} />)
    .n(<P.Boat pos={[-7, -0.42, -31]} rot={-0.3} color="#e63946" />)
    .n(<P.Boat pos={Z.at(-13, -17.6)} rot={1.2} color="#ffd166" />);
  Z.veg('palm', 16, (x, z) => z < -15.3 && z > -19.6 && Math.abs(x) > 4 && Math.abs(x + 13) > 3, { sep: 4.5 });
  Z.veg('palm', 16, (x, z) => Math.abs(x) > 34 && z > -6 && z < 52, { sep: 5 });
  Z.veg('tree', 34, (x, z) => (Math.abs(x) > 24 && z > 8 && Math.abs(x) < 70) || z > 50, { sep: 5 });
  Z.veg('bush', 24, (x, z) => z > 3 && Math.abs(x) > 4 && Math.abs(x) < 46 && !inR(x, z, -22, 22, 3, 46), { sep: 3 });
  // palma africana al oeste, fuera de lo jugable (hacia Tela)
  Z.plantacion(
    'oilpalm',
    { minX: -79, maxX: -52, minZ: -10, maxZ: 46 },
    { dx: 7.2, dz: 6.3, smin: 1.2, smax: 1.55, colors: ['#4a8a40', '#3f7d3b', '#55963f'], calle: 5 },
  );
  // Pico Bonito y la cordillera Nombre de Dios, al sur
  Z.add(
    place(mont(75, 105, '#2f7d4a'), 25, 0, 165),
    place(mont(55, 62, '#3a8a55'), -75, 0, 140),
    place(mont(50, 52, '#3a8a55'), 115, 0, 130),
    place(mont(60, 70, '#2f7d4a'), -150, 0, 170),
  );
  for (let i = 0; i < 7; i++)
    Z.add(
      bl(25 + Math.cos(i * 0.9) * 34, 62 + (i % 3) * 3, 150 + Math.sin(i * 0.9) * 22, 9, 'plastic', '#ffffff', {
        s: [1.6, 0.55, 1.2],
        n: 8,
      }),
    );
  Z.label('Pico Bonito ⛰', 25, 30, 96, 5);
  Z.trail(
    [
      [0, 36],
      [0, 14],
      [-6, 9],
      [-2, -3],
      [0, -9],
    ],
    7,
  );
  for (const zz of [-20, -26, -32, -38]) Z.coin(0, 0.6, zz);
  Z.coin(-16, 1.2, 8);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -46.5, maxZ: 50 },
    bad: (_x, y) => y < -1.15,
    badMsg: 'El mar está muy hondo por ahí',
    npc: {
      pos: [6, 0.2, -9.6],
      name: 'Carla',
      look: {
        hair: 'pelo_rizado',
        hat: 'corona_carnaval',
        shirt: 'blusa_tipica',
        shirtColor: '#ff5d9e',
        pants: 'falda_tipica',
        acc: 'tambor_garifuna',
        skin: '#7a4a2b',
      },
      icon: '🎭',
    },
    gem: [-19.3, 2.6, 8],
    gemColor: '#ff5d9e',
  });
}
