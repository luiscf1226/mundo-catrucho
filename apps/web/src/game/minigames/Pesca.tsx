// MOTOR 'pesca' — «La pesca». Mantené para cargar el tiro y soltá para lanzar; esperá la picada, enganchá a tiempo
// y recogé el pez con la barra de tensión (mantené para jalar, soltá cuando se pone roja).

import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../core/audio';
import { input } from '../../core/input';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import { art, Ball, Block, Cyl, Label, P, Spawn, useMgTick, useTick } from '../kit';
import { finish, type Guia, type Partida, partida, rng, setHud, starsFor } from './api';
import { type BotS, BotView, conTema, Fx, faceTo, fx, makeBots, useHold } from './atrapa/comun';
import { Basura, Pez, Plat } from './pesca/pez';

type PezT = [string, number, string?];
const PECES: PezT[] = [
  ['Sardina', 10, '#cfd8dc'],
  ['Guapote', 20, '#6d9e5f'],
  ['Tilapia', 30, '#e57373'],
  ['Bagre', 45, '#8d6e63'],
  ['Róbalo', 70, '#fbc02d'],
];
const BASURA = ['Bota vieja', 'Llanta', 'Lata oxidada', 'Chancleta mojada'];
const AGUA: Record<string, { c: string; time: 'dia' | 'tarde'; weather?: 'neblina' }> = {
  lago: { c: '#3f93b8', time: 'dia' },
  mar: { c: '#1f78c1', time: 'tarde' },
  rio: { c: '#4b9a86', time: 'dia' },
  laguna: { c: '#5aa6a0', time: 'tarde', weather: 'neblina' },
};
const PZ: Record<string, number> = { muelle: 0.3, lancha: 1.3, cayuco: 1.5, orilla: 0.6 };
const SEG = (dif: number) => Math.round(85 + 15 * dif);
const normPeces = (t: Record<string, any>): PezT[] =>
  (Array.isArray(t.peces) && t.peces.length ? [...(t.peces as PezT[])] : PECES).sort((a, b) => a[1] - b[1]);
const metasDe = (t: Record<string, any>, dif: number): [number, number, number] => {
  const l = normPeces(t),
    avg = l.reduce((a, p) => a + p[1], 0) / l.length,
    k = 1 + 0.3 * dif,
    r = (n: number) => Math.max(30, Math.round((avg * n * k) / 5) * 5);
  return [r(3), r(6), r(9)];
};
const BAD = 0.8,
  YEL = 0.62; // tensión: amarillo desde YEL, rojo desde BAD, se rompe en 1

export const guia: Guia = {
  goal: 'Mantené para cargar el tiro, soltá para lanzar, enganchá cuando la boya se hunda y recogé el pez sin que se rompa la línea.',
  keys: [
    ['F o clic (mantener)', 'cargar el tiro / jalar el pez'],
    ['Soltar', 'lanzar / aflojar la línea'],
    ['F al picar', 'enganchar'],
    ['A / D', 'apuntar'],
  ],
  touch: [
    ['Mantené la pantalla o 🎯', 'cargar, lanzar y jalar'],
    ['Toque al picar', 'enganchar'],
    ['Palanca', 'apuntar'],
  ],
  metas: (p) => metasDe(p.tema, p.dif).map((n) => `${n} pts`) as [string, string, string],
};

type Fase = 'idle' | 'carga' | 'vuelo' | 'espera' | 'pica' | 'jala' | 'sale';
interface Rival {
  b: BotS;
  tx: number;
  tz: number;
  t: number;
  score: number;
  equipo: boolean;
  salto: number;
}

