// MOTOR 'atrapa' — «Atrapalo». Te movés libre con un recipiente sobre la cabeza y atrapás lo que cae.
// Cada cosa avisa con su sombra en el suelo. Lo de `evita` resta y aturde. Rachas, doradas y ráfagas.
// Opciones del tema (Yoro): `poza` (lo atrapado va a una cubeta de `cupo` lugares y paga al vaciarla en la poza;
// lo de `evita` ocupa lugar en vez de aturdir), `tandas` (un relámpago marca dónde cae la tanda y cae con el
// trueno) y `cubetas: [a, b]` (dos cubetas de distinta capacidad que reciben por turnos en vez de la poza).

import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../core/audio';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import { Label, Spawn, useMgTick, useTick } from '../kit';
import { finish, type Guia, type Partida, partida, rng, setHud, starsFor } from './api';
import { type BotS, BotView, conTema, Escenario, Fx, faceTo, fondoDe, fx, makeBots } from './atrapa/comun';
import { Forma, Recipiente } from './atrapa/formas';

type Cosa = [string, string, string?];
const CAE: Cosa[] = [
  ['Mango', 'mango', '#f6a623'],
  ['Naranja', 'naranja', '#ff9800'],
  ['Fresa', 'fresa', '#e53935'],
  ['Coco', 'coco', '#6b4a2b'],
];
const EVITA: Cosa[] = [
  ['Piedra', 'piedra'],
  ['Rama seca', 'rama'],
  ['Avispa', 'avispa'],
];
const FX = { x: 8.6, z: 5.6 }; // media cancha
const DURACION = (dif: number) => Math.round(70 + 20 * dif);
/** con cubeta y poza (sin las dos cubetas) cada tanda llena y limpia paga doble: las metas suben un 30 % */
const conTandaDoble = (tema: Record<string, unknown>) => !!tema.poza && !Array.isArray(tema.cubetas);
const metas = (dif: number, tema: Record<string, unknown> = {}): [number, number, number] => {
  const k = conTandaDoble(tema) ? 1.3 : 1;
  // la última etapa trae más cosas y más rápido: la racha (×3) sube el puntaje de quien no las deja caer
  return [
    Math.round((k * (120 + 180 * dif)) / 10) * 10,
    Math.round((k * (300 + 300 * dif)) / 10) * 10,
    Math.round((k * (500 + 400 * dif)) / 10) * 10,
  ];
};

export const guia: Guia = {
  goal: 'Atrapá con tu recipiente lo que cae. La sombra en el suelo te dice dónde va a caer. Lo que no sirve te resta y te aturde.',
  keys: [
    ['WASD / flechas', 'moverte debajo de lo que cae'],
    ['Shift', 'correr'],
  ],
  touch: [['Palanca', 'moverte debajo de lo que cae']],
  metas: (p) => metas(p.dif, p.tema).map((n) => `${n} pts`) as [string, string, string],
};

/** dónde se vacía la cubeta: una poza o dos cubetas grandes en las esquinas de adelante */
const POZAS: [number, number][] = [
  [-FX.x + 1.4, FX.z - 1.3],
  [FX.x - 1.4, FX.z - 1.3],
];
const R_POZA = 1.35;
interface Item {
  id: number;
  x: number;
  z: number;
  y: number;
  v: number;
  kind: 'bueno' | 'oro' | 'malo';
  idx: number;
  spin: number;
  land: number;
}
interface Catcher {
  ign: Set<number>;
  b: BotS;
  score: number;
  tgt: Item | null;
  sp: number;
  skill: number;
  equipo: boolean;
}

