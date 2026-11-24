// Paisaje de «La ruta» (paquete HD). Las piezas fijas del recorrido dejan de flotar: cada una se apoya en su pilar del
// estilo (peñasco en el cerro, la cueva y el río; horcones en la playa y la selva; tronco gigante en el canopy; casa en
// el pueblo y la ciudad; sillares en las ruinas; marcos de madera en la mina) y tiene borde de zacate, musgo o tierra.
// Abajo hay terreno con relieve, monte de `art.Flora`, piedras y, de lejos, cerros. En la cueva y la mina, paredes de
// roca, estalagmitas, cristales o rieles y faroles.
// Las piezas fijas se dibujan aquí, fusionadas (una llamada); las que se mueven y los neones de salida, control y
// meta los sigue dibujando Ruta.tsx. Nada de esto tiene colisión: las colisiones son las de siempre.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { PASTEL } from '../../dept/casas';
import { bx, cy, type Pc, PI, rk, rng } from '../../dept/lib';
import { art } from '../../kit';
import type { FloraItem, FloraKind, HillDef } from '../../kit/art/types';
import { Fundido } from '../kit/fundido';
import type { Look } from './estilos';
import type { Estilo, Pieza } from './gen';
import { TH } from './gen';

export const fija = (q: Pieza) => q.tipo !== 'mov' && q.tipo !== 'movz' && q.tipo !== 'sink';

type Familia = 'roca' | 'madera' | 'tronco' | 'casa' | 'sillar' | 'mina';
const FAMILIA: Record<Estilo, Familia> = {
  cerro: 'roca',
  cueva: 'roca',
  rio: 'roca',
  mina: 'mina',
  playa: 'madera',
  selva: 'madera',
  canopy: 'tronco',
  pueblo: 'casa',
  ciudad: 'casa',
  ruinas: 'sillar',
};
const ROCA: Record<string, string[]> = {
  cerro: ['#8c8478', '#7a7266', '#9b9384', '#6f6a5e'],
  cueva: ['#4a433c', '#564d44', '#3f3933', '#5d5349'],
  rio: ['#7d8187', '#8c8f94', '#6f7378', '#989a9c'],
};
const MONTE: Record<Estilo, [FloraKind, number][]> = {
  cerro: [
    ['pine', 6],
    ['fern', 2],
    ['bush', 2],
    ['dry', 2],
  ],
  selva: [
    ['jungle', 4],
    ['giant', 1],
    ['banana', 2],
    ['fern', 3],
  ],
  canopy: [
    ['giant', 3],
    ['jungle', 4],
    ['fern', 3],
  ],
  ruinas: [
    ['jungle', 3],
    ['tree', 2],
    ['fern', 3],
  ],
  playa: [
    ['palm', 5],
    ['bush', 2],
  ],
  rio: [
    ['tree', 4],
    ['bush', 2],
    ['fern', 2],
  ],
  pueblo: [
    ['tree', 3],
    ['banana', 2],
    ['flowers', 2],
  ],
  ciudad: [['tree', 1]],
  cueva: [],
  mina: [],
};
const BAJA = new Set<FloraKind>(['fern', 'bush', 'dry', 'flowers', 'reed']);
const elegir = (l: [FloraKind, number][], t: number): FloraKind => {
  let k = t * l.reduce((a, [, w]) => a + w, 0);
  for (const [f, w] of l) if ((k -= w) <= 0) return f;
  return l[0][0];
};

