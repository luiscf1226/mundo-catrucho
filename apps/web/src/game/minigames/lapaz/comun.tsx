import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Block, Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';
import { MesaJuego } from '../kit/Ambiente';

export const limitar = (n: number) => Math.max(-1, Math.min(1, n));
/** Cursor de dos ejes: `x` va de izquierda a derecha y `y` de abajo (−1) a arriba (+1), con teclado, puntero o mando. */
export const cursor = () => ({ x: input.px, y: input.py, px: input.px, py: input.py, auto: false });
export function mover(s: ReturnType<typeof cursor>, dt: number) {
  if (!s.auto) {
    s.x = limitar(s.x + input.mx * dt * 1.5);
    s.y = limitar(s.y - input.mz * dt * 1.5);
    if (s.px !== input.px || s.py !== input.py) {
      s.x = input.px;
      s.y = input.py;
    }
  }
  s.px = input.px;
  s.py = input.py;
  s.auto = false;
}
/** Casilla (0..n−1) a la que apunta un eje del cursor (−1..1). */
export const casilla = (v: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(((v + 1) / 2) * n)));
/** Centro (−1..1) de la casilla `i` de `n`. */
export const centro = (i: number, n: number) => ((i + 0.5) / n) * 2 - 1;
/** Controles comunes: cursor en dos ejes, F confirma y E (si el motor la usa) hace la acción secundaria. */
export function controles(e?: string): Pick<Guia, 'keys' | 'touch'> {
  return {
    keys: [
      ['WASD / mouse', 'mover el cursor'],
      ['F / clic', 'confirmar'],
      ...(e ? ([['E · mando X', e]] as [string, string][]) : []),
      ['Mando: stick derecho / RT', 'mover / confirmar'],
    ],
    touch: [
      ['Palanca / arrastrá', 'mover el cursor'],
      ['🎯', 'confirmar'],
      ...(e ? ([['E', e]] as [string, string][]) : []),
    ],
  };
}
export const metas = (p: Partida): [number, number, number] => [120 + Math.round(p.dif * 120), 360, 600];
export const duracion = () => 75;
export function Mesa({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <>
      <Spawn pos={[-6, 0, 3]} />
      <MesaJuego pos={[-1, 0.35, 0]} size={[10, 0.7, 8]} />
      <Label pos={[-1, 0.8, 5]} text={titulo} h={0.45} />
      {children}
    </>
  );
}
/** Marca del cursor sobre la mesa: `x` a lo ancho, `y` a lo hondo (arriba en pantalla = fondo de la mesa). */
export function Puntero({ x, y, color = '#f7dc80' }: { x: number; y: number; color?: string }) {
  return <Block pos={[-1 + x * 4.4, 1.6, -y * 3.2]} size={[0.18, 1.6, 0.18]} color={color} mat="neon" solid={false} />;
}
/** Posición en la mesa de una casilla de una cuadrícula de `cols × filas` (fila 0 = frente). */
export const enMesa = (c: number, f: number, cols: number, filas: number, y = 0.8): [number, number, number] => [
  -1 + centro(c, cols) * 4.4,
  y,
  -centro(f, filas) * 3.2,
];
