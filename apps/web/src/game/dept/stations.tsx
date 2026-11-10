// Los lugares del departamento: una estación por cada lugar del catálogo, en abanico al sur de la zona central.
// Cada estación trae su decorado, puestos de juego (se entra caminando), puestos de comida con su doña y su
// aguacatero, y rótulos de cómo se dice aquí. Todo sale de catDe(id); sin catálogo no dibuja nada.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { art, Ground, Interactable, Label, Plate, Spawn, useTick } from '../kit';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import { BOT_NAMES, catDe, SHOP } from '../../core/data';
import type { AvatarState, Comida, Department, Juego, Palabra, V3 } from '../../core/types';
import { bl, Build, bx, cy, mergePieces, place, PI, rotXZ, type Pc, type XZ } from './lib';
import { BIO, type ZoneSpec } from './zone';
import { clampTo, layoutOf, type Layout, type StationLay } from './ext';
import { decorFor } from './decor';

const AW = ['#e63946', '#2a9d8f', '#f4a261', '#7b2cbf'];
const W = '#7a5230', DW = '#5a3d26';

interface Booth { j: Juego; pos: V3; rot: number; use: V3 }
interface Food { c: Comida; pos: V3; rot: number; use: V3; dona: V3; dog: V3; olla: V3; idx: number }
interface Word { p: Palabra; pos: V3; rot: number; w: number }
interface StationPlan { s: StationLay; entry: V3; sign: V3; booths: Booth[]; foods: Food[]; words: Word[] }

// --- la doña: gordita, con delantal, detrás del comal (piezas locales, mirando a +Z)
const SKIN = ['#c68b59', '#a8724a', '#d9a066'], BLUSA = ['#e76f51', '#f4a3b4', '#8ecae6', '#ffd23f'], FALDA = ['#3a6ea5', '#2a9d8f', '#6d597a'];
function dona(i: number): Pc[] {
  const sk = SKIN[i % 3], bl_ = BLUSA[i % 4], fa = FALDA[i % 3], HAIR = '#2b1d14';
  return [
    cy(0, 0.45, 0, 0.6, 0.9, 'cloth', fa, { rt: 0.72, n: 12, solid: false }), bl(0, 1.25, 0, 0.6, 'cloth', bl_, { s: [1.18, 1, 1.02], n: 12 }),
    bx(0, 1.0, 0.62, 0.78, 0.95, 0.05, 'cloth', '#fbfbf5', { solid: false }), bx(0, 1.62, 0.56, 0.5, 0.1, 0.05, 'cloth', '#fbfbf5', { solid: false }), bx(0, 0.7, 0.66, 0.4, 0.22, 0.05, 'cloth', '#e8c3c3', { solid: false }),
    bl(0, 2.05, 0.02, 0.29, 'plastic', sk, { n: 10 }), bl(0, 2.15, -0.04, 0.3, 'cloth', HAIR, { s: [1.02, 0.72, 1], n: 10 }), bl(0, 2.2, -0.3, 0.15, 'cloth', HAIR, { n: 8 }),
    bl(-0.1, 2.08, 0.27, 0.035, 'plastic', '#1d1d1f', { n: 5 }), bl(0.1, 2.08, 0.27, 0.035, 'plastic', '#1d1d1f', { n: 5 }), bl(0, 1.96, 0.29, 0.06, 'plastic', '#d06a5a', { s: [1.4, 0.5, 0.6], n: 6 }),
    bl(-0.2, 1.98, 0.24, 0.06, 'plastic', '#e88a7a', { n: 5 }), bl(0.2, 1.98, 0.24, 0.06, 'plastic', '#e88a7a', { n: 5 }),
    cy(-0.68, 1.22, 0.18, 0.12, 0.62, 'plastic', sk, { e: [0.5, 0, 0.35], n: 6, solid: false }),
  ];
}
// --- el aguacatero: perro flaco, costillas marcadas (piezas locales, mirando a +Z; la cola va aparte)
const DOG: Pc[] = [
  bl(0, 0.5, 0, 0.3, 'cloth', '#c9a26b', { s: [0.62, 0.6, 1.45], n: 8 }), bl(0, 0.78, 0.48, 0.17, 'cloth', '#c9a26b', { s: [0.9, 1, 1.15], n: 8 }), bl(0, 0.74, 0.66, 0.09, 'cloth', '#c9a26b', { s: [0.9, 0.8, 1.3], n: 6 }),
  bl(0, 0.76, 0.77, 0.04, 'plastic', '#2b1d14', { n: 5 }), bx(-0.11, 0.92, 0.44, 0.06, 0.16, 0.1, 'cloth', '#7a5230', { e: [0, 0, 0.4], solid: false }), bx(0.11, 0.92, 0.44, 0.06, 0.16, 0.1, 'cloth', '#7a5230', { e: [0, 0, -0.4], solid: false }),
  ...[-0.1, 0, 0.1].map(z => bx(0, 0.5, z, 0.39, 0.03, 0.03, 'cloth', '#7a5230', { solid: false })),
  ...[[-0.09, 0.3], [0.09, 0.3], [-0.09, -0.32], [0.09, -0.32]].map(([x, z]) => cy(x, 0.2, z, 0.04, 0.42, 'cloth', '#c9a26b', { n: 5, solid: false })),
];

