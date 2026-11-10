// MOTOR 'corte' — «A puro machete»: cosas salen volando en arco, se apunta con el puntero y se corta. No se toca lo de `evita`.

import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../core/audio';
import { input } from '../../core/input';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { AvatarState, V3 } from '../../core/types';
import { Block, Label, Spawn, useMgTick, useTick } from '../kit';
import { fmtTime, type Guia, type Partida, partida, rng, setHud } from './api';
import {
  BotAvatar,
  Escenario,
  fondoDe,
  frasesDe,
  nBots,
  newState,
  starsOf,
  useBurst,
  useFinisher,
} from './corte/common';
import { type Shape, ShapeMesh, shapeOf } from './corte/shapes';

type Arma = 'machete' | 'cuchillo' | 'hacha';
const durOf = (p: Partida) => Math.round(70 + 30 * p.dif);
// En la última etapa salen ~3 veces más cosas y el combo (hasta ×5) dispara el puntaje: las metas suben con eso.
const metasOf = (p: Partida): [number, number, number] => [
  Math.round((200 + 800 * p.dif) / 10) * 10,
  Math.round((450 + 1950 * p.dif) / 10) * 10,
  Math.round((800 + 3700 * p.dif) / 10) * 10,
];
export const guia: Guia = {
  goal: 'Cortá todo lo que sale volando, ¡pero no toqués lo que dice «evitá»!',
  keys: [
    ['Mouse', 'apuntar'],
    ['Clic / F', 'cortar'],
    ['Arrastre rápido', 'cortar varios'],
  ],
  touch: [
    ['Deslizá el dedo', 'apuntar y cortar'],
    ['Botón 🎯', 'cortar donde apuntás'],
  ],
  metas: (p) => metasOf(p).map((n) => `${n} pts`) as [string, string, string],
};

const CAM_POS: V3 = [0, 2.3, 10.5],
  CAM_TGT: V3 = [0, 3.1, 0],
  FOV = 52,
  PLAYER: V3 = [-4.7, 0, 3.4];
interface Half {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
}
interface Slot {
  type: number;
  g: THREE.Group | null;
  gw: THREE.Group | null;
  gl: THREE.Group | null;
  gr: THREE.Group | null;
  on: boolean;
  cut: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  vr: number;
  l: Half;
  rr: Half;
  t: number;
  bad: boolean;
  w: number;
}
interface Kind {
  nombre: string;
  shape: Shape;
  color?: string;
  bad: boolean;
  name: string;
}

function Arma({ tipo }: { tipo: Arma }) {
  if (tipo === 'hacha')
    return (
      <group>
        <Block pos={[0, 0.5, 0]} size={[0.1, 1.9, 0.1]} color="#7a4a24" mat="wood" solid={false} cast={false} />
        <Block pos={[0.26, 1.2, 0]} size={[0.55, 0.55, 0.08]} color="#cfd6dc" mat="metal" solid={false} cast={false} />
        <Block pos={[0.56, 1.2, 0]} size={[0.1, 0.7, 0.06]} color="#f4f8fb" mat="metal" solid={false} cast={false} />
      </group>
    );
  if (tipo === 'cuchillo')
    return (
      <group>
        <Block pos={[0, -0.1, 0]} size={[0.14, 0.55, 0.12]} color="#2b2b2b" mat="plastic" solid={false} cast={false} />
        <Block pos={[0, 0.65, 0]} size={[0.17, 1.0, 0.04]} color="#e6ebef" mat="metal" solid={false} cast={false} />
        <group position={[0, 1.2, 0]} rotation-z={Math.PI / 4}>
          <Block pos={[0, 0, 0]} size={[0.12, 0.12, 0.04]} color="#e6ebef" mat="metal" solid={false} cast={false} />
        </group>
      </group>
    );
  return (
    <group>
      <Block pos={[0, -0.1, 0]} size={[0.13, 0.6, 0.12]} color="#6b3f1d" mat="wood" solid={false} cast={false} />
      <Block pos={[0, 0.25, 0]} size={[0.3, 0.07, 0.12]} color="#c9a227" mat="gold" solid={false} cast={false} />
      <Block pos={[0.02, 1.0, 0]} size={[0.24, 1.5, 0.04]} color="#d9dee3" mat="metal" solid={false} cast={false} />
      <group position={[0.1, 1.82, 0]} rotation-z={-0.42}>
        <Block pos={[0, 0, 0]} size={[0.24, 0.35, 0.04]} color="#eef2f5" mat="metal" solid={false} cast={false} />
      </group>
    </group>
  );
}

