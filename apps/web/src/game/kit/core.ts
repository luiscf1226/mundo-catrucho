// Base del kit SIN dependencia del paquete de arte: bucle de juego, colisionadores y texturas de texto.
// Los paquetes de arte (kit/art/*) importan de aquí, nunca de kit/index (evita un ciclo de módulos).

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { type BoxCol, type Collider, type CylCol, phys } from '../../core/phys';
import { isPaused, mgPlaying } from '../../core/store';
import type { V3 } from '../../core/types';

/** Bucle de juego: se salta mientras hay pausa y limita dt para que un cuadro lento no rompa la física. */
export function useTick(cb: (dt: number, t: number) => void, priority = 0) {
  const ref = useRef(cb);
  ref.current = cb;
  useFrame((s, d) => {
    if (!isPaused()) ref.current(Math.min(d, 0.05), s.clock.elapsedTime);
  }, priority);
}
/** Igual que useTick, pero solo corre mientras el minijuego está en fase de juego. */
export function useMgTick(cb: (dt: number, t: number) => void, priority = 0) {
  const ref = useRef(cb);
  ref.current = cb;
  useFrame((s, d) => {
    if (mgPlaying()) ref.current(Math.min(d, 0.05), s.clock.elapsedTime);
  }, priority);
}

/** Registra un colisionador mientras el componente esté montado. Devuelve el objeto (se puede mover a mano). */
export function useCollider<T extends Collider>(make: () => T, deps: unknown[] = []): T {
  const c = useMemo(make, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    phys.add(c);
    return () => {
      phys.remove(c);
    };
  }, [c]);
  return c;
}
export const boxCol = (pos: V3, size: V3, extra: Partial<BoxCol> = {}): BoxCol => ({
  type: 'box',
  min: [pos[0] - size[0] / 2, pos[1] - size[1] / 2, pos[2] - size[2] / 2],
  max: [pos[0] + size[0] / 2, pos[1] + size[1] / 2, pos[2] + size[2] / 2],
  solid: true,
  ...extra,
});
export const cylCol = (pos: V3, r: number, h: number, extra: Partial<CylCol> = {}): CylCol => ({
  type: 'cyl',
  x: pos[0],
  z: pos[2],
  r,
  y0: pos[1] - h / 2,
  y1: pos[1] + h / 2,
  solid: true,
  ...extra,
});
/** Mueve una caja de colisión (plataformas móviles) y anota su velocidad para arrastrar al jugador. */
export function moveBox(c: BoxCol, pos: V3, size: V3, dt: number) {
  const cx = (c.min[0] + c.max[0]) / 2,
    cy = (c.min[1] + c.max[1]) / 2,
    cz = (c.min[2] + c.max[2]) / 2;
  c.vel = dt > 0 ? [(pos[0] - cx) / dt, (pos[1] - cy) / dt, (pos[2] - cz) / dt] : [0, 0, 0];
  c.min = [pos[0] - size[0] / 2, pos[1] - size[1] / 2, pos[2] - size[2] / 2];
  c.max = [pos[0] + size[0] / 2, pos[1] + size[1] / 2, pos[2] + size[2] / 2];
}

const texCache = new Map<string, THREE.CanvasTexture>();
/** Textura con texto dibujado en un lienzo (no descarga fuentes ni nada externo). */
export function textTexture(
  text: string,
  o: { fg?: string; bg?: string; size?: number; font?: string; pad?: number; radius?: number; stroke?: string } = {},
) {
  const {
    fg = '#ffffff',
    bg = 'rgba(0,0,0,0)',
    size = 64,
    font = '800 SIZEpx "Fredoka", "Baloo 2", system-ui, sans-serif',
    pad = 0.35,
    radius = 0.4,
    stroke,
  } = o;
  const key = [text, fg, bg, size, font, pad, radius, stroke].join('|');
  const hit = texCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas'),
    c = cv.getContext('2d')!;
  const f = font.replace('SIZE', String(size));
  c.font = f;
  const w = Math.ceil(c.measureText(text).width + size * pad * 2),
    h = Math.ceil(size * (1 + pad * 1.4));
  cv.width = w;
  cv.height = h;
  c.font = f;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  if (bg !== 'rgba(0,0,0,0)') {
    c.fillStyle = bg;
    const r = h * radius;
    c.beginPath();
    c.moveTo(r, 0);
    c.arcTo(w, 0, w, h, r);
    c.arcTo(w, h, 0, h, r);
    c.arcTo(0, h, 0, 0, r);
    c.arcTo(0, 0, w, 0, r);
    c.closePath();
    c.fill();
  }
  if (stroke) {
    c.lineWidth = size * 0.14;
    c.strokeStyle = stroke;
    c.lineJoin = 'round';
    c.strokeText(text, w / 2, h / 2 + size * 0.04);
  }
  c.fillStyle = fg;
  c.fillText(text, w / 2, h / 2 + size * 0.04);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  (tex as any).aspect = w / h;
  texCache.set(key, tex);
  return tex;
}
