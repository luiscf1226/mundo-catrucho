// Atlas del avatar HD (1024×512, un lienzo por configuración): cara, torso, mangas, piernas, falda, capa,
// estampados y una rejilla de colores lisos. Todo se dibuja con Canvas 2D; nada se descarga.
import * as THREE from 'three';
import apodos from '../../../../../shared/data/apodos.json';
import type { AvatarConfig } from '../../../../core/types';
import { EYE_RECT, hairline, lineAt } from './avatarAnat';
import { cut, R, SWATCH, type SwatchName, swatchCell } from './avatarGeo';
import { AH, AW, type Rect } from './skin';
import { rng } from './tex';

type Ctx = CanvasRenderingContext2D;
const C3 = (c: string) => new THREE.Color(c);
const css = (c: THREE.Color) => `#${c.getHexString()}`;
const mix = (a: string, b: string, t: number) => css(C3(a).lerp(C3(b), t));
const dark = (a: string, k: number) => mix(a, '#000000', k),
  light = (a: string, k: number) => mix(a, '#ffffff', k);
const lum = (c: string) => {
  const k = C3(c);
  return 0.3 * k.r + 0.59 * k.g + 0.11 * k.b;
};
const FONT = (px: number) => `900 ${px}px "Fredoka", "Baloo 2", "Arial Black", system-ui, sans-serif`;
const RIBBON = ['#e63946', '#ffc93c', '#2ea44f', '#00a3d7', '#ff5d9e', '#7b5cff'];
const BLUE = '#00bce4',
  HBLUE = '#0b57c4',
  MANTA = '#eee3c8',
  GUAYA = '#f6f1e4';

function region(c: Ctx, r: Rect, fn: (w: number, h: number) => void) {
  c.save();
  c.beginPath();
  c.rect(r[0], r[1], r[2], r[3]);
  c.clip();
  c.translate(r[0], r[1]);
  fn(r[2], r[3]);
  c.restore();
}
const ell = (c: Ctx, x: number, y: number, rx: number, ry: number, rot = 0) => {
  c.beginPath();
  c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
};
function star(c: Ctx, x: number, y: number, r: number) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5,
      q = i % 2 ? r * 0.42 : r;
    c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q);
  }
  c.closePath();
  c.fill();
}
function weave(c: Ctx, w: number, h: number, a = 0.1) {
  c.strokeStyle = `rgba(120,100,60,${a})`;
  c.lineWidth = 1;
  c.beginPath();
  for (let y = 2; y < h; y += 4) {
    c.moveTo(0, y);
    c.lineTo(w, y);
  }
  for (let x = 2; x < w; x += 4) {
    c.moveTo(x, 0);
    c.lineTo(x, h);
  }
  c.stroke();
}
/** cenefa bordada: banda de color con zigzag y puntos */
function trim(c: Ctx, x: number, y: number, w: number, h: number, base = '#c0392b') {
  c.fillStyle = base;
  c.fillRect(x, y, w, h);
  c.strokeStyle = '#ffc93c';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i * h <= w; i++) c.lineTo(x + i * h, y + (i % 2 ? h - 3 : 3));
  c.stroke();
  c.fillStyle = '#00a3d7';
  for (let i = 0; i * h * 2 <= w; i++) {
    c.beginPath();
    c.arc(x + h + i * h * 2, y + h / 2 + 1, 1.6, 0, 7);
    c.fill();
  }
}
function ribbons(c: Ctx, x: number, y: number, w: number, h: number, n = 6, off = 0) {
  const bh = h / n;
  for (let i = 0; i < n; i++) {
    c.fillStyle = RIBBON[(i + off) % RIBBON.length];
    c.fillRect(x, y + i * bh, w, bh - 1.5);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fillRect(x, y + i * bh + bh - 1.5, w, 1.5);
  }
}

/** semilla estable por texto (para que cada configuración tenga sus manchitas y su color de ojos) */
const hash = (t: string) => {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return h >>> 0;
};
/** piel con vida: manchas suaves rojizas y cafés, y grano fino de poros (amp = cuánto se nota) */
export function skinFill(c: Ctx, w: number, h: number, skin: string, seed: number, amp = 1) {
  c.fillStyle = skin;
  c.fillRect(0, 0, w, h);
  const r = rng(seed),
    L = lum(skin),
    red = mix(skin, '#b0302a', 0.5),
    brown = mix(skin, '#3a1c0c', 0.6),
    pale = mix(skin, '#fff1e2', 0.5);
  const n = Math.round((w * h) / 900) + 6;
  for (let i = 0; i < n; i++) {
    const x = r() * w,
      y = r() * h,
      rad = 6 + r() * 26,
      col = r() < 0.45 ? red : r() < 0.6 ? brown : pale,
      g = c.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = (0.05 + r() * 0.07) * amp * (L < 0.35 ? 0.8 : 1);
    c.fillStyle = g;
    c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  c.globalAlpha = 1;
  // poros: un grano de ±3 por pixel
  const t = c.getTransform(),
    img = c.getImageData(t.e, t.f, w, h),
    d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const k = (r() - 0.5) * 7 * amp;
    d[i] += k;
    d[i + 1] += k * 0.9;
    d[i + 2] += k * 0.8;
  }
  c.putImageData(img, t.e, t.f);
}
const IRIS = ['#3a2010', '#2b170b', '#4a2a14', '#56341a', '#6b4a24', '#4d5634', '#3d4f5e'];
/** color de ojos estable por configuración: casi siempre café; claros solo de vez en cuando en piel clara */
export function irisColor(cfg: AvatarConfig) {
  const h = hash(`${cfg.skin}|${cfg.hairColor}|${cfg.face}|${cfg.shirtColor}`) % 100,
    light = lum(cfg.skin) > 0.7;
  if (light && h < 9) return IRIS[5 + (h % 2)];
  if (h < 16) return IRIS[4];
  return IRIS[h % 4];
}
/** globo del ojo (esclerótica, iris con fibras, anillo, pupila y brillo) en un cuadrito del atlas */
function eyeTex(c: Ctx, cfg: AvatarConfig, w: number) {
  const m = w / 2,
    iris = irisColor(cfg);
  let g = c.createRadialGradient(m, m, w * 0.2, m, m, w * 0.55);
  g.addColorStop(0, '#f2ede6');
  g.addColorStop(0.7, '#e3d6cc');
  g.addColorStop(1, '#c9a59a');
  c.fillStyle = g;
  c.fillRect(0, 0, w, w);
  const ri = w * 0.255;
  g = c.createRadialGradient(m, m, ri * 0.2, m, m, ri);
  g.addColorStop(0, light(iris, 0.2));
  g.addColorStop(0.65, iris);
  g.addColorStop(0.88, dark(iris, 0.35));
  g.addColorStop(1, '#120a06');
  c.fillStyle = g;
  ell(c, m, m, ri, ri);
  c.fill();
  c.strokeStyle = `${light(iris, 0.35)}`;
  c.globalAlpha = 0.35;
  c.lineWidth = 0.6;
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    c.beginPath();
    c.moveTo(m + Math.cos(a) * ri * 0.35, m + Math.sin(a) * ri * 0.35);
    c.lineTo(m + Math.cos(a + 0.1) * ri * 0.9, m + Math.sin(a + 0.1) * ri * 0.9);
    c.stroke();
  }
  c.globalAlpha = 1;
  c.fillStyle = '#070505';
  ell(c, m, m, ri * 0.38, ri * 0.38);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  ell(c, m - ri * 0.35, m - ri * 0.4, ri * 0.17, ri * 0.17);
  c.fill();
}

/**
 * Cara en la proyección frontal de la cabeza: el pixel (128 + sx·128, 128 − sy·128) cae en la dirección (sx, sy) de la
 * esfera unitaria (ver avatarAnat.ts). Ojos de verdad van en la geometría; aquí van la piel, cejas, labios, nariz,
 * ojeras, rubor, barba de pocos días y pecas.
 */
