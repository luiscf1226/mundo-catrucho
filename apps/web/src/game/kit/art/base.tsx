// Paquete de arte BASE: versiones sencillas de todo, para que el juego funcione desde el primer día.
// Los paquetes roblox/ y hd/ parten de aquí y reemplazan pieza por pieza con su propio estilo.

import { useFrame, useThree } from '@react-three/fiber';
import { type ReactNode, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { env } from '../../../core/env';
import { player } from '../../../core/player';
import type { V3 } from '../../../core/types';
import { boxCol, cylCol, textTexture, useCollider } from '../core';
import type { ArtPack, ArtProps, AvatarProps, MatKind, PropBase, SkyRigProps } from './types';

const cache = new Map<string, THREE.Material>();
export function baseMaterial(kind: MatKind, color: string): THREE.Material {
  const key = kind + color;
  let m = cache.get(key);
  if (m) return m;
  if (kind === 'neon') m = new THREE.MeshBasicMaterial({ color });
  else if (kind === 'water')
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.82 });
  else if (kind === 'glass')
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.1, transparent: true, opacity: 0.45 });
  else
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: kind === 'metal' || kind === 'gold' ? 0.35 : 0.85,
      metalness: kind === 'metal' || kind === 'gold' ? 0.7 : 0,
    });
  cache.set(key, m);
  return m;
}

/** Grupo colocado con pos / rot / scale de una pieza de utilería. */
export function Placed({ pos, rot = 0, scale = 1, children }: PropBase & { children?: ReactNode }) {
  return (
    <group position={pos} rotation-y={rot} scale={scale}>
      {children}
    </group>
  );
}
type M = (kind: MatKind, color: string) => THREE.Material;
const B = ({ p, s, c, k = 'plastic', m, r }: { p: V3; s: V3; c: string; k?: MatKind; m: M; r?: V3 }) => (
  <mesh position={p} rotation={r} castShadow receiveShadow material={m(k, c)}>
    <boxGeometry args={s} />
  </mesh>
);
const C = ({
  p,
  r,
  h,
  c,
  k = 'plastic',
  m,
  rt,
  sides = 14,
  rot,
}: {
  p: V3;
  r: number;
  h: number;
  c: string;
  k?: MatKind;
  m: M;
  rt?: number;
  sides?: number;
  rot?: V3;
}) => (
  <mesh position={p} rotation={rot} castShadow receiveShadow material={m(k, c)}>
    <cylinderGeometry args={[rt ?? r, r, h, sides]} />
  </mesh>
);
const S = ({ p, r, c, k = 'plastic', m, s }: { p: V3; r: number; c: string; k?: MatKind; m: M; s?: V3 }) => (
  <mesh position={p} scale={s} castShadow material={m(k, c)}>
    <sphereGeometry args={[r, 14, 10]} />
  </mesh>
);

