// Cerros de fondo con relieve: cumbre principal y dos lomas, lomos y quebradas de ruido, y color por pendiente
// (monte oscuro en manchas, potrero más claro, roca en lo empinado). Todos los cerros de una escena = una malla.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { HillDef } from '../types';
import { kindInfo, propMaterial } from './materials';
import { layerIndex, rng, texCalidad } from './tex';

function hash2(x: number, y: number) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** ruido de valor suave en 2D (0..1) */
export function vnoise(x: number, y: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi,
    u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf),
    a = hash2(xi, yi),
    b = hash2(xi + 1, yi),
    c = hash2(xi, yi + 1),
    d = hash2(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** lomos: ruido "ridged" de varias octavas (0..1, alto en las cuchillas) */
function ridged(x: number, y: number) {
  let s = 0,
    a = 0.55,
    f = 1,
    w = 0;
  for (let i = 0; i < 4; i++) {
    const n = 1 - Math.abs(vnoise(x * f + i * 17.3, y * f - i * 9.1) * 2 - 1);
    s += n * n * a;
    w += a;
    a *= 0.5;
    f *= 2.03;
  }
  return s / w;
}
const ROCK = new THREE.Color('#8f877a'),
  DRY = new THREE.Color('#b7a167');

export function hillsGeometry(hills: HillDef[]): THREE.BufferGeometry {
  const low = texCalidad() === 'baja',
    NR = low ? 14 : 28,
    NS = low ? 36 : 72,
    pos: number[] = [],
    idx: number[] = [],
    rid: number[] = [];
  for (const hl of hills) {
    const r = rng(hl.seed * 31 + 7),
      [bx, by, bz] = hl.p,
      R = hl.r,
      H = hl.h,
      subs = [0, 1, 2].map(() => {
        const a = r() * 6.283,
          d = 0.35 + r() * 0.3;
        return { x: Math.cos(a) * d, z: Math.sin(a) * d, h: 0.45 + r() * 0.35, w: 0.4 + r() * 0.25 };
      }),
      ox = r() * 100,
      oz = r() * 100,
      k = 2.6 / R;
    const height = (dx: number, dz: number) => {
      const u = dx / R,
        v = dz / R,
        d = Math.hypot(u, v);
      let m = Math.exp(-d * d * 2.3);
      for (const s of subs) m = Math.max(m, s.h * Math.exp(-((u - s.x) ** 2 + (v - s.z) ** 2) / (s.w * s.w)));
      const rn = ridged((bx + dx) * k + ox, (bz + dz) * k + oz),
        edge = Math.max(0, Math.min(1, (1.22 - d) / 0.3));
      return { y: H * m * (0.72 + 0.48 * rn) * edge * edge * (3 - 2 * edge), rn };
    };
    const o = pos.length / 3;
    for (let i = 0; i <= NR; i++) {
      const t = (i / NR) ** 1.25 * 1.25 * R;
      for (let j = 0; j < (i ? NS : 1); j++) {
        const a = (j / NS) * Math.PI * 2,
          dx = Math.cos(a) * t,
          dz = Math.sin(a) * t,
          h = height(dx, dz);
        pos.push(bx + dx, by - 3 + h.y, bz + dz);
        rid.push(h.rn);
      }
    }
    for (let j = 0; j < NS; j++) idx.push(o, o + 1 + ((j + 1) % NS), o + 1 + j);
    for (let i = 1; i < NR; i++)
      for (let j = 0; j < NS; j++) {
        const a = o + 1 + (i - 1) * NS + j,
          b = o + 1 + (i - 1) * NS + ((j + 1) % NS),
          c = a + NS,
          d = b + NS;
        idx.push(a, b, d, a, d, c);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  // color por vértice: monte en manchas, potrero, roca en lo empinado y en las cuchillas altas
  const n = pos.length / 3,
    N = g.attributes.normal,
    colA = new Float32Array(n * 3),
    matA = new Float32Array(n * 4),
    uv = new Float32Array(n * 2),
    info = kindInfo('grass'),
    layer = layerIndex('grass'),
    base = new THREE.Color(),
    c = new THREE.Color();
  let v = 0;
  hills.forEach((hl, h) => {
    base.set(hl.c);
    const dryBiome = base.r > base.g * 0.8,
      per = 1 + NR * NS;
    for (let i = 0; i < per; i++, v++) {
      const x = pos[v * 3],
        y = pos[v * 3 + 1] - hl.p[1] + 3,
        z = pos[v * 3 + 2],
        slope = 1 - N.getY(v),
        f = vnoise(x * 0.045 + h * 13, z * 0.045),
        f2 = vnoise(x * 0.012 - h * 7, z * 0.012),
        hy = y / Math.max(1, hl.h);
      c.copy(base);
      // manchas de monte (más oscuro y verde) y claros de potrero o milpa
      const forest = THREE.MathUtils.smoothstep(f * 0.7 + f2 * 0.5, 0.42, 0.62);
      c.multiplyScalar(1.12 - forest * 0.42);
      if (!dryBiome) c.g *= 1 + forest * 0.08;
      else c.lerp(DRY, (1 - forest) * 0.3);
      // roca donde es empinado o en las cuchillas de arriba
      const rock = Math.min(
        1,
        THREE.MathUtils.smoothstep(slope, 0.42, 0.7) + THREE.MathUtils.smoothstep(rid[v] * hy, 0.62, 0.85) * 0.6,
      );
      c.lerp(ROCK, rock * 0.55);
      // un poco más claro y seco hacia la cumbre, más verde y oscuro en el pie
      c.multiplyScalar(0.9 + hy * 0.18);
      colA[v * 3] = c.r;
      colA[v * 3 + 1] = c.g;
      colA[v * 3 + 2] = c.b;
      matA.set([layer, info?.r ?? 0.95, 0, 0], v * 4);
      uv[v * 2] = x * 0.05;
      uv[v * 2 + 1] = z * 0.05;
    }
  });
  g.setAttribute('aCol', new THREE.BufferAttribute(colA, 3));
  g.setAttribute('aMat', new THREE.BufferAttribute(matA, 4));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.computeBoundingSphere();
  return g;
}

/** Todos los cerros de fondo de la escena en una malla (sin sombra propia: quedan fuera del radio de sombras). */
export function Hills({ hills }: { hills: HillDef[] }) {
  const geo = useMemo(() => hillsGeometry(hills), [hills]);
  useEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={propMaterial()} receiveShadow />;
}
