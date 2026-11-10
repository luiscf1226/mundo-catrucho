// Piezas repetidas con InstancedMesh (una llamada de dibujo por material + color). Usan art.material, así que se ven
// como el resto del kit en las dos versiones. Sirven para detalles pequeños: banderines, focos, postes, productos.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../core/types';
import type { MatKind } from '../../kit';
import { art } from '../../kit';

/** Una pieza: caja (s = [ancho, alto, fondo]), bola (s = radio o [rx, ry, rz]) o cilindro (s = [radio, alto, radio]).
 *  Con `a` y `b` la pieza es una varilla de grosor `w` que va de un punto al otro. `r` = giro (euler XYZ). */
export interface Piece {
  p?: V3;
  s?: V3 | number;
  c: string;
  r?: V3;
  a?: V3;
  b?: V3;
  w?: number;
}
type Geo = 'box' | 'ball' | 'cyl';
const GEO: Record<Geo, THREE.BufferGeometry> = {
  box: new THREE.BoxGeometry(1, 1, 1),
  ball: new THREE.SphereGeometry(1, 14, 10),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 12),
};
const M = new THREE.Matrix4(),
  Q = new THREE.Quaternion(),
  E = new THREE.Euler(),
  P3 = new THREE.Vector3(),
  S3 = new THREE.Vector3(),
  UP = new THREE.Vector3(0, 1, 0),
  D = new THREE.Vector3();

export function pieceMatrix(it: Piece, out = M) {
  if (it.a && it.b) {
    D.set(it.b[0] - it.a[0], it.b[1] - it.a[1], it.b[2] - it.a[2]);
    const len = D.length() || 1e-6,
      w = it.w ?? 0.05;
    Q.setFromUnitVectors(UP, D.divideScalar(len));
    P3.set((it.a[0] + it.b[0]) / 2, (it.a[1] + it.b[1]) / 2, (it.a[2] + it.b[2]) / 2);
    S3.set(w, len, w);
  } else {
    const s = it.s ?? 1,
      p = it.p ?? [0, 0, 0];
    if (it.r) Q.setFromEuler(E.set(it.r[0], it.r[1], it.r[2]));
    else Q.identity();
    P3.set(p[0], p[1], p[2]);
    if (typeof s === 'number') S3.set(s, s, s);
    else S3.set(s[0], s[1], s[2]);
  }
  return out.compose(P3, Q, S3);
}

function Group({
  geo,
  mat,
  color,
  list,
  cast,
}: {
  geo: Geo;
  mat: MatKind;
  color: string;
  list: Piece[];
  cast: boolean;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    list.forEach((it, i) => m.setMatrixAt(i, pieceMatrix(it)));
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.computeBoundingBox();
  }, [list]);
  return (
    <instancedMesh ref={ref} args={[GEO[geo], art.material(mat, color), list.length]} castShadow={cast} receiveShadow />
  );
}
/** Dibuja la lista agrupada por color. `items` debe ser estable (constante de módulo o useMemo). */
export function Inst({ geo, mat, items, cast = false }: { geo: Geo; mat: MatKind; items: Piece[]; cast?: boolean }) {
  const groups = useMemo(() => {
    const m = new Map<string, Piece[]>();
    for (const it of items) {
      const l = m.get(it.c);
      if (l) l.push(it);
      else m.set(it.c, [it]);
    }
    return [...m];
  }, [items]);
  return (
    <>
      {groups.map(([c, list]) => (
        <Group key={`${c}|${list.length}`} geo={geo} mat={mat} color={c} list={list} cast={cast} />
      ))}
    </>
  );
}
export const Boxes = (p: { mat: MatKind; items: Piece[]; cast?: boolean }) => <Inst geo="box" {...p} />;
export const Balls = (p: { mat: MatKind; items: Piece[]; cast?: boolean }) => <Inst geo="ball" {...p} />;
export const Cyls = (p: { mat: MatKind; items: Piece[]; cast?: boolean }) => <Inst geo="cyl" {...p} />;

/** Generador pseudoaleatorio con semilla (mulberry32): mismos adornos en cada partida. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
