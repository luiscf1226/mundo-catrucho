// Zonas de montaña: Yuscarán minero (pueblo), mercado lenca de La Esperanza (mercado), cafetales de Marcala (cafetal),
// Fuerte San Cristóbal de Gracias (fuerte) y los talleres de junco de Santa Bárbara (artesania).
import { P } from '../../kit';
import type { Department } from '../../../core/types';
import { bl, bx, cliff, cy, dist, distToPath, inR, PI, place, py, ss, type Pc } from '../lib';
import { ZB, type ZoneSpec } from '../zone';
import { baranda, basket, bunting, cannon, casa, champa, fence, garita, hat, iglesia, mont, puesto, stairs } from '../parts';
import { CaveCam, Darkness } from '../fx';

/** El Paraíso: Yuscarán, pueblo minero de casas blancas, con su bocamina y una milpa donde se esconde la mazorca dorada. */
export function pueblo(d: Department): ZoneSpec {
  const mine: [number, number][] = [[14, -10], [14, -32]], cheb = (x: number, z: number) => Math.max(Math.abs(x - 14), Math.abs(z + 36));
  const Z = new ZB(d, (x, z) => cliff(x, z, -14, 14, 14, 9)[0] * Math.min(ss(4.2, 6.4, distToPath(x, z, mine)), ss(6.2, 8.4, cheb(x, z)))), B = Z.bio, R = '#9a958a', WH = '#fbfaf5', r = Z.rand;
  Z.layer('grass', B.grass).layer('stone', R, (x, z) => { const zz = cliff(x, z, -14, 14, 14, 9)[1]; return Math.min(-13.2 - zz, zz + 22.5) * 1.2; }).layer('cobble', '#a39c90', (x, z) => Math.max(Math.min(2.6 - Math.abs(x), z + 10, 52 - z), Math.min(2.6 - Math.abs(z + 8), x + 16, 15.5 - x)) * 2)
    .layer('dirt', '#8a6a48', (x, z) => Math.max(Math.min(x - 18, 46 - x, z - 6, 36 - z) / 1.5, Math.min(2.6 - Math.abs(x - 14), -5.5 - z, z + 14) * 2, Math.min(4.6 - Math.abs(x - 14), -13 - z), 6.6 - cheb(x, z)));
  Z.stop(0, 42);
  // bocamina: túnel con marcos de madera, rieles y galería con vetas
  Z.add(bx(10.6, 2.2, -23.25, 2.4, 4.4, 17.5, 'stone', R), bx(17.4, 2.2, -23.25, 2.4, 4.4, 17.5, 'stone', R), bx(14, 2.5, -41.2, 12.8, 5, 2.4, 'stone', R), bx(8.8, 2.5, -36, 2.4, 5, 8, 'stone', R), bx(19.2, 2.5, -36, 2.4, 5, 8, 'stone', R),
    bx(14, 4.2, -23.5, 9.2, 0.8, 18, 'stone', '#7f7a70'), bx(14, 5.4, -36.4, 12.8, 0.8, 10.4, 'stone', '#7f7a70'), bx(14, 9.4, -18.4, 9.2, 9.6, 5, 'stone', R), bx(14, 5.8, -15, 9.2, 2.4, 1.9, 'stone', '#a8a398'),
    bx(14, 14.05, -26.5, 13.2, 0.3, 12, 'grass', B.grass, { solid: false }), bx(14, 14.05, -37, 17, 0.3, 13.5, 'grass', B.grass, { solid: false }),
    ...[-15, -18, -21, -24, -27, -30].flatMap(z => [bx(12.05, 1.9, z, 0.3, 3.8, 0.3, 'wood', '#6b4a2a', { solid: false }), bx(15.95, 1.9, z, 0.3, 3.8, 0.3, 'wood', '#6b4a2a', { solid: false }), bx(14, 3.64, z, 4.3, 0.3, 0.3, 'wood', '#6b4a2a', { solid: false })]),
    bx(13.5, 0.05, -17, 0.1, 0.1, 35, 'metal', '#5a5f66', { solid: false }), bx(14.5, 0.05, -17, 0.1, 0.1, 35, 'metal', '#5a5f66', { solid: false }), ...Array.from({ length: 24 }, (_, i) => bx(14, 0.02, 0 - i * 1.5, 1.5, 0.05, 0.25, 'wood', '#5a3d26', { solid: false })),
    bx(14, 0.72, -3, 1.3, 0.85, 1.9, 'metal', '#6b6f75'), ...[-0.7, 0.7].flatMap(z => [-0.55, 0.55].map(x => cy(14 + x, 0.25, -3 + z, 0.25, 0.1, 'metal', '#2b2b2b', { e: [0, 0, PI / 2], n: 8 }))), bl(13.8, 1.2, -3.2, 0.35, 'gold', '#c9a23b', { n: 6 }), bl(14.3, 1.25, -2.7, 0.3, 'stone', '#8a8f96', { n: 6 }),
    ...[[10.05, 1.5, -34.5], [10.05, 2.4, -37.5], [17.95, 1.2, -35], [17.95, 2.8, -38], [12, 2, -39.95], [16, 1.3, -39.95], [14.6, 3, -39.95]].map(([x, y, z]) => bx(x, y, z, 0.5, 0.35, 0.5, 'gold', '#e0b030', { r: 0.6, solid: false })),
    bx(11.6, 0.4, -38.4, 1.2, 0.8, 1.2, 'wood', '#8a5a34'), bx(16.6, 0.5, -38.8, 1, 1, 1, 'wood', '#8a5a34'));
  Z.n(<Darkness pos={[14, 6.65, -32]} size={[14, 14.3, 22]} />).n(<CaveCam inside={(x, z) => z < -15.6 && x > 7 && x < 21} />).n(<P.Lamp pos={[15.7, 0, -22.5]} />).n(<P.Lamp pos={[11.2, 0, -33]} />);
  Z.plaque('Mina de Yuscarán', 14, 5.8, -14.03, 0, 0.6);
  // calle real empedrada con casas blancas, iglesia y pancarta del maíz
  Z.n(<P.House pos={[10.5, 0, 30]} rot={-PI / 2} color={WH} />).n(<P.House pos={[-10.5, 0, 26]} rot={PI / 2} color={WH} sign="Pulpería" />).n(<P.House pos={[-10.5, 0, 6]} rot={PI / 2} color={WH} floors={2} />).n(<P.House pos={[10.5, 0, 5]} rot={-PI / 2} color={WH} />);
  Z.put(casa(6, 5, 3, WH), 10.5, 18, -PI / 2).put(casa(6, 5, 3, WH), -10.5, 16, PI / 2).put(casa(7, 5, 3, WH), -22, 31, 0).put(casa(6, 5, 3, WH), -23, 18, PI / 2).put(casa(6, 5, 3, WH), -11, 36.5, PI / 2);
  Z.put(iglesia(7, 5, 10), -22, -1, PI / 2).n(<P.Fountain pos={[-9, 0, -1.5]} />);
  for (const [x, z] of [[3.5, 34], [-3.5, 21], [3.5, 10], [-3.5, -4]]) Z.n(<P.Lamp pos={[x, 0, z]} />);
  Z.add(bx(-4.2, 2.5, 12, 0.2, 5, 0.2, 'wood', '#5a3d26'), bx(4.2, 2.5, 12, 0.2, 5, 0.2, 'wood', '#5a3d26'), bx(0, 4.4, 12, 8.4, 1, 0.08, 'cloth', '#ffe066', { solid: false }), place(bunting(8.4, 3.75, ['#ffe066', '#2ea44f', '#ffffff']), -4.2, 0, 12)); Z.plaque('Festival del Maíz', 0, 4.4, 12.06, 0, 0.5, '#2e7d32');
  // milpa con espantapájaros
  for (let x = 19.6; x < 45.5; x += 1.7) for (let z = 7.6; z < 35; z += 2.1) {
    if (Math.hypot(x - 32.6, z - 22) < 2.6 || (Math.abs(z - 22) < 1.3 && x < 32)) continue; const px = x + (r() - 0.5) * 0.5, pz = z + (r() - 0.5) * 0.5, a = r() * 3, hh = 1.7 + r() * 0.6;
    Z.add(bx(px, hh / 2, pz, 0.1, hh, 0.1, 'leaf', '#5f9a3a', { solid: false }), bx(px, hh * 0.6, pz, 1, 0.04, 0.22, 'leaf', '#6aa842', { e: [0, a, 0.5], solid: false }), bx(px, hh * 0.8, pz, 0.9, 0.04, 0.2, 'leaf', '#6aa842', { e: [0, a + 2, -0.5], solid: false }), bx(px + 0.1, hh * 0.55, pz, 0.13, 0.36, 0.13, 'plastic', '#ffe066', { solid: false }));
  }
  Z.add(bx(31.6, 1.2, 22, 0.14, 2.4, 0.14, 'wood', '#5a3d26'), bx(31.6, 1.7, 22, 1.8, 0.12, 0.12, 'wood', '#5a3d26', { solid: false }), bx(31.6, 1.45, 22, 0.8, 0.8, 0.3, 'cloth', '#c0392b', { solid: false }), bl(31.6, 2.25, 22, 0.28, 'cloth', '#e8d28a', { n: 7 }), ...hat(31.6, 2.46, 22, 0.9));
  Z.put(fence(28), 32, 6).put(fence(28), 32, 36).put(fence(30), 46, 21, PI / 2).put(fence(13), 18, 13, PI / 2).put(fence(11.5), 18, 30, PI / 2).n(<P.Sign pos={[16.6, 0, 25.5]} rot={-PI / 2} text="Milpa de maíz" />);
  const town = (x: number, z: number) => inR(x, z, -30, 16, -24, 48) || inR(x, z, 16, 48, 4, 38) || inR(x, z, 8, 20, -14, 4);
  Z.veg('pine', 42, (x, z) => z > -11.5 && !town(x, z), { sep: 5 }); Z.veg('tree', 16, (x, z) => z > -11.5 && !town(x, z), { sep: 5 }); Z.veg('bush', 22, (x, z) => z > -11.5 && !town(x, z) && Math.abs(x) < 48, { sep: 3 });
  Z.veg('pine', 40, (x, z) => z < -21.5 && Math.abs(x) < 47 && !inR(x, z, 6, 23, -46, -19), { sep: 4.5 }); Z.veg('rock', 12, (x, z) => z < -8.5 && z > -12.5 && (x < -12 || x > 20), { sep: 3, colors: [R], smin: 1, smax: 1.9 });
  Z.add(place(mont(90, 70, '#3a6f4a'), -170, 0, -120), place(mont(100, 85, '#2f6442'), 120, 0, -190), place(mont(80, 55, '#3a6f4a'), 200, 0, 20));
  Z.trail([[0, 36], [0, -6]], 6).trail([[4, -8], [13, -9]], 2).coin(14, 0, -20).coin(14, 0, -28).coin(14, 0, -36.5).coin(25, 0, 22);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -41, maxZ: 50 }, bad: (_x, y) => y > 2.6, badMsg: 'El cerro es muy empinado', badIcon: '⛰',
    npc: { pos: [10.4, 0, -11], name: 'Don Lencho', look: { hat: 'casco_explorador', hatColor: '#ffc93c', face: 'cara_bigote', shirt: 'camisa_cuadros', shirtColor: '#8d6e63', pants: 'jeans', skin: '#a56b43' }, icon: '⛏' },
    gem: [33.8, 0, 22], gemColor: '#ffd23f',
  });
}