function face(c: Ctx, cfg: AvatarConfig) {
  const skin = cfg.skin,
    L = lum(skin),
    fem = cfg.body === 'm',
    f = cfg.face,
    X = (sx: number) => 128 + sx * 128,
    Y = (sy: number) => 128 - sy * 128;
  skinFill(c, 256, 256, skin, hash(skin) % 1000, 1);
  const blob = (x: number, y: number, rx: number, ry: number, col: string, a: number) => {
    c.save();
    c.translate(x, y);
    c.scale(1, ry / rx);
    const g = c.createRadialGradient(0, 0, 0, 0, 0, rx);
    g.addColorStop(0, col);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.globalAlpha = a;
    c.fillStyle = g;
    c.fillRect(-rx, -rx, rx * 2, rx * 2);
    c.restore();
    c.globalAlpha = 1;
  };
  const shadow = mix(skin, '#2a0f08', 0.55),
    warm = mix(skin, '#c2403a', 0.6);
  // ojeras y cuencas, rubor en mejillas, nariz y orejas, sombra bajo el labio y en la quijada
  for (const s of [-1, 1]) {
    blob(X(s * 0.42), Y(0.05), 30, 22, shadow, 0.13);
    blob(X(s * 0.4), Y(-0.06), 22, 9, shadow, 0.1);
    blob(X(s * 0.47), Y(-0.24), 34, 24, warm, f === 'cara_feliz' ? 0.3 : 0.17);
    blob(X(s * 0.16), Y(-0.24), 9, 14, shadow, 0.12);
  }
  blob(X(0), Y(-0.24), 14, 18, warm, 0.2);
  blob(X(0), Y(-0.69), 26, 8, shadow, 0.22);
  blob(X(0), Y(-0.9), 70, 26, shadow, 0.16);
  // barba de pocos días (hombres): una sombra fría y granulada
  if (!fem && f !== 'cara_feliz') {
    const r = rng(hash(skin + f)),
      beard = mix(cfg.hairColor, skin, 0.35);
    c.fillStyle = beard;
    for (let i = 0; i < 1600; i++) {
      const a = r() * Math.PI,
        rad = 0.55 + r() * 0.45,
        sx = Math.cos(a) * rad * 0.8,
        sy = -0.38 - Math.sin(a) * rad * 0.6;
      if (sy > -0.5 && Math.abs(sx) < 0.34) continue;
      if (Math.abs(sx) < 0.3 && sy < -0.47 && sy > -0.66) continue;
      c.globalAlpha = 0.035 + r() * 0.05 * (L > 0.6 ? 1 : 0.6);
      c.fillRect(X(sx), Y(sy), 1.4, 1.4);
    }
    c.globalAlpha = 1;
  }
  // nacimiento del pelo: la piel toma el color del pelo justo donde empieza (pelitos finos), así el borde no se ve cortado
  const line = hairline(cfg.hair);
  if (line) {
    const t = c.getTransform(),
      img = c.getImageData(t.e, t.f, 256, 256),
      d = img.data,
      hc = Number.parseInt(cfg.hairColor.slice(1), 16),
      hr = hc >> 16,
      hg = (hc >> 8) & 255,
      hb = hc & 255,
      q = rng(5);
    for (let y = 0; y < 256; y++)
      for (let x = 0; x < 256; x++) {
        const sx = (x - 128) / 128,
          sy = (128 - y) / 128,
          r2 = sx * sx + sy * sy;
        if (r2 >= 1) continue;
        const m = sy - lineAt(line, Math.atan2(sx, Math.sqrt(1 - r2)));
        if (m < -0.03) continue;
        const k = Math.min(1, Math.max(0, (m + 0.03) / 0.09)) ** 1.5 * (0.55 + 0.45 * q()) * 0.92,
          i = (y * 256 + x) * 4;
        d[i] += (hr - d[i]) * k;
        d[i + 1] += (hg - d[i + 1]) * k;
        d[i + 2] += (hb - d[i + 2]) * k;
      }
    c.putImageData(img, t.e, t.f);
  }
  // nariz: luz en el tabique, sombra en las aletas y las fosas
  blob(X(0), Y(-0.1), 6, 22, light(skin, 0.5), 0.18);
  blob(X(0), Y(-0.25), 7, 6, light(skin, 0.5), 0.22);
  for (const s of [-1, 1]) {
    blob(X(s * 0.15), Y(-0.31), 7, 7, shadow, 0.3);
    c.fillStyle = mix(skin, '#1a0a06', 0.6);
    c.globalAlpha = 0.7;
    ell(c, X(s * 0.085), Y(-0.345), 4.2, 2.2, s * 0.35);
    c.fill();
    c.globalAlpha = 1;
  }
  // labios
  const lip = mix(skin, L < 0.35 ? '#5c2426' : '#a8434a', fem ? 0.5 : 0.36),
    lipD = dark(lip, 0.35),
    cy = Y(-0.545),
    smile = f === 'cara_feliz' ? 0 : f === 'cara_bigote' || f === 'cara_lentes' ? 2 : 5,
    wink = f === 'cara_guino' ? 4 : 0;
  c.fillStyle = lip;
  c.beginPath();
  c.moveTo(X(-0.25), cy - smile + wink);
  c.bezierCurveTo(X(-0.15), Y(-0.48), X(-0.06), Y(-0.455), X(0), Y(-0.48));
  c.bezierCurveTo(X(0.06), Y(-0.455), X(0.15), Y(-0.48), X(0.25), cy - smile - wink);
  c.bezierCurveTo(X(0.14), Y(-0.65), X(-0.14), Y(-0.65), X(-0.25), cy - smile + wink);
  c.fill();
  blob(X(0), Y(-0.6), 16, 5, light(lip, 0.4), 0.3);
  if (f === 'cara_feliz') {
    // sonrisa abierta con dientes
    c.fillStyle = '#3a0e10';
    c.beginPath();
    c.moveTo(X(-0.22), cy - 3);
    c.quadraticCurveTo(X(0), cy - 1, X(0.22), cy - 3);
    c.quadraticCurveTo(X(0), cy + 15, X(-0.22), cy - 3);
    c.fill();
    c.save();
    c.clip();
    c.fillStyle = '#efe8dc';
    c.fillRect(X(-0.22), cy - 4, 60, 6);
    c.restore();
  } else {
    c.strokeStyle = lipD;
    c.lineWidth = 1.6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(X(-0.24), cy - smile + wink);
    c.bezierCurveTo(X(-0.1), cy + 1.5, X(0.1), cy + 1.5, X(0.24), cy - smile - wink);
    c.stroke();
    for (const s of [-1, 1]) blob(X(s * 0.25), cy - smile - s * wink, 5, 5, shadow, 0.45);
  }
  // cejas: pelitos en el color del pelo, más gruesas por dentro
  const brow = mix(cfg.hairColor, '#120a06', 0.4),
    r = rng(31 + (fem ? 7 : 0));
  c.strokeStyle = brow;
  c.lineCap = 'round';
  for (const s of [-1, 1]) {
    const up = f === 'cara_guino' && s > 0 ? -4 : 0;
    for (let i = 0; i < 70; i++) {
      const t = r(),
        sx = s * (0.16 + t * 0.46),
        sy = 0.255 + Math.sin(t * Math.PI * 0.85) * 0.05 - t * 0.01,
        th = (fem ? 0.024 : 0.036) * (1 - t * 0.55),
        y0 = Y(sy) + up + (r() - 0.5) * th * 128;
      c.globalAlpha = 0.35 + r() * 0.4;
      c.lineWidth = 0.9 + r() * 0.6;
      c.beginPath();
      c.moveTo(X(sx), y0 + 1.5);
      c.lineTo(X(sx) + s * (3 + r() * 2), y0 - 1.5);
      c.stroke();
    }
  }
  c.globalAlpha = 1;
  if (f === 'cara_bigote') {
    // bigote: pelitos que salen del centro hacia las comisuras
    const q = rng(13);
    c.strokeStyle = mix(cfg.hairColor, '#000000', 0.2);
    c.lineCap = 'round';
    for (let i = 0; i < 260; i++) {
      const sx = (q() - 0.5) * 0.66,
        sy = -0.4 - 0.22 * (sx / 0.33) ** 2 - q() * 0.06;
      c.globalAlpha = 0.45 + q() * 0.4;
      c.lineWidth = 0.8 + q() * 0.7;
      c.beginPath();
      c.moveTo(X(sx), Y(sy));
      c.lineTo(X(sx) + Math.sign(sx) * (2 + q() * 2), Y(sy) + 3 + q() * 2);
      c.stroke();
    }
    c.globalAlpha = 1;
  }
  if (f === 'cara_pecas') {
    const q = rng(77);
    c.fillStyle = mix(skin, '#6b2f14', 0.55);
    for (let i = 0; i < 90; i++) {
      const sx = (q() - 0.5) * 1.15,
        sy = -0.05 - q() * 0.3 - Math.abs(sx) * 0.1;
      c.globalAlpha = 0.3 + q() * 0.4;
      ell(c, X(sx), Y(sy), 0.8 + q() * 1.1, 0.7 + q(), q() * 3);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  region(c, EYE_RECT, (w) => eyeTex(c, cfg, w));
}

interface Sleeve {
  len: number;
  paint: (c: Ctx, len: number) => void;
}
const HEM = 172;
function neck(c: Ctx, skin: string, kind: 'round' | 'v' | 'wide', collar?: string) {
  c.fillStyle = skin;
  c.fillRect(0, 0, 512, kind === 'wide' ? 24 : 9);
  if (kind === 'round') {
    ell(c, 256, 6, 36, 24);
    c.fill();
    if (collar) {
      c.strokeStyle = collar;
      c.lineWidth = 6;
      c.beginPath();
      c.ellipse(256, 6, 38, 26, 0, 0.12, Math.PI - 0.12);
      c.stroke();
      c.fillStyle = collar;
      c.fillRect(0, 8, 216, 6);
      c.fillRect(296, 8, 216, 6);
    }
  } else if (kind === 'v') {
    c.beginPath();
    c.moveTo(232, 8);
    c.lineTo(256, 52);
    c.lineTo(280, 8);
    c.fill();
    if (collar) {
      c.strokeStyle = collar;
      c.lineWidth = 7;
      c.lineJoin = 'miter';
      c.beginPath();
      c.moveTo(0, 11);
      c.lineTo(230, 11);
      c.lineTo(256, 56);
      c.lineTo(282, 11);
      c.lineTo(512, 11);
      c.stroke();
    }
  } else {
    ell(c, 256, 24, 80, 20);
    c.fill();
  }
}
function lapels(c: Ctx, col: string) {
  c.fillStyle = col;
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 1.5;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(256 + s * 6, 34);
    c.lineTo(256 + s * 44, 9);
    c.lineTo(256 + s * 40, 50);
    c.closePath();
    c.fill();
    c.stroke();
  }
  c.fillStyle = col;
  c.fillRect(0, 8, 214, 9);
  c.fillRect(298, 8, 214, 9);
}
function buttons(c: Ctx, col: string, ys: number[]) {
  for (const y of ys) {
    c.fillStyle = col;
    c.beginPath();
    c.arc(256, y, 3.4, 0, 7);
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = 1;
    c.stroke();
  }
}
function folds(c: Ctx) {
  for (const x of [128, 384]) {
    const g = c.createLinearGradient(x - 46, 0, x + 46, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.14)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(x - 46, 30, 92, HEM - 30);
  }
  const g = c.createLinearGradient(0, HEM - 26, 0, HEM);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.16)');
  c.fillStyle = g;
  c.fillRect(0, HEM - 26, 512, 26);
}