function plan(spec: ZoneSpec, d: Department) {
  const cat = catDe(d.id), lay = layoutOf(spec, cat.lugares), ids = new Set(cat.lugares.map(l => l.id)), first = cat.lugares[0]?.id;
  const where = (l: string) => (ids.has(l) ? l : first);
  let food = 0;
  const plans: StationPlan[] = lay.st.map((s, si) => {
    const L = (lx: number, lz: number, y = 0): V3 => { const [x, z] = rotXZ(lx, lz, s.rot); return [s.pos[0] + x, y, s.pos[1] + z]; };
    const js = cat.juegos.filter(j => where(j.lugar) === s.lugar.id), cs = cat.comidas.filter(c => where(c.lugar) === s.lugar.id);
    const booths = js.map((j, i) => { const row = Math.floor(i / 3), inRow = Math.min(3, js.length - row * 3), k = i % 3, lx = (k - (inRow - 1) / 2) * 4.4, lz = 1.8 + row * 4.6; return { j, pos: L(lx, lz), rot: s.rot, use: L(lx, lz + 1.3) }; });
    const fs: [number, number, number][] = [[10.5, 3.5, -0.9], [-10.5, 3.5, 0.9], [10.5, -3.5, -0.5], [-10.5, -3.5, 0.5]];
    const foods = cs.slice(0, 4).map((c, i) => { const [lx, lz, r] = fs[i], rot = s.rot + r, at = (a: number, b: number, y = 0): V3 => { const [x, z] = rotXZ(a, b, rot); return [s.pos[0] + rotXZ(lx, lz, s.rot)[0] + x, y, s.pos[1] + rotXZ(lx, lz, s.rot)[1] + z]; };
      return { c, pos: L(lx, lz), rot, use: at(0, 1.9), dona: at(0, -0.4), dog: at(1.9, 1.2), olla: at(0.6, 0.6, 1.0), idx: food++ }; });
    const words = cat.palabras.filter((_, i) => i % lay.st.length === si).slice(0, 2).map((p, i) => { const lx = i ? 6.8 : -6.8, w = Math.max(3.2, Math.max(13, `${p.dice} = ${p.es}`.length) * 0.19); return { p, pos: L(lx, 12.5), rot: s.rot + (i ? -0.25 : 0.25), w }; });
    return { s, entry: L(0, 10), sign: L(0, 13.2), booths, foods, words };
  });
  return { cat, lay, plans };
}

