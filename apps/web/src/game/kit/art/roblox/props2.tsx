// Utilería Roblox, parte 2: vehículos, objetos sueltos, coleccionables y la guacamaya.
import { useRef } from 'react';
import * as THREE from 'three';
import { useTick } from '../../core';
import type { ArtProps } from '../types';
import { type Build, dodGeo, icoGeo, shade, torGeo, type V3 } from './geo';
import { vcMat } from './mats';
import { beam, geo, Mesh, Placed, useSolidBox, useSolidCyl, wheel } from './pk';

const PI = Math.PI,
  DARK = '#23252b',
  CH = '#2a2c31',
  GLASS = '#27455f',
  CHROME = '#d9dde2',
  WOOD = '#8a5a34';
type Things = Pick<
  ArtProps,
  | 'Bus'
  | 'Mototaxi'
  | 'Car'
  | 'Boat'
  | 'Cone'
  | 'Barrel'
  | 'Crate'
  | 'Tire'
  | 'SoccerBall'
  | 'Goal'
  | 'Coin'
  | 'Gem'
  | 'Macaw'
>;

// ------------------------------------------------------------------ balón
const ICO = (() => {
  const t = (1 + Math.sqrt(5)) / 2,
    v: V3[] = [];
  for (const a of [-1, 1])
    for (const b of [-t, t]) {
      v.push([0, a, b], [a, b, 0], [b, 0, a]);
    }
  return v.map((p) => {
    const l = Math.hypot(...p);
    return [p[0] / l, p[1] / l, p[2] / l] as V3;
  });
})();
function ballGeo(r: number) {
  return geo(`ball|${r}`, (b) => {
    const src = icoGeo(4),
      p = src.attributes.position,
      white: number[][] = [],
      black: number[][] = [],
      seam: number[][] = [];
    for (let i = 0; i < p.count; i += 3) {
      const cx = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3,
        cy = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3,
        cz = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3,
        l = Math.hypot(cx, cy, cz);
      let d1 = -1,
        d2 = -1;
      for (const v of ICO) {
        const d = (cx * v[0] + cy * v[1] + cz * v[2]) / l;
        if (d > d1) {
          d2 = d1;
          d1 = d;
        } else if (d > d2) d2 = d;
      }
      const tgt = d1 > 0.937 ? black : d1 - d2 < 0.035 && d1 < 0.86 ? seam : white;
      for (let j = 0; j < 3; j++) tgt.push([p.getX(i + j) * r, p.getY(i + j) * r, p.getZ(i + j) * r]);
    }
    b.tris(white, '#ffffff', { k: 'shiny' });
    b.tris(black, '#1d1d1f', { k: 'shiny' });
    if (seam.length) b.tris(seam, '#c9ccd1', { k: 'shiny' });
    // normales suaves de esfera
    for (let i = 0; i < b.pos.length; i += 3) {
      const l = Math.hypot(b.pos[i], b.pos[i + 1], b.pos[i + 2]);
      b.nor[i] = b.pos[i] / l;
      b.nor[i + 1] = b.pos[i + 1] / l;
      b.nor[i + 2] = b.pos[i + 2] / l;
    }
  });
}

// ------------------------------------------------------------------ red de la portería
let netMat: THREE.Material | null = null;
function getNetMat() {
  if (netMat) return netMat;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d')!;
  c.clearRect(0, 0, 64, 64);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 5;
  c.strokeRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (netMat = new THREE.MeshBasicMaterial({
    map: t,
    transparent: true,
    alphaTest: 0.25,
    side: THREE.DoubleSide,
    toneMapped: false,
    opacity: 0.9,
  }));
}

