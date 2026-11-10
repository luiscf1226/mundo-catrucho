// Utilería HD · vehículos: bus amarillo, mototaxi, pickup y lancha. El FRENTE de todos mira a −Z (así los
// maneja PlayerController). El asiento del conductor queda en el origen, a 0.55 m del suelo.
import * as THREE from 'three';
import type { V3 } from '../../../../core/types';
import { Placed } from '../base';
import type { ArtProps } from '../types';
import { Builder, gTube, type Paint, tint, twoSided } from './geo';
import { cached, Merged, solidBox } from './pk';

const RUBBER: Paint = { k: 'asphalt', c: '#232326', r: 0.85 },
  CHROME: Paint = { k: 'metal', c: '#dfe3e8', r: 0.22 },
  DARK: Paint = { c: '#1d1f24', r: 0.5 },
  GLASS: Paint = { c: '#22364a', r: 0.1, e: 0.7 };
const HEAD: Paint = { c: '#fff6d8', r: 0.2, e: 2.6 },
  TAIL: Paint = { c: '#e02020', r: 0.3, e: -0.7 };
function wheel(b: Builder, x: number, y: number, z: number, r: number, w: number, hub = '#d9dde2') {
  const s = Math.sign(x) || 1;
  b.cyl(r, r, w, RUBBER, [x, y, z], [0, 0, Math.PI / 2], 18);
  b.add(new THREE.TorusGeometry(r - 0.045, 0.05, 6, 18), RUBBER, {
    p: [x + s * w * 0.42, y, z],
    r: [0, Math.PI / 2, 0],
  });
  b.cyl(
    r * 0.6,
    r * 0.6,
    0.04,
    { k: 'metal', c: hub, r: 0.3 },
    [x + s * (w / 2 + 0.005), y, z],
    [0, 0, Math.PI / 2],
    12,
  );
  b.sph(r * 0.2, { k: 'metal', c: '#8a8f96' }, [x + s * (w / 2 + 0.02), y, z], [0.6, 1, 1], 8, 6);
}

