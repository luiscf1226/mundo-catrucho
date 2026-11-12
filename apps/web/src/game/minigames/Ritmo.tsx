// MOTOR 'ritmo' — «Al ritmo»: notas que bajan por 4 carriles; se tocan con A S D F / flechas / toque en pantalla. Música propia por estilo.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../core/audio';
import { input } from '../../core/input';
import { player } from '../../core/player';
import { mgPlaying, useGame } from '../../core/store';
import type { AvatarState, V3 } from '../../core/types';
import { art, Block, Cyl, Label, Plate, Spawn, useTick } from '../kit';
import { type Guia, partida, setHud } from './api';
import { BotAvatar, Escenario, fondoDe, frasesDe, newState, useBurst, useFinisher } from './corte/common';
import {
  ACENTOS_LIBRES,
  acompanamiento,
  chartDe,
  ESTILOS,
  estiloDe,
  LANE_COL,
  metasDe,
  type Nota,
  respuestaDe,
  tocaDe,
} from './ritmo/musica';

export const guia: Guia = {
  goal: 'Tocá cada nota justo cuando llegue a la línea. La música la armás vos con tus aciertos.',
  keys: [
    ['A  S  D  F', 'los 4 carriles'],
    ['← ↓ ↑ →', 'también sirven'],
  ],
  touch: [
    ['Tocá la pantalla', 'el carril más cerca de tu dedo'],
    ['Botón 🎯', 'toca donde apuntaste'],
  ],
  metas: (p) => metasDe(p).map((n) => `${n} pts`) as [string, string, string],
};
const LW = 1.4,
  HZ = 0,
  FAR = -14,
  CAM: V3 = [0, 3.7, 5.6],
  TGT: V3 = [0, 0.1, -4.6],
  FOV = 46,
  STAGE = 0.35;
const KEYS: Record<string, number> = { a: 0, s: 1, d: 2, f: 3, arrowleft: 0, arrowdown: 1, arrowup: 2, arrowright: 3 };
const GRADOS = [
  ['¡PERFECTO!', '#ffd23f', 100],
  ['¡Bien!', '#7be37b', 60],
  ['Regular', '#8fb8ff', 30],
  ['¡Fallaste!', '#ff6b6b', 0],
] as const;

function Marimba() {
  return (
    <group>
      {Array.from({ length: 9 }, (_, i) => (
        <group key={i}>
          <Block
            pos={[(i - 4) * 0.27, 0.82, 0]}
            size={[0.23, 0.07, 0.5 - i * 0.03]}
            color={['#c98a4b', '#b87a3d'][i % 2]}
            mat="wood"
            solid={false}
          />
          <Cyl
            pos={[(i - 4) * 0.27, 0.45 - i * 0.012, 0]}
            r={0.07}
            h={0.6 - i * 0.04}
            color="#e9c46a"
            mat="metal"
            solid={false}
          />
        </group>
      ))}
      <Block pos={[0, 0.7, 0.2]} size={[2.5, 0.06, 0.06]} color="#6b3f1d" mat="wood" solid={false} />
      <Block pos={[0, 0.7, -0.2]} size={[2.5, 0.06, 0.06]} color="#6b3f1d" mat="wood" solid={false} />
    </group>
  );
}
function Tambor() {
  return (
    <group>
      <Cyl pos={[0, 0.55, 0]} r={0.5} h={0.9} rTop={0.42} color="#7a4a24" mat="wood" solid={false} />
      <Cyl pos={[0, 1.02, 0]} r={0.44} h={0.06} color="#f1e3c3" mat="cloth" solid={false} />
      <Cyl pos={[0, 0.3, 0]} r={0.52} h={0.06} color="#c9a227" mat="gold" solid={false} />
    </group>
  );
}

