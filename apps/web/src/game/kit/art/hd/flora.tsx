// Vegetación HD: atlas de hojas dibujado en lienzo, un solo material con prueba de alfa y viento en el vértice, y
// especies paramétricas (pino ocote, guanacaste, ceiba, palmas, platanar, cafetal, matorral seco…). Una zona entera
// se fusiona en UNA malla (una llamada de dibujo para todos sus árboles); la utilería suelta (P.Tree…) es una malla
// por planta con la misma geometría. Calidad baja: menos tarjetas por copa y sin viento.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../../core/types';
import type { FloraItem, FloraKind } from '../types';
import { gBlob, gTube } from './geo';
import { G } from './materials';
import { rng, texCalidad } from './tex';

// ---------------------------------------------------------------------------------------------------------------
// Atlas: 4 × 4 celdas. Hojas en su color real (el color de la escena solo las matiza).
const AC = 4,
  AR = 4;
export const CELL = {
  broad: 0,
  small: 1,
  needle: 2,
  palm: 3,
  banana: 4,
  grass: 5,
  fern: 6,
  bark: 7,
  flowers: 8,
  dry: 9,
  cafe: 10,
  twig: 11,
  veranera: 12,
  izote: 13,
  izoteFlor: 14,
  tulipan: 15,
} as const;
/** rectángulo UV de una celda [u0, v0, du, dv]; du < 0 = muestreo opaco (relleno de copa, troncos) */
export function cellRect(i: number, opaque = false): [number, number, number, number] {
  const col = i % AC,
    row = Math.floor(i / AC);
  return [col / AC, 1 - (row + 1) / AR, opaque ? -1 / AC : 1 / AC, 1 / AR];
}
const hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;
type Ctx = CanvasRenderingContext2D;
function leaf(c: Ctx, x: number, y: number, ang: number, L: number, W: number) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.beginPath();
  c.moveTo(0, 0);
  c.bezierCurveTo(L * 0.3, -W, L * 0.72, -W * 0.85, L, 0);
  c.bezierCurveTo(L * 0.72, W * 0.85, L * 0.3, W, 0, 0);
  c.fill();
  c.restore();
}
function blade(c: Ctx, x: number, y: number, h: number, lean: number, w: number) {
  c.beginPath();
  c.moveTo(x - w / 2, y);
  c.quadraticCurveTo(x + lean * 0.35 - w * 0.3, y - h * 0.6, x + lean, y - h);
  c.quadraticCurveTo(x + lean * 0.35 + w * 0.3, y - h * 0.6, x + w / 2, y);
  c.closePath();
  c.fill();
}
const DRAW: ((c: Ctx, S: number, r: () => number) => void)[] = [
  // 0 · hoja ancha: racimo de hojas ovaladas alrededor de ramitas
  (c, S, r) => {
    c.strokeStyle = hsl(25, 30, 22);
    c.lineWidth = S * 0.008;
    for (let i = 0; i < 7; i++) {
      const a = r() * 6.283;
      c.beginPath();
      c.moveTo(S / 2, S / 2);
      c.lineTo(S / 2 + Math.cos(a) * S * 0.36, S / 2 + Math.sin(a) * S * 0.36);
      c.stroke();
    }
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < (pass ? 120 : 70); i++) {
        const a = r() * 6.283,
          d = S * 0.43 * Math.sqrt(r()),
          x = S / 2 + Math.cos(a) * d,
          y = S / 2 + Math.sin(a) * d,
          L = S * (0.08 + r() * 0.07);
        c.fillStyle = hsl(88 + r() * 32, 32 + r() * 22, pass ? 22 + r() * 22 : 13 + r() * 10);
        leaf(c, x, y, a + (r() - 0.5) * 1.6, L, L * 0.36);
        if (pass && r() < 0.5) {
          c.strokeStyle = hsl(80, 30, 45, 0.35);
          c.lineWidth = S * 0.002;
          c.beginPath();
          c.moveTo(x, y);
          c.lineTo(x + Math.cos(a) * L * 0.8, y + Math.sin(a) * L * 0.8);
          c.stroke();
        }
      }
  },
  // 1 · hoja fina (guanacaste, carbón, madreado): hojuelas compuestas
  (c, S, r) => {
    for (let k = 0; k < 30; k++) {
      const a = r() * 6.283,
        len = S * (0.16 + r() * 0.16),
        x0 = S / 2 + Math.cos(a) * S * 0.08 * r(),
        y0 = S / 2 + Math.sin(a) * S * 0.08 * r(),
        tone = r();
      c.strokeStyle = hsl(60, 25, 28, 0.8);
      c.lineWidth = S * 0.003;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len);
      c.stroke();
      for (let t = 0.12; t < 1; t += 0.07)
        for (const s of [-1, 1]) {
          c.fillStyle = hsl(80 + tone * 30 + r() * 8, 30 + r() * 20, 18 + tone * 18 + r() * 10);
          const x = x0 + Math.cos(a) * len * t,
            y = y0 + Math.sin(a) * len * t;
          leaf(c, x, y, a + s * 1.1, S * 0.035 * (1.15 - t * 0.5), S * 0.011);
        }
    }
  },
  // 2 · pino ocote: mechón de agujas largas que cuelgan un poco
  (c, S, r) => {
    c.lineCap = 'round';
    for (let i = 0; i < 300; i++) {
      const a = r() * 6.283,
        L = S * (0.2 + r() * 0.27),
        x0 = S / 2 + (r() - 0.5) * S * 0.06,
        y0 = S * 0.45 + (r() - 0.5) * S * 0.06,
        ex = x0 + Math.cos(a) * L,
        ey = y0 + Math.sin(a) * L * 0.85 + L * 0.22;
      c.strokeStyle = hsl(78 + r() * 22, 28 + r() * 18, 16 + r() * 20);
      c.lineWidth = S * (0.0035 + r() * 0.002);
      c.beginPath();
      c.moveTo(x0, y0);
      c.quadraticCurveTo(x0 + Math.cos(a) * L * 0.6, y0 + Math.sin(a) * L * 0.5, ex, ey);
      c.stroke();
    }
    c.fillStyle = hsl(22, 35, 26);
    c.beginPath();
    c.ellipse(S / 2, S * 0.45, S * 0.03, S * 0.05, 0, 0, 6.283);
    c.fill();
  },
  // 3 · fronda de palma: raquis a lo largo (u) y foliolos hacia la punta
  (c, S, r) => {
    const x0 = S * 0.02,
      x1 = S * 0.98,
      y = S / 2;
    for (let k = 0; k < 78; k++) {
      const t = k / 78,
        x = x0 + t * (x1 - x0),
        Lf = S * 0.5 * Math.sin(Math.PI * (0.06 + 0.9 * t)) ** 0.6 * (0.85 + r() * 0.25);
      for (const s of [-1, 1]) {
        if (r() < 0.07) continue;
        const th = 0.75 + r() * 0.25,
          ex = x + Math.cos(th) * Lf,
          ey = y + s * Math.sin(th) * Lf * 0.95,
          old = r() < 0.05;
        c.fillStyle = old ? hsl(40, 45, 45) : hsl(78 + r() * 18, 38 + r() * 18, 24 + r() * 18);
        c.beginPath();
        c.moveTo(x - S * 0.006, y);
        c.quadraticCurveTo(x + (ex - x) * 0.5, y + (ey - y) * 0.45 + s * S * 0.012, ex, ey);
        c.quadraticCurveTo(x + (ex - x) * 0.5 + S * 0.01, y + (ey - y) * 0.45, x + S * 0.008, y);
        c.fill();
      }
    }
    c.strokeStyle = hsl(60, 35, 52);
    for (let i = 0; i < 10; i++) {
      c.lineWidth = S * (0.016 - i * 0.0012);
      c.beginPath();
      c.moveTo(x0 + (i / 10) * (x1 - x0), y);
      c.lineTo(x0 + ((i + 1) / 10) * (x1 - x0), y);
      c.stroke();
    }
  },
  // 4 · hoja de guineo: lámina ancha con nervios, bordes rotos por el viento
  (c, S, r) => {
    const y = S / 2,
      w = (t: number) => S * 0.46 * Math.sqrt(Math.max(0, Math.sin(Math.PI * Math.min(1, t * 1.02 + 0.01))));
    for (const s of [-1, 1]) {
      c.fillStyle = hsl(84 + r() * 8, 50, 30 + r() * 6);
      c.beginPath();
      c.moveTo(S * 0.02, y);
      for (let t = 0; t <= 1.001; t += 0.02) c.lineTo(S * (0.02 + t * 0.96), y + s * w(t));
      c.lineTo(S * 0.98, y);
      c.fill();
    }
    c.strokeStyle = hsl(75, 45, 50, 0.22);
    c.lineWidth = S * 0.003;
    for (let t = 0.02; t < 1; t += 0.012)
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(S * (0.02 + t * 0.96), y);
        c.lineTo(S * (0.02 + t * 0.96) + S * 0.06, y + s * w(t));
        c.stroke();
      }
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = S * 0.012;
    for (let i = 0; i < 14; i++) {
      const t = 0.1 + r() * 0.85,
        s = r() < 0.5 ? -1 : 1,
        x = S * (0.02 + t * 0.96);
      c.beginPath();
      c.moveTo(x + S * 0.05, y + s * (w(t) + 2));
      c.lineTo(x + S * 0.012, y + s * S * (0.06 + r() * 0.1));
      c.stroke();
    }
    c.globalCompositeOperation = 'source-over';
    c.strokeStyle = hsl(35, 40, 35, 0.5);
    c.lineWidth = S * 0.006;
    for (const s of [-1, 1]) {
      c.beginPath();
      for (let t = 0; t <= 1; t += 0.02) c.lineTo(S * (0.02 + t * 0.96), y + s * w(t));
      c.stroke();
    }
    c.strokeStyle = hsl(70, 40, 58);
    c.lineWidth = S * 0.018;
    c.beginPath();
    c.moveTo(S * 0.02, y);
    c.lineTo(S * 0.97, y);
    c.stroke();
  },
  // 5 · mata de zacate
  (c, S, r) => {
    for (let i = 0; i < 70; i++) {
      const tall = r();
      c.fillStyle = hsl(72 + r() * 30, 32 + r() * 22, 26 + tall * 22 + r() * 8);
      blade(c, S * (0.5 + (r() - 0.5) * 0.4), S, S * (0.35 + tall * 0.62), (r() - 0.5) * S * 0.55, S * 0.016);
    }
  },
  // 6 · helecho: fronda con pinnas finas
  (c, S, r) => {
    const y = S / 2;
    for (let k = 0; k < 44; k++) {
      const t = k / 44,
        x = S * (0.04 + t * 0.92),
        L = S * 0.46 * Math.sin(Math.PI * (0.08 + t * 0.88)) ** 0.8;
      for (const s of [-1, 1]) {
        const th = 1.2 + r() * 0.15;
        for (let q = 0.1; q < 1; q += 0.14) {
          c.fillStyle = hsl(95 + r() * 18, 40 + r() * 15, 22 + r() * 16);
          leaf(
            c,
            x + Math.cos(th) * L * q,
            y + s * Math.sin(th) * L * q,
            s * th,
            S * 0.035 * (1.1 - q * 0.6),
            S * 0.012,
          );
        }
      }
    }
    c.strokeStyle = hsl(80, 35, 35);
    c.lineWidth = S * 0.008;
    c.beginPath();
    c.moveTo(S * 0.03, y);
    c.lineTo(S * 0.97, y);
    c.stroke();
  },
  // 7 · corteza (repetible): grietas verticales y vetas
  (c, S, r) => {
    c.fillStyle = hsl(26, 16, 34);
    c.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      c.fillStyle = r() < 0.5 ? hsl(30, 14, 46, 0.18) : hsl(20, 20, 18, 0.2);
      c.fillRect(r() * S, r() * S, S * 0.012 * (0.5 + r()), S * 0.03 * (0.5 + r()));
    }
    for (let i = 0; i < 26; i++) {
      const x0 = r() * S,
        f = 1 + Math.floor(r() * 3),
        ph = r() * 6.283,
        amp = S * (0.01 + r() * 0.02),
        dark = r() < 0.7;
      c.strokeStyle = dark ? hsl(20, 22, 13, 0.85) : hsl(32, 14, 52, 0.4);
      c.lineWidth = S * (dark ? 0.006 + r() * 0.014 : 0.004);
      for (const off of [-S, 0, S]) {
        c.beginPath();
        for (let y = 0; y <= S; y += S / 32) c.lineTo(x0 + off + Math.sin((y / S) * 6.283 * f + ph) * amp, y);
        c.stroke();
      }
    }
  },
  // 8 · zacate con florcitas
  (c, S, r) => {
    for (let i = 0; i < 40; i++) {
      c.fillStyle = hsl(80 + r() * 30, 35 + r() * 20, 20 + r() * 20);
      blade(c, S * (0.5 + (r() - 0.5) * 0.45), S, S * (0.25 + r() * 0.45), (r() - 0.5) * S * 0.5, S * 0.014);
    }
    const cols = ['#f4f1e6', '#ffd23f', '#b98ae8', '#ff8fb8', '#ff9a4a', '#ffffff'];
    for (let i = 0; i < 12; i++) {
      const x = S * (0.15 + r() * 0.7),
        y = S * (0.12 + r() * 0.45),
        R = S * (0.018 + r() * 0.016),
        col = cols[Math.floor(r() * cols.length)];
      c.strokeStyle = hsl(95, 35, 30);
      c.lineWidth = S * 0.005;
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + (r() - 0.5) * S * 0.1, (y + S) / 2, S * (0.5 + (r() - 0.5) * 0.2), S);
      c.stroke();
      c.fillStyle = col;
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * 6.283;
        c.beginPath();
        c.ellipse(x + Math.cos(a) * R, y + Math.sin(a) * R * 0.8, R * 0.8, R * 0.55, a, 0, 6.283);
        c.fill();
      }
      c.fillStyle = '#e8b830';
      c.beginPath();
      c.arc(x, y, R * 0.45, 0, 6.283);
      c.fill();
    }
  },
  // 9 · zacate seco alto con espigas
  (c, S, r) => {
    for (let i = 0; i < 55; i++) {
      const x = S * (0.5 + (r() - 0.5) * 0.4),
        h = S * (0.45 + r() * 0.52),
        lean = (r() - 0.5) * S * 0.5;
      c.fillStyle = hsl(36 + r() * 16, 30 + r() * 25, 40 + r() * 24);
      blade(c, x, S, h, lean, S * 0.011);
      if (r() < 0.35) {
        c.fillStyle = hsl(34, 35, 62);
        c.beginPath();
        c.ellipse(x + lean, S - h, S * 0.008, S * 0.04, Math.atan2(lean, h) * 0.8, 0, 6.283);
        c.fill();
      }
    }
  },
  // 10 · cafeto: ramitas que salen del centro con hojas lustrosas en pares y granos rojos (racimo redondo)
  (c, S, r) => {
    for (let k = 0; k < 9; k++) {
      const a0 = (k / 9) * 6.283 + r() * 0.5,
        len = S * (0.3 + r() * 0.12),
        x0 = S / 2,
        y0 = S / 2;
      c.strokeStyle = hsl(30, 25, 30);
      c.lineWidth = S * 0.007;
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x0 + Math.cos(a0) * len, y0 + Math.sin(a0) * len);
      c.stroke();
      for (let t = 0.15; t < 1; t += 0.17) {
        const x = x0 + Math.cos(a0) * len * t,
          y = y0 + Math.sin(a0) * len * t;
        for (const s of [-1, 1]) {
          c.fillStyle = hsl(112 + r() * 22, 38 + r() * 18, 20 + r() * 18);
          leaf(c, x, y, a0 + s * (0.9 + r() * 0.4), S * (0.1 + r() * 0.04) * (1.1 - t * 0.4), S * 0.038);
        }
        if (r() < 0.5)
          for (let q = 0; q < 5; q++) {
            const ripe = r();
            c.fillStyle = ripe < 0.55 ? hsl(355, 70, 34 + r() * 10) : ripe < 0.8 ? hsl(20, 70, 40) : hsl(75, 50, 38);
            c.beginPath();
            c.arc(x + (r() - 0.5) * S * 0.04, y + (r() - 0.5) * S * 0.03, S * 0.013, 0, 6.283);
            c.fill();
          }
      }
    }
  },
  // 11 · ramitas secas con pocas hojas (matorral, espino, jícaro)
  (c, S, r) => {
    const br = (x: number, y: number, a: number, L: number, w: number, d: number) => {
      const ex = x + Math.cos(a) * L,
        ey = y + Math.sin(a) * L;
      c.strokeStyle = hsl(25, 22, 22);
      c.lineWidth = w;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(ex, ey);
      c.stroke();
      if (d > 0) {
        br(ex, ey, a - 0.3 - r() * 0.4, L * 0.72, w * 0.7, d - 1);
        br(ex, ey, a + 0.3 + r() * 0.4, L * 0.72, w * 0.7, d - 1);
      } else
        for (let k = 0; k < 9; k++) {
          c.fillStyle = hsl(62 + r() * 22, 28 + r() * 15, 26 + r() * 18);
          leaf(c, ex + (r() - 0.5) * S * 0.05, ey + (r() - 0.5) * S * 0.05, r() * 6.283, S * 0.04, S * 0.014);
        }
    };
    for (let i = 0; i < 3; i++) br(S / 2, S * 0.98, -Math.PI / 2 + (i - 1) * 0.5, S * 0.26, S * 0.014, 4);
  },
  // 12 · veranera (buganvilia): hojitas y racimos de brácteas fucsia de tres en tres
  (c, S, r) => {
    for (let i = 0; i < 90; i++) {
      const a = r() * 6.283,
        d = S * 0.44 * Math.sqrt(r());
      c.fillStyle = hsl(95 + r() * 25, 38 + r() * 18, 16 + r() * 16);
      leaf(c, S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, r() * 6.283, S * 0.07, S * 0.03);
    }
    for (let k = 0; k < 34; k++) {
      const a = r() * 6.283,
        d = S * 0.4 * Math.sqrt(r()),
        x = S / 2 + Math.cos(a) * d,
        y = S / 2 + Math.sin(a) * d,
        hue = 318 + r() * 18,
        R = S * (0.024 + r() * 0.014);
      for (let b = 0; b < 3; b++) {
        const t = (b / 3) * 6.283 + r() * 0.6;
        c.fillStyle = hsl(hue, 70 + r() * 15, 44 + r() * 14);
        c.beginPath();
        c.ellipse(x + Math.cos(t) * R * 0.7, y + Math.sin(t) * R * 0.7, R, R * 0.72, t, 0, 6.283);
        c.fill();
      }
      c.fillStyle = hsl(50, 30, 88);
      c.beginPath();
      c.arc(x, y, R * 0.18, 0, 6.283);
      c.fill();
    }
  },
  // 13 · hoja de izote: espada larga y tiesa a lo largo (u), con orilla clara y punta seca
  (c, S, r) => {
    const y = S / 2,
      w = (t: number) => S * 0.42 * Math.min(1, t * 6) * (1 - t) ** 0.7;
    c.fillStyle = hsl(96, 34, 30);
    c.beginPath();
    c.moveTo(S * 0.01, y);
    for (let t = 0; t <= 1.001; t += 0.02) c.lineTo(S * (0.01 + t * 0.98), y - w(t));
    for (let t = 1; t >= -0.001; t -= 0.02) c.lineTo(S * (0.01 + t * 0.98), y + w(t));
    c.fill();
    c.strokeStyle = hsl(70, 40, 62, 0.8);
    c.lineWidth = S * 0.012;
    for (const s of [-1, 1]) {
      c.beginPath();
      for (let t = 0; t <= 1; t += 0.02) c.lineTo(S * (0.01 + t * 0.98), y + s * (w(t) - S * 0.008));
      c.stroke();
    }
    c.strokeStyle = hsl(90, 30, 22, 0.5);
    c.lineWidth = S * 0.004;
    for (let k = -2; k <= 2; k++) {
      c.beginPath();
      c.moveTo(S * 0.03, y + k * S * 0.05);
      c.lineTo(S * 0.95, y + k * S * 0.004);
      c.stroke();
    }
    c.fillStyle = hsl(38, 40, 40);
    c.beginPath();
    c.moveTo(S * 0.9, y - w(0.9));
    c.lineTo(S, y);
    c.lineTo(S * 0.9, y + w(0.9));
    c.fill();
    for (let i = 0; i < 40; i++) {
      c.fillStyle = hsl(80, 25, 50, 0.12);
      c.fillRect(S * (0.05 + r() * 0.8), y + (r() - 0.5) * S * 0.4, S * 0.03, S * 0.004);
    }
  },
  // 14 · flor de izote: panoja de campanitas color crema en un tallo (abajo el tallo, arriba la punta)
  (c, S, r) => {
    c.strokeStyle = hsl(80, 30, 34);
    c.lineWidth = S * 0.02;
    c.beginPath();
    c.moveTo(S / 2, S);
    c.lineTo(S / 2, S * 0.05);
    c.stroke();
    for (let i = 0; i < 16; i++) {
      const t = i / 16,
        yy = S * (0.92 - t * 0.85),
        L = S * 0.3 * Math.sin(Math.PI * (0.15 + t * 0.8)) ** 0.7;
      for (const s of [-1, 1]) {
        const ex = S / 2 + s * L * (0.7 + r() * 0.3),
          ey = yy - S * 0.04;
        c.strokeStyle = hsl(70, 25, 40);
        c.lineWidth = S * 0.006;
        c.beginPath();
        c.moveTo(S / 2, yy);
        c.lineTo(ex, ey);
        c.stroke();
        for (let k = 0; k < 4; k++) {
          const q = 0.3 + k * 0.22,
            bx = S / 2 + (ex - S / 2) * q + (r() - 0.5) * S * 0.03,
            by = yy + (ey - yy) * q + S * 0.03;
          c.fillStyle = hsl(48 + r() * 10, 45 + r() * 20, 82 + r() * 10);
          c.beginPath();
          c.ellipse(bx, by, S * 0.024, S * 0.032, 0, 0, 6.283);
          c.fill();
          c.fillStyle = hsl(60, 30, 70, 0.6);
          c.beginPath();
          c.ellipse(bx, by + S * 0.02, S * 0.012, S * 0.008, 0, 0, 6.283);
          c.fill();
        }
      }
    }
  },
  // 15 · tulipán (clavel, hibisco): hojas lustrosas dentadas y flores rojas o naranjas de cinco pétalos
  (c, S, r) => {
    for (let pass = 0; pass < 2; pass++)
      for (let i = 0; i < (pass ? 90 : 55); i++) {
        const a = r() * 6.283,
          d = S * 0.43 * Math.sqrt(r()),
          L = S * (0.09 + r() * 0.05);
        c.fillStyle = hsl(105 + r() * 25, 45 + r() * 15, pass ? 20 + r() * 18 : 12 + r() * 8);
        leaf(c, S / 2 + Math.cos(a) * d, S / 2 + Math.sin(a) * d, a + (r() - 0.5) * 1.5, L, L * 0.5);
      }
    for (let k = 0; k < 9; k++) {
      const a = r() * 6.283,
        d = S * 0.34 * Math.sqrt(r()),
        x = S / 2 + Math.cos(a) * d,
        y = S / 2 + Math.sin(a) * d,
        R = S * (0.05 + r() * 0.02),
        hue = r() < 0.75 ? 355 + r() * 8 : 18 + r() * 12;
      for (let p = 0; p < 5; p++) {
        const t = (p / 5) * 6.283 + r() * 0.3;
        c.fillStyle = hsl(hue % 360, 78, 42 + r() * 12);
        c.beginPath();
        c.ellipse(x + Math.cos(t) * R * 0.55, y + Math.sin(t) * R * 0.55, R * 0.62, R * 0.45, t, 0, 6.283);
        c.fill();
      }
      c.strokeStyle = hsl(50, 80, 60);
      c.lineWidth = S * 0.006;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * R * 1.1, y + Math.sin(a) * R * 1.1);
      c.stroke();
    }
  },
];

