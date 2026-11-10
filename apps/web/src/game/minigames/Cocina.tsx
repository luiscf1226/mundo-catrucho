// MOTOR 'cocina' — «La cocina». Un puesto de comida: ingredientes en recipientes, clientes con pedido (una secuencia de pasos).
// Vas a cada recipiente EN ORDEN (E), ves el plato armarse capa por capa y lo llevás al mostrador.
import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { art, Ball, Block, Cyl, Interactable, Label, P, Spawn, useMgTick, useTick } from '../kit';
import { player } from '../../core/player';
import { phys } from '../../core/phys';
import { useGame } from '../../core/store';
import { audio } from '../../core/audio';
import type { AvatarState, V3 } from '../../core/types';
import { finish, partida, rng, setHud, starsFor, type Guia, type Partida } from './api';
import { conTema, BotView, Escenario, Fx, fondoDe, fx, makeBots, faceTo, useWanderers } from './atrapa/comun';
import { Dona, nuevoPerro, Perro } from './cocina/personajes';

type Par = [string, string];
const PASOS: Par[] = [['Tortilla', '#f1dcb4'], ['Frijoles', '#5a2d1a'], ['Queso', '#f5f0e0']];
const EXTRAS: Par[] = [['Aguacate', '#6aa84f']], NONE: Par[] = [];
const DURACION = (dif: number) => Math.round(80 + 20 * dif);
const metas = (dif: number): [number, number, number] => [Math.round((150 + 50 * dif) / 10) * 10, Math.round((350 + 150 * dif) / 10) * 10, Math.round((600 + 250 * dif) / 10) * 10];
const FRASES = ['¡Dele, mijo!', 'Ya casi, hijo', '¡Qué calor, Dios mío!', 'Apurate, que hay fila', '¡El comal no perdona!'];
const SLOTX = [-4.6, 0, 4.6];
const LIM = { minX: -7.4, maxX: 7.4, minZ: -3.4, maxZ: 4.3 };

export const guia: Guia = {
  goal: 'Armá cada pedido en orden: andá a cada recipiente y apretá E. Mirá el plato formarse y llevalo al mostrador antes de que el cliente se canse.',
  keys: [['WASD / flechas', 'moverte por el puesto'], ['E', 'agregar ingrediente / entregar'], ['Shift', 'correr']],
  touch: [['Palanca', 'moverte'], ['Botón E', 'agregar ingrediente / entregar']],
  metas: p => metas(p.dif).map(n => `${n} pts`) as [string, string, string],
};

interface Paso { k: string; n: string; c: string; extra: boolean }
interface Cliente { id: number; slot: number; seq: Paso[]; nombre: string; patience: number; max: number; stage: 'entra' | 'espera' | 'sale'; x: number; st: AvatarState; shirt: string; happy: boolean }
const CAMISAS = ['#ee7355', '#6c87d7', '#eacb59', '#57b894', '#b672c9'];

