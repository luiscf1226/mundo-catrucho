// Efectos puntuales: chispas / astillas (cajitas instanciadas) y textos flotantes ("+30"). Son la excepción que el
// contrato permite a "solo materiales del kit": partículas con meshBasicMaterial.

import { useFrame } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { V3 } from '../../../core/types';
import { textTexture, useTick } from '../../kit';

interface Part {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  g: number;
  col: THREE.Color;
}
interface Pop {
  x: number;
  y: number;
  z: number;
  t: number;
  text: string;
  fg: string;
  fresh: boolean;
  h: number;
}
const NP = 90,
  NPOP = 8;

export class Fx {
  parts: Part[] = Array.from({ length: NP }, () => ({
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
    max: 1,
    size: 0.07,
    g: 9,
    col: new THREE.Color(),
  }));
  pops: Pop[] = Array.from({ length: NPOP }, () => ({
    x: 0,
    y: 0,
    z: 0,
    t: 9,
    text: '',
    fg: '#fff',
    fresh: false,
    h: 1,
  }));
  private ip = 0;
  private io = 0;
  /** Suelta `n` partículas desde `p`. `up` empuja hacia arriba (humo si g < 0). */
  burst(p: V3, color: string | string[], n = 10, speed = 3, size = 0.07, g = 9, life = 0.7) {
    for (let i = 0; i < n; i++) {
      const q = this.parts[(this.ip = (this.ip + 1) % NP)],
        a = Math.random() * Math.PI * 2,
        e = Math.random() * 1.2 - 0.2,
        s = speed * (0.4 + Math.random() * 0.8);
      q.x = p[0];
      q.y = p[1];
      q.z = p[2];
      q.vx = Math.cos(a) * Math.cos(e) * s;
      q.vy = Math.sin(e) * s + speed * 0.3;
      q.vz = Math.sin(a) * Math.cos(e) * s;
      q.max = q.life = life * (0.6 + Math.random() * 0.6);
      q.size = size * (0.6 + Math.random() * 0.8);
      q.g = g;
      q.col.set(Array.isArray(color) ? color[i % color.length] : color);
    }
  }
  /** Texto que sube y se desvanece. `h` escala el tamaño (1 = normal). */
  popup(p: V3, text: string, fg = '#ffe14d', h = 1) {
    const o = this.pops[(this.io = (this.io + 1) % NPOP)];
    o.x = p[0];
    o.y = p[1];
    o.z = p[2];
    o.t = 0;
    o.text = text;
    o.fg = fg;
    o.fresh = true;
    o.h = h;
  }
}

const M = new THREE.Matrix4(),
  Q = new THREE.Quaternion(),
  P = new THREE.Vector3(),
  S = new THREE.Vector3(),
  E = new THREE.Euler();
const BOX = new THREE.BoxGeometry(1, 1, 1);
export function FxLayer({ fx }: { fx: Fx }) {
  const inst = useRef<THREE.InstancedMesh>(null),
    sprites = useRef<(THREE.Sprite | null)[]>([]);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff' }), []);
  useTick((dt) => {
    const m = inst.current;
    if (!m) return;
    let i = 0;
    for (const q of fx.parts) {
      if (q.life > 0) {
        q.life -= dt;
        q.vy -= q.g * dt;
        q.x += q.vx * dt;
        q.y += q.vy * dt;
        q.z += q.vz * dt;
        if (q.y < 0.03 && q.g > 0) {
          q.y = 0.03;
          q.vy = -q.vy * 0.3;
          q.vx *= 0.6;
          q.vz *= 0.6;
        }
        const k = Math.max(0, q.life / q.max),
          s = q.size * (0.35 + 0.65 * k);
        m.setMatrixAt(
          i,
          M.compose(P.set(q.x, q.y, q.z), Q.setFromEuler(E.set(q.life * 9, q.life * 7, 0)), S.set(s, s, s)),
        );
        m.setColorAt(i, q.col);
        i++;
      }
    }
    m.count = i;
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  useFrame(({ camera }, dt) => {
    fx.pops.forEach((o, i) => {
      const s = sprites.current[i];
      if (!s) return;
      if (o.t > 1.2) {
        s.visible = false;
        return;
      }
      const sm = s.material as THREE.SpriteMaterial;
      if (o.fresh) {
        o.fresh = false;
        sm.map = textTexture(o.text, { fg: o.fg, stroke: '#1b1b1b' });
        sm.needsUpdate = true;
      }
      o.t += Math.min(dt, 0.05);
      const d = camera.position.distanceTo(P.set(o.x, o.y, o.z)),
        k = o.t / 1.2;
      const h = d * 0.06 * o.h * (o.t < 0.12 ? 0.6 + (o.t / 0.12) * 0.5 : 1.1 - Math.min(0.1, (o.t - 0.12) * 0.8)),
        asp = (sm.map as any)?.aspect ?? 2;
      s.visible = true;
      s.position.set(o.x, o.y + k * d * 0.07, o.z);
      s.scale.set(h * asp, h, 1);
      sm.opacity = k < 0.65 ? 1 : 1 - (k - 0.65) / 0.35;
    });
  });
  return (
    <>
      <instancedMesh ref={inst} args={[BOX, mat, NP]} frustumCulled={false} />
      {Array.from({ length: NPOP }, (_, i) => (
        <sprite
          key={i}
          ref={(s) => {
            sprites.current[i] = s;
          }}
          visible={false}
          renderOrder={20}
        >
          <spriteMaterial transparent depthTest={false} />
        </sprite>
      ))}
    </>
  );
}
