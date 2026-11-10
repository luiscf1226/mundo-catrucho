// Utilería HD · pueblo: casa colonial, farol, banca, cerca, bandera, puesto de mercado, kiosko, fuente, estatua,
// rótulo, arco de portal y portería. Cada pieza es una malla fusionada (más alguna malla animada o de texto).
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Placed } from '../base';
import { textTexture } from '../../core';
import type { ArtProps } from '../types';
import type { V3 } from '../../../../core/types';
import { Builder, gLathe, gTube, tint, type Paint } from './geo';
import { G, hdMaterial } from './materials';
import { Merged, TextPlane, cached, haloTexture, solidBox, solidCyl } from './pk';
import { rng } from './tex';

const asp = (t: THREE.Texture) => (t as any).aspect as number;
const WOOD = '#7a4b28', IRON: Paint = { k: 'metal', c: '#22252a', m: 0.6, r: 0.5 }, TRIM = '#f6f1e6';
const hash = (s: string) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

/** cuadrilátero a-b-c-d (antihorario visto desde afuera) con UV en unidades de teja */
function roofQuad(b: Builder, paint: Paint, a: V3, bb: V3, c: V3, d: V3) {
  const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...bb), C = new THREE.Vector3(...c), D = new THREE.Vector3(...d);
  const e = Bv.clone().sub(A), len = e.length(); e.normalize(); const n = e.clone().cross(D.clone().sub(A)).normalize(), up = n.clone().cross(e).normalize();
  const g = new THREE.BufferGeometry(), P = [A, Bv, C, D], S = 1 / 1.6;
  g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap(p => [p.x, p.y, p.z]), 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(P.flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(P.flatMap(p => { const q = p.clone().sub(A); return [(q.dot(e) - len / 2) * S, q.dot(up) * S]; }), 2)); g.setIndex(C.distanceTo(D) < 1e-4 ? [0, 1, 2] : [0, 1, 2, 0, 2, 3]);
  b.add(g, paint);
}

