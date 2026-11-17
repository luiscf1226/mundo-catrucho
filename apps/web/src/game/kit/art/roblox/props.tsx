// Utilería Roblox, parte 1: naturaleza y pueblo. Cada pieza es UNA malla fusionada (color + capa por vértice).
// Mismas medidas y colisionadores que kit/art/base.tsx.

import { useSyncExternalStore } from 'react';
import * as THREE from 'three';
import { textTexture } from '../../core';
import type { ArtProps } from '../types';
import { drawFlag } from './atlas';
import { dodGeo, icoGeo, mixHex, rng, shade, torGeo, type V3 } from './geo';
import { isNight, subscribeNight, TIME, touchTime } from './mats';
import { beam, geo, Mesh, Placed, slope, TextPlane, useSolidBox, useSolidCyl, variant } from './pk';

const PI = Math.PI,
  DARK = '#23252b',
  TRIM = '#fbf3e2',
  WOOD = '#8a5a34',
  WOOD_D = '#6b3f22';
type Nature = Pick<ArtProps, 'Tree' | 'Palm' | 'Pine' | 'Bush' | 'Flowers' | 'Rock'>;
type Town = Pick<
  ArtProps,
  'House' | 'Lamp' | 'Bench' | 'Fence' | 'Flag' | 'Stall' | 'Kiosk' | 'Fountain' | 'Statue' | 'Sign' | 'PortalArch'
>;

