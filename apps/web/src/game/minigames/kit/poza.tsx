// Agua de juego con hondura y orilla (paquete HD): el mismo bloque o disco de agua de siempre (mismo color, misma
// cara de arriba, el color sigue marcando el estado del juego), con fondo que se oscurece hacia el centro, una
// franja de lodo mojado y la orilla de piedras de río, bordo de tierra o bordillo de concreto. El fondo y la orilla
// van en una malla fusionada por poza. Sin malla fusionada (Roblox) queda solo el agua de siempre.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../core/types';
import { bx, cy, mergePieces, type Pc, rk } from '../../dept/lib';
import { art, Block, Cyl } from '../../kit';

export type Orilla = 'piedra' | 'barro' | 'concreto';
const mezcla = (a: string, b: string, t: number) => `#${new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString()}`;
const PIEDRAS = ['#8c8478', '#77705f', '#9b9384', '#6a6458', '#a39a88'];

function azar(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** piezas del fondo y la orilla, en coordenadas locales (centro de la poza en x = z = 0; `y0` piso, `y1` agua) */
function piezas(
  redonda: boolean,
  w: number,
  d: number,
  y0: number,
  y1: number,
  orilla: Orilla,
  hondo: string,
  seed: number,
) {
  const r = azar(seed),
    out: Pc[] = [],
    arena = '#9a8a66',
    lodo = '#4a3b2b',
    medio = mezcla(hondo, arena, 0.45);
  // fondo: se oscurece hacia lo hondo (anillos en la redonda; en la rectangular, losetas por distancia a la orilla)
  const tinte = (t: number) => mezcla(arena, mezcla(medio, hondo, Math.max(0, t * 2 - 1)), Math.min(1, t * 2));
  if (redonda)
    for (let i = 0; i < 6; i++) {
      const k = 1 - i * 0.14;
      out.push(
        cy(0, y0 + 0.004 + i * 0.002, 0, (w / 2) * k, 0.004, 'sand', tinte(Math.min(1, i / 4)), {
          n: 28,
          solid: false,
        }),
      );
    }
  else {
    const nx = Math.max(4, Math.round(w / 0.45)),
      nz = Math.max(3, Math.round(d / 0.45)),
      tw = w / nx,
      td = d / nz,
      m = Math.min(w, d) / 2;
    for (let i = 0; i < nx; i++)
      for (let j = 0; j < nz; j++) {
        const x = -w / 2 + tw * (i + 0.5),
          z = -d / 2 + td * (j + 0.5),
          borde = Math.min(w / 2 - Math.abs(x), d / 2 - Math.abs(z)),
          t = Math.min(1, borde / (m * 0.75));
        out.push(
          bx(x, y0 + 0.006, z, tw + 0.002, 0.004, td + 0.002, 'sand', tinte(t * t * (3 - 2 * t)), { solid: false }),
        );
      }
  }
  // unas piedras en el fondo cerca de la orilla
  for (let i = 0; i < Math.round((w + d) * 1.2); i++) {
    const a = r() * Math.PI * 2,
      k = 0.62 + r() * 0.3,
      x = redonda ? Math.cos(a) * (w / 2) * k : (r() - 0.5) * w * 0.92,
      z = redonda ? Math.sin(a) * (w / 2) * k : (r() < 0.5 ? -1 : 1) * (d / 2) * (0.7 + r() * 0.22);
    out.push(
      rk(x, y0 + 0.012, z, 0.04 + r() * 0.06, 'stone', PIEDRAS[Math.floor(r() * PIEDRAS.length)], {
        s: [1.3, 0.35, 1],
      }),
    );
  }
  // orilla: el perímetro, cada ~0.3 m
  const per: [number, number, number][] = []; // x, z, ángulo de la normal hacia afuera
  if (redonda) {
    const n = Math.max(12, Math.round((Math.PI * w) / 0.28));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      per.push([(Math.cos(a) * w) / 2, (Math.sin(a) * w) / 2, a]);
    }
  } else {
    for (const [lx, lz, nx, nz, largo] of [
      [0, -d / 2, 0, -1, w],
      [0, d / 2, 0, 1, w],
      [-w / 2, 0, -1, 0, d],
      [w / 2, 0, 1, 0, d],
    ] as [number, number, number, number, number][]) {
      const n = Math.max(2, Math.round(largo / 0.3));
      for (let i = 0; i <= n; i++) {
        const t = (i / n - 0.5) * largo;
        per.push([lx + (nz !== 0 ? t : 0), lz + (nx !== 0 ? t : 0), Math.atan2(nz, nx)]);
      }
    }
  }
  if (orilla === 'concreto') {
    if (redonda) out.push(cy(0, y1 + 0.01, 0, w / 2 + 0.1, 0.07, 'concrete', '#bdb7aa', { n: 32, solid: false }));
    else
      for (const [x, z, ww, dd] of [
        [0, -d / 2 - 0.05, w + 0.2, 0.1],
        [0, d / 2 + 0.05, w + 0.2, 0.1],
        [-w / 2 - 0.05, 0, 0.1, d],
        [w / 2 + 0.05, 0, 0.1, d],
      ])
        out.push(bx(x, y1 + 0.01, z, ww, 0.07, dd, 'concrete', '#bdb7aa', { solid: false }));
    return out;
  }
  for (const [x, z, a] of per) {
    const ox = Math.cos(a),
      oz = Math.sin(a);
    // lodo mojado justo en el filo
    out.push(rk(x + ox * 0.04, y1 - 0.03, z + oz * 0.04, 0.16, 'dirt', lodo, { s: [1.4, 0.18, 1.4], r: r() * 6.28 }));
    if (orilla === 'barro') {
      out.push(
        rk(x + ox * 0.16, y1 - 0.02, z + oz * 0.16, 0.2 + r() * 0.06, 'dirt', r() < 0.5 ? '#6b5236' : '#5d4730', {
          s: [1.5, 0.32, 1.2],
          r: a,
        }),
      );
      continue;
    }
    if (r() < 0.82) {
      const rr = 0.07 + r() * 0.09;
      out.push(
        rk(
          x + ox * (0.04 + rr * 0.5),
          y1 - 0.015,
          z + oz * (0.04 + rr * 0.5),
          rr,
          'stone',
          PIEDRAS[Math.floor(r() * PIEDRAS.length)],
          { s: [1.3, 0.55, 1.1], r: r() * 6.28 },
        ),
      );
    }
  }
  return out;
}

