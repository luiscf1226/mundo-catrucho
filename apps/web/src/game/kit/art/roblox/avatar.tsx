// Avatar clásico de piezas (tipo R15): UNA malla con esqueleto rígido (cada pieza sigue a un solo hueso) y un atlas
// dibujado por código con la cara y la ropa. Mide 1.76 m, pies en y = 0, mira hacia +Z.

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Anim, AvatarConfig } from '../../../../core/types';
import { textTexture } from '../../core';
import type { AvatarProps } from '../types';
import { botHalf, makeAtlas, pantsInfo, shirtInfo, strip, topHalf, UV } from './atlas';
import { Build, cylGeo, icoGeo, mixHex, type Rect, shade, torGeo, type V3 } from './geo';

const PI = Math.PI;
const ROOT = 0,
  TORSO = 1,
  HEAD = 2,
  LAU = 3,
  LAL = 4,
  RAU = 5,
  RAL = 6,
  LLU = 7,
  LLL = 8,
  RLU = 9,
  RLL = 10,
  CAPE = 11,
  NB = 12;
const PARENT = [-1, 0, 1, 1, 3, 1, 5, 0, 7, 0, 9, 1];
/** pivotes en reposo (espacio del modelo) */
const PIVOT: V3[] = [
  [0, 0.72, 0],
  [0, 0.72, 0],
  [0, 1.3, 0],
  [0.42, 1.22, 0],
  [0.42, 0.94, 0],
  [-0.42, 1.22, 0],
  [-0.42, 0.94, 0],
  [0.15, 0.72, 0],
  [0.15, 0.38, 0],
  [-0.15, 0.72, 0],
  [-0.15, 0.38, 0],
  [0, 1.28, -0.17],
];
const HIP = 0.72;

// ------------------------------------------------------------------ geometría
const GOLD = '#ffc93c',
  STRAW = '#ecd797',
  BK = '#1d1d1f';
const FEATH = ['#e21f2d', '#ffd23f', '#1e88e5', '#2ea44f', '#ff5d9e', '#ff7a3d', '#7b3fd1'];

function hair(b: Build, cfg: AvatarConfig, hatted: boolean) {
  const dark = new THREE.Color(cfg.hairColor).getHSL({ h: 0, s: 0, l: 0 }).l < 0.16,
    h = dark ? mixHex(cfg.hairColor, '#4a4f5c', 0.22) : cfg.hairColor,
    d = shade(h, -0.22),
    l = shade(h, dark ? 0.07 : 0.1),
    id = cfg.hair;
  if (id === 'calvo') return;
  const cap = (w = 0.55, dz = 0.51) => {
    b.box([0, 1.725, -0.01], [w, 0.15, dz], l, { bevel: 0.06 });
    b.box([0, 1.56, -0.21], [w, 0.34, 0.1], h, { bevel: 0.04 });
    for (const s of [-1, 1]) b.box([s * (w / 2 - 0.03), 1.61, -0.05], [0.06, 0.22, 0.34], h, { bevel: 0.025 });
  };
  if (id === 'pelo_afro') {
    if (hatted) {
      b.add(icoGeo(1), [0, 1.56, -0.1], [0.38, 0.24, 0.32], h);
      for (const s of [-1, 1]) b.add(icoGeo(1), [s * 0.27, 1.56, -0.04], [0.14, 0.18, 0.2], d);
    } else {
      b.add(icoGeo(1), [0, 1.75, -0.08], [0.4, 0.31, 0.35], h);
      b.add(icoGeo(1), [0, 1.58, -0.14], [0.36, 0.24, 0.26], d);
      for (const s of [-1, 1]) b.add(icoGeo(1), [s * 0.28, 1.6, -0.02], [0.13, 0.2, 0.2], h);
    }
    return;
  }
  if (id === 'pelo_rizado') {
    const S = (p: V3, r: number, c: string) => b.sph(p, r, c, { w: 6, h: 4 });
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * PI * 2;
      S([Math.sin(a) * 0.22, hatted ? 1.63 : 1.72, Math.cos(a) * 0.2 - 0.02], 0.115, i % 2 ? h : l);
    }
    if (!hatted) {
      S([0, 1.8, -0.02], 0.15, h);
      for (let i = 0; i < 5; i++)
        S([Math.sin(i * 1.26) * 0.12, 1.81, Math.cos(i * 1.26) * 0.11 - 0.02], 0.1, i % 2 ? l : d);
    }
    for (const s of [-1, 0, 1]) S([s * 0.16, 1.5, -0.23], 0.12, s ? d : h);
    for (const s of [-1, 1]) S([s * 0.26, 1.54, -0.08], 0.1, d);
    return;
  }
  cap();
  if (id === 'pelo_corto') {
    b.box([0.04, 1.7, 0.2], [0.44, 0.1, 0.1], h, { bevel: 0.03, r: [0, 0, -0.08] });
    if (!hatted) b.box([0.02, 1.775, 0.1], [0.4, 0.09, 0.3], l, { bevel: 0.04, r: [0.12, 0, -0.06] });
  } else if (id === 'pelo_largo') {
    b.box([0, 1.3, -0.235], [0.56, 0.72, 0.11], h, { bevel: 0.04 });
    b.box([0, 0.98, -0.235], [0.48, 0.14, 0.1], d, { bevel: 0.03 });
    for (const s of [-1, 1]) {
      b.box([s * 0.262, 1.38, -0.06], [0.075, 0.58, 0.3], h, { bevel: 0.03 });
      b.box([s * 0.14, 1.705, 0.21], [0.26, 0.1, 0.08], l, { bevel: 0.03, r: [0, 0, s * -0.3] });
    }
  } else if (id === 'pelo_coleta') {
    b.box([0, 1.7, 0.2], [0.48, 0.09, 0.09], h, { bevel: 0.03 });
    b.box([0, 1.68, -0.29], [0.14, 0.1, 0.1], '#e63946', { bevel: 0.03 });
    b.box([0, 1.6, -0.36], [0.17, 0.2, 0.15], h, { bevel: 0.05, r: [0.5, 0, 0] });
    b.box([0, 1.4, -0.4], [0.14, 0.3, 0.12], d, { bevel: 0.05, r: [0.12, 0, 0] });
  } else if (id === 'pelo_trenzas') {
    b.box([0, 1.7, 0.2], [0.5, 0.09, 0.09], h, { bevel: 0.03 });
    b.box([0, 1.805, 0], [0.03, 0.01, 0.46], d);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 5; i++)
        b.box([s * 0.285, 1.48 - i * 0.1, 0.04 + i * 0.012], [0.1, 0.11, 0.1], i % 2 ? d : h, {
          bevel: 0.035,
          r: [0, i * 0.7, 0],
        });
      b.box([s * 0.285, 0.98, 0.1], [0.085, 0.05, 0.085], '#e63946');
      b.box([s * 0.285, 0.92, 0.1], [0.07, 0.08, 0.07], h, { bevel: 0.02 });
    }
  }
}

