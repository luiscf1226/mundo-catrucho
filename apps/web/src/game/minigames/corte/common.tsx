// Piezas compartidas por los motores corte / monta / ritmo / ruta: escenario por fondo, bots, partículas.
import { type ReactNode, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BOT_NAMES, SHOP } from '../../../core/data';
import type { AvatarConfig, AvatarState, MinigameResult, V3 } from '../../../core/types';
import { art, Block, Cyl, Ground, P, useTick } from '../../kit';
import type { FloraItem, FloraKind } from '../../kit/art/types';
import { COMPACT_QUALITY } from '../../quality';
import { finish, type Partida, rng } from '../api';
import {
  alturaTerreno,
  type Cauce,
  cerrosDe,
  floraDe,
  hayPaisaje,
  NIVEL_CAUCE,
  type Rect,
  Terreno,
} from '../kit/Paisaje';

export type Fondo =
  | 'costa'
  | 'montana'
  | 'valle'
  | 'pueblo'
  | 'ciudad'
  | 'lago'
  | 'selva'
  | 'cueva'
  | 'estadio'
  | 'mar'
  | 'rio'
  | 'finca'
  | 'mercado'
  | 'ruinas'
  | 'feria';
const BIOMA: Record<string, Fondo> = {
  costa: 'costa',
  sur: 'valle',
  valle: 'valle',
  lago: 'lago',
  montana: 'montana',
  capital: 'ciudad',
  selva: 'selva',
  isla: 'mar',
  bosque: 'montana',
};
/** Fondo del tema; si falta, sale del bioma del departamento; si no, `def`. */
export const fondoDe = (p: Partida, def: Fondo = 'valle'): Fondo =>
  (p.tema.fondo as Fondo) ?? (p.dept ? BIOMA[p.dept.biome] : undefined) ?? def;

type Item = [string, number, number, number?, string?]; // prop, x, z, escala, color
interface Look {
  ground: [string, any];
  water?: boolean;
  time?: 'dia' | 'tarde' | 'noche';
  indoor?: boolean;
  props: Item[];
  far?: string;
}
const ring = (kind: string, n: number, r0: number, r1: number, sc = 1): Item[] =>
  Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2,
      r = r0 + (((i * 7) % 5) / 4) * (r1 - r0);
    return [kind, Math.sin(a) * r * 1.3, -Math.abs(Math.cos(a)) * r - 6, sc];
  });