function piecesOf(lay: Layout, plans: StationPlan[], d: Department): Pc[] {
  const out: Pc[] = [], [cx, cz] = lay.c, put = (p: Pc[], x: number, z: number, r: number) => out.push(...place(p, x, 0, z, r));
  // plaza, poste y caminos
  out.push(cy(cx, 0.03, cz, 7.5, 0.06, 'plastic', '#d9c7a0', { n: 28, solid: false }), cy(cx, 2.6, cz, 0.18, 5.2, 'wood', DW, { n: 8 }), bl(cx, 5.3, cz, 0.3, 'gold', '#e8c547'));
  plans.forEach((p, i) => {
    const [ex, , ez] = p.entry, len = Math.hypot(ex - cx, ez - cz), a = Math.atan2(ex - cx, ez - cz);
    out.push(bx((cx + ex) / 2, 0.025, (cz + ez) / 2, 2.6, 0.05, len, 'dirt', '#b08a5a', { r: a, solid: false }));
    // flecha del poste
    put([bx(0, 0, 1.75, 0.1, 0.55, 2.9, 'wood', AW[i % 4], { solid: false }), bx(0, 0, 3.3, 0.1, 0.42, 0.42, 'wood', AW[i % 4], { e: [PI / 4, 0, 0], solid: false })].map(q => ({ ...q, p: [q.p[0], 2.3 + (i % 3) * 0.75, q.p[2]] })), cx, cz, p.s.ang);
    // piso de la estación, decorado y rótulo de entrada
    out.push(cy(p.s.pos[0], 0.035, p.s.pos[1], 13.5, 0.05, 'plastic', '#e3d6b4', { n: 30, solid: false }));
    const [dx, dz] = rotXZ(0, -7.5, p.s.rot); put(decorFor(p.s.lugar.kind, i * 97 + 13), p.s.pos[0] + dx, p.s.pos[1] + dz, p.s.rot);
    put([bx(-2, 1.75, 0, 0.26, 3.5, 0.26, 'wood', DW), bx(2, 1.75, 0, 0.26, 3.5, 0.26, 'wood', DW), bx(0, 3.4, 0, 4.6, 1.0, 0.14, 'wood', W, { solid: false })], p.sign[0], p.sign[2], p.s.rot);
    for (const b of p.booths) {
      const c = AW[(b.j.id.length + i) % 4];
      put([bx(-1.5, 1.9, 0, 0.26, 3.8, 0.26, 'plastic', c), bx(1.5, 1.9, 0, 0.26, 3.8, 0.26, 'plastic', c), bx(0, 3.95, 0, 3.6, 1.0, 0.36, 'plastic', c, { solid: false }), bx(0, 0.5, 0.25, 2.2, 1, 0.7, 'wood', W), bx(0, 1.04, 0.25, 2.4, 0.08, 0.9, 'plastic', '#ffd23f', { solid: false }), cy(0, 0.03, 0.8, 1.5, 0.05, 'neon', '#ffd23f', { n: 20, solid: false })], b.pos[0], b.pos[2], b.rot);
    }
    for (const f of p.foods) {
      const c = AW[f.idx % 4];
      put([bx(0, 0.5, 0.55, 2.8, 1, 0.8, 'wood', W), bx(-1.35, 1.4, -0.9, 0.12, 2.8, 0.12, 'wood', DW), bx(1.35, 1.4, -0.9, 0.12, 2.8, 0.12, 'wood', DW), bx(-1.35, 1.2, 0.95, 0.12, 2.4, 0.12, 'wood', DW, { solid: false }), bx(1.35, 1.2, 0.95, 0.12, 2.4, 0.12, 'wood', DW, { solid: false }),
        bx(0, 2.6, 0, 3.2, 0.1, 2.4, 'cloth', c, { e: [0.15, 0, 0], solid: false }), bx(0, 2.3, 1.15, 3.2, 0.35, 0.06, 'cloth', '#fbfbf5', { solid: false }),
        cy(-0.6, 1.04, 0.55, 0.45, 0.05, 'metal', '#2b2b2b', { n: 16, solid: false }), cy(-0.6, 0.97, 0.55, 0.32, 0.12, 'stone', '#8a6f4d', { n: 10, solid: false }),
        cy(0.6, 1.22, 0.6, 0.3, 0.42, 'metal', '#3f3f46', { rt: 1.1, n: 12, solid: false }), bl(-0.75, 1.1, 0.5, 0.13, 'plastic', '#f1dcb4', { s: [1, 0.25, 1], n: 8 }), bl(-0.45, 1.1, 0.62, 0.13, 'plastic', '#f1dcb4', { s: [1, 0.25, 1], n: 8 })], f.pos[0], f.pos[2], f.rot);
      put(dona(f.idx), f.dona[0], f.dona[2], f.rot);
    }
    for (const w of p.words) put([bx(-w.w / 2 + 0.3, 1.1, -0.05, 0.14, 2.2, 0.14, 'wood', DW), bx(w.w / 2 - 0.3, 1.1, -0.05, 0.14, 2.2, 0.14, 'wood', DW), bx(0, 2.0, -0.1, w.w, 1.2, 0.1, 'wood', '#f2e8cf', { solid: false })], w.pos[0], w.pos[2], w.rot);
  });
  return out;
}

const inR = (r: { minX: number; maxX: number; minZ: number; maxZ: number }, x: number, z: number) => x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ;

