// Formas que se pueden partir: cada una es una lista de primitivas; "mitad" corta cada una por el plano x = 0 local.
import { useMemo } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../core/types';
import type { MatKind } from '../../kit';
import { art } from '../../kit';

export interface Prim {
  k: 'sph' | 'cyl' | 'box' | 'cone';
  s: V3;
  p?: V3;
  c?: string;
  f?: string;
  m?: MatKind;
}
export interface Shape {
  r: number;
  prims: Prim[];
  dc?: string;
}
const L = (s: V3, p: V3, c: string): Prim => ({ k: 'sph', s, p, c });
const green = '#3f8f3a';
export const SHAPES: Record<string, Shape> = {
  pastel: {
    r: 0.75,
    prims: [
      { k: 'cyl', s: [0.66, 0.34, 0.66], p: [0, -0.3, 0], c: '#f7e1ad', f: '#ffe7a3', m: 'stucco' },
      { k: 'cyl', s: [0.68, 0.07, 0.68], p: [0, -0.1, 0], c: '#f06aa8', f: '#f06aa8' },
      { k: 'cyl', s: [0.46, 0.3, 0.46], p: [0, 0.14, 0], c: '#fff3df', f: '#ffe7a3', m: 'stucco' },
      { k: 'cyl', s: [0.48, 0.07, 0.48], p: [0, 0.3, 0], c: '#f06aa8', f: '#f06aa8' },
      { k: 'sph', s: [0.1, 0.1, 0.1], p: [0, 0.4, 0], c: '#e63946' },
      { k: 'cyl', s: [0.035, 0.24, 0.035], p: [-0.22, 0.46, 0], c: '#4fc3f7' },
      { k: 'cyl', s: [0.035, 0.24, 0.035], p: [0.22, 0.46, 0], c: '#ffd23f' },
      { k: 'sph', s: [0.05, 0.08, 0.05], p: [-0.22, 0.65, 0], c: '#ffb300', m: 'neon' },
      { k: 'sph', s: [0.05, 0.08, 0.05], p: [0.22, 0.65, 0], c: '#ffb300', m: 'neon' },
    ],
  },
  cana: {
    r: 0.55,
    dc: '#9ccc3b',
    prims: [
      { k: 'cyl', s: [0.17, 1.4, 0.17], c: '$', f: '#f1f5b8' },
      { k: 'cyl', s: [0.19, 0.07, 0.19], p: [0, 0.3, 0], c: '#5d7a1a' },
      { k: 'cyl', s: [0.19, 0.07, 0.19], p: [0, -0.3, 0], c: '#5d7a1a' },
      { k: 'cone', s: [0.2, 0.3, 0.2], p: [0, 0.8, 0], c: green },
    ],
  },
  coco: {
    r: 0.55,
    dc: '#6b4423',
    prims: [
      { k: 'sph', s: [0.52, 0.52, 0.52], c: '$', f: '#fff8ee' },
      L([0.07, 0.07, 0.04], [-0.14, 0.2, 0.46], '#2d1d10'),
      L([0.07, 0.07, 0.04], [0.14, 0.2, 0.46], '#2d1d10'),
    ],
  },
  pina: {
    r: 0.6,
    dc: '#f2b01e',
    prims: [
      { k: 'sph', s: [0.44, 0.58, 0.44], c: '$', f: '#ffe066' },
      { k: 'cone', s: [0.14, 0.5, 0.14], p: [0, 0.8, 0], c: green },
      { k: 'cone', s: [0.1, 0.4, 0.1], p: [0.17, 0.72, 0], c: '#2f7d32' },
      { k: 'cone', s: [0.1, 0.4, 0.1], p: [-0.17, 0.72, 0], c: '#2f7d32' },
    ],
  },
  sandia: {
    r: 0.65,
    dc: '#2e8b3d',
    prims: [
      { k: 'sph', s: [0.68, 0.54, 0.54], c: '$', f: '#e8353d' },
      { k: 'sph', s: [0.7, 0.2, 0.55], p: [0, 0.1, 0], c: '#1f6f2e' },
    ],
  },
  lena: {
    r: 0.5,
    dc: '#b07a45',
    prims: [
      { k: 'cyl', s: [0.3, 1.0, 0.3], c: '$', f: '#e8c28a', m: 'wood' },
      { k: 'cyl', s: [0.31, 0.05, 0.31], p: [0, 0.15, 0], c: '#6b4423', m: 'wood' },
      { k: 'cyl', s: [0.31, 0.05, 0.31], p: [0, -0.25, 0], c: '#6b4423', m: 'wood' },
    ],
  },
  queso: {
    r: 0.6,
    dc: '#f7d559',
    prims: [
      { k: 'cyl', s: [0.58, 0.34, 0.58], c: '$', f: '#fff2b0' },
      { k: 'sph', s: [0.07, 0.07, 0.07], p: [0.25, 0.1, 0.5], c: '#d9b23c' },
    ],
  },
  platano: {
    r: 0.5,
    dc: '#f7d84a',
    prims: [
      { k: 'cyl', s: [0.16, 1.05, 0.16], c: '$', f: '#fff7c2' },
      { k: 'cyl', s: [0.06, 0.14, 0.06], p: [0, 0.58, 0], c: '#4a3a1a' },
    ],
  },
  ayote: {
    r: 0.6,
    dc: '#e9a23b',
    prims: [
      { k: 'sph', s: [0.6, 0.52, 0.6], c: '$', f: '#f8bd4f' },
      { k: 'cyl', s: [0.07, 0.2, 0.07], p: [0, 0.55, 0], c: '#5b7a2a' },
    ],
  },
  pan: {
    r: 0.55,
    dc: '#d9964a',
    prims: [
      { k: 'sph', s: [0.66, 0.34, 0.44], c: '$', f: '#fbe7b9' },
      { k: 'sph', s: [0.6, 0.08, 0.38], p: [0, 0.22, 0], c: '#c27d35' },
    ],
  },
  tabaco: {
    r: 0.5,
    dc: '#8a5a2c',
    prims: [
      { k: 'cyl', s: [0.1, 1.1, 0.1], c: '$', f: '#c79a68' },
      { k: 'cyl', s: [0.11, 0.12, 0.11], p: [0, 0.5, 0], c: '#e8e0d0' },
    ],
  },
  elote: {
    r: 0.55,
    dc: '#f6d34a',
    prims: [
      { k: 'cyl', s: [0.21, 0.9, 0.21], c: '$', f: '#fff0a8' },
      { k: 'cone', s: [0.2, 0.7, 0.1], p: [-0.24, -0.05, 0], c: green },
      { k: 'cone', s: [0.2, 0.7, 0.1], p: [0.24, -0.05, 0], c: green },
    ],
  },
  pescado: {
    r: 0.65,
    dc: '#9fb6c8',
    prims: [
      { k: 'sph', s: [0.75, 0.3, 0.2], c: '$', f: '#f4d6d0' },
      { k: 'cone', s: [0.26, 0.3, 0.05], p: [0.85, 0, 0], c: '#7f98ad' },
      L([0.05, 0.05, 0.03], [-0.5, 0.06, 0.17], '#111'),
    ],
  },
  melon: { r: 0.55, dc: '#d7e08a', prims: [{ k: 'sph', s: [0.54, 0.52, 0.54], c: '$', f: '#f8c98a' }] },
  papa: {
    r: 0.45,
    dc: '#b88a52',
    prims: [
      { k: 'sph', s: [0.42, 0.34, 0.36], c: '$', f: '#f6e8b8' },
      L([0.05, 0.04, 0.03], [-0.1, 0.1, 0.33], '#6b4a26'),
    ],
  },
  mango: {
    r: 0.5,
    dc: '#f2a01e',
    prims: [
      { k: 'sph', s: [0.38, 0.52, 0.34], c: '$', f: '#ffb627' },
      { k: 'sph', s: [0.1, 0.06, 0.1], p: [0, 0.5, 0], c: '#4f7d2a' },
    ],
  },
  jocote: {
    r: 0.4,
    dc: '#c0392b',
    prims: [
      { k: 'sph', s: [0.32, 0.34, 0.32], c: '$', f: '#f7d26a' },
      { k: 'cyl', s: [0.025, 0.14, 0.025], p: [0, 0.34, 0], c: '#4a3a1a' },
    ],
  },
  pepino: { r: 0.5, dc: '#3d8b40', prims: [{ k: 'cyl', s: [0.2, 1.0, 0.2], c: '$', f: '#dff0b4' }] },
  // cosas que se evitan
  avispa: {
    r: 0.6,
    prims: [
      { k: 'sph', s: [0.3, 0.22, 0.22], c: '#f5c518', f: '#e8b010' },
      { k: 'sph', s: [0.22, 0.2, 0.2], p: [0.26, 0, 0], c: '#222222' },
      { k: 'sph', s: [0.16, 0.16, 0.16], p: [-0.3, 0, 0], c: '#c0392b' },
      { k: 'box', s: [0.5, 0.02, 0.26], p: [0, 0.25, 0.12], c: '#e8f4ff', m: 'glass' },
      { k: 'cone', s: [0.03, 0.2, 0.03], p: [0.5, -0.06, 0], c: '#111' },
    ],
  },
  piedra: {
    r: 0.6,
    prims: [
      { k: 'sph', s: [0.56, 0.46, 0.5], c: '#7b7f86', f: '#4a4d52', m: 'stone' },
      { k: 'sph', s: [0.28, 0.25, 0.26], p: [0.3, 0.3, 0.1], c: '#8f939a', m: 'stone' },
    ],
  },
};
export const shapeOf = (nombre?: string): Shape | undefined => (nombre ? SHAPES[nombre] : undefined);

