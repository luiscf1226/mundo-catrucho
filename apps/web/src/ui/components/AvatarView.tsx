// Vista 3D pequeña del avatar (editor de personaje, tienda, perfil). Lienzo propio: no depende del mundo.
// Arrastrar gira al personaje; al soltar vuelve a girar despacito solo. Las pruebas pueden fijar el giro y la
// animación con `window.__mcAvView = { yaw, anim }` para sacar hojas de capturas.
import { Component, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { art } from '../../game/kit/art';
import type { Anim, AvatarConfig, AvatarState } from '../../core/types';
import { cx, TEST } from '../lib';

/** Si WebGL falla (equipo sin GPU, contexto perdido), se muestra el respaldo en vez de romper la interfaz. */
export class Safe3D extends Component<{ fallback?: ReactNode; children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() { return { bad: true }; }
  componentDidCatch() { /* el respaldo ya se ve */ }
  render() { return this.state.bad ? this.props.fallback ?? null : this.props.children; }
}

interface Spin { yaw: number; vel: number; drag: boolean; idle: number }
function Stage({ config, anim, spin, auto }: { config: AvatarConfig; anim: Anim; spin: Spin; auto: boolean }) {
  const turn = useRef<THREE.Group>(null), state = useRef<AvatarState>({ anim, speed: 0 }).current;
  state.anim = anim; state.speed = anim === 'run' ? 8 : anim === 'walk' ? 4 : 0;
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05), o = (window as { __mcAvView?: { yaw?: number; anim?: Anim } }).__mcAvView;
    if (o?.anim) { state.anim = o.anim; state.speed = o.anim === 'walk' ? 4 : o.anim === 'run' ? 8 : 0; }
    if (!spin.drag) { spin.idle += d; spin.yaw += spin.vel * d; spin.vel *= 1 - Math.min(1, d * 4); if (auto && spin.idle > 2.5) spin.yaw += d * 0.35; }
    if (o?.yaw != null) spin.yaw = o.yaw;
    if (turn.current) turn.current.rotation.y = spin.yaw;
  });
  return <>
    <hemisphereLight args={['#ffffff', '#8a94a8', 1.25]} />
    <directionalLight position={[3, 6, 5]} intensity={2.1} color="#fff4e0" />
    <directionalLight position={[-4, 3, -3]} intensity={0.7} color="#9fdcff" />
    <group ref={turn}>
      <art.Avatar config={config} state={state} />
      <mesh position={[0, -0.1, 0]} material={art.material('plastic', art.name === 'hd' ? '#16384a' : '#ffd028')}><cylinderGeometry args={[1.05, 1.15, 0.2, 40]} /></mesh>
      <mesh position={[0, 0.006, 0]} rotation-x={-Math.PI / 2}><circleGeometry args={[0.55, 28]} /><meshBasicMaterial color="#000000" transparent opacity={0.22} /></mesh>
    </group>
  </>;
}

/** `anim` = animación a mostrar. `auto` = gira solo cuando no lo tocas. */
export function AvatarView({ config, anim = 'idle', cls, auto = true, hint = true }: { config: AvatarConfig; anim?: Anim; cls?: string; auto?: boolean; hint?: boolean }) {
  const spin = useRef<Spin>({ yaw: -0.35, vel: 0, drag: false, idle: 0 }).current, last = useRef(0);
  useEffect(() => { spin.idle = 0; }, [config, spin]);
  return <div className={cx('touch-none select-none', cls ?? 'relative')} data-testid="avatar-view" style={{ cursor: 'grab' }}
    onPointerDown={e => { spin.drag = true; spin.vel = 0; spin.idle = 0; last.current = e.clientX; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* opcional */ } }}
    onPointerMove={e => { if (!spin.drag) return; const dx = e.clientX - last.current; last.current = e.clientX; spin.yaw += dx * 0.012; spin.vel = dx * 0.6; }}
    onPointerUp={() => { spin.drag = false; }} onPointerCancel={() => { spin.drag = false; }}>
    <Safe3D fallback={<div className="flex h-full items-center justify-center text-6xl" aria-hidden>🧍</div>}>
      <Canvas dpr={TEST ? 1 : [1, 2]} camera={{ fov: 30, near: 0.1, far: 50, position: [0, 1.5, 6.4] }} gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }} onCreated={({ camera }) => camera.lookAt(0, 1.02, 0)}>
        <Suspense fallback={null}><Stage config={config} anim={anim} spin={spin} auto={auto} /></Suspense>
      </Canvas>
    </Safe3D>
    {hint && <span className="mc-label pointer-events-none absolute inset-x-0 bottom-1 text-center opacity-70">Arrastra para girar</span>}
  </div>;
}