// --- atuendos: escudos originales, camisetas de club, estampados
type Crest = (c: Ctx, x: number, y: number, s: number) => void;
function shieldPath(c: Ctx, x: number, y: number, s: number) {
  c.beginPath();
  c.moveTo(x - s, y - s);
  c.lineTo(x + s, y - s);
  c.lineTo(x + s, y + s * 0.2);
  c.quadraticCurveTo(x + s, y + s * 0.95, x, y + s * 1.35);
  c.quadraticCurveTo(x - s, y + s * 0.95, x - s, y + s * 0.2);
  c.closePath();
}
function shield(c: Ctx, x: number, y: number, s: number, fill: string, line: string) {
  shieldPath(c, x, y, s);
  c.fillStyle = fill;
  c.fill();
  c.lineWidth = Math.max(2, s * 0.16);
  c.strokeStyle = line;
  c.stroke();
}
const CRESTS: Record<string, Crest> = {
  leon: (c, x, y, s) => {
    shield(c, x, y, s, '#ffffff', '#d62828');
    c.fillStyle = '#0b3d91';
    c.fillRect(x - s, y - s, s * 2, s * 0.3);
    c.fillStyle = '#e8a33a';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ell(c, x + Math.cos(a) * s * 0.42, y + s * 0.28 + Math.sin(a) * s * 0.42, s * 0.2, s * 0.2);
      c.fill();
    }
    c.fillStyle = '#f6c65b';
    ell(c, x, y + s * 0.3, s * 0.36, s * 0.38);
    c.fill();
    c.fillStyle = '#3b2414';
    ell(c, x - s * 0.13, y + s * 0.2, s * 0.05, s * 0.06);
    c.fill();
    ell(c, x + s * 0.13, y + s * 0.2, s * 0.05, s * 0.06);
    c.fill();
    ell(c, x, y + s * 0.42, s * 0.09, s * 0.06);
    c.fill();
  },
  aguila: (c, x, y, s) => {
    shield(c, x, y, s, '#0a2a6b', '#ffffff');
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(x, y + s * 0.15);
    c.lineTo(x - s * 0.85, y - s * 0.55);
    c.lineTo(x - s * 0.5, y + s * 0.2);
    c.lineTo(x - s * 0.15, y + s * 0.85);
    c.lineTo(x + s * 0.15, y + s * 0.85);
    c.lineTo(x + s * 0.5, y + s * 0.2);
    c.lineTo(x + s * 0.85, y - s * 0.55);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(x, y - s * 0.1, s * 0.2, 0, 7);
    c.fill();
    c.fillStyle = '#ffc93c';
    c.beginPath();
    c.moveTo(x, y - s * 0.05);
    c.lineTo(x + s * 0.12, y + s * 0.12);
    c.lineTo(x - s * 0.04, y + s * 0.05);
    c.fill();
  },
  engrane: (c, x, y, s) => {
    c.fillStyle = '#111111';
    c.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2,
        r = i % 2 ? s * 0.78 : s;
      c.lineTo(x + Math.cos(a) * r, y + s * 0.15 + Math.sin(a) * r);
    }
    c.closePath();
    c.fill();
    c.fillStyle = '#ffd400';
    c.beginPath();
    c.arc(x, y + s * 0.15, s * 0.55, 0, 7);
    c.fill();
    c.fillStyle = '#111111';
    star(c, x, y + s * 0.15, s * 0.38);
  },
  picos: (c, x, y, s) => {
    shield(c, x, y, s, '#ffffff', '#138a3c');
    // la sierra detrás de la ciudad: tres cerros de distinto alto y un sol, nada que parezca letra
    c.save();
    shieldPath(c, x, y, s);
    c.clip();
    c.fillStyle = '#ffc93c';
    c.beginPath();
    c.arc(x + s * 0.42, y - s * 0.42, s * 0.22, 0, 7);
    c.fill();
    c.fillStyle = '#0d6b2e';
    c.beginPath();
    c.moveTo(x - s * 0.85, y + s * 0.8);
    c.lineTo(x - s * 0.5, y + s * 0.05);
    c.lineTo(x - s * 0.25, y + s * 0.35);
    c.lineTo(x + s * 0.05, y - s * 0.55);
    c.lineTo(x + s * 0.85, y + s * 0.8);
    c.closePath();
    c.fill();
    c.fillStyle = '#2ea44f';
    c.beginPath();
    c.moveTo(x - s * 0.2, y + s * 0.95);
    c.lineTo(x + s * 0.4, y + s * 0.15);
    c.lineTo(x + s * 0.9, y + s * 0.95);
    c.closePath();
    c.fill();
    c.restore();
    c.lineWidth = Math.max(2, s * 0.16);
    c.strokeStyle = '#138a3c';
    shieldPath(c, x, y, s);
    c.stroke();
  },
  palma: (c, x, y, s) => {
    shield(c, x, y, s, '#ffffff', '#c1121f');
    c.strokeStyle = '#8a5a34';
    c.lineWidth = s * 0.16;
    c.beginPath();
    c.moveTo(x - s * 0.1, y + s * 1.0);
    c.quadraticCurveTo(x + s * 0.2, y + s * 0.3, x, y - s * 0.3);
    c.stroke();
    c.fillStyle = '#2ea44f';
    for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
      ell(c, x + Math.cos(a) * s * 0.42, y - s * 0.3 + Math.sin(a) * s * 0.28, s * 0.42, s * 0.12, a);
      c.fill();
    }
    c.fillStyle = '#6b3a1a';
    ell(c, x + s * 0.05, y - s * 0.15, s * 0.11, s * 0.11);
    c.fill();
  },
  jaiba: (c, x, y, s) => {
    shield(c, x, y, s, '#ffffff', '#1565c0');
    // olas del muelle abajo y una jaiba naranja encima
    c.save();
    shieldPath(c, x, y, s);
    c.clip();
    c.fillStyle = '#1565c0';
    c.beginPath();
    c.moveTo(x - s, y + s * 0.75);
    for (let i = 0; i <= 4; i++)
      c.quadraticCurveTo(x - s + (i - 0.5) * s * 0.5, y + s * 0.5, x - s + i * s * 0.5, y + s * 0.75);
    c.lineTo(x + s, y + s * 1.4);
    c.lineTo(x - s, y + s * 1.4);
    c.fill();
    c.restore();
    c.fillStyle = '#ff7a3d';
    ell(c, x, y + s * 0.25, s * 0.45, s * 0.3);
    c.fill();
    for (const k of [-1, 1]) {
      ell(c, x + k * s * 0.55, y - s * 0.2, s * 0.17, s * 0.13);
      c.fill();
      c.strokeStyle = '#ff7a3d';
      c.lineWidth = s * 0.08;
      c.beginPath();
      c.moveTo(x + k * s * 0.35, y + s * 0.15);
      c.lineTo(x + k * s * 0.55, y - s * 0.1);
      c.stroke();
    }
  },
  // la Bicolor: medalla redonda propia con las franjas y las cinco estrellas de la bandera (sin letras ni logo oficial)
  bicolor: (c, x, y, s) => {
    c.save();
    c.beginPath();
    c.arc(x, y, s, 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();
    c.clip();
    c.fillStyle = BLUE;
    c.fillRect(x - s, y - s, s * 2, s * 0.68);
    c.fillRect(x - s, y + s * 0.32, s * 2, s * 0.68);
    c.restore();
    c.fillStyle = BLUE;
    for (const [dx, dy] of [
      [0, 0],
      [-0.4, -0.18],
      [0.4, -0.18],
      [-0.4, 0.18],
      [0.4, 0.18],
    ])
      star(c, x + dx * s, y + dy * s, s * 0.15);
    c.lineWidth = Math.max(2, s * 0.14);
    c.strokeStyle = HBLUE;
    c.beginPath();
    c.arc(x, y, s, 0, Math.PI * 2);
    c.stroke();
    c.lineWidth = Math.max(1, s * 0.05);
    c.strokeStyle = '#ffffff';
    c.beginPath();
    c.arc(x, y, s * 0.86, 0, Math.PI * 2);
    c.stroke();
  },
};
interface Kit {
  bg: string;
  fg: string;
  /** tercer color: filete de la franja, de los costados o de las mitades */
  acc: string;
  kind: 'band' | 'sides' | 'pin' | 'vstripes' | 'chevron' | 'halves' | 'shards';
  crest: string;
  num: string;
  long?: boolean;
}
function jersey(c: Ctx, skin: string, o: Kit): Sleeve {
  const paint = (a: Ctx, w: number, h: number, off = 0) => {
    a.fillStyle = o.bg;
    a.fillRect(0, 0, w, h);
    a.fillStyle = o.fg;
    if (o.kind === 'band') {
      a.fillRect(0, 62, w, 18);
      a.fillStyle = o.acc;
      a.fillRect(0, 82, w, 9);
    } else if (o.kind === 'sides') {
      for (const x of [128, 384]) a.fillRect(x - 20 - off, 0, 40, h);
      a.fillStyle = o.acc;
      for (const x of [128, 384]) a.fillRect(x - 6 - off, 0, 12, h);
    } else if (o.kind === 'pin') {
      for (let x = 4; x < w; x += 26) a.fillRect(x, 0, 5, h);
    } else if (o.kind === 'vstripes') {
      for (let x = 0; x < w; x += 64) a.fillRect(x + 32, 0, 28, h);
    } else if (o.kind === 'chevron') {
      a.beginPath();
      a.moveTo(156 - off, 30);
      a.lineTo(256 - off, 100);
      a.lineTo(356 - off, 30);
      a.lineTo(356 - off, 54);
      a.lineTo(256 - off, 124);
      a.lineTo(156 - off, 54);
      a.closePath();
      a.fill();
    } else if (o.kind === 'halves') {
      a.fillRect(0, 0, w / 2, h);
      a.fillStyle = o.acc;
      for (let y = 0; y < h; y += 34) a.fillRect(w / 2, y, w / 2, 14);
    } else if (o.kind === 'shards') {
      a.fillStyle = 'rgba(0,0,0,0.32)';
      for (let x = -60; x < w; x += 70) {
        a.beginPath();
        a.moveTo(x, 0);
        a.lineTo(x + 40, 0);
        a.lineTo(x + 90, h);
        a.lineTo(x + 60, h);
        a.closePath();
        a.fill();
      }
    }
  };
  paint(c, 512, HEM);
  folds(c);
  neck(c, skin, 'v', o.fg === o.bg ? dark(o.bg, 0.3) : o.fg);
  const crest = CRESTS[o.crest];
  crest?.(c, 256, 84, 30);
  const on = lum(o.bg) > 0.55 ? '#14213d' : '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = FONT(80);
  c.lineWidth = 6;
  c.strokeStyle = on === '#ffffff' ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.7)';
  for (const x of [0, 512]) {
    c.strokeText(o.num, x, 100);
    c.fillStyle = on;
    c.fillText(o.num, x, 100);
  }
  return {
    len: o.long ? 236 : 100,
    paint: (a, len) => {
      a.save();
      a.beginPath();
      a.rect(0, 0, 128, len);
      a.clip();
      paint(a, 128, len, 192);
      a.restore();
      a.fillStyle = o.fg === o.bg ? dark(o.bg, 0.3) : o.fg;
      a.fillRect(0, len - 10, 128, 10);
    },
  };
}
function macaw(c: Ctx, x: number, y: number, s: number, flip = 1) {
  c.save();
  c.translate(x, y);
  c.scale(flip * s, s);
  c.fillStyle = '#d62828';
  c.beginPath();
  c.moveTo(-4, 8);
  c.lineTo(-10, 46);
  c.lineTo(-2, 46);
  c.lineTo(4, 10);
  c.fill();
  c.fillStyle = '#1e5bd8';
  c.beginPath();
  c.moveTo(-8, 34);
  c.lineTo(-10, 46);
  c.lineTo(-2, 46);
  c.lineTo(0, 34);
  c.fill();
  c.fillStyle = '#e63946';
  ell(c, 0, 0, 9, 15, 0.2);
  c.fill();
  c.fillStyle = '#ffc93c';
  ell(c, 5, 2, 7, 10, 0.5);
  c.fill();
  c.fillStyle = '#2e9e4f';
  ell(c, 7, 8, 6, 7, 0.5);
  c.fill();
  c.fillStyle = '#1e5bd8';
  ell(c, 8, 14, 5, 7, 0.5);
  c.fill();
  c.fillStyle = '#e63946';
  ell(c, -2, -16, 8, 8);
  c.fill();
  c.fillStyle = '#ffffff';
  ell(c, -5, -16, 4.5, 4);
  c.fill();
  c.fillStyle = '#111';
  ell(c, -5, -16, 1.5, 1.5);
  c.fill();
  c.fillStyle = '#f2e6c9';
  c.beginPath();
  c.moveTo(-9, -19);
  c.quadraticCurveTo(-17, -16, -12, -8);
  c.lineTo(-8, -12);
  c.closePath();
  c.fill();
  c.restore();
}
function leaf(c: Ctx, x: number, y: number, s: number, a: number) {
  c.save();
  c.translate(x, y);
  c.rotate(a);
  c.fillStyle = '#1f8a4c';
  ell(c, 0, 0, 22 * s, 8 * s);
  c.fill();
  c.strokeStyle = '#0f5a30';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-20 * s, 0);
  c.lineTo(20 * s, 0);
  c.stroke();
  c.restore();
}
function guacaPrint(a: Ctx, w: number, h: number, bg: string, seed = 2) {
  a.fillStyle = bg;
  a.fillRect(0, 0, w, h);
  const r = rng(seed);
  for (let i = 0; i < w / 40; i++) leaf(a, r() * w, r() * h, 1 + r() * 0.5, r() * 3);
  for (let y = 34, row = 0; y < h + 40; y += 96, row++)
    for (let x = 30 + (row % 2) * 64; x < w + 50; x += 128)
      macaw(a, x, y, 1.55, (row + Math.round(x / 90)) % 2 ? 1 : -1);
}
function plaid(a: Ctx, w: number, h: number) {
  a.fillStyle = '#ffd21f';
  a.fillRect(0, 0, w, h);
  a.fillStyle = 'rgba(0,0,0,0.85)';
  for (let x = 10; x < w; x += 40) a.fillRect(x, 0, 10, h);
  for (let y = 10; y < h; y += 40) a.fillRect(0, y, w, 10);
  a.fillStyle = 'rgba(255,255,255,0.9)';
  for (let x = 26; x < w; x += 40) a.fillRect(x, 0, 4, h);
  for (let y = 26; y < h; y += 40) a.fillRect(0, y, w, 4);
}
function fret(a: Ctx, x: number, y: number, w: number, h: number, bg: string, fg: string) {
  a.fillStyle = bg;
  a.fillRect(x, y, w, h);
  a.strokeStyle = fg;
  a.lineWidth = 3;
  a.beginPath();
  for (let i = 0; i < w; i += h) {
    a.moveTo(x + i + 2, y + h - 3);
    a.lineTo(x + i + 2, y + 3);
    a.lineTo(x + i + h - 4, y + 3);
    a.lineTo(x + i + h - 4, y + h / 2);
    a.lineTo(x + i + h / 2, y + h / 2);
  }
  a.stroke();
}
const tiers = (a: Ctx, w: number, y0: number, h: number, cols: string[]) => {
  const n = cols.length,
    bh = h / n;
  cols.forEach((col, i) => {
    a.fillStyle = col;
    a.fillRect(0, y0 + i * bh, w, bh);
    a.fillStyle = '#ffffff';
    for (let x = 0; x < w; x += 12) {
      a.beginPath();
      a.arc(x + 6, y0 + (i + 1) * bh - 1, 4, 0, Math.PI);
      a.fill();
    }
  });
};
const PUNTA = ['#00b4c6', '#ffd21f', '#ff7a1a', '#ff3d7f'];
// Camisetas de club: colores, patrón y escudo salen de shared/data/apodos.json (escudos propios, ver CRESTS).
type Equipo = { colores: string[]; patron?: string; numero?: string; escudo?: string; camisas: string[] };
const CLUB: Record<string, Kit> = {
  camisa_portero: {
    bg: '#25c46b',
    fg: '#111111',
    acc: '#111111',
    kind: 'shards',
    crest: 'bicolor',
    num: '1',
    long: true,
  },
};
for (const e of apodos.equipos as Equipo[])
  if (e.patron)
    for (const id of e.camisas)
      CLUB[id] = {
        bg: e.colores[0],
        fg: e.colores[1],
        acc: e.colores[2] ?? e.colores[1],
        kind: e.patron as Kit['kind'],
        crest: e.escudo ?? '',
        num: e.numero ?? '10',
      };
