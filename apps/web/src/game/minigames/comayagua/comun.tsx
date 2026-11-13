// Piezas compartidas por los motores de Comayagua: cursor, metas, escena base y figuras (engranaje, pilón, mango).
import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import type { V3 } from '../../../core/types';
import { Ball, Block, Cyl, Label, Spawn } from '../../kit';
import type { Partida } from '../api';

export const limitar = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v));
export const texto = (v: unknown, def: string) => (typeof v === 'string' && v.trim() ? v : def);
export const loco = (p: Partida) => p.tema.loco === true;
export const variante = (p: Partida) => (typeof p.tema.variante === 'string' ? p.tema.variante : '');

/** Cursor de -1..1 que se mueve con WASD / palanca o salta al puntero (mouse, toque o stick derecho). */
export type Cursor = { x: number; y: number; px: number; py: number; auto: boolean };
export const cursor = (x = 0, y = 0): Cursor => ({ x, y, px: input.px, py: input.py, auto: false });
export function moverCursor(c: Cursor, dt: number, rapidez = 1.2) {
  if (!c.auto) {
    c.x = limitar(c.x + input.mx * dt * rapidez);
    c.y = limitar(c.y - input.mz * dt * rapidez);
    if (input.px !== c.px || input.py !== c.py) {
      c.x = input.px;
      c.y = input.py;
    }
  }
  c.px = input.px;
  c.py = input.py;
  c.auto = false;
}
/** Lleva un valor hacia otro sin pasarse (bots y compa). */
export const acercar = (v: number, meta: number, paso: number) =>
  v < meta ? Math.min(meta, v + paso) : Math.max(meta, v - paso);
/** Índice 0..n-1 que marca el cursor (−1..1) y el valor de cursor que apunta a un índice. */
export const indice = (v: number, n: number) => Math.max(0, Math.min(n - 1, Math.round(((v + 1) / 2) * (n - 1))));
export const haciaIndice = (i: number, n: number) => (n > 1 ? (i / (n - 1)) * 2 - 1 : 0);
/** El bot espera entre acciones, como una persona: devuelve true cuando ya le toca. */
export function turno(s: { espera: number }, dt: number, pausa: number) {
  s.espera -= dt;
  if (s.espera > 0) return false;
  s.espera = pausa;
  return true;
}

// Metas y reloj: los copia `TOPES` de packages/reglas (helper `comayagua`), así que cambiá los dos a la vez.
export const metasLineales =
  (a: number, b: number, c: number, k: number) =>
  (p: Partida): [number, number, number] => [
    a + Math.round(p.dif * k),
    b + Math.round(p.dif * k),
    c + Math.round(p.dif * k),
  ];
export const reloj = (base: number, extra: number) => (p: Partida) => base + Math.round(p.dif * extra);

/** Mezcla un color con otro (para pistas pálidas). */
export function mezcla(a: string, b: string, t: number) {
  const n = (h: string) => [1, 3, 5].map((i) => Number.parseInt(h.slice(i, i + 2), 16));
  const x = n(a),
    y = n(b);
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * t)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

// ------------------------------------------------------------------ escena base
/** Spawn, título abajo y aviso de controles arriba. El lado derecho (x 5..9) queda para los bots del kit. */
export function Taller({ nombre, aviso, children }: { nombre: string; aviso: string; children: ReactNode }) {
  return (
    <>
      <Spawn pos={[-6, 0, 6]} />
      <Label pos={[-1.5, 0.45, 4.4]} text={nombre} h={0.5} fg="#fff1c9" bg="#7a3b1f" />
      <Label pos={[-1.5, 4.9, -5.6]} text={aviso} h={0.3} />
      {children}
    </>
  );
}

// ------------------------------------------------------------------ figuras
/** Engranaje de frente a la cámara: dos polígonos de `dientes` lados desfasados medio diente. */
const VISIBLES = 8;
export function Engranaje({
  pos,
  dientes,
  color = '#e0b040',
  giro = 0,
  s = 1,
}: {
  pos: V3;
  dientes: number;
  color?: string;
  giro?: number;
  s?: number;
}) {
  const r = (0.2 + Math.min(dientes, 48) * 0.008) * s;
  return (
    <group position={pos} rotation-z={giro}>
      <group rotation-x={Math.PI / 2}>
        <Cyl pos={[0, 0, 0]} r={r} h={0.12} sides={16} color={color} mat="plastic" solid={false} />
        <Cyl pos={[0, 0, 0]} r={0.07 * s} h={0.22} color="#3a3a3a" mat="metal" solid={false} cast={false} />
      </group>
      {Array.from({ length: VISIBLES }, (_, k) => (
        <group key={k} rotation-z={(k * Math.PI * 2) / VISIBLES}>
          <Block
            pos={[r + 0.04 * s, 0, 0]}
            size={[0.12 * s, 0.1 * s, 0.1]}
            color={color}
            mat="plastic"
            solid={false}
            cast={false}
          />
        </group>
      ))}
      <Block
        pos={[r * 0.55, 0, 0.09]}
        size={[r * 0.5, 0.05, 0.02]}
        color="#3a3a3a"
        mat="metal"
        solid={false}
        cast={false}
      />
    </group>
  );
}
/** Pilón (helado de palito): palito y bloque de sabor; `derretido` 0..1 lo achica y lo baja. */
export function Pilon({ pos, color, derretido = 0 }: { pos: V3; color: string; derretido?: number }) {
  const k = 1 - derretido * 0.6;
  return (
    <group position={pos}>
      <Block pos={[0, 0.12, 0]} size={[0.05, 0.24, 0.03]} color="#e9d3a6" mat="wood" solid={false} cast={false} />
      <group position={[0, 0.24, 0]} scale={[1, k, 1]}>
        <Block pos={[0, 0.17, 0]} size={[0.2, 0.34, 0.1]} color={color} mat="plastic" solid={false} cast={false} />
      </group>
      {derretido > 0.5 && <Ball pos={[0.08, 0.04, 0.06]} r={0.06} color={color} cast={false} />}
    </group>
  );
}
/** Mango: óvalo con piquito; verde o maduro. */
export function Mango({ pos, maduro, giro = 0 }: { pos: V3; maduro: boolean; giro?: number }) {
  return (
    <group position={pos} rotation-z={giro}>
      <group scale={[1.25, 0.9, 0.9]}>
        <Ball pos={[0, 0, 0]} r={0.2} color={maduro ? '#f6a623' : '#8bc34a'} mat="plastic" cast={false} />
      </group>
      <Ball pos={[0.2, 0.07, 0]} r={0.06} color={maduro ? '#e4572e' : '#6a9a3a'} cast={false} />
      <Block pos={[-0.05, 0.2, 0]} size={[0.03, 0.1, 0.03]} color="#5b3a24" mat="wood" solid={false} cast={false} />
    </group>
  );
}
/** Mesa de taller de madera para piezas sueltas. */
export function Mesa({ pos, size }: { pos: V3; size: [number, number] }) {
  return (
    <group position={pos}>
      <Block pos={[0, 0.8, 0]} size={[size[0], 0.12, size[1]]} color="#8a5a32" mat="wood" solid={false} />
      {[-1, 1].flatMap((lx) =>
        [-1, 1].map((lz) => (
          <Block
            key={`${lx}${lz}`}
            pos={[lx * (size[0] / 2 - 0.15), 0.37, lz * (size[1] / 2 - 0.15)]}
            size={[0.12, 0.74, 0.12]}
            color="#6b4226"
            mat="wood"
            solid={false}
            cast={false}
          />
        )),
      )}
    </group>
  );
}
