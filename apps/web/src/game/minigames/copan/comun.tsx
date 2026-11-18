import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, Spawn } from '../../kit';
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
export function Taza({ x = 0, nivel = 1 }: { x?: number; nivel?: number }) {
  return (
    <group position={[x, 0, 0]}>
      <Cyl pos={[0, 0.8, 0]} r={0.8} h={0.12} color="#c76b43" mat="stone" solid={false} />
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i * Math.PI) / 6;
        return (
          <Block
            key={i}
            pos={[Math.sin(a) * 0.85, 1.3, Math.cos(a) * 0.85]}
            size={[0.5, 1.1, 0.13]}
            rot={a}
            color="#c76b43"
            mat="stone"
            solid={false}
          />
        );
      })}
      <Cyl pos={[0, 1.35 + nivel * 0.4, 0]} r={0.88} h={0.07} color="#9f7242" mat="sand" solid={false} />
      <group scale={[0.5, 1, 1]}>
        <Ball pos={[2, 1.3, 0]} r={0.45} color="#c76b43" mat="stone" />
      </group>
    </group>
  );
}
export function Replica({ giro = 0 }: { giro?: number }) {
  return (
    <group rotation={[0, giro, 0]}>
      <Cyl pos={[0, 0.85, 0]} r={0.65} h={0.2} color="#8b8067" mat="stone" solid={false} />
      <Block pos={[0, 2, 0]} size={[1.1, 2.3, 0.6]} color="#bcb194" mat="stone" solid={false} />
      <Ball pos={[0, 3.1, 0]} r={0.55} color="#bcb194" mat="stone" />
      {[-1, 1].map((l) => (
        <Block
          key={l}
          pos={[l * 0.25, 2.4, l * 0.34]}
          size={[0.2, 0.5 + l * 0.2, 0.1]}
          color={l > 0 ? '#54afaa' : '#e7ad62'}
          mat="cloth"
          solid={false}
        />
      ))}
    </group>
  );
}
