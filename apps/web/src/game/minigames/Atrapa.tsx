// MOTOR 'atrapa' — «Atrapalo». Te movés libre con un recipiente sobre la cabeza y atrapás lo que cae.
// Cada cosa avisa con su sombra en el suelo. Lo de `evita` resta y aturde. Rachas, doradas y ráfagas.
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { Label, Spawn, useMgTick, useTick } from '../kit';
import { player } from '../../core/player';
import { phys } from '../../core/phys';
import { useGame } from '../../core/store';
import { audio } from '../../core/audio';
import { finish, partida, rng, setHud, starsFor, type Guia, type Partida } from './api';
import { conTema, BotView, Escenario, Fx, fondoDe, fx, makeBots, faceTo, type BotS } from './atrapa/comun';
import { Forma, Recipiente } from './atrapa/formas';

type Cosa = [string, string, string?];
const CAE: Cosa[] = [['Mango', 'mango', '#f6a623'], ['Naranja', 'naranja', '#ff9800'], ['Fresa', 'fresa', '#e53935'], ['Coco', 'coco', '#6b4a2b']];
const EVITA: Cosa[] = [['Piedra', 'piedra'], ['Rama seca', 'rama'], ['Avispa', 'avispa']];
const FX = { x: 8.6, z: 5.6 }; // media cancha
const DURACION = (dif: number) => Math.round(70 + 20 * dif);
const metas = (dif: number): [number, number, number] => [Math.round((120 + 80 * dif) / 10) * 10, Math.round((300 + 150 * dif) / 10) * 10, Math.round((500 + 250 * dif) / 10) * 10];

export const guia: Guia = {
  goal: 'Atrapá con tu recipiente lo que cae. La sombra en el suelo te dice dónde va a caer. Lo que no sirve te resta y te aturde.',
  keys: [['WASD / flechas', 'moverte debajo de lo que cae'], ['Shift', 'correr']],
  touch: [['Palanca', 'moverte debajo de lo que cae']],
  metas: p => metas(p.dif).map(n => `${n} pts`) as [string, string, string],
};

interface Item { id: number; x: number; z: number; y: number; v: number; kind: 'bueno' | 'oro' | 'malo'; idx: number; spin: number; land: number }
interface Catcher { ign: Set<number>; b: BotS; score: number; tgt: Item | null; sp: number; skill: number; equipo: boolean }