/** Pilar debajo de una pieza fija, desde el piso (y0) hasta la cara de abajo de la pieza. */
function pilar(out: Pc[], fam: Familia, est: Estilo, q: Pieza, y0: number, r: () => number) {
  const top = q.y - TH,
    h = top - y0;
  if (h < 0.3) return;
  const { x, z, w, len } = q;
  if (fam === 'roca') {
    const cols = ROCA[est] ?? ROCA.cerro;
    // peñasco: un núcleo que se ensancha hacia abajo y rocas grandes y desordenadas pegadas a él
    const m = Math.min(w, len);
    out.push(cy(x, (top + y0) / 2, z, m * 0.36, h + 0.4, 'stone', cols[0], { rt: 0.75, n: 7, solid: false }));
    for (let y = top - 0.7; y > y0 - 0.5; y -= 1.7 + r() * 0.8) {
      const k = 1 + ((top - y) / Math.max(1, h)) * 0.5,
        n = m < 3 ? 2 : 3;
      for (let i = 0; i < n; i++) {
        const a = r() * 6.28,
          d = m * 0.22 * k,
          yy = y + (r() - 0.5) * 0.6,
          // la roca sube hasta ~1·sy sobre su centro: que no asome por encima de la pieza (queda dentro de ella)
          sy = Math.min(0.9 + r() * 1.1, top + 0.5 - yy);
        if (sy < 0.3) continue;
        // pegadas a la pieza no sobresalen de su filo: no parecen un escalón donde pararse
        const pegada = yy + sy > top - 0.4,
          dd = pegada ? d * 0.3 : d,
          kk = pegada ? 0.82 : k;
        out.push(
          rk(x + Math.cos(a) * dd, yy, z + Math.sin(a) * dd, 1, 'stone', cols[Math.floor(r() * cols.length)], {
            s: [w * (0.32 + r() * 0.16) * kk, sy, len * (0.32 + r() * 0.16) * kk],
            r: r() * 6.28,
          }),
        );
      }
    }
    // la cabeza del peñasco, justo debajo de la pieza, más ancha y con musgo
    out.push(rk(x, top - 0.25, z, 1, 'stone', cols[1], { s: [w * 0.47, 0.6, len * 0.47], r: r() * 6.28 }));
    for (let i = 0; i < 3; i++)
      out.push(
        rk(
          x + (r() - 0.5) * w * 1.6,
          y0 + 0.3,
          z + (r() - 0.5) * len * 1.4,
          0.5 + r() * 0.9,
          'stone',
          cols[i % cols.length],
        ),
      );
    return;
  }
  if (fam === 'sillar') {
    // columna de sillares labrados, con musgo en las juntas
    let y = top;
    for (let i = 0; y > y0; i++) {
      const hh = 0.75,
        dx = (r() - 0.5) * 0.15;
      out.push(
        bx(x + dx, y - hh / 2, z, w * 0.82, hh - 0.04, len * 0.82, 'stone', ['#b8a878', '#a89868', '#c2b384'][i % 3], {
          solid: false,
        }),
      );
      if (r() < 0.4)
        out.push(bx(x + dx, y - hh + 0.03, z, w * 0.84, 0.06, len * 0.84, 'grass', '#5d7a3a', { solid: false }));
      y -= hh;
    }
    return;
  }
  if (fam === 'casa') {
    // la pieza es el techo (o la azotea) de una casa: paredes con ventanas y zócalo
    const col = PASTEL[Math.floor(r() * PASTEL.length)],
      ww = w * 0.94,
      ll = len * 0.94;
    out.push(
      bx(x, (top + y0) / 2, z, ww, h, ll, 'stucco', col, { solid: false }),
      bx(x, y0 + 0.4, z, ww + 0.06, 0.8, ll + 0.06, 'stucco', '#8f7d6a', { solid: false }),
      bx(x, top - 0.1, z, ww + 0.2, 0.2, ll + 0.2, 'concrete', '#e9e3d6', { solid: false }),
    );
    for (let y = top - 1.6; y > y0 + 1; y -= 3)
      for (const s of [-1, 1]) {
        for (let k = 0; k < Math.max(1, Math.floor(ll / 2.2)); k++) {
          const zz = z - ll / 2 + (ll * (k + 0.5)) / Math.max(1, Math.floor(ll / 2.2));
          out.push(
            bx(x + s * (ww / 2 + 0.02), y, zz, 0.04, 1.1, 0.9, 'plastic', '#2d2a25', {
              em: r() < 0.5 ? 1 : 0,
              solid: false,
            }),
            bx(x + s * (ww / 2 + 0.05), y, zz, 0.03, 1.2, 0.04, 'metal', '#1f2124', { solid: false }),
          );
        }
      }
    return;
  }
  if (fam === 'tronco') {
    // tronco de ceiba con aletones; la pieza es la plataforma entre las ramas
    const rr = Math.min(w, len) * 0.22;
    out.push(cy(x, (top + y0) / 2, z, rr, h, 'wood', '#6b5a45', { rt: 0.7, n: 10, solid: false }));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * PI * 2 + 0.4;
      out.push(
        bx(x + Math.cos(a) * rr * 1.2, y0 + 1.2, z + Math.sin(a) * rr * 1.2, 0.25, 2.4, rr * 1.6, 'wood', '#5e4d3a', {
          e: [0, -a, 0],
          solid: false,
        }),
      );
    }
    for (const s of [-1, 1])
      out.push(
        bx(x + s * w * 0.3, top - 0.35, z, w * 0.62, 0.3, 0.32, 'wood', '#5e4d3a', {
          e: [0, 0, s * 0.4],
          solid: false,
        }),
      );
    return;
  }
  // horcones de madera (playa, selva) y marcos de mina
  const pz = len > 2.5 ? [-len / 2 + 0.3, len / 2 - 0.3] : [0];
  for (const dz of pz)
    for (const s of [-1, 1])
      out.push(
        cy(
          x + s * (w / 2 - 0.25),
          (top + y0) / 2,
          z + dz,
          0.14,
          h + 0.3,
          'wood',
          fam === 'mina' ? '#5e4126' : '#6b4a2b',
          {
            n: 7,
            solid: false,
          },
        ),
      );
  for (let y = top - 1.2; y > y0 + 0.8; y -= 2.4)
    out.push(
      bx(x, y, z + pz[0], w - 0.4, 0.12, 0.12, 'wood', '#5a3c22', { e: [0, 0, 0.5], solid: false }),
      bx(x, y - 1.0, z + pz[0], w - 0.4, 0.12, 0.12, 'wood', '#5a3c22', { e: [0, 0, -0.5], solid: false }),
    );
}