let _atlas: THREE.DataTexture | null = null;
/** atlas de hojas compartido (también lo usa el zacate de grass.tsx) */
export const floraAtlas = () => atlas();
function atlas() {
  if (_atlas) return _atlas;
  const q = texCalidad(),
    S = q === 'baja' ? 128 : q === 'media' ? 256 : 512,
    W = S * AC,
    H = S * AR,
    cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const c = cv.getContext('2d', { willReadFrequently: true });
  const data = new Uint8Array(W * H * 4);
  if (c) {
    DRAW.forEach((draw, i) => {
      const ox = (i % AC) * S,
        oy = Math.floor(i / AC) * S;
      c.save();
      c.beginPath();
      c.rect(ox, oy, S, S);
      c.clip();
      c.translate(ox, oy);
      draw(c, S, rng(i * 977 + 13));
      c.restore();
    });
    const img = c.getImageData(0, 0, W, H).data;
    // filas al revés (v = 0 abajo) y el color de los píxeles transparentes = promedio de la celda, para que las
    // mipmaps no oscurezcan los bordes de las hojas
    for (let i = 0; i < AC * AR; i++) {
      const ox = (i % AC) * S,
        oy = Math.floor(i / AC) * S;
      let r = 0,
        g = 0,
        b = 0,
        n = 0;
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const k = ((oy + y) * W + ox + x) * 4;
          if (img[k + 3] > 128) {
            r += img[k];
            g += img[k + 1];
            b += img[k + 2];
            n++;
          }
        }
      n = Math.max(1, n);
      for (let y = 0; y < S; y++)
        for (let x = 0; x < S; x++) {
          const k = ((oy + y) * W + ox + x) * 4,
            o = ((H - 1 - oy - y) * W + ox + x) * 4,
            a = img[k + 3];
          if (a < 128) {
            const t = a / 128;
            data[o] = img[k] * t + (r / n) * (1 - t);
            data[o + 1] = img[k + 1] * t + (g / n) * (1 - t);
            data[o + 2] = img[k + 2] * t + (b / n) * (1 - t);
          } else {
            data[o] = img[k];
            data[o + 1] = img[k + 1];
            data[o + 2] = img[k + 2];
          }
          data[o + 3] = a;
        }
    }
  }
  const t = new THREE.DataTexture(data, W, H, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.anisotropy = q === 'alta' ? 4 : 1;
  t.needsUpdate = true;
  _atlas = t;
  return t;
}

