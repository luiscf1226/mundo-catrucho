// Vehículos y estorbos de la carretera con forma: carrocería, cabina con parabrisas inclinado, vidrios polarizados,
// llantas con aro, bómperes, focos que alumbran y calcomanías. Cada uno es UNA malla fusionada (una llamada de
// dibujo) armada una vez por tipo y compartida por todas las copias: el tráfico de antes costaba ~20 llamadas por
// carro. Medidas y largo de siempre (`vehicles`): la física no cambia. El frente mira a −Z.
import { bl, bx, cy, type Merged, mergePieces, type Pc, PI, rk } from '../../dept/lib';
import { Mallas } from '../../minigames/kit/fundido';
import { type ObstacleKind, type VehicleKind, vehicles } from '../model';

const LLANTA = '#1b1d20',
  ARO = '#b9c0c6',
  VIDRIO = '#16232b',
  NEGRO = '#232629',
  CROMO = '#cfd4d8',
  FOCO = '#fff3c4',
  STOP = '#ff3b2f',
  AMBAR = '#ffae2b';
const sin = { solid: false } as const;

function ruedas(out: Pc[], x: number, zs: number[], r: number, w = 0.26) {
  for (const z of zs)
    for (const s of [-1, 1]) {
      out.push(
        cy(s * x, r, z, r, w, 'plastic', LLANTA, { e: [0, 0, PI / 2], n: 16, ...sin }),
        cy(s * (x + w * 0.06), r, z, r * 0.56, w + 0.02, 'metal', ARO, { e: [0, 0, PI / 2], n: 10, ...sin }),
        // guardafango oscuro encima de la llanta
        bx(s * (x - 0.02), r * 1.55, z, w + 0.1, 0.12, r * 2.3, 'plastic', NEGRO, sin),
      );
    }
}
function focos(out: Pc[], W: number, y: number, L: number, ancho = 0.36) {
  for (const s of [-1, 1])
    out.push(
      bx(s * (W / 2 - 0.08 - ancho / 2), y, -L / 2 - 0.01, ancho, 0.16, 0.05, 'plastic', FOCO, { em: -1.6, ...sin }),
      bx(s * (W / 2 - 0.08 - ancho / 2), y, L / 2 + 0.01, ancho * 0.8, 0.18, 0.05, 'plastic', STOP, {
        em: -1.3,
        ...sin,
      }),
      bx(s * (W / 2 - 0.05), y - 0.14, -L / 2 + 0.02, 0.12, 0.08, 0.05, 'plastic', AMBAR, { em: -0.8, ...sin }),
    );
}
function bomperes(out: Pc[], W: number, y: number, L: number, c = NEGRO) {
  out.push(
    bx(0, y, -L / 2 - 0.03, W + 0.06, 0.2, 0.16, 'plastic', c, sin),
    bx(0, y, L / 2 + 0.03, W + 0.06, 0.2, 0.16, 'plastic', c, sin),
    // placa
    bx(0, y + 0.02, L / 2 + 0.12, 0.5, 0.15, 0.02, 'plastic', '#e9ecef', sin),
  );
}
/** espejos retrovisores a los lados de la cabina */
const espejos = (out: Pc[], W: number, y: number, z: number) => {
  for (const s of [-1, 1]) out.push(bx(s * (W / 2 + 0.1), y, z, 0.12, 0.14, 0.08, 'plastic', NEGRO, sin));
};

