// Atlas del avatar (512×512, un lienzo por combinación de prendas): cara, torso de frente y de espalda, manga,
// pierna, falda, capa de la bandera, banda y muestras de color. Todo dibujado con Canvas 2D, sin imágenes.
import * as THREE from 'three';
import type { AvatarConfig } from '../../../../core/types';
import type { Rect } from './geo';

export const AT = 512;
type Px = [number, number, number, number];
const uvOf = (p: Px): Rect => [(p[0] + 1) / AT, 1 - (p[1] + p[3] - 1) / AT, (p[0] + p[2] - 1) / AT, 1 - (p[1] + 1) / AT];
const PX = {
  face: [4, 4, 192, 128] as Px, tf: [204, 4, 144, 136] as Px, tb: [356, 4, 144, 136] as Px, sleeve: [4, 140, 64, 64] as Px, leg: [76, 140, 64, 128] as Px,
  skirt: [148, 148, 256, 96] as Px, cape: [412, 148, 96, 128] as Px, sash: [4, 276, 192, 40] as Px, ruffle: [4, 324, 192, 32] as Px, scarf: [204, 300, 128, 64] as Px,
  skin: [4, 480, 16, 16] as Px, shirt: [28, 480, 16, 16] as Px, pants: [52, 480, 16, 16] as Px,
};
export const UV = Object.fromEntries(Object.entries(PX).map(([k, p]) => [k, uvOf(p)])) as Record<keyof typeof PX, Rect>;
/** mitad de arriba / de abajo de un rectángulo UV */
export const topHalf = (r: Rect): Rect => [r[0], (r[1] + r[3]) / 2, r[2], r[3]];
export const botHalf = (r: Rect): Rect => [r[0], r[1], r[2], (r[1] + r[3]) / 2];
/** franja vertical delgada (para los costados del torso) */
export const strip = (r: Rect): Rect => [r[0] + (r[2] - r[0]) * 0.02, r[1], r[0] + (r[2] - r[0]) * 0.2, r[3]];