const busGeo = (color: string) =>
  cached(`bus|${color}`, () => {
    const b = new Builder(),
      body: Paint = { c: color, r: 0.34 },
      dk = tint(color, 0.8);
    b.box(2.4, 2.05, 4.78, { ...body, g: [0.5, 1.2, 0.86] }, [0, 1.6, 0.6], undefined, 0.16);
    b.box(2.02, 1.02, 1.36, body, [0, 1.08, -2.3], undefined, 0.2);
    b.box(2.24, 0.12, 4.4, { c: '#f6f6f2', r: 0.4 }, [0, 2.65, 0.6], undefined, 0.05);
    b.box(2.3, 0.3, 5.9, DARK, [0, 0.62, 0.02], undefined, 0.06);
    for (const s of [-1, 1]) {
      for (let i = s > 0 ? 1 : 0; i < 7; i++)
        b.box(0.05, 0.6, 0.55, GLASS, [s * 1.185, 2.05, -1.33 + i * 0.67], undefined, 0.02);
      b.box(0.03, 0.09, 4.5, DARK, [s * 1.203, 1.4, 0.6], undefined, 0);
      b.box(0.03, 0.06, 4.5, DARK, [s * 1.203, 1.24, 0.6], undefined, 0);
      b.box(0.03, 0.16, 4.5, { c: '#d62828', r: 0.4 }, [s * 1.203, 0.98, 0.6], undefined, 0);
      b.box(0.03, 0.06, 4.5, { c: '#0d6fd0', r: 0.4 }, [s * 1.203, 0.84, 0.6], undefined, 0);
      b.cyl(0.14, 0.14, 0.07, HEAD, [s * 0.7, 1.12, -2.97], [Math.PI / 2, 0, 0], 12);
      b.cyl(0.07, 0.07, 0.06, { c: '#ffb020', r: 0.3, e: -0.4 }, [s * 0.9, 0.86, -2.96], [Math.PI / 2, 0, 0], 8);
      b.box(0.22, 0.3, 0.05, TAIL, [s * 0.95, 1.1, 2.985], undefined, 0.02);
      b.box(0.16, 0.16, 0.05, { c: '#ffb020', r: 0.3, e: -0.4 }, [s * 0.95, 1.42, 2.985], undefined, 0.02);
      b.add(
        gTube(
          [
            [s * 1.15, 2.2, -1.7],
            [s * 1.5, 2.1, -1.85],
            [s * 1.5, 1.9, -1.85],
          ],
          0.025,
          5,
        ),
        DARK,
      );
      b.box(0.06, 0.3, 0.2, DARK, [s * 1.5, 1.8, -1.85], undefined, 0.02);
      wheel(b, s * 1.06, 0.5, -1.95, 0.5, 0.34, '#f2c230');
      wheel(b, s * 1.06, 0.5, 1.9, 0.5, 0.34, '#f2c230');
      b.add(
        gTube(
          [
            [s * 1.0, 2.8, -1.4],
            [s * 1.0, 2.86, -1.3],
            [s * 1.0, 2.86, 2.5],
            [s * 1.0, 2.8, 2.6],
          ],
          0.03,
          5,
        ),
        CHROME,
      );
      for (let i = 0; i < 4; i++) b.cyl(0.02, 0.02, 0.16, CHROME, [s * 1.0, 2.78, -1.2 + i * 1.2], undefined, 5);
    }
    b.box(0.05, 1.72, 0.74, { c: dk, r: 0.4 }, [1.19, 1.5, -1.36], undefined, 0.02);
    for (const z of [-1.53, -1.19]) b.box(0.06, 1.0, 0.26, GLASS, [1.19, 1.78, z], undefined, 0);
    b.box(2.06, 0.74, 0.06, GLASS, [0, 2.06, -1.8], [0.1, 0, 0], 0.03);
    b.box(0.05, 0.74, 0.07, body, [0, 2.06, -1.81], [0.1, 0, 0], 0);
    b.box(1.5, 0.52, 0.05, GLASS, [0, 2.1, 2.985], undefined, 0.02);
    b.box(1.7, 0.27, 0.1, { c: '#ffffff', r: 0.4 }, [0, 2.5, -1.82], undefined, 0.03);
    b.box(0.5, 0.17, 0.11, { c: '#0d6fd0' }, [-0.5, 2.5, -1.83], undefined, 0.02);
    b.box(0.5, 0.17, 0.11, { c: '#d62828' }, [0.5, 2.5, -1.83], undefined, 0.02);
    b.box(1.2, 0.52, 0.06, DARK, [0, 1.06, -2.97], undefined, 0.03);
    for (let i = 0; i < 5; i++) b.box(1.1, 0.03, 0.03, CHROME, [0, 0.88 + i * 0.09, -3.0], undefined, 0);
    b.box(2.34, 0.2, 0.2, CHROME, [0, 0.56, -2.98], undefined, 0.06);
    b.box(2.34, 0.2, 0.2, CHROME, [0, 0.56, 3.0], undefined, 0.06);
    // parrilla con equipaje
    b.box(0.9, 0.36, 0.7, { k: 'cloth', c: '#2f6fb8' }, [-0.3, 2.9, -0.3], [0, 0.1, 0], 0.12);
    b.box(0.7, 0.3, 0.6, { k: 'cloth', c: '#b5623b' }, [0.45, 2.87, 0.6], [0, -0.2, 0], 0.1);
    b.box(0.6, 0.4, 0.5, { k: 'wood', c: '#b07a45' }, [-0.4, 2.92, 1.5], undefined, 0.03);
    b.sph(0.26, { k: 'straw', c: '#d9b56a' }, [0.4, 2.92, 1.9], [1, 0.8, 1], 10, 8);
    for (const z of [-1.3, 0.4, 2.5])
      b.add(
        gTube(
          [
            [-1.0, 2.86, z],
            [1.0, 2.86, z],
          ],
          0.02,
          5,
        ),
        CHROME,
      );
    return b.build();
  });