/** Sedán (taxi): capó, cabina con parabrisas y medallón inclinados, baúl. */
function sedan(c: string, L: number): Pc[] {
  const W = 1.86,
    r = 0.33,
    out: Pc[] = [];
  ruedas(out, W / 2 - 0.16, [-L * 0.32, L * 0.32], r);
  out.push(
    bx(0, 0.62, 0, W, 0.5, L - 0.12, 'metal', c, sin),
    // franja oscura de abajo (estribo)
    bx(0, 0.4, 0, W + 0.02, 0.1, L * 0.5, 'plastic', NEGRO, sin),
    // cabina
    bx(0, 1.12, 0.22, W - 0.18, 0.5, 1.6, 'metal', c, sin),
    // parabrisas y medallón inclinados (vidrio polarizado brillante)
    bx(0, 1.1, -0.83, W - 0.24, 0.64, 0.05, 'metal', VIDRIO, { e: [0.78, 0, 0], ...sin }),
    bx(0, 1.1, 1.27, W - 0.24, 0.58, 0.05, 'metal', VIDRIO, { e: [-0.72, 0, 0], ...sin }),
    bx(0, 0.9, 1.6, W - 0.1, 0.05, 0.4, 'metal', c, sin),
  );
  for (const s of [-1, 1])
    out.push(
      bx(s * (W / 2 - 0.085), 1.14, 0.22, 0.02, 0.36, 1.45, 'metal', VIDRIO, sin),
      // poste del medio y manijas
      bx(s * (W / 2 - 0.075), 1.14, 0.25, 0.03, 0.4, 0.08, 'metal', c, sin),
      bx(s * (W / 2 + 0.005), 0.78, -0.2, 0.02, 0.04, 0.16, 'metal', CROMO, sin),
      bx(s * (W / 2 + 0.005), 0.78, 0.7, 0.02, 0.04, 0.16, 'metal', CROMO, sin),
    );
  espejos(out, W - 0.2, 0.98, -0.6);
  focos(out, W, 0.72, L);
  bomperes(out, W, 0.46, L);
  // parrilla
  out.push(bx(0, 0.62, -L / 2 - 0.005, 0.8, 0.16, 0.03, 'metal', '#3a3f44', sin));
  return out;
}
/** Microbús (rapidito): caja larga de frente chato, fila de ventanas, franjas de pintura y luces de colores. */
function micro(c: string, L: number): Pc[] {
  const W = 2.08,
    r = 0.4,
    out: Pc[] = [];
  ruedas(out, W / 2 - 0.2, [-L * 0.3, L * 0.33], r, 0.3);
  out.push(
    bx(0, 0.9, 0, W, 0.85, L - 0.05, 'metal', c, sin),
    bx(0, 1.85, 0.05, W - 0.04, 1.1, L - 0.25, 'metal', '#fbfaf6', sin),
    // techo con su borde y la parrilla para las cargas
    bx(0, 2.43, 0.05, W - 0.1, 0.08, L - 0.4, 'metal', '#f4f2ec', sin),
    bx(0, 2.58, 0.6, W - 0.5, 0.05, 2.4, 'metal', '#3a3f44', sin),
    // franjas pintadas que le dan nombre al bus
    bx(0, 1.32, 0, W + 0.02, 0.12, L - 0.1, 'metal', '#f2c94c', sin),
    bx(0, 1.18, 0, W + 0.02, 0.06, L - 0.1, 'metal', '#2d9cdb', sin),
    // parabrisas casi vertical y ventana de atrás
    bx(0, 1.86, -L / 2 + 0.04, W - 0.2, 0.9, 0.05, 'metal', VIDRIO, { e: [0.12, 0, 0], ...sin }),
    bx(0, 1.9, L / 2 - 0.1, W - 0.3, 0.7, 0.05, 'metal', VIDRIO, sin),
  );
  // ventanas de los lados con sus marcos
  for (const s of [-1, 1]) {
    for (let k = 0; k < 5; k++)
      out.push(bx(s * (W / 2 - 0.01), 1.92, -L / 2 + 0.95 + k * 0.78, 0.03, 0.62, 0.66, 'metal', VIDRIO, sin));
    out.push(bx(s * (W / 2 - 0.01), 1.92, -L / 2 + 0.45, 0.03, 0.5, 0.3, 'metal', VIDRIO, sin));
  }
  espejos(out, W, 1.7, -L / 2 + 0.2);
  focos(out, W, 0.95, L, 0.32);
  bomperes(out, W, 0.52, L, '#cfd4d8');
  // luces de colores en el filo del techo (el rapidito siempre va «adornado»)
  for (let k = 0; k < 8; k++)
    for (const s of [-1, 1])
      out.push(
        bx(
          s * (W / 2 - 0.03),
          2.42,
          -L / 2 + 0.4 + k * 0.55,
          0.05,
          0.05,
          0.22,
          'plastic',
          k % 2 ? '#46e7ed' : '#ff5fa2',
          {
            em: -2,
            ...sin,
          },
        ),
      );
  return out;
}
/** Bus escolar amarillo (el «bus amarillo»): trompa con capó, carrocería alta con franjas negras y ventanas. */
function busEscolar(c: string, L: number): Pc[] {
  const W = 2.2,
    r = 0.5,
    out: Pc[] = [],
    zc = -L / 2 + 1.25; // donde empieza la carrocería
  ruedas(out, W / 2 - 0.22, [-L / 2 + 0.75, L * 0.3], r, 0.34);
  out.push(
    // capó y parrilla
    bx(0, 1.0, -L / 2 + 0.6, W - 0.5, 0.75, 1.2, 'metal', c, sin),
    bx(0, 1.0, -L / 2 - 0.01, W - 0.7, 0.55, 0.04, 'metal', '#2b2e31', sin),
    // carrocería
    bx(0, 1.65, zc + (L - 1.25) / 2, W, 2.1, L - 1.25, 'metal', c, sin),
    bx(0, 2.75, zc + (L - 1.25) / 2, W - 0.1, 0.12, L - 1.35, 'metal', c, sin),
    bx(0, 1.05, zc + (L - 1.25) / 2, W + 0.03, 0.08, L - 1.3, 'metal', '#141414', sin),
    bx(0, 1.55, zc + (L - 1.25) / 2, W + 0.03, 0.08, L - 1.3, 'metal', '#141414', sin),
    // parabrisas
    bx(0, 2.15, zc - 0.01, W - 0.3, 0.8, 0.05, 'metal', VIDRIO, sin),
    bx(0, 2.1, L / 2 + 0.01, W - 0.6, 0.6, 0.04, 'metal', VIDRIO, sin),
  );
  for (const s of [-1, 1])
    for (let k = 0; k < 5; k++)
      out.push(bx(s * (W / 2 + 0.005), 2.1, zc + 0.6 + k * 0.95, 0.03, 0.62, 0.78, 'metal', VIDRIO, sin));
  espejos(out, W, 2.0, zc);
  focos(out, W - 0.5, 1.05, L, 0.28);
  bomperes(out, W, 0.55, L, '#141414');
  // parrilla de equipaje con bultos
  out.push(bx(0, 2.95, 0.2, W - 0.4, 0.06, L * 0.55, 'metal', '#3a3f44', sin));
  out.push(
    bx(-0.3, 3.15, 0.5, 0.9, 0.35, 0.8, 'cloth', '#5b6b3a', sin),
    bx(0.4, 3.12, -0.4, 0.7, 0.3, 0.6, 'cloth', '#9b3b2b', sin),
  );
  return out;
}
/** Pickup: cabina con parabrisas, palangana abierta con su compuerta. */
function pickup(c: string, L: number): Pc[] {
  const W = 1.95,
    r = 0.38,
    out: Pc[] = [];
  ruedas(out, W / 2 - 0.18, [-L * 0.31, L * 0.29], r, 0.3);
  out.push(
    bx(0, 0.75, -L / 2 + 0.75, W, 0.6, 1.5, 'metal', c, sin),
    bx(0, 1.32, -0.65, W - 0.12, 0.62, 1.25, 'metal', c, sin),
    bx(0, 1.28, -1.36, W - 0.24, 0.68, 0.05, 'metal', VIDRIO, { e: [0.55, 0, 0], ...sin }),
    bx(0, 1.36, -0.02, W - 0.3, 0.4, 0.04, 'metal', VIDRIO, sin),
    // palangana: piso y paredes
    bx(0, 0.82, 1.15, W, 0.12, 2.0, 'metal', '#3c3f42', sin),
    bx(0, 1.0, 2.13, W, 0.5, 0.06, 'metal', c, sin),
  );
  for (const s of [-1, 1])
    out.push(
      bx(s * (W / 2 - 0.03), 1.0, 1.15, 0.06, 0.5, 2.0, 'metal', c, sin),
      bx(s * (W / 2 - 0.06), 1.36, -0.65, 0.02, 0.4, 1.05, 'metal', VIDRIO, sin),
      bx(s * (W / 2 - 0.03), 0.72, 0.2, 0.08, 0.46, 0.6, 'metal', c, sin),
    );
  espejos(out, W - 0.1, 1.2, -1.15);
  focos(out, W, 0.85, L);
  bomperes(out, W, 0.5, L, CROMO);
  return out;
}
/** Camión: cabina chata y paila con barandas de tablas (el de la cosecha). */
function camion(c: string, L: number): Pc[] {
  const W = 2.3,
    r = 0.52,
    out: Pc[] = [];
  ruedas(out, W / 2 - 0.24, [-L / 2 + 0.9, L * 0.22, L * 0.38], r, 0.36);
  out.push(
    bx(0, 1.55, -L / 2 + 0.9, W, 1.7, 1.7, 'metal', c, sin),
    bx(0, 1.85, -L / 2 - 0.01, W - 0.35, 0.75, 0.05, 'metal', VIDRIO, sin),
    bx(0, 0.95, -L / 2 - 0.01, W - 0.5, 0.4, 0.04, 'metal', '#2b2e31', sin),
    bx(0, 0.75, 0.9, W - 0.2, 0.3, L - 1.9, 'metal', NEGRO, sin),
    bx(0, 1.0, 0.95, W, 0.15, L - 1.8, 'wood', '#7a5434', sin),
  );
  for (const s of [-1, 1])
    for (let k = 0; k < 3; k++)
      out.push(
        bx(s * (W / 2 - 0.04), 1.3 + k * 0.38, 0.95, 0.08, 0.26, L - 1.85, 'wood', k % 2 ? '#8a6341' : '#9c7149', sin),
      );
  for (let k = 0; k < 3; k++) out.push(bx(0, 1.3 + k * 0.38, L / 2 - 0.02, W, 0.26, 0.08, 'wood', '#8a6341', sin));
  // la carga: sacos y racimos
  for (let k = 0; k < 5; k++)
    out.push(
      bl(((k % 3) - 1) * 0.6, 1.4, 0.2 + k * 0.55, 0.34, 'cloth', k % 2 ? '#b59b6b' : '#a68a5a', {
        s: [1.1, 0.7, 1.3],
      }),
    );
  espejos(out, W, 1.9, -L / 2 + 0.3);
  focos(out, W, 1.0, L, 0.3);
  bomperes(out, W, 0.6, L);
  return out;
}
/** Moto o bici con su motorista (casco y camisa). */
function dosRuedas(c: string, L: number, moto: boolean): Pc[] {
  const r = moto ? 0.33 : 0.36,
    out: Pc[] = [];
  for (const z of [-L * 0.36, L * 0.36])
    out.push(
      cy(0, r, z, r, 0.12, 'plastic', LLANTA, { e: [0, 0, PI / 2], n: 16, ...sin }),
      cy(0, r, z, r * 0.6, 0.13, 'metal', ARO, { e: [0, 0, PI / 2], n: 10, ...sin }),
    );
  out.push(
    bx(0, r + 0.2, 0, 0.12, 0.08, L * 0.75, 'metal', moto ? NEGRO : c, sin),
    bx(0, r + 0.45, -L * 0.3, 0.08, 0.55, 0.08, 'metal', CROMO, { e: [-0.3, 0, 0], ...sin }),
    bx(0, r + 0.72, -L * 0.36, 0.7, 0.04, 0.05, 'metal', NEGRO, sin),
  );
  if (moto)
    out.push(
      bx(0, r + 0.35, -0.05, 0.36, 0.3, 0.6, 'metal', c, sin),
      bx(0, r + 0.55, 0.35, 0.3, 0.1, 0.7, 'cloth', NEGRO, sin),
      bx(0, r + 0.5, -L * 0.42, 0.18, 0.14, 0.06, 'plastic', FOCO, { em: -1.6, ...sin }),
    );
  // motorista: piernas, torso, brazos al timón y casco
  const y = r + 0.6;
  out.push(
    bx(0, y + 0.42, 0.2, 0.42, 0.62, 0.26, 'cloth', moto ? '#2d6cdf' : '#e2574c', { e: [-0.15, 0, 0], ...sin }),
    ...[-1, 1].flatMap((s) => [
      bx(s * 0.16, y + 0.05, -0.05, 0.13, 0.13, 0.5, 'cloth', '#2e3b4e', sin),
      bx(s * 0.24, y + 0.5, -0.15, 0.09, 0.09, 0.5, 'cloth', moto ? '#2d6cdf' : '#e2574c', { e: [0.6, 0, 0], ...sin }),
    ]),
    bl(0, y + 0.92, 0.16, 0.14, 'plastic', '#b07b54'),
    bl(0, y + 0.97, 0.16, 0.16, 'plastic', moto ? '#c62828' : '#f2f2f2', { s: [1, 0.85, 1.1] }),
  );
  return out;
}
/** Lancha de fibra (proa en punta, borda, consola) o cayuco tallado (casco redondo de una pieza). */
function bote(c: string, L: number, cayuco: boolean): Pc[] {
  const out: Pc[] = [],
    W = cayuco ? 1.1 : 1.8;
  // casco: secciones que se angostan hacia la proa (−Z) y un poco hacia la popa
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1),
      z = -L / 2 + 0.3 + t * (L - 0.6),
      a = cayuco ? Math.sin(PI * (0.08 + t * 0.84)) : Math.min(1, 0.25 + t * 1.6),
      w = W * Math.max(0.25, a);
    out.push(
      bx(0, 0.32, z, w, 0.42, L / n + 0.06, cayuco ? 'wood' : 'plastic', c, sin),
      bx(0, 0.18, z, w * 0.7, 0.2, L / n + 0.06, cayuco ? 'wood' : 'plastic', cayuco ? '#5e3d22' : '#2b6f9a', sin),
    );
    if (!cayuco)
      for (const s of [-1, 1]) out.push(bx(s * (w / 2), 0.56, z, 0.07, 0.08, L / n + 0.06, 'plastic', '#2b6f9a', sin));
  }
  // proa en cuña
  out.push(
    bx(0, 0.38, -L / 2 + 0.12, W * 0.18, 0.34, 0.5, cayuco ? 'wood' : 'plastic', c, { e: [0, PI / 4, 0], ...sin }),
  );
  if (cayuco) {
    out.push(
      bx(0, 0.5, 0.3, W * 0.85, 0.05, 0.25, 'wood', '#6b4423', sin),
      bx(0, 0.5, -0.9, W * 0.75, 0.05, 0.22, 'wood', '#6b4423', sin),
      // canalete apoyado
      bx(0.45, 0.62, 0.2, 0.07, 0.04, 1.9, 'wood', '#c9a46a', { e: [0, 0.4, 0.2], ...sin }),
      bx(0.85, 0.62, -0.62, 0.22, 0.03, 0.42, 'wood', '#c9a46a', { e: [0, 0.4, 0.2], ...sin }),
    );
  } else {
    out.push(
      bx(0, 0.5, 0.2, 1.4, 0.06, 2.4, 'wood', '#9e7448', sin),
      bx(0, 0.85, -0.2, 0.7, 0.6, 0.5, 'plastic', '#e9ecef', sin),
      bx(0, 1.18, -0.38, 0.62, 0.3, 0.04, 'metal', VIDRIO, { e: [0.4, 0, 0], ...sin }),
      bx(0, 0.62, 0.95, 1.4, 0.18, 0.4, 'plastic', '#e9ecef', sin),
      // motor fuera de borda
      bx(0, 0.75, L / 2 + 0.05, 0.36, 0.5, 0.36, 'plastic', '#22262a', sin),
      bx(0, 0.25, L / 2 + 0.12, 0.12, 0.6, 0.14, 'metal', '#3a3f44', sin),
    );
  }
  return out;
}