function hat(b: Build, cfg: AvatarConfig) {
  const c = cfg.hatColor;
  switch (cfg.hat) {
    case 'gorra': {
      const d = shade(c, -0.22);
      b.cyl([0, 1.79, -0.01], 0.3, 0.1, c, { sides: 12 });
      b.sph([0, 1.83, -0.01], [0.3, 0.13, 0.3], c, { w: 12, h: 6 });
      b.sph([0, 1.96, -0.01], 0.03, d, { w: 6, h: 4 });
      b.box([0, 1.755, 0.4], [0.42, 0.035, 0.3], d, { bevel: 0.015, r: [0.14, 0, 0] });
      b.box([0, 1.84, 0.283], [0.16, 0.1, 0.02], '#ffffff', { r: [-0.25, 0, 0] });
      break;
    }
    case 'sombrero_junco': {
      b.cyl([0, 1.79, 0], 0.54, 0.035, STRAW, { sides: 16 });
      b.add(torGeo(0.04, 5, 16), [0, 1.795, 0], 0.53, shade(STRAW, -0.15), { r: [PI / 2, 0, 0] });
      b.cyl([0, 1.9, 0], 0.29, 0.2, STRAW, { sides: 14, rt: 0.25 });
      b.cyl([0, 1.84, 0], 0.295, 0.07, BK, { sides: 14, rt: 0.285 });
      b.cyl([0, 2.005, 0], 0.25, 0.02, shade(STRAW, 0.15), { sides: 14, rt: 0.2 });
      break;
    }
    case 'panuelo_lenca': {
      const sc = UV.scarf;
      b.box([0, 1.73, -0.015], [0.57, 0.21, 0.54], '#ffffff', { bevel: 0.07, faces: [sc, sc, sc, sc, sc, sc] });
      b.box([0, 1.6, -0.3], [0.2, 0.12, 0.1], '#d81b8c', { bevel: 0.04 });
      for (const s of [-1, 1])
        b.box([s * 0.08, 1.44, -0.31], [0.11, 0.28, 0.035], s > 0 ? '#ffd23f' : '#d81b8c', { r: [0.15, 0, s * 0.22] });
      break;
    }
    case 'sombrero_vaquero': {
      const k = '#a87545',
        d = shade(k, -0.3);
      b.add(cylGeo(1, 16), [0, 1.79, 0], [0.5, 0.035, 0.58], k);
      for (const s of [-1, 1])
        b.box([s * 0.46, 1.835, 0], [0.2, 0.035, 0.74], shade(k, 0.06), { r: [0, 0, s * 0.5], bevel: 0.015 });
      b.add(cylGeo(0.82, 12), [0, 1.93, 0], [0.29, 0.26, 0.31], k);
      b.add(cylGeo(1, 12), [0, 1.84, 0], [0.297, 0.06, 0.318], d);
      b.box([0, 2.06, 0], [0.12, 0.05, 0.44], d, { bevel: 0.02 });
      for (const s of [-1, 1])
        b.box([s * 0.16, 2.07, 0], [0.16, 0.05, 0.46], shade(k, 0.1), { bevel: 0.02, r: [0, 0, s * 0.2] });
      b.box([0, 1.84, 0.315], [0.09, 0.07, 0.02], GOLD);
      break;
    }
    case 'casco_explorador': {
      const k = '#dccba0';
      b.sph([0, 1.78, 0], [0.32, 0.24, 0.34], k, { w: 12, h: 8 });
      b.add(cylGeo(0.7, 14), [0, 1.765, 0.02], [0.46, 0.07, 0.5], shade(k, -0.08));
      b.add(cylGeo(0.98, 14), [0, 1.83, 0], [0.325, 0.05, 0.345], '#7a5c3a');
      b.sph([0, 2.02, 0], 0.035, shade(k, -0.2), { w: 6, h: 4 });
      b.box([0, 1.9, 0.31], [0.08, 0.08, 0.03], GOLD, { r: [-0.4, 0, 0] });
      break;
    }
    case 'corona_carnaval': {
      b.cyl([0, 1.82, 0], 0.3, 0.13, GOLD, { sides: 12, rt: 0.31 });
      for (let i = 0; i < 7; i++) {
        const a = (i - 3) * 0.42;
        b.box([Math.sin(a) * 0.3, 1.93, Math.cos(a) * 0.3], [0.09, 0.14, 0.03], GOLD, { r: [0, a, PI / 4] });
        b.box([Math.sin(a) * 0.315, 1.82, Math.cos(a) * 0.315], [0.055, 0.055, 0.02], FEATH[i], { r: [0, a, PI / 4] });
      }
      for (let i = 0; i < 7; i++) {
        const t = i - 3,
          len = 0.62 - Math.abs(t) * 0.055;
        b.push([t * 0.075, 1.86, -0.14 - Math.abs(t) * 0.01], [-0.2, 0, -t * 0.27]);
        b.box([0, len * 0.5, 0], [0.03, len, 0.03], '#ffffff');
        b.box([0, len * 0.56, 0], [0.17, len * 0.86, 0.035], FEATH[i], { bevel: 0.015 });
        b.box([0, len * 0.9, 0.004], [0.12, len * 0.24, 0.04], FEATH[(i + 1) % 7], { bevel: 0.015 });
        b.pop();
      }
      break;
    }
  }
}