// ------------------------------------------------------------------ coleccionables
const GEM_KIND: Record<string, string> = {
  jade: 'gem',
  copan: 'gem',
  concha: 'shell',
  islas: 'shell',
  valle: 'snail',
  caracola: 'snail',
  olancho: 'crystal',
  cristal: 'crystal',
  graciasadios: 'feather',
  pluma: 'feather',
  lempira: 'penacho',
  franciscomorazan: 'nugget',
  elparaiso: 'corn',
  atlantida: 'mask',
  santabarbara: 'hat',
  yoro: 'fish',
  lapaz: 'bean',
  choluteca: 'cashew',
  ocotepeque: 'pinecone',
  comayagua: 'gear',
  colon: 'spyglass',
  cortes: 'hook',
  intibuca: 'basket',
};
const FEATH = ['#e21f2d', '#ffd23f', '#1565d8', '#2ea44f', '#ff5d9e'];
/** solo desarrollo: con #gemas en la URL, <P.Gem> dibuja todas las formas en fila (para revisarlas en la galería) */
const GEM_DEBUG = typeof location !== 'undefined' && location.hash.includes('gemas');
function gemGeo(kind: string, c: string) {
  const shape = GEM_KIND[kind] ?? 'gem';
  return geo(`gem|${shape}|${c}`, (b) => {
    const G = { k: 'gold' as const },
      S = { k: 'shiny' as const },
      silver = '#dfe4ea';
    const feather = (p: V3, rz: number, len: number, cols: string[]) => {
      b.push(p, [0, 0, rz]);
      b.box([0, len * 0.5, 0], [0.025, len, 0.025], '#f5f1e6');
      cols.forEach((k, i) =>
        b.box([0, len * (0.3 + i * 0.26), 0], [0.2 - i * 0.045, len * 0.3, 0.035], k, { bevel: 0.015 }),
      );
      b.pop();
    };
    switch (shape) {
      case 'shell': {
        b.push([0, 0, 0], [0, 0, -0.5]);
        for (let i = 0; i < 6; i++) {
          const k = 0.8 ** i;
          b.sph([0, -0.12 + i * 0.1 * (1 + k) * 0.7, 0], [0.24 * k, 0.16 * k, 0.24 * k], i % 2 ? shade(c, 0.25) : c, {
            ...S,
            w: 8,
            h: 5,
          });
        }
        b.sph([0.1, -0.12, 0.1], [0.2, 0.2, 0.1], '#ffb3c1', { ...S, w: 8, h: 5 });
        for (let i = 0; i < 5; i++)
          b.cyl([Math.cos(i * 1.25) * 0.2, -0.02, Math.sin(i * 1.25) * 0.2], 0.035, 0.12, shade(c, 0.3), {
            sides: 4,
            rt: 0,
          });
        b.pop();
        break;
      }
      case 'snail': {
        for (let i = 0; i < 7; i++) {
          const k = 0.82 ** i,
            an = i * 1.1;
          b.sph(
            [Math.cos(an) * 0.13 * k, -0.15 + i * 0.075, Math.sin(an) * 0.13 * k],
            0.21 * k,
            i % 2 ? shade(c, 0.3) : c,
            { ...S, w: 8, h: 5 },
          );
        }
        b.sph([0.16, -0.2, 0.08], [0.13, 0.11, 0.09], '#ffd9c2', { ...S, w: 6, h: 4 });
        break;
      }
      case 'crystal': {
        const cr = (p: V3, r: V3, h: number, rad: number, k: number) => {
          b.push(p, r);
          b.cyl([0, h / 2, 0], rad, h, shade(c, k), { sides: 6, ...G });
          b.cyl([0, h + rad * 0.6, 0], rad, rad * 1.2, shade(c, k + 0.15), { sides: 6, rt: 0, ...G });
          b.pop();
        };
        cr([0, -0.3, 0], [0, 0, 0], 0.42, 0.11, 0);
        cr([0.1, -0.3, 0.02], [0, 0, -0.6], 0.3, 0.08, 0.15);
        cr([-0.1, -0.3, 0], [0.2, 0, 0.55], 0.32, 0.085, -0.1);
        cr([0, -0.3, 0.1], [0.7, 0, 0.1], 0.22, 0.07, 0.2);
        b.add(dodGeo(), [0, -0.3, 0], [0.26, 0.1, 0.24], '#7d8590', { k: 'stone' });
        break;
      }
      case 'feather':
        feather([0.08, -0.36, 0], 0.22, 0.74, ['#e21f2d', '#ffd23f', '#1565d8']);
        break;
      case 'penacho': {
        b.add(torGeo(0.16, 6, 12, PI), [0, -0.22, 0], 0.24, '#8a5a34', {});
        for (let i = 0; i < 5; i++)
          feather([(i - 2) * 0.1, -0.2, 0], (2 - i) * 0.32, 0.5 - Math.abs(i - 2) * 0.04, [
            FEATH[i],
            FEATH[(i + 1) % 5],
            FEATH[(i + 2) % 5],
          ]);
        for (let i = 0; i < 5; i++)
          b.sph([(i - 2) * 0.1, -0.2, 0.05], 0.035, i % 2 ? '#ffd23f' : c, { ...G, w: 5, h: 3 });
        break;
      }
      case 'nugget': {
        b.add(dodGeo(), [0, 0, 0], [0.24, 0.2, 0.2], silver, { ...G, r: [0.3, 0.5, 0] });
        b.add(dodGeo(), [0.16, 0.1, 0.05], 0.14, '#f2f5f8', { ...G, r: [1, 0.2, 0] });
        b.add(dodGeo(), [-0.14, -0.08, 0.08], 0.13, '#c3cad3', { ...G, r: [0.2, 1.2, 0.5] });
        b.add(dodGeo(), [0.02, -0.12, -0.12], 0.12, silver, { ...G });
        break;
      }
      case 'corn': {
        b.push([0, 0, 0], [0, 0, -0.3]);
        b.cyl([0, 0.05, 0], 0.15, 0.5, '#ffc93c', { sides: 8, rt: 0.08, ...G });
        for (let i = 0; i < 5; i++) b.cyl([0, -0.14 + i * 0.1, 0], 0.158 - i * 0.014, 0.03, '#e0a020', { sides: 8 });
        for (let i = 0; i < 3; i++)
          b.box([Math.cos(i * 2.1) * 0.14, -0.2, Math.sin(i * 2.1) * 0.14], [0.14, 0.34, 0.03], '#7cb342', {
            r: [0, -i * 2.1 + PI / 2, 0.0],
            bevel: 0.012,
          });
        b.cyl([0, -0.28, 0], 0.05, 0.12, '#7cb342', { sides: 6 });
        b.pop();
        break;
      }
      case 'mask': {
        b.box([0, -0.02, 0], [0.42, 0.5, 0.1], c, { bevel: 0.045, ...S });
        for (const s of [-1, 1]) {
          b.box([s * 0.1, 0.05, 0.05], [0.12, 0.07, 0.03], '#1d1d1f', { r: [0, 0, s * 0.25] });
          b.box([s * 0.15, -0.08, 0.05], [0.07, 0.05, 0.03], '#ff5d9e');
        }
        b.box([0, -0.14, 0.055], [0.18, 0.05, 0.03], '#ffffff');
        b.box([0, -0.03, 0.07], [0.06, 0.12, 0.05], shade(c, -0.2));
        for (let i = 0; i < 5; i++)
          feather([(i - 2) * 0.08, 0.2, -0.02], (2 - i) * 0.3, 0.3, [FEATH[(i + 1) % 5], FEATH[(i + 3) % 5]]);
        b.box([0, 0.2, 0.04], [0.44, 0.05, 0.04], '#ffc93c', G);
        break;
      }
      case 'hat': {
        b.cyl([0, -0.1, 0], 0.38, 0.03, '#e6cf8b', { sides: 14 });
        b.add(torGeo(0.05, 5, 14), [0, -0.09, 0], 0.37, '#d4b86a', { r: [PI / 2, 0, 0] });
        b.cyl([0, 0.02, 0], 0.2, 0.22, '#e6cf8b', { sides: 12, rt: 0.17 });
        b.cyl([0, -0.05, 0], 0.205, 0.06, '#1d1d1f', { sides: 12 });
        break;
      }
      case 'fish': {
        b.sph([0, 0, 0], [0.3, 0.16, 0.09], silver, { ...G, w: 10, h: 6 });
        b.box([-0.34, 0, 0], [0.16, 0.24, 0.03], '#b9c2cc', { r: [0, 0, PI / 4], ...S });
        b.box([0, 0.15, 0], [0.16, 0.1, 0.02], '#b9c2cc', { r: [0, 0, 0.3] });
        for (const s of [-1, 1]) b.sph([0.18, 0.03, s * 0.07], 0.035, '#1d1d1f', { w: 5, h: 3 });
        b.box([0.02, -0.02, 0], [0.02, 0.2, 0.19], c);
        break;
      }
      case 'bean': {
        b.sph([0, 0, 0], [0.2, 0.28, 0.15], '#6f4323', { ...S, w: 10, h: 6 });
        b.box([0, 0, 0.13], [0.03, 0.44, 0.05], '#3b2212', { r: [0, 0, 0.12], bevel: 0.012 });
        break;
      }
      case 'cashew': {
        b.sph([0, 0.1, 0], [0.2, 0.24, 0.2], c, { ...S, w: 10, h: 6 });
        b.sph([0.02, -0.17, 0], [0.13, 0.09, 0.09], '#8a6a45', { ...S, w: 8, h: 5 });
        b.sph([0.1, -0.22, 0], [0.07, 0.06, 0.07], '#8a6a45', { w: 6, h: 4 });
        b.cyl([0, 0.36, 0], 0.02, 0.1, '#5a3d26', { sides: 5 });
        b.box([0.07, 0.38, 0], [0.14, 0.02, 0.08], '#4caf50', { r: [0, 0, 0.3] });
        break;
      }
      case 'pinecone': {
        for (let i = 0; i < 5; i++)
          b.cyl([0, -0.2 + i * 0.11, 0], 0.2 - Math.abs(i - 1.2) * 0.04, 0.16, i % 2 ? '#8a5a34' : '#6b4a2a', {
            sides: 7,
            rt: 0.06,
            r: [0, i * 0.45, 0],
          });
        b.cyl([0, -0.29, 0], 0.03, 0.08, '#5a3d26', { sides: 5 });
        break;
      }
      case 'gear': {
        b.cyl([0, 0, 0], 0.24, 0.1, '#e0a020', { sides: 16, r: [PI / 2, 0, 0], ...G });
        for (let i = 0; i < 8; i++)
          b.box([Math.cos((i * PI) / 4) * 0.27, Math.sin((i * PI) / 4) * 0.27, 0], [0.12, 0.1, 0.1], '#ffc93c', {
            r: [0, 0, (i * PI) / 4],
            ...G,
          });
        b.cyl([0, 0, 0], 0.09, 0.12, '#3b2f1a', { sides: 10, r: [PI / 2, 0, 0] });
        for (let i = 0; i < 4; i++)
          b.cyl([Math.cos((i * PI) / 2 + 0.8) * 0.16, Math.sin((i * PI) / 2 + 0.8) * 0.16, 0], 0.035, 0.11, '#3b2f1a', {
            sides: 6,
            r: [PI / 2, 0, 0],
          });
        break;
      }
      case 'spyglass': {
        b.push([0, 0, 0], [0, 0, 0.5]);
        b.cyl([-0.2, 0, 0], 0.09, 0.26, '#6b3f22', { sides: 10, r: [0, 0, PI / 2] });
        b.cyl([0.02, 0, 0], 0.075, 0.24, '#ffc93c', { sides: 10, r: [0, 0, PI / 2], ...G });
        b.cyl([0.22, 0, 0], 0.06, 0.22, '#6b3f22', { sides: 10, r: [0, 0, PI / 2] });
        for (const x of [-0.33, -0.08, 0.12, 0.33])
          b.cyl([x, 0, 0], x < -0.2 ? 0.1 : 0.085 - (x > 0.2 ? 0.015 : 0), 0.03, '#ffc93c', {
            sides: 10,
            r: [0, 0, PI / 2],
            ...G,
          });
        b.cyl([-0.345, 0, 0], 0.075, 0.01, '#9bd3ff', { sides: 10, r: [0, 0, PI / 2], k: 'glass' });
        b.pop();
        break;
      }
      case 'hook': {
        b.add(torGeo(0.2, 6, 12, PI * 1.25), [0, -0.12, 0], 0.17, silver, { ...G, r: [0, 0, PI * 0.9] });
        b.cyl([0.17, 0.12, 0], 0.034, 0.5, silver, { sides: 6, ...G });
        b.add(torGeo(0.3, 5, 10), [0.17, 0.42, 0], 0.06, silver, G);
        b.cyl([-0.15, -0.02, 0], 0.045, 0.14, silver, { sides: 4, rt: 0, ...G, r: [0, 0, -0.3] });
        break;
      }
      case 'basket': {
        const st = ['#e63946', '#ffd23f', '#2ea44f', '#1e88e5', '#ff5d9e'];
        for (let i = 0; i < 5; i++)
          b.cyl([0, -0.2 + i * 0.085, 0], 0.2 + i * 0.022, 0.085, i % 2 ? '#e6cf8b' : st[i], {
            sides: 12,
            rt: 0.222 + i * 0.022,
          });
        b.cyl([0, 0.225, 0], 0.3, 0.03, '#c9a35a', { sides: 12 });
        b.add(torGeo(0.09, 5, 12, PI), [0, 0.22, 0], 0.26, '#c9a35a', {});
        break;
      }
      default: {
        b.cyl([0, 0.13, 0], 0.34, 0.16, shade(c, 0.12), { sides: 6, rt: 0.2, ...G });
        b.cyl([0, -0.14, 0], 0.34, 0.38, c, { sides: 6, rt: 0, r: [PI, 0, 0], ...G });
        b.cyl([0, 0.215, 0], 0.2, 0.01, shade(c, 0.35), { sides: 6, ...G });
      }
    }
  });
}