/** Las estaciones de los lugares, sus puestos, su gente y los límites ampliados. */
export function Lugares({ d, spec }: { d: Department; spec: ZoneSpec }) {
  const { cat, lay, plans } = useMemo(() => plan(spec, d), [spec, d]);
  const pcs = useMemo(() => piecesOf(lay, plans, d), [lay, plans, d]);
  const has = plans.length > 0, [cx, cz] = lay.c;
  useLayoutEffect(() => {
    if (!has) return;
    const rs = [lay.old, lay.neck, lay.main];
    phys.limit = { minX: Math.min(...rs.map(r => r.minX)), maxX: Math.max(...rs.map(r => r.maxX)), minZ: Math.min(...rs.map(r => r.minZ)), maxZ: Math.max(...rs.map(r => r.maxZ)) };
    if (location.hash.includes('test')) ((window as any).__mcTest ??= {}).lugares = { c: lay.c, st: plans.map(p => ({ id: p.s.lugar.id, entry: p.entry, sign: p.sign, booths: p.booths.map(b => ({ id: b.j.id, use: b.use })), foods: p.foods.map(f => ({ name: f.c.name, use: f.use, pos: f.pos })) })) };
  }, [lay, plans, has]);
  useTick(() => {
    if (!has) return; const p = player.pos;
    if (inR(lay.old, p[0], p[2]) || inR(lay.neck, p[0], p[2]) || inR(lay.main, p[0], p[2])) return;
    const [x, z] = clampTo([lay.old, lay.neck, lay.main], p[0], p[2]); p[0] = x; p[2] = z; player.body.vel[0] = 0; player.body.vel[2] = 0;
  });
  if (!has) return null;
  const g = useGame.getState, bio = BIO[d.biome];
  return <>
    <Spawn pos={[cx, 0, cz - 5.5]} yaw={PI} />
    <Ground mat="grass" color={bio.grass} y={-0.08} size={lay.ground.size} pos={lay.ground.pos} />
    <Build pieces={pcs} />
    <Label pos={[cx, 6.1, cz]} text={`🧭 Lugares de ${d.name}`} h={0.75} />
    {plans.map((p, i) => {
      const n = p.booths.length, [ax, az] = rotXZ(0, 1.75, p.s.ang), y = 2.3 + (i % 3) * 0.75, side = p.s.ang >= 0 ? 1 : -1, [ox, oz] = rotXZ(0.07 * side, 0, p.s.ang);
      const [lx, lz] = rotXZ(0, -7.5, p.s.rot);
      return <group key={p.s.lugar.id}>
        <Plate pos={[cx + ax + ox, y, cz + az + oz]} rot={p.s.ang + (side > 0 ? PI / 2 : -PI / 2)} h={0.42} text={`${p.s.lugar.name} · ${n} 🎮`} bg={AW[i % 4]} />
        <Label pos={[p.s.pos[0] + lx, 12.5, p.s.pos[1] + lz]} text={`📍 ${p.s.lugar.name}`} h={1.9} />
        <Plate pos={[p.sign[0] + Math.sin(p.s.rot) * 0.09, 3.4, p.sign[2] + Math.cos(p.s.rot) * 0.09]} rot={p.s.rot} h={0.62} text={p.s.lugar.name} bg="#0d47a1" />
        <Interactable pos={[p.sign[0], 0, p.sign[2]]} radius={2.2} label={`Conocer: ${p.s.lugar.name}`} icon="📍" marker={false} onUse={() => g().showDialog({ title: p.s.lugar.name, text: p.s.lugar.nota, icon: '📍' })} />
        {p.booths.map(b => <BoothSigns key={b.j.id} b={b} />)}
        {p.foods.map(f => <group key={f.c.name}>
          <Plate pos={[f.pos[0] + Math.sin(f.rot) * 1.2, 2.3, f.pos[2] + Math.cos(f.rot) * 1.2]} rot={f.rot} h={0.4} text={`🍲 ${f.c.name}`} bg="#7a2e12" />
          <Interactable pos={f.use} radius={1.9} label={`Probar: ${f.c.name}`} icon="🍲" marker={false} onUse={() => g().showDialog({ title: f.c.name, text: f.c.nota, icon: '🍲' })} />
        </group>)}
        {p.words.map(w => <group key={w.p.dice}>
          <Plate pos={[w.pos[0] + Math.sin(w.rot) * 0.0, 2.3, w.pos[2]]} rot={w.rot} h={0.32} text="Aquí se dice:" bg="#f2e8cf" fg="#7a2e12" />
          <Plate pos={[w.pos[0], 1.78, w.pos[2]]} rot={w.rot} h={0.36} text={`${w.p.dice} = ${w.p.es}`} bg="#f2e8cf" fg="#1d1d1f" />
        </group>)}
      </group>;
    })}
    <Cocineras foods={plans.flatMap(p => p.foods)} />
    <Bots lay={lay} plans={plans} n={Math.min(4, Math.max(2, Math.round(cat.juegos.length / 4)))} />
  </>;
}

