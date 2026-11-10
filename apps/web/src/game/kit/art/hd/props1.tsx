// Utilería HD · naturaleza y objetos pequeños: árboles, palmeras, pinos, arbustos, flores, rocas, cono, barril,
// caja, llanta, balón, moneda, gema y guacamaya.
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Placed } from '../base';
import type { ArtProps } from '../types';
import type { V3 } from '../../../../core/types';
import { Builder, gBlob, gLathe, gSph, gTube, tint, twoSided } from './geo';
import { propMaterial } from './materials';
import { Merged, cached, haloTexture, solidBox, solidCyl } from './pk';
import { rng } from './tex';

const BARK = '#7a5230';
function treeGeo(color: string, seed: number) {
  const v = ((seed % 4) + 4) % 4;
  return cached(`tree|${color}|${v}`, () => {
    const r = rng(v * 131 + 7), b = new Builder(), lx = (r() - 0.5) * 0.7, lz = (r() - 0.5) * 0.5;
    b.add(gTube([[0, -0.05, 0], [lx * 0.1, 0.5, lz * 0.1], [lx * 0.35, 1.5, lz * 0.3], [lx * 0.7, 2.5, lz * 0.6], [lx * 0.85, 3.3, lz * 0.8], [lx * 0.9, 3.9, lz * 0.85]], [0.46, 0.3, 0.25, 0.22, 0.18, 0.1], 10), { k: 'bark', c: BARK, g: [0, 0.8, 0.7] });
    for (let i = 0; i < 4; i++) { const a = i * 1.57 + r(); b.add(gTube([[Math.cos(a) * 0.2, 0.25, Math.sin(a) * 0.2], [Math.cos(a) * 0.45, 0.06, Math.sin(a) * 0.45], [Math.cos(a) * 0.62, -0.06, Math.sin(a) * 0.62]], [0.16, 0.11, 0.05], 6), { k: 'bark', c: BARK, g: [0, 0.8, 0.7] }); }
    for (let i = 0; i < 3; i++) { const a = r() * 6.28, x0 = lx * 0.55, z0 = lz * 0.45, d = 0.9 + r() * 0.5; b.add(gTube([[x0, 2.1 + i * 0.3, z0], [x0 + Math.cos(a) * d * 0.5, 2.7 + i * 0.3, z0 + Math.sin(a) * d * 0.5], [x0 + Math.cos(a) * d, 3.3 + i * 0.25, z0 + Math.sin(a) * d]], [0.13, 0.09, 0.05], 6), { k: 'bark', c: BARK }); }
    const cx = lx * 0.9, cz = lz * 0.85, base = new THREE.Color(color);
    const blobs: [number, number, number, number][] = [[cx, 4.15, cz, 1.72], [cx + 1.05, 3.55, cz + 0.4, 1.2], [cx - 1.1, 3.65, cz - 0.25, 1.25], [cx + 0.15, 3.5, cz - 1.05, 1.15], [cx - 0.25, 3.45, cz + 1.05, 1.12], [cx + 0.25, 5.0, cz + 0.1, 1.0], [cx - 0.6, 4.7, cz + 0.5, 0.85]];
    blobs.forEach(([x, y, z, R], i) => { const jx = (r() - 0.5) * 0.3, jz = (r() - 0.5) * 0.3, k = 0.86 + r() * 0.26 + (y - 3.4) * 0.07; b.add(gBlob(1, v * 10 + i, 0.17, 3), { k: 'leaf', c: base.clone().multiplyScalar(k), g: [y - R, y + R * 0.3, 0.5] }, { p: [x + jx, y, z + jz], s: [R, R * 0.84, R], r: [0, r() * 6, 0] }); });
    return b.build();
  });
}
let frond: THREE.BufferGeometry | null = null;
function frondGeo() {
  if (frond) return frond;
  const n = 8, L = 2.55, W = 0.8, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, x = L * t * (1 - 0.12 * t), y = L * (0.4 * t - 0.62 * t * t), w = W * Math.sin(Math.PI * (0.07 + 0.93 * t)) ** 0.6 * (i === n ? 0.02 : 1), sag = 0.34 * w; for (const k of [-1, 0, 1]) { pos.push(x, y - Math.abs(k) * sag, (k * w) / 2); uv.push(t, k * 0.5 + 0.5); } }
  for (let i = 0; i < n; i++) for (let k = 0; k < 2; k++) { const a = i * 3 + k, b = a + 1, c = a + 3, d = c + 1; idx.push(a, b, d, a, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  frond = twoSided(g); return frond;
}
function palmGeo(color: string, seed: number) {
  const v = ((seed % 4) + 4) % 4;
  return cached(`palm|${color}|${v}`, () => {
    const r = rng(v * 71 + 3), b = new Builder(), lean = 0.5 + r() * 0.7, dir = r() * 6.28, cx = Math.cos(dir), cz = Math.sin(dir), top = 4.75;
    const pts: V3[] = [], rad: number[] = []; for (let i = 0; i <= 9; i++) { const t = i / 9, o = lean * t * t; pts.push([cx * o, top * t - 0.05, cz * o]); rad.push(0.3 - 0.13 * t + (i % 2 ? 0.012 : 0) + (i === 0 ? 0.08 : 0)); }
    b.add(gTube(pts, rad, 9), { k: 'bark', c: '#9c7a4d', g: [0, 1.2, 0.72] });
    const tx = cx * lean, tz = cz * lean, base = new THREE.Color(color);
    b.sph(0.26, { k: 'bark', c: '#6f5a35' }, [tx, top - 0.02, tz], [1, 0.8, 1]);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.283 + r() * 0.3, up = i % 2 ? 0.42 : 0.02, s = 0.85 + r() * 0.25; b.add(frondGeo(), { k: 'leaf', c: base.clone().multiplyScalar(i % 2 ? 1.12 : 0.88), r: 0.6 }, { p: [tx, top, tz], r: [(r() - 0.5) * 0.3, a, up + r() * 0.15], s }); }
    for (let i = 0; i < 3; i++) { const a = i * 2.1 + r(); b.sph(0.15, { c: '#5b3f1f', r: 0.7 }, [tx + Math.cos(a) * 0.2, top - 0.28, tz + Math.sin(a) * 0.2]); }
    return b.build();
  });
}
function pineGeo(color: string, seed: number) {
  const v = ((seed % 3) + 3) % 3;
  return cached(`pine|${color}|${v}`, () => {
    const r = rng(v * 37 + 11), b = new Builder(), base = new THREE.Color(color);
    b.add(gTube([[0, -0.05, 0], [0, 0.6, 0], [0, 2.2, 0], [0, 4.6, 0]], [0.34, 0.24, 0.18, 0.06], 8), { k: 'bark', c: '#6b4a2a', g: [0, 0.7, 0.7] });
    for (let i = 0; i < 5; i++) {
      const R = 1.6 - i * 0.28, h = 1.55 - i * 0.12, y0 = 1.15 + i * 0.84, g = new THREE.ConeGeometry(R, h, 24, 3), P = g.attributes.position;
      for (let j = 0; j < P.count; j++) { const x = P.getX(j), z = P.getZ(j), y = P.getY(j), rad = Math.hypot(x, z); if (rad > R * 0.4 && y < 0) { const a = Math.atan2(z, x), q = rad / R, k = 1 + (0.13 * Math.sin(a * 5 + i * 2 + v) + 0.05 * Math.sin(a * 9 + i)) * q; P.setXYZ(j, x * k, y - 0.2 * q * q, z * k); } }
      g.computeVertexNormals();
      b.add(g, { k: 'leaf', c: base.clone().multiplyScalar(0.8 + i * 0.09), g: [y0 - 0.2, y0 + h * 0.7, 0.55] }, { p: [0, y0 + h / 2, 0], r: [0, i * 0.5, 0] });
    }
    return b.build();
  });
}
function bushGeo(color: string, seed: number) {
  const v = ((seed % 3) + 3) % 3;
  return cached(`bush|${color}|${v}`, () => {
    const r = rng(v * 17 + 5), b = new Builder(), base = new THREE.Color(color);
    for (const [x, y, z, R] of [[0, 0.5, 0, 0.62], [0.42, 0.36, 0.12, 0.42], [-0.4, 0.38, -0.1, 0.45], [0.05, 0.34, 0.42, 0.38], [-0.05, 0.36, -0.4, 0.36]]) b.add(gBlob(1, v * 5 + Math.round(R * 100), 0.18, 2), { k: 'leaf', c: base.clone().multiplyScalar(0.9 + r() * 0.25), g: [0, y + R * 0.4, 0.5] }, { p: [x, y, z], s: [R * 1.1, R * 0.9, R], r: [0, r() * 6, 0] });
    if (v === 1) for (let i = 0; i < 7; i++) { const a = r() * 6.28, e = 0.3 + r() * 0.9; b.sph(0.05, { c: i % 2 ? '#ff7aa8' : '#ffffff' }, [Math.cos(a) * Math.cos(e) * 0.62, 0.42 + Math.sin(e) * 0.52, Math.sin(a) * Math.cos(e) * 0.6], [1, 1, 1], 6, 4); }
    return b.build();
  });
}
function flowersGeo(color: string | undefined, seed: number) {
  const v = ((seed % 3) + 3) % 3;
  return cached(`flowers|${color}|${v}`, () => {
    const r = rng(v * 29 + 3), b = new Builder(), cols = ['#ff5d73', '#ffc93c', '#ffffff', '#ff8fd0', '#ff7a3d'];
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9 + r() * 0.5, d = i === 0 ? 0 : 0.28 + r() * 0.32, x = Math.cos(a) * d, z = Math.sin(a) * d, h = 0.22 + r() * 0.2, c = color ?? cols[(i + v) % cols.length], tx = (r() - 0.5) * 0.3, tz = (r() - 0.5) * 0.3;
      b.cyl(0.012, 0.016, h, { c: '#3d8b3d', r: 0.7 }, [x, h / 2, z], undefined, 5);
      b.group({ p: [x, h, z], r: [tx, r() * 6, tz] }, () => { b.sph(0.045, { c: '#ffd23f' }, [0, 0.02, 0], [1, 0.7, 1], 6, 4); for (let k = 0; k < 5; k++) { const pa = k * 1.2566; b.sph(0.062, { c, r: 0.6 }, [Math.cos(pa) * 0.07, 0.008, Math.sin(pa) * 0.07], [1, 0.32, 0.72], 6, 4, [0, -pa, 0.25]); } });
      b.sph(0.08, { k: 'leaf', c: '#3f9b4b' }, [x + 0.06, 0.05, z + 0.03], [1, 0.25, 0.5], 6, 4, [0, r() * 6, 0.4]);
    }
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = r() * 0.6; b.add(new THREE.ConeGeometry(0.018, 0.2 + r() * 0.14, 4), { c: '#4caf50', r: 0.8 }, { p: [Math.cos(a) * d, 0.1, Math.sin(a) * d], r: [(r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.5] }); }
    return b.build();
  });
}
function rockGeo(color: string, seed: number) {
  const v = ((seed % 4) + 4) % 4;
  return cached(`rock|${color}|${v}`, () => {
    const b = new Builder(), flat = (g: THREE.BufferGeometry) => { const n = g.toNonIndexed(); n.computeVertexNormals(); return n; };
    b.add(flat(gBlob(1, v + 40, 0.3, 1, 1.2)), { k: 'stone', c: color, g: [0, 0.5, 0.6] }, { p: [0, 0.36, 0], s: [0.95, 0.62, 0.82], r: [0, v * 1.3, 0] });
    b.add(flat(gBlob(1, v + 50, 0.3, 1, 1.3)), { k: 'stone', c: tint(color, 0.9), g: [0, 0.3, 0.6] }, { p: [0.62, 0.16, 0.38], s: [0.36, 0.26, 0.32], r: [0, v, 0] });
    b.add(gBlob(1, v + 60, 0.2, 2), { k: 'leaf', c: '#4f9a45' }, { p: [-0.45, 0.02, 0.5], s: [0.3, 0.1, 0.25] });
    return b.build();
  });
}