// ---------------------------------------------------------------------------------------------------------------
// Material: estándar + celda del atlas por vértice (aCell), viento (aSway) y normales de copa sin voltear.
const V_PARS =
  'attribute vec4 aCell; attribute float aSway; varying vec4 vCell; varying vec2 vTile; uniform float uTime;';
const V_UV = 'vTile = uv; vCell = aCell;';
const V_WIND = /* glsl */ `
#ifdef FLORA_WIND
{
  vec4 fw = modelMatrix * vec4( transformed, 1.0 );
  float ph = fw.x * 0.19 + fw.z * 0.23;
  float gust = 0.6 + 0.4 * sin( uTime * 0.31 + fw.x * 0.011 + fw.z * 0.007 );
  float sw = ( sin( uTime * 1.5 + ph ) * 0.7 + sin( uTime * 2.7 + ph * 1.9 ) * 0.3 ) * gust;
  float fl = sin( uTime * 6.5 + ph * 5.0 + fw.y * 2.0 );
  transformed += vec3( sw + fl * 0.12, fl * 0.05, sw * 0.55 - fl * 0.1 ) * aSway * 0.08;
}
#endif
`;
const F_PARS = 'varying vec4 vCell; varying vec2 vTile;';
const F_MAP = /* glsl */ `
{
  vec2 cs = abs( vCell.zw ), cuv = vCell.xy + fract( vTile ) * cs;
  vec2 gx = dFdx( vTile ) * cs, gy = dFdy( vTile ) * cs;
  vec4 fc = textureGrad( map, cuv, gx, gy );
  if ( vCell.z < 0.0 ) fc.a = 1.0;
  else {
    // las mipmaps promedian el alfa: se compensa para que las copas no se vuelvan ralas de lejos
    vec2 px = gx * FLORA_SZ, py = gy * FLORA_SZ;
    float lod = 0.5 * log2( max( max( dot( px, px ), dot( py, py ) ), 1.0 ) );
    fc.a = min( 1.0, fc.a * ( 1.0 + lod * 0.38 ) );
  }
  diffuseColor *= fc;
}
`;
function patch(sh: THREE.WebGLProgramParametersWithUniforms, lit: boolean) {
  const t = atlas();
  sh.uniforms.uTime = G.uTime;
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', `#include <common>\n${V_PARS}`)
    .replace('#include <uv_vertex>', `#include <uv_vertex>\n${V_UV}`)
    .replace('#include <begin_vertex>', `#include <begin_vertex>\n${V_WIND}`);
  let f = sh.fragmentShader
    .replace(
      '#include <common>',
      `#include <common>\n${F_PARS}\n#define FLORA_SZ vec2( ${t.image.width}.0, ${t.image.height}.0 )`,
    )
    .replace('#include <map_fragment>', F_MAP);
  if (lit)
    f = f.replace(
      '#include <normal_fragment_begin>',
      // tarjetas de doble cara con normales de copa: no se voltean por detrás (si no, media copa queda negra)
      '#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\n  normal *= faceDirection;\n#endif',
    );
  sh.fragmentShader = f;
}
let _mat: THREE.MeshStandardMaterial | null = null,
  _depth: THREE.MeshDepthMaterial | null = null;
