// Diorama 3D de la pantalla de inicio: el kiosko del parque, la bandera, palmeras, tu personaje bailando punta
// y una guacamaya dando vueltas. Usa el paquete de arte activo, así que cada versión se ve con su propio estilo.

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SHOP } from '../../core/data';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { AvatarConfig, AvatarState } from '../../core/types';
import { art } from '../../game/kit/art';
import { IS_HD } from '../../variant';
import { TEST } from '../lib';

const P = art.props;
const FRIENDS: { cfg: Partial<AvatarConfig>; pos: [number, number, number]; rot: number; anim: AvatarState['anim'] }[] =
  [
    {
      cfg: {
        hair: 'pelo_largo',
        face: 'cara_feliz',
        shirt: 'blusa_tipica',
        pants: 'falda_tipica',
        hat: 'panuelo_lenca',
        skin: '#a56b43',
      },
      pos: [-2.6, 0, 5.2],
      rot: 0.5,
      anim: 'dance2',
    },
    {
      cfg: {
        hair: 'pelo_rizado',
        face: 'cara_bigote',
        shirt: 'guayabera',
        pants: 'pantalon_manta',
        hat: 'sombrero_junco',
        acc: 'tambor_garifuna',
        skin: '#7a4a2b',
      },
      pos: [2.9, 0, 4.4],
      rot: -0.6,
      anim: 'clap',
    },
    {
      cfg: {
        hair: 'pelo_afro',
        face: 'cara_lentes',
        shirt: 'camisa_h',
        pants: 'short_futbol',
        pantsColor: '#ffffff',
        skin: '#4f2f1c',
      },
      pos: [5.4, 0, 6.6],
      rot: -1,
      anim: 'celebrate',
    },
  ];

function Rig() {
  const { camera, size } = useThree(),
    look = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime,
      cam = camera as THREE.PerspectiveCamera,
      portrait = size.height > size.width;
    const a = Math.sin(t * 0.11) * 0.55 + 0.25,
      r = portrait ? 21 : 15.5;
    cam.position.set(Math.sin(a) * r, 4.6 + Math.sin(t * 0.17) * 0.5, Math.cos(a) * r + 2);
    look.set(0, portrait ? 2.6 : 2.3, 1.5);
    cam.lookAt(look);
    const fov = portrait ? 52 : 44;
    if (cam.fov !== fov) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
    // en horizontal el menú ocupa la izquierda: corre la escena hacia la derecha; en vertical, un poco hacia arriba
    const ox = portrait ? 0 : -0.19 * size.width,
      oy = portrait ? 0.07 * size.height : 0.03 * size.height;
    cam.setViewOffset(size.width, size.height, ox, oy, size.width, size.height);
  });
  return null;
}
function Bird() {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.55,
      o = g.current;
    if (!o) return;
    o.position.set(Math.cos(t) * 8.5, 7.4 + Math.sin(t * 2.1) * 0.7, Math.sin(t) * 6.5 - 1.5);
    o.rotation.y = -t;
    o.rotation.z = Math.sin(t * 9) * 0.12;
  });
  return (
    <group ref={g}>
      <P.Macaw pos={[0, 0, 0]} flying solid={false} scale={1.5} />
    </group>
  );
}
function Me() {
  const avatar = useGame((s) => s.profile.avatar),
    state = useRef<AvatarState>({ anim: 'dance', speed: 0 }).current;
  return (
    <group position={[0.4, 0, 6.2]} rotation-y={0.25}>
      <art.Avatar config={avatar} state={state} scale={1.15} />
    </group>
  );
}
function World() {
  const states = useMemo(() => FRIENDS.map((f) => ({ anim: f.anim, speed: 0 }) as AvatarState), []);
  const m = art.material;
  return (
    <>
      <art.SkyRig time={IS_HD ? 'tarde' : 'dia'} weather="despejado" shadowRadius={26} fogFar={170} />
      <mesh rotation-x={-Math.PI / 2} receiveShadow material={m('grass', '#58a845')}>
        <planeGeometry args={[260, 260]} />
      </mesh>
      <mesh position={[0, 0.04, 1]} receiveShadow material={m('cobble', '#d9c9a8')}>
        <cylinderGeometry args={[11.5, 11.5, 0.08, 40]} />
      </mesh>
      <mesh position={[0, 0.07, 1]} receiveShadow material={m('tile', '#c9684a')}>
        <cylinderGeometry args={[4.6, 4.6, 0.08, 32]} />
      </mesh>
      <P.Kiosk pos={[0, 0, 0]} solid={false} />
      <P.Flag pos={[-6.2, 0, 2.5]} height={8.5} solid={false} />
      <P.Palm pos={[7.5, 0, -1.5]} solid={false} scale={1.15} />
      <P.Palm pos={[-8.5, 0, -3]} solid={false} seed={3} />
      <P.Palm pos={[10.5, 0, 5]} solid={false} seed={5} scale={0.9} />
      <P.Palm pos={[-12, 0, 6]} solid={false} seed={8} />
      <P.Tree pos={[-14, 0, -9]} solid={false} />
      <P.Tree pos={[13.5, 0, -10]} solid={false} seed={2} />
      <P.Tree pos={[2, 0, -16]} solid={false} seed={4} scale={1.2} />
      <P.House pos={[-9, 0, -13]} solid={false} sign="Pulpería Doña Toña" color="#ffd9a0" />
      <P.House pos={[8.5, 0, -14.5]} solid={false} floors={2} color="#9fd3c7" w={7} />
      <P.House pos={[20, 0, -6]} solid={false} rot={-0.9} color="#f6b1a0" roofColor="#8d3b2a" />
      <P.Stall pos={[-5.5, 0, 8.2]} rot={0.7} sign="Baleadas" solid={false} />
      <P.Bench pos={[5.2, 0, 1.2]} rot={-1.2} solid={false} />
      <P.Lamp pos={[8.6, 0, 3.4]} solid={false} />
      <P.Lamp pos={[-3.6, 0, -4.4]} solid={false} />
      <P.Bush pos={[-3.4, 0, 9.6]} solid={false} />
      <P.Flowers pos={[2.2, 0, 9.4]} solid={false} />
      <P.Flowers pos={[-7.6, 0, 5.6]} solid={false} />
      <P.Bush pos={[8.4, 0, 8.8]} solid={false} />
      <P.Mototaxi pos={[11.5, 0, 0.5]} rot={-0.5} solid={false} />
      <Me />
      {FRIENDS.map((f, i) => (
        <group key={i} position={f.pos} rotation-y={f.rot}>
          <art.Avatar config={{ ...SHOP.defaultAvatar, ...f.cfg }} state={states[i]} />
        </group>
      ))}
      <Bird />
      <Rig />
    </>
  );
}

export function MenuScene() {
  const quality = useGame((s) => s.profile.settings.quality);
  useMemo(() => {
    player.teleport(0, 0, 4);
  }, []); // el sol del cielo sigue al jugador: lo centramos en el diorama
  const Effects = art.Effects ?? (({ children }: { children?: React.ReactNode }) => <>{children}</>);
  return (
    <Canvas
      shadows={quality !== 'baja' && !TEST}
      dpr={TEST ? 0.6 : quality === 'alta' ? [1, 1.75] : quality === 'media' ? 1 : 0.75}
      camera={{ fov: 44, near: 0.2, far: 400, position: [4, 5, 17] }}
      gl={{ antialias: quality !== 'baja', powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
    >
      <Suspense fallback={null}>
        <Effects>
          <World />
        </Effects>
      </Suspense>
    </Canvas>
  );
}