function trajes(c: Ctx, cfg: AvatarConfig): Sleeve | null {
  const t = cfg.shirtColor,
    skin = cfg.skin,
    m = cfg.body === 'm',
    id = cfg.shirt;
  if (CLUB[id]) return jersey(c, skin, CLUB[id]);
  switch (id) {
    case 'camisa_guacamaya': {
      guacaPrint(c, 512, HEM, t);
      folds(c);
      neck(c, skin, 'v');
      lapels(c, dark(t, 0.15));
      buttons(c, '#f2e6c9', [70, 100, 130, 158]);
      return {
        len: 100,
        paint: (a, len) => {
          a.save();
          a.beginPath();
          a.rect(0, 0, 128, len);
          a.clip();
          guacaPrint(a, 128, len, t, 9);
          a.restore();
          a.fillStyle = dark(t, 0.15);
          a.fillRect(0, len - 9, 128, 9);
        },
      };
    }
    case 'camisa_estrellas':
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 512, HEM);
      c.fillStyle = BLUE;
      c.fillRect(0, 0, 512, 30);
      c.fillRect(0, HEM - 30, 512, 30);
      folds(c);
      neck(c, skin, 'round', BLUE);
      c.fillStyle = BLUE;
      for (const [x, y, r] of [
        [256, 94, 30],
        [192, 58, 22],
        [320, 58, 22],
        [192, 132, 22],
        [320, 132, 22],
      ])
        star(c, x, y, r);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = FONT(22);
      for (const x of [0, 512]) c.fillText('HONDURAS', x, 80);
      c.font = FONT(44);
      for (const x of [0, 512]) c.fillText('5', x, 118);
      return {
        len: 100,
        paint: (a, len) => {
          a.fillStyle = '#ffffff';
          a.fillRect(0, 0, 128, len);
          a.fillStyle = BLUE;
          a.fillRect(0, len - 22, 128, 22);
          a.fillStyle = '#ffffff';
          for (let i = 0; i < 3; i++) star(a, 34 + i * 30, len - 11, 6);
        },
      };
    case 'camisa_catracho':
      c.fillStyle = '#16161a';
      c.fillRect(0, 0, 512, HEM);
      folds(c);
      neck(c, skin, 'round', '#2b2b30');
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
      c.fillStyle = BLUE;
      c.fillRect(170, 40, 172, 8);
      c.fillRect(170, 132, 172, 8);
      c.font = FONT(44);
      c.fillStyle = '#ffffff';
      c.fillText('CATRA', 256, 72);
      c.fillStyle = BLUE;
      c.fillText('CHO', 256, 110);
      c.font = FONT(14);
      c.fillStyle = '#ffffff';
      c.fillText('HECHO EN HONDURAS · 504', 256, 152);
      c.font = FONT(56);
      for (const x of [0, 512]) {
        c.fillStyle = BLUE;
        c.fillText('HN', x, 96);
      }
      return {
        len: 100,
        paint: (a, len) => {
          a.fillStyle = '#16161a';
          a.fillRect(0, 0, 128, len);
          a.fillStyle = BLUE;
          a.fillRect(0, 36, 128, 8);
          a.fillStyle = '#ffffff';
          a.fillRect(0, 44, 128, 8);
          a.fillStyle = BLUE;
          a.fillRect(0, 52, 128, 8);
          a.fillStyle = '#2b2b30';
          a.fillRect(0, len - 9, 128, 9);
        },
      };
    case 'vestido_lenca': {
      c.fillStyle = t;
      c.fillRect(0, 0, 512, HEM);
      folds(c);
      for (const y of [50, 70]) {
        ribbons(c, 0, y, 512, 12, 3, y / 10);
      }
      c.fillStyle = '#ffffff';
      for (let x = 0; x < 512; x += 10) {
        c.beginPath();
        c.arc(x + 5, 86, 3.5, 0, Math.PI);
        c.fill();
      }
      c.fillStyle = light(t, 0.25);
      c.fillRect(0, HEM - 22, 512, 10);
      neck(c, skin, m ? 'wide' : 'round', m ? undefined : dark(t, 0.3));
      if (m) {
        c.fillStyle = '#ffffff';
        for (let x = 170; x < 342; x += 10) {
          c.beginPath();
          c.arc(x + 5, 44 - Math.abs(x - 256) * 0.1, 4, 0, Math.PI);
          c.fill();
        }
      }
      return {
        len: m ? 62 : 100,
        paint: (a, len) => {
          a.fillStyle = t;
          a.fillRect(0, 0, 128, len);
          ribbons(a, 0, len - 22, 128, 14, 3, 1);
          a.fillStyle = '#ffffff';
          for (let x = 0; x < 128; x += 10) {
            a.beginPath();
            a.arc(x + 5, len - 6, 4, 0, Math.PI);
            a.fill();
          }
        },
      };
    }
    case 'blusa_garifuna':
      plaid(c, 512, HEM);
      folds(c);
      neck(c, skin, m ? 'wide' : 'round', '#111111');
      if (m) {
        c.fillStyle = '#ffffff';
        c.fillRect(0, 22, 512, 10);
        for (let x = 0; x < 512; x += 12) {
          c.beginPath();
          c.arc(x + 6, 32, 5, 0, Math.PI);
          c.fill();
        }
      }
      return {
        len: m ? 70 : 100,
        paint: (a, len) => {
          a.save();
          a.beginPath();
          a.rect(0, 0, 128, len);
          a.clip();
          plaid(a, 128, len);
          a.restore();
          a.fillStyle = '#ffffff';
          a.fillRect(0, len - 10, 128, 10);
        },
      };
    case 'blusa_punta':
      c.fillStyle = '#ffffff';
      c.fillRect(0, 0, 512, HEM);
      tiers(c, 512, m ? 26 : 40, m ? 60 : 50, [PUNTA[2], PUNTA[0]]);
      folds(c);
      c.fillStyle = PUNTA[3];
      c.fillRect(0, HEM - 20, 512, 14);
      neck(c, skin, m ? 'wide' : 'round', PUNTA[0]);
      return {
        len: m ? 56 : 100,
        paint: (a, len) => {
          a.fillStyle = PUNTA[0];
          a.fillRect(0, 0, 128, len);
          tiers(a, 128, len - 26, 26, [PUNTA[1]]);
        },
      };
    case 'pecho_maya':
      c.fillStyle = skin;
      c.fillRect(0, 0, 512, HEM);
      if (m) {
        c.fillStyle = '#f4ecd8';
        c.fillRect(0, 26, 512, HEM - 26);
        fret(c, 0, 26, 512, 22, '#1b8a6b', '#ffd34d');
        fret(c, 0, HEM - 30, 512, 22, '#b3261e', '#f4ecd8');
      } else {
        c.strokeStyle = '#b3261e';
        c.lineWidth = 6;
        for (const s of [-1, 1]) {
          c.beginPath();
          c.moveTo(256 + s * 30, 120);
          c.lineTo(256 + s * 70, 150);
          c.moveTo(256 + s * 40, 135);
          c.lineTo(256 + s * 80, 160);
          c.stroke();
        }
        c.fillStyle = 'rgba(0,0,0,0.08)';
        ell(c, 256, 140, 30, 18);
        c.fill();
      }
      return {
        len: 30,
        paint: (a, len) => {
          a.fillStyle = skin;
          a.fillRect(0, 0, 128, len);
          a.fillStyle = '#ffcf40';
          a.fillRect(0, len - 12, 128, 9);
          a.fillStyle = '#2fae77';
          a.fillRect(0, len - 9, 128, 3);
        },
      };
    case 'tunica_escriba':
      c.fillStyle = '#f4ecd8';
      c.fillRect(0, 0, 512, HEM);
      weave(c, 512, HEM, 0.06);
      folds(c);
      fret(c, 0, HEM - 28, 512, 22, '#1b1b1e', '#e63946');
      neck(c, skin, 'round', '#e63946');
      c.fillStyle = '#1b1b1e';
      for (const [x, y] of [
        [230, 70],
        [282, 70],
        [256, 104],
      ]) {
        c.fillRect(x - 10, y - 10, 20, 20);
        c.fillStyle = '#e63946';
        ell(c, x, y, 5, 5);
        c.fill();
        c.fillStyle = '#1b1b1e';
      }
      return {
        len: 64,
        paint: (a, len) => {
          a.fillStyle = '#f4ecd8';
          a.fillRect(0, 0, 128, len);
          a.fillStyle = '#e63946';
          a.fillRect(0, len - 12, 128, 6);
          a.fillStyle = '#1b1b1e';
          a.fillRect(0, len - 6, 128, 6);
        },
      };
    case 'pecho_pelota':
      c.fillStyle = skin;
      c.fillRect(0, 0, 512, HEM);
      if (m) {
        c.fillStyle = '#c9772b';
        c.fillRect(0, 30, 512, HEM - 70);
        fret(c, 0, 30, 512, 18, '#7a3d12', '#f4ecd8');
      } else {
        c.strokeStyle = 'rgba(255,255,255,0.85)';
        c.lineWidth = 5;
        for (const s of [-1, 1])
          for (let i = 0; i < 3; i++) {
            c.beginPath();
            c.moveTo(256 + s * (40 + i * 14), 60);
            c.lineTo(256 + s * (30 + i * 14), 140);
            c.stroke();
          }
      }
      return {
        len: 26,
        paint: (a, len) => {
          a.fillStyle = skin;
          a.fillRect(0, 0, 128, len);
          a.fillStyle = '#9a6a3a';
          a.fillRect(0, len - 12, 128, 10);
        },
      };
  }
  return null;
}