export const FLAG_BLUE = '#00bce4', H_BLUE = '#1257c4', JEANS = '#3a6bb5', MANTA = '#f3e9d2', GUAYA = '#fbf8ee';
const FONT = '900 SIZEpx "Arial Black", "Fredoka", "Nunito", Impact, system-ui, sans-serif';
type Ctx = CanvasRenderingContext2D;
const col = new THREE.Color();
const sh = (hex: string, k: number) => { col.set(hex); if (k >= 0) col.lerp(new THREE.Color('#ffffff'), k); else col.multiplyScalar(1 + k); return '#' + col.getHexString(); };
const lum = (hex: string) => { col.set(hex); return col.getHSL({ h: 0, s: 0, l: 0 }).l; };
function star(c: Ctx, x: number, y: number, r: number) { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
function region(c: Ctx, p: Px, bg: string, draw: (w: number, h: number) => void) {
  c.save(); c.fillStyle = bg; c.fillRect(p[0] - 3, p[1] - 3, p[2] + 6, p[3] + 6);
  c.beginPath(); c.rect(p[0] - 1, p[1] - 1, p[2] + 2, p[3] + 2); c.clip(); c.translate(p[0], p[1]); draw(p[2], p[3]); c.restore();
}
function text(c: Ctx, t: string, x: number, y: number, size: number, fill: string, stroke?: string) {
  c.font = FONT.replace('SIZE', String(size)); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (stroke) { c.lineWidth = size * 0.16; c.strokeStyle = stroke; c.strokeText(t, x, y); } c.fillStyle = fill; c.fillText(t, x, y);
}
/** la H de la selección, hecha con rectángulos para que no dependa de ninguna fuente */
function bigH(c: Ctx, x: number, y: number, w: number, h: number, fill: string) { c.fillStyle = fill; const t = w * 0.3; c.fillRect(x - w / 2, y - h / 2, t, h); c.fillRect(x + w / 2 - t, y - h / 2, t, h); c.fillRect(x - w / 2, y - h * 0.16, w, h * 0.32); }

// ------------------------------------------------------------------ cara
function drawFace(c: Ctx, id: string, skin: string) {
  // unidades: centímetros sobre la cabeza; (0,0) = centro de la cara, y hacia abajo
  c.translate(96, 64); c.scale(4.27, 3.2);
  const dark = '#17191f', eyeY = -1.2, ex = 7.2, mouthY = 8;
  const eye = (x: number, big = 1) => { c.fillStyle = dark; c.beginPath(); c.ellipse(x, eyeY, 1.75 * big, 3 * big, 0, 0, 7); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(x + 0.55, eyeY - 1.2, 0.6 * big, 0.9 * big, 0, 0, 7); c.fill(); };
  const smile = (w: number, d: number, y = mouthY, lw = 1.25) => { c.strokeStyle = dark; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(-w, y - d * 0.4); c.quadraticCurveTo(0, y + d, w, y - d * 0.4); c.stroke(); };
  const brow = (x: number, tilt: number, thick = 0.9) => { c.strokeStyle = dark; c.lineWidth = thick; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - 2.6, eyeY - 5.6 + tilt * Math.sign(x)); c.lineTo(x + 2.6, eyeY - 5.6 - tilt * Math.sign(x)); c.stroke(); };
  const blush = (a = 0.3) => { c.fillStyle = `rgba(255,90,110,${a})`; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(s * 11.5, 4.2, 2.8, 2.1, 0, 0, 7); c.fill(); } };
  if (id === 'cara_feliz') {
    eye(-ex, 1.12); eye(ex, 1.12); brow(-ex, -0.5, 0.8); brow(ex, -0.5, 0.8); blush(0.22);
    c.fillStyle = '#7a1c2c'; c.beginPath(); c.moveTo(-6.4, mouthY - 2.4); c.quadraticCurveTo(0, mouthY - 3.2, 6.4, mouthY - 2.4); c.quadraticCurveTo(5.4, mouthY + 5.6, 0, mouthY + 5.6); c.quadraticCurveTo(-5.4, mouthY + 5.6, -6.4, mouthY - 2.4); c.fill();
    c.save(); c.clip(); c.fillStyle = '#ffffff'; c.fillRect(-7, mouthY - 3.4, 14, 2.6); c.fillStyle = '#ff7a8c'; c.beginPath(); c.ellipse(0, mouthY + 5.2, 3.6, 2.4, 0, 0, 7); c.fill(); c.restore();
  } else if (id === 'cara_guino') {
    eye(-ex); c.strokeStyle = dark; c.lineWidth = 1.3; c.lineCap = 'round'; c.beginPath(); c.moveTo(ex - 2.6, eyeY + 0.8); c.quadraticCurveTo(ex, eyeY - 2.6, ex + 2.6, eyeY + 0.8); c.stroke(); brow(-ex, -0.9);
    c.strokeStyle = dark; c.lineWidth = 1.25; c.beginPath(); c.moveTo(-5.2, mouthY - 0.6); c.quadraticCurveTo(1, mouthY + 4.2, 6.2, mouthY - 2.6); c.stroke();
    c.fillStyle = '#ff7a8c'; c.beginPath(); c.ellipse(3.3, mouthY + 2.1, 1.7, 1.9, -0.5, 0, 7); c.fill();
  } else if (id === 'cara_pecas') {
    eye(-ex); eye(ex); smile(5.2, 3.2); blush(0.3); c.fillStyle = 'rgba(122,62,28,0.85)';
    for (const s of [-1, 1]) for (const [dx, dy] of [[0, 0], [2.3, 1], [-2.2, 1.1], [1, -1.5], [-1.2, -1.3], [0.2, 2.2]]) { c.beginPath(); c.ellipse(s * 11 + dx, 3.6 + dy, 0.55, 0.6, 0, 0, 7); c.fill(); }
    c.beginPath(); c.ellipse(-0.9, 2.6, 0.5, 0.55, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(1.1, 3.1, 0.5, 0.55, 0, 0, 7); c.fill();
  } else if (id === 'cara_bigote') {
    eye(-ex); eye(ex); brow(-ex, 0.7, 1.5); brow(ex, 0.7, 1.5);
    c.fillStyle = '#2a1a12'; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(0, mouthY - 3.6); c.bezierCurveTo(s * 3, mouthY - 5.2, s * 8, mouthY - 3.4, s * 10.5, mouthY + 0.4); c.bezierCurveTo(s * 7.5, mouthY + 1.2, s * 3, mouthY + 1.4, 0, mouthY - 0.6); c.fill(); }
    smile(3, 1.6, mouthY + 3.4, 1);
  } else if (id === 'cara_lentes') {
    c.fillStyle = '#14161b'; c.strokeStyle = '#14161b'; c.lineWidth = 1.2;
    for (const s of [-1, 1]) { c.beginPath(); c.roundRect(s * ex - 5.2, eyeY - 3.6, 10.4, 7.4, [1.5, 1.5, 3.4, 3.4]); c.fill(); }
    c.beginPath(); c.moveTo(-3, eyeY - 2.2); c.lineTo(3, eyeY - 2.2); c.moveTo(-12, eyeY - 2.4); c.lineTo(-22, eyeY - 3); c.moveTo(12, eyeY - 2.4); c.lineTo(22, eyeY - 3); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 0.8; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * ex - 3.4, eyeY + 1.6); c.lineTo(s * ex - 0.6, eyeY - 2.4); c.moveTo(s * ex - 1.4, eyeY + 1.8); c.lineTo(s * ex + 0.6, eyeY - 1.2); c.stroke(); }
    smile(5, 3);
  } else { eye(-ex); eye(ex); smile(5.6, 3.6); }
  void skin;
}

