// Orilla de la carretera para Manejo, Rapidito y los viajes: bermas de grava, cunetas, postes de luz con cables,
// señales, cercos de alambre, casas y comercios de carretera hechos con `dept/casas.ts` (con su rótulo pintado) y
// monte del lugar con `art.Flora`. En ciudad: bordillo, aceras, fachadas seguidas de casas y edificios, postes con
// la maraña de cables y árboles de acera.
// Todo va en un tramo de TRAMO metros que se repite COPIAS veces; el grupo corre con `distancia % TRAMO`, así que
// el tramo de adelante es igual al de atrás y no hay saltos. Cada tramo es una malla fusionada (una llamada), el monte
// otra y los rótulos otra. Decorado sin colisión: el manejo no usa la física de la escena.
import { useMemo } from 'react';
import type { V3 } from '../../../core/types';
import { casaHN, detalleFino, edificioHN, PASTEL } from '../../dept/casas';
import { bx, cy, type Pc, PI, place, rk, rng } from '../../dept/lib';
import { art } from '../../kit';
import type { FloraItem, FloraKind } from '../../kit/art/types';
import { Fundido, type Rotulo, Rotulos } from '../../minigames/kit/fundido';

export const TRAMO = 96;
export const COPIAS = 3;
/** z local donde empieza el primer tramo (detrás de la cámara, que va en z = 14) */
export const Z0 = 30;

const POSTE = '#bdb7ac',
  CABLE = '#1c1d1f',
  MADERA = '#5e4029';

/** Barrita de un punto a otro (cables, varillas): caja delgada a lo largo del segmento. */
function seg(a: V3, b: V3, r: number, c = CABLE, m: Pc['m'] = 'plastic'): Pc {
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    dz = b[2] - a[2],
    l = Math.hypot(dx, dy, dz) || 0.001;
  return bx((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2, r, r, l + r, m, c, {
    e: [-Math.asin(dy / l), Math.atan2(dx, dz), 0],
    solid: false,
  });
}
/** Cable colgado entre dos puntos con su panza (catenaria aproximada en n tramos). */
function cable(out: Pc[], a: V3, b: V3, panza: number, n = 6, r = 0.028) {
  let prev = a;
  for (let i = 1; i <= n; i++) {
    const t = i / n,
      p: V3 = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - panza * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t];
    out.push(seg(prev, p, r));
    prev = p;
  }
}
/** Poste de concreto con cruceta, aisladores y (a veces) transformador o lámpara hacia la calle. */
function poste(out: Pc[], x: number, z: number, hacia: number, o: { trafo?: boolean; lampara?: boolean }) {
  out.push(
    cy(x, 4.6, z, 0.13, 9.2, 'concrete', POSTE, { rt: 0.65, n: 8, solid: false }),
    bx(x, 8.55, z, 2.0, 0.12, 0.12, 'wood', MADERA, { solid: false }),
  );
  for (const k of [-0.85, -0.3, 0.55]) out.push(cy(x + k, 8.72, z, 0.05, 0.2, 'plastic', '#d9d4c7', { solid: false }));
  if (o.trafo)
    out.push(
      cy(x - hacia * 0.35, 7.4, z, 0.3, 0.85, 'metal', '#8e959b', { n: 10, solid: false }),
      cy(x - hacia * 0.35, 7.88, z, 0.32, 0.08, 'metal', '#6f767c', { n: 10, solid: false }),
    );
  if (o.lampara) {
    out.push(
      seg([x, 7.6, z], [x + hacia * 2.2, 8.0, z], 0.07, '#8e959b', 'metal'),
      bx(x + hacia * 2.4, 7.92, z, 0.6, 0.14, 0.26, 'metal', '#6f767c', { solid: false }),
      bx(x + hacia * 2.4, 7.83, z, 0.46, 0.04, 0.18, 'plastic', '#fff1c8', { em: 1.6, solid: false }),
    );
  }
}
/** Cerco de alambre de púas con postes de madera entre z0 y z1 (z0 > z1). */
function cerco(out: Pc[], x: number, z0: number, z1: number, r: () => number) {
  for (let z = z0; z > z1; z -= 2.6)
    out.push(cy(x, 0.6, z, 0.06, 1.2, 'wood', r() < 0.5 ? '#6d5236' : '#7c6043', { n: 6, solid: false }));
  for (const y of [0.45, 0.8, 1.1]) out.push(bx(x, y, (z0 + z1) / 2, 0.02, 0.02, z0 - z1, 'metal', '#5d5f61'));
}
/** Señal de tránsito redonda (límite de velocidad) o rombo amarillo de curva, mirando hacia +Z (al que viene). */
function senal(out: Pc[], rot: Rotulo[], x: number, z: number, tipo: 'limite' | 'curva' | 'tumulo') {
  out.push(cy(x, 1.1, z, 0.04, 2.2, 'metal', '#9aa0a6', { n: 6, solid: false }));
  if (tipo === 'limite') {
    out.push(cy(x, 2.4, z, 0.38, 0.03, 'plastic', '#d32f2f', { e: [PI / 2, 0, 0], n: 20, solid: false }));
    rot.push({ p: [x, 2.4, z + 0.03], w: 0.5, h: 0.5, text: '60', fg: '#111', bg: '#f7f7f2', letra: 'senal' });
  } else {
    out.push(bx(x, 2.35, z, 0.62, 0.62, 0.03, 'plastic', '#1d1f22', { e: [0, 0, PI / 4], solid: false }));
    out.push(bx(x, 2.35, z + 0.02, 0.56, 0.56, 0.02, 'plastic', '#f6c12d', { e: [0, 0, PI / 4], solid: false }));
    rot.push({
      p: [x, 2.35, z + 0.04],
      w: 0.42,
      h: 0.2,
      text: tipo === 'curva' ? '⟲ CURVA' : 'TÚMULO',
      fg: '#1d1f22',
      bg: '#f6c12d',
      letra: 'senal',
    });
  }
}
/** Mojón del kilómetro: poste corto de concreto blanco con la punta verde. */
const mojon = (out: Pc[], x: number, z: number) =>
  out.push(
    bx(x, 0.4, z, 0.22, 0.8, 0.14, 'concrete', '#efece4', { solid: false }),
    bx(x, 0.85, z, 0.24, 0.12, 0.16, 'concrete', '#2f7d46', { solid: false }),
  );

