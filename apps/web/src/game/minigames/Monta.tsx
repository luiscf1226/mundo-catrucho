// MOTOR 'monta' — «La monta»: aguantar sobre toro, caballo, tabla, balsa… manteniendo la aguja al centro y saltando en los brincos.
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { audio } from '../../core/audio';
import { input } from '../../core/input';
import { player } from '../../core/player';
import { mgPlaying, useGame } from '../../core/store';
import type { AvatarState, V3 } from '../../core/types';
import { art, Block, Ground, Label, P, Spawn, useTick } from '../kit';
import { type Guia, type Partida, partida, rng, setHud } from './api';
import {
  BotAvatar,
  clamp,
  Escenario,
  type Fondo,
  fondoDe,
  frasesDe,
  newState,
  starsOf,
  useBurst,
  useFinisher,
} from './corte/common';
import { AGUA, ASIENTO, Corral, Gente, type Montura, Mount, Scroll } from './monta/modelos';

const MONTURAS: Montura[] = ['toro', 'caballo', 'burro', 'mula', 'tabla', 'balsa', 'cayuco', 'tirolesa'];
const durOf = (p: Partida) => Math.round(60 + 30 * p.dif);
const styleMetas = (p: Partida): [number, number] => {
  // el estilo máximo es ~60 pts por segundo con la aguja al centro (más 150 por brinco)
  const d = durOf(p);
  return [Math.round((d * 60 * (0.35 + 0.1 * p.dif)) / 10) * 10, Math.round((d * 60 * (0.7 + 0.1 * p.dif)) / 10) * 10];
};
export const guia: Guia = {
  goal: 'Aguantá el tiempo de la etapa: mantené la aguja de equilibrio al centro y saltá en los brincos grandes.',
  keys: [
    ['A / D  ó  ← / →', 'inclinarte contra el corcoveo'],
    ['Espacio', 'saltar en el brinco grande'],
  ],
  touch: [
    ['Palanca ← →', 'inclinarte'],
    ['Botón de salto', 'brincar a tiempo'],
  ],
  metas: (p) => [`Aguantar ${durOf(p)} s`, `${styleMetas(p)[0]} pts de estilo`, `${styleMetas(p)[1]} pts de estilo`],
};
const DEF_FONDO: Record<Montura, Fondo> = {
  toro: 'feria',
  caballo: 'valle',
  burro: 'finca',
  mula: 'montana',
  tabla: 'mar',
  balsa: 'rio',
  cayuco: 'lago',
  tirolesa: 'selva',
};
const NOMBRE: Record<Montura, string> = {
  toro: 'El Toro',
  caballo: 'El Caballo',
  burro: 'El Burro',
  mula: 'La Mula',
  tabla: 'La Ola',
  balsa: 'La Balsa',
  cayuco: 'El Cayuco',
  tirolesa: 'La Tirolesa',
};
const YAW = 2.4;