export function Atrapa() {
  const P = useMemo<Partida>(() => conTema('atrapa', partida()), []);
  const avatar = useGame(g => g.profile.avatar);
  const cae: Cosa[] = (Array.isArray(P.tema.cae) && P.tema.cae.length ? P.tema.cae : CAE) as Cosa[];
  const evita: Cosa[] = (Array.isArray(P.tema.evita) ? P.tema.evita : EVITA) as Cosa[];
  const con: string = P.tema.con ?? 'canasta';
  const fondo = fondoDe(P, 'finca');
  const storm = cae.some(c => c[1] === 'pez');
  const meta = useMemo(() => metas(P.dif), [P]), dur = DURACION(P.dif);
  const rnd = useMemo(() => rng(P.seed), [P]);
  const [, draw] = useState(0);
  const cont = useRef<THREE.Group>(null), pop = useRef(0);
  const bots = useMemo(() => {
    const n = P.modo === 'duo' ? 1 : P.modo === 'abierto' ? 3 : 0;
    return makeBots(avatar, n, P.seed).map((b, i): Catcher => {
      const ign = new Set<number>();
      b.x = -6 + i * 4; b.z = -2 + (i % 2) * 3; if (P.modo === 'duo') b.name = '🤖 Compa';
      return { ign, b, score: 0, tgt: null, sp: 3.4 + 1.6 * P.dif + i * 0.2, skill: 0.55 + 0.25 * P.dif + i * 0.05, equipo: P.modo === 'duo' };
    });
  }, [P, avatar]);
  const s = useRef({
    t: dur, score: 0, combo: 0, best: 0, atrapadas: 0, perdidas: 0, golpes: 0, doradas: 0,
    items: [] as Item[], spawn: 1.6, id: 0, ola: 12 + 6 * (1 - P.dif), burst: 0, stun: 0, frase: 14, done: false, elapsed: 0, equipo: 0,
  }).current;

  const mult = () => (s.combo >= 10 ? 3 : s.combo >= 5 ? 2 : 1);
  function suma(n: number, x: number, z: number, color: string, texto: string) {
    s.score = Math.max(0, s.score + n);
    fx.pop(x, 2.6, z, texto, color);
  }
  function crea(x: number, z: number) {
    const hayMalo = evita.length > 0, r = rnd();
    const kind: Item['kind'] = hayMalo && r < 0.12 + 0.16 * P.dif ? 'malo' : r > 0.93 ? 'oro' : 'bueno';
    const lista = kind === 'malo' ? evita : cae;
    s.items.push({ id: s.id++, x, z, y: 10 + rnd() * 1.5, v: 3.8 + 3.2 * P.dif + rnd() * 1.2, kind, idx: Math.floor(rnd() * lista.length), spin: rnd() * 6, land: 0 });
    draw(n => n + 1);
  }
  function atrapa(it: Item, quien: Catcher | null) {
    s.items = s.items.filter(o => o !== it); draw(n => n + 1);
    if (it.kind === 'malo') {
      fx.emit(it.x, 2, it.z, '#c62828', 12, 3);
      if (!quien) {
        audio.sfx('error'); s.score = Math.max(0, s.score - 15); s.combo = 0; s.golpes++; s.stun = 1.3; player.speedMul = 0.3; player.play('fall', 1);
        fx.pop(it.x, 2.6, it.z, '¡Ay! −15', '#ff6b5e');
      }
      return;
    }
    const gold = it.kind === 'oro';
    if (quien) {
      const p = gold ? 30 : 10; quien.score += p; if (quien.equipo) { s.equipo += Math.round(p / 2); s.score += Math.round(p / 2); }
      fx.emit(it.x, 2, it.z, gold ? '#ffd54f' : '#9be37a', 6, 2); quien.b.st.anim = 'celebrate'; setTimeout(() => { quien.b.st.anim = 'idle'; }, 500); return;
    }
    s.combo++; s.best = Math.max(s.best, s.combo); s.atrapadas++; if (gold) s.doradas++;
    const m = mult(), p = (gold ? 30 : 10) * m;
    suma(p, it.x, it.z, gold ? '#ffd54f' : '#ffffff', `+${p}${m > 1 ? ' x' + m : ''}`);
    audio.sfx(gold ? 'coin' : 'pickup'); if (gold) audio.sfx('star');
    fx.emit(it.x, 2, it.z, gold ? '#ffd54f' : (cae[it.idx][2] ?? '#9be37a'), gold ? 18 : 9, gold ? 4 : 2.5);
    pop.current = 0.25;
    if (s.combo > 0 && s.combo % 5 === 0) useGame.getState().toast(`¡Racha de ${s.combo}!`, '🔥');
  }

  const size = useThree(t => t.size), k = Math.min(2.1, Math.max(1, 1.75 / (size.width / Math.max(1, size.height))));
  useEffect(() => {
    phys.limit = { minX: -FX.x, maxX: FX.x, minZ: -FX.z, maxZ: FX.z };
    player.fixedCam = { pos: [0, 10.8 * k, 10.2 * k], target: [0, 0.4, 0.6], fov: 52 };
    player.camYaw = 0;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    w.__mcTest = {
      ...w.__mcTest,
      atrapa: {
        state: () => ({ t: s.t, score: s.score, combo: s.combo, best: s.best, atrapadas: s.atrapadas, perdidas: s.perdidas, golpes: s.golpes, doradas: s.doradas, meta, dur, modo: P.modo, bots: bots.map(c => ({ n: c.b.name, score: c.score })),
          items: s.items.map(i => ({ x: i.x, z: i.z, y: i.y, kind: i.kind })), player: [player.pos[0], player.pos[2]] }),
        ...(location.hash.includes('test') ? { skip: (n: number) => { s.t = Math.max(0, s.t - n); } } : {}),
      },
    };
    return () => { player.fixedCam = null; player.speedMul = 1; if (w.__mcTest) delete w.__mcTest.atrapa; };
  }, [s, bots, P, meta, dur, k]);

  useMgTick(dt => {
    s.t -= dt; s.elapsed += dt; s.spawn -= dt; s.ola -= dt; s.frase -= dt;
    if (s.stun > 0) { s.stun -= dt; if (s.stun <= 0) { player.speedMul = 1; draw(n => n + 1); } }
    // aparición
    if (s.t > 2.5 && s.spawn <= 0) {
      if (s.burst > 0) {
        const k = 6 - s.burst; crea(-FX.x + 1 + (k / 5) * (FX.x * 2 - 2), (rnd() - 0.5) * 6); s.burst--; s.spawn = 0.28;
      } else {
        const cerca = rnd() < 0.45;
        crea(Math.max(-FX.x + 0.5, Math.min(FX.x - 0.5, cerca ? player.pos[0] + (rnd() - 0.5) * 7 : (rnd() * 2 - 1) * (FX.x - 0.5))), Math.max(-FX.z + 0.5, Math.min(FX.z - 0.5, cerca ? player.pos[2] + (rnd() - 0.5) * 6 : (rnd() * 2 - 1) * (FX.z - 0.5))));
        s.spawn = (1.25 - 0.7 * P.dif) * (0.75 + rnd() * 0.5);
      }
    }
    if (s.ola <= 0 && s.t > 8) { s.ola = 16 - 6 * P.dif + rnd() * 4; s.burst = 6; useGame.getState().toast('¡Ráfaga!', '🌪️'); audio.sfx('horn'); }
    if (s.frase <= 0) { s.frase = 18 + rnd() * 8; const f = P.tema.frases; if (Array.isArray(f) && f.length) useGame.getState().toast(String(f[Math.floor(rnd() * f.length)]), '💬'); }
    // bots
    for (const c of bots) {
      if (!c.tgt || !s.items.includes(c.tgt) || c.tgt.y < 1) {
        c.tgt = null;
        let mejor = 1e9;
        for (const it of s.items) {
          if (it.kind === 'malo' || it.y < 3 || c.ign.has(it.id) || bots.some(o => o.tgt === it)) continue;
          const d = Math.hypot(it.x - c.b.x, it.z - c.b.z), t = (it.y - 1.8) / it.v;
          if (d / c.sp < t * 0.9 && d < mejor) { mejor = d; c.tgt = it; }
        }
        if (c.tgt && rnd() > c.skill) { c.ign.add(c.tgt.id); c.tgt = null; } // se distrae con ese
      }
      const tx = c.tgt ? c.tgt.x : c.b.x, tz = c.tgt ? c.tgt.z : c.b.z, dx = tx - c.b.x, dz = tz - c.b.z, d = Math.hypot(dx, dz);
      if (d > 0.15) { const m = Math.min(d, c.sp * dt); c.b.x += dx / d * m; c.b.z += dz / d * m; c.b.yaw = faceTo(dx, dz); c.b.st.anim = 'run'; c.b.st.speed = 6; } else if (c.b.st.anim === 'run') { c.b.st.anim = 'idle'; c.b.st.speed = 0; }
    }
    // caída y captura
    const px = player.pos[0], pz = player.pos[2];
    for (const it of [...s.items]) {
      if (it.land > 0) { it.land -= dt; if (it.land <= 0) { s.items = s.items.filter(o => o !== it); draw(n => n + 1); } continue; }
      it.y -= it.v * dt; it.spin += dt * 3;
      if (it.y <= 2.25 && it.y > 1.2) {
        if (Math.hypot(it.x - px, it.z - pz) < 0.95) { atrapa(it, null); continue; }
        const b = bots.find(c => Math.hypot(it.x - c.b.x, it.z - c.b.z) < 0.9 && c.tgt === it);
        if (b) { b.tgt = null; atrapa(it, b); continue; }
      }
      if (it.y <= 0.2) {
        it.y = 0.2; it.land = 0.45;
        if (it.kind === 'malo') { fx.emit(it.x, 0.1, it.z, '#8d6e63', 6, 2); } else {
          s.perdidas++; if (s.combo >= 3) fx.pop(it.x, 0.8, it.z, 'racha perdida', '#ffb74d'); s.combo = 0; audio.sfx('miss'); fx.emit(it.x, 0.1, it.z, '#caa472', 5, 2);
        }
      }
    }
    // recipiente sobre la cabeza
    if (cont.current) { pop.current = Math.max(0, pop.current - dt); const k = 1 + pop.current * 1.2; cont.current.position.set(px, 1.98 + pop.current * 0.4, pz); cont.current.scale.setScalar(k); cont.current.rotation.z = Math.sin(s.elapsed * 6) * 0.04 * Math.hypot(player.body.vel[0], player.body.vel[2]) / 5; }
    const sig = meta.find(m => s.score < m) ?? meta[2], m = mult();
    setHud({
      timer: Math.ceil(Math.max(0, s.t)), score: `${s.score} pts`, objective: s.score >= meta[2] ? '¡Tres estrellas!' : `Meta: ${sig} pts`,
      lines: [`Racha ${s.combo}${m > 1 ? ` · x${m}` : ''} · mejor ${s.best}`, ...bots.map(c => `${c.b.name}: ${c.score}`)],
    });
    if (s.t <= 0 && !s.done) {
      s.done = true;
      finish({ won: s.score >= meta[0], stars: starsFor(s.score, meta[0], meta[1], meta[2]), score: s.score, label: `${s.score} pts`, stats: { atrapadas: s.atrapadas, mejorRacha: s.best, doradas: s.doradas, golpes: s.golpes } });
    }
  });

  return (
    <>
      <Escenario fondo={fondo} seed={P.seed} rx={FX.x + 5.4} rz={FX.z + 4.4} storm={storm} />
      <Spawn pos={[0, 0, 1.5]} />
      <Cancha />
      <Fx />
      {bots.map((c, i) => <BotView key={i} b={c.b} />)}
      <group ref={cont} position={[0, 1.98, 0]}><Recipiente con={con} /></group>
      {s.stun > 0 && <Label pos={[player.pos[0], 2.9, player.pos[2]]} text="💫 aturdido" h={0.45} />}
      {s.items.map(it => <Caida key={it.id} it={it} cosa={(it.kind === 'malo' ? evita : cae)[it.idx]} />)}
    </>
  );
}

