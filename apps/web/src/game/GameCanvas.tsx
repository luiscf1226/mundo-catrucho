// Lienzo 3D: monta la escena activa (lobby, departamento o minijuego) y al jugador.

import { Canvas } from '@react-three/fiber';
import { lazy, type ReactNode, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Track } from '../core/audio';
import { audio } from '../core/audio';
import { bindPointer } from '../core/input';
import { interactions } from '../core/interact';
import { phys } from '../core/phys';
import { player } from '../core/player';
import { useGame } from '../core/store';
import type { MinigameId } from '../core/types';
import { LoadingScreen } from '../ui/LoadingScreen';

import { Gallery } from './dev/Gallery';
import { EnVivo } from './EnVivo';
import { art } from './kit/art';
import { Lobby } from './lobby/Lobby';
import { MINIGAME_SCENES } from './minigames';
import { PlayerController } from './PlayerController';
import { Viaje } from './viaje/Viaje';

const Department = lazy(() => import('./dept/Department').then((m) => ({ default: m.Department })));
function LoadingScene({ onChange }: { onChange: (loading: boolean) => void }) {
  useLayoutEffect(() => {
    onChange(true);
    return () => onChange(false);
  }, [onChange]);
  return null;
}

/** Limpia la física y los valores del jugador ANTES de que la escena nueva registre lo suyo. */
function SceneRoot({ children }: { children: ReactNode }) {
  useState(() => {
    phys.reset();
    interactions.clear();
    player.resetForScene();
    player.setSpawn([0, 0, 0]);
    return 0;
  });
  return <>{children}</>;
}
/** Si se vuelve de un minijuego, deja al jugador en el puesto de donde salió (corre después del Spawn de la escena). */
function Llegada() {
  useLayoutEffect(() => {
    const s = useGame.getState(),
      l = s.tomarLlegada();
    if (l) player.teleport(l.pos[0], l.pos[1], l.pos[2], l.yaw);
    if (s.scene.kind === 'lobby') {
      player.camPitch = 0.26;
      player.camDist = 11;
    }
  }, []);
  return null;
} // en el mapa gigante la cámara abre más para que se vea el país
/** Música de los motores nuevos: reutilizan pistas existentes salvo que core/audio tenga una propia. */
const PISTA: Partial<Record<MinigameId, Track>> = {
  corte: 'feria',
  monta: 'feria',
  ritmo: 'none',
  ruta: 'carrera',
  pesca: 'dept',
  atrapa: 'feria',
  cocina: 'pulperia',
  trivia: 'exploradores',
  manejo: 'carrera',
};
function ActiveScene() {
  const scene = useGame((s) => s.scene),
    key = useGame((s) => s.sceneKey);
  useEffect(() => {
    audio.music(
      scene.kind === 'lobby'
        ? 'lobby'
        : scene.kind === 'dept'
          ? 'dept'
          : scene.kind === 'viaje'
            ? 'none'
            : (audio.tracks as string[]).includes(scene.id)
              ? (scene.id as Track)
              : (PISTA[scene.id] ?? 'feria'),
    );
  }, [scene]);
  let node: ReactNode;
  if (location.hash.includes('galeria')) node = <Gallery />;
  else if (scene.kind === 'lobby') node = <Lobby />;
  else if (scene.kind === 'dept') node = <Department id={scene.id} />;
  else if (scene.kind === 'viaje') node = <Viaje veh={scene.veh} to={scene.to} />;
  else {
    const S = MINIGAME_SCENES[scene.id].Scene;
    node = <S />;
  }
  return (
    <SceneRoot key={key}>
      {node}
      <Llegada />
    </SceneRoot>
  );
}

export function GameCanvas() {
  const quality = useGame((s) => s.profile.settings.quality),
    wrap = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => (wrap.current ? bindPointer(wrap.current) : undefined), []);
  const Effects = art.Effects ?? (({ children }: { children?: ReactNode }) => <>{children}</>);
  const test = typeof location !== 'undefined' && location.hash.includes('test');
  return (
    <div ref={wrap} className="absolute inset-0 touch-none" data-testid="canvas-wrap">
      <Canvas
        shadows={quality !== 'baja' && !test}
        dpr={test ? 0.6 : quality === 'alta' ? [1, 2] : quality === 'media' ? 1 : 0.75}
        camera={{ fov: 60, near: 0.1, far: 700, position: [0, 6, 10] }}
        gl={{ antialias: quality !== 'baja', powerPreference: 'high-performance' }}
        onCreated={({ gl, scene }) => {
          (window as any).__mc.gl = gl;
          (window as any).__mc.scene = scene;
        }}
      >
        <Suspense fallback={<LoadingScene onChange={setLoading} />}>
          <Effects>
            <ActiveScene />
            <PlayerController />
            <EnVivo />
          </Effects>
        </Suspense>
      </Canvas>
      {loading && <LoadingScreen />}
    </div>
  );
}