export function Atrapa() {
  const P = useMemo<Partida>(() => conTema('atrapa', partida()), []);
  const avatar = useGame((g) => g.profile.avatar);
  const cae: Cosa[] = (Array.isArray(P.tema.cae) && P.tema.cae.length ? P.tema.cae : CAE) as Cosa[];
  const evita: Cosa[] = (Array.isArray(P.tema.evita) ? P.tema.evita : EVITA) as Cosa[];
  const con: string = P.tema.con ?? 'canasta';
  const fondo = fondoDe(P, 'finca');
  const storm = cae.some((c) => c[1] === 'pez');
  const cubetas = Array.isArray(P.tema.cubetas) ? (P.tema.cubetas as number[]).slice(0, 2).map(Number) : null;
  const poza = !!P.tema.poza || !!cubetas,
    tandas = !!P.tema.tandas,
    cupo = Math.max(2, Number(P.tema.cupo) || 6),
    turnoDura = 9 - 3 * P.dif;
  const meta = useMemo(() => metas(P.dif, P.tema), [P]),
    dur = DURACION(P.dif);
  const rnd = useMemo(() => rng(P.seed), [P]);
  const [, draw] = useState(0);
  const cont = useRef<THREE.Group>(null),
    pop = useRef(0);
  const bots = useMemo(() => {
    const n = P.modo === 'duo' ? 1 : P.modo === 'abierto' ? 3 : 0;
    return makeBots(avatar, n, P.seed).map((b, i): Catcher => {
      const ign = new Set<number>();
      b.x = -6 + i * 4;
      b.z = -2 + (i % 2) * 3;
      if (P.modo === 'duo') b.name = '🤖 Compa';
      return {
        ign,
        b,
        score: 0,
        tgt: null,
        sp: 3.4 + 1.6 * P.dif + i * 0.2,
        skill: 0.55 + 0.25 * P.dif + i * 0.05,
        equipo: P.modo === 'duo',
      };
    });
  }, [P, avatar]);
  const s = useRef({
    t: dur,
    score: 0,
    combo: 0,
    best: 0,
    atrapadas: 0,
    perdidas: 0,
    golpes: 0,
    doradas: 0,
    items: [] as Item[],
    spawn: 1.6,
    id: 0,
    ola: 12 + 6 * (1 - P.dif),
    burst: 0,
    stun: 0,
    frase: 14,
    done: false,
    elapsed: 0,
    equipo: 0,
    /** lo que va en la cubeta: 'bueno' | 'oro' | 'malo' */
    carga: [] as Item['kind'][],
    vaciadas: 0,
    completas: 0,
    llenas: 0,
    rebalses: 0,
    /** nivel de las dos cubetas, cuál recibe y cuánto le falta a su turno */
    nivel: [0, 0],
    turno: 0,
    reloj: 9 - 3 * P.dif,
    /** relámpago: dónde cae la tanda y cuánto falta para el trueno */
    rayo: null as null | { x: number; z: number; t: number },
    zona: null as null | { x: number; z: number },
    bot: false,
    aviso: 0,
  }).current;

  const mult = () => (s.combo >= 10 ? 3 : s.combo >= 5 ? 2 : 1);
  function suma(n: number, x: number, z: number, color: string, texto: string) {
    s.score = Math.max(0, s.score + n);
    fx.pop(x, 2.6, z, texto, color);
  }
  function crea(x: number, z: number) {
    const hayMalo = evita.length > 0,
      r = rnd();
    const kind: Item['kind'] = hayMalo && r < 0.12 + 0.16 * P.dif ? 'malo' : r > 0.93 ? 'oro' : 'bueno';
    const lista = kind === 'malo' ? evita : cae;
    s.items.push({
      id: s.id++,
      x,
      z,
      y: 10 + rnd() * 1.5,
      v: 3.8 + 3.2 * P.dif + rnd() * 1.2,
      kind,
      idx: Math.floor(rnd() * lista.length),
      spin: rnd() * 6,
      land: 0,
    });
    draw((n) => n + 1);
  }
  function atrapa(it: Item, quien: Catcher | null) {
    s.items = s.items.filter((o) => o !== it);
    draw((n) => n + 1);
    if (poza && !quien) {
      if (s.carga.length >= cupo) {
        s.rebalses++;
        s.combo = 0;
        audio.sfx('miss');
        fx.pop(it.x, 2.6, it.z, '¡Cubeta llena!', '#ffb74d');
        return;
      }
      s.carga.push(it.kind);
      if (it.kind === 'malo') {
        audio.sfx('error');
        fx.pop(it.x, 2.6, it.z, `${evita[it.idx]?.[0] ?? 'Estorbo'}: ocupa lugar`, '#ffb74d');
        return;
      }
      s.combo++;
      s.best = Math.max(s.best, s.combo);
      s.atrapadas++;
      if (it.kind === 'oro') s.doradas++;
      audio.sfx('pickup');
      fx.pop(it.x, 2.6, it.z, `${s.carga.length}/${cupo}`, '#ffffff');
      pop.current = 0.25;
      if (s.carga.length >= cupo) useGame.getState().toast('¡Cubeta llena! Vaciala.', '🪣');
      return;
    }
    if (it.kind === 'malo') {
      fx.emit(it.x, 2, it.z, '#c62828', 12, 3);
      if (!quien) {
        audio.sfx('error');
        s.score = Math.max(0, s.score - 15);
        s.combo = 0;
        s.golpes++;
        s.stun = 1.3;
        player.speedMul = 0.3;
        player.play('fall', 1);
        fx.pop(it.x, 2.6, it.z, '¡Ay! −15', '#ff6b5e');
      }
      return;
    }
    const gold = it.kind === 'oro';
    if (quien) {
      const p = gold ? 30 : 10;
      quien.score += p;
      if (quien.equipo) {
        s.equipo += Math.round(p / 2);
        s.score += Math.round(p / 2);
      }
      fx.emit(it.x, 2, it.z, gold ? '#ffd54f' : '#9be37a', 6, 2);
      quien.b.st.anim = 'celebrate';
      setTimeout(() => {
        quien.b.st.anim = 'idle';
      }, 500);
      return;
    }
    s.combo++;
    s.best = Math.max(s.best, s.combo);
    s.atrapadas++;
    if (gold) s.doradas++;
    const m = mult(),
      p = (gold ? 30 : 10) * m;
    suma(p, it.x, it.z, gold ? '#ffd54f' : '#ffffff', `+${p}${m > 1 ? ` x${m}` : ''}`);
    audio.sfx(gold ? 'coin' : 'pickup');
    if (gold) audio.sfx('star');
    fx.emit(it.x, 2, it.z, gold ? '#ffd54f' : (cae[it.idx][2] ?? '#9be37a'), gold ? 18 : 9, gold ? 4 : 2.5);
    pop.current = 0.25;
    if (s.combo > 0 && s.combo % 5 === 0) useGame.getState().toast(`¡Racha de ${s.combo}!`, '🔥');
  }

  /** vaciar la cubeta en la poza (o en la cubeta grande de turno): ahí se pagan los peces */
  function vaciar(k: number) {
    const peces = s.carga.filter((x) => x !== 'malo');
    if (!s.carga.length) return;
    const toast = useGame.getState().toast;
    if (cubetas && k !== s.turno) {
      if (s.aviso <= 0) toast('Esa cubeta se está vaciando: andá a la otra.', '⏳');
      s.aviso = 2;
      return;
    }
    let pasan = peces;
    if (cubetas) pasan = peces.slice(0, Math.max(0, cubetas[k] - s.nivel[k]));
    const m = mult(),
      p = pasan.reduce((t, x) => t + (x === 'oro' ? 30 : 10), 0) * m;
    // tanda completa: la cubeta iba llena y sin estorbos, y paga doble
    const completa = !cubetas && peces.length >= cupo;
    let bono = completa ? p : 0;
    if (cubetas) {
      s.nivel[k] += pasan.length;
      if (pasan.length && s.nivel[k] >= cubetas[k]) {
        // llenar la cubeta grande paga 15 por lugar
        bono = 15 * cubetas[k];
        s.llenas++;
        s.nivel[k] = 0;
        toast(`¡Se llenó la cubeta de ${cubetas[k]}!`, '🪣');
      }
    }
    // lo que no cupo se queda en tu cubeta; hojas y piedras se botan
    const quedan = peces.slice(pasan.length);
    s.carga = quedan;
    if (!pasan.length && !bono) return;
    s.vaciadas++;
    if (completa) s.completas++;
    const [x, z] = POZAS[k];
    suma(p + bono, x, z, '#9be37a', `+${p + bono}${bono ? ' tanda' : ''}`);
    fx.emit(x, 0.6, z, '#90e0ef', 14, 3);
    audio.sfx('coin');
    draw((n) => n + 1);
  }

  const size = useThree((t) => t.size),
    k = Math.min(2.1, Math.max(1, 1.75 / (size.width / Math.max(1, size.height))));
  useEffect(() => {
    phys.limit = { minX: -FX.x, maxX: FX.x, minZ: -FX.z, maxZ: FX.z };
    player.fixedCam = { pos: [0, 10.8 * k, 10.2 * k], target: [0, 0.4, 0.6], fov: 52 };
    player.camYaw = 0;
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    w.__mcTest = {
      ...w.__mcTest,
      atrapa: {
        state: () => ({
          t: s.t,
          score: s.score,
          combo: s.combo,
          best: s.best,
          atrapadas: s.atrapadas,
          perdidas: s.perdidas,
          golpes: s.golpes,
          doradas: s.doradas,
          meta,
          dur,
          modo: P.modo,
          bots: bots.map((c) => ({ n: c.b.name, score: c.score })),
          items: s.items.map((i) => ({ x: i.x, z: i.z, y: i.y, kind: i.kind })),
          player: [player.pos[0], player.pos[2]],
          poza,
          cupo,
          carga: s.carga.length,
          vaciadas: s.vaciadas,
          completas: s.completas,
          llenas: s.llenas,
          rebalses: s.rebalses,
          nivel: [...s.nivel],
          turno: s.turno,
          rayos: s.rayo ? 1 : 0,
          pozas: (cubetas ? POZAS : POZAS.slice(0, 1)).map((q) => [...q]),
        }),
        ...(location.hash.includes('test')
          ? {
              skip: (n: number) => {
                s.t = Math.max(0, s.t - n);
              },
              /** simula `segundos` en pasos de 50 ms con las mismas reglas (sin saltar al resultado) */
              avanzar: (segundos: number) => {
                for (let k = 0; k < Math.min(123, segundos) / 0.05; k++) {
                  if (useGame.getState().mg?.phase !== 'playing' || s.done) break;
                  paso(0.05);
                }
              },
              /** jugador automático: camina hacia lo que cae y vacía la cubeta cuando conviene */
              jugarBot: (activo = true) => {
                s.bot = activo;
              },
            }
          : {}),
      },
    };
    return () => {
      player.fixedCam = null;
      player.speedMul = 1;
      if (w.__mcTest) delete w.__mcTest.atrapa;
    };
  }, [s, bots, P, meta, dur, k]);

  useMgTick((dt) => paso(dt));
  function paso(dt: number) {
    if (s.bot) jugar(dt);
    s.t -= dt;
    s.aviso -= dt;
    s.elapsed += dt;
    s.spawn -= dt;
    s.ola -= dt;
    s.frase -= dt;
    if (s.stun > 0) {
      s.stun -= dt;
      if (s.stun <= 0) {
        player.speedMul = 1;
        draw((n) => n + 1);
      }
    }
    // aparición
    if (s.t > 2.5 && s.spawn <= 0) {
      if (s.burst > 0) {
        const k = 6 - s.burst;
        if (s.zona) crea(s.zona.x + (rnd() - 0.5) * 2.4, s.zona.z + (rnd() - 0.5) * 2.4);
        else crea(-FX.x + 1 + (k / 5) * (FX.x * 2 - 2), (rnd() - 0.5) * 6);
        s.burst--;
        if (!s.burst) s.zona = null;
        s.spawn = 0.28;
      } else {
        const cerca = rnd() < 0.45;
        crea(
          Math.max(
            -FX.x + 0.5,
            Math.min(FX.x - 0.5, cerca ? player.pos[0] + (rnd() - 0.5) * 7 : (rnd() * 2 - 1) * (FX.x - 0.5)),
          ),
          Math.max(
            -FX.z + 0.5,
            Math.min(FX.z - 0.5, cerca ? player.pos[2] + (rnd() - 0.5) * 6 : (rnd() * 2 - 1) * (FX.z - 0.5)),
          ),
        );
        s.spawn = (1.25 - 0.7 * P.dif) * (0.75 + rnd() * 0.5);
      }
    }
    if (s.ola <= 0 && s.t > 8 && !s.rayo) {
      s.ola = 16 - 6 * P.dif + rnd() * 4;
      if (tandas) {
        // relámpago primero: marca la zona; la tanda cae con el trueno, unos segundos después
        s.rayo = {
          x: (rnd() * 2 - 1) * (FX.x - 2),
          z: (rnd() * 2 - 1) * (FX.z - 2),
          t: 2.4 - 0.8 * P.dif + rnd() * 0.8,
        };
        useGame.getState().toast('⚡ ¡Relámpago! Contá hasta el trueno.', '⚡');
        draw((n) => n + 1);
      } else {
        s.burst = 6;
        useGame.getState().toast('¡Ráfaga!', '🌪️');
        audio.sfx('horn');
      }
    }
    if (s.frase <= 0) {
      s.frase = 18 + rnd() * 8;
      const f = P.tema.frases;
      if (Array.isArray(f) && f.length) useGame.getState().toast(String(f[Math.floor(rnd() * f.length)]), '💬');
    }
    if (poza) {
      // al pisar la poza (o una cubeta grande) se vacía lo que llevás
      (cubetas ? [0, 1] : [0]).forEach((k) => {
        if (Math.hypot(player.pos[0] - POZAS[k][0], player.pos[2] - POZAS[k][1]) < R_POZA) vaciar(k);
      });
      if (cubetas) {
        s.reloj -= dt;
        if (s.reloj <= 0) {
          // la que termina su turno se vacía sola; los peces que ya estaban cuentan
          s.nivel[s.turno] = 0;
          s.turno = 1 - s.turno;
          s.reloj = turnoDura;
          useGame.getState().toast(`Ahora recibe la cubeta de ${cubetas[s.turno]}.`, '🔁');
          draw((n) => n + 1);
        }
      }
    }
    if (s.rayo) {
      s.rayo.t -= dt;
      if (s.rayo.t <= 0) {
        s.zona = { x: s.rayo.x, z: s.rayo.z };
        s.rayo = null;
        s.burst = 6;
        useGame.getState().toast('¡Trueno! Ahí cae la tanda.', '🌩️');
        audio.sfx('horn');
        draw((n) => n + 1);
      }
    }
    // bots
    for (const c of bots) {
      if (!c.tgt || !s.items.includes(c.tgt) || c.tgt.y < 1) {
        c.tgt = null;
        let mejor = 1e9;
        for (const it of s.items) {
          if (it.kind === 'malo' || it.y < 3 || c.ign.has(it.id) || bots.some((o) => o.tgt === it)) continue;
          const d = Math.hypot(it.x - c.b.x, it.z - c.b.z),
            t = (it.y - 1.8) / it.v;
          if (d / c.sp < t * 0.9 && d < mejor) {
            mejor = d;
            c.tgt = it;
          }
        }
        if (c.tgt && rnd() > c.skill) {
          c.ign.add(c.tgt.id);
          c.tgt = null;
        } // se distrae con ese
      }
      const tx = c.tgt ? c.tgt.x : c.b.x,
        tz = c.tgt ? c.tgt.z : c.b.z,
        dx = tx - c.b.x,
        dz = tz - c.b.z,
        d = Math.hypot(dx, dz);
      if (d > 0.15) {
        const m = Math.min(d, c.sp * dt);
        c.b.x += (dx / d) * m;
        c.b.z += (dz / d) * m;
        c.b.yaw = faceTo(dx, dz);
        c.b.st.anim = 'run';
        c.b.st.speed = 6;
      } else if (c.b.st.anim === 'run') {
        c.b.st.anim = 'idle';
        c.b.st.speed = 0;
      }
    }
    // caída y captura
    const px = player.pos[0],
      pz = player.pos[2];
    for (const it of [...s.items]) {
      if (it.land > 0) {
        it.land -= dt;
        if (it.land <= 0) {
          s.items = s.items.filter((o) => o !== it);
          draw((n) => n + 1);
        }
        continue;
      }
      it.y -= it.v * dt;
      it.spin += dt * 3;
      if (it.y <= 2.25 && it.y > 1.2) {
        if (Math.hypot(it.x - px, it.z - pz) < 0.95) {
          atrapa(it, null);
          continue;
        }
        const b = bots.find((c) => Math.hypot(it.x - c.b.x, it.z - c.b.z) < 0.9 && c.tgt === it);
        if (b) {
          b.tgt = null;
          atrapa(it, b);
          continue;
        }
      }
      if (it.y <= 0.2) {
        it.y = 0.2;
        it.land = 0.45;
        if (it.kind === 'malo') {
          fx.emit(it.x, 0.1, it.z, '#8d6e63', 6, 2);
        } else {
          s.perdidas++;
          if (s.combo >= 3) fx.pop(it.x, 0.8, it.z, 'racha perdida', '#ffb74d');
          s.combo = 0;
          audio.sfx('miss');
          fx.emit(it.x, 0.1, it.z, '#caa472', 5, 2);
        }
      }
    }
    // recipiente sobre la cabeza
    if (cont.current) {
      pop.current = Math.max(0, pop.current - dt);
      const k = 1 + pop.current * 1.2;
      cont.current.position.set(px, 1.98 + pop.current * 0.4, pz);
      cont.current.scale.setScalar(k);
      cont.current.rotation.z =
        (Math.sin(s.elapsed * 6) * 0.04 * Math.hypot(player.body.vel[0], player.body.vel[2])) / 5;
    }
    const sig = meta.find((m) => s.score < m) ?? meta[2],
      m = mult();
    setHud({
      timer: Math.ceil(Math.max(0, s.t)),
      score: `${s.score} pts`,
      objective: s.score >= meta[2] ? '¡Tres estrellas!' : `Meta: ${sig} pts`,
      lines: [
        ...(poza
          ? [
              `Cubeta ${s.carga.length}/${cupo}${s.carga.includes('malo') ? ' · con estorbos' : ''}${cubetas ? ` · Recibe la de ${cubetas[s.turno]} (${s.nivel[s.turno]}/${cubetas[s.turno]}) · ${Math.ceil(s.reloj)} s` : ' · vaciala en la poza'}`,
            ]
          : []),
        `Racha ${s.combo}${m > 1 ? ` · x${m}` : ''} · mejor ${s.best}`,
        ...bots.map((c) => `${c.b.name}: ${c.score}`),
      ],
    });
    if (s.t <= 0 && !s.done) {
      s.done = true;
      finish({
        won: s.score >= meta[0],
        stars: starsFor(s.score, meta[0], meta[1], meta[2]),
        score: s.score,
        label: `${s.score} pts`,
        stats: { atrapadas: s.atrapadas, mejorRacha: s.best, doradas: s.doradas, golpes: s.golpes },
      });
    }
  }
  /** el jugador automático de la prueba: mueve al muñeco como si caminara (5,2 m/s) */
  function jugar(dt: number) {
    const px = player.pos[0],
      pz = player.pos[2];
    let tx = px,
      tz = pz;
    const destino = cubetas ? s.turno : 0,
      peces = s.carga.filter((x) => x !== 'malo').length;
    const lleno = poza && (s.carga.length >= cupo || (cubetas && peces >= cubetas[destino] - s.nivel[destino]));
    let mejor: Item | null = null,
      d0 = 1e9;
    for (const it of s.items) {
      if (it.kind === 'malo' || it.land > 0 || it.y < 2.3) continue;
      const d = Math.hypot(it.x - px, it.z - pz),
        tt = (it.y - 2.0) / it.v;
      if (d / 5.2 < tt + 0.05 && d < d0) {
        d0 = d;
        mejor = it;
      }
    }
    if (poza && (lleno || (s.t < 4 && peces > 0))) {
      [tx, tz] = POZAS[destino];
    } else if (mejor) {
      tx = mejor.x;
      tz = mejor.z;
    }
    // esquiva lo malo que cae encima
    for (const it of s.items)
      if (it.kind === 'malo' && it.y < 4 && it.y > 1.5 && Math.hypot(it.x - tx, it.z - tz) < 1.1) {
        tx += it.x < tx ? 1.2 : -1.2;
      }
    const dx = tx - px,
      dz = tz - pz,
      d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const k = Math.min(d, 5.2 * dt) / d;
      player.pos[0] = Math.max(-FX.x, Math.min(FX.x, px + dx * k));
      player.pos[2] = Math.max(-FX.z, Math.min(FX.z, pz + dz * k));
    }
  }

  return (
    <>
      <Escenario fondo={fondo} seed={P.seed} rx={FX.x + 5.4} rz={FX.z + 4.4} storm={storm} />
      <Spawn pos={[0, 0, 1.5]} />
      <Cancha />
      <Fx />
      {bots.map((c, i) => (
        <BotView key={i} b={c.b} />
      ))}
      <group ref={cont} position={[0, 1.98, 0]}>
        <Recipiente con={con} />
      </group>
      {s.stun > 0 && <Label pos={[player.pos[0], 2.9, player.pos[2]]} text="💫 aturdido" h={0.45} />}
      {poza &&
        (cubetas ? [0, 1] : [0]).map((k) => (
          <Poza
            key={k}
            pos={POZAS[k]}
            texto={
              cubetas
                ? `${k === s.turno ? '🪣 Recibe' : '⏳ Se vacía'} · ${s.nivel[k]}/${cubetas[k]}`
                : `Poza · cubeta ${s.carga.length}/${cupo}`
            }
            activa={!cubetas || k === s.turno}
            nivel={cubetas ? s.nivel[k] / Math.max(1, cubetas[k]) : 0.6}
          />
        ))}
      {s.rayo && <Rayo x={s.rayo.x} z={s.rayo.z} t={s.rayo.t} />}
      {s.items.map((it) => (
        <Caida key={it.id} it={it} cosa={(it.kind === 'malo' ? evita : cae)[it.idx]} />
      ))}
    </>
  );
}