// ------------------------------------------------------------------ guacamaya
const R = '#e21f2d',
  Y = '#ffd23f',
  BL = '#1565d8',
  WH = '#f5f1e6',
  BK = '#1d1d1f';
function macawHead(b: Build, p: V3) {
  b.push(p);
  b.box([0, 0, 0], [0.23, 0.24, 0.26], R, { bevel: 0.08 });
  for (const s of [-1, 1]) {
    b.box([s * 0.116, 0.0, 0.05], [0.014, 0.13, 0.13], WH);
    b.box([s * 0.124, 0.02, 0.06], [0.014, 0.05, 0.05], BK);
  }
  b.box([0, -0.01, 0.16], [0.1, 0.13, 0.13], '#f1e3c0', { bevel: 0.035 });
  b.box([0, -0.09, 0.19], [0.07, 0.09, 0.06], BK, { r: [0.35, 0, 0] });
  b.pop();
}
const wingGeo = () =>
  geo('macaw-wing', (b) => {
    b.box([0.2, 0, 0], [0.42, 0.05, 0.36], R, { bevel: 0.02 });
    b.box([0.56, 0, -0.03], [0.38, 0.045, 0.33], Y, { bevel: 0.02 });
    b.box([0.92, 0, -0.07], [0.4, 0.04, 0.28], BL, { bevel: 0.018 });
    b.box([0.56, -0.01, -0.2], [0.9, 0.03, 0.14], BL);
  });