export function Ritmo() {
  const P = useMemo(partida, []),
    E = estiloDe(P),
    toca = tocaDe(P, E),
    C = useMemo(() => chartDe(P), [P]),
    fondo = fondoDe(P, 'pueblo');
  const resp = respuestaDe(P);
  // la llamada del tambor suena con el acompañamiento; en modo libre solo la primera: después el tambor te contesta
  const evs = useMemo(
      () =>
        [
          ...acompanamiento(E, C.end + 2),
          ...C.llamadas
            .filter((l) => resp === 'copia' || l.time < (C.compases[1]?.t ?? 0))
            .map((l) => ({
              t: l.time,
              k: 'drum' as const,
              a: [l.lane === 2 ? 190 : 250, 0.2, 0.32] as [number, number, number],
            })),
        ].sort((a, b) => a.t - b.t),
      [E, C, resp],
    ),
    metas = useMemo(() => metasDe(P), [P]);
  const { end } = useFinisher(),
    fx = useBurst(80, 0.1);
  const lead = 1.9 - 0.5 * P.dif,
    cfg = ESTILOS[E];
  const nota = useRef<(THREE.Group | null)[][]>([[], [], [], []]),
    used = useRef<Set<Nota>[]>([new Set(), new Set(), new Set(), new Set()]),
    glow = useRef<(THREE.Mesh | null)[]>([]),
    jl = useRef<(THREE.Object3D | null)[]>([]),
    bell = useRef<THREE.Group>(null),
    aviso = useRef<(THREE.Object3D | null)[]>([]);
  const S = useRef({
    mode: '' as '' | 'a' | 'c',
    base: 0,
    acc: 0,
    wall: 0,
    ei: 0,
    score: 0,
    combo: 0,
    best: 0,
    hits: [0, 0, 0, 0],
    total: 0,
    cnt: 0,
    flash: [0, 0, 0, 0],
    jt: 0,
    jg: 3,
    danced: 0,
    fkey: false,
    toast: 14,
    over: false,
    stuck: 0,
    lastA: 0,
    notas: C.notas,
    /** llamada y respuesta: cortes de frase, acentos propios por frase (modo libre) y el eco ya programado */
    cortes: 0,
    corteT: 0,
    propios: 0,
    eco: [] as { k: number; lane: number }[][],
    ecoHecho: 0,
    li: 0,
  });
  const presses = useRef<{ lane: number; t: number }[]>([]);
  const pl = useMemo(() => ({ s: newState('dance') as AvatarState }), []);
  const cam = useMemo(() => {
    const c = new THREE.PerspectiveCamera(FOV, 1.78, 0.1, 100);
    c.position.set(...CAM);
    c.lookAt(...TGT);
    c.updateMatrixWorld();
    return c;
  }, []);
  const bots = useMemo(
    () =>
      Array.from({ length: P.modo === 'abierto' ? 3 : 1 }, (_, i) => ({
        s: newState(i % 2 ? 'dance2' : 'dance') as AvatarState,
        t: 0,
      })),
    [P],
  );
  const bpos: V3[] = [
    [5.4, STAGE, -2.8],
    [-3.3, STAGE, -5.4],
    [3.5, STAGE, -5.6],
  ];

  const now = () => {
    const s = S.current;
    return s.mode === 'a' ? audio.now - s.base : s.acc + (performance.now() - s.wall) / 1000;
  };
  useLayoutEffect(() => {
    player.control = false;
    player.fixedCam = { pos: [...CAM], target: [...TGT], fov: FOV };
    const down = (e: KeyboardEvent) => {
      if (!mgPlaying() || e.repeat) return;
      const k = e.key.toLowerCase(),
        lane = KEYS[k];
      if (lane === undefined) return;
      if (k.startsWith('arrow')) e.preventDefault();
      if (k === 'f') S.current.fkey = true;
      presses.current.push({ lane, t: now() });
    };
    window.addEventListener('keydown', down);
    const w = window as any;
    w.__mcTest = {
      ...w.__mcTest,
      ritmo: {
        st: S.current,
        C,
        now,
        auto: (off = 0) => {
          clearInterval(w.__ra);
          w.__ra = setInterval(() => {
            const t = now();
            for (const n of S.current.notas)
              if (!n.done && !n.hit && n.time - t <= off / 1000 && n.time - t > -0.12 && !(n as any).sent) {
                (n as any).sent = true;
                const k = 'asdf'[n.lane];
                window.dispatchEvent(new KeyboardEvent('keydown', { key: k }));
              }
          }, 4);
        },
        stop: () => clearInterval(w.__ra),
      },
    };
    return () => {
      window.removeEventListener('keydown', down);
      clearInterval((window as any).__ra);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const laneNdc = useMemo(
    () => [0, 1, 2, 3].map((i) => new THREE.Vector3((i - 1.5) * LW, 0, HZ).project(cam).x),
    [cam],
  );
  const judge = (g: number, lane: number) => {
    const s = S.current;
    s.jg = g;
    s.jt = 0.7;
    const pts = GRADOS[g][2];
    if (g < 3) {
      const m = 1 + Math.min(3, Math.floor(s.combo / 10));
      s.score += pts * m;
      s.combo++;
      s.best = Math.max(s.best, s.combo);
      s.hits[g]++;
      fx.emit((lane - 1.5) * LW, 0.4, HZ, g === 0 ? '#ffd23f' : LANE_COL[lane], g === 0 ? 14 : 8, 3.2, 3);
    } else {
      s.combo = 0;
      s.hits[3]++;
    }
    s.total++;
  };

  /** Toque sin nota en su carril, en llamada y respuesta: mezclar pie con cadera corta la frase; en modo libre la
   *  cadera puede poner hasta cuatro acentos propios a contratiempo. Devuelve true si el toque contó para algo. */
  const responder = (lane: number, t: number) => {
    const s = S.current,
      familia = (l: number) => (l < 2 ? 0 : 1);
    const otra = s.notas.find(
      (n) => !n.done && n.frase !== undefined && familia(n.lane) !== familia(lane) && Math.abs(n.time - t) < 0.13,
    );
    if (otra) {
      for (const n of s.notas)
        if (n.frase === otra.frase && !n.done) {
          n.done = true;
          s.hits[3]++;
          s.total++;
        }
      s.combo = 0;
      s.cortes++;
      s.corteT = 1.3;
      audio.tone(98, 0.3, { type: 'square', gain: 0.05 });
      return true;
    }
    const c = C.compases.find((x) => x.tipo === 'respuesta' && t >= x.t - 0.1 && t < x.fin - 0.1);
    if (resp !== 'libre' || lane < 2 || !c) return false;
    const k = Math.round((t - c.t) / C.step),
      d = Math.abs(t - (c.t + k * C.step));
    s.eco[c.frase] ??= [];
    const usados = s.eco[c.frase];
    if (k % 2 !== 1 || k > 7 || d > 0.11 || usados.length >= ACENTOS_LIBRES || usados.some((u) => u.k === k))
      return false;
    usados.push({ k, lane });
    s.propios++;
    // copiar la llamada vale menos: el chiste es contestar con algo tuyo
    const llamada =
      c.frase === 0
        ? C.llamadas.filter((l) => l.time < c.t).map((l) => Math.round((l.time - C.compases[0].t) / C.step))
        : (s.eco[c.frase - 1] ?? []).map((u) => u.k);
    judge(llamada.includes(k) ? 2 : d < 0.06 ? 0 : 1, lane);
    audio.drum(cfg.lanes[lane], 0.18, 0.25);
    player.play(s.cnt++ % 2 ? 'dance2' : 'dance', 0.35);
    return true;
  };

  useTick((dt, tt) => {
    const s = S.current;
    if (!s.over) player.visible = true;
    const playing = mgPlaying() && !s.over;
    if (playing && !s.mode) {
      s.mode = audio.now > 0 ? 'a' : 'c';
      s.base = audio.now;
      s.acc = 0;
      s.wall = performance.now();
      s.lastA = audio.now;
    }
    if (playing) {
      if (s.mode === 'c') {
        s.acc += dt;
        s.wall = performance.now();
      } else {
        if (audio.now === s.lastA) {
          s.stuck += dt;
          if (s.stuck > 0.6) {
            s.mode = 'c';
            s.acc = audio.now - s.base;
            s.wall = performance.now();
          }
        } else s.stuck = 0;
        s.lastA = audio.now;
      }
    }
    const t = playing || s.mode ? now() : -1;
    if (playing) {
      // música de fondo: se programa con un adelanto corto
      while (s.ei < evs.length && evs[s.ei].t < t + 0.18) {
        const e = evs[s.ei++];
        if (e.t < t - 0.05) continue;
        const at = Math.max(0, e.t - t);
        if (e.k === 'drum') audio.drum(e.a[0], e.a[1], e.a[2], at);
        else audio.tone(e.a[0], e.a[1], { gain: e.a[2], type: e.a[3] ?? 'sine', at });
      }
      // llamada del tambor: se ve en los carriles de cadera (además de oírse)
      if (resp) {
        while (s.li < C.llamadas.length && C.llamadas[s.li].time <= t) {
          const l = C.llamadas[s.li++];
          if (resp === 'copia' || l.time < (C.compases[1]?.t ?? 0)) s.flash[l.lane] = 0.8;
        }
        // modo libre: en cada llamada el tambor repite lo que contestaste en la frase anterior
        const sig = C.compases[s.ecoHecho * 2 + 2];
        if (resp === 'libre' && sig && t >= sig.t - 0.15) {
          for (const u of s.eco[s.ecoHecho] ?? []) {
            const at = sig.t + u.k * C.step - t;
            audio.drum(u.lane === 2 ? 190 : 250, 0.2, 0.32, Math.max(0, at));
            setTimeout(
              () => {
                S.current.flash[u.lane] = 0.8;
              },
              Math.max(0, at * 1000),
            );
          }
          s.ecoHecho++;
        }
      }
      // toques (teclas, flechas) y toque en pantalla
      if (input.take('fire')) {
        if (s.fkey) s.fkey = false;
        else {
          const px = input.px;
          let lane = 0;
          laneNdc.forEach((x, i) => {
            if (Math.abs(x - px) < Math.abs(laneNdc[lane] - px)) lane = i;
          });
          presses.current.push({ lane, t: now() });
        }
      }
      s.fkey = false;
      for (const p of presses.current) {
        s.flash[p.lane] = 1;
        let best: Nota | null = null,
          bd = 9;
        for (const n of s.notas)
          if (n.lane === p.lane && !n.done && Math.abs(n.time - p.t) < 0.2 && Math.abs(n.time - p.t) < bd) {
            best = n;
            bd = Math.abs(n.time - p.t);
          }
        if (best) {
          best.done = best.hit = true;
          judge(bd < 0.07 ? 0 : bd < 0.13 ? 1 : 2, p.lane);
          audio.tone(cfg.lanes[p.lane], cfg.len, { type: cfg.tone, gain: cfg.gain });
          if (cfg.drumLanes) audio.drum(cfg.lanes[p.lane], 0.18, 0.25);
          if (s.combo > 0 && s.combo % 10 === 0) audio.sfx('star');
          player.play(s.combo > 12 || toca === 'baila' ? (s.cnt++ % 2 ? 'dance2' : 'dance') : 'throw', 0.35);
          if (bell.current) bell.current.rotation.z = (p.lane % 2 ? 1 : -1) * 0.5;
        } else if (!(resp && responder(p.lane, p.t)))
          audio.tone(cfg.lanes[p.lane] / 2, 0.08, { type: 'square', gain: 0.03 });
      }
      presses.current.length = 0;
      for (const n of s.notas)
        if (!n.done && t - n.time > 0.2) {
          n.done = true;
          judge(3, n.lane);
        }
      const fr = frasesDe(P);
      s.toast -= dt;
      if (fr.length && s.toast < 0) {
        s.toast = 20;
        useGame.getState().toast(fr[Math.floor(Math.random() * fr.length)], '🗣️');
      }
      const acc = s.total ? Math.round(((s.hits[0] + s.hits[1] * 0.6 + s.hits[2] * 0.3) / s.total) * 100) : 100;
      setHud({
        timer: Math.max(0, C.end - t),
        score: `${Math.round(s.score)} pts`,
        objective: `Racha ${s.combo}${s.combo >= 10 ? ` · ×${1 + Math.min(3, Math.floor(s.combo / 10))}` : ''} · Meta ${metas[0]} pts`,
        lines: resp
          ? [
              `${C.compases.find((c) => t >= c.t && t < c.fin)?.tipo === 'llamada' ? '🥁 Escuchá la llamada' : '💃 ¡Respondé!'} · Precisión ${acc}%${s.cortes ? ` · frases cortadas ${s.cortes}` : ''}`,
              resp === 'libre'
                ? `A S = pies en el pulso · D F = cadera a contratiempo (hasta ${ACENTOS_LIBRES})`
                : 'A S = pies en el pulso · D F = cadera como el tambor',
            ]
          : [`Precisión ${acc}% · perfectas ${s.hits[0]}`, 'A S D F / flechas · o tocá la pantalla'],
      });
      if (t >= C.end) {
        s.over = true;
        const sc = Math.round(s.score),
          st = sc >= metas[2] ? 3 : sc >= metas[1] ? 2 : sc >= metas[0] ? 1 : 0;
        player.play(st ? 'celebrate' : 'idle', 3);
        end({
          won: st > 0,
          stars: st as 0 | 1 | 2 | 3,
          score: sc,
          label: `${sc} pts`,
          stats: { racha: s.best, perfectas: s.hits[0], cortes: s.cortes, propios: s.propios },
        });
      }
    }
    // notas que bajan (pool por carril)
    const used0 = used.current;
    for (let l = 0; l < 4; l++) used0[l].clear();
    const tn = s.mode ? t : -9;
    const vis = (n: Nota) => !n.hit && n.time - tn <= lead && n.time - tn >= -0.5;
    if (s.mode) {
      for (const n of s.notas) {
        if (n.slot === undefined) continue;
        if (vis(n)) used0[n.lane].add(n.slot as any);
        else n.slot = undefined;
      }
      for (const n of s.notas) {
        if (n.slot !== undefined || !vis(n)) continue;
        const pool = nota.current[n.lane];
        for (let k = 0; k < pool.length; k++)
          if (!used0[n.lane].has(k as any)) {
            n.slot = k;
            used0[n.lane].add(k as any);
            break;
          }
      }
    }
    for (let l = 0; l < 4; l++)
      nota.current[l].forEach((g, k) => {
        if (!g) return;
        g.visible = false;
      });
    if (s.mode)
      for (const n of s.notas) {
        if (n.slot === undefined || n.hit) continue;
        const g = nota.current[n.lane][n.slot];
        if (!g) continue;
        const d = n.time - tn;
        g.visible = true;
        g.position.set((n.lane - 1.5) * LW, 0.16, HZ + (FAR - HZ) * (d / lead));
        const sc = 0.55 + 0.45 * (1 - Math.min(1, Math.max(0, d / lead)));
        g.scale.set(sc, 1, sc);
        g.visible = true;
      }
    for (let l = 0; l < 4; l++) {
      s.flash[l] = Math.max(0, s.flash[l] - dt * 5);
      const gm = glow.current[l];
      if (gm) {
        gm.visible = s.flash[l] > 0.05;
        gm.scale.setScalar(1 + (1 - s.flash[l]) * 0.4);
      }
    }
    s.jt = Math.max(0, s.jt - dt);
    s.corteT = Math.max(0, s.corteT - dt);
    const fase = resp && s.mode ? C.compases.find((c) => tn >= c.t && tn < c.fin)?.tipo : undefined;
    aviso.current.forEach((o, i) => {
      if (o) o.visible = i === 0 ? s.corteT > 0 : i === 1 ? fase === 'llamada' : fase === 'respuesta';
    });
    jl.current.forEach((o, i) => {
      if (o) {
        o.visible = s.jt > 0 && s.jg === i;
        o.scale.setScalar(0.85 + Math.min(1, s.jt * 4) * 0.25);
      }
    });
    if (bell.current)
      bell.current.rotation.z += (0 - bell.current.rotation.z) * Math.min(1, dt * 4) + Math.sin(tt * 2) * 0.002;
    // bailarines
    bots.forEach((b, i) => {
      b.t -= dt;
      if (b.t < 0) {
        b.t = 4 + Math.random() * 4;
        b.s.anim = (i + Math.floor(tt / 5)) % 2 ? 'dance2' : 'dance';
      }
    });
    if (!playing && !s.over) {
      if (player.state.anim !== 'dance') player.play('dance', 0.5);
    }
  }, -11);

  useLayoutEffect(() => {
    player.yaw = Math.PI;
    player.camYaw = Math.PI;
  }, []);
  const stageX = -5.3;
  return (
    <>
      <Escenario fondo={fondo} deck={false} />
      <Spawn pos={[stageX, STAGE, -3.4]} yaw={Math.PI} />
      {/* escenario y pista */}
      <Block pos={[-5.2, STAGE / 2, -3.6]} size={[6, STAGE, 4.4]} color="#8d5a2b" mat="wood" solid={false} />
      <Block pos={[5.2, STAGE / 2, -3.6]} size={[6, STAGE, 4.4]} color="#8d5a2b" mat="wood" solid={false} />
      <Block
        pos={[0, 0.04, (HZ + FAR) / 2]}
        size={[LW * 4 + 0.4, 0.08, Math.abs(FAR - HZ) + 3]}
        color="#1b1630"
        mat="plastic"
        solid={false}
        cast={false}
      />
      {[0, 1, 2, 3].map((l) => (
        <Block
          key={l}
          pos={[(l - 1.5) * LW, 0.09, (HZ + FAR) / 2]}
          size={[LW - 0.12, 0.02, Math.abs(FAR - HZ) + 3]}
          color={LANE_COL[l]}
          mat="neon"
          solid={false}
          cast={false}
        />
      ))}
      {[0, 1, 2, 3].map((l) => (
        <Block
          key={l}
          pos={[(l - 1.5) * LW, 0.09, (HZ + FAR) / 2]}
          size={[LW - 0.16, 0.025, Math.abs(FAR - HZ) + 3]}
          color="#241d3a"
          mat="plastic"
          solid={false}
          cast={false}
        />
      ))}
      <Block
        pos={[0, 0.12, HZ]}
        size={[LW * 4 + 0.2, 0.05, 0.14]}
        color="#ffffff"
        mat="neon"
        solid={false}
        cast={false}
      />
      {[0, 1, 2, 3].map((l) => (
        <group key={l} position={[(l - 1.5) * LW, 0.15, HZ]}>
          <Cyl pos={[0, 0, 0]} r={0.55} h={0.1} color="#0f0b1d" mat="plastic" solid={false} cast={false} />
          <Cyl pos={[0, 0.03, 0]} r={0.5} h={0.06} color={LANE_COL[l]} mat="plastic" solid={false} cast={false} />
          <mesh
            ref={(m) => {
              glow.current[l] = m;
            }}
            position={[0, 0.12, 0]}
            rotation-x={-Math.PI / 2}
            visible={false}
          >
            <circleGeometry args={[0.85, 24]} />
            <meshBasicMaterial color={LANE_COL[l]} transparent opacity={0.55} />
          </mesh>
          <Label
            pos={[0, 0.02, 0.95]}
            text={resp ? `${'ASDF'[l]} · ${l < 2 ? 'pie' : 'cadera'}` : 'ASDF'[l]}
            h={resp ? 0.3 : 0.4}
            depthTest={false}
            fg="#ffffff"
            bg="rgba(0,0,0,0.5)"
          />
        </group>
      ))}
      {[0, 1, 2, 3].map((l) => (
        <group key={l}>
          {Array.from({ length: 11 }, (_, k) => (
            <group
              key={k}
              ref={(g) => {
                nota.current[l][k] = g;
              }}
              visible={false}
            >
              <Cyl pos={[0, 0, 0]} r={0.52} h={0.2} color={LANE_COL[l]} mat="plastic" solid={false} cast={false} />
              <Cyl pos={[0, 0.11, 0]} r={0.32} h={0.06} color="#ffffff" mat="neon" solid={false} cast={false} />
            </group>
          ))}
        </group>
      ))}
      {GRADOS.map((g, i) => (
        <group
          key={i}
          ref={(o) => {
            jl.current[i] = o;
          }}
          visible={false}
        >
          <Label pos={[0, 1.3, -2.4]} text={g[0]} h={0.5} fg={g[1]} />
        </group>
      ))}
      {resp &&
        (
          [
            '¡Mezclaste pie y cadera! Se cortó la frase',
            '🥁 Llamada: escuchá',
            '💃 ¡Respondé con pies y cadera!',
          ] as const
        ).map((txt, i) => (
          <group
            key={txt}
            ref={(o) => {
              aviso.current[i] = o;
            }}
            visible={false}
          >
            <Label
              pos={[0, i === 0 ? 2.1 : 2.9, -4]}
              text={txt}
              h={i === 0 ? 0.42 : 0.5}
              fg={i === 0 ? '#ff6b6b' : cfg.color}
            />
          </group>
        ))}
      {fx.node}
      <Plate
        pos={[0, 4.2, FAR - 0.5]}
        text={`${P.juego?.name ?? 'Al ritmo'} · ${cfg.name}`}
        h={1.1}
        bg="#2b1d4a"
        fg={cfg.color}
      />
      {[-1, 1].map((x) => (
        <group key={x}>
          <Cyl pos={[x * 4.2, 2.6, FAR]} r={0.2} h={5.2} color="#2b2b3a" mat="metal" solid={false} />
          <Block
            pos={[x * 4.2, 5.3, FAR]}
            size={[0.9, 0.6, 0.6]}
            color={cfg.color}
            mat="neon"
            solid={false}
            cast={false}
          />
        </group>
      ))}
      {/* instrumento */}
      {toca === 'marimba' && (
        <group position={[stageX + 0.2, STAGE, -2.0]}>
          <Marimba />
        </group>
      )}
      {toca === 'tambor' && (
        <group position={[stageX + 1.4, STAGE, -2.3]}>
          <Tambor />
        </group>
      )}
      {toca === 'campana' && (
        <group position={[7.5, 0, -8]}>
          <Block pos={[0, 3.2, 0]} size={[3.2, 6.4, 3.2]} color="#e9d7b3" mat="stucco" solid={false} />
          <Block pos={[0, 7.2, 0]} size={[3.8, 1.8, 3.8]} color="#cf8f5f" mat="roof" solid={false} />
          <Block pos={[0, 5.2, 1.62]} size={[1.6, 1.8, 0.1]} color="#2b1d12" mat="plastic" solid={false} />
          <group ref={bell} position={[0, 6.2, 1.2]}>
            <Cyl pos={[0, -0.6, 0]} r={0.55} rTop={0.18} h={1.0} color="#d4a72c" mat="gold" solid={false} />
            <Cyl pos={[0, 0, 0]} r={0.05} h={0.6} color="#555" mat="metal" solid={false} />
          </group>
        </group>
      )}
      {bots.map((b, i) => (
        <BotAvatar key={i} i={i + 1} state={b.s} pos={bpos[i]} yaw={Math.PI} compa={P.modo === 'duo'} />
      ))}
      {void pl}
    </>
  );
}
void art;
