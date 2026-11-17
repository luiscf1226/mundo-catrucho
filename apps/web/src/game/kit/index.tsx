// Kit de construcción de escenas. Todo lo jugable se arma con estas piezas para que funcione igual en las dos
// versiones: la forma y la colisión se definen aquí, el aspecto lo pone el paquete de arte (kit/art).

import { useFrame } from '@react-three/fiber';
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../core/audio';
import { type Interaction, interactions } from '../../core/interact';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { V3 } from '../../core/types';
import { art } from './art';
import type { MatKind } from './art/types';
import { boxCol, cylCol, textTexture, useCollider, useTick } from './core';

export { art } from './art';
export type { AvatarProps, MatKind, PropBase, SkyRigProps } from './art/types';
export * from './core';
/** Utilería del paquete de arte activo: <P.Tree pos={[0,0,0]} /> */
export const P = art.props;

interface ShapeProps {
  pos: V3;
  color?: string;
  mat?: MatKind;
  solid?: boolean;
  cast?: boolean;
  receive?: boolean;
  visible?: boolean;
  children?: ReactNode;
}
/** Caja. `pos` es el CENTRO. `rot` gira en Y; la colisión usa la caja alineada a los ejes que la envuelve. */
export function Block({
  pos,
  size,
  color = '#cccccc',
  mat = 'plastic',
  solid = true,
  rot = 0,
  cast = true,
  receive = true,
  visible = true,
  children,
}: ShapeProps & { size: V3; rot?: number }) {
  const key = `${pos}|${size}|${rot}|${solid}`;
  useLayoutEffect(() => {
    if (!solid) return;
    const c = Math.abs(Math.cos(rot)),
      s = Math.abs(Math.sin(rot));
    const col = phys.add(boxCol(pos, [size[0] * c + size[2] * s, size[1], size[0] * s + size[2] * c]));
    return () => {
      phys.remove(col);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh
      position={pos}
      rotation-y={rot}
      castShadow={cast}
      receiveShadow={receive}
      visible={visible}
      material={art.material(mat, color)}
      geometry={art.boxGeometry?.(size[0], size[1], size[2])}
    >
      {!art.boxGeometry && <boxGeometry args={size} />}
      {children}
    </mesh>
  );
}
/** Cilindro vertical. `pos` es el CENTRO. */
export function Cyl({
  pos,
  r,
  h,
  color = '#cccccc',
  mat = 'plastic',
  solid = true,
  cast = true,
  receive = true,
  visible = true,
  sides = 20,
  rTop,
}: ShapeProps & { r: number; h: number; sides?: number; rTop?: number }) {
  const key = `${pos}|${r}|${h}|${solid}`;
  useLayoutEffect(() => {
    if (!solid) return;
    const col = phys.add(cylCol(pos, r, h));
    return () => {
      phys.remove(col);
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <mesh
      position={pos}
      castShadow={cast}
      receiveShadow={receive}
      visible={visible}
      material={art.material(mat, color)}
    >
      <cylinderGeometry args={[rTop ?? r, r, h, sides]} />
    </mesh>
  );
}
/** Esfera decorativa (sin colisión). */
export function Ball({
  pos,
  r,
  color = '#cccccc',
  mat = 'plastic',
  cast = true,
}: {
  pos: V3;
  r: number;
  color?: string;
  mat?: MatKind;
  cast?: boolean;
}) {
  return (
    <mesh position={pos} castShadow={cast} material={art.material(mat, color)}>
      <sphereGeometry args={[r, 20, 14]} />
    </mesh>
  );
}
/** Suelo plano en y = 0 (visual). La altura real del suelo la da phys.ground. */
export function Ground({
  size = 200,
  color = '#58a845',
  mat = 'grass',
  y = 0,
  pos = [0, 0, 0],
}: {
  size?: number | [number, number];
  color?: string;
  mat?: MatKind;
  y?: number;
  pos?: V3;
}) {
  const [w, d] = Array.isArray(size) ? size : [size, size];
  return (
    <mesh position={[pos[0], y, pos[2]]} rotation-x={-Math.PI / 2} receiveShadow material={art.material(mat, color)}>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}
/** Colisión invisible (muros, límites). */
export function Wall({ pos, size }: { pos: V3; size: V3 }) {
  useCollider(() => boxCol(pos, size), [`${pos}|${size}`]);
  return null;
}

/** Fija dónde aparece el jugador al entrar a la escena (y al caerse del mundo). */
export function Spawn({ pos, yaw = 0 }: { pos: V3; yaw?: number }) {
  useLayoutEffect(() => {
    player.setSpawn(pos, yaw);
  }, [`${pos}|${yaw}`]);
  return null;
} // eslint-disable-line react-hooks/exhaustive-deps

/** Punto de interacción: muestra "E · etiqueta" al acercarse. */
export function Interactable({
  pos,
  radius = 2.4,
  label,
  icon,
  onUse,
  enabled,
  marker = true,
}: {
  pos: V3;
  radius?: number;
  label: string;
  icon?: string;
  onUse: () => void;
  enabled?: () => boolean;
  marker?: boolean;
}) {
  const use = useRef(onUse);
  use.current = onUse;
  const en = useRef(enabled);
  en.current = enabled;
  useEffect(() => {
    const i: Interaction = {
      x: pos[0],
      y: pos[1],
      z: pos[2],
      radius,
      label,
      icon,
      onUse: () => use.current(),
      enabled: () => (en.current ? en.current() : true),
    };
    interactions.add(i);
    return () => {
      interactions.delete(i);
    };
  }, [`${pos}`, radius, label, icon]); // eslint-disable-line react-hooks/exhaustive-deps
  const ring = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (ring.current) {
      ring.current.rotation.z = clock.elapsedTime;
      const s = 1 + Math.sin(clock.elapsedTime * 3) * 0.06;
      ring.current.scale.set(s, s, 1);
    }
  });
  if (!marker) return null;
  return (
    <mesh
      ref={ring}
      position={[pos[0], pos[1] + 0.06, pos[2]]}
      rotation-x={-Math.PI / 2}
      material={art.material('neon', '#ffd23f')}
    >
      <ringGeometry args={[radius * 0.42, radius * 0.5, 28]} />
    </mesh>
  );
}

/** Zona que avisa cuando el jugador entra o sale. `pos` es el centro. */
export function Trigger({
  pos,
  size,
  onEnter,
  onExit,
}: {
  pos: V3;
  size: V3;
  onEnter?: () => void;
  onExit?: () => void;
}) {
  const inside = useRef(false);
  useTick(() => {
    const p = player.pos,
      h = [size[0] / 2, size[1] / 2, size[2] / 2];
    const now =
      Math.abs(p[0] - pos[0]) < h[0] &&
      p[1] + 0.9 > pos[1] - h[1] &&
      p[1] < pos[1] + h[1] &&
      Math.abs(p[2] - pos[2]) < h[2];
    if (now !== inside.current) {
      inside.current = now;
      (now ? onEnter : onExit)?.();
    }
  });
  return null;
}

/** Moneda que se recoge al tocarla. Por defecto suma al monedero; con onPick decides tú qué pasa. */
export function CoinPickup({ pos, value = 1, onPick }: { pos: V3; value?: number; onPick?: () => void }) {
  const g = useRef<THREE.Group>(null),
    taken = useRef(false);
  useTick((_, t) => {
    if (taken.current || !g.current) return;
    g.current.rotation.y = t * 3;
    g.current.position.y = pos[1] + 0.9 + Math.sin(t * 2.5 + pos[0]) * 0.12;
    const p = player.pos;
    if (Math.hypot(p[0] - pos[0], p[2] - pos[2]) < 1.15 && Math.abs(p[1] - pos[1]) < 2.2) {
      taken.current = true;
      g.current.visible = false;
      audio.sfx('coin');
      if (onPick) onPick();
      else useGame.getState().pickupCoin(value);
    }
  });
  return (
    <group ref={g} position={[pos[0], pos[1] + 0.9, pos[2]]}>
      <P.Coin />
    </group>
  );
}

/** Texto que siempre mira a la cámara. `h` es la altura en metros. */
export function Label({
  pos,
  text,
  h = 0.6,
  fg,
  bg = 'rgba(12,22,34,0.82)',
  stroke,
  depthTest = true,
}: {
  pos: V3;
  text: string;
  h?: number;
  fg?: string;
  bg?: string;
  stroke?: string;
  depthTest?: boolean;
}) {
  const tex = useMemo(() => textTexture(text, { fg, bg, stroke }), [text, fg, bg, stroke]);
  return (
    <sprite position={pos} scale={[h * (tex as any).aspect, h, 1]}>
      <spriteMaterial map={tex} depthTest={depthTest} transparent />
    </sprite>
  );
}
/** Rótulo plano (no gira hacia la cámara), para paredes y letreros. */
export function Plate({
  pos,
  text,
  h = 0.6,
  rot = 0,
  fg = '#ffffff',
  bg = '#0d47a1',
}: {
  pos: V3;
  text: string;
  h?: number;
  rot?: number;
  fg?: string;
  bg?: string;
}) {
  const tex = useMemo(() => textTexture(text, { fg, bg, radius: 0.18 }), [text, fg, bg]);
  return (
    <mesh position={pos} rotation-y={rot}>
      <planeGeometry args={[h * (tex as any).aspect, h]} />
      <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} forceSinglePass />
    </mesh>
  );
}