function vacaPcs(perro: boolean): Pc[] {
  const out: Pc[] = [];
  if (perro) {
    const c = '#a0693d';
    out.push(
      bl(0, 0.55, 0, 0.42, 'cloth', c, { s: [1.5, 0.75, 0.75] }),
      bl(0.62, 0.78, 0, 0.2, 'cloth', c, { s: [1.2, 1, 0.9] }),
      bl(0.84, 0.74, 0, 0.09, 'cloth', '#3a2a1e', { s: [1.4, 0.8, 0.9] }),
      bx(0.6, 0.98, 0.1, 0.06, 0.14, 0.08, 'cloth', '#6d4628', { e: [0, 0, 0.3], ...sin }),
      bx(0.6, 0.98, -0.1, 0.06, 0.14, 0.08, 'cloth', '#6d4628', { e: [0, 0, 0.3], ...sin }),
      bx(-0.66, 0.7, 0, 0.36, 0.06, 0.06, 'cloth', c, { e: [0, 0, 0.7], ...sin }),
    );
    for (const x of [-0.38, 0.38]) for (const z of [-0.14, 0.14]) out.push(cy(x, 0.2, z, 0.05, 0.42, 'cloth', c, sin));
    return out;
  }
  // vaca: cuerpo, panza, cabeza baja con cachos, ubre, cola y manchas
  const c = '#eee3c8';
  out.push(
    bl(0, 1.0, 0, 0.62, 'cloth', c, { s: [1.55, 0.72, 0.68] }),
    bl(0.55, 1.12, 0, 0.42, 'cloth', c, { s: [0.9, 0.9, 1] }),
    bl(1.1, 0.95, 0, 0.24, 'cloth', '#d9cdb0', { s: [1.5, 1.0, 0.9] }),
    bl(1.4, 0.86, 0, 0.14, 'cloth', '#3a302a', { s: [0.9, 0.8, 1.1] }),
    bx(1.05, 1.18, 0.2, 0.05, 0.22, 0.05, 'stone', '#e9e1cf', { e: [0.5, 0, 0], ...sin }),
    bx(1.05, 1.18, -0.2, 0.05, 0.22, 0.05, 'stone', '#e9e1cf', { e: [-0.5, 0, 0], ...sin }),
    bl(-0.45, 1.2, 0.3, 0.3, 'cloth', '#3d342e', { s: [1, 0.6, 0.4] }),
    bl(0.2, 1.05, -0.32, 0.26, 'cloth', '#3d342e', { s: [1.2, 0.7, 0.3] }),
    bl(-0.3, 0.6, 0, 0.16, 'cloth', '#e8a8a0', { s: [1, 0.7, 1] }),
    bx(-0.98, 0.85, 0, 0.05, 0.6, 0.05, 'cloth', '#3d342e', { e: [0, 0, -0.2], ...sin }),
  );
  for (const x of [-0.6, 0.6])
    for (const z of [-0.24, 0.24])
      out.push(
        cy(x, 0.36, z, 0.08, 0.74, 'cloth', '#d9cdb0', sin),
        cy(x, 0.05, z, 0.085, 0.1, 'stone', '#2e2a26', sin),
      );
  return out;
}
function estorbo(kind: ObstacleKind): Pc[] {
  if (kind === 'bache') {
    // hoyo con bordes quebrados y lodo adentro
    const out: Pc[] = [bx(0, 0.028, 0, 2.2, 0.02, 1.5, 'dirt', '#2a2520', sin)];
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * PI * 2;
      out.push(
        rk(Math.cos(a) * 1.15, 0.04, Math.sin(a) * 0.8, 0.22 + (k % 3) * 0.06, 'asphalt', '#3d4246', {
          s: [1.3, 0.25, 1],
        }),
      );
    }
    out.push(bx(0.2, 0.04, 0.1, 1.2, 0.01, 0.7, 'water', '#4a5a5e', sin));
    return out;
  }
  if (kind === 'tumulo') {
    const out: Pc[] = [bx(0, 0.12, 0, 3, 0.24, 0.8, 'concrete', '#c9c5bb', sin)];
    for (let k = 0; k < 6; k++)
      out.push(bx(-1.25 + k * 0.5, 0.245, 0, 0.25, 0.02, 0.78, 'plastic', k % 2 ? '#1d1f22' : '#f2c230', sin));
    return out;
  }
  if (kind === 'tronco') {
    return [
      cy(0, 0.3, 0, 0.3, 3.5, 'wood', '#6b4326', { e: [0, 0.4, PI / 2], n: 12, ...sin }),
      cy(0, 0.3, 0, 0.26, 3.52, 'wood', '#c9a46a', { e: [0, 0.4, PI / 2], n: 12, ...sin }),
      bx(0.6, 0.55, 0.3, 0.06, 0.5, 0.06, 'wood', '#5e3d22', { e: [0.4, 0.4, 0.3], ...sin }),
    ];
  }
  return [];
}