const NOMBRES_CARRETERA = [
  'PULPERÍA LA BENDICIÓN',
  'LLANTERA EL PRIMO',
  'COMEDOR DOÑA MARY',
  'TAJADAS Y LICUADOS',
  'FERRETERÍA EL MAESTRO',
  'VENTA DE ROSQUILLAS',
];
const NOMBRES_CIUDAD = [
  'FARMACIA SAN JUDAS',
  'BARBERÍA EL CHELE',
  'TORTILLERÍA LA ESPERANZA',
  'PULPERÍA DOS HERMANOS',
  'CENTRO DE COPIAS',
  'BALEADAS LA GORDA',
  'REPUESTOS EL TURCO',
  'SALÓN DE BELLEZA YESI',
  'FERRETERÍA LA LLAVE',
  'MERCADITO EL ÉXITO',
];
const ROTULOS = ['#c0392b', '#1f6f8b', '#2e7d32', '#e67e22', '#6a1b9a', '#f1c40f'];

interface Lote {
  pcs: Pc[];
  flora: FloraItem[];
  rot: Rotulo[];
}
/** Casa o comercio a un lado de la vía con la fachada hacia la calle. `lado` 1 = derecha (x > 0). */
function casaAlLado(L: Lote, lado: number, xf: number, z: number, o: Parameters<typeof casaHN>[0], nombre?: string) {
  const rot = lado > 0 ? -PI / 2 : PI / 2,
    x = lado * (xf + o.d / 2);
  L.pcs.push(...place(casaHN(o), x, 0, z, rot));
  if (o.comercio && nombre) {
    // rótulo pintado sobre la franja del comercio (local: y = h − 0.36, z = d/2 + 0.05)
    const lz = o.d / 2 + 0.05;
    L.rot.push({
      p: [x + lz * Math.sin(rot), o.h - 0.36, z + lz * Math.cos(rot)],
      r: rot,
      w: o.w - 0.6,
      h: 0.5,
      text: nombre,
      fg: '#fffdf4',
      bg: o.comercio,
    });
  }
}