function BoothSigns({ b }: { b: Booth }) {
  const pr = useGame(s => s.profile.juegos[b.j.id]), et = pr?.etapa ?? 0, stars = (pr?.stars ?? []).reduce((a, x) => a + (x ?? 0), 0);
  const f = (dz: number, y: number): V3 => [b.pos[0] + Math.sin(b.rot) * dz, y, b.pos[2] + Math.cos(b.rot) * dz];
  const done = et >= b.j.etapas;
  return <>
    <Label pos={f(0, 5.35)} text={b.j.icon} h={1.5} bg="rgba(0,0,0,0)" />
    <Plate pos={f(0.2, 3.95)} rot={b.rot} h={0.5} text={b.j.name} bg="#1d1d1f" />
    <Plate pos={f(0.2, 3.38)} rot={b.rot} h={0.36} text={`${done ? '🏆' : 'Etapa'} ${Math.min(et, b.j.etapas)}/${b.j.etapas}  ⭐ ${stars}`} bg={done ? '#2a9d8f' : '#0d47a1'} />
    <Interactable pos={b.use} radius={1.8} label={`Jugar: ${b.j.name}`} icon={b.j.icon} marker={false} onUse={() => useGame.getState().startJuego(b.j.id)} />
  </>;
}

// --- brazos de las doñas, vapor de la olla y aguacateros: todo instanciado (pocas llamadas de dibujo)
const ARM = (() => { const g = new THREE.CylinderGeometry(0.1, 0.12, 0.62, 6); g.translate(0, -0.31, 0); return g; })();
const SPOON = (() => { const g = new THREE.BoxGeometry(0.05, 0.7, 0.05); g.translate(0, -0.85, 0); return g; })();
const DOGG = mergePieces(DOG);
const TAIL = (() => { const g = new THREE.CylinderGeometry(0.02, 0.04, 0.4, 5); g.translate(0, 0.2, 0); return g; })();
const PUFF = new THREE.SphereGeometry(0.16, 6, 5);
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1), SV = new THREE.Vector3();