const cache = new Map<string, THREE.BufferGeometry>();
function geo(k: Prim['k'], half: -1 | 0 | 1): THREE.BufferGeometry {
  const key = k + half;
  let g = cache.get(key);
  if (g) return g;
  if (k === 'sph')
    g =
      half === 0
        ? new THREE.SphereGeometry(1, 18, 12)
        : new THREE.SphereGeometry(1, 14, 12, half > 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI);
  else if (k === 'cyl')
    g =
      half === 0
        ? new THREE.CylinderGeometry(1, 1, 1, 22)
        : new THREE.CylinderGeometry(1, 1, 1, 14, 1, false, half > 0 ? 0 : Math.PI, Math.PI);
  else if (k === 'cone')
    g =
      half === 0
        ? new THREE.CylinderGeometry(0, 1, 1, 14)
        : new THREE.CylinderGeometry(0, 1, 1, 10, 1, false, half > 0 ? 0 : Math.PI, Math.PI);
  else g = half === 0 ? new THREE.BoxGeometry(1, 1, 1) : new THREE.BoxGeometry(0.5, 1, 1).translate(half * 0.25, 0, 0);
  cache.set(key, g);
  return g;
}
const faceCache = new Map<string, THREE.BufferGeometry>();
function face(k: Prim['k'], half: -1 | 1) {
  const key = k + half;
  let g = faceCache.get(key);
  if (g) return g;
  g = (k === 'sph' ? new THREE.CircleGeometry(1, 18) : new THREE.PlaneGeometry(2, 1)).rotateY(
    half > 0 ? -Math.PI / 2 : Math.PI / 2,
  ); // el corte mira hacia afuera
  faceCache.set(key, g);
  return g;
}
/** Dibuja una forma entera (half 0) o su mitad izquierda (-1) / derecha (1). */
export function ShapeMesh({ shape, color, half }: { shape: Shape; color?: string; half: -1 | 0 | 1 }) {
  const parts = useMemo(
    () =>
      shape.prims.map((pr) => {
        const c = pr.c === '$' ? (color ?? shape.dc ?? '#cccccc') : (pr.c ?? color ?? '#cccccc');
        return { pr, mat: art.material(pr.m ?? 'plastic', c), fmat: art.material('plastic', pr.f ?? c) };
      }),
    [shape, color],
  );
  return (
    <>
      {parts.map(({ pr, mat, fmat }, i) => {
        const p = pr.p ?? [0, 0, 0],
          sc: V3 = pr.k === 'cyl' || pr.k === 'cone' ? [pr.s[0], pr.s[1], pr.s[2]] : pr.s;
        if (half === 0)
          return <mesh key={i} geometry={geo(pr.k, 0)} material={mat} position={p} scale={sc} castShadow />;
        if (Math.abs(p[0]) > 0.05)
          return Math.sign(p[0]) === half ? (
            <mesh key={i} geometry={geo(pr.k, 0)} material={mat} position={p} scale={sc} castShadow />
          ) : null;
        const fs: V3 = pr.k === 'sph' ? [1, sc[1], sc[2]] : [1, sc[1], sc[2]];
        return (
          <group key={i}>
            <mesh geometry={geo(pr.k, half)} material={mat} position={p} scale={sc} castShadow />
            {(pr.k === 'sph' || pr.k === 'cyl') && (
              <mesh
                geometry={face(pr.k, half)}
                material={fmat}
                position={p}
                scale={pr.k === 'sph' ? fs : [1, sc[1], sc[2] / 1]}
              />
            )}
          </group>
        );
      })}
    </>
  );
}
