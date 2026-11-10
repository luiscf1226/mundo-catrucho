// Atlas del avatar HD (1024×512, un lienzo por configuración): cara, torso, mangas, piernas, falda, capa,
// estampados y una rejilla de colores lisos. Todo se dibuja con Canvas 2D; nada se descarga.
import * as THREE from 'three';
import type { AvatarConfig } from '../../../../core/types';
import { AH, AW, type Rect } from './skin';
import { R, SWATCH, cut, swatchCell, type SwatchName } from './avatarGeo';
import { rng } from './tex';

type Ctx = CanvasRenderingContext2D;
const C3 = (c: string) => new THREE.Color(c);
const css = (c: THREE.Color) => '#' + c.getHexString();
const mix = (a: string, b: string, t: number) => css(C3(a).lerp(C3(b), t));
const dark = (a: string, k: number) => mix(a, '#000000', k), light = (a: string, k: number) => mix(a, '#ffffff', k);
const lum = (c: string) => { const k = C3(c); return 0.3 * k.r + 0.59 * k.g + 0.11 * k.b; };
const FONT = (px: number) => `900 ${px}px "Fredoka", "Baloo 2", "Arial Black", system-ui, sans-serif`;
const RIBBON = ['#e63946', '#ffc93c', '#2ea44f', '#00a3d7', '#ff5d9e', '#7b5cff'];
const BLUE = '#00bce4', HBLUE = '#0b57c4', MANTA = '#eee3c8', GUAYA = '#f6f1e4';

function region(c: Ctx, r: Rect, fn: (w: number, h: number) => void) { c.save(); c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip(); c.translate(r[0], r[1]); fn(r[2], r[3]); c.restore(); }
const ell = (c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); };
function star(c: Ctx, x: number, y: number, r: number) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.42 : r; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fill(); }
function weave(c: Ctx, w: number, h: number, a = 0.1) { c.strokeStyle = `rgba(120,100,60,${a})`; c.lineWidth = 1; c.beginPath(); for (let y = 2; y < h; y += 4) { c.moveTo(0, y); c.lineTo(w, y); } for (let x = 2; x < w; x += 4) { c.moveTo(x, 0); c.lineTo(x, h); } c.stroke(); }
/** cenefa bordada: banda de color con zigzag y puntos */
function trim(c: Ctx, x: number, y: number, w: number, h: number, base = '#c0392b') {
  c.fillStyle = base; c.fillRect(x, y, w, h); c.strokeStyle = '#ffc93c'; c.lineWidth = 2; c.beginPath(); for (let i = 0; i * h <= w; i++) c.lineTo(x + i * h, y + (i % 2 ? h - 3 : 3)); c.stroke();
  c.fillStyle = '#00a3d7'; for (let i = 0; i * h * 2 <= w; i++) { c.beginPath(); c.arc(x + h + i * h * 2, y + h / 2 + 1, 1.6, 0, 7); c.fill(); }
}
function ribbons(c: Ctx, x: number, y: number, w: number, h: number, n = 6, off = 0) { const bh = h / n; for (let i = 0; i < n; i++) { c.fillStyle = RIBBON[(i + off) % RIBBON.length]; c.fillRect(x, y + i * bh, w, bh - 1.5); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillRect(x, y + i * bh + bh - 1.5, w, 1.5); } }

function face(c: Ctx, cfg: AvatarConfig) {
  const skin = cfg.skin, line = mix(skin, '#3a120c', 0.78), brow = mix(cfg.hairColor, '#1c110b', 0.5), f = cfg.face;
  c.fillStyle = skin; c.fillRect(0, 0, 256, 256);
  let g = c.createRadialGradient(128, 110, 10, 128, 128, 126); g.addColorStop(0, 'rgba(255,255,255,0.09)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256);
  for (const s of [-1, 1]) { g = c.createRadialGradient(128 + s * 70, 174, 2, 128 + s * 70, 174, f === 'cara_feliz' ? 32 : 26); g.addColorStop(0, `rgba(255,80,90,${f === 'cara_feliz' ? 0.42 : 0.26})`); g.addColorStop(1, 'rgba(255,80,90,0)'); c.fillStyle = g; c.fillRect(0, 120, 256, 110); }
  const cy = 140;
  const eye = (s: number) => {
    const cx = 128 + s * 47, ix = cx - s * 1.5;
    c.fillStyle = '#ffffff'; ell(c, cx, cy, 17.5, 21.5); c.fill();
    c.fillStyle = '#4a2a14'; ell(c, ix, cy + 1.5, 13, 17.5); c.fill(); c.fillStyle = '#140b08'; ell(c, ix, cy + 2, 8.5, 12); c.fill();
    c.fillStyle = '#ffffff'; ell(c, ix - 5, cy - 7, 5, 6.2); c.fill(); ell(c, ix + 5.5, cy + 8.5, 2.4, 2.9); c.fill();
    c.strokeStyle = '#22140e'; c.lineWidth = 4.6; c.lineCap = 'round'; c.beginPath(); c.ellipse(cx, cy, 18, 22, 0, Math.PI * 1.06, Math.PI * 1.94); c.stroke();
    c.lineWidth = 3.2; c.beginPath(); c.moveTo(cx + s * 16.5, cy - 9); c.lineTo(cx + s * 23, cy - 14); c.stroke();
    if (cfg.body === 'm') { c.lineWidth = 3; c.beginPath(); for (const [a, b] of [[8, -21], [14, -18]]) { c.moveTo(cx + s * a, cy + b); c.lineTo(cx + s * (a + 7), cy + b - 8); } c.stroke(); }
  };
  const closed = (s: number) => { const cx = 128 + s * 47; c.strokeStyle = '#22140e'; c.lineWidth = 5.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx - 17, cy + 5); c.quadraticCurveTo(cx, cy - 13, cx + 17, cy + 5); c.stroke(); };
  if (f === 'cara_lentes') {
    c.strokeStyle = '#101114'; c.lineWidth = 7; c.beginPath(); c.moveTo(0, cy - 8); c.lineTo(256, cy - 8); c.stroke();
    for (const s of [-1, 1]) {
      const cx = 128 + s * 47; g = c.createLinearGradient(0, cy - 24, 0, cy + 24); g.addColorStop(0, '#0d0e12'); g.addColorStop(1, '#343b48'); c.fillStyle = g; c.beginPath(); c.roundRect(cx - 30, cy - 22, 60, 44, [12, 12, 20, 20]); c.fill(); c.strokeStyle = '#08080a'; c.lineWidth = 4; c.stroke();
      c.save(); c.clip(); c.strokeStyle = 'rgba(255,255,255,0.4)'; c.lineWidth = 7; c.beginPath(); c.moveTo(cx - 20, cy + 26); c.lineTo(cx + 2, cy - 26); c.stroke(); c.lineWidth = 3; c.beginPath(); c.moveTo(cx - 6, cy + 26); c.lineTo(cx + 16, cy - 26); c.stroke(); c.restore();
    }
  } else if (f === 'cara_guino') { eye(-1); closed(1); } else if (f === 'cara_feliz') { closed(-1); closed(1); } else { eye(-1); eye(1); }
  // cejas
  c.strokeStyle = brow; c.lineCap = 'round'; c.lineWidth = f === 'cara_bigote' ? 8.5 : 6;
  for (const s of [-1, 1]) { const cx = 128 + s * 47, up = f === 'cara_guino' && s > 0 ? 5 : f === 'cara_lentes' ? -4 : 0; c.beginPath(); c.moveTo(cx - s * 16, 103 + up); c.quadraticCurveTo(cx, 93 + up, cx + s * 18, 101 + up); c.stroke(); }
  // boca
  c.strokeStyle = line; c.lineWidth = 5; c.lineCap = 'round'; c.lineJoin = 'round';
  if (f === 'cara_feliz') {
    c.beginPath(); c.moveTo(98, 182); c.quadraticCurveTo(128, 190, 158, 182); c.quadraticCurveTo(152, 226, 128, 226); c.quadraticCurveTo(104, 226, 98, 182); c.closePath(); c.fillStyle = '#6a1a22'; c.fill();
    c.save(); c.clip(); c.fillStyle = '#ffffff'; c.fillRect(96, 178, 64, 13); c.fillStyle = '#f2788a'; ell(c, 128, 222, 20, 12); c.fill(); c.restore(); c.stroke();
  } else if (f === 'cara_guino') {
    c.beginPath(); c.moveTo(104, 184); c.quadraticCurveTo(132, 206, 156, 178); c.stroke(); c.fillStyle = '#f2788a'; ell(c, 140, 198, 9, 7, -0.3); c.fill(); c.lineWidth = 3; c.stroke();
  } else if (f === 'cara_bigote') {
    c.fillStyle = brow; c.beginPath(); c.moveTo(128, 172); c.bezierCurveTo(146, 160, 168, 172, 176, 190); c.bezierCurveTo(160, 184, 144, 186, 128, 182); c.bezierCurveTo(112, 186, 96, 184, 80, 190); c.bezierCurveTo(88, 172, 110, 160, 128, 172); c.fill();
    c.beginPath(); c.moveTo(112, 198); c.quadraticCurveTo(128, 208, 144, 198); c.stroke();
  } else if (f === 'cara_lentes') { c.beginPath(); c.moveTo(106, 190); c.quadraticCurveTo(132, 206, 154, 186); c.stroke(); }
  else { c.beginPath(); c.moveTo(103, 185); c.quadraticCurveTo(128, 207, 153, 185); c.stroke(); }
  if (cfg.body === 'm' && f !== 'cara_feliz' && f !== 'cara_bigote') { c.strokeStyle = 'rgba(200,60,80,0.45)'; c.lineWidth = 4; c.beginPath(); c.moveTo(114, 194); c.quadraticCurveTo(128, 203, 142, 194); c.stroke(); }
  if (f === 'cara_pecas') { c.fillStyle = mix(skin, '#6b2f14', 0.6); const r = rng(77); for (const s of [-1, 1]) for (let i = 0; i < 9; i++) { c.beginPath(); c.arc(128 + s * (36 + r() * 50), 160 + r() * 26, 2 + r() * 1.3, 0, 7); c.fill(); } for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(112 + r() * 32, 164 + r() * 10, 1.8, 0, 7); c.fill(); } }
}

