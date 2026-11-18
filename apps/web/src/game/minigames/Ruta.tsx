// MOTOR 'ruta' — «La ruta»: carrera de obstáculos generada con la semilla de la etapa (saltos, escalones, plataformas que se mueven).
import { useLayoutEffect, useMemo, useRef } from 'react';
import type { Group } from 'three';
import { audio } from '../../core/audio';
import { input } from '../../core/input';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { mgPlaying, useGame } from '../../core/store';
import type { AvatarState, V3 } from '../../core/types';
import { art, Block, boxCol, Label, moveBox, P, Spawn, useCollider, useMgTick, useTick } from '../kit';
import { type Guia, partida, rng, setHud } from './api';
import { BotAvatar, frasesDe, newState, useBurst, useFinisher } from './corte/common';
import { LOOK } from './ruta/estilos';
import { ESTILOS_RUTA, type Estilo, generar, limiteDe, type Pieza, TH, yAt } from './ruta/gen';

export const guia: Guia = {
  goal: 'Corré y saltá hasta la meta antes de que se acabe el tiempo. Si te caés, volvés al último punto de control.',
  keys: [
    ['WASD / flechas', 'moverte'],
    ['Espacio', 'saltar (mantené Shift para correr)'],
    ['Ratón', 'girar la cámara'],
  ],
  touch: [
    ['Palanca', 'moverte'],
    ['Botón de salto', 'saltar'],
    ['Arrastrar', 'girar la cámara'],
  ],
  metas: (p) => [`Llegar a la meta en ${limiteDe(p)} s`, 'Con 30% del tiempo sobrando', 'Con 55% del tiempo sobrando'],
};

function Plat({ q, look, onSink }: { q: Pieza; look: (typeof LOOK)[Estilo]; onSink?: (c: unknown) => void }) {
  const mov = q.tipo === 'mov' || q.tipo === 'movz',
    sink = q.tipo === 'sink',
    size: V3 = [q.w, TH, q.len];
  const g = useRef<Group>(null),
    st = useRef({ t: 0, off: 0, wait: 0 });
  const c = useCollider(() => boxCol([q.x, q.y - TH / 2, q.z], size), [q.id]);
  useMgTick((dt, tm) => {
    if (mov) {
      const a = Math.sin(tm * (q.spd ?? 1) + (q.ph ?? 0)) * (q.amp ?? 2),
        pos: V3 = q.tipo === 'mov' ? [q.x + a, q.y - TH / 2, q.z] : [q.x, q.y - TH / 2, q.z + a];
      moveBox(c, pos, size, dt);
      if (g.current) g.current.position.set(pos[0] - q.x, 0, pos[2] - q.z);
    }
    if (sink) {
      const s = st.current,
        on = player.body.on === c && player.body.grounded;
      if (s.wait <= 0 && on) s.t += dt;
      else if (!on && s.wait <= 0) s.t = Math.max(0, s.t - dt);
      if (s.t > 0.8 && s.wait <= 0) {
        s.wait = 3;
        s.off = 0;
      }
      if (s.wait > 0) {
        s.wait -= dt;
        s.off = s.wait > 2.2 ? Math.min(7, s.off + dt * 9) : s.wait > 0.6 ? 7 : Math.max(0, s.off - dt * 12);
        if (s.wait <= 0) {
          s.t = 0;
          s.off = 0;
        }
      }
      moveBox(c, [q.x, q.y - TH / 2 - s.off, q.z], size, dt);
      if (g.current) g.current.position.set(0, -s.off, 0);
    }
  });
  const m = q.tipo === 'beam' ? look.beam : look.plat,
    accent =
      q.tipo === 'cp'
        ? '#36c2df'
        : q.tipo === 'goal'
          ? '#f6c744'
          : q.tipo === 'start'
            ? '#48de8c'
            : mov
              ? '#f08346'
              : sink
                ? '#d9513c'
                : look.cap;
  return (
    <group ref={g}>
      <Block pos={[q.x, q.y - TH / 2, q.z]} size={size} color={m[1]} mat={m[0]} solid={false} />
      {q.tipo !== 'beam' &&
        q.tipo !== 'step' &&
        [-1, 1].map((sd) => (
          <Block
            key={sd}
            pos={[q.x + sd * (q.w / 2 - 0.12), q.y + 0.03, q.z]}
            size={[0.24, 0.08, q.len]}
            color={accent}
            mat="neon"
            solid={false}
            cast={false}
          />
        ))}
      {(q.tipo === 'cp' || q.tipo === 'goal' || q.tipo === 'start') && (
        <Block
          pos={[q.x, q.y + 0.03, q.z - q.len / 2 + 0.12]}
          size={[q.w, 0.08, 0.24]}
          color={accent}
          mat="neon"
          solid={false}
          cast={false}
        />
      )}
    </group>
  );
}

/** Capturas: `#go,ruta=cueva` muestra ese estilo aunque el juego del catálogo traiga otro (no cambia el juego). */
const estiloVista = () =>
  typeof location === 'undefined' ? undefined : (location.hash.match(/ruta=(\w+)/)?.[1] as Estilo | undefined);

