// Texturas procedurales del paquete HD. Cada "capa" es un mosaico repetible dibujado en lienzo:
//   albedo  RGBA  → color de detalle (se multiplica por el color que pide la escena; A = cuánto se tiñe)
//   normal  RGBA  → RG = normal en espacio tangente, B = rugosidad relativa, A = altura
// Todas las capas viven en dos DataArrayTexture para que un solo material (y una sola llamada de dibujo)
// pueda mezclar madera, estuco, teja, hoja, etc. según un atributo por vértice.
import * as THREE from 'three';

export const TS = 512;
export const LAYERS = [
  'plastic',
  'grass',
  'dirt',
  'sand',
  'stone',
  'cobble',
  'brick',
  'wood',
  'metal',
  'tile',
  'stucco',
  'roof',
  'water',
  'cloth',
  'asphalt',
  'concrete',
  'leaf',
  'gold',
  'bark',
  'straw',
  'macro',
] as const;
export type LayerName = (typeof LAYERS)[number];
export const layerIndex = (n: LayerName) => LAYERS.indexOf(n);
/** metros que cubre una repetición de cada capa */
export const TILE: Record<LayerName, number> = {
  plastic: 2,
  grass: 3.2,
  dirt: 3,
  sand: 3,
  stone: 3,
  cobble: 2.4,
  brick: 2,
  wood: 1.6,
  metal: 1.5,
  tile: 1.2,
  stucco: 3,
  roof: 1.6,
  water: 5,
  cloth: 0.8,
  asphalt: 3,
  concrete: 4,
  leaf: 1.6,
  gold: 1,
  bark: 1.2,
  straw: 0.9,
  macro: 40,
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// --- ruido de valor repetible
const NT = 256,
  ntab = new Float32Array(NT * NT);
{
  const r = rng(1234);
  for (let i = 0; i < ntab.length; i++) ntab[i] = r();
}
function vnoise(x: number, y: number, px: number, py: number) {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi;
  const x0 = ((xi % px) + px) % px,
    y0 = ((yi % py) + py) % py,
    x1 = (x0 + 1) % px,
    y1 = (y0 + 1) % py;
  const u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  const a = ntab[y0 * NT + x0],
    b = ntab[y0 * NT + x1],
    c = ntab[y1 * NT + x0],
    d = ntab[y1 * NT + x1];
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
/** fbm repetible; u,v en 0..1, p = celdas de la primera octava (py distinto = ruido estirado) */
export function fbm(u: number, v: number, p: number, oct = 4, off = 0, py = p) {
  let s = 0,
    a = 0.5,
    n = 0;
  for (let o = 0; o < oct && p <= NT && py <= NT; o++) {
    s += vnoise(u * p + off * 7.3, v * py + off * 3.1, p, py) * a;
    n += a;
    a *= 0.5;
    p *= 2;
    py *= 2;
  }
  return s / n;
}

type Ctx = CanvasRenderingContext2D;
function canvas(fill: string): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = c.height = TS;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.fillStyle = fill;
  x.fillRect(0, 0, TS, TS);
  return [c, x];
}
/** dibuja una forma 9 veces para que el mosaico cierre en los bordes */
function wrap(cs: Ctx[], fn: (c: Ctx, i: number) => void) {
  cs.forEach((c, i) => {
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++) {
        c.save();
        c.translate(dx * TS, dy * TS);
        fn(c, i);
        c.restore();
      }
  });
}
const g = (v: number) => {
  const n = Math.max(0, Math.min(255, Math.round(v * 255)));
  return `rgb(${n},${n},${n})`;
};
const rgb = (r: number, gg: number, b: number, a = 1) =>
  `rgba(${Math.round(r * 255)},${Math.round(gg * 255)},${Math.round(b * 255)},${a})`;

interface Cfg {
  /** fuerza del mapa de normales */ n: number;
  /** rugosidad relativa = r0 + r1 * altura (0..1; 0.5 = la del material) */ r0?: number;
  r1?: number;
  /** oscurecer huecos según la altura */ ao?: number;
  /** modulación por píxel: (u, v) → [factor de albedo, altura extra] */ px?: (
    u: number,
    v: number,
    rnd: () => number,
  ) => [number, number];
  /** si se define, la altura sale de px y el lienzo solo suma (lienzo − 0.5) × hk; si no, altura = lienzo + px */ hk?: number;
}
type Gen = (a: Ctx, h: Ctx, r: () => number) => Cfg;