/** Especies del monte según el paisaje del tramo o el bioma del departamento. */
function monteDe(biome: string, coastal: boolean): [FloraKind, number][] {
  if (coastal || biome === 'isla')
    return [
      ['palm', 5],
      ['oilpalm', 3],
      ['banana', 2],
      ['bush', 3],
    ];
  if (biome === 'montana' || biome === 'pinar' || biome === 'bosque')
    return [
      ['pine', 7],
      ['fern', 2],
      ['bush', 2],
      ['tree', 1],
    ];
  if (biome === 'selva')
    return [
      ['jungle', 4],
      ['giant', 1],
      ['banana', 2],
      ['fern', 3],
    ];
  if (biome === 'sur')
    return [
      ['dry', 4],
      ['tree', 3],
      ['bush', 2],
    ];
  return [
    ['tree', 5],
    ['bush', 3],
    ['banana', 1],
    ['dry', 1],
    ['flowers', 1],
  ];
}
const elegir = (l: [FloraKind, number][], t: number): FloraKind => {
  let k = t * l.reduce((a, [, w]) => a + w, 0);
  for (const [f, w] of l) if ((k -= w) <= 0) return f;
  return l[0][0];
};

/** Un tramo de carretera (z de 0 a −TRAMO). */
function tramoCarretera(biome: string, coastal: boolean, monte: boolean, seed: number, fino: boolean): Lote {
  const r = rng(seed),
    L: Lote = { pcs: [], flora: [], rot: [] },
    tierra = monte ? '#8a6a4c' : '#8f8576',
    especies = monteDe(biome, coastal),
    libres: [number, number, number][] = []; // [lado, z0, z1] sin casas: ahí va cerco y monte cerca
  // bermas de grava y cunetas de concreto a los dos lados
  for (const s of [-1, 1]) {
    L.pcs.push(bx(s * 8.55, 0.014, -TRAMO / 2, 1.6, 0.02, TRAMO, 'dirt', tierra, { solid: false }));
    if (!monte) {
      L.pcs.push(
        bx(s * 9.75, 0.03, -TRAMO / 2, 0.42, 0.04, TRAMO, 'concrete', '#a9a39a', { e: [0, 0, s * 0.3], solid: false }),
        bx(s * 10.15, 0.03, -TRAMO / 2, 0.42, 0.04, TRAMO, 'concrete', '#b3ada3', {
          e: [0, 0, -s * 0.3],
          solid: false,
        }),
      );
    }
  }
  // postes de luz a la derecha cada 32 m con tres cables (el último tramo llega al primer poste del tramo siguiente)
  const xp = 11.2,
    zs = [-6, -38, -70];
  zs.forEach((z, i) => {
    poste(L.pcs, xp, z, -1, { trafo: i === 1, lampara: i === 0 });
    for (const k of [-0.85, -0.3, 0.55]) cable(L.pcs, [xp + k, 8.8, z], [xp + k, 8.8, z - 32], 0.9);
  });
  if (monte) {
    // carretera de montaña: talud de tierra cortado a la izquierda con piedras; a la derecha la baranda
    for (let z = -2; z > -TRAMO; z -= 6) {
      const h = 2.4 + r() * 2.2;
      L.pcs.push(
        bx(-11.6, h / 2 - 0.2, z - 3, 2.6, h, 6.4, 'dirt', r() < 0.5 ? '#7a5a3c' : '#86664a', {
          e: [0, 0, -0.35],
          solid: false,
        }),
      );
      for (let k = 0; k < 2; k++)
        L.pcs.push(
          rk(
            -10.1 - r() * 1.6,
            0.2 + r() * 1.4,
            z - r() * 6,
            0.35 + r() * 0.5,
            'stone',
            r() < 0.5 ? '#8c8478' : '#77705f',
          ),
        );
    }
    for (let z = -2; z > -TRAMO; z -= 4)
      L.pcs.push(cy(9.6, 0.4, z, 0.07, 0.8, 'metal', '#9aa0a6', { n: 6, solid: false }));
    L.pcs.push(bx(9.55, 0.62, -TRAMO / 2, 0.06, 0.32, TRAMO, 'metal', '#c3c7cb', { solid: false }));
    libres.push([1, 0, -TRAMO]);
  } else {
    // casas y comercios de carretera en dos caseríos, cada uno con su rótulo
    const nombres = [...NOMBRES_CARRETERA].sort(() => r() - 0.5);
    let n = 0;
    const casas: [number, number, number, boolean][] = [
      // [lado, z, ancho, comercio]
      [1, -12, 8, true],
      [1, -24, 6.5, false],
      [-1, -18, 7, false],
      [-1, -30, 8.5, true],
      [1, -62, 7.5, false],
      [-1, -66, 9, true],
      [1, -76, 8, true],
    ];
    for (const [lado, z, w, com] of casas) {
      const techo = r() < 0.45 ? 'lamina' : 'teja';
      casaAlLado(
        L,
        lado,
        12.6 + r() * 1.5,
        z,
        {
          w,
          d: 6 + r() * 1.5,
          h: 3 + r() * 0.4,
          col: PASTEL[Math.floor(r() * PASTEL.length)],
          techo,
          adobe: !com && r() < 0.4,
          seed: Math.floor(r() * 999),
          fino,
          comercio: com ? ROTULOS[Math.floor(r() * ROTULOS.length)] : undefined,
        },
        com ? nombres[n++ % nombres.length] : undefined,
      );
      // patio: palo de guineo o de mango al lado de la casa
      L.flora.push({
        k: r() < 0.5 ? 'banana' : 'tree',
        p: [lado * (13 + w * 0.6 + r() * 3), 0, z - w * 0.6 - 1],
        s: 0.7 + r() * 0.3,
        seed: Math.floor(r() * 999),
      });
    }
    libres.push([1, -30, -56], [-1, -36, -60], [1, -82, -TRAMO], [-1, -72, -TRAMO], [-1, 0, -8]);
    // la parada del bus de los caseríos: champita de lámina con su banca
    L.pcs.push(
      ...place(
        [
          bx(0, 2.4, 0, 3.2, 0.08, 1.8, 'metal', '#a7aeb4', { e: [0.12, 0, 0], solid: false }),
          ...[-1.4, 1.4].map((x) => cy(x, 1.2, -0.7, 0.06, 2.4, 'metal', '#6f767c', { solid: false })),
          ...[-1.4, 1.4].map((x) => cy(x, 1.1, 0.7, 0.06, 2.2, 'metal', '#6f767c', { solid: false })),
          bx(0, 0.5, -0.5, 2.6, 0.08, 0.4, 'wood', '#8a6341', { solid: false }),
          bx(0, 1.2, -0.85, 3.0, 1.6, 0.06, 'concrete', '#d9d4c7', { solid: false }),
        ],
        -10.8,
        0,
        -44,
        PI / 2,
      ),
    );
    senal(L.pcs, L.rot, 9.3, -50, 'limite');
    senal(L.pcs, L.rot, -9.3, -86, r() < 0.5 ? 'curva' : 'tumulo');
  }
  mojon(L.pcs, 9.1, -88);
  // cercos de alambre y monte cerca donde no hay casas
  for (const [lado, z0, z1] of libres) {
    cerco(L.pcs, lado * 12.4, z0, z1, r);
    for (let z = z0 - 1; z > z1; z -= 3 + r() * 3)
      L.flora.push({
        k: r() < 0.6 ? (r() < 0.5 ? 'bush' : 'fern') : elegir(especies, r()),
        p: [lado * (13 + r() * 6), 0, z],
        s: 0.5 + r() * 0.5,
        seed: Math.floor(r() * 999),
      });
  }
  // zacate a la orilla de la cuneta
  for (let i = 0; i < 18; i++)
    L.flora.push({
      k: r() < 0.5 ? 'dry' : 'fern',
      p: [(r() < 0.5 ? -1 : 1) * (10.6 + r() * 1.2), 0, -r() * TRAMO],
      s: 0.35 + r() * 0.25,
      seed: Math.floor(r() * 999),
    });
  // monte de atrás: árboles del lugar entre 20 y 70 m de la vía
  for (let i = 0; i < 34; i++) {
    const lado = r() < 0.5 ? -1 : 1,
      x = lado * (20 + r() * 50),
      z = -r() * TRAMO;
    L.flora.push({ k: elegir(especies, r()), p: [x, 0, z], s: 0.85 + r() * 0.6, seed: Math.floor(r() * 999) });
  }
  // potrero con milpa o ganado: piedras sueltas en el zacate
  for (let i = 0; i < 6; i++)
    L.pcs.push(rk((r() < 0.5 ? -1 : 1) * (14 + r() * 20), 0.1, -r() * TRAMO, 0.3 + r() * 0.5, 'stone', '#8c8478'));
  return L;
}