export function Corte() {
  const P = useMemo(partida, []),
    fondo = fondoDe(P, 'finca');
  const arma: Arma = (['machete', 'cuchillo', 'hacha'] as const).includes(P.tema.arma) ? P.tema.arma : 'machete';
  const R = useMemo(() => rng(P.seed), [P]),
    size = useThree((s) => s.size);
  const { done, end } = useFinisher();
  const fx = useBurst(80, 0.1);
  const kinds = useMemo<Kind[]>(() => {
    const cosas: [string, string, string?][] =
      Array.isArray(P.tema.cosas) && P.tema.cosas.length
        ? P.tema.cosas
        : [
            ['Pastel', 'pastel'],
            ['Caña', 'cana'],
            ['Coco', 'coco'],
            ['Sandía', 'sandia'],
          ];
    const evita: [string, string][] =
      Array.isArray(P.tema.evita) && P.tema.evita.length
        ? P.tema.evita
        : [
            ['Avispero', 'avispa'],
            ['Piedra', 'piedra'],
          ];
    const unk: Shape = { r: 0.55, dc: '#cccccc', prims: [{ k: 'sph', s: [0.5, 0.5, 0.5], c: '$', f: '#fff3d6' }] };
    const mk = (n: [string, string, string?], bad: boolean): Kind => ({
      nombre: n[1],
      shape: shapeOf(n[1]) ?? unk,
      color: n[2],
      bad,
      name: n[0],
    });
    return [...cosas.slice(0, 5).map((c) => mk(c, false)), ...evita.slice(0, 2).map((c) => mk(c, true))];
  }, [P]);
  const slots = useMemo<Slot[]>(() => {
    const out: Slot[] = [],
      hf = (): Half => ({ x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0 });
    kinds.forEach((k, ti) => {
      for (let i = 0; i < (k.bad ? 3 : 4); i++)
        out.push({
          type: ti,
          g: null,
          gw: null,
          gl: null,
          gr: null,
          on: false,
          cut: false,
          x: 0,
          y: -9,
          vx: 0,
          vy: 0,
          r: 0,
          vr: 0,
          l: hf(),
          rr: hf(),
          t: 0,
          bad: k.bad,
          w: 0,
        });
    });
    return out;
  }, [kinds]);
  const st = useRef({
    t: 0,
    next: 1.2,
    score: 0,
    combo: 0,
    best: 0,
    cuts: 0,
    miss: 0,
    evita: 0,
    swing: 9,
    shake: 0,
    flash: 0,
    bot: 1.5,
    toast: 14,
    lx: 0,
    ly: 0,
    cx: 0,
    cy: 3,
    mult: 1,
  });
  const [mult, setMult] = useState(1);
  const cam = useMemo(() => {
    const c = new THREE.PerspectiveCamera(FOV, 1.78, 0.1, 100);
    c.position.set(...CAM_POS);
    c.lookAt(...CAM_TGT);
    c.updateMatrixWorld();
    return c;
  }, []);
  const toWorld = (px: number, py: number): [number, number] => {
    // puntero (−1..1) → plano z = 0
    cam.aspect = size.width / size.height;
    cam.updateProjectionMatrix();
    const a = new THREE.Vector3(px, py, 0.5).unproject(cam),
      d = a.sub(cam.position),
      k = -cam.position.z / d.z;
    return [cam.position.x + d.x * k, cam.position.y + d.y * k];
  };
  const wRef = useRef<THREE.Group>(null),
    slash = useRef<THREE.Mesh>(null),
    flashM = useRef<THREE.Mesh>(null);
  const bots = useMemo(
    () =>
      Array.from({ length: P.modo === 'abierto' ? 3 : 1 }, (_, i) => ({
        s: newState('idle') as AvatarState,
        t: 0.6 + i,
      })),
    [P],
  );
  const botPos: V3[] = [
    [4.8, 0, 3.4],
    [-1.2, 0, 4.4],
    [2.4, 0, 4.6],
  ];

  useLayoutEffect(() => {
    player.control = false;
    player.fixedCam = { pos: [...CAM_POS], target: [...CAM_TGT], fov: FOV };
    const w = window as any;
    w.__mcTest = {
      ...w.__mcTest,
      corte: {
        slots,
        kinds,
        st: st.current,
        toNdc: (x: number, y: number) => {
          cam.aspect = size.width / size.height;
          cam.updateProjectionMatrix();
          const v = new THREE.Vector3(x, y, 0).project(cam);
          return [v.x, v.y];
        },
        warp: (s: number) => {
          st.current.t += s;
        },
        dur: durOf(P),
      },
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useTick((dt) => {
    player.visible = true;
    const a = player.fixedCam;
    if (a) {
      const k = st.current.shake;
      a.pos[0] = CAM_POS[0] + (k > 0 ? (Math.random() - 0.5) * k * 0.4 : 0);
      a.pos[1] = CAM_POS[1] + (k > 0 ? (Math.random() - 0.5) * k * 0.3 : 0);
    }
    st.current.shake = Math.max(0, st.current.shake - dt * 3);
    st.current.flash = Math.max(0, st.current.flash - dt * 3);
    if (flashM.current) (flashM.current.material as THREE.MeshBasicMaterial).opacity = st.current.flash * 0.35;
    bots.forEach((b) => {
      b.t -= dt;
      if (b.t < 0) b.s.anim = 'idle';
    });
  });

  const cutSlot = (s: Slot, x: number, y: number, byBot = false) => {
    const S = st.current,
      k = kinds[s.type];
    s.cut = true;
    s.t = 0;
    s.l = { x: s.x - 0.12, y: s.y, vx: s.vx - 2.4 - Math.random(), vy: s.vy + 1.5, r: s.r, vr: -3 - Math.random() * 2 };
    s.rr = { x: s.x + 0.12, y: s.y, vx: s.vx + 2.4 + Math.random(), vy: s.vy + 1.5, r: s.r, vr: 3 + Math.random() * 2 };
    if (k.bad) {
      S.score = Math.max(0, S.score - 40);
      S.combo = 0;
      S.evita++;
      S.shake = 1.2;
      S.flash = 1;
      audio.sfx('miss');
      fx.emit(s.x, s.y, 0.3, '#e63946', 16, 5, 3);
      fx.emit(s.x, s.y, 0.3, '#2b2b2b', 8, 4, 3);
      useGame.getState().toast(`¡Ay! Eso era ${k.name.toLowerCase()}: −40`, '⚠️');
    } else {
      S.combo++;
      S.cuts++;
      S.best = Math.max(S.best, S.combo);
      const m = Math.min(5, 1 + Math.floor(S.combo / 4)),
        add = 10 * m + (byBot ? 0 : 0);
      S.score += add;
      S.mult = m;
      if (m !== mult) setMult(m);
      audio.sfx(S.combo % 4 === 0 ? 'star' : 'hit');
      fx.emit(s.x, s.y, 0.3, k.shape.prims.find((p) => p.f)?.f ?? '#fff', 12, 4.5, 3);
      fx.emit(s.x, s.y, 0.3, '#ffffff', 4, 3, 2, 0.7);
    }
    if (!byBot) {
      player.play('throw', 0.3);
      S.swing = 0;
      S.cx = x;
      S.cy = y;
    }
  };

  useMgTick((dt) => {
    const S = st.current,
      dif = P.dif,
      dur = durOf(P),
      g = 11 + 5 * dif;
    S.t += dt;
    const [wx, wy] = toWorld(input.px, input.py),
      sp = Math.hypot(wx - S.lx, wy - S.ly) / Math.max(dt, 0.001);
    S.lx = S.cx = wx;
    S.ly = S.cy = wy;
    const swipe = input.pointerDown && sp > 9,
      fire = input.take('fire');
    if (fire) S.swing = 0;
    else S.swing += dt;
    // spawn
    if (S.t < dur - 2.5 && S.t >= S.next) {
      const n = R() < 0.2 + 0.5 * dif ? (R() < 0.35 ? 3 : 2) : 1;
      for (let j = 0; j < n; j++) {
        const bad = R() < 0.14 + 0.2 * dif,
          cand = slots.filter((s) => !s.on && s.bad === bad);
        if (!cand.length) continue;
        const s = cand[Math.floor(R() * cand.length)],
          x0 = (R() * 2 - 1) * 4.2,
          h = 4.4 + R() * 2.6,
          vy = Math.sqrt(2 * g * h),
          T = (2 * vy) / g,
          x1 = Math.max(-4.8, Math.min(4.8, x0 + (R() * 2 - 1) * 2.4));
        Object.assign(s, {
          on: true,
          cut: false,
          x: x0,
          y: -0.4,
          vx: (x1 - x0) / T,
          vy,
          r: R() * 6,
          vr: (R() - 0.5) * (3 + 3 * dif),
          t: 0,
        });
      }
      S.next = S.t + Math.max(0.5, 1.15 - 0.6 * dif) * (0.75 + R() * 0.5);
    }
    // física
    for (const s of slots) {
      if (!s.on) continue;
      if (!s.cut) {
        s.vy -= g * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.r += s.vr * dt;
        if (kinds[s.type].nombre === 'avispa') s.x += Math.sin(S.t * 9 + s.type) * 0.02;
        const rad = kinds[s.type].shape.r * 1.45 + 0.4;
        if ((fire || swipe) && Math.hypot(s.x - wx, s.y - wy) < rad + (fire ? 0.35 : 0)) cutSlot(s, wx, wy);
        else if (s.y < -0.6 && s.vy < 0) {
          s.on = false;
          if (!s.bad) {
            if (S.combo >= 3) useGame.getState().toast('¡Se te fue una!', '💨');
            S.combo = 0;
            S.miss++;
            S.mult = 1;
            if (mult !== 1) setMult(1);
          }
        }
      } else {
        s.t += dt;
        for (const h of [s.l, s.rr]) {
          h.vy -= g * dt;
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          h.r += h.vr * dt;
        }
        if (s.t > 1.6 || s.l.y < -2) s.on = false;
      }
    }
    // compa / bots
    if (P.modo === 'duo') {
      S.bot -= dt;
      if (S.bot < 0) {
        S.bot = 1.6 - 0.4 * dif;
        const c = slots
          .filter((s) => s.on && !s.cut && !s.bad && s.y > 1.2 && s.vy < 2 && s.x > 0.5)
          .sort((a, b) => b.x - a.x)[0];
        if (c) {
          cutSlot(c, c.x, c.y, true);
          bots[0].s.anim = 'throw';
          bots[0].t = 0.3;
          S.score += 0;
        }
      }
    } else
      bots.forEach((b, i) => {
        if (Math.random() < dt * 0.5) {
          b.s.anim = i % 2 ? 'throw' : 'kick';
          b.t = 0.35;
        }
      });
    // frases del tema
    const fr = frasesDe(P);
    S.toast -= dt;
    if (fr.length && S.toast < 0) {
      S.toast = 18;
      useGame.getState().toast(fr[Math.floor(R() * fr.length)], '🗣️');
    }
    // arma
    const w = wRef.current;
    if (w) {
      const q = Math.min(1, S.swing / 0.22),
        ang =
          S.swing < 0.22 ? -0.7 + 1.9 * (1 - (1 - q) * (1 - q)) : -0.7 + 1.2 * Math.max(0, 1 - (S.swing - 0.22) * 4);
      w.position.set(wx, wy, 1.2);
      w.rotation.z = ang;
      w.visible = true;
    }
    if (slash.current) {
      const a = Math.max(0, 1 - S.swing * 6);
      slash.current.visible = a > 0;
      (slash.current.material as THREE.MeshBasicMaterial).opacity = a;
      slash.current.position.set(S.cx, S.cy, 1);
      slash.current.rotation.z = 0.6;
      slash.current.scale.set(2.4 + (1 - a) * 2, 0.16 * a + 0.02, 1);
    }
    // pizarra
    const meta = metasOf(P);
    setHud({
      timer: Math.max(0, dur - S.t),
      score: `${S.score} pts`,
      objective: `Meta ${meta[0]} pts · Combo ×${S.mult}${S.combo > 3 ? ` (${S.combo} seguidos)` : ''}`,
      lines: [
        `Cortadas ${S.cuts} · Falladas ${S.miss} · Evitá ${S.evita}`,
        'Clic / F / 🎯 para cortar · arrastrá rápido para varias',
      ],
    });
    if (S.t >= dur) {
      const won = S.score >= meta[0];
      if (won) player.play('celebrate', 3);
      end({
        won,
        stars: starsOf(S.score, meta),
        score: S.score,
        label: `${S.score} pts`,
        stats: { cuts: S.cuts, combo: S.best },
      });
    }
  });
  void fmtTime;

  // pose de las piezas (cada cuadro)
  useTick(() => {
    for (const s of slots) {
      if (!s.g) continue;
      s.g.visible = s.on;
      if (!s.on) continue;
      if (s.gw) {
        s.gw.visible = !s.cut;
        s.gw.position.set(s.x, s.y, 0);
        s.gw.rotation.z = s.r;
        s.gw.scale.setScalar(1.45);
      }
      for (const [gg, h] of [
        [s.gl, s.l],
        [s.gr, s.rr],
      ] as const)
        if (gg) {
          gg.visible = s.cut;
          gg.position.set(h.x, h.y, 0);
          gg.rotation.z = h.r;
          gg.scale.setScalar(1.45);
        }
    }
  });

  return (
    <>
      <Escenario fondo={fondo} deck={false} />
      <Spawn pos={PLAYER} yaw={-0.7} />
      <Block pos={[0, 0.5, 1.4]} size={[15, 1.0, 1.2]} color="#a8742f" mat="wood" solid={false} />
      <Block pos={[0, 1.04, 1.4]} size={[15.4, 0.1, 1.5]} color="#c9954f" mat="wood" solid={false} />
      {[-6.8, -3.4, 0, 3.4, 6.8].map((x) => (
        <Block key={x} pos={[x, 0.5, 2.05]} size={[0.5, 1.0, 0.12]} color="#8b5a25" mat="wood" solid={false} />
      ))}
      {slots.map((s, i) => {
        const k = kinds[s.type];
        return (
          <group
            key={i}
            ref={(g) => {
              s.g = g;
            }}
            visible={false}
          >
            <group
              ref={(g) => {
                s.gw = g;
              }}
            >
              <ShapeMesh shape={k.shape} color={k.color} half={0} />
              {!shapeOf(k.nombre) && <Label pos={[0, 0.75, 0.4]} text={k.name} h={0.32} />}
            </group>
            <group
              ref={(g) => {
                s.gl = g;
              }}
              visible={false}
            >
              <ShapeMesh shape={k.shape} color={k.color} half={-1} />
            </group>
            <group
              ref={(g) => {
                s.gr = g;
              }}
              visible={false}
            >
              <ShapeMesh shape={k.shape} color={k.color} half={1} />
            </group>
          </group>
        );
      })}
      <group ref={wRef} visible={false}>
        <group rotation-z={0.1} position={[0, -0.9, 0]} scale={0.85}>
          <Arma tipo={arma} />
        </group>
      </group>
      <mesh ref={slash} visible={false}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0} depthTest={false} />
      </mesh>
      <mesh ref={flashM} position={[0, 3, 7]}>
        <planeGeometry args={[30, 20]} />
        <meshBasicMaterial color="#ff2a2a" transparent opacity={0} depthTest={false} />
      </mesh>
      {fx.node}
      {mult > 1 && <Label pos={[0, 6.9, 0]} text={`¡COMBO ×${mult}!`} h={0.8} fg="#ffd23f" />}
      {bots.map((b, i) => (
        <BotAvatar key={i} i={i} state={b.s} pos={botPos[i]} yaw={0.7 - i * 0.5} compa={P.modo === 'duo'} />
      ))}
      {nBots(P.modo) < 0 && null}
    </>
  );
}
