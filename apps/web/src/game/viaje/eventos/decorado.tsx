// Estorbos y decorado de los eventos del camino con forma: ganado cebú y pinto con patas, cachos y papada; olas con
// el agua de la escena y espuma; túmulo, bache, derrumbe, peaje, puente, cargas y mirador. Cada conjunto es UNA malla
// fusionada armada una vez y compartida (más una de agua donde hay agua). Nada de esto choca: los eventos frenan por
// reglas (`limiteDeEvento`), no por colisión, y las posiciones son las de los bloques de antes.
import * as THREE from 'three';
import { bl, bx, cy, type Merged, mergePieces, type Pc, PI, place, rk } from '../../dept/lib';
import { art } from '../../kit';
import { Mallas } from '../../minigames/kit/fundido';

const sin = { solid: false } as const;
const escala = (pcs: Pc[], k: number): Pc[] =>
  pcs.map((q) => ({ ...q, p: [q.p[0] * k, q.p[1] * k, q.p[2] * k], s: [q.s[0] * k, q.s[1] * k, q.s[2] * k] }));

// ------------------------------------------------------------------ ganado
interface Pelaje {
  /** pelo del cuerpo, de la cabeza y de las patas */
  c: string;
  cabeza: string;
  patas: string;
  /** manchas grandes (vaca pinta) */
  manchas?: string;
  /** giba y papada de cebú (brahman, el ganado de las fincas de la costa y Olancho) */
  cebu?: boolean;
}
/** Una res parada, mirando a +X, con las pezuñas en y = 0 (unos 2.3 m de largo y 1.4 m a la cruz). */
function res(pe: Pelaje): Pc[] {
  const { c } = pe,
    out: Pc[] = [
      // tronco: costillar, anca y pecho que se juntan, y la panza
      bl(0, 1.05, 0, 0.6, 'cloth', c, { s: [1.5, 0.78, 0.68] }),
      bl(-0.6, 1.06, 0, 0.42, 'cloth', c, { s: [1.05, 1, 1.05] }),
      bl(0.55, 1.0, 0, 0.44, 'cloth', c, { s: [1, 1, 0.98] }),
      bl(0.02, 0.84, 0, 0.5, 'cloth', c, { s: [1.45, 0.56, 0.78] }),
      // cuello que baja a la cabeza
      bl(0.98, 1.14, 0, 0.27, 'cloth', c, { s: [1.5, 1.05, 0.85], e: [0, 0, -0.35] }),
      // cabeza alargada, frente y trompa
      bl(1.38, 1.08, 0, 0.19, 'cloth', pe.cabeza, { s: [1.55, 1.05, 0.9], e: [0, 0, -0.55] }),
      bl(1.57, 0.92, 0, 0.13, 'cloth', '#4a3a33', { s: [1.05, 0.85, 1.1] }),
      // ojos
      bl(1.42, 1.15, 0.14, 0.035, 'plastic', '#120e0c'),
      bl(1.42, 1.15, -0.14, 0.035, 'plastic', '#120e0c'),
      // cola con su borla
      cy(-1.1, 0.86, 0, 0.028, 0.72, 'cloth', c, { e: [0, 0, -0.12], ...sin }),
      bl(-1.14, 0.47, 0, 0.06, 'cloth', '#2b2420', { s: [1, 1.9, 1] }),
    ];
  for (const s of [-1, 1]) {
    // orejas: caídas en el cebú, de lado en la pinta
    out.push(
      pe.cebu
        ? bl(1.28, 1.04, s * 0.25, 0.11, 'cloth', pe.cabeza, { s: [1.5, 0.45, 0.35], e: [s * 0.9, 0, -0.5] })
        : bl(1.27, 1.2, s * 0.25, 0.09, 'cloth', pe.cabeza, { s: [1.3, 0.45, 0.5], e: [s * 0.3, 0, 0] }),
    );
    // cachos: base gruesa que sale de lado y punta que sube
    out.push(
      cy(1.3, 1.29, s * 0.14, 0.04, 0.2, 'stone', '#e6dcc4', { rt: 0.65, e: [s * 1.15, 0, 0], n: 8, ...sin }),
      cy(1.31, 1.38, s * 0.27, 0.026, 0.16, 'stone', '#3a332c', { rt: 0.3, e: [s * 0.35, 0, 0], n: 8, ...sin }),
    );
    // patas de adelante: brazo, rodilla, caña y pezuña
    out.push(
      cy(0.6, 0.66, s * 0.22, 0.085, 0.42, 'cloth', c, { rt: 1.35, n: 10, ...sin }),
      bl(0.6, 0.43, s * 0.22, 0.07, 'cloth', pe.patas),
      cy(0.6, 0.25, s * 0.22, 0.05, 0.34, 'cloth', pe.patas, { n: 8, ...sin }),
      cy(0.6, 0.04, s * 0.22, 0.065, 0.08, 'stone', '#231d19', { rt: 0.8, n: 8, ...sin }),
    );
    // patas de atrás: muslo grueso, corvejón que se dobla y caña
    out.push(
      bl(-0.68, 0.84, s * 0.24, 0.22, 'cloth', c, { s: [1, 1.55, 0.72] }),
      cy(-0.74, 0.47, s * 0.23, 0.06, 0.34, 'cloth', pe.patas, { rt: 1.3, e: [0, 0, -0.18], n: 8, ...sin }),
      cy(-0.71, 0.2, s * 0.23, 0.05, 0.3, 'cloth', pe.patas, { e: [0, 0, 0.12], n: 8, ...sin }),
      cy(-0.69, 0.04, s * 0.23, 0.065, 0.08, 'stone', '#231d19', { rt: 0.8, n: 8, ...sin }),
    );
  }
  if (pe.cebu)
    out.push(
      // giba sobre la cruz y papada colgando del pescuezo
      bl(0.6, 1.4, 0, 0.23, 'cloth', c, { s: [1.1, 0.8, 0.72], e: [0, 0, 0.3] }),
      bl(0.98, 0.82, 0, 0.17, 'cloth', c, { s: [1.5, 1.7, 0.32], e: [0, 0, 0.3] }),
    );
  if (pe.manchas) {
    const m = pe.manchas;
    out.push(
      bl(-0.35, 1.22, 0.36, 0.34, 'cloth', m, { s: [1.3, 0.85, 0.3] }),
      bl(0.35, 1.02, -0.38, 0.3, 'cloth', m, { s: [1.4, 0.95, 0.28] }),
      bl(-0.7, 1.32, -0.2, 0.26, 'cloth', m, { s: [1, 0.5, 1] }),
      bl(0.1, 1.46, 0.05, 0.24, 'cloth', m, { s: [1.5, 0.3, 1.2] }),
      // ubre
      bl(-0.36, 0.58, 0, 0.13, 'cloth', '#e2a49a', { s: [1.1, 0.75, 1] }),
    );
  }
  return out;
}
const CEBU: Pelaje = { c: '#d6d1c6', cabeza: '#bdb6aa', patas: '#c4bdb0', cebu: true },
  PINTA: Pelaje = { c: '#f0e9dc', cabeza: '#5a3d2b', patas: '#e7dfd0', manchas: '#5a3d2b' },
  TERNERO: Pelaje = { c: '#b07a4f', cabeza: '#9c6a43', patas: '#a87550' };