/** Agua de juego. `pos`/`size` como el bloque de agua de siempre (o `r` y `h` para una poza redonda); `rot` giro en
 *  Y; `orilla` piedras de río (por defecto), bordo de tierra o bordillo de concreto; `hondo` color de lo hondo. */
export function Poza({
  pos,
  size,
  r,
  h = 0.08,
  rot = 0,
  color,
  orilla = 'piedra',
  hondo = '#1f3d3a',
  seed = 1,
}: {
  pos: V3;
  size?: V3;
  r?: number;
  h?: number;
  rot?: number;
  color: string;
  orilla?: Orilla;
  hondo?: string;
  seed?: number;
}) {
  const redonda = r !== undefined,
    w = redonda ? r * 2 : (size?.[0] ?? 1),
    alto = redonda ? h : (size?.[1] ?? h),
    d = redonda ? r * 2 : (size?.[2] ?? 1),
    y0 = -alto / 2,
    y1 = alto / 2;
  const grupos = useMemo(
    () => (art.fused ? mergePieces(piezas(redonda, w, d, y0, y1, orilla, hondo, seed), true) : []),
    [redonda, w, d, y0, y1, orilla, hondo, seed],
  );
  useEffect(
    () => () => {
      for (const g of grupos) g.geo.dispose();
    },
    [grupos],
  );
  return (
    <>
      {redonda ? (
        <Cyl pos={pos} r={r} h={alto} color={color} mat="water" solid={false} sides={28} />
      ) : (
        <Block pos={pos} size={[w, alto, d]} rot={rot} color={color} mat="water" solid={false} />
      )}
      {grupos.length > 0 && (
        <group position={pos} rotation-y={rot}>
          {grupos.map((g) => (
            <mesh
              key={g.key}
              geometry={g.geo}
              material={g.mat ?? art.material(g.m, g.c)}
              receiveShadow
              castShadow={false}
            />
          ))}
        </group>
      )}
    </>
  );
}
