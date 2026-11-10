// Zonas de costa e islas: malecón de La Ceiba (playa), Fortaleza de Santa Bárbara (fortaleza) y Roatán (arrecife).
import { P } from '../../kit';
import type { Department } from '../../../core/types';
import { bl, bx, cy, inR, PI, place, py, ss, type Pc } from '../lib';
import { ZB, type ZoneSpec } from '../zone';
import { baranda, bunting, cannon, casa, champa, garita, merlons, mesa, mont, pier, puesto, stairs } from '../parts';

const CARN = ['#e63946', '#ffd166', '#19b5c8', '#7b2cbf', '#2ea44f', '#ff7a3d'];

/** Atlántida: malecón de La Ceiba con su muelle, tarima de carnaval y el Pico Bonito al fondo. */
export function playa(d: Department): ZoneSpec {
  const Z = new ZB(d, (_x, z) => -2.6 * ss(-16, -40, z)), B = Z.bio;
  Z.layer('sand', B.sand).layer('grass', B.grass, (x, z) => (z - 1.5 + Math.sin(x * 0.2) * 1.2) / 2.5).layer('asphalt', '#5d6066', (x, z) => Math.min(2.8 - Math.abs(x), z - 13, 52 - z) * 2);
  Z.sea(-0.35).plane('grass', B.grass, -0.06, [900, 500], [0, 0, 248]).plane('sand', B.sand, -0.08, [900, 20], [0, 0, -7]); Z.far = { mat: 'sand', color: B.sand, y: -2.62 }; Z.stop(0, 42);
  // malecón
  Z.add(bx(0, 0.1, -11, 76, 0.2, 7, 'tile', '#eadfc8'), place(baranda(33), -20, 0.2, -14.3), place(baranda(33), 20, 0.2, -14.3));
  Z.add(place(pier(30), 0, 0, -14.4), place(champa(3.2, 3.2), 0, 0.6, -42.4), bx(-1.9, 2, -14.2, 0.3, 3.6, 0.3, 'wood', '#5a3d26'), bx(1.9, 2, -14.2, 0.3, 3.6, 0.3, 'wood', '#5a3d26'), bx(0, 3.6, -14.2, 4.6, 0.9, 0.3, 'wood', '#19b5c8', { solid: false }));
  Z.plaque('Muelle de La Ceiba', 0, 3.6, -14.03, 0, 0.5, '#0d47a1');
  'CEIBA'.split('').forEach((ch, i) => { const x = 9 + i * 2.2, c = CARN[i % CARN.length]; Z.add(bx(x, 1.2, -8.7, 1.9, 2, 0.6, 'plastic', c)); Z.plaque(ch, x, 1.2, -8.38, 0, 1.5, c); });
  // tarima de carnaval
  Z.add(bx(-16, 0.6, 8, 8, 1.2, 5, 'wood', '#7b2cbf'), bx(-16, 3.1, 5.65, 8, 3.8, 0.3, 'cloth', '#e63946'), bx(-19.3, 1.9, 8, 1.2, 1.4, 1.2, 'plastic', '#1d1d1f'), bx(-12.7, 1.9, 8, 1.2, 1.4, 1.2, 'plastic', '#1d1d1f'),
    bx(-20.4, 2.8, 10.6, 0.2, 5.6, 0.2, 'metal', '#888'), bx(-11.6, 2.8, 10.6, 0.2, 5.6, 0.2, 'metal', '#888'), place(bunting(8.8, 5.5, CARN), -20.4, 0, 10.6), place(bunting(26, 4.6, CARN), -13, 0.2, -8),
    cy(-19.3, 2, 8.62, 0.4, 0.06, 'plastic', '#555', { e: [PI / 2, 0, 0], n: 12 }), cy(-12.7, 2, 8.62, 0.4, 0.06, 'plastic', '#555', { e: [PI / 2, 0, 0], n: 12 }),
    bx(-13, 2.5, -8, 0.16, 4.6, 0.16, 'metal', '#888'), bx(13, 2.5, -8, 0.16, 4.6, 0.16, 'metal', '#888'));
  Z.plaque('Carnaval de la Amistad', -16, 3.7, 5.82, 0, 0.62, '#7b2cbf');
  Z.n(<P.Crate pos={[-11.2, 0, 8.6]} />).n(<P.Stall pos={[-8, 0.2, -10]} sign="Baleadas" />).n(<P.Stall pos={[-14, 0.2, -10]} sign="Pan de coco" color="#19b5c8" />);
  Z.put(puesto('#ffd166', ['#ff7a3d', '#ffd166', '#2ea44f']), -20, -10, 0, 0.2).put(puesto('#ff5d9e', ['#e63946', '#f2f2f2']), 28, -10, 0, 0.2);
  for (const x of [-32, -11, 11, 32]) Z.n(<P.Lamp pos={[x, 0.2, -13.4]} />);
  for (const x of [-24, 5, 24]) Z.n(<P.Bench pos={[x, 0.2, -12.9]} rot={PI} />);
  for (const [x, z] of [[-35, -6.6], [-26, -6.6], [-5, -6.6], [5, -6.6], [22.5, -6.6], [35, -6.6]]) Z.n(<P.Palm pos={[x, 0, z]} seed={x} />);
  Z.n(<P.House pos={[-15, 0, 24]} rot={PI / 2} color="#7fd6c2" sign="Hotel El Malecón" />).n(<P.House pos={[15, 0, 26]} rot={-PI / 2} color="#ffd166" />);
  Z.put(casa(6, 5, 3, '#ff8fab'), 15, 14, -PI / 2).put(casa(6, 5, 3, '#9fd3ff'), -15, 36, PI / 2).put(casa(7, 5, 3, '#ffe6a7'), 16, 37, -PI / 2).put(casa(6, 5, 3, '#c8f2a0'), 27, 4, PI);
  Z.n(<P.Boat pos={[6, -0.42, -25]} rot={0.4} />).n(<P.Boat pos={[-7, -0.42, -31]} rot={-0.3} color="#e63946" />).n(<P.Boat pos={Z.at(-13, -17.6)} rot={1.2} color="#ffd166" />);
  Z.veg('palm', 16, (x, z) => z < -15.3 && z > -19.6 && Math.abs(x) > 4 && Math.abs(x + 13) > 3, { sep: 4.5 });
  Z.veg('palm', 16, (x, z) => Math.abs(x) > 34 && z > -6 && z < 52, { sep: 5 });
  Z.veg('tree', 34, (x, z) => (Math.abs(x) > 24 && z > 8 && Math.abs(x) < 70) || z > 50, { sep: 5 });
  Z.veg('bush', 24, (x, z) => z > 3 && Math.abs(x) > 4 && Math.abs(x) < 46 && !inR(x, z, -22, 22, 3, 46), { sep: 3 });
  // Pico Bonito y la cordillera Nombre de Dios, al sur
  Z.add(place(mont(75, 105, '#2f7d4a'), 25, 0, 165), place(mont(55, 62, '#3a8a55'), -75, 0, 140), place(mont(50, 52, '#3a8a55'), 115, 0, 130), place(mont(60, 70, '#2f7d4a'), -150, 0, 170));
  for (let i = 0; i < 7; i++) Z.add(bl(25 + Math.cos(i * 0.9) * 34, 62 + (i % 3) * 3, 150 + Math.sin(i * 0.9) * 22, 9, 'plastic', '#ffffff', { s: [1.6, 0.55, 1.2], n: 8 }));
  Z.label('Pico Bonito ⛰', 25, 30, 96, 5);
  Z.trail([[0, 36], [0, 14], [-6, 9], [-2, -3], [0, -9]], 7); for (const zz of [-20, -26, -32, -38]) Z.coin(0, 0.6, zz); Z.coin(-16, 1.2, 8);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -46.5, maxZ: 50 }, bad: (_x, y) => y < -1.15, badMsg: 'El mar está muy hondo por ahí',
    npc: { pos: [6, 0.2, -9.6], name: 'Carla', look: { hair: 'pelo_rizado', hat: 'corona_carnaval', shirt: 'blusa_tipica', shirtColor: '#ff5d9e', pants: 'falda_tipica', acc: 'tambor_garifuna', skin: '#7a4a2b' }, icon: '🎭' },
    gem: [-19.3, 2.6, 8], gemColor: '#ff5d9e',
  });
}