function shirt(c: Ctx, cfg: AvatarConfig): Sleeve {
  const tr = trajes(c, cfg);
  if (tr) return tr;
  const t = cfg.shirtColor,
    skin = cfg.skin,
    on = lum(t) > 0.45 ? '#1d1d1f' : '#ffffff';
  const plain = (col: string, cuff?: string): Sleeve => ({
    len: 100,
    paint: (a, len) => {
      a.fillStyle = col;
      a.fillRect(0, 0, 128, len);
      a.fillStyle = cuff ?? dark(col, 0.18);
      a.fillRect(0, len - 9, 128, 9);
    },
  });
  switch (cfg.shirt) {
    case 'camisa_rayas': {
      const b = lum(t) > 0.7 ? '#0d47a1' : '#ffffff';
      c.fillStyle = b;
      c.fillRect(0, 0, 512, HEM);
      c.fillStyle = t;
      for (let y = 4; y < HEM; y += 24) c.fillRect(0, y, 512, 12);
      folds(c);
      neck(c, skin, 'round', dark(t, 0.2));
      return {
        len: 100,
        paint: (a, len) => {
          a.fillStyle = b;
          a.fillRect(0, 0, 128, len);
          a.fillStyle = t;
          for (let y = 6; y < len; y += 24) a.fillRect(0, y, 128, 12);
          a.fillStyle = dark(t, 0.2);
          a.fillRect(0, len - 8, 128, 8);
        },
      };
    }
    case 'camisa_cuadros': {
      const grid = (a: Ctx, w: number, h: number) => {
        a.fillStyle = t;
        a.fillRect(0, 0, w, h);
        a.fillStyle = 'rgba(0,0,0,0.24)';
        for (let x = 6; x < w; x += 32) a.fillRect(x, 0, 13, h);
        for (let y = 6; y < h; y += 32) a.fillRect(0, y, w, 13);
        a.fillStyle = 'rgba(255,255,255,0.4)';
        for (let x = 26; x < w; x += 32) a.fillRect(x, 0, 2.5, h);
        for (let y = 26; y < h; y += 32) a.fillRect(0, y, w, 2.5);
      };
      grid(c, 512, HEM);
      folds(c);
      c.fillStyle = light(t, 0.25);
      c.fillRect(249, 30, 14, HEM - 30);
      neck(c, skin, 'v');
      lapels(c, light(t, 0.3));
      buttons(c, '#ffffff', [66, 92, 118, 144]);
      return {
        len: 100,
        paint: (a, len) => {
          a.save();
          a.beginPath();
          a.rect(0, 0, 128, len);
          a.clip();
          grid(a, 128, len);
          a.restore();
          a.fillStyle = light(t, 0.25);
          a.fillRect(0, len - 10, 128, 10);
        },
      };
    }
    case 'camisa_504':
      c.fillStyle = t;
      c.fillRect(0, 0, 512, HEM);
      folds(c);
      neck(c, skin, 'round', dark(t, 0.25));
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.lineJoin = 'round';
      c.font = FONT(74);
      c.strokeStyle = on === '#ffffff' ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.5)';
      c.lineWidth = 7;
      c.strokeText('504', 256, 112);
      c.fillStyle = on;
      c.fillText('504', 256, 112);
      c.font = FONT(15);
      c.fillText('CATRACHO', 256, 62);
      c.fillStyle = BLUE;
      for (let i = 0; i < 5; i++) star(c, 216 + i * 20, 154, 6);
      c.fillStyle = on;
      c.font = FONT(30);
      for (const x of [0, 512]) c.fillText('HN', x, 70);
      return plain(t, dark(t, 0.25));
    case 'camisa_h':
    case 'camisa_h_azul': {
      const blue = cfg.shirt === 'camisa_h_azul',
        bg = blue ? HBLUE : '#f7f9fc',
        fg = blue ? '#ffffff' : HBLUE;
      c.fillStyle = bg;
      c.fillRect(0, 0, 512, HEM);
      c.fillStyle = fg;
      c.fillRect(116, 0, 24, HEM);
      c.fillRect(372, 0, 24, HEM);
      c.fillStyle = BLUE;
      c.fillRect(124, 0, 8, HEM);
      c.fillRect(380, 0, 8, HEM);
      folds(c);
      neck(c, skin, 'v', fg);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      CRESTS.bicolor(c, 256, 92, 34);
      c.fillStyle = fg;
      c.font = FONT(84);
      for (const x of [0, 512]) c.fillText(blue ? '9' : '10', x, 106);
      c.font = FONT(17);
      for (const x of [0, 512]) c.fillText('HONDURAS', x, 46);
      return {
        len: 100,
        paint: (a, len) => {
          a.fillStyle = bg;
          a.fillRect(0, 0, 128, len);
          a.fillStyle = fg;
          a.fillRect(0, len - 14, 128, 14);
          a.fillStyle = BLUE;
          a.fillRect(0, len - 9, 128, 4);
          a.fillStyle = fg;
          a.fillRect(0, 0, 128, 10);
        },
      };
    }
    case 'guayabera': {
      c.fillStyle = GUAYA;
      c.fillRect(0, 0, 512, HEM);
      folds(c);
      for (const x of [212, 300, 44, 468])
        for (const d of [-5, 0, 5]) {
          c.strokeStyle = 'rgba(120,100,70,0.5)';
          c.lineWidth = 1.6;
          c.beginPath();
          c.moveTo(x + d, 20);
          c.lineTo(x + d, HEM - 4);
          c.stroke();
          c.strokeStyle = 'rgba(255,255,255,0.8)';
          c.beginPath();
          c.moveTo(x + d + 1.6, 20);
          c.lineTo(x + d + 1.6, HEM - 4);
          c.stroke();
        }
      c.strokeStyle = 'rgba(120,100,70,0.6)';
      c.lineWidth = 1.6;
      for (const x of [212, 300])
        for (const [y, h] of [
          [58, 24],
          [122, 30],
        ]) {
          c.fillStyle = GUAYA;
          c.fillRect(x - 17, y, 34, h);
          c.strokeRect(x - 17, y, 34, h);
          c.fillStyle = '#cdbf9d';
          c.beginPath();
          c.arc(x, y + 5, 2.6, 0, 7);
          c.fill();
        }
      c.strokeStyle = 'rgba(120,100,70,0.5)';
      for (const x of [250, 262]) {
        c.beginPath();
        c.moveTo(x, 34);
        c.lineTo(x, HEM);
        c.stroke();
      }
      neck(c, skin, 'v');
      lapels(c, '#fffdf6');
      buttons(c, '#d8cdb0', [62, 86, 110, 134, 158]);
      return {
        len: 104,
        paint: (a, len) => {
          a.fillStyle = GUAYA;
          a.fillRect(0, 0, 128, len);
          a.strokeStyle = 'rgba(120,100,70,0.5)';
          a.lineWidth = 1.6;
          for (const d of [-5, 0, 5]) {
            a.beginPath();
            a.moveTo(64 + d, 8);
            a.lineTo(64 + d, len - 12);
            a.stroke();
          }
          a.fillStyle = '#fffdf6';
          a.fillRect(0, len - 12, 128, 12);
          a.strokeRect(-2, len - 12, 132, 14);
        },
      };
    }
    case 'camisa_manta':
      c.fillStyle = MANTA;
      c.fillRect(0, 0, 512, HEM);
      weave(c, 512, HEM);
      folds(c);
      neck(c, skin, 'round');
      c.fillStyle = skin;
      c.beginPath();
      c.moveTo(243, 20);
      c.lineTo(256, 78);
      c.lineTo(269, 20);
      c.fill();
      c.strokeStyle = '#7a4a22';
      c.lineWidth = 2.2;
      for (let i = 0; i < 3; i++) {
        const y = 34 + i * 13,
          w = 11 - i * 2.5;
        c.beginPath();
        c.moveTo(256 - w, y);
        c.lineTo(256 + w, y + 9);
        c.moveTo(256 + w, y);
        c.lineTo(256 - w, y + 9);
        c.stroke();
      }
      c.save();
      c.beginPath();
      c.ellipse(256, 6, 50, 36, 0, 0, 7);
      c.ellipse(256, 6, 37, 25, 0, 0, 7);
      c.clip('evenodd');
      trim(c, 196, 0, 120, 44);
      c.restore();
      trim(c, 0, HEM - 18, 512, 13);
      return {
        len: 236,
        paint: (a, len) => {
          a.fillStyle = MANTA;
          a.fillRect(0, 0, 128, len);
          a.save();
          a.beginPath();
          a.rect(0, 0, 128, len);
          a.clip();
          weave(a, 128, len);
          a.restore();
          trim(a, 0, len - 16, 128, 12);
        },
      };
    case 'blusa_tipica':
      c.fillStyle = '#fbfbf8';
      c.fillRect(0, 0, 512, HEM);
      folds(c);
      ribbons(c, 0, 22, 512, 46, 6);
      for (let i = 0; i < 11; i++) {
        const x = 24 + i * 46.5,
          y = i % 2 ? 100 : 124;
        c.fillStyle = '#2ea44f';
        ell(c, x - 6, y + 4, 5, 2.4, 0.5);
        c.fill();
        ell(c, x + 6, y + 4, 5, 2.4, -0.5);
        c.fill();
        c.fillStyle = RIBBON[i % 6 === 2 ? 4 : i % 6];
        for (let k = 0; k < 5; k++) {
          c.beginPath();
          c.arc(x + Math.cos(k * 1.257) * 4, y + Math.sin(k * 1.257) * 4, 3, 0, 7);
          c.fill();
        }
        c.fillStyle = '#ffc93c';
        c.beginPath();
        c.arc(x, y, 2.2, 0, 7);
        c.fill();
      }
      c.fillStyle = '#e63946';
      c.fillRect(0, HEM - 18, 512, 12);
      c.fillStyle = '#ffc93c';
      c.fillRect(0, HEM - 14, 512, 3);
      neck(c, skin, 'wide');
      return {
        len: 78,
        paint: (a, len) => {
          a.fillStyle = '#fbfbf8';
          a.fillRect(0, 0, 128, len);
          ribbons(a, 0, len - 30, 128, 30, 4, 2);
        },
      };
    default:
      c.fillStyle = t;
      c.fillRect(0, 0, 512, HEM);
      folds(c);
      neck(c, skin, 'round', dark(t, 0.22));
      c.fillStyle = 'rgba(255,255,255,0.1)';
      ell(c, 256, 90, 70, 50);
      c.fill();
      return plain(t);
  }
}

