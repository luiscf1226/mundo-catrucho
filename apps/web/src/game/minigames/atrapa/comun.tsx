// Piezas comunes de los motores pesca / atrapa / cocina: efectos, escenario por fondo, bots y lectura de "mantener".
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { art, Ball, Block, Ground, Label, P, useTick } from '../../kit';
import { input } from '../../../core/input';
import type { AvatarConfig, AvatarState, V3 } from '../../../core/types';
import { rng, type Partida } from '../api';

// ------------------------------------------------------------------ mantener (tecla F / espacio, puntero, táctil)
/** Devuelve una función que dice si el jugador está "manteniendo" la acción. Llamarla una vez por cuadro. */
export function useHold() {
  const r = useRef({ key: false, keyAt: -1e9, ptr: -1e9, tog: false }).current;
  useEffect(() => {
    const kd = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (k === 'f' || k === ' ') { r.key = true; r.keyAt = performance.now(); } };
    const ku = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (k === 'f' || k === ' ') r.key = false; };
    const bl = () => { r.key = false; r.tog = false; };
    addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('blur', bl);
    return () => { removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('blur', bl); };
  }, [r]);
  return () => {
    const now = performance.now(), fired = input.take('fire');
    if (input.pointerDown) { r.ptr = now; r.tog = false; return true; }
    if (r.key || now - r.keyAt < 110) { r.tog = false; return true; }
    if (fired && input.touch && now - r.ptr > 300) r.tog = !r.tog; // botón 🎯 táctil: un toque agarra, otro suelta
    return r.tog;
  };
}

// ------------------------------------------------------------------ efectos: chispas y textos flotantes
const MAXP = 90;
const parts = Array.from({ length: MAXP }, () => ({ x: 0, y: -50, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, s: 0.1, c: new THREE.Color('#fff') }));
let cursor = 0;
interface Pop { x: number; y: number; z: number; text: string; fg: string; age: number }
let pops: Pop[] = [];
export const fx = {
  emit(x: number, y: number, z: number, color: string, n = 10, speed = 3, size = 0.1, up = 2.5) {
    for (let i = 0; i < n; i++) {
      const p = parts[cursor++ % MAXP], a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.8);
      p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * v; p.vz = Math.sin(a) * v; p.vy = up * (0.5 + Math.random()); p.max = p.life = 0.45 + Math.random() * 0.45; p.s = size * (0.7 + Math.random() * 0.6); p.c.set(color);
    }
  },
  pop(x: number, y: number, z: number, text: string, fg = '#ffffff') { pops.push({ x, y, z, text, fg, age: 0 }); if (pops.length > 8) pops.shift(); },
  clear() { for (const p of parts) { p.life = 0; p.y = -50; } pops = []; },
};
export function Fx() {
  const mesh = useRef<THREE.InstancedMesh>(null), dummy = useMemo(() => new THREE.Object3D(), []);
  const [, draw] = useState(0), acc = useRef(0);
  useEffect(() => { fx.clear(); const m = mesh.current; if (m) m.setColorAt(0, new THREE.Color('#fff')); return () => fx.clear(); }, []);
  useTick(dt => {
    const m = mesh.current; if (!m) return;
    parts.forEach((p, i) => {
      if (p.life > 0) { p.life -= dt; p.vy -= 9 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; if (p.y < 0.02) { p.y = 0.02; p.vy = 0; p.vx *= 0.8; p.vz *= 0.8; } }
      const s = p.life > 0 ? p.s * Math.min(1, p.life / p.max * 1.6) : 0;
      dummy.position.set(p.x, p.y, p.z); dummy.scale.setScalar(s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, p.c);
    });
    m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
    if (pops.length) { for (const p of pops) p.age += dt; pops = pops.filter(p => p.age < 1.25); acc.current += dt; if (acc.current > 0.06) { acc.current = 0; draw(n => n + 1); } }
  });
  return (
    <>
      <instancedMesh ref={mesh} args={[undefined as never, undefined as never, MAXP]} frustumCulled={false}><sphereGeometry args={[1, 6, 5]} /><meshBasicMaterial /></instancedMesh>
      {pops.map((p, i) => <Label key={i + p.text} pos={[p.x, p.y + p.age * 1.1, p.z]} text={p.text} h={0.5} fg={p.fg} />)}
    </>
  );
}