interface Sleeve { len: number; paint: (c: Ctx, len: number) => void }
const HEM = 172;
function neck(c: Ctx, skin: string, kind: 'round' | 'v' | 'wide', collar?: string) {
  c.fillStyle = skin; c.fillRect(0, 0, 512, kind === 'wide' ? 24 : 9);
  if (kind === 'round') { ell(c, 256, 6, 36, 24); c.fill(); if (collar) { c.strokeStyle = collar; c.lineWidth = 6; c.beginPath(); c.ellipse(256, 6, 38, 26, 0, 0.12, Math.PI - 0.12); c.stroke(); c.fillStyle = collar; c.fillRect(0, 8, 216, 6); c.fillRect(296, 8, 216, 6); } }
  else if (kind === 'v') { c.beginPath(); c.moveTo(232, 8); c.lineTo(256, 52); c.lineTo(280, 8); c.fill(); if (collar) { c.strokeStyle = collar; c.lineWidth = 7; c.lineJoin = 'miter'; c.beginPath(); c.moveTo(0, 11); c.lineTo(230, 11); c.lineTo(256, 56); c.lineTo(282, 11); c.lineTo(512, 11); c.stroke(); } }
  else { ell(c, 256, 24, 80, 20); c.fill(); }
}
function lapels(c: Ctx, col: string) { c.fillStyle = col; c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1.5; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(256 + s * 6, 34); c.lineTo(256 + s * 44, 9); c.lineTo(256 + s * 40, 50); c.closePath(); c.fill(); c.stroke(); } c.fillStyle = col; c.fillRect(0, 8, 214, 9); c.fillRect(298, 8, 214, 9); }
function buttons(c: Ctx, col: string, ys: number[]) { for (const y of ys) { c.fillStyle = col; c.beginPath(); c.arc(256, y, 3.4, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.stroke(); } }
function folds(c: Ctx) {
  for (const x of [128, 384]) { const g = c.createLinearGradient(x - 46, 0, x + 46, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(0,0,0,0.14)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(x - 46, 30, 92, HEM - 30); }
  const g = c.createLinearGradient(0, HEM - 26, 0, HEM); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.16)'); c.fillStyle = g; c.fillRect(0, HEM - 26, 512, 26);
}


// --- atuendos: escudos originales, camisetas de club, estampados
type Crest = (c: Ctx, x: number, y: number, s: number) => void;
function shield(c: Ctx, x: number, y: number, s: number, fill: string, line: string) {
  c.beginPath(); c.moveTo(x - s, y - s); c.lineTo(x + s, y - s); c.lineTo(x + s, y + s * 0.2); c.quadraticCurveTo(x + s, y + s * 0.95, x, y + s * 1.35); c.quadraticCurveTo(x - s, y + s * 0.95, x - s, y + s * 0.2); c.closePath();
  c.fillStyle = fill; c.fill(); c.lineWidth = Math.max(2, s * 0.16); c.strokeStyle = line; c.stroke();
}
const CRESTS: Record<string, Crest> = {
  leon: (c, x, y, s) => { shield(c, x, y, s, '#ffffff', '#d62828'); c.fillStyle = '#0b3d91'; c.fillRect(x - s, y - s, s * 2, s * 0.3); c.fillStyle = '#e8a33a'; for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; ell(c, x + Math.cos(a) * s * 0.42, y + s * 0.28 + Math.sin(a) * s * 0.42, s * 0.2, s * 0.2); c.fill(); } c.fillStyle = '#f6c65b'; ell(c, x, y + s * 0.3, s * 0.36, s * 0.38); c.fill(); c.fillStyle = '#3b2414'; ell(c, x - s * 0.13, y + s * 0.2, s * 0.05, s * 0.06); c.fill(); ell(c, x + s * 0.13, y + s * 0.2, s * 0.05, s * 0.06); c.fill(); ell(c, x, y + s * 0.42, s * 0.09, s * 0.06); c.fill(); },
  aguila: (c, x, y, s) => { shield(c, x, y, s, '#0a2a6b', '#ffffff'); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(x, y + s * 0.15); c.lineTo(x - s * 0.85, y - s * 0.55); c.lineTo(x - s * 0.5, y + s * 0.2); c.lineTo(x - s * 0.15, y + s * 0.85); c.lineTo(x + s * 0.15, y + s * 0.85); c.lineTo(x + s * 0.5, y + s * 0.2); c.lineTo(x + s * 0.85, y - s * 0.55); c.closePath(); c.fill(); c.beginPath(); c.arc(x, y - s * 0.1, s * 0.2, 0, 7); c.fill(); c.fillStyle = '#ffc93c'; c.beginPath(); c.moveTo(x, y - s * 0.05); c.lineTo(x + s * 0.12, y + s * 0.12); c.lineTo(x - s * 0.04, y + s * 0.05); c.fill(); },
  engrane: (c, x, y, s) => { c.fillStyle = '#111111'; c.beginPath(); for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? s * 0.78 : s; c.lineTo(x + Math.cos(a) * r, y + s * 0.15 + Math.sin(a) * r); } c.closePath(); c.fill(); c.fillStyle = '#ffd400'; c.beginPath(); c.arc(x, y + s * 0.15, s * 0.55, 0, 7); c.fill(); c.fillStyle = '#111111'; star(c, x, y + s * 0.15, s * 0.38); },
  picos: (c, x, y, s) => { shield(c, x, y, s, '#ffffff', '#138a3c'); c.fillStyle = '#138a3c'; c.beginPath(); c.moveTo(x - s * 0.75, y + s * 0.75); c.lineTo(x - s * 0.35, y - s * 0.4); c.lineTo(x, y + s * 0.2); c.lineTo(x + s * 0.35, y - s * 0.4); c.lineTo(x + s * 0.75, y + s * 0.75); c.closePath(); c.fill(); },
  palma: (c, x, y, s) => { shield(c, x, y, s, '#ffffff', '#c1121f'); c.strokeStyle = '#8a5a34'; c.lineWidth = s * 0.16; c.beginPath(); c.moveTo(x - s * 0.1, y + s * 1.0); c.quadraticCurveTo(x + s * 0.2, y + s * 0.3, x, y - s * 0.3); c.stroke(); c.fillStyle = '#2ea44f'; for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) { ell(c, x + Math.cos(a) * s * 0.42, y - s * 0.3 + Math.sin(a) * s * 0.28, s * 0.42, s * 0.12, a); c.fill(); } c.fillStyle = '#6b3a1a'; ell(c, x + s * 0.05, y - s * 0.15, s * 0.11, s * 0.11); c.fill(); },
  jaiba: (c, x, y, s) => { shield(c, x, y, s, '#ffffff', '#1565c0'); c.fillStyle = '#1565c0'; c.fillRect(x - s, y - s, s, s * 2.4); c.fillStyle = '#ff7a3d'; ell(c, x, y + s * 0.25, s * 0.45, s * 0.3); c.fill(); for (const k of [-1, 1]) { ell(c, x + k * s * 0.55, y - s * 0.2, s * 0.17, s * 0.13); c.fill(); c.strokeStyle = '#ff7a3d'; c.lineWidth = s * 0.08; c.beginPath(); c.moveTo(x + k * s * 0.35, y + s * 0.15); c.lineTo(x + k * s * 0.55, y - s * 0.1); c.stroke(); } },
  h: (c, x, y, s) => { shield(c, x, y, s, '#ffffff', HBLUE); c.fillStyle = HBLUE; c.font = FONT(s * 1.5); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('H', x, y + s * 0.2); },
};
interface Kit { bg: string; fg: string; kind: 'band' | 'sides' | 'pin' | 'vstripes' | 'chevron' | 'halves' | 'shards'; crest: string; num: string; long?: boolean }
function jersey(c: Ctx, skin: string, o: Kit): Sleeve {
  const paint = (a: Ctx, w: number, h: number, off = 0) => {
    a.fillStyle = o.bg; a.fillRect(0, 0, w, h); a.fillStyle = o.fg;
    if (o.kind === 'band') { a.fillRect(0, 62, w, 18); a.fillStyle = '#d62828'; a.fillRect(0, 82, w, 9); }
    else if (o.kind === 'sides') { for (const x of [128, 384]) a.fillRect(x - 20 - off, 0, 40, h); a.fillStyle = '#4fc3f7'; for (const x of [128, 384]) a.fillRect(x - 6 - off, 0, 12, h); }
    else if (o.kind === 'pin') { for (let x = 4; x < w; x += 26) a.fillRect(x, 0, 5, h); }
    else if (o.kind === 'vstripes') { for (let x = 0; x < w; x += 64) a.fillRect(x + 32, 0, 28, h); }
    else if (o.kind === 'chevron') { a.beginPath(); a.moveTo(156 - off, 30); a.lineTo(256 - off, 100); a.lineTo(356 - off, 30); a.lineTo(356 - off, 54); a.lineTo(256 - off, 124); a.lineTo(156 - off, 54); a.closePath(); a.fill(); }
    else if (o.kind === 'halves') { a.fillRect(0, 0, w / 2, h); a.fillStyle = o.bg === '#ffffff' ? '#1565c0' : '#ffffff'; for (let y = 0; y < h; y += 34) a.fillRect(w / 2, y, w / 2, 14); }
    else if (o.kind === 'shards') { a.fillStyle = 'rgba(0,0,0,0.32)'; for (let x = -60; x < w; x += 70) { a.beginPath(); a.moveTo(x, 0); a.lineTo(x + 40, 0); a.lineTo(x + 90, h); a.lineTo(x + 60, h); a.closePath(); a.fill(); } }
  };
  paint(c, 512, HEM); folds(c); neck(c, skin, 'v', o.fg === o.bg ? dark(o.bg, 0.3) : o.fg);
  const crest = CRESTS[o.crest]; crest?.(c, 256, 84, 30);
  const on = lum(o.bg) > 0.55 ? '#14213d' : '#ffffff';
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = FONT(80); c.lineWidth = 6; c.strokeStyle = on === '#ffffff' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)';
  for (const x of [0, 512]) { c.strokeText(o.num, x, 100); c.fillStyle = on; c.fillText(o.num, x, 100); }
  return { len: o.long ? 236 : 100, paint: (a, len) => { a.save(); a.beginPath(); a.rect(0, 0, 128, len); a.clip(); paint(a, 128, len, 192); a.restore(); a.fillStyle = o.fg === o.bg ? dark(o.bg, 0.3) : o.fg; a.fillRect(0, len - 10, 128, 10); } };
}
function macaw(c: Ctx, x: number, y: number, s: number, flip = 1) {
  c.save(); c.translate(x, y); c.scale(flip * s, s);
  c.fillStyle = '#d62828'; c.beginPath(); c.moveTo(-4, 8); c.lineTo(-10, 46); c.lineTo(-2, 46); c.lineTo(4, 10); c.fill(); c.fillStyle = '#1e5bd8'; c.beginPath(); c.moveTo(-8, 34); c.lineTo(-10, 46); c.lineTo(-2, 46); c.lineTo(0, 34); c.fill();
  c.fillStyle = '#e63946'; ell(c, 0, 0, 9, 15, 0.2); c.fill();
  c.fillStyle = '#ffc93c'; ell(c, 5, 2, 7, 10, 0.5); c.fill(); c.fillStyle = '#2e9e4f'; ell(c, 7, 8, 6, 7, 0.5); c.fill(); c.fillStyle = '#1e5bd8'; ell(c, 8, 14, 5, 7, 0.5); c.fill();
  c.fillStyle = '#e63946'; ell(c, -2, -16, 8, 8); c.fill(); c.fillStyle = '#ffffff'; ell(c, -5, -16, 4.5, 4); c.fill(); c.fillStyle = '#111'; ell(c, -5, -16, 1.5, 1.5); c.fill();
  c.fillStyle = '#f2e6c9'; c.beginPath(); c.moveTo(-9, -19); c.quadraticCurveTo(-17, -16, -12, -8); c.lineTo(-8, -12); c.closePath(); c.fill();
  c.restore();
}
function leaf(c: Ctx, x: number, y: number, s: number, a: number) { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = '#1f8a4c'; ell(c, 0, 0, 22 * s, 8 * s); c.fill(); c.strokeStyle = '#0f5a30'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-20 * s, 0); c.lineTo(20 * s, 0); c.stroke(); c.restore(); }
function guacaPrint(a: Ctx, w: number, h: number, bg: string, seed = 2) {
  a.fillStyle = bg; a.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < w / 40; i++) leaf(a, r() * w, r() * h, 1 + r() * 0.5, r() * 3);
  for (let y = 34, row = 0; y < h + 40; y += 96, row++) for (let x = 30 + (row % 2) * 64; x < w + 50; x += 128) macaw(a, x, y, 1.55, (row + Math.round(x / 90)) % 2 ? 1 : -1);
}
function plaid(a: Ctx, w: number, h: number) {
  a.fillStyle = '#ffd21f'; a.fillRect(0, 0, w, h);
  a.fillStyle = 'rgba(0,0,0,0.85)'; for (let x = 10; x < w; x += 40) a.fillRect(x, 0, 10, h); for (let y = 10; y < h; y += 40) a.fillRect(0, y, w, 10);
  a.fillStyle = 'rgba(255,255,255,0.9)'; for (let x = 26; x < w; x += 40) a.fillRect(x, 0, 4, h); for (let y = 26; y < h; y += 40) a.fillRect(0, y, w, 4);
}
function fret(a: Ctx, x: number, y: number, w: number, h: number, bg: string, fg: string) { a.fillStyle = bg; a.fillRect(x, y, w, h); a.strokeStyle = fg; a.lineWidth = 3; a.beginPath(); for (let i = 0; i < w; i += h) { a.moveTo(x + i + 2, y + h - 3); a.lineTo(x + i + 2, y + 3); a.lineTo(x + i + h - 4, y + 3); a.lineTo(x + i + h - 4, y + h / 2); a.lineTo(x + i + h / 2, y + h / 2); } a.stroke(); }
const tiers = (a: Ctx, w: number, y0: number, h: number, cols: string[]) => { const n = cols.length, bh = h / n; cols.forEach((col, i) => { a.fillStyle = col; a.fillRect(0, y0 + i * bh, w, bh); a.fillStyle = '#ffffff'; for (let x = 0; x < w; x += 12) { a.beginPath(); a.arc(x + 6, y0 + (i + 1) * bh - 1, 4, 0, Math.PI); a.fill(); } }); };
const PUNTA = ['#00b4c6', '#ffd21f', '#ff7a1a', '#ff3d7f'];
const CLUB: Record<string, Kit> = {
  camisa_olimpia: { bg: '#ffffff', fg: '#0b3d91', kind: 'band', crest: 'leon', num: '7' },
  camisa_motagua: { bg: '#0a2a6b', fg: '#ffffff', kind: 'sides', crest: 'aguila', num: '10' },
  camisa_realespana: { bg: '#ffd400', fg: '#111111', kind: 'pin', crest: 'engrane', num: '9' },
  camisa_marathon: { bg: '#138a3c', fg: '#ffffff', kind: 'vstripes', crest: 'picos', num: '11' },
  camisa_vida: { bg: '#c1121f', fg: '#ffffff', kind: 'chevron', crest: 'palma', num: '8' },
  camisa_victoria: { bg: '#ffffff', fg: '#1565c0', kind: 'halves', crest: 'jaiba', num: '5' },
  camisa_portero: { bg: '#25c46b', fg: '#111111', kind: 'shards', crest: 'h', num: '1', long: true },
};
function trajes(c: Ctx, cfg: AvatarConfig): Sleeve | null {
  const t = cfg.shirtColor, skin = cfg.skin, m = cfg.body === 'm', id = cfg.shirt;
  if (CLUB[id]) return jersey(c, skin, CLUB[id]);
  switch (id) {
    case 'camisa_guacamaya': {
      guacaPrint(c, 512, HEM, t); folds(c); neck(c, skin, 'v'); lapels(c, dark(t, 0.15)); buttons(c, '#f2e6c9', [70, 100, 130, 158]);
      return { len: 100, paint: (a, len) => { a.save(); a.beginPath(); a.rect(0, 0, 128, len); a.clip(); guacaPrint(a, 128, len, t, 9); a.restore(); a.fillStyle = dark(t, 0.15); a.fillRect(0, len - 9, 128, 9); } };
    }
    case 'camisa_estrellas':
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, HEM); c.fillStyle = BLUE; c.fillRect(0, 0, 512, 30); c.fillRect(0, HEM - 30, 512, 30); folds(c); neck(c, skin, 'round', BLUE);
      c.fillStyle = BLUE; for (const [x, y, r] of [[256, 94, 30], [192, 58, 22], [320, 58, 22], [192, 132, 22], [320, 132, 22]]) star(c, x, y, r);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = FONT(22); for (const x of [0, 512]) c.fillText('HONDURAS', x, 80); c.font = FONT(44); for (const x of [0, 512]) c.fillText('5', x, 118);
      return { len: 100, paint: (a, len) => { a.fillStyle = '#ffffff'; a.fillRect(0, 0, 128, len); a.fillStyle = BLUE; a.fillRect(0, len - 22, 128, 22); a.fillStyle = '#ffffff'; for (let i = 0; i < 3; i++) star(a, 34 + i * 30, len - 11, 6); } };
    case 'camisa_catracho':
      c.fillStyle = '#16161a'; c.fillRect(0, 0, 512, HEM); folds(c); neck(c, skin, 'round', '#2b2b30');
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.fillStyle = BLUE; c.fillRect(170, 40, 172, 8); c.fillRect(170, 132, 172, 8);
      c.font = FONT(44); c.fillStyle = '#ffffff'; c.fillText('CATRA', 256, 72); c.fillStyle = BLUE; c.fillText('CHO', 256, 110);
      c.font = FONT(14); c.fillStyle = '#ffffff'; c.fillText('HECHO EN HONDURAS · 504', 256, 152);
      c.font = FONT(56); for (const x of [0, 512]) { c.fillStyle = BLUE; c.fillText('HN', x, 96); }
      return { len: 100, paint: (a, len) => { a.fillStyle = '#16161a'; a.fillRect(0, 0, 128, len); a.fillStyle = BLUE; a.fillRect(0, 36, 128, 8); a.fillStyle = '#ffffff'; a.fillRect(0, 44, 128, 8); a.fillStyle = BLUE; a.fillRect(0, 52, 128, 8); a.fillStyle = '#2b2b30'; a.fillRect(0, len - 9, 128, 9); } };
    case 'vestido_lenca': {
      c.fillStyle = t; c.fillRect(0, 0, 512, HEM); folds(c);
      for (const y of [50, 70]) { ribbons(c, 0, y, 512, 12, 3, y / 10); } c.fillStyle = '#ffffff'; for (let x = 0; x < 512; x += 10) { c.beginPath(); c.arc(x + 5, 86, 3.5, 0, Math.PI); c.fill(); }
      c.fillStyle = light(t, 0.25); c.fillRect(0, HEM - 22, 512, 10); neck(c, skin, m ? 'wide' : 'round', m ? undefined : dark(t, 0.3));
      if (m) { c.fillStyle = '#ffffff'; for (let x = 170; x < 342; x += 10) { c.beginPath(); c.arc(x + 5, 44 - Math.abs(x - 256) * 0.1, 4, 0, Math.PI); c.fill(); } }
      return { len: m ? 62 : 100, paint: (a, len) => { a.fillStyle = t; a.fillRect(0, 0, 128, len); ribbons(a, 0, len - 22, 128, 14, 3, 1); a.fillStyle = '#ffffff'; for (let x = 0; x < 128; x += 10) { a.beginPath(); a.arc(x + 5, len - 6, 4, 0, Math.PI); a.fill(); } } };
    }
    case 'blusa_garifuna':
      plaid(c, 512, HEM); folds(c); neck(c, skin, m ? 'wide' : 'round', '#111111');
      if (m) { c.fillStyle = '#ffffff'; c.fillRect(0, 22, 512, 10); for (let x = 0; x < 512; x += 12) { c.beginPath(); c.arc(x + 6, 32, 5, 0, Math.PI); c.fill(); } }
      return { len: m ? 70 : 100, paint: (a, len) => { a.save(); a.beginPath(); a.rect(0, 0, 128, len); a.clip(); plaid(a, 128, len); a.restore(); a.fillStyle = '#ffffff'; a.fillRect(0, len - 10, 128, 10); } };
    case 'blusa_punta':
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, HEM); tiers(c, 512, m ? 26 : 40, m ? 60 : 50, [PUNTA[2], PUNTA[0]]); folds(c);
      c.fillStyle = PUNTA[3]; c.fillRect(0, HEM - 20, 512, 14); neck(c, skin, m ? 'wide' : 'round', PUNTA[0]);
      return { len: m ? 56 : 100, paint: (a, len) => { a.fillStyle = PUNTA[0]; a.fillRect(0, 0, 128, len); tiers(a, 128, len - 26, 26, [PUNTA[1]]); } };
    case 'pecho_maya':
      c.fillStyle = skin; c.fillRect(0, 0, 512, HEM);
      if (m) { c.fillStyle = '#f4ecd8'; c.fillRect(0, 26, 512, HEM - 26); fret(c, 0, 26, 512, 22, '#1b8a6b', '#ffd34d'); fret(c, 0, HEM - 30, 512, 22, '#b3261e', '#f4ecd8'); }
      else { c.strokeStyle = '#b3261e'; c.lineWidth = 6; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(256 + s * 30, 120); c.lineTo(256 + s * 70, 150); c.moveTo(256 + s * 40, 135); c.lineTo(256 + s * 80, 160); c.stroke(); } c.fillStyle = 'rgba(0,0,0,0.08)'; ell(c, 256, 140, 30, 18); c.fill(); }
      return { len: 30, paint: (a, len) => { a.fillStyle = skin; a.fillRect(0, 0, 128, len); a.fillStyle = '#ffcf40'; a.fillRect(0, len - 12, 128, 9); a.fillStyle = '#2fae77'; a.fillRect(0, len - 9, 128, 3); } };
    case 'tunica_escriba':
      c.fillStyle = '#f4ecd8'; c.fillRect(0, 0, 512, HEM); weave(c, 512, HEM, 0.06); folds(c); fret(c, 0, HEM - 28, 512, 22, '#1b1b1e', '#e63946'); neck(c, skin, 'round', '#e63946');
      c.fillStyle = '#1b1b1e'; for (const [x, y] of [[230, 70], [282, 70], [256, 104]]) { c.fillRect(x - 10, y - 10, 20, 20); c.fillStyle = '#e63946'; ell(c, x, y, 5, 5); c.fill(); c.fillStyle = '#1b1b1e'; }
      return { len: 64, paint: (a, len) => { a.fillStyle = '#f4ecd8'; a.fillRect(0, 0, 128, len); a.fillStyle = '#e63946'; a.fillRect(0, len - 12, 128, 6); a.fillStyle = '#1b1b1e'; a.fillRect(0, len - 6, 128, 6); } };
    case 'pecho_pelota':
      c.fillStyle = skin; c.fillRect(0, 0, 512, HEM);
      if (m) { c.fillStyle = '#c9772b'; c.fillRect(0, 30, 512, HEM - 70); fret(c, 0, 30, 512, 18, '#7a3d12', '#f4ecd8'); }
      else { c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 5; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(256 + s * (40 + i * 14), 60); c.lineTo(256 + s * (30 + i * 14), 140); c.stroke(); } }
      return { len: 26, paint: (a, len) => { a.fillStyle = skin; a.fillRect(0, 0, 128, len); a.fillStyle = '#9a6a3a'; a.fillRect(0, len - 12, 128, 10); } };
  }
  return null;
}