const LOOKS: Record<Fondo, Look> = {
  costa: {
    ground: ['#e8d29c', 'sand'],
    water: true,
    props: [
      ['Palm', -9, -3],
      ['Palm', 9, -2, 1.1],
      ['Palm', -15, -9],
      ['Palm', 16, -8],
      ['Rock', 12, -4],
      ['Boat', -6, -26],
      ['Palm', 5, -7],
    ],
    far: '#4fa6c4',
  },
  montana: {
    ground: ['#6c9f4c', 'grass'],
    props: [
      ['Pine', -9, -5],
      ['Pine', 9, -4, 1.2],
      ['Pine', -15, -10],
      ['Pine', 14, -11],
      ['Rock', -6, -9],
      ['Pine', 4, -14, 1.4],
      ['Pine', -3, -16, 1.3],
      ['Rock', 11, -8, 1.3],
    ],
    far: '#7d9a82',
  },
  valle: {
    ground: ['#69ab4a', 'grass'],
    props: [
      ['Tree', -9, -4],
      ['Tree', 10, -5, 1.1],
      ['Tree', -16, -12],
      ['Tree', 15, -11],
      ['Bush', -5, -7],
      ['Flowers', 6, -6],
      ['Flowers', -12, -7],
      ['Bush', 13, -7],
    ],
    far: '#8fb878',
  },
  pueblo: {
    ground: ['#b3a58d', 'cobble'],
    props: [
      ['House', -10, -12],
      ['House', 6, -14],
      ['House', 17, -11],
      ['Lamp', -6, -5],
      ['Lamp', 7, -5],
      ['Fence', -14, -5],
      ['Palm', 12, -5],
    ],
    far: '#c3d1d9',
  },
  ciudad: {
    ground: ['#555a62', 'asphalt'],
    props: [
      ['House', -10, -13],
      ['House', 3, -15],
      ['House', 15, -12],
      ['Lamp', -6, -6],
      ['Lamp', 8, -6],
      ['Car', -13, -5],
      ['House', -20, -14],
    ],
    far: '#b9c5d1',
  },
  lago: {
    ground: ['#bfae82', 'sand'],
    water: true,
    props: [
      ['Palm', -9, -3],
      ['Palm', 10, -3, 1.1],
      ['Boat', 4, -20],
      ['Boat', -12, -28],
      ['Rock', -13, -4],
      ['Bush', 14, -5],
    ],
    far: '#5aa8c8',
  },
  selva: {
    ground: ['#3f7a3a', 'grass'],
    props: [
      ['Tree', -8, -4, 1.3],
      ['Tree', 9, -5, 1.4],
      ['Palm', -14, -8],
      ['Palm', 15, -9],
      ['Bush', -4, -8],
      ['Bush', 5, -7],
      ['Tree', -3, -13, 1.6],
      ['Tree', 13, -14, 1.5],
      ['Macaw', -6, -6],
    ],
    far: '#2f6a37',
  },
  cueva: {
    ground: ['#4a453f', 'stone'],
    indoor: true,
    props: [
      ['Rock', -8, -4, 1.4],
      ['Rock', 9, -4, 1.3],
      ['Rock', -14, -9, 2],
      ['Rock', 14, -10, 2.2],
      ['Rock', 0, -13, 2.4],
      ['Rock', -3, -8, 1],
      ['Rock', 5, -9, 1.2],
    ],
    far: '#2a2622',
  },
  estadio: {
    ground: ['#4ea63f', 'grass'],
    props: [
      ['Flag', -8, -5],
      ['Flag', 8, -5],
      ['Goal', 0, -12],
      ['Lamp', -14, -7],
      ['Lamp', 14, -7],
    ],
    far: '#9fb4c2',
  },
  mar: {
    ground: ['#e3cf9d', 'sand'],
    water: true,
    props: [
      ['Boat', 6, -18],
      ['Boat', -10, -26],
      ['Rock', -12, -5, 1.3],
      ['Palm', 11, -4],
      ['Rock', 13, -8],
    ],
    far: '#3e9dc4',
  },
  rio: {
    ground: ['#6aa04c', 'grass'],
    water: true,
    props: [
      ['Tree', -10, -4],
      ['Tree', 11, -5],
      ['Rock', -6, -6],
      ['Bush', 7, -4],
      ['Palm', 15, -8],
      ['Tree', -16, -9],
    ],
    far: '#80b0c0',
  },
  finca: {
    ground: ['#6aa34b', 'grass'],
    props: [
      ['Fence', -8, -6, 1, ''],
      ['Fence', 8, -6],
      ['Tree', -12, -9],
      ['Tree', 13, -10],
      ['House', 4, -16],
      ['Crate', -5, -5],
      ['Barrel', 6, -5],
      ['Bush', -16, -6],
    ],
    far: '#8cb77b',
  },
  mercado: {
    ground: ['#b79e7a', 'cobble'],
    props: [
      ['Stall', -9, -6],
      ['Stall', 9, -6],
      ['Stall', 0, -12],
      ['Flag', -5, -4],
      ['Crate', 5, -4],
      ['Lamp', 14, -6],
      ['House', -17, -14],
    ],
    far: '#c9d2d8',
  },
  ruinas: {
    ground: ['#b7a980', 'stone'],
    props: [
      ['Statue', -8, -6],
      ['Rock', 9, -5, 1.2],
      ['Palm', -14, -9],
      ['Tree', 14, -10],
      ['Rock', -4, -10, 1.6],
      ['Statue', 6, -12],
      ['Bush', 12, -6],
    ],
    far: '#6c8f6a',
  },
  feria: {
    ground: ['#98a758', 'grass'],
    props: [
      ['Stall', -9, -6],
      ['Stall', 9, -7],
      ['Flag', -5, -4],
      ['Flag', 5, -4],
      ['Lamp', -14, -5],
      ['Lamp', 14, -5],
      ['Tree', 16, -12],
      ['Tree', -16, -12],
    ],
    far: '#a9c690',
  },
};
const PropOf = ({ it, solid = false }: { it: Item; solid?: boolean }) => {
  const C = (P as any)[it[0]];
  if (!C) return null;
  const s = it[3] ?? 1;
  return (
    <C pos={[it[1], 0, it[2]]} scale={s} solid={solid} {...(it[0] === 'House' ? { w: 8, d: 8, floors: 2 } : {})} />
  );
};
/** utilería de la lista que en HD es vegetación del paquete de arte (una malla para todas) */
const FLORA: Record<string, FloraKind> = { Tree: 'tree', Palm: 'palm', Pine: 'pine', Bush: 'bush', Flowers: 'flowers' };
/** Escenario de fondo: cielo, suelo, utilería lejana y (si el fondo es de agua) mar. `deck` pone una tarima de madera
 *  sobre el agua. En HD el suelo es terreno con relieve fuera del `claro` donde se juega, con cerros, monte y, si
 *  viene `cauce`, un río que cruza a lo largo; `zacate` (huecos donde no crece) pone zacate cerca de la cámara. */
