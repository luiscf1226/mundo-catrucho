// Meme en 3D: una escenita de 3 × 3 m sobre un zócalo, con un actor que hace el meme y el texto clásico
// (arriba sobre la escena, abajo en el frente del zócalo). Solo piezas del kit: sin colisiones, sin luces y sin
// Interactables, para poder montarla en un departamento, pegada a la cámara o en el estudio de fotos.
// El origen es el piso de la escena (encima del zócalo); el frente mira a +Z.
import { useFrame } from '@react-three/fiber';
import { type ReactNode, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SHOP } from '../../core/data';
import type { Escena, Meme } from '../../core/memes';
import type { Anim, AvatarConfig, AvatarState, V3 } from '../../core/types';
import { art, Ball, Block, Cyl, type MatKind, P, Plate, textTexture } from '../kit';

/** Medidas para quien la monta: el zócalo baja hasta -ZOCALO y el texto de arriba llega hasta ~ALTO. */
export const ZOCALO = 0.95,
  ALTO = 3.9,
  ANCHO = 3.6;

type Mover = (o: THREE.Group, t: number) => void;
/** Grupo que se mueve solo en cada cuadro (decorado: no se pausa con los paneles). */
function Mueve({ fn, pos, children }: { fn: Mover; pos?: V3; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (ref.current) fn(ref.current, clock.elapsedTime);
  });
  return (
    <group ref={ref} position={pos}>
      {children}
    </group>
  );
}

const gotas = new Map<boolean, { geo: THREE.BufferGeometry; mat: THREE.Material }>();
const gotaDe = (nieve: boolean) => {
  let g = gotas.get(nieve);
  if (!g) {
    g = {
      geo: nieve ? new THREE.SphereGeometry(0.045, 6, 4) : new THREE.BoxGeometry(0.018, 0.22, 0.018),
      mat: new THREE.MeshBasicMaterial({ color: nieve ? '#ffffff' : '#bfe3ff', transparent: true, opacity: 0.85 }),
    };
    gotas.set(nieve, g);
  }
  return g;
};
/** Lluvia o nieve: una sola malla instanciada que cae dentro de la escena (escala con la escena, a diferencia de
 * points). `funde`: la nieve se derrite antes de tocar el suelo. */
function Caen({ n, nieve = false, funde = false }: { n: number; nieve?: boolean; funde?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null),
    semillas = useMemo(
      () => Array.from({ length: n }, (_, i) => [((i * 37) % 29) / 29, ((i * 53) % 31) / 31, i / n]),
      [n],
    ),
    { geo, mat } = gotaDe(nieve),
    m = useMemo(() => new THREE.Matrix4(), []);
  useFrame(({ clock }) => {
    const im = ref.current;
    if (!im) return;
    const t = clock.elapsedTime,
      v = nieve ? 0.35 : 3.2;
    semillas.forEach(([a, b, c], i) => {
      const y = 2.6 - ((t * v + c * 2.6) % 2.6),
        x = (a - 0.5) * 2.8 + (nieve ? Math.sin(t * 1.3 + i) * 0.12 : 0),
        k = funde ? Math.max(0.001, Math.min(1, (y - 1.1) / 0.8)) : 1;
      m.makeScale(k, k, k).setPosition(x, y, (b - 0.5) * 2.6);
      im.setMatrixAt(i, m);
    });
    im.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, mat, n]} frustumCulled={false} />;
}

const sol = (pos: V3, lentes = false) => (
  <Mueve pos={pos} fn={(g, t) => (g.position.y = pos[1] + Math.sin(t * 2.2) * 0.12)}>
    <Ball pos={[0, 0, 0]} r={0.42} mat="neon" color="#ffd23f" cast={false} />
    {lentes && (
      <>
        <Block pos={[-0.15, 0.06, 0.38]} size={[0.26, 0.15, 0.06]} color="#14161c" solid={false} cast={false} />
        <Block pos={[0.15, 0.06, 0.38]} size={[0.26, 0.15, 0.06]} color="#14161c" solid={false} cast={false} />
      </>
    )}
  </Mueve>
);
const vapor = (pos: V3) => (
  <>
    {[0, 1, 2].map((i) => (
      <Mueve
        key={i}
        pos={pos}
        fn={(g, t) => {
          const k = (t * 0.5 + i / 3) % 1;
          g.position.set(pos[0] + Math.sin(k * 6 + i) * 0.06, pos[1] + k * 0.6, pos[2]);
          g.scale.setScalar(1 - k * 0.7);
        }}
      >
        <Ball pos={[0, 0, 0]} r={0.07} mat="neon" color="#f4f4f4" cast={false} />
      </Mueve>
    ))}
  </>
);