const JEAN = '#3f6fb4';
function pantsTop(c: Ctx, cfg: AvatarConfig) {
  const t = cfg.pantsColor,
    y0 = HEM,
    h = 256 - HEM,
    p = cfg.pants;
  const belt = (col: string) => {
    c.fillStyle = col;
    c.fillRect(0, y0, 512, 9);
    c.fillStyle = '#e8c458';
    c.fillRect(248, y0 - 1, 16, 11);
    c.fillStyle = col;
    c.fillRect(252, y0 + 2, 8, 5);
  };
  const fly = (col: string) => {
    c.strokeStyle = col;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(256, y0 + 9);
    c.lineTo(256, 256);
    c.stroke();
    for (const s of [-1, 1]) {
      c.beginPath();
      c.arc(256 + s * 108, y0 + 4, 44, s > 0 ? Math.PI * 0.5 : 0, s > 0 ? Math.PI : Math.PI * 0.5);
      c.stroke();
    }
  };
  if (p === 'jeans') {
    c.fillStyle = JEAN;
    c.fillRect(0, y0, 512, h);
    c.setLineDash([4, 3]);
    fly('#f0a03c');
    c.setLineDash([]);
    belt('#5a3a22');
    for (const x of [40, 472]) {
      c.strokeStyle = '#f0a03c';
      c.lineWidth = 1.4;
      c.setLineDash([4, 3]);
      c.strokeRect(x - 26, y0 + 22, 52, 46);
      c.setLineDash([]);
    }
  } else if (p === 'short_futbol') {
    c.fillStyle = t;
    c.fillRect(0, y0, 512, h);
    const o = lum(t) > 0.7 ? HBLUE : '#ffffff';
    c.fillStyle = o;
    c.fillRect(120, y0, 16, h);
    c.fillRect(376, y0, 16, h);
    c.fillStyle = dark(t, 0.2);
    c.fillRect(0, y0, 512, 7);
    c.strokeStyle = o;
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(256, y0 + 6);
    c.lineTo(248, y0 + 26);
    c.moveTo(256, y0 + 6);
    c.lineTo(264, y0 + 26);
    c.stroke();
  } else if (p === 'pantalon_manta') {
    c.fillStyle = MANTA;
    c.fillRect(0, y0, 512, h);
    c.save();
    c.translate(0, y0);
    weave(c, 512, h);
    c.restore();
    c.fillStyle = '#c9b68a';
    c.fillRect(0, y0, 512, 7);
    c.strokeStyle = '#a07a3c';
    c.lineWidth = 2.4;
    c.beginPath();
    c.moveTo(256, y0 + 6);
    c.quadraticCurveTo(240, y0 + 20, 246, y0 + 34);
    c.moveTo(256, y0 + 6);
    c.quadraticCurveTo(272, y0 + 20, 266, y0 + 34);
    c.stroke();
  } else if (p === 'falda_tipica') {
    c.fillStyle = SKIRT;
    c.fillRect(0, y0, 512, h);
    c.fillStyle = '#ffc93c';
    c.fillRect(0, y0, 512, 8);
    c.fillStyle = '#ffffff';
    c.fillRect(0, y0 + 8, 512, 2);
  } else if (cut(cfg) !== 'pants') {
    region(c, [0, y0, 512, h], () => skirt(c, cfg, 512, h));
    c.fillStyle = 'rgba(0,0,0,0.25)';
    c.fillRect(0, y0, 512, 6);
  } else if (p === 'falda_lenca') {
    c.fillStyle = '#1d2a4a';
    c.fillRect(0, y0, 512, h);
    belt('#3a2416');
  } else if (p === 'falda_garifuna' || p === 'falda_punta') {
    c.fillStyle = '#f7f5ee';
    c.fillRect(0, y0, 512, h);
    c.fillStyle = p === 'falda_punta' ? PUNTA[2] : '#ffd21f';
    c.fillRect(0, y0, 512, 12);
    c.fillStyle = '#111';
    c.fillRect(0, y0 + 12, 512, 3);
  } else {
    c.fillStyle = t;
    c.fillRect(0, y0, 512, h);
    fly(dark(t, 0.3));
    belt(lum(t) < 0.08 ? '#6b4a2a' : '#2a2018');
  }
  const g = c.createLinearGradient(0, y0, 0, y0 + 14);
  g.addColorStop(0, 'rgba(0,0,0,0.22)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  if (cut(cfg) === 'pants') {
    c.fillStyle = g;
    c.fillRect(0, y0 + 9, 512, 14);
  }
}
function leg(c: Ctx, cfg: AvatarConfig) {
  const t = cfg.pantsColor,
    p = cfg.pants,
    W = 128,
    H = 256;
  skinFill(c, W, H, cfg.skin, 11, 0.8);
  const seams = (col: string, to: number) => {
    c.strokeStyle = col;
    c.lineWidth = 1.5;
    for (const x of [32, 96]) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, to);
      c.stroke();
    }
  };
  const shadeFront = (to: number) => {
    const g = c.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.12)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.1)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = g;
    c.fillRect(0, 0, W, to);
  };
  if (p === 'jeans') {
    c.fillStyle = JEAN;
    c.fillRect(0, 0, W, H);
    shadeFront(H);
    c.fillStyle = 'rgba(255,255,255,0.14)';
    ell(c, 64, 126, 22, 30);
    c.fill();
    c.setLineDash([4, 3]);
    seams('#f0a03c', 236);
    c.setLineDash([]);
    c.fillStyle = '#9dbde6';
    c.fillRect(0, 234, W, 22);
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(0, 232, W, 2.5);
  } else if (p === 'short_futbol') {
    const o = lum(t) > 0.7 ? HBLUE : '#ffffff';
    c.fillStyle = t;
    c.fillRect(0, 0, W, 104);
    shadeFront(104);
    c.fillStyle = o;
    c.fillRect(26, 0, 12, 104);
    c.fillRect(90, 0, 12, 104);
    c.fillRect(0, 97, W, 7);
    c.fillStyle = '#f4f4f4';
    c.fillRect(0, 150, W, 106);
    c.fillStyle = lum(t) > 0.7 ? HBLUE : t;
    c.fillRect(0, 154, W, 9);
    c.fillRect(0, 168, W, 5);
  } else if (p === 'pantalon_manta') {
    c.fillStyle = MANTA;
    c.fillRect(0, 0, W, 214);
    c.save();
    c.beginPath();
    c.rect(0, 0, W, 214);
    c.clip();
    weave(c, W, 214);
    c.restore();
    shadeFront(214);
    trim(c, 0, 200, W, 13);
  } else if (p === 'falda_tipica') {
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, W, 60);
  } else if (cut(cfg) !== 'pants') {
    if (cut(cfg) === 'faldellin' || cut(cfg) === 'escriba' || cut(cfg) === 'yugo') {
      c.strokeStyle = '#7a4a22';
      c.lineWidth = 4;
      c.beginPath();
      for (let y = 196; y < 250; y += 14) {
        c.moveTo(0, y);
        c.lineTo(W, y + 10);
      }
      c.stroke();
      c.fillStyle = '#ffcf40';
      c.fillRect(0, 186, W, 6);
    }
  } else if (p === 'falda_lenca') {
    c.fillStyle = '#1d2a4a';
    c.fillRect(0, 0, W, H);
    shadeFront(H);
    seams('#2f3d63', H);
  } else if (p === 'falda_garifuna' || p === 'falda_punta') {
    c.fillStyle = '#f7f5ee';
    c.fillRect(0, 0, W, 230);
    shadeFront(230);
    if (p === 'falda_punta') tiers(c, W, 196, 32, [PUNTA[0], PUNTA[3]]);
    else {
      c.save();
      c.beginPath();
      c.rect(0, 200, W, 30);
      c.clip();
      plaid(c, W, 256);
      c.restore();
    }
  } else {
    c.fillStyle = t;
    c.fillRect(0, 0, W, H);
    shadeFront(H);
    seams(dark(t, 0.3), H);
    c.fillStyle = dark(t, 0.18);
    c.fillRect(0, 246, W, 10);
  }
}
const SKIRT = '#d81b60';
function skirt(c: Ctx, cfg: AvatarConfig, W = 256, H = 256) {
  const p = cfg.pants,
    t = cfg.pantsColor;
  if (p === 'falda_lenca') {
    c.fillStyle = t;
    c.fillRect(0, 0, W, H);
    for (const [y, n] of [
      [H * 0.42, 0],
      [H * 0.62, 2],
      [H * 0.8, 4],
    ] as const)
      ribbons(c, 0, y, W, 16, 3, n);
    c.fillStyle = '#ffffff';
    c.fillRect(0, H - 14, W, 14);
    c.fillStyle = t;
    for (let x = 0; x < W; x += 12) {
      c.beginPath();
      c.arc(x + 6, H - 14, 4, 0, Math.PI);
      c.fill();
    }
  } else if (p === 'falda_garifuna') {
    plaid(c, W, H);
    c.fillStyle = '#ffffff';
    c.fillRect(0, H - 18, W, 10);
    c.fillStyle = '#111';
    c.fillRect(0, H - 8, W, 8);
  } else if (p === 'falda_punta') tiers(c, W, 0, H, ['#ffffff', ...PUNTA]);
  else if (p === 'faldellin_maya') {
    c.fillStyle = '#b3261e';
    c.fillRect(0, 0, W, H);
    fret(c, 0, 8, W, 24, '#1b8a6b', '#ffd34d');
    fret(c, 0, H * 0.55, W, 24, '#1b8a6b', '#ffd34d');
    c.fillStyle = '#ffd34d';
    for (let x = 0; x < W; x += 10) c.fillRect(x + 2, H - 26, 5, 26);
    c.fillStyle = '#2fae77';
    for (let x = 0; x < W; x += 30) {
      ell(c, x + 15, H * 0.4, 8, 10);
      c.fill();
    }
  } else if (p === 'faldellin_escriba') {
    c.fillStyle = '#f4ecd8';
    c.fillRect(0, 0, W, H);
    weave(c, W, H, 0.06);
    fret(c, 0, H - 40, W, 24, '#1b1b1e', '#e63946');
    c.fillStyle = '#e63946';
    c.fillRect(0, 0, W, 10);
  } else if (p === 'yugo_pelota') {
    c.fillStyle = '#8a5a34';
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#f4ecd8';
    c.fillRect(0, H * 0.3, W, 12);
    c.fillStyle = '#b3261e';
    c.fillRect(0, H * 0.3 + 14, W, 6);
  } else {
    c.fillStyle = SKIRT;
    c.fillRect(0, 0, 256, 256);
    const bands: [string, number][] = [
      ['#ffc93c', 12],
      ['#ffffff', 3],
      ['#00a3d7', 13],
      ['#ffffff', 3],
      ['#2ea44f', 13],
      ['#ffffff', 3],
      ['#ff7a3d', 13],
      ['#ffffff', 3],
      ['#7b5cff', 13],
      ['#ffffff', 3],
      ['#ffc93c', 8],
    ];
    let y = 126;
    for (const [col, h] of bands) {
      c.fillStyle = col;
      c.fillRect(0, y, 256, h);
      y += h;
    }
    c.fillStyle = '#ffc93c';
    c.fillRect(0, 66, 256, 5);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 74, 256, 2.5);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 238, 256, 18);
    c.fillStyle = SKIRT;
    for (let x = 0; x < 256; x += 16) {
      c.beginPath();
      c.arc(x + 8, 238, 5, 0, Math.PI);
      c.fill();
    }
  }
  for (let x = 0; x < W; x += W / 12) {
    const g = c.createLinearGradient(x, 0, x + W / 12, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.2)');
    g.addColorStop(0.35, 'rgba(0,0,0,0)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = g;
    c.fillRect(x, 0, W / 12, H);
  }
}
function cape(c: Ctx) {
  c.fillStyle = BLUE;
  c.fillRect(0, 0, 192, 256);
  c.fillStyle = '#ffffff';
  c.fillRect(0, 85, 192, 86);
  c.fillStyle = BLUE;
  for (const [x, y] of [
    [96, 128],
    [58, 108],
    [134, 108],
    [58, 148],
    [134, 148],
  ])
    star(c, x, y, 12);
  for (let x = 0; x < 192; x += 32) {
    const g = c.createLinearGradient(x, 0, x + 32, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.12)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = g;
    c.fillRect(x, 0, 32, 256);
  }
}
function patterns(c: Ctx, cfg: AvatarConfig) {
  region(c, R.patA, (w, h) => {
    if (cfg.hat === 'panuelo_garifuna') {
      plaid(c, w, h);
      return;
    }
    if (cfg.hat === 'panuelo_punta') {
      for (let i = 0; i * 16 < h; i++) {
        c.fillStyle = PUNTA[i % 4];
        c.fillRect(0, i * 16, w, 16);
      }
      c.fillStyle = '#ffffff';
      for (let x = 0; x < w; x += 18)
        for (let y = 8; y < h; y += 32) {
          c.beginPath();
          c.arc(x + 9, y, 3, 0, 7);
          c.fill();
        }
      return;
    }
    const cols = ['#d81b60', '#ffc93c', '#7b1fa2', '#00a3d7', '#ffffff', '#2ea44f', '#ff7a3d', '#d81b60'];
    for (let i = 0; i * 9 < h; i++) {
      c.fillStyle = cols[i % cols.length];
      c.fillRect(0, i * 9, w, 9);
    }
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 1.4;
    for (const y of [22, 49, 76]) {
      c.beginPath();
      for (let x = 0; x <= w; x += 6) c.lineTo(x, y + ((x / 6) % 2 ? 4 : -1));
      c.stroke();
    }
  });
  region(c, R.patB1, (w, h) => {
    c.fillStyle = '#8a5a34';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(40,22,10,0.55)';
    c.lineWidth = 1.6;
    for (let x = 0; x <= w; x += 12) {
      c.beginPath();
      c.moveTo(x, 0);
      c.lineTo(x, h);
      c.stroke();
    }
    c.strokeStyle = '#f0e2c0';
    c.lineWidth = 2.4;
    c.beginPath();
    for (let i = 0; i <= 8; i++) c.lineTo((i * w) / 8, i % 2 ? 78 : 8);
    c.stroke();
    c.fillStyle = '#e63946';
    c.fillRect(0, 0, w, 7);
    c.fillStyle = '#ffc93c';
    c.fillRect(0, 80, w, 4);
  });
  region(c, R.patB2, (w, h) => {
    c.fillStyle = '#fbfbf8';
    c.fillRect(0, 0, w, h);
    ribbons(c, 0, 4, w, 70, 5);
    c.fillStyle = '#ffffff';
    for (let x = 0; x < w; x += 8) {
      c.beginPath();
      c.arc(x + 4, 78, 4, 0, 7);
      c.fill();
    }
  });
}
function swatches(c: Ctx, cfg: AvatarConfig) {
  const hat = cfg.hat,
    p = cfg.pants,
    k = cut(cfg),
    maya = k === 'faldellin' || k === 'escriba' || k === 'yugo',
    folk = maya || p === 'pantalon_manta' || p === 'falda_tipica' || p.startsWith('falda_');
  const cols: Record<SwatchName, string> = {
    skin: cfg.skin,
    lid: mix(cfg.skin, '#4a2216', 0.1),
    hair: cfg.hairColor,
    hat: hat === 'casco_explorador' ? '#d9c89a' : cfg.hatColor,
    hat2: hat === 'casco_explorador' ? '#8a6a3a' : dark(cfg.hatColor, 0.3),
    acc: cfg.accColor,
    acc2: dark(cfg.accColor, 0.32),
    shoe: p === 'short_futbol' ? '#1d1d1f' : maya ? '#b07a45' : folk ? '#8a5a34' : '#3a4352',
    sole: folk ? '#4e3420' : '#f4f4f4',
    white: '#f5f5f5',
    black: '#1b1b1e',
    gold: '#ffcf40',
    jade: '#2fae77',
    lens: '#0c0d10',
    straw: '#e6c97c',
    wood: '#cf8f3e',
    red: '#e63946',
    blue: BLUE,
    green: '#2ea44f',
    yellow: '#ffc93c',
    pink: '#ff5d9e',
    purple: '#7b5cff',
    leather: '#9a6a3a',
    drum: '#eadfc4',
  };
  for (const n of SWATCH)
    region(c, swatchCell(n), (w, h) => {
      c.fillStyle = cols[n];
      c.fillRect(0, 0, w, h);
      if (n === 'skin') skinFill(c, w, h, cfg.skin, 3, 0.6);
      else if (n === 'lid') {
        // borde del párpado con pestañas (abajo del cuadro = orilla del párpado)
        const g = c.createLinearGradient(0, 44, 0, 52);
        g.addColorStop(0, 'rgba(40,20,12,0)');
        g.addColorStop(0.5, cfg.body === 'm' ? '#120a08' : '#2a1810');
        g.addColorStop(1, '#0c0706');
        c.fillStyle = g;
        c.fillRect(0, 44, w, 20);
      } else if (n === 'hair') {
        const r = rng(5);
        for (let i = 0; i < 26; i++) {
          c.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.16)';
          c.lineWidth = 1 + r() * 1.5;
          const x = r() * w;
          c.beginPath();
          c.moveTo(x, 0);
          c.quadraticCurveTo(x + (r() - 0.5) * 14, h / 2, x + (r() - 0.5) * 8, h);
          c.stroke();
        }
      } else if (n === 'straw' || n === 'leather') {
        c.strokeStyle = n === 'straw' ? 'rgba(120,84,20,0.35)' : 'rgba(40,20,5,0.18)';
        c.lineWidth = 1;
        c.beginPath();
        for (let y = 0; y < h; y += 3) {
          c.moveTo(0, y);
          c.lineTo(w, y);
        }
        if (n === 'straw')
          for (let x = 0; x < w; x += 5) {
            c.moveTo(x, 0);
            c.lineTo(x, h);
          }
        c.stroke();
      } else if (n === 'wood') {
        c.strokeStyle = 'rgba(90,45,10,0.3)';
        c.lineWidth = 1.2;
        for (let y = 3; y < h; y += 5) {
          c.beginPath();
          c.moveTo(0, y);
          c.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y + 1);
          c.stroke();
        }
      } else if (n === 'jade') {
        const r = rng(3);
        for (let i = 0; i < 14; i++) {
          c.fillStyle = r() < 0.5 ? 'rgba(200,255,220,0.25)' : 'rgba(0,70,40,0.25)';
          ell(c, r() * w, r() * h, 4 + r() * 8, 2 + r() * 5, r() * 3);
          c.fill();
        }
      } else if (n === 'red' || n === 'blue' || n === 'green' || n === 'yellow' || n === 'pink' || n === 'purple') {
        const g = c.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.2)');
        g.addColorStop(0.5, 'rgba(255,255,255,0.22)');
        g.addColorStop(1, 'rgba(0,0,0,0.2)');
        c.fillStyle = g;
        c.fillRect(0, 0, w, h);
      }
    });
}
/** correas y bandas que se dibujan sobre la camisa */
function overlays(c: Ctx, cfg: AvatarConfig) {
  const a = cfg.acc;
  // una banda diagonal que da la vuelta al torso: del hombro izquierdo (derecha de la imagen) a la cadera contraria
  const sash = (w: number, paint: (c: Ctx, w: number, len: number) => void) => {
    for (const [x0, y0, x1, y1] of [
      [330, 0, 178, HEM + 6],
      [434, 0, 590, HEM + 6],
      [-78, 0, 78, HEM + 6],
    ]) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      c.save();
      c.translate(x0, y0);
      c.rotate(Math.atan2(y1 - y0, x1 - x0));
      paint(c, w, len);
      c.restore();
    }
  };
  if (a === 'mochila') {
    const col = dark(cfg.accColor, 0.25);
    for (const x of [208, 304]) {
      c.fillStyle = col;
      c.fillRect(x - 9, 0, 18, 150);
      c.fillStyle = 'rgba(255,255,255,0.25)';
      c.fillRect(x - 9, 0, 3, 150);
      c.fillStyle = '#c9c9c9';
      c.fillRect(x - 10, 118, 20, 7);
    }
    c.fillStyle = col;
    for (const x of [0, 494]) c.fillRect(x, 0, 18, 40);
  } else if (a === 'banda_bandera')
    sash(40, (k, w, len) => {
      k.fillStyle = BLUE;
      k.fillRect(0, -w / 2, len, w);
      k.fillStyle = '#ffffff';
      k.fillRect(0, -w / 6, len, w / 3);
      k.fillStyle = BLUE;
      for (let i = 0; i < 5; i++) star(k, len * 0.3 + i * 17, 0, 5.5);
      k.fillStyle = '#e8c458';
      k.fillRect(0, -w / 2 - 2, len, 2.5);
      k.fillRect(0, w / 2 - 0.5, len, 2.5);
    });
  else if (a === 'guitarra')
    sash(13, (k, w, len) => {
      k.fillStyle = '#5a3a22';
      k.fillRect(0, -w / 2, len, w);
      k.fillStyle = '#e8c458';
      for (let x = 8; x < len; x += 16) {
        k.beginPath();
        k.arc(x, 0, 1.8, 0, 7);
        k.fill();
      }
    });
  else if (a === 'tambor_garifuna') {
    c.strokeStyle = '#e63946';
    c.lineWidth = 9;
    c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(222, 0);
    c.lineTo(250, HEM - 20);
    c.moveTo(300, 0);
    c.lineTo(282, HEM - 20);
    c.stroke();
    c.strokeStyle = '#ffc93c';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(222, 0);
    c.lineTo(250, HEM - 20);
    c.moveTo(300, 0);
    c.lineTo(282, HEM - 20);
    c.stroke();
    c.fillStyle = '#e63946';
    c.fillRect(0, 0, 60, 12);
    c.fillRect(452, 0, 60, 12);
  }
}