const blob = (c: Ctx, x: number, y: number, rx: number, ry: number, rot: number, r: () => number, k = 0.25) => {
  c.beginPath();
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2,
      rr = 1 + (i === n ? 0 : 1) * (r() - 0.5) * k;
    const px = Math.cos(t) * rx * rr,
      py = Math.sin(t) * ry * rr;
    const X = x + px * Math.cos(rot) - py * Math.sin(rot),
      Y = y + px * Math.sin(rot) + py * Math.cos(rot);
    if (i === 0) c.moveTo(X, Y);
    else c.lineTo(X, Y);
  }
  c.closePath();
};

const GEN: Record<LayerName, Gen> = {
  plastic: () => ({ hk: 0, n: 0.25, r0: 0.45, r1: 0.1, px: (u, v) => [1, 0.5 + (fbm(u, v, 48, 3) - 0.5) * 0.25] }),
  grass: (a, h, r) => {
    h.fillStyle = g(0.3);
    h.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 16000; i++) {
      const x = r() * TS,
        y = r() * TS,
        ang = r() * Math.PI * 2,
        len = 5 + r() * 11,
        t = r();
      const col =
          t < 0.25
            ? rgb(1, 1, 0.72, 0.5)
            : t < 0.5
              ? rgb(0.62, 0.8, 0.6, 0.5)
              : t < 0.8
                ? rgb(0.86, 1, 0.78, 0.5)
                : rgb(0.5, 0.68, 0.5, 0.5),
        hv = 0.35 + r() * 0.65;
      wrap([a, h], (c, k) => {
        c.strokeStyle = k ? g(hv) : col;
        c.lineWidth = 1.6 + r() * 1.2;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x, y);
        c.quadraticCurveTo(
          x + Math.cos(ang + 0.5) * len * 0.5,
          y + Math.sin(ang + 0.5) * len * 0.5,
          x + Math.cos(ang) * len,
          y + Math.sin(ang) * len,
        );
        c.stroke();
      });
    }
    return { n: 1.1, r0: 0.5, r1: 0.1, ao: 0.3, px: (u, v) => [0.8 + fbm(u, v, 6, 4) * 0.34, 0] };
  },
  dirt: (a, h, r) => {
    for (let i = 0; i < 260; i++) {
      const x = r() * TS,
        y = r() * TS,
        s = 2 + r() * 7,
        t = 0.75 + r() * 0.3;
      wrap([a, h], (c, k) => {
        c.fillStyle = k ? g(0.75 + r() * 0.2) : rgb(t, t * 0.97, t * 0.92, 0.9);
        blob(c, x, y, s, s * (0.6 + r() * 0.4), r() * 3, r);
        c.fill();
      });
    }
    return {
      hk: 1.2,
      n: 1.3,
      r0: 0.5,
      r1: 0.05,
      ao: 0.35,
      px: (u, v, rn) => {
        const f = fbm(u, v, 5, 5),
          f2 = fbm(u, v, 24, 3, 3);
        return [0.72 + f * 0.42 + (rn() - 0.5) * 0.06, 0.25 + f * 0.4 + f2 * 0.3];
      },
    };
  },
  sand: () => ({
    hk: 0,
    n: 0.9,
    r0: 0.5,
    r1: 0.06,
    ao: 0.12,
    px: (u, v, rn) => {
      const w = fbm(u, v, 4, 3) * 5,
        rp = Math.sin((v * 22 + w + Math.sin(u * Math.PI * 4) * 0.35) * Math.PI * 2) * 0.5 + 0.5;
      return [0.9 + rp * 0.1 + (rn() - 0.5) * 0.07, 0.3 + rp * 0.55 + (rn() - 0.5) * 0.08];
    },
  }),
  stone: (a, h, r) => {
    for (let i = 0; i < 14; i++) {
      let x = r() * TS,
        y = r() * TS,
        ang = r() * 6.28;
      const pts: number[][] = [[x, y]];
      for (let s = 0; s < 14; s++) {
        ang += (r() - 0.5) * 1.1;
        x += Math.cos(ang) * 22;
        y += Math.sin(ang) * 22;
        pts.push([x, y]);
      }
      wrap([a, h], (c, k) => {
        c.strokeStyle = k ? g(0) : 'rgba(40,36,34,0.55)';
        c.lineWidth = k ? 3.2 : 1.6;
        c.lineJoin = 'round';
        c.beginPath();
        pts.forEach((p, j) => (j ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
        c.stroke();
      });
    }
    return {
      hk: 1.6,
      n: 1.5,
      r0: 0.42,
      r1: 0.14,
      ao: 0.4,
      px: (u, v, rn) => {
        const f = fbm(u, v, 4, 5),
          rd = Math.abs(fbm(u, v, 7, 4, 5) - 0.5) * 2,
          st = fbm(u, v, 4, 2, 9, 14);
        return [0.74 + f * 0.3 + st * 0.08 + (rn() - 0.5) * 0.05, 0.25 + f * 0.35 + rd * 0.4];
      },
    };
  },
  cobble: (a, h, r) => {
    a.fillStyle = 'rgba(96,88,80,0)';
    a.clearRect(0, 0, TS, TS);
    a.fillStyle = 'rgba(92,86,80,0.25)';
    a.fillRect(0, 0, TS, TS);
    h.fillStyle = g(0.05);
    h.fillRect(0, 0, TS, TS);
    const N = 8,
      cs = TS / N;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const x = (i + 0.5 + (j % 2) * 0.5 + (r() - 0.5) * 0.22) * cs,
          y = (j + 0.5 + (r() - 0.5) * 0.22) * cs,
          rx = cs * (0.4 + r() * 0.08),
          ry = cs * (0.38 + r() * 0.08),
          rot = (r() - 0.5) * 0.7,
          t = 0.72 + r() * 0.3,
          warm = (r() - 0.5) * 0.08,
          sd = Math.floor(r() * 1e6);
        wrap([a, h], (c, k) => {
          const rr = rng(sd);
          blob(c, x, y, rx, ry, rot, rr, 0.22);
          if (k) {
            const gr = c.createRadialGradient(x - rx * 0.15, y - ry * 0.15, 1, x, y, rx * 1.05);
            gr.addColorStop(0, g(1));
            gr.addColorStop(0.6, g(0.85));
            gr.addColorStop(1, g(0.3));
            c.fillStyle = gr;
          } else c.fillStyle = rgb(t + warm, t, t - warm);
          c.fill();
        });
      }
    return {
      n: 2.2,
      r0: 0.38,
      r1: 0.14,
      ao: 0.55,
      px: (u, v, rn) => [0.9 + fbm(u, v, 40, 3) * 0.16 + (rn() - 0.5) * 0.05, (fbm(u, v, 64, 2) - 0.5) * 0.12],
    };
  },
  brick: (a, h, r) => {
    a.clearRect(0, 0, TS, TS);
    a.fillStyle = 'rgba(214,206,192,0.12)';
    a.fillRect(0, 0, TS, TS);
    h.fillStyle = g(0.15);
    h.fillRect(0, 0, TS, TS);
    const rows = 8,
      cols = 4,
      bh = TS / rows,
      bw = TS / cols,
      m = 5;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = (i + (j % 2) * 0.5) * bw,
          y = j * bh,
          t = r() < 0.12 ? 0.62 + r() * 0.1 : 0.82 + r() * 0.2,
          warm = (r() - 0.5) * 0.1,
          hv = 0.72 + r() * 0.2;
        wrap([a, h], (c, k) => {
          c.fillStyle = k ? g(hv) : rgb(t + warm, t, t - warm * 0.5);
          c.beginPath();
          c.roundRect(x + m / 2, y + m / 2, bw - m, bh - m, 4);
          c.fill();
          if (k) {
            c.strokeStyle = g(hv - 0.3);
            c.lineWidth = 2;
            c.stroke();
          }
        });
      }
    return {
      n: 2,
      r0: 0.46,
      r1: 0.1,
      ao: 0.4,
      px: (u, v, rn) => [0.9 + fbm(u, v, 24, 3) * 0.2 + (rn() - 0.5) * 0.06, (fbm(u, v, 80, 2) - 0.5) * 0.3],
    };
  },
  wood: (a, h, r) => {
    const planks = 4,
      ph = TS / planks;
    for (let j = 0; j < planks; j++) {
      const t = 0.8 + r() * 0.2,
        warm = (r() - 0.5) * 0.06,
        y0 = j * ph;
      a.fillStyle = rgb(t + warm, t, t - warm);
      a.fillRect(0, y0, TS, ph);
      h.fillStyle = g(0.7 + r() * 0.1);
      h.fillRect(0, y0, TS, ph);
      for (let l = 0; l < 26; l++) {
        const y = y0 + 3 + r() * (ph - 6),
          amp = 1 + r() * 4,
          fr = 1 + Math.floor(r() * 3),
          ph0 = r() * 6.28,
          al = 0.06 + r() * 0.2,
          lw = 0.8 + r() * 1.6;
        [a, h].forEach((c, k) => {
          c.strokeStyle = k ? `rgba(0,0,0,${al * 1.4})` : `rgba(60,34,14,${al})`;
          c.lineWidth = lw;
          c.beginPath();
          for (let x = 0; x <= TS; x += 8) {
            const yy = y + Math.sin((x / TS) * Math.PI * 2 * fr + ph0) * amp;
            if (x) c.lineTo(x, yy);
            else c.moveTo(x, yy);
          }
          c.stroke();
        });
      }
      if (r() < 0.75) {
        const kx = r() * TS,
          ky = y0 + ph * (0.3 + r() * 0.4),
          kr = 5 + r() * 8;
        wrap([a, h], (c, k) => {
          for (let q = 3; q > 0; q--) {
            c.strokeStyle = k ? `rgba(0,0,0,${0.2 * q})` : `rgba(50,26,10,${0.14 * q})`;
            c.lineWidth = 2;
            c.beginPath();
            c.ellipse(kx, ky, kr * q * 0.6, kr * q * 0.33, 0, 0, 6.3);
            c.stroke();
          }
          c.fillStyle = k ? g(0.3) : 'rgba(48,26,12,0.6)';
          c.beginPath();
          c.ellipse(kx, ky, kr * 0.4, kr * 0.25, 0, 0, 6.3);
          c.fill();
        });
      }
      const cut = r() * TS;
      wrap([a, h], (c, k) => {
        c.fillStyle = k ? g(0.05) : 'rgba(30,18,10,0.85)';
        c.fillRect(cut, y0, 3, ph);
        c.fillRect(0, y0 - 2, TS, 4);
        if (!k) {
          c.fillStyle = 'rgba(40,40,44,0.8)';
          for (const dx of [-9, 10])
            for (const dy of [0.22, 0.78]) {
              c.beginPath();
              c.arc(cut + dx, y0 + ph * dy, 2.4, 0, 6.3);
              c.fill();
            }
        }
      });
    }
    return {
      n: 1.4,
      r0: 0.4,
      r1: 0.14,
      ao: 0.3,
      px: (u, v, rn) => [0.92 + fbm(u, v, 8, 3, 0, 30) * 0.14 + (rn() - 0.5) * 0.03, 0],
    };
  },
  metal: (a, h, r) => {
    for (let y = 0; y < TS; y++) {
      const t = 0.9 + r() * 0.1;
      a.fillStyle = g(t);
      a.fillRect(0, y, TS, 1);
      h.fillStyle = g(0.4 + r() * 0.25);
      h.fillRect(0, y, TS, 1);
    }
    for (let i = 0; i < 60; i++) {
      const x = r() * TS,
        y = r() * TS,
        l = 30 + r() * 160,
        dy = (r() - 0.5) * 8;
      wrap([a, h], (c, k) => {
        c.strokeStyle = k ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)';
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, y);
        c.lineTo(x + l, y + dy);
        c.stroke();
      });
    }
    return { n: 0.5, r0: 0.38, r1: 0.25, px: (u, v) => [0.94 + fbm(u, v, 5, 3) * 0.1, 0] };
  },
  tile: (a, h, r) => {
    a.clearRect(0, 0, TS, TS);
    a.fillStyle = 'rgba(208,204,196,0.1)';
    a.fillRect(0, 0, TS, TS);
    h.fillStyle = g(0.2);
    h.fillRect(0, 0, TS, TS);
    const N = 4,
      s = TS / N,
      m = 5;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const t = 0.9 + r() * 0.1,
          x = i * s + m / 2,
          y = j * s + m / 2;
        a.fillStyle = g(t);
        a.beginPath();
        a.roundRect(x, y, s - m, s - m, 5);
        a.fill();
        h.fillStyle = g(0.55);
        h.beginPath();
        h.roundRect(x, y, s - m, s - m, 6);
        h.fill();
        h.fillStyle = g(0.8);
        h.beginPath();
        h.roundRect(x + 3, y + 3, s - m - 6, s - m - 6, 5);
        h.fill();
        h.fillStyle = g(0.86);
        h.beginPath();
        h.roundRect(x + 6, y + 6, s - m - 12, s - m - 12, 4);
        h.fill();
      }
    return {
      n: 1.3,
      r0: 0.95,
      r1: -0.6,
      ao: 0.25,
      px: (u, v) => [0.95 + fbm(u, v, 9, 3) * 0.08, (fbm(u, v, 6, 3) - 0.5) * 0.05],
    };
  },
  stucco: (a, h, r) => {
    for (let i = 0; i < 26; i++) {
      const x = r() * TS,
        y = r() * TS,
        w = 6 + r() * 22,
        l = 60 + r() * 200,
        al = 0.03 + r() * 0.06;
      wrap([a], (c) => {
        const gr = c.createLinearGradient(0, y, 0, y + l);
        gr.addColorStop(0, `rgba(70,58,46,${al})`);
        gr.addColorStop(1, 'rgba(70,58,46,0)');
        c.fillStyle = gr;
        c.fillRect(x, y, w, l);
      });
    }
    for (let i = 0; i < 90; i++) {
      const x = r() * TS,
        y = r() * TS,
        rad = 14 + r() * 40,
        a0 = r() * 6.28;
      wrap([h], (c) => {
        c.strokeStyle = `rgba(255,255,255,${0.05 + r() * 0.08})`;
        c.lineWidth = 3 + r() * 5;
        c.beginPath();
        c.arc(x, y, rad, a0, a0 + 0.8 + r());
        c.stroke();
      });
    }
    return {
      hk: 1.6,
      n: 0.85,
      r0: 0.5,
      r1: 0.06,
      ao: 0.1,
      px: (u, v, rn) => {
        const f = fbm(u, v, 5, 4),
          f2 = fbm(u, v, 40, 3, 2);
        return [0.9 + f * 0.13 + (rn() - 0.5) * 0.025, 0.2 + f2 * 0.45 + (rn() - 0.5) * 0.12];
      },
    };
  },
  roof: (a, h, r) => {
    a.fillStyle = g(0.3);
    a.fillRect(0, 0, TS, TS);
    h.fillStyle = g(0);
    h.fillRect(0, 0, TS, TS);
    const cols = 8,
      rows = 4,
      cw = TS / cols,
      rh = TS / rows;
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < cols; i++) {
        const x = i * cw,
          y = j * rh,
          t = r() < 0.15 ? 0.66 + r() * 0.1 : 0.84 + r() * 0.18,
          warm = (r() - 0.5) * 0.12;
        const ga = a.createLinearGradient(x, 0, x + cw, 0);
        ga.addColorStop(0, rgb(t * 0.5, t * 0.48, t * 0.46));
        ga.addColorStop(0.2, rgb(t + warm, t, t - warm));
        ga.addColorStop(0.55, rgb(Math.min(1, t + warm + 0.06), Math.min(1, t + 0.06), t - warm + 0.04));
        ga.addColorStop(0.85, rgb(t + warm, t, t - warm));
        ga.addColorStop(1, rgb(t * 0.5, t * 0.48, t * 0.46));
        a.fillStyle = ga;
        a.fillRect(x, y, cw, rh);
        // el canvas va de arriba (cumbrera) hacia abajo (alero): cada teja monta sobre la de abajo
        const gs = a.createLinearGradient(0, y, 0, y + rh);
        gs.addColorStop(0, 'rgba(20,10,6,0.55)');
        gs.addColorStop(0.14, 'rgba(20,10,6,0)');
        gs.addColorStop(0.9, 'rgba(255,240,220,0)');
        gs.addColorStop(1, 'rgba(255,240,220,0.22)');
        a.fillStyle = gs;
        a.fillRect(x, y, cw, rh);
        for (let px = 0; px < cw; px++) {
          const q = ((px + 0.5) / cw) * 2 - 1,
            prof = Math.sqrt(Math.max(0, 1 - q * q));
          const gh = h.createLinearGradient(0, y, 0, y + rh);
          gh.addColorStop(0, g(prof * 0.55));
          gh.addColorStop(1, g(prof * 0.55 + 0.45));
          h.fillStyle = gh;
          h.fillRect(x + px, y, 1, rh);
        }
      }
    return {
      n: 2.4,
      r0: 0.44,
      r1: 0.1,
      ao: 0.2,
      px: (u, v, rn) => [0.9 + fbm(u, v, 20, 3) * 0.2 + (rn() - 0.5) * 0.04, 0],
    };
  },
  water: () => ({
    hk: 0,
    n: 1.6,
    r0: 0.5,
    r1: 0,
    px: (u, v) => {
      const f = fbm(u, v, 5, 4),
        f2 = Math.abs(fbm(u, v, 9, 3, 4) - 0.5) * 2;
      return [1, f * 0.6 + (1 - f2) * 0.4];
    },
  }),
  cloth: () => ({
    hk: 0,
    n: 0.9,
    r0: 0.5,
    r1: 0.08,
    ao: 0.25,
    px: (u, v) => {
      const N = 64,
        x = u * N,
        y = v * N,
        cx = Math.floor(x),
        cy = Math.floor(y),
        fx = x - cx,
        fy = y - cy,
        over = (cx + cy) % 2 === 0;
      const tx = Math.sin(fx * Math.PI),
        ty = Math.sin(fy * Math.PI),
        hh = over ? 0.45 + 0.55 * ty * (0.6 + 0.4 * tx) : 0.45 + 0.55 * tx * (0.6 + 0.4 * ty);
      return [0.86 + hh * 0.14 + fbm(u, v, 6, 3) * 0.06 - 0.03, hh];
    },
  }),
  asphalt: (a, h, r) => {
    for (let i = 0; i < 2600; i++) {
      const x = r() * TS,
        y = r() * TS,
        s = 0.8 + r() * 2.4,
        t = 0.85 + r() * 0.5;
      [a, h].forEach((c, k) => {
        c.fillStyle = k ? g(0.5 + r() * 0.5) : rgb(t, t, t * 0.98, 0.7);
        c.beginPath();
        c.arc(x, y, s, 0, 6.3);
        c.fill();
      });
    }
    return {
      hk: 1,
      n: 1.3,
      r0: 0.5,
      r1: 0.06,
      ao: 0.2,
      px: (u, v, rn) => [0.74 + fbm(u, v, 5, 4) * 0.22 + (rn() - 0.5) * 0.14, 0.3 + (rn() - 0.5) * 0.3],
    };
  },
  concrete: (a, h, r) => {
    for (let i = 0; i < 420; i++) {
      const x = r() * TS,
        y = r() * TS,
        s = 0.6 + r() * 1.8;
      [a, h].forEach((c, k) => {
        c.fillStyle = k ? g(0.15) : 'rgba(60,58,54,0.45)';
        c.beginPath();
        c.arc(x, y, s, 0, 6.3);
        c.fill();
      });
    }
    return {
      hk: 1,
      n: 0.8,
      r0: 0.5,
      r1: 0.06,
      ao: 0.1,
      px: (u, v, rn) => {
        const f = fbm(u, v, 4, 5);
        return [0.86 + f * 0.17 + (rn() - 0.5) * 0.035, 0.45 + fbm(u, v, 48, 2, 2) * 0.25];
      },
    };
  },
  leaf: (a, h, r) => {
    a.fillStyle = g(0.74);
    a.fillRect(0, 0, TS, TS);
    h.fillStyle = g(0.3);
    h.fillRect(0, 0, TS, TS);
    for (let i = 0; i < 520; i++) {
      const x = r() * TS,
        y = r() * TS,
        len = 20 + r() * 20,
        wd = len * (0.36 + r() * 0.14),
        rot = r() * 6.28,
        t = 0.8 + r() * 0.2,
        yel = r() < 0.3 ? 0.14 : 0;
      wrap([a, h], (c, k) => {
        c.translate(x, y);
        c.rotate(rot);
        c.beginPath();
        c.moveTo(-len / 2, 0);
        c.quadraticCurveTo(0, -wd, len / 2, 0);
        c.quadraticCurveTo(0, wd, -len / 2, 0);
        c.closePath();
        if (k) {
          const gr = c.createLinearGradient(0, -wd / 2, 0, wd / 2);
          gr.addColorStop(0, g(0.55));
          gr.addColorStop(0.5, g(1));
          gr.addColorStop(1, g(0.5));
          c.fillStyle = gr;
          c.fill();
        } else {
          c.fillStyle = rgb(Math.min(1, t + yel), t, t * (0.82 - yel));
          c.fill();
          c.strokeStyle = 'rgba(20,40,16,0.22)';
          c.lineWidth = 1.4;
          c.stroke();
          c.strokeStyle = 'rgba(255,255,220,0.3)';
          c.lineWidth = 1;
          c.beginPath();
          c.moveTo(-len / 2, 0);
          c.lineTo(len / 2, 0);
          c.stroke();
        }
      });
    }
    return { n: 1.3, r0: 0.4, r1: 0.14, ao: 0.28, px: (u, v) => [0.92 + fbm(u, v, 5, 3) * 0.2, 0] };
  },
  gold: () => ({
    hk: 0,
    n: 0.7,
    r0: 0.4,
    r1: 0.2,
    px: (u, v) => {
      const f = fbm(u, v, 9, 2),
        f2 = fbm(u, v, 20, 2, 3);
      return [0.94 + f * 0.06, f * 0.7 + f2 * 0.3];
    },
  }),
  bark: (a, h, r) => {
    for (let i = 0; i < 70; i++) {
      const x = r() * TS,
        w = 2 + r() * 5,
        amp = 3 + r() * 9,
        fr = 1 + Math.floor(r() * 3),
        p0 = r() * 6.28,
        al = 0.3 + r() * 0.45,
        y0 = r() * TS,
        len = TS * (0.3 + r() * 0.7);
      wrap([a, h], (c, k) => {
        c.strokeStyle = k ? `rgba(0,0,0,${al})` : `rgba(38,22,10,${al * 0.75})`;
        c.lineWidth = w;
        c.lineCap = 'round';
        c.beginPath();
        for (let y = y0; y <= y0 + len; y += 8) {
          const xx = x + Math.sin((y / TS) * Math.PI * 2 * fr + p0) * amp;
          if (y === y0) c.moveTo(xx, y);
          else c.lineTo(xx, y);
        }
        c.stroke();
      });
    }
    return {
      hk: 1.8,
      n: 2,
      r0: 0.5,
      r1: 0.06,
      ao: 0.45,
      px: (u, v, rn) => {
        const f = fbm(u, v, 24, 4, 0, 4);
        return [0.82 + f * 0.26 + (rn() - 0.5) * 0.05, 0.6 + f * 0.3];
      },
    };
  },
  straw: (a, h, r) => {
    a.fillStyle = g(0.72);
    a.fillRect(0, 0, TS, TS);
    h.fillStyle = g(0.2);
    h.fillRect(0, 0, TS, TS);
    const N = 16,
      s = TS / N;
    for (let j = 0; j < N; j++)
      for (let i = 0; i < N; i++) {
        const horiz = (i + j) % 2 === 0,
          t = 0.82 + r() * 0.18,
          x = i * s,
          y = j * s;
        const gr = horiz ? h.createLinearGradient(0, y, 0, y + s) : h.createLinearGradient(x, 0, x + s, 0);
        gr.addColorStop(0, g(0.3));
        gr.addColorStop(0.5, g(1));
        gr.addColorStop(1, g(0.3));
        h.fillStyle = gr;
        h.fillRect(x + 1, y + 1, s - 2, s - 2);
        a.fillStyle = rgb(t, t * 0.97, t * 0.86);
        a.fillRect(x + 1, y + 1, s - 2, s - 2);
        a.strokeStyle = 'rgba(90,60,20,0.25)';
        a.lineWidth = 1;
        for (let q = 1; q < 4; q++) {
          a.beginPath();
          if (horiz) {
            a.moveTo(x, y + (q * s) / 4);
            a.lineTo(x + s, y + (q * s) / 4);
          } else {
            a.moveTo(x + (q * s) / 4, y);
            a.lineTo(x + (q * s) / 4, y + s);
          }
          a.stroke();
        }
      }
    return { n: 1.6, r0: 0.5, r1: 0.06, ao: 0.35 };
  },
  macro: () => ({
    hk: 0,
    n: 0,
    px: (u, v) => {
      const f = fbm(u, v, 3, 5),
        f2 = fbm(u, v, 9, 4, 6);
      return [Math.min(1, Math.max(0, (f * 0.65 + f2 * 0.35 - 0.2) * 1.7)), 0];
    },
  }),
};