function Hilo({ get }: { get: () => [number, number, number, number, number, number] }) {
  const g = useRef<THREE.Group>(null);
  useTick(() => {
    const o = g.current,
      a = get();
    if (!o) return;
    o.position.set(a[0], a[1], a[2]);
    o.lookAt(a[3], a[4], a[5]);
    o.scale.set(1, 1, Math.max(0.01, Math.hypot(a[3] - a[0], a[4] - a[1], a[5] - a[2])));
  });
  return (
    <group ref={g}>
      <mesh position={[0, 0, 0.5]}>
        <boxGeometry args={[0.02, 0.02, 1]} />
        <meshBasicMaterial color="#f5f5f0" />
      </mesh>
    </group>
  );
}
const Cana = () => (
  <Cyl pos={[0, 1.15, 0]} r={0.03} rTop={0.012} h={2.3} color="#5a3b1f" mat="wood" solid={false} cast={false} />
);
function Boya({ pos }: { pos?: [number, number, number] }) {
  return (
    <group position={pos}>
      <Ball pos={[0, 0, 0]} r={0.13} color="#f5f5f5" cast={false} />
      <Ball pos={[0, 0.07, 0]} r={0.1} color="#e53935" cast={false} />
    </group>
  );
}
function RivalView({ r, y0 }: { r: Rival; y0: number }) {
  const bob = useRef<THREE.Group>(null);
  const tip = (): [number, number, number] => [r.b.x + 0.3, r.b.y + 1.1 + 1.24, r.b.z - 1.94];
  useTick((_, t) => {
    if (bob.current) bob.current.position.set(r.tx, y0 + Math.sin(t * 2 + r.tx) * 0.03, r.tz);
  });
  return (
    <>
      <BotView b={r.b} />
      <group position={[r.b.x + 0.3, r.b.y + 1.1, r.b.z - 0.2]} rotation-x={-1.0}>
        <Cana />
      </group>
      <Hilo
        get={() => {
          const a = tip();
          return [a[0], a[1], a[2], r.tx, y0, r.tz];
        }}
      />
      <group ref={bob}>
        <Boya />
      </group>
    </>
  );
}