const wind = () => texCalidad() !== 'baja';
export function floraMaterial() {
  if (_mat) return _mat;
  const m = new THREE.MeshStandardMaterial({
    map: atlas(),
    vertexColors: true,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    roughness: 0.82,
    metalness: 0,
  });
  if (wind()) m.defines = { FLORA_WIND: '' };
  m.onBeforeCompile = (sh) => patch(sh, true);
  m.customProgramCacheKey = () => `flora|${wind() ? 1 : 0}`;
  m.name = 'hd:flora';
  _mat = m;
  return m;
}
export function floraDepthMaterial() {
  if (_depth) return _depth;
  const m = new THREE.MeshDepthMaterial({
    depthPacking: THREE.RGBADepthPacking,
    map: atlas(),
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  if (wind()) m.defines = { FLORA_WIND: '' };
  m.onBeforeCompile = (sh) => patch(sh, false);
  m.customProgramCacheKey = () => `floraDepth|${wind() ? 1 : 0}`;
  _depth = m;
  return m;
}

// ---------------------------------------------------------------------------------------------------------------
// Constructor de plantas: posiciones, normales, uv (repetible), color, celda, viento y si es hoja (se matiza).
const _v = new THREE.Vector3(),
  _n = new THREE.Vector3(),
  _c = new THREE.Color(),
  UP = new THREE.Vector3(0, 1, 0),
  _m3 = new THREE.Matrix3();
type Vec = THREE.Vector3;
const vec = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export interface Template {
  pos: Float32Array;
  nor: Float32Array;
  uv: Float32Array;
  col: Float32Array;
  cell: Float32Array;
  sway: Float32Array;
  leaf: Uint8Array;
  idx: number[];
}
class FB {
  P: number[] = [];
  N: number[] = [];
  U: number[] = [];
  C: number[] = [];
  A: number[] = [];
  S: number[] = [];
  L: number[] = [];
  I: number[] = [];
  constructor(public r: () => number) {}
  private v(p: Vec, n: Vec, u: number, w: number, c: THREE.Color, cell: number[], sway: number, leaf: number) {
    this.P.push(p.x, p.y, p.z);
    this.N.push(n.x, n.y, n.z);
    this.U.push(u, w);
    this.C.push(c.r, c.g, c.b);
    this.A.push(cell[0], cell[1], cell[2], cell[3]);
    this.S.push(sway);
    this.L.push(leaf);
    return this.P.length / 3 - 1;
  }
  /** geometría sólida (tronco, ramas, relleno de copa) con uv repetida `tile` */
  geo(
    g: THREE.BufferGeometry,
    m: THREE.Matrix4,
    cell: number[],
    c: THREE.Color,
    tile: [number, number],
    sway: (p: Vec) => number,
    leaf = 0,
  ) {
    _m3.getNormalMatrix(m);
    const P = g.attributes.position,
      N = g.attributes.normal,
      U = g.attributes.uv,
      o = this.P.length / 3;
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(m);
      _n.fromBufferAttribute(N, i).applyMatrix3(_m3).normalize();
      this.v(_v, _n, (U ? U.getX(i) : 0) * tile[0], (U ? U.getY(i) : 0) * tile[1], c, cell, sway(_v), leaf);
    }
    const I = g.index;
    if (I) for (let i = 0; i < I.count; i++) this.I.push(o + I.getX(i));
    else for (let i = 0; i < P.count; i++) this.I.push(o + i);
  }
  /** rama o tronco por una curva, con corteza */
  limb(pts: V3[], radii: number[], c: THREE.Color, seg = 7, sway = 0, cell: number = CELL.bark) {
    const g = gTube(pts, radii, seg),
      circ = 2 * Math.PI * radii[0];
    this.geo(g, new THREE.Matrix4(), cellRect(cell, true), c, [Math.max(1, Math.round(circ / 0.45)), 1 / 0.9], (p) =>
      sway ? sway * Math.min(1, Math.max(0, p.y - pts[0][1]) / 3) : 0,
    );
    g.dispose();
  }
  /** cuadro de hojas: centro, tamaño, normal de la cara, giro; normales esféricas desde `cc` */
  card(p: Vec, w: number, h: number, face: Vec, spin: number, cc: Vec, cell: number, c: THREE.Color, sway: number) {
    const n = face.clone().normalize(),
      t = Math.abs(n.y) > 0.95 ? vec(1, 0, 0) : vec(0, 1, 0).cross(n).normalize();
    t.applyAxisAngle(n, spin);
    const b = n.clone().cross(t).normalize(),
      rect = cellRect(cell),
      o = this.P.length / 3;
    const corners: [number, number][] = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ];
    for (const [a, d] of corners) {
      const q = p
        .clone()
        .addScaledVector(t, a * w)
        .addScaledVector(b, d * h);
      const nn = q.clone().sub(cc).normalize().multiplyScalar(0.75).addScaledVector(UP, 0.35).normalize();
      this.v(q, nn, 0.004 + (a + 0.5) * 0.992, 0.004 + (d + 0.5) * 0.992, c, rect, sway, 1);
    }
    this.I.push(o, o + 1, o + 2, o, o + 2, o + 3);
  }
  /** lámina larga (fronda, hoja de guineo, hoja de zacate) a lo largo de `pts`, con pliegue en V */
  strip(pts: Vec[], widths: number[], across: Vec[], fold: number, cell: number, c: THREE.Color, sway: number[]) {
    const rect = cellRect(cell),
      o = this.P.length / 3,
      n = pts.length;
    for (let i = 0; i < n; i++) {
      const tg = pts[Math.min(i + 1, n - 1)]
          .clone()
          .sub(pts[Math.max(i - 1, 0)])
          .normalize(),
        ac = across[i],
        nn = tg.clone().cross(ac).normalize();
      if (nn.y < 0) nn.negate();
      nn.addScaledVector(UP, 0.6).normalize();
      const u = 0.004 + (i / (n - 1)) * 0.992;
      for (const k of [-1, 0, 1]) {
        const q = pts[i]
          .clone()
          .addScaledVector(ac, (k * widths[i]) / 2)
          .addScaledVector(UP, -Math.abs(k) * fold * widths[i]);
        this.v(q, nn, u, 0.004 + (k + 1) * 0.496, c, rect, sway[i], 1);
      }
    }
    for (let i = 0; i < n - 1; i++)
      for (let k = 0; k < 2; k++) {
        const a = o + i * 3 + k,
          b = a + 1,
          cc = a + 3,
          d = cc + 1;
        this.I.push(a, cc, d, a, d, b);
      }
  }
  /** relleno opaco de copa (para que de lejos no se vea a través) */
  blob(p: Vec, r: V3, seed: number, c: THREE.Color, sway: number, cell: number = CELL.broad, leaf = 1) {
    const g = gBlob(1, seed, 0.3, 1),
      m = new THREE.Matrix4().compose(p, new THREE.Quaternion(), vec(r[0], r[1], r[2]));
    this.geo(g, m, cellRect(cell, true), c, [1.5, 1.5], () => sway, leaf);
  }
  build(): Template {
    return {
      pos: new Float32Array(this.P),
      nor: new Float32Array(this.N),
      uv: new Float32Array(this.U),
      col: new Float32Array(this.C),
      cell: new Float32Array(this.A),
      sway: new Float32Array(this.S),
      leaf: new Uint8Array(this.L),
      idx: this.I,
    };
  }
}