function houseGeo(w: number, d: number, floors: number, color: string, roofColor: string, signW: number) {
  return cached(`house|${w}|${d}|${floors}|${color}|${roofColor}|${signW.toFixed(2)}`, () => {
    const b = new Builder(), h = 3 * floors, hz = d / 2, hx = w / 2, hs = hash(color + roofColor), wall: Paint = { k: 'stucco', c: color };
    const shut = ['#2f6b57', '#2f5f8a', '#8a3b2e', '#6b4a2a', '#3d6b4f'][hs % 5], plinth = tint(color, 0.55, '#7a3b2a').getStyle(), wood: Paint = { k: 'wood', c: WOOD }, trim: Paint = { k: 'stucco', c: TRIM };
    const glass: Paint = { c: '#27425a', r: 0.12, e: 1.1 };
    b.box(w, h, d, { ...wall, g: [0, 1.2, 0.86] }, [0, h / 2, 0], undefined, 0.06); b.box(w + 0.1, 0.72, d + 0.1, { k: 'stucco', c: plinth }, [0, 0.36, 0], undefined, 0.05);
    b.box(w + 0.14, 0.2, d + 0.14, trim, [0, h - 0.14, 0], undefined, 0.03); if (floors > 1) b.box(w + 0.08, 0.12, d + 0.08, trim, [0, 3, 0], undefined, 0.03);
    // techo a cuatro aguas con alero
    const e = 0.55, X = hx + e, Z = hz + e, y0 = h + 0.02, top = h + 1.45, rx = Math.max(0, X - Z), rz = Math.max(0, Z - X), roof: Paint = { k: 'roof', c: roofColor, uv: true };
    const FL: V3 = [-rx, top, rz], FR: V3 = [rx, top, rz], BR: V3 = [rx, top, -rz], BL: V3 = [-rx, top, -rz], a: V3 = [-X, y0, Z], bb: V3 = [X, y0, Z], c: V3 = [X, y0, -Z], dd: V3 = [-X, y0, -Z];
    roofQuad(b, roof, a, bb, FR, FL); roofQuad(b, roof, bb, c, BR, FR); roofQuad(b, roof, c, dd, BL, BR); roofQuad(b, roof, dd, a, FL, BL);
    b.box(2 * X - 0.04, 0.09, 2 * Z - 0.04, { k: 'wood', c: '#5a3a22' }, [0, h - 0.02, 0], undefined, 0.02);
    const cap: Paint = { k: 'roof', c: tint(roofColor, 0.85), r: 0.7 };
    if (rx + rz > 0.05) b.add(gTube([FL[0] === FR[0] ? BL : FL, FR], 0.11, 7), cap);
    for (const [p, q] of [[a, FL], [bb, FR], [c, BR], [dd, BL]] as [V3, V3][]) b.add(gTube([p, q], 0.09, 6), cap);
    for (let i = 0; i < Math.round(w / 0.7); i++) { const x = -hx + 0.35 + i * ((w - 0.7) / Math.max(1, Math.round(w / 0.7) - 1)); for (const s of [-1, 1]) b.box(0.1, 0.12, 0.5, wood, [x, h - 0.12, s * (hz + 0.28)], undefined, 0); }
    // puerta
    const zf = hz;
    b.box(1.4, 2.36, 0.14, trim, [0, 1.18, zf], undefined, 0.03); b.box(1.12, 2.14, 0.1, { k: 'wood', c: '#6b3f22' }, [0, 1.07, zf + 0.05], undefined, 0.02);
    for (const x of [-0.27, 0.27]) for (const [y, hh] of [[0.62, 0.8], [1.56, 0.8]]) b.box(0.42, hh, 0.04, { k: 'wood', c: '#7d4b29' }, [x, y, zf + 0.1], undefined, 0.02);
    b.sph(0.045, { k: 'gold', c: '#e8c458' }, [0.4, 1.05, zf + 0.14]); b.box(1.7, 0.14, 0.55, { k: 'stone', c: '#b9b2a6' }, [0, 0.07, zf + 0.3], undefined, 0.04);
    b.box(0.16, 0.24, 0.14, { c: '#fff0c0', r: 0.3, e: 2.4 }, [0.95, 2.1, zf + 0.12], undefined, 0.03); b.box(0.2, 0.05, 0.18, IRON, [0.95, 2.24, zf + 0.12], undefined, 0); b.box(0.04, 0.04, 0.12, IRON, [0.95, 2.2, zf + 0.04], undefined, 0);
    // ventanas
    const win = (x: number, y: number, ry: number, full: boolean, grille: boolean) => {
      const zz = ry === 0 || ry === Math.PI ? hz : hx;
      b.group({ p: [0, 0, 0], r: [0, ry, 0] }, () => b.group({ p: [x, y, zz] }, () => {
        b.box(1.18, 1.28, 0.12, trim, [0, 0, 0], undefined, 0.03); b.box(0.94, 1.04, 0.06, glass, [0, 0, 0.05], undefined, 0); b.box(0.05, 1.04, 0.03, trim, [0, 0, 0.085], undefined, 0); b.box(0.94, 0.05, 0.03, trim, [0, 0.1, 0.085], undefined, 0);
        b.box(1.34, 0.09, 0.24, { k: 'stone', c: '#cfc8ba' }, [0, -0.68, 0.06], undefined, 0.02);
        if (full) for (const s of [-1, 1]) { b.box(0.44, 1.08, 0.05, { k: 'wood', c: shut }, [s * 0.8, 0, 0.1], [0, -s * 0.22, 0], 0.015); for (let i = 0; i < 5; i++) b.box(0.36, 0.03, 0.02, { k: 'wood', c: tint(shut, 0.75) }, [s * 0.8, -0.4 + i * 0.2, 0.135], [0, -s * 0.22, 0], 0); }
        if (grille) { for (let i = 0; i < 6; i++) b.box(0.03, 1.1, 0.03, IRON, [-0.4 + i * 0.16, 0, 0.2], undefined, 0); for (const yy of [-0.5, 0, 0.5]) b.box(0.98, 0.03, 0.03, IRON, [0, yy, 0.2], undefined, 0); for (const s of [-1, 1]) for (const yy of [-0.5, 0.5]) b.box(0.03, 0.03, 0.16, IRON, [s * 0.46, yy, 0.13], undefined, 0); }
        else if (full) { b.box(0.9, 0.16, 0.2, { k: 'roof', c: '#b5623b' }, [0, -0.78, 0.2], undefined, 0.03); for (let i = 0; i < 4; i++) { b.sph(0.085, { c: ['#ff5d73', '#ffc93c', '#ff8fd0', '#ffffff'][(i + hs) % 4] }, [-0.3 + i * 0.2, -0.62, 0.2], [1, 0.8, 1], 6, 4); b.sph(0.1, { k: 'leaf', c: '#3f9b4b' }, [-0.2 + i * 0.16, -0.68, 0.23], [1, 0.6, 1], 6, 4); } }
      }));
    };
    const fx = w * 0.3, fullF = w >= 5.6;
    for (const s of [-1, 1]) { win(s * fx, 1.7, 0, fullF, true); if (floors > 1) win(s * fx, 4.7, 0, fullF, false); }
    for (let f = 0; f < floors; f++) { const y = 1.7 + f * 3; for (const ry of [Math.PI / 2, -Math.PI / 2]) win(0, y, ry, d >= 4.6, false); win(-w * 0.25, y, Math.PI, false, false); win(w * 0.25, y, Math.PI, false, false); }
    // balcón del segundo piso
    if (floors > 1) {
      const bw = Math.min(w * 0.42, 2.6);
      b.box(bw, 0.14, 1.0, { k: 'stone', c: '#d8d0c0' }, [0, 3.0, zf + 0.5], undefined, 0.03); for (const x of [-bw / 2 + 0.2, 0, bw / 2 - 0.2]) b.box(0.12, 0.3, 0.8, wood, [x, 2.82, zf + 0.38], [0.3, 0, 0], 0);
      b.box(1.1, 2.1, 0.1, trim, [0, 4.12, zf], undefined, 0.03); b.box(0.9, 1.9, 0.06, glass, [0, 4.1, zf + 0.04], undefined, 0); b.box(0.05, 1.9, 0.03, trim, [0, 4.1, zf + 0.08], undefined, 0);
      const rail = (x0: number, z0: number, x1: number, z1: number) => { const n = Math.max(2, Math.round(Math.hypot(x1 - x0, z1 - z0) / 0.16)); for (let i = 0; i <= n; i++) b.box(0.03, 0.82, 0.03, IRON, [x0 + ((x1 - x0) * i) / n, 3.48, z0 + ((z1 - z0) * i) / n], undefined, 0); b.add(gTube([[x0, 3.9, z0], [x1, 3.9, z1]], 0.03, 5), IRON); b.add(gTube([[x0, 3.14, z0], [x1, 3.14, z1]], 0.02, 5), IRON); };
      rail(-bw / 2 + 0.04, zf + 0.96, bw / 2 - 0.04, zf + 0.96); rail(-bw / 2 + 0.04, zf + 0.06, -bw / 2 + 0.04, zf + 0.96); rail(bw / 2 - 0.04, zf + 0.06, bw / 2 - 0.04, zf + 0.96);
    }
    if (signW > 0) b.box(signW + 0.16, 0.64, 0.07, { k: 'wood', c: '#4a2d18' }, [0, 2.68, zf + 0.06], undefined, 0.02);
    return b.build();
  });
}