export function Pesca() {
  const P0 = useMemo<Partida>(() => conTema('pesca', partida()), []),
    T = P0.tema;
  const avatar = useGame((g) => g.profile.avatar),
    size = useThree((t) => t.size);
  const agua = (AGUA[T.agua] ? T.agua : 'lago') as string,
    desde = (PZ[T.desde] !== undefined ? T.desde : 'muelle') as string,
    ag = AGUA[agua];
  const peces = useMemo(() => normPeces(T), [T]);
  const basura: string[] = Array.isArray(T.basura) && T.basura.length ? T.basura : BASURA;
  const meta = useMemo(() => metasDe(T, P0.dif), [T, P0]),
    dur = SEG(P0.dif),
    pz = PZ[desde];
  const rnd = useMemo(() => rng(P0.seed), [P0]);
  const [, draw] = useState(0);
  const hold = useHold();
  const K = input.touch ? '🎯' : 'F';

  const rivals = useMemo(() => {
    const n = P0.modo === 'duo' ? 1 : P0.modo === 'abierto' ? 3 : 0;
    const spots: [number, number][] =
      P0.modo === 'duo'
        ? [[desde === 'cayuco' ? 2.1 : desde === 'lancha' ? 0.75 : 1.2, desde === 'lancha' ? -0.6 : pz]]
        : [
            [-5, -0.4],
            [5.4, -1.1],
            [-9, -2.6],
          ];
    return makeBots(avatar, n, P0.seed).map((b, i): Rival => {
      const [x, z] = spots[i % spots.length];
      b.x = x;
      b.z = z;
      if (P0.modo === 'duo') b.name = '🤖 Compa';
      return {
        b,
        tx: x + (rnd() - 0.5) * 3,
        tz: z - 6 - rnd() * 6,
        t: 5 + rnd() * 6,
        score: 0,
        equipo: P0.modo === 'duo',
        salto: 0,
      };
    });
  }, [P0, avatar, desde, pz, rnd]);

  const s = useRef({
    fase: 'idle' as Fase,
    t: dur,
    score: 0,
    racha: 0,
    n: 0,
    basura: 0,
    perdidos: 0,
    mejor: 0,
    equipo: 0,
    carga: 0,
    dir: 1,
    aim: 0,
    cx: 0,
    cz: -8,
    u: 0,
    espera: 0,
    ventana: 0,
    pez: null as null | { n: string; p: number; c: string; f: number; junk: boolean },
    dist: 1,
    reelT: 0,
    tension: 0,
    calma: 1.5,
    aviso: 0,
    tiron: 0,
    lock: false,
    prev: false,
    msg: '',
    shown: '',
    sale: 0,
    show: null as null | { n: string; p: number; c: string; junk: boolean },
    frase: 20,
    done: false,
    ripple: { x: 0, z: 0, age: 9 },
    tip: [0, 0, 0] as [number, number, number],
    bob: [0, 0, 0] as [number, number, number],
    fishP: [0, 0, 0] as [number, number, number],
    t0: 0,
    prevFase: 'idle' as Fase,
  }).current;

  const refs = {
    rod: useRef<THREE.Group>(null),
    bob: useRef<THREE.Group>(null),
    under: useRef<THREE.Group>(null),
    gauge: useRef<THREE.Group>(null),
    ind: useRef<THREE.Mesh>(null),
    dist: useRef<THREE.Group>(null),
    pow: useRef<THREE.Group>(null),
    powFill: useRef<THREE.Group>(null),
    tens: useRef<THREE.Group>(null),
    ring: useRef<THREE.Mesh>(null),
    ripple: useRef<THREE.Mesh>(null),
    trophy: useRef<THREE.Group>(null),
  };
  const cam = useMemo(
    () => ({
      pos: [2.6, 3.3, pz + 4.3] as [number, number, number],
      target: [0, 0.9, pz - 5] as [number, number, number],
      fov: 58,
    }),
    [pz],
  );

  const eligePez = (carga: number) => {
    if (rnd() < 0.12 + 0.04 * P0.dif) {
      const n = basura[Math.floor(rnd() * basura.length)];
      return { n, p: 0, c: '#777', f: 0.04, junk: true };
    }
    const w = peces.map((_, i) => Math.exp(-((Math.abs(i / Math.max(1, peces.length - 1) - carga) * 2.2) ** 2)));
    let r = rnd() * w.reduce((a, b) => a + b, 0),
      i = 0;
    while (i < w.length - 1 && (r -= w[i]) > 0) i++;
    const f = peces[i];
    return {
      n: f[0],
      p: f[1],
      c: f[2] ?? '#90a4ae',
      f:
        peces.length > 1
          ? 0.15 + (0.85 * (f[1] - peces[0][1])) / Math.max(1, peces[peces.length - 1][1] - peces[0][1])
          : 0.5,
      junk: false,
    };
  };
  const splash = (x: number, z: number, n = 14) => {
    fx.emit(x, -0.35, z, '#e6f7ff', n, 2.6, 0.09, 3.6);
    s.ripple.x = x;
    s.ripple.z = z;
    s.ripple.age = 0;
  };
  const termina = (msg: string, castigo = 0) => {
    s.fase = 'idle';
    s.msg = msg;
    s.lock = true;
    s.t -= castigo;
    s.racha = 0;
  };

  useEffect(() => {
    player.teleport(0, 0, pz, 0);
    player.control = false;
    player.fixedCam = cam;
    player.camYaw = 0;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    w.__mcTest = {
      ...w.__mcTest,
      pesca: {
        state: () => ({
          fase: s.fase,
          t: s.t,
          score: s.score,
          n: s.n,
          basura: s.basura,
          perdidos: s.perdidos,
          tension: s.tension,
          aviso: s.aviso > 0,
          tiron: s.tiron > 0,
          dist: s.dist,
          pez: s.pez,
          meta,
          modo: P0.modo,
          agua,
          desde,
          racha: s.racha,
          rivales: rivals.map((r) => ({ n: r.b.name, score: r.score })),
        }),
        ...(location.hash.includes('test')
          ? {
              skip: (n: number) => {
                s.t = Math.max(0, s.t - n);
              },
            }
          : {}),
      },
    };
    return () => {
      player.control = true;
      player.fixedCam = null;
      if (w.__mcTest) delete w.__mcTest.pesca;
    };
  }, [s, cam, pz, meta, P0, agua, desde, rivals]);

  // ------------------------------------------------------------ lógica
  useMgTick((dt) => {
    const held = hold(),
      edge = held && !s.prev;
    s.prev = held;
    s.t -= dt;
    s.frase -= dt;
    if (s.lock && !held) s.lock = false;
    if (s.frase <= 0) {
      s.frase = 22 + rnd() * 10;
      const f = T.frases;
      if (Array.isArray(f) && f.length) useGame.getState().toast(String(f[Math.floor(rnd() * f.length)]), '💬');
    }
    if (s.fase === 'idle' || s.fase === 'carga') s.aim = Math.max(-7.5, Math.min(7.5, s.aim + input.mx * 6 * dt));
    switch (s.fase) {
      case 'idle':
        s.msg = `Mantené ${K} para cargar el tiro`;
        if (held && !s.lock) {
          s.fase = 'carga';
          s.carga = 0;
          s.dir = 1;
          audio.sfx('click');
        }
        break;
      case 'carga':
        s.carga += (s.dir * dt) / 1.25;
        if (s.carga >= 1) {
          s.carga = 1;
          s.dir = -1;
        } else if (s.carga <= 0) {
          s.carga = 0;
          s.dir = 1;
        }
        s.msg = 'Soltá para lanzar · A / D apunta';
        if (!held) {
          const d = 3.5 + 13 * s.carga;
          s.cx = s.aim;
          s.cz = pz - d;
          s.u = 0;
          s.fase = 'vuelo';
          s.t0 = 0;
          s.pez = eligePez(s.carga);
          s.espera = 1.2 + rnd() * 2.6 - 0.5 * P0.dif;
          player.play('throw', 0.6);
          audio.sfx('throw');
        }
        break;
      case 'vuelo':
        s.u += dt / 0.7;
        s.msg = '';
        if (s.u >= 1) {
          s.fase = 'espera';
          splash(s.cx, s.cz);
          audio.sfx('splash');
        }
        break;
      case 'espera':
        s.msg = 'Esperá la picada…';
        s.espera -= dt;
        if (edge) {
          termina('¡Muy pronto! Se asustó el pez', 1);
          break;
        }
        if (s.espera <= 0) {
          s.fase = 'pica';
          s.ventana = 1.05 - 0.5 * P0.dif;
          splash(s.cx, s.cz, 10);
          audio.sfx('hit');
          audio.tone(880, 0.12, { type: 'square', gain: 0.1 });
        }
        break;
      case 'pica':
        s.msg = `¡PICÓ! ¡${K} ya!`;
        s.ventana -= dt;
        if (edge) {
          s.fase = 'jala';
          s.reelT = 0;
          s.dist = 0.55 + 0.45 * s.carga;
          s.tension = 0.3;
          s.calma = 0.9 + rnd();
          s.aviso = 0;
          s.tiron = 0;
          audio.sfx('pickup');
          splash(s.cx, s.cz, 18);
          break;
        }
        if (s.ventana <= 0) {
          termina('Se comió la carnada y se fue', 0.5);
          useGame.getState().toast('Tardaste en enganchar', '🐟');
          s.perdidos++;
        }
        break;
      case 'jala': {
        const pez = s.pez!,
          f = pez.f;
        if (!pez.junk) {
          if (s.aviso > 0) {
            s.aviso -= dt;
            if (s.aviso <= 0) {
              s.tiron = 0.55 + 0.25 * f;
              audio.sfx('hit');
            }
          } else if (s.tiron > 0) {
            s.tiron -= dt;
            if (s.tiron <= 0) s.calma = 1.5 + (1 - f) * 1.5 + rnd() * 0.8 - 0.4 * P0.dif;
          } else {
            s.calma -= dt;
            if (s.calma <= 0) {
              s.aviso = 0.42;
              if (rnd() < 0.5) audio.tone(220, 0.15, { type: 'sawtooth', gain: 0.08 });
            }
          }
        }
        const tiron = s.tiron > 0;
        s.reelT += dt;
        if (held) {
          s.dist -= (0.27 - 0.08 * f) * dt;
          s.tension += (tiron ? 1.15 + 0.8 * f + 0.4 * P0.dif : pez.junk ? 0.25 : 0.4 + 0.2 * f) * dt;
        } else {
          s.tension -= 1.0 * dt;
          s.dist += (tiron ? 0.05 + 0.14 * f : 0.03) * dt;
        }
        s.tension = Math.max(0, s.tension);
        s.msg = pez.junk
          ? 'Pesa… ¡jalá!'
          : s.aviso > 0
            ? '¡Cuidado, viene el tirón!'
            : tiron
              ? '¡Soltá!'
              : s.tension >= BAD
                ? '¡Soltá!'
                : 'Mantené para jalar';
        player.play('carry', 0.15);
        if (Math.random() < dt * 5) splash(s.fishP[0], s.fishP[2], 4);
        if (s.tension >= 1) {
          s.perdidos++;
          audio.sfx('error');
          termina('¡Se rompió la línea!', 1.5);
          useGame.getState().toast('Se rompió la línea · soltá cuando se ponga roja', '💥');
          fx.emit(s.tip[0], s.tip[1], s.tip[2], '#ffffff', 8, 2);
        } else if (s.dist >= 1.3 || s.reelT > 32) {
          s.perdidos++;
          audio.sfx('miss');
          termina('Se soltó el pez', 1);
          useGame.getState().toast('Se soltó · jalá más seguido', '🐟');
        } else if (s.dist <= 0) {
          s.fase = 'sale';
          s.sale = 2.3;
          s.lock = true;
          if (pez.junk) {
            s.basura++;
            s.racha = 0;
            audio.sfx('lose');
            s.msg = pez.n;
            useGame
              .getState()
              .toast(
                /bota|zapato|chancle/i.test(pez.n)
                  ? '¡Una bota! Alguien anda descalzo'
                  : /llanta/i.test(pez.n)
                    ? 'Una llanta… sirve de salvavidas'
                    : `${pez.n}: eso no es pez`,
                '🥾',
              );
          } else {
            s.racha++;
            s.n++;
            const ganado = Math.round(pez.p * (1 + Math.min(0.5, (s.racha - 1) * 0.1)));
            s.score += ganado;
            s.mejor = Math.max(s.mejor, pez.p);
            audio.sfx('coin');
            audio.sfx('star');
            fx.emit(player.pos[0], 2.2, pz - 0.5, pez.c, 22, 4, 0.1, 5);
            fx.pop(player.pos[0], 3.3, pz - 0.5, `+${ganado}`, '#ffd54f');
            s.msg = `${pez.n} · +${ganado}`;
            player.play('celebrate', 2.2);
          }
          s.show = { n: pez.n, p: pez.p, c: pez.c, junk: pez.junk };
          draw((n) => n + 1);
        }
        break;
      }
      case 'sale':
        s.sale -= dt;
        if (s.sale <= 0) {
          s.fase = 'idle';
          s.show = null;
          draw((n) => n + 1);
        }
        break;
    }
    // rivales
    for (const r of rivals) {
      r.t -= dt;
      if (r.salto > 0) {
        r.salto -= dt;
        if (r.salto <= 0) {
          r.b.st.anim = 'idle';
        }
      }
      if (r.t <= 0) {
        r.t = 8 + rnd() * 7 - 3 * P0.dif;
        const f = peces[Math.floor(rnd() * peces.length)];
        if (rnd() < 0.25) {
          fx.pop(r.b.x, 2.6, r.b.z, '🥾', '#ffffff');
        } else {
          r.score += f[1];
          if (r.equipo) {
            s.equipo += Math.round(f[1] / 2);
            s.score += Math.round(f[1] / 2);
          }
          fx.pop(r.b.x, 2.6, r.b.z, `${f[0]} +${f[1]}`, '#9be37a');
          splash(r.tx, r.tz, 8);
          r.b.st.anim = 'celebrate';
          r.salto = 1.2;
          r.b.yaw = faceTo(r.tx - r.b.x, r.tz - r.b.z);
        }
      } else if (r.salto <= 0) r.b.yaw = faceTo(r.tx - r.b.x, r.tz - r.b.z);
    }
    const sig = meta.find((m) => s.score < m) ?? meta[2];
    setHud({
      timer: Math.ceil(Math.max(0, s.t)),
      score: `${s.score} pts`,
      objective: s.score >= meta[2] ? '¡Tres estrellas!' : `Meta: ${sig} pts`,
      lines: [
        `Pescados: ${s.n}${s.racha > 1 ? ` · racha x${s.racha}` : ''}`,
        ...rivals.map((r) => `${r.b.name}: ${r.score}`),
      ],
    });
    if (s.t <= 0 && !s.done) {
      s.done = true;
      finish({
        won: s.score >= meta[0],
        stars: starsFor(s.score, meta[0], meta[1], meta[2]),
        score: s.score,
        label: `${s.score} pts`,
        stats: { pescados: s.n, basura: s.basura, perdidos: s.perdidos, mejorPez: s.mejor },
      });
    }
    if (s.msg !== s.shown) {
      s.shown = s.msg;
      draw((n) => n + 1);
    }
  });

  // ------------------------------------------------------------ visuales (corren siempre)
  const camV = useMemo(() => new THREE.Vector3(...cam.pos), [cam]);
  useTick((dt, t) => {
    const px = player.pos[0],
      base = new THREE.Vector3(px + 0.32, 1.12, pz - 0.2);
    const bend = s.fase === 'jala' ? Math.min(0.5, s.tension * 0.45) : s.fase === 'carga' ? s.carga * 0.35 : 0;
    const th = -1.0 - bend,
      tipX = base.x,
      tipY = base.y + Math.cos(th) * 2.3,
      tipZ = base.z + Math.sin(th) * 2.3;
    s.tip = [tipX, tipY, tipZ];
    if (refs.rod.current) {
      refs.rod.current.position.copy(base);
      refs.rod.current.rotation.x = th;
    }
    // boya y pez
    const tx = s.cx,
      tz = s.cz;
    let bx = tipX,
      by = tipY - 1.0 + Math.sin(t * 2) * 0.03,
      bz = tipZ;
    const under = refs.under.current;
    if (under) under.visible = false;
    if (s.fase === 'vuelo') {
      const u = Math.min(1, s.u);
      bx = tipX + (tx - tipX) * u;
      bz = tipZ + (tz - tipZ) * u;
      by = tipY + (-0.45 - tipY) * u + Math.sin(Math.PI * u) * 2.6;
    } else if (s.fase === 'espera') {
      bx = tx;
      bz = tz;
      by = -0.45 + Math.sin(t * 2.2) * 0.04;
    } else if (s.fase === 'pica') {
      bx = tx + Math.sin(t * 40) * 0.05;
      bz = tz;
      by = -0.62 + Math.sin(t * 30) * 0.05;
    } else if (s.fase === 'jala') {
      const k = Math.max(0, Math.min(1.3, s.dist)),
        ex = px,
        ez = pz - 1.6,
        wob = (s.tiron > 0 || s.aviso > 0 ? 0.5 : 0.18) * Math.sin(t * (s.tiron > 0 ? 18 : 7));
      bx = ex + (tx - ex) * k + wob;
      bz = ez + (tz - ez) * k;
      by = -0.45 + (s.tiron > 0 ? Math.sin(t * 25) * 0.06 : 0);
      s.fishP = [bx, -0.5, bz];
      if (under && s.pez) {
        under.visible = true;
        under.position.set(bx, -0.38, bz);
        under.rotation.y = Math.PI / 2 + Math.sin(t * (s.tiron > 0 ? 22 : 8)) * 0.5;
        under.scale.setScalar(0.7 + 0.8 * s.pez.f);
      }
    }
    s.bob = [bx, by, bz];
    if (refs.bob.current) refs.bob.current.position.set(bx, by, bz);
    // anillo de puntería y ondas
    const ring = refs.ring.current;
    if (ring) {
      ring.visible = s.fase === 'carga';
      if (ring.visible) {
        const d = 3.5 + 13 * s.carga,
          k = 1 + Math.sin(t * 8) * 0.08;
        ring.position.set(s.aim, -0.43, pz - d);
        ring.scale.set(k, k, 1);
      }
    }
    const rp = refs.ripple.current;
    if (rp) {
      s.ripple.age += dt;
      const a = s.ripple.age;
      rp.visible = a < 1.1;
      if (rp.visible) {
        rp.position.set(s.ripple.x, -0.43, s.ripple.z);
        rp.scale.setScalar(0.3 + a * 2.2);
        (rp.material as THREE.MeshBasicMaterial).opacity = Math.max(0, 0.7 - a * 0.65);
      }
    }
    // trofeo en la mano
    if (refs.trophy.current) {
      refs.trophy.current.position.set(px + 0.1, 2.35 + Math.sin(t * 3) * 0.06, pz - 0.2);
      refs.trophy.current.rotation.y = t * 1.2;
    }
    // indicador 3D pegado a la cámara
    const g = refs.gauge.current;
    if (g) {
      const d = new THREE.Vector3(...cam.target).sub(camV).normalize(),
        right = new THREE.Vector3().crossVectors(d, new THREE.Vector3(0, 1, 0)).normalize();
      const halfH = 4.2 * Math.tan((cam.fov * Math.PI) / 360),
        off = Math.min(2.9, halfH * (size.width / Math.max(1, size.height)) * 0.78);
      g.position
        .copy(camV)
        .addScaledVector(d, 4.2)
        .addScaledVector(right, off)
        .add(new THREE.Vector3(0, 0.1, 0));
      g.lookAt(camV);
      const reel = s.fase === 'jala',
        charge = s.fase === 'carga';
      g.visible = reel || charge;
      if (refs.tens.current) refs.tens.current.visible = reel;
      if (refs.pow.current) refs.pow.current.visible = charge;
      if (refs.ind.current) refs.ind.current.position.y = -1.1 + 2.2 * Math.min(1, s.tension);
      if (refs.dist.current) refs.dist.current.scale.y = Math.max(0.001, 2.2 * Math.max(0, Math.min(1, 1 - s.dist)));
      if (refs.powFill.current) refs.powFill.current.scale.y = Math.max(0.001, 2.2 * s.carga);
    }
  });

  const fondo = <Fondo agua={agua} ag={ag} desde={desde} pz={pz} />;
  const rojo = s.fase === 'jala' && s.tension >= BAD;
  return (
    <>
      <art.SkyRig time={ag.time} weather={ag.weather ?? 'despejado'} shadowRadius={22} />
      <Spawn pos={[0, 0, pz]} />
      {fondo}
      <Fx />
      {rivals.map((r, i) => (
        <group key={i}>
          <Plat desde={desde} pos={[r.b.x, 0, r.b.z]} />
          {desde !== 'orilla' && null}
          <RivalView r={r} y0={-0.45} />
        </group>
      ))}
      {/* caña, hilo y boya del jugador */}
      <group ref={refs.rod}>
        <Cana />
      </group>
      <Hilo get={() => [s.tip[0], s.tip[1], s.tip[2], s.bob[0], s.bob[1] + 0.05, s.bob[2]]} />
      <group ref={refs.bob}>
        <Boya />
      </group>
      <group ref={refs.under} visible={false}>
        {s.pez && <Pez nombre={s.pez.junk ? '' : s.pez.n} color={s.pez.junk ? '#555' : s.pez.c} size={1} />}
      </group>
      <mesh ref={refs.ring} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.45, 0.62, 28]} />
        <meshBasicMaterial color="#fff59d" transparent opacity={0.85} depthWrite={false} />
      </mesh>
      <mesh ref={refs.ripple} rotation-x={-Math.PI / 2} visible={false}>
        <ringGeometry args={[0.8, 1, 28]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.6} depthWrite={false} />
      </mesh>
      {s.msg && s.fase !== 'vuelo' && (
        <Label
          pos={[player.pos[0], 3.0, pz]}
          text={s.msg}
          h={0.5}
          fg={s.fase === 'pica' || rojo ? '#ffd54f' : '#ffffff'}
        />
      )}
      {s.show && (
        <group ref={refs.trophy}>
          <group rotation-z={0.2}>
            {s.show.junk ? (
              <Basura nombre={s.show.n} />
            ) : (
              <Pez nombre={s.show.n} color={s.show.c} size={1.4 + s.show.p / 80} />
            )}
          </group>
          <Label
            pos={[0, 0.8, 0]}
            text={s.show.junk ? s.show.n : `${s.show.n} · ${s.show.p}`}
            h={0.4}
            fg={s.show.junk ? '#ffffff' : '#ffd54f'}
          />
        </group>
      )}
      {/* indicador 3D (barra de tensión / fuerza) */}
      <group ref={refs.gauge} visible={false}>
        <Block pos={[0, 0, -0.02]} size={[0.62, 2.55, 0.04]} color="#1c2430" solid={false} cast={false} />
        <group ref={refs.tens}>
          <Block
            pos={[0, -1.1 + 1.1 * YEL, 0]}
            size={[0.4, 2.2 * YEL, 0.03]}
            color="#43a047"
            mat="neon"
            solid={false}
            cast={false}
          />
          <Block
            pos={[0, -1.1 + (2.2 * (YEL + BAD)) / 2, 0]}
            size={[0.4, 2.2 * (BAD - YEL), 0.03]}
            color="#fbc02d"
            mat="neon"
            solid={false}
            cast={false}
          />
          <Block
            pos={[0, -1.1 + (2.2 * (BAD + 1)) / 2, 0]}
            size={[0.4, 2.2 * (1 - BAD), 0.03]}
            color="#e53935"
            mat="neon"
            solid={false}
            cast={false}
          />
          <mesh ref={refs.ind} position={[0, -1.1, 0.05]}>
            <boxGeometry args={[0.56, 0.09, 0.05]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <group position={[-0.5, -1.1, 0]}>
            <Block pos={[0, 1.1, -0.01]} size={[0.14, 2.2, 0.03]} color="#263238" solid={false} cast={false} />
            <group ref={refs.dist}>
              <Block pos={[0, 0.5, 0]} size={[0.14, 1, 0.04]} color="#4fc3f7" mat="neon" solid={false} cast={false} />
            </group>
          </group>
          <Label pos={[0, 1.55, 0]} text="Tensión" h={0.3} />
        </group>
        <group ref={refs.pow}>
          <Block pos={[0, 0, 0]} size={[0.4, 2.2, 0.03]} color="#37474f" solid={false} cast={false} />
          <group ref={refs.powFill} position={[0, -1.1, 0.03]}>
            <Block pos={[0, 0.5, 0]} size={[0.36, 1, 0.04]} color="#ffca28" mat="neon" solid={false} cast={false} />
          </group>
          <Label pos={[0, 1.55, 0]} text="Tiro" h={0.3} />
        </group>
      </group>
    </>
  );
}