// --- objetos pequeños
const coneGeo = (color: string) => cached(`cone|${color}`, () => {
  const b = new Builder(), at = (y: number) => 0.255 - (0.215 * (y - 0.06)) / 0.64;
  b.box(0.62, 0.06, 0.62, { c: tint(color, 0.85), r: 0.5 }, [0, 0.03, 0], undefined, 0.02);
  b.add(gLathe([[at(0.06) + 0.02, 0.06], [at(0.3), 0.3]], 16), { c: color, r: 0.45 }); b.add(gLathe([[at(0.3) + 0.004, 0.3], [at(0.46) + 0.004, 0.46]], 16), { c: '#f4f4f4', r: 0.3 });
  b.add(gLathe([[at(0.46), 0.46], [at(0.7), 0.7], [0.02, 0.715], [0.001, 0.715]], 16), { c: color, r: 0.45 });
  return b.build();
});
const barrelGeo = (color: string) => cached(`barrel|${color}`, () => {
  const b = new Builder();
  b.add(gLathe([[0.001, 0], [0.42, 0], [0.44, 0.02], [0.44, 0.33], [0.458, 0.345], [0.458, 0.385], [0.44, 0.4], [0.44, 0.7], [0.458, 0.715], [0.458, 0.755], [0.44, 0.77], [0.44, 1.07], [0.445, 1.1], [0.425, 1.1], [0.42, 1.06], [0.001, 1.06]], 20), { k: 'metal', c: color, m: 0.35, r: 0.5, g: [0, 0.3, 0.75] });
  b.cyl(0.05, 0.05, 0.03, { k: 'metal', c: '#2a2a2a' }, [0.24, 1.075, 0.1], undefined, 8); b.cyl(0.03, 0.03, 0.03, { k: 'metal', c: '#2a2a2a' }, [-0.26, 1.075, -0.08], undefined, 8);
  return b.build();
});
const crateGeo = (color: string) => cached(`crate|${color}`, () => {
  const b = new Builder(), dk = tint(color, 0.72), lt = tint(color, 1.12);
  b.box(0.9, 0.9, 0.9, { k: 'wood', c: color }, [0, 0.5, 0], undefined, 0.01);
  for (const y of [0.06, 0.94]) for (const s of [-1, 1]) { b.box(1, 0.12, 0.1, { k: 'wood', c: lt }, [0, y, s * 0.45], undefined, 0.015); b.box(0.1, 0.12, 0.82, { k: 'wood', c: lt }, [s * 0.45, y, 0], undefined, 0.015); }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.11, 0.78, 0.11, { k: 'wood', c: lt }, [sx * 0.447, 0.5, sz * 0.447], undefined, 0.015);
  for (let i = 0; i < 4; i++) b.group({ r: [0, (i * Math.PI) / 2, 0] }, () => b.box(1.08, 0.09, 0.04, { k: 'wood', c: dk }, [0, 0.5, 0.462], [0, 0, 0.78], 0.01));
  for (const x of [-0.27, 0, 0.27]) b.box(0.2, 0.03, 0.82, { k: 'wood', c: dk }, [x, 0.985, 0], undefined, 0.01);
  return b.build();
});
const tireGeo = () => cached('tire', () => {
  const b = new Builder();
  b.add(new THREE.TorusGeometry(0.4, 0.165, 10, 26), { k: 'asphalt', c: '#26262a', r: 0.85 }, { p: [0, 0.175, 0], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 22; i++) { const a = (i / 22) * 6.283; b.box(0.07, 0.2, 0.045, { c: '#1a1a1d', r: 0.9 }, [Math.cos(a) * 0.555, 0.175, Math.sin(a) * 0.555], [0, -a + 0.35, 0], 0); }
  b.add(new THREE.TorusGeometry(0.27, 0.03, 6, 22), { c: '#3a3a40', r: 0.6 }, { p: [0, 0.29, 0], r: [Math.PI / 2, 0, 0] });
  return b.build();
});

let ballTex: THREE.CanvasTexture | null = null;
function ballTexture() {
  if (ballTex) return ballTex;
  const W = 512, H = 256, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d')!, img = c.createImageData(W, H), t = (1 + Math.sqrt(5)) / 2;
  const vs: V3[] = []; for (const a of [-1, 1]) for (const b of [-t, t]) { vs.push([0, a, b], [a, b, 0], [b, 0, a]); }
  const nv = vs.map(v => { const l = Math.hypot(...v); return [v[0] / l, v[1] / l, v[2] / l] as V3; }), fs: V3[] = [];
  for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) for (let k = j + 1; k < 12; k++) { const d = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; if (d(nv[i], nv[j]) > 0.4 && d(nv[j], nv[k]) > 0.4 && d(nv[i], nv[k]) > 0.4) { const s: V3 = [nv[i][0] + nv[j][0] + nv[k][0], nv[i][1] + nv[j][1] + nv[k][1], nv[i][2] + nv[j][2] + nv[k][2]], l = Math.hypot(...s); fs.push([s[0] / l, s[1] / l, s[2] / l]); } }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ph = (x / W) * Math.PI * 2, th = (y / H) * Math.PI, dx = -Math.cos(ph) * Math.sin(th), dy = Math.cos(th), dz = Math.sin(ph) * Math.sin(th);
    let b1 = 9, b2 = 9, pent = false;
    for (const v of nv) { const a = Math.acos(Math.min(1, dx * v[0] + dy * v[1] + dz * v[2])) / 0.36; if (a < b1) { b2 = b1; b1 = a; pent = true; } else if (a < b2) b2 = a; }
    for (const v of fs) { const a = Math.acos(Math.min(1, dx * v[0] + dy * v[1] + dz * v[2])) / 0.43; if (a < b1) { b2 = b1; b1 = a; pent = false; } else if (a < b2) b2 = a; }
    const seam = b2 - b1 < 0.05, o = (y * W + x) * 4, col = seam ? 70 : pent ? 28 : 246; img.data[o] = col; img.data[o + 1] = col; img.data[o + 2] = seam ? 76 : pent ? 32 : 246; img.data[o + 3] = 255;
  }
  c.putImageData(img, 0, 0); ballTex = new THREE.CanvasTexture(cv); ballTex.colorSpace = THREE.SRGBColorSpace; ballTex.anisotropy = 4; return ballTex;
}
let ballMat: THREE.Material | null = null;
function coinStuff() {
  return cached('coin', () => {
    const g = new THREE.CylinderGeometry(1, 1, 0.22, 30), U = g.attributes.uv, N = g.attributes.normal;
    const P = g.attributes.position;
    for (let i = 0; i < U.count; i++) { const ny = N.getY(i); if (Math.abs(ny) < 0.5) U.setXY(i, 0.03, 0.03); else U.setXY(i, 0.5 + P.getX(i) * 0.5 * Math.sign(ny), 0.5 - P.getZ(i) * 0.5); }
    return g;
  });
}
let coinMat: THREE.Material | null = null;
function coinMaterial() {
  if (coinMat) return coinMat;
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d')!;
  c.fillStyle = '#f2b530'; c.fillRect(0, 0, S, S); let g = c.createRadialGradient(100, 90, 10, 128, 128, 128); g.addColorStop(0, '#ffe58a'); g.addColorStop(0.7, '#f5bd35'); g.addColorStop(1, '#d99a1c'); c.fillStyle = g; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill();
  c.strokeStyle = '#b97a10'; c.lineWidth = 9; c.beginPath(); c.arc(128, 128, 106, 0, 7); c.stroke(); c.strokeStyle = '#fff0b0'; c.lineWidth = 3; c.beginPath(); c.arc(128, 128, 99, 0, 7); c.stroke();
  c.fillStyle = '#b97a10'; for (let i = 0; i < 20; i++) { const a = (i / 20) * 6.283; c.beginPath(); c.arc(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116, 3.2, 0, 7); c.fill(); }
  c.font = '900 150px "Fredoka", "Arial Black", system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#a86a08'; c.fillText('L', 132, 140); c.fillStyle = '#fff3c0'; c.fillText('L', 124, 132); c.fillStyle = '#e8a520'; c.fillText('L', 128, 136);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  coinMat = new THREE.MeshStandardMaterial({ map: t, metalness: 0.9, roughness: 0.3, emissive: '#b86a00', emissiveIntensity: 0.4, emissiveMap: t }); return coinMat;
}
const gemMats = new Map<string, THREE.MeshStandardMaterial>();
function gemMaterial(color: string, flat: boolean) { const k = color + flat; let m = gemMats.get(k); if (!m) { m = new THREE.MeshStandardMaterial({ color, roughness: 0.16, metalness: 0.15, flatShading: flat, emissive: color, emissiveIntensity: 0.45, envMapIntensity: 1.6 }); gemMats.set(k, m); } return m; }
const haloMats = new Map<string, THREE.SpriteMaterial>();
function haloMaterial(color: string, opacity = 0.7) { const k = color + opacity; let m = haloMats.get(k); if (!m) { m = new THREE.SpriteMaterial({ map: haloTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false }); haloMats.set(k, m); } return m; }
function gemGeo(kind: string) {
  return cached('gem|' + kind, () => {
    if (kind === 'jade') { // figura de jade: cabeza maya estilizada tallada en una piedra pulida
      const b = new Builder(), j = { c: '#ffffff' };
      b.add(gBlob(1, 3, 0.06, 2), j, { s: [0.27, 0.36, 0.2] }); b.box(0.42, 0.1, 0.2, j, [0, 0.3, 0], undefined, 0.04); b.box(0.3, 0.09, 0.18, j, [0, 0.4, 0], undefined, 0.04); b.box(0.16, 0.08, 0.16, j, [0, 0.49, 0], undefined, 0.03);
      for (const s of [-1, 1]) { b.sph(0.07, j, [s * 0.27, 0.02, 0], [0.6, 1.3, 0.8]); b.sph(0.05, j, [s * 0.1, 0.07, 0.17], [1.3, 0.7, 0.6]); }
      b.sph(0.06, j, [0, -0.03, 0.19], [0.8, 1.5, 0.8]); b.box(0.16, 0.035, 0.05, j, [0, -0.17, 0.16], undefined, 0.015);
      return b.build();
    }
    if (kind === 'concha') { // caracol: espiral cónica con labio
      const b = new Builder(), c = { c: '#ffffff' }; let y = -0.3, R = 0.3;
      for (let i = 0; i < 6; i++) { b.sph(R, c, [0, y, 0], [1, 0.62, 1], 14, 8); y += R * 0.62; R *= 0.7; }
      b.add(new THREE.ConeGeometry(0.05, 0.14, 8), c, { p: [0, y + 0.02, 0] }); b.sph(0.2, c, [0.2, -0.26, 0.08], [1.1, 0.5, 0.7], 12, 8, [0, 0, 0.5]);
      for (let i = 0; i < 7; i++) { const a = (i / 7) * 6.283; b.add(new THREE.ConeGeometry(0.045, 0.14, 6), c, { p: [Math.cos(a) * 0.28, -0.2, Math.sin(a) * 0.28], r: [Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1] }); }
      return b.build();
    }
    // gema tallada: corona y pabellón de 8 lados
    const g = new THREE.LatheGeometry([[0.001, -0.42], [0.34, 0.06], [0.34, 0.1], [0.2, 0.26], [0.001, 0.26]].map(p => new THREE.Vector2(p[0], p[1])), 8).toNonIndexed(); g.computeVertexNormals(); return g;
  });
}