// ------------------------------------------------------------------ naturaleza
export const nature: Nature = {
  Tree: (a) => {
    useSolidCyl(a, 0.35, 3);
    const c = a.color ?? '#3f9b4b',
      v = variant(a, 4);
    const g = geo(`tree|${c}|${v}`, (b) => {
      const r = rng(v + 11);
      b.box([0, 1.45, 0], [0.56, 2.9, 0.56], '#7a5230', { k: 'stucco', bevel: 0.08 });
      b.box([0, 0.14, 0], [0.8, 0.28, 0.8], '#6b4728', { k: 'stucco', bevel: 0.08, r: [0, 0.4, 0] });
      b.box([0.36, 2.2, 0.05], [0.7, 0.2, 0.2], '#7a5230', { k: 'stucco', r: [0, 0.3, 0.6] });
      const blob = (p: V3, s: V3, k: number) =>
        b.box([p[0] + (r() - 0.5) * 0.3, p[1], p[2] + (r() - 0.5) * 0.3], s, shade(c, k), {
          k: 'leaf',
          bevel: 0.22,
          r: [0, (r() - 0.5) * 0.9, 0],
        });
      blob([0, 3.55, 0], [3.5, 1.7, 3.4], -0.06);
      blob([0.15, 4.75, -0.1], [2.5, 1.3, 2.4], 0.06);
      blob([0.1, 5.5, 0], [1.4, 0.7, 1.4], 0.16);
      blob([1.45, 3.05, 0.6], [1.7, 1.15, 1.7], 0.02);
      blob([-1.35, 3.25, -0.7], [1.6, 1.1, 1.7], -0.14);
      blob([-0.5, 2.95, 1.35], [1.4, 0.9, 1.3], -0.02);
      if (v % 2)
        for (let i = 0; i < 5; i++)
          b.sph(
            [Math.cos(i * 1.9) * 1.5, 3.0 + (i % 3) * 0.7, Math.sin(i * 1.9) * 1.55],
            0.13,
            i % 2 ? '#ff9f1c' : '#e63946',
            { w: 6, h: 4 },
          );
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Palm: (a) => {
    useSolidCyl(a, 0.25, 4);
    const c = a.color ?? '#2e8b3d',
      v = variant(a, 4);
    const g = geo(`palm|${c}|${v}`, (b) => {
      const r = rng(v + 3),
        lean = (v - 1.5) * 0.28,
        N = 8;
      let tx = 0,
        tz = 0;
      for (let i = 0; i < N; i++) {
        const t = i / N,
          rad = 0.27 - t * 0.1;
        tx = lean * t * t * 1.4;
        tz = lean * 0.4 * t * t;
        b.cyl([tx, 0.3 + i * 0.6, tz], rad, 0.62, i % 2 ? '#9c7a4d' : '#8a6a40', {
          rt: rad * 1.14,
          sides: 8,
          k: 'stucco',
        });
      }
      const top = 0.3 + N * 0.6 - 0.25;
      b.sph([tx, top, tz], 0.3, '#6b8f3a', { w: 8, h: 6 });
      for (let i = 0; i < 3; i++)
        b.sph([tx + Math.cos(i * 2.1 + 0.5) * 0.24, top - 0.24, tz + Math.sin(i * 2.1 + 0.5) * 0.24], 0.17, '#5a3d26', {
          w: 7,
          h: 5,
        });
      for (let i = 0; i < 9; i++) {
        const ang = (i / 9) * PI * 2 + (r() - 0.5) * 0.3,
          up = (r() - 0.5) * 0.25,
          c1 = shade(c, ((i % 3) - 1) * 0.09);
        b.push([tx, top + 0.1, tz], [0, ang, 0]);
        b.box([0.6, 0.2 + up * 0.6, 0], [1.25, 0.07, 0.56], c1, { r: [0, 0, 0.32 + up], k: 'leaf' });
        b.box([1.62, 0.3 + up, 0], [1.1, 0.07, 0.48], shade(c1, 0.06), { r: [0, 0, -0.22 + up], k: 'leaf' });
        b.box([2.42, -0.02 + up, 0], [0.9, 0.06, 0.34], shade(c1, -0.06), { r: [0, 0, -0.72 + up], k: 'leaf' });
        b.pop();
      }
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Pine: (a) => {
    useSolidCyl(a, 0.3, 3);
    const c = a.color ?? '#2f6b3a',
      v = variant(a, 3);
    const g = geo(`pine|${c}|${v}`, (b) => {
      b.cyl([0, 1, 0], 0.24, 2, '#6b4a2a', { sides: 8, k: 'stucco', rt: 0.18 });
      const T = [
        [2.25, 1.65, 1.5],
        [3.2, 1.38, 1.4],
        [4.1, 1.08, 1.3],
        [4.95, 0.74, 1.3],
      ];
      T.forEach(([y, rr, h], i) =>
        b.cyl([0, y, 0], rr * (1 + v * 0.04), h, shade(c, i % 2 ? 0.07 : -0.05), {
          rt: i === 3 ? 0.02 : rr * 0.28,
          sides: 8,
          k: 'leaf',
          r: [0, i * 0.4, 0],
        }),
      );
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Bush: (a) => {
    const c = a.color ?? '#3f9b4b',
      v = variant(a, 3);
    const g = geo(`bush|${c}|${v}`, (b) => {
      b.add(icoGeo(1), [0, 0.42, 0], [0.86, 0.6, 0.76], c, { k: 'leaf', r: [0, v, 0] });
      b.add(icoGeo(1), [0.52, 0.34, 0.26], [0.48, 0.42, 0.46], shade(c, 0.1), { k: 'leaf', r: [0.3, v, 0] });
      b.add(icoGeo(1), [-0.5, 0.36, -0.2], [0.52, 0.44, 0.5], shade(c, -0.12), { k: 'leaf', r: [0, v + 1, 0.2] });
      if (v)
        for (let i = 0; i < 5; i++)
          b.box(
            [Math.cos(i * 1.4) * 0.55, 0.62 + (i % 2) * 0.22, Math.sin(i * 1.4) * 0.45],
            [0.12, 0.12, 0.12],
            v === 1 ? '#ff5d9e' : '#ffe14d',
            { r: [0.5, i, 0.4] },
          );
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Flowers: (a) => {
    const v = variant(a, 3),
      PAL = ['#ff5d73', '#ffc93c', '#ffffff', '#b56cff', '#ff8a3d'];
    const g = geo(`flowers|${a.color}|${v}`, (b) => {
      const r = rng(v + 5);
      for (let i = 0; i < 7; i++) {
        const an = i * 0.9 + v,
          rad = i === 0 ? 0 : 0.32 + r() * 0.3,
          x = Math.cos(an) * rad,
          z = Math.sin(an) * rad,
          h = 0.26 + r() * 0.22,
          c = a.color ?? PAL[(i + v) % PAL.length];
        b.box([x, h / 2, z], [0.04, h, 0.04], '#3d8f3a');
        b.box([x + 0.07, h * 0.45, z], [0.14, 0.03, 0.08], '#4caf50', { r: [0, an, 0.5] });
        b.box([x, h + 0.02, z], [0.24, 0.07, 0.09], c, { r: [0, an, 0] });
        b.box([x, h + 0.02, z], [0.09, 0.07, 0.24], c, { r: [0, an, 0] });
        b.box([x, h + 0.05, z], [0.09, 0.07, 0.09], c === '#ffc93c' ? '#ff8a3d' : '#ffd23f', { r: [0, an, 0] });
      }
      for (let i = 0; i < 5; i++)
        b.box([Math.cos(i * 1.3 + 1) * 0.42, 0.07, Math.sin(i * 1.3 + 1) * 0.42], [0.2, 0.14, 0.05], '#4caf50', {
          r: [0, i * 1.1, 0.25],
        });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Rock: (a) => {
    useSolidCyl(a, 0.7, 0.9);
    const c = a.color ?? '#8a8f96',
      v = variant(a, 4);
    const g = geo(`rock|${c}|${v}`, (b) => {
      b.add(dodGeo(), [0, 0.4, 0], [0.92, 0.62, 0.8], c, { k: 'stone', r: [0.2 * v, v * 1.3, 0.1] });
      b.add(dodGeo(), [0.55, 0.22, 0.38], [0.42, 0.32, 0.4], shade(c, -0.1), { k: 'stone', r: [0.5, v, 0.3] });
      b.add(dodGeo(), [-0.5, 0.18, -0.36], [0.36, 0.26, 0.34], shade(c, 0.08), { k: 'stone', r: [v, 0.4, 0.2] });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
};

// ------------------------------------------------------------------ bandera ondeando
let flagMat: THREE.MeshStandardMaterial | null = null;
const flagGeo = new THREE.PlaneGeometry(1, 1, 18, 3);
function getFlagMat() {
  if (flagMat) return flagMat;
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 256;
  drawFlag(cv.getContext('2d')!, 512, 256);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const m = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.85 });
  m.toneMapped = false;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.rbTime = TIME;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float rbTime;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nfloat fx = uv.x; transformed.z += sin(uv.x * 7.0 - rbTime * 5.0 + uv.y * 1.3) * 0.075 * fx; transformed.y += (sin(uv.x * 4.0 - rbTime * 3.4) * 0.05 - fx * 0.08) * fx;',
      );
  };
  m.customProgramCacheKey = () => 'rbxflag';
  m.onBeforeRender = touchTime;
  return (flagMat = m);
}
/** Bandera de Honduras ondeando. `pos` es el centro de la tela; queda sujeta por el lado −X. */
export function HondurasFlag({ pos, w = 2, h = 1 }: { pos: V3; w?: number; h?: number }) {
  return <mesh geometry={flagGeo} material={getFlagMat()} position={pos} scale={[w, h, 1]} castShadow />;
}

// ------------------------------------------------------------------ portal
const SW_VS = /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const SW_FS = /* glsl */ `
uniform float uT; uniform vec3 uC; varying vec2 vUv;
void main() {
  vec2 p = (vUv - 0.5) * vec2(2.3, 3.1) / 1.3; float r = length(p), a = atan(p.y, p.x);
  float sw = sin(a * 3.0 + r * 5.5 - uT * 2.6), sw2 = sin(a * 5.0 - r * 9.0 + uT * 1.7);
  float band = smoothstep(0.1, 0.9, sw) * 0.55 + smoothstep(0.55, 1.0, sw2) * 0.3;
  vec3 c = mix(uC * 0.75, vec3(1.0), band); c = mix(c, vec3(1.0), smoothstep(0.5, 0.0, r) * 0.55);
  float spark = step(0.965, fract(sin(dot(floor(vUv * vec2(26.0, 36.0) + vec2(0.0, uT * 1.5)), vec2(12.9898, 78.233))) * 43758.5453));
  c += spark * 0.6;
  gl_FragColor = vec4(c, 0.62 + band * 0.3);
  #include <colorspace_fragment>
}`;
const swirlMats = new Map<string, THREE.ShaderMaterial>();
function swirlMat(color: string) {
  let m = swirlMats.get(color);
  if (!m) {
    m = new THREE.ShaderMaterial({
      vertexShader: SW_VS,
      fragmentShader: SW_FS,
      transparent: true,
      side: THREE.DoubleSide,
      forceSinglePass: true,
      depthWrite: false,
      uniforms: { uT: TIME, uC: { value: new THREE.Color(color) } },
    });
    m.onBeforeRender = touchTime;
    swirlMats.set(color, m);
  }
  return m;
}
const unitPlane = new THREE.PlaneGeometry(1, 1);

// ------------------------------------------------------------------ pueblo
const SHUT = ['#2e6f8e', '#3f7d4e', '#8a4b2a', '#1f5fa8'];
function houseGeo(w: number, d: number, floors: number, wall: string, roofColor: string, v: number) {
  return geo(`house|${w}|${d}|${floors}|${wall}|${roofColor}|${v}`, (b) => {
    const h = 3 * floors,
      plinth = shade(mixHex(wall, '#a04a32', 0.35), -0.3),
      shut = SHUT[v % 4],
      z0 = d / 2;
    b.box([0, h / 2, 0], [w, h, d], wall, { k: 'stucco' });
    b.box([0, 0.36, 0], [w + 0.1, 0.72, d + 0.1], plinth, { k: 'stucco' });
    b.box([0, 0.75, 0], [w + 0.14, 0.07, d + 0.14], shade(plinth, -0.18));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1])
        b.box([sx * (w / 2 - 0.1), h / 2 + 0.39, sz * (d / 2 - 0.1)], [0.34, h - 0.78, 0.34], TRIM, { k: 'stucco' });
    b.box([0, h - 0.15, 0], [w + 0.16, 0.3, d + 0.16], TRIM);
    if (floors > 1) b.box([0, 3, 0], [w + 0.12, 0.18, d + 0.12], TRIM);
    let wi = v;
    const win = (x: number, y: number, z: number, ry: number, ww: number, wh: number, sh: boolean, pot = false) => {
      b.push([x, y, z], [0, ry, 0]);
      wi++;
      b.box([0, 0, 0.02], [ww + 0.22, wh + 0.22, 0.08], TRIM);
      b.box([0, 0, 0.05], [ww, wh, 0.06], '#27455f', { k: 'glass', lit: wi % 3 !== 0 });
      b.box([0, -wh / 2 - 0.13, 0.1], [ww + 0.36, 0.08, 0.26], TRIM);
      b.box([0, wh / 2 + 0.15, 0.06], [ww + 0.36, 0.09, 0.14], TRIM);
      for (let i = -1; i <= 1; i++) b.box([i * ww * 0.27, 0, 0.14], [0.035, wh + 0.12, 0.035], DARK);
      for (const yy of [-wh * 0.3, wh * 0.3]) b.box([0, yy, 0.14], [ww + 0.08, 0.035, 0.035], DARK);
      if (sh)
        for (const s of [-1, 1]) {
          b.box([s * (ww / 2 + 0.27), 0, 0.08], [0.38, wh + 0.06, 0.06], shut, { k: 'wood', r: [0, s * -0.32, 0] });
        }
      if (pot) {
        b.box([0, -wh / 2 - 0.02, 0.2], [ww * 0.9, 0.16, 0.16], '#b5523b');
        for (let i = 0; i < 5; i++) {
          b.box([(i - 2) * ww * 0.19, -wh / 2 + 0.12, 0.2], [0.15, 0.14, 0.14], '#3d8f3a', { r: [0, i, 0] });
          b.box(
            [(i - 2) * ww * 0.19, -wh / 2 + 0.21, 0.21],
            [0.09, 0.08, 0.09],
            ['#ff5d73', '#ffd23f', '#ffffff'][(i + v) % 3],
            { r: [0, i * 2, 0] },
          );
        }
      }
      b.pop();
    };
    // puerta
    b.box([0, 1.2, z0 + 0.02], [1.56, 2.4, 0.1], TRIM);
    b.box([0, 1.1, z0 + 0.06], [1.2, 2.2, 0.1], WOOD_D, { k: 'wood' });
    for (const s of [-1, 1]) {
      b.box([s * 0.29, 1.6, z0 + 0.115], [0.42, 0.86, 0.03], shade(WOOD_D, -0.22));
      b.box([s * 0.29, 0.6, z0 + 0.115], [0.42, 0.76, 0.03], shade(WOOD_D, -0.22));
    }
    b.box([0, 1.1, z0 + 0.12], [0.03, 2.2, 0.02], shade(WOOD_D, -0.4));
    b.sph([0.44, 1.1, z0 + 0.15], 0.055, '#ffc93c', { k: 'gold', w: 6, h: 4 });
    b.box([0, 2.48, z0 + 0.06], [1.84, 0.14, 0.2], TRIM);
    b.box([0, 0.08, z0 + 0.34], [1.9, 0.16, 0.6], '#b9b3a6', { k: 'stone' });
    b.box([0.98, 2.02, z0 + 0.14], [0.16, 0.24, 0.16], '#ffe9a8', { em: 1.1 });
    b.box([0.98, 2.17, z0 + 0.12], [0.22, 0.06, 0.24], DARK);
    b.box([0.98, 1.88, z0 + 0.1], [0.06, 0.06, 0.2], DARK);
    // ventanas
    const wx = w * 0.3,
      ww = Math.max(0.7, Math.min(1.1, w * 0.16)),
      room = wx - 0.78 - ww / 2 >= 0.46 && w / 2 - wx - ww / 2 >= 0.6;
    for (const s of [-1, 1]) win(s * wx, 1.75, z0, 0, ww, 1.2, room, true);
    for (const s of [-1, 1])
      for (let f = 0; f < floors; f++)
        win((s * w) / 2, 1.75 + f * 3, 0, (s * PI) / 2, Math.min(1.1, d * 0.2), 1.2, d >= 4.5);
    for (let f = 0; f < floors; f++) for (const s of [-1, 1]) win(s * w * 0.25, 1.75 + f * 3, -z0, PI, 0.9, 1.1, false);
    if (floors > 1) {
      const bw = Math.min(w * 0.52, 3.6);
      for (const s of [-1, 1]) win(s * wx, 4.75, z0, 0, ww, 1.2, room);
      b.box([0, 4.2, z0 + 0.02], [1.36, 2.3, 0.08], TRIM);
      b.box([0, 4.12, z0 + 0.05], [1.08, 2.06, 0.06], '#27455f', { k: 'glass', lit: v % 2 === 0 });
      b.box([0, 4.12, z0 + 0.09], [0.06, 2.06, 0.04], WOOD_D);
      b.box([0, 4.4, z0 + 0.09], [1.08, 0.06, 0.04], WOOD_D);
      b.box([0, 3.6, z0 + 0.09], [1.08, 0.06, 0.04], WOOD_D);
      b.box([0, 3.04, z0 + 0.5], [bw, 0.14, 1.0], TRIM);
      for (const s of [-1, 1])
        b.box([s * (bw / 2 - 0.3), 2.78, z0 + 0.3], [0.14, 0.4, 0.6], WOOD_D, { k: 'wood', r: [0.5, 0, 0] });
      b.box([0, 4.0, z0 + 0.96], [bw, 0.07, 0.07], DARK);
      b.box([0, 3.2, z0 + 0.96], [bw, 0.05, 0.05], DARK);
      for (const s of [-1, 1]) {
        b.box([s * (bw / 2 - 0.035), 4.0, z0 + 0.5], [0.07, 0.07, 0.95], DARK);
        b.box([s * (bw / 2 - 0.035), 3.55, z0 + 0.96], [0.07, 0.9, 0.07], DARK);
      }
      const nb = Math.round(bw / 0.24);
      for (let i = 1; i < nb; i++) b.box([-bw / 2 + (i * bw) / nb, 3.58, z0 + 0.96], [0.035, 0.82, 0.035], DARK);
    }
    // techo de teja a cuatro aguas
    const o = 0.5,
      ex = w / 2 + o,
      ez = d / 2 + o,
      y0 = h + 0.1,
      yr = y0 + 1.5,
      rl = Math.abs(w - d) / 2 + 0.2;
    b.box([0, h + 0.05, 0], [w + o * 2, 0.1, d + o * 2], '#5a3a22', { k: 'wood' });
    const A: V3 = [-ex, y0, ez],
      B: V3 = [ex, y0, ez],
      C: V3 = [ex, y0, -ez],
      D: V3 = [-ex, y0, -ez];
    if (w >= d) {
      const R1: V3 = [-rl, yr, 0],
        R2: V3 = [rl, yr, 0];
      slope(b, [A, B, R2, R1], roofColor);
      slope(b, [B, C, R2], roofColor);
      slope(b, [C, D, R1, R2], roofColor);
      slope(b, [D, A, R1], roofColor);
      b.box([0, yr + 0.02, 0], [rl * 2 + 0.5, 0.18, 0.3], shade(roofColor, -0.22), { bevel: 0.06 });
    } else {
      const R1: V3 = [0, yr, rl],
        R2: V3 = [0, yr, -rl];
      slope(b, [A, B, R1], roofColor);
      slope(b, [B, C, R2, R1], roofColor);
      slope(b, [C, D, R2], roofColor);
      slope(b, [D, A, R1, R2], roofColor);
      b.box([0, yr + 0.02, 0], [0.3, 0.18, rl * 2 + 0.5], shade(roofColor, -0.22), { bevel: 0.06 });
    }
  });
}

export const town: Town = {
  House: ({ w = 6, d = 5, floors = 1, roofColor = '#b5523b', sign, ...a }) => {
    const h = 3 * floors;
    useSolidBox(a, w, h, d);
    const g = houseGeo(w, d, floors, a.color ?? '#f2c4a4', roofColor, variant(a, 4));
    return (
      <Placed {...a}>
        <Mesh g={g} />
        {sign && (
          <TextPlane text={sign} pos={[0, 2.78, d / 2 + 0.2]} h={0.52} maxW={w * 0.8} fg="#ffffff" bg="#c0392b" />
        )}
      </Placed>
    );
  },
  Lamp: (a) => {
    useSolidCyl(a, 0.12, 3);
    const g = geo('lamp', (b) => {
      b.box([0, 0.16, 0], [0.36, 0.32, 0.36], DARK, { bevel: 0.04 });
      b.cyl([0, 0.4, 0], 0.13, 0.16, DARK, { sides: 8, rt: 0.08 });
      b.cyl([0, 1.65, 0], 0.065, 2.5, DARK, { sides: 8, k: 'shiny' });
      b.cyl([0, 1.1, 0], 0.1, 0.08, DARK, { sides: 8 });
      b.cyl([0, 2.86, 0], 0.11, 0.1, DARK, { sides: 8, rt: 0.17 });
      b.box([0, 2.93, 0], [0.38, 0.05, 0.38], DARK);
      b.box([0, 3.14, 0], [0.28, 0.38, 0.28], '#ffe9a8', { em: 1.25 });
      for (const sx of [-1, 1])
        for (const sz of [-1, 1]) b.box([sx * 0.15, 3.14, sz * 0.15], [0.035, 0.4, 0.035], DARK);
      b.cyl([0, 3.43, 0], 0.3, 0.2, DARK, { sides: 4, rt: 0.06, r: [0, PI / 4, 0] });
      b.sph([0, 3.57, 0], 0.05, DARK, { w: 6, h: 4 });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
        <LampGlow />
      </Placed>
    );
  },
  Bench: (a) => {
    useSolidBox(a, 1.8, 0.5, 0.6);
    const g = geo('bench', (b) => {
      for (const x of [-0.78, 0.78]) {
        b.box([x, 0.22, 0.2], [0.08, 0.44, 0.08], DARK);
        b.box([x, 0.5, -0.27], [0.08, 1.0, 0.08], DARK, { r: [-0.12, 0, 0] });
        b.box([x, 0.4, -0.02], [0.08, 0.06, 0.52], DARK);
        b.box([x, 0.66, 0.0], [0.09, 0.06, 0.56], DARK);
        b.box([x, 0.54, 0.24], [0.07, 0.24, 0.07], DARK);
      }
      for (let i = 0; i < 3; i++)
        b.box([0, 0.46, -0.16 + i * 0.17], [1.74, 0.06, 0.15], i % 2 ? shade(WOOD, 0.08) : WOOD, { k: 'wood' });
      for (let i = 0; i < 2; i++)
        b.box([0, 0.7 + i * 0.2, -0.3 - i * 0.025], [1.74, 0.16, 0.05], i ? shade(WOOD, 0.08) : WOOD, {
          k: 'wood',
          r: [-0.12, 0, 0],
        });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Fence: ({ length = 4, ...a }) => {
    useSolidBox(a, length, 1, 0.15);
    const c = a.color ?? '#ffffff';
    const g = geo(`fence|${length}|${c}`, (b) => {
      const n = Math.max(2, Math.round(length / 0.3)),
        c2 = shade(c, -0.08);
      for (const y of [0.32, 0.72]) b.box([0, y, -0.035], [length, 0.09, 0.05], c2);
      for (let i = 0; i < n; i++) {
        const x = -length / 2 + (i + 0.5) * (length / n);
        b.box([x, 0.46, 0.015], [0.17, 0.84, 0.05], i % 2 ? c : shade(c, -0.035));
        b.box([x, 0.88, 0.015], [0.12, 0.12, 0.05], i % 2 ? c : shade(c, -0.035), { r: [0, 0, PI / 4] });
      }
      for (const s of [-1, 1]) {
        b.box([s * (length / 2 - 0.07), 0.54, -0.01], [0.15, 1.08, 0.15], c);
        b.box([s * (length / 2 - 0.07), 1.1, -0.01], [0.2, 0.06, 0.2], c2);
      }
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Flag: ({ height = 7, ...a }) => {
    useSolidCyl(a, 0.12, height);
    const g = geo(`flagpole|${height}`, (b) => {
      b.box([0, 0.12, 0], [0.9, 0.24, 0.9], '#cfd3d6', { k: 'concrete' });
      b.box([0, 0.34, 0], [0.56, 0.2, 0.56], '#e2e5e8', { k: 'concrete' });
      b.cyl([0, height / 2 + 0.2, 0], 0.07, height - 0.4, '#e6e9ee', { sides: 8, k: 'shiny', rt: 0.05 });
      b.sph([0, height + 0.08, 0], 0.13, '#ffc93c', { k: 'gold', w: 8, h: 6 });
      b.box([0.06, height - 0.22, 0], [0.12, 0.04, 0.04], '#8d9299');
      b.box([0.06, height - 1.18, 0], [0.12, 0.04, 0.04], '#8d9299');
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
        <HondurasFlag pos={[1.1, height - 0.7, 0]} />
      </Placed>
    );
  },
  Stall: ({ sign, ...a }) => {
    useSolidBox(a, 2.6, 1, 1.2);
    const c = a.color ?? '#e63946',
      v = variant(a, 3);
    const g = geo(`stall|${c}|${v}`, (b) => {
      b.box([0, 0.5, 0], [2.6, 1, 1.2], WOOD, { k: 'wood' });
      b.box([0, 1.03, 0.03], [2.8, 0.07, 1.36], shade(WOOD, 0.2), { k: 'wood' });
      b.box([0, 0.5, 0.605], [2.3, 0.7, 0.02], shade(c, -0.08), { k: 'cloth' });
      for (const x of [-1.26, 1.26]) {
        b.box([x, 1.26, 0.56], [0.09, 2.52, 0.09], WOOD_D, { k: 'wood' });
        b.box([x, 1.42, -0.56], [0.09, 2.84, 0.09], WOOD_D, { k: 'wood' });
      }
      // toldo de rayas con cenefa
      const N = 8,
        sw = 3 / N;
      for (let i = 0; i < N; i++) {
        const x = -1.5 + (i + 0.5) * sw,
          cc = i % 2 ? '#ffffff' : c;
        b.box([x, 2.65, 0.1], [sw, 0.07, 1.86], cc, { k: 'cloth', r: [0.18, 0, 0] });
        b.box([x, 2.36, 1.0], [sw, 0.26, 0.04], cc, { k: 'cloth' });
        b.box([x, 2.23, 1.0], [sw * 0.72, sw * 0.72, 0.04], cc, { k: 'cloth', r: [0, 0, PI / 4] });
      }
      // mercadería
      const FR = [
        ['#ff9f1c', '#ffd23f', '#e63946'],
        ['#7cb342', '#e63946', '#ffd23f'],
        ['#ffd23f', '#8e44ad', '#ff9f1c'],
      ][v];
      FR.forEach((fc, i) => {
        const x = (i - 1) * 0.86;
        b.box([x, 1.16, 0.12], [0.74, 0.2, 0.84], shade(WOOD, 0.1), { k: 'wood', r: [0.14, 0, 0] });
        for (let j = 0; j < 9; j++)
          b.sph(
            [
              x + ((j % 3) - 1) * 0.21,
              1.3 + (1 - Math.floor(j / 3)) * -0.03 + Math.floor(j / 3) * 0.002,
              0.12 + (Math.floor(j / 3) - 1) * 0.24,
            ],
            0.105,
            j % 4 === 3 ? shade(fc, -0.12) : fc,
            { w: 6, h: 4 },
          );
      });
      b.box([1.05, 1.5, -0.45], [0.5, 0.86, 0.3], shade(WOOD, -0.1), { k: 'wood' });
      for (let i = 0; i < 3; i++)
        b.cyl([0.9 + i * 0.15, 2.02, -0.45], 0.06, 0.2, ['#e63946', '#2ea44f', '#ffd23f'][i], { sides: 8 });
      b.box([-1.0, 1.25, -0.4], [0.6, 0.36, 0.36], '#f2e9d2', { k: 'cloth', bevel: 0.08 });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
        {sign && <TextPlane text={sign} pos={[0, 2.02, 1.03]} h={0.42} maxW={2.6} fg="#1d1d1f" bg="#ffd23f" />}
      </Placed>
    );
  },
  Kiosk: (a) => {
    useSolidCyl(a, 2.6, 0.5);
    const c = a.color ?? '#e63946';
    const g = geo(`kiosk|${c}`, (b) => {
      const E = PI / 8,
        vx = (i: number, r: number, y: number): V3 => [
          Math.sin(E + (i * PI) / 4) * r,
          y,
          Math.cos(E + (i * PI) / 4) * r,
        ];
      b.cyl([0, 0.125, 0], 2.95, 0.25, '#d9d4c8', { sides: 8, r: [0, E, 0], k: 'concrete' });
      b.cyl([0, 0.375, 0], 2.72, 0.25, '#ece7db', { sides: 8, r: [0, E, 0], k: 'concrete' });
      b.cyl([0, 0.505, 0], 2.5, 0.02, '#d7b98a', { sides: 8, r: [0, E, 0], k: 'tile' });
      b.box([0, 0.06, 2.95], [1.7, 0.12, 0.5], '#d9d4c8', { k: 'concrete' });
      for (let i = 0; i < 8; i++) {
        const p = vx(i, 2.3, 0),
          q = vx(i + 1, 2.3, 0);
        b.box([p[0], 0.64, p[2]], [0.34, 0.28, 0.34], TRIM, { r: [0, E + (i * PI) / 4, 0] });
        b.cyl([p[0], 1.9, p[2]], 0.11, 2.3, '#ffffff', { sides: 8 });
        b.box([p[0], 3.08, p[2]], [0.32, 0.16, 0.32], TRIM, { r: [0, E + (i * PI) / 4, 0] });
        beam(b, [p[0], 3.26, p[2]], [q[0], 3.26, q[2]], 0.24, TRIM, {}, 0.2);
        if (i !== 7) {
          beam(b, [p[0], 1.42, p[2]], [q[0], 1.42, q[2]], 0.08, '#2e6b4f');
          beam(b, [p[0], 0.68, p[2]], [q[0], 0.68, q[2]], 0.06, '#2e6b4f');
          for (let j = 1; j < 6; j++) {
            const t = j / 6;
            b.box([p[0] + (q[0] - p[0]) * t, 1.05, p[2] + (q[2] - p[2]) * t], [0.05, 0.7, 0.05], '#2e6b4f');
          }
        }
        slope(
          b,
          [vx(i, 3.25, 3.3), vx(i + 1, 3.25, 3.3), vx(i + 1, 0.55, 4.5), vx(i, 0.55, 4.5)],
          i % 2 ? c : shade(c, -0.07),
        );
        slope(b, [vx(i, 0.85, 4.95), vx(i + 1, 0.85, 4.95), [0, 5.55, 0]], shade(c, -0.1));
      }
      b.cyl([0, 3.33, 0], 3.2, 0.08, '#5a3a22', { sides: 8, r: [0, E, 0], k: 'wood' });
      b.cyl([0, 4.72, 0], 0.55, 0.46, TRIM, { sides: 8, r: [0, E, 0] });
      b.sph([0, 5.62, 0], 0.14, '#ffc93c', { k: 'gold', w: 8, h: 6 });
      b.cyl([0, 5.82, 0], 0.03, 0.3, '#ffc93c', { k: 'gold', sides: 6 });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Fountain: (a) => {
    useSolidCyl(a, 1.8, 0.6);
    const c = a.color ?? '#cfd3d6';
    const g = geo(`fountain|${c}`, (b) => {
      b.cyl([0, 0.3, 0], 1.9, 0.6, c, { sides: 16, k: 'stone' });
      b.cyl([0, 0.06, 0], 2.02, 0.12, shade(c, -0.12), { sides: 16, k: 'stone' });
      b.add(torGeo(0.075, 6, 16), [0, 0.62, 0], 1.78, shade(c, 0.1), { r: [PI / 2, 0, 0] });
      b.cyl([0, 0.75, 0], 0.42, 0.34, shade(c, -0.06), { sides: 8, k: 'stone' });
      b.cyl([0, 1.25, 0], 0.22, 0.9, c, { sides: 8, rt: 0.17 });
      b.cyl([0, 1.76, 0], 0.26, 0.3, shade(c, 0.06), { sides: 12, rt: 0.95 });
      b.add(torGeo(0.07, 6, 14), [0, 1.92, 0], 0.93, shade(c, 0.12), { r: [PI / 2, 0, 0] });
      b.cyl([0, 2.15, 0], 0.11, 0.5, c, { sides: 8, rt: 0.07 });
      b.cyl([0, 2.42, 0], 0.1, 0.08, shade(c, 0.1), { sides: 8, rt: 0.24 });
    });
    const w = geo('fountain-w', (b) => {
      const wc = '#3fb4ea';
      b.cyl([0, 0.6, 0], 1.7, 0.04, wc, { sides: 16, k: 'water' });
      b.cyl([0, 1.9, 0], 0.86, 0.03, wc, { sides: 12, k: 'water' });
      for (let i = 0; i < 6; i++)
        b.cyl([Math.cos((i * PI) / 3) * 0.95, 1.26, Math.sin((i * PI) / 3) * 0.95], 0.07, 1.3, '#bfe9ff', {
          sides: 5,
          k: 'water',
          rt: 0.04,
        });
      b.cyl([0, 2.62, 0], 0.07, 0.36, '#bfe9ff', { sides: 5, k: 'water', rt: 0.02 });
      b.sph([0, 2.46, 0], 0.2, '#d8f3ff', { k: 'water', w: 8, h: 5 });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
        <Mesh g={w} m="water" />
      </Placed>
    );
  },
  Statue: (a) => {
    useSolidBox(a, 1.4, 1.6, 1.4);
    const c = a.color ?? '#5f8573';
    const g = geo(`statue|${c}`, (b) => {
      const st = '#cfd3d6',
        o = { k: 'shiny' as const },
        d = shade(c, -0.18),
        l = shade(c, 0.14);
      b.box([0, 0.14, 0], [1.6, 0.28, 1.6], shade(st, -0.1), { k: 'stone' });
      b.box([0, 0.84, 0], [1.16, 1.12, 1.16], st, { k: 'stone' });
      b.box([0, 1.5, 0], [1.4, 0.2, 1.4], shade(st, 0.08), { k: 'stone' });
      b.box([0, 0.34, 0], [1.32, 0.12, 1.32], shade(st, 0.08), { k: 'stone' });
      b.box([0, 0.9, 0.59], [0.76, 0.46, 0.03], '#ffc93c', { k: 'gold' });
      for (let i = 0; i < 3; i++) b.box([0, 1.0 - i * 0.1, 0.61], [0.56 - i * 0.1, 0.03, 0.01], '#a8741a');
      b.box([0, 1.64, 0], [0.86, 0.08, 0.66], d, o);
      for (const s of [-1, 1]) {
        b.box([s * 0.14, 2.0, 0], [0.2, 0.66, 0.24], d, o);
        b.box([s * 0.14, 1.74, 0.04], [0.22, 0.14, 0.34], d, o);
      }
      b.box([0, 2.62, 0], [0.56, 0.72, 0.34], c, o);
      b.box([0, 2.22, -0.06], [0.58, 0.36, 0.3], c, o);
      b.box([0, 2.3, 0], [0.6, 0.08, 0.37], '#ffc93c', { k: 'gold' });
      b.box([0, 2.62, 0.175], [0.06, 0.66, 0.02], l, o);
      for (let i = 0; i < 4; i++)
        for (const s of [-1, 1]) b.sph([s * 0.1, 2.42 + i * 0.15, 0.18], 0.028, '#ffc93c', { k: 'gold', w: 5, h: 3 });
      for (const s of [-1, 1]) b.box([s * 0.34, 2.96, 0], [0.2, 0.07, 0.3], '#ffc93c', { k: 'gold' });
      b.box([0.37, 2.58, 0], [0.17, 0.66, 0.2], c, o);
      b.box([0.38, 2.22, 0.02], [0.14, 0.14, 0.16], l, o);
      b.box([-0.37, 2.84, 0.26], [0.17, 0.18, 0.66], c, o);
      b.box([-0.37, 2.86, 0.64], [0.13, 0.13, 0.16], l, o);
      b.box([0, 3.02, 0], [0.2, 0.1, 0.2], l, o);
      b.box([0, 3.24, 0], [0.34, 0.36, 0.34], l, { ...o, bevel: 0.07 });
      b.box([0, 3.4, -0.04], [0.38, 0.14, 0.36], d, o);
      b.box([0, 3.26, -0.16], [0.38, 0.3, 0.1], d, o);
      for (const s of [-1, 1]) b.box([s * 0.175, 3.2, 0.02], [0.04, 0.2, 0.12], d, o);
      b.box([0.3, 2.1, -0.08], [0.05, 0.9, 0.06], '#d9dde2', { k: 'shiny', r: [0.5, 0, 0] });
      b.box([0.3, 2.42, 0.1], [0.07, 0.07, 0.2], '#ffc93c', { k: 'gold' });
      b.box([0, 2.62, -0.2], [0.5, 0.9, 0.06], d, { ...o, r: [0.08, 0, 0] });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Sign: ({ text, w, ...a }) => {
    return <SignBoard text={text} w={w} color={a.color ?? '#0d47a1'} a={a} />;
  },
  PortalArch: ({ label, icon, ...a }) => {
    const col = a.color ?? '#00a3d7';
    const g = geo(`portal|${col}`, (b) => {
      const d = shade(col, -0.25),
        l = shade(col, 0.25);
      for (const s of [-1, 1]) {
        b.box([s * 1.5, 0.22, 0], [0.98, 0.44, 0.98], d, { k: 'plastic', bevel: 0.05 });
        b.box([s * 1.5, 1.92, 0], [0.7, 2.96, 0.7], col, { k: 'plastic' });
        b.box([s * 1.5, 1.2, 0], [0.76, 0.2, 0.76], l);
        b.box([s * 1.5, 2.6, 0], [0.76, 0.2, 0.76], l);
        b.box([s * 1.13, 1.9, 0], [0.06, 2.9, 0.44], '#ffffff', { em: 0.9 });
        b.box([s * 1.72, 3.7, 0], [0.9, 0.84, 0.9], d, { k: 'plastic', bevel: 0.05 });
        b.box([s * 1.5, 4.2, 0], [0.36, 0.2, 0.36], '#ffd23f', { em: 0.5 });
      }
      b.box([0, 3.62, 0], [3.2, 0.6, 0.72], col, { k: 'plastic' });
      b.box([0, 3.3, 0], [2.3, 0.06, 0.44], '#ffffff', { em: 0.9 });
      b.box([0, 4.42, 0], [4.5, 0.98, 0.2], '#ffffff', { bevel: 0.08 });
      b.box([0, 4.42, 0], [4.62, 1.1, 0.12], d, { bevel: 0.05 });
      for (const s of [-1, 1]) b.box([s * 1.2, 3.96, 0], [0.12, 0.14, 0.12], d);
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
        <mesh geometry={unitPlane} material={swirlMat(col)} position={[0, 1.76, 0]} scale={[2.3, 3.08, 1]} />
        <TextPlane text={label} pos={[0, 4.42, 0.105]} h={0.74} maxW={4.3} fg="#1d1d1f" radius={0} />
        <TextPlane text={label} pos={[0, 4.42, -0.105]} h={0.74} maxW={4.3} fg="#1d1d1f" radius={0} rotY={PI} />
        {icon && <PortalIcon icon={icon} />}
      </Placed>
    );
  },
};

let glowMat: THREE.SpriteMaterial | null = null;
function getGlowMat() {
  if (glowMat) return glowMat;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d')!,
    g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,236,170,0.85)');
  g.addColorStop(0.25, 'rgba(255,210,120,0.4)');
  g.addColorStop(1, 'rgba(255,190,90,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return (glowMat = new THREE.SpriteMaterial({
    map: t,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    fog: false,
  }));
}
/** halo del farol: solo de noche */
function LampGlow() {
  const night = useSyncExternalStore(subscribeNight, isNight);
  return night ? <sprite position={[0, 3.14, 0]} scale={[2.6, 2.6, 1]} material={getGlowMat()} /> : null;
}
function PortalIcon({ icon }: { icon: string }) {
  return (
    <>
      <TextPlane text={icon} pos={[0, 2.0, 0.03]} h={1.25} size={96} radius={0} />
      <TextPlane text={icon} pos={[0, 2.0, -0.03]} h={1.25} size={96} radius={0} rotY={PI} />
    </>
  );
}
function SignBoard({ text, w, color, a }: { text: string; w?: number; color: string; a: any }) {
  const hh = 0.6,
    ww = w ?? Math.min(4, 0.6 * aspectOf(text)),
    th = w ? Math.min(0.6, w / aspectOf(text)) : hh;
  const bh = th + 0.16;
  const g = geo(`sign|${ww.toFixed(2)}|${bh.toFixed(2)}|${color}`, (b) => {
    const two = ww > 1.8,
      ph = 2.2 - bh / 2;
    for (const x of two ? [-(ww / 2 - 0.25), ww / 2 - 0.25] : [0]) {
      b.cyl([x, ph / 2, 0], 0.06, ph, '#55585e', { sides: 8, k: 'shiny' });
      b.box([x, 0.05, 0], [0.28, 0.1, 0.28], '#3b3d42');
      b.box([x, ph - 0.03, 0], [0.16, 0.06, 0.14], '#3b3d42');
    }
    b.box([0, 2.2, 0], [ww + 0.22, bh + 0.06, 0.08], '#ffffff', { bevel: 0.03 });
    b.box([0, 2.2, 0], [ww + 0.1, bh - 0.06, 0.1], color);
  });
  return (
    <Placed {...a}>
      <Mesh g={g} />
      <TextPlane text={text} pos={[0, 2.2, 0.056]} h={th} maxW={ww} bg={color} radius={0} />
      <TextPlane text={text} pos={[0, 2.2, -0.056]} h={th} maxW={ww} bg={color} radius={0} rotY={PI} />
    </Placed>
  );
}
const aspectOf = (text: string) => (textTexture(text, {}) as any).aspect as number;