function accessory(b: Build, cfg: AvatarConfig) {
  const c = cfg.accColor,
    W = '#ffffff';
  const sash = () => {
    for (const s of [1, -1])
      b.box([0, 1.03, s * 0.168], [0.84, 0.15, 0.014], W, {
        r: [0, 0, s > 0 ? -0.75 : 0.75],
        faces: [null, null, null, null, s > 0 ? UV.sash : null, s > 0 ? null : UV.sash],
      });
    b.box([-0.305, 1.3, 0], [0.03, 0.05, 0.34], '#eeeeee');
  };
  b.bone = TORSO;
  switch (cfg.acc) {
    case 'mochila': {
      const d = shade(c, -0.25);
      b.box([0, 1.03, -0.275], [0.46, 0.52, 0.22], c, { bevel: 0.06 });
      b.box([0, 0.93, -0.395], [0.32, 0.22, 0.05], d, { bevel: 0.02 });
      b.box([0, 1.2, -0.39], [0.36, 0.04, 0.03], d);
      b.box([0, 1.31, -0.25], [0.12, 0.05, 0.06], d);
      for (const s of [-1, 1]) {
        b.box([s * 0.2, 1.05, 0.168], [0.075, 0.5, 0.02], d);
        b.box([s * 0.2, 1.315, -0.03], [0.075, 0.02, 0.4], d);
      }
      break;
    }
    case 'banda_bandera':
      sash();
      b.box([0.3, 0.76, 0.02], [0.06, 0.12, 0.3], '#00bce4');
      break;
    case 'collar_jade': {
      for (let i = 0; i < 11; i++) {
        const t = (i - 5) / 5;
        b.sph([t * 0.18, 1.3 - (1 - t * t) * 0.15, 0.17 + (1 - t * t) * 0.006], 0.03, i % 2 ? '#3fbf88' : '#1f8f5f', {
          w: 6,
          h: 4,
        });
      }
      b.box([0, 1.1, 0.178], [0.085, 0.11, 0.035], '#2fae78', { bevel: 0.015 });
      b.box([0, 1.1, 0.198], [0.035, 0.05, 0.01], '#bff0d6');
      b.box([0, 1.165, 0.178], [0.05, 0.025, 0.03], GOLD);
      for (const s of [-1, 1]) b.box([s * 0.2, 1.315, 0], [0.03, 0.02, 0.32], '#1f8f5f');
      break;
    }
    case 'guitarra': {
      sash();
      b.push([0, 1.0, -0.235], [0, 0, 0.6]);
      const wood = '#c9853a',
        dk = '#5a3320';
      b.cyl([0, -0.16, 0], 0.21, 0.1, wood, { sides: 14, r: [PI / 2, 0, 0] });
      b.cyl([0, 0.1, 0], 0.16, 0.1, wood, { sides: 12, r: [PI / 2, 0, 0] });
      b.box([0, -0.03, 0], [0.26, 0.2, 0.1], wood);
      b.cyl([0, 0.0, -0.052], 0.06, 0.01, dk, { sides: 10, r: [PI / 2, 0, 0] });
      b.box([0, -0.2, -0.055], [0.14, 0.03, 0.02], dk);
      b.box([0, 0.46, -0.01], [0.065, 0.56, 0.04], dk);
      b.box([0, 0.78, -0.01], [0.11, 0.14, 0.04], dk, { bevel: 0.015 });
      for (const s of [-1, 1])
        for (let i = 0; i < 2; i++) b.box([s * 0.07, 0.74 + i * 0.06, -0.01], [0.03, 0.03, 0.03], '#dddddd');
      b.box([0, 0.2, -0.056], [0.035, 0.84, 0.006], '#f2ead2');
      b.pop();
      break;
    }
    case 'tambor_garifuna': {
      sash();
      b.push([0.3, 0.74, 0.25], [0.55, 0, -0.25]);
      b.cyl([0, 0, 0], 0.14, 0.32, '#8a5a34', { sides: 12, rt: 0.17 });
      b.cyl([0, 0.165, 0], 0.175, 0.025, '#f4e6c4', { sides: 12 });
      b.cyl([0, 0.14, 0], 0.182, 0.035, '#f2c531', { sides: 12 });
      b.cyl([0, -0.15, 0], 0.15, 0.03, BK, { sides: 12 });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * PI * 2;
        b.box([Math.sin(a) * 0.16, 0, Math.cos(a) * 0.16], [0.016, 0.3, 0.016], '#f4e6c4', {
          r: [0, a, i % 2 ? 0.28 : -0.28],
        });
      }
      b.pop();
      break;
    }
    case 'capa_bandera': {
      b.box([0, 1.3, -0.06], [0.56, 0.05, 0.26], '#00bce4', { bevel: 0.02 });
      b.box([0, 1.27, 0.168], [0.3, 0.035, 0.02], '#00bce4');
      b.sph([0, 1.27, 0.18], 0.035, GOLD, { w: 6, h: 4 });
      b.bone = CAPE;
      b.box([0, 0.83, -0.205], [0.66, 0.92, 0.022], W, { faces: [null, null, null, null, UV.cape, UV.cape] });
      break;
    }
  }
}