// --- farol: de noche se enciende (vidrio emisivo + halo + charco de luz en el suelo)
const lampGeo = () => cached('lamp', () => {
  const b = new Builder();
  b.add(gLathe([[0.001, 0], [0.22, 0], [0.22, 0.07], [0.15, 0.12], [0.11, 0.3], [0.075, 0.5], [0.06, 0.62], [0.085, 0.66], [0.06, 0.7], [0.052, 2.7], [0.09, 2.76], [0.05, 2.82], [0.13, 2.9], [0.16, 2.94], [0.001, 2.94]], 12), IRON);
  b.box(0.3, 0.38, 0.3, { c: '#fff3cc', r: 0.25, e: 3.2 }, [0, 3.13, 0], undefined, 0.02);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(0.03, 0.4, 0.03, IRON, [sx * 0.155, 3.13, sz * 0.155], undefined, 0);
  b.add(new THREE.ConeGeometry(0.27, 0.2, 4), IRON, { p: [0, 3.43, 0], r: [0, Math.PI / 4, 0] }); b.sph(0.045, IRON, [0, 3.56, 0]);
  for (const s of [-1, 1]) b.add(gTube([[0, 2.55, 0], [s * 0.2, 2.62, 0], [s * 0.3, 2.52, 0], [s * 0.24, 2.44, 0]], 0.018, 5), IRON);
  return b.build();
});
let glowMats: { halo: THREE.SpriteMaterial; pool: THREE.MeshBasicMaterial; geo: THREE.PlaneGeometry } | null = null;
function lampGlow() {
  if (!glowMats) glowMats = { halo: new THREE.SpriteMaterial({ map: haloTexture(), color: '#ffc874', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), pool: new THREE.MeshBasicMaterial({ map: haloTexture(), color: '#ffb056', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }), geo: new THREE.PlaneGeometry(1, 1) };
  return glowMats;
}
function Lamp(a: Parameters<ArtProps['Lamp']>[0]) {
  solidCyl(a, 0.12, 3); const g = useRef<THREE.Group>(null), gl = lampGlow();
  useFrame(() => { const n = G.uNight.value; if (g.current) g.current.visible = n > 0.03; gl.halo.opacity = n * 0.85; gl.pool.opacity = n * 0.42; });
  return <Placed {...a}><Merged g={lampGeo()} />
    <group ref={g} visible={false}><sprite position={[0, 3.13, 0]} scale={[2.6, 2.6, 1]} material={gl.halo} /><mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2} scale={[10, 10, 1]} geometry={gl.geo} material={gl.pool} /></group>
  </Placed>;
}

const benchGeo = (color: string) => cached('bench|' + color, () => {
  const b = new Builder(), wd: Paint = { k: 'wood', c: color };
  for (let i = 0; i < 4; i++) b.box(1.72, 0.045, 0.115, wd, [0, 0.47, -0.2 + i * 0.135], undefined, 0.015);
  for (let i = 0; i < 3; i++) b.box(1.72, 0.115, 0.04, wd, [0, 0.64 + i * 0.145, -0.285 - i * 0.022], [-0.15, 0, 0], 0.015);
  for (const s of [-1, 1]) {
    const x = s * 0.8;
    b.add(gTube([[x, 0, 0.24], [x, 0.3, 0.26], [x, 0.44, 0.22], [x, 0.44, -0.26]], 0.03, 6), IRON); b.add(gTube([[x, 0, -0.3], [x, 0.44, -0.27], [x, 0.98, -0.36]], 0.03, 6), IRON);
    b.add(gTube([[x, 0.72, -0.31], [x, 0.7, 0.1], [x, 0.66, 0.26], [x, 0.54, 0.3], [x, 0.46, 0.24]], 0.026, 6), IRON); b.sph(0.045, IRON, [x, 1.0, -0.365]);
  }
  return b.build();
});
const fenceGeo = (length: number, color: string) => cached(`fence|${length}|${color}`, () => {
  const b = new Builder(), wd: Paint = { k: 'wood', c: color, r: 0.6 }, n = Math.max(1, Math.round(length)), np = Math.max(2, Math.round(length / 0.21));
  for (let i = 0; i <= n; i++) { const x = -length / 2 + i * (length / n); b.box(0.12, 0.98, 0.12, wd, [x, 0.49, 0], undefined, 0.02); b.add(new THREE.ConeGeometry(0.095, 0.1, 4), wd, { p: [x, 1.03, 0], r: [0, Math.PI / 4, 0] }); }
  for (const y of [0.36, 0.72]) b.box(length, 0.09, 0.045, wd, [0, y, -0.02], undefined, 0.01);
  for (let i = 0; i < np; i++) { const x = -length / 2 + (i + 0.5) * (length / np); b.box(0.095, 0.78, 0.028, wd, [x, 0.45, 0.02], undefined, 0); b.add(new THREE.ConeGeometry(0.067, 0.09, 4), wd, { p: [x, 0.885, 0.02], r: [0, Math.PI / 4, 0], s: [1, 1, 0.3] }); }
  return b.build();
});

// --- bandera de Honduras ondeando (el viento lo hace el sombreador de vértices)
let flagStuff: { geo: THREE.PlaneGeometry; mat: THREE.MeshStandardMaterial } | null = null;
function flagParts() {
  if (flagStuff) return flagStuff;
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const c = cv.getContext('2d')!;
  c.fillStyle = '#00bce4'; c.fillRect(0, 0, 512, 256); c.fillStyle = '#ffffff'; c.fillRect(0, 85, 512, 86); c.fillStyle = '#00bce4';
  const star = (x: number, y: number) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? 5.4 : 13; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.fill(); };
  star(256, 128); star(200, 106); star(200, 150); star(312, 106); star(312, 150);
  const g = c.createLinearGradient(0, 0, 40, 0); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 40, 256);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const mat = new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide, roughness: 0.75 });
  mat.onBeforeCompile = sh => {
    sh.uniforms.uTime = G.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <beginnormal_vertex>', 'float fa = position.x + 1.0; float fph = fa * 3.0 - uTime * 5.5 + position.y * 1.3;\nvec3 objectNormal = normalize( vec3( - ( cos( fph ) * 0.33 + cos( fph * 1.7 + 1.0 ) * 0.12 ) * fa, 0.0, 1.0 ) );')
      .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position.x, position.y + sin( fph * 0.5 ) * 0.035 * fa - 0.035 * fa * fa, ( sin( fph ) * 0.11 + sin( fph * 1.7 + 1.0 ) * 0.035 ) * fa );');
  };
  mat.customProgramCacheKey = () => 'hd-flag';
  flagStuff = { geo: new THREE.PlaneGeometry(2, 1, 24, 6), mat }; return flagStuff;
}
const poleGeo = (height: number) => cached('pole|' + height, () => {
  const b = new Builder(), m: Paint = { k: 'metal', c: '#d9dde2', r: 0.3 };
  b.add(gLathe([[0.001, 0], [0.34, 0], [0.34, 0.14], [0.24, 0.18], [0.24, 0.3], [0.12, 0.36], [0.001, 0.36]], 12), { k: 'stone', c: '#c9c4b8' });
  b.cyl(0.045, 0.065, height - 0.3, m, [0, 0.3 + (height - 0.3) / 2, 0], undefined, 10); b.sph(0.1, { k: 'gold', c: '#f2c84b' }, [0, height + 0.06, 0]);
  for (const y of [height - 0.22, height - 1.18]) b.cyl(0.02, 0.02, 0.1, m, [0.06, y, 0], [0, 0, Math.PI / 2], 6);
  return b.build();
});