const LENCA = ['#7b2cbf', '#ffb703', '#e63946', '#00a3d7', '#ff5d9e', '#2ea44f'];
/** Intibucá: el mercado lenca de La Esperanza, con puestos de papas y fresas, textiles de colores y La Gruta al fondo. */
export function mercado(d: Department): ZoneSpec {
  const Z = new ZB(d, (x, z) => cliff(x, z, -25.6, 10, 0, 11)[0]), B = Z.bio;
  Z.layer('grass', B.grass).layer('cobble', '#a59d92', (x, z) => Math.max(Math.min(15 - Math.abs(x), z + 19, 33 - z), Math.min(3 - Math.abs(x), z - 30, 52 - z)) * 1.5).layer('stone', '#9a958a', (x, z) => { const zz = cliff(x, z, -25.6, 10, 0, 11)[1]; return Math.min(-24.8 - zz, zz + 34) * 1.2; });
  Z.stop(0, 42);
  // dos filas de puestos
  const goods: string[][] = [['#b98a55', '#c9a56b', '#a5744a'], ['#e63946', '#ff5d73', '#c9184a'], ['#ffb347', '#ff8c42'], ['#7fbf5a', '#a8d672', '#5a9a3a'], ['#b5523b', '#c96a4a'], ['#5a2a6a', '#7b2cbf']];
  [19, 12, -2].forEach((z, i) => { Z.put(puesto(LENCA[i * 2 % 6], goods[i * 2]), -7, z, PI / 2).put(puesto(LENCA[(i * 2 + 3) % 6], goods[i * 2 + 1]), 7, z, -PI / 2); });
  Z.n(<P.Stall pos={[-7, 0, 26]} rot={PI / 2} sign="Papas" color="#7b2cbf" />).n(<P.Stall pos={[7, 0, 26]} rot={-PI / 2} sign="Fresas" color="#e63946" />).n(<P.Stall pos={[-7, 0, 5]} rot={PI / 2} sign="Textiles lencas" color="#ffb703" />).n(<P.Stall pos={[7, 0, 5]} rot={-PI / 2} sign="Choros" color="#00a3d7" />);
  // textiles colgados sobre el pasillo
  for (const z of [22.5, 8.5, -5.5]) { Z.add(bx(-5.4, 2.2, z, 0.16, 4.4, 0.16, 'wood', '#5a3d26'), bx(5.4, 2.2, z, 0.16, 4.4, 0.16, 'wood', '#5a3d26'), bx(0, 4.15, z, 10.8, 0.05, 0.05, 'cloth', '#f2f2f2', { solid: false })); for (let i = 0; i < 7; i++) { const x = -4.5 + i * 1.5, c = LENCA[(i + Math.abs(Math.round(z))) % 6]; Z.add(bx(x, 3.35, z, 1.25, 1.55, 0.04, 'cloth', c, { solid: false }), bx(x, 3.6, z, 1.27, 0.22, 0.06, 'cloth', LENCA[(i + 3) % 6], { solid: false }), bx(x, 3.05, z, 1.27, 0.22, 0.06, 'cloth', '#ffffff', { solid: false })); } }
  for (const [x, z, c] of [[-4.6, 22, '#b98a55'], [4.7, 15.5, '#e63946'], [-4.7, -4.5, '#b5523b'], [4.6, 1, '#7fbf5a'], [-4.5, 15, '#ffb347'], [4.6, 22.5, '#e63946']] as [number, number, string][]) Z.add(basket(x, 0, z, 1.2), bl(x, 0.6, z, 0.3, 'plastic', c, { s: [1.2, 0.5, 1.2], n: 7 }));
  for (const [x, z, s] of [[-4.6, -7.5, 1], [-5.3, -8.6, 0.8], [-4.2, -9, 0.7]]) Z.add(bl(x, 0.42 * s, z, 0.42 * s, 'dirt', '#b5523b', { s: [1, 1.05, 1], n: 9 }), cy(x, 0.85 * s, z, 0.2 * s, 0.2 * s, 'dirt', '#b5523b', { n: 8, rt: 1.2, solid: false }));
  Z.add(bx(-5.4, 2.4, 31, 0.22, 4.8, 0.22, 'wood', '#5a3d26'), bx(5.4, 2.4, 31, 0.22, 4.8, 0.22, 'wood', '#5a3d26'), bx(0, 4.3, 31, 10.8, 1.1, 0.1, 'cloth', '#7b2cbf', { solid: false })); Z.plaque('Mercado Lenca de La Esperanza', 0, 4.3, 31.07, 0, 0.5, '#7b2cbf');
  // La Gruta: escalinata, terraza y capilla en la peña
  Z.add(place(stairs(5, 12, 0.32, 0.5, 'stone', '#b8b2a4'), 0, 0, -13), bx(0, 1.92, -22, 13, 3.84, 6, 'stone', '#a8a294'), place(baranda(3.8, '#e9e4d8', 'stone'), -4.5, 3.84, -19.25), place(baranda(3.8, '#e9e4d8', 'stone'), 4.5, 3.84, -19.25),
    bx(0, 6.6, -24.5, 5.6, 5.5, 1, 'stucco', '#ffffff'), bx(0, 5.2, -23.96, 1.8, 2.7, 0.1, 'stone', '#2b2b2b', { solid: false }), cy(0, 6.55, -23.96, 0.9, 0.1, 'stone', '#2b2b2b', { e: [PI / 2, 0, 0], n: 14 }), bx(0, 10, -24.5, 2.2, 1.4, 0.8, 'stucco', '#ffffff', { solid: false }), bl(0, 9.9, -24.05, 0.28, 'gold', '#d9a520', { n: 8 }),
    bx(0, 11.3, -24.5, 0.16, 1.2, 0.16, 'stone', '#3a3a3a', { solid: false }), bx(0, 11.5, -24.5, 0.7, 0.16, 0.16, 'stone', '#3a3a3a', { solid: false }), bx(-4.6, 4.3, -23.6, 1.5, 0.9, 1.5, 'stone', '#b8b2a4'), bl(-4.6, 5.1, -23.6, 0.7, 'leaf', '#2f6b3a', { n: 7 }), bx(4.6, 4.3, -23.6, 1.5, 0.9, 1.5, 'stone', '#b8b2a4'), bl(4.6, 5.1, -23.6, 0.7, 'leaf', '#2f6b3a', { n: 7 }),
    ...[-1.4, -1.1, 1.1, 1.4].map(x => cy(x, 4, -23.8, 0.05, 0.32, 'neon', '#ffe9a0', { n: 5, solid: false })), bx(-7.4, 2.6, -24.6, 2.4, 5.2, 2, 'stone', '#9a958a'), bx(7.6, 2.2, -24.4, 2.6, 4.4, 2.2, 'stone', '#9a958a'));
  Z.label('La Gruta', 0, 12.6, -24.5, 0.8).n(<P.Flowers pos={[-2.2, 3.84, -23.4]} />).n(<P.Flowers pos={[2.2, 3.84, -23.4]} color="#7b2cbf" />);
  Z.n(<P.House pos={[21, 0, 22]} rot={-PI / 2} color="#e9d8fd" />).n(<P.House pos={[-21, 0, 12]} rot={PI / 2} color="#fff3c4" sign="Comedor lenca" />).n(<P.House pos={[21, 0, 3]} rot={-PI / 2} color="#f7f1e3" />);
  Z.put(casa(6, 5, 3, '#ffd6e8'), -21, 28, PI / 2).put(casa(6, 5, 3, '#fff3c4'), 21.5, -13, -PI / 2).put(casa(7, 5, 3, '#d8f3dc'), -21.5, -6, PI / 2);
  for (const [x, z] of [[-12.5, 30], [12.5, 30], [-12.5, -14], [12.5, -14]]) Z.n(<P.Pine pos={[x, 0, z]} seed={x + z} />);
  const mk = (x: number, z: number) => inR(x, z, -27, 27, -26, 48);
  Z.veg('pine', 54, (x, z) => z > -24 && !mk(x, z), { sep: 4.5 }); Z.veg('tree', 14, (x, z) => z > -24 && !mk(x, z), { sep: 5 }); Z.veg('bush', 20, (x, z) => z > -24 && !mk(x, z) && Math.abs(x) < 48, { sep: 3 }); Z.veg('pine', 40, (_x, z) => z < -32.5, { sep: 4.5 });
  Z.veg('rock', 12, (x, z) => z < -21 && z > -25 && Math.abs(x) > 10, { sep: 3, colors: ['#9a958a'], smin: 1, smax: 2 });
  Z.add(place(mont(90, 70, '#3f7a55'), -170, 0, -140), place(mont(110, 80, '#35704c'), 140, 0, -170), place(mont(80, 50, '#3f7a55'), -200, 0, 60));
  Z.trail([[0, 36], [0, -11]], 8).coin(0, 1.3, -15).coin(0, 2.9, -17.5).coin(3, 3.84, -21.5).coin(-2.4, 3.84, -21.5);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -30, maxZ: 50 }, bad: (_x, y) => y > 4.7, badMsg: 'La peña es muy empinada', badIcon: '⛰',
    npc: { pos: [-4.4, 0, 9], rot: PI / 2, name: 'Doña Tina', look: { hair: 'pelo_trenzas', hat: 'panuelo_lenca', hatColor: '#e63946', shirt: 'blusa_tipica', shirtColor: '#7b2cbf', pants: 'falda_tipica', acc: 'sin_accesorio', skin: '#a56b43', face: 'cara_feliz' }, icon: '🧺' },
    gem: [-5.4, 3.84, -22], gemColor: '#ffb703',
  });
}

