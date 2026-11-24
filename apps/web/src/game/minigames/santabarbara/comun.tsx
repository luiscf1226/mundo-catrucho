import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';
import { MesaJuego } from '../kit/Ambiente';

export const limitar = (n: number) => Math.max(-1, Math.min(1, n));
/** Cursor de dos ejes: `x` de izquierda a derecha y `y` de abajo (−1) a arriba (+1), con teclado, puntero o mando. */
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
/** Metas y reloj de los siete motores de Santa Bárbara (copiados en `TOPES` de packages/reglas). */
export const metas = (p: Partida): [number, number, number] => [120 + Math.round(p.dif * 120), 360, 600];
export const duracion = () => 75;
/** Una de `n` casillas en fila según un eje del cursor (de −1 a 1). */
export const casilla = (v: number, n: number) => Math.max(0, Math.min(n - 1, Math.round(((v + 1) / 2) * (n - 1))));
/** El valor del eje que apunta a la casilla `i` de `n`. */
export const ejeDe = (i: number, n: number) => (n > 1 ? (i / (n - 1)) * 2 - 1 : 0);
/** Revuelve una lista con el azar de la partida. */
export function revolver<T>(lista: T[], azar: () => number) {
  const c = [...lista];
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
/** Entero entre `a` y `b` (incluidos). */
export const entre = (azar: () => number, a: number, b: number) => a + Math.floor(azar() * (b - a + 1));
export const aviso = (texto: string, icono: string) => useGame.getState().toast(texto, icono);
/** La mesa de trabajo: el jugador queda a un lado y la cámara mira la mesa desde arriba. */
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
/** Punto de la mesa para un cursor (`x` a lo ancho, `y` a lo hondo: arriba en pantalla = fondo de la mesa). */
export const enMesa = (x: number, y: number, alto = 0.8): [number, number, number] => [-1 + x * 4.2, alto, -y * 3.1];
/** Marca del cursor sobre la mesa. */
export function Puntero({ x, y, color = '#f7dc80' }: { x: number; y: number; color?: string }) {
  const [px, , pz] = enMesa(x, y);
  return <Block pos={[px, 1.3, pz]} size={[0.14, 1.1, 0.14]} color={color} mat="neon" solid={false} />;
}