/** Construye la utilería base con la función de materiales que le pases (cada paquete usa la suya). */
export function makeBaseProps(m: M): ArtProps {
  const solidCyl = (a: PropBase, r: number, h: number) =>
    useCollider(
      () =>
        cylCol([a.pos[0], a.pos[1] + (h * (a.scale ?? 1)) / 2, a.pos[2]], r * (a.scale ?? 1), h * (a.scale ?? 1), {
          solid: a.solid !== false,
        }),
      [`${a.pos}|${a.scale}|${a.solid}`],
    );
  const solidBox = (a: PropBase, w: number, h: number, d: number) =>
    useCollider(() => {
      const k = a.scale ?? 1,
        c = Math.abs(Math.cos(a.rot ?? 0)),
        s = Math.abs(Math.sin(a.rot ?? 0));
      return boxCol([a.pos[0], a.pos[1] + (h * k) / 2, a.pos[2]], [(w * c + d * s) * k, h * k, (w * s + d * c) * k], {
        solid: a.solid !== false,
      });
    }, [`${a.pos}|${a.scale}|${a.rot}|${a.solid}`]);
  const props: ArtProps = {
    Tree: (a) => {
      solidCyl(a, 0.35, 3);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 1.4, 0]} r={0.3} h={2.8} c="#7a5230" k="wood" />
          <S m={m} p={[0, 3.7, 0]} r={1.9} c={a.color ?? '#3f9b4b'} k="leaf" />
          <S m={m} p={[1, 3.1, 0.4]} r={1.2} c={a.color ?? '#4caf50'} k="leaf" />
        </Placed>
      );
    },
    Palm: (a) => {
      solidCyl(a, 0.25, 4);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 2.4, 0]} r={0.22} h={4.8} c="#9c7a4d" k="wood" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <B
              key={i}
              m={m}
              p={[Math.cos(i * 1.05) * 1.1, 4.7, Math.sin(i * 1.05) * 1.1]}
              s={[2.2, 0.08, 0.5]}
              c={a.color ?? '#2e8b3d'}
              k="leaf"
              r={[0, -i * 1.05, -0.35]}
            />
          ))}
        </Placed>
      );
    },
    Pine: (a) => {
      solidCyl(a, 0.3, 3);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 1, 0]} r={0.22} h={2} c="#6b4a2a" k="wood" />
          <C m={m} p={[0, 2.8, 0]} r={1.5} rt={0.05} h={2.6} c={a.color ?? '#2f6b3a'} k="leaf" sides={8} />
          <C m={m} p={[0, 4.3, 0]} r={1.05} rt={0.02} h={2.2} c={a.color ?? '#357a42'} k="leaf" sides={8} />
        </Placed>
      );
    },
    Bush: (a) => (
      <Placed {...a}>
        <S m={m} p={[0, 0.45, 0]} r={0.7} c={a.color ?? '#3f9b4b'} k="leaf" s={[1.2, 0.8, 1]} />
      </Placed>
    ),
    Flowers: (a) => (
      <Placed {...a}>
        {[0, 1, 2, 3, 4].map((i) => (
          <S
            key={i}
            m={m}
            p={[Math.cos(i * 1.3) * 0.5, 0.25, Math.sin(i * 1.3) * 0.5]}
            r={0.16}
            c={a.color ?? ['#ff5d73', '#ffc93c', '#ffffff'][i % 3]}
          />
        ))}
      </Placed>
    ),
    Rock: (a) => {
      solidCyl(a, 0.7, 0.9);
      return (
        <Placed {...a}>
          <S m={m} p={[0, 0.4, 0]} r={0.8} c={a.color ?? '#8a8f96'} k="stone" s={[1.2, 0.75, 1]} />
        </Placed>
      );
    },
    House: ({ w = 6, d = 5, floors = 1, roofColor = '#b5523b', sign, ...a }) => {
      const h = 3 * floors;
      solidBox(a, w, h, d);
      const tex = useMemo(
        () => (sign ? textTexture(sign, { fg: '#ffffff', bg: '#c0392b', radius: 0.15 }) : null),
        [sign],
      );
      return (
        <Placed {...a}>
          <B m={m} p={[0, h / 2, 0]} s={[w, h, d]} c={a.color ?? '#f2c4a4'} k="stucco" />
          <B m={m} p={[0, 0.35, 0]} s={[w + 0.06, 0.7, d + 0.06]} c="#8d5a44" k="stucco" />
          <mesh position={[0, h + 0.7, 0]} rotation-y={Math.PI / 4} castShadow material={m('roof', roofColor)}>
            <coneGeometry args={[Math.max(w, d) * 0.78, 1.4, 4]} />
          </mesh>
          <B m={m} p={[0, 1.05, d / 2 + 0.03]} s={[1.1, 2.1, 0.1]} c="#6b3f22" k="wood" />
          {[-1, 1].map((s) => (
            <B key={s} m={m} p={[s * w * 0.3, 1.7, d / 2 + 0.03]} s={[1, 1, 0.1]} c="#2b4a63" k="glass" />
          ))}
          {tex && (
            <mesh position={[0, 2.65, d / 2 + 0.09]}>
              <planeGeometry args={[Math.min(w * 0.8, 0.5 * (tex as any).aspect), 0.5]} />
              <meshBasicMaterial map={tex} transparent />
            </mesh>
          )}
        </Placed>
      );
    },
    Lamp: (a) => {
      solidCyl(a, 0.12, 3);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 1.6, 0]} r={0.07} h={3.2} c="#222" k="metal" />
          <S m={m} p={[0, 3.3, 0]} r={0.25} c="#fff2b0" k="neon" />
        </Placed>
      );
    },
    Bench: (a) => {
      solidBox(a, 1.8, 0.5, 0.6);
      return (
        <Placed {...a}>
          <B m={m} p={[0, 0.45, 0]} s={[1.8, 0.1, 0.55]} c="#8a5a34" k="wood" />
          <B m={m} p={[0, 0.8, -0.25]} s={[1.8, 0.5, 0.08]} c="#8a5a34" k="wood" />
          {[-0.75, 0.75].map((x) => (
            <B key={x} m={m} p={[x, 0.22, 0]} s={[0.1, 0.44, 0.5]} c="#222" k="metal" />
          ))}
        </Placed>
      );
    },
    Fence: ({ length = 4, ...a }) => {
      solidBox(a, length, 1, 0.15);
      return (
        <Placed {...a}>
          <B m={m} p={[0, 0.75, 0]} s={[length, 0.1, 0.08]} c={a.color ?? '#ffffff'} k="wood" />
          <B m={m} p={[0, 0.4, 0]} s={[length, 0.1, 0.08]} c={a.color ?? '#ffffff'} k="wood" />
          {Array.from({ length: Math.round(length) + 1 }, (_, i) => (
            <B
              key={i}
              m={m}
              p={[-length / 2 + i * (length / Math.round(length)), 0.5, 0]}
              s={[0.12, 1, 0.12]}
              c={a.color ?? '#ffffff'}
              k="wood"
            />
          ))}
        </Placed>
      );
    },
    Flag: ({ height = 7, ...a }) => {
      solidCyl(a, 0.12, height);
      return (
        <Placed {...a}>
          <C m={m} p={[0, height / 2, 0]} r={0.07} h={height} c="#dddddd" k="metal" />
          <HondurasFlag pos={[1.05, height - 0.7, 0]} />
        </Placed>
      );
    },
    Stall: ({ sign, ...a }) => {
      solidBox(a, 2.6, 1, 1.2);
      const tex = useMemo(
        () => (sign ? textTexture(sign, { fg: '#1d1d1f', bg: '#ffd23f', radius: 0.15 }) : null),
        [sign],
      );
      return (
        <Placed {...a}>
          <B m={m} p={[0, 0.5, 0]} s={[2.6, 1, 1.2]} c="#8a5a34" k="wood" />
          {[-1.2, 1.2].map((x) => (
            <C key={x} m={m} p={[x, 1.3, 0.5]} r={0.05} h={2.6} c="#5a3d26" k="wood" />
          ))}
          <B m={m} p={[0, 2.65, 0.1]} s={[3, 0.12, 1.8]} c={a.color ?? '#e63946'} k="cloth" r={[0.18, 0, 0]} />
          {tex && (
            <mesh position={[0, 2.2, 0.75]}>
              <planeGeometry args={[Math.min(2.5, 0.42 * (tex as any).aspect), 0.42]} />
              <meshBasicMaterial map={tex} transparent />
            </mesh>
          )}
        </Placed>
      );
    },
    Kiosk: (a) => {
      solidCyl(a, 2.6, 0.5);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 0.25, 0]} r={2.7} h={0.5} c="#f2f2f2" k="stone" sides={8} />
          {Array.from({ length: 8 }, (_, i) => (
            <C
              key={i}
              m={m}
              p={[Math.cos((i * Math.PI) / 4) * 2.3, 1.8, Math.sin((i * Math.PI) / 4) * 2.3]}
              r={0.1}
              h={2.6}
              c="#ffffff"
            />
          ))}
          <C m={m} p={[0, 3.8, 0]} r={3.1} rt={0.1} h={1.5} c={a.color ?? '#e63946'} k="roof" sides={8} />
        </Placed>
      );
    },
    Fountain: (a) => {
      solidCyl(a, 1.8, 0.6);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 0.3, 0]} r={1.9} h={0.6} c="#cfd3d6" k="stone" />
          <C m={m} p={[0, 0.58, 0]} r={1.6} h={0.1} c="#3aa6d8" k="water" />
          <C m={m} p={[0, 1, 0]} r={0.25} h={1.4} c="#cfd3d6" k="stone" />
        </Placed>
      );
    },
    Statue: (a) => {
      solidBox(a, 1.4, 1.6, 1.4);
      return (
        <Placed {...a}>
          <B m={m} p={[0, 0.8, 0]} s={[1.4, 1.6, 1.4]} c="#cfd3d6" k="stone" />
          <C m={m} p={[0, 2.4, 0]} r={0.3} h={1.6} c={a.color ?? '#6d7f73'} k="metal" />
          <S m={m} p={[0, 3.4, 0]} r={0.28} c={a.color ?? '#6d7f73'} k="metal" />
        </Placed>
      );
    },
    Sign: ({ text, w, ...a }) => {
      const tex = useMemo(
        () => textTexture(text, { fg: '#ffffff', bg: a.color ?? '#0d47a1', radius: 0.15 }),
        [text, a.color],
      );
      const ww = w ?? Math.min(4, 0.6 * (tex as any).aspect);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 1, 0]} r={0.06} h={2} c="#444" k="metal" />
          <mesh position={[0, 2.2, 0]}>
            <planeGeometry args={[ww, ww / (tex as any).aspect]} />
            <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
          </mesh>
        </Placed>
      );
    },
    PortalArch: ({ label, ...a }) => {
      const col = a.color ?? '#00a3d7';
      const tex = useMemo(() => textTexture(label, { fg: '#1d1d1f', bg: '#ffffff', radius: 0.15 }), [label]);
      return (
        <Placed {...a}>
          {[-1.5, 1.5].map((x) => (
            <B key={x} m={m} p={[x, 1.7, 0]} s={[0.6, 3.4, 0.6]} c={col} />
          ))}
          <B m={m} p={[0, 3.6, 0]} s={[3.6, 0.6, 0.6]} c={col} />
          <mesh position={[0, 1.7, 0]}>
            <planeGeometry args={[2.4, 3.2]} />
            <meshBasicMaterial color={col} transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 4.4, 0.02]}>
            <planeGeometry args={[Math.min(4.4, 0.7 * (tex as any).aspect), 0.7]} />
            <meshBasicMaterial map={tex} transparent side={THREE.DoubleSide} />
          </mesh>
        </Placed>
      );
    },
    Bus: (a) => {
      solidBox(a, 2.4, 2.6, 6);
      return (
        <Placed {...a}>
          <B m={m} p={[0, 1.5, 0]} s={[2.4, 2.2, 6]} c={a.color ?? '#ffd23f'} />
          <B m={m} p={[0, 1.9, 0]} s={[2.45, 0.8, 5.2]} c="#2b4a63" k="glass" />
          {[-1.9, 1.9].map((z) =>
            [-1.1, 1.1].map((x) => (
              <C key={`${x}${z}`} m={m} p={[x, 0.45, z]} r={0.45} h={0.3} c="#111" rot={[0, 0, Math.PI / 2]} />
            )),
          )}
        </Placed>
      );
    },
    Mototaxi: (a) => {
      solidBox(a, 1.5, 1.8, 2.6);
      return (
        <Placed {...a}>
          <B m={m} p={[0, 0.9, -0.3]} s={[1.5, 1.2, 1.7]} c={a.color ?? '#e63946'} />
          <B m={m} p={[0, 1.7, -0.2]} s={[1.6, 0.1, 2.2]} c="#ffd23f" k="cloth" />
          <C m={m} p={[0, 0.35, 1.1]} r={0.35} h={0.2} c="#111" rot={[0, 0, Math.PI / 2]} />
          {[-0.7, 0.7].map((x) => (
            <C key={x} m={m} p={[x, 0.35, -0.9]} r={0.35} h={0.2} c="#111" rot={[0, 0, Math.PI / 2]} />
          ))}
        </Placed>
      );
    },
    Car: (a) => {
      solidBox(a, 1.9, 1.4, 4.2);
      return (
        <Placed {...a}>
          <B m={m} p={[0, 0.7, 0]} s={[1.9, 0.8, 4.2]} c={a.color ?? '#ffffff'} />
          <B m={m} p={[0, 1.35, -0.2]} s={[1.7, 0.6, 2.2]} c="#2b4a63" k="glass" />
          {[-1.3, 1.3].map((z) =>
            [-0.9, 0.9].map((x) => (
              <C key={`${x}${z}`} m={m} p={[x, 0.38, z]} r={0.38} h={0.25} c="#111" rot={[0, 0, Math.PI / 2]} />
            )),
          )}
        </Placed>
      );
    },
    Boat: (a) => (
      <Placed {...a}>
        <B m={m} p={[0, 0.3, 0]} s={[1.2, 0.5, 3.6]} c={a.color ?? '#1d7fc7'} k="wood" />
        <B m={m} p={[0, 0.6, 0]} s={[1, 0.08, 0.3]} c="#8a5a34" k="wood" />
      </Placed>
    ),
    Cone: (a) => {
      solidCyl(a, 0.3, 0.7);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 0.38, 0]} r={0.28} rt={0.05} h={0.7} c={a.color ?? '#ff7a3d'} />
          <B m={m} p={[0, 0.03, 0]} s={[0.7, 0.06, 0.7]} c="#ff7a3d" />
        </Placed>
      );
    },
    Barrel: (a) => {
      solidCyl(a, 0.45, 1.1);
      return (
        <Placed {...a}>
          <C m={m} p={[0, 0.55, 0]} r={0.45} h={1.1} c={a.color ?? '#1d7fc7'} k="metal" />
        </Placed>
      );
    },
    Crate: (a) => {
      solidBox(a, 1, 1, 1);
      return (
        <Placed {...a}>
          <B m={m} p={[0, 0.5, 0]} s={[1, 1, 1]} c={a.color ?? '#b07a45'} k="wood" />
        </Placed>
      );
    },
    Tire: (a) => {
      solidCyl(a, 0.55, 0.35);
      return (
        <Placed {...a}>
          <mesh position={[0, 0.2, 0]} rotation-x={Math.PI / 2} castShadow material={m('plastic', '#1b1b1b')}>
            <torusGeometry args={[0.42, 0.17, 8, 18]} />
          </mesh>
        </Placed>
      );
    },
    SoccerBall: ({ r = 0.32 }) => (
      <mesh castShadow material={m('plastic', '#ffffff')}>
        <icosahedronGeometry args={[r, 1]} />
      </mesh>
    ),
    Goal: ({ w = 5, h = 2.4, ...a }) => (
      <Placed {...a}>
        {[-w / 2, w / 2].map((x) => (
          <C key={x} m={m} p={[x, h / 2, 0]} r={0.08} h={h} c="#ffffff" k="metal" />
        ))}
        <C m={m} p={[0, h, 0]} r={0.08} h={w} c="#ffffff" k="metal" rot={[0, 0, Math.PI / 2]} />
        <mesh position={[0, h / 2, -0.9]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} side={THREE.DoubleSide} wireframe />
        </mesh>
      </Placed>
    ),
    Coin: ({ r = 0.32 }) => (
      <mesh rotation-x={Math.PI / 2} castShadow material={m('gold', '#ffc93c')}>
        <cylinderGeometry args={[r, r, 0.08, 18]} />
      </mesh>
    ),
    Gem: ({ color = '#5cc98e' }) => (
      <mesh castShadow material={m('gold', color)}>
        <octahedronGeometry args={[0.35]} />
      </mesh>
    ),
    Macaw: (a) => (
      <Placed {...a}>
        <S m={m} p={[0, 0.3, 0]} r={0.22} c="#e63946" s={[1, 1.4, 1]} />
        <S m={m} p={[0, 0.62, 0.05]} r={0.14} c="#e63946" />
        <B m={m} p={[0, 0.25, -0.25]} s={[0.12, 0.08, 0.5]} c="#1d7fc7" />
        <B m={m} p={[0, 0.6, 0.2]} s={[0.07, 0.07, 0.12]} c="#ffc93c" />
      </Placed>
    ),
  };
  return props;
}

