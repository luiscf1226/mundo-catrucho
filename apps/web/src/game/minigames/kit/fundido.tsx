// Decorado fusionado sin colisión y rótulos pintados en un solo atlas.
// `Fundido` dibuja piezas (Pc) como <Build> pero sin registrar colisiones: lo opaco va en una malla (una llamada de
// dibujo) y vidrio, agua y neón aparte. `Rotulos` junta muchos letreros pintados (pulperías, comercios de carretera,
// señales) en una textura de lienzo y una sola malla: cuestan una llamada en total, no una por letrero.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../core/types';
import { type Merged, mergePieces, type Pc } from '../../dept/lib';
import { art } from '../../kit';

/** Piezas fusionadas sin colisión. `pcs` debe venir memorizado (se refusiona cuando cambia). */
export function Fundido({ pcs, sombra = true }: { pcs: Pc[]; sombra?: boolean }) {
  const grupos = useMemo(() => mergePieces(pcs, true), [pcs]);
  useEffect(
    () => () => {
      for (const g of grupos) g.geo.dispose();
    },
    [grupos],
  );
  return <Mallas grupos={grupos} sombra={sombra} />;
}
/** Dibuja grupos ya fusionados (p. ej. compartidos entre varias copias). */
export function Mallas({ grupos, sombra = true }: { grupos: Merged[]; sombra?: boolean }) {
  return (
    <>
      {grupos.map((g) => (
        <mesh
          key={g.key}
          geometry={g.geo}
          material={g.mat ?? art.material(g.m, g.c)}
          castShadow={sombra && g.m !== 'neon' && g.m !== 'water' && g.m !== 'glass'}
          receiveShadow
        />
      ))}
    </>
  );
}

/** Un rótulo pintado: centro, giro en Y (la cara mira a +Z sin giro), ancho y alto en metros. */
export interface Rotulo {
  p: V3;
  r?: number;
  w: number;
  h: number;
  text: string;
  fg?: string;
  bg?: string;
  /** 'pintado' (letra gorda de brocha, por defecto) o 'senal' (letra de señal de tránsito) */
  letra?: 'pintado' | 'senal';
}
const FILA = 112,
  ANCHO = 1024;
function atlas(items: Rotulo[]) {
  // los rótulos iguales (el mismo letrero repetido en cada copia del tramo) comparten fila: el lienzo queda varias
  // veces más chico y se pinta y se sube a la GPU mucho más rápido
  const filaDe = new Map<string, number>(),
    filas: { it: Rotulo; w: number }[] = [],
    deItem = items.map((it) => {
      const w = Math.min(ANCHO, Math.round(FILA * (it.w / it.h))),
        k = `${it.text}|${it.fg}|${it.bg}|${it.letra}|${w}`;
      let f = filaDe.get(k);
      if (f === undefined) {
        f = filas.length;
        filaDe.set(k, f);
        filas.push({ it, w });
      }
      return f;
    });
  const cv = document.createElement('canvas');
  cv.width = ANCHO;
  cv.height = THREE.MathUtils.ceilPowerOfTwo(Math.max(FILA, filas.length * FILA));
  const c = cv.getContext('2d');
  const uvFila: [number, number, number, number][] = [];
  filas.forEach(({ it, w }, i) => {
    const y = i * FILA;
    if (c) {
      c.fillStyle = it.bg ?? '#f3ead2';
      c.fillRect(0, y, w, FILA);
      // brochazos: el fondo pintado a mano no es parejo
      for (let k = 0; k < 14; k++) {
        c.globalAlpha = 0.06;
        c.fillStyle = k % 2 ? '#000' : '#fff';
        c.fillRect(((k * 97) % w) - 20, y + ((k * 37) % FILA), 60 + ((k * 53) % 120), 6 + (k % 3) * 5);
      }
      c.globalAlpha = 1;
      const sz = it.letra === 'senal' ? 62 : 70;
      c.font =
        it.letra === 'senal'
          ? `700 ${sz}px "Arial Narrow", "Roboto Condensed", system-ui, sans-serif`
          : `800 ${sz}px "Fredoka", "Baloo 2", system-ui, sans-serif`;
      const tw = c.measureText(it.text).width,
        k = Math.min(1, (w * 0.9) / Math.max(1, tw));
      c.save();
      c.translate(w / 2, y + FILA / 2 + 4);
      c.scale(k, 1);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      if (it.letra !== 'senal') {
        c.fillStyle = 'rgba(0,0,0,0.28)';
        c.fillText(it.text, 3, 4);
      }
      c.fillStyle = it.fg ?? '#7a1d1d';
      c.fillText(it.text, 0, 0);
      c.restore();
    }
    uvFila.push([0, 1 - (y + FILA) / cv.height, w / ANCHO, 1 - y / cv.height]);
  });
  const uvs = deItem.map((f) => uvFila[f]);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, uvs };
}
/** Muchos rótulos pintados en una malla (una llamada de dibujo); los ilumina la escena como pintura de pared. */
export function Rotulos({ items }: { items: Rotulo[] }) {
  // El material vive lo que vive el componente: si se soltara con cada texto nuevo (los letreros del viaje cambian
  // con el tramo), three.js liberaría su programa y lo volvería a compilar, y eso traba un cuadro (~200 ms con CPU ×4).
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.92,
        metalness: 0,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const hecho = useMemo(() => {
    if (!items.length || typeof document === 'undefined') return null;
    const { tex, uvs } = atlas(items),
      n = items.length,
      pos = new Float32Array(n * 12),
      nor = new Float32Array(n * 12),
      uv = new Float32Array(n * 8),
      idx: number[] = [];
    items.forEach((it, i) => {
      const c = Math.cos(it.r ?? 0),
        s = Math.sin(it.r ?? 0),
        [u0, v0, u1, v1] = uvs[i];
      const esq: [number, number, number, number][] = [
        [-it.w / 2, -it.h / 2, u0, v0],
        [it.w / 2, -it.h / 2, u1, v0],
        [it.w / 2, it.h / 2, u1, v1],
        [-it.w / 2, it.h / 2, u0, v1],
      ];
      esq.forEach(([x, y, u, v], k) => {
        const o = (i * 4 + k) * 3;
        // mismo giro que place(): local (x, z=0) → (x·cos, −x·sin)
        pos[o] = it.p[0] + x * c;
        pos[o + 1] = it.p[1] + y;
        pos[o + 2] = it.p[2] - x * s;
        nor[o] = s;
        nor[o + 1] = 0;
        nor[o + 2] = c;
        uv[(i * 4 + k) * 2] = u;
        uv[(i * 4 + k) * 2 + 1] = v;
      });
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return { geo, tex };
  }, [items]);
  // cambiar de un mapa a otro no cambia el programa (solo si pasara de tener mapa a no tenerlo)
  if (hecho && mat.map !== hecho.tex) mat.map = hecho.tex;
  useEffect(
    () => () => {
      hecho?.geo.dispose();
      hecho?.tex.dispose();
    },
    [hecho],
  );
  if (!hecho) return null;
  return <mesh geometry={hecho.geo} material={mat} receiveShadow />;
}