interface Actor {
  anim: Anim;
  pos?: V3;
  rot?: number;
  scale?: number;
  ropa?: Partial<AvatarConfig>;
  /** movimiento propio del actor (temblar, saltar, ir y venir) */
  mueve?: Mover;
}
interface Vineta {
  piso: [MatKind, string];
  /** fondo de la foto del álbum */
  cielo: string;
  actor: Actor;
  /** el decorado (y su movimiento); el actor y el texto los pone Meme3D */
  Set: () => ReactNode;
}

const VINETAS: Record<Escena, Vineta> = {
  pulperia: {
    piso: ['cobble', '#b9a07e'],
    cielo: '#9fd3f7',
    actor: { anim: 'idle', pos: [0.75, 0, 0.55], rot: -0.35, ropa: { shirt: 'camisa_rayas', shirtColor: '#e63946' } },
    Set: () => (
      <>
        <P.Stall pos={[-0.35, 0, -0.75]} scale={0.85} color="#1d7fc7" sign="PULPERÍA" solid={false} />
        <P.Crate pos={[-1.15, 0, 0.55]} scale={0.45} solid={false} />
        <P.Barrel pos={[1.15, 0, -0.85]} scale={0.5} color="#e63946" solid={false} />
        <Mueve
          pos={[0.75, 2.05, 0.6]}
          fn={(g, t) => {
            g.rotation.y = t * 3;
            g.position.y = 2.05 + Math.sin(t * 2) * 0.08;
          }}
        >
          <P.Coin r={0.18} />
        </Mueve>
      </>
    ),
  },
  bus: {
    piso: ['asphalt', '#55575c'],
    cielo: '#a8d8f5',
    actor: { anim: 'celebrate', pos: [0.35, 1.12, -0.25], scale: 0.7, rot: 0.2 },
    Set: () => (
      <Mueve
        fn={(g, t) => {
          g.position.y = Math.abs(Math.sin(t * 7)) * 0.05;
          g.rotation.z = Math.sin(t * 3.5) * 0.025;
        }}
      >
        <P.Bus pos={[0, 0, -0.25]} rot={Math.PI / 2} scale={0.43} solid={false} />
        <P.Crate pos={[-0.65, 1.12, -0.3]} scale={0.32} solid={false} />
        <P.Crate pos={[-0.95, 1.12, -0.05]} scale={0.26} color="#8e5a2e" solid={false} />
        <P.Barrel pos={[1.0, 1.12, -0.35]} scale={0.3} color="#2a9d4b" solid={false} />
        <Ball pos={[-0.35, 1.32, -0.55]} r={0.2} mat="cloth" color="#d9c38c" />
        <P.Tire pos={[1.05, 0, 0.75]} scale={0.45} solid={false} />
      </Mueve>
    ),
  },
  calor: {
    piso: ['sand', '#e8c983'],
    cielo: '#ffc46b',
    actor: {
      anim: 'wave',
      pos: [0.45, 0, 0.45],
      rot: -0.2,
      ropa: { face: 'cara_lentes', pants: 'short_futbol', shirtColor: '#ff7a3d' },
    },
    Set: () => (
      <>
        {sol([-0.85, 2.0, -0.55], true)}
        <Cyl pos={[1.15, 0.65, -0.7]} r={0.11} h={1.3} color="#f4f4f4" solid={false} />
        <Cyl pos={[1.15, 0.75, -0.6]} r={0.06} h={1.1} mat="neon" color="#ff2d2d" solid={false} />
        <P.Palm pos={[-1.2, 0, 0.7]} scale={0.32} solid={false} />
        <P.Rock pos={[1.05, 0, 0.75]} scale={0.35} color="#c9a26a" solid={false} />
      </>
    ),
  },
  frio: {
    piso: ['grass', '#a9c2a3'],
    cielo: '#c9d9e8',
    actor: {
      anim: 'idle',
      pos: [0.25, 0, 0.45],
      ropa: {
        hat: 'gorra',
        hatColor: '#3b6fd6',
        acc: 'panuelo_cuello',
        accColor: '#e63946',
        shirt: 'camisa_cuadros',
        shirtColor: '#5a3d8a',
        pants: 'jeans',
      },
      mueve: (g, t) => (g.position.x = 0.25 + Math.sin(t * 45) * 0.012),
    },
    Set: () => (
      <>
        <P.Pine pos={[-1.0, 0, -0.75]} scale={0.6} solid={false} />
        <P.Pine pos={[1.1, 0, -0.95]} scale={0.48} seed={4} solid={false} />
        <P.Rock pos={[-1.1, 0, 0.8]} scale={0.3} color="#dfe6ee" solid={false} />
        <Caen n={36} nieve />
      </>
    ),
  },
  lluvia: {
    piso: ['grass', '#4f8a43'],
    cielo: '#8193a6',
    actor: {
      anim: 'jump',
      pos: [0.3, 0, 0.55],
      ropa: { shirtColor: '#ffd23f' },
      mueve: (g, t) => (g.position.y = Math.abs(Math.sin(t * 2.6)) * 0.35),
    },
    Set: () => (
      <>
        <P.House pos={[-0.6, 0, -1.0]} w={2.2} d={1.1} scale={0.62} color="#e9d7a8" solid={false} />
        <Cyl pos={[0.3, 0.02, 0.55]} r={0.75} h={0.04} mat="water" color="#4d86b5" solid={false} cast={false} />
        <group position={[0.2, 2.15, -0.3]}>
          <Ball pos={[-0.45, 0, 0]} r={0.36} color="#6f7782" cast={false} />
          <Ball pos={[0.05, 0.12, 0]} r={0.46} color="#7b838e" cast={false} />
          <Ball pos={[0.55, 0, 0]} r={0.34} color="#6f7782" cast={false} />
        </group>
        <Caen n={40} />
      </>
    ),
  },
  comida: {
    piso: ['tile', '#d8c7a6'],
    cielo: '#ffd9a0',
    actor: { anim: 'clap', pos: [0.75, 0, 0.6], rot: -0.6, ropa: { shirtColor: '#2a9d4b' } },
    Set: () => (
      <>
        <Block pos={[-0.35, 0.72, -0.35]} size={[1.7, 0.08, 1.0]} mat="wood" color="#8a5a34" solid={false} />
        <Block pos={[-0.35, 0.34, -0.35]} size={[1.4, 0.68, 0.7]} mat="wood" color="#6e4426" solid={false} />
        <Cyl pos={[-0.35, 0.78, -0.3]} r={0.36} h={0.04} color="#f4f4f4" solid={false} />
        <Mueve pos={[-0.35, 0.86, -0.3]} fn={(g, t) => (g.rotation.y = Math.sin(t * 1.5) * 0.4)}>
          <group scale={[1, 0.3, 0.75]}>
            <Ball pos={[0, 0, 0]} r={0.3} color="#f1d9a8" />
          </group>
          <Block pos={[0.1, 0.04, 0.05]} size={[0.3, 0.05, 0.12]} color="#7a3b1c" solid={false} />
        </Mueve>
        {vapor([-0.35, 1.0, -0.3])}
        <Cyl pos={[0.35, 0.86, -0.55]} r={0.09} h={0.22} mat="glass" color="#ffcf6b" solid={false} />
      </>
    ),
  },
  cafe: {
    piso: ['wood', '#7a5230'],
    cielo: '#26324f',
    actor: {
      anim: 'idle',
      pos: [0.8, 0, 0.55],
      rot: -0.4,
      ropa: { hat: 'sombrero_junco', hatColor: '#d9b46a', shirt: 'guayabera', shirtColor: '#f4f4f4' },
    },
    Set: () => (
      <>
        <Cyl pos={[-0.3, 0.42, -0.3]} r={0.52} rTop={0.6} h={0.84} color="#f4f1ea" solid={false} />
        <Cyl pos={[-0.3, 0.83, -0.3]} r={0.52} h={0.04} color="#4a2a16" solid={false} cast={false} />
        <Block pos={[0.35, 0.45, -0.3]} size={[0.14, 0.45, 0.14]} color="#f4f1ea" solid={false} />
        {vapor([-0.3, 1.0, -0.3])}
        <P.Bush pos={[-1.15, 0, 0.6]} scale={0.55} color="#2f6b35" solid={false} />
        <Ball pos={[-1.0, 0.45, 0.85]} r={0.07} color="#c0262d" />
        <Ball pos={[-1.25, 0.38, 0.9]} r={0.07} color="#c0262d" />
        <P.Lamp pos={[1.15, 0, -0.95]} scale={0.6} solid={false} />
      </>
    ),
  },
  futbol: {
    piso: ['grass', '#3f9b4b'],
    cielo: '#9fd3f7',
    actor: {
      anim: 'kick',
      pos: [0.55, 0, 0.7],
      rot: 2.6,
      ropa: { shirt: 'camisa_h', shirtColor: '#1d4fbf', pants: 'short_futbol', pantsColor: '#ffffff' },
    },
    Set: () => (
      <>
        <P.Goal pos={[-0.3, 0, -1.15]} w={2.3} h={1.3} solid={false} />
        <Block
          pos={[0, 0.005, 0.15]}
          size={[2.9, 0.01, 0.06]}
          mat="plastic"
          color="#ffffff"
          solid={false}
          cast={false}
        />
        <Mueve
          fn={(g, t) => {
            const k = Math.max(0, ((t % 0.95) / 0.95 - 0.2) / 0.8);
            g.position.set(0.35 - k * 0.6, 0.16 + Math.sin(Math.PI * k) * 0.5, 0.45 - k * 1.5);
          }}
        >
          <P.SoccerBall r={0.16} />
        </Mueve>
      </>
    ),
  },
  playa: {
    piso: ['sand', '#ecd59a'],
    cielo: '#7fd0f0',
    actor: {
      anim: 'dance',
      pos: [0.35, 0, 0.6],
      ropa: {
        shirt: 'camisa_504',
        shirtColor: '#ff7a3d',
        pants: 'short_futbol',
        pantsColor: '#1d7fc7',
        face: 'cara_lentes',
      },
    },
    Set: () => (
      <>
        <Mueve pos={[0, 0.03, -1.0]} fn={(g, t) => (g.position.y = 0.03 + Math.sin(t * 1.6) * 0.025)}>
          <Block pos={[0, 0, 0]} size={[3.0, 0.06, 1.0]} mat="water" color="#2b8fc4" solid={false} cast={false} />
          <P.Boat pos={[0.6, 0.02, 0.05]} rot={Math.PI / 2} scale={0.32} color="#e63946" solid={false} />
        </Mueve>
        <P.Palm pos={[-1.05, 0, -0.05]} scale={0.44} solid={false} />
        {sol([1.05, 2.25, -1.1])}
      </>
    ),
  },
  montana: {
    piso: ['grass', '#5f9a4c'],
    cielo: '#a7d3ee',
    actor: {
      anim: 'walk',
      pos: [0.7, 0, 0.55],
      rot: -0.8,
      ropa: { acc: 'mochila', accColor: '#e63946', hat: 'casco_explorador', hatColor: '#c9a66b' },
      mueve: (g, t) => (g.position.y = Math.abs(Math.sin(t * 5.5)) * 0.04),
    },
    Set: () => (
      <>
        <Cyl
          pos={[-0.45, 1.05, -0.55]}
          r={1.05}
          rTop={0.12}
          h={2.1}
          sides={7}
          mat="stone"
          color="#7d8a6a"
          solid={false}
        />
        <Cyl pos={[-0.45, 1.85, -0.55]} r={0.36} rTop={0.12} h={0.5} sides={7} color="#f4f4f4" solid={false} />
        <Mueve pos={[-0.45, 2.3, -0.55]} fn={(g, t) => (g.rotation.y = Math.sin(t * 2) * 0.5)}>
          <Block pos={[0.18, 0.12, 0]} size={[0.32, 0.2, 0.02]} color="#1d7fc7" solid={false} />
          <Cyl pos={[0, 0, 0]} r={0.02} h={0.45} color="#5a3d26" solid={false} />
        </Mueve>
        <P.Pine pos={[1.15, 0, -0.95]} scale={0.45} solid={false} />
        <P.Rock pos={[-1.15, 0, 0.85]} scale={0.4} solid={false} />
      </>
    ),
  },
  mercado: {
    piso: ['cobble', '#a59a8a'],
    cielo: '#9fd3f7',
    actor: {
      anim: 'carry',
      pos: [0.6, 0, 0.55],
      rot: -0.3,
      ropa: {
        hair: 'pelo_trenzas',
        body: 'm',
        shirt: 'blusa_tipica',
        shirtColor: '#ff9fc2',
        pants: 'falda_tipica',
        pantsColor: '#1d7fc7',
      },
    },
    Set: () => (
      <>
        <P.Stall pos={[-0.45, 0, -0.75]} scale={0.85} color="#2a9d4b" sign="MERCADO" solid={false} />
        <P.Crate pos={[-1.15, 0, 0.6]} scale={0.4} solid={false} />
        <Ball pos={[-1.2, 0.48, 0.6]} r={0.12} color="#ff8c1a" />
        <Ball pos={[-1.05, 0.48, 0.55]} r={0.12} color="#ffd23f" />
        <Mueve pos={[0.6, 0, 0.55]} fn={(g, t) => (g.position.y = Math.sin(t * 3) * 0.03)}>
          <group rotation-y={-0.3}>
            <P.Crate pos={[0, 0.82, 0.42]} scale={0.32} color="#c98f5f" solid={false} />
            <Ball pos={[-0.06, 1.16, 0.42]} r={0.1} color="#e63946" />
            <Ball pos={[0.08, 1.16, 0.45]} r={0.1} color="#ffd23f" />
          </group>
        </Mueve>
      </>
    ),
  },
  fiesta: {
    piso: ['tile', '#c44b8a'],
    cielo: '#2c2252',
    actor: {
      anim: 'dance2',
      pos: [0.2, 0, 0.45],
      ropa: { shirt: 'camisa_504', shirtColor: '#ffd23f', hat: 'corona_carnaval', hatColor: '#ff3fa4' },
    },
    Set: () => (
      <>
        {['#ff3fa4', '#3fd2ff', '#ffd23f', '#7cff6b'].map((c, i) => (
          <Mueve
            key={c}
            pos={[-1.1 + i * 0.7, 2.0, -0.9 + (i % 2) * 0.3]}
            fn={(g, t) => (g.position.y = 2.0 + Math.sin(t * 2 + i * 1.7) * 0.15)}
          >
            <Ball pos={[0, 0, 0]} r={0.2} mat="neon" color={c} cast={false} />
            <Cyl pos={[0, -0.45, 0]} r={0.01} h={0.7} color="#ffffff" solid={false} cast={false} />
          </Mueve>
        ))}
        <P.Barrel pos={[-1.15, 0, 0.6]} scale={0.45} color="#7b2ff7" solid={false} />
        <Mueve pos={[1.05, 0, -0.6]} fn={(g, t) => g.scale.setScalar(1 + Math.max(0, Math.sin(t * 8)) * 0.06)}>
          <Block pos={[0, 0.55, 0]} size={[0.6, 1.1, 0.5]} color="#1d1f24" solid={false} />
          <Cyl pos={[0, 0.75, 0.26]} r={0.17} h={0.02} mat="neon" color="#3fd2ff" solid={false} />
          <Cyl pos={[0, 0.3, 0.26]} r={0.12} h={0.02} mat="neon" color="#ff3fa4" solid={false} />
        </Mueve>
      </>
    ),
  },
  casa: {
    piso: ['grass', '#58a845'],
    cielo: '#9fd3f7',
    actor: { anim: 'wave', pos: [0.55, 0, 0.6], rot: -0.25 },
    Set: () => (
      <>
        <P.House pos={[-0.35, 0, -0.85]} w={2.6} d={1.3} scale={0.68} color="#f2c4a4" solid={false} />
        <P.Flowers pos={[-1.2, 0, 0.55]} scale={0.6} solid={false} />
        <P.Bush pos={[1.2, 0, -0.1]} scale={0.45} solid={false} />
        <Mueve
          pos={[-1.05, 2.1, 0.4]}
          fn={(g, t) => g.position.set(-1.05 + Math.sin(t * 0.8) * 0.25, 2.1 + Math.sin(t * 3) * 0.05, 0.4)}
        >
          <Ball pos={[0, 0, 0]} r={0.09} color="#ffffff" />
          <Ball pos={[0.12, 0.03, 0]} r={0.07} color="#ffffff" />
        </Mueve>
      </>
    ),
  },
  luz: {
    piso: ['tile', '#3b3f52'],
    cielo: '#0e1426',
    actor: { anim: 'sit', pos: [0.45, 0, 0.55], rot: -0.4, ropa: { shirtColor: '#7b2ff7' } },
    Set: () => {
      const prendida = (t: number) => t % 2.4 < 1.2;
      return (
        <>
          <P.Lamp pos={[-1.1, 0, -0.8]} scale={0.75} solid={false} />
          <Mueve fn={(g, t) => (g.visible = prendida(t))}>
            <Ball pos={[-1.1, 2.33, -0.8]} r={0.17} mat="neon" color="#fff2a8" cast={false} />
            <Block
              pos={[0.15, 0.95, -0.72]}
              size={[0.9, 0.55, 0.04]}
              mat="neon"
              color="#5fc8ff"
              solid={false}
              cast={false}
            />
          </Mueve>
          <Block pos={[0.15, 0.95, -0.76]} size={[0.98, 0.62, 0.06]} color="#1d1f24" solid={false} />
          <Block pos={[0.15, 0.5, -0.65]} size={[1.4, 0.06, 0.6]} mat="wood" color="#6e4426" solid={false} />
          <Block pos={[0.15, 0.24, -0.65]} size={[1.2, 0.48, 0.5]} mat="wood" color="#4f311b" solid={false} />
        </>
      );
    },
  },
  maiz: {
    piso: ['dirt', '#8a6a44'],
    cielo: '#b8e0f5',
    actor: {
      anim: 'run',
      pos: [0.6, 0, 0.6],
      rot: 1.0,
      ropa: {
        hat: 'sombrero_vaquero',
        hatColor: '#8a5a34',
        shirt: 'camisa_manta',
        shirtColor: '#f1e6cf',
        pants: 'pantalon_manta',
        pantsColor: '#f1e6cf',
      },
    },
    Set: () => (
      <>
        {[
          [-1.1, -0.9],
          [-0.4, -1.0],
          [0.35, -0.95],
          [1.05, -0.8],
          [-1.15, 0.2],
        ].map(([x, z], i) => (
          <Mueve key={i} pos={[x, 0, z]} fn={(g, t) => (g.rotation.z = Math.sin(t * 1.4 + i) * 0.08)}>
            <Cyl pos={[0, 0.8, 0]} r={0.045} h={1.6} color="#4f8f2f" solid={false} />
            <Cyl pos={[0.08, 1.05, 0.04]} r={0.07} rTop={0.04} h={0.32} color="#f2c230" solid={false} />
          </Mueve>
        ))}
      </>
    ),
  },
  pesca: {
    piso: ['sand', '#d9c08a'],
    cielo: '#9fd3f7',
    actor: {
      anim: 'throw',
      pos: [0.85, 0, 0.6],
      rot: -1.0,
      ropa: { hat: 'sombrero_junco', hatColor: '#d9b46a', pants: 'short_futbol', pantsColor: '#2a9d4b' },
    },
    Set: () => (
      <>
        <Block
          pos={[-0.55, 0.02, -0.2]}
          size={[1.9, 0.06, 2.5]}
          mat="water"
          color="#2f7fb0"
          solid={false}
          cast={false}
        />
        <Mueve
          pos={[-0.7, 0.05, -0.75]}
          fn={(g, t) => {
            g.position.y = 0.05 + Math.sin(t * 1.8) * 0.03;
            g.rotation.z = Math.sin(t * 1.3) * 0.05;
          }}
        >
          <P.Boat pos={[0, 0, 0]} scale={0.45} color="#ffd23f" solid={false} />
        </Mueve>
        <Mueve
          fn={(g, t) => {
            const k = (t % 1.6) / 1.6;
            g.position.set(-0.3 + k * 0.5, 0.05 + Math.sin(Math.PI * k) * 0.9, 0.5);
            g.rotation.z = -1.2 + k * 2.4;
            g.visible = k < 0.98;
          }}
        >
          <group scale={[1.6, 0.7, 0.6]}>
            <Ball pos={[0, 0, 0]} r={0.16} color="#ff8c1a" />
          </group>
        </Mueve>
      </>
    ),
  },
  ruinas: {
    piso: ['grass', '#6aa04f'],
    cielo: '#a9dbe8',
    actor: {
      anim: 'wave',
      pos: [0.75, 0, 0.6],
      rot: -0.4,
      ropa: { hat: 'casco_explorador', hatColor: '#c9a66b', acc: 'mochila', accColor: '#5a3d26' },
    },
    Set: () => (
      <>
        {[0, 1, 2, 3].map((i) => (
          <Block
            key={i}
            pos={[-0.45, 0.2 + i * 0.4, -0.75 + i * -0.08]}
            size={[2.0 - i * 0.42, 0.4, 1.4 - i * 0.25]}
            mat="stone"
            color={i % 2 ? '#8f8a74' : '#a19b82'}
            solid={false}
          />
        ))}
        <P.Statue pos={[1.05, 0, -0.75]} scale={0.6} color="#7d8f80" solid={false} />
        <Mueve
          pos={[-0.45, 2.0, -1.0]}
          fn={(g, t) => {
            g.rotation.y = t * 1.5;
            g.position.y = 2.0 + Math.sin(t * 2) * 0.08;
          }}
        >
          <P.Gem color="#3fbf7a" />
        </Mueve>
      </>
    ),
  },
  trafico: {
    piso: ['asphalt', '#4a4c51'],
    cielo: '#b9cfe0',
    actor: { anim: 'idle', pos: [0.95, 0, 0.75], rot: -0.6, ropa: { shirtColor: '#7b2ff7' } },
    Set: () => (
      <>
        <Block pos={[0, 0.005, -0.35]} size={[2.9, 0.01, 0.07]} color="#ffd23f" solid={false} cast={false} />
        {(
          [
            [-0.1, -0.85, '#e63946', 0],
            [0.2, 0.2, '#ffffff', 1.3],
          ] as const
        ).map(([x, z, c, f]) => (
          <Mueve key={c} pos={[x, 0, z]} fn={(g, t) => (g.position.x = x + Math.max(0, Math.sin(t * 1.2 + f)) * 0.12)}>
            <P.Car pos={[0, 0, 0]} rot={Math.PI / 2} scale={0.52} color={c} solid={false} />
          </Mueve>
        ))}
        <P.Cone pos={[1.25, 0, -0.35]} scale={0.5} solid={false} />
        <Mueve
          pos={[-1.05, 0.25, 0.25]}
          fn={(g, t) => {
            const k = (t * 0.6) % 0.5;
            g.position.x = -1.05 - k;
            g.scale.setScalar(0.5 + k);
          }}
        >
          <Ball pos={[0, 0, 0]} r={0.12} color="#9aa0a6" cast={false} />
        </Mueve>
      </>
    ),
  },
};