const mototaxiGeo = (color: string) =>
  cached(`mototaxi|${color}`, () => {
    const b = new Builder(),
      body: Paint = { c: color, r: 0.34 },
      canopy: Paint = { k: 'cloth', c: '#ffd23f' },
      seat: Paint = { c: '#2a2422', r: 0.6 };
    // rueda delantera, horquilla y manubrio
    wheel(b, 0.07, 0.3, -1.0, 0.3, 0.14);
    wheel(b, -0.07, 0.3, -1.0, 0.3, 0.001);
    for (const s of [-1, 1])
      b.add(
        gTube(
          [
            [s * 0.11, 0.3, -1.0],
            [s * 0.11, 0.7, -0.86],
            [s * 0.06, 0.92, -0.78],
          ],
          0.025,
          6,
        ),
        CHROME,
      );
    b.add(new THREE.TorusGeometry(0.34, 0.07, 6, 12, Math.PI), body, {
      p: [0, 0.3, -1.0],
      r: [0, Math.PI / 2, 0],
      s: [1, 1, 1.6],
    });
    b.add(
      gTube(
        [
          [-0.36, 0.9, -0.5],
          [-0.2, 0.93, -0.66],
          [0, 0.94, -0.72],
          [0.2, 0.93, -0.66],
          [0.36, 0.9, -0.5],
        ],
        0.022,
        6,
      ),
      CHROME,
    );
    for (const s of [-1, 1]) b.cyl(0.03, 0.03, 0.12, DARK, [s * 0.36, 0.895, -0.47], [1.0, 0, 0], 6);
    b.box(0.86, 0.72, 0.12, body, [0, 0.72, -0.74], [-0.28, 0, 0], 0.06);
    b.sph(0.1, HEAD, [0, 0.93, -0.84], [1, 1, 0.5], 10, 8);
    b.cyl(0.11, 0.11, 0.04, CHROME, [0, 0.93, -0.82], [Math.PI / 2, 0, 0], 10);
    // piso, asiento del conductor y caja trasera
    b.box(1.34, 0.1, 2.0, DARK, [0, 0.4, 0.22], undefined, 0.03);
    b.box(0.44, 0.14, 0.9, body, [0, 0.47, -0.34], undefined, 0.05);
    b.box(0.56, 0.13, 0.46, seat, [0, 0.485, 0.04], undefined, 0.05);
    for (const s of [-1, 1]) {
      b.box(0.07, 0.62, 1.1, { ...body, g: [0.4, 0.9, 0.85] }, [s * 0.7, 0.74, 0.74], undefined, 0.03);
      b.box(0.03, 0.1, 1.06, { c: '#00bce4', r: 0.4 }, [s * 0.738, 0.86, 0.74], undefined, 0);
      b.box(0.03, 0.05, 1.06, { c: '#ffffff', r: 0.4 }, [s * 0.74, 0.86, 0.74], undefined, 0);
      wheel(b, s * 0.7, 0.3, 0.86, 0.3, 0.16);
      b.box(0.2, 0.06, 0.74, body, [s * 0.74, 0.64, 0.86], undefined, 0.02);
    }
    b.box(1.46, 0.62, 0.07, body, [0, 0.74, 1.27], undefined, 0.03);
    b.box(1.3, 0.14, 0.46, seat, [0, 0.62, 0.92], undefined, 0.05);
    b.box(1.3, 0.5, 0.1, seat, [0, 0.95, 1.18], [0.12, 0, 0], 0.05);
    b.box(0.36, 0.14, 0.03, { c: '#ffffff', r: 0.4 }, [0, 0.6, 1.31], undefined, 0);
    for (const s of [-1, 1]) b.box(0.12, 0.1, 0.04, TAIL, [s * 0.55, 0.9, 1.31], undefined, 0.01);
    // toldo
    b.box(1.56, 0.07, 2.2, canopy, [0, 1.84, 0.08], undefined, 0.03);
    b.box(1.56, 0.16, 0.05, canopy, [0, 1.76, -1.02], [0.3, 0, 0], 0.02);
    b.box(1.46, 0.74, 0.04, canopy, [0, 1.44, 1.19], undefined, 0.02);
    b.box(0.8, 0.3, 0.05, DARK, [0, 1.5, 1.19], undefined, 0.02);
    for (const s of [-1, 1]) {
      b.add(
        gTube(
          [
            [s * 0.42, 0.98, -0.82],
            [s * 0.6, 1.4, -0.92],
            [s * 0.72, 1.82, -0.96],
          ],
          0.022,
          5,
        ),
        CHROME,
      );
      b.add(
        gTube(
          [
            [s * 0.72, 1.05, 1.24],
            [s * 0.74, 1.82, 1.14],
          ],
          0.022,
          5,
        ),
        CHROME,
      );
      b.add(
        gTube(
          [
            [s * 0.72, 1.04, 0.24],
            [s * 0.74, 1.82, 0.2],
          ],
          0.022,
          5,
        ),
        CHROME,
      );
      for (let i = 0; i < 9; i++)
        b.sph(
          0.04,
          { c: ['#e63946', '#00bce4', '#ffffff'][i % 3] },
          [s * 0.78, 1.78, -0.9 + i * 0.24],
          [0.5, 1.2, 1],
          6,
          4,
        );
    }
    return b.build();
  });