function stallGeo(color: string, signW: number) {
  return cached(`stall|${color}|${signW.toFixed(2)}`, () => {
    const b = new Builder(), wd: Paint = { k: 'wood', c: '#8a5a34' }, dk: Paint = { k: 'wood', c: '#5a3d26' }, r = rng(hash(color) + 3);
    b.box(2.6, 0.92, 1.2, wd, [0, 0.46, 0], undefined, 0.03); b.box(2.74, 0.09, 1.34, { k: 'wood', c: '#a8743f' }, [0, 0.965, 0], undefined, 0.03);
    for (let i = 0; i < 6; i++) b.box(0.03, 0.8, 0.02, dk, [-1.08 + i * 0.432, 0.46, 0.605], undefined, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.cyl(0.05, 0.055, sz > 0 ? 1.52 : 1.9, dk, [sx * 1.22, 1 + (sz > 0 ? 0.76 : 0.95), sz * 0.52], undefined, 8);
    b.box(2.6, 0.07, 0.07, dk, [0, 2.5, 0.52], undefined, 0); b.box(2.6, 0.07, 0.07, dk, [0, 2.88, -0.52], undefined, 0);
    // toldo de franjas con cenefa
    const N = 8, sw = 3.04 / N, tilt = 0.26;
    for (let i = 0; i < N; i++) {
      const x = -1.52 + (i + 0.5) * sw, c = i % 2 ? '#fbf7ee' : color, cl: Paint = { k: 'cloth', c };
      b.box(sw + 0.005, 0.05, 1.95, cl, [x, 2.76, 0.12], [tilt, 0, 0], 0.012); b.box(sw + 0.005, 0.2, 0.035, cl, [x, 2.44, 1.06], undefined, 0); b.cyl(sw / 2, sw / 2, 0.035, cl, [x, 2.34, 1.06], [Math.PI / 2, 0, 0], 10);
    }
    // mercadería
    b.box(0.62, 0.2, 0.5, { k: 'wood', c: '#b98a52' }, [-0.9, 1.11, 0.1], undefined, 0.02); for (let i = 0; i < 11; i++) b.sph(0.085, { c: '#ff8a1f', r: 0.55 }, [-1.12 + (i % 4) * 0.15 + r() * 0.02, 1.25 + (i > 7 ? 0.1 : 0), -0.06 + Math.floor((i % 8) / 4) * 0.17 + r() * 0.03], [1, 0.95, 1], 8, 6);
    b.add(gLathe([[0.001, 0], [0.2, 0], [0.27, 0.16], [0.29, 0.2], [0.26, 0.2], [0.2, 0.05], [0.001, 0.05]], 12), { k: 'straw', c: '#d9b56a' }, { p: [-0.1, 1.01, 0.12] });
    for (let i = 0; i < 6; i++) b.sph(0.09, { c: i % 2 ? '#f2c230' : '#e8642c', r: 0.5 }, [-0.1 + Math.cos(i * 1.05) * 0.12, 1.19 + (i === 5 ? 0.09 : 0), 0.12 + Math.sin(i * 1.05) * 0.12], [0.85, 1.15, 0.85], 8, 6);
    for (let i = 0; i < 6; i++) b.cyl(0.17, 0.17, 0.018, { c: '#f1dfb4', r: 0.8 }, [0.62 + r() * 0.01, 1.03 + i * 0.019, 0.2 + r() * 0.01], undefined, 12); b.cyl(0.21, 0.19, 0.02, { c: '#ffffff', r: 0.3 }, [0.62, 1.018, 0.2], undefined, 12);
    b.cyl(0.085, 0.085, 0.24, { c: '#c0392b', r: 0.25 }, [1.02, 1.13, -0.2], undefined, 10); b.cyl(0.09, 0.09, 0.03, { k: 'metal', c: '#d9d9d9' }, [1.02, 1.26, -0.2], undefined, 10); b.cyl(0.075, 0.075, 0.2, { c: '#f2c230', r: 0.25 }, [0.82, 1.11, -0.28], undefined, 10); b.cyl(0.08, 0.08, 0.03, { k: 'metal', c: '#d9d9d9' }, [0.82, 1.22, -0.28], undefined, 10);
    b.sph(0.2, { c: '#2f8a3c', r: 0.45 }, [0.35, 1.19, -0.25], [1.25, 1, 1], 10, 8);
    for (let k = 0; k < 2; k++) { const x0 = -0.7 + k * 1.3; b.cyl(0.012, 0.012, 0.22, dk, [x0, 2.36, 0.52], undefined, 4); for (let i = 0; i < 5; i++) { const a = -0.5 + i * 0.25; b.add(gTube([[x0, 2.26, 0.52], [x0 + Math.sin(a) * 0.1, 2.14, 0.56], [x0 + Math.sin(a) * 0.14, 2.0, 0.54]], [0.02, 0.034, 0.02], 5), { c: '#f6d13a', r: 0.5 }); } }
    if (signW > 0) b.box(signW + 0.14, 0.54, 0.05, dk, [0, 2.12, 0.6], undefined, 0.02);
    return b.build();
  });
}

const kioskGeo = (color: string) => cached('kiosk|' + color, () => {
  const b = new Builder(), st: Paint = { k: 'stone', c: '#ece8df' }, wh: Paint = { k: 'stucco', c: '#fbfaf6' }, A0 = Math.PI / 8, col = (i: number, R: number): V3 => [Math.sin(A0 + (i * Math.PI) / 4) * R, 0, Math.cos(A0 + (i * Math.PI) / 4) * R];
  b.cyl(2.7, 2.76, 0.5, { ...st, g: [0, 0.5, 0.8] }, [0, 0.25, 0], [0, A0, 0], 8); b.cyl(2.84, 2.84, 0.1, st, [0, 0.05, 0], [0, A0, 0], 8); b.cyl(2.5, 2.5, 0.03, { k: 'tile', c: '#d7b98a' }, [0, 0.505, 0], [0, A0, 0], 8);
  for (let i = 0; i < 8; i++) { const p = col(i, 2.3); b.add(gLathe([[0.001, 0.5], [0.18, 0.5], [0.18, 0.62], [0.12, 0.68], [0.1, 0.8], [0.085, 2.86], [0.13, 2.92], [0.16, 3.02], [0.001, 3.02]], 10), wh, { p: [p[0], 0, p[2]] }); }
  // barandal en todos los tramos menos el del frente
  for (let i = 0; i < 8; i++) { if (i === 7) continue; const p = col(i, 2.3), q = col(i + 1, 2.3); for (const y of [0.72, 1.34]) b.add(gTube([[p[0], y, p[2]], [q[0], y, q[2]]], y > 1 ? 0.04 : 0.03, 6), IRON); for (let k = 1; k < 7; k++) { const t = k / 7; b.box(0.03, 0.62, 0.03, IRON, [p[0] + (q[0] - p[0]) * t, 1.03, p[2] + (q[2] - p[2]) * t], undefined, 0); } }
  b.cyl(2.52, 2.52, 0.26, wh, [0, 3.14, 0], [0, A0, 0], 8); b.cyl(3.14, 3.14, 0.07, { k: 'wood', c: '#6b4528' }, [0, 3.3, 0], [0, A0, 0], 8);
  const roof: Paint = { k: 'roof', c: color, uv: true }, top: V3 = [0, 4.62, 0];
  for (let i = 0; i < 8; i++) { const p = col(i, 3.2), q = col(i + 1, 3.2); roofQuad(b, roof, [p[0], 3.33, p[2]], [q[0], 3.33, q[2]], top, top); b.add(gTube([[p[0], 3.34, p[2]], [0, 4.63, 0]], 0.06, 5), { k: 'roof', c: tint(color, 0.8) }); }
  b.cyl(0.3, 0.36, 0.3, wh, [0, 4.62, 0], [0, A0, 0], 8); b.add(new THREE.ConeGeometry(0.46, 0.4, 8), { k: 'roof', c: color }, { p: [0, 4.96, 0], r: [0, A0, 0] }); b.sph(0.09, { k: 'gold', c: '#f2c84b' }, [0, 5.22, 0]);
  for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.283; b.sph(0.055, { c: ['#fff0c0', '#ffd0a0', '#fff0c0'][i % 3], r: 0.3, e: 3 }, [Math.sin(a) * 2.6, 2.96 - Math.abs(Math.sin(a * 4 + A0 * 4)) * 0.1, Math.cos(a) * 2.6], [1, 1.2, 1], 6, 4); }
  return b.build();
});