const cardK = () => (texCalidad() === 'baja' ? 0.5 : texCalidad() === 'media' ? 0.8 : 1);
const col = (h: string, k = 1) => new THREE.Color(h).multiplyScalar(k);
/** tono de cada tarjeta: un poco más claro arriba y afuera, más oscuro adentro */
const leafTone = (r: () => number, y01: number) => {
  const k = 0.78 + r() * 0.3 + y01 * 0.18;
  // un poco de variación de tono entre tarjetas (unas más amarillas, otras más azuladas)
  const h = (r() - 0.5) * 0.12;
  return new THREE.Color(k * (1 + h), k, k * (1 - h));
};

/** copa de racimos: cada racimo = relleno opaco + varias tarjetas cruzadas */
function crown(
  b: FB,
  clumps: [Vec, number][],
  cc: Vec,
  cell: number,
  per: number,
  size: number,
  yMin: number,
  yMax: number,
  fill = 0.55,
) {
  const r = b.r,
    n = Math.max(2, Math.round(per * cardK()));
  clumps.forEach(([p, R], i) => {
    const y01 = Math.max(0, Math.min(1, (p.y - yMin) / Math.max(0.1, yMax - yMin)));
    if (fill > 0) b.blob(p, [R * fill, R * fill * 0.8, R * fill], i + 3, col('#ffffff', 0.55 + y01 * 0.15), 0.5);
    for (let k = 0; k < n; k++) {
      const dir = vec(r() - 0.5, r() * 0.9 - 0.25, r() - 0.5).normalize(),
        q = p.clone().addScaledVector(dir, R * (0.25 + r() * 0.45)),
        face = q
          .clone()
          .sub(cc)
          .normalize()
          .lerp(vec(r() - 0.5, r() - 0.5, r() - 0.5), 0.6)
          .normalize(),
        s = size * R * (0.85 + r() * 0.4);
      b.card(q, s, s, face, r() * 6.283, cc, cell, leafTone(r, y01), 0.6 + 0.4 * y01);
    }
  });
}
/** puntos repartidos en la superficie de un elipsoide (arriba más que abajo) */
function shell(r: () => number, n: number, c: Vec, rx: number, ry: number, rz: number, under = 0.3): Vec[] {
  const out: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + r() * 0.8,
      e = -under + r() * (1 + under),
      q = Math.sqrt(1 - Math.min(1, e * e));
    out.push(
      vec(c.x + Math.cos(a) * q * rx * (0.7 + r() * 0.3), c.y + e * ry, c.z + Math.sin(a) * q * rz * (0.7 + r() * 0.3)),
    );
  }
  return out;
}

const BARK = col('#ffffff', 0.95),
  BARK_PINE = col('#c49a80'),
  BARK_PALE = col('#d8d0c4');