const carGeo = (color: string) =>
  cached(`car|${color}`, () => {
    const b = new Builder(),
      body: Paint = { c: color, r: 0.3 },
      dk: Paint = { c: tint(color, 0.7), r: 0.4 };
    b.box(1.9, 0.62, 4.2, { ...body, g: [0.3, 0.8, 0.82] }, [0, 0.7, 0], undefined, 0.14);
    b.box(1.72, 0.12, 1.1, body, [0, 1.02, -1.5], undefined, 0.05);
    b.box(1.98, 0.14, 4.1, DARK, [0, 0.43, 0], undefined, 0.04);
    // cabina abierta: parales, techo y respaldo
    b.box(1.76, 0.08, 1.3, body, [0, 1.76, -0.14], undefined, 0.04);
    b.box(1.84, 0.1, 0.12, dk, [0, 1.06, -0.93], undefined, 0.03);
    b.box(1.84, 0.34, 0.09, body, [0, 1.16, 0.52], undefined, 0.03);
    for (const s of [-1, 1]) {
      b.add(
        gTube(
          [
            [s * 0.88, 1.0, -0.95],
            [s * 0.84, 1.74, -0.66],
          ],
          0.04,
          6,
        ),
        body,
      );
      b.add(
        gTube(
          [
            [s * 0.88, 1.0, 0.52],
            [s * 0.84, 1.74, 0.46],
          ],
          0.045,
          6,
        ),
        body,
      );
      b.box(0.07, 0.1, 1.44, body, [s * 0.9, 1.04, -0.2], undefined, 0.02);
      b.box(0.1, 0.14, 0.2, DARK, [s * 1.02, 1.16, -0.86], undefined, 0.03);
      b.box(0.08, 0.34, 1.52, body, [s * 0.91, 1.17, 1.33], undefined, 0.03);
      b.box(0.5, 0.2, 0.86, DARK, [s * 0.76, 0.44, -1.3], undefined, 0.08);
      b.box(0.5, 0.2, 0.86, DARK, [s * 0.76, 0.44, 1.3], undefined, 0.08);
      wheel(b, s * 0.86, 0.4, -1.3, 0.4, 0.28);
      wheel(b, s * 0.86, 0.4, 1.3, 0.4, 0.28);
      b.box(0.3, 0.16, 0.06, HEAD, [s * 0.68, 0.82, -2.09], undefined, 0.03);
      b.box(0.14, 0.1, 0.06, { c: '#ffb020', r: 0.3, e: -0.4 }, [s * 0.68, 0.66, -2.09], undefined, 0.02);
      b.box(0.14, 0.3, 0.05, TAIL, [s * 0.86, 0.84, 2.09], undefined, 0.02);
    }
    b.box(0.05, 0.62, 0.05, body, [0, 1.42, -0.8], [0.37, 0, 0], 0);
    b.add(new THREE.TorusGeometry(0.17, 0.022, 6, 14), DARK, { p: [0, 0.98, -0.52], r: [-0.5, 0, 0] });
    b.box(1.5, 0.12, 0.5, { c: '#3a2c24', r: 0.7 }, [0, 0.5, 0.16], undefined, 0.04);
    b.box(1.6, 0.5, 0.1, { c: '#3a2c24', r: 0.7 }, [0, 1.3, 0.44], undefined, 0.04);
    b.box(0.7, 0.3, 0.03, GLASS, [0, 1.52, 0.5], undefined, 0);
    b.box(1.9, 0.34, 0.08, body, [0, 1.17, 2.06], undefined, 0.03);
    b.box(1.7, 0.03, 1.5, DARK, [0, 1.02, 1.3], undefined, 0);
    b.box(1.3, 0.3, 0.06, DARK, [0, 0.8, -2.09], undefined, 0.03);
    for (let i = 0; i < 3; i++) b.box(1.2, 0.03, 0.03, CHROME, [0, 0.72 + i * 0.08, -2.12], undefined, 0);
    b.box(1.96, 0.16, 0.16, CHROME, [0, 0.5, -2.1], undefined, 0.05);
    b.box(1.96, 0.16, 0.16, CHROME, [0, 0.5, 2.1], undefined, 0.05);
    b.box(0.42, 0.14, 0.03, { c: '#ffffff' }, [0, 0.66, 2.11], undefined, 0);
    // carga: sacos, hielera y racimos de guineo verde
    b.box(0.6, 0.3, 0.44, { k: 'cloth', c: '#c9b28a' }, [-0.45, 1.19, 1.0], [0, 0.2, 0], 0.12);
    b.box(0.6, 0.28, 0.44, { k: 'cloth', c: '#bda57c' }, [-0.4, 1.42, 1.06], [0, -0.3, 0.1], 0.12);
    b.box(0.5, 0.34, 0.4, { c: '#2f8fd0', r: 0.4 }, [0.48, 1.2, 0.92], undefined, 0.05);
    b.box(0.52, 0.06, 0.42, { c: '#f4f4f4', r: 0.4 }, [0.48, 1.4, 0.92], undefined, 0.02);
    for (let k = 0; k < 2; k++)
      for (let i = 0; i < 12; i++) {
        const a = i * 0.9,
          r = 0.1 + (i % 3) * 0.03;
        b.sph(
          0.07,
          { c: i % 4 === 0 ? '#9ac23c' : '#6fae2e', r: 0.5 },
          [0.1 + k * 0.4 + Math.cos(a) * r, 1.12 + (i % 4) * 0.06, 1.62 + Math.sin(a) * r + k * 0.1],
          [0.7, 0.7, 1.5],
          6,
          4,
          [0, a, 0.4],
        );
      }
    return b.build();
  });

