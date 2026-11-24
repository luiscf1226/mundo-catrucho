// La pulpería por dentro (paquete HD): mostrador de tablas con su reja de hierro y una ventanilla por puesto, la acera
// de atrás por donde pasan los clientes con la pared de enfrente pintada a mano, estantes de madera llenos de producto
// genérico (latas, botellas, cajitas, bolsas y paquetes de colores, sin marcas), sacos de frijol y arroz, huacales de
// verdura, guineos colgando, el comal de las baleadas, la vitrina del pan, la churrera y el refri.
// Todo es una malla fusionada sin colisión: las colisiones siguen siendo las cajas de siempre (en Pulperia.tsx).
import { useMemo } from 'react';
import type { V3 } from '../../../core/types';
import { bl, bx, cy, type Pc, rk, rng } from '../../dept/lib';
import { Fundido, type Rotulo, Rotulos } from '../kit/fundido';
import { Objeto } from '../kit/objetos';

const sin = { solid: false } as const;
const COLORES = ['#c0392b', '#f1c40f', '#2e86c1', '#27ae60', '#e67e22', '#8e44ad', '#ecf0f1', '#d35400', '#16a085'];
const TABLA = ['#8a5a32', '#7c4f2b', '#94643a'];

/** Un estante de pared de `largo` a lo largo de z, con `niveles` repisas llenas de producto (x = cara de la pared). */
function estante(out: Pc[], x: number, lado: number, z0: number, z1: number, r: () => number) {
  const fondo = 0.46,
    cx = x - (lado * fondo) / 2,
    largo = z0 - z1,
    cz = (z0 + z1) / 2;
  for (let z = z0; z >= z1 - 0.01; z -= largo / Math.max(1, Math.round(largo / 1.6)))
    out.push(bx(cx, 1.0, z, fondo, 2.0, 0.06, 'wood', '#5e3d22', sin));
  for (const y of [0.12, 0.6, 1.08, 1.56, 2.0]) {
    out.push(bx(cx, y, cz, fondo, 0.04, largo, 'wood', TABLA[Math.floor(r() * 3)], sin));
    if (y > 1.9) continue;
    // producto: filas apretadas de cosas parecidas, como en una pulpería de verdad
    let z = z0 - 0.08;
    while (z > z1 + 0.1) {
      const tipo = r(),
        c = COLORES[Math.floor(r() * COLORES.length)],
        n = 2 + Math.floor(r() * 5),
        px = cx + lado * (r() - 0.5) * 0.08;
      for (let k = 0; k < n && z > z1 + 0.1; k++) {
        if (tipo < 0.3) {
          // latas
          out.push(cy(px, y + 0.08, z, 0.045, 0.13, 'metal', c, { n: 8, ...sin }));
          z -= 0.1;
        } else if (tipo < 0.5) {
          // botellas con su tapón
          out.push(
            cy(px, y + 0.13, z, 0.04, 0.22, 'plastic', c, { n: 8, ...sin }),
            cy(px, y + 0.27, z, 0.016, 0.06, 'plastic', '#f2f2f2', { n: 6, ...sin }),
          );
          z -= 0.09;
        } else if (tipo < 0.78) {
          // cajitas de frente
          const h = 0.14 + r() * 0.14;
          out.push(bx(px, y + 0.02 + h / 2, z, 0.08, h, 0.12, 'plastic', c, sin));
          z -= 0.14;
        } else {
          // bolsas y paquetes (churros, galletas, jabón en polvo)
          out.push(bl(px, y + 0.1, z, 0.09, 'cloth', c, { s: [0.7, 1.1, 1.2] }));
          z -= 0.2;
        }
      }
      z -= 0.04;
    }
  }
}
/** Saco abierto con su grano encima (frijol rojo, arroz, maíz) */
function saco(out: Pc[], x: number, z: number, grano: string) {
  out.push(
    cy(x, 0.32, z, 0.3, 0.64, 'cloth', '#b59b6b', { rt: 0.92, n: 10, ...sin }),
    cy(x, 0.66, z, 0.33, 0.06, 'cloth', '#a68a5a', { n: 10, ...sin }),
    bl(x, 0.66, z, 0.27, 'sand', grano, { s: [1, 0.28, 1] }),
  );
}
/** Huacal de madera con verdura */
function huacal(out: Pc[], x: number, z: number, cosa: string, r: () => number) {
  out.push(bx(x, 0.18, z, 0.6, 0.36, 0.42, 'wood', '#b98a55', sin));
  for (let i = 0; i < 9; i++)
    out.push(
      bl(
        x - 0.2 + (i % 3) * 0.2 + (r() - 0.5) * 0.05,
        0.4 + (r() - 0.5) * 0.05,
        z - 0.13 + Math.floor(i / 3) * 0.13,
        0.08,
        'plastic',
        cosa,
      ),
    );
}

