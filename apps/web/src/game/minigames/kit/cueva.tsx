// Cueva de los minijuegos (paquete HD): cámara de roca con forma alrededor del claro donde se juega, techo bajo
// que se mete a los lados, estalactitas y estalagmitas de calcita, columnas, coladas, piso disparejo con lajas y
// charcos que reflejan, y roca mojada que brilla donde escurre el agua. Todo decorado sin colisión, en una malla
// fusionada más los charcos. Sin malla fusionada (Roblox) no dibuja nada.
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bl, cy, mergePieces, type Pc, rk } from '../../dept/lib';
import { art } from '../../kit';
import type { Rect } from './Paisaje';

const ROCA = ['#4a433c', '#564d44', '#3f3933', '#5d5349'],
  MOJADA = '#2f2a26',
  CALCITA = ['#d8ccb4', '#c7b89c', '#b3a487', '#e6dcc8'],
  PISO = ['#3d3731', '#47403a', '#352f2a'];

function azar(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const fuera = (x: number, z: number, c: Rect, m: number) =>
  x < c[0] - m || x > c[1] + m || z < c[2] - m || z > c[3] + m;

/** Cámara de cueva alrededor del `claro` (rectángulo [x0, x1, z0, z1] donde se juega, sin nada encima). */
export function Cueva({ claro = [-9.5, 10.5, -7, 7] as Rect, seed = 3 }: { claro?: Rect; seed?: number }) {
  const hecho = useMemo(() => {
    const F = art.fused;
    if (!F) return null;
    const r = azar(seed * 977 + 13),
      pcs: Pc[] = [];
    const roca = () => ROCA[Math.floor(r() * ROCA.length)],
      calcita = () => CALCITA[Math.floor(r() * CALCITA.length)];
    // la cámara de juego mira desde +Z y arriba (y ≈ 11): las paredes quedan dentro del cuadro (atrás z ≈ −14,
    // lados x ≈ ±15) y nada cuelga entre la cámara y el claro
    /** n puntos al azar en [x0, x1] × [z0, z1] fuera del claro (con margen m) */
    const puntos = (n: number, x0: number, x1: number, z0: number, z1: number, m: number) => {
      const out: [number, number][] = [];
      for (let t = 0; t < n * 20 && out.length < n; t++) {
        const x = x0 + r() * (x1 - x0),
          z = z0 + r() * (z1 - z0);
        if (fuera(x, z, claro, m)) out.push([x, z]);
      }
      return out;
    };
    const libre = (x: number, z: number, y: number) => z < -4 || Math.abs(x) > 11.5 || y < 6;
    // paredes: rocas grandes en anillo, más altas atrás, que se juntan con el techo
    for (let i = 0; i < 54; i++) {
      const a = Math.PI + (i / 54) * Math.PI * 1.25 - Math.PI * 0.125 + r() * 0.05,
        x = Math.cos(a) * (15.5 + r() * 3),
        z = Math.sin(a) * (9.5 + r() * 2.5) - 3.5;
      const atras = z < -8,
        sc = 3.2 + r() * 2.8,
        alto = atras ? 8 + r() * 5 : 5 + r() * 4;
      pcs.push(rk(x, alto * 0.32, z, sc, 'stone', roca(), { s: [1.15, alto / sc, 1], r: r() * 6.28 }));
    }
    for (const s of [-1, 1])
      for (let i = 0; i < 9; i++) {
        const z = -2 + i * 2.2,
          sc = 2.6 + r() * 2;
        pcs.push(
          rk(s * (16 + r() * 2.5), sc * 0.9, z, sc, 'stone', roca(), { s: [1, 1.7 + r() * 0.8, 1.1], r: r() * 6.28 }),
        );
      }
    // rocas medianas al pie de las paredes y peñascos sueltos cerca del claro
    for (const [x, z] of puntos(70, -16, 16, -14, 10, 1.4)) {
      const lejos = Math.abs(x) > 12 || z < -10,
        sc = 0.3 + r() * (lejos ? 1.6 : 0.6),
        mojada = r() < 0.25;
      pcs.push(
        rk(x, sc * 0.2, z, sc, mojada ? 'plastic' : 'stone', mojada ? MOJADA : roca(), {
          s: [1.1, 0.7 + r() * 0.5, 1],
          r: r() * 6.28,
        }),
      );
    }
    // techo: losas de roca que cierran la bóveda por encima de las paredes
    for (let i = 0; i < 26; i++) {
      const a = Math.PI + (i / 26) * Math.PI * 1.25 - Math.PI * 0.125,
        x = Math.cos(a) * (13 + r() * 4),
        z = Math.sin(a) * (10 + r() * 3) - 4;
      pcs.push(rk(x, 13 + r() * 2, z, 5 + r() * 3, 'stone', roca(), { s: [1.3, 0.5, 1.1], r: r() * 6.28 }));
    }
    // estalactitas colgando de la bóveda del fondo y de los lados
    for (let i = 0; i < 90; i++) {
      const a = Math.PI + r() * Math.PI * 1.25 - Math.PI * 0.125,
        k = 0.55 + r() * 0.45,
        x = Math.cos(a) * 15 * k,
        z = Math.sin(a) * 11.5 * k - 3.5,
        techo = 11.5 + (1 - k) * 2,
        h = 0.8 + r() * 3,
        rr = 0.12 + h * 0.07,
        c = calcita();
      if (!libre(x, z, techo - h) || !fuera(x, z, claro, 2)) continue;
      pcs.push(
        cy(x, techo - h / 2, z, rr, h, 'stone', c, { rt: 0.03, n: 7, e: [Math.PI, 0, 0], solid: false }),
        cy(x, techo + 0.1, z, rr * 1.7, 0.7, 'stone', c, { rt: 0.6, n: 7, e: [Math.PI, 0, 0], solid: false }),
      );
    }
    // estalagmitas en el piso, más altas lejos del claro
    for (const [x, z] of [...puntos(45, -12.5, 12.5, -12.5, -7.6, 0.5), ...puntos(70, -15, 15, -13, 9, 0.9)]) {
      const lejos = Math.abs(x) > 11 || z < -9,
        h = 0.3 + r() * (lejos ? 2.6 : 0.9),
        rr = 0.1 + h * 0.13,
        c = calcita();
      pcs.push(
        cy(x, h / 2, z, rr, h, 'stone', c, { rt: 0.12, n: 7, solid: false, em: r() < 0.4 ? -0.3 : undefined }),
        cy(x, 0.1, z, rr * 1.7, 0.2, 'stone', c, { rt: 0.6, n: 7, solid: false }),
      );
      if (r() < 0.35)
        pcs.push(cy(x + rr * 1.3, h * 0.25, z + 0.2, rr * 0.6, h * 0.5, 'stone', c, { rt: 0.1, n: 6, solid: false }));
    }
    // columnas: estalactita y estalagmita que se juntaron (atrás y a los lados, enmarcan el claro)
    for (const [x, z, rr] of [
      [-10.5, -9, 0.7],
      [9.5, -10.5, 0.9],
      [-3.5, -12, 0.55],
      [4.5, -12.8, 0.6],
      [-13.5, -3, 0.8],
      [13.5, -2.5, 0.7],
    ] as [number, number, number][]) {
      const c = calcita(),
        H = 12.5;
      pcs.push(
        cy(x, H * 0.25, z, rr * 1.5, H * 0.5, 'stone', c, { rt: 0.45, n: 9, solid: false }),
        cy(x, H * 0.75, z, rr * 0.7, H * 0.5, 'stone', c, { rt: 2.1, n: 9, solid: false }),
        cy(x, 0.3, z, rr * 2.4, 0.6, 'stone', c, { rt: 0.5, n: 9, solid: false }),
      );
      // coladas: cortinas de calcita a media altura
      for (let k = 0; k < 4; k++)
        pcs.push(
          bl(
            x + Math.cos(k * 1.6) * rr * 1.1,
            H * (0.35 + k * 0.1),
            z + Math.sin(k * 1.6) * rr * 1.1,
            rr * 0.55,
            'stone',
            CALCITA[3],
            { s: [1, 1.6, 1] },
          ),
        );
    }
    // piso disparejo: lajas planas y cascajo
    for (const [x, z] of puntos(50, -15, 15, -13, 10, 0.3)) {
      pcs.push(
        rk(x, 0.0, z, 0.4 + r() * 0.9, 'stone', PISO[Math.floor(r() * PISO.length)], {
          s: [1.4, 0.08, 1.1],
          r: r() * 6.28,
        }),
      );
    }
    // charcos (agua quieta y oscura que refleja): fuera del claro, al pie de las estalactitas
    const charcos: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const x = (r() - 0.5) * 28,
        z = -12 + r() * 20;
      if (!fuera(x, z, claro, 0.6)) continue;
      const g = new THREE.CircleGeometry(1, 18);
      const p = g.attributes.position;
      for (let k = 1; k < p.count; k++) {
        const a = Math.atan2(p.getY(k), p.getX(k)),
          f = 1 + 0.25 * Math.sin(a * 3 + i) + 0.12 * Math.sin(a * 5 + i * 2);
        p.setXY(k, p.getX(k) * f, p.getY(k) * f);
      }
      g.scale(0.7 + r() * 1.3, 0.5 + r() * 0.9, 1);
      g.rotateX(-Math.PI / 2);
      g.translate(x, 0.035, z);
      charcos.push(g);
    }
    return {
      grupos: mergePieces(pcs, true),
      agua: charcos.length ? mergeGeometries(charcos) : null,
    };
  }, [seed, `${claro}`]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      for (const g of hecho?.grupos ?? []) g.geo.dispose();
      hecho?.agua?.dispose();
    },
    [hecho],
  );
  if (!hecho) return null;
  return (
    <>
      {hecho.grupos.map((g) => (
        <mesh key={g.key} geometry={g.geo} material={g.mat ?? art.material(g.m, g.c)} receiveShadow />
      ))}
      {hecho.agua && <mesh geometry={hecho.agua} material={art.material('water', '#24393b')} receiveShadow />}
    </>
  );
}