/** Chiste propio de algunos memes: cambia el actor o el decorado de su escena (la escena sigue siendo la base). */
const ESPECIALES: Record<string, Partial<Vineta>> = {
  'buses-en-mi-pais': {
    cielo: '#9fd3f7',
    actor: { anim: 'wave', pos: [0.35, 1.52, -0.25], scale: 0.58, rot: 0.2 },
    Set: () => (
      <>
        <Mueve
          fn={(g, t) => {
            g.position.y = 0.42 + Math.sin(t * 2.4) * 0.05;
            g.rotation.z = Math.sin(t * 1.7) * 0.04;
          }}
        >
          <P.Bus pos={[0, 0, -0.25]} rot={Math.PI / 2} scale={0.43} solid={false} />
          <P.Crate pos={[-0.7, 1.12, -0.3]} scale={0.3} solid={false} />
          <P.Barrel pos={[1.0, 1.12, -0.35]} scale={0.28} color="#2a9d4b" solid={false} />
          {[
            [-0.8, 0.05],
            [0.8, 0.05],
            [-0.8, -0.55],
            [0.8, -0.55],
          ].map(([x, z], i) => (
            <group key={i} position={[x, 0, z]}>
              <Cyl pos={[0, 0.02, 0]} r={0.11} h={0.14} mat="metal" color="#5c636e" solid={false} />
              <Mueve fn={(g, t) => g.scale.set(1, 0.75 + Math.abs(Math.sin(t * 23 + i * 2)) * 0.5, 1)}>
                <Cyl
                  pos={[0, -0.25, 0]}
                  r={0.03}
                  rTop={0.14}
                  h={0.5}
                  mat="neon"
                  color="#ff8c1a"
                  solid={false}
                  cast={false}
                />
              </Mueve>
            </group>
          ))}
        </Mueve>
        {[0, 1, 2].map((i) => (
          <Mueve
            key={i}
            fn={(g, t) => {
              const k = (t * 0.7 + i / 3) % 1;
              g.position.set(-0.9 + i * 0.9 + Math.sin(i * 4) * 0.2, 0.12 + k * 0.15, -0.1 + k * 0.5);
              g.scale.setScalar(0.4 + k * 1.1);
            }}
          >
            <Ball pos={[0, 0, 0]} r={0.2} color="#b9bec6" cast={false} />
          </Mueve>
        ))}
      </>
    ),
  },
  'prohibido-pisar-el-mar': {
    actor: {
      anim: 'idle',
      pos: [0.75, 0, 0.55],
      rot: -2.3,
      ropa: { pants: 'short_futbol', pantsColor: '#1d7fc7', shirtColor: '#ff7a3d' },
      mueve: (g, t) => (g.rotation.z = Math.sin(t * 1.4) * 0.06),
    },
    Set: () => (
      <>
        <Mueve pos={[0, 0.03, -0.95]} fn={(g, t) => (g.position.y = 0.03 + Math.sin(t * 1.6) * 0.025)}>
          <Block pos={[0, 0, 0]} size={[3.0, 0.06, 1.1]} mat="water" color="#2b8fc4" solid={false} cast={false} />
        </Mueve>
        <Cyl pos={[-0.35, 0.55, -0.2]} r={0.05} h={1.1} mat="wood" color="#6e4426" solid={false} />
        <Block pos={[-0.35, 1.4, -0.2]} size={[2.1, 0.8, 0.06]} mat="wood" color="#f4f1ea" solid={false} />
        <Plate pos={[-0.35, 1.58, -0.16]} text="PROHIBIDO PISAR" h={0.3} fg="#c0262d" bg="#f4f1ea" />
        <Plate pos={[-0.35, 1.24, -0.16]} text="EN EL MAR" h={0.3} fg="#c0262d" bg="#f4f1ea" />
        <Mueve pos={[0.75, 2.05, 0.55]} fn={(g, t) => (g.position.y = 2.05 + Math.abs(Math.sin(t * 2.5)) * 0.12)}>
          <Plate pos={[0, 0, 0]} text="?" h={0.36} fg="#ffffff" bg={FONDO} />
        </Mueve>
        <P.Palm pos={[1.15, 0, -0.5]} scale={0.45} solid={false} />
      </>
    ),
  },
  'cuando-nieva-ma': {
    actor: {
      anim: 'wave',
      pos: [0.4, 0, 0.5],
      rot: -0.2,
      scale: 0.72,
      ropa: { pants: 'short_futbol', shirtColor: '#3fd2ff', hair: 'pelo_rizado' },
    },
    Set: () => (
      <>
        {sol([-0.9, 2.05, -0.7], true)}
        <P.Palm pos={[1.1, 0, -0.7]} scale={0.42} solid={false} />
        <P.Rock pos={[-1.1, 0, 0.8]} scale={0.3} color="#c9a26a" solid={false} />
        <Caen n={14} nieve funde />
      </>
    ),
  },
  honduraslover: {
    actor: { anim: 'celebrate', pos: [0, 0, 0.35], ropa: { shirt: 'camisa_h', shirtColor: '#00a3d7', pants: 'jeans' } },
    Set: () => (
      <>
        {[
          [-1.15, -0.85, 0.4],
          [1.15, -0.85, 2.7],
          [-1.2, 0.75, -0.3],
          [1.2, 0.75, 3.4],
          [0, -1.2, 1.57],
        ].map(([x, z, r], i) => (
          <P.Flag key={i} pos={[x, 0, z]} rot={r} height={4} scale={0.32} solid={false} />
        ))}
      </>
    ),
  },
};