/** La Paz: finca de café en la ladera de Marcala: surcos de cafetos, patio de secado, beneficio y mirador arriba. */
export function cafetal(d: Department): ZoneSpec {
  const Z = new ZB(d, (_x, z) => 13 * ss(-4, -46, z)), B = Z.bio, r = Z.rand;
  Z.layer('grass', B.grass).layer('dirt', '#8a6a48', (x, z) => Math.max(Math.min(1.6 - Math.abs(x), 30 - z) * 2, Math.min(27 - Math.abs(x), z - 1, 21 - z) / 1.5));
  Z.stop(0, 42);
  // surcos de cafetos con cerezas rojas
  for (let z = -8; z > -43; z -= 3.4) for (let x = -44; x <= 44; x += 1.75) {
    if (Math.abs(x) < 2.5) continue; const px = x + (r() - 0.5) * 0.4, pz = z + (r() - 0.5) * 0.4, y = Z.h(px, pz), s = 0.62 + r() * 0.2;
    Z.add(bl(px, y + s * 0.85, pz, s, 'leaf', r() < 0.5 ? '#2d6a3a' : '#357a42', { s: [1, 1, 1], n: 6 }), bx(px + s * 0.7, y + s, pz + s * 0.5, 0.15, 0.15, 0.15, 'plastic', '#d62828', { solid: false }), bx(px - s * 0.5, y + s * 1.3, pz - s * 0.7, 0.15, 0.15, 0.15, 'plastic', '#d62828', { solid: false }), bx(px - s * 0.3, y + s * 0.6, pz + s * 0.9, 0.15, 0.15, 0.15, 'plastic', '#e85d04', { solid: false }));
  }
  for (const [x, z] of [[-12, -14], [14, -24], [-22, -34], [24, -40], [34, -12], [-36, -22]]) Z.n(<P.Tree pos={Z.at(x, z)} seed={x} scale={1.3} />);
  Z.veg('banana', 22, (x, z) => z < -6 && z > -44 && Math.abs(x) > 4 && Math.abs(x) < 46, { sep: 7 });
  // beneficio (despulpado) y sacos
  Z.add(...[-5, 0, 5].flatMap(x => [-3.3, 3.3].map(z => cy(-15 + x, 1.6 + (x + 5) * 0.06, 11 + z, 0.12, 3.2 + (x + 5) * 0.12, 'wood', '#5a3d26', { n: 6 }))), bx(-15, 3.7, 11, 11.4, 0.12, 8.2, 'metal', '#a5523b', { e: [0, 0, 0.12] }),
    cy(-17, 1.15, 11, 0.6, 1.3, 'metal', '#3f6b4a', { e: [0, 0, PI / 2], n: 12, solid: true }), py(-17, 1.7, 11, 1.3, 1, 1.3, 'metal', '#3f6b4a', { e: [PI, 0, 0] }), bx(-17, 0.3, 11, 1.6, 0.6, 1, 'wood', '#5a3d26'), cy(-17, 1.15, 11.9, 0.5, 0.08, 'metal', '#2b2b2b', { e: [PI / 2, 0, 0], n: 12 }),
    bx(-12.2, 0.45, 12.5, 3.2, 0.9, 2.2, 'concrete', '#bdb7a8'), bx(-12.2, 0.86, 12.5, 2.8, 0.1, 1.8, 'water', '#6a8f6a', { solid: false }),
    ...[[0, 0.25, 0], [1.1, 0.25, 0.1], [0.5, 0.75, 0.05], [0.2, 0.25, 0.9], [1.2, 0.25, 1], [0.7, 0.75, 0.95], [0.55, 1.25, 0.5]].map(([x, y, z]) => bx(-19.6 + x, y, 8.2 + z, 1, 0.5, 0.75, 'cloth', '#c9b48a')));
  Z.plaque('Café de Marcala', -19, 0.85, 9.56, 0, 0.3, '#7f5539').plaque('Beneficio', -15, 3.1, 15.2, 0, 0.5, '#7f5539').add(bx(-15, 3.1, 15.12, 3.4, 0.7, 0.1, 'wood', '#5a3d26', { solid: false }));
  // patio de secado
  Z.add(bx(13, 0.06, 11, 16, 0.12, 10, 'concrete', '#cfc8b8', { solid: false }), ...Array.from({ length: 7 }, (_, i) => bx(6.4 + i * 2.2, 0.15, 11, 1.6, 0.06, 8.6, 'dirt', i % 2 ? '#6b3f22' : '#8a5a34', { solid: false })), bx(21.6, 0.5, 14, 0.06, 0.06, 2.4, 'wood', '#c9a56b', { e: [0.5, 0.3, 0] }), bx(21.9, 0.08, 15, 0.9, 0.08, 0.08, 'wood', '#c9a56b', { r: 0.3, solid: false }));
  Z.n(<P.Sign pos={[13, 0, 17.2]} text="Patio de secado" />).n(<P.House pos={[25, 0, 30]} rot={-PI / 2} color="#f6e1a0" sign="Finca El Cafetal" />).n(<P.Car pos={[-9, 0, 27]} rot={0.3} color="#d62828" />).n(<P.Crate pos={[-10.8, 0, 14.5]} />).n(<P.Fence pos={[-14, 0, 22.5]} length={18} />).n(<P.Fence pos={[14, 0, 22.5]} length={18} />);
  for (const [x, z] of [[2.6, -3], [3.6, -4.2], [-2.8, -3.6], [5, 5]]) Z.add(basket(x, Z.h(x, z), z, 1.3), bl(x, Z.h(x, z) + 0.66, z, 0.36, 'plastic', '#d62828', { s: [1.1, 0.4, 1.1], n: 7 }));
  // mirador en lo alto
  Z.add(bx(20, 15.1, -47, 4, 0.2, 4, 'wood', '#9a7448'), ...[-1.8, 1.8].flatMap(x => [-1.8, 1.8].map(z => cy(20 + x, 15.4, -47 + z, 0.12, 4.8, 'wood', '#5a3d26', { n: 6 }))), py(20, 17.7, -47, 5.2, 1.4, 5.2, 'roof', '#d9b96a'), place(stairs(1.6, 7, 0.3143, 0.45, 'wood', '#8a6a45'), 14.85, 13, -47, -PI / 2), bx(20, 16, -48.9, 4, 0.1, 0.1, 'wood', '#5a3d26'), bx(21.9, 16, -47, 0.1, 0.1, 4, 'wood', '#5a3d26'));
  Z.n(<P.Bench pos={[0, 13, -48.4]} />).label('Mirador del cafetal', 20, 19.4, -47, 0.6).label('Cafetales de Marcala', 0, 7.5, -14, 0.8);
  Z.veg('pine', 34, (x, z) => (Math.abs(x) > 46 || z < -49 || z > 48) && !inR(x, z, 12, 26, -52, -44), { sep: 5 }); Z.veg('tree', 22, (x, z) => z > 0 && (Math.abs(x) > 30 || z > 46), { sep: 5.5 }); Z.veg('bush', 18, (x, z) => z > 23 && Math.abs(x) > 5 && Math.abs(x) < 46 && !inR(x, z, 18, 32, 24, 36) && !inR(x, z, -14, 10, 22, 48), { sep: 3 });
  Z.add(place(mont(100, 70, '#3a6f4a'), -160, 0, -180), place(mont(110, 85, '#2f6442'), 150, 0, -200), place(mont(80, 50, '#3a6f4a'), 0, 0, -260));
  Z.trail([[0, 36], [0, 2]], 4).trail([[0, -7], [0, -44]], 5).coin(8, 13, -47).coin(16.6, 14.3, -47).coin(13, 0, 19.5);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -50, maxZ: 50 },
    npc: { pos: [3.6, 0, 7], name: 'Don Rigo', look: { hat: 'sombrero_junco', shirt: 'camisa_cuadros', shirtColor: '#d62828', pants: 'jeans', face: 'cara_bigote', skin: '#c98f5f' }, icon: '☕' },
    gem: [20.8, 15.2, -47], gemColor: '#b23a2a',
  });
}