// ------------------------------------------------------------ el plato (se arma capa por capa)
const baseDe = (sirve: string) => sirve === 'calle' ? 0.8 : sirve === 'vaso' ? 1.5 : sirve === 'olla' ? 1.1 : sirve === 'bolsa' ? 1.2 : 1.55;
function Base({ sirve }: { sirve: string }) {
  switch (sirve) {
    case 'tortilla': return <><Cyl pos={[0, 0.03, 0]} r={0.62} h={0.06} color="#ecd29a" mat="cloth" solid={false} /><Cyl pos={[0, -0.01, 0]} r={0.7} h={0.02} color="#f5f5f5" solid={false} /></>;
    case 'hoja': return <Block pos={[0, 0.03, 0]} size={[1.35, 0.05, 0.95]} color="#4caf50" mat="leaf" solid={false} />;
    case 'bolsa': return <><Block pos={[0, 0.4, 0]} size={[0.72, 0.8, 0.4]} color="#c8a165" mat="cloth" solid={false} /><Block pos={[0, 0.82, 0]} size={[0.74, 0.05, 0.42]} color="#b08850" mat="cloth" solid={false} /></>;
    case 'olla': return <><Cyl pos={[0, 0.36, 0]} r={0.55} rTop={0.62} h={0.72} color="#5d4037" mat="metal" solid={false} /><Cyl pos={[0.72, 0.5, 0]} r={0.05} h={0.3} color="#37474f" solid={false} /><Cyl pos={[-0.72, 0.5, 0]} r={0.05} h={0.3} color="#37474f" solid={false} /></>;
    case 'vaso': return <Cyl pos={[0, 0.4, 0]} r={0.28} rTop={0.35} h={0.8} color="#e0f2f1" mat="glass" solid={false} />;
    case 'calle': return <Block pos={[0, 0.025, 0]} size={[3.1, 0.05, 2.1]} color="#6e6e73" mat="asphalt" solid={false} />;
    default: return <><Cyl pos={[0, 0.03, 0]} r={0.62} h={0.06} color="#f7f7f7" solid={false} /><Cyl pos={[0, 0.06, 0]} r={0.7} rTop={0.7} h={0.02} color="#e6e6e6" solid={false} /></>;
  }
}
function Capa({ sirve, i, c, extra, seed }: { sirve: string; i: number; c: string; extra: boolean; seed: number }) {
  const g = useRef<THREE.Group>(null), age = useRef(0), r = useMemo(() => rng(seed + i * 77), [seed, i]);
  useTick(dt => { age.current = Math.min(1, age.current + dt * 4.5); const k = age.current, e = 1 - (1 - k) ** 3; if (g.current) { g.current.scale.setScalar(0.4 + 0.6 * e); g.current.position.y = (1 - e) * 0.7; } });
  const bits = useMemo(() => Array.from({ length: extra ? 5 : 7 }, () => [r() * 6.28, r()] as [number, number]), [r, extra]);
  const sh = 1 - i * 0.035;
  let y = 0.07 + i * 0.075, body: ReactElement;
  switch (sirve) {
    case 'vaso': { y = 0.06 + i * 0.16; body = <Cyl pos={[0, y + 0.08, 0]} r={0.27 + i * 0.008} h={0.16} color={c} mat="plastic" solid={false} />; break; }
    case 'olla': { y = 0.18 + i * 0.1; body = <Cyl pos={[0, y, 0]} r={0.5} h={0.1} color={c} mat="plastic" solid={false} />; break; }
    case 'bolsa': { y = 0.78 + i * 0.07; body = <Cyl pos={[0, y, 0]} r={0.26} h={0.09} color={c} mat="plastic" solid={false} />; break; }
    case 'hoja': body = <Block pos={[0, y, 0]} size={[1.05 * sh, 0.07, 0.62 * sh]} color={c} mat="plastic" solid={false} />; break;
    case 'calle': { y = 0.07 + i * 0.05; body = <Block pos={[0, y, 0]} size={[2.8 - i * 0.28, 0.05, 1.8 - i * 0.2]} color={c} mat="plastic" solid={false} />; break; }
    default: body = <Cyl pos={[0, y, 0]} r={0.52 * sh} h={0.075} color={c} mat="plastic" solid={false} />;
  }
  const R = sirve === 'calle' ? 1.1 - i * 0.1 : sirve === 'hoja' ? 0.36 : sirve === 'vaso' ? 0.0 : sirve === 'bolsa' ? 0.14 : 0.3;
  return (
    <group ref={g}>
      {body}
      {sirve !== 'vaso' && bits.map(([a, d], j) => <Ball key={j} pos={[Math.cos(a) * d * R * (sirve === 'hoja' ? 1.4 : sirve === 'calle' ? 1.3 : 1), y + (sirve === 'calle' ? 0.05 : 0.06), Math.sin(a) * d * R * (sirve === 'calle' ? 0.8 : 0.8)]} r={extra ? 0.09 : 0.06} color={c} cast={false} />)}
    </group>
  );
}

