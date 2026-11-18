// Plataformas de la pesca con forma (paquete HD): lancha de fibra con proa en punta, borda, franjas, bancas y motor
// fuera de borda; cayuco tallado de un tronco con bancas y canalete; muelle de tablas sobre horcones con travesaños.
// Mismas medidas de siempre y la cara donde se para el pescador en y = 0. Una malla fusionada por tipo y tamaño,
// compartida entre copias. Decorado: sin colisión (como antes).
import { bx, cy, type Merged, mergePieces, type Pc, PI } from '../../dept/lib';
import { Mallas } from '../kit/fundido';

const sin = { solid: false } as const;
const TABLAS = ['#a77b4d', '#9a6f43', '#b08453', '#94693f'];

function lancha(W: number, L: number): Pc[] {
  const out: Pc[] = [],
    n = 14,
    zf = -L / 2 + L * 0.4, // donde el casco ya tiene todo su ancho
    ancho = (z: number) => (z >= zf ? W : W * (0.12 + (0.88 * (z + L / 2)) / (zf + L / 2)));
  for (let i = 0; i < n; i++) {
    const z = -L / 2 + (L * (i + 0.5)) / n,
      w = ancho(z),
      d = L / n + 0.02;
    out.push(
      // casco: obra viva roja, franja azul en la línea de agua y costado blanco
      bx(0, -0.48, z, w * 0.72, 0.16, d, 'plastic', '#a8322a', sin),
      bx(0, -0.36, z, w * 0.94, 0.12, d, 'plastic', '#1f6fb5', sin),
      bx(0, -0.15, z, w * 0.98, 0.3, d, 'plastic', '#f1f1ec', sin),
      // piso antideslizante
      bx(0, -0.015, z, Math.max(0.05, w - 0.18), 0.03, d, 'plastic', '#d9dcd6', sin),
    );
  }
  // borda: derecha en la popa y en diagonal hasta la punta de la proa (sin escalones)
  for (const s of [-1, 1]) {
    out.push(
      bx(s * (W / 2 - 0.04), 0.17, (zf + L / 2) / 2, 0.08, 0.36, L / 2 - zf, 'plastic', '#f1f1ec', sin),
      bx(s * (W / 2 - 0.02), 0.37, (zf + L / 2) / 2, 0.13, 0.05, L / 2 - zf, 'plastic', '#1f6fb5', sin),
    );
    const ax = s * (W / 2 - 0.04),
      bz = -L / 2 + 0.02,
      len = Math.hypot(ax, zf - bz),
      yaw = Math.atan2(ax, zf - bz);
    for (const [y, h, wd, c] of [
      [0.12, 0.46, 0.08, '#f1f1ec'],
      [0.38, 0.05, 0.13, '#1f6fb5'],
      [-0.15, 0.3, 0.06, '#f1f1ec'],
      [-0.36, 0.12, 0.06, '#1f6fb5'],
    ] as [number, number, number, string][])
      out.push(bx(ax / 2, y, (zf + bz) / 2, wd, h, len, 'plastic', c, { e: [0, yaw, 0], ...sin }));
  }
  out.push(
    // roda de la proa
    bx(0, 0.0, -L / 2 + 0.04, 0.14, 0.86, 0.14, 'plastic', '#1f6fb5', { e: [0, PI / 4, 0], ...sin }),
    // espejo de popa, motor fuera de borda y su tanque
    bx(0, 0.0, L / 2 - 0.02, W - 0.1, 0.55, 0.08, 'plastic', '#f1f1ec', sin),
    bx(0, 0.42, L / 2 + 0.18, 0.4, 0.5, 0.42, 'plastic', '#2a2e33', sin),
    bx(0, 0.68, L / 2 + 0.18, 0.36, 0.06, 0.38, 'plastic', '#c9ced3', sin),
    bx(0, -0.15, L / 2 + 0.25, 0.14, 0.7, 0.16, 'metal', '#4a4f55', sin),
    bx(0, -0.48, L / 2 + 0.3, 0.1, 0.1, 0.3, 'metal', '#4a4f55', sin),
    bx(W * 0.25, 0.14, L / 2 - 0.45, 0.4, 0.28, 0.3, 'plastic', '#c62828', sin),
  );
  // bancas de madera a proa y popa (en medio se para el pescador)
  for (const z of [-L * 0.27, L * 0.34]) out.push(bx(0, 0.22, z, ancho(z) - 0.2, 0.06, 0.42, 'wood', '#9e6b3c', sin));
  if (L > 4) {
    // hielera para los pescados, rollo de mecate y portacañas
    out.push(
      bx(-W * 0.22, 0.17, L * 0.18, 0.62, 0.34, 0.4, 'plastic', '#eef0ee', sin),
      bx(-W * 0.22, 0.35, L * 0.18, 0.64, 0.04, 0.42, 'plastic', '#d8dcd8', sin),
      cy(W * 0.2, 0.04, -L * 0.36, 0.18, 0.08, 'cloth', '#c9b07a', { n: 12, ...sin }),
    );
    for (const s of [-1, 1])
      out.push(cy(s * (W / 2 - 0.1), 0.45, L * 0.25, 0.03, 0.3, 'metal', '#c9ced3', { n: 6, ...sin }));
  }
  return out;
}
function cayucoPlat(W: number, L: number): Pc[] {
  const out: Pc[] = [],
    n = 9;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1),
      z = -L / 2 + (L * (i + 0.5)) / n,
      a = Math.sin(PI * (0.12 + t * 0.76)),
      w = W * Math.max(0.3, a),
      d = L / n + 0.02;
    out.push(
      bx(0, -0.3, z, w * 0.75, 0.3, d, 'wood', '#6d4628', sin),
      bx(0, -0.1, z, w, 0.22, d, 'wood', '#8a5a2b', sin),
      bx(0, -0.01, z, w - 0.16, 0.02, d, 'wood', '#5e3d22', sin),
    );
    for (const s of [-1, 1]) out.push(bx(s * (w / 2 - 0.05), 0.1, z, 0.1, 0.24, d, 'wood', '#7a4d24', sin));
  }
  for (const s of [-1, 1])
    out.push(bx(0, 0.02, s * (L / 2 - 0.05), 0.3, 0.32, 0.5, 'wood', '#7a4d24', { e: [0, PI / 4, 0], ...sin }));
  for (const z of [-L * 0.3, L * 0.3]) out.push(bx(0, 0.12, z, W * 0.7, 0.05, 0.26, 'wood', '#5e3d22', sin));
  if (L > 4)
    out.push(
      bx(W * 0.7, 0.1, L * 0.27, 0.07, 0.05, 2.0, 'wood', '#c9a46a', { e: [0, 0.3, 0.08], ...sin }),
      bx(W * 0.78 + 0.25, 0.1, L * 0.27 - 1.05, 0.24, 0.03, 0.46, 'wood', '#c9a46a', { e: [0, 0.3, 0.08], ...sin }),
    );
  return out;
}
function muellePlat(W: number, L: number): Pc[] {
  const out: Pc[] = [],
    paso = 0.31;
  // tablones de lado a lado, cada uno con su tono y un poco chueco
  for (let z = -L / 2 + 0.15, i = 0; z < L / 2; z += paso, i++)
    out.push(
      bx(((i * 7) % 3) * 0.02 - 0.02, -0.035, z, W + ((i * 5) % 3) * 0.04, 0.07, 0.27, 'wood', TABLAS[(i * 3) % 4], {
        e: [0, ((i * 11) % 5) * 0.004 - 0.008, 0],
        ...sin,
      }),
    );
  // largueros y horcones con travesaños en cruz
  for (const s of [-1, 1]) out.push(bx(s * (W / 2 - 0.2), -0.16, 0, 0.16, 0.18, L, 'wood', '#6b4a2b', sin));
  const zs = L > 4 ? [-5.6, -2, 2, 5.6] : [-0.6, 0.6];
  for (const z of zs) {
    for (const s of [-1, 1]) out.push(cy(s * (W / 2 - 0.1), -1.2, z, 0.12, 2.5, 'wood', '#5a3c22', { n: 8, ...sin }));
    out.push(bx(0, -0.7, z, W - 0.2, 0.1, 0.08, 'wood', '#5a3c22', { e: [0, 0, 0.35], ...sin }));
  }
  if (L > 4) {
    // bitas en la punta y mecate
    for (const s of [-1, 1])
      out.push(cy(s * (W / 2 - 0.2), 0.18, -L / 2 + 0.3, 0.1, 0.36, 'wood', '#4f3420', { n: 8, ...sin }));
    out.push(cy(W / 2 - 0.2, 0.25, -L / 2 + 0.3, 0.14, 0.08, 'cloth', '#c9b07a', { n: 10, ...sin }));
  }
  return out;
}

const hechos = new Map<string, Merged[]>();
/** La plataforma con forma, o null para la orilla (y fuera del paquete HD). */
export function PlatForma({ desde, big }: { desde: string; big: boolean }) {
  if (desde !== 'lancha' && desde !== 'cayuco' && desde !== 'muelle') return null;
  const key = `${desde}|${big}`;
  let g = hechos.get(key);
  if (!g) {
    g = mergePieces(
      desde === 'lancha'
        ? lancha(big ? 2.6 : 1.7, big ? 5.8 : 3.2)
        : desde === 'cayuco'
          ? cayucoPlat(big ? 1.3 : 1.0, big ? 5.2 : 3)
          : muellePlat(big ? 3.4 : 1.8, big ? 12 : 2.4),
      true,
    );
    hechos.set(key, g);
  }
  return <Mallas grupos={g} />;
}
