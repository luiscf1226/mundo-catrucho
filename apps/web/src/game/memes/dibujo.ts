// Imagen de un meme hecha en lienzo, sin descargar nada: un dibujo sencillo de su escena, el emoji grande y el
// texto clásico arriba y abajo (blanco con borde negro). La interfaz la muestra mientras llega la foto del meme 3D.
import type { Escena, Meme } from '../../core/memes';

type C = CanvasRenderingContext2D;
/** Cada escena se dibuja en un lienzo virtual de 400 × 300; el horizonte queda cerca de y = 200. */
type Pintor = (c: C) => void;
const W = 400,
  H = 300;

const degradado = (c: C, y0: number, y1: number, a: string, b: string) => {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, a);
  g.addColorStop(1, b);
  c.fillStyle = g;
  c.fillRect(0, y0, W, y1 - y0);
};
const cielo = (c: C, a: string, b: string, suelo: string, y = 200, suelo2 = suelo) => {
  degradado(c, 0, y, a, b);
  degradado(c, y, H, suelo, suelo2);
};
const bola = (c: C, x: number, y: number, r: number, color: string) => {
  c.fillStyle = color;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
};
const elipse = (c: C, x: number, y: number, rx: number, ry: number, color: string) => {
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
};
const caja = (c: C, x: number, y: number, w: number, h: number, color: string) => {
  c.fillStyle = color;
  c.fillRect(x, y, w, h);
};
const poli = (c: C, color: string, ...p: number[]) => {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
  c.closePath();
  c.fill();
};
const trazo = (c: C, color: string, ancho: number, ...p: number[]) => {
  c.strokeStyle = color;
  c.lineWidth = ancho;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(p[0], p[1]);
  for (let i = 2; i < p.length; i += 2) c.lineTo(p[i], p[i + 1]);
  c.stroke();
};
const sol = (c: C, x: number, y: number, r: number, color = '#fff3b0', rayos = 0) => {
  for (let i = 0; i < rayos; i++) {
    const a = (i / rayos) * Math.PI * 2;
    trazo(
      c,
      color,
      4,
      x + Math.cos(a) * r * 1.2,
      y + Math.sin(a) * r * 1.2,
      x + Math.cos(a) * r * 1.6,
      y + Math.sin(a) * r * 1.6,
    );
  }
  bola(c, x, y, r, color);
};
const nube = (c: C, x: number, y: number, s: number, color = '#ffffff') => {
  bola(c, x, y, 14 * s, color);
  bola(c, x + 16 * s, y - 8 * s, 18 * s, color);
  bola(c, x + 34 * s, y, 14 * s, color);
  caja(c, x, y, 34 * s, 14 * s, color);
};
const cerros = (c: C, y: number, alto: number, color: string, fase = 0, ondas = 2) => {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, H);
  for (let x = 0; x <= W; x += 10) c.lineTo(x, y - Math.abs(Math.sin((x / W) * Math.PI * ondas + fase)) * alto);
  c.lineTo(W, H);
  c.closePath();
  c.fill();
};
const pino = (c: C, x: number, y: number, s: number, color = '#1f5a3a') => {
  caja(c, x - 3 * s, y - 10 * s, 6 * s, 10 * s, '#5a3d26');
  poli(c, color, x, y - 70 * s, x - 22 * s, y - 10 * s, x + 22 * s, y - 10 * s);
};
const palmera = (c: C, x: number, y: number) => {
  trazo(c, '#8a5a2b', 9, x, y, x + 8, y - 50, x + 20, y - 100);
  for (const [dx, dy] of [
    [-45, 10],
    [45, 18],
    [-30, 30],
    [38, -10],
    [0, -20],
  ])
    trazo(c, '#2e8b3a', 7, x + 20, y - 100, x + 20 + dx, y - 100 + dy);
};
/** Gotas, confeti y estrellas en lugares fijos: el mismo meme siempre se ve igual. */
const regados = (n: number, f: (x: number, y: number, i: number) => void) => {
  for (let i = 0; i < n; i++) f((i * 97 + 31) % W, (i * 53 + 17) % H, i);
};
const ruedas = (c: C, x0: number, x1: number, y: number, r: number) => {
  bola(c, x0, y, r, '#1d1d1f');
  bola(c, x1, y, r, '#1d1d1f');
  bola(c, x0, y, r * 0.45, '#9aa0a6');
  bola(c, x1, y, r * 0.45, '#9aa0a6');
};
const carro = (c: C, x: number, y: number, color: string) => {
  caja(c, x, y - 18, 64, 18, color);
  poli(c, color, x + 12, y - 18, x + 20, y - 32, x + 46, y - 32, x + 54, y - 18);
  caja(c, x + 22, y - 29, 22, 10, '#bfe6ff');
  ruedas(c, x + 14, x + 50, y, 7);
};