export function Escenario({
  fondo,
  deck = true,
  extra,
  cauce,
  claro = [-10, 10, -7, 7],
  zacate,
}: {
  fondo: Fondo;
  deck?: boolean;
  extra?: ReactNode;
  cauce?: Cauce;
  claro?: Rect;
  zacate?: Rect[];
}) {
  const L = LOOKS[fondo] ?? LOOKS.valle;
  const hd = hayPaisaje();
  const dist = useMemo(() => {
    if (hd || (fondo !== 'montana' && fondo !== 'ruinas' && fondo !== 'selva')) return null;
    return Array.from({ length: 6 }, (_, i) => ({ x: -40 + i * 16 + (i % 2) * 5, h: 16 + ((i * 5) % 9) }));
  }, [fondo, hd]);
  const paisaje = useMemo(() => {
    if (!hd) return null;
    const flora: FloraItem[] = [];
    const props: Item[] = [];
    for (const it of L.props) {
      const k = FLORA[it[0]];
      if (!k || !art.Flora) {
        props.push(it);
        continue;
      }
      if (cauce && Math.abs(it[1] - cauce.x) < cauce.w * 0.5 + 1.2) continue;
      flora.push({
        k,
        p: [it[1], alturaTerreno(fondo, it[1], it[2], cauce) - 0.05, it[2]],
        s: (it[3] ?? 1) * (k === 'tree' || k === 'pine' ? 1.1 : 1),
        seed: Math.round(it[1] * 7 + it[2] * 3) & 255,
        r: it[1] * 0.37,
      });
    }
    return {
      props,
      flora: art.Flora ? [...flora, ...floraDe(fondo, claro, cauce)] : flora,
      cerros: art.Hills ? cerrosDe(fondo) : [],
    };
  }, [fondo, hd, cauce?.x, cauce?.w, `${claro}`]); // eslint-disable-line react-hooks/exhaustive-deps
  const urbano = fondo === 'pueblo' || fondo === 'ciudad' || fondo === 'mercado' || fondo === 'cueva';
  return (
    <>
      <art.SkyRig
        time={L.time ?? (fondo === 'cueva' ? 'noche' : 'dia')}
        indoor={L.indoor}
        shadowRadius={26}
        fogFar={L.indoor ? 60 : undefined}
      />
      {hd && !urbano ? (
        <Terreno fondo={fondo} m={L.ground[1]} c={L.ground[0]} cauce={cauce} />
      ) : (
        <Ground size={260} color={L.ground[0]} mat={L.ground[1]} />
      )}
      {L.water && (
        <>
          {hd ? (
            <Ground size={[420, 240]} pos={[0, 0, -145]} y={0.03} color={L.far ?? '#3e9dc4'} mat="water" />
          ) : (
            <Ground size={[240, 160]} pos={[0, 0, -105]} y={0.03} color={L.far ?? '#3e9dc4'} mat="water" />
          )}
          {deck && <Block pos={[0, -0.12, 1]} size={[18, 0.3, 10]} color="#a87a47" mat="wood" solid={false} />}
        </>
      )}
      {hd && cauce && (
        <Ground size={[cauce.w + 2.4, 60]} pos={[cauce.x, 0, -4]} y={NIVEL_CAUCE} color="#35605a" mat="water" />
      )}
      {(paisaje?.props ?? L.props).map((it, i) => (
        <PropOf key={i} it={it} />
      ))}
      {paisaje && art.Flora && paisaje.flora.length > 0 && <art.Flora items={paisaje.flora} />}
      {paisaje && art.Hills && paisaje.cerros.length > 0 && <art.Hills hills={paisaje.cerros} />}
      {hd && zacate && art.GroundCover && <art.GroundCover area={[-34, 34, -26, 18]} holes={zacate} />}
      {dist?.map((d, i) => (
        <Cyl
          key={i}
          pos={[d.x, d.h / 2 - 1, -62 - (i % 3) * 8]}
          r={d.h * 1.4}
          rTop={d.h * 0.12}
          h={d.h}
          color={L.far ?? '#7d9a82'}
          mat="stone"
          solid={false}
          cast={false}
        />
      ))}
      {fondo === 'estadio' &&
        [0, 1, 2, 3].map((i) => (
          <Block
            key={i}
            pos={[0, 0.8 + i * 0.9, -18 - i * 1.6]}
            size={[44, 0.9, 1.8]}
            color={['#d94f4f', '#e8c13f', '#3f8fd9', '#58b25a'][i]}
            mat="concrete"
            solid={false}
          />
        ))}
      {fondo === 'cueva' && (
        <Block pos={[0, 14, -10]} size={[70, 2, 40]} color="#2a2622" mat="stone" solid={false} cast={false} />
      )}
      {extra}
    </>
  );
}

// ------------------------------------------------------------------ bots
const SHIRTS = ['#f08346', '#9054d2', '#1dbe8d', '#e63946'],
  HAIRS = ['pelo_corto', 'pelo_corto', 'pelo_corto', 'pelo_corto'];
