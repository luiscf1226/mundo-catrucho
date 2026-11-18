// Vista 3D pequeña del avatar (editor de personaje, tienda, perfil). Lienzo propio: no depende del mundo.
// Arrastrar gira al personaje; al soltar vuelve a girar despacito solo. Las pruebas pueden fijar el giro y la
// animación con `window.__mcAvView = { yaw, anim }` para sacar hojas de capturas.

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Component, type ReactNode, Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { Anim, AvatarConfig, AvatarState } from '../../core/types';
import { art } from '../../game/kit/art';
import { cx, TEST } from '../lib';

/** Si WebGL falla (equipo sin GPU, contexto perdido), se muestra el respaldo en vez de romper la interfaz. */
export class Safe3D extends Component<{ fallback?: ReactNode; children: ReactNode }, { bad: boolean }> {
  state = { bad: false };
  static getDerivedStateFromError() {
    return { bad: true };
  }
  componentDidCatch() {
    /* el respaldo ya se ve */
  }
  render() {
    return this.state.bad ? (this.props.fallback ?? null) : this.props.children;
  }
}

/** lo que tiene que caber en la vista: del borde de la base (abajo) a un poco sobre la cabeza, y su ancho */
const FRAME = { y0: -0.13, y1: 1.98, w: 1.25 };
/**
 * Encuadre de cuerpo entero con algo de aire arriba, para cualquier proporción del recuadro (celular incluido). Los
 * letreros encima de la vista (marcados con `data-tapa`, como «Probándote» y la nota de la tienda) se descuentan: el
 * personaje queda en la franja libre entre ellos.
 */
function Encuadre() {
  const { camera, size, gl } = useThree(),
    band = useRef({ top: 0, bot: 0, n: 0 });
  const fit = () => {
    const cam = camera as THREE.PerspectiveCamera,
      H = Math.max(1, size.height),
      aspect = size.width / H,
      t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)),
      { top, bot } = band.current,
      f = Math.max(0.45, (H - top - bot) / H),
      // con letreros encima el espacio es poco: encuadre más justo (de los pies a un poco sobre la cabeza)
      tapa = f < 0.97,
      y0 = tapa ? -0.03 : FRAME.y0,
      y1 = tapa ? 1.86 : FRAME.y1,
      h = y1 - y0,
      d = Math.max(h / 2 / t / f, FRAME.w / 2 / (t * aspect)) + (tapa ? 0.1 : 0.35),
      cy = (y0 + y1) / 2,
      // la franja libre no está centrada: se corre la mirada para que el personaje caiga en su centro
      shift = ((top - bot) / 2 / H) * 2 * d * t;
    cam.position.set(0, cy + 0.32 + shift, d);
    cam.lookAt(0, cy + 0.02 + shift, 0);
    cam.updateProjectionMatrix();
  };
  useEffect(fit, [camera, size.width, size.height]);
  useFrame(() => {
    if (band.current.n++ % 20) return;
    const box = gl.domElement.getBoundingClientRect(),
      mid = box.top + box.height / 2;
    let top = 0,
      bot = 0;
    for (const e of gl.domElement
      .closest('[data-testid=avatar-view]')
      ?.parentElement?.querySelectorAll('[data-tapa]') ?? []) {
      const r = e.getBoundingClientRect();
      if (!r.height) continue;
      if (r.top + r.height / 2 < mid) top = Math.max(top, r.bottom - box.top);
      else bot = Math.max(bot, box.bottom - r.top);
    }
    top = Math.round(top);
    bot = Math.round(bot);
    if (top === band.current.top && bot === band.current.bot) return;
    band.current.top = top;
    band.current.bot = bot;
    fit();
  });
  return null;
}
interface Spin {
  yaw: number;
  vel: number;
  drag: boolean;
  idle: number;
}
function Stage({ config, anim, spin, auto }: { config: AvatarConfig; anim: Anim; spin: Spin; auto: boolean }) {
  const turn = useRef<THREE.Group>(null),
    state = useRef<AvatarState>({ anim, speed: 0 }).current;
  state.anim = anim;
  state.speed = anim === 'run' ? 8 : anim === 'walk' ? 4 : 0;
  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05),
      o = (window as { __mcAvView?: { yaw?: number; anim?: Anim } }).__mcAvView;
    if (o?.anim) {
      state.anim = o.anim;
      state.speed = o.anim === 'walk' ? 4 : o.anim === 'run' ? 8 : 0;
    }
    if (!spin.drag) {
      spin.idle += d;
      spin.yaw += spin.vel * d;
      spin.vel *= 1 - Math.min(1, d * 4);
      if (auto && spin.idle > 2.5) spin.yaw += d * 0.35;
    }
    if (o?.yaw != null) spin.yaw = o.yaw;
    if (turn.current) turn.current.rotation.y = spin.yaw;
  });
  return (
    <>
      <hemisphereLight args={['#ffffff', '#8a94a8', 1.25]} />
      <directionalLight position={[3, 6, 5]} intensity={2.1} color="#fff4e0" />
      <directionalLight position={[-4, 3, -3]} intensity={0.7} color="#9fdcff" />
      <group ref={turn}>
        <art.Avatar config={config} state={state} />
        <mesh position={[0, -0.07, 0]} material={art.material('plastic', art.name === 'hd' ? '#16384a' : '#ffd028')}>
          <cylinderGeometry args={[0.56, 0.6, 0.14, 40]} />
        </mesh>
        <mesh position={[0, 0.006, 0]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.36, 28]} />
          <meshBasicMaterial color="#000000" transparent opacity={0.22} />
        </mesh>
      </group>
    </>
  );
}

