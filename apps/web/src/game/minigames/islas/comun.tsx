// Piezas compartidas por los motores de Islas de la Bahía: agua clara, muelle, fauna y cursor.
import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import type { V3 } from '../../../core/types';
import { Ball, Block, Cyl, Label, Spawn } from '../../kit';
import type { Guia, Partida } from '../api';

export const limitar = (v: number, a = -1, b = 1) => Math.max(a, Math.min(b, v));
export const texto = (v: unknown, def: string) => (typeof v === 'string' && v.trim() ? v : def);
export const loco = (p: Partida) => p.tema.loco === true;

/** Cursor de -1..1 que se mueve con WASD / palanca o salta al puntero (mouse, toque o stick derecho). */
export type Cursor = { x: number; y: number; px: number; py: number; auto: boolean };
export const cursor = (): Cursor => ({ x: 0, y: 0, px: input.px, py: input.py, auto: false });
export function moverCursor(c: Cursor, dt: number, rapidez = 1.2) {
  if (!c.auto) {
    c.x = limitar(c.x + input.mx * dt * rapidez);
    c.y = limitar(c.y - input.mz * dt * rapidez);
    if (input.px !== c.px || input.py !== c.py) {
      c.x = input.px;
      c.y = input.py;
    }
  }
  c.px = input.px;
  c.py = input.py;
  c.auto = false;
}
/** Lleva un valor hacia otro sin pasarse (para los bots y el compa). */
export const acercar = (v: number, meta: number, paso: number) =>
  v < meta ? Math.min(meta, v + paso) : Math.max(meta, v - paso);

export const controles: Pick<Guia, 'keys' | 'touch'> = {
  keys: [
    ['WASD / flechas', 'mover'],
    ['Mouse / stick derecho', 'apuntar'],
    ['F / clic / RT', 'acción'],
  ],
  touch: [
    ['Palanca / arrastrá', 'mover'],
    ['🎯', 'acción'],
  ],
};

// ------------------------------------------------------------------ escenario
/** Mar abierto con un bajo de agua clara (`ancho`×`largo`) donde pasa el juego; adelante queda una franja de playa. */
export function Laguna({
  ancho = 15,
  largo = 12,
  x = -1.5,
  z = -1,
  color = '#36d1d6',
}: {
  ancho?: number;
  largo?: number;
  x?: number;
  z?: number;
  nivel?: number;
  color?: string;
}) {
  return (
    <>
      <Block pos={[0, 0.012, -11]} size={[90, 0.02, 31]} color="#0b86b4" mat="water" solid={false} cast={false} />
      {/* fondo del mar: oscuro donde es hondo, más claro al acercarse al bajo de arena */}
      <Block pos={[0, 0.002, -11]} size={[90, 0.004, 31]} color="#1d5866" mat="sand" solid={false} cast={false} />
      <Block
        pos={[x, 0.0045, z]}
        size={[ancho + 5, 0.005, largo + 5]}
        color="#4b8f8c"
        mat="sand"
        solid={false}
        cast={false}
      />
      <Block pos={[x, 0.03, z]} size={[ancho, 0.02, largo]} color={color} mat="water" solid={false} cast={false} />
      <Block
        pos={[x, 0.006, z]}
        size={[ancho + 1.4, 0.012, largo + 1.4]}
        color="#f6e7b8"
        mat="sand"
        solid={false}
        cast={false}
      />
    </>
  );
}
/** Muelle de madera a la derecha, donde se paran los bots del kit (x 5..9, z -1). */
export function Muelle({ letrero }: { letrero?: string }) {
  return (
    <>
      <Block pos={[7.2, 0.08, -1]} size={[5.6, 0.16, 3]} color="#a7794a" mat="wood" solid={false} />
      {[4.6, 9.8].flatMap((x) =>
        [-2.3, 0.3].map((z) => (
          <Cyl key={`${x}${z}`} pos={[x, 0.3, z]} r={0.12} h={0.6} color="#6d4b2c" mat="wood" solid={false} />
        )),
      )}
      {letrero && <Label pos={[7.2, 2.8, -2.3]} text={letrero} h={0.32} fg="#fff6d8" bg="#14627a" />}
    </>
  );
}
/** Escena base de Islas: spawn, título, aviso y lo que traiga el motor. */
export function Isla({ nombre, aviso, children }: { nombre: string; aviso: string; children: ReactNode }) {
  return (
    <>
      <Spawn pos={[-6, 0, 6]} />
      <Label pos={[-1, 0.5, 6]} text={nombre} h={0.55} fg="#fff1c9" bg="#0d5c6b" />
      <Label pos={[-1, 3.4, -6.5]} text={aviso} h={0.3} />
      {children}
    </>
  );
}