/** Cara de arriba de una pieza fija con su borde natural. */
function pieza(out: Pc[], q: Pieza, L: Look, est: Estilo, r: () => number) {
  const [m, c] = q.tipo === 'beam' ? L.beam : L.plat;
  out.push(bx(q.x, q.y - TH / 2, q.z, q.w, TH, q.len, m, c, { solid: false }));
  if (q.tipo === 'beam') {
    // tablones del puente
    for (let z = q.z - q.len / 2 + 0.25; z < q.z + q.len / 2; z += 0.45)
      out.push(bx(q.x, q.y + 0.005, z, q.w + 0.04, 0.02, 0.04, m, '#3e2a18', { solid: false }));
    return;
  }
  if (q.tipo === 'step') return;
  const borde: [Pc['m'], string] =
    est === 'ciudad' || est === 'pueblo'
      ? ['concrete', L.cap]
      : est === 'cueva' || est === 'mina'
        ? ['stone', L.cap]
        : est === 'ruinas'
          ? ['grass', '#6a8a45']
          : est === 'playa'
            ? ['sand', L.cap]
            : ['grass', L.cap];
  for (const s of [-1, 1]) {
    out.push(bx(q.x + s * (q.w / 2 - 0.12), q.y + 0.03, q.z, 0.26, 0.08, q.len, borde[0], borde[1], { solid: false }));
    // matas y piedritas sobresaliendo del filo (afuera de donde se pisa)
    if (FAMILIA[est] === 'roca' || FAMILIA[est] === 'sillar')
      for (let k = 0; k < Math.max(1, Math.round(q.len / 1.6)); k++)
        out.push(
          rk(
            q.x + s * (q.w / 2 + 0.05),
            q.y - 0.12,
            q.z - q.len / 2 + (k + 0.3 + r() * 0.4) * (q.len / Math.max(1, Math.round(q.len / 1.6))),
            0.18 + r() * 0.2,
            'stone',
            est === 'cueva' ? '#4a433c' : '#8c8478',
          ),
        );
  }
}