function shirt(c: Ctx, cfg: AvatarConfig): Sleeve {
  const tr = trajes(c, cfg); if (tr) return tr;
  const t = cfg.shirtColor, skin = cfg.skin, on = lum(t) > 0.45 ? '#1d1d1f' : '#ffffff';
  const plain = (col: string, cuff?: string): Sleeve => ({ len: 100, paint: (a, len) => { a.fillStyle = col; a.fillRect(0, 0, 128, len); a.fillStyle = cuff ?? dark(col, 0.18); a.fillRect(0, len - 9, 128, 9); } });
  switch (cfg.shirt) {
    case 'camisa_rayas': {
      const b = lum(t) > 0.7 ? '#0d47a1' : '#ffffff'; c.fillStyle = b; c.fillRect(0, 0, 512, HEM); c.fillStyle = t; for (let y = 4; y < HEM; y += 24) c.fillRect(0, y, 512, 12);
      folds(c); neck(c, skin, 'round', dark(t, 0.2));
      return { len: 100, paint: (a, len) => { a.fillStyle = b; a.fillRect(0, 0, 128, len); a.fillStyle = t; for (let y = 6; y < len; y += 24) a.fillRect(0, y, 128, 12); a.fillStyle = dark(t, 0.2); a.fillRect(0, len - 8, 128, 8); } };
    }
    case 'camisa_cuadros': {
      const grid = (a: Ctx, w: number, h: number) => { a.fillStyle = t; a.fillRect(0, 0, w, h); a.fillStyle = 'rgba(0,0,0,0.24)'; for (let x = 6; x < w; x += 32) a.fillRect(x, 0, 13, h); for (let y = 6; y < h; y += 32) a.fillRect(0, y, w, 13); a.fillStyle = 'rgba(255,255,255,0.4)'; for (let x = 26; x < w; x += 32) a.fillRect(x, 0, 2.5, h); for (let y = 26; y < h; y += 32) a.fillRect(0, y, w, 2.5); };
      grid(c, 512, HEM); folds(c); c.fillStyle = light(t, 0.25); c.fillRect(249, 30, 14, HEM - 30); neck(c, skin, 'v'); lapels(c, light(t, 0.3)); buttons(c, '#ffffff', [66, 92, 118, 144]);
      return { len: 100, paint: (a, len) => { a.save(); a.beginPath(); a.rect(0, 0, 128, len); a.clip(); grid(a, 128, len); a.restore(); a.fillStyle = light(t, 0.25); a.fillRect(0, len - 10, 128, 10); } };
    }
    case 'camisa_504':
      c.fillStyle = t; c.fillRect(0, 0, 512, HEM); folds(c); neck(c, skin, 'round', dark(t, 0.25));
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.font = FONT(74); c.strokeStyle = on === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)'; c.lineWidth = 7; c.strokeText('504', 256, 112); c.fillStyle = on; c.fillText('504', 256, 112);
      c.font = FONT(15); c.fillText('CATRACHO', 256, 62); c.fillStyle = BLUE; for (let i = 0; i < 5; i++) star(c, 216 + i * 20, 154, 6);
      c.fillStyle = on; c.font = FONT(30); for (const x of [0, 512]) c.fillText('HN', x, 70);
      return plain(t, dark(t, 0.25));
    case 'camisa_h': case 'camisa_h_azul': {
      const blue = cfg.shirt === 'camisa_h_azul', bg = blue ? HBLUE : '#f7f9fc', fg = blue ? '#ffffff' : HBLUE;
      c.fillStyle = bg; c.fillRect(0, 0, 512, HEM); c.fillStyle = fg; c.fillRect(116, 0, 24, HEM); c.fillRect(372, 0, 24, HEM); c.fillStyle = BLUE; c.fillRect(124, 0, 8, HEM); c.fillRect(380, 0, 8, HEM);
      folds(c); neck(c, skin, 'v', fg);
      c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fg; c.font = FONT(98); c.fillText('H', 256, 118);
      c.fillStyle = blue ? '#ffffff' : BLUE; for (let i = 0; i < 5; i++) star(c, 256 + (i - 2) * 22, 60 - (2 - Math.abs(i - 2)) * 4, 7);
      c.fillStyle = fg; c.font = FONT(84); for (const x of [0, 512]) c.fillText(blue ? '9' : '10', x, 106); c.font = FONT(17); for (const x of [0, 512]) c.fillText('HONDURAS', x, 46);
      return { len: 100, paint: (a, len) => { a.fillStyle = bg; a.fillRect(0, 0, 128, len); a.fillStyle = fg; a.fillRect(0, len - 14, 128, 14); a.fillStyle = BLUE; a.fillRect(0, len - 9, 128, 4); a.fillStyle = fg; a.fillRect(0, 0, 128, 10); } };
    }
    case 'guayabera': {
      c.fillStyle = GUAYA; c.fillRect(0, 0, 512, HEM); folds(c);
      for (const x of [212, 300, 44, 468]) for (const d of [-5, 0, 5]) { c.strokeStyle = 'rgba(120,100,70,0.5)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(x + d, 20); c.lineTo(x + d, HEM - 4); c.stroke(); c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.moveTo(x + d + 1.6, 20); c.lineTo(x + d + 1.6, HEM - 4); c.stroke(); }
      c.strokeStyle = 'rgba(120,100,70,0.6)'; c.lineWidth = 1.6; for (const x of [212, 300]) for (const [y, h] of [[58, 24], [122, 30]]) { c.fillStyle = GUAYA; c.fillRect(x - 17, y, 34, h); c.strokeRect(x - 17, y, 34, h); c.fillStyle = '#cdbf9d'; c.beginPath(); c.arc(x, y + 5, 2.6, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(120,100,70,0.5)'; for (const x of [250, 262]) { c.beginPath(); c.moveTo(x, 34); c.lineTo(x, HEM); c.stroke(); }
      neck(c, skin, 'v'); lapels(c, '#fffdf6'); buttons(c, '#d8cdb0', [62, 86, 110, 134, 158]);
      return { len: 104, paint: (a, len) => { a.fillStyle = GUAYA; a.fillRect(0, 0, 128, len); a.strokeStyle = 'rgba(120,100,70,0.5)'; a.lineWidth = 1.6; for (const d of [-5, 0, 5]) { a.beginPath(); a.moveTo(64 + d, 8); a.lineTo(64 + d, len - 12); a.stroke(); } a.fillStyle = '#fffdf6'; a.fillRect(0, len - 12, 128, 12); a.strokeRect(-2, len - 12, 132, 14); } };
    }
    case 'camisa_manta':
      c.fillStyle = MANTA; c.fillRect(0, 0, 512, HEM); weave(c, 512, HEM); folds(c); neck(c, skin, 'round');
      c.fillStyle = skin; c.beginPath(); c.moveTo(243, 20); c.lineTo(256, 78); c.lineTo(269, 20); c.fill(); c.strokeStyle = '#7a4a22'; c.lineWidth = 2.2; for (let i = 0; i < 3; i++) { const y = 34 + i * 13, w = 11 - i * 2.5; c.beginPath(); c.moveTo(256 - w, y); c.lineTo(256 + w, y + 9); c.moveTo(256 + w, y); c.lineTo(256 - w, y + 9); c.stroke(); }
      c.save(); c.beginPath(); c.ellipse(256, 6, 50, 36, 0, 0, 7); c.ellipse(256, 6, 37, 25, 0, 0, 7); c.clip('evenodd'); trim(c, 196, 0, 120, 44); c.restore(); trim(c, 0, HEM - 18, 512, 13);
      return { len: 236, paint: (a, len) => { a.fillStyle = MANTA; a.fillRect(0, 0, 128, len); a.save(); a.beginPath(); a.rect(0, 0, 128, len); a.clip(); weave(a, 128, len); a.restore(); trim(a, 0, len - 16, 128, 12); } };
    case 'blusa_tipica':
      c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, 512, HEM); folds(c); ribbons(c, 0, 22, 512, 46, 6);
      for (let i = 0; i < 11; i++) { const x = 24 + i * 46.5, y = i % 2 ? 100 : 124; c.fillStyle = '#2ea44f'; ell(c, x - 6, y + 4, 5, 2.4, 0.5); c.fill(); ell(c, x + 6, y + 4, 5, 2.4, -0.5); c.fill(); c.fillStyle = RIBBON[i % 6 === 2 ? 4 : i % 6]; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(x + Math.cos(k * 1.257) * 4, y + Math.sin(k * 1.257) * 4, 3, 0, 7); c.fill(); } c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill(); }
      c.fillStyle = '#e63946'; c.fillRect(0, HEM - 18, 512, 12); c.fillStyle = '#ffc93c'; c.fillRect(0, HEM - 14, 512, 3); neck(c, skin, 'wide');
      return { len: 78, paint: (a, len) => { a.fillStyle = '#fbfbf8'; a.fillRect(0, 0, 128, len); ribbons(a, 0, len - 30, 128, 30, 4, 2); } };
    default:
      c.fillStyle = t; c.fillRect(0, 0, 512, HEM); folds(c); neck(c, skin, 'round', dark(t, 0.22));
      c.fillStyle = 'rgba(255,255,255,0.1)'; ell(c, 256, 90, 70, 50); c.fill();
      return plain(t);
  }
}