const galeon = (): Pc[] => [bx(0, 1.2, 0, 5, 3.4, 16, 'wood', '#5a4028', { solid: false }), py(0, -0.5, 10.5, 5, 3.4, 5, 'wood', '#5a4028', { e: [PI / 2, 0, 0] }), bx(0, 3.6, -6, 5, 2.4, 4, 'wood', '#6b4a2a', { solid: false }),
  ...[-4, 1, 6].flatMap((z, i) => [cy(0, 9, z, 0.22, 15, 'wood', '#3d2a1a', { n: 6, solid: false }), bx(0, 8 + (i === 1 ? 1 : 0), z + 0.3, 7, 4.4, 0.15, 'cloth', '#f4efe2', { solid: false }), bx(0, 13 + (i === 1 ? 1 : 0), z + 0.3, 5, 3, 0.15, 'cloth', '#f4efe2', { solid: false })])];

/** Colón: la Fortaleza de Santa Bárbara de Trujillo frente a la bahía, con murallas que se recorren por arriba. */
export function fortaleza(d: Department): ZoneSpec {
  const Z = new ZB(d, (_x, z) => -2.6 * ss(-29, -46, z)), B = Z.bio, C = '#a89f8c', C2 = '#b8b2a4';
  Z.layer('sand', B.sand).layer('grass', B.grass, (x, z) => (z + 27 + Math.sin(x * 0.17) * 1.5) / 2.5).layer('dirt', '#b89a6a', (x, z) => Math.min(15.4 - Math.abs(x), 11.4 - Math.abs(z + 10)) * 1.5).layer('cobble', '#9a948a', (x, z) => Math.min(2.2 - Math.abs(x), z - 1, 37 - z) * 2);
  Z.sea(-0.35).plane('grass', B.grass, -0.06, [900, 520], [0, 0, 233]).plane('sand', B.sand, -0.08, [900, 6], [0, 0, -29]); Z.far = { mat: 'sand', color: B.sand, y: -2.62 }; Z.stop(0, 42);
  // murallas (3 m de ancho, se camina por arriba)
  Z.add(bx(0, 1.6, -23, 37, 3.2, 3, 'stone', C), bx(-10.25, 1.6, 3, 16.5, 3.2, 3, 'stone', C), bx(10.25, 1.6, 3, 16.5, 3.2, 3, 'stone', C), bx(0, 2.85, 3, 4.2, 0.7, 3, 'stone', C2), bx(-17, 1.6, -10, 3, 3.2, 23, 'stone', C), bx(17, 1.6, -10, 3, 3.2, 23, 'stone', C));
  Z.add(place(merlons(37, C2), 0, 3.2, -24.25), place(merlons(15, C2), -10.6, 3.2, 4.25), place(merlons(15, C2), 10.6, 3.2, 4.25), place(merlons(23, C2), -18.25, 3.2, -10, PI / 2), place(merlons(23, C2), 18.25, 3.2, -10, PI / 2));
  Z.add(place(stairs(2.2, 10, 0.32, 0.5, 'stone', C2), -14.4, 0, -5), place(stairs(2.2, 10, 0.32, 0.5, 'stone', C2), 14.4, 0, -15, PI));
  for (const x of [-12, -6, 0, 6, 12]) Z.add(place(cannon(), x, 3.2, -22.9, PI));
  Z.add(place(cannon(), -4.6, 0, 6.6), place(cannon(), 4.6, 0, 6.6), place(garita(C2), -17, 3.2, -23), place(garita(C2), -17, 3.2, 3), place(garita(C2), 17, 3.2, 3));
  // plataforma del vigía (noreste) con el catalejo
  Z.add(bx(17, 3.65, -23, 3, 0.9, 3, 'stone', C2), place(stairs(3, 2, 0.3, 0.5, 'stone', C2), 14.5, 3.2, -23, -PI / 2), cy(17.9, 4.7, -24, 0.05, 1.2, 'wood', '#5a3d26', { n: 5 }), cy(17.9, 5.4, -24, 0.1, 1.2, 'gold', '#d9a520', { e: [PI / 2 - 0.15, 0.4, 0], rt: 0.6, n: 8 }));
  // patio de armas
  Z.put(casa(9, 4.4, 2.8, '#cfc6b0', '#8d4a35', '#8a7f6c'), 6.5, -18.6).add(cy(-7, 0.5, -14, 1.1, 1, 'stone', C2, { n: 10 }), cy(-7, 0.9, -14, 0.85, 0.1, 'water', '#3aa6d8', { n: 10, solid: false }));
  for (const [x, z, y] of [[-3, -19.5, 0.2], [-2.6, -19.5, 0.2], [-2.8, -19.15, 0.2], [-2.8, -19.38, 0.5]]) Z.add(bl(x, y, z, 0.2, 'metal', '#2b2b2b', { n: 7 }));
  Z.n(<P.Flag pos={[0, 0, -9]} />).n(<P.Barrel pos={[-11, 0, -19.6]} color="#6b4a2a" />).n(<P.Barrel pos={[-12.2, 0, -19.2]} color="#6b4a2a" />).n(<P.Crate pos={[11.5, 0, -1]} />);
  Z.plaque('Fortaleza de Santa Bárbara', 0, 2.85, 4.56, 0, 0.5).plaque('Patio de armas', 6.5, 2.35, -16.3, 0, 0.36).label('Bahía de Trujillo', 0, 7, -44, 1.1);
  // cruz de Colón y pueblo
  Z.add(bx(11, 0.5, 16, 2.2, 1, 2.2, 'stone', C2), bx(11, 2.6, 16, 0.4, 3.2, 0.4, 'stone', '#e9e4d8'), bx(11, 3.3, 16, 1.7, 0.4, 0.4, 'stone', '#e9e4d8', { solid: false }));
  Z.plaque('1502 · Cuarto viaje de Colón', 11, 0.55, 17.12, 0, 0.3);
  Z.n(<P.House pos={[-16, 0, 30]} rot={PI / 2} color="#f6e1a0" />).put(casa(6, 5, 3, '#9fd3c7'), 17, 33, -PI / 2).put(casa(6, 5, 3, '#ffb3a0'), -17, 18, PI / 2);
  for (const [x, z] of [[-23, 8], [23, 9], [-8, 21], [-27, -27], [27, -28], [8, 27]]) Z.n(<P.Palm pos={Z.at(x, z)} seed={x + z} />);
  Z.n(<P.Boat pos={[-9, -0.42, -39]} rot={0.6} />).add(place(galeon(), 34, -0.6, -92, 0.9));
  Z.veg('palm', 26, (x, z) => (Math.abs(x) > 22 && z > -33 && z < 46 && !inR(x, z, -24, 24, 20, 46)) || (z < -26.5 && z > -32.5), { sep: 4.5 });
  Z.veg('tree', 26, (x, z) => (Math.abs(x) > 30 && z > -20) || z > 50, { sep: 5.5 });
  Z.veg('bush', 20, (x, z) => Math.abs(x) > 20 && Math.abs(x) < 46 && z > -24 && z < 44 && !inR(x, z, -24, 24, 20, 46), { sep: 3 });
  Z.add(place(mont(60, 55, '#3a8a55'), -120, 0, 60), place(mont(70, 70, '#2f7d4a'), 60, 0, 150));
  Z.trail([[0, 36], [0, 8]], 5).coin(0, 0, -4).coin(-8, 0, -8).coin(-14.4, 1.7, -7.5); for (const x of [-9, -3, 3, 9]) Z.coin(x, 3.2, -21.9);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -40, maxZ: 50 }, bad: (_x, y) => y < -1.15, badMsg: 'El mar está muy hondo por ahí',
    npc: { pos: [-5, 0, 12], name: 'Wani', look: { hair: 'pelo_afro', shirt: 'camisa_rayas', shirtColor: '#ffc93c', pants: 'short_futbol', pantsColor: '#1d1d1f', acc: 'tambor_garifuna', skin: '#4f2f1c' }, icon: '🏰' },
    gem: [16.7, 4.1, -22.6], gemColor: '#e9c46a',
  });
}