function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function ruido(x: number, y: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi,
    u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf),
    a = hash(xi, yi),
    b = hash(xi + 1, yi),
    c = hash(xi, yi + 1),
    d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
const ss = (a: number, b: number, x: number) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function PaisajeRuta({
  plats,
  L,
  est,
  floorY,
  largo,
}: {
  plats: Pieza[];
  L: Look;
  est: Estilo;
  floorY: number;
  largo: number;
}) {
  const agua = L.floor[1] === 'water',
    fam = FAMILIA[est],
    cerrado = est === 'cueva' || est === 'mina';
  // el piso: valle entre lomas (cerradas como cañón en la cueva y la mina); bajo el agua, lecho y bancos de arena
  const altura = useMemo(
    () => (x: number, z: number) => {
      const ax = Math.abs(x),
        n = ruido(x * 0.08, z * 0.08) - 0.5,
        n2 = ruido(x * 0.025 + 7, z * 0.025);
      if (cerrado) return floorY + n * 0.8 + ss(9, 18, ax) * (26 + n2 * 10);
      const lomas = ss(14, 45, ax) * (6 + n2 * 14);
      return floorY + (agua ? -1.2 + ss(10, 20, ax) * 1.8 : 0) + n * (agua ? 0.6 : 1.6) + lomas;
    },
    [floorY, agua, cerrado],
  );
  const hecho = useMemo(() => {
    const r = rng(est.length * 977 + Math.round(largo)),
      pcs: Pc[] = [],
      flora: FloraItem[] = [];
    for (const q of plats) {
      if (!fija(q)) continue;
      pieza(pcs, q, L, est, r);
      pilar(pcs, fam, est, q, altura(q.x, q.z) - (agua ? 0.5 : 0.2), r);
    }
    const z0 = 20,
      z1 = -largo - 40,
      monte = MONTE[est];
    // monte en el piso: árboles lejos del camino (no se asoman entre las piezas), matas por todo
    if (monte.length)
      for (let i = 0; i < 200; i++) {
        const x = (r() - 0.5) * 110,
          z = z1 + r() * (z0 - z1),
          y = altura(x, z);
        if (agua && y < floorY + 0.1) {
          if (r() < 0.3 && est === 'rio') flora.push({ k: 'reed', p: [x, floorY - 0.05, z], s: 0.6, seed: i });
          continue;
        }
        const k = elegir(monte, r()),
          baja = BAJA.has(k);
        if (!baja && Math.abs(x) < 8) continue;
        flora.push({ k, p: [x, y - 0.1, z], s: baja ? 0.6 + r() * 0.5 : 0.8 + r() * 0.5, seed: Math.floor(r() * 999) });
      }
    // piedras sueltas
    for (let i = 0; i < 40; i++) {
      const x = (r() - 0.5) * 60,
        z = z1 + r() * (z0 - z1),
        y = altura(x, z);
      pcs.push(rk(x, y, z, 0.4 + r() * 1.2, 'stone', (ROCA[est] ?? ROCA.cerro)[i % 4]));
    }
    if (cerrado) {
      // estalagmitas en el piso y, en la cueva, cristales que brillan; en la mina, rieles y faroles
      for (let i = 0; i < 46; i++) {
        const x = (r() < 0.5 ? -1 : 1) * (4 + r() * 9),
          z = z1 + r() * (z0 - z1),
          y = altura(x, z),
          h = 1.2 + r() * 4;
        pcs.push(
          cy(x, y + h / 2, z, 0.25 + r() * 0.5, h, 'stone', est === 'cueva' ? '#6b6258' : '#5d5349', {
            rt: 0.05,
            n: 7,
            solid: false,
          }),
        );
      }
      if (est === 'cueva')
        for (let i = 0; i < 30; i++) {
          const x = (r() < 0.5 ? -1 : 1) * (6 + r() * 7),
            z = z1 + r() * (z0 - z1),
            y = altura(x, z) + 0.2;
          for (let k = 0; k < 3; k++)
            pcs.push(
              cy(x + (r() - 0.5) * 0.5, y + 0.3, z + (r() - 0.5) * 0.5, 0.08, 0.6 + r() * 0.5, 'plastic', '#5de0ff', {
                e: [(r() - 0.5) * 0.8, 0, (r() - 0.5) * 0.8],
                rt: 0.1,
                n: 5,
                em: -1.4,
                solid: false,
              }),
            );
        }
      else {
        for (let z = z0; z > z1; z -= 0.7)
          pcs.push(bx(0, altura(0, z) + 0.06, z, 1.4, 0.06, 0.16, 'wood', '#4f3420', { solid: false }));
        for (const s of [-0.55, 0.55])
          pcs.push(
            bx(s, altura(0, -largo / 2) + 0.14, (z0 + z1) / 2, 0.07, 0.08, z0 - z1, 'metal', '#5d6168', {
              solid: false,
            }),
          );
        for (let z = z0 - 6; z > z1; z -= 14)
          for (const s of [-1, 1]) {
            const x = s * 9,
              y = altura(x, z);
            pcs.push(
              cy(x, y + 1.6, z, 0.06, 3.2, 'wood', '#5e4126', { n: 6, solid: false }),
              bx(x - s * 0.25, y + 3.1, z, 0.5, 0.08, 0.08, 'wood', '#5e4126', { solid: false }),
              bx(x - s * 0.5, y + 2.85, z, 0.18, 0.28, 0.18, 'plastic', '#ffcf7a', { em: -1.6, solid: false }),
            );
          }
      }
    }
    const cerros: HillDef[] = [];
    if (!cerrado)
      for (const s of [-1, 1])
        for (let i = 0; i < 5; i++)
          cerros.push({
            p: [s * (90 + (i % 2) * 30), floorY - 2, 10 - i * (largo / 4 + 30)],
            r: 50 + (i % 3) * 14,
            h: 24 + (i % 2) * 14,
            c: est === 'ruinas' || est === 'selva' || est === 'canopy' ? '#4f7a4a' : '#62855a',
            seed: i * 3 + (s > 0 ? 11 : 0),
          });
    return { pcs, flora, cerros };
  }, [plats, L, est, fam, largo, altura, agua, floorY, cerrado]);
  // terreno: una malla con el material del piso del estilo (arena o zacate bajo el agua de la playa y el río)
  const suelo = useMemo(() => {
    const w = cerrado ? 70 : 240,
      z0 = 40,
      z1 = -largo - 80,
      cell = 3,
      nx = Math.round(w / cell) + 1,
      nz = Math.round((z0 - z1) / cell) + 1,
      pos = new Float32Array(nx * nz * 3),
      uv = new Float32Array(nx * nz * 2),
      idx: number[] = [];
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const x = -w / 2 + i * cell,
          z = z1 + j * cell,
          k = j * nx + i;
        pos.set([x, altura(x, z), z], k * 3);
        uv.set([x / 4, z / 4], k * 2);
      }
    for (let j = 0; j < nz - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        const a = j * nx + i;
        idx.push(a, a + nx, a + 1, a + 1, a + nx, a + nx + 1);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [altura, cerrado, largo]);
  useEffect(() => () => suelo.dispose(), [suelo]);
  const [mat, col] = agua
    ? est === 'playa'
      ? (['sand', '#d9c58a'] as const)
      : (['grass', '#5f8a4a'] as const)
    : cerrado
      ? (['stone', est === 'cueva' ? '#3a342f' : '#3a302a'] as const)
      : L.floor[1] === 'leaf'
        ? (['grass', '#3f6b35'] as const)
        : ([L.floor[1], L.floor[0]] as const);
  return (
    <>
      <mesh geometry={suelo} material={art.material(mat, col)} receiveShadow />
      {agua && (
        <mesh position={[0, floorY, -largo / 2]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[300, largo + 220]} />
          <primitive object={art.material('water', L.floor[0])} attach="material" />
        </mesh>
      )}
      <Fundido pcs={hecho.pcs} />
      {art.Flora && hecho.flora.length > 0 && <art.Flora items={hecho.flora} />}
      {art.Hills && hecho.cerros.length > 0 && <art.Hills hills={hecho.cerros} />}
    </>
  );
}
