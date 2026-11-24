import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { FallingFish } from '../fx';
import { bl, bx, cy, inR, PI, place, py } from '../lib';
import { casa, fish, iglesia, mont } from '../parts';
import { ZB, type ZoneSpec } from '../zone';
import { YoroDescubrimientos } from './YoroDescubrimientos';

/** Yoro: el pueblo donde «llueven peces». Llueve, hay peces en el suelo y pececitos cayendo del cielo. */
export function lluvia(d: Department): ZoneSpec {
  const Z = new ZB(d, () => 0),
    r = Z.rand;
  Z.layer('grass', Z.bio.grass)
    .layer(
      'cobble',
      '#9a9a94',
      (x, z) =>
        Math.max(Math.min(16 - Math.abs(x), 14 - Math.abs(z + 2)), Math.min(3 - Math.abs(x), z - 10, 52 - z)) * 1.5,
    )
    .layer('dirt', '#7a6248', (x, z) => Math.min(-21 - x, 27 - Math.abs(z - 4)) / 2);
  Z.stop(0, 42);
  Z.n(<YoroDescubrimientos altura={Z.h} />);
  Z.put(iglesia(9, 6, 13, '#fdfbf3'), 0, -26)
    .n(<P.Kiosk pos={[0, 0, -2]} />)
    .plaque('Parroquia de Yoro', 0, 3.4, -18.92, 0, 0.4, '#4d908e');
  // monumento al pez
  Z.add(
    cy(11, 0.3, 6, 2.2, 0.6, 'stone', '#cfd3d6', { n: 12 }),
    cy(11, 0.57, 6, 1.9, 0.1, 'water', '#3aa6d8', { n: 12, solid: false }),
    cy(11, 1.3, 6, 0.4, 2, 'stone', '#cfd3d6', { n: 8 }),
    bl(11, 3, 6, 1.05, 'metal', '#c9d6df', { s: [1.9, 0.8, 0.5], e: [0, 0.5, 0.45] }),
    py(9.7, 2.1, 6.7, 1, 1.2, 0.3, 'metal', '#c9d6df', { e: [0, 0.5, 2.0] }),
    bx(11.2, 3.75, 5.9, 0.7, 0.6, 0.1, 'metal', '#9fb4c2', { e: [0, 0.5, 0.45] }),
    bl(11.95, 3.65, 5.75, 0.12, 'plastic', '#1d1d1f', { n: 6 }),
  );
  Z.plaque('Monumento a la Lluvia de Peces', 11, 0.95, 8.3, 0, 0.3, '#4d908e').add(
    bx(11, 0.95, 8.22, 4.6, 0.5, 0.12, 'stone', '#cfd3d6'),
  );
  // mercadito de techo plano: se sube por las cajas hasta el recuerdo
  Z.add(
    bx(-12, 1.6, -10, 5, 3.2, 4, 'stucco', '#f9c74f'),
    bx(-12, 2.6, -7.5, 5, 0.1, 1.3, 'cloth', '#e63946', { e: [0.25, 0, 0] }),
    bx(-12, 1.1, -7.97, 1.2, 2.2, 0.08, 'wood', '#6b3f22', { solid: false }),
    bx(-12, 3.3, -10, 5.3, 0.2, 4.3, 'stucco', '#e0a92f', { solid: false }),
  );
  Z.plaque('Mercadito', -12, 2.95, -7.96, 0, 0.36, '#4d908e')
    .n(<P.Crate pos={[-8.7, 0, -8.9]} />)
    .n(<P.Crate pos={[-8.95, 0, -10.4]} />)
    .n(<P.Crate pos={[-8.95, 1, -10.4]} />);
  // pancarta del festival y casas
  Z.add(
    bx(-4.6, 2.6, 15, 0.2, 5.2, 0.2, 'wood', '#5a3d26'),
    bx(4.6, 2.6, 15, 0.2, 5.2, 0.2, 'wood', '#5a3d26'),
    bx(0, 4.5, 15, 9.2, 1.1, 0.08, 'cloth', '#f9c74f', { solid: false }),
  );
  Z.plaque('Festival de la Lluvia de Peces', 0, 4.5, 15.06, 0, 0.5, '#4d908e');
  Z.n(<P.House pos={[13, 0, 23]} rot={-PI / 2} color="#f9c74f" sign="Comedor" />)
    .n(<P.House pos={[-13, 0, 24]} rot={PI / 2} color="#bfe3df" />)
    .n(<P.House pos={[23, 0, -6]} rot={-PI / 2} color="#f7f1e3" />);
  Z.put(casa(6, 5, 3, '#ffd9a0'), 23, 7, -PI / 2)
    .put(casa(6, 5, 3, '#f4c7a1'), 13.5, 36, -PI / 2)
    .put(casa(7, 5, 3, '#cfe8c0'), 21, -20, -PI / 2)
    .put(casa(6, 5, 3, '#f7f1e3'), -20, -26, PI / 2);
  for (const [x, z] of [
    [-9, 8],
    [9, -11],
    [-9, -1],
  ])
    Z.n(<P.Lamp pos={[x, 0, z]} />);
  Z.n(<P.Bench pos={[-6, 0, -2]} rot={PI / 2} />)
    .n(<P.Bench pos={[6, 0, -2]} rot={-PI / 2} />)
    .n(<P.Tree pos={[13, 0, -13]} seed={1} />)
    .n(<P.Tree pos={[-13, 0, 9]} seed={2} />)
    .n(<P.Tree pos={[13.5, 0, 12]} seed={3} />);
  Z.n(<P.Sign pos={[-19.5, 0, 9]} rot={PI / 2} text="El Pantano: ¿lluvia de peces?" />);
  // peces en el suelo y charcos
  const blocked = (x: number, z: number) =>
    inR(x, z, -15, -7, -13, -7) ||
    inR(x, z, -5, 5, -33, -18) ||
    Math.hypot(x, z + 2) < 3.4 ||
    Math.hypot(x - 11, z - 6) < 2.6 ||
    inR(x, z, 9, 27, -24, 40) ||
    inR(x, z, -17, -9, 20, 28);
  for (let i = 0, n = 0; n < 74 && i < 2000; i++) {
    const field = r() < 0.5,
      x = field ? -24 - r() * 22 : (r() * 2 - 1) * 18,
      z = field ? -20 + r() * 46 : -16 + r() * 60;
    if (blocked(x, z)) continue;
    n++;
    Z.add(fish(x, 0.04, z, r() * 6.3, 0.75 + r() * 0.7, r() < 0.75 ? '#c9d6df' : '#8fb8d0'));
  }
  for (let i = 0; i < 13; i++) {
    const x = i < 9 ? -25 - r() * 20 : (r() * 2 - 1) * 14,
      z = i < 9 ? -18 + r() * 42 : 14 + r() * 30;
    Z.add(cy(x, 0.04, z, 1 + r() * 1.6, 0.05, 'water', '#6aa9c9', { n: 12, solid: false }));
  }
  Z.n(<FallingFish ground={Z.h} />);
  Z.veg('tree', 40, (x, z) => (Math.abs(x) > 30 && !inR(x, z, -48, -20, -24, 32)) || z > 50 || z < -36, { sep: 5.5 });
  Z.veg('bush', 20, (x, z) => Math.abs(x) > 27 && Math.abs(x) < 47 && !inR(x, z, -48, -20, -24, 32), { sep: 3 });
  Z.veg('reed', 30, (x, z) => inR(x, z, -47, -23, -22, 30), { sep: 2.5 });
  Z.add(
    place(mont(90, 55, '#35743f'), -180, 0, -100),
    place(mont(100, 65, '#2f6b3a'), 170, 0, -140),
    place(mont(90, 50, '#35743f'), 20, 0, -230),
  );
  Z.trail(
    [
      [0, 36],
      [0, 15],
      [5, 6],
      [4.5, -9],
      [0, -16.5],
    ],
    7,
  )
    .coin(-28, 0, 0)
    .coin(-34, 0, 10)
    .coin(-30, 0, -12)
    .coin(-8.95, 2, -10.4)
    .coin(11, 0, 12);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -34, maxZ: 50 },
    sky: { weather: 'lluvia' },
    npc: {
      pos: [4.6, 0, 4],
      name: 'Doña Rosa',
      look: {
        hair: 'pelo_coleta',
        shirt: 'blusa_tipica',
        shirtColor: '#f9c74f',
        pants: 'falda_tipica',
        skin: '#a56b43',
        face: 'cara_feliz',
      },
      icon: '🐟',
    },
    gem: [-12, 3.4, -10],
    gemColor: '#c9d6df',
  });
}