function shoes(b: Build, x: number, bone: number, kind: string, skin: string) {
  if (kind === 'caite') {
    b.box([x, 0.02, 0.035], [0.27, 0.04, 0.38], '#5a3a22', { bone });
    b.box([x, 0.085, 0.03], [0.25, 0.09, 0.34], skin, { bone, bevel: 0.03 });
    b.box([x, 0.09, 0.1], [0.265, 0.095, 0.05], '#5a3a22', { bone });
    b.box([x, 0.09, -0.06], [0.265, 0.095, 0.04], '#5a3a22', { bone });
  } else if (kind === 'taco') {
    b.box([x, 0.07, 0.035], [0.29, 0.14, 0.38], '#17181c', { bone, bevel: 0.035 });
    b.box([x, 0.09, 0.06], [0.295, 0.035, 0.16], '#ffffff', { bone, r: [0, 0, 0] });
    b.box([x, 0.012, 0.035], [0.26, 0.024, 0.34], '#e63946', { bone });
  } else {
    b.box([x, 0.025, 0.035], [0.3, 0.05, 0.39], '#ffffff', { bone });
    b.box([x, 0.095, 0.03], [0.29, 0.1, 0.37], '#e63946', { bone, bevel: 0.035 });
    b.box([x, 0.09, 0.19], [0.24, 0.085, 0.07], '#ffffff', { bone, bevel: 0.02 });
    b.box([x, 0.15, 0.08], [0.16, 0.02, 0.14], '#ffffff', { bone });
  }
}

