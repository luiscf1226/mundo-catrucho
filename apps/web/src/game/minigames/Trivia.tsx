// MOTOR 'trivia' — «¿Cómo se dice?»: la pregunta sale en el tablero y hay tres plataformas con una respuesta cada una.
// Caminá a la correcta antes de que se acabe el tiempo (o quedate quieto en una para contestar ya). Las otras se hunden.
import { useEffect, useMemo, useRef, useState } from 'react';
import type * as THREE from 'three';
import { audio } from '../../core/audio';
import { BOT_NAMES, SHOP } from '../../core/data';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { AvatarState, V3 } from '../../core/types';
import { art, Block, Ground, Label, Plate, P as Prop, Spawn, useMgTick } from '../kit';
import { finish, type Guia, partida, rng, setHud, starsFor } from './api';
import { armar, cuantas, type Pregunta } from './trivia/preguntas';

const metas = (dif: number) => {
  const n = cuantas(dif);
  return [n * 55, n * 85, n * 115] as const;
};
export const guia: Guia = {
  goal: 'Caminá a la plataforma con la respuesta correcta antes de que se acabe el tiempo. Las otras se hunden.',
  keys: [
    ['WASD', 'moverte'],
    ['Shift', 'correr'],
    ['Quedate quieto', 'contestar ya'],
  ],
  touch: [
    ['Palanca', 'moverte'],
    ['Quedate quieto', 'contestar ya'],
  ],
  metas: (p) => metas(p.dif).map((v) => `${v} pts`) as [string, string, string],
};

const TEST = typeof location !== 'undefined' && location.hash.includes('test');
const PX = [-5.4, 0, 5.4],
  PZ = -5,
  PW = 4.6,
  PD = 7.5,
  COLS = ['#e63946', '#1d70d6', '#f4b400'],
  LET = ['A', 'B', 'C'];
const padAt = (x: number, z: number) => {
  if (Math.abs(z - PZ) > PD / 2) return -1;
  for (let i = 0; i < 3; i++) if (Math.abs(x - PX[i]) < PW / 2) return i;
  return -1;
};
const onDock = (x: number, z: number) => z > PZ + PD / 2 - 0.1 && z < 10 && Math.abs(x) < 10;
const fit = (s: string, w: number, max: number) => Math.min(max, w / (s.length * 0.52 + 0.8));

type Fase = 'pregunta' | 'hundir' | 'pausa';
interface Bot {
  name: string;
  st: AvatarState;
  pos: V3;
  pick: number;
  delay: number;
  wet: number;
  cfg: typeof SHOP.defaultAvatar;
}