const boatGeo = (color: string) =>
  cached(`boat|${color}`, () => {
    const b = new Builder(),
      N = 12,
      M = 8,
      pos: number[] = [],
      uv: number[] = [],
      idx: number[] = [],
      L = 3.6,
      port: V3[] = [],
      star: V3[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N,
        z = -L / 2 + L * t,
        hw =
          0.62 *
          Math.sin(Math.min(1, t * 1.35 + 0.02) * Math.PI * 0.5) ** 0.75 *
          (1 - (0.14 * Math.max(0, t - 0.7)) / 0.3),
        yk = 0.04 + 0.32 * (1 - t) ** 3,
        yg = 0.56 + 0.2 * (1 - t) ** 2;
      for (let j = 0; j <= M; j++) {
        const a = (j / M - 0.5) * Math.PI;
        pos.push(hw * Math.sin(a), yg - (yg - yk) * Math.cos(a) ** 0.7, z);
        uv.push(t, j / M);
      }
      port.push([-hw, yg, z]);
      star.push([hw, yg, z]);
    }
    for (let i = 0; i < N; i++)
      for (let j = 0; j < M; j++) {
        const a = i * (M + 1) + j,
          c = a + 1,
          d = a + M + 1,
          e = d + 1;
        idx.push(a, d, e, a, e, c);
      }
    const hull = new THREE.BufferGeometry();
    hull.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    hull.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    hull.setIndex(idx);
    hull.computeVertexNormals();
    b.add(twoSided(hull), { k: 'wood', c: color, r: 0.5, g: [0, 0.5, 0.8] });
    b.add(gTube(port, 0.04, 6), { k: 'wood', c: '#f4f1e8' });
    b.add(gTube(star, 0.04, 6), { k: 'wood', c: '#f4f1e8' });
    b.add(
      gTube(
        port.map((p) => [p[0] * 0.985, p[1] - 0.09, p[2]] as V3),
        0.025,
        5,
      ),
      { c: '#e63946', r: 0.5 },
    );
    b.add(
      gTube(
        star.map((p) => [p[0] * 0.985, p[1] - 0.09, p[2]] as V3),
        0.025,
        5,
      ),
      { c: '#e63946', r: 0.5 },
    );
    b.box(1.06, 0.5, 0.06, { k: 'wood', c: tint(color, 0.85) }, [0, 0.33, L / 2 - 0.02], undefined, 0.02);
    for (const z of [-0.5, 0.55]) b.box(1.08, 0.06, 0.28, { k: 'wood', c: '#a8743f' }, [0, 0.42, z], undefined, 0.02);
    b.box(0.7, 0.04, 2.6, { k: 'wood', c: '#8a5a34' }, [0, 0.12, 0.2], undefined, 0);
    b.box(0.22, 0.34, 0.26, DARK, [0, 0.72, L / 2 + 0.12], undefined, 0.06);
    b.box(0.2, 0.08, 0.24, { c: '#d62828', r: 0.4 }, [0, 0.86, L / 2 + 0.12], undefined, 0.03);
    b.cyl(0.03, 0.03, 0.62, CHROME, [0, 0.3, L / 2 + 0.16], undefined, 6);
    b.add(
      gTube(
        [
          [0, 0.78, L / 2],
          [0.1, 0.84, L / 2 - 0.4],
        ],
        0.02,
        5,
      ),
      DARK,
    );
    b.add(
      gTube(
        [
          [0.3, 0.46, -0.9],
          [0.34, 0.5, 0.6],
        ],
        0.022,
        5,
      ),
      { k: 'wood', c: '#c9a063' },
    );
    b.sph(0.1, { k: 'wood', c: '#c9a063' }, [0.34, 0.5, 0.74], [1, 0.25, 1.9], 8, 6);
    return b.build();
  });

export const props3: Pick<ArtProps, 'Bus' | 'Mototaxi' | 'Car' | 'Boat'> = {
  Bus: (a) => {
    solidBox(a, 2.4, 2.6, 6);
    return (
      <Placed {...a}>
        <Merged g={busGeo(a.color ?? '#ffd23f')} />
      </Placed>
    );
  },
  Mototaxi: (a) => {
    solidBox(a, 1.5, 1.8, 2.6);
    return (
      <Placed {...a}>
        <Merged g={mototaxiGeo(a.color ?? '#e63946')} />
      </Placed>
    );
  },
  Car: (a) => {
    solidBox(a, 1.9, 1.4, 4.2);
    return (
      <Placed {...a}>
        <Merged g={carGeo(a.color ?? '#ffffff')} />
      </Placed>
    );
  },
  Boat: (a) => (
    <Placed {...a}>
      <Merged g={boatGeo(a.color ?? '#1d7fc7')} />
    </Placed>
  ),
};