export function buildAvatar(cfg: AvatarConfig): THREE.BufferGeometry {
  const b = new Build();
  b.white = [0.78, 0.18];
  const si = shirtInfo(cfg),
    pi = pantsInfo(cfg),
    skin = cfg.skin,
    W = '#ffffff',
    sk = UV.skin,
    sh = UV.shirt,
    pa = UV.pants,
    sl = UV.sleeve;
  const hatted = cfg.hat !== 'sin_sombrero' && cfg.hat !== '';
  // torso
  b.bone = TORSO;
  b.box([0, 1.01, 0], [0.6, 0.6, 0.32], W, { bevel: 0.035, faces: [strip(UV.tf), strip(UV.tf), sh, pa, UV.tf, UV.tb] });
  if (si.tail) b.box([0, 0.685, 0], [0.615, 0.1, 0.335], si.base, { bevel: 0.02 });
  if (si.ruffle) b.add(cylGeo(0.6, 14, true), [0, 1.225, 0], [0.42, 0.17, 0.25], W, { rect: UV.ruffle });
  // cabeza
  b.bone = HEAD;
  b.box([0, 1.31, 0], [0.22, 0.1, 0.2], skin);
  b.box([0, 1.53, 0], [0.5, 0.46, 0.46], W, { bevel: 0.13, faces: [sk, sk, sk, sk, UV.face, sk] });
  hair(b, cfg, hatted);
  hat(b, cfg);
  // brazos
  for (const s of [1, -1]) {
    const U = s > 0 ? LAU : RAU,
      L = s > 0 ? LAL : RAL,
      x = s * 0.42,
      sf: (Rect | null)[] = [sl, sl, sh, sk, sl, sl];
    if (si.sleeve === 'puff') {
      b.box([x + s * 0.01, 1.13, 0], [0.28, 0.29, 0.3], W, { bone: U, bevel: 0.07, faces: [sl, sl, sh, sh, sl, sl] });
      b.box([x, 0.99, 0], [0.2, 0.16, 0.22], skin, { bone: U, bevel: 0.03 });
    } else b.box([x, 1.1, 0], [0.22, 0.36, 0.24], W, { bone: U, bevel: 0.03, faces: sf });
    b.box([x, 0.8, 0], [0.205, 0.31, 0.225], si.sleeve === 'long' ? si.base : skin, { bone: L, bevel: 0.03 });
    if (si.sleeve === 'long') b.box([x, 0.675, 0], [0.215, 0.05, 0.235], shade(si.base, -0.14), { bone: L });
    b.box([x, 0.6, 0], [0.2, 0.15, 0.22], skin, { bone: L, bevel: 0.05 });
  }
  // piernas
  const lt = topHalf(UV.leg),
    lb = botHalf(UV.leg),
    bare = pi.skirt || pi.shorts;
  for (const s of [1, -1]) {
    const U = s > 0 ? LLU : RLU,
      L = s > 0 ? LLL : RLL,
      x = s * 0.15,
      lw = pi.wide ? 0.295 : 0.28;
    b.box([x, 0.55, 0], [lw, 0.37, lw + 0.01], W, {
      bone: U,
      bevel: 0.03,
      faces: [lt, lt, pa, bare ? sk : pa, lt, lt],
    });
    b.box([x, 0.235, 0], [lw - 0.012, 0.31, lw - 0.002], W, {
      bone: L,
      bevel: 0.03,
      faces: [lb, lb, bare ? sk : pa, pa, lb, lb],
    });
    shoes(b, x, L, pi.shoe, skin);
  }
  if (pi.skirt) {
    b.bone = ROOT;
    b.add(cylGeo(0.58, 16, true), [0, 0.5, 0], [0.55, 0.5, 0.45], W, { rect: UV.skirt });
    b.add(cylGeo(1, 16), [0, 0.262, 0], [0.535, 0.02, 0.435], '#0d3f80');
    b.add(cylGeo(1, 16), [0, 0.74, 0], [0.325, 0.05, 0.27], '#d62839');
  }
  if (pi.shorts) {
    b.bone = ROOT;
    b.box([0, 0.7, 0], [0.6, 0.08, 0.325], pi.base, { bevel: 0.02 });
  }
  accessory(b, cfg);
  const g = b.done('skinned');
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 2);
  return g;
}

// ------------------------------------------------------------------ apariencias compartidas (geometría + atlas)
interface Look {
  geo: THREE.BufferGeometry;
  mat: THREE.MeshStandardMaterial;
  refs: number;
}
const looks = new Map<string, Look>();
const keyOf = (c: AvatarConfig) =>
  [
    c.skin,
    c.hair,
    c.hairColor,
    c.face,
    c.shirt,
    c.shirtColor,
    c.pants,
    c.pantsColor,
    c.hat,
    c.hatColor,
    c.acc,
    c.accColor,
  ].join('|');
function acquire(cfg: AvatarConfig): Look {
  const k = keyOf(cfg);
  let l = looks.get(k);
  if (!l) {
    const mat = new THREE.MeshStandardMaterial({
      map: makeAtlas(cfg),
      vertexColors: true,
      roughness: 0.62,
      metalness: 0,
    });
    mat.toneMapped = false;
    l = { geo: buildAvatar(cfg), mat, refs: 0 };
    looks.set(k, l);
  }
  l.refs++;
  return l;
}
function release(cfg: AvatarConfig) {
  const k = keyOf(cfg),
    l = looks.get(k);
  if (!l) return;
  if (--l.refs <= 0)
    setTimeout(() => {
      if (l.refs <= 0 && looks.get(k) === l) {
        looks.delete(k);
        l.geo.dispose();
        l.mat.map?.dispose();
        l.mat.dispose();
      }
    }, 4000);
}

// ------------------------------------------------------------------ esqueleto
const EMPTY = new THREE.BufferGeometry(),
  EMPTY_MAT = new THREE.MeshBasicMaterial();