// --- especies (unidades en metros, base en el origen, escala 1)
function broadleaf(v: number): Template {
  const r = rng(v * 131 + 7),
    b = new FB(r);
  const lean = vec((r() - 0.5) * 0.5, 0, (r() - 0.5) * 0.4);
  if (v === 0) {
    // guanacaste: tronco corto, ramas gruesas abiertas y copa ancha y plana (sombra de potrero)
    const top = vec(lean.x * 0.4, 2.1, lean.z * 0.4);
    b.limb(
      [
        [0, -0.1, 0],
        [lean.x * 0.15, 1, lean.z * 0.15],
        [top.x, top.y, top.z],
      ],
      [0.42, 0.34, 0.3],
      BARK,
      9,
    );
    const clumps: [Vec, number][] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * 6.283 + r() * 0.5,
        d = 2 + r() * 1.1,
        e = vec(top.x + Math.cos(a) * d, 3.6 + r() * 0.7, top.z + Math.sin(a) * d);
      b.limb(
        [
          [top.x, top.y - 0.2, top.z],
          [top.x + Math.cos(a) * d * 0.45, 3.1, top.z + Math.sin(a) * d * 0.45],
          [e.x, e.y, e.z],
        ],
        [0.2, 0.13, 0.07],
        BARK,
        6,
        0.15,
      );
    }
    for (const p of shell(r, 13, vec(top.x, 4.1, top.z), 3.2, 0.7, 3.2, 0.1)) clumps.push([p, 1.15 + r() * 0.4]);
    crown(b, clumps, vec(top.x, 3.2, top.z), CELL.small, 6, 1.9, 3.3, 5);
  } else {
    // copa redondeada e irregular (mango, laurel, aguacate, almendro): racimos en un elipsoide con huecos
    const h = v === 2 ? 2.6 : 1.9,
      top = vec(lean.x, h, lean.z);
    b.limb(
      [
        [0, -0.1, 0],
        [lean.x * 0.3, h * 0.5, lean.z * 0.3],
        [top.x, top.y, top.z],
      ],
      [0.36, 0.27, 0.22],
      BARK,
      8,
    );
    const c = vec(top.x, h + 1.7, top.z),
      rx = v === 3 ? 2.6 : 2.2,
      ry = v === 3 ? 1.4 : 1.8;
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + r(),
        e = vec(c.x + Math.cos(a) * rx * 0.6, c.y + (r() - 0.3) * ry * 0.6, c.z + Math.sin(a) * rx * 0.6);
      b.limb(
        [
          [top.x, top.y - 0.1, top.z],
          [(top.x + e.x) / 2, (top.y + e.y) / 2 + 0.2, (top.z + e.z) / 2],
          [e.x, e.y, e.z],
        ],
        [0.15, 0.1, 0.05],
        BARK,
        6,
        0.12,
      );
    }
    const clumps: [Vec, number][] = shell(r, v === 3 ? 12 : 11, c, rx, ry, rx, 0.45).map((p) => [p, 1 + r() * 0.45]);
    clumps.push([c.clone().add(vec(0, ry * 0.3, 0)), 1.4]);
    crown(b, clumps, c, v === 3 ? CELL.small : CELL.broad, 6, 1.75, c.y - ry, c.y + ry);
  }
  return b.build();
}
function pine(v: number): Template {
  // pino ocote (Pinus oocarpa): fuste alto y recto, copa rala solo arriba, mechones en la punta de las ramas
  const r = rng(v * 37 + 11),
    b = new FB(r),
    H = 8.4 + v * 0.8,
    lx = (r() - 0.5) * 0.4,
    lz = (r() - 0.5) * 0.4;
  const at = (y: number) => vec(lx * (y / H) ** 2, y, lz * (y / H) ** 2);
  const pts: V3[] = [0, 0.25, 0.5, 0.75, 1].map((t) => {
    const p = at(t * H);
    return [p.x, p.y - (t === 0 ? 0.1 : 0), p.z];
  });
  b.limb(pts, [0.3, 0.24, 0.18, 0.11, 0.04], BARK_PINE, 8);
  const cc = at(H * 0.78),
    nb = 11 + v * 2;
  for (let i = 0; i < nb; i++) {
    const t = 0.45 + (i / nb) * 0.5 + (r() - 0.5) * 0.05,
      y = H * t,
      a = i * 2.4 + r() * 0.6,
      L = (1.0 + (1 - t) * 2.2) * (0.75 + r() * 0.4),
      o = at(y),
      m = vec(o.x + Math.cos(a) * L * 0.55, y + 0.25 + r() * 0.2, o.z + Math.sin(a) * L * 0.55),
      e = vec(o.x + Math.cos(a) * L, y + (r() - 0.6) * 0.5, o.z + Math.sin(a) * L);
    b.limb(
      [
        [o.x, o.y, o.z],
        [m.x, m.y, m.z],
        [e.x, e.y, e.z],
      ],
      [0.07, 0.05, 0.025],
      BARK_PINE,
      5,
      0.4,
    );
    const tufts = r() < 0.5 ? 2 : 3;
    for (let k = 0; k < tufts; k++) {
      const q =
          k === 0
            ? e
            : m
                .clone()
                .lerp(e, 0.4 + r() * 0.4)
                .add(vec((r() - 0.5) * 0.4, r() * 0.3, (r() - 0.5) * 0.4)),
        s = (0.95 + r() * 0.5) * (k === 0 ? 1.15 : 0.9),
        tone = leafTone(r, t);
      b.card(q, s, s, vec(r() - 0.5, 1.4, r() - 0.5), r() * 6.283, cc, CELL.needle, tone, 1);
      if (cardK() > 0.6)
        b.card(q, s, s * 0.9, vec(Math.cos(a + 1.57), 0.2, Math.sin(a + 1.57)), r() * 0.6, cc, CELL.needle, tone, 1);
    }
  }
  const tip = at(H);
  for (let k = 0; k < 3; k++)
    b.card(
      tip.clone().add(vec(0, -0.2 - k * 0.3, 0)),
      1.1,
      1.3,
      vec(Math.cos(k * 2.1), 0.3, Math.sin(k * 2.1)),
      0,
      cc,
      CELL.needle,
      leafTone(r, 1),
      1,
    );
  return b.build();
}
function palm(v: number): Template {
  const r = rng(v * 71 + 3),
    b = new FB(r),
    oil = v === 3,
    top = oil ? 3.6 : 5.2 + r() * 1.3,
    lean = oil ? 0.15 : 0.6 + r() * 1.1,
    dir = r() * 6.283,
    cx = Math.cos(dir),
    cz = Math.sin(dir);
  const pts: V3[] = [];
  for (let i = 0; i <= 7; i++) {
    const t = i / 7,
      o = lean * t * t;
    pts.push([cx * o, top * t - 0.08, cz * o]);
  }
  b.limb(
    pts,
    oil ? [0.5, 0.45, 0.42, 0.42, 0.42, 0.43, 0.44, 0.4] : [0.3, 0.24, 0.2, 0.18, 0.17, 0.16, 0.15, 0.14],
    oil ? col('#e8dcc0', 1.3) : BARK_PALE,
    9,
  );
  if (oil)
    // palma africana: las bases de las hojas viejas quedan pegadas al tronco en espiral
    for (let i = 0; i < 22; i++) {
      const t = 0.12 + (i / 22) * 0.82,
        a = i * 2.4,
        y = top * t,
        o = lean * t * t,
        R = 0.42;
      b.limb(
        [
          [cx * o + Math.cos(a) * R * 0.7, y, cz * o + Math.sin(a) * R * 0.7],
          [cx * o + Math.cos(a) * (R + 0.22), y + 0.28, cz * o + Math.sin(a) * (R + 0.22)],
        ],
        [0.09, 0.05],
        col('#d8c8a0', 1.3),
        4,
      );
    }
  const T = vec(cx * lean, top, cz * lean),
    nf = Math.round((oil ? 26 : 16) * (0.6 + 0.4 * cardK()));
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * 6.283 * (oil ? 2.6 : 1) + r() * 0.4,
      layer = i / nf,
      dead = !oil && i % 7 === 3,
      L = (oil ? 4.3 : 3.3) * (0.85 + r() * 0.3) * (dead ? 0.9 : 1),
      el0 = dead ? -1.1 : oil ? 0.95 - layer * 0.8 : 0.55 - (i % 3) * 0.35 - r() * 0.2,
      droop = dead ? 0.4 : oil ? 0.8 : 1.6 + r() * 0.5,
      d = vec(Math.cos(a), 0, Math.sin(a)),
      ac = vec(-Math.sin(a), 0, Math.cos(a)),
      P: Vec[] = [],
      W: number[] = [],
      A: Vec[] = [],
      S: number[] = [];
    // la fronda sale con ángulo el0 y se va doblando hacia abajo (se integra paso a paso)
    const q = T.clone();
    for (let k = 0; k <= 7; k++) {
      const t = k / 7;
      if (k) {
        const th = el0 - droop * (t - 0.07);
        q.addScaledVector(d, Math.cos(th) * (L / 7)).addScaledVector(UP, Math.sin(th) * (L / 7));
      }
      P.push(q.clone());
      W.push((oil ? 1.2 : 1.15) * Math.sin(Math.PI * (0.12 + 0.82 * t)) ** 0.5);
      A.push(ac);
      S.push(t * 1.2);
    }
    const tone = dead ? col('#c9a060', 0.9) : leafTone(r, 0.5 + 0.5 * r());
    b.strip(P, W, A, 0.28, CELL.palm, tone, S);
  }
  if (!oil)
    for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + r();
      b.blob(
        T.clone().add(vec(Math.cos(a) * 0.22, -0.3 - r() * 0.15, Math.sin(a) * 0.22)),
        [0.15, 0.17, 0.15],
        70 + i,
        col('#8a8040', 0.8),
        0,
      );
    }
  else {
    b.blob(T.clone().add(vec(0, -0.2, 0)), [0.55, 0.45, 0.55], 77, col('#6a5a30'), 0);
    // racimos de fruta rojinegra entre las hojas
    for (let i = 0; i < 3; i++) {
      const a = i * 2.1 + r();
      b.blob(
        T.clone().add(vec(Math.cos(a) * 0.5, -0.45, Math.sin(a) * 0.5)),
        [0.24, 0.2, 0.24],
        80 + i,
        col('#ff8a50'),
        0,
        CELL.bark,
        0,
      );
    }
  }
  return b.build();
}
function bush(v: number, cell: number = CELL.broad): Template {
  const r = rng(v * 17 + 5),
    b = new FB(r),
    clumps: [Vec, number][] = [];
  for (let i = 0; i < 4; i++) {
    const a = i * 1.6 + r();
    clumps.push([vec(Math.cos(a) * 0.35, 0.4 + r() * 0.25, Math.sin(a) * 0.35), 0.5 + r() * 0.2]);
  }
  clumps.push([vec(0, 0.65, 0), 0.6]);
  crown(b, clumps, vec(0, 0.3, 0), cell, 4, 1.6, 0.2, 1, 0.75);
  return b.build();
}
function rainforest(v: number, giant: boolean): Template {
  // árbol de selva o ceiba: fuste recto con gambas en la base y copa ancha en capas
  const r = rng(v * 53 + (giant ? 900 : 300)),
    b = new FB(r),
    H = giant ? 17 : 7.6,
    R0 = giant ? 1.2 : 0.42;
  b.limb(
    [
      [0, -0.2, 0],
      [0, H * 0.3, 0],
      [0, H * 0.7, 0],
      [0, H, 0],
    ],
    [R0, R0 * 0.8, R0 * 0.7, R0 * 0.55],
    BARK_PALE,
    10,
  );
  for (let i = 0; i < (giant ? 6 : 4); i++) {
    const a = (i / (giant ? 6 : 4)) * 6.283 + r() * 0.5,
      L = R0 * (giant ? 3.2 : 2.6);
    b.limb(
      [
        [Math.cos(a) * R0 * 0.4, H * (giant ? 0.18 : 0.14), Math.sin(a) * R0 * 0.4],
        [Math.cos(a) * L * 0.55, H * 0.04, Math.sin(a) * L * 0.55],
        [Math.cos(a) * L, -0.15, Math.sin(a) * L],
      ],
      [R0 * 0.35, R0 * 0.28, R0 * 0.1],
      BARK_PALE,
      5,
    );
  }
  const CW = giant ? 8.5 : 3.6,
    cy = H + (giant ? 1.4 : 1.4),
    clumps: [Vec, number][] = [];
  for (let i = 0; i < (giant ? 7 : 5); i++) {
    const a = (i / (giant ? 7 : 5)) * 6.283 + r() * 0.6,
      d = CW * (0.55 + r() * 0.3),
      e = vec(Math.cos(a) * d, cy + (r() - 0.3) * (giant ? 1.6 : 0.8), Math.sin(a) * d);
    b.limb(
      [
        [0, H - (giant ? 1.5 : 0.6), 0],
        [e.x * 0.5, cy - 0.3 + (giant ? 1.2 : 0.5), e.z * 0.5],
        [e.x, e.y, e.z],
      ],
      [R0 * 0.4, R0 * 0.28, R0 * 0.12],
      BARK_PALE,
      6,
      0.1,
    );
  }
  for (const p of shell(r, giant ? 22 : 12, vec(0, cy + (giant ? 0.8 : 0.6), 0), CW, giant ? 1.6 : 1.3, CW, 0.2))
    clumps.push([p, (giant ? 2.2 : 1.25) + r() * (giant ? 0.8 : 0.4)]);
  crown(b, clumps, vec(0, cy - 1, 0), giant ? CELL.small : CELL.broad, giant ? 7 : 6, 1.7, cy - 1, cy + 2);
  return b.build();
}
function dry(v: number): Template {
  // matorral seco del sur: tronco torcido, pocas ramas y copa rala y plana
  const r = rng(v * 41 + 19),
    b = new FB(r),
    lx = (r() - 0.5) * 1.2,
    lz = (r() - 0.5) * 1.2,
    top = vec(lx, 2.2 + r() * 0.5, lz);
  b.limb(
    [
      [0, -0.1, 0],
      [lx * 0.2 + 0.15, 0.9, lz * 0.2],
      [lx * 0.6 - 0.1, 1.7, lz * 0.6],
      [top.x, top.y, top.z],
    ],
    [0.22, 0.17, 0.13, 0.1],
    col('#b0a090'),
    6,
  );
  const clumps: [Vec, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = i * 1.3 + r(),
      d = 1 + r() * 1.1,
      e = vec(top.x + Math.cos(a) * d, top.y + 0.6 + r() * 0.6, top.z + Math.sin(a) * d);
    b.limb(
      [
        [top.x, top.y - 0.15, top.z],
        [e.x, e.y, e.z],
      ],
      [0.08, 0.03],
      col('#b0a090'),
      5,
      0.2,
    );
    clumps.push([e, 0.85 + r() * 0.35]);
  }
  crown(b, clumps, top.clone().add(vec(0, 0.3, 0)), v % 2 ? CELL.twig : CELL.small, 4, 1.8, top.y, top.y + 1.4, 0.35);
  return b.build();
}
/** roseta de láminas que salen del centro y se arquean (helecho, guineo, zacate alto, carrizo) */
function rosette(
  b: FB,
  n: number,
  cell: number,
  L: number,
  W: number,
  up: number,
  droop: number,
  base: Vec,
  fold: number,
  rand = 0.3,
) {
  const r = b.r;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + r() * rand * 3,
      d = vec(Math.cos(a), 0, Math.sin(a)),
      ac = vec(-Math.sin(a), 0, Math.cos(a)),
      l = L * (0.8 + r() * 0.35),
      P: Vec[] = [],
      Wd: number[] = [],
      A: Vec[] = [],
      S: number[] = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      P.push(
        base
          .clone()
          .addScaledVector(d, l * t * (0.55 + 0.45 * t))
          .add(vec(0, l * (up * t - droop * t * t), 0)),
      );
      Wd.push(W * Math.sin(Math.PI * (0.1 + 0.85 * t)) ** 0.5);
      A.push(ac);
      S.push(t);
    }
    b.strip(P, Wd, A, fold, cell, leafTone(r, 0.5), S);
  }
}
function banana(v: number, bolsa = false): Template {
  const r = rng(v * 23 + 41),
    b = new FB(r),
    H = 2.1 + r() * 0.5;
  b.limb(
    [
      [0, -0.1, 0],
      [0, H * 0.5, 0],
      [0, H, 0],
    ],
    [0.17, 0.14, 0.11],
    // pseudotallo: vainas verdosas con fibras secas a lo largo (la textura del zacate seco, no la corteza)
    col('#a8c088'),
    8,
    0,
    CELL.dry,
  );
  rosette(b, Math.round(10 * (0.6 + 0.4 * cardK())), CELL.banana, 2.3, 1.05, 1.05, 1.0, vec(0, H - 0.1, 0), 0.1);
  if (bolsa) {
    // bananera: el racimo va dentro de su bolsa azul de plástico y un puntal de madera sostiene la mata
    b.blob(vec(0.36, H - 0.78, 0.1), [0.18, 0.42, 0.18], 95 + v, col('#7fb0ff'), 0, CELL.izoteFlor, 0);
    b.blob(vec(0.36, H - 0.3, 0.1), [0.08, 0.12, 0.08], 97, col('#7a8a4a'), 0, CELL.bark, 0);
    b.limb(
      [
        [1.0, -0.05, 0.55],
        [0.66, H * 0.45, 0.32],
        [0.3, H - 0.25, 0.08],
      ],
      [0.035, 0.03, 0.025],
      col('#e0c8a0'),
      5,
      0,
      CELL.dry,
    );
  } else if (v % 2 === 0) {
    // racimo verde y la bellota morada colgando
    for (let i = 0; i < 6; i++)
      b.blob(vec(0.35, H - 0.5 - i * 0.12, 0.1), [0.16, 0.1, 0.16], 90 + i, col('#9ab048', 0.9), 0);
    b.blob(vec(0.4, H - 1.35, 0.12), [0.1, 0.18, 0.1], 99, col('#7a2a50'), 0);
  }
  return b.build();
}
function cafe(v: number): Template {
  // cafeto de cafetal: arbusto denso cónico con hojas lustrosas y granos
  const r = rng(v * 61 + 7),
    b = new FB(r),
    clumps: [Vec, number][] = [];
  b.limb(
    [
      [0, -0.05, 0],
      [0, 0.8, 0],
      [0, 1.6, 0],
    ],
    [0.05, 0.04, 0.02],
    BARK,
    5,
  );
  for (let i = 0; i < 7; i++) {
    const t = i / 6,
      a = i * 2.3 + r();
    clumps.push([
      vec(Math.cos(a) * 0.35 * (1 - t * 0.6), 0.35 + t * 1.15, Math.sin(a) * 0.35 * (1 - t * 0.6)),
      0.55 - t * 0.2,
    ]);
  }
  // un solo relleno en el centro (un cafetal tiene cientos de matas)
  b.blob(vec(0, 0.85, 0), [0.4, 0.68, 0.4], 5, col('#ffffff', 0.62), 0.4);
  crown(b, clumps.slice(0, 5), vec(0, 0.9, 0), CELL.cafe, 4, 1.8, 0.3, 1.6, 0);
  return b.build();
}
function fern(v: number): Template {
  const b = new FB(rng(v * 13 + 1));
  rosette(b, Math.round(9 * (0.6 + 0.4 * cardK())), CELL.fern, 1.1, 0.5, 0.75, 0.9, vec(0, 0.05, 0), 0.1);
  return b.build();
}
function tuft(v: number, cell: number, h: number, w: number, n: number): Template {
  const r = rng(v * 7 + cell),
    b = new FB(r);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI + r() * 0.4,
      face = vec(Math.cos(a), 0, Math.sin(a)),
      p = vec((r() - 0.5) * 0.3, h / 2 - 0.03, (r() - 0.5) * 0.3);
    b.card(p, w, h, face, 0, vec(p.x, -1.5, p.z), cell, leafTone(r, 0.6), 0.5);
  }
  // las tarjetas de zacate se mecen solo arriba
  for (let i = 0; i < b.S.length; i++) b.S[i] = Math.max(0, (b.P[i * 3 + 1] - 0.05) / h) * 0.9;
  return b.build();
}