export const configKey = (c: AvatarConfig) =>
  [
    c.body ?? 'h',
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
/** clases de material que el sombreador lee del canal R del mapa ORM (ver avatarMat.ts) */
export const CLS = { algodon: 0, mezclilla: 1, tejido: 2, cuero: 3, piel: 4, pelo: 5, ojo: 6, duro: 7 } as const;
type Cls = (typeof CLS)[keyof typeof CLS];
const KNIT = /olimpia|motagua|realespana|marathon|vida|victoria|portero|camisa_h|catracho|estrellas/;
export interface AvatarMaps {
  map: THREE.CanvasTexture;
  orm: THREE.DataTexture;
}
const inR = (r: Rect, x: number, y: number) => x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3];
/**
 * Mapa ORM de la configuración (a 1/4 del atlas): R = clase de material, G = rugosidad, B = metal. Lo que quedó
 * pintado del color de la piel es piel (brazos sin manga, cuello abierto, pecho maya); lo demás es la tela de su
 * región: camisa de algodón o de tejido deportivo, mezclilla, cuero de zapatos y sombrero vaquero, pelo, ojos.
 */
function ormFor(cfg: AvatarConfig, cv: HTMLCanvasElement): THREE.DataTexture {
  const k = 4,
    w = AW / k,
    h = AH / k,
    sc = document.createElement('canvas');
  sc.width = w;
  sc.height = h;
  const c = sc.getContext('2d', { willReadFrequently: true })!;
  c.drawImage(cv, 0, 0, w, h);
  const px = c.getImageData(0, 0, w, h).data,
    hex = Number.parseInt(cfg.skin.slice(1), 16),
    sk = { r: (hex >> 16) / 255, g: ((hex >> 8) & 255) / 255, b: (hex & 255) / 255 },
    d = new Uint8Array(w * h * 4);
  const shirt: Cls = KNIT.test(cfg.shirt) ? CLS.tejido : CLS.algodon,
    pants: Cls = cfg.pants === 'jeans' ? CLS.mezclilla : cfg.pants === 'short_futbol' ? CLS.tejido : CLS.algodon,
    hatC: Cls = cfg.hat === 'gorra' || cfg.hat.startsWith('panuelo') ? CLS.algodon : CLS.duro;
  const sw: Partial<Record<SwatchName, [Cls, number, number?]>> = {
    skin: [CLS.piel, 0.52],
    lid: [CLS.piel, 0.45],
    hair: [CLS.pelo, 0.42],
    hat: [hatC, hatC === CLS.duro ? 0.6 : 0.88],
    hat2: [hatC, hatC === CLS.duro ? 0.6 : 0.88],
    acc: [CLS.tejido, 0.62],
    acc2: [CLS.tejido, 0.62],
    shoe: [CLS.cuero, 0.46],
    sole: [CLS.duro, 0.8],
    white: [CLS.duro, 0.5],
    black: [CLS.duro, 0.45],
    gold: [CLS.duro, 0.3, 1],
    jade: [CLS.duro, 0.16],
    lens: [CLS.duro, 0.06],
    straw: [CLS.duro, 0.92],
    wood: [CLS.duro, 0.45],
    leather: [CLS.cuero, 0.55],
    drum: [CLS.duro, 0.7],
  };
  const ROUGH = [0.9, 0.84, 0.62, 0.5, 0.52, 0.42, 0.1, 0.55];
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4,
        X = x * k + 2,
        Y = y * k + 2;
      let cls: Cls = CLS.duro,
        rough = -1,
        metal = 0;
      if (inR(EYE_RECT, X, Y)) cls = CLS.ojo;
      else if (inR(R.face, X, Y)) {
        // zona T (frente, nariz) y labios brillan un poco más
        const sx = (X - 128) / 128,
          sy = (128 - Y) / 128,
          tz = Math.abs(sx) < 0.16 && sy > -0.35 && sy < 0.65 ? 1 : sy > 0.3 && sy < 0.65 ? 0.6 : 0,
          lips = Math.abs(sx) < 0.25 && sy < -0.46 && sy > -0.64 ? 1 : 0;
        cls = CLS.piel;
        rough = 0.52 - 0.1 * tz - 0.14 * lips;
      } else {
        const dr = px[i] / 255 - sk.r,
          dg = px[i + 1] / 255 - sk.g,
          db = px[i + 2] / 255 - sk.b,
          isSkin = Math.hypot(dr, dg, db) < 0.075;
        if (inR(R.torso, X, Y)) cls = isSkin ? CLS.piel : Y - R.torso[1] < HEM ? shirt : pants;
        else if (inR(R.arm, X, Y)) cls = isSkin ? CLS.piel : shirt;
        else if (inR(R.leg, X, Y)) cls = isSkin ? CLS.piel : pants;
        else if (inR(R.skirt, X, Y) || inR(R.cape, X, Y) || inR(R.patA, X, Y)) cls = CLS.algodon;
        else if (inR(R.patB1, X, Y) || inR(R.patB2, X, Y)) cls = CLS.algodon;
        else
          for (const n of SWATCH)
            if (inR(swatchCell(n), X, Y)) {
              const v = sw[n];
              if (v) {
                cls = v[0];
                rough = v[1];
                metal = v[2] ?? 0;
              }
              break;
            }
      }
      d[i] = cls * 32 + 16;
      d[i + 1] = (rough < 0 ? ROUGH[cls] : rough) * 255;
      d[i + 2] = metal * 255;
      d[i + 3] = 255;
    }
  // el lienzo va con y hacia abajo; la textura con y hacia arriba
  const out = new Uint8Array(d.length);
  for (let y = 0; y < h; y++) out.set(d.subarray(y * w * 4, (y + 1) * w * 4), (h - 1 - y) * w * 4);
  const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}