export function DecorPulperia() {
  const { pcs, rot } = useMemo(() => {
    const r = rng(504),
      pcs: Pc[] = [],
      rot: Rotulo[] = [];
    // afuera: banqueta de la calle que se ve por los lados
    pcs.push(bx(0, -0.04, 0, 40, 0.06, 40, 'concrete', '#4f4b46', sin));
    // ---- la acera de atrás y la pared de enfrente pintada a mano
    pcs.push(bx(0, 0.012, -5.45, 16, 0.024, 2.8, 'concrete', '#a9a398', sin));
    for (let x = -7.5; x < 8; x += 1.5) pcs.push(bx(x, 0.026, -5.45, 0.03, 0.005, 2.8, 'concrete', '#86827a', sin));
    pcs.push(
      bx(0, 2, -7, 16, 4, 0.3, 'stucco', '#3b9b91', sin),
      bx(0, 0.45, -6.83, 16, 0.9, 0.06, 'stucco', '#2a6f68', sin),
      bx(0, 3.92, -6.9, 16.2, 0.16, 0.45, 'concrete', '#e9e3d6', sin),
      // contador de la luz y su tubo
      bx(-7.05, 2.3, -6.82, 0.35, 0.5, 0.12, 'metal', '#9aa0a6', sin),
      bx(-7.05, 3.2, -6.82, 0.05, 1.3, 0.05, 'metal', '#6f767c', sin),
    );
    rot.push(
      { p: [-3.4, 3.15, -6.82], w: 7.4, h: 1.05, text: 'PULPERÍA DOÑA TOÑA', fg: '#9b2226', bg: '#f3e9cf' },
      { p: [3.9, 3.3, -6.82], w: 5.0, h: 0.55, text: 'Hoy no se fía, mañana sí', fg: '#1d3557', bg: '#f2d27a' },
      { p: [2.7, 2.55, -6.82], w: 2.6, h: 0.5, text: 'HAY HIELO', fg: '#ffffff', bg: '#1f6f8b' },
      { p: [5.6, 2.55, -6.82], w: 2.6, h: 0.5, text: 'HAY TORTILLAS', fg: '#ffffff', bg: '#2e7d32' },
      { p: [-3.4, 2.35, -6.82], w: 3.4, h: 0.42, text: 'RECARGAS · CHURROS · REFRESCOS', fg: '#f3e9cf', bg: '#9b2226' },
    );
    // ---- paredes de los lados (ladrillo repellado con zócalo); abiertas donde pasa la acera
    for (const s of [-1, 1]) {
      pcs.push(
        bx(s * 7.5, 1, 1.8, 0.3, 2, 10.4, 'stucco', '#e9c99a', sin),
        bx(s * (7.5 - 0.17), 0.4, 1.8, 0.04, 0.8, 10.4, 'stucco', '#a6695a', sin),
        bx(s * 7.5, 2.04, 1.8, 0.38, 0.08, 10.5, 'concrete', '#efe7d6', sin),
        // ladrillos a la vista donde se cayó el repello
        bx(s * (7.5 - 0.16), 1.45, 4.4, 0.03, 0.4, 0.7, 'brick', '#a86a48', sin),
      );
      estante(pcs, s * 7.33, s, 6.7, -3.2, r);
    }
    // ---- mostrador: tablas verticales hacia adentro, tablero de formica, vitrina de dulces y la reja
    pcs.push(bx(0, 0.68, -3.7, 11, 1.36, 0.6, 'wood', '#a35f36', sin));
    for (let x = -5.4; x <= 5.41; x += 0.3)
      pcs.push(bx(x, 0.66, -3.39, 0.27, 1.26, 0.03, 'wood', TABLA[Math.floor(r() * 3)], sin));
    pcs.push(
      bx(0, 1.38, -3.7, 11.2, 0.05, 0.78, 'plastic', '#d8cfb8', sin),
      bx(0, 0.06, -3.36, 11, 0.12, 0.06, 'wood', '#4f3420', sin),
    );
    // reja de barrotes del lado de la acera, con ventanillas en los tres puestos
    const zr = -3.98;
    pcs.push(
      bx(0, 2.6, zr, 11, 0.06, 0.06, 'metal', '#1f2124', sin),
      bx(0, 1.43, zr, 11, 0.05, 0.05, 'metal', '#1f2124', sin),
    );
    for (let x = -5.45; x <= 5.46; x += 0.16) {
      const ventana = [-3, 0, 3].some((v) => Math.abs(x - v) < 0.48);
      if (ventana) {
        pcs.push(bx(x, 2.38, zr, 0.022, 0.44, 0.022, 'metal', '#1f2124', sin));
        continue;
      }
      pcs.push(bx(x, 2.02, zr, 0.022, 1.16, 0.022, 'metal', '#1f2124', sin));
    }
    for (const v of [-3, 0, 3])
      pcs.push(
        bx(v, 2.15, zr, 1.0, 0.05, 0.05, 'metal', '#1f2124', sin),
        bx(v - 0.5, 1.8, zr, 0.05, 0.75, 0.05, 'metal', '#1f2124', sin),
        bx(v + 0.5, 1.8, zr, 0.05, 0.75, 0.05, 'metal', '#1f2124', sin),
      );
    // encima del mostrador: frascos de dulces, la pesa y la caja del pisto
    for (const [x, c] of [
      [-1.6, '#e74c3c'],
      [-1.2, '#f1c40f'],
      [1.3, '#8e44ad'],
      [1.7, '#27ae60'],
    ] as [number, string][])
      pcs.push(
        cy(x, 1.55, -3.6, 0.13, 0.3, 'glass', '#cfe6ea', { n: 10, ...sin }),
        cy(x, 1.5, -3.6, 0.11, 0.2, 'plastic', c, { n: 10, ...sin }),
        cy(x, 1.72, -3.6, 0.1, 0.05, 'metal', '#c9ced3', { n: 10, ...sin }),
      );
    pcs.push(
      bx(4.6, 1.48, -3.62, 0.5, 0.14, 0.4, 'metal', '#c9ced3', sin),
      cy(4.6, 1.62, -3.62, 0.18, 0.03, 'metal', '#e0e3e6', { n: 14, ...sin }),
      bx(-4.4, 1.5, -3.6, 0.55, 0.2, 0.38, 'wood', '#5e3d22', sin),
      bx(-4.4, 1.62, -3.6, 0.5, 0.04, 0.33, 'plastic', '#e9e2cf', sin),
    );
    // ---- comal de las baleadas: mesa de concreto con azulejo y lo que lleva la baleada
    pcs.push(
      bx(-5, 0.62, 0.3, 2, 1.24, 1, 'concrete', '#d9d4c7', sin),
      bx(-5, 0.62, 0.81, 2.02, 1.0, 0.03, 'tile', '#3f7fa8', sin),
      bx(-5, 1.27, 0.3, 2.06, 0.06, 1.04, 'tile', '#e9e6dc', sin),
      cy(-5.82, 1.33, -0.05, 0.16, 0.05, 'cloth', '#efe2c4', { n: 12, ...sin }),
      cy(-5.82, 1.37, -0.05, 0.16, 0.03, 'cloth', '#efe2c4', { n: 12, ...sin }),
      cy(-4.18, 1.36, 0.0, 0.14, 0.12, 'plastic', '#e9ecef', { n: 12, ...sin }),
      cy(-4.18, 1.42, 0.0, 0.11, 0.02, 'sand', '#6b2d1f', { n: 12, ...sin }),
    );
    // ---- vitrina del pan y su estante
    pcs.push(
      bx(-5, 0.62, -2.7, 2, 1.24, 1, 'wood', '#8a5a32', sin),
      bx(-5, 1.27, -2.7, 2.04, 0.05, 1.04, 'wood', '#6d4628', sin),
      bx(-5.95, 1.95, -3.05, 0.06, 1.3, 0.5, 'wood', '#5e3d22', sin),
      bx(-4.05, 1.95, -3.05, 0.06, 1.3, 0.5, 'wood', '#5e3d22', sin),
    );
    for (const y of [1.55, 2.05, 2.55]) {
      pcs.push(bx(-5, y, -3.05, 1.95, 0.04, 0.5, 'wood', '#7c4f2b', sin));
      for (let k = 0; k < 6; k++)
        pcs.push(
          bl(-5.75 + k * 0.3, y + 0.1, -3.05, 0.12, 'cloth', k % 2 ? '#d98e47' : '#e2a865', { s: [1.1, 0.7, 1.3] }),
        );
    }
    // ---- churrera: mesa con un tubo encima del que cuelgan las bolsitas
    pcs.push(
      bx(5, 0.62, 2.3, 2, 1.24, 1, 'wood', '#8a5a32', sin),
      bx(5, 1.27, 2.3, 2.04, 0.05, 1.04, 'wood', '#6d4628', sin),
      bx(4.1, 1.85, 2.0, 0.05, 1.2, 0.05, 'metal', '#9aa0a6', sin),
      bx(5.9, 1.85, 2.0, 0.05, 1.2, 0.05, 'metal', '#9aa0a6', sin),
      bx(5, 2.43, 2.0, 1.85, 0.04, 0.04, 'metal', '#9aa0a6', sin),
    );
    for (let k = 0; k < 8; k++)
      pcs.push(
        bx(
          4.25 + k * 0.215,
          2.18,
          2.0,
          0.17,
          0.42,
          0.05,
          'plastic',
          ['#e74c3c', '#f1c40f', '#27ae60', '#e67e22'][k % 4],
          sin,
        ),
      );
    // ---- refri: hielera horizontal con tapa de vidrio abajo y el refri de puerta de vidrio arriba
    pcs.push(
      bx(5, 0.62, -1.7, 2, 1.24, 1, 'metal', '#e9eef0', sin),
      bx(5, 0.3, -1.19, 2.02, 0.5, 0.03, 'metal', '#c0392b', sin),
      bx(5, 1.27, -1.7, 1.8, 0.03, 0.8, 'glass', '#a9d6df', sin),
      bx(5, 1.9, -2.15, 1.95, 1.85, 0.18, 'metal', '#e9eef0', sin),
      bx(5, 2.88, -2.08, 1.95, 0.22, 0.3, 'metal', '#c0392b', sin),
      bx(5, 2.88, -1.92, 1.6, 0.14, 0.02, 'plastic', '#fff6d6', { em: -0.9, ...sin }),
    );
    for (let i = 0; i < 10; i++)
      pcs.push(
        cy(4.3 + (i % 5) * 0.35, 1.12, -1.9 + Math.floor(i / 5) * 0.4, 0.05, 0.26, 'plastic', COLORES[i % 5], {
          n: 8,
          ...sin,
        }),
      );
    for (const y of [1.25, 1.75, 2.25])
      for (let k = 0; k < 7; k++)
        pcs.push(
          cy(4.25 + k * 0.25, y + 0.15, -2.06, 0.045, 0.3, 'plastic', COLORES[(k + Math.round(y * 3)) % 7], {
            n: 8,
            ...sin,
          }),
        );
    // ---- sacos, huacales, guineos y cosas del piso (fuera de donde camina el pulpero)
    saco(pcs, -6.3, 6.5, '#7a1f1f');
    saco(pcs, -5.6, 6.65, '#ece6d6');
    saco(pcs, -6.2, 5.85, '#e8b923');
    huacal(pcs, 6.25, 6.55, '#d63b2f', r);
    huacal(pcs, 5.55, 6.6, '#e9d8a6', r);
    huacal(pcs, 6.25, 5.95, '#4f8a3a', r);
    pcs.push(
      cy(3.6, 0.5, 6.7, 0.28, 1.0, 'metal', '#2d6cdf', { n: 14, ...sin }),
      cy(3.6, 1.05, 6.7, 0.1, 0.1, 'metal', '#9aa0a6', { n: 8, ...sin }),
      bx(-3.8, 0.35, 6.6, 0.9, 0.7, 0.5, 'plastic', '#c62828', sin),
      bx(-3.8, 0.73, 6.6, 0.92, 0.06, 0.52, 'plastic', '#ecf0f1', sin),
    );
    // racimo de guineos colgado de un mecate junto al comal
    pcs.push(bx(-6.6, 2.4, -1.2, 0.02, 1.0, 0.02, 'cloth', '#c9b07a', sin));
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4,
        y = 1.65 + (i % 5) * 0.1;
      pcs.push(
        bl(-6.6 + Math.cos(a) * 0.16, y, -1.2 + Math.sin(a) * 0.16, 0.06, 'plastic', i % 4 ? '#e8c547' : '#9cb84a', {
          s: [0.8, 2.4, 0.8],
        }),
      );
    }
    // tierrita y cáscaras en las esquinas
    for (let i = 0; i < 6; i++)
      pcs.push(rk(-7 + r() * 14, 0.01, -6.6 + r() * 0.4, 0.08 + r() * 0.08, 'stone', '#8c8478'));
    return { pcs, rot };
  }, []);
  return (
    <>
      <Fundido pcs={pcs} />
      <Rotulos items={rot} />
      <Objeto k="olla" pos={[-5.82, 1.3, 0.68] as V3} scale={0.6} />
      <Objeto k="canasta" pos={[-4.35, 1.3, -2.55] as V3} scale={0.7} />
    </>
  );
}