/** poza (o cubeta grande) donde se vacía la cubeta: agua con borde y su letrero */
function Poza({ pos, texto, activa, nivel }: { pos: [number, number]; texto: string; activa: boolean; nivel: number }) {
  return (
    <group position={[pos[0], 0, pos[1]]}>
      <mesh position={[0, 0.04, 0]} rotation-x={-Math.PI / 2}>
        <circleGeometry args={[R_POZA, 24]} />
        <meshBasicMaterial color={activa ? '#2e86ab' : '#7a8b99'} transparent opacity={0.75} />
      </mesh>
      <mesh position={[0, 0.06, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[R_POZA * (1 - Math.min(1, nivel) * 0.8), R_POZA, 24]} />
        <meshBasicMaterial color="#9be37a" transparent opacity={0.35} />
      </mesh>
      <Label pos={[0, 1.4, 0]} text={texto} h={0.38} />
    </group>
  );
}
/** relámpago: una columna de luz marca dónde caerá la tanda; la cuenta baja hasta el trueno */
function Rayo({ x, z, t }: { x: number; z: number; t: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.05, 0]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[1.2, 1.6, 24]} />
        <meshBasicMaterial color="#fff59d" transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, 5, 0]}>
        <cylinderGeometry args={[0.08, 0.3, 10, 6]} />
        <meshBasicMaterial color="#fffde7" transparent opacity={0.35 + (Math.sin(t * 30) + 1) * 0.15} />
      </mesh>
      <Label pos={[0, 2.4, 0]} text={`⚡ ${Math.ceil(t)}…`} h={0.5} />
    </group>
  );
}