function makeRig() {
  const bones = PIVOT.map(() => new THREE.Bone());
  PARENT.forEach((p, i) => {
    const q = p >= 0 ? PIVOT[p] : [0, 0, 0];
    bones[i].position.set(PIVOT[i][0] - q[0], PIVOT[i][1] - q[1], PIVOT[i][2] - q[2]);
    if (p >= 0) bones[p].add(bones[i]);
  });
  bones[0].updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(bones),
    mesh = new THREE.SkinnedMesh<THREE.BufferGeometry, THREE.Material>(EMPTY, EMPTY_MAT);
  mesh.add(bones[0]);
  mesh.bind(skeleton);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.visible = false;
  mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 2.2);
  return {
    bones,
    mesh,
    skeleton,
    cur: new Float32Array(3 + NB * 3),
    ph: 0,
    anim: '' as string,
    t0: 0,
    spin: 0,
    init: false,
  };
}

// ------------------------------------------------------------------ animación
const NP = 3 + NB * 3,
  TGT = new Float32Array(NP);
const sst = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
function pose(P: Float32Array, anim: Anim, t: number, ph: number, k: number, speed: number) {
  P.fill(0);
  const set = (b: number, x: number, y = 0, z = 0) => {
    P[3 + b * 3] = x;
    P[4 + b * 3] = y;
    P[5 + b * 3] = z;
  };
  const br = Math.sin(t * 1.9),
    s = Math.sin(ph),
    c = Math.cos(ph);
  const legs = (A: number, K: number, k0: number) => {
    set(LLU, -s * A);
    set(LLL, Math.max(0, c) * K + k0);
    set(RLU, s * A);
    set(RLL, Math.max(0, -c) * K + k0);
  };
  const relax = () => {
    set(LAU, 0.03 * br, 0, 0.07 + br * 0.015);
    set(RAU, 0.03 * br, 0, -0.07 - br * 0.015);
    set(LAL, -0.1);
    set(RAL, -0.1);
  };
  set(CAPE, 0.1 + Math.sin(t * 1.3) * 0.03);
  switch (anim) {
    case 'walk':
      legs(0.62, 0.8, 0.05);
      set(LAU, s * 0.55, 0, 0.06);
      set(LAL, -0.2 - Math.max(0, -s) * 0.35);
      set(RAU, -s * 0.55, 0, -0.06);
      set(RAL, -0.2 - Math.max(0, s) * 0.35);
      P[1] = Math.abs(c) * 0.025;
      set(ROOT, 0.04);
      set(TORSO, 0, s * 0.09, 0);
      set(HEAD, 0, -s * 0.05, 0);
      set(CAPE, 0.4 + c * 0.06);
      break;
    case 'run':
      legs(1.05, 1.5, 0.2);
      set(LAU, s * 1.05, 0, 0.1);
      set(LAL, -1.45);
      set(RAU, -s * 1.05, 0, -0.1);
      set(RAL, -1.45);
      P[1] = Math.abs(c) * 0.065 - 0.02;
      set(ROOT, 0.22);
      set(TORSO, 0.06, s * 0.16, 0);
      set(HEAD, -0.14, -s * 0.08, 0);
      set(CAPE, 1.0 + c * 0.1);
      break;
    case 'jump':
      set(LAU, -2.75, 0, 0.28);
      set(RAU, -2.75, 0, -0.28);
      set(LAL, -0.15);
      set(RAL, -0.15);
      set(LLU, -0.75);
      set(LLL, 1.15);
      set(RLU, 0.18);
      set(RLL, 0.55);
      set(HEAD, -0.15);
      set(ROOT, -0.04);
      set(CAPE, 0.5);
      break;
    case 'fall': {
      const fl = Math.sin(t * 13) * 0.1;
      set(LAU, -0.3, 0, 1.95 + fl);
      set(RAU, -0.3, 0, -1.95 - fl);
      set(LAL, -0.2);
      set(RAL, -0.2);
      set(LLU, -0.35, 0, 0.14);
      set(LLL, 0.55);
      set(RLU, 0.28, 0, -0.14);
      set(RLL, 0.35);
      set(HEAD, 0.14);
      set(ROOT, 0.05);
      set(CAPE, 1.5 + fl);
      break;
    }
    case 'dance': {
      // punta: cadera y pies rápidos, torso quieto
      const w = t * 13,
        q = Math.sin(w),
        h = Math.sin(w / 2);
      P[0] = q * 0.035;
      P[1] = -0.055 + Math.abs(q) * 0.02;
      set(ROOT, 0.07, Math.sin(t * 1.1) * 0.5, q * 0.14);
      set(TORSO, 0.04, 0, -q * 0.15);
      set(HEAD, -0.05, 0, q * 0.03);
      set(LLU, -0.18 + q * 0.2, 0, -q * 0.14 + 0.04);
      set(LLL, 0.4 + Math.max(0, q) * 0.3);
      set(RLU, -0.18 - q * 0.2, 0, -q * 0.14 - 0.04);
      set(RLL, 0.4 + Math.max(0, -q) * 0.3);
      set(LAU, -0.55 + h * 0.3, 0, 0.8);
      set(LAL, -1.35 + h * 0.25);
      set(RAU, -0.55 - h * 0.3, 0, -0.8);
      set(RAL, -1.35 - h * 0.25);
      set(CAPE, 0.25 + q * 0.1);
      break;
    }
    case 'dance2': {
      // sique: zapateo con el pañuelo en alto y vueltas
      const w = t * 5.4,
        q = Math.sin(w),
        up = Math.max(0, q),
        dn = Math.max(0, -q);
      P[1] = Math.abs(q) * 0.075;
      set(ROOT, 0, Math.sin(t * 1.35) * 0.3, 0);
      set(TORSO, 0, 0, q * 0.07);
      set(HEAD, 0, 0, -q * 0.05);
      set(LLU, -up * 0.85);
      set(LLL, up * 1.15);
      set(RLU, -dn * 0.85);
      set(RLL, dn * 1.15);
      set(LAU, -2.75 + q * 0.14, 0, 0.3 + Math.sin(w * 0.5) * 0.22);
      set(LAL, -0.3);
      set(RAU, 0.2, 0, -0.8);
      set(RAL, 0, 0, 1.55);
      set(CAPE, 0.35 + q * 0.12);
      break;
    }
    case 'celebrate': {
      const j = Math.abs(Math.sin(t * 7.5)),
        kb = (1 - j) * 0.55,
        sh = Math.sin(t * 15) * 0.13;
      P[1] = j * 0.24 - 0.03;
      set(LAU, -2.95, 0, 0.32 + sh);
      set(RAU, -2.95, 0, -0.32 - sh);
      set(LAL, -0.2);
      set(RAL, -0.2);
      set(LLU, -kb * 0.5);
      set(LLL, kb);
      set(RLU, -kb * 0.5);
      set(RLL, kb);
      set(HEAD, -0.25);
      set(CAPE, 0.3 + j * 0.5);
      break;
    }
    case 'wave':
      relax();
      set(RAU, 0, 0, -2.3);
      set(RAL, 0, 0, -0.45 + Math.sin(t * 9) * 0.5);
      set(HEAD, 0, 0, -0.1);
      set(TORSO, 0, 0, -0.04);
      P[1] = br * 0.006;
      break;
    case 'clap': {
      const q = Math.sin(t * 15) * 0.5 + 0.5;
      set(LAU, -1.1, 0, -0.16 - q * 0.17);
      set(LAL, -0.6);
      set(RAU, -1.1, 0, 0.16 + q * 0.17);
      set(RAL, -0.6);
      P[1] = q * 0.012;
      set(HEAD, 0.05);
      set(TORSO, 0.03);
      break;
    }
    case 'kick': {
      const u = k % 0.95;
      let leg: number, knee: number, amt: number;
      if (u < 0.14) {
        const f = u / 0.14;
        leg = f * 0.75;
        knee = f * 1.0;
        amt = f;
      } else if (u < 0.28) {
        const f = sst(0, 1, (u - 0.14) / 0.14);
        leg = mix(0.75, -1.5, f);
        knee = mix(1.0, 0, f);
        amt = 1;
      } else if (u < 0.58) {
        leg = -1.5 + (u - 0.28) * 0.5;
        knee = 0;
        amt = 1;
      } else {
        const f = sst(0, 1, (u - 0.58) / 0.37);
        leg = mix(-1.35, 0, f);
        knee = 0;
        amt = 1 - f;
      }
      set(RLU, leg);
      set(RLL, knee);
      set(LLL, 0.12 * amt);
      set(ROOT, -0.14 * amt * (leg < 0 ? 1 : -0.4));
      set(TORSO, 0.05 * amt, 0.2 * amt, 0);
      set(LAU, -0.95 * amt, 0, 0.3 * amt + 0.06);
      set(RAU, 0.75 * amt, 0, -0.5 * amt - 0.06);
      set(LAL, -0.3);
      set(RAL, -0.3);
      break;
    }
    case 'throw': {
      const u = k % 0.95;
      let arm: number, el: number, tw: number;
      if (u < 0.2) {
        const f = sst(0, 1, u / 0.2);
        arm = mix(0, -3.5, f);
        el = mix(-0.1, -1.3, f);
        tw = -0.5 * f;
      } else if (u < 0.34) {
        const f = sst(0, 1, (u - 0.2) / 0.14);
        arm = mix(-3.5, -1.0, f);
        el = mix(-1.3, -0.05, f);
        tw = mix(-0.5, 0.45, f);
      } else if (u < 0.62) {
        arm = -1.0 + (u - 0.34) * 0.6;
        el = -0.05;
        tw = 0.45;
      } else {
        const f = sst(0, 1, (u - 0.62) / 0.33);
        arm = mix(-0.83, 0, f);
        el = -0.1;
        tw = 0.45 * (1 - f);
      }
      set(RAU, arm, 0, -0.15);
      set(RAL, el);
      set(TORSO, 0.04, tw, 0);
      set(LAU, tw < 0 ? -1.1 : 0.4 * tw, 0, 0.2);
      set(LAL, -0.3);
      set(LLU, -0.3);
      set(LLL, 0.2);
      set(RLU, 0.28);
      set(RLL, 0.25);
      P[1] = -0.02;
      break;
    }
    case 'carry': {
      const m = speed > 0.5 ? 1 : 0;
      set(LLU, -s * 0.5 * m);
      set(LLL, Math.max(0, c) * 0.7 * m + 0.05);
      set(RLU, s * 0.5 * m);
      set(RLL, Math.max(0, -c) * 0.7 * m + 0.05);
      set(LAU, -1.38, 0, -0.2);
      set(LAL, -0.28);
      set(RAU, -1.38, 0, 0.2);
      set(RAL, -0.28);
      set(TORSO, -0.07, s * 0.04 * m, 0);
      P[1] = Math.abs(c) * 0.02 * m;
      set(CAPE, 0.1 + 0.3 * m);
      break;
    }
    case 'drive': {
      const st = Math.sin(t * 2.2) * 0.09;
      P[1] = -0.28;
      set(LLU, -1.5, 0, 0.1);
      set(LLL, 1.4);
      set(RLU, -1.5, 0, -0.1);
      set(RLL, 1.4);
      set(LAU, -1.22 + st, 0, -0.12);
      set(LAL, -0.35);
      set(RAU, -1.22 - st, 0, 0.12);
      set(RAL, -0.35);
      set(TORSO, -0.05);
      set(CAPE, 0.6);
      break;
    }
    case 'sit':
      P[1] = -0.1;
      set(LLU, -1.52, 0, 0.07);
      set(LLL, 1.48);
      set(RLU, -1.52, 0, -0.07);
      set(RLL, 1.48);
      set(LAU, -0.6, 0, 0.04);
      set(LAL, -0.75);
      set(RAU, -0.6, 0, -0.04);
      set(RAL, -0.75);
      set(TORSO, 0.03 + br * 0.008);
      set(HEAD, 0, Math.sin(t * 0.5) * 0.18, 0);
      set(CAPE, 0.02);
      break;
    default: // idle
      relax();
      P[1] = br * 0.007;
      set(TORSO, br * 0.012);
      set(HEAD, -br * 0.01, Math.sin(t * 0.55) * 0.12, 0);
  }
}