export function Monta() {
  const P_ = useMemo(partida, []);
  const mk: Montura = MONTURAS.includes(P_.tema.montura) ? P_.tema.montura : 'toro';
  const agua = AGUA.includes(mk),
    animal = !agua && mk !== 'tirolesa',
    alto = mk === 'tirolesa' ? 12 : 0;
  const fondo = (() => {
    const f = fondoDe(P_, DEF_FONDO[mk]);
    if (agua && !['costa', 'lago', 'mar', 'rio'].includes(f)) return DEF_FONDO[mk];
    return f;
  })();
  const nombre: string = P_.tema.nombre ?? NOMBRE[mk];
  const R = useMemo(() => rng(P_.seed), [P_]),
    dur = durOf(P_),
    dif = P_.dif;
  const { end } = useFinisher(),
    fx = useBurst(60, 0.12);
  const mount = useRef<THREE.Group>(null),
    needle = useRef<THREE.Mesh>(null),
    jumpL = useRef<THREE.Object3D>(null),
    arrL = useRef<THREE.Object3D>(null),
    arrR = useRef<THREE.Object3D>(null),
    gauge = useRef<THREE.Group>(null);
  const flow = useRef(0),
    excite = useRef(0.3);
  const camP: V3 = [3.7, 2.2 + alto, 6.2],
    camT: V3 = [0, 1.45 + alto, 0],
    FOV = 58;
  const camQ = useMemo(() => {
    const c = new THREE.PerspectiveCamera(FOV, 1.78, 0.1, 100);
    c.position.set(...camP);
    c.lookAt(...camT);
    c.updateMatrixWorld();
    return c.quaternion.clone();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const S = useRef({
    t: 0,
    L: 0,
    V: 0,
    score: 0,
    danger: 0,
    ev: [] as { t: number; dir: number; mag: number; big: boolean; fired: boolean; ok?: boolean; jumped?: boolean }[],
    ei: 0,
    bonus: 0,
    falls: 0,
    help: 0,
    hh: 0,
    toast: 10,
    pitch: 0,
    jy: 0,
    perf: 0,
    jumps: 0,
    hits: 0,
    over: false,
    tel: { dir: 0, big: false, until: 0 },
  });
  const compa = useMemo(() => ({ s: newState('idle') as AvatarState, t: 0 }), []);
  const bots = useMemo(
    () =>
      Array.from({ length: P_.modo === 'abierto' ? 3 : P_.modo === 'duo' ? 1 : 1 }, () => ({
        s: newState('clap') as AvatarState,
      })),
    [P_],
  );
  const ev0 = useMemo(() => {
    const out: typeof S.current.ev = [];
    let t = 4.5;
    let nextBig = 8 + R() * 3;
    while (t < dur) {
      if (t > nextBig) {
        out.push({ t: nextBig, dir: R() < 0.5 ? -1 : 1, mag: 1, big: true, fired: false });
        nextBig += 11 - 3 * dif + R() * 3;
        t = Math.max(t, nextBig - 7);
        continue;
      }
      out.push({ t, dir: R() < 0.5 ? -1 : 1, mag: (0.75 + 0.2 * dif) * (0.75 + 0.5 * R()), big: false, fired: false });
      t += (2.7 - 0.9 * dif) * (0.8 + 0.5 * R());
    }
    return out.sort((a, b) => a.t - b.t);
  }, [P_]); // eslint-disable-line react-hooks/exhaustive-deps
  S.current.ev = ev0;
  const seat = ASIENTO[mk];
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    player.control = false;
    player.fixedCam = { pos: [...camP], target: [...camT], fov: FOV };
    player.yaw = YAW;
    player.camYaw = YAW;
    const w = window as any;
    w.__mcTest = {
      ...w.__mcTest,
      monta: {
        st: S.current,
        dur,
        warp: (s: number) => {
          S.current.t += s;
        },
        mk,
      },
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const finishRide = (won: boolean) => {
    const s = S.current;
    if (s.over) return;
    s.over = true;
    const [m2, m3] = styleMetas(P_);
    const sc = Math.round(s.score);
    player.play(won ? 'celebrate' : 'fall', 3);
    end({
      won,
      stars: won ? (sc >= m3 ? 3 : sc >= m2 ? 2 : 1) : 0,
      score: sc,
      label: won ? `${sc} pts` : `Derribado · ${sc} pts`,
      stats: { brincos: s.jumps },
    });
    void starsOf;
  };

  useTick((dt) => {
    const s = S.current,
      playing = mgPlaying() && !s.over;
    let bob = 0,
      roll = 0,
      pitch = 0,
      jy = 0;
    if (playing) {
      s.t += dt;
      const t = s.t;
      // eventos: corcoveos y brincos grandes
      while (s.ei < s.ev.length && s.ev[s.ei].t - (s.ev[s.ei].big ? 0.9 : 0.5) <= t) {
        const e = s.ev[s.ei];
        s.tel = { dir: e.dir, big: e.big, until: e.t };
        s.ei++;
        if (e.big) audio.sfx('horn');
      }
      for (const e of s.ev) {
        if (e.fired || e.t > t) continue;
        e.fired = true;
        if (e.big) {
          if (e.jumped) {
            e.ok = true;
          } else {
            e.ok = false;
            s.V += e.dir * (1.0 + 2.6 * dif); // en la etapa 1 un brinco perdido se aguanta; en la última no
            s.L += e.dir * 0.35;
            audio.sfx('miss');
            useGame.getState().toast('¡Te sacudió fuerte!', '💥');
            fx.emit(0, 0.5 + alto, 0, '#d9bb86', 14, 4, 3);
          }
        } else {
          const k = s.help > 0 ? 0.45 : 1;
          s.V += e.dir * e.mag * (1.4 + 0.2 * dif) * k;
          audio.sfx('hit');
          fx.emit(0, 0.2 + alto, 0.3, agua ? '#dff3ff' : '#d9bb86', 8, 3, 2.2);
        }
      }
      // salto
      if (input.take('jump')) {
        const e = s.ev.find((q) => q.big && !q.jumped && !q.ok && Math.abs(q.t - t) < 0.4 && q.t - t > -0.25);
        if (e) {
          e.jumped = true;
          if (e.t - t > 0) {
            /* bonus al caer */
          }
          s.jumps++;
          s.score += 150;
          s.L *= 0.2;
          s.V = 0;
          audio.sfx('star');
          useGame.getState().toast('¡Brinco perfecto! +150', '🌟');
          fx.emit(0, 1.5 + alto, 0, '#ffd23f', 18, 5, 4);
          excite.current = 1;
        } else {
          audio.sfx('jump');
        }
      }
      // dinámica de la aguja
      const ctl = input.mx;
      s.V += (s.L * (0.8 + 0.3 * dif) + Math.sin(t * 1.3) * 0.25 + Math.sin(t * 2.9 + 1) * 0.15 - ctl * 7.5) * dt;
      s.V *= Math.max(0, 1 - 1.5 * dt);
      s.L += s.V * dt;
      s.L = clamp(s.L, -1.25, 1.25);
      const q = Math.max(0, 1 - Math.abs(s.L) / 0.8);
      s.score += dt * 60 * q * q;
      s.perf = q;
      excite.current += (clamp(0.25 + q * 0.5 + (s.jumps > 0 ? 0.1 : 0), 0, 1) - excite.current) * dt * 2;
      if (Math.abs(s.L) > 1.0) s.danger += dt;
      else s.danger = Math.max(0, s.danger - dt * 1.5);
      if (s.danger > 0.45) finishRide(false);
      // compa
      if (P_.modo === 'duo') {
        s.hh -= dt;
        if (s.hh <= 0) {
          s.hh = 14;
          s.help = 4;
          compa.s.anim = 'throw';
          compa.t = 1;
          useGame.getState().toast('🤖 El compa te echa una mano', '🤝');
        }
        s.help = Math.max(0, s.help - dt);
        compa.t -= dt;
        if (compa.t < 0) compa.s.anim = 'wave';
      }
      const fr = frasesDe(P_);
      s.toast -= dt;
      if (fr.length && s.toast < 0) {
        s.toast = 20;
        useGame.getState().toast(fr[Math.floor(R() * fr.length)], '🗣️');
      }
      const [m2] = styleMetas(P_);
      setHud({
        timer: Math.max(0, dur - t),
        score: `${Math.round(s.score)} pts`,
        objective: `Aguantá ${Math.ceil(dur - t)} s · estilo ${m2} pts para 2⭐`,
        lines: [
          `${nombre} · aguja ${Math.abs(s.L) < 0.35 ? '✅ al centro' : Math.abs(s.L) < 0.8 ? '⚠️ ladeándose' : '🔴 ¡te caés!'}`,
          'A / D inclinarte · Espacio brincar',
        ],
      });
      if (t >= dur) finishRide(true);
    }
    // movimiento de la montura
    const t = s.t,
      e = s.tel,
      tel = playing && e.until > t ? 1 - (e.until - t) / (e.big ? 0.9 : 0.5) : 0,
      big = playing ? s.ev.find((q) => q.big && Math.abs(q.t - t) < 0.9) : undefined;
    bob = Math.sin(t * (agua ? 2.2 : 7.5)) * (agua ? 0.08 : 0.06) * (0.5 + excite.current);
    roll = s.L * 0.34 + (tel > 0 && !e.big ? e.dir * 0.12 * tel : 0);
    pitch = agua
      ? Math.sin(t * 1.3) * 0.06
      : Math.sin(t * 5.2) * 0.07 * (0.6 + excite.current) - (tel > 0 && e.big ? 0.22 * tel : 0);
    if (big) {
      const u = (t - (big.t - 0.9)) / 1.3;
      if (u > 0 && u < 1) {
        jy = Math.sin(u * Math.PI) * 1.15;
        pitch += Math.sin(u * Math.PI) * -0.35;
      }
    }
    const m = mount.current;
    if (m) {
      m.position.set(0, alto + bob + jy, 0);
      m.rotation.set(pitch, 0, roll);
      m.updateWorldMatrix(true, true);
      tmp.set(0, seat.y, mk === 'tabla' ? 0 : 0.0);
      m.localToWorld(tmp);
      const b = player.body;
      b.pos[0] = tmp.x;
      b.pos[1] = tmp.y - (animal ? 0.3 : 0);
      b.pos[2] = tmp.z;
      b.vel[0] = b.vel[1] = b.vel[2] = 0;
      player.yaw = YAW;
      player.override = { anim: seat.anim, until: performance.now() + 250 };
    }
    // aguja y avisos (en el espacio de la cámara)
    if (needle.current) needle.current.position.x = clamp(s.L, -1.2, 1.2) * 2.2;
    if (jumpL.current) jumpL.current.visible = playing && !!big && Math.abs(big.t - t) < 0.45 && !big.jumped;
    if (arrL.current) arrL.current.visible = playing && tel > 0 && e.dir < 0 && !e.big;
    if (arrR.current) arrR.current.visible = playing && tel > 0 && e.dir > 0 && !e.big;
    if (gauge.current) gauge.current.visible = true;
  }, -11);

  const sc = 2.2,
    items = useMemo(() => {
      const out: { x: number; y?: number; z: number; el: React.ReactNode }[] = [];
      if (agua) {
        for (let i = 0; i < 26; i++)
          out.push({
            x: -16 + R() * 32,
            y: 0.06,
            z: R() * 60,
            el: (
              <Block
                pos={[0, 0, 0]}
                size={[1.6 + R() * 2.2, 0.05, 0.22]}
                color="#ffffff"
                mat="plastic"
                solid={false}
                cast={false}
              />
            ),
          });
        if (mk !== 'tabla')
          for (let i = 0; i < 6; i++)
            out.push({
              x: (i % 2 ? 1 : -1) * (4.5 + R() * 3),
              z: i * 10 + R() * 4,
              el: <P.Rock pos={[0, -0.2, 0]} scale={0.7 + R() * 0.6} solid={false} />,
            });
      }
      if (mk === 'tirolesa')
        for (let i = 0; i < 16; i++)
          out.push({
            x: (i % 2 ? 1 : -1) * (3 + R() * 9),
            y: 0,
            z: i * 5,
            el: <P.Pine pos={[0, 0, 0]} scale={3 + R() * 2} solid={false} />,
          });
      return out;
    }, [mk]); // eslint-disable-line react-hooks/exhaustive-deps
  const bg = (color: string) => <meshBasicMaterial color={color} depthTest={false} depthWrite={false} transparent />;
  return (
    <>
      <Escenario fondo={fondo} deck={false} />
      <Spawn pos={[0, alto, 0]} yaw={YAW} />
      {animal && <Corral />}
      {animal && <Gente excite={excite} />}
      {mk === 'tirolesa' && (
        <>
          <group rotation-y={YAW}>
            <mesh position={[0, 14.6, 0]} rotation-x={Math.PI / 2}>
              <cylinderGeometry args={[0.03, 0.03, 120, 6]} />
              <meshBasicMaterial color="#222" />
            </mesh>
          </group>
          <Block pos={[0, 6, -26]} size={[0.8, 16, 0.8]} color="#7a4a24" mat="wood" solid={false} />
        </>
      )}
      {(agua || mk === 'tirolesa') && (
        <group rotation-y={YAW}>
          <Scroll items={items} v={flow} len={64} speed={agua ? 3.5 : 6} />
        </group>
      )}
      <group rotation-y={YAW}>
        <group ref={mount}>
          <Mount k={mk} />
        </group>
      </group>
      {fx.node}
      {/* instrumentos de la cámara */}
      <group position={camP} quaternion={camQ}>
        <group ref={gauge} position={[0, -2.2, -5]}>
          <mesh renderOrder={20} position={[0, 0, 0]}>
            <planeGeometry args={[sc * 2.5, 0.42]} />
            {bg('#10202c')}
          </mesh>
          {(
            [
              [-1.15, '#d93a3a', 0.35],
              [-0.8, '#f2c231', 0.35],
              [0, '#3fbf5a', 0.9],
              [0.8, '#f2c231', 0.35],
              [1.15, '#d93a3a', 0.35],
            ] as const
          ).map(([x, c, w], i) => (
            <mesh key={i} renderOrder={21} position={[x * sc * 0.97, 0, 0.001]}>
              <planeGeometry args={[w * sc, 0.26]} />
              {bg(c)}
            </mesh>
          ))}
          <mesh ref={needle} renderOrder={22} position={[0, 0, 0.002]}>
            <planeGeometry args={[0.1, 0.62]} />
            {bg('#ffffff')}
          </mesh>
          <Label pos={[0, 0.5, 0]} text="EQUILIBRIO" h={0.26} depthTest={false} />
          <group ref={arrL} visible={false}>
            <Label pos={[-3.2, 0, 0]} text="◀ ◀ ◀" h={0.5} fg="#ffd23f" depthTest={false} />
          </group>
          <group ref={arrR} visible={false}>
            <Label pos={[3.2, 0, 0]} text="▶ ▶ ▶" h={0.5} fg="#ffd23f" depthTest={false} />
          </group>
        </group>
        <group ref={jumpL} position={[0, 0.2, -5]} visible={false}>
          <Label pos={[0, 0, 0]} text="¡SALTÁ!" h={1.1} fg="#ffffff" bg="rgba(214,40,40,0.9)" depthTest={false} />
        </group>
      </group>
      <Label pos={[-3.4 + 0, 3.6 + alto, 0]} text={nombre} h={0.5} />
      {P_.modo === 'duo' && <BotAvatar i={0} state={compa.s} pos={[-4.8, alto, 1.5]} yaw={0.9} compa />}
      {P_.modo !== 'duo' &&
        bots.map((b, i) => (
          <BotAvatar
            key={i}
            i={i + 1}
            state={b.s}
            pos={
              [
                [-5.2, alto, 2.2],
                [-2.6, alto, 4.2],
                [-6.6, alto, -0.4],
              ][i] as V3
            }
            yaw={0.9}
          />
        ))}
      {agua && (
        <Ground
          size={fondo === 'rio' ? [20, 220] : [240, 240]}
          y={0.05}
          color={fondo === 'rio' ? '#4f9fbf' : '#3e9dc4'}
          mat="water"
        />
      )}
      {(agua || mk === 'tirolesa') && (
        <Block pos={[-4.8, alto - 0.18, 1.6]} size={[7, 0.3, 7]} color="#a87a47" mat="wood" solid={false} />
      )}
    </>
  );
}
void art;