const hechos = new Map<string, Merged[]>();
function grupos(clave: string, hacer: () => Pc[]): Merged[] {
  let g = hechos.get(clave);
  if (!g) {
    g = mergePieces(hacer(), true);
    hechos.set(clave, g);
  }
  return g;
}
/** Piezas de un vehículo de carretera o agua (los de `Nuevos` no pasan por aquí). */
export function piezasVehiculo(kind: VehicleKind): Pc[] {
  const v = vehicles[kind];
  if (kind === 'lancha' || kind === 'cayuco') return bote(v.color, v.length, kind === 'cayuco');
  if (kind === 'moto' || kind === 'bici') return dosRuedas(v.color, v.length, kind === 'moto');
  if (kind === 'rapidito') return micro(v.color, v.length);
  if (kind === 'bus') return busEscolar(v.color, v.length);
  if (kind === 'pickup') return pickup(v.color, v.length);
  if (kind === 'camion') return camion(v.color, v.length);
  return sedan(v.color, v.length);
}
/** Vehículo fusionado (una llamada de dibujo, geometría compartida). */
export function Carro({ kind }: { kind: VehicleKind }) {
  return <Mallas grupos={grupos(`v|${kind}`, () => piezasVehiculo(kind))} />;
}
/** Estorbo fusionado: vaca, perro, bache, túmulo o tronco (null si es otra cosa). */
export function Estorbo({ kind }: { kind: ObstacleKind }) {
  if (kind === 'vaca' || kind === 'perro')
    return <Mallas grupos={grupos(`o|${kind}`, () => vacaPcs(kind === 'perro'))} />;
  if (kind === 'bache' || kind === 'tumulo' || kind === 'tronco')
    return <Mallas grupos={grupos(`o|${kind}`, () => estorbo(kind))} sombra={kind !== 'bache'} />;
  return null;
}
