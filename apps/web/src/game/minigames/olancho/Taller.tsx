import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';

export const metas = (p: Partida): [number, number, number] => [
  80 + Math.round(p.dif * 80),
  240 + Math.round(p.dif * 80),
  400 + Math.round(p.dif * 80),
];
export const duracion = () => 75;
export const clamp = (n: number, a = -1, b = 1) => Math.max(a, Math.min(b, n));
export function mover(s: { x: number; y: number; px: number; py: number }, dt: number) {
  s.x = clamp(s.x + input.mx * dt);
  s.y = clamp(s.y + input.mz * dt);
  if (input.px !== s.px) s.x = input.px;
  if (input.py !== s.py) s.y = -input.py;
  s.px = input.px;
  s.py = input.py;
}
export function Taller({ nombre, aviso, children }: { nombre: string; aviso: string; children: ReactNode }) {
  return (
    <>
      <Spawn pos={[-6, 0, 5]} />
      <Label pos={[0, 0.4, 6]} text={nombre} h={0.55} fg="#ffe4ad" />
      <Label pos={[0, 2.4, -4]} text={aviso} h={0.3} />
      {children}
    </>
  );
}
export const controles: Pick<Guia, 'keys' | 'touch'> = {
  keys: [
    ['WASD / flechas', 'ajustar posición o ángulo'],
    ['Mouse / stick derecho', 'apuntar'],
    ['F / clic / B / RT', 'acción'],
  ],
  touch: [
    ['Palanca', 'ajustar posición o ángulo'],
    ['🎯', 'acción'],
  ],
};
