import type { Department } from '../../../core/types';
import { P } from '../../kit';
import { detalleFino } from '../casas';
import { estelaMaya } from '../famosos';
import { bl, bx, cy, distToPath, inR, type Pc, PI, place } from '../lib';
import { mont, stairs } from '../parts';
import { ZB, type ZoneSpec } from '../zone';
import { CopanDescubrimientos } from './CopanDescubrimientos';

const C = '#b5ab95',
  CD = '#8f866f';
/** Estela con retrato tallado (famosos.estelaMaya: el cuerpo sólido es el mismo de antes) y su altar. */
const estela = (): Pc[] => [...estelaMaya(3.4), cy(0, 0.28, 1.5, 0.75, 0.56, 'stone', C, { n: 8 })];
/** Copán: la Gran Plaza con estelas, la pirámide de la Escalinata Jeroglífica (se observa desde el sendero), el Juego de Pelota y guacamayas. */
export function ruinas(d: Department): ZoneSpec {
  const Z = new ZB(d, () => 0);
  Z.layer('grass', Z.bio.grass).layer(
    'dirt',
    '#b89a6a',
    (x, z) =>
      (1.8 -
        distToPath(x, z, [
          [0, 50],
          [0, 17],
        ])) *
      2,
  );
  Z.stop(0, 42);
  Z.n(<CopanDescubrimientos />);
  // pirámide escalonada con escalinata central y templo arriba
  for (let i = 0; i < 6; i++) {
    const hf = 11 - 1.6 * i;
    Z.add(
      bx(0, 0.7 + 1.4 * i, -18, hf * 2, 1.4, hf * 2, 'stone', i % 2 ? '#aea48d' : C),
      bx(-2.95, 1.4 * i + 1.05, -7 - 1.6 * i + 0.28, 0.62, 0.62, 0.5, 'stone', CD, { solid: false }),
      bx(2.95, 1.4 * i + 1.05, -7 - 1.6 * i + 0.28, 0.62, 0.62, 0.5, 'stone', CD, { solid: false }),
    );
  }
  Z.add(
    place(stairs(5, 24, 0.35, 0.4, 'stone', '#cdbf9f'), 0, 0, -5.4),
    bx(0, 9.6, -20.5, 5.2, 2.4, 0.8, 'stone', C),
    bx(-2.3, 9.6, -19, 0.6, 2.4, 2.6, 'stone', C),
    bx(2.3, 9.6, -19, 0.6, 2.4, 2.6, 'stone', C),
    bx(0, 11.05, -19.3, 5.8, 0.5, 3.6, 'stone', CD),
    bx(0, 11.9, -19.6, 3.4, 1.2, 1, 'stone', C, { solid: false }),
    bx(0, 12.7, -19.6, 2, 0.5, 0.8, 'stone', CD, { solid: false }),
  );
  // la Escalinata Jeroglífica: glifos en cada contrahuella, figuras sentadas en el eje, alfardas y la lona que la
  // protege (todo decorado: la escalera sólida es la de arriba)
  {
    const fino = detalleFino(),
      n = 24,
      rise = 0.35,
      run = 0.4,
      z0 = -5.4,
      k = fino ? 5 : 2;
    for (let i = 0; i < n; i++)
      for (let g = 0; g < k; g++) {
        const w = 4.6 / k,
          x = -2.3 + w * (g + 0.5),
          y = rise * i + rise / 2,
          z = z0 - run * i + 0.02;
        Z.add(bx(x, y, z, w - 0.08, rise - 0.1, 0.03, 'stone', (i + g) % 3 ? CD : '#9c9078', { solid: false }));
        if (fino && (i + g) % 2) Z.add(bl(x, y, z + 0.02, 0.08, 'stone', '#7c725f', { s: [1.2, 1, 0.4], n: 6 }));
      }
    for (const i of [5, 11, 17]) {
      const y = rise * (i + 1),
        z = z0 - run * (i + 0.6);
      Z.add(
        bx(0, y + 0.35, z, 0.8, 0.7, 0.5, 'stone', C, { solid: false }),
        bl(0, y + 0.95, z + 0.05, 0.28, 'stone', C, { n: 8 }),
        bx(0, y + 1.3, z, 0.7, 0.28, 0.45, 'stone', CD, { solid: false }),
      );
    }
    const ang = Math.atan2(rise, run),
      top = n * rise,
      len = Math.hypot(top, n * run),
      zc = z0 - (n * run) / 2,
      ty = top + 2.4,
      tilt = ang * 0.3;
    for (const sx of [-1, 1])
      Z.add(bx(sx * 2.75, top / 2 + 0.25, zc, 0.5, 0.5, len, 'stone', CD, { e: [ang, 0, 0], solid: false }));
    Z.add(bx(0, ty, zc, 8, 0.05, n * run + 2.4, 'cloth', '#d9d1bd', { e: [tilt, 0, 0], solid: false }));
    for (const sx of [-1, 1])
      for (const zz of [z0 + 1, zc, z0 - n * run - 0.4]) {
        const hh = ty - (zz - zc) * Math.tan(tilt);
        Z.add(cy(sx * 3.9, hh / 2, zz, 0.07, hh, 'metal', '#8a9096', { n: 6, solid: false }));
      }
  }
  Z.n(<P.Sign pos={[5, 0, -4.4]} rot={-0.3} text="Escalinata Jeroglífica" />);
  // estelas de la Gran Plaza
  (
    [
      [-10, 10, 'Estela A'],
      [10, 10, 'Estela B'],
      [-14, 1, 'Estela C'],
      [14, 1, 'Estela H'],
      [-9, -4, 'Estela D'],
      [9, -4, 'Estela F'],
    ] as [number, number, string][]
  ).forEach(([x, z, name]) => {
    Z.put(estela(), x, z);
    Z.plaque(name, x, 0.3, z + 2.27, 0, 0.26);
  });
  Z.add(
    bx(-21, 0.55, -6, 1.8, 1.1, 1.8, 'stone', C),
    bx(-21, 1.15, -6, 2, 0.14, 2, 'stone', CD, { solid: false }),
    ...[-0.6, -0.2, 0.2, 0.6].map((o) => bx(-21 + o, 0.65, -5.07, 0.28, 0.6, 0.08, 'stone', CD, { solid: false })),
  );
  Z.plaque('Altar Q', -21, 0.2, -5.02, 0, 0.24);
  // acrópolis (oeste) con escalinata y templo
  Z.add(
    bx(-31, 1, -18, 16, 2, 20, 'stone', C),
    place(stairs(7, 6, 0.3334, 0.45, 'stone', '#cdbf9f'), -20.3, 0, -18, PI / 2),
    bx(-33, 3.4, -20, 7, 2.8, 7, 'stone', '#aea48d'),
    bx(-33, 5.05, -20, 7.6, 0.5, 7.6, 'stone', CD),
    bx(-33, 5.9, -20, 4, 1.2, 1.2, 'stone', C, { solid: false }),
    bx(-29.45, 3, -20, 0.12, 2, 1.4, 'stone', '#2b2b2b', { solid: false }),
  );
  Z.plaque('Acrópolis', -22.95, 1.4, -13.5, PI / 2, 0.4);
  // juego de pelota (este)
  const court: Pc[] = [-1, 1].flatMap((s) => [
    bx(s * 4.1, 0.35, 0, 2.2, 0.7, 20, 'stone', C),
    bx(s * 6.2, 0.85, 0, 3, 1.7, 20, 'stone', '#aea48d'),
    bx(s * 8, 1.7, 0, 2.6, 3.4, 16, 'stone', C),
    bx(s * 8, 3.6, 0, 3, 0.4, 16.4, 'stone', CD, { solid: false }),
    ...[-7, 0, 7].map((z) => bl(s * 5.1, 1.9, z, 0.3, 'plastic', '#c0392b', { s: [1.5, 1, 1], n: 7 })),
    // muro en talud de la cancha (donde rebotaba la pelota), cabezas de guacamaya talladas y los cuartos de arriba
    bx(s * 5.75, 1.2, 0, 1.97, 0.12, 19.6, 'stone', '#c4b79a', { e: [0, 0, s * 0.53], solid: false }),
    ...[-7, 0, 7].flatMap((z) => [
      bl(s * 6.75, 2.05, z, 0.32, 'stone', '#a8987a', { s: [0.9, 1, 1.2], n: 8 }),
      bx(s * 6.42, 2.0, z, 0.32, 0.12, 0.2, 'stone', '#8c7c60', { e: [0, 0, s * 0.5], solid: false }),
    ]),
    bx(s * 8, 4.5, 0, 2.2, 1.4, 7, 'stone', C, { solid: false }),
    bx(s * 8, 5.3, 0, 2.5, 0.22, 7.3, 'stone', CD, { solid: false }),
    ...[-2, 0, 2].map((z) => bx(s * 6.88, 4.4, z, 0.04, 1, 0.7, 'plastic', '#211d18', { solid: false })),
  ]);
  Z.put([...court, ...[-7, 0, 7].map((z) => cy(0, 0.03, z, 0.55, 0.06, 'stone', CD, { n: 10, solid: false }))], 27, 2);
  Z.label('Juego de Pelota', 27, 5.4, 2, 0.7).label('Gran Plaza de Copán', 0, 5.2, 12, 0.7);
  // guacamayas, ceiba y selva alrededor
  Z.n(<P.Macaw pos={[-10, 3.63, 10]} />)
    .n(<P.Macaw pos={[14, 3.63, 1]} rot={2} />)
    .n(<P.Macaw pos={[0, 9, 6]} flying />)
    .n(<P.Macaw pos={[20, 8, -8]} flying />)
    .n(<P.Macaw pos={[-18, 10, -2]} flying />);
  Z.n(<P.Tree pos={[-22, 0, 12]} scale={2.2} seed={3} />)
    .n(<P.Tree pos={[21, 0, 21]} scale={1.4} seed={8} />)
    .n(<P.Tree pos={[-12, 0, 27]} scale={1.3} seed={2} />)
    .n(<P.Stall pos={[8, 0, 29]} rot={-PI / 2} sign="Guías de Copán" color="#6a994e" />)
    .n(<P.Rock pos={[17, 0, 12]} />)
    .n(<P.Rock pos={[-17, 0, -9]} seed={4} />);
  const site = (x: number, z: number) => inR(x, z, -41, 38, -32, 48);
  Z.veg('jungle', 64, (x, z) => !site(x, z), { sep: 6 });
  Z.veg(
    'tree',
    26,
    (x, z) =>
      !site(x, z) || (inR(x, z, -40, -24, 2, 40) && Math.hypot(x + 22, z - 12) > 5) || inR(x, z, 16, 37, 24, 46),
    { sep: 5 },
  );
  Z.veg('bush', 26, (x, z) => !inR(x, z, -20, 38, -32, 48) && Math.abs(x) < 48 && !inR(x, z, -40, -18, -30, -5), {
    sep: 3,
  });
  Z.veg('fern', 30, (x, z) => !site(x, z) && Math.abs(x) < 52 && Math.abs(z) < 56, { sep: 2.5 });
  Z.add(
    place(mont(80, 45, '#3f7f48'), -170, 0, -120),
    place(mont(90, 55, '#35743f'), 150, 0, -160),
    place(mont(80, 40, '#3f7f48'), 190, 0, 60),
  );
  Z.trail(
    [
      [0, 36],
      [0, 0],
    ],
    6,
  )
    .coin(27, 0, -3)
    .coin(27, 0, 8);
  return Z.done({
    limit: { minX: -48, maxX: 48, minZ: -36, maxZ: 50 },
    bad: (_x, y) => y > 2.2,
    badMsg: 'Cuidá el patrimonio: observá desde el sendero y usá las réplicas',
    npc: {
      pos: [4.2, 0, 21],
      name: 'Ixchel',
      look: {
        hair: 'pelo_trenzas',
        shirt: 'camisa_manta',
        shirtColor: '#f2e6cf',
        pants: 'jeans',
        hat: 'casco_explorador',
        acc: 'collar_jade',
        skin: '#a56b43',
      },
      icon: '🗿',
    },
    gem: [-8, 0, 36],
    finds: [
      {
        id: 'postal',
        name: 'Postal del valle',
        icon: '🖼️',
        color: '#e7c77e',
        pos: [-6, 0, 38],
        fact: 'Llevate una postal y dejá el patrimonio en su sitio.',
      },
      {
        id: 'cuaderno',
        name: 'Cuaderno de práctica',
        icon: '📒',
        color: '#e7c77e',
        pos: [6, 0, 38],
        fact: 'Dibujá lo que observás sin tocar los monumentos.',
      },
      {
        id: 'mapa',
        name: 'Mapa de senderos',
        icon: '🗺️',
        color: '#e7c77e',
        pos: [-6, 0, 28],
        fact: 'Seguí los senderos para cuidar el sitio.',
      },
      {
        id: 'taza',
        name: 'Taza de recuerdo',
        icon: '☕',
        color: '#e7c77e',
        pos: [6, 0, 28],
        fact: 'Disfrutá un atol virtual de Santa Rosa.',
      },
      {
        id: 'ficha',
        name: 'Ficha de conservación',
        icon: '📋',
        color: '#e7c77e',
        pos: [-6, 0, 18],
        fact: 'Observá las aves sin perseguirlas ni alimentarlas.',
      },
    ],
    gemColor: '#3fbf7f',
  });
}