export const botCfg = (i: number): AvatarConfig =>
  ({
    ...SHOP.defaultAvatar,
    shirtColor: SHIRTS[i % 4],
    pantsColor: ['#263a5d', '#3b3b3b', '#5d4126', '#26584f'][i % 4],
    skin: ['#c98f5f', '#8d5a3b', '#e0ac7e', '#a66f45'][i % 4],
    hair: HAIRS[i % 4],
  }) as AvatarConfig;
export const botName = (i: number, compa = false) =>
  `🤖 ${compa ? 'Compa ' : ''}${BOT_NAMES[(i * 3 + 2) % BOT_NAMES.length]}`;
/** Cantidad de bots visibles por modo: solo 1 rival, duo 1 compa, abierto 3. */
export const nBots = (modo: string) => (modo === 'abierto' ? 3 : 1);
export function BotAvatar({
  i,
  state,
  pos,
  yaw = 0,
  compa = false,
  scale = 1,
}: {
  i: number;
  state: AvatarState;
  pos: V3;
  yaw?: number;
  compa?: boolean;
  scale?: number;
}) {
  const cfg = useMemo(() => botCfg(i), [i]);
  return (
    <group position={pos} rotation-y={yaw}>
      <art.Avatar config={cfg} state={state} name={botName(i, compa)} scale={scale} />
    </group>
  );
}
export const newState = (anim: AvatarState['anim'] = 'idle'): AvatarState => ({ anim, speed: 0 });

// ------------------------------------------------------------------ partículas (un solo InstancedMesh)
export function useBurst(capacity = 70, size = 0.09) {
  const max = COMPACT_QUALITY ? Math.max(1, Math.ceil(capacity / 3)) : capacity;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const S = useRef({
    n: 0,
    x: new Float32Array(max),
    y: new Float32Array(max),
    z: new Float32Array(max),
    vx: new Float32Array(max),
    vy: new Float32Array(max),
    vz: new Float32Array(max),
    life: new Float32Array(max),
    sc: new Float32Array(max),
  });
  const R = useMemo(() => rng(1234), []),
    m4 = useMemo(() => new THREE.Matrix4(), []),
    col = useMemo(() => new THREE.Color(), []);
  const emit = (x: number, y: number, z: number, color: string, n = 10, speed = 4, up = 2.5, sc = 1) => {
    const s = S.current,
      im = mesh.current;
    if (!im) return;
    for (let k = 0; k < n; k++) {
      const i = s.n++ % max,
        a = R() * Math.PI * 2,
        v = speed * (0.35 + R() * 0.8);
      s.x[i] = x;
      s.y[i] = y;
      s.z[i] = z;
      s.vx[i] = Math.cos(a) * v;
      s.vy[i] = up * (0.4 + R()) + Math.sin(a) * v * 0.4;
      s.vz[i] = (R() - 0.5) * v * 0.6;
      s.life[i] = 0.7 + R() * 0.5;
      s.sc[i] = sc * (0.6 + R() * 0.9);
      col.set(color);
      im.setColorAt(i, col);
    }
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  };
  useTick((dt) => {
    const im = mesh.current;
    if (!im) return;
    const s = S.current;
    for (let i = 0; i < max; i++) {
      if (s.life[i] > 0) {
        s.life[i] -= dt;
        s.vy[i] -= 11 * dt;
        s.x[i] += s.vx[i] * dt;
        s.y[i] += s.vy[i] * dt;
        s.z[i] += s.vz[i] * dt;
        const k = Math.max(0, Math.min(1, s.life[i] * 2.2)) * s.sc[i];
        m4.makeScale(k, k, k);
        m4.setPosition(s.x[i], s.y[i], s.z[i]);
      } else m4.makeScale(0, 0, 0);
      im.setMatrixAt(i, m4);
    }
    im.instanceMatrix.needsUpdate = true;
  });
  const node = (
    <instancedMesh ref={mesh} args={[undefined as any, undefined as any, max]} frustumCulled={false}>
      <sphereGeometry args={[size, 6, 5]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
  return { node, emit };
}

/** `finish` una sola vez. */
export function useFinisher() {
  const done = useRef(false);
  return {
    done,
    end: (r: MinigameResult) => {
      if (done.current) return;
      done.current = true;
      finish(r);
    },
  };
}
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Ganó = llegó a la meta de 1 estrella. */
export const starsOf = (v: number, m: [number, number, number]): 0 | 1 | 2 | 3 =>
  v >= m[2] ? 3 : v >= m[1] ? 2 : v >= m[0] ? 1 : 0;
/** Pone una frase del tema como toast de vez en cuando. */
export const frasesDe = (p: Partida) => (Array.isArray(p.tema.frases) ? (p.tema.frases as string[]) : []);
export { Block, Cyl, Ground };