/** Un tramo de calle de ciudad (Tegucigalpa, San Pedro o la entrada de un pueblo). */
function tramoCiudad(seed: number, fino: boolean): Lote {
  const r = rng(seed),
    L: Lote = { pcs: [], flora: [], rot: [] },
    nombres = [...NOMBRES_CIUDAD].sort(() => r() - 0.5);
  let n = 0;
  for (const s of [-1, 1]) {
    // bordillo pintado (amarillo y blanco por tramos) y acera
    L.pcs.push(
      bx(s * 7.9, 0.09, -TRAMO / 2, 0.3, 0.18, TRAMO, 'concrete', '#d8d2c4', { solid: false }),
      bx(s * 9.35, 0.08, -TRAMO / 2, 2.6, 0.16, TRAMO, 'concrete', '#b9b4aa', { solid: false }),
    );
    for (let z = -1.5; z > -TRAMO; z -= 6)
      L.pcs.push(bx(s * 7.9, 0.185, z, 0.32, 0.01, 3, 'plastic', '#f2c230', { solid: false }));
    // juntas de la acera
    for (let z = -2; z > -TRAMO; z -= 2)
      L.pcs.push(bx(s * 9.35, 0.165, z, 2.6, 0.005, 0.04, 'concrete', '#8e8a82', { solid: false }));
    // fachadas seguidas: casas con comercio, casas con rejas y edificios
    let z = 0;
    while (z > -TRAMO + 6) {
      const w = Math.min(-z + TRAMO - 0.4, 7 + Math.floor(r() * 5)),
        cz = z - w / 2,
        t = r(),
        rot = s > 0 ? -PI / 2 : PI / 2,
        d = 9;
      if (t < 0.28) {
        const h = 9 + Math.floor(r() * 3) * 3;
        L.pcs.push(
          ...place(
            edificioHN(w, h, d, PASTEL[Math.floor(r() * PASTEL.length)], Math.floor(r() * 999), fino),
            s * (10.65 + d / 2),
            0,
            cz,
            rot,
          ),
        );
      } else {
        const com = t < 0.75;
        casaAlLado(
          L,
          s,
          10.65,
          cz,
          {
            w,
            d,
            h: r() < 0.4 ? 6.2 : 3.4,
            col: PASTEL[Math.floor(r() * PASTEL.length)],
            techo: r() < 0.6 ? 'losa' : 'lamina',
            rejas: true,
            seed: Math.floor(r() * 999),
            fino,
            comercio: com ? ROTULOS[Math.floor(r() * ROTULOS.length)] : undefined,
          },
          com ? nombres[n++ % nombres.length] : undefined,
        );
      }
      z -= w + 0.15;
    }
    // árboles de acera
    for (let k = 0; k < 3; k++) {
      const tz = -14 - k * 30 - (s > 0 ? 0 : 12);
      L.pcs.push(bx(s * 9.6, 0.17, tz, 0.9, 0.02, 0.9, 'dirt', '#5a4632', { solid: false }));
      L.flora.push({ k: 'tree', p: [s * 9.6, 0.17, tz], s: 0.5 + r() * 0.2, seed: Math.floor(r() * 999) });
    }
  }
  // postes a los dos lados (desfasados) con la maraña: cables a lo largo y acometidas a las casas (ninguno cruza la
  // calle: pasaría a la altura de la cámara)
  for (const s of [-1, 1]) {
    const xp = s * 8.4;
    for (let k = 0; k < 3; k++) {
      const zp = -8 - k * 32 - (s < 0 ? 16 : 0);
      poste(L.pcs, xp, zp, -s, { trafo: k === 1, lampara: true });
      for (const c of [-0.85, -0.3, 0.55]) cable(L.pcs, [xp + c, 8.8, zp], [xp + c, 8.8, zp - 32], 0.8);
      // cables más bajos (teléfono y cable) que cuelgan más
      cable(L.pcs, [xp, 7.0, zp], [xp, 7.0, zp - 32], 1.4, 6, 0.035);
      cable(L.pcs, [xp, 6.6, zp], [xp, 6.6, zp - 32], 1.7, 6, 0.04);
      for (const dz of [-6, 9]) cable(L.pcs, [xp, 6.8, zp], [s * 10.7, 3.0 + r() * 2, zp + dz], 0.4, 4, 0.022);
    }
  }
  // basura y vida de calle: un barril, una hielera y un rótulo de pie
  for (let k = 0; k < 4; k++) {
    const s = k % 2 ? 1 : -1,
      z = -10 - k * 22 - r() * 6;
    L.pcs.push(cy(s * 10.2, 0.6, z, 0.3, 0.9, 'metal', k % 2 ? '#2f6f4f' : '#2c4c7c', { n: 10, solid: false }));
  }
  return L;
}

