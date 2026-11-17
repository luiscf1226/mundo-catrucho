import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Block, Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';
import { useMesaMaterial } from '../kit/Ambiente';

export const limitar = (n: number) => Math.max(-1, Math.min(1, n));
/** Cursor de dos ejes: `x` va de izquierda a derecha y `y` de abajo (−1) a arriba (+1), con teclado, puntero o mando. */
export const cursor = () => ({ x: input.px, y: input.py, px: input.px, py: input.py, auto: false });
export type Cursor = ReturnType<typeof cursor>;
export function mover(s: Cursor, dt: number) {
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
/** Columna (0..n−1) a la que apunta el cursor, repartidas parejo a lo ancho. */
export const columna = (x: number, n: number) => Math.max(0, Math.min(n - 1, Math.round(((x + 1) / 2) * n - 0.5)));
/** Centro en `x` de la columna `c` de `n`. */
export const xCol = (c: number, n: number) => ((c + 0.5) / n) * 2 - 1;
/** Posición en la mesa (metros) de un punto del cursor. */
export const wx = (x: number) => -1 + x * 4.4;
export const wz = (y: number) => -y * 3.4;
export const controles: Pick<Guia, 'keys' | 'touch'> = {
  keys: [
    ['WASD / mouse', 'mover el cursor'],
    ['F / clic', 'confirmar'],
    ['Mando: stick derecho / RT', 'mover / confirmar'],
  ],
  touch: [
    ['Palanca / arrastrá', 'mover el cursor'],
    ['🎯', 'confirmar'],
  ],
};
export const metas = (p: Partida): [number, number, number] => [120 + Math.round(p.dif * 120), 360, 600];
export const duracion = () => 75;
export function Mesa({ titulo, children }: { titulo: string; children: ReactNode }) {
  const material = useMesaMaterial();
  return (
    <>
      <Spawn pos={[-6, 0, 3]} />
      <Block pos={[-1, 0.35, 0]} size={[10, 0.7, 8]} {...material} solid={false} />
      <Label pos={[-1, 0.8, 5]} text={titulo} h={0.45} />
      {children}
    </>
  );
}
/** Marca del cursor sobre la mesa. */
export function Puntero({ x, y, color = '#f7dc80' }: { x: number; y: number; color?: string }) {
  return <Block pos={[wx(x), 1.5, wz(y)]} size={[0.16, 1.4, 0.16]} color={color} mat="neon" solid={false} />;
}
/** Barra delgada entre dos puntos de la mesa (líneas, trayectorias, membranas). */
export function Raya({
  a,
  b,
  color,
  y = 0.74,
  ancho = 0.07,
}: {
  a: [number, number];
  b: [number, number];
  color: string;
  y?: number;
  ancho?: number;
}) {
  const dx = b[0] - a[0],
    dz = b[1] - a[1],
    largo = Math.hypot(dx, dz);
  return (
    <Block
      pos={[(a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2]}
      size={[ancho, 0.03, largo]}
      rot={Math.atan2(dx, dz)}
      color={color}
      solid={false}
    />
  );
}