/** La vaca suelta que se atraviesa en la carretera (estorbo del manejo), del tamaño de la de antes. */
export const vacaSuelta = (): Pc[] => escala(res(PINTA), 0.88);
/** El hato que cruza: un cebú, una pinta y su ternero (donde estaban los dos bloques de antes). */
function hato(): Pc[] {
  return [
    ...place(escala(res(CEBU), 1.25), -2.6, 0, -1.4, 0.12),
    ...place(escala(res(PINTA), 1.2), 2.6, 0, 1.4, -0.08),
    ...place(escala(res(TERNERO), 0.72), 4.9, 0, 2.2, 0.25),
  ];
}

// ------------------------------------------------------------------ olas
const MAR = '#2f8fab',
  ESPUMA = '#e6f2f3';
/** Tres crestas de ola a lo ancho (16 m), la de adelante la más grande. */
const CRESTAS = [0, 1, 2].map((i) => ({ z: -i * 4, alto: 1.1 - i * 0.22, fase: i * 1.7 }));
const ANCHO = 16,
  FONDO = 3.4, // de la espalda (−Z) a la cara (+Z)
  PICO = 0.35; // dónde queda la cresta en el perfil (−1 espalda … 1 cara)
/** Altura de la cresta a lo ancho: se hunde en el mar en las dos puntas y no es pareja. */
const altoEn = (x: number, c: (typeof CRESTAS)[number]) =>
  c.alto * Math.sin(PI * (x / ANCHO + 0.5)) ** 0.7 * (0.86 + 0.14 * Math.sin(x * 0.9 + c.fase));