function Cocineras({ foods }: { foods: Food[] }) {
  const arm = useRef<THREE.InstancedMesh>(null), spoon = useRef<THREE.InstancedMesh>(null), tail = useRef<THREE.InstancedMesh>(null), puff = useRef<THREE.InstancedMesh>(null);
  const dogs = useRef<(THREE.InstancedMesh | null)[]>([]), n = foods.length;
  const puffMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false }), []);
  useTick((_, t) => {
    foods.forEach((f, i) => {
      // brazo: menea la olla en círculos
      const [sx, sz] = rotXZ(0.66, 0.2, f.rot); V.set(f.dona[0] + sx, 1.5, f.dona[2] + sz);
      E.set(-1.05 + Math.sin(t * 4 + i) * 0.18, f.rot - 0.35 + Math.cos(t * 4 + i) * 0.25, 0, 'YXZ'); Q.setFromEuler(E); M4.compose(V, Q, S1);
      arm.current?.setMatrixAt(i, M4); spoon.current?.setMatrixAt(i, M4);
      // perro: echado moviendo la cola, o rondando el puesto
      const lying = i % 2 === 0, a = t * 0.45 + i * 2;
      let dx = f.dog[0], dz = f.dog[2], dy = -0.27, yaw = f.rot - 2.2;
      if (!lying) { const r = 2.6, [ux, uz] = rotXZ(0, 2.4, f.rot); dx = f.pos[0] + ux + Math.cos(a) * r; dz = f.pos[2] + uz + Math.sin(a) * r * 0.6; dy = Math.abs(Math.sin(t * 7 + i)) * 0.04; yaw = Math.atan2(-Math.sin(a) * r, Math.cos(a) * r * 0.6); }
      E.set(0, yaw, 0, 'YXZ'); Q.setFromEuler(E); V.set(dx, dy, dz); M4.compose(V, Q, S1);
      for (const m of dogs.current) m?.setMatrixAt(i, M4);
      const [tx, tz] = rotXZ(0, -0.42, yaw); V.set(dx + tx, dy + 0.58, dz + tz); E.set(-0.9, yaw + Math.sin(t * (lying ? 9 : 14) + i) * 0.6, 0, 'YXZ'); Q.setFromEuler(E); M4.compose(V, Q, S1); tail.current?.setMatrixAt(i, M4);
      // vapor
      for (let k = 0; k < 3; k++) { const ph = (t * 0.5 + k / 3 + i * 0.13) % 1; V.set(f.olla[0] + Math.sin(ph * 9 + k) * 0.12, f.olla[1] + 0.5 + ph * 1.4, f.olla[2]); SV.setScalar(0.5 + ph * 1.4); M4.compose(V, Q.identity(), SV); puff.current?.setMatrixAt(i * 3 + k, M4); }
    });
    for (const m of [arm.current, spoon.current, tail.current, puff.current, ...dogs.current]) if (m) m.instanceMatrix.needsUpdate = true;
  });
  if (!n) return null;
  return <>
    <instancedMesh ref={arm} args={[ARM, art.material('plastic', '#c68b59'), n]} frustumCulled={false} castShadow />
    <instancedMesh ref={spoon} args={[SPOON, art.material('wood', '#7a5230'), n]} frustumCulled={false} />
    <instancedMesh ref={tail} args={[TAIL, art.material('cloth', '#c9a26b'), n]} frustumCulled={false} />
    <instancedMesh ref={puff} args={[PUFF, puffMat, n * 3]} frustumCulled={false} />
    {DOGG.map((g, k) => <instancedMesh key={g.key} ref={m => { dogs.current[k] = m; }} args={[g.geo, art.material(g.m, g.c), n]} frustumCulled={false} castShadow />)}
  </>;
}

// --- bots que pasean entre la plaza y las estaciones
function Bots({ lay, plans, n }: { lay: Layout; plans: StationPlan[]; n: number }) {
  const bots = useMemo(() => Array.from({ length: n }, (_, i) => {
    const name = BOT_NAMES[(i * 5 + plans.length) % BOT_NAMES.length], look = SHOP.defaultAvatar;
    return { name, cfg: { ...look, shirtColor: AW[i % 4], skin: SKIN[i % 3] } as typeof look, st: { anim: 'walk', speed: 1 } as AvatarState, pos: [lay.c[0] + i * 2, 0, lay.c[1] + 2] as V3, tgt: 0, leg: 0, wait: i * 1.5, seed: i * 3 + 1 };
  }), [lay, plans, n]);
  const refs = useRef<(THREE.Group | null)[]>([]);
  useTick(dt => {
    bots.forEach((b, i) => {
      const g = refs.current[i]; if (!g) return;
      if (b.wait > 0) { b.wait -= dt; b.st.anim = 'idle'; b.st.speed = 0; return; }
      // ruta: plaza → entrada de una estación → plaza → otra estación…
      const st = plans[b.tgt % plans.length], to: XZ = b.leg === 0 ? [st.entry[0], st.entry[2]] : [lay.c[0] + (i - 1) * 1.6, lay.c[1] + 1.5];
      const dx = to[0] - b.pos[0], dz = to[1] - b.pos[2], dd = Math.hypot(dx, dz), sp = 2.4;
      if (dd < 0.3) { b.leg = 1 - b.leg; if (b.leg === 0) { b.seed = (b.seed * 7 + 3) % 97; b.tgt = b.seed % plans.length; } b.wait = b.leg === 1 ? 4 : 1.5; return; }
      b.pos[0] += (dx / dd) * sp * dt; b.pos[2] += (dz / dd) * sp * dt; b.st.anim = 'walk'; b.st.speed = sp;
      g.position.set(b.pos[0], 0, b.pos[2]); g.rotation.y = Math.atan2(dx, dz);
    });
  });
  return <>{bots.map((b, i) => <group key={i} ref={r => { refs.current[i] = r; }} position={b.pos}><art.Avatar config={b.cfg} state={b.st} name={`🤖 ${b.name}`} /></group>)}</>;
}
