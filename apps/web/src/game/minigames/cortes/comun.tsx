import { type ReactNode, useLayoutEffect } from 'react';
import { input } from '../../../core/input';
import { player } from '../../../core/player';
import { art, Block, Ground, Label, Spawn } from '../../kit';
import type { Guia } from '../api';

export const limitar = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v));
export type Cursor = { x: number; y: number; px: number; py: number; auto: boolean };
export const cursor = (): Cursor => ({ x: 0, y: 0, px: input.px, py: input.py, auto: false });
export function mover(s: Cursor, dt: number) {
  if (!s.auto) {
    s.x = limitar(s.x + input.mx * dt);
    s.y = limitar(s.y + input.mz * dt);
    if (input.px !== s.px || input.py !== s.py) {
      s.x = input.px;
      s.y = input.py;
    }
  }
  s.px = input.px;
  s.py = input.py;
  s.auto = false;
}
export function Mesa({
  titulo,
  texto,
  children,
  color = '#d7b98b',
}: {
  titulo: string;
  texto: string;
  children: ReactNode;
  color?: string;
}) {
  useLayoutEffect(() => {
    player.control = false;
    player.fixedCam = { pos: [0, 12, 15], target: [0, 1, 0], fov: 52 };
    return () => {
      player.control = true;
      player.fixedCam = null;
    };
  }, []);
  return (
    <>
      <art.SkyRig time="dia" shadowRadius={22} />
      <Ground size={60} color={color} mat="sand" />
      <Spawn pos={[-6, 0, 3]} />
      <Block pos={[-1, 0.35, 0]} size={[10, 0.7, 9]} mat="wood" color="#513f37" solid={false} />
      <Label pos={[-1, 4.2, -4]} text={titulo} h={0.6} />
      <Label pos={[-1, 3.5, -4]} text={texto} h={0.3} />
      {children}
    </>
  );
}
export const controles: Pick<Guia, 'keys' | 'touch'> = {
  keys: [
    ['WASD / mouse', 'mover los indicadores'],
    ['Clic / F', 'confirmar'],
    ['Mando: stick derecho / RT', 'apuntar / confirmar'],
  ],
  touch: [
    ['Palanca / arrastrá', 'mover los indicadores'],
    ['🎯', 'confirmar'],
  ],
};