// ------------------------------------------------------------------ escenario según `fondo` o bioma
export type Fondo = 'costa' | 'montana' | 'valle' | 'pueblo' | 'ciudad' | 'lago' | 'selva' | 'cueva' | 'estadio' | 'mar' | 'rio' | 'finca' | 'mercado' | 'ruinas' | 'feria';
const BIOMA: Record<string, Fondo> = { costa: 'costa', sur: 'valle', valle: 'valle', lago: 'lago', montana: 'montana', capital: 'ciudad', selva: 'selva', isla: 'mar', bosque: 'montana' };
export const fondoDe = (p: Partida, def: Fondo): Fondo => (p.tema.fondo as Fondo) ?? BIOMA[p.dept?.biome ?? ''] ?? def;

interface Esc { time: 'dia' | 'tarde' | 'noche'; g: string; m: 'grass' | 'sand' | 'dirt' | 'stone' | 'cobble' | 'concrete'; k: string[]; water?: string; indoor?: boolean }
const ESC: Record<Fondo, Esc> = {
  costa: { time: 'dia', g: '#e6cf8f', m: 'sand', k: ['palm', 'palm', 'rock', 'bush', 'palm', 'palm'], water: '#2aa7b8' },
  mar: { time: 'tarde', g: '#ead69a', m: 'sand', k: ['palm', 'rock', 'palm', 'bush', 'palm'], water: '#1f6fb5' },
  lago: { time: 'dia', g: '#76b255', m: 'grass', k: ['pine', 'tree', 'rock', 'bush', 'pine'], water: '#3c8fb5' },
  rio: { time: 'dia', g: '#5e9e48', m: 'grass', k: ['tree', 'tree', 'bush', 'rock', 'tree'], water: '#4a8f7a' },
  montana: { time: 'tarde', g: '#6b9a50', m: 'grass', k: ['pine', 'pine', 'rock', 'pine', 'bush', 'pine'] },
  valle: { time: 'dia', g: '#7bbf56', m: 'grass', k: ['tree', 'flowers', 'bush', 'tree', 'flowers', 'tree'] },
  pueblo: { time: 'dia', g: '#8fbf5a', m: 'grass', k: ['house', 'tree', 'fence', 'house', 'lamp', 'tree'] },
  ciudad: { time: 'dia', g: '#a3a8ad', m: 'concrete', k: ['house', 'lamp', 'house', 'car', 'lamp', 'house'] },
  selva: { time: 'dia', g: '#3f8a3a', m: 'grass', k: ['tree', 'tree', 'bush', 'tree', 'macaw', 'bush', 'tree'] },
  cueva: { time: 'dia', g: '#5d5d66', m: 'stone', k: ['rock', 'rock', 'rock', 'rock'], indoor: true },
  estadio: { time: 'dia', g: '#4fae4a', m: 'grass', k: ['flag', 'lamp', 'goal', 'lamp', 'flag'] },
  ruinas: { time: 'tarde', g: '#b9a77f', m: 'stone', k: ['statue', 'rock', 'rock', 'statue', 'bush'] },
  feria: { time: 'dia', g: '#c8a46a', m: 'dirt', k: ['stall', 'flag', 'stall', 'lamp', 'flag'] },
  mercado: { time: 'dia', g: '#b09a83', m: 'cobble', k: ['stall', 'crate', 'stall', 'barrel', 'stall'] },
  finca: { time: 'dia', g: '#78b24e', m: 'grass', k: ['tree', 'bush', 'tree', 'bush', 'bush', 'tree'] },
};
function Prop({ k, pos, rot, sc, seed }: { k: string; pos: V3; rot: number; sc: number; seed: number }) {
  const o = { pos, rot, scale: sc, seed, solid: false };
  switch (k) {
    case 'palm': return <P.Palm {...o} />;
    case 'pine': return <P.Pine {...o} />;
    case 'bush': return <P.Bush {...o} />;
    case 'rock': return <P.Rock {...o} />;
    case 'flowers': return <P.Flowers {...o} />;
    case 'house': return <P.House {...o} w={5} d={4} floors={1 + (seed % 2)} />;
    case 'lamp': return <P.Lamp {...o} />;
    case 'fence': return <P.Fence {...o} length={4} />;
    case 'flag': return <P.Flag {...o} />;
    case 'goal': return <P.Goal {...o} />;
    case 'car': return <P.Car {...o} />;
    case 'statue': return <P.Statue {...o} />;
    case 'stall': return <P.Stall {...o} />;
    case 'crate': return <P.Crate {...o} />;
    case 'barrel': return <P.Barrel {...o} />;
    case 'macaw': return <P.Macaw {...o} flying />;
    default: return <P.Tree {...o} />;
  }
}
/** Cielo, suelo y una ronda de utilería fuera de la cancha. `storm` = tormenta (Lluvia de Peces). */
export function Escenario({ fondo, seed, rx = 15, rz = 11, ground = 80, storm = false, tint }: { fondo: Fondo; seed: number; rx?: number; rz?: number; ground?: number; storm?: boolean; tint?: string }) {
  const e = ESC[fondo] ?? ESC.pueblo;
  const items = useMemo(() => {
    const r = rng(seed ^ 0x51ed), out: { k: string; pos: V3; rot: number; sc: number; seed: number }[] = [];
    const n = e.k.length * 2 + 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + r() * 0.3, kx = 1 + r() * 0.35, z = Math.sin(a) * rz * kx;
      if (z > 7.5) continue;
      out.push({ k: e.k[i % e.k.length], pos: [Math.cos(a) * rx * kx, 0, z], rot: r() * 6.28, sc: (e.k[i % e.k.length] === 'house' ? 0.7 : 0.9) + r() * 0.4, seed: Math.floor(r() * 99) });
    }
    return out;
  }, [fondo, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <art.SkyRig time={storm ? 'tarde' : e.time} weather={storm ? 'lluvia' : 'despejado'} indoor={e.indoor} shadowRadius={30} />
      <Ground size={ground} color={tint ?? e.g} mat={e.m} />
      {e.water && <Block pos={[0, 0.03, -30]} size={[120, 0.06, 34]} mat="water" color={e.water} solid={false} cast={false} />}
      {items.map((o, i) => <Prop key={i} {...o} />)}
    </>
  );
}