// --- jardín hondureño: izote, veranera sobre el tapial, seto podado y tulipán
function izote(v: number): Template {
  // izote (yuca): troncos pálidos que se ramifican, cada uno con su penacho de hojas tiesas; a veces la flor
  const r = rng(v * 37 + 11),
    b = new FB(r),
    tops: Vec[] = [];
  const trunks: [number, number, number][] =
    v === 0
      ? [[0, 0, 1.7]]
      : v === 1
        ? [
            [-0.1, 0, 2.2],
            [0.35, 0.15, 1.3],
          ]
        : [
            [0, 0, 1.1],
            [0.3, -0.2, 0.6],
            [-0.25, 0.25, 1.5],
          ];
  for (const [x, z, h] of trunks) {
    const lx = x * 1.6,
      lz = z * 1.6;
    b.limb(
      [
        [0, -0.05, 0],
        [lx * 0.35, h * 0.5, lz * 0.35],
        [lx, h, lz],
      ],
      [0.13, 0.1, 0.085],
      col('#b9ab92'),
      7,
    );
    tops.push(vec(lx, h, lz));
  }
  for (const T of tops) {
    // hojas secas colgando debajo del penacho y el penacho tieso arriba
    rosette(b, 6, CELL.izote, 0.7, 0.1, -0.15, 0.35, T.clone().add(vec(0, -0.12, 0)), 0.04, 0.5);
    rosette(b, Math.round(20 * (0.6 + 0.4 * cardK())), CELL.izote, 0.85, 0.11, 0.95, 0.3, T, 0.05, 0.35);
  }
  if (v !== 1) {
    const T = tops.reduce((a, q) => (q.y > a.y ? q : a)),
      p = T.clone().add(vec(0, 0.95, 0));
    for (let k = 0; k < 2; k++) {
      const a = k * 1.57 + 0.4;
      b.card(p, 0.8, 1.45, vec(Math.cos(a), 0, Math.sin(a)), 0, p, CELL.izoteFlor, col('#ffffff'), 0.4);
    }
  }
  return b.build();
}
function veranera(v: number): Template {
  // veranera trepada a un tapial: x = a lo largo de la pared, +z = hacia la calle. Tallos leñosos detrás de la pared y
  // una masa de brácteas fucsia que se derrama por encima y cuelga del lado de la calle.
  const r = rng(v * 43 + 19),
    b = new FB(r),
    len = v === 0 ? 2.6 : 1.8;
  for (const x of [-len * 0.25, len * 0.2])
    b.limb(
      [
        [x, -0.05, -0.45],
        [x + 0.1, 1.2, -0.35],
        [x - 0.1, 2.1, -0.1],
      ],
      [0.06, 0.05, 0.035],
      BARK,
      5,
    );
  const clumps: [Vec, number][] = [];
  const n = v === 0 ? 9 : 6;
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5,
      x = (t - 0.5) * len + (r() - 0.5) * 0.3,
      edge = 1 - Math.abs(t - 0.5) * 1.4;
    clumps.push([vec(x, 2.15 + r() * 0.45 * edge, -0.25 + r() * 0.3), 0.5 + r() * 0.2]);
    // lo que se derrama hacia la calle y cuelga sobre la pared
    if (r() < 0.75) clumps.push([vec(x + (r() - 0.5) * 0.3, 1.55 + r() * 0.35, 0.28 + r() * 0.12), 0.32 + r() * 0.12]);
  }
  crown(b, clumps, vec(0, 1.9, -0.2), CELL.veranera, 5, 1.6, 1.4, 2.8, 0.42);
  return b.build();
}
function seto(v: number): Template {
  // seto podado de 1.2 m: relleno y tarjetas sobre las caras de una caja (v = 2: con flores de tulipán)
  const r = rng(v * 29 + 3),
    b = new FB(r),
    W = 1.2,
    H = 0.85 + v * 0.08,
    D = 0.6,
    cell = v === 2 ? CELL.tulipan : CELL.small,
    c0 = vec(0, H * 0.5, 0);
  b.blob(c0, [W * 0.52, H * 0.5, D * 0.5], 31 + v, col('#ffffff', 0.62), 0.2);
  const face = (p: Vec, n: Vec, w: number, h: number) =>
    b.card(
      p,
      w,
      h,
      n.clone().add(vec((r() - 0.5) * 0.4, (r() - 0.5) * 0.3, (r() - 0.5) * 0.4)),
      r() * 6.283,
      c0,
      cell,
      leafTone(r, p.y / H),
      0.3,
    );
  for (let i = 0; i < 3; i++) {
    const x = (i - 1) * 0.4 + (r() - 0.5) * 0.08;
    face(vec(x, H + 0.02, 0), vec(0, 1, 0), 0.62, 0.62);
    for (const s of [-1, 1]) face(vec(x, H * 0.5, s * (D / 2 + 0.03)), vec(0, 0, s), 0.6, H * 1.05);
  }
  for (const s of [-1, 1]) face(vec(s * (W / 2 + 0.03), H * 0.5, 0), vec(s, 0, 0), D * 1.1, H * 1.05);
  return b.build();
}
function tulipan(v: number): Template {
  // tulipán (hibisco) de patio: varias varas desde el suelo y la copa con flores rojas
  const r = rng(v * 53 + 23),
    b = new FB(r),
    H = 1.2 + v * 0.3,
    clumps: [Vec, number][] = [];
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + r();
    b.limb(
      [
        [0, -0.05, 0],
        [Math.cos(a) * 0.15, H * 0.5, Math.sin(a) * 0.15],
        [Math.cos(a) * 0.3, H * 0.8, Math.sin(a) * 0.3],
      ],
      [0.035, 0.028, 0.02],
      BARK,
      5,
    );
  }
  for (let i = 0; i < 6; i++) {
    const a = i * 1.1 + r(),
      d = 0.25 + r() * 0.2;
    clumps.push([vec(Math.cos(a) * d, H * (0.55 + r() * 0.35), Math.sin(a) * d), 0.4 + r() * 0.12]);
  }
  clumps.push([vec(0, H * 0.95, 0), 0.42]);
  crown(b, clumps, vec(0, H * 0.6, 0), CELL.tulipan, 4, 1.7, H * 0.4, H, 0.5);
  return b.build();
}