// ------------------------------------------------------------------ camisas
export interface ShirtInfo { sleeve: 'short' | 'long' | 'puff'; tail: boolean; base: string; ruffle?: boolean; sash?: string }
export function shirtInfo(cfg: AvatarConfig): ShirtInfo {
  switch (cfg.shirt) {
    case 'camisa_h': return { sleeve: 'short', tail: false, base: '#ffffff' };
    case 'camisa_h_azul': return { sleeve: 'short', tail: false, base: H_BLUE };
    case 'guayabera': return { sleeve: 'short', tail: true, base: GUAYA };
    case 'camisa_manta': return { sleeve: 'long', tail: true, base: MANTA, sash: '#d62839' };
    case 'blusa_tipica': return { sleeve: 'puff', tail: false, base: '#ffffff', ruffle: true };
    default: return { sleeve: 'short', tail: false, base: cfg.shirtColor };
  }
}
const RIBBONS = ['#e63946', '#ffc93c', '#2ea44f', '#1e88e5', '#ff5d9e'];
function neck(c: Ctx, w: number, skin: string, trim: string, rx = 21, ry = 11) { c.fillStyle = trim; c.beginPath(); c.ellipse(w / 2, -1, rx + 4, ry + 4, 0, 0, 7); c.fill(); c.fillStyle = skin; c.beginPath(); c.ellipse(w / 2, -1, rx, ry, 0, 0, 7); c.fill(); }
function collar(c: Ctx, w: number, skin: string, fill: string, line: string) {
  c.fillStyle = skin; c.beginPath(); c.moveTo(w / 2 - 16, -1); c.lineTo(w / 2, 22); c.lineTo(w / 2 + 16, -1); c.fill();
  c.fillStyle = fill; c.strokeStyle = line; c.lineWidth = 1.5;
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(w / 2 + s * 30, -1); c.lineTo(w / 2 + s * 24, 20); c.lineTo(w / 2 + s * 3, 24); c.lineTo(w / 2 + s * 15, -1); c.closePath(); c.fill(); c.stroke(); }
}
function shadeBody(c: Ctx, w: number, h: number) { const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.13)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
function plaid(c: Ctx, w: number, h: number, base: string) {
  c.fillStyle = base; c.fillRect(0, 0, w, h); const d = sh(base, -0.38), l = sh(base, 0.45);
  c.globalAlpha = 0.5; c.fillStyle = d; for (let x = 6; x < w; x += 28) c.fillRect(x, 0, 12, h); for (let y = 8; y < h; y += 28) c.fillRect(0, y, w, 12);
  c.globalAlpha = 0.7; c.fillStyle = l; for (let x = 24; x < w; x += 28) c.fillRect(x, 0, 2.5, h); for (let y = 26; y < h; y += 28) c.fillRect(0, y, w, 2.5); c.globalAlpha = 1;
}
function stripes(c: Ctx, w: number, h: number, base: string, n: number) { const alt = lum(base) > 0.8 ? '#1d1d1f' : '#ffffff'; for (let i = 0; i < n; i++) { c.fillStyle = i % 2 ? alt : base; c.fillRect(0, (i * h) / n, w, h / n + 1); } }
function drawTorso(c: Ctx, w: number, h: number, cfg: AvatarConfig, back: boolean) {
  const id = cfg.shirt, tint = cfg.shirtColor, skin = cfg.skin, ink = lum(tint) > 0.72 ? '#1d1d1f' : '#ffffff';
  const buttons = (x: number, y0: number, y1: number, n: number, colr: string) => { c.fillStyle = colr; for (let i = 0; i < n; i++) { c.beginPath(); c.arc(x, y0 + ((y1 - y0) * i) / (n - 1), 2.4, 0, 7); c.fill(); } };
  if (id === 'camisa_rayas') { stripes(c, w, h, tint, 7); shadeBody(c, w, h); if (!back) neck(c, w, skin, sh(tint, -0.3)); else neck(c, w, skin, sh(tint, -0.3), 17, 5); }
  else if (id === 'camisa_cuadros') {
    plaid(c, w, h, tint); shadeBody(c, w, h);
    if (!back) { c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(w / 2 - 7, 0, 14, h); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.strokeRect(w / 2 - 7, -2, 14, h + 4); buttons(w / 2, 34, h - 12, 4, '#ffffff'); collar(c, w, skin, sh(tint, -0.15), 'rgba(0,0,0,0.35)'); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.strokeRect(20, 46, 26, 26); }
    else { c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 30); c.quadraticCurveTo(w / 2, 40, w, 30); c.stroke(); neck(c, w, skin, sh(tint, -0.15), 17, 5); }
  } else if (id === 'camisa_504') {
    c.fillStyle = tint; c.fillRect(0, 0, w, h); shadeBody(c, w, h);
    c.fillStyle = FLAG_BLUE; c.fillRect(0, h - 26, w, 5); c.fillStyle = '#ffffff'; c.fillRect(0, h - 21, w, 5); c.fillStyle = FLAG_BLUE; c.fillRect(0, h - 16, w, 5);
    if (!back) { text(c, '504', w / 2, 66, 58, ink, ink === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)'); neck(c, w, skin, sh(tint, -0.3)); }
    else { text(c, 'CATRACHO', w / 2, 46, 19, ink); c.fillStyle = ink; for (let i = 0; i < 5; i++) star(c, w / 2 + (i - 2) * 20, 74 - (i % 2 ? 0 : 7), 6.5); neck(c, w, skin, sh(tint, -0.3), 17, 5); }
  } else if (id === 'camisa_h' || id === 'camisa_h_azul') {
    const white = id === 'camisa_h', base = white ? '#ffffff' : H_BLUE, ac = white ? H_BLUE : '#ffffff';
    c.fillStyle = base; c.fillRect(0, 0, w, h);
    c.fillStyle = white ? 'rgba(18,87,196,0.07)' : 'rgba(255,255,255,0.07)'; for (let x = -h; x < w; x += 18) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 8, h); c.lineTo(x + 8 + h * 0.5, 0); c.lineTo(x + h * 0.5, 0); c.fill(); }
    shadeBody(c, w, h); c.fillStyle = ac; c.fillRect(0, 0, 9, h); c.fillRect(w - 9, 0, 9, h); c.fillRect(0, h - 7, w, 7);
    if (!back) {
      bigH(c, w / 2, 76, 50, 56, ac); c.fillStyle = ac; for (let i = 0; i < 5; i++) star(c, w / 2 + (i - 2) * 13, 37 - (2 - Math.abs(i - 2)) * 3, 5);
      c.fillStyle = ac; c.beginPath(); c.moveTo(w / 2 - 22, -1); c.lineTo(w / 2, 24); c.lineTo(w / 2 + 22, -1); c.fill(); c.fillStyle = skin; c.beginPath(); c.moveTo(w / 2 - 15, -1); c.lineTo(w / 2, 16); c.lineTo(w / 2 + 15, -1); c.fill();
    } else { text(c, 'HONDURAS', w / 2, 30, 17, ac); text(c, '10', w / 2, 82, 66, ac); neck(c, w, skin, ac, 17, 5); }
  } else if (id === 'guayabera') {
    c.fillStyle = GUAYA; c.fillRect(0, 0, w, h); shadeBody(c, w, h);
    const pleat = (x: number) => { c.fillStyle = 'rgba(120,105,70,0.16)'; c.fillRect(x - 6, 0, 12, h); c.strokeStyle = 'rgba(120,105,70,0.75)'; c.lineWidth = 1.3; for (const dx of [-6, -2, 2, 6]) { c.beginPath(); c.moveTo(x + dx, 0); c.lineTo(x + dx, h); c.stroke(); } };
    if (!back) {
      pleat(34); pleat(w - 34); c.strokeStyle = 'rgba(120,105,70,0.8)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(w / 2, 20); c.lineTo(w / 2, h); c.stroke(); buttons(w / 2 + 4, 34, h - 12, 5, '#c9b98a');
      for (const [x, y] of [[20, 40], [w - 48, 40], [20, 92], [w - 48, 92]]) { c.strokeRect(x, y, 28, 24); c.beginPath(); c.moveTo(x, y + 7); c.lineTo(x + 28, y + 7); c.stroke(); c.fillStyle = '#c9b98a'; c.beginPath(); c.arc(x + 14, y + 4, 2, 0, 7); c.fill(); }
      collar(c, w, skin, '#ffffff', 'rgba(120,105,70,0.8)');
    } else { pleat(40); pleat(w / 2); pleat(w - 40); c.strokeStyle = 'rgba(120,105,70,0.8)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 28); c.lineTo(w, 28); c.stroke(); neck(c, w, skin, '#ffffff', 17, 5); }
    c.strokeStyle = 'rgba(120,105,70,0.6)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, h - 5); c.lineTo(w, h - 5); c.stroke();
  } else if (id === 'camisa_manta') {
    c.fillStyle = MANTA; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(150,120,70,0.16)'; for (let i = 0; i < 260; i++) c.fillRect((i * 53) % w, (i * 97) % h, 2, 1); shadeBody(c, w, h);
    c.fillStyle = '#d62839'; c.fillRect(0, h - 22, w, 22); c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(0, h - 22, w, 3); c.fillStyle = '#ffd23f'; c.fillRect(0, h - 12, w, 2.5);
    if (!back) {
      c.fillStyle = skin; c.beginPath(); c.moveTo(w / 2 - 13, -1); c.lineTo(w / 2, 40); c.lineTo(w / 2 + 13, -1); c.fill();
      c.strokeStyle = '#8a5a34'; c.lineWidth = 1.6; for (let y = 16; y < 40; y += 8) { c.beginPath(); c.moveTo(w / 2 - 6, y); c.lineTo(w / 2 + 6, y + 6); c.moveTo(w / 2 + 6, y); c.lineTo(w / 2 - 6, y + 6); c.stroke(); }
      c.fillStyle = '#d62839'; c.beginPath(); c.moveTo(w / 2 - 34, -1); c.lineTo(w / 2 - 26, 14); c.lineTo(w / 2 - 10, 2); c.lineTo(w / 2 - 12, -1); c.fill(); c.beginPath(); c.moveTo(w / 2 + 34, -1); c.lineTo(w / 2 + 26, 14); c.lineTo(w / 2 + 10, 2); c.lineTo(w / 2 + 12, -1); c.fill();
      c.strokeStyle = 'rgba(150,120,70,0.7)'; c.lineWidth = 1.2; c.strokeRect(22, 52, 26, 24);
    } else { c.fillStyle = '#d62839'; c.beginPath(); c.moveTo(w / 2 - 36, -1); c.lineTo(w / 2, 34); c.lineTo(w / 2 + 36, -1); c.fill(); c.fillStyle = '#ffffff'; for (const [x, y] of [[-14, 6], [0, 16], [14, 6], [0, 4], [-6, 14], [7, 13]]) { c.beginPath(); c.arc(w / 2 + x, y, 1.8, 0, 7); c.fill(); } }
  } else if (id === 'blusa_tipica') {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); shadeBody(c, w, h);
    // canesú: arcos de listones de colores alrededor del escote
    const cols = [...RIBBONS].reverse(); cols.forEach((k, i) => { c.fillStyle = k; c.beginPath(); c.ellipse(w / 2, -4, 74 - i * 9, 62 - i * 8.5, 0, 0, 7); c.fill(); });
    c.fillStyle = '#ffffff'; c.beginPath(); c.ellipse(w / 2, -4, 29, 20, 0, 0, 7); c.fill(); c.fillStyle = skin; c.beginPath(); c.ellipse(w / 2, -4, 25, back ? 10 : 16, 0, 0, 7); c.fill();
    c.fillStyle = '#ffffff'; for (let a = 0.2; a < Math.PI - 0.1; a += 0.21) { c.beginPath(); c.arc(w / 2 + Math.cos(a) * 77, -4 + Math.sin(a) * 65, 3.2, 0, 7); c.fill(); }
    // bordado de la cintura
    c.fillStyle = '#e63946'; c.fillRect(0, h - 22, w, 5); c.fillStyle = '#1e88e5'; c.fillRect(0, h - 8, w, 5);
    for (let x = 6; x < w; x += 16) { c.fillStyle = RIBBONS[(x / 16 | 0) % 5]; c.beginPath(); c.moveTo(x, h - 9); c.lineTo(x + 6, h - 17); c.lineTo(x + 12, h - 9); c.fill(); }
    if (!back) for (const s of [-1, 1]) for (let i = 0; i < 2; i++) { const fx = w / 2 + s * (22 + i * 24), fy = 86 - i * 4; c.fillStyle = RIBBONS[(i + (s > 0 ? 2 : 0)) % 5]; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(fx + Math.cos(p * 1.257) * 4.4, fy + Math.sin(p * 1.257) * 4.4, 3, 0, 7); c.fill(); } c.fillStyle = '#ffc93c'; c.beginPath(); c.arc(fx, fy, 2.4, 0, 7); c.fill(); }
  } else {
    c.fillStyle = tint; c.fillRect(0, 0, w, h); shadeBody(c, w, h); c.fillStyle = sh(tint, -0.22); c.fillRect(0, h - 6, w, 6);
    if (!back) { neck(c, w, skin, sh(tint, -0.28)); c.strokeStyle = sh(tint, lum(tint) > 0.5 ? -0.25 : 0.3); c.lineWidth = 1.6; c.strokeRect(92, 44, 24, 22); } else neck(c, w, skin, sh(tint, -0.28), 17, 5);
  }
}
function drawSleeve(c: Ctx, w: number, h: number, cfg: AvatarConfig) {
  const id = cfg.shirt, tint = cfg.shirtColor;
  if (id === 'camisa_rayas') stripes(c, w, h, tint, 4);
  else if (id === 'camisa_cuadros') plaid(c, w, h, tint);
  else if (id === 'camisa_h' || id === 'camisa_h_azul') { const white = id === 'camisa_h'; c.fillStyle = white ? '#ffffff' : H_BLUE; c.fillRect(0, 0, w, h); c.fillStyle = white ? H_BLUE : '#ffffff'; c.fillRect(0, h - 12, w, 12); }
  else if (id === 'guayabera') { c.fillStyle = GUAYA; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,105,70,0.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, h - 9); c.lineTo(w, h - 9); c.stroke(); }
  else if (id === 'camisa_manta') { c.fillStyle = MANTA; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(150,120,70,0.16)'; for (let i = 0; i < 60; i++) c.fillRect((i * 53) % w, (i * 37) % h, 2, 1); }
  else if (id === 'blusa_tipica') { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); ['#e63946', '#ffc93c', '#1e88e5'].forEach((k, i) => { c.fillStyle = k; c.fillRect(0, h - 26 + i * 8, w, 6); }); }
  else { c.fillStyle = tint; c.fillRect(0, 0, w, h); c.fillStyle = sh(tint, -0.22); c.fillRect(0, h - 7, w, 7); }
  const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.08)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
}