// marco de la cancha: cuatro tablas bajas y una franja clara para que se lea el área de juego
function Cancha() {
  return (
    <group>
      {[
        [0, -FX.z - 0.6, FX.x * 2 + 1.2, 0.4],
        [0, FX.z + 0.6, FX.x * 2 + 1.2, 0.4],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 0.03, z]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[w, d]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} />
        </mesh>
      ))}
      {[-FX.x - 0.6, FX.x + 0.6].map((x, i) => (
        <mesh key={i} position={[x, 0.03, 0]} rotation-x={-Math.PI / 2}>
          <planeGeometry args={[0.4, FX.z * 2 + 1.6]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.28} />
        </mesh>
      ))}
    </group>
  );
}

const sombraGeo = new THREE.CircleGeometry(1, 20),
  sombraMat = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.38, depthWrite: false }),
  sombraMalo = new THREE.MeshBasicMaterial({ color: '#b71c1c', transparent: true, opacity: 0.5, depthWrite: false }),
  sombraOro = new THREE.MeshBasicMaterial({ color: '#ffb300', transparent: true, opacity: 0.5, depthWrite: false });
function Caida({ it, cosa }: { it: Item; cosa: Cosa }) {
  const g = useRef<THREE.Group>(null),
    sh = useRef<THREE.Mesh>(null),
    inner = useRef<THREE.Group>(null);
  const esc = it.kind === 'oro' ? 1.9 : 1.55;
  useTick(() => {
    if (g.current) {
      g.current.position.set(it.x, it.y + 0.3, it.z);
      g.current.rotation.y = it.spin;
      g.current.rotation.z = Math.sin(it.spin * 1.3) * 0.25;
      g.current.scale.set(esc, it.land > 0 ? esc * 0.4 : esc, esc);
    }
    if (sh.current) {
      const k = it.land > 0 ? 0.5 : 0.35 + 0.65 * (1 - Math.min(1, it.y / 10));
      sh.current.scale.set(k, k, 1);
    }
    if (inner.current && it.kind === 'oro') inner.current.rotation.x = it.spin * 0.5;
  });
  return (
    <>
      <mesh
        ref={sh}
        geometry={sombraGeo}
        material={it.kind === 'malo' ? sombraMalo : it.kind === 'oro' ? sombraOro : sombraMat}
        position={[it.x, 0.05, it.z]}
        rotation-x={-Math.PI / 2}
      />
      <group ref={g} position={[it.x, it.y + 0.3, it.z]}>
        <group ref={inner}>
          {it.kind === 'oro' ? (
            <>
              <Forma f={cosa[1]} c="#ffd54f" nombre={cosa[0]} />
              <mesh>
                <sphereGeometry args={[0.38, 10, 8]} />
                <meshBasicMaterial color="#ffe082" transparent opacity={0.28} depthWrite={false} />
              </mesh>
            </>
          ) : (
            <Forma f={cosa[1]} c={cosa[2]} nombre={cosa[0]} />
          )}
        </group>
      </group>
    </>
  );
}