export function Trivia() {
  const P = useMemo(partida, []),
    R = useMemo(() => rng(P.seed), [P]);
  const qs = useMemo<Pregunta[]>(() => armar(P.tema, P.dept?.id, cuantas(P.dif), R), [P, R]);
  const T = 10 - 4 * P.dif,
    frases: string[] = Array.isArray(P.tema.frases) ? P.tema.frases : [];
  const [qi, setQi] = useState(0),
    [, setV] = useState(0);
  const s = useRef({
    fase: 'pregunta' as Fase,
    t: T,
    pts: 0,
    hits: 0,
    sink: [0, 0, 0],
    pad: -1,
    still: 0,
    done: false,
    wet: 0,
    frase: 18,
    tf: 0,
    res: -1,
  });
  const pads = useRef<(THREE.Group | null)[]>([]),
    botRefs = useRef<(THREE.Group | null)[]>([]);
  const modo = useGame((st) => st.mg?.modo ?? P.modo);
  const bots = useMemo<Bot[]>(() => {
    const n = modo === 'duo' ? 1 : modo === 'abierto' ? 3 : 0,
      r = rng(P.seed + 7);
    return Array.from({ length: n }, (_, i) => ({
      name:
        modo === 'duo' ? `Compa ${BOT_NAMES[(i * 3) % BOT_NAMES.length]}` : BOT_NAMES[(i * 4 + 2) % BOT_NAMES.length],
      st: { anim: 'idle', speed: 0 },
      pos: [-3 + i * 3 + r(), 0, 6.5] as V3,
      pick: -1,
      delay: 1,
      wet: 0,
      cfg: { ...SHOP.defaultAvatar, shirtColor: COLS[i % 3] },
    }));
  }, [P, modo]);
  const q = qs[Math.min(qi, qs.length - 1)];

  useEffect(() => {
    phys.limit = { minX: -9.5, maxX: 9.5, minZ: PZ - PD / 2 + 0.3, maxZ: 9.5 };
    phys.killY = -30;
    phys.ground = (x, z) => {
      const i = padAt(x, z);
      if (i >= 0) return -s.current.sink[i] * 2.4;
      return onDock(x, z) ? 0 : -2.4;
    };
    return () => {
      phys.ground = () => 0;
      phys.limit = null;
    };
  }, []);
  const newQ = () => {
    for (const b of bots) {
      const r = R(),
        good = r < 0.62 + 0.15 * (1 - P.dif);
      b.pick = good ? q.ok : (q.ok + 1 + Math.floor(R() * 2)) % 3;
      b.delay = 0.8 + R() * (T * 0.5);
    }
  };
  useEffect(newQ, [qi]); // eslint-disable-line react-hooks/exhaustive-deps

  useMgTick((dt, time) => {
    const S = s.current,
      p = player.pos;
    if (S.done) return;
    // chapuzón: al agua → de vuelta al muelle
    if (p[1] < -0.9) {
      S.wet += dt;
      if (S.wet > 0.9) {
        player.teleport(0, 0.2, 6.5, 0);
        S.wet = 0;
      }
    } else S.wet = 0;
    if ((S.frase -= dt) <= 0 && frases.length) {
      S.frase = 22;
      useGame.getState().toast(frases[Math.floor(R() * frases.length)], '💬');
    }
    if (S.fase === 'pregunta') {
      S.t -= dt;
      const pad = player.body.grounded ? padAt(p[0], p[2]) : -1;
      if (pad !== S.pad) {
        S.pad = pad;
        S.still = 0;
        S.tf = S.t;
      } else if (pad >= 0 && Math.hypot(player.body.vel[0], player.body.vel[2]) < 0.3) S.still += dt;
      else S.still = 0;
      if (S.t <= 0 || S.still > 1.4) {
        const ok = S.pad === q.ok;
        S.res = S.pad;
        S.fase = 'hundir';
        S.t = 1.8;
        if (ok) {
          S.hits++;
          S.pts += 100 + Math.round(Math.max(0, S.tf) * 8);
          audio.sfx('coin');
          useGame.getState().toast('¡Cheque! Esa era.', '✅');
        } else {
          audio.sfx('miss');
          useGame.getState().toast(S.pad < 0 ? '¡Se te fue el tiempo!' : `No era… era «${q.ops[q.ok]}»`, '😂');
        }
        setV((v) => v + 1);
      }
    } else if (S.fase === 'hundir') {
      S.t -= dt;
      for (let i = 0; i < 3; i++) if (i !== q.ok) S.sink[i] = Math.min(1, S.sink[i] + dt * 1.8);
      if (S.t < 1.2 && S.t + dt >= 1.2 && padAt(p[0], p[2]) !== q.ok && p[1] < -0.3) audio.sfx('splash');
      if (S.t <= 0) {
        S.fase = 'pausa';
        S.t = 1.1;
        player.teleport(0, 0.2, 6.5, 0);
      }
    } else {
      S.t -= dt;
      for (let i = 0; i < 3; i++) S.sink[i] = Math.max(0, S.sink[i] - dt * 2);
      if (S.t <= 0) {
        if (qi + 1 >= qs.length) {
          S.done = true;
          const m = metas(P.dif),
            stars = starsFor(S.pts, m[0], m[1], m[2]);
          finish({ won: stars >= 1, stars, score: S.pts, label: `${S.pts} pts`, stats: {} });
          return;
        }
        S.fase = 'pregunta';
        S.t = T;
        S.pad = -1;
        S.still = 0;
        S.res = -1;
        setQi(qi + 1);
      }
    }
    for (let i = 0; i < 3; i++) {
      const g = pads.current[i];
      if (g) g.position.y = -S.sink[i] * 2.4;
    }
    // bots: escogen plataforma (a veces mal) y se hunden con ella
    bots.forEach((b, i) => {
      const g = botRefs.current[i];
      if (!g) return;
      let tx = -3 + i * 3,
        tz = 6.5;
      if (S.fase === 'pregunta' && (b.delay -= dt) <= 0) {
        tx = PX[b.pick] + (i - 1) * 0.9;
        tz = PZ + 1 + i * 0.6;
      } else if (S.fase === 'hundir') {
        tx = b.pos[0];
        tz = b.pos[2];
      }
      const dx = tx - b.pos[0],
        dz = tz - b.pos[2],
        d = Math.hypot(dx, dz),
        sp = 4.2;
      if (S.fase === 'pausa') {
        b.pos[0] = tx;
        b.pos[2] = tz;
      } else if (d > 0.1) {
        b.pos[0] += (dx / d) * Math.min(d, sp * dt);
        b.pos[2] += (dz / d) * Math.min(d, sp * dt);
        g.rotation.y = Math.atan2(dx, dz);
      }
      const pi = padAt(b.pos[0], b.pos[2]);
      b.pos[1] = pi >= 0 ? -S.sink[pi] * 2.4 : onDock(b.pos[0], b.pos[2]) ? 0 : -1;
      b.st.anim = S.fase === 'hundir' ? (pi === q.ok ? 'celebrate' : 'fall') : d > 0.1 ? 'run' : 'idle';
      b.st.speed = d > 0.1 ? sp : 0;
      g.position.set(b.pos[0], b.pos[1], b.pos[2]);
    });
    const S2 = s.current;
    if (TEST)
      ((window as any).__mcTest ??= {}).trivia = {
        qi,
        n: qs.length,
        ok: q.ok,
        fase: S2.fase,
        q: q.q,
        ops: q.ops,
        pts: S2.pts,
        bots: bots.length,
        pad: [PX[q.ok], PZ],
      };
    setHud({
      timer: S2.fase === 'pregunta' ? Math.max(0, S2.t) : undefined,
      score: `${S2.pts} pts`,
      objective: q.q,
      lines: [
        `Pregunta ${qi + 1}/${qs.length}`,
        `Aciertos: ${S2.hits}`,
        S2.fase === 'pregunta' && S2.pad >= 0 ? `Quedate quieto en ${LET[S2.pad]} para contestar` : '',
      ],
    });
    void time;
  });

  const res = s.current.res,
    showRes = s.current.fase !== 'pregunta';
  return (
    <>
      <art.SkyRig time="dia" weather="despejado" />
      <Spawn pos={[0, 0, 6.5]} yaw={0} />
      <Ground size={260} mat="water" color="#1fa3c4" y={-0.45} />
      <Ground size={260} mat="sand" color="#e9d9a6" y={-2.9} />
      {/* muelle de salida */}
      <Block pos={[0, -0.25, 4.35]} size={[20, 0.5, 11.3]} color="#a0703c" mat="wood" solid={false} />
      {[-9.6, 9.6].map((x) => (
        <Block key={x} pos={[x, 0.45, 4.35]} size={[0.2, 0.9, 11.3]} color="#5a3d26" mat="wood" solid={false} />
      ))}
      {/* plataformas */}
      {[0, 1, 2].map((i) => (
        <group
          key={i}
          ref={(g) => {
            pads.current[i] = g;
          }}
        >
          <Block pos={[PX[i], -0.3, PZ]} size={[PW - 0.15, 0.6, PD]} color={COLS[i]} mat="plastic" solid={false} />
          <Block
            pos={[PX[i], 0.02, PZ]}
            size={[PW - 0.9, 0.06, PD - 0.9]}
            color="#ffffff"
            mat="plastic"
            solid={false}
          />
          <Block
            pos={[PX[i], 1.4, PZ - PD / 2 + 0.3]}
            size={[0.18, 2.6, 0.18]}
            color="#5a3d26"
            mat="wood"
            solid={false}
          />
          <Plate
            pos={[PX[i], 2.75, PZ - PD / 2 + 0.45]}
            h={fit(`${LET[i]}: ${q.ops[i]}`, 5.2, 0.8)}
            text={`${LET[i]}: ${q.ops[i]}`}
            bg={showRes ? (i === q.ok ? '#2a9d8f' : '#555') : COLS[i]}
          />
        </group>
      ))}
      {/* tablero */}
      <Block pos={[0, 4.6, PZ - PD / 2 - 1.2]} size={[18.5, 3.4, 0.4]} color="#1d1d1f" mat="wood" />
      {[-8.6, 8.6].map((x) => (
        <Block key={x} pos={[x, 1.6, PZ - PD / 2 - 1.2]} size={[0.4, 3.2, 0.4]} color="#5a3d26" mat="wood" />
      ))}
      <Plate
        pos={[0, 5.5, PZ - PD / 2 - 0.95]}
        h={0.7}
        text={`¿Cómo se dice? · ${qi + 1}/${qs.length}`}
        bg="#1d1d1f"
        fg="#ffd23f"
      />
      <Plate pos={[0, 4.3, PZ - PD / 2 - 0.95]} h={fit(q.q, 17.5, 1.05)} text={q.q} bg="#1d1d1f" />
      {showRes && (
        <Label
          pos={[0, 7.4, PZ]}
          text={res === q.ok ? '¡Cheque! ✅' : res < 0 ? '¡Se acabó el tiempo! ⏰' : '¡Chapuzón! 😂'}
          h={1.1}
        />
      )}
      {/* alrededores */}
      {[
        [-14, -8],
        [14, -6],
        [-13, 6],
        [13, 9],
        [-18, -1],
        [18, 2],
      ].map(([x, z], i) => (
        <group key={i}>
          <Block pos={[x, -0.6, z]} size={[5, 1.2, 5]} color="#e9d9a6" mat="sand" solid={false} />
          <Prop.Palm pos={[x, 0, z]} seed={i} />
        </group>
      ))}
      {bots.map((b, i) => (
        <group
          key={i}
          ref={(g) => {
            botRefs.current[i] = g;
          }}
          position={b.pos}
        >
          <art.Avatar config={b.cfg} state={b.st} name={`🤖 ${b.name}`} />
        </group>
      ))}
    </>
  );
}