// marco de la cancha: cuatro tablas bajas y una franja clara para que se lea el área de juego
function Cancha() {
  return (
    <group>
      {[[0, -FX.z - 0.6, FX.x * 2 + 1.2, 0.4], [0, FX.z + 0.6, FX.x * 2 + 1.2, 0.4]].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.03, z]} rotation-x={-Math.PI / 2}><planeGeometry args={[w, d]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.28} /></mesh>
      ))}
      {[-FX.x - 0.6, FX.x + 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.03, 0]} rotation-x={-Math.PI / 2}><planeGeometry args={[0.4, FX.z * 2 + 1.6]} /><meshBasicMaterial color="#ffffff" transparent opacity={0.28} /></mesh>
      ))}
    </group>
  );
}

const sombraGeo = new THREE.CircleGeometry(1, 20), sombraMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.38, depthWrite: false }),
  sombraMalo = new THREE.MeshBasicMaterial({ color: '#b71c1c', transparent: true, opacity: 0.5, depthWrite: false }), sombraOro = new THREE.MeshBasicMaterial({ color: '#ffb300', transparent: true, opacity: 0.5, depthWrite: false });
function Caida({ it, cosa }: { it: Item; cosa: Cosa }) {
  const g = useRef<THREE.Group>(null), sh = useRef<THREE.Mesh>(null), inner = useRef<THREE.Group>(null);
  const esc = it.kind === 'oro' ? 1.9 : 1.55;
  useTick(() => {
    if (g.current) { g.current.position.set(it.x, it.y + 0.3, it.z); g.current.rotation.y = it.spin; g.current.rotation.z = Math.sin(it.spin * 1.3) * 0.25; g.current.scale.set(esc, it.land > 0 ? esc * 0.4 : esc, esc); }
    if (sh.current) { const k = it.land > 0 ? 0.5 : 0.35 + 0.65 * (1 - Math.min(1, it.y / 10)); sh.current.scale.set(k, k, 1); }
    if (inner.current && it.kind === 'oro') inner.current.rotation.x = it.spin * 0.5;
  });
  return (
    <>
      <mesh ref={sh} geometry={sombraGeo} material={it.kind === 'malo' ? sombraMalo : it.kind === 'oro' ? sombraOro : sombraMat} position={[it.x, 0.05, it.z]} rotation-x={-Math.PI / 2} />
      <group ref={g} position={[it.x, it.y + 0.3, it.z]}>
        <group ref={inner}>
          {it.kind === 'oro'
            ? <><Forma f={cosa[1]} c="#ffd54f" nombre={cosa[0]} /><mesh><sphereGeometry args={[0.38, 10, 8]} /><meshBasicMaterial color="#ffe082" transparent opacity={0.28} depthWrite={false} /></mesh></>
            : <Forma f={cosa[1]} c={cosa[2]} nombre={cosa[0]} />}
        </group>
      </group>
    </>
  );
}
