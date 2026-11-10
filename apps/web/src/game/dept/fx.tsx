// Efectos puntuales de las zonas: peces que caen del cielo (Yoro), cámara baja dentro de cuevas y túneles,
// penumbra de cueva y destellos de los objetos escondidos.

import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { player } from '../../core/player';
import type { V3 } from '../../core/types';
import { art, useTick } from '../kit';
import { rng } from './lib';

/** Lluvia de peces: pececitos plateados que caen y vuelven a aparecer arriba. */
export function FallingFish({
  count = 46,
  area = 42,
  top = 34,
  ground,
}: {
  count?: number;
  area?: number;
  top?: number;
  ground: (x: number, z: number) => number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(0.24, 7, 5);
    g.scale(1.9, 0.4, 0.75);
    return g;
  }, []);
  const fish = useMemo(() => {
    const r = rng(504);
    return Array.from({ length: count }, () => ({
      x: (r() * 2 - 1) * area,
      z: (r() * 2 - 1) * area,
      y: r() * top,
      v: 9 + r() * 6,
      a: r() * 6,
      w: 2 + r() * 4,
    }));
  }, [count, area, top]);
  const m = useMemo(() => new THREE.Object3D(), []);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, d) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(d, 0.05);
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i];
      f.y -= f.v * dt;
      f.a += f.w * dt;
      if (f.y < ground(f.x, f.z)) {
        f.y = top + Math.random() * 6;
        f.x = player.pos[0] + (Math.random() * 2 - 1) * area;
        f.z = player.pos[2] + (Math.random() * 2 - 1) * area;
      }
      m.position.set(f.x, f.y, f.z);
      m.rotation.set(f.a, f.a * 0.7, 1.2);
      m.updateMatrix();
      mesh.setMatrixAt(i, m.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geo, art.material('metal', '#c9d6df'), count]} frustumCulled={false} />;
}

/** Dentro de cuevas y túneles la cámara se acerca y baja para no atravesar el techo. */
export function CaveCam({ inside }: { inside: (x: number, z: number) => boolean }) {
  const was = useRef(false),
    saved = useRef(8);
  useTick(() => {
    const inn = inside(player.pos[0], player.pos[2]);
    if (inn && !was.current) saved.current = player.camDist;
    if (!inn && was.current) player.camDist = saved.current;
    if (inn) {
      player.camDist = Math.min(player.camDist, 3.6);
      player.camPitch = Math.max(-0.1, Math.min(0.24, player.camPitch));
    }
    was.current = inn;
  });
  return null;
}

/** Penumbra: caja negra que solo se ve desde adentro; tapa el cielo cuando la cámara se asoma por un muro de la cueva. */
export function Darkness({ pos, size }: { pos: V3; size: V3 }) {
  return (
    <mesh position={pos}>
      <boxGeometry args={size} />
      <meshBasicMaterial color="#07090c" side={THREE.BackSide} fog={false} />
    </mesh>
  );
}

/** Destello de pista: chispas que parpadean sobre un objeto escondido cuando el jugador está cerca. */
export function Glint({ pos, range = 8, color = '#fff6c2' }: { pos: V3; range?: number; color?: string }) {
  const g = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const grp = g.current;
    if (!grp) return;
    const t = clock.elapsedTime,
      d = Math.hypot(player.pos[0] - pos[0], player.pos[2] - pos[2]);
    const k = Math.max(0, Math.min(1, (range - d) / 3));
    grp.visible = k > 0.01;
    if (!grp.visible) return;
    grp.children.forEach((c, i) => {
      const ph = t * 2.2 + i * 2.1,
        s = k * (0.5 + 0.5 * Math.sin(ph * 2)) * 0.22;
      c.position.set(Math.cos(ph + i) * 0.55, 0.9 + ((t * 0.5 + i * 0.33) % 1) * 1.1, Math.sin(ph * 0.8 + i) * 0.55);
      c.scale.setScalar(Math.max(0.001, s));
      c.rotation.set(ph, ph * 1.3, 0);
    });
  });
  return (
    <group ref={g} position={pos} visible={false}>
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
    </group>
  );
}