const JEAN = '#3f6fb4';
function pantsTop(c: Ctx, cfg: AvatarConfig) {
  const t = cfg.pantsColor, y0 = HEM, h = 256 - HEM, p = cfg.pants;
  const belt = (col: string) => { c.fillStyle = col; c.fillRect(0, y0, 512, 9); c.fillStyle = '#e8c458'; c.fillRect(248, y0 - 1, 16, 11); c.fillStyle = col; c.fillRect(252, y0 + 2, 8, 5); };
  const fly = (col: string) => { c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.moveTo(256, y0 + 9); c.lineTo(256, 256); c.stroke(); for (const s of [-1, 1]) { c.beginPath(); c.arc(256 + s * 108, y0 + 4, 44, s > 0 ? Math.PI * 0.5 : 0, s > 0 ? Math.PI : Math.PI * 0.5); c.stroke(); } };
  if (p === 'jeans') { c.fillStyle = JEAN; c.fillRect(0, y0, 512, h); c.setLineDash([4, 3]); fly('#f0a03c'); c.setLineDash([]); belt('#5a3a22'); for (const x of [40, 472]) { c.strokeStyle = '#f0a03c'; c.lineWidth = 1.4; c.setLineDash([4, 3]); c.strokeRect(x - 26, y0 + 22, 52, 46); c.setLineDash([]); } }
  else if (p === 'short_futbol') { c.fillStyle = t; c.fillRect(0, y0, 512, h); const o = lum(t) > 0.7 ? HBLUE : '#ffffff'; c.fillStyle = o; c.fillRect(120, y0, 16, h); c.fillRect(376, y0, 16, h); c.fillStyle = dark(t, 0.2); c.fillRect(0, y0, 512, 7); c.strokeStyle = o; c.lineWidth = 2.4; c.beginPath(); c.moveTo(256, y0 + 6); c.lineTo(248, y0 + 26); c.moveTo(256, y0 + 6); c.lineTo(264, y0 + 26); c.stroke(); }
  else if (p === 'pantalon_manta') { c.fillStyle = MANTA; c.fillRect(0, y0, 512, h); c.save(); c.translate(0, y0); weave(c, 512, h); c.restore(); c.fillStyle = '#c9b68a'; c.fillRect(0, y0, 512, 7); c.strokeStyle = '#a07a3c'; c.lineWidth = 2.4; c.beginPath(); c.moveTo(256, y0 + 6); c.quadraticCurveTo(240, y0 + 20, 246, y0 + 34); c.moveTo(256, y0 + 6); c.quadraticCurveTo(272, y0 + 20, 266, y0 + 34); c.stroke(); }
  else if (p === 'falda_tipica') { c.fillStyle = SKIRT; c.fillRect(0, y0, 512, h); c.fillStyle = '#ffc93c'; c.fillRect(0, y0, 512, 8); c.fillStyle = '#ffffff'; c.fillRect(0, y0 + 8, 512, 2); }
  else if (cut(cfg) !== 'pants') { region(c, [0, y0, 512, h], () => skirt(c, cfg, 512, h)); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, y0, 512, 6); }
  else if (p === 'falda_lenca') { c.fillStyle = '#1d2a4a'; c.fillRect(0, y0, 512, h); belt('#3a2416'); }
  else if (p === 'falda_garifuna' || p === 'falda_punta') { c.fillStyle = '#f7f5ee'; c.fillRect(0, y0, 512, h); c.fillStyle = p === 'falda_punta' ? PUNTA[2] : '#ffd21f'; c.fillRect(0, y0, 512, 12); c.fillStyle = '#111'; c.fillRect(0, y0 + 12, 512, 3); }
  else { c.fillStyle = t; c.fillRect(0, y0, 512, h); fly(dark(t, 0.3)); belt(lum(t) < 0.08 ? '#6b4a2a' : '#2a2018'); }
  const g = c.createLinearGradient(0, y0, 0, y0 + 14); g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0)'); if (cut(cfg) === 'pants') { c.fillStyle = g; c.fillRect(0, y0 + 9, 512, 14); }
}
function leg(c: Ctx, cfg: AvatarConfig) {
  const t = cfg.pantsColor, p = cfg.pants, W = 128, H = 256;
  c.fillStyle = cfg.skin; c.fillRect(0, 0, W, H);
  const seams = (col: string, to: number) => { c.strokeStyle = col; c.lineWidth = 1.5; for (const x of [32, 96]) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, to); c.stroke(); } };
  const shadeFront = (to: number) => { const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(0,0,0,0.12)'); g.addColorStop(0.5, 'rgba(255,255,255,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); c.fillStyle = g; c.fillRect(0, 0, W, to); };
  if (p === 'jeans') { c.fillStyle = JEAN; c.fillRect(0, 0, W, H); shadeFront(H); c.fillStyle = 'rgba(255,255,255,0.14)'; ell(c, 64, 126, 22, 30); c.fill(); c.setLineDash([4, 3]); seams('#f0a03c', 236); c.setLineDash([]); c.fillStyle = '#9dbde6'; c.fillRect(0, 234, W, 22); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(0, 232, W, 2.5); }
  else if (p === 'short_futbol') { const o = lum(t) > 0.7 ? HBLUE : '#ffffff'; c.fillStyle = t; c.fillRect(0, 0, W, 104); shadeFront(104); c.fillStyle = o; c.fillRect(26, 0, 12, 104); c.fillRect(90, 0, 12, 104); c.fillRect(0, 97, W, 7); c.fillStyle = '#f4f4f4'; c.fillRect(0, 150, W, 106); c.fillStyle = lum(t) > 0.7 ? HBLUE : t; c.fillRect(0, 154, W, 9); c.fillRect(0, 168, W, 5); }
  else if (p === 'pantalon_manta') { c.fillStyle = MANTA; c.fillRect(0, 0, W, 214); c.save(); c.beginPath(); c.rect(0, 0, W, 214); c.clip(); weave(c, W, 214); c.restore(); shadeFront(214); trim(c, 0, 200, W, 13); }
  else if (p === 'falda_tipica') { c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, 60); }
  else if (cut(cfg) !== 'pants') { if (cut(cfg) === 'faldellin' || cut(cfg) === 'escriba' || cut(cfg) === 'yugo') { c.strokeStyle = '#7a4a22'; c.lineWidth = 4; c.beginPath(); for (let y = 196; y < 250; y += 14) { c.moveTo(0, y); c.lineTo(W, y + 10); } c.stroke(); c.fillStyle = '#ffcf40'; c.fillRect(0, 186, W, 6); } }
  else if (p === 'falda_lenca') { c.fillStyle = '#1d2a4a'; c.fillRect(0, 0, W, H); shadeFront(H); seams('#2f3d63', H); }
  else if (p === 'falda_garifuna' || p === 'falda_punta') { c.fillStyle = '#f7f5ee'; c.fillRect(0, 0, W, 230); shadeFront(230); if (p === 'falda_punta') tiers(c, W, 196, 32, [PUNTA[0], PUNTA[3]]); else { c.save(); c.beginPath(); c.rect(0, 200, W, 30); c.clip(); plaid(c, W, 256); c.restore(); } }
  else { c.fillStyle = t; c.fillRect(0, 0, W, H); shadeFront(H); seams(dark(t, 0.3), H); c.fillStyle = dark(t, 0.18); c.fillRect(0, 246, W, 10); }
}
const SKIRT = '#d81b60';
function skirt(c: Ctx, cfg: AvatarConfig, W = 256, H = 256) {
  const p = cfg.pants, t = cfg.pantsColor;
  if (p === 'falda_lenca') {
    c.fillStyle = t; c.fillRect(0, 0, W, H); for (const [y, n] of [[H * 0.42, 0], [H * 0.62, 2], [H * 0.8, 4]] as const) ribbons(c, 0, y, W, 16, 3, n);
    c.fillStyle = '#ffffff'; c.fillRect(0, H - 14, W, 14); c.fillStyle = t; for (let x = 0; x < W; x += 12) { c.beginPath(); c.arc(x + 6, H - 14, 4, 0, Math.PI); c.fill(); }
  } else if (p === 'falda_garifuna') { plaid(c, W, H); c.fillStyle = '#ffffff'; c.fillRect(0, H - 18, W, 10); c.fillStyle = '#111'; c.fillRect(0, H - 8, W, 8); }
  else if (p === 'falda_punta') tiers(c, W, 0, H, ['#ffffff', ...PUNTA]);
  else if (p === 'faldellin_maya') { c.fillStyle = '#b3261e'; c.fillRect(0, 0, W, H); fret(c, 0, 8, W, 24, '#1b8a6b', '#ffd34d'); fret(c, 0, H * 0.55, W, 24, '#1b8a6b', '#ffd34d'); c.fillStyle = '#ffd34d'; for (let x = 0; x < W; x += 10) c.fillRect(x + 2, H - 26, 5, 26); c.fillStyle = '#2fae77'; for (let x = 0; x < W; x += 30) { ell(c, x + 15, H * 0.4, 8, 10); c.fill(); } }
  else if (p === 'faldellin_escriba') { c.fillStyle = '#f4ecd8'; c.fillRect(0, 0, W, H); weave(c, W, H, 0.06); fret(c, 0, H - 40, W, 24, '#1b1b1e', '#e63946'); c.fillStyle = '#e63946'; c.fillRect(0, 0, W, 10); }
  else if (p === 'yugo_pelota') { c.fillStyle = '#8a5a34'; c.fillRect(0, 0, W, H); c.fillStyle = '#f4ecd8'; c.fillRect(0, H * 0.3, W, 12); c.fillStyle = '#b3261e'; c.fillRect(0, H * 0.3 + 14, W, 6); }
  else {
    c.fillStyle = SKIRT; c.fillRect(0, 0, 256, 256);
    const bands: [string, number][] = [['#ffc93c', 12], ['#ffffff', 3], ['#00a3d7', 13], ['#ffffff', 3], ['#2ea44f', 13], ['#ffffff', 3], ['#ff7a3d', 13], ['#ffffff', 3], ['#7b5cff', 13], ['#ffffff', 3], ['#ffc93c', 8]];
    let y = 126; for (const [col, h] of bands) { c.fillStyle = col; c.fillRect(0, y, 256, h); y += h; } c.fillStyle = '#ffc93c'; c.fillRect(0, 66, 256, 5); c.fillStyle = '#ffffff'; c.fillRect(0, 74, 256, 2.5);
    c.fillStyle = '#ffffff'; c.fillRect(0, 238, 256, 18); c.fillStyle = SKIRT; for (let x = 0; x < 256; x += 16) { c.beginPath(); c.arc(x + 8, 238, 5, 0, Math.PI); c.fill(); }
  }
  for (let x = 0; x < W; x += W / 12) { const g = c.createLinearGradient(x, 0, x + W / 12, 0); g.addColorStop(0, 'rgba(0,0,0,0.2)'); g.addColorStop(0.35, 'rgba(0,0,0,0)'); g.addColorStop(0.75, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); c.fillStyle = g; c.fillRect(x, 0, W / 12, H); }
}
function cape(c: Ctx) {
  c.fillStyle = BLUE; c.fillRect(0, 0, 192, 256); c.fillStyle = '#ffffff'; c.fillRect(0, 85, 192, 86); c.fillStyle = BLUE; for (const [x, y] of [[96, 128], [58, 108], [134, 108], [58, 148], [134, 148]]) star(c, x, y, 12);
  for (let x = 0; x < 192; x += 32) { const g = c.createLinearGradient(x, 0, x + 32, 0); g.addColorStop(0, 'rgba(0,0,0,0.12)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); c.fillStyle = g; c.fillRect(x, 0, 32, 256); }
}
function patterns(c: Ctx, cfg: AvatarConfig) {
  region(c, R.patA, (w, h) => { if (cfg.hat === 'panuelo_garifuna') { plaid(c, w, h); return; } if (cfg.hat === 'panuelo_punta') { for (let i = 0; i * 16 < h; i++) { c.fillStyle = PUNTA[i % 4]; c.fillRect(0, i * 16, w, 16); } c.fillStyle = '#ffffff'; for (let x = 0; x < w; x += 18) for (let y = 8; y < h; y += 32) { c.beginPath(); c.arc(x + 9, y, 3, 0, 7); c.fill(); } return; } const cols = ['#d81b60', '#ffc93c', '#7b1fa2', '#00a3d7', '#ffffff', '#2ea44f', '#ff7a3d', '#d81b60']; for (let i = 0; i * 9 < h; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(0, i * 9, w, 9); } c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 1.4; for (const y of [22, 49, 76]) { c.beginPath(); for (let x = 0; x <= w; x += 6) c.lineTo(x, y + ((x / 6) % 2 ? 4 : -1)); c.stroke(); } });
  region(c, R.patB1, (w, h) => { c.fillStyle = '#8a5a34'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(40,22,10,0.55)'; c.lineWidth = 1.6; for (let x = 0; x <= w; x += 12) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } c.strokeStyle = '#f0e2c0'; c.lineWidth = 2.4; c.beginPath(); for (let i = 0; i <= 8; i++) c.lineTo((i * w) / 8, i % 2 ? 78 : 8); c.stroke(); c.fillStyle = '#e63946'; c.fillRect(0, 0, w, 7); c.fillStyle = '#ffc93c'; c.fillRect(0, 80, w, 4); });
  region(c, R.patB2, (w, h) => { c.fillStyle = '#fbfbf8'; c.fillRect(0, 0, w, h); ribbons(c, 0, 4, w, 70, 5); c.fillStyle = '#ffffff'; for (let x = 0; x < w; x += 8) { c.beginPath(); c.arc(x + 4, 78, 4, 0, 7); c.fill(); } });
}
function swatches(c: Ctx, cfg: AvatarConfig) {
  const hat = cfg.hat, p = cfg.pants, k = cut(cfg), maya = k === 'faldellin' || k === 'escriba' || k === 'yugo', folk = maya || p === 'pantalon_manta' || p === 'falda_tipica' || p.startsWith('falda_');
  const cols: Record<SwatchName, string> = {
    skin: cfg.skin, lid: mix(cfg.skin, '#5a2a1a', 0.12), hair: cfg.hairColor,
    hat: hat === 'casco_explorador' ? '#d9c89a' : cfg.hatColor, hat2: hat === 'casco_explorador' ? '#8a6a3a' : dark(cfg.hatColor, 0.3),
    acc: cfg.accColor, acc2: dark(cfg.accColor, 0.32),
    shoe: p === 'short_futbol' ? '#1d1d1f' : maya ? '#b07a45' : folk ? '#8a5a34' : '#3a4352', sole: folk ? '#4e3420' : '#f4f4f4',
    white: '#f5f5f5', black: '#1b1b1e', gold: '#ffcf40', jade: '#2fae77', lens: '#0c0d10', straw: '#e6c97c', wood: '#cf8f3e', red: '#e63946', blue: BLUE, green: '#2ea44f', yellow: '#ffc93c', pink: '#ff5d9e', purple: '#7b5cff', leather: '#9a6a3a', drum: '#eadfc4',
  };
  for (const n of SWATCH) region(c, swatchCell(n), (w, h) => {
    c.fillStyle = cols[n]; c.fillRect(0, 0, w, h);
    if (n === 'lid') { c.fillStyle = '#22140e'; c.fillRect(0, 44, w, 20); }
    else if (n === 'hair') { const r = rng(5); for (let i = 0; i < 26; i++) { c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.16)'; c.lineWidth = 1 + r() * 1.5; const x = r() * w; c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + (r() - 0.5) * 14, h / 2, x + (r() - 0.5) * 8, h); c.stroke(); } }
    else if (n === 'straw' || n === 'leather') { c.strokeStyle = n === 'straw' ? 'rgba(120,84,20,0.35)' : 'rgba(40,20,5,0.18)'; c.lineWidth = 1; c.beginPath(); for (let y = 0; y < h; y += 3) { c.moveTo(0, y); c.lineTo(w, y); } if (n === 'straw') for (let x = 0; x < w; x += 5) { c.moveTo(x, 0); c.lineTo(x, h); } c.stroke(); }
    else if (n === 'wood') { c.strokeStyle = 'rgba(90,45,10,0.3)'; c.lineWidth = 1.2; for (let y = 3; y < h; y += 5) { c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y + 1); c.stroke(); } }
    else if (n === 'jade') { const r = rng(3); for (let i = 0; i < 14; i++) { c.fillStyle = r() < 0.5 ? 'rgba(200,255,220,0.25)' : 'rgba(0,70,40,0.25)'; ell(c, r() * w, r() * h, 4 + r() * 8, 2 + r() * 5, r() * 3); c.fill(); } }
    else if (n === 'red' || n === 'blue' || n === 'green' || n === 'yellow' || n === 'pink' || n === 'purple') { const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,0,0.2)'); g.addColorStop(0.5, 'rgba(255,255,255,0.22)'); g.addColorStop(1, 'rgba(0,0,0,0.2)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
  });
}
/** correas y bandas que se dibujan sobre la camisa */
function overlays(c: Ctx, cfg: AvatarConfig) {
  const a = cfg.acc;
  // una banda diagonal que da la vuelta al torso: del hombro izquierdo (derecha de la imagen) a la cadera contraria
  const sash = (w: number, paint: (c: Ctx, w: number, len: number) => void) => {
    for (const [x0, y0, x1, y1] of [[330, 0, 178, HEM + 6], [434, 0, 590, HEM + 6], [-78, 0, 78, HEM + 6]]) { const len = Math.hypot(x1 - x0, y1 - y0); c.save(); c.translate(x0, y0); c.rotate(Math.atan2(y1 - y0, x1 - x0)); paint(c, w, len); c.restore(); }
  };
  if (a === 'mochila') { const col = dark(cfg.accColor, 0.25); for (const x of [208, 304]) { c.fillStyle = col; c.fillRect(x - 9, 0, 18, 150); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x - 9, 0, 3, 150); c.fillStyle = '#c9c9c9'; c.fillRect(x - 10, 118, 20, 7); } c.fillStyle = col; for (const x of [0, 494]) c.fillRect(x, 0, 18, 40); }
  else if (a === 'banda_bandera') sash(40, (k, w, len) => { k.fillStyle = BLUE; k.fillRect(0, -w / 2, len, w); k.fillStyle = '#ffffff'; k.fillRect(0, -w / 6, len, w / 3); k.fillStyle = BLUE; for (let i = 0; i < 5; i++) star(k, len * 0.3 + i * 17, 0, 5.5); k.fillStyle = '#e8c458'; k.fillRect(0, -w / 2 - 2, len, 2.5); k.fillRect(0, w / 2 - 0.5, len, 2.5); });
  else if (a === 'guitarra') sash(13, (k, w, len) => { k.fillStyle = '#5a3a22'; k.fillRect(0, -w / 2, len, w); k.fillStyle = '#e8c458'; for (let x = 8; x < len; x += 16) { k.beginPath(); k.arc(x, 0, 1.8, 0, 7); k.fill(); } });
  else if (a === 'tambor_garifuna') { c.strokeStyle = '#e63946'; c.lineWidth = 9; c.lineCap = 'butt'; c.beginPath(); c.moveTo(222, 0); c.lineTo(250, HEM - 20); c.moveTo(300, 0); c.lineTo(282, HEM - 20); c.stroke(); c.strokeStyle = '#ffc93c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(222, 0); c.lineTo(250, HEM - 20); c.moveTo(300, 0); c.lineTo(282, HEM - 20); c.stroke(); c.fillStyle = '#e63946'; c.fillRect(0, 0, 60, 12); c.fillRect(452, 0, 60, 12); }
}

const cache = new Map<string, THREE.CanvasTexture>();
export const configKey = (c: AvatarConfig) => [c.body ?? 'h', c.skin, c.hair, c.hairColor, c.face, c.shirt, c.shirtColor, c.pants, c.pantsColor, c.hat, c.hatColor, c.acc, c.accColor].join('|');
/** textura del avatar para una configuración (cacheada; las más viejas se liberan y se vuelven a subir si hacen falta) */
export function avatarAtlas(cfg: AvatarConfig): THREE.CanvasTexture {
  const key = configKey(cfg); let t = cache.get(key); if (t) return t;
  const cv = document.createElement('canvas'); cv.width = AW; cv.height = AH; const c = cv.getContext('2d')!;
  c.fillStyle = cfg.skin; c.fillRect(0, 0, AW, AH);
  region(c, R.face, () => face(c, cfg));
  let sl: Sleeve | null = null;
  region(c, R.torso, () => { sl = shirt(c, cfg); overlays(c, cfg); pantsTop(c, cfg); });
  region(c, R.arm, () => { c.fillStyle = cfg.skin; c.fillRect(0, 0, 128, 256); c.save(); c.beginPath(); c.rect(0, 0, 128, sl!.len); c.clip(); sl!.paint(c, sl!.len); c.restore(); const g = c.createLinearGradient(0, sl!.len, 0, sl!.len + 10); g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, sl!.len, 128, 10); });
  region(c, R.leg, () => leg(c, cfg)); region(c, R.skirt, () => skirt(c, cfg)); region(c, R.cape, () => cape(c)); patterns(c, cfg); swatches(c, cfg);
  t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  cache.set(key, t);
  if (cache.size > 64) { const old = cache.keys().next().value!; cache.get(old)!.dispose(); cache.delete(old); }
  return t;
}

let orm: THREE.DataTexture | null = null;
/** rugosidad (G) y metal (B) por región del atlas; igual para todos los avatares */
export function avatarORM(): THREE.DataTexture {
  if (orm) return orm;
  const k = 4, w = AW / k, h = AH / k, d = new Uint8Array(w * h * 4);
  const fill = (r: Rect, rough: number, metal = 0) => { for (let y = r[1] / k; y < (r[1] + r[3]) / k; y++) for (let x = r[0] / k; x < (r[0] + r[2]) / k; x++) { const o = ((h - 1 - y) * w + x) * 4; d[o] = 255; d[o + 1] = rough * 255; d[o + 2] = metal * 255; d[o + 3] = 255; } };
  fill([0, 0, AW, AH], 0.8); fill(R.face, 0.6); fill(R.torso, 0.86); fill(R.skirt, 0.62); fill(R.arm, 0.74); fill(R.leg, 0.8); fill(R.cape, 0.66);
  const sw: Partial<Record<SwatchName, [number, number?]>> = { skin: [0.6], lid: [0.6], hair: [0.48], shoe: [0.42], gold: [0.3, 1], jade: [0.16], lens: [0.1], straw: [0.92], wood: [0.42], black: [0.5], leather: [0.6], red: [0.55], blue: [0.55], green: [0.55], yellow: [0.55], pink: [0.55], purple: [0.55] };
  for (const n of SWATCH) { const v = sw[n]; if (v) fill(swatchCell(n), v[0], v[1] ?? 0); }
  orm = new THREE.DataTexture(d, w, h, THREE.RGBAFormat); orm.magFilter = orm.minFilter = THREE.NearestFilter; orm.needsUpdate = true; return orm;
}