function Macaw({ flying, ...a }: Parameters<ArtProps['Macaw']>[0]) {
  const root = useRef<THREE.Group>(null), wl = useRef<THREE.Mesh>(null), wr = useRef<THREE.Mesh>(null), body = useRef<THREE.Group>(null), ph = useMemo(() => Math.random() * 6, []);
  const [bodyG, wingG] = useMemo(() => {
    const bg = cached('macaw-body', () => {
      const b = new Builder(), red = { c: '#e02b2b', r: 0.55 }, f = { r: 0.5 };
      b.sph(0.2, red, [0, 0.36, 0], [0.82, 1.25, 0.92], 14, 10, [0.35, 0, 0]); b.sph(0.135, red, [0, 0.64, 0.07], [1, 1, 1.05], 14, 10);
      for (const s of [-1, 1]) { b.sph(0.075, { c: '#f8f4ec', ...f }, [s * 0.085, 0.645, 0.13], [0.55, 1, 0.9]); b.sph(0.02, { c: '#16161a', r: 0.2 }, [s * 0.125, 0.66, 0.15]); }
      b.sph(0.06, { c: '#f1e7d0', r: 0.35 }, [0, 0.635, 0.2], [0.75, 0.9, 1.1]); b.add(new THREE.ConeGeometry(0.05, 0.13, 8), { c: '#e9dcc0', r: 0.35 }, { p: [0, 0.585, 0.245], r: [2.5, 0, 0] }); b.sph(0.04, { c: '#1c1c20', r: 0.4 }, [0, 0.575, 0.185], [0.8, 0.6, 1]);
      for (const [dx, col, len] of [[0, '#e02b2b', 0.62], [-0.035, '#1d6fd0', 0.5], [0.035, '#1d6fd0', 0.5]] as [number, string, number][]) b.sph(1, { c: col, ...f }, [dx, 0.2 - len * 0.36, -0.12 - len * 0.3], [0.035, len * 0.5, 0.014], 8, 6, [0.72, 0, 0]);
      for (const s of [-1, 1]) { b.cyl(0.012, 0.012, 0.12, { c: '#3a3a3e' }, [s * 0.06, 0.1, 0.03], undefined, 5); b.sph(0.03, { c: '#3a3a3e' }, [s * 0.06, 0.03, 0.05], [1, 0.5, 1.7], 6, 4); }
      return b.build();
    });
    const wg = cached('macaw-wing', () => { // ala derecha (+X) extendida, bisagra en el origen
      const b = new Builder();
      b.sph(1, { c: '#e02b2b', r: 0.55 }, [0.14, 0, 0], [0.16, 0.022, 0.12], 10, 6); b.sph(1, { c: '#ffc928', r: 0.55 }, [0.3, -0.004, -0.02], [0.17, 0.02, 0.13], 10, 6); b.sph(1, { c: '#1d6fd0', r: 0.55 }, [0.47, -0.008, -0.05], [0.19, 0.018, 0.12], 10, 6);
      for (let i = 0; i < 4; i++) b.sph(1, { c: '#1a57b0', r: 0.55 }, [0.5 + i * 0.045, -0.01, -0.12 - i * 0.012], [0.035, 0.01, 0.16 - i * 0.02], 6, 4, [0, -0.25 - i * 0.12, 0]);
      return b.build();
    });
    return [bg, wg];
  }, []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + ph, g = root.current, bd = body.current; if (!g || !bd || !wl.current || !wr.current) return;
    if (flying) {
      const w = t * 0.9, R = 2.6; g.position.set(Math.cos(w) * R, 0.6 + Math.sin(t * 1.7) * 0.25, -Math.sin(w) * R); g.rotation.set(0, w + Math.PI, 0);
      const fl = Math.sin(t * 11); bd.rotation.set(1.2, 0, 0); bd.position.set(0, -0.3 + fl * -0.03, 0); bd.rotation.z = 0.3;
      wr.current.rotation.set(0, 0, fl * 0.75 + 0.1); wl.current.rotation.set(0, 0, -(fl * 0.75 + 0.1));
    } else {
      g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); bd.position.set(0, 0, 0); bd.rotation.set(Math.sin(t * 1.3) * 0.03, Math.sin(t * 0.5) * 0.3, 0);
      const r = Math.max(0, Math.sin(t * 0.7) - 0.93) * 4; wr.current.rotation.set(-0.5, 1.25 - r, -1.15 + r); wl.current.rotation.set(-0.5, -1.25 + r, 1.15 - r);
    }
  });
  return <Placed {...a}><group ref={root}><group ref={body}>
    <Merged g={bodyG} />
    <mesh ref={wr} geometry={wingG} material={propMaterial(true)} position={[0.12, 0.47, 0]} castShadow />
    <mesh ref={wl} geometry={wingG} material={propMaterial(true)} position={[-0.12, 0.47, 0]} scale={[-1, 1, 1]} castShadow />
  </group></group></Placed>;
}