/** Lempira: el Fuerte San Cristóbal en su cerro sobre Gracias: muros blancos, garitas, cañones y bandera. */
export function fuerte(d: Department): ZoneSpec {
  const Z = new ZB(d, (x, z) => 8 * ss(43, 17, dist(x, z, 0, -20))), B = Z.bio, W = '#f2efe6', Y = 8, way: [number, number][] = [[0, 52], [0, -9]];
  Z.layer('grass', B.grass).layer('cobble', '#a59d92', (x, z) => (1.9 - distToPath(x, z, way)) * 2).layer('dirt', '#c2a878', (x, z) => Math.min(12.4 - Math.abs(x), 10.4 - Math.abs(z + 20)) * 1.5);
  Z.stop(0, 42);
  Z.add(bx(0, Y + 1.3, -31, 27.2, 2.6, 1.2, 'stucco', W), bx(-7.65, Y + 1.3, -9, 11.9, 2.6, 1.2, 'stucco', W), bx(7.65, Y + 1.3, -9, 11.9, 2.6, 1.2, 'stucco', W), bx(0, Y + 2.9, -9, 5.4, 1.2, 1.4, 'stucco', W), bx(0, Y + 3.9, -9, 2.2, 0.9, 1, 'stucco', W, { solid: false }), bl(0, Y + 3.85, -8.5, 0.22, 'gold', '#d9a520', { n: 7 }),
    bx(-13, Y + 1.3, -20, 1.2, 2.6, 20.8, 'stucco', W), bx(13, Y + 1.3, -20, 1.2, 2.6, 20.8, 'stucco', W), ...[-1, 1].flatMap(s => [bx(s * 13, Y + 1.3, -31, 3.6, 2.6, 3.6, 'stucco', W), bx(s * 13, Y + 1.3, -9, 3.2, 2.6, 3.2, 'stucco', W), ...place(garita(W), s * 13, Y + 2.6, -9)]), ...place(garita(W), -13, Y + 2.6, -31),
    bx(0, Y + 0.3, -31.65, 30, 0.6, 0.12, 'stucco', '#dda15e', { solid: false }), bx(0, Y + 0.3, -8.35, 30, 0.6, 0.12, 'stucco', '#dda15e', { solid: false }), bx(-13.65, Y + 0.3, -20, 0.12, 0.6, 24, 'stucco', '#dda15e', { solid: false }), bx(13.65, Y + 0.3, -20, 0.12, 0.6, 24, 'stucco', '#dda15e', { solid: false }),
    bx(0, Y + 0.7, -29.6, 24.8, 1.4, 1.6, 'stone', '#cfc8b8'), place(stairs(2, 4, 0.35, 0.5, 'stone', '#cfc8b8'), -8, Y, -26.8), place(cannon(), -5, Y, -6.2), place(cannon(), 5, Y, -6.2), place(cannon(), -6, Y + 1.4, -29.7, PI), place(cannon(), 6, Y + 1.4, -29.7, PI),
    bx(7, Y + 0.6, -24.6, 2.8, 1.2, 1.6, 'stone', '#e9e4d8'), bx(7, Y + 1.27, -24.6, 3.1, 0.14, 1.9, 'stone', '#cfc8b8', { solid: false }), bx(7, Y + 1.9, -24.6, 0.16, 1.1, 0.16, 'stone', '#3a3a3a', { solid: false }), bx(7, Y + 2.1, -24.6, 0.6, 0.16, 0.16, 'stone', '#3a3a3a', { solid: false }),
    cy(-7, Y + 0.45, -15, 0.95, 0.9, 'stone', '#cfc8b8', { n: 10 }), cy(-7, Y + 0.86, -15, 0.75, 0.1, 'water', '#3aa6d8', { n: 10, solid: false }));
  Z.put(casa(6, 3.6, 2.4, W, '#b5523b', '#dda15e'), 9.4, -15.5, -PI / 2);
  Z.plaque('Fuerte San Cristóbal', 0, Y + 2.95, -8.27, 0, 0.45, '#7a4a2b').plaque('Mausoleo de Juan Lindo', 7, Y + 0.7, -23.77, 0, 0.22).n(<P.Flag pos={[0, Y, -20]} height={9} />);
  // Gracias, al pie del cerro
  Z.n(<P.House pos={[13, 0, 31]} rot={-PI / 2} color="#f7f1e3" />).n(<P.House pos={[-14, 0, 34]} rot={PI / 2} color="#dda15e" />).n(<P.Statue pos={[-9, 0, 23.5]} color="#8a6a3a" />).n(<P.Bench pos={[-12.5, 0, 26]} rot={PI / 2} />).n(<P.Lamp pos={[3.4, 0, 28]} />).n(<P.Lamp pos={[-3.4, Z.h(-3.4, 14), 14]} />).n(<P.Flowers pos={[-7, 0, 25.6]} />);
  Z.plaque('Cacique Lempira', -9, 0.9, 24.23, 0, 0.26).put(casa(6, 5, 3, '#f7f1e3'), 15, 44, -PI / 2).put(casa(6, 5, 3, '#ffe0a8'), -24, 26, PI / 2).put(casa(7, 5, 3, '#f7f1e3'), 24, 36, -PI / 2).put(iglesia(7, 5, 10), 31, 22, -PI / 2);
  const hill = (x: number, z: number) => dist(x, z, 0, -20);
  Z.veg('pine', 50, (x, z) => hill(x, z) > 20 && distToPath(x, z, way) > 4 && !inR(x, z, -30, 38, 16, 50), { sep: 5 }); Z.veg('tree', 18, (x, z) => hill(x, z) > 30 && distToPath(x, z, way) > 5 && !inR(x, z, -30, 38, 16, 50), { sep: 5.5 });
  Z.veg('bush', 22, (x, z) => hill(x, z) > 19 && hill(x, z) < 46 && distToPath(x, z, way) > 3, { sep: 3 }); Z.veg('rock', 14, (x, z) => hill(x, z) > 18.5 && hill(x, z) < 34 && distToPath(x, z, way) > 3, { sep: 4, colors: [B.rock] });
  Z.add(place(mont(120, 110, '#2f6b4a'), -150, 0, -230), place(mont(90, 70, '#3a7a55'), 120, 0, -210), place(mont(80, 55, '#3a7a55'), -230, 0, -20));
  Z.trail([[0, 36], [0, -7]], 7).coin(0, Y, -14).coin(-4, Y, -22).coin(2, Y + 1.4, -29.6).coin(9, Y + 1.4, -29.6).coin(9.5, Y + 2.6, -31);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -44, maxZ: 50 },
    npc: { pos: [-5.4, 0, 25], name: 'Don Macario', look: { hat: 'sombrero_junco', shirt: 'camisa_manta', shirtColor: '#f2e6cf', pants: 'pantalon_manta', pantsColor: '#f2e6cf', acc: 'banda_bandera', skin: '#a56b43' }, icon: '🏹' },
    gem: [13, Y + 2.6, -31], gemColor: '#dda15e',
  });
}