const cache = new Map<string, AvatarMaps>();
/** textura y ORM del avatar para una configuración (cacheadas; las más viejas se liberan y se vuelven a subir) */
export function avatarMaps(cfg: AvatarConfig): AvatarMaps {
  const key = configKey(cfg);
  let t = cache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = AW;
  cv.height = AH;
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.fillStyle = cfg.skin;
  c.fillRect(0, 0, AW, AH);
  region(c, R.face, () => face(c, cfg));
  let sl: Sleeve | null = null;
  region(c, R.torso, () => {
    sl = shirt(c, cfg);
    overlays(c, cfg);
    pantsTop(c, cfg);
  });
  region(c, R.arm, () => {
    skinFill(c, 128, 256, cfg.skin, 7, 0.8);
    c.save();
    c.beginPath();
    c.rect(0, 0, 128, sl!.len);
    c.clip();
    sl!.paint(c, sl!.len);
    c.restore();
    const g = c.createLinearGradient(0, sl!.len, 0, sl!.len + 10);
    g.addColorStop(0, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, sl!.len, 128, 10);
  });
  region(c, R.leg, () => leg(c, cfg));
  region(c, R.skirt, () => skirt(c, cfg));
  region(c, R.cape, () => cape(c));
  patterns(c, cfg);
  swatches(c, cfg);
  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  t = { map, orm: ormFor(cfg, cv) };
  cache.set(key, t);
  if (cache.size > 64) {
    const old = cache.keys().next().value!;
    cache.get(old)!.map.dispose();
    cache.get(old)!.orm.dispose();
    cache.delete(old);
  }
  return t;
}