let built: { alb: THREE.DataArrayTexture; nrm: THREE.DataArrayTexture } | null = null;
/** Genera (una sola vez) las dos texturas en arreglo con todas las capas. */
export function layerTextures() {
  if (built) return built;
  const N = LAYERS.length,
    sz = TS * TS * 4,
    A = new Uint8Array(sz * N),
    Nm = new Uint8Array(sz * N),
    hf = new Float32Array(TS * TS);
  LAYERS.forEach((name, li) => {
    const [, a] = canvas('#ffffff'),
      [, h] = canvas(g(0.5)),
      r = rng(li * 977 + 13);
    const cfg = GEN[name](a, h, r),
      ad = a.getImageData(0, 0, TS, TS).data,
      hd = h.getImageData(0, 0, TS, TS).data,
      o = li * sz,
      pr = rng(li * 31 + 7);
    const ao = cfg.ao ?? 0,
      r0 = cfg.r0 ?? 0.5,
      r1 = cfg.r1 ?? 0;
    // fila 0 de los datos = v 0 (abajo); el lienzo se dibuja con y hacia abajo, así que se voltea
    for (let y = 0; y < TS; y++)
      for (let x = 0; x < TS; x++) {
        const src = ((TS - 1 - y) * TS + x) * 4,
          dst = o + (y * TS + x) * 4,
          i = y * TS + x;
        let hv = hd[src] / 255,
          m = 1;
        if (cfg.px) {
          const p = cfg.px(x / TS, y / TS, pr);
          m = p[0];
          hv = cfg.hk === undefined ? hv + p[1] : p[1] + (hv - 0.5) * cfg.hk;
        }
        hv = Math.max(0, Math.min(1, hv));
        hf[i] = hv;
        m *= 1 - ao * (1 - hv);
        A[dst] = Math.min(255, ad[src] * m);
        A[dst + 1] = Math.min(255, ad[src + 1] * m);
        A[dst + 2] = Math.min(255, ad[src + 2] * m);
        A[dst + 3] = ad[src + 3];
        Nm[dst + 2] = Math.max(0, Math.min(255, (r0 + r1 * (hv - 0.5) * 2) * 255));
        Nm[dst + 3] = hv * 255;
      }
    const s = cfg.n * 2.2;
    for (let y = 0; y < TS; y++)
      for (let x = 0; x < TS; x++) {
        const xl = (x + TS - 1) % TS,
          xr = (x + 1) % TS,
          yd = (y + TS - 1) % TS,
          yu = (y + 1) % TS;
        let nx = (hf[y * TS + xl] - hf[y * TS + xr]) * s,
          ny = (hf[yd * TS + x] - hf[yu * TS + x]) * s;
        const l = 1 / Math.hypot(nx, ny, 1);
        nx *= l;
        ny *= l;
        const dst = o + (y * TS + x) * 4;
        Nm[dst] = (nx * 0.5 + 0.5) * 255;
        Nm[dst + 1] = (ny * 0.5 + 0.5) * 255;
      }
  });
  const mk = (data: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataArrayTexture(data, TS, TS, N);
    t.format = THREE.RGBAFormat;
    t.type = THREE.UnsignedByteType;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.needsUpdate = true;
    return t;
  };
  built = { alb: mk(A, true), nrm: mk(Nm, false) };
  return built;
}
