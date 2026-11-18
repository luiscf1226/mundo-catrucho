import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Block, Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';
import { MesaJuego } from '../kit/Ambiente';

export const limitar = (n: number) => Math.max(-1, Math.min(1, n));
/** Cursor de dos ejes: teclado/palanca lo empujan, el puntero y el stick derecho lo ponen directo. */
export const cursor = () => ({ x: input.px, y: input.py, px: input.px, py: input.py, auto: false, espera: 0 });
export type Cursor = ReturnType<typeof cursor>;
export function mover(s: Cursor, dt: number) {
  s.espera = Math.max(0, s.espera - dt);
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
/** Casilla `0..n-1` que señala `x` (−1..1) y el centro de cada casilla, para que el bot apunte igual que el jugador. */
export const casilla = (x: number, n: number) => Math.max(0, Math.min(n - 1, Math.floor(((x + 1) / 2) * n)));
export const centro = (i: number, n: number) => -1 + (2 * i + 1) / n;
/** Fila del cursor: arriba (W) 1, abajo (S) −1, en medio 0 (nada). */
export const fila = (y: number) => (y > 0.4 ? 1 : y < -0.4 ? -1 : 0);
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
  return (
    <>
      <Spawn pos={[-6, 0, 3]} />
      <MesaJuego pos={[-1, 0.35, 0]} size={[10, 0.7, 8]} />
      <Label pos={[-1, 0.8, 5]} text={titulo} h={0.45} />
      {children}
    </>
  );
}
/** Marcador del cursor sobre la mesa (x de −6 a 4, z de −3.5 a 3.5). */
export function Puntero({ x, y, color = '#fff2a8' }: { x: number; y: number; color?: string }) {
  return <Block pos={[-1 + x * 4.6, 0.75, -y * 3.2]} size={[0.3, 0.06, 0.3]} color={color} mat="neon" solid={false} />;
}