const fountainGeo = () => cached('fountain', () => {
  const b = new Builder(), st: Paint = { k: 'stone', c: '#d2d0c8' };
  b.add(gLathe([[0.001, 0], [1.94, 0], [1.94, 0.1], [1.84, 0.16], [1.84, 0.44], [1.96, 0.5], [1.96, 0.6], [1.62, 0.6], [1.58, 0.5], [1.58, 0.2], [0.001, 0.2]], 28), { ...st, g: [0, 0.3, 0.8] });
  b.add(gLathe([[0.46, 0.2], [0.4, 0.34], [0.24, 0.44], [0.18, 0.9], [0.24, 1.0], [0.6, 1.1], [0.86, 1.2], [0.9, 1.3], [0.8, 1.3], [0.2, 1.2], [0.14, 1.3], [0.12, 1.66], [0.16, 1.72], [0.38, 1.78], [0.46, 1.86], [0.4, 1.86], [0.1, 1.8], [0.08, 1.98], [0.14, 2.04], [0.1, 2.14], [0.001, 2.2]], 20), st);
  return b.build();
});
const fountainWater = () => cached('fountain-water', () => {
  const b = new Builder(), w: Paint = { c: '#ffffff' };
  b.add(new THREE.CircleGeometry(1.6, 28), w, { p: [0, 0.5, 0], r: [-Math.PI / 2, 0, 0] }); b.add(new THREE.CircleGeometry(0.82, 20), w, { p: [0, 1.27, 0], r: [-Math.PI / 2, 0, 0] }); b.add(new THREE.CircleGeometry(0.41, 14), w, { p: [0, 1.845, 0], r: [-Math.PI / 2, 0, 0] });
  const g = b.build(); g.deleteAttribute('aMat'); g.deleteAttribute('aCol'); return g;
});
const fountainFall = () => cached('fountain-fall', () => {
  const fall = (r0: number, y0: number, r1: number, y1: number) => { const pts: [number, number][] = []; for (let i = 0; i <= 6; i++) { const t = i / 6; pts.push([r0 + (r1 - r0) * Math.sqrt(t), y0 + (y1 - y0) * t * t + 0.03 * Math.sin(t * Math.PI)]); } return new THREE.LatheGeometry(pts.map(p => new THREE.Vector2(p[0], p[1])), 28); };
  const b = new Builder(); b.add(fall(0.44, 1.86, 0.62, 1.28), { c: '#fff' }); b.add(fall(0.88, 1.3, 1.12, 0.5), { c: '#fff' }); b.add(fall(0.02, 2.36, 0.2, 1.86), { c: '#fff' });
  const g = b.build(); g.deleteAttribute('aMat'); g.deleteAttribute('aCol'); return g;
});
let fallMat: THREE.ShaderMaterial | null = null;
const fallMaterial = () => (fallMat ??= new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uTime: G.uTime, uSky: G.uSky },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
  fragmentShader: `uniform float uTime; uniform vec3 uSky; varying vec2 vUv;
    float h( float x ) { return fract( sin( x * 127.1 ) * 43758.5453 ); }
    void main() { float col = floor( vUv.x * 90.0 ), sp = 1.2 + h( col ) * 1.3; float s = fract( vUv.y * ( 1.0 + h( col + 7.0 ) ) - uTime * sp + h( col + 3.0 ) ); float streak = smoothstep( 0.0, 0.25, s ) * smoothstep( 1.0, 0.45, s ); float a = 0.2 + 0.6 * streak * ( 0.5 + 0.5 * h( col + 11.0 ) ); gl_FragColor = vec4( mix( uSky * 0.6 + 0.35, vec3( 1.0 ), streak * 0.8 ), a ); }`,
}));