// ------------------------------------------------------------ escenario
function Fondo({ agua, ag, desde, pz }: { agua: string; ag: { c: string }; desde: string; pz: number }) {
  const rio = agua === 'rio';
  return (
    <>
      <Block
        pos={[0, -0.5, -45]}
        size={[rio ? 26 : 160, 0.1, 130]}
        mat="water"
        color={ag.c}
        solid={false}
        cast={false}
      />
      {rio &&
        [-1, 1].map((k) => (
          <group key={k}>
            <Block
              pos={[k * 21, -0.25, -45]}
              size={[16, 0.6, 130]}
              mat="grass"
              color="#5f9a43"
              solid={false}
              cast={false}
            />
            {[2, -6, -14, -22, -30, -38].map((z, i) => (
              <P.Tree
                key={i}
                pos={[k * (16.5 + (i % 3) * 3), 0, z]}
                scale={1.2 + (i % 2) * 0.4}
                seed={i + (k > 0 ? 7 : 0)}
                solid={false}
              />
            ))}
          </group>
        ))}
      {agua === 'lago' && (
        <>
          <Block pos={[-5, 3, -62]} size={[80, 7, 8]} mat="grass" color="#4d7c59" solid={false} cast={false} />
          <Block pos={[22, 5.5, -70]} size={[56, 11, 8]} mat="grass" color="#6f9a6b" solid={false} cast={false} />
          <Block pos={[-34, 4.5, -66]} size={[40, 9, 8]} mat="grass" color="#5a8760" solid={false} cast={false} />
          {[-24, -14, -5, 6, 15, 25].map((x, i) => (
            <P.Pine key={i} pos={[x, 0, -38 - (i % 2) * 3]} scale={1.3} seed={i} solid={false} />
          ))}
        </>
      )}
      {agua === 'mar' && (
        <>
          <Block pos={[-18, -0.15, -32]} size={[10, 0.7, 7]} mat="sand" color="#ecd9a0" solid={false} cast={false} />
          {[
            [-21, -31],
            [-17, -33],
            [-15, -30],
          ].map(([x, z], i) => (
            <P.Palm key={i} pos={[x, 0.2, z]} scale={1.3} seed={i} solid={false} />
          ))}
          <P.Boat pos={[16, -0.45, -26]} rot={0.6} solid={false} />
          <P.Boat pos={[-6, -0.45, -44]} rot={-0.4} solid={false} />
        </>
      )}
      {agua === 'laguna' &&
        [
          [-14, -22],
          [12, -30],
          [-4, -40],
          [22, -18],
          [-26, -38],
        ].map(([x, z], i) => (
          <group key={i}>
            <Block pos={[x, -0.1, z]} size={[7, 0.9, 5]} mat="grass" color="#3f7a45" solid={false} cast={false} />
            <P.Tree pos={[x - 1, 0.3, z]} scale={1.5} seed={i} solid={false} />
            <P.Bush pos={[x + 2, 0.3, z + 1]} scale={1.6} seed={i + 3} solid={false} />
          </group>
        ))}
      {desde === 'orilla' && (
        <>
          <Block pos={[0, -0.2, pz + 4.5]} size={[26, 0.4, 10]} mat="grass" color="#6f9a4b" solid={false} />
          <Block pos={[0, -0.2, pz - 0.2]} size={[26, 0.44, 1.8]} mat="sand" color="#d9c58a" solid={false} />
          {[-3.5, 4.5, 8].map((x, i) => (
            <P.Rock key={i} pos={[x, 0, pz + 1 + i]} scale={0.8 + i * 0.2} seed={i} solid={false} />
          ))}
          {[-1.5, 2.2, 6.5].map((x, i) => (
            <Cyl
              key={i}
              pos={[x, 0.5, pz - 0.9 - (i % 2) * 0.4]}
              r={0.03}
              h={1.3}
              color="#6a994e"
              solid={false}
              cast={false}
            />
          ))}
        </>
      )}
      <Plat desde={desde} pos={[0, 0, desde === 'muelle' ? pz + 5.7 : pz]} big />
      {desde === 'muelle' && (
        <>
          <P.Lamp pos={[1.5, 0, pz + 4]} solid={false} />
          <P.Barrel pos={[-1.2, 0, pz + 3]} solid={false} />
          <P.Crate pos={[-1.1, 0, pz + 5]} solid={false} />
        </>
      )}
    </>
  );
}