const FONDO = 'rgba(12,16,24,0.88)',
  ROTULO = { fg: '#ffffff', bg: FONDO, radius: 0.18 } as const;
/** Parte el texto en líneas de hasta `max` letras sin cortar palabras. */
export function lineas(texto: string, max: number) {
  const out: string[] = [];
  for (const p of texto.toUpperCase().split(/\s+/).filter(Boolean)) {
    const ult = out.length - 1;
    if (ult >= 0 && out[ult].length + 1 + p.length <= max) out[ult] += ` ${p}`;
    else out.push(p);
  }
  return out;
}
/** Bloque de rótulos centrado en x; `y0` es el borde de abajo del bloque. Ajusta la altura para no pasar de `ancho`. */
function Rotulos({
  texto,
  y0,
  z,
  max,
  h,
  ancho,
  alto,
}: {
  texto: string;
  y0: number;
  z: number;
  max: number;
  h: number;
  ancho: number;
  alto?: number;
}) {
  const ls = lineas(texto, max),
    asp = Math.max(
      ...ls.map((l) => {
        const im = textTexture(l, ROTULO).image;
        return im.width / im.height;
      }),
    ),
    hh = Math.min(h, ancho / asp, alto ? alto / (ls.length * 1.1) : h),
    paso = hh * 1.1;
  return (
    <>
      {ls.map((l, i) => (
        <Plate
          key={i}
          pos={[0, y0 + (ls.length - 1 - i) * paso + hh / 2, z]}
          text={l}
          h={hh}
          fg={ROTULO.fg}
          bg={FONDO}
        />
      ))}
    </>
  );
}