const statueGeo = (color: string) => cached('statue|' + color, () => {
  const b = new Builder(), st: Paint = { k: 'stone', c: '#cfd0cc' }, br: Paint = { k: 'metal', c: color, m: 0.75, r: 0.45 };
  b.box(1.6, 0.22, 1.6, st, [0, 0.11, 0], undefined, 0.04); b.box(1.36, 1.2, 1.36, { ...st, g: [0, 0.6, 0.85] }, [0, 0.8, 0], undefined, 0.04); b.box(1.54, 0.2, 1.54, st, [0, 1.5, 0], undefined, 0.05);
  b.box(0.8, 0.46, 0.05, { k: 'gold', c: '#b98a3a', m: 0.8, r: 0.4 }, [0, 0.86, 0.69], undefined, 0.015);
  // prócer de bronce con el brazo en alto y una bandera
  b.box(0.7, 0.1, 0.5, br, [0, 1.65, 0], undefined, 0.03);
  for (const s of [-1, 1]) { b.add(gTube([[s * 0.13, 1.7, s > 0 ? 0.06 : -0.04], [s * 0.12, 2.1, 0.02], [s * 0.1, 2.55, 0]], [0.085, 0.09, 0.11], 8), br); b.sph(0.1, br, [s * 0.13, 1.73, s > 0 ? 0.12 : 0.02], [0.9, 0.6, 1.5], 8, 6); }
  b.add(gLathe([[0.001, 2.45], [0.21, 2.47], [0.24, 2.7], [0.2, 2.95], [0.25, 3.15], [0.2, 3.26], [0.08, 3.3], [0.001, 3.3]], 12), br, { s: [1, 1, 0.72] });
  b.add(gLathe([[0.26, 2.2], [0.3, 2.5], [0.27, 3.0], [0.22, 3.24]], 12), br, { p: [0, 0, -0.1], s: [1.05, 1, 0.5] });
  b.sph(0.165, br, [0, 3.5, 0.01], [1, 1.08, 1], 12, 9); b.cyl(0.07, 0.08, 0.1, br, [0, 3.33, 0], undefined, 8); b.sph(0.18, br, [0, 3.6, -0.02], [1.05, 0.5, 1.1], 10, 6); b.sph(0.03, br, [0, 3.48, 0.165], [1, 1.3, 1], 6, 4);
  b.add(gTube([[0.24, 3.2, 0], [0.4, 3.45, 0.06], [0.44, 3.8, 0.1]], [0.075, 0.065, 0.055], 7), br); b.sph(0.07, br, [0.44, 3.84, 0.1]);
  b.add(gTube([[-0.24, 3.2, 0], [-0.33, 2.95, 0.05], [-0.22, 2.75, 0.16]], [0.075, 0.065, 0.055], 7), br); b.sph(0.065, br, [-0.2, 2.73, 0.18]);
  b.cyl(0.02, 0.02, 1.5, br, [0.44, 4.1, 0.1], undefined, 6); b.sph(0.04, br, [0.44, 4.86, 0.1]);
  const fl = new THREE.PlaneGeometry(0.6, 0.38, 6, 1), P = fl.attributes.position; for (let i = 0; i < P.count; i++) P.setZ(i, Math.sin((P.getX(i) + 0.3) * 9) * 0.045 * (P.getX(i) + 0.3) * 3); fl.computeVertexNormals();
  b.add(fl, br, { p: [0.76, 4.62, 0.1] }); b.add(fl, br, { p: [0.76, 4.62, 0.1], s: [1, 1, -1] });
  return b.build();
});

const signGeo = (ww: number, hh: number, color: string) => cached(`sign|${ww.toFixed(2)}|${hh.toFixed(2)}|${color}`, () => {
  const b = new Builder(), m: Paint = { k: 'metal', c: '#4a4f57', r: 0.45 };
  const posts = ww > 2.4 ? [-ww / 2 + 0.22, ww / 2 - 0.22] : [0];
  for (const x of posts) { b.cyl(0.05, 0.06, 2.2 + hh / 2, m, [x, (2.2 + hh / 2) / 2, -0.05], undefined, 8); b.cyl(0.12, 0.14, 0.08, m, [x, 0.04, -0.05], undefined, 8); b.sph(0.06, m, [x, 2.2 + hh / 2 + 0.02, -0.05]); }
  b.box(ww + 0.14, hh + 0.14, 0.05, { c: tint(color, 0.6), r: 0.5 }, [0, 2.2, 0], undefined, 0.02); b.box(ww + 0.02, hh + 0.02, 0.064, { c: color, r: 0.5 }, [0, 2.2, 0], undefined, 0.02);
  return b.build();
});