function FlyingMacaw() {
  const g = useRef<THREE.Group>(null),
    wl = useRef<THREE.Mesh>(null),
    wr = useRef<THREE.Mesh>(null);
  const body = geo('macaw-fly', (b) => {
    b.box([0, 0, 0], [0.24, 0.24, 0.52], R, { bevel: 0.09 });
    macawHead(b, [0, 0.07, 0.34]);
    b.box([0, 0.0, -0.55], [0.15, 0.05, 0.66], R, { bevel: 0.02 });
    b.box([0, 0.0, -1.0], [0.1, 0.04, 0.44], BL, { bevel: 0.015 });
    for (const s of [-1, 1]) b.box([s * 0.08, -0.01, -0.62], [0.08, 0.035, 0.5], Y, { r: [0, s * 0.12, 0] });
    for (const s of [-1, 1]) b.box([s * 0.06, -0.14, -0.12], [0.05, 0.06, 0.12], '#4a4a50');
  });
  useTick((_, t) => {
    const o = g.current;
    if (!o) return;
    const th = t * 0.8;
    o.position.set(Math.cos(th) * 3.2, Math.sin(t * 1.7) * 0.3, Math.sin(th) * 3.2);
    o.rotation.set(0, -th, 0.3);
    const f = Math.sin(t * 9) * 0.65;
    if (wl.current) wl.current.rotation.z = f;
    if (wr.current) wr.current.rotation.z = -f;
  });
  return (
    <group ref={g}>
      <Mesh g={body} />
      <mesh ref={wl} geometry={wingGeo()} material={vcMat()} position={[0.1, 0.06, 0.05]} castShadow />
      <mesh
        ref={wr}
        geometry={wingGeo()}
        material={vcMat()}
        position={[-0.1, 0.06, 0.05]}
        scale={[-1, 1, 1]}
        castShadow
      />
    </group>
  );
}