// ------------------------------------------------------------------ pantalones
export interface PantsInfo { base: string; skirt: boolean; shorts: boolean; shoe: 'tenis' | 'caite' | 'taco'; wide: boolean }
export function pantsInfo(cfg: AvatarConfig): PantsInfo {
  switch (cfg.pants) {
    case 'jeans': return { base: JEANS, skirt: false, shorts: false, shoe: 'tenis', wide: false };
    case 'short_futbol': return { base: cfg.pantsColor, skirt: false, shorts: true, shoe: 'taco', wide: false };
    case 'pantalon_manta': return { base: MANTA, skirt: false, shorts: false, shoe: 'caite', wide: true };
    case 'falda_tipica': return { base: '#1565c0', skirt: true, shorts: false, shoe: 'caite', wide: false };
    default: return { base: cfg.pantsColor, skirt: false, shorts: false, shoe: 'tenis', wide: false };
  }
}
function drawLeg(c: Ctx, w: number, h: number, cfg: AvatarConfig) {
  const id = cfg.pants, tint = cfg.pantsColor, skin = cfg.skin, half = h / 2;
  if (id === 'jeans') {
    c.fillStyle = JEANS; c.fillRect(0, 0, w, h); const g = c.createLinearGradient(0, 0, w, 0); g.addColorStop(0, 'rgba(0,0,30,0.2)'); g.addColorStop(0.5, 'rgba(160,200,255,0.22)'); g.addColorStop(1, 'rgba(0,0,30,0.2)'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#2b2118'; c.fillRect(0, 0, w, 9); c.fillStyle = '#e0b040'; c.fillRect(w / 2 - 5, 1, 10, 7);
    c.strokeStyle = '#f0b04a'; c.lineWidth = 1.4; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(6, 10); c.lineTo(6, h - 14); c.moveTo(w - 6, 10); c.lineTo(w - 6, h - 14); c.moveTo(14, 12); c.quadraticCurveTo(18, 30, w - 14, 30); c.stroke(); c.setLineDash([]);
    c.fillStyle = sh(JEANS, 0.3); c.fillRect(0, h - 14, w, 14); c.fillStyle = 'rgba(0,0,40,0.3)'; c.fillRect(0, h - 15, w, 2);
  } else if (id === 'short_futbol') {
    c.fillStyle = skin; c.fillRect(0, 0, w, h); c.fillStyle = tint; c.fillRect(0, 0, w, half * 0.74);
    const tr = lum(tint) > 0.75 ? H_BLUE : '#ffffff'; c.fillStyle = tr; c.fillRect(0, half * 0.74 - 6, w, 6); c.fillRect(4, 0, 6, half * 0.74); c.fillRect(w - 10, 0, 6, half * 0.74);
    c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, half * 0.74, w, 3);
    c.fillStyle = '#ffffff'; c.fillRect(0, half + 22, w, half - 22); c.fillStyle = lum(tint) > 0.75 ? H_BLUE : tint; c.fillRect(0, half + 22, w, 5); c.fillRect(0, half + 31, w, 5);
  } else if (id === 'pantalon_manta') {
    c.fillStyle = MANTA; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(150,120,70,0.16)'; for (let i = 0; i < 110; i++) c.fillRect((i * 53) % w, (i * 97) % h, 2, 1);
    c.fillStyle = '#d62839'; c.fillRect(0, 0, w, 10); c.fillStyle = '#ffd23f'; c.fillRect(0, 5, w, 2); c.strokeStyle = 'rgba(150,120,70,0.5)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(w / 2, 12); c.lineTo(w / 2, h - 8); c.stroke();
    c.fillStyle = 'rgba(150,120,70,0.45)'; for (let x = 1; x < w; x += 5) c.fillRect(x, h - 5, 2, 5);
  } else if (id === 'falda_tipica') { c.fillStyle = skin; c.fillRect(0, 0, w, h); }
  else { c.fillStyle = tint; c.fillRect(0, 0, w, h); c.fillStyle = '#26221f'; c.fillRect(0, 0, w, 8); c.fillStyle = '#d7d7d7'; c.fillRect(w / 2 - 5, 1, 10, 6); c.fillStyle = sh(tint, -0.2); c.fillRect(w / 2 - 1, 10, 2, h - 10); c.fillRect(0, h - 6, w, 6); const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.12)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
}
function drawSkirt(c: Ctx, w: number, h: number) {
  c.fillStyle = '#1565c0'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,40,0.16)'; for (let x = 0; x < w; x += 16) c.fillRect(x, 0, 5, h);
  c.fillStyle = '#d62839'; c.fillRect(0, 0, w, 9); c.fillStyle = '#ffd23f'; c.fillRect(0, 4, w, 2);
  let y = h - 50; for (const [k, t] of [['#ffffff', 4], ['#e63946', 9], ['#ffc93c', 9], ['#2ea44f', 9], ['#ffffff', 3], ['#ff5d9e', 7]] as [string, number][]) { c.fillStyle = k; c.fillRect(0, y, w, t); y += t + 1; }
  c.fillStyle = '#ffffff'; for (let x = 0; x < w; x += 8) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 4, h - 7); c.lineTo(x + 8, h); c.fill(); }
  c.fillStyle = '#ffc93c'; for (let x = 4; x < w; x += 16) { c.beginPath(); c.arc(x, h - 60, 2.6, 0, 7); c.fill(); }
}
export function drawFlag(c: Ctx, w: number, h: number, vertical = false) {
  c.fillStyle = FLAG_BLUE; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff';
  if (vertical) c.fillRect(0, h / 3, w, h / 3); else c.fillRect(0, h / 3, w, h / 3);
  c.fillStyle = FLAG_BLUE; const r = Math.min(w, h) * 0.055, cx = w / 2, cy = h / 2, dx = w * 0.13, dy = h * 0.075;
  star(c, cx, cy, r); star(c, cx - dx, cy - dy, r); star(c, cx - dx, cy + dy, r); star(c, cx + dx, cy - dy, r); star(c, cx + dx, cy + dy, r);
}