export function Cocina() {
  const P0 = useMemo<Partida>(() => conTema('cocina', partida()), []), T = P0.tema;
  const avatar = useGame(g => g.profile.avatar), size = useThree(t => t.size);
  const plato: string = T.plato ?? 'Baleada', sirve: string = T.sirve ?? 'plato';
  const pasosT: Par[] = Array.isArray(T.pasos) && T.pasos.length ? T.pasos : PASOS, extrasT: Par[] = Array.isArray(T.extras) ? T.extras : (Array.isArray(T.pasos) && T.pasos.length ? NONE : EXTRAS);
  const fondo = fondoDe(P0, 'mercado'), colors = P0.dept?.colors ?? ['#d94f3d', '#f4d06f'], meta = useMemo(() => metas(P0.dif), [P0]), dur = DURACION(P0.dif);
  const rnd = useMemo(() => rng(P0.seed), [P0]);
  const [, draw] = useState(0);
  const k = Math.min(2.1, Math.max(1, 1.75 / (size.width / Math.max(1, size.height))));

  const bins = useMemo(() => {
    const n = pasosT.length, m = extrasT.length, w = Math.min(1.5, 13 / n - 0.55);
    const list = pasosT.map(([nm, c], i) => ({ k: 'p' + i, n: nm, c, extra: false, w, pos: [-6.4 + 12.8 * (i + 0.5) / n, 0, -2.1] as V3 }));
    extrasT.forEach(([nm, c], i) => list.push({ k: 'x' + i, n: nm, c, extra: true, w: 1.3, pos: [(i % 2 ? 1 : -1) * (5.4 + Math.floor(i / 2) * 1.6), 0, 0.6] as V3 }));
    return list;
  }, [pasosT, extrasT]);
  const binDe = (k: string) => bins.find(b => b.k === k)!;
  const rivales = useMemo(() => makeBots(avatar, P0.modo === 'abierto' ? 3 : 0, P0.seed).map(b => ({ b, score: 0, t: 6 })), [P0, avatar]);
  const compa = useMemo(() => P0.modo === 'duo' ? Object.assign(makeBots(avatar, 1, P0.seed + 5)[0], { name: '🤖 Compa', x: 5.6, z: 3 }) : null, [P0, avatar]);
  const perro = useMemo(() => nuevoPerro(8.6, 1.6), []);
  useWanderers(rivales.map(r => r.b), [[[-6.5, 0, 3.8], [-5.2, 0, 4], [-6, 0, 3]], [[6.3, 0, 3.6], [5.4, 0, 3.0], [6.8, 0, 3.9]], [[-2.2, 0, 4.4], [-0.8, 0, 4.4]]] as V3[][]);

  const s = useRef({
    t: dur, score: 0, combo: 0, mejor: 0, servidos: 0, perdidos: 0, errores: 0,
    cl: [] as Cliente[], next: 0, llega: 0.6, prog: 0, capas: [] as { c: string; extra: boolean }[], listo: false, stun: 0, elapsed: 0,
    drops: [] as { x: number; z: number; c: string; age: number }[], cdCompa: 4, cur: -1, frase: 22, fraseDona: 0, done: false, compaSig: '', msg: '',
  }).current;

  const cur = () => s.cl.filter(c => c.stage === 'espera').sort((a, b) => a.id - b.id)[0] as Cliente | undefined;
  const suelta = (x: number, z: number, c: string) => {
    s.drops.push({ x, z, c, age: 0 }); perro.modo = 'corre'; perro.tx = x; perro.tz = z; draw(n => n + 1);
  };
  function agrega(paso: Paso, porCompa = false) {
    const c = cur(); if (!c) return false;
    const esp = c.seq[s.prog];
    if (esp && esp.k === paso.k) {
      s.capas.push({ c: paso.c, extra: paso.extra }); s.prog++; audio.sfx('pickup'); fx.emit(0, 1.2, 2.2, paso.c, 10, 1.8, 0.09, 2.5);
      if (s.prog >= c.seq.length) { s.listo = true; audio.sfx('star'); useGame.getState().toast('¡Plato listo! Llevalo al mostrador', '🍽️'); fx.emit(0, 1.5, 2.2, '#ffd54f', 16, 3, 0.1, 4); }
      draw(n => n + 1); return true;
    }
    if (!porCompa) {
      c.patience -= 4; s.errores++; s.combo = 0; audio.sfx('error'); s.stun = 0.7; player.speedMul = 0.2;
      fx.pop(player.pos[0], 2.6, player.pos[2], '−4 s ¡no era!', '#ff6b5e'); useGame.getState().toast(esp ? `Ahora va ${esp.n}, no ${paso.n}` : 'El plato ya está listo', '❌');
      suelta(player.pos[0] + 0.4, player.pos[2] + 0.4, paso.c);
    }
    return false;
  }
  function entrega(slot: number) {
    if (useGame.getState().mg?.phase !== 'playing') return;
    const c = cur();
    if (!s.listo) { useGame.getState().toast(c ? 'Primero armá el pedido' : 'Todavía no hay pedido', '🍳'); return; }
    if (!c || c.slot !== slot) { audio.sfx('error'); useGame.getState().toast('Ese no lo pidió él · mirá el cartel', '🤔'); return; }
    s.combo++; s.mejor = Math.max(s.mejor, s.combo); s.servidos++;
    const base = 15 + 10 * c.seq.length, rapido = Math.round(20 * Math.max(0, c.patience) / c.max), racha = Math.min(15, 5 * (s.combo - 1)), pago = base + rapido + racha;
    s.score += pago; c.stage = 'sale'; c.happy = true; c.st.anim = 'celebrate'; audio.sfx('coin'); audio.sfx('win');
    fx.emit(SLOTX[slot], 2, -5, '#ffd54f', 18, 4, 0.1, 4); fx.pop(SLOTX[slot], 2.9, -4.4, `+${pago}`, '#ffd54f');
    useGame.getState().toast(`¡Gracias! +${pago}${rapido > 12 ? ' · ¡qué rápido!' : ''}`, '💰');
    s.prog = 0; s.capas = []; s.listo = false;
    if (rnd() < 0.4) suelta(7.2 - rnd() * 1.4, 0.5 + rnd(), '#f1dcb4'); // la doña le tira un pedacito al perro
    draw(n => n + 1);
  }

  useEffect(() => {
    phys.limit = LIM; player.teleport(2.4, 0, 3.3, 0); player.fixedCam = { pos: [0, 12 * k, 11.8 * k], target: [0, 0, -0.9], fov: 52 }; player.camYaw = 0;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    w.__mcTest = {
      ...w.__mcTest,
      cocina: {
        state: () => { const c = cur(); return { t: s.t, score: s.score, combo: s.combo, servidos: s.servidos, errores: s.errores, perdidos: s.perdidos, prog: s.prog, listo: s.listo, meta, dur, modo: P0.modo, perro: perro.modo, perroPos: [perro.x, perro.z], drops: s.drops.length,
          pedido: c ? { slot: c.slot, seq: c.seq.map(p => p.k) } : null, rivales: rivales.map(r => r.score), compa: !!compa }; },
        bins: bins.map(b => ({ k: b.k, n: b.n, pos: b.pos })), slots: SLOTX,
        ...(location.hash.includes('test') ? { skip: (n: number) => { s.t = Math.max(0, s.t - n); }, envejece: () => { for (const c of s.cl) if (c.stage === 'espera') c.patience = 0.05; } } : {}),
      },
    };
    return () => { player.fixedCam = null; player.speedMul = 1; if (w.__mcTest) delete w.__mcTest.cocina; };
  }, [s, k, P0, meta, dur, bins, perro, rivales, compa]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresco = useRef(0);
  useMgTick(dt => {
    s.t -= dt; s.elapsed += dt; s.llega -= dt; s.frase -= dt; refresco.current += dt;
    if (s.stun > 0) { s.stun -= dt; if (s.stun <= 0) player.speedMul = 1; }
    // clientes
    if (s.llega <= 0 && s.t > 6 && s.cl.filter(c => c.stage !== 'sale').length < 3) {
      const slot = [1, 0, 2].find(i => !s.cl.some(c => c.slot === i && c.stage !== 'sale'));
      if (slot !== undefined) {
        const n = pasosT.length, kk = Math.max(Math.min(2, n), Math.min(n, Math.round(2 + rnd() * (n - 2) + P0.dif * (n - 2) * 0.4)));
        const seq: Paso[] = bins.filter(b => !b.extra).slice(0, kk).map(b => ({ k: b.k, n: b.n, c: b.c, extra: false }));
        const ex = bins.filter(b => b.extra && rnd() < 0.5 + 0.3 * P0.dif);
        if (extrasT.length && (rnd() < 0.3 + 0.4 * P0.dif || ex.length === 0 && rnd() < 0.3)) { const lista = ex.length ? ex : [bins.filter(b => b.extra)[0]]; for (const b of lista) seq.push({ k: b.k, n: b.n, c: b.c, extra: true }); }
        const conExtras = seq.filter(p => p.extra);
        const max = (20 + 5 * seq.length) * (1 - 0.25 * P0.dif);
        s.cl.push({ id: s.next++, slot, seq, nombre: conExtras.length ? (conExtras.length === extrasT.length && extrasT.length > 1 ? `${plato} con todo` : `${plato} con ${conExtras[0].n.toLowerCase()}`) : `${plato}${kk < n ? ' sencilla' : ''}`, patience: max, max, stage: 'entra', x: slot === 2 ? 11 : -11, st: { anim: 'walk', speed: 3 }, shirt: CAMISAS[s.next % 5], happy: false });
        s.llega = 9 - 4 * P0.dif + rnd() * 2; audio.sfx('click');
      }
    }
    for (const c of s.cl) {
      const tx = SLOTX[c.slot];
      if (c.stage === 'entra') { const d = tx - c.x; c.x += Math.sign(d) * Math.min(Math.abs(d), 4 * dt); if (Math.abs(tx - c.x) < 0.02) { c.stage = 'espera'; c.st.anim = 'idle'; c.st.speed = 0; } }
      else if (c.stage === 'espera') {
        c.patience -= dt;
        if (c.patience <= 0) { c.stage = 'sale'; c.st.anim = 'walk'; c.st.speed = 3; s.combo = 0; s.perdidos++; audio.sfx('miss'); useGame.getState().toast('Un cliente se fue sin comer', '😠'); }
      } else { c.x += (c.slot === 0 ? -1 : 1) * 4 * dt; c.st.speed = 3; c.st.anim = c.happy && Math.abs(c.x - tx) < 0.7 ? 'celebrate' : 'walk'; }
    }
    s.cl = s.cl.filter(c => Math.abs(c.x) < 13);
    // si el cliente actual cambió (se fue), el plato en curso se bota
    const c0 = cur(), id = c0 ? c0.id : -1;
    if (id !== s.cur) { if (s.cur !== -1 && s.prog > 0 && !s.cl.some(c => c.id === s.cur && c.happy)) { suelta(0.5, 2.8, '#c9a26b'); useGame.getState().toast('Se perdió ese plato · empezá el nuevo', '🗑️'); } s.cur = id; s.prog = 0; s.capas = []; s.listo = false; draw(n => n + 1); }
    // migas para el perro
    for (const d of s.drops) { d.age += dt; if (perro.modo === 'come' && Math.hypot(perro.x - d.x, perro.z - d.z) < 0.5) { d.age = 99; fx.pop(d.x, 1.4, d.z, '¡ñam!', '#ffe082'); audio.sfx('pickup'); } }
    if (s.drops.some(d => d.age > 8)) { s.drops = s.drops.filter(d => d.age <= 8); draw(n => n + 1); }
    const d0 = s.drops[0]; if (d0 && perro.modo !== 'corre' && perro.modo !== 'come') { perro.modo = 'corre'; perro.tx = d0.x; perro.tz = d0.z; }
    // compa
    if (compa) {
      const c = cur(); s.cdCompa -= dt;
      const sig = c && !s.listo ? c.seq[s.prog] : null;
      let tx = 5.6, tz = 3.2;
      if (sig && s.cdCompa <= 0) { const b = binDe(sig.k); tx = b.pos[0]; tz = b.pos[2] + 0.9; }
      const dx = tx - compa.x, dz = tz - compa.z, d = Math.hypot(dx, dz);
      if (d > 0.1) { const m = Math.min(d, 4.2 * dt); compa.x += dx / d * m; compa.z += dz / d * m; compa.yaw = faceTo(dx, dz); compa.st.anim = 'run'; compa.st.speed = 5; }
      else { compa.st.anim = 'idle'; compa.st.speed = 0; if (sig && s.cdCompa <= 0) { agrega(sig, true); s.cdCompa = 4.5 - 1.5 * P0.dif + rnd() * 2; fx.pop(compa.x, 2.4, compa.z, 'Yo le ayudo', '#9be37a'); } }
    }
    for (const r of rivales) { r.t -= dt; if (r.t <= 0) { r.t = 9 + rnd() * 6 - 3 * P0.dif; const p = 40 + Math.floor(rnd() * 45); r.score += p; fx.pop(r.b.x, 2.5, r.b.z, `+${p}`, '#9be37a'); r.b.st.anim = 'celebrate'; setTimeout(() => { r.b.st.anim = 'idle'; }, 700); } }
    if (s.frase <= 0) { s.frase = 20 + rnd() * 8; const f = T.frases; if (Array.isArray(f) && f.length) useGame.getState().toast(String(f[Math.floor(rnd() * f.length)]), '💬'); }
    const c = cur(), sig = c && !s.listo ? c.seq[s.prog] : null;
    setHud({
      timer: Math.ceil(Math.max(0, s.t)), score: `${s.score} pts`,
      objective: s.score >= meta[2] ? '¡Tres estrellas!' : c ? (s.listo ? `¡Llevá el ${plato.toLowerCase()} al cliente ${c.slot + 1}!` : `Ahora: ${sig ? sig.n : '…'}`) : '¡Ya vienen los clientes!',
      lines: [c ? c.seq.map((p, i) => `${i < s.prog ? '✓ ' : ''}${p.n}`).join(' › ') : 'Esperando pedidos…', `Racha x${s.combo} · servidos ${s.servidos}`, ...rivales.map(r => `${r.b.name}: ${r.score}`)],
    });
    if (s.t <= 0 && !s.done) {
      s.done = true;
      finish({ won: s.score >= meta[0], stars: starsFor(s.score, meta[0], meta[1], meta[2]), score: s.score, label: `${s.score} pts`, stats: { servidos: s.servidos, perdidos: s.perdidos, errores: s.errores, mejorRacha: s.mejor } });
    }
    if (refresco.current > 0.1) { refresco.current = 0; draw(n => n + 1); }
  });

  const c0 = cur(), sigK = c0 && !s.listo ? c0.seq[s.prog]?.k : null;
  const fraseDona = FRASES[Math.floor(s.elapsed / 5) % FRASES.length];
  const [c1, c2] = colors;
  return (
    <>
      <Escenario fondo={fondo} seed={P0.seed} rx={16} rz={11.5} ground={90} />
      <Spawn pos={[2.4, 0, 3.3]} />
      <Fx />
      {/* piso del puesto, mostrador y toldo */}
      <Block pos={[0, 0.03, -0.3]} size={[18, 0.06, 10.5]} mat="tile" color="#d9c9a0" solid={false} receive />
      <Block pos={[0, 0.5, -4.5]} size={[16, 1, 0.9]} mat="wood" color="#b9773f" solid={false} />
      <Block pos={[0, 1.03, -4.5]} size={[16.3, 0.1, 1.15]} mat="wood" color="#e0aa68" solid={false} />
      {[-7.9, 7.9].map(x => <Cyl key={x} pos={[x, 2.2, -5.1]} r={0.1} h={4.4} mat="wood" color="#8d5a34" solid={false} />)}
      {[0, 1, 2, 3, 4, 5].map(j => <Block key={j} pos={[(j - 2.5) * 2.7, 4.45, -5.5]} size={[2.7, 0.18, 2.4]} mat="cloth" color={j % 2 ? c2 : c1} solid={false} />)}
      <Label pos={[0, 5.4, -5.5]} text={`¡${plato}!`} h={0.8} fg="#ffe082" />
      {/* mesa de armado */}
      <Block pos={[0, 0.45, 2.2]} size={[3.4, 0.9, 1.9]} mat="wood" color="#a8744a" solid={false} />
      <Block pos={[0, 0.93, 2.2]} size={[3.5, 0.08, 2]} mat="wood" color="#e6c28b" solid={false} />
      <Label pos={[0, 0.12, 3.4]} text="Mesa de armado" h={0.3} />
      <group position={[0, 0.98, 2.2]} scale={baseDe(sirve)}>
        <Base sirve={sirve} />
        {s.capas.map((c, i) => <Capa key={`${s.cur}-${i}`} sirve={sirve} i={i} c={c.c} extra={c.extra} seed={P0.seed} />)}
      </group>
      {s.listo && <Label pos={[0, 2.5, 2.2]} text="¡Listo! Al mostrador" h={0.45} fg="#9be37a" />}
      {/* recipientes */}
      {bins.map(b => (
        <group key={b.k}>
          <Block pos={[b.pos[0], 0.45, b.pos[2]]} size={[b.w, 0.9, 0.95]} mat="wood" color={b.extra ? '#4e8d86' : '#b98856'} solid={false} />
          <Cyl pos={[b.pos[0], 1.05, b.pos[2]]} r={Math.min(0.5, b.w / 2 - 0.05)} rTop={Math.min(0.56, b.w / 2)} h={0.34} mat="plastic" color="#f3efe6" solid={false} />
          <Cyl pos={[b.pos[0], 1.2, b.pos[2]]} r={Math.min(0.44, b.w / 2 - 0.1)} h={0.1} mat="plastic" color={b.c} solid={false} />
          {[0, 1, 2].map(i => <Ball key={i} pos={[b.pos[0] + (i - 1) * 0.2, 1.3, b.pos[2] + (i % 2) * 0.1 - 0.05]} r={0.1} color={b.c} cast={false} />)}
          <Label pos={[b.pos[0], 1.95, b.pos[2]]} text={b.extra ? `+ ${b.n}` : b.n} h={0.42} fg={sigK === b.k ? '#ffe082' : undefined} />
          <Interactable pos={[b.pos[0], 0, b.pos[2] + 1]} radius={1.15} label={`Echar ${b.n}`} icon="🥣" marker={sigK === b.k} onUse={() => { if (useGame.getState().mg?.phase === 'playing') agrega({ k: b.k, n: b.n, c: b.c, extra: b.extra }); }} />
        </group>
      ))}
      {/* clientes */}
      {s.cl.map(c => (
        <group key={c.id}>
          <group position={[c.x, 0, -5.7]} rotation-y={Math.PI}><art.Avatar config={{ ...avatar, shirtColor: c.shirt }} state={c.st} /></group>
          {c.stage !== 'sale' && <Ticket c={c} actual={c === c0} prog={c === c0 ? s.prog : 0} />}
          {c.stage === 'sale' && <Label pos={[c.x, 2.3, -5.7]} text={c.happy ? '¡Gracias!' : '¡Qué tardado!'} h={0.4} />}
        </group>
      ))}
      {SLOTX.map((x, i) => <Interactable key={i} pos={[x, 0, -3.2]} radius={1.6} label="Entregar el plato" icon="🍽️" marker={false} enabled={() => s.listo} onUse={() => entrega(i)} />)}
      {/* doña del comal */}
      <group position={[-10.6, 0, -1.4]}>
        <group rotation-y={-0.9}><Dona frase={fraseDona} /></group>
        <Block pos={[1.5, 0.45, 0.5]} size={[1.8, 0.9, 1.4]} mat="stone" color="#8a7a66" solid={false} />
        <Cyl pos={[1.5, 0.95, 0.5]} r={0.6} h={0.06} color="#26262b" mat="metal" solid={false} />
        <Ball pos={[1.5, 0.55, 0.5]} r={0.22} color="#ff7a1a" mat="neon" cast={false} />
        <Label pos={[1.5, 1.55, 0.5]} text="Comal" h={0.3} />
      </group>
      {/* perro aguacatero y sus migas */}
      <Perro d={perro} />
      <P.Crate pos={[9.3, 0, 0.4]} solid={false} /><P.Barrel pos={[9.7, 0, 2.2]} solid={false} />
      {s.drops.map((d, i) => d.age < 90 && <Ball key={i} pos={[d.x, 0.1, d.z]} r={0.13} color={d.c} cast={false} />)}
      {compa && <BotView b={compa} />}
      {rivales.map((r, i) => <BotView key={i} b={r.b} />)}
      {rivales.map((r, i) => <Block key={i} pos={[[-6.5, 6.3, -1.5][i], 0.5, 5.3]} size={[1.6, 1, 0.9]} mat="wood" color="#9b6b43" solid={false} />)}
    </>
  );
}

function Ticket({ c, actual, prog }: { c: Cliente; actual: boolean; prog: number }) {
  const n = c.seq.length, ancho = 0.4, x0 = c.x - (n - 1) * ancho / 2, f = Math.max(0, c.patience / c.max);
  return (
    <group>
      {c.seq.map((p, i) => {
        const hecho = actual && i < prog, siguiente = actual && i === prog, sz = hecho ? 0.16 : siguiente ? 0.4 : 0.3;
        return <Block key={i} pos={[x0 + i * ancho, 2.75 + (siguiente ? 0.06 : 0), -5.7]} size={[sz, sz, 0.08]} mat="neon" color={hecho ? '#2e7d32' : p.c} solid={false} cast={false} />;
      })}
      <Label pos={[c.x, 3.25, -5.7]} text={`${c.slot + 1} · ${c.nombre}`} h={0.36} fg={actual ? '#ffe082' : undefined} />
      <Block pos={[c.x, 2.4, -5.7]} size={[1.6, 0.1, 0.05]} mat="metal" color="#444f58" solid={false} cast={false} />
      <Block pos={[c.x - 0.8 + 0.8 * f, 2.4, -5.65]} size={[Math.max(0.01, 1.6 * f), 0.12, 0.06]} mat="neon" color={f < 0.3 ? '#ef5650' : '#75e2a1'} solid={false} cast={false} />
    </group>
  );
}
