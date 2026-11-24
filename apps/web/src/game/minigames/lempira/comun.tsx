import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';
import { MesaJuego } from '../kit/Ambiente';
export const limitar = (n: number) => Math.max(-1, Math.min(1, n));
export const cursor = () => ({ x: input.px, y: input.py, px: input.px, py: input.py, auto: false });
export function mover(s: ReturnType<typeof cursor>, dt: number) {
  if (!s.auto) {
    s.x = limitar(s.x + input.mx * dt * 1.5);
    s.y = limitar(s.y + input.mz * dt * 1.5);
    if (s.px !== input.px || s.py !== input.py) {
      s.x = input.px;
      s.y = input.py;
    }
  }
  s.px = input.px;
  s.py = input.py;
  s.auto = false;
}
export const controles: Pick<Guia, 'keys' | 'touch'> = {
  keys: [
    ['WASD / mouse', 'ajustar ambos ejes'],
    ['F / clic', 'confirmar'],
    ['Mando: stick derecho / RT', 'ajustar / confirmar'],
  ],
  touch: [
    ['Palanca / arrastrá', 'ajustar ambos ejes'],
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
      <Label pos={[-1, 0.8, 5]} text={titulo} h={0.5} />
      {children}
    </>
  );
}
