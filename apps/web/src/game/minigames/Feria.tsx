import { useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../core/audio';
import { input } from '../../core/input';
import { phys } from '../../core/phys';
import { player } from '../../core/player';
import { useGame } from '../../core/store';
import type { V3 } from '../../core/types';
import { art, Ball, Block, Cyl, Ground, Interactable, Label, Spawn, useMgTick } from '../kit';
import { finish, partida, rulesOf, setHud, starsFor } from './api';
import { Fx, FxLayer } from './feria/fx';
import { Scenery } from './feria/Scenery';

const names = ['HULERA', 'ARGOLLAS', 'TUMBALATAS'];
const xs = [-11, 0, 11];
interface Target {
  p: V3;
  base: V3;
  points: number;
  down: boolean;
  v: V3;
  rot: number;
  moving: boolean;
}
interface Flight {
  start: V3;
  end: V3;
  t: number;
  duration: number;
}
function targets(booth: number, moviles = false): Target[] {
  return booth === 2
    ? Array.from({ length: 10 }, (_, i) => {
        let row = 0,
          n = i;
        while (n >= 4 - row) {
          n -= 4 - row;
          row++;
        }
        const p: V3 = [11 + (n - (3 - row) / 2) * 0.65, 1.8 + row * 0.65, -8];
        return {
          p,
          base: [...p],
          points: 10,
          down: false,
          v: [0, 0, 0],
          rot: 0,
          moving: false,
        };
      })
    : booth === 1
      ? Array.from({ length: 9 }, (_, i) => {
          const p: V3 = [((i % 3) - 1) * 1.8, 1, -6 - Math.floor(i / 3) * 2];
          return {
            p,
            base: [...p],
            points: [15, 30, 60][Math.floor(i / 3)],
            down: false,
            v: [0, 0, 0],
            rot: 0,
            moving: false,
          };
        })
      : Array.from({ length: 8 }, (_, i) => {
          const p: V3 = [-11 + ((i % 4) - 1.5) * 1.8, 2 + Math.floor(i / 4) * 1.6, -7 - Math.floor(i / 4) * 3];
          return {
            p,
            base: [...p],
            points: [10, 20, 30, 50][i % 4],
            down: false,
            v: [0, 0, 0],
            rot: 0,
            moving: moviles || i % 4 === 3,
          };
        });
}
export function Feria() {
  const { camera, size } = useThree();
  // etapas: los blancos y el aro se mueven más rápido y más lejos (las metas de puntos no cambian)
  const { dif, tema } = useMemo(partida, []),
    mov = 1 + 0.6 * dif,
    amp = 1 + 0.4 * dif,
    // tema del catálogo: nombre del puesto, frases y, en «El premio no cabe en la puerta», todos los blancos móviles
    nombre = typeof tema.nombre === 'string' ? tema.nombre.toUpperCase() : 'FERIA CATRACHA',
    frases: string[] = Array.isArray(tema.frases) ? tema.frases.filter((f: unknown) => typeof f === 'string') : [],
    moviles = tema.variante === 'el-premio-no-cabe-en-la-puerta';
  const [, render] = useState(0);
  const fx = useRef(new Fx()).current;
  const s = useRef({
    booth: -1,
    shots: 0,
    scores: [0, 0, 0],
    done: [false, false, false],
    targets: targets(0, moviles),
    frase: 6,
    flight: null as Flight | null,
    time: 0,
    power: 0.5,
    aim: [0, 1, -7] as V3,
    wait: 0,
    reset: false,
    ending: 0,
    refresh: 0,
  }).current;
  const total = () => s.scores.reduce((a, b) => a + b, 0);
  function collect() {
    if (useGame.getState().mg?.phase !== 'playing') return;
    if (s.ending || !s.done.some(Boolean)) return;
    s.ending = 2;
    player.control = false;
    player.fixedCam = null;
    useGame
      .getState()
      .toast(
        total() >= 400
          ? '¡Sombrero de junco!'
          : total() >= 280
            ? '¡Peluche de guara!'
            : total() >= 150
              ? '¡Llavero catracho!'
              : '¡Volvé por tu premio!',
        '🎁',
      );
  }
  function start(i: number) {
    if (s.booth >= 0 || s.done[i] || s.ending || useGame.getState().mg?.phase !== 'playing') return;
    s.booth = i;
    s.shots = Number(rulesOf('feria').shotsPerBooth);
    s.targets = targets(i, moviles);
    s.reset = false;
    player.control = false;
    player.visible = false;
    player.teleport(xs[i], 0, -1);
    player.fixedCam = {
      pos: [xs[i], 5.5, 2],
      target: [xs[i], 1.7, -8],
      fov: 58,
    };
    input.take('fire');
    useGame
      .getState()
      .toast(
        i === 0
          ? 'Apuntá con el dedo o mouse · tocá / F para tirar'
          : i === 1
            ? 'Alineá el aro dorado con una botella · tocá / F'
            : 'Apuntá abajo para tumbar la pirámide · tocá / F',
        '🎯',
      );
    render((n) => n + 1);
  }
  function award(t: Target) {
    s.scores[s.booth] += t.points;
    fx.burst(t.p, ['#ffd45b', '#e95f55']);
    fx.popup(t.p, `+${t.points}`);
    audio.sfx('hit');
  }
  useEffect(() => {
    phys.limit = { minX: -25, maxX: 25, minZ: -23, maxZ: 15 };
    const hook = {
      state: () => ({
        booth: s.booth,
        shots: s.shots,
        scores: s.scores,
        done: s.done,
        flight: !!s.flight,
        ready: !s.flight && s.wait <= 0,
        nombre,
        moviles,
      }),
      targets: () =>
        s.targets
          .filter((t) => !t.down)
          .map((t) => {
            const p = new THREE.Vector3(...t.p);
            if (s.booth === 1) p.z -= Math.sin(s.time * 2.5 * mov) * 0.65 * amp;
            p.project(camera);
            return {
              x: ((p.x + 1) * size.width) / 2,
              y: ((1 - p.y) * size.height) / 2,
              points: t.points,
            };
          }),
    };
    const w = window as Window & { __mcTest?: Record<string, unknown> };
    w.__mcTest = { ...w.__mcTest, feria: hook };
    return () => {
      if (w.__mcTest) delete w.__mcTest.feria;
      player.control = true;
      player.visible = true;
      player.fixedCam = null;
    };
  }, [camera, size, s, mov, amp, nombre, moviles]);
  useMgTick((dt) => {
    s.time += dt;
    s.refresh += dt;
    s.power = (Math.sin(s.time * 2.5) + 1) / 2;
    if (frases.length && s.time >= s.frase) {
      useGame.getState().toast(frases[Math.floor(s.frase / 20) % frases.length], '💬');
      s.frase += 20;
    }
    if (s.ending) {
      s.ending -= dt;
      if (s.ending <= 0) {
        const r = rulesOf('feria');
        finish({
          won: total() >= r.bronze,
          stars: starsFor(total(), r.bronze, r.silver, r.gold),
          score: total(),
          label: `${total()} pts`,
        });
      }
      return;
    }
    if (s.booth >= 0) {
      const ray = new THREE.Raycaster();
      ray.setFromCamera(new THREE.Vector2(input.px, input.py), camera);
      const hit = new THREE.Vector3();
      const plane = new THREE.Plane(
        new THREE.Vector3(0, s.booth === 1 ? 1 : 0, s.booth === 1 ? 0 : 1),
        s.booth === 1 ? -1 : 8,
      );
      if (ray.ray.intersectPlane(plane, hit)) {
        s.aim = [hit.x, hit.y, hit.z];
        if (s.booth === 1) s.aim[2] += Math.sin(s.time * 2.5 * mov) * 0.65 * amp;
      }
      for (const t of s.targets) {
        if (t.moving && !t.down) {
          t.p[0] = t.base[0] + Math.sin(s.time * 1.5 * mov) * 0.7 * amp;
        }
        if (t.down && s.booth === 2) {
          t.v[1] -= 12 * dt;
          t.p = t.p.map((v, i) => v + t.v[i] * dt) as V3;
          t.rot += dt * 3;
          if (t.p[1] < 0.3) {
            t.p[1] = 0.3;
            t.v = [0, 0, 0];
          }
        }
      }
      if (!s.flight && s.wait <= 0 && s.shots > 0 && input.take('fire')) {
        s.shots--;
        let end: V3 = [...s.aim];
        if (s.booth === 0) {
          const aimed = s.targets
            .filter((t) => !t.down)
            .sort(
              (a, b) =>
                ray.ray.distanceToPoint(new THREE.Vector3(...a.p)) - ray.ray.distanceToPoint(new THREE.Vector3(...b.p)),
            )[0];
          if (aimed && ray.ray.distanceToPoint(new THREE.Vector3(...aimed.p)) < 0.8) {
            const q = new THREE.Vector3();
            if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), -aimed.p[2]), q))
              end = [q.x, q.y, q.z];
          }
        }
        s.flight = {
          start: [xs[s.booth], 1.6, -1.8],
          end,
          t: 0,
          duration: 0.65,
        };
        audio.sfx('throw');
        player.play('throw', 0.4);
      }
      if (s.flight) {
        const f = s.flight;
        f.t += dt;
        if (f.t >= f.duration) {
          let did = false;
          if (s.booth === 2) {
            const struck = s.targets.find((t) => !t.down && Math.hypot(t.p[0] - f.end[0], t.p[1] - f.end[1]) < 0.65);
            if (struck) {
              const queue = [struck];
              for (const t of queue) {
                if (t.down) continue;
                t.down = true;
                t.v = [(t.p[0] - struck.p[0]) * 3 + (Math.random() - 0.5), 3, -3];
                award(t);
                did = true;
                for (const n of s.targets) {
                  if (
                    !n.down &&
                    !queue.includes(n) &&
                    n.p[1] > t.p[1] &&
                    Math.hypot(n.p[0] - t.p[0], n.p[1] - t.p[1]) < 1
                  )
                    queue.push(n);
                }
              }
              if (s.targets.every((t) => t.down)) {
                s.scores[2] += 50;
                fx.popup([11, 4, -8], '+50 ¡Limpio!');
              }
            }
          } else {
            const t = s.targets.find(
              (t) =>
                !t.down &&
                (s.booth === 1
                  ? Math.hypot(t.p[0] - f.end[0], t.p[2] - f.end[2]) < 0.55
                  : Math.hypot(t.p[0] - f.end[0], t.p[1] - f.end[1], t.p[2] - f.end[2]) < 0.65),
            );
            if (t) {
              t.down = true;
              award(t);
              did = true;
            }
          }
          if (!did) audio.sfx('miss');
          s.flight = null;
          s.wait = 0.6;
        }
      }
      if (s.wait > 0) {
        s.wait -= dt;
        if (s.wait <= 0) {
          if (s.booth === 2 && s.targets.every((t) => t.down) && s.shots > 0 && !s.reset) {
            s.targets = targets(2);
            s.reset = true;
          }
          if (s.shots === 0) {
            s.done[s.booth] = true;
            s.booth = -1;
            player.visible = true;
            player.fixedCam = null;
            player.control = true;
            if (s.done.every(Boolean)) collect();
          }
        }
      }
    }
    setHud({
      score: `${total()} pts`,
      objective: s.booth < 0 ? 'Elegí un puesto · acercate y E' : `${names[s.booth]} · ${s.shots} tiros`,
      lines:
        s.booth < 0
          ? names.map((n, i) => `${s.done[i] ? '✓' : '○'} ${n}: ${s.scores[i]}`)
          : [
              s.booth === 1 ? `Potencia ${Math.round(s.power * 100)}% · aro = caída` : 'Apuntá · clic / tocá / F',
              ...s.scores.map((v, i) => `${names[i]}: ${v}`),
            ],
    });
    if (s.refresh > 0.05) {
      s.refresh = 0;
      render((n) => n + 1);
    }
  });
  const f = s.flight,
    k = f ? Math.min(1, f.t / f.duration) : 0;
  const projectile: V3 = f
    ? [
        f.start[0] + (f.end[0] - f.start[0]) * k,
        f.start[1] + (f.end[1] - f.start[1]) * k + 3 * k * (1 - k),
        f.start[2] + (f.end[2] - f.start[2]) * k,
      ]
    : [0, -10, 0];
  return (
    <>
      <art.SkyRig time="tarde" fogFar={130} />
      <Spawn pos={[0, 0, 6]} />
      <Ground size={70} mat="dirt" color="#b58a55" />
      <Scenery />
      <FxLayer fx={fx} />
      {s.booth < 0 && <Label pos={[0, 6, -16]} text={`${nombre} · ${total()} pts`} h={1} />}
      {xs.map((x, i) => (
        <group key={i}>
          <Block pos={[x, 1, -3]} size={[7, 1.1, 1]} mat="wood" color={['#d94e54', '#248c92', '#7771bd'][i]} />
          {[-3.2, 3.2].map((dx) => (
            <Cyl key={dx} pos={[x + dx, 3.2, -6]} r={0.09} h={6.4} mat="wood" color="#dcbb87" solid={false} />
          ))}
          <Block pos={[x, 6.6, -5]} size={[7, 0.35, 6]} mat="cloth" color={['#e95d55', '#32b2ad', '#8b79d6'][i]} />
          <Label pos={[x, 2.2, -3]} text={`${names[i]} · ${s.scores[i]} pts`} h={0.45} />
          <Block pos={[x, 1, -8]} size={[7, 0.25, 6]} mat="wood" color="#804b30" solid={false} />
          {i === 0 &&
            [
              [-7, 1.65],
              [-10, 3.25],
            ].map(([z, y]) => (
              <Block key={z} pos={[x, y, z]} size={[6.5, 0.12, 1]} mat="wood" color="#dcbb87" solid={false} />
            ))}
          <Interactable
            pos={[x, 0, -0.8]}
            radius={2}
            label={s.done[i] ? 'Puesto completado' : `Jugar ${names[i]}`}
            onUse={() => start(i)}
            enabled={() => s.booth < 0 && !s.done[i] && !s.ending}
          />
        </group>
      ))}
      {(s.booth >= 0 ? s.targets : xs.flatMap((_, i) => targets(i, moviles))).map((t, i) => (
        <group key={i} position={t.p} rotation-z={t.rot} visible={!t.down || s.booth === 2}>
          {s.booth === 1 ? (
            <Cyl pos={[0, 0.2, 0]} r={0.13} h={0.6} color="#29a879" mat="glass" solid={false} />
          ) : s.booth === 0 && t.moving ? (
            <>
              <Ball pos={[0, 0, 0]} r={0.35} color="#e84945" />
              <Ball pos={[0.35, 0.2, 0]} r={0.17} color="#ffd44b" />
            </>
          ) : (
            <Cyl
              pos={[0, 0, 0]}
              r={0.26}
              h={0.55}
              color={i % 2 ? '#ce693c' : '#c8d4dd'}
              mat={i % 2 ? 'stucco' : 'metal'}
              solid={false}
            />
          )}
          {!t.down && s.booth !== 2 && <Label pos={[0, 0.65, 0]} text={`${t.points}`} h={0.3} />}
        </group>
      ))}
      {s.booth >= 0 && (
        <>
          <Label
            pos={s.aim}
            text={s.booth === 1 ? '◎' : '⊕'}
            h={0.45}
            fg="#fff27b"
            bg="transparent"
            depthTest={false}
          />
          {s.booth === 1 &&
            Array.from({ length: 10 }, (_, i) => {
              const a = i / 9;
              return (
                <Ball
                  key={i}
                  pos={[
                    xs[1] + (s.aim[0] - xs[1]) * a,
                    1.6 + (s.aim[1] - 1.6) * a + 3 * a * (1 - a),
                    -1.8 + (s.aim[2] + 1.8) * a,
                  ]}
                  r={0.035}
                  mat="neon"
                  color="#fff6aa"
                />
              );
            })}
        </>
      )}
      {f &&
        (s.booth === 1 ? (
          <group position={projectile}>
            {Array.from({ length: 12 }, (_, i) => (
              <Ball
                key={i}
                pos={[Math.cos((i * Math.PI) / 6) * 0.28, 0, Math.sin((i * Math.PI) / 6) * 0.28]}
                r={0.055}
                mat="gold"
                color="#ffe36d"
              />
            ))}
          </group>
        ) : (
          <Ball pos={projectile} r={s.booth === 2 ? 0.18 : 0.09} color="#f5d0a0" />
        ))}
      <Block pos={[20, 3, 1]} size={[5, 0.25, 4]} mat="cloth" color="#f6cb49" solid={false} />
      <Block pos={[20, 1, 1]} size={[4, 2, 1]} mat="cloth" color="#d49a37" />
      <Label pos={[20, 3.4, 1]} text="Premios · 150 / 280 / 400" h={0.3} />
      <Interactable
        pos={[20, 0, 3]}
        label="Cobrar premios"
        onUse={collect}
        enabled={() => s.booth < 0 && s.done.some(Boolean) && !s.ending}
      />
    </>
  );
}