export function Avatar({ config, state, name, scale = 1 }: AvatarProps) {
  const rig = useMemo(makeRig, []);
  const key = keyOf(config);
  useLayoutEffect(() => {
    const l = acquire(config);
    rig.mesh.geometry = l.geo;
    rig.mesh.material = l.mat;
    rig.mesh.visible = true;
    return () => {
      release(config);
    };
  }, [key, rig]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(
    () => () => {
      rig.skeleton.dispose();
    },
    [rig],
  );
  const seed = useRef(Math.random() * 10);
  useFrame((st, d) => {
    const dt = Math.min(d, 0.05),
      t = st.clock.elapsedTime + seed.current,
      a = state.anim,
      sp = state.speed || 0,
      R = rig;
    if (a !== R.anim) {
      R.anim = a;
      R.t0 = t;
    }
    R.ph +=
      dt *
      (a === 'run' ? 13.5 * Math.min(1.35, Math.max(0.75, sp / 8.2)) : 9.4 * Math.min(1.4, Math.max(0.6, sp / 5.2)));
    pose(TGT, a, t, R.ph, t - R.t0, sp);
    const C = R.cur,
      kk = R.init ? 1 - Math.exp(-dt * (a === 'kick' || a === 'throw' ? 30 : 16)) : 1;
    R.init = true;
    for (let i = 0; i < NP; i++) C[i] += (TGT[i] - C[i]) * kk;
    // vuelta completa del sique (fuera del suavizado para que no "desenrolle")
    if (a === 'dance2') {
      const u = ((t - R.t0) % 3.4) / 3.4;
      R.spin = PI * 2 * sst(0.55, 0.95, u);
    } else if (R.spin !== 0) {
      R.spin = R.spin > PI ? R.spin + (PI * 2 - R.spin) * Math.min(1, dt * 10) : R.spin * (1 - Math.min(1, dt * 10));
      if (R.spin < 0.01 || R.spin > PI * 2 - 0.01) R.spin = 0;
    }
    const B = R.bones;
    B[0].position.set(C[0], HIP + C[1], C[2]);
    for (let i = 0; i < NB; i++) B[i].rotation.set(C[3 + i * 3], C[4 + i * 3] + (i === 0 ? R.spin : 0), C[5 + i * 3]);
  });
  const tag = useMemo(
    () =>
      name ? textTexture(name, { fg: '#ffffff', bg: 'rgba(16,24,38,0.62)', size: 44, pad: 0.42, radius: 0.5 }) : null,
    [name],
  );
  const tall =
    config.hat === 'corona_carnaval'
      ? 2.68
      : config.hat === 'sin_sombrero'
        ? config.hair === 'pelo_afro'
          ? 2.3
          : 2.14
        : 2.36;
  return (
    <group scale={scale}>
      <primitive object={rig.mesh} />
      {tag && (
        <sprite position={[0, tall, 0]} scale={[0.25 * (tag as any).aspect, 0.25, 1]} renderOrder={3}>
          <spriteMaterial map={tag} transparent depthWrite={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
}