// --- arco de portal: piedra, superficie de energía animada y rótulo legible por los dos lados
const archGeo = (color: string, lw: number) => cached(`arch|${color}|${lw.toFixed(2)}`, () => {
  const b = new Builder(), st: Paint = { k: 'stone', c: '#d8d2c4' }, dk: Paint = { k: 'stone', c: '#b9b1a0' }, glow: Paint = { c: color, r: 0.3, e: -0.9 }, SY = 2.3;
  for (const s of [-1, 1]) {
    b.box(0.86, 0.32, 0.86, dk, [s * 1.5, 0.16, 0], undefined, 0.05); b.box(0.62, SY - 0.3, 0.62, { ...st, g: [0, 1, 0.82] }, [s * 1.5, 0.3 + (SY - 0.3) / 2, 0], undefined, 0.05); b.box(0.8, 0.16, 0.8, dk, [s * 1.5, SY - 0.02, 0], undefined, 0.04);
    b.box(0.06, SY - 0.5, 0.4, glow, [s * 1.2, 0.34 + (SY - 0.5) / 2, 0], undefined, 0.02);
    for (const z of [-1, 1]) b.box(0.3, 0.3, 0.05, { c: color, r: 0.4 }, [s * 1.5, 1.25, z * 0.32], [0, 0, Math.PI / 4], 0.02);
  }
  const N = 9; for (let i = 0; i < N; i++) { const a = ((i + 0.5) / N) * Math.PI, key = i === 4; b.box(key ? 0.74 : 0.6, 0.56, key ? 0.72 : 0.62, key ? { k: 'stone', c: color } : i % 2 ? st : dk, [Math.cos(a) * (key ? 1.56 : 1.5), SY + Math.sin(a) * (key ? 1.56 : 1.5), 0], [0, 0, a - Math.PI / 2 + Math.PI / 2], 0.05); }
  b.add(new THREE.TorusGeometry(1.2, 0.04, 6, 24, Math.PI), glow, { p: [0, SY, 0] });
  b.box(lw + 0.36, 0.98, 0.16, { k: 'wood', c: '#3a2616' }, [0, 4.72, 0], undefined, 0.04); b.box(lw + 0.46, 0.08, 0.2, { k: 'gold', c: '#e8c458' }, [0, 5.23, 0], undefined, 0.02); b.box(lw + 0.46, 0.08, 0.2, { k: 'gold', c: '#e8c458' }, [0, 4.21, 0], undefined, 0.02);
  return b.build();
});
let portalGeo: THREE.BufferGeometry | null = null;
function portalShape() {
  if (portalGeo) return portalGeo;
  const s = new THREE.Shape(); s.moveTo(-1.2, 0.02); s.lineTo(1.2, 0.02); s.lineTo(1.2, 2.3); s.absarc(0, 2.3, 1.2, 0, Math.PI, false); s.lineTo(-1.2, 0.02);
  const g = new THREE.ShapeGeometry(s, 20), P = g.attributes.position, U = g.attributes.uv; for (let i = 0; i < P.count; i++) U.setXY(i, P.getX(i) / 1.2, (P.getY(i) - 1.75) / 1.75);
  portalGeo = g; return g;
}
const portalMats = new Map<string, THREE.ShaderMaterial>();
function portalMaterial(color: string) {
  let m = portalMats.get(color); if (m) return m;
  m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uTime: G.uTime, uCol: { value: new THREE.Color(color) } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }',
    fragmentShader: `uniform float uTime; uniform vec3 uCol; varying vec2 vUv;
      float hash( vec2 p ) { p = fract( p * vec2( 123.34, 456.21 ) ); p += dot( p, p + 45.32 ); return fract( p.x * p.y ); }
      float noise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); return mix( mix( hash( i ), hash( i + vec2( 1, 0 ) ), f.x ), mix( hash( i + vec2( 0, 1 ) ), hash( i + vec2( 1, 1 ) ), f.x ), f.y ); }
      void main() {
        vec2 p = vUv * vec2( 1.0, 1.4 ); float r = length( p ), a = atan( p.y, p.x );
        float sw = sin( a * 3.0 + r * 7.0 - uTime * 2.2 + noise( p * 3.0 + uTime * 0.3 ) * 3.0 ) * 0.5 + 0.5;
        float rings = sin( r * 11.0 - uTime * 3.2 ) * 0.5 + 0.5, core = exp( - r * r * 2.2 );
        float sp = step( 0.985, hash( floor( vUv * 46.0 ) + floor( uTime * 3.0 ) ) );
        vec3 c = mix( uCol * 0.75, uCol * 1.5 + 0.25, sw * 0.7 ) + vec3( 1.0 ) * ( core * 0.55 + pow( sw * rings, 3.0 ) * 0.5 + sp * 0.8 );
        gl_FragColor = vec4( c, 0.5 + 0.3 * sw + core * 0.2 );
      }`,
  });
  portalMats.set(color, m); return m;
}