const SASH_COL: Record<string, [string, string]> = { banda_bandera: [FLAG_BLUE, '#ffffff'], guitarra: ['#6b3f22', '#8a5a34'], tambor_garifuna: ['#f2c531', '#1d1d1f'] };
/** dibuja el atlas completo de una configuración */
export function makeAtlas(cfg: AvatarConfig): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = cv.height = AT; const c = cv.getContext('2d')!;
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, AT, AT);
  const si = shirtInfo(cfg), pi = pantsInfo(cfg);
  region(c, PX.face, cfg.skin, () => drawFace(c, cfg.face, cfg.skin));
  region(c, PX.tf, si.base, (w, h) => drawTorso(c, w, h, cfg, false));
  region(c, PX.tb, si.base, (w, h) => drawTorso(c, w, h, cfg, true));
  region(c, PX.sleeve, si.base, (w, h) => drawSleeve(c, w, h, cfg));
  region(c, PX.leg, pi.base, (w, h) => drawLeg(c, w, h, cfg));
  region(c, PX.skirt, '#1565c0', (w, h) => drawSkirt(c, w, h));
  region(c, PX.cape, FLAG_BLUE, (w, h) => drawFlag(c, w, h));
  const sc = SASH_COL[cfg.acc] ?? SASH_COL.banda_bandera;
  region(c, PX.sash, sc[0], (w, h) => {
    c.fillStyle = sc[1]; c.fillRect(0, h / 3, w, h / 3);
    if (cfg.acc === 'banda_bandera' || !SASH_COL[cfg.acc]) { c.fillStyle = FLAG_BLUE; for (let i = 0; i < 5; i++) star(c, w / 2 + (i - 2) * 22, h / 2, 5.5); }
    if (cfg.acc === 'tambor_garifuna') { c.fillStyle = '#1d1d1f'; c.fillRect(0, h / 3, w, h / 3); c.fillStyle = '#f2c531'; c.fillRect(0, 0, w, h / 3); c.fillStyle = '#ffffff'; c.fillRect(0, h * 2 / 3, w, h / 3); }
  });
  region(c, PX.ruffle, '#ffffff', (w, h) => { ['#e63946', '#ffc93c', '#2ea44f', '#1e88e5'].forEach((k, i) => { c.fillStyle = k; c.fillRect(0, 3 + i * 7, w, 5); }); c.fillStyle = '#ffffff'; for (let x = 0; x < w; x += 10) { c.beginPath(); c.arc(x + 5, h, 4.5, 0, 7); c.fill(); } });
  region(c, PX.scarf, '#d81b8c', (w, h) => {
    const cols = ['#d81b8c', '#ffd23f', '#2ea44f', '#7b3fd1', '#ff7a3d', '#1e88e5']; let y = 0;
    for (let i = 0; y < h; i++) { const t = i % 3 === 0 ? 14 : 5; c.fillStyle = cols[i % cols.length]; c.fillRect(0, y, w, t); y += t; }
    c.fillStyle = '#ffffff'; for (let x = 4; x < w; x += 12) { c.beginPath(); c.moveTo(x, 7); c.lineTo(x + 4, 3); c.lineTo(x + 8, 7); c.lineTo(x + 4, 11); c.fill(); }
    c.fillStyle = 'rgba(255,255,255,0.85)'; for (let x = 0; x < w; x += 6) c.fillRect(x, h - 4, 3, 4);
  });
  region(c, PX.skin, cfg.skin, () => {}); region(c, PX.shirt, si.base, () => {}); region(c, PX.pants, pi.base, () => {});
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}