const CORAL = ['#ff6f91', '#ff9671', '#ffc75f', '#845ec2', '#f9f871', '#00c9a7', '#ff8066', '#d65db1'];
/** Islas de la Bahía: una islita de arena blanca en Roatán, con muelle, arrecife bajo que se camina y un naufragio. */
export function arrecife(d: Department): ZoneSpec {
  const R = (x: number, z: number) => Math.hypot(x * 0.82, z - 10);
  const Z = new ZB(d, (x, z) => { const r = R(x, z); return 0.9 * ss(30, 15, r) - 0.75 * ss(27, 34, r) - 2.7 * ss(57, 66, r); }), B = Z.bio;
  Z.layer('sand', B.sand).layer('grass', B.grass, (x, z) => (12.5 - R(x, z) + Math.sin(x * 0.4 + z * 0.3)) / 3);
  Z.sea(-0.3); Z.far = { mat: 'sand', color: B.sand, y: -3.47 }; Z.stop(0, 30);
  Z.add(place(pier(26), 0, 0, -19.5), place(champa(3.2, 3.2, '#c9a55a'), 0, 0.6, -43.4));
  Z.label('Arrecife Mesoamericano', 0, 5.4, -43.4, 0.8);
  // naufragio sobre el arrecife
  const wreck: Pc[] = [bx(0, 0.5, -3.6, 3, 2.3, 5, 'wood', '#5a4028', { e: [0.1, 0, 0.3], solid: true }), bx(0, 0.4, 3.8, 2.7, 1.9, 4.6, 'wood', '#5a4028', { e: [-0.12, 0.1, 0.3], solid: true }), py(0.1, 0.1, 6, 2.5, 3, 1.9, 'wood', '#5a4028', { e: [PI / 2 - 0.1, 0.1, 0.3] }),
    cy(1.1, 2.9, -3.2, 0.18, 6.4, 'wood', '#4a3420', { e: [0.2, 0, -0.5], n: 6 }), bx(2.2, 4.5, -2.8, 0.14, 0.14, 3.6, 'wood', '#4a3420', { e: [0.2, 0, -0.5] }), bx(2.4, 3.4, -2.6, 0.06, 2, 2.6, 'cloth', '#d9d0b8', { e: [0.2, 0, -0.5] }),
    ...[-0.6, 0.1, 0.8].map(z => bx(0, 0.7, z, 2.7, 1.7, 0.16, 'wood', '#4a3420', { e: [0, 0, 0.3] })), bx(-1.6, 0.3, 0.2, 0.9, 0.6, 0.6, 'wood', '#7a4a1c'), bx(-1.6, 0.63, 0.2, 0.94, 0.1, 0.64, 'gold', '#e0b030', { solid: false }),
    cy(-0.9, 0.04, 0.8, 0.13, 0.05, 'gold', '#ffc93c', { n: 8, solid: false }), cy(-1.2, 0.04, -0.6, 0.13, 0.05, 'gold', '#ffc93c', { n: 8, solid: false })];
  Z.add(place(wreck, -24, -0.78, -30, 0.5));
  // corales de colores sobre la plataforma del arrecife
  const r = Z.rand;
  for (let i = 0, n = 0; n < 76 && i < 4000; i++) {
    const x = (r() * 2 - 1) * 64, z = (r() * 2 - 1) * 60, rr = R(x, z);
    if (rr < 35.5 || rr > 56 || Math.abs(x) < 3.2 || Math.hypot(x + 24, z + 30) < 8) continue; n++;
    const c = CORAL[Math.floor(r() * CORAL.length)], y = Z.h(x, z), k = r(), s = 1.2 + r() * 0.8;
    if (k < 0.3) Z.add(bl(x, y + 0.3 * s, z, (0.55 + r() * 0.4) * s, 'plastic', c, { s: [1, 0.62, 1], n: 8 }));
    else if (k < 0.55) for (let j = 0; j < 4; j++) Z.add(cy(x + (r() - 0.5) * s, y + 0.45 * s, z + (r() - 0.5) * s, 0.15 * s, (0.7 + r() * 0.6) * s, 'plastic', c, { n: 6, rt: 1.35, solid: false }));
    else if (k < 0.8) Z.add(bx(x, y + 0.55 * s, z, 1.3 * s, 1.1 * s, 0.14, 'plastic', c, { r: r() * 3, solid: false }), bx(x + 0.3, y + 0.4 * s, z + 0.2, 0.9 * s, 0.8 * s, 0.14, 'plastic', c, { r: r() * 3, solid: false }));
    else for (let j = 0; j < 4; j++) Z.add(cy(x, y + 0.45 * s, z, 0.09 * s, 1.1 * s, 'plastic', c, { e: [0.5, j * 1.6, 0], n: 5 }));
  }
  // playa
  for (const [x, z] of [[-20, 2], [-14, -9], [14, -10], [21, 3], [24, 16], [-24, 18], [-11, 29], [13, 25]]) Z.n(<P.Palm pos={Z.at(x, z)} seed={x * 3 + z} />);
  Z.veg('palm', 18, (x, z) => R(x, z) > 9 && R(x, z) < 26 && Math.abs(x) > 3.5 && !inR(x, z, -9, 9, 22, 34) && Math.hypot(x + 12, z - 2) > 5 && Math.hypot(x + 15, z + 11) > 6, { sep: 4.5 });
  Z.veg('bush', 14, (x, z) => R(x, z) < 13 && Math.abs(x) > 3, { sep: 3 });
  Z.put(champa(5, 4), -12, 2, PI / 2).put(mesa(), -12, 2, PI / 2);
  Z.n(<P.House pos={Z.at(-15, -11)} rot={0.5} w={5} d={4} color="#7fe0d8" sign="Buceo Roatán" />).n(<P.Stall pos={Z.at(8, -13)} rot={PI} sign="Pan de coco" color="#ffd166" />);
  Z.put([cy(0, 1.2, 0, 0.1, 2.4, 'wood', '#5a3d26', { n: 6 }), cy(3.2, 1.2, 0, 0.1, 2.4, 'wood', '#5a3d26', { n: 6 }), bx(0.6, 1.25, 0, 1.2, 0.05, 0.9, 'cloth', '#ff7a3d', { e: [0, 0, -0.45] }), bx(1.6, 1.02, 0, 1, 0.05, 0.9, 'cloth', '#ffd166', { solid: false }), bx(2.6, 1.25, 0, 1.2, 0.05, 0.9, 'cloth', '#ff7a3d', { e: [0, 0, 0.45] })], 16, -2, 0.4);
  for (const [x, z, s] of [[6.3, -13.6, 1], [7, -14.6, 0.8], [5.6, -14.7, 0.7]]) { const y = Z.h(x, z); Z.add(cy(x, y + 0.4 * s, z, 0.32 * s, 0.8 * s, 'wood', '#8a5a34', { n: 10, rt: 1.15 }), cy(x, y + 0.81 * s, z, 0.37 * s, 0.04, 'cloth', '#f2e6cf', { n: 10, solid: false })); }
  Z.n(<P.Boat pos={[10, -0.36, -31]} rot={0.5} />).n(<P.Boat pos={[-9, -0.36, -27]} rot={-0.4} color="#ffd166" />).n(<P.Boat pos={Z.at(21, -9, 0.1)} rot={1} color="#e63946" />);
  Z.trail([[0, 26], [0, -17]], 5); for (const zz of [-24, -31, -38]) Z.coin(0, 0.6, zz);
  for (const [x, z] of [[-8, -38], [-14, -35], [-19, -33], [14, -37], [22, -31]]) Z.coin(x, Z.h(x, z), z);
  const at = Z.at;
  return Z.done({
    limit: { minX: -64, maxX: 64, minZ: -52, maxZ: 60 }, bad: (_x, y) => y < -1.35, badMsg: 'Ahí se acaba el arrecife: el mar está muy hondo',
    npc: { pos: at(3.6, -15.5), name: 'Kenia', look: { hair: 'pelo_trenzas', face: 'cara_lentes', shirt: 'camisa_basica', shirtColor: '#ffd166', pants: 'short_futbol', pantsColor: '#00a3d7', skin: '#7a4a2b' }, icon: '🐠' },
    gem: [-24.4, -0.75, -29.6], gemColor: '#ffb3c6',
    finds: [
      { id: 'concha', name: 'Concha de caracol', icon: '🐚', color: '#ffd9c2', pos: at(25.8, 17.4), fact: 'Roatán es la isla más grande de las Islas de la Bahía.' },
      { id: 'coral', name: 'Coral de colores', icon: '🪸', color: '#ff6f91', pos: at(20, -34), fact: 'Roatán está sobre el Arrecife Mesoamericano, el segundo más grande del mundo.' },
      { id: 'moneda', name: 'Moneda pirata', icon: '🪙', color: '#ffc93c', pos: [-24.4, -0.75, -29.6], fact: 'Hace siglos, piratas ingleses usaron las bahías de Roatán como escondite.' },
      { id: 'tambor', name: 'Tambor garífuna', icon: '🪘', color: '#c98f5f', pos: at(-14.6, 4.8), fact: 'El pueblo garífuna llegó a Punta Gorda, Roatán, el 12 de abril de 1797.' },
      { id: 'estrella', name: 'Estrella de mar', icon: '⭐', color: '#ff9671', pos: at(2.9, -33), fact: 'En las aguas claras del arrecife viven tortugas, estrellas de mar y peces de colores.' },
    ],
  });
}
