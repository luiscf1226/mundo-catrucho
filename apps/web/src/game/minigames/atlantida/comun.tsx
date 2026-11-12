// Piezas compartidas por los motores de Atlántida: cursor, escena base, río y figuras sencillas.
import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import type { V3 } from '../../../core/types';
import { Ball, Block, Cyl, Label, Spawn } from '../../kit';
import type { Partida } from '../api';

export const limitar = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v));
export const texto = (v: unknown, def: string) => (typeof v === 'string' && v.trim() ? v : def);
export const loco = (p: Partida) => p.tema.loco === true;
/** Lleva un valor hacia otro sin pasarse (para los bots). */
export const acercar = (v: number, meta: number, paso: number) =>
  v < meta ? Math.min(meta, v + paso) : Math.max(meta, v - paso);

/** Cursor de -1..1 que se mueve con WASD / palanca o salta al puntero (mouse, toque o stick derecho). */
export type Cursor = { x: number; y: number; px: number; py: number; auto: boolean };
export const cursor = (): Cursor => ({ x: 0, y: 0, px: input.px, py: input.py, auto: false });
export function moverCursor(c: Cursor, dt: number, rapidez = 1.4) {
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
/** Índice 0..n-1 que corresponde a un valor del cursor (-1..1). */
export const casilla = (v: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(((v + 1) / 2) * n)));
/** Valor del cursor en el centro de la casilla `i` de `n`. */
export const centro = (i: number, n: number) => ((i + 0.5) / n) * 2 - 1;

/** Escena base: spawn, título y aviso de teclas al frente. Los bots del kit quedan a la derecha (x 5..9). */
export function Escena({ nombre, aviso, children }: { nombre: string; aviso: string; children: ReactNode }) {
  return (
    <>
      <Spawn pos={[-6, 0, 6]} />
      <Label pos={[-2, 0.4, 4.5]} text={nombre} h={0.42} fg="#fff4d6" bg="#1d5c4a" />
      <Label pos={[-2, 0.4, 3.85]} text={aviso} h={0.24} />
      {children}
    </>
  );
}
/** Río que corre de fondo a frente (eje z), entre `x0` y `x1`, con orillas de arena y piedras. */
export function Rio({ x0 = -8.6, x1 = 3.4, color = '#4fb3c6' }: { x0?: number; x1?: number; color?: string }) {
  const ancho = x1 - x0,
    cx = (x0 + x1) / 2;
  return (
    <>
      <Block pos={[cx, 0.03, -2]} size={[ancho, 0.04, 22]} color={color} mat="water" solid={false} cast={false} />
      {[x0 - 0.6, x1 + 0.6].map((x) => (
        <Block key={x} pos={[x, 0.08, -2]} size={[1.2, 0.16, 22]} color="#c9b48a" mat="sand" solid={false} />
      ))}
    </>
  );
}
/** Persona de utilería (bloques), para remeros, músicos y vendedoras. */
export function Monito({
  pos,
  color = '#e76f51',
  piel = '#8a5a3b',
  rot = 0,
  s = 1,
  brazo = 0,
}: {
  pos: V3;
  color?: string;
  piel?: string;
  rot?: number;
  s?: number;
  brazo?: number;
}) {
  return (
    <group position={pos} rotation-y={rot} scale={s}>
      <Block pos={[0, 0.45, 0]} size={[0.36, 0.5, 0.24]} color={color} mat="cloth" solid={false} cast={false} />
      <Ball pos={[0, 0.88, 0]} r={0.17} color={piel} cast={false} />
      <group position={[0.22, 0.62, 0]} rotation-x={brazo}>
        <Block pos={[0, -0.18, 0]} size={[0.1, 0.38, 0.1]} color={piel} solid={false} cast={false} />
      </group>
    </group>
  );
}
/** Barra de nivel horizontal 0..1 con su rótulo (hidrófono, velocidad, crecimiento…). */
export function Barra({
  pos,
  valor,
  ancho = 3,
  color = '#2a9d8f',
  alerta,
  texto: rotulo,
}: {
  pos: V3;
  valor: number;
  ancho?: number;
  color?: string;
  alerta?: number;
  texto: string;
}) {
  const v = limitar(valor, 0, 1);
  return (
    <group position={pos}>
      <Block
        pos={[0, 0, 0]}
        size={[ancho + 0.12, 0.3, 0.12]}
        color="#1d1d1f"
        mat="plastic"
        solid={false}
        cast={false}
      />
      <Block
        pos={[-ancho / 2 + (ancho * v) / 2, 0, 0.05]}
        size={[Math.max(0.02, ancho * v), 0.22, 0.08]}
        color={alerta !== undefined && v >= alerta ? '#ef476f' : color}
        mat="neon"
        solid={false}
        cast={false}
      />
      {alerta !== undefined && (
        <Block
          pos={[-ancho / 2 + ancho * alerta, 0, 0.1]}
          size={[0.05, 0.42, 0.05]}
          color="#ffffff"
          mat="plastic"
          solid={false}
          cast={false}
        />
      )}
      <Label pos={[0, 0.48, 0]} text={rotulo} h={0.24} />
    </group>
  );
}
/** Cilindro horizontal (para troncos, rodillos y cables cortos), a lo largo de x. */
export function Palo({
  pos,
  largo,
  r = 0.06,
  color = '#6d4b2c',
  rotY = 0,
  rotZ = 0,
}: {
  pos: V3;
  largo: number;
  r?: number;
  color?: string;
  rotY?: number;
  rotZ?: number;
}) {
  return (
    <group position={pos} rotation-y={rotY}>
      <group rotation-z={Math.PI / 2 + rotZ}>
        <Cyl pos={[0, 0, 0]} r={r} h={largo} color={color} mat="wood" solid={false} cast={false} />
      </group>
    </group>
  );
}