let netMat: THREE.Material | null = null;
function netMaterial() {
  if (netMat) return netMat;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d')!; c.clearRect(0, 0, 64, 64); c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.strokeRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  netMat = new THREE.MeshLambertMaterial({ map: t, transparent: true, side: THREE.DoubleSide, depthWrite: false, opacity: 0.9 }); return netMat;
}
const goalGeo = (w: number, h: number) => cached(`goal|${w}|${h}`, () => {
  const b = new Builder(), m: Paint = { k: 'metal', c: '#ffffff', m: 0.2, r: 0.4 }, x = w / 2;
  b.add(gTube([[-x, 0, 0], [-x, h, 0], [x, h, 0], [x, 0, 0]], 0.065, 8), m);
  for (const s of [-1, 1]) b.add(gTube([[s * x, h, 0], [s * x, h, -0.5], [s * x, 0.03, -0.9]], 0.03, 6), m);
  b.add(gTube([[-x, 0.03, -0.9], [x, 0.03, -0.9]], 0.03, 6), m); b.add(gTube([[-x, h, -0.5], [x, h, -0.5]], 0.025, 6), m);
  return b.build();
});
const netGeo = (w: number, h: number) => cached(`net|${w}|${h}`, () => {
  const x = w / 2, k = 1 / 0.16, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const quad = (a: V3, b: V3, c: V3, d: V3, uw: number, vh: number) => { const o = pos.length / 3; pos.push(...a, ...b, ...c, ...d); uv.push(0, 0, uw * k, 0, uw * k, vh * k, 0, vh * k); idx.push(o, o + 1, o + 2, o, o + 2, o + 3); };
  quad([-x, 0.03, -0.9], [x, 0.03, -0.9], [x, h, -0.5], [-x, h, -0.5], w, h); quad([-x, h, -0.5], [x, h, -0.5], [x, h, 0], [-x, h, 0], w, 0.5);
  for (const s of [-1, 1]) { quad([s * x, 0.03, -0.9], [s * x, 0.03, 0], [s * x, h, 0], [s * x, h, -0.5], 0.9, h); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
});

export const props2: Pick<ArtProps, 'House' | 'Lamp' | 'Bench' | 'Fence' | 'Flag' | 'Stall' | 'Kiosk' | 'Fountain' | 'Statue' | 'Sign' | 'PortalArch' | 'Goal'> = {
  House: ({ w = 6, d = 5, floors = 1, roofColor = '#b5523b', sign, ...a }) => {
    solidBox(a, w, 3 * floors, d);
    const tex = useMemo(() => (sign ? textTexture(sign, { fg: '#ffffff', bg: '#c0392b', radius: 0.15 }) : null), [sign]), sw = tex ? Math.min(w * 0.8, 0.5 * asp(tex)) : 0;
    return <Placed {...a}><Merged g={houseGeo(w, d, floors, a.color ?? '#f2c4a4', roofColor, sw)} />{tex && <TextPlane tex={tex} w={sw} h={sw / asp(tex)} pos={[0, 2.68, d / 2 + 0.1]} />}</Placed>;
  },
  Lamp,
  Bench: a => { solidBox(a, 1.8, 0.5, 0.6); return <Placed {...a}><Merged g={benchGeo(a.color ?? '#8a5a34')} /></Placed>; },
  Fence: ({ length = 4, ...a }) => { solidBox(a, length, 1, 0.15); return <Placed {...a}><Merged g={fenceGeo(length, a.color ?? '#ffffff')} /></Placed>; },
  Flag: ({ height = 7, ...a }) => { solidCyl(a, 0.12, height); const f = flagParts(); return <Placed {...a}><Merged g={poleGeo(height)} /><mesh position={[1.07, height - 0.7, 0]} geometry={f.geo} material={f.mat} castShadow /></Placed>; },
  Stall: ({ sign, ...a }) => {
    solidBox(a, 2.6, 1, 1.2);
    const tex = useMemo(() => (sign ? textTexture(sign, { fg: '#1d1d1f', bg: '#ffd23f', radius: 0.15 }) : null), [sign]), sw = tex ? Math.min(2.4, 0.42 * asp(tex)) : 0;
    return <Placed {...a}><Merged g={stallGeo(a.color ?? '#e63946', sw)} />{tex && <TextPlane tex={tex} w={sw} h={sw / asp(tex)} pos={[0, 2.12, 0.632]} />}</Placed>;
  },
  Kiosk: a => { solidCyl(a, 2.6, 0.5); return <Placed {...a}><Merged g={kioskGeo(a.color ?? '#e63946')} /></Placed>; },
  Fountain: a => { solidCyl(a, 1.8, 0.6); return <Placed {...a}><Merged g={fountainGeo()} /><mesh geometry={fountainWater()} material={hdMaterial('water', a.color ?? '#3aa6d8')} receiveShadow /><mesh geometry={fountainFall()} material={fallMaterial()} /></Placed>; },
  Statue: a => { solidBox(a, 1.4, 1.6, 1.4); return <Placed {...a}><Merged g={statueGeo(a.color ?? '#6d7f73')} /></Placed>; },
  Sign: ({ text, w, ...a }) => {
    const bg = a.color ?? '#0d47a1', tex = useMemo(() => textTexture(text, { fg: '#ffffff', bg, radius: 0.15 }), [text, bg]), ww = w ?? Math.min(4, 0.6 * asp(tex)), hh = ww / asp(tex);
    return <Placed {...a}><Merged g={signGeo(ww, hh, bg)} /><TextPlane tex={tex} w={ww} h={hh} pos={[0, 2.2, 0.036]} /><TextPlane tex={tex} w={ww} h={hh} pos={[0, 2.2, -0.036]} ry={Math.PI} /></Placed>;
  },
  PortalArch: ({ label, icon, ...a }) => {
    const col = a.color ?? '#00a3d7', tex = useMemo(() => textTexture(label, { fg: '#ffffff', bg: 'rgba(0,0,0,0)', stroke: '#1d1208' }), [label]), ic = useMemo(() => (icon ? textTexture(icon, { bg: 'rgba(0,0,0,0)', size: 96, pad: 0.1 }) : null), [icon]);
    const lw = Math.min(4.2, 0.74 * asp(tex)), lh = lw / asp(tex);
    return <Placed {...a}><Merged g={archGeo(col, lw)} /><mesh geometry={portalShape()} material={portalMaterial(col)} renderOrder={5} />
      {[1, -1].map(s => <group key={s} rotation-y={s > 0 ? 0 : Math.PI}><TextPlane tex={tex} w={lw} h={lh} pos={[0, 4.72, 0.085]} />{ic && <TextPlane tex={ic} w={0.62 * asp(ic)} h={0.62} pos={[0, 3.86, 0.38]} />}</group>)}
    </Placed>;
  },
  Goal: ({ w = 5, h = 2.4, ...a }) => <Placed {...a}><Merged g={goalGeo(w, h)} /><mesh geometry={netGeo(w, h)} material={netMaterial()} /></Placed>,
};