const vinetaDe = (m: Meme): Vineta => ({ ...VINETAS[m.escena], ...ESPECIALES[m.id] });
export const cieloDe = (m: Meme) => vinetaDe(m).cielo;

export function Meme3D({ meme }: { meme: Meme }) {
  const v = useMemo(() => vinetaDe(meme), [meme]),
    { actor } = v,
    cfg = useMemo(() => ({ ...SHOP.defaultAvatar, ...actor.ropa }) as AvatarConfig, [actor]),
    estado = useMemo<AvatarState>(
      () => ({ anim: actor.anim, speed: actor.anim === 'run' || actor.anim === 'walk' ? 4 : 0 }),
      [actor],
    ),
    pos = actor.pos ?? [0.4, 0, 0.5];
  const Decorado = v.Set;
  return (
    <>
      <Block
        pos={[0, -ZOCALO / 2 - 0.03, 0]}
        size={[3.1, ZOCALO - 0.06, 3.1]}
        mat="stone"
        color="#5b5248"
        solid={false}
      />
      <Block pos={[0, -0.03, 0]} size={[3.06, 0.06, 3.06]} mat={v.piso[0]} color={v.piso[1]} solid={false} />
      <Decorado />
      <Mueve pos={pos} fn={actor.mueve ?? (() => {})}>
        <group rotation-y={actor.rot ?? 0} scale={actor.scale ?? 1}>
          <art.Avatar config={cfg} state={estado} />
        </group>
      </Mueve>
      <Rotulos texto={meme.arriba} y0={2.62} z={0} max={15} h={0.48} ancho={ANCHO} />
      <Rotulos texto={meme.abajo} y0={-ZOCALO + 0.07} z={1.57} max={17} h={0.42} ancho={3.0} alto={ZOCALO - 0.12} />
    </>
  );
}