// ------------------------------------------------------------------ figuras
/** Pez de arrecife: cuerpo ovalado, cola y ojo. Mira hacia +x. */
export function Pez({ pos, color = '#f7c948', rot = 0, s = 1 }: { pos: V3; color?: string; rot?: number; s?: number }) {
  return (
    <group position={pos} rotation-y={rot} scale={s}>
      <group scale={[1, 0.62, 0.36]}>
        <Ball pos={[0, 0, 0]} r={0.28} color={color} mat="plastic" cast={false} />
      </group>
      <group rotation-z={Math.PI / 4}>
        <Block pos={[-0.24, -0.24, 0]} size={[0.2, 0.2, 0.05]} color={color} mat="plastic" solid={false} cast={false} />
      </group>
      <Ball pos={[0.17, 0.05, 0.08]} r={0.04} color="#1b1b1f" cast={false} />
    </group>
  );
}
/** Tiburón ballena: lomo gris azulado con pintas blancas, cabeza ancha y aleta alta. Mira hacia +x. */
export function TiburonBallena({
  pos,
  rot = 0,
  s = 1,
  onda = 0,
}: {
  pos: V3;
  rot?: number;
  s?: number;
  onda?: number;
}) {
  return (
    <group position={pos} rotation-y={rot} scale={s}>
      <group scale={[2.4, 0.46, 0.72]}>
        <Ball pos={[0, 0, 0]} r={1} color="#3f5f78" mat="plastic" />
      </group>
      <group scale={[0.8, 0.32, 0.86]}>
        <Ball pos={[2.6, -0.1, 0]} r={1} color="#46677f" mat="plastic" />
      </group>
      <Block pos={[2.9, -0.12, 0]} size={[0.32, 0.06, 1.1]} color="#e9eef0" mat="plastic" solid={false} cast={false} />
      <group position={[-0.2, 0.45, 0]} rotation-z={-0.35}>
        <Block pos={[0, 0.22, 0]} size={[0.7, 0.55, 0.08]} color="#355269" mat="plastic" solid={false} />
      </group>
      <group position={[-2.5, 0, 0]} rotation-y={Math.sin(onda) * 0.35}>
        <group rotation-z={0.5}>
          <Block pos={[-0.35, 0.35, 0]} size={[0.5, 1.1, 0.08]} color="#355269" mat="plastic" solid={false} />
        </group>
        <group rotation-z={-0.6}>
          <Block pos={[-0.3, -0.25, 0]} size={[0.4, 0.7, 0.08]} color="#355269" mat="plastic" solid={false} />
        </group>
      </group>
      {[-1, 1].map((l) => (
        <group key={l} position={[0.9, -0.25, l * 0.6]} rotation-x={l * 0.6}>
          <Block pos={[0, 0, l * 0.35]} size={[0.6, 0.06, 0.7]} color="#355269" mat="plastic" solid={false} />
        </group>
      ))}
      {PINTAS.map(([x, z], i) => (
        <Ball key={i} pos={[x, 0.38 - Math.abs(x) * 0.05, z]} r={0.07} color="#f4f7f8" cast={false} />
      ))}
    </group>
  );
}
const PINTAS: [number, number][] = [
  [1.6, 0.2],
  [1.3, -0.25],
  [0.9, 0.05],
  [0.5, 0.32],
  [0.4, -0.3],
  [0, 0.12],
  [-0.4, -0.18],
  [-0.8, 0.22],
  [-1.2, -0.05],
  [-1.6, 0.12],
];
/** Coral: `cuerno` (ramas), `cerebro` (domo), `abanico` (lámina) o `tubo`. Crece con `s`. */
export function Coral({ pos, tipo, color, s = 1 }: { pos: V3; tipo: string; color: string; s?: number }) {
  if (s <= 0.01) return null;
  return (
    <group position={pos} scale={s}>
      {tipo === 'cerebro' && (
        <group scale={[1, 0.62, 1]}>
          <Ball pos={[0, 0.1, 0]} r={0.45} color={color} mat="stone" cast={false} />
        </group>
      )}
      {tipo === 'abanico' &&
        [-0.25, 0.25].map((r) => (
          <group key={r} rotation-y={r}>
            <Block pos={[0, 0.45, 0]} size={[0.8, 0.85, 0.05]} color={color} mat="cloth" solid={false} cast={false} />
          </group>
        ))}
      {tipo === 'tubo' &&
        [
          [0, 0],
          [0.22, 0.1],
          [-0.18, 0.15],
        ].map(([x, z], i) => (
          <Cyl
            key={i}
            pos={[x, 0.3 + i * 0.06, z]}
            r={0.1}
            rTop={0.13}
            h={0.6 + i * 0.12}
            color={color}
            mat="plastic"
            solid={false}
            cast={false}
          />
        ))}
      {(tipo === 'cuerno' || !['cerebro', 'abanico', 'tubo'].includes(tipo)) &&
        [-0.6, 0, 0.6].map((a) => (
          <group key={a} rotation-z={a} rotation-y={a * 2}>
            <Cyl
              pos={[0, 0.35, 0]}
              r={0.07}
              rTop={0.12}
              h={0.7}
              color={color}
              mat="plastic"
              solid={false}
              cast={false}
            />
          </group>
        ))}
    </group>
  );
}
/** Cangrejo azul: caparazón, dos tenazas y patitas. Camina de lado. */
export function Cangrejo({
  pos,
  rot = 0,
  paso = 0,
  color = '#3c6fd1',
}: {
  pos: V3;
  rot?: number;
  paso?: number;
  color?: string;
}) {
  return (
    <group position={pos} rotation-y={rot}>
      <group scale={[1, 0.45, 0.78]}>
        <Ball pos={[0, 0.5, 0]} r={0.36} color={color} mat="plastic" />
      </group>
      {[-1, 1].map((l) => (
        <group key={l}>
          <Ball pos={[l * 0.14, 0.42, -0.26]} r={0.05} color="#1b1b1f" cast={false} />
          <group position={[l * 0.34, 0.24, -0.32]} rotation-y={l * 0.5}>
            <Ball pos={[0, 0, 0]} r={0.12} color="#f1f1f1" mat="plastic" cast={false} />
          </group>
          {[-0.12, 0.05, 0.2].map((z, i) => (
            <group key={z} position={[l * 0.36, 0.15, z]} rotation-z={l * (0.6 + Math.sin(paso + i * 2) * 0.25)}>
              <Block
                pos={[l * 0.14, 0, 0]}
                size={[0.3, 0.04, 0.04]}
                color={color}
                mat="plastic"
                solid={false}
                cast={false}
              />
            </group>
          ))}
        </group>
      ))}
    </group>
  );
}
/** Lancha o taxi acuático: casco, toldo y motor fuera de borda. Mira hacia +x. */
export function Lancha({
  pos,
  rot = 0,
  color = '#f2f2ea',
  franja = '#1b8ac2',
  toldo = true,
}: {
  pos: V3;
  rot?: number;
  color?: string;
  franja?: string;
  toldo?: boolean;
}) {
  return (
    <group position={pos} rotation-y={rot}>
      <Block pos={[0, 0.2, 0]} size={[2.6, 0.4, 1.1]} color={color} mat="plastic" solid={false} />
      <group position={[1.3, 0.2, 0]} rotation-y={Math.PI / 4}>
        <Block pos={[0, 0, 0]} size={[0.78, 0.4, 0.78]} color={color} mat="plastic" solid={false} />
      </group>
      <Block pos={[0.1, 0.32, 0]} size={[2.62, 0.08, 1.12]} color={franja} mat="plastic" solid={false} cast={false} />
      <Block pos={[-1.42, 0.38, 0]} size={[0.26, 0.6, 0.26]} color="#2c2f33" mat="metal" solid={false} />
      {toldo && (
        <>
          {[-0.7, 0.6].flatMap((x) =>
            [-0.48, 0.48].map((z) => (
              <Cyl
                key={`${x}${z}`}
                pos={[x, 0.85, z]}
                r={0.03}
                h={0.9}
                color="#d9d9d9"
                mat="metal"
                solid={false}
                cast={false}
              />
            )),
          )}
          <Block pos={[-0.05, 1.32, 0]} size={[1.6, 0.06, 1.2]} color={franja} mat="cloth" solid={false} />
        </>
      )}
    </group>
  );
}
/** Boya naranja con banderita de buceo. */
export function Boya({ pos, color = '#ff7a2f' }: { pos: V3; color?: string }) {
  return (
    <group position={pos}>
      <Ball pos={[0, 0.15, 0]} r={0.26} color={color} mat="plastic" />
      <Cyl pos={[0, 0.6, 0]} r={0.025} h={0.8} color="#e0e0e0" mat="metal" solid={false} cast={false} />
      <Block pos={[0.16, 0.86, 0]} size={[0.3, 0.2, 0.02]} color="#d62828" mat="cloth" solid={false} cast={false} />
      <Block
        pos={[0.16, 0.86, 0.012]}
        size={[0.32, 0.04, 0.01]}
        color="#ffffff"
        mat="cloth"
        solid={false}
        cast={false}
      />
    </group>
  );
}
/** Casita de Bonacca sobre pilotes, con balcón a la altura `balcon` y su puerta. */
export function CasaPilotes({
  x,
  balcon,
  color,
  numero,
  activa,
  techo = '#c0392b',
}: {
  x: number;
  balcon: number;
  color: string;
  numero: number;
  activa: boolean;
  techo?: string;
}) {
  return (
    <group position={[x, 0, -3.4]}>
      {[-0.9, 0.9].map((dx) => (
        <Cyl key={dx} pos={[dx, balcon / 2, 0.5]} r={0.1} h={balcon} color="#5d4630" mat="wood" solid={false} />
      ))}
      <Block pos={[0, balcon + 1.1, -0.4]} size={[2.2, 2.2, 1.8]} color={color} mat="wood" solid={false} />
      <group position={[0, balcon + 2.5, -0.4]} rotation-z={0}>
        <Block pos={[0, 0, 0]} size={[2.6, 0.3, 2.3]} color={techo} mat="roof" solid={false} />
      </group>
      <Block pos={[0, balcon - 0.05, 0.75]} size={[2.2, 0.12, 0.9]} color="#a7794a" mat="wood" solid={false} />
      <Block
        pos={[0, balcon + 0.32, 1.17]}
        size={[2.2, 0.06, 0.06]}
        color="#f4f1e8"
        mat="wood"
        solid={false}
        cast={false}
      />
      <Block
        pos={[0, balcon + 0.62, 0.52]}
        size={[0.6, 1.2, 0.05]}
        color={activa ? '#ffd166' : '#5b3a24'}
        mat="wood"
        solid={false}
        cast={false}
      />
      <Label
        pos={[0, balcon + 3.1, 0]}
        text={`${activa ? '📦 ' : ''}${numero}`}
        h={0.36}
        bg={activa ? '#d1495b' : '#14627a'}
      />
    </group>
  );
}
/** Sombrilla de playa (utilería ligera). */
export function Sombrilla({ pos, color = '#ff7a3d' }: { pos: V3; color?: string }) {
  return (
    <group position={pos}>
      <Cyl pos={[0, 1, 0]} r={0.04} h={2} color="#e8e1cf" mat="wood" solid={false} cast={false} />
      <Cyl pos={[0, 2, 0]} r={1.1} rTop={0.05} h={0.45} color={color} mat="cloth" solid={false} sides={10} />
    </group>
  );
}