/** Lo que va dentro del grupo que corre: COPIAS tramos iguales. */
export function Orilla({
  city,
  monte,
  biome,
  coastal,
  letreros,
}: {
  city: boolean;
  monte: boolean;
  biome: string;
  coastal: boolean;
  /** letreros verdes de la carretera (destino, tramo): cambian con el viaje */
  letreros: [string, string];
}) {
  const hecho = useMemo(() => {
    const hacer = (fino: boolean) =>
      city ? tramoCiudad(504, fino) : tramoCarretera(biome, coastal, monte, 1991 + biome.length * 7, fino);
    // el último tramo siempre queda lejos (a más de 80 m): va sin rejas tupidas ni tejas una por una. Los tramos se
    // corren a la vez, así que el cambio de detalle pasa allá lejos, en la bruma.
    const fino = detalleFino(),
      L = hacer(fino),
      lejos = fino ? hacer(false) : L;
    // una malla por tramo: la cámara y la sombra se saltan los tramos que no ven
    const pcs: Pc[][] = [],
      flora: FloraItem[] = [],
      rot: Rotulo[] = [];
    for (let k = 0; k < COPIAS; k++) {
      const dz = Z0 - k * TRAMO;
      // cajas lisas: el bisel de 7 cm no se ve desde la cámara (a 10 m o más) y costaba ~300 triángulos por caja
      pcs.push(
        (k === COPIAS - 1 ? lejos : L).pcs.map((q) => ({ ...q, liso: true, p: [q.p[0], q.p[1], q.p[2] + dz] as V3 })),
      );
      for (const f of L.flora) flora.push({ ...f, p: [f.p[0], f.p[1], f.p[2] + dz] });
      for (const t of L.rot) rot.push({ ...t, p: [t.p[0], t.p[1], t.p[2] + dz] });
    }
    return { pcs, flora, rot };
  }, [city, monte, biome, coastal]);
  // letreros verdes (texto del viaje): rótulo de dos postes a la izquierda en cada tramo
  const verdes = useMemo(() => {
    const pcs: Pc[] = [],
      rot: Rotulo[] = [];
    for (let k = 0; k < COPIAS; k++) {
      const dz = Z0 - k * TRAMO;
      if (city) {
        // en la calle: letreros en bandera desde un poste de la acera, encima del carril de la orilla
        for (const [sd, zz, text] of [
          [-1, -58, letreros[0]],
          [1, -20, letreros[1]],
        ] as [number, number, string][]) {
          const z = zz + dz;
          pcs.push(
            cy(sd * 8.3, 2.9, z, 0.09, 5.8, 'metal', '#9aa0a6', { n: 8, solid: false }),
            bx(sd * 7.3, 5.7, z, 2.2, 0.1, 0.1, 'metal', '#9aa0a6', { solid: false }),
            bx(sd * 6.5, 5.15, z, 3.8, 0.8, 0.08, 'metal', '#1d6b3f', { solid: false }),
          );
          rot.push({
            p: [sd * 6.5, 5.15, z + 0.05],
            w: 3.6,
            h: 0.62,
            text,
            fg: '#ffffff',
            bg: '#1d6b3f',
            letra: 'senal',
          });
        }
        continue;
      }
      const [x, z] = [-10.4, -58 + dz];
      pcs.push(
        cy(x - 2.4, 2.1, z, 0.08, 4.2, 'metal', '#9aa0a6', { n: 8, solid: false }),
        cy(x + 2.4, 2.1, z, 0.08, 4.2, 'metal', '#9aa0a6', { n: 8, solid: false }),
        bx(x, 3.6, z, 5.8, 1.3, 0.08, 'metal', '#1d6b3f', { solid: false }),
      );
      rot.push({
        p: [x, 3.6, z + 0.05],
        w: 5.5,
        h: 1.0,
        text: letreros[0],
        fg: '#ffffff',
        bg: '#1d6b3f',
        letra: 'senal',
      });
      const [x2, z2] = [10.4, -20 + dz];
      pcs.push(
        cy(x2, 1.6, z2, 0.07, 3.2, 'metal', '#9aa0a6', { n: 8, solid: false }),
        bx(x2, 2.9, z2, 4.4, 0.9, 0.08, 'metal', '#1d6b3f', { solid: false }),
      );
      rot.push({
        p: [x2, 2.9, z2 + 0.05],
        w: 4.2,
        h: 0.7,
        text: letreros[1],
        fg: '#ffffff',
        bg: '#1d6b3f',
        letra: 'senal',
      });
    }
    return { pcs, rot };
  }, [city, letreros[0], letreros[1]]); // eslint-disable-line react-hooks/exhaustive-deps
  const todos = useMemo(() => [...hecho.rot, ...verdes.rot], [hecho, verdes]);
  return (
    <>
      {hecho.pcs.map((p, k) => (
        <Fundido key={k} pcs={p} sombra={k < COPIAS - 1} />
      ))}
      <Fundido pcs={verdes.pcs} />
      <Rotulos items={todos} />
      {art.Flora && hecho.flora.length > 0 && <art.Flora items={hecho.flora} />}
    </>
  );
}

/** Marcas del asfalto (líneas de orilla y de carril) dentro del grupo que corre. */
export function marcas(water: boolean): Pc[] {
  if (water) return [];
  const out: Pc[] = [];
  for (let k = 0; k < COPIAS; k++) {
    const dz = Z0 - k * TRAMO;
    for (const x of [-7.4, 7.4]) out.push(bx(x, 0.032, dz - TRAMO / 2, 0.14, 0.012, TRAMO, 'plastic', '#f1ead0'));
    for (let z = 0; z > -TRAMO; z -= 12)
      for (const x of [-1.8, 1.8]) out.push(bx(x, 0.032, dz + z - 3.5, 0.12, 0.012, 6, 'plastic', '#f2d27a'));
    // parches y remiendos del asfalto
    for (let z = -9; z > -TRAMO; z -= 23)
      out.push(bx(((z * 7) % 9) - 4.5, 0.026, dz + z, 1.6 + (z % 3), 0.008, 1.1, 'asphalt', '#2c3236'));
  }
  return out;
}