const ESCENAS: Record<Escena, Pintor> = {
  pulperia: (c) => {
    cielo(c, '#7cc6ff', '#d6f0ff', '#d9b382', 215);
    caja(c, 30, 95, 340, 125, '#f2e2c4');
    for (let i = 0; i < 10; i++)
      poli(c, i % 2 ? '#ffffff' : '#e63946', 20 + i * 36, 80, 56 + i * 36, 80, 52 + i * 36, 112, 24 + i * 36, 112);
    caja(c, 50, 125, 110, 70, '#5a3d26');
    for (let r = 0; r < 3; r++)
      for (let i = 0; i < 6; i++)
        caja(c, 58 + i * 17, 132 + r * 22, 10, 16, ['#e63946', '#2a9d8f', '#ffd23f', '#3a86ff'][(i + r) % 4]);
    for (let i = 0; i < 7; i++) caja(c, 52 + i * 17, 125, 3, 70, '#2b2b2b');
    caja(c, 270, 125, 70, 95, '#8a5a2b');
    caja(c, 40, 195, 140, 25, '#a0703c');
  },
  bus: (c) => {
    cielo(c, '#7ec8ff', '#d8f1ff', '#4a4a52', 215);
    nube(c, 290, 50, 1.2);
    caja(c, 0, 207, W, 8, '#bdbdbd');
    for (let x = 10; x < W; x += 60) caja(c, x, 255, 32, 5, '#ffd23f');
    c.fillStyle = '#ffc300';
    c.beginPath();
    c.roundRect(25, 120, 260, 95, 14);
    c.fill();
    caja(c, 25, 175, 260, 10, '#1d1d1f');
    for (let i = 0; i < 6; i++) caja(c, 40 + i * 40, 132, 30, 32, '#bfe6ff');
    caja(c, 25, 195, 260, 6, '#e63946');
    ruedas(c, 75, 235, 218, 17);
  },
  calor: (c) => {
    cielo(c, '#ff8c42', '#ffd166', '#e9a25f', 210, '#c97c3a');
    sol(c, 320, 70, 40, '#fff3b0', 12);
    for (let k = 0; k < 3; k++) {
      c.strokeStyle = 'rgba(255,255,255,0.55)';
      c.lineWidth = 3;
      c.beginPath();
      for (let x = 0; x <= W; x += 8) c.lineTo(x, 150 + k * 22 + Math.sin(x / 18 + k) * 6);
      c.stroke();
    }
    for (const [x, y] of [
      [60, 240],
      [250, 260],
      [330, 230],
    ])
      trazo(c, '#8a4f22', 3, x, y, x + 18, y + 8, x + 10, y + 22, x + 30, y + 30);
  },
  frio: (c) => {
    cielo(c, '#b9d7ee', '#eef5fb', '#d8e6ef', 205, '#c3d3de');
    cerros(c, 190, 70, '#7d9bb3', 0.4, 1.5);
    for (const x of [40, 85, 320, 365]) pino(c, x, 230, 1.1);
    for (let i = 0; i < 3; i++) caja(c, 0, 150 + i * 40, W, 14, 'rgba(255,255,255,0.45)');
  },
  lluvia: (c) => {
    cielo(c, '#4a5568', '#a0aec0', '#4a6b4f', 215, '#3b5640');
    nube(c, 30, 50, 1.6, '#6b7280');
    nube(c, 250, 40, 1.9, '#5b6270');
    elipse(c, 110, 260, 60, 10, '#7fa3c0');
    elipse(c, 300, 245, 45, 8, '#7fa3c0');
    regados(80, (x, y) => trazo(c, 'rgba(220,232,245,0.75)', 2, x, y, x - 6, y + 18));
  },
  comida: (c) => {
    degradado(c, 0, 190, '#f6d7a7', '#e9b872');
    for (let x = 0; x < W; x += 40) caja(c, x, 0, 20, 190, 'rgba(255,255,255,0.12)');
    degradado(c, 190, H, '#8b5a2b', '#6b4220');
    elipse(c, 200, 240, 150, 36, '#fbfbf5');
    c.fillStyle = '#f3e1b6';
    c.beginPath();
    c.arc(150, 238, 62, Math.PI, 0);
    c.fill();
    for (let i = 0; i < 6; i++) bola(c, 110 + i * 15, 225 - (i % 2) * 8, 4, '#7a4a22');
    caja(c, 300, 175, 44, 60, '#e76f51');
    caja(c, 304, 179, 36, 10, '#ffffff');
  },
  cafe: (c) => {
    cielo(c, '#9fd8ff', '#e6f7ff', '#3f7d4e', 200, '#2f6a3e');
    cerros(c, 200, 60, '#4f8f5a', 0.8, 2);
    for (let r = 0; r < 4; r++)
      for (let x = 10 + r * 12; x < W; x += 34) {
        bola(c, x, 215 + r * 22, 11, '#2c6b38');
        bola(c, x + 4, 212 + r * 22, 3, '#c0392b');
      }
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.roundRect(300, 160, 70, 60, 10);
    c.fill();
    elipse(c, 335, 162, 33, 8, '#5a3216');
    for (const dx of [-12, 4, 18]) trazo(c, 'rgba(255,255,255,0.85)', 4, 330 + dx, 150, 324 + dx, 130, 334 + dx, 112);
  },
  futbol: (c) => {
    cielo(c, '#79c2ff', '#cfe9ff', '#3fa34d', 150, '#2e8b3a');
    for (let r = 0; r < 3; r++) caja(c, 0, 105 + r * 15, W, 10, ['#4a4f6a', '#5a607e', '#6b7192'][r]);
    for (let x = 0; x < W; x += 50) caja(c, x, 150, 25, 150, 'rgba(255,255,255,0.08)');
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.strokeRect(270, 120, 110, 80);
    c.lineWidth = 1.5;
    for (let x = 280; x < 380; x += 12) trazo(c, 'rgba(255,255,255,0.7)', 1.5, x, 123, x, 198);
    for (let y = 132; y < 200; y += 12) trazo(c, 'rgba(255,255,255,0.7)', 1.5, 273, y, 377, y);
    bola(c, 85, 240, 24, '#ffffff');
    bola(c, 85, 240, 8, '#1d1d1f');
    for (let i = 0; i < 5; i++) bola(c, 85 + Math.cos(i * 1.257) * 17, 240 + Math.sin(i * 1.257) * 17, 4.5, '#1d1d1f');
  },
  playa: (c) => {
    cielo(c, '#5ec8f2', '#c9f0ff', '#1fa2c9', 165, '#127fa3');
    sol(c, 80, 60, 30, '#fff3b0', 10);
    for (let k = 0; k < 4; k++)
      for (let x = 10 + k * 20; x < W; x += 70) {
        c.strokeStyle = 'rgba(255,255,255,0.7)';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(x, 180 + k * 10, 10, Math.PI, 0);
        c.stroke();
      }
    degradado(c, 220, H, '#f3d9a4', '#e3c27f');
    palmera(c, 330, 245);
  },
  montana: (c) => {
    cielo(c, '#8fd3ff', '#e8f7ff', '#3f7d4e', 210, '#2f6a3e');
    nube(c, 50, 55, 1);
    cerros(c, 200, 110, '#6b8f71', 0.2, 1.2);
    cerros(c, 215, 60, '#3f7d4e', 1.3, 2.2);
    for (const x of [30, 70, 340, 375]) pino(c, x, 260, 1);
  },
  mercado: (c) => {
    cielo(c, '#8ad0ff', '#e2f4ff', '#c9a27a', 200, '#b08a5a');
    const toldos = ['#e63946', '#2a9d8f', '#f4a261'];
    for (let i = 0; i < 3; i++) {
      const x = 15 + i * 128;
      caja(c, x + 4, 120, 6, 100, '#5a3d26');
      caja(c, x + 104, 120, 6, 100, '#5a3d26');
      for (let k = 0; k < 4; k++) caja(c, x + k * 28.5, 100, 28.5, 30, k % 2 ? '#ffffff' : toldos[i]);
      caja(c, x, 185, 114, 30, '#8a5a2b');
      for (let k = 0; k < 7; k++)
        bola(c, x + 12 + k * 15, 180, 8, ['#ffd23f', '#e76f51', '#7cb342', '#c0392b'][(k + i) % 4]);
    }
  },
  fiesta: (c) => {
    cielo(c, '#2a1050', '#5b2a86', '#3a1d5c', 220, '#24123a');
    trazo(c, '#ffd23f', 2, 0, 40, 100, 65, 200, 45, 300, 65, 400, 40);
    const colores = ['#e63946', '#ffd23f', '#2a9d8f', '#3a86ff', '#f4a3b4'];
    for (let i = 0; i < 12; i++) {
      const x = 8 + i * 33,
        y = 40 + Math.abs(Math.sin((x / W) * Math.PI * 2)) * 22;
      poli(c, colores[i % 5], x, y, x + 24, y + 2, x + 12, y + 28);
    }
    regados(60, (x, y, i) => {
      if (y > 90) caja(c, x, y, 6, 3, colores[i % 5]);
    });
    for (const x of [50, 350]) bola(c, x, 250, 18, 'rgba(255,210,63,0.35)');
  },
  casa: (c) => {
    cielo(c, '#8ad0ff', '#e2f4ff', '#5fae4a', 210, '#4a913a');
    nube(c, 290, 45, 1.1);
    caja(c, 210, 130, 160, 90, '#f4a261');
    poli(c, '#b23a2a', 195, 132, 290, 80, 385, 132);
    caja(c, 275, 165, 34, 55, '#6b3f1d');
    caja(c, 225, 150, 34, 28, '#bfe6ff');
    caja(c, 325, 150, 34, 28, '#bfe6ff');
    caja(c, 52, 160, 14, 60, '#6b4220');
    bola(c, 59, 140, 38, '#2e8b3a');
  },
  luz: (c) => {
    cielo(c, '#0b1026', '#27304f', '#151a2c', 215);
    regados(40, (x, y) => {
      if (y < 150) bola(c, x, y, 1.6, '#e8ecff');
    });
    for (const [x, w, h] of [
      [0, 90, 70],
      [95, 70, 55],
      [300, 100, 80],
    ]) {
      caja(c, x, 215 - h, w, h, '#0d1120');
      caja(c, x + 14, 230 - h, 14, 14, '#1d2438');
    }
    caja(c, 175, 70, 8, 150, '#3b3328');
    caja(c, 150, 80, 58, 6, '#3b3328');
    c.strokeStyle = '#11141f';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, 95);
    c.quadraticCurveTo(90, 120, 150, 83);
    c.moveTo(208, 83);
    c.quadraticCurveTo(300, 125, W, 95);
    c.stroke();
    const g = c.createRadialGradient(330, 95, 6, 330, 95, 70);
    g.addColorStop(0, 'rgba(255,236,140,0.7)');
    g.addColorStop(1, 'rgba(255,236,140,0)');
    c.fillStyle = g;
    c.fillRect(250, 20, 160, 160);
    bola(c, 330, 95, 22, '#fff2a8');
    caja(c, 320, 114, 20, 16, '#9aa0a6');
  },
  maiz: (c) => {
    cielo(c, '#8fd3ff', '#fff2c8', '#7a5a2e', 205, '#5f4522');
    sol(c, 330, 55, 26, '#fff3b0', 10);
    for (let i = 0; i < 12; i++) {
      const x = 15 + i * 34,
        y = 280 - (i % 2) * 20;
      trazo(c, '#4f9d3a', 5, x, y, x, y - 110);
      trazo(c, '#5fb04a', 4, x, y - 50, x - 20, y - 75);
      trazo(c, '#5fb04a', 4, x, y - 70, x + 20, y - 95);
      elipse(c, x + 6, y - 85, 5, 13, '#f2c230');
    }
  },
  pesca: (c) => {
    cielo(c, '#9fd8ff', '#e6f7ff', '#2f86b5', 150, '#1f5f86');
    cerros(c, 150, 30, '#4f8f5a', 0.5, 1.5);
    for (let x = 0; x < W; x += 40)
      trazo(c, 'rgba(255,255,255,0.4)', 2, x, 190 + (x % 80) / 4, x + 20, 190 + (x % 80) / 4);
    poli(c, '#8a5a2b', 40, 225, 200, 225, 180, 250, 60, 250);
    trazo(c, '#5a3d26', 4, 150, 225, 230, 140);
    trazo(c, 'rgba(255,255,255,0.8)', 1.5, 230, 140, 260, 230);
    c.fillStyle = '#ffb703';
    c.beginPath();
    c.ellipse(320, 200, 26, 11, -0.5, 0, Math.PI * 2);
    c.fill();
    poli(c, '#ffb703', 296, 215, 280, 226, 284, 206);
  },
  ruinas: (c) => {
    cielo(c, '#a8e0c0', '#e6f6ea', '#3f7d4e', 215, '#2f6a3e');
    for (let i = 0; i < 9; i++) bola(c, i * 50, 190 + (i % 2) * 10, 40, i % 2 ? '#2e6b3e' : '#245a33');
    for (let k = 0; k < 5; k++)
      caja(c, 200 + k * 14, 215 - (k + 1) * 24, 170 - k * 28, 24, k % 2 ? '#b3ab92' : '#a39b82');
    caja(c, 272, 70, 26, 26, '#8f8770');
    caja(c, 45, 110, 40, 110, '#a39b82');
    for (let y = 120; y < 215; y += 18) caja(c, 52, y, 26, 8, '#8f8770');
  },
  trafico: (c) => {
    cielo(c, '#b8c4cc', '#e2ddd0', '#4a4a52', 200);
    for (const [x, w, h] of [
      [0, 60, 120],
      [65, 50, 90],
      [120, 70, 140],
      [260, 60, 110],
      [325, 75, 150],
    ]) {
      caja(c, x, 200 - h, w, h, '#7a8590');
      for (let y = 210 - h; y < 190; y += 18) for (let k = 8; k < w - 8; k += 16) caja(c, x + k, y, 8, 9, '#cfe3f3');
    }
    for (let x = 10; x < W; x += 60) caja(c, x, 248, 32, 4, '#ffffff');
    ['#e63946', '#3a86ff', '#ffd23f', '#2a9d8f', '#f4a261', '#9b5de5'].forEach((col, i) =>
      carro(c, -10 + (i % 3) * 140 + (i > 2 ? 60 : 0), i > 2 ? 290 : 240, col),
    );
    caja(c, 375, 120, 6, 90, '#2b2b2b');
    caja(c, 366, 90, 24, 50, '#1d1d1f');
    bola(c, 378, 100, 6, '#ff3b30');
    bola(c, 378, 115, 6, '#5a3a00');
    bola(c, 378, 130, 6, '#0a3d1a');
  },
};