/** cuántas variantes tiene cada especie */
const VARIANTS: Record<FloraKind, number> = {
  tree: 4,
  pine: 3,
  palm: 3,
  oilpalm: 1,
  bush: 3,
  jungle: 3,
  giant: 2,
  dry: 3,
  reed: 2,
  fern: 2,
  banana: 2,
  cafe: 2,
  flowers: 3,
  bananera: 2,
  izote: 3,
  veranera: 2,
  seto: 3,
  tulipan: 2,
};
const templates = new Map<string, Template>();
export function template(k: FloraKind, seed: number): Template {
  const v = ((Math.round(seed) % VARIANTS[k]) + VARIANTS[k]) % VARIANTS[k],
    key = `${k}|${v}`;
  let t = templates.get(key);
  if (t) return t;
  t =
    k === 'tree'
      ? broadleaf(v)
      : k === 'pine'
        ? pine(v)
        : k === 'palm'
          ? palm(v)
          : k === 'oilpalm'
            ? palm(3)
            : k === 'bush'
              ? bush(v, v === 2 ? CELL.small : CELL.broad)
              : k === 'jungle'
                ? rainforest(v, false)
                : k === 'giant'
                  ? rainforest(v, true)
                  : k === 'dry'
                    ? dry(v)
                    : k === 'banana' || k === 'bananera'
                      ? banana(v, k === 'bananera')
                      : k === 'izote'
                        ? izote(v)
                        : k === 'veranera'
                          ? veranera(v)
                          : k === 'seto'
                            ? seto(v)
                            : k === 'tulipan'
                              ? tulipan(v)
                              : k === 'cafe'
                                ? cafe(v)
                                : k === 'fern'
                                  ? fern(v)
                                  : k === 'reed'
                                    ? tuft(v, v ? CELL.dry : CELL.grass, 1.7, 1.2, 4)
                                    : tuft(v, CELL.flowers, 0.55, 0.75, 3);
  templates.set(key, t);
  return t;
}

/** matiz de hoja a partir del color que pide la escena (relativo a un verde de referencia) */
const REF = new THREE.Color('#4a8a40');
export function leafTint(color?: string): THREE.Color {
  if (!color) return new THREE.Color(1, 1, 1);
  _c.set(color);
  const t = new THREE.Color(_c.r / REF.r, _c.g / REF.g, _c.b / REF.b),
    l = (t.r + t.g + t.b) / 3;
  // menos saturado que el pedido: el atlas ya trae el verde
  t.lerp(new THREE.Color(l, l, l), 0.35);
  t.r = Math.min(1.8, Math.max(0.45, t.r));
  t.g = Math.min(1.6, Math.max(0.45, t.g));
  t.b = Math.min(1.6, Math.max(0.35, t.b));
  return t;
}

/** Fusiona plantas (plantilla + matriz + matiz) en una sola geometría. */
export function mergeFlora(list: { t: Template; m: THREE.Matrix4; tint: THREE.Color }[]): THREE.BufferGeometry {
  let nv = 0,
    ni = 0;
  for (const { t } of list) {
    nv += t.pos.length / 3;
    ni += t.idx.length;
  }
  const pos = new Float32Array(nv * 3),
    nor = new Float32Array(nv * 3),
    uv = new Float32Array(nv * 2),
    cl = new Float32Array(nv * 3),
    cell = new Float32Array(nv * 4),
    sw = new Float32Array(nv),
    idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let o = 0,
    oi = 0;
  for (const { t, m, tint } of list) {
    _m3.getNormalMatrix(m);
    const n = t.pos.length / 3;
    for (let i = 0; i < n; i++) {
      _v.fromArray(t.pos, i * 3).applyMatrix4(m);
      _v.toArray(pos, (o + i) * 3);
      _n.fromArray(t.nor, i * 3)
        .applyMatrix3(_m3)
        .normalize();
      _n.toArray(nor, (o + i) * 3);
      const lf = t.leaf[i];
      cl[(o + i) * 3] = t.col[i * 3] * (lf ? tint.r : 1);
      cl[(o + i) * 3 + 1] = t.col[i * 3 + 1] * (lf ? tint.g : 1);
      cl[(o + i) * 3 + 2] = t.col[i * 3 + 2] * (lf ? tint.b : 1);
    }
    uv.set(t.uv, o * 2);
    cell.set(t.cell, o * 4);
    sw.set(t.sway, o);
    for (let i = 0; i < t.idx.length; i++) idx[oi + i] = t.idx[i] + o;
    o += n;
    oi += t.idx.length;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(cl, 3));
  g.setAttribute('aCell', new THREE.BufferAttribute(cell, 4));
  g.setAttribute('aSway', new THREE.BufferAttribute(sw, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  g.computeBoundingSphere();
  return g;
}

const _q = new THREE.Quaternion(),
  _s = new THREE.Vector3(),
  _p = new THREE.Vector3();
export function floraMatrix(it: FloraItem) {
  const rot = it.r ?? (it.seed * 2.399) % 6.283;
  _q.setFromAxisAngle(UP, rot);
  _s.setScalar(it.s);
  _p.set(it.p[0], it.p[1], it.p[2]);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

/** Muchas plantas fusionadas en una malla (una llamada de dibujo). Las coordenadas son del mundo. */
export function Flora({ items }: { items: FloraItem[] }) {
  const geo = useMemo(
    () =>
      items.length
        ? mergeFlora(items.map((it) => ({ t: template(it.k, it.seed), m: floraMatrix(it), tint: leafTint(it.c) })))
        : null,
    [items],
  );
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh
      geometry={geo}
      material={floraMaterial()}
      customDepthMaterial={floraDepthMaterial()}
      castShadow
      receiveShadow
    />
  );
}

const single = new Map<string, THREE.BufferGeometry>();
/** geometría de una planta suelta (cacheada por especie, variante y color) */
export function floraGeometry(k: FloraKind, seed: number, color?: string) {
  const t = template(k, seed),
    key = `${k}|${((Math.round(seed) % VARIANTS[k]) + VARIANTS[k]) % VARIANTS[k]}|${color ?? ''}`;
  let g = single.get(key);
  if (!g) {
    g = mergeFlora([{ t, m: new THREE.Matrix4(), tint: leafTint(color) }]);
    single.set(key, g);
  }
  return g;
}
/** una planta suelta (utilería): una llamada de dibujo */
export function FloraMesh({ k, seed, color }: { k: FloraKind; seed: number; color?: string }) {
  return (
    <mesh
      geometry={floraGeometry(k, seed, color)}
      material={floraMaterial()}
      customDepthMaterial={floraDepthMaterial()}
      castShadow
      receiveShadow
    />
  );
}