/** Santa Bárbara: calle de talleres de junco (sombreros, canastas, petates) y el sombrero gigante de la plaza. */
export function artesania(d: Department): ZoneSpec {
  const Z = new ZB(d, () => 0), ST = '#e8d28a', r = Z.rand;
  Z.layer('grass', Z.bio.grass).layer('cobble', '#a8a094', (x, z) => Math.max(Math.min(3.6 - Math.abs(x), z + 14, 52 - z), 9.6 - dist(x, z, 0, -21)) * 1.5);
  Z.stop(0, 42);
  const shelf: Pc[] = [bx(0, 0.9, -1.5, 4.6, 0.07, 0.75, 'wood', '#8a5a34'), bx(0, 1.6, -1.5, 4.6, 0.07, 0.75, 'wood', '#8a5a34'), bx(-2.2, 0.85, -1.5, 0.1, 1.7, 0.7, 'wood', '#5a3d26', { solid: false }), bx(2.2, 0.85, -1.5, 0.1, 1.7, 0.7, 'wood', '#5a3d26', { solid: false })];
  const taller = (kind: number): Pc[] => [...champa(5.6, 4.2, '#b5523b'), ...shelf,
    ...(kind === 0 ? [0.94, 1.64].flatMap(y => [-1.6, -0.55, 0.5, 1.55].flatMap(x => hat(x, y, -1.5, 0.95, r() < 0.3 ? '#f2e6b8' : ST))).concat(hat(0, 0.86, 0.6, 1.2), bx(0, 0.4, 0.6, 1.4, 0.8, 0.8, 'wood', '#8a5a34'))
      : kind === 1 ? [0.94, 1.64].flatMap(y => [-1.5, 0, 1.5].flatMap(x => basket(x, y, -1.5, 0.9))).concat(basket(-1, 0, 0.7, 1.5), basket(0.4, 0, 0.9, 1.1), basket(1.4, 0, 0.4, 1.3, '#b98a45'))
        : kind === 2 ? [...[-1.2, 0, 1.2].map(x => cy(x, 1.12, -1.5, 0.2, 0.7, 'cloth', ST, { e: [PI / 2, 0, 0], n: 8 })), bx(0, 0.03, 0.7, 2.6, 0.05, 1.6, 'cloth', ST, { solid: false }), bx(0, 0.05, 0.7, 2.6, 0.05, 0.25, 'cloth', '#c0392b', { solid: false }), bx(0, 0.05, 0.2, 2.6, 0.05, 0.12, 'cloth', '#2e7d32', { solid: false }), bx(0, 0.05, 1.2, 2.6, 0.05, 0.12, 'cloth', '#2e7d32', { solid: false }), cy(-1.8, 0.9, 0.9, 0.22, 1.8, 'cloth', ST, { n: 8 })]
          : [...Array.from({ length: 9 }, (_, i) => cy(-1.6 + i * 0.4, 1.1, -1.2, 0.05, 2.3, 'leaf', i % 2 ? '#a8b858' : '#8aa648', { e: [-0.25, 0, (i - 4) * 0.03], n: 5 })), bx(0, 0.25, 0.6, 1.6, 0.5, 0.5, 'leaf', '#a8b858', { solid: false }), bx(0, 0.55, 0.6, 1.7, 0.1, 0.12, 'wood', '#5a3d26', { solid: false })])];
  [[-9.6, 24, 0], [9.6, 24, 1], [-9.6, 10, 2], [9.6, 10, 3], [-9.6, -4, 1], [9.6, -4, 0]].forEach(([x, z, k]) => Z.put(taller(k), x, z, x < 0 ? PI / 2 : -PI / 2));
  Z.n(<P.Stall pos={[4.9, 0, 17]} rot={-PI / 2} sign="Sombreros" color="#e76f51" />).n(<P.Stall pos={[-4.9, 0, 3]} rot={PI / 2} sign="Canastas" color="#f4e285" />).n(<P.Stall pos={[4.9, 0, -9.5]} rot={-PI / 2} sign="Petates" color="#2a9d8f" />);
  Z.add(place(bunting(7.2, 4.2, ['#e76f51', '#f4e285', '#2a9d8f']), -3.6, 0, 30.5), bx(-3.7, 2.2, 30.5, 0.16, 4.4, 0.16, 'wood', '#5a3d26'), bx(3.7, 2.2, 30.5, 0.16, 4.4, 0.16, 'wood', '#5a3d26'));
  // el sombrero de junco gigante
  Z.add(cy(0, 0.15, -21, 5, 0.3, 'stone', '#cfc8b8', { n: 22 }), cy(0, 0.45, -21, 4.6, 0.3, 'stone', '#d9d2c2', { n: 22 }), cy(0, 0.8, -21, 4.2, 0.4, 'cloth', ST, { n: 26 }), cy(0, 1.95, -21, 1.9, 1.9, 'cloth', ST, { n: 22, rt: 0.88 }), cy(0, 1.2, -21, 1.96, 0.4, 'cloth', '#b5523b', { n: 22, solid: false }),
    cy(0, 1.02, -21, 4.22, 0.06, 'cloth', '#c9b060', { n: 26, solid: false }), cy(2.6, 1.375, -19.2, 0.8, 0.75, 'wood', '#c9a55a', { n: 12, rt: 1.1 }), cy(2.6, 1.72, -19.2, 0.92, 0.08, 'wood', '#a5803a', { n: 12, solid: false }));
  Z.n(<P.Sign pos={[7.4, 0, -13.4]} rot={-0.6} text="Sombrero de junco gigante" />).label('Artesanías de junco', 0, 5.2, -21, 0.75);
  Z.n(<P.House pos={[-21, 0, -19]} rot={PI / 2} color="#e76f51" sign="Museo del junco" />).n(<P.House pos={[21, 0, -21]} rot={-PI / 2} color="#f4e285" />).n(<P.Bench pos={[-7.5, 0, -15]} rot={0.9} />).n(<P.Lamp pos={[-3.9, 0, 32]} />).n(<P.Lamp pos={[3.9, 0, 3]} />).n(<P.Lamp pos={[-3.9, 0, -11]} />);
  Z.put(casa(6, 5, 3, '#f7f1e3'), 22, 8, -PI / 2).put(casa(6, 5, 3, '#ffd9c2'), -22, 5, PI / 2).put(casa(7, 5, 3, '#f4e285'), 22, 30, -PI / 2).put(casa(6, 5, 3, '#f7f1e3'), -22, 22, PI / 2).put(casa(7, 5, 3, '#f7d9c4'), 0, -36, 0);
  Z.veg('reed', 60, (x, z) => inR(x, z, 30, 47, -12, 22), { sep: 1.8 }); Z.n(<P.Sign pos={[28.5, 0, 16]} rot={-PI / 2} text="Junco creciendo" />);
  const town = (x: number, z: number) => inR(x, z, -27, 27, -40, 48) || inR(x, z, 27, 48, -14, 24);
  Z.veg('pine', 40, (x, z) => !town(x, z), { sep: 5 }); Z.veg('tree', 26, (x, z) => !town(x, z), { sep: 5.5 }); Z.veg('bush', 22, (x, z) => !town(x, z) && Math.abs(x) < 48 && Math.abs(z) < 50, { sep: 3 });
  for (const [x, z] of [[-13, -9], [13, -12], [-14, 17], [14, 17]]) Z.n(<P.Tree pos={[x, 0, z]} seed={x * z} />);
  Z.add(place(mont(130, 115, '#2f6b4a'), 10, 0, -240), place(mont(90, 60, '#3a7a55'), -190, 0, -120), place(mont(90, 65, '#3a7a55'), 200, 0, -110));
  Z.trail([[0, 36], [0, -10]], 8).coin(-6.6, 0, -21).coin(0, 0.6, -25.6).coin(-3, 1, -21).coin(2.6, 1.75, -19.2);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -40, maxZ: 50 },
    npc: { pos: [-5.2, 0, 12.5], rot: PI / 2, name: 'Doña Mencha', look: { hair: 'pelo_coleta', hat: 'sombrero_junco', shirt: 'blusa_tipica', shirtColor: '#e76f51', pants: 'falda_tipica', skin: '#c98f5f', face: 'cara_feliz' }, icon: '👒' },
    gem: [0, 2.9, -21], gemColor: '#f4e285',
  });
}
