// Monturas, público y fondos que corren, para el motor «monta».
import { useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { Ball, Block, Cyl, P, useTick } from '../../kit';
import { rng } from '../api';

export type Montura = 'toro' | 'caballo' | 'burro' | 'mula' | 'tabla' | 'balsa' | 'cayuco' | 'tirolesa';
export const ANIMALES: Montura[] = ['toro', 'caballo', 'burro', 'mula'];
export const AGUA: Montura[] = ['tabla', 'balsa', 'cayuco'];
/** Altura de la silla (m, desde el punto de apoyo de la montura) y animación del jinete. */
export const ASIENTO: Record<Montura, { y: number; anim: 'sit' | 'idle' | 'jump' }> = { toro: { y: 1.62, anim: 'sit' }, caballo: { y: 1.6, anim: 'sit' }, burro: { y: 1.36, anim: 'sit' }, mula: { y: 1.5, anim: 'sit' }, tabla: { y: 0.1, anim: 'idle' }, balsa: { y: 0.28, anim: 'sit' }, cayuco: { y: 0.34, anim: 'sit' }, tirolesa: { y: 1.1, anim: 'jump' } };
const ns = { solid: false as const, cast: true };

function Animal({ k }: { k: Montura }) {
  const o = { toro: { c: '#3a2a22', c2: '#e9e2d6', s: 1.15, hump: true, horns: true, ears: 0.14, neck: 0.15 }, caballo: { c: '#8a5530', c2: '#2b1c12', s: 1.05, hump: false, horns: false, ears: 0.16, neck: 0.55 }, burro: { c: '#8e9096', c2: '#e8e8e8', s: 0.85, hump: false, horns: false, ears: 0.3, neck: 0.3 }, mula: { c: '#6d4a32', c2: '#c8a37a', s: 0.98, hump: false, horns: false, ears: 0.28, neck: 0.4 } }[k as 'toro'];
  const s = o.s;
  return <group scale={s}>
    <Ball pos={[0, 1.02, 0]} r={0.5} color={o.c} mat="cloth" />{/* cuerpo (se estira abajo) */}
    <group position={[0, 1.02, 0.05]} scale={[0.95, 0.9, 1.7]}><Ball pos={[0, 0, 0]} r={0.5} color={o.c} mat="cloth" /></group>
    <Ball pos={[0, 1.0, -0.62]} r={0.46} color={o.c} mat="cloth" /><Ball pos={[0, 1.02, 0.62]} r={0.45} color={o.c} mat="cloth" />
    {o.hump && <Ball pos={[0, 1.5, -0.45]} r={0.32} color={o.c} mat="cloth" />}
    {k === 'toro' && <Ball pos={[0.25, 1.2, 0.2]} r={0.22} color={o.c2} mat="cloth" />}
    {([[-0.26, -0.55], [0.26, -0.55], [-0.26, 0.55], [0.26, 0.55]] as const).map(([x, z], i) => <group key={i}><Cyl pos={[x, 0.45, z]} r={0.1} h={0.9} color={o.c} mat="cloth" solid={false} /><Cyl pos={[x, 0.07, z]} r={0.11} h={0.14} color="#2b2b2b" mat="plastic" solid={false} /></group>)}
    <group position={[0, 1.2, -0.78]} rotation-x={-o.neck - 0.3}><Cyl pos={[0, 0.35, 0]} r={0.2} h={0.8} color={o.c} mat="cloth" solid={false} rTop={0.15} /></group>
    <group position={[0, 1.25 + o.neck * 0.7, -1.18 - o.neck * 0.3]}>
      <Block pos={[0, 0.1, -0.2]} size={[0.3, 0.34, 0.62]} color={o.c} mat="cloth" {...ns} /><Block pos={[0, 0.0, -0.52]} size={[0.26, 0.26, 0.2]} color={k === 'toro' ? '#d8b9a8' : o.c2} mat="cloth" {...ns} />
      <Ball pos={[-0.15, 0.2, -0.1]} r={0.05} color="#111" /><Ball pos={[0.15, 0.2, -0.1]} r={0.05} color="#111" />
      {[-1, 1].map(x => <group key={x} position={[x * 0.17, 0.32, 0.05]} rotation-z={-x * 0.5}><Cyl pos={[0, o.ears / 2, 0]} r={0.06} h={o.ears * 2} color={o.c} mat="cloth" solid={false} rTop={0.02} /></group>)}
      {o.horns && [-1, 1].map(x => <group key={x} position={[x * 0.2, 0.28, 0]} rotation-z={-x * 1.0}><Cyl pos={[0, 0.25, 0]} r={0.05} h={0.6} color="#f4ead2" mat="plastic" solid={false} rTop={0.01} /></group>)}
    </group>
    {k !== 'toro' && <Block pos={[0, 1.55 + o.neck * 0.3, -0.85]} size={[0.07, 0.4, 0.4]} color={o.c2} mat="cloth" {...ns} />}
    <group position={[0, 1.1, 0.95]} rotation-x={0.4}><Cyl pos={[0, -0.35, 0]} r={0.07} h={0.8} color={k === 'toro' ? o.c : o.c2} mat="cloth" solid={false} rTop={0.03} /></group>
    <Block pos={[0, 1.52, 0.05]} size={[0.6, 0.12, 0.65]} color={k === 'toro' ? '#9b2d2d' : '#b5382f'} mat="cloth" {...ns} />
    {k === 'toro' && <><Cyl pos={[0, 1.58, 0.05]} r={0.5} h={0.04} color="#e6c04b" mat="gold" solid={false} />{/* cincha y cuerda */}</>}
  </group>;
}
function Tabla() { return <group><Block pos={[0, 0, 0]} size={[0.62, 0.1, 2.5]} color="#ffd23f" mat="plastic" {...ns} /><Block pos={[0, 0.056, -0.2]} size={[0.62, 0.02, 0.4]} color="#e63946" mat="plastic" {...ns} /><Block pos={[0, 0.0, -1.35]} size={[0.4, 0.1, 0.4]} color="#ffd23f" mat="plastic" {...ns} /></group>; }
function Balsa() { return <group>{[-0.5, -0.25, 0, 0.25, 0.5].map((x, i) => <group key={i} position={[x, 0.12, 0]} rotation-x={Math.PI / 2}><Cyl pos={[0, 0, 0]} r={0.14} h={2.4} color={i % 2 ? '#c89658' : '#b98648'} mat="wood" solid={false} /></group>)}{[-0.7, 0.7].map(z => <Block key={z} pos={[0, 0.3, z]} size={[1.3, 0.08, 0.14]} color="#7a4a24" mat="wood" {...ns} />)}<Cyl pos={[0, 0.5, -1.0]} r={0.04} h={0.7} color="#7a4a24" mat="wood" solid={false} /></group>; }
function Cayuco() { return <group><Block pos={[0, 0.1, 0]} size={[0.8, 0.2, 2.8]} color="#8a5a2c" mat="wood" {...ns} />{[-1, 1].map(x => <Block key={x} pos={[x * 0.4, 0.34, 0]} size={[0.12, 0.34, 2.6]} color="#9a6a38" mat="wood" {...ns} />)}<Block pos={[0, 0.3, -1.45]} size={[0.8, 0.3, 0.12]} color="#9a6a38" mat="wood" {...ns} /><Block pos={[0, 0.3, 1.45]} size={[0.8, 0.3, 0.12]} color="#9a6a38" mat="wood" {...ns} /><group position={[0, 0.2, -1.5]} rotation-x={0.7}><Block pos={[0, 0.3, 0]} size={[0.6, 0.12, 0.5]} color="#8a5a2c" mat="wood" {...ns} /></group>
    <Block pos={[0.7, 0.45, 0.2]} size={[0.07, 0.07, 1.5]} color="#c89658" mat="wood" rot={0} {...ns} /></group>; }
function Tirolesa() { return <group><Block pos={[0, 2.6, 0]} size={[0.14, 0.14, 0.5]} color="#444" mat="metal" {...ns} />{[-0.18, 0.18].map(x => <Cyl key={x} pos={[x, 1.8, 0]} r={0.025} h={1.6} color="#222" mat="plastic" solid={false} />)}<Block pos={[0, 1.0, 0]} size={[0.5, 0.1, 0.4]} color="#e63946" mat="cloth" {...ns} /></group>; }
export function Mount({ k }: { k: Montura }) { return k === 'tabla' ? <Tabla /> : k === 'balsa' ? <Balsa /> : k === 'cayuco' ? <Cayuco /> : k === 'tirolesa' ? <Tirolesa /> : <Animal k={k} />; }

/** Cosas que corren hacia atrás: cada hijo se repite con `n` copias a lo largo de `len` metros. */
export function Scroll({ items, v, len, speed }: { items: { x: number; y?: number; z: number; el: ReactNode }[]; v: React.MutableRefObject<number>; len: number; speed?: number }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useTick(dt => { v.current += dt * (speed ?? 1); items.forEach((it, i) => { const g = refs.current[i]; if (g) g.position.set(it.x, it.y ?? 0, ((it.z + v.current) % len + len) % len - len * 0.65); }); });
  return <>{items.map((it, i) => <group key={i} ref={g => { refs.current[i] = g; }}>{it.el}</group>)}</>;
}

/** Público en las gradas: un InstancedMesh de cuerpos y otro de cabezas que saltan con la emoción. */
export function Gente({ n = 56, excite }: { n?: number; excite: React.MutableRefObject<number> }) {
  const body = useRef<THREE.InstancedMesh>(null), head = useRef<THREE.InstancedMesh>(null);
  const pe = useMemo(() => { const R = rng(77); return Array.from({ length: n }, (_, i) => { const tier = i % 3, a = (Math.floor(i / 3) / (n / 3)) * 2 - 1; return { x: a * 12 + (R() - 0.5) * 0.4, z: -10.6 - tier * 1.15, y: 0.55 + tier * 0.85, ph: R() * 6.28, c: ['#e63946', '#2a9d8f', '#f4a261', '#264653', '#e9c46a', '#8ecae6', '#ffffff', '#9b5de5'][Math.floor(R() * 8)], sk: ['#c98f5f', '#8d5a3b', '#e0ac7e', '#a66f45'][Math.floor(R() * 4)] }; }); }, [n]);
  const m = useMemo(() => new THREE.Matrix4(), []), c = useMemo(() => new THREE.Color(), []), painted = useRef(false);
  useTick((_, t) => {
    const b = body.current, h = head.current; if (!b || !h) return; const e = excite.current;
    pe.forEach((p, i) => { const j = Math.max(0, Math.sin(t * (4 + e * 5) + p.ph)) * (0.05 + 0.3 * e); m.makeScale(1, 1, 1); m.setPosition(p.x, p.y + 0.35 + j, p.z); b.setMatrixAt(i, m); m.setPosition(p.x, p.y + 0.9 + j, p.z); h.setMatrixAt(i, m); if (!painted.current) { b.setColorAt(i, c.set(p.c)); h.setColorAt(i, c.set(p.sk)); } });
    painted.current = true; b.instanceMatrix.needsUpdate = h.instanceMatrix.needsUpdate = true; if (b.instanceColor) b.instanceColor.needsUpdate = true; if (h.instanceColor) h.instanceColor.needsUpdate = true;
  });
  const bodyMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.8 }), []);
  return <>
    <instancedMesh ref={body} args={[undefined as any, bodyMat, n]} frustumCulled={false} castShadow><cylinderGeometry args={[0.22, 0.28, 0.7, 8]} /></instancedMesh>
    <instancedMesh ref={head} args={[undefined as any, bodyMat, n]} frustumCulled={false}><sphereGeometry args={[0.19, 10, 8]} /></instancedMesh>
    {[0, 1, 2].map(i => <Block key={i} pos={[0, 0.25 + i * 0.85, -10.6 - i * 1.15 - 0.55]} size={[28, 0.5 + i * 0.85, 1.1]} color={i % 2 ? '#c9b28a' : '#d8c29a'} mat="concrete" solid={false} />)}
  </>;
}
/** Cerca circular del corral: postes instanciados y tres rieles. */
export function Corral({ r = 8.6 }: { r?: number }) {
  const posts = useRef<THREE.InstancedMesh>(null), m = useMemo(() => new THREE.Matrix4(), []);
  useMemo(() => null, []);
  const ref = (im: THREE.InstancedMesh | null) => { posts.current = im; if (!im) return; for (let i = 0; i < 36; i++) { const a = (i / 36) * Math.PI * 2; m.makeTranslation(Math.sin(a) * r, 0.75, Math.cos(a) * r); im.setMatrixAt(i, m); } im.instanceMatrix.needsUpdate = true; };
  return <>
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, 36]} frustumCulled={false} castShadow><boxGeometry args={[0.2, 1.5, 0.2]} /><meshStandardMaterial color="#7a4a24" roughness={0.9} /></instancedMesh>
    {[0.45, 0.95, 1.4].map(y => <mesh key={y} position={[0, y, 0]} rotation-x={Math.PI / 2}><torusGeometry args={[r, 0.06, 6, 72]} /><meshStandardMaterial color="#9a6a38" roughness={0.9} /></mesh>)}
    <Cyl pos={[0, 0.02, 0]} r={r - 0.2} h={0.05} color="#d9bb86" mat="sand" solid={false} cast={false} />
  </>;
}
export { P };
