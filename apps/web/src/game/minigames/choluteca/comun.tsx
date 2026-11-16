import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Block, Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';
import { useMesaMaterial } from '../kit/Ambiente';

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
/** Columna (0, 1, 2) a la que apunta el cursor: marcas en −0.6, 0 y +0.6. */
export const columna = (x: number) => Math.max(0, Math.min(2, Math.round(x / 0.6) + 1));
export const xDe = (c: number) => (c - 1) * 0.6;
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
/** Marca del cursor sobre la mesa: `x` a lo ancho, `y` a lo hondo (arriba en pantalla = fondo de la mesa). */
export function Puntero({ x, y, color = '#f7dc80' }: { x: number; y: number; color?: string }) {
  return <Block pos={[x * 5, 1.6, -y * 3]} size={[0.18, 1.6, 0.18]} color={color} mat="neon" solid={false} />;
}