const FUENTE = '"Fredoka", "Nunito", system-ui, sans-serif';
let fuente: Promise<unknown> | undefined;
/** Espera la letra del juego (Google Fonts); sin red se resuelve igual y se dibuja con la de respaldo. */
export const fuenteLista = () =>
  (fuente ??= (document.fonts?.load(`700 40px ${FUENTE}`) ?? Promise.resolve()).catch(() => undefined));

/** Parte el texto en dos líneas lo más parejas posible. */
function enDos(t: string): string[] {
  const ps = t.split(' ');
  if (ps.length < 2) return [t];
  let mejor = 1,
    peor = Infinity;
  for (let i = 1; i < ps.length; i++) {
    const largo = Math.max(ps.slice(0, i).join(' ').length, ps.slice(i).join(' ').length);
    if (largo < peor) {
      peor = largo;
      mejor = i;
    }
  }
  return [ps.slice(0, mejor).join(' '), ps.slice(mejor).join(' ')];
}
/** Texto de meme: mayúsculas blancas con borde negro, se achica (o se parte en dos) hasta caber. */
function rotulo(c: C, texto: string, w: number, h: number, arriba: boolean) {
  const t = texto.toUpperCase().trim();
  if (!t) return;
  const max = w * 0.92,
    ancho = (s: number, ls: string[]) => {
      c.font = `700 ${s}px ${FUENTE}`;
      return Math.max(...ls.map((l) => c.measureText(l).width));
    };
  let lineas = [t],
    s = Math.round(h * 0.13);
  while (s > h * 0.085 && ancho(s, lineas) > max) s--;
  if (ancho(s, lineas) > max) {
    lineas = enDos(t);
    s = Math.round(h * 0.1);
    while (s > h * 0.04 && ancho(s, lineas) > max) s--;
  }
  c.font = `700 ${s}px ${FUENTE}`;
  c.textAlign = 'center';
  c.textBaseline = arriba ? 'top' : 'bottom';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, s * 0.2);
  c.strokeStyle = '#000000';
  c.fillStyle = '#ffffff';
  lineas.forEach((l, i) => {
    const paso = s * 1.04,
      y = arriba ? h * 0.035 + i * paso : h * 0.965 - (lineas.length - 1 - i) * paso;
    c.strokeText(l, w / 2, y);
    c.fillText(l, w / 2, y);
  });
}

/** Dibuja el meme completo en un lienzo de w × h (pensado para 4:3). */
export function dibujarMeme(c: C, m: Meme, w: number, h: number) {
  c.save();
  c.clearRect(0, 0, w, h);
  c.scale(w / W, h / H);
  (ESCENAS[m.escena] ?? ESCENAS.casa)(c);
  c.restore();
  c.save();
  const s = Math.round(h * 0.3);
  c.font = `${s}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.45)';
  c.shadowBlur = s * 0.15;
  c.shadowOffsetY = s * 0.04;
  c.fillText(m.emoji, w / 2, h * 0.52);
  c.restore();
  rotulo(c, m.arriba, w, h, true);
  rotulo(c, m.abajo, w, h, false);
}
