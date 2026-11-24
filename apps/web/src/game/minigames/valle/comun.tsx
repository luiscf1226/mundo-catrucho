import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';
import { MesaJuego } from '../kit/Ambiente';

export const limitar = (n: number) => Math.max(-1, Math.min(1, n));
export const cursor = () => ({ x: input.px, y: input.py, px: input.px, py: input.py, auto: false });
/** WASD, palanca y stick derecho mueven el cursor; el mouse o el dedo lo ponen donde apuntan. */
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
/** Ángulo del cursor convertido en una de `n` opciones repartidas en círculo (−1 si está en el centro). */
export function sector(x: number, y: number, n: number, giro = 0) {
  if (Math.hypot(x, y) < 0.3) return -1;
  const a = (Math.atan2(y, x) - giro + Math.PI * 4) % (Math.PI * 2);
  return Math.round(a / ((Math.PI * 2) / n)) % n;
}
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