export const props1: Pick<ArtProps, 'Tree' | 'Palm' | 'Pine' | 'Bush' | 'Flowers' | 'Rock' | 'Cone' | 'Barrel' | 'Crate' | 'Tire' | 'SoccerBall' | 'Coin' | 'Gem' | 'Macaw'> = {
  Tree: a => { solidCyl(a, 0.35, 3); return <Placed {...a}><Merged g={treeGeo(a.color ?? '#4a9e48', a.seed ?? Math.round(a.pos[0] * 3 + a.pos[2] * 7))} /></Placed>; },
  Palm: a => { solidCyl(a, 0.25, 4); return <Placed {...a}><Merged g={palmGeo(a.color ?? '#3a9a45', a.seed ?? Math.round(a.pos[0] * 5 + a.pos[2] * 3))} /></Placed>; },
  Pine: a => { solidCyl(a, 0.3, 3); return <Placed {...a}><Merged g={pineGeo(a.color ?? '#2f7040', a.seed ?? Math.round(a.pos[0] + a.pos[2]))} /></Placed>; },
  Bush: a => <Placed {...a}><Merged g={bushGeo(a.color ?? '#3f9b4b', a.seed ?? Math.round(a.pos[0] * 2 + a.pos[2]))} /></Placed>,
  Flowers: a => <Placed {...a}><Merged g={flowersGeo(a.color, a.seed ?? Math.round(a.pos[0] + a.pos[2] * 2))} /></Placed>,
  Rock: a => { solidCyl(a, 0.7, 0.9); return <Placed {...a}><Merged g={rockGeo(a.color ?? '#8a8f96', a.seed ?? Math.round(a.pos[0] * 3 + a.pos[2]))} /></Placed>; },
  Cone: a => { solidCyl(a, 0.3, 0.7); return <Placed {...a}><Merged g={coneGeo(a.color ?? '#ff7a3d')} /></Placed>; },
  Barrel: a => { solidCyl(a, 0.45, 1.1); return <Placed {...a}><Merged g={barrelGeo(a.color ?? '#1d7fc7')} /></Placed>; },
  Crate: a => { solidBox(a, 1, 1, 1); return <Placed {...a}><Merged g={crateGeo(a.color ?? '#b07a45')} /></Placed>; },
  Tire: a => { solidCyl(a, 0.55, 0.35); return <Placed {...a}><Merged g={tireGeo()} /></Placed>; },
  SoccerBall: ({ r = 0.32 }) => <mesh castShadow scale={r} geometry={gSph(1, 24, 16)} material={(ballMat ??= new THREE.MeshStandardMaterial({ map: ballTexture(), roughness: 0.42 }))} />,
  Coin: ({ r = 0.32 }) => <mesh rotation-x={Math.PI / 2} scale={[r, r * 0.85, r]} castShadow geometry={coinStuff()} material={coinMaterial()} />,
  Gem: ({ color = '#5cc98e', kind }) => {
    const k = kind === 'jade' || kind === 'copan' ? 'jade' : kind === 'concha' || kind === 'islas' || kind === 'valle' ? 'concha' : 'gema', col = k === 'jade' && color === '#5cc98e' ? '#2fbf7f' : color;
    return <group><mesh castShadow geometry={gemGeo(k)} material={gemMaterial(k === 'concha' ? tint(col, 0.45, '#fff1e0').getStyle() : col, k === 'gema')} /><sprite scale={[1.5, 1.5, 1]} material={haloMaterial(col, 0.55)} /></group>;
  },
  Macaw,
};