/** Bandera de Honduras ondeando (azul turquesa, blanco, cinco estrellas). `pos` es el centro de la tela. */
export function HondurasFlag({ pos, w = 2, h = 1 }: { pos: V3; w?: number; h?: number }) {
  const tex = useMemo(() => {
    const cv = document.createElement('canvas');
    cv.width = 256;
    cv.height = 128;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#00bce4';
    c.fillRect(0, 0, 256, 128);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 43, 256, 42);
    c.fillStyle = '#00bce4';
    const star = (x: number, y: number) => {
      c.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5,
          r = i % 2 ? 2.6 : 6.5;
        c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.fill();
    };
    star(128, 64);
    star(100, 53);
    star(100, 75);
    star(156, 53);
    star(156, 75);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const g = ref.current?.geometry as THREE.PlaneGeometry | undefined;
    if (!g) return;
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + w / 2;
      p.setZ(i, Math.sin(x * 3 - clock.elapsedTime * 5) * 0.09 * x);
    }
    p.needsUpdate = true;
  });
  return (
    <mesh ref={ref} position={pos}>
      <planeGeometry args={[w, h, 10, 1]} />
      <meshBasicMaterial map={tex} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Avatar base de piezas. Sirve de referencia: lee `config` (colores, prendas) y `state` (animación). */
export function BaseAvatar({ config, state, name, scale = 1 }: AvatarProps) {
  const al = useRef<THREE.Group>(null),
    ar = useRef<THREE.Group>(null),
    ll = useRef<THREE.Group>(null),
    lr = useRef<THREE.Group>(null),
    root = useRef<THREE.Group>(null);
  const tag = useMemo(() => (name ? textTexture(name, { fg: '#ffffff', bg: 'rgba(12,22,34,0.8)' }) : null), [name]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime,
      a = state.anim;
    let sw = 0,
      arms = 0,
      bob = 0,
      armUp = 0;
    if (a === 'walk' || a === 'run' || a === 'carry') {
      sw = Math.sin(t * (a === 'run' ? 14 : 9)) * (a === 'run' ? 0.9 : 0.6);
      arms = a === 'carry' ? 0 : sw;
    } else if (a === 'jump' || a === 'fall') {
      armUp = 2.4;
      sw = 0.3;
    } else if (a === 'dance' || a === 'dance2') {
      bob = Math.abs(Math.sin(t * 8)) * 0.12;
      arms = Math.sin(t * 8) * 1.2;
      sw = Math.sin(t * 8) * 0.3;
      if (root.current) root.current.rotation.y = Math.sin(t * 4) * 0.5;
    } else if (a === 'celebrate') {
      armUp = 2.8;
      bob = Math.abs(Math.sin(t * 10)) * 0.3;
    } else if (a === 'wave') {
      armUp = 2.6 + Math.sin(t * 10) * 0.3;
    } else if (a === 'clap') {
      arms = 1.2 + Math.sin(t * 16) * 0.2;
    } else if (a === 'kick') {
      sw = -1.2;
    } else if (a === 'throw') {
      armUp = 2.2;
    } else if (a === 'drive' || a === 'sit') {
      sw = 0;
    }
    if (a !== 'dance' && a !== 'dance2' && root.current) root.current.rotation.y = 0;
    if (root.current) root.current.position.y = bob;
    const sit = a === 'drive' || a === 'sit' ? -1.4 : 0;
    if (ll.current) ll.current.rotation.x = sit || sw;
    if (lr.current) lr.current.rotation.x = sit || -sw;
    if (al.current) al.current.rotation.x = a === 'carry' ? -1.3 : armUp ? -armUp : -arms;
    if (ar.current) ar.current.rotation.x = a === 'carry' ? -1.3 : a === 'wave' ? 0 : armUp ? -armUp : arms;
  });
  const hat = config.hat !== 'sin_sombrero';
  return (
    <group scale={scale}>
      <group ref={root}>
        <mesh position={[0, 1.55, 0]} castShadow>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshStandardMaterial color={config.skin} />
        </mesh>
        {config.hair !== 'calvo' && (
          <mesh position={[0, 1.78, -0.03]} castShadow>
            <boxGeometry args={[0.54, 0.16, 0.54]} />
            <meshStandardMaterial color={config.hairColor} />
          </mesh>
        )}
        {hat && (
          <mesh position={[0, 1.9, 0]} castShadow>
            <cylinderGeometry args={[0.45, 0.45, 0.06, 14]} />
            <meshStandardMaterial color={config.hatColor} />
          </mesh>
        )}
        <mesh position={[-0.11, 1.58, 0.255]}>
          <boxGeometry args={[0.07, 0.07, 0.01]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        <mesh position={[0.11, 1.58, 0.255]}>
          <boxGeometry args={[0.07, 0.07, 0.01]} />
          <meshBasicMaterial color="#111" />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow>
          <boxGeometry args={[0.7, 0.7, 0.36]} />
          <meshStandardMaterial color={config.shirtColor} />
        </mesh>
        <group ref={al} position={[-0.47, 1.3, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.22, 0.66, 0.24]} />
            <meshStandardMaterial color={config.skin} />
          </mesh>
        </group>
        <group ref={ar} position={[0.47, 1.3, 0]}>
          <mesh position={[0, -0.3, 0]} castShadow>
            <boxGeometry args={[0.22, 0.66, 0.24]} />
            <meshStandardMaterial color={config.skin} />
          </mesh>
        </group>
        <group ref={ll} position={[-0.18, 0.65, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <boxGeometry args={[0.3, 0.66, 0.3]} />
            <meshStandardMaterial color={config.pantsColor} />
          </mesh>
        </group>
        <group ref={lr} position={[0.18, 0.65, 0]}>
          <mesh position={[0, -0.32, 0]} castShadow>
            <boxGeometry args={[0.3, 0.66, 0.3]} />
            <meshStandardMaterial color={config.pantsColor} />
          </mesh>
        </group>
      </group>
      {tag && (
        <sprite position={[0, 2.35, 0]} scale={[0.34 * (tag as any).aspect, 0.34, 1]}>
          <spriteMaterial map={tag} transparent depthTest={false} />
        </sprite>
      )}
    </group>
  );
}

/** Luz y cielo base: sol con sombras que sigue al jugador, luz de relleno y niebla suave. */
export function BaseSkyRig({ time = 'dia', shadowRadius = 45, indoor = false, fogColor, fogFar = 260 }: SkyRigProps) {
  const sun = useRef<THREE.DirectionalLight>(null);
  const scene = useThree((s) => s.scene);
  const sky = time === 'noche' ? '#0b1730' : time === 'tarde' ? '#ffb27a' : indoor ? '#2a2018' : '#8fd3ff';
  useMemo(() => {
    scene.background = new THREE.Color(sky);
    scene.fog = new THREE.Fog(fogColor ?? sky, fogFar * 0.4, fogFar);
    env.hour = time === 'noche' ? 22 : time === 'tarde' ? 17.5 : 10;
    env.weather = 'despejado';
  }, [scene, sky, fogColor, fogFar, time]);
  useFrame(() => {
    const l = sun.current;
    if (!l) return;
    const p = player.pos;
    l.position.set(p[0] + 30, p[1] + 50, p[2] + 20);
    l.target.position.set(p[0], p[1], p[2]);
    l.target.updateMatrixWorld();
  });
  return (
    <>
      <hemisphereLight
        args={[time === 'noche' ? '#4a5a8a' : '#ffffff', '#5a6a4a', time === 'noche' ? 0.5 : indoor ? 0.9 : 1.1]}
      />
      <directionalLight
        ref={sun}
        intensity={time === 'noche' ? 0.4 : 2.2}
        color={time === 'tarde' ? '#ffd0a0' : '#fff6e0'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-shadowRadius}
        shadow-camera-right={shadowRadius}
        shadow-camera-top={shadowRadius}
        shadow-camera-bottom={-shadowRadius}
        shadow-camera-near={1}
        shadow-camera-far={160}
        shadow-bias={-0.0005}
      />
    </>
  );
}

export const basePack: Omit<ArtPack, 'name'> = {
  material: baseMaterial,
  Avatar: BaseAvatar,
  SkyRig: BaseSkyRig,
  props: makeBaseProps(baseMaterial),
};
