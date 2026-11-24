import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Label, Spawn } from '../../kit';
import { MesaJuego } from '../kit/Ambiente';
export function Mesa({ nombre, aviso, children }: { nombre: string; aviso: string; children: ReactNode }) {
  return (
    <>
      <Spawn pos={[-6, 0, 3]} />
      <MesaJuego pos={[0, 0.5, 0]} size={[9, 1, 7]} />
      <Label pos={[0, 0.8, 5.2]} text={nombre} h={0.6} />
      <Label pos={[0, 1.4, 4.5]} text={aviso} h={0.32} fg="#ffe9a1" />
      {children}
    </>
  );
}

export const cursorInicial = () => ({ x: input.px, y: input.py });
export function movioPuntero(cursor: { x: number; y: number }) {
  const cambio = cursor.x !== input.px || cursor.y !== input.py || input.pointerDown;
  cursor.x = input.px;
  cursor.y = input.py;
  return cambio && Math.abs(input.mx) < 0.1 && Math.abs(input.mz) < 0.1;
}