/** Perfil de la ola (0 a 1): espalda tendida que sube y cara parada que cae hacia el bote. */
function perfil(u: number) {
  if (u <= PICO) return 0.5 - 0.5 * Math.cos((PI * (u + 1)) / (PICO + 1));
  const s = (u - PICO) / (1 - PICO);
  return (1 - s) ** 1.7 * (1 + 0.35 * Math.sin(PI * s));
}
/** Punto de la superficie: x a lo ancho, u en el perfil (−1 espalda … 1 cara). */
function punto(c: (typeof CRESTAS)[number], x: number, u: number): [number, number, number] {
  const h = altoEn(x, c) * perfil(u);
  // el labio se adelanta un poco donde la ola está más alta
  return [x, h - 0.03, c.z + (u * FONDO) / 2 + h * 0.18 * Math.max(0, u)];
}
/** Malla de cintas sobre las crestas: para cada cresta, filas de u0 a u1 con el ancho que da `ancho(x)` (0 = hueco). */
function cintas(nx: number, nz: number, banda: (c: (typeof CRESTAS)[number], x: number, v: number) => number | null) {
  const pos: number[] = [],
    idx: number[] = [];
  for (const c of CRESTAS) {
    const o = pos.length / 3;
    for (let j = 0; j <= nz; j++)
      for (let i = 0; i <= nx; i++) {
        const x = (i / nx - 0.5) * ANCHO,
          u = banda(c, x, j / nz) ?? PICO,
          p = punto(c, x, u);
        pos.push(p[0], p[1], p[2]);
      }
    for (let j = 0; j < nz; j++)
      for (let i = 0; i < nx; i++) {
        const a = o + j * (nx + 1) + i,
          b = a + nx + 1;
        idx.push(a, b, a + 1, a + 1, b, b + 1);
      }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}
/** Ruido suave y repetible a lo ancho de la cresta. */
const ruido = (x: number, f: number) => 0.5 + 0.3 * Math.sin(x * 2.3 + f) + 0.2 * Math.sin(x * 5.1 + f * 2.7);
let olasGeo: THREE.BufferGeometry | null = null,
  espumaGeo: THREE.BufferGeometry | null = null;
/** Las olas del «Oleaje y espera»: agua de la escena con forma de cresta y la espuma que revienta encima. */
export function Olas() {
  // la superficie: el perfil completo de cada cresta
  olasGeo ??= cintas(64, 18, (_, __, v) => v * 2 - 1);
  // la espuma: una cinta pegada a la cresta que baja por la cara, más ancha donde revienta y con huecos
  espumaGeo ??= cintas(96, 4, (c, x, v) => {
    const r = ruido(x, c.fase),
      ancho = r < 0.32 || altoEn(x, c) < 0.3 ? 0 : 0.1 + 0.26 * r;
    return PICO - 0.05 + v * ancho;
  });
  return (
    <>
      <mesh geometry={olasGeo} material={art.material('water', MAR)} receiveShadow />
      <mesh geometry={espumaGeo} material={art.material('cloth', ESPUMA)} position-y={0.015} />
    </>
  );
}

// ------------------------------------------------------------------ conos, túmulo, bache, derrumbe, obras
/** Cono de tránsito naranja con base negra y dos bandas reflectivas (1.05 m, como los de antes con escala 1.4). */
function cono(x: number, z: number): Pc[] {
  return [
    bx(x, 0.035, z, 0.62, 0.07, 0.62, 'plastic', '#1d1f22', sin),
    cy(x, 0.55, z, 0.28, 1.0, 'plastic', '#ff6a1a', { rt: 0.1, n: 14, ...sin }),
    cy(x, 0.66, z, 0.18, 0.13, 'plastic', '#f5f6f2', { rt: 0.85, n: 14, ...sin }),
    cy(x, 0.38, z, 0.225, 0.13, 'plastic', '#f5f6f2', { rt: 0.88, n: 14, ...sin }),
  ];
}
const conos = (): Pc[] => [-5, -2, 1].flatMap((x) => cono(x, 2.5));
/** Túmulo de concreto pintado a franjas amarillas y negras, con su rótulo amarillo al lado. */
function tumulo(): Pc[] {
  const out: Pc[] = [];
  for (let k = 0; k < 14; k++)
    out.push(
      cy(-6.5 + k, -0.6, 0, 0.84, 1.0, 'concrete', k % 2 ? '#22262a' : '#f0be22', { e: [0, 0, PI / 2], n: 24, ...sin }),
    );
  // bordes rotos del asfalto alrededor y rótulo de prevención (rombo amarillo en su poste)
  out.push(
    bx(0, 0.012, 1.15, 14, 0.02, 0.18, 'asphalt', '#3d4044', sin),
    bx(0, 0.012, -1.15, 14, 0.02, 0.18, 'asphalt', '#3d4044', sin),
    cy(7.6, 1.2, 1.2, 0.05, 2.4, 'metal', '#9aa1a6', { n: 8, ...sin }),
    bx(7.6, 2.3, 1.26, 0.85, 0.85, 0.04, 'plastic', '#f2c230', { e: [0, 0, PI / 4], ...sin }),
    bx(7.6, 2.3, 1.29, 0.5, 0.12, 0.02, 'plastic', '#1d1f22', sin),
    bx(7.6, 2.18, 1.29, 0.5, 0.06, 0.02, 'plastic', '#1d1f22', { e: [0, 0, 0.0], ...sin }),
  );
  return out;
}
/** Bache: hoyo con orilla quebrada, lodo y agua adentro, y un caballete a franjas. */
function bache(): Pc[] {
  const out: Pc[] = [
    bx(-2, 0.022, 0, 4.4, 0.02, 3.2, 'dirt', '#2b2621', sin),
    bl(-2.2, 0.035, 0.2, 1, 'water', '#53666a', { s: [1.35, 0.01, 0.85], n: 20 }),
  ];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * PI * 2;
    out.push(
      rk(-2 + Math.cos(a) * 2.3, 0.05, Math.sin(a) * 1.65, 0.3 + (k % 3) * 0.08, 'asphalt', '#3a3f43', {
        s: [1.4, 0.22, 1],
      }),
    );
  }
  for (let k = 0; k < 5; k++)
    out.push(rk(-3.2 + k * 0.6, 0.06, -0.6 + (k % 2) * 0.9, 0.12, 'stone', '#6f6a62', { s: [1, 0.6, 1] }));
  return [...out, ...caballete(-6.2, -1.2, 0.3), ...conos()];
}
/** Caballete de obra: dos patas en A y tablas a franjas naranja y blanco. */
function caballete(x: number, z: number, r = 0): Pc[] {
  const out: Pc[] = [];
  for (const s of [-1, 1])
    for (const t of [-1, 1])
      out.push(bx(s * 0.85, 0.55, t * 0.16, 0.07, 1.15, 0.07, 'wood', '#cfcac0', { e: [t * 0.25, 0, 0], ...sin }));
  for (let k = 0; k < 6; k++)
    for (const y of [0.95, 0.6])
      out.push(bx(-0.85 + k * 0.34, y, 0.2, 0.34, 0.2, 0.04, 'plastic', k % 2 ? '#f5f3ee' : '#ff6a1a', sin));
  return place(out, x, 0, z, r);
}
/** Derrumbe: lomo de tierra suelta con piedras grandes y chicas que cayeron del cerro. */
function derrumbe(): Pc[] {
  const out: Pc[] = [
    bl(-2.5, 0.05, -1, 3.8, 'dirt', '#8f5d3a', { s: [1.05, 0.22, 0.95] }),
    bl(-3.6, 0.35, -2.2, 1.9, 'dirt', '#7c5032', { s: [1.1, 0.42, 0.9] }),
    bl(-1.2, 0.12, 0.6, 1.5, 'dirt', '#9a6a45', { s: [1.2, 0.2, 0.9] }),
  ];
  for (const [x, y, z, r] of [
    [-4, 0.5, -1, 1.25],
    [-1, 0.35, 0, 0.95],
    [-2.5, 0.5, -3, 1.05],
    [-0.2, 0.15, 1.4, 0.45],
    [-5.2, 0.2, 0.6, 0.5],
    [-2.8, 0.2, 1.1, 0.35],
  ])
    out.push(rk(x, y, z, r, 'stone', '#837a6f', { s: [1, 0.75, 0.9] }));
  for (let k = 0; k < 14; k++)
    out.push(rk(-5.5 + ((k * 37) % 70) / 10, 0.06, -3 + ((k * 23) % 50) / 10, 0.13, 'stone', '#6c645a'));
  return [...out, ...conos()];
}
/** Montón de tierra de la obra, con su pala clavada y la carretilla. */
function obra(): Pc[] {
  const out: Pc[] = [
    bl(-2, 0.05, -2, 1.9, 'dirt', '#a26d43', { s: [1.35, 0.68, 0.72], n: 14 }),
    bl(-2.9, 0.1, -1.4, 1.0, 'dirt', '#8e5f3a', { s: [1.1, 0.62, 0.9] }),
    rk(-1.6, 0.25, -1.1, 0.3, 'stone', '#837a6f'),
    rk(-2.8, 0.15, -0.9, 0.22, 'stone', '#6c645a'),
    // pala
    cy(-1.3, 1.25, -1.6, 0.025, 1.2, 'wood', '#a97d4f', { e: [0.2, 0, -0.3], n: 6, ...sin }),
    bx(-1.06, 0.62, -1.73, 0.22, 0.28, 0.03, 'metal', '#5c6166', { e: [0.2, 0, -0.3], ...sin }),
  ];
  // carretilla: batea inclinada, rueda adelante y dos varas
  const c: Pc[] = [
    bx(0, 0.38, 0, 0.62, 0.26, 0.85, 'metal', '#2f7d4a', { e: [0.12, 0, 0], ...sin }),
    bx(0, 0.52, 0, 0.75, 0.05, 1.0, 'metal', '#3c9a5c', { e: [0.12, 0, 0], ...sin }),
    cy(0, 0.17, -0.62, 0.17, 0.08, 'plastic', '#1b1d20', { e: [0, 0, PI / 2], n: 12, ...sin }),
    bx(0.3, 0.33, 0.35, 0.04, 0.04, 1.3, 'metal', '#3a3f44', { e: [-0.18, 0, 0], ...sin }),
    bx(-0.3, 0.33, 0.35, 0.04, 0.04, 1.3, 'metal', '#3a3f44', { e: [-0.18, 0, 0], ...sin }),
    bx(0.3, 0.13, 0.4, 0.04, 0.26, 0.04, 'metal', '#3a3f44', sin),
    bx(-0.3, 0.13, 0.4, 0.04, 0.26, 0.04, 'metal', '#3a3f44', sin),
  ];
  return [...out, ...place(c, 0.4, 0, -2.2, 0.6), ...caballete(-4.8, 0.6, -0.15)];
}