/** `anim` = animación a mostrar. `auto` = gira solo cuando no lo tocas. */
export function AvatarView({
  config,
  anim = 'idle',
  cls,
  auto = true,
  hint = true,
}: {
  config: AvatarConfig;
  anim?: Anim;
  cls?: string;
  auto?: boolean;
  hint?: boolean;
}) {
  const spin = useRef<Spin>({ yaw: -0.35, vel: 0, drag: false, idle: 0 }).current,
    last = useRef(0);
  useEffect(() => {
    spin.idle = 0;
  }, [config, spin]);
  return (
    <div
      className={cx('touch-none select-none', cls ?? 'relative')}
      data-testid="avatar-view"
      style={{ cursor: 'grab' }}
      onPointerDown={(e) => {
        spin.drag = true;
        spin.vel = 0;
        spin.idle = 0;
        last.current = e.clientX;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* opcional */
        }
      }}
      onPointerMove={(e) => {
        if (!spin.drag) return;
        const dx = e.clientX - last.current;
        last.current = e.clientX;
        spin.yaw += dx * 0.012;
        spin.vel = dx * 0.6;
      }}
      onPointerUp={() => {
        spin.drag = false;
      }}
      onPointerCancel={() => {
        spin.drag = false;
      }}
    >
      <Safe3D
        fallback={
          <div className="flex h-full items-center justify-center text-6xl" aria-hidden>
            🧍
          </div>
        }
      >
        <Canvas
          dpr={TEST ? 1 : [1, 2]}
          camera={{ fov: 30, near: 0.1, far: 50, position: [0, 1.25, 4.4] }}
          gl={{ antialias: true, alpha: true, powerPreference: 'low-power' }}
        >
          <Encuadre />
          <Suspense fallback={null}>
            <Stage config={config} anim={anim} spin={spin} auto={auto} />
          </Suspense>
        </Canvas>
      </Safe3D>
      {hint && (
        <span className="mc-label pointer-events-none absolute inset-x-0 bottom-1 text-center opacity-70">
          Arrastra para girar
        </span>
      )}
    </div>
  );
}