export function Ruta() {
  const P_ = useMemo(partida, []),
    pedido = estiloVista() ?? P_.tema.estilo,
    est: Estilo = ESTILOS_RUTA.includes(pedido) ? pedido : 'cerro',
    L = LOOK[est];
  const G = useMemo(() => generar(P_), [P_]),
    TL = limiteDe(P_),
    meta: string = P_.tema.meta ?? '¡META!',
    junta = (Array.isArray(P_.tema.junta) ? P_.tema.junta : ['Gema', 'gema']) as [string, string];
  const floorY = G.minY - (L.floor[1] === 'water' ? 3.2 : 12),
    killY = floorY + (L.floor[1] === 'water' ? -0.5 : 3);
  const { end } = useFinisher(),
    fx = useBurst(40, 0.1);
  const S = useRef({
    t: 0,
    cp: 0,
    gems: 0,
    falls: 0,
    got: new Set<number>(),
    lastY: 0,
    over: false,
    started: false,
    toast: 15,
    best: 0,
  });
  const R = useMemo(() => rng(P_.seed ^ 77), [P_]);
  const bots = useMemo(
    () =>
      Array.from({ length: P_.modo === 'abierto' ? 3 : 1 }, (_, i) => ({
        s: newState('run') as AvatarState,
        g: null as Group | null,
        pz: 3 - i * 1.5,
        v: 3.9 + i * 0.35,
        done: false,
      })),
    [P_],
  );
  const props = useMemo(() => {
    const out: { k: string; x: number; z: number; s: number; r: number }[] = [];
    for (let z = 2; z > -G.length - 10; z -= 12 + R() * 4)
      for (const side of [-1, 1]) {
        const [k, s, d] = L.props[Math.floor(R() * L.props.length)];
        out.push({ k, x: side * (d + 3 + R() * 7), z: z + R() * 5, s: s * (0.8 + R() * 0.5), r: R() * 6 });
      }
    return out;
  }, [G, L]); // eslint-disable-line react-hooks/exhaustive-deps

  useLayoutEffect(() => {
    phys.ground = () => -500;
    phys.killY = killY;
    phys.limit = { minX: -22, maxX: 22, minZ: G.goal.z - 14, maxZ: 12 };
    player.control = false;
    player.camPitch = 0.38;
    player.camDist = 7.5;
    S.current.lastY = 0;
    const w = window as any;
    w.__mcTest = {
      ...w.__mcTest,
      ruta: {
        G,
        st: S.current,
        TL,
        killY,
        est,
        warp: (s: number) => {
          S.current.t += s;
        },
      },
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useMgTick((dt) => {
    const s = S.current,
      p = player.pos;
    if (s.over) return;
    if (!s.started) {
      s.started = true;
      player.control = true;
    }
    s.t += dt;
    if (p[1] - s.lastY > 4) {
      s.falls++;
      audio.sfx('splash');
      useGame.getState().toast('¡Te caíste! Volvés al último punto de control', '🏁');
    }
    s.lastY = p[1];
    const next = G.cps[s.cp + 1];
    if (next && p[2] < next[2] + 2 && Math.abs(p[1] - next[1]) < 2.5 && Math.abs(p[0]) < 5) {
      s.cp++;
      const old: V3 = [...p],
        vel: V3 = [...player.body.vel];
      player.setSpawn([next[0], next[1] + 0.1, next[2]], 0);
      player.teleport(old[0], old[1], old[2]);
      player.body.vel = vel;
      s.lastY = old[1];
      audio.sfx('star');
      useGame.getState().toast(`¡Punto de control ${s.cp}/${G.cps.length - 1}!`, '🏁');
      fx.emit(next[0], next[1] + 1, next[2], '#36c2df', 14, 4, 4);
    }
    G.gems.forEach((q, i) => {
      if (!s.got.has(i) && Math.hypot(p[0] - q[0], p[2] - q[2]) < 1.2 && Math.abs(p[1] + 0.9 - q[1]) < 1.6) {
        s.got.add(i);
        s.gems++;
        audio.sfx('pickup');
        fx.emit(q[0], q[1], q[2], L.gem, 10, 3, 3);
      }
    });
    const rem = Math.max(0, TL - s.t),
      dist = Math.max(0, p[2] - G.goal.z);
    const fr = frasesDe(P_);
    s.toast -= dt;
    if (fr.length && s.toast < 0) {
      s.toast = 22;
      useGame.getState().toast(fr[Math.floor(R() * fr.length)], '🗣️');
    }
    // bots (compa en duo, rivales en abierto)
    bots.forEach((b, i) => {
      if (!b.g) return;
      const hold = P_.modo === 'duo' ? Math.min(0, p[2] - b.pz + 14) : 0;
      b.pz -= b.v * dt * (hold < 0 ? 0.25 : 1) * (b.done ? 0 : 1);
      if (b.pz < G.goal.z - 2) {
        b.done = true;
        b.s.anim = 'celebrate';
      }
      const h = yAt(G.segs, b.pz);
      b.g.position.set(h.x + (i - 1) * 0.3, h.y, b.pz);
      if (!b.done) b.s.anim = h.air ? 'jump' : 'run';
      b.s.speed = b.v;
    });
    setHud({
      timer: rem,
      score: `${Math.round(rem * 10 + s.gems * 40)} pts`,
      objective: `${Math.round(dist)} m para «${meta}»`,
      lines: [
        `Punto de control ${s.cp}/${G.cps.length - 1} · ${junta[0]}: ${s.gems} · Caídas: ${s.falls}`,
        input.touch ? 'Palanca + salto' : 'WASD · Espacio saltar · Shift correr',
      ],
    });
    const goalIn =
      p[2] < G.goal.z + G.goal.len / 2 - 1 &&
      p[2] > G.goal.z - G.goal.len / 2 &&
      Math.abs(p[1] - G.goal.y) < 1.5 &&
      player.body.grounded;
    if (goalIn || rem <= 0) {
      s.over = true;
      player.control = false;
      const won = goalIn,
        frac = rem / TL,
        score = won ? Math.round(rem * 10 + s.gems * 40) : s.gems * 40;
      if (won) {
        player.play('celebrate', 4);
        audio.sfx('win');
        fx.emit(p[0], p[1] + 1, p[2], '#ffd23f', 24, 6, 5);
      }
      end({
        won,
        stars: won ? (frac >= 0.55 ? 3 : frac >= 0.3 ? 2 : 1) : 0,
        score,
        label: won ? `${score} pts` : 'Se acabó el tiempo',
        stats: { gemas: s.gems, caidas: s.falls },
      });
    }
  });
  useTick(() => {
    player.visible = true;
  });

  const gemEls = useMemo(() => G.gems.map((q, i) => ({ q, i })), [G]);
  return (
    <>
      <art.SkyRig time={L.time} indoor={L.indoor} shadowRadius={40} fogFar={L.fog} />
      <Spawn pos={[0, 0.1, 0]} yaw={0} />
      <mesh position={[0, floorY, -G.length / 2]} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[300, G.length + 220]} />
        <primitive object={art.material(L.floor[1], L.floor[0])} attach="material" />
      </mesh>
      {G.plats.map((q) => (
        <Plat key={q.id} q={q} look={L} />
      ))}
      {props.map((q, i) => {
        const C = (P as any)[q.k];
        return C ? (
          <C
            key={i}
            pos={[q.x, floorY + (q.k === 'Macaw' ? 14 : 0), q.z]}
            scale={q.s}
            rot={q.r}
            solid={false}
            {...(q.k === 'House' ? { w: 8, d: 8, floors: 2 } : {})}
          />
        ) : null;
      })}
      {gemEls.map(({ q, i }) => (
        <GemSpin key={i} q={q} i={i} got={S} color={L.gem} forma={junta[1]} />
      ))}
      {G.cps.slice(1).map((c, i) => (
        <group key={i}>
          <P.Flag pos={[3.2, c[1], c[2]]} height={3.4} solid={false} />
          <Label pos={[-3, c[1] + 2.4, c[2]]} text={`🏁 ${i + 1}`} h={0.5} />
        </group>
      ))}
      <P.PortalArch pos={[0, G.goal.y, G.goal.z - 1]} label={meta} solid={false} />
      <P.Flag pos={[3.8, G.goal.y, G.goal.z + 2]} height={5} solid={false} />
      <P.Flag pos={[-3.8, G.goal.y, G.goal.z + 2]} height={5} solid={false} />
      <Label pos={[0, 1.2, 1.2]} text={`${meta} ↓ ${Math.round(G.length)} m`} h={0.45} />
      {fx.node}
      {bots.map((b, i) => (
        <group
          key={i}
          ref={(g) => {
            b.g = g;
          }}
          position={[0, 0, b.pz]}
          rotation-y={Math.PI}
        >
          <art.Avatar config={botAv(i)} state={b.s} name={botNm(i, P_.modo === 'duo')} />
        </group>
      ))}
      {void BotAvatar}
    </>
  );
}

import { botCfg, botName } from './corte/common';

const botAv = (i: number) => botCfg(i + 1),
  botNm = (i: number, c: boolean) => botName(i + 1, c);

function GemSpin({
  q,
  i,
  got,
  color,
  forma,
}: {
  q: V3;
  i: number;
  got: React.MutableRefObject<{ got: Set<number> }>;
  color: string;
  forma: string;
}) {
  const g = useRef<Group>(null);
  useTick((_, t) => {
    if (!g.current) return;
    g.current.visible = !got.current.got.has(i);
    g.current.rotation.y = t * 2.4;
    g.current.position.y = q[1] + Math.sin(t * 2.6 + i) * 0.12;
  });
  return (
    <group ref={g} position={[q[0], q[1], q[2]]}>
      {forma === 'moneda' ? <P.Coin /> : <P.Gem color={color} />}
    </group>
  );
}
void mgPlaying;