// ------------------------------------------------------------------ peaje, puente, cargas, mirador
/** Peaje: techo de lámina con su faja de color, columnas, luces debajo, isla a franjas y pluma roja y blanca. */
function peaje(): Pc[] {
  const out: Pc[] = [
    bx(0, 4.85, -1, 15.4, 0.28, 4.4, 'metal', '#e9ecec', sin),
    bx(0, 4.55, -1, 15.6, 0.45, 4.6, 'plastic', '#267c81', sin),
    bx(0, 4.33, 1.31, 15.6, 0.06, 0.02, 'plastic', '#f6f1dc', sin),
    bx(0, 4.33, -3.31, 15.6, 0.06, 0.02, 'plastic', '#f6f1dc', sin),
  ];
  for (const x of [-7, 7]) {
    out.push(
      cy(x, 2.2, -1, 0.26, 4.4, 'concrete', '#d6ddd4', { n: 14, ...sin }),
      bx(x, 0.06, -1, 0.8, 0.12, 0.8, 'concrete', '#bfc3bb', sin),
    );
  }
  for (const x of [-4.5, 0, 4.5])
    out.push(bx(x, 4.31, -1, 1.4, 0.05, 0.35, 'plastic', '#fffbe8', { em: -1.4, ...sin }));
  // isla con bordillo a franjas donde va la caseta
  for (let k = 0; k < 8; k++)
    out.push(bx(-7.2 + k * 0.45, 0.1, 1.6, 0.45, 0.2, 0.3, 'concrete', k % 2 ? '#22262a' : '#f0be22', sin));
  // pluma: caja del motor y brazo a franjas
  out.push(
    bx(-6.4, 0.6, 1, 0.5, 1.2, 0.5, 'metal', '#f0be22', sin),
    bx(-6.4, 1.22, 1, 0.55, 0.06, 0.55, 'metal', '#2a2d30', sin),
  );
  for (let k = 0; k < 12; k++)
    out.push(
      cy(-5.6 + k, 1.4, 1, 0.07, 1.0, 'plastic', k % 2 ? '#f6f1dc' : '#d35138', { e: [0, 0, PI / 2], n: 10, ...sin }),
    );
  return out;
}
/** Puente de un carril: losa con bordillo, juntas, barandas de tubo sobre postes y su viga por debajo. */
function puente(): Pc[] {
  const out: Pc[] = [
    bx(0, 0.06, -7, 7, 0.12, 22, 'concrete', '#8b9492', sin),
    bx(0, -0.35, -7, 6.6, 0.7, 22, 'concrete', '#757d7b', sin),
  ];
  for (let k = 0; k < 5; k++) out.push(bx(0, 0.125, 3 - k * 5, 7, 0.01, 0.06, 'asphalt', '#2c3034', sin));
  for (const s of [-1, 1]) {
    out.push(
      bx(s * 3.75, 0.25, -7, 0.5, 0.5, 22, 'concrete', '#c9c4b2', sin),
      bx(s * 3.75, 1.3, -7, 0.1, 0.1, 22, 'metal', '#ddd2ab', sin),
      bx(s * 3.75, 0.9, -7, 0.07, 0.07, 22, 'metal', '#ddd2ab', sin),
    );
    for (let k = 0; k < 12; k++)
      out.push(bx(s * 3.75, 0.85, 3.6 - k * 1.95, 0.12, 0.95, 0.12, 'metal', '#c7bd98', sin));
  }
  return [...out, ...conos()];
}
/** Sacos de grano amarrados con mecate sobre una tarima, y una caja de madera de tablas. */
function cargas(maletas: boolean): Pc[] {
  const out: Pc[] = [bx(0.8, 0.07, 0, 3.2, 0.14, 1.5, 'wood', '#9a7448', sin)];
  if (maletas) {
    // báscula del operador con su pantalla y maletas encima y a la par
    out.push(
      bx(0.8, 0.2, 0, 1.5, 0.12, 1.2, 'metal', '#9aa1a6', sin),
      cy(1.75, 0.75, -0.45, 0.04, 1.1, 'metal', '#5c6166', { n: 8, ...sin }),
      bx(1.75, 1.35, -0.45, 0.4, 0.28, 0.12, 'plastic', '#1d2428', sin),
      bx(1.75, 1.35, -0.38, 0.3, 0.16, 0.02, 'neon', '#7dff9a', sin),
      bx(0.6, 0.62, 0, 0.95, 0.7, 0.4, 'plastic', '#2e5aa8', sin),
      bx(0.6, 1.0, 0, 0.3, 0.06, 0.06, 'plastic', '#1d1f22', sin),
      bx(-0.4, 0.45, 0.1, 0.8, 0.75, 0.35, 'cloth', '#7a2f2a', { e: [0, 0.2, 0], ...sin }),
      bl(-0.3, 0.98, 0.1, 0.32, 'cloth', '#3b4a35', { s: [1.4, 0.6, 0.7] }),
    );
    return out;
  }
  // sacos de costal (alargados, panzones y con la boca amarrada) en tres camadas sobre la tarima
  const COSTAL = ['#cdb88a', '#c4ad7c', '#d6c497'];
  let n = 0;
  for (const [fila, y, xs] of [
    [-0.36, 0.38, [0.2, 1.3, 2.4]],
    [0.36, 0.38, [0.2, 1.3, 2.4]],
    [-0.3, 0.8, [0.75, 1.85]],
    [0.32, 0.8, [0.75, 1.85]],
    [0, 1.2, [1.3]],
  ] as [number, number, number[]][])
    for (const x of xs) {
      const g = ((n++ * 7) % 5) * 0.06 - 0.12;
      out.push(
        bl(x, y, fila, 0.5, 'cloth', COSTAL[n % 3], { s: [1.05, 0.44, 0.62], e: [0, g, 0.04 * Math.sign(g)] }),
        bl(x + 0.52, y + 0.02, fila, 0.11, 'cloth', '#b39d6e', { s: [0.7, 1, 1.25] }),
        // costura del medio
        bx(x, y + 0.2, fila, 0.9, 0.015, 0.05, 'cloth', '#9c8659', { e: [0, g, 0], ...sin }),
      );
    }
  // mecate amarillo que amarra la carga
  for (const x of [0.6, 2.0])
    out.push(cy(x, 0.8, 0, 0.035, 1.55, 'cloth', '#efd668', { e: [PI / 2, 0, 0], n: 6, ...sin }));
  out.push(cy(1.3, 1.02, 0.66, 0.035, 2.9, 'cloth', '#efd668', { e: [0, 0, PI / 2], n: 6, ...sin }));
  // dos cajas de tablas, una sobre otra, con marco y travesaño en diagonal
  for (const [y, r] of [
    [0.65, 0.05],
    [1.95, -0.12],
  ]) {
    const c: Pc[] = [];
    for (let k = 0; k < 4; k++)
      c.push(bx(0, -0.48 + k * 0.32, 0, 1.25, 0.28, 1.25, 'wood', k % 2 ? '#a57a47' : '#b98b55', sin));
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) c.push(bx(sx * 0.6, 0, sz * 0.6, 0.1, 1.3, 0.1, 'wood', '#7b5733', sin));
    c.push(bx(0, 0, 0.64, 0.08, 1.5, 0.03, 'wood', '#7b5733', { e: [0, 0, 0.78], ...sin }));
    out.push(...place(c, -1.3, y, 0, r));
  }
  return out;
}
/** Mirador: piso de tablas sobre horcones, baranda y banca. */
function mirador(): Pc[] {
  const out: Pc[] = [];
  for (let k = 0; k < 10; k++)
    out.push(bx(10, 0.48, -0.4 - k * 0.78, 7, 0.08, 0.72, 'wood', k % 2 ? '#b8956a' : '#c6a274', sin));
  for (const x of [7, 10, 13])
    for (const z of [0, -8]) out.push(cy(x, 0.24, z, 0.14, 0.48, 'wood', '#6e4c2c', { n: 8, ...sin }));
  for (const x of [6.6, 8.8, 11.2, 13.4]) out.push(bx(x, 1.0, -8, 0.12, 1.0, 0.12, 'wood', '#7b5733', sin));
  out.push(
    bx(10, 1.45, -8, 7, 0.1, 0.12, 'wood', '#ede0bc', sin),
    bx(10, 1.0, -8, 7, 0.07, 0.07, 'wood', '#d8c69c', sin),
    bx(10, 0.88, -6.6, 2.4, 0.08, 0.45, 'wood', '#a57a47', sin),
    bx(9.0, 0.7, -6.6, 0.1, 0.36, 0.4, 'wood', '#6e4c2c', sin),
    bx(11.0, 0.7, -6.6, 0.1, 0.36, 0.4, 'wood', '#6e4c2c', sin),
  );
  return out;
}

// ------------------------------------------------------------------ mallas compartidas
const HACER = {
  hato,
  tumulo,
  bache,
  derrumbe,
  obra,
  peaje,
  puente,
  mirador,
  conos,
  sacos: () => cargas(false),
  maletas: () => cargas(true),
};
export type Decorado = keyof typeof HACER;
const hechos = new Map<Decorado, Merged[]>();
/** Un conjunto del camino en una malla fusionada (y su agua aparte), armado una sola vez. */
export function Decorado({ k, sombra = true }: { k: Decorado; sombra?: boolean }) {
  let g = hechos.get(k);
  if (!g) {
    g = mergePieces(HACER[k](), true);
    hechos.set(k, g);
  }
  return <Mallas grupos={g} sombra={sombra} />;
}
