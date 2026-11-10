// Vista desde arriba del mapa gigante: rótulos que crecen para leerse de lejos, marca de «Vos» y neblina corrida.
// La cámara la mueve PlayerController (player.overview / player.overviewT).
import { useFrame, useThree } from '@react-three/fiber';
import { type ReactNode, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { player } from '../../core/player';
import type { V3 } from '../../core/types';
import { Label } from '../kit';

const ease = (t: number) => t * t * (3 - 2 * t);
/** Tamaño de los rótulos en la vista de arriba: ~1 m de rótulo por cada 26 m de distancia a la cámara. */
const PX = 1 / 30;
const v = new THREE.Vector3();

/** Rótulo que, en la vista desde arriba, crece con la distancia para que se lea igual. */
export function OverviewLabel({
  pos,
  h,
  id,
  shift = [0, 0],
  children,
}: {
  pos: V3;
  h: number;
  id: string;
  /** corrimiento [x, z] en metros solo en la vista de arriba, para que los rótulos vecinos no se encimen */
  shift?: [number, number];
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g) return;
    const e = ease(player.overviewT);
    g.position.set(pos[0] + shift[0] * e, pos[1], pos[2] + shift[1] * e);
    // desde arriba el rótulo se dibuja encima de árboles y edificios
    const s = g.children[0] as THREE.Sprite | undefined;
    if (s?.material) {
      s.material.depthTest = e < 0.5;
      s.renderOrder = e < 0.5 ? 0 : 10;
    }
    const k = e > 0 ? Math.max(1, 1 + e * ((camera.position.distanceTo(g.position) * PX) / h - 1)) : 1;
    g.scale.setScalar(k);
  });
  return (
    <group ref={ref} position={pos} name={`rotulo-${id}`}>
      {children}
    </group>
  );
}
/** Lo que solo se ve de cerca (se esconde en la vista de arriba). */
export function NearOnly({ children }: { children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (ref.current) ref.current.visible = player.overviewT < 0.3;
  });
  return <group ref={ref}>{children}</group>;
}

/** Marca del jugador, la neblina lejos y datos de prueba de la vista desde arriba. */
export function Vista() {
  const mark = useRef<THREE.Group>(null);
  const { camera, scene, size } = useThree();
  useFrame(() => {
    const e = ease(player.overviewT),
      m = mark.current;
    if (m) {
      m.visible = e > 0.05;
      m.position.set(player.pos[0], player.pos[1] + 6, player.pos[2]);
      m.scale.setScalar(Math.max(1, (camera.position.distanceTo(m.position) * PX) / 1.2) * e);
    }
    // SkyRig pone la neblina cada cuadro; aquí la corremos para que el mapa no se vea lavado desde arriba
    if (e > 0 && scene.fog instanceof THREE.Fog) {
      const d = camera.position.length() * e;
      scene.fog.near += d;
      scene.fog.far += d;
    }
  });
  useEffect(() => {
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    w.__mcTest = {
      ...w.__mcTest,
      vista: {
        /** rectángulo en pantalla (px) de cada rótulo de departamento */
        rotulos: () => {
          const out: { id: string; x: number; y: number; w: number; h: number; dentro: boolean }[] = [];
          scene.traverse((o) => {
            if (!o.name.startsWith('rotulo-')) return;
            const s = o.children[0] as THREE.Sprite | undefined;
            if (!s) return;
            o.getWorldPosition(v);
            const ws = new THREE.Vector3();
            s.getWorldScale(ws);
            const c = v.clone().project(camera),
              top = v
                .clone()
                .add(new THREE.Vector3(0, ws.y / 2, 0).applyQuaternion(camera.quaternion))
                .project(camera);
            const x = ((c.x + 1) / 2) * size.width,
              y = ((1 - c.y) / 2) * size.height,
              h = Math.abs(top.y - c.y) * size.height,
              w = (h * ws.x) / ws.y;
            out.push({
              id: o.name.slice(7),
              x,
              y,
              w,
              h,
              dentro:
                c.z < 1 && x - w / 2 >= 0 && x + w / 2 <= size.width && y - h / 2 >= 0 && y + h / 2 <= size.height,
            });
          });
          return out;
        },
      },
    };
    return () => {
      if (w.__mcTest) delete w.__mcTest.vista;
    };
  }, [camera, scene, size]);
  return (
    <group ref={mark} visible={false}>
      <Label pos={[0, 0, 0]} text="📍 Vos" h={1.2} bg="#c4302b" depthTest={false} />
    </group>
  );
}