// ------------------------------------------------------------------ bots
const NOMBRES = ['Chepe', 'Marta', 'Nahún', 'Lupita', 'Beto', 'Kenia', 'Toño', 'Dilcia'];
const CAMISAS = ['#ee7355', '#6c87d7', '#eacb59', '#57b894', '#b672c9', '#e0884a'];
export interface BotS { name: string; cfg: AvatarConfig; x: number; y: number; z: number; yaw: number; st: AvatarState }
export function makeBots(avatar: AvatarConfig, n: number, seed: number): BotS[] {
  const r = rng(seed ^ 0xb07);
  return Array.from({ length: n }, (_, i) => ({
    name: `🤖 ${NOMBRES[(Math.floor(r() * 8) + i * 3) % 8]}`,
    cfg: { ...avatar, body: i % 2 ? 'm' : 'h', shirtColor: CAMISAS[(i + Math.floor(r() * 3)) % 6], pantsColor: ['#33415c', '#5c4033', '#2f4f4f'][i % 3], hatColor: CAMISAS[(i + 2) % 6] },
    x: 0, y: 0, z: 0, yaw: 0, st: { anim: 'idle', speed: 0 },
  }));
}
export const faceTo = (dx: number, dz: number) => Math.atan2(-dx, -dz);
export function BotView({ b }: { b: BotS }) {
  const g = useRef<THREE.Group>(null);
  useTick(() => { const o = g.current; if (o) { o.position.set(b.x, b.y, b.z); o.rotation.y = b.yaw; } });
  return <group ref={g} position={[b.x, b.y, b.z]}><art.Avatar config={b.cfg} state={b.st} name={b.name} /></group>;
}
/** Bots de ambiente que van de un punto a otro y se detienen un rato (anim al llegar). */
export function useWanderers(bots: BotS[], spots: V3[][], anim: AvatarState['anim'] = 'idle') {
  const s = useRef(bots.map((b, i) => { const p = spots[i % spots.length]; b.x = p[0][0]; b.z = p[0][2]; return { i: 0, wait: 1 + i, p }; })).current;
  useTick(dt => {
    bots.forEach((b, k) => {
      const w = s[k], t = w.p[w.i % w.p.length];
      const dx = t[0] - b.x, dz = t[2] - b.z, d = Math.hypot(dx, dz);
      if (d > 0.1) { const sp = Math.min(d, 2.4 * dt); b.x += dx / d * sp; b.z += dz / d * sp; b.yaw = faceTo(dx, dz); b.st.anim = 'walk'; b.st.speed = 2.4; }
      else { b.st.anim = anim; b.st.speed = 0; w.wait -= dt; if (w.wait <= 0) { w.i++; w.wait = 2 + Math.random() * 3; } }
    });
  });
}
/** Solo para pruebas: `window.__mcTema = { pesca: {...} }` reemplaza el tema de un motor abierto sin catálogo. */
export function conTema(motor: string, p: Partida): Partida { const o = (window as unknown as { __mcTema?: Record<string, Record<string, unknown>> }).__mcTema?.[motor]; return o ? { ...p, tema: o } : p; }
export { Ball };
