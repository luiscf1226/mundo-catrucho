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
/** Controles comunes: cursor en dos ejes, F hace la acción principal y E (si el motor la usa) la secundaria. */
export function controles(f: string, e?: string, cursorHace = 'mover el cursor'): Pick<Guia, 'keys' | 'touch'> {
  return {
    keys: [
      ['WASD / mouse', cursorHace],
      ['F / clic', f],
      ...(e ? ([['E · mando X', e]] as [string, string][]) : []),
      ['Mando: stick derecho / RT', `${cursorHace} / ${f}`],
    ],
    touch: [['Palanca / arrastrá', cursorHace], ['🎯', f], ...(e ? ([['E', e]] as [string, string][]) : [])],
  };
}
/** Las metas y el reloj de los siete motores de Gracias a Dios (copiados en packages/reglas/src/topes.ts). */
export const metas = (p: Partida): [number, number, number] => [120 + Math.round(p.dif * 120), 360, 600];
export const duracion = () => 75;
export const variante = (p: Partida) => (typeof p.tema.variante === 'string' ? p.tema.variante : '');
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
/** Una de `n` casillas en fila según el cursor (de −1 a 1). */
export const casilla = (x: number, n: number) => Math.max(0, Math.min(n - 1, Math.round(((x + 1) / 2) * (n - 1))));
/** El cursor que apunta a la casilla `i` de `n`. */
export const xDe = (i: number, n: number) => (n > 1 ? (i / (n - 1)) * 2 - 1 : 0);
/** Revuelve una lista con el azar de la partida. */
export function revolver<T>(lista: T[], azar: () => number) {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