export const things: Things = {
  Bus: (a) => {
    useSolidBox(a, 2.4, 2.6, 6);
    const c = a.color ?? '#ffd23f';
    const g = geo(`bus|${c}`, (b) => {
      const d = shade(c, -0.14);
      b.box([0, 1.6, 0.4], [2.4, 2.1, 5.2], c, { bevel: 0.1 });
      b.box([0, 2.7, 0.4], [2.2, 0.1, 5.0], '#ffffff', { bevel: 0.04 });
      b.box([0, 1.1, -2.58], [2.2, 1.1, 0.9], c, { bevel: 0.1 });
      b.box([0, 0.62, 0], [2.3, 0.2, 5.9], CH);
      b.box([0, 2.1, -2.21], [2.0, 0.8, 0.06], GLASS, { k: 'glass' });
      b.box([0, 2.1, -2.2], [0.06, 0.8, 0.07], d);
      b.box([0, 2.1, 3.01], [1.6, 0.7, 0.06], GLASS, { k: 'glass' });
      b.box([0, 2.58, -2.22], [1.5, 0.2, 0.06], BK);
      b.box([0, 2.58, -2.25], [1.1, 0.1, 0.02], '#ffd23f', { em: 0.6 });
      for (const s of [-1, 1]) {
        for (let i = 0; i < 6; i++)
          if (!(s > 0 && i === 0)) b.box([s * 1.2, 2.1, -1.6 + i * 0.84], [0.05, 0.62, 0.7], GLASS, { k: 'glass' });
        b.box([s * 1.2, 1.56, 0.4], [0.045, 0.16, 5.2], '#e63946');
        b.box([s * 1.2, 1.36, 0.4], [0.045, 0.1, 5.2], '#1d7fc7');
        b.box([s * 1.2, 1.22, 0.4], [0.045, 0.06, 5.2], '#2ea44f');
        b.box([s * 1.0, 1.72, -2.58], [0.24, 0.05, 0.9], d);
        b.box([s * 1.24, 2.2, -2.3], [0.1, 0.3, 0.08], CH);
        for (const z of [-1.9, 1.9]) {
          wheel(b, [s * 1.1, 0.48, z], 0.48, 0.34);
          b.box([s * 1.2, 1.04, z], [0.06, 0.12, 1.2], d);
        }
        b.box([s * 0.85, 1.12, -3.04], [0.3, 0.3, 0.05], '#fff6c9', { em: 0.9 });
        b.box([s * 0.9, 0.98, 3.02], [0.26, 0.22, 0.05], '#e63946', { em: 0.6 });
        b.box([s * 0.95, 2.88, 0.6], [0.05, 0.05, 3.7], '#8d9299');
        for (const z of [-1.2, 0.6, 2.4]) b.box([s * 0.95, 2.8, z], [0.05, 0.14, 0.05], '#8d9299');
      }
      b.box([1.2, 1.5, -1.62], [0.05, 1.7, 0.72], GLASS, { k: 'glass' });
      b.box([1.21, 1.5, -1.62], [0.05, 1.7, 0.05], d);
      b.box([1.2, 0.56, -1.62], [0.2, 0.08, 0.72], CH);
      b.box([0, 0.6, -3.05], [2.3, 0.24, 0.14], CHROME, { k: 'shiny' });
      b.box([0, 0.6, 3.04], [2.3, 0.24, 0.14], CHROME, { k: 'shiny' });
      b.box([0, 1.06, -3.04], [1.15, 0.56, 0.04], CH);
      for (let i = 0; i < 4; i++) b.box([0, 0.86 + i * 0.13, -3.06], [1.05, 0.04, 0.02], CHROME);
      b.box([-0.3, 3.05, 0.0], [0.9, 0.36, 0.7], WOOD, { k: 'wood' });
      b.box([0.35, 3.03, 1.0], [0.9, 0.32, 0.8], '#e63946', { bevel: 0.1, k: 'cloth' });
      b.box([-0.1, 3.0, 1.95], [1.1, 0.26, 0.6], '#2ea44f', { bevel: 0.1, k: 'cloth' });
      b.box([0.4, 3.0, -0.85], [0.6, 0.26, 0.6], '#1d7fc7', { bevel: 0.08 });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Mototaxi: (a) => {
    useSolidBox(a, 1.5, 1.8, 2.6);
    const c = a.color ?? '#e63946';
    const g = geo(`moto|${c}`, (b) => {
      const d = shade(c, -0.2),
        top = '#ffd23f';
      b.box([0, 0.44, 0.12], [1.3, 0.12, 2.1], CH);
      wheel(b, [0, 0.32, -1.0], 0.32, 0.16);
      b.box([0, 0.7, -1.0], [0.24, 0.08, 0.8], c, { bevel: 0.035 });
      for (const s of [-1, 1]) b.box([s * 0.12, 0.7, -0.93], [0.05, 0.9, 0.06], DARK, { r: [0.28, 0, 0] });
      b.box([0, 1.2, -0.84], [0.1, 0.5, 0.1], DARK, { r: [0.28, 0, 0] });
      b.box([0, 1.46, -0.74], [0.82, 0.06, 0.06], DARK);
      for (const s of [-1, 1]) b.box([s * 0.42, 1.46, -0.74], [0.16, 0.09, 0.09], BK);
      b.box([0, 1.12, -0.98], [0.56, 0.5, 0.22], c, { bevel: 0.07 });
      b.box([0, 1.16, -1.1], [0.22, 0.22, 0.04], '#fff6c9', { em: 1 });
      b.box([0, 0.72, -0.08], [0.6, 0.3, 0.52], BK, { bevel: 0.07 });
      b.box([0, 0.75, 0.74], [1.46, 0.62, 1.0], c, { bevel: 0.07 });
      b.box([0, 1.34, 1.2], [1.46, 0.72, 0.09], c, { bevel: 0.03 });
      b.box([0, 1.06, 0.72], [1.22, 0.14, 0.72], BK, { bevel: 0.05 });
      b.box([0, 1.36, 1.1], [1.22, 0.5, 0.12], BK, { bevel: 0.05 });
      for (const s of [-1, 1]) {
        b.box([s * 0.735, 0.84, 0.74], [0.02, 0.12, 1.0], '#ffffff');
        b.box([s * 0.66, 1.58, -0.74], [0.06, 1.2, 0.06], DARK, { r: [0.2, 0, 0] });
        b.box([s * 0.69, 1.9, 1.2], [0.06, 0.5, 0.06], DARK);
        wheel(b, [s * 0.7, 0.32, 0.86], 0.32, 0.18);
        b.box([s * 0.73, 0.7, 0.86], [0.2, 0.07, 0.8], d);
        b.box([s * 0.76, 2.12, 0.14], [0.03, 0.2, 2.36], '#ffffff', { k: 'cloth' });
        b.box([s * 0.56, 0.86, 1.25], [0.16, 0.12, 0.04], '#e63946', { em: 0.6 });
      }
      b.box([0, 2.2, 0.14], [1.54, 0.1, 2.4], top, { k: 'cloth', bevel: 0.04 });
      b.box([0, 2.12, -1.06], [1.54, 0.2, 0.04], top, { k: 'cloth' });
      b.box([0, 2.12, 1.34], [1.54, 0.2, 0.04], top, { k: 'cloth' });
      b.box([0, 0.62, 1.26], [0.4, 0.16, 0.03], '#ffffff');
    });
    const gl = geo('moto-glass', (b) => {
      b.box([0, 1.72, -0.82], [1.3, 0.66, 0.04], '#9fd8ff', { k: 'glass', r: [0.2, 0, 0] });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
        <Mesh g={gl} m="glass" />
      </Placed>
    );
  },
  Car: (a) => {
    useSolidBox(a, 1.9, 1.4, 4.2);
    const c = a.color ?? '#ffffff';
    const g = geo(`car|${c}`, (b) => {
      const d = shade(c, -0.2);
      b.box([0, 0.8, 0], [1.9, 0.66, 4.2], c, { bevel: 0.08 });
      b.box([0, 0.48, 0], [1.78, 0.16, 4.0], CH);
      b.box([0, 1.16, -1.48], [1.82, 0.2, 1.2], c, { bevel: 0.07 });
      b.box([0, 1.2, -0.16], [1.88, 0.2, 1.42], c);
      b.box([0, 1.72, -0.1], [1.82, 0.1, 1.3], c, { bevel: 0.045 });
      for (const s of [-1, 1]) {
        b.box([s * 0.87, 1.48, -0.78], [0.09, 0.46, 0.1], c, { r: [-0.32, 0, 0] });
        b.box([s * 0.87, 1.48, 0.5], [0.09, 0.46, 0.1], c);
        b.box([s * 0.9, 1.48, -0.1], [0.05, 0.42, 0.07], d);
        b.box([s * 0.9, 1.3, 1.33], [0.1, 0.36, 1.56], c, { bevel: 0.03 });
        b.box([s * 0.96, 0.98, -1.3], [0.07, 0.12, 1.08], d);
        b.box([s * 0.96, 0.98, 1.3], [0.07, 0.12, 1.08], d);
        wheel(b, [s * 0.88, 0.42, -1.3], 0.42, 0.3);
        wheel(b, [s * 0.88, 0.42, 1.3], 0.42, 0.3);
        b.box([s * 0.7, 0.98, -2.1], [0.34, 0.2, 0.05], '#fff6c9', { em: 0.9 });
        b.box([s * 0.8, 0.98, 2.1], [0.2, 0.3, 0.05], '#e63946', { em: 0.6 });
        b.box([s * 1.02, 1.4, -0.72], [0.16, 0.12, 0.08], d);
        b.box([s * 0.955, 0.86, -0.1], [0.02, 0.05, 0.3], CHROME);
      }
      b.box([0, 1.3, 2.05], [1.9, 0.36, 0.1], c, { bevel: 0.03 });
      b.box([0, 1.14, 1.33], [1.7, 0.04, 1.5], '#3b3d42');
      b.box([0, 1.3, 0.56], [1.8, 0.36, 0.08], c);
      b.box([0, 0.58, -2.14], [1.96, 0.22, 0.14], CHROME, { k: 'shiny' });
      b.box([0, 0.58, 2.14], [1.96, 0.22, 0.14], CHROME, { k: 'shiny' });
      b.box([0, 0.98, -2.1], [1.0, 0.26, 0.04], CH);
      for (let i = 0; i < 3; i++) b.box([0, 0.9 + i * 0.08, -2.12], [0.9, 0.025, 0.02], CHROME);
      b.box([0, 0.98, 0.0], [1.5, 0.3, 0.9], BK, { bevel: 0.05 });
      b.box([-0.4, 1.34, 1.2], [0.6, 0.36, 0.6], WOOD, { k: 'wood' });
      for (let i = 0; i < 4; i++)
        b.sph([0.3 + (i % 2) * 0.26, 1.28, 1.0 + Math.floor(i / 2) * 0.3], 0.14, '#3f9b4b', { w: 6, h: 4 });
    });
    const gl = geo('car-glass', (b) => {
      b.box([0, 1.48, -0.8], [1.64, 0.46, 0.04], '#9fd8ff', { k: 'glass', r: [-0.32, 0, 0] });
      b.box([0, 1.48, 0.5], [1.64, 0.4, 0.04], '#9fd8ff', { k: 'glass' });
      for (const s of [-1, 1]) b.box([s * 0.89, 1.48, -0.12], [0.04, 0.4, 1.14], '#9fd8ff', { k: 'glass' });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
        <Mesh g={gl} m="glass" />
      </Placed>
    );
  },
  Boat: (a) => {
    const c = a.color ?? '#1d7fc7';
    const g = geo(`boat|${c}`, (b) => {
      const L = Math.hypot(0.56, 1.3),
        th = Math.atan2(0.56, 1.3),
        w = '#ffffff',
        wd = shade(WOOD, 0.15);
      b.box([0, 0.07, 0.55], [1.06, 0.14, 2.5], shade(c, -0.25));
      b.box([0, 0.42, 1.78], [1.2, 0.72, 0.09], c);
      b.box([0, 0.8, 1.78], [1.26, 0.06, 0.14], w);
      for (const s of [-1, 1]) {
        b.box([s * 0.56, 0.42, 0.55], [0.09, 0.72, 2.5], c);
        b.box([s * 0.56, 0.8, 0.55], [0.14, 0.06, 2.5], w);
        b.box([s * 0.61, 0.56, 0.55], [0.02, 0.12, 2.5], w);
        b.box([s * 0.28, 0.44, -1.35], [0.09, 0.76, L], c, { r: [0, s * th, 0] });
        b.box([s * 0.28, 0.84, -1.35], [0.14, 0.06, L + 0.06], w, { r: [0, s * th, 0] });
        b.box([s * 0.325, 0.56, -1.37], [0.02, 0.12, L], w, { r: [0, s * th, 0] });
      }
      b.tris(
        [
          [-0.52, 0.14, -0.7],
          [0.52, 0.14, -0.7],
          [0, 0.14, -1.9],
        ],
        shade(c, -0.25),
      );
      b.tris(
        [
          [-0.5, 0.02, -0.7],
          [0, 0.02, -1.9],
          [0.5, 0.02, -0.7],
        ],
        shade(c, -0.3),
      );
      b.tris(
        [
          [-0.3, 0.82, -1.32],
          [0.3, 0.82, -1.32],
          [0, 0.82, -1.98],
        ],
        wd,
        { k: 'wood' },
      );
      b.box([0, 0.56, 0.05], [1.06, 0.06, 0.3], wd, { k: 'wood' });
      b.box([0, 0.56, 1.1], [1.06, 0.06, 0.3], wd, { k: 'wood' });
      b.box([0, 0.86, 1.98], [0.3, 0.38, 0.3], CH, { bevel: 0.06 });
      b.box([0, 1.07, 1.98], [0.32, 0.06, 0.32], '#e63946', { bevel: 0.02 });
      b.box([0, 0.3, 2.02], [0.08, 0.8, 0.08], '#55585e');
      b.box([0, 0.9, 1.7], [0.05, 0.05, 0.4], DARK);
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Cone: (a) => {
    useSolidCyl(a, 0.3, 0.7);
    const c = a.color ?? '#ff7a3d';
    const g = geo(`cone|${c}`, (b) => {
      b.box([0, 0.03, 0], [0.62, 0.06, 0.62], shade(c, -0.25), { bevel: 0.02 });
      const rr = (y: number) => 0.24 - (0.19 * (y - 0.06)) / 0.66;
      b.cyl([0, 0.39, 0], 0.24, 0.66, c, { rt: 0.05, sides: 12 });
      for (const [y0, y1] of [
        [0.24, 0.34],
        [0.44, 0.52],
      ])
        b.cyl([0, (y0 + y1) / 2, 0], rr(y0) + 0.008, y1 - y0, '#ffffff', { rt: rr(y1) + 0.008, sides: 12 });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Barrel: (a) => {
    useSolidCyl(a, 0.45, 1.1);
    const c = a.color ?? '#1d7fc7';
    const g = geo(`barrel|${c}`, (b) => {
      b.cyl([0, 0.55, 0], 0.44, 1.1, c, { sides: 16, k: 'shiny' });
      for (const y of [0.04, 0.38, 0.72, 1.06]) b.cyl([0, y, 0], 0.465, 0.07, shade(c, -0.18), { sides: 16 });
      b.cyl([0, 1.095, 0], 0.4, 0.02, shade(c, -0.3), { sides: 16 });
      b.cyl([0.2, 1.12, 0.1], 0.06, 0.04, '#d9dde2', { sides: 8 });
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Crate: (a) => {
    useSolidBox(a, 1, 1, 1);
    const c = a.color ?? '#b07a45';
    const g = geo(`crate|${c}`, (b) => {
      const l = shade(c, 0.18),
        d = shade(c, -0.12);
      b.box([0, 0.5, 0], [0.92, 0.92, 0.92], d, { k: 'wood' });
      for (const s of [-1, 1])
        for (const t of [-1, 1]) {
          b.box([s * 0.45, 0.5, t * 0.45], [0.1, 1, 0.1], l);
          b.box([0, 0.5 + s * 0.45, t * 0.45], [0.8, 0.1, 0.1], l);
          b.box([s * 0.45, 0.5 + t * 0.45, 0], [0.1, 0.1, 0.8], l);
        }
      for (const s of [-1, 1]) {
        b.box([0, 0.5, s * 0.47], [1.16, 0.09, 0.03], l, { r: [0, 0, (s * PI) / 4] });
        b.box([s * 0.47, 0.5, 0], [0.03, 0.09, 1.16], l, { r: [(s * PI) / 4, 0, 0] });
      }
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  Tire: (a) => {
    useSolidCyl(a, 0.55, 0.35);
    const g = geo('tire', (b) => {
      b.add(torGeo(0.4, 8, 18), [0, 0.18, 0], 0.4, '#1b1b1e', { r: [PI / 2, 0, 0] });
      b.add(torGeo(0.1, 5, 18), [0, 0.33, 0], 0.4, '#3a3a40', { r: [PI / 2, 0, 0] });
      for (let i = 0; i < 14; i++) {
        const an = (i / 14) * PI * 2;
        b.box([Math.cos(an) * 0.548, 0.18, Math.sin(an) * 0.548], [0.03, 0.16, 0.1], '#101012', { r: [0, -an, 0] });
      }
    });
    return (
      <Placed {...a}>
        <Mesh g={g} />
      </Placed>
    );
  },
  SoccerBall: ({ r = 0.32 }) => <mesh geometry={ballGeo(r)} material={vcMat()} castShadow />,
  Goal: ({ w = 5, h = 2.4, ...a }) => {
    const D = 0.9,
      T = 0.4;
    const g = geo(`goal|${w}|${h}`, (b) => {
      const o = { k: 'shiny' as const, sides: 8 },
        c = '#ffffff',
        gr = '#cfd3d6';
      for (const s of [-1, 1]) {
        b.cyl([(s * w) / 2, h / 2, 0], 0.08, h, c, o);
        b.sph([(s * w) / 2, h, 0], 0.08, c, { k: 'shiny', w: 8, h: 6 });
        beam(b, [(s * w) / 2, h, 0], [(s * w) / 2, h, -T], 0.06, gr);
        beam(b, [(s * w) / 2, h, -T], [(s * w) / 2, 0.03, -D], 0.06, gr);
        beam(b, [(s * w) / 2, 0.03, 0], [(s * w) / 2, 0.03, -D], 0.06, gr);
      }
      b.cyl([0, h, 0], 0.08, w, c, { ...o, r: [0, 0, PI / 2] });
      beam(b, [-w / 2, 0.03, -D], [w / 2, 0.03, -D], 0.06, gr);
      beam(b, [-w / 2, h, -T], [w / 2, h, -T], 0.05, gr);
    });
    const net = geo(
      `goalnet|${w}|${h}`,
      (b) => {
        const k = 1 / 0.28,
          x = w / 2,
          sl = Math.hypot(h, D - T),
          q = (p: V3[], uw: number, uh: number) =>
            b.quad(p[0], p[1], p[2], p[3], '#ffffff', { uv: [1, 1] }, [
              [0, 0],
              [uw * k, 0],
              [uw * k, uh * k],
              [0, uh * k],
            ]);
        q(
          [
            [-x, h, -T],
            [x, h, -T],
            [x, h, 0],
            [-x, h, 0],
          ],
          w,
          T,
        );
        q(
          [
            [-x, 0, -D],
            [x, 0, -D],
            [x, h, -T],
            [-x, h, -T],
          ],
          w,
          sl,
        );
        for (const s of [-1, 1]) {
          q(
            [
              [s * x, 0, 0],
              [s * x, 0, -D],
              [s * x, h, -T],
              [s * x, h, 0],
            ],
            D,
            h,
          );
        }
      },
      'uv',
    );
    return (
      <Placed {...a}>
        <Mesh g={g} />
        <mesh geometry={net} material={getNetMat()} />
      </Placed>
    );
  },
  Coin: ({ r = 0.32 }) => {
    const g = geo(`coin|${r}`, (b) => {
      const c = '#ffc93c',
        d = '#d9900f',
        G = { k: 'gold' as const };
      b.cyl([0, 0, 0], r, 0.07, c, { sides: 20, r: [PI / 2, 0, 0], ...G });
      for (const s of [-1, 1]) {
        b.add(torGeo(0.09, 5, 20), [0, 0, s * 0.03], r * 0.9, '#ffe07a', G);
        b.box([-0.16 * r * s, 0.03 * r, s * 0.042], [0.17 * r, 0.8 * r, 0.03], d, G);
        b.box([0.07 * r * s, -0.29 * r, s * 0.042], [0.62 * r, 0.17 * r, 0.03], d, G);
        b.box([-0.16 * r * s, 0.0, s * 0.043], [0.44 * r, 0.07 * r, 0.03], d, { ...G, r: [0, 0, -0.35 * s] });
      }
    });
    return <mesh geometry={g} material={vcMat()} castShadow />;
  },
  Gem: ({ color = '#5cc98e', kind = 'jade' }) =>
    GEM_DEBUG ? (
      [...new Set(Object.values(GEM_KIND))].map((k, i) => (
        <mesh
          key={k}
          position={[(i % 6) * 0.95 - 2.4, Math.floor(i / 6) * 0.95, 0]}
          geometry={gemGeo(Object.keys(GEM_KIND).find((q) => GEM_KIND[q] === k)!, color)}
          material={vcMat()}
          castShadow
        />
      ))
    ) : (
      <mesh geometry={gemGeo(kind, color)} material={vcMat()} castShadow />
    ),
  Macaw: ({ flying, ...a }) => {
    const g = geo('macaw-sit', (b) => {
      b.box([0, 0.37, 0], [0.26, 0.42, 0.28], R, { bevel: 0.09, r: [0.28, 0, 0] });
      macawHead(b, [0, 0.69, 0.08]);
      for (const s of [-1, 1]) {
        b.box([s * 0.15, 0.44, -0.02], [0.05, 0.2, 0.26], R, { r: [0.4, 0, 0], bevel: 0.02 });
        b.box([s * 0.158, 0.32, -0.1], [0.05, 0.17, 0.25], Y, { r: [0.55, 0, 0], bevel: 0.02 });
        b.box([s * 0.15, 0.21, -0.2], [0.05, 0.14, 0.28], BL, { r: [0.75, 0, 0], bevel: 0.02 });
        b.box([s * 0.07, 0.035, 0.05], [0.06, 0.07, 0.14], '#4a4a50', { bevel: 0.02 });
        b.box([s * 0.07, 0.12, 0.02], [0.035, 0.12, 0.035], '#4a4a50');
      }
      b.box([0, 0.15, -0.36], [0.13, 0.05, 0.56], R, { r: [-0.22, 0, 0], bevel: 0.02 });
      b.box([0, 0.08, -0.68], [0.09, 0.04, 0.34], BL, { r: [-0.22, 0, 0], bevel: 0.015 });
    });
    return <Placed {...a}>{flying ? <FlyingMacaw /> : <Mesh g={g} />}</Placed>;
  },
};
