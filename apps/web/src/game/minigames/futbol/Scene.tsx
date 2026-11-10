// FÚTBOL DE BARRIO ("potra"): 3 contra 3 en una cancha de tierra encerrada entre muros y casas.
// La lógica (pelota, IA, goles, reloj) vive en ./sim.ts; aquí se dibuja y se conecta con el jugador y el HUD.

import { useFrame } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { audio } from '../../../core/audio';
import { SHOP } from '../../../core/data';
import { input } from '../../../core/input';
import { phys } from '../../../core/phys';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import type { AvatarConfig, AvatarState } from '../../../core/types';
import { art, Block, Cyl, Ground, Label, P, Plate, Spawn, useMgTick } from '../../kit';
import { finish, partida, rulesOf, setHud } from '../api';
import { DEF, type Ev, Match, type Params } from './sim';

const TEAM_A = 'Catrachos',
  TEAM_B = 'Barrio Abajo';
const { hw: HW, hl: HL, gw: GW, gh: GH, gd: GD, r: BR } = DEF;
const kit = (
  skin: number,
  shirtColor: string,
  pantsColor: string,
  extra: Partial<AvatarConfig> = {},
): AvatarConfig => ({
  ...SHOP.defaultAvatar,
  skin: SHOP.skin[skin],
  shirt: 'camisa_basica',
  shirtColor,
  pants: 'short_futbol',
  pantsColor,
  ...extra,
});
// índice = id del jugador en la simulación (0 eres tú y lo dibuja el controlador)
const SQUAD: ({ name: string; cfg: AvatarConfig } | null)[] = [
  null,
  { name: 'CatrachoPro', cfg: kit(1, '#ffffff', '#0d47a1', { shirt: 'camisa_h', hair: 'pelo_rizado' }) },
  { name: 'ElPulpero', cfg: kit(3, '#ffc93c', '#0d47a1', { hat: 'gorra', hatColor: '#0d47a1' }) },
  { name: 'Olanchano22', cfg: kit(2, '#e63946', '#1d1d1f', { hair: 'pelo_corto', hairColor: '#3b2414' }) },
  { name: 'xX_Tegus_Xx', cfg: kit(4, '#e63946', '#1d1d1f', { hair: 'calvo' }) },
  { name: 'Motagüense', cfg: kit(0, '#2ea44f', '#1d1d1f', { hat: 'gorra', hatColor: '#1d1d1f' }) },
];
const FANS: { pos: [number, number, number]; rot: number; cfg: AvatarConfig }[] = [
  { pos: [-12.4, 0, -5], rot: Math.PI / 2, cfg: kit(2, '#ff7a3d', '#607d8b', { pants: 'jeans', hair: 'pelo_largo' }) },
  {
    pos: [12.4, 0, 3.5],
    rot: -Math.PI / 2,
    cfg: kit(5, '#7b5cff', '#1d1d1f', { pants: 'jeans', hat: 'sombrero_junco', hatColor: '#d9b36a' }),
  },
  {
    pos: [12.6, 0, -8],
    rot: -Math.PI / 2,
    cfg: kit(1, '#00a3d7', '#ffffff', { shirt: 'camisa_h_azul', hair: 'pelo_largo', hairColor: '#6b3a1a' }),
  },
];
const LINE = '#f4f1e6',
  DIRT = '#c9975c';

/** Líneas pintadas de la cancha (cajas muy bajas, sin colisión). */
function Lines() {
  const y = 0.035,
    h = 0.03,
    w = 0.14,
    L = (pos: [number, number], size: [number, number], key: string) => (
      <Block
        key={key}
        pos={[pos[0], y, pos[1]]}
        size={[size[0], h, size[1]]}
        color={LINE}
        mat="concrete"
        solid={false}
        cast={false}
      />
    );
  const out = [
    L([-HW + 0.1, 0], [w, HL * 2], 'w'),
    L([HW - 0.1, 0], [w, HL * 2], 'e'),
    L([0, -HL + 0.1], [HW * 2, w], 'n'),
    L([0, HL - 0.1], [HW * 2, w], 's'),
    L([0, 0], [HW * 2, w], 'c'),
  ];
  for (const s of [-1, 1]) {
    out.push(
      L([0, s * (HL - 4.2)], [9, w], `a${s}`),
      L([-4.5, s * (HL - 2.1)], [w, 4.2], `al${s}`),
      L([4.5, s * (HL - 2.1)], [w, 4.2], `ar${s}`),
    );
  }
  return (
    <>
      {out}
      <Cyl pos={[0, 0.03, 0]} r={2.7} h={0.03} color={LINE} mat="concrete" solid={false} cast={false} sides={32} />
      <Cyl pos={[0, 0.034, 0]} r={2.56} h={0.03} color={DIRT} mat="dirt" solid={false} cast={false} sides={32} />
      <Cyl pos={[0, 0.04, 0]} r={0.2} h={0.03} color={LINE} mat="concrete" solid={false} cast={false} sides={12} />
    </>
  );
}

/** Muros, mallas y porterías. La pelota rebota con límites analíticos (sim.ts); esto es lo que se ve. */
function Arena() {
  const WALL = '#2aa7d8',
    TRIM = '#ffffff',
    NET = '#31574b';
  return (
    <>
      {/* laterales: muro pintado azul y blanco */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Block
            pos={[s * (HW + 0.3), 0.75, 0]}
            size={[0.5, 1.5, HL * 2 + 1.2]}
            color={WALL}
            mat="stucco"
            solid={false}
          />
          <Block
            pos={[s * (HW + 0.3), 1.62, 0]}
            size={[0.56, 0.24, HL * 2 + 1.2]}
            color={TRIM}
            mat="stucco"
            solid={false}
            cast={false}
          />
        </group>
      ))}
      {/* fondo norte (portería rival): muro alto con mural */}
      {[-1, 1].map((s) => (
        <Block
          key={s}
          pos={[s * (GW / 2 + (HW - GW / 2 + 0.55) / 2), 1.6, -HL - 0.3]}
          size={[HW - GW / 2 + 0.55, 3.2, 0.5]}
          color={s < 0 ? '#ffd23f' : '#ff7a3d'}
          mat="stucco"
          solid={false}
        />
      ))}
      <Block
        pos={[0, GH + 0.45, -HL - 0.3]}
        size={[GW, 0.7, 0.5]}
        color={TRIM}
        mat="stucco"
        solid={false}
        cast={false}
      />
      <Block
        pos={[0, GH / 2, -HL - GD - 0.12]}
        size={[GW + 0.5, GH, 0.2]}
        color={NET}
        mat="cloth"
        solid={false}
        cast={false}
      />
      {[-1, 1].map((s) => (
        <Block
          key={s}
          pos={[s * (GW / 2 + 0.12), GH / 2, -HL - GD / 2 - 0.25]}
          size={[0.2, GH, GD - 0.5]}
          color={NET}
          mat="cloth"
          solid={false}
          cast={false}
        />
      ))}
      <P.Goal pos={[0, 0, -HL]} w={GW} h={GH} />
      {/* fondo sur (tu portería): muro bajo para que la cámara vea por encima */}
      {[-1, 1].map((s) => (
        <Block
          key={s}
          pos={[s * (GW / 2 + (HW - GW / 2 + 0.55) / 2), 0.45, HL + 0.3]}
          size={[HW - GW / 2 + 0.55, 0.9, 0.5]}
          color={WALL}
          mat="stucco"
          solid={false}
        />
      ))}
      <P.Goal pos={[0, 0, HL]} rot={Math.PI} w={GW} h={GH} />
      <Plate pos={[-6.4, 2.25, -HL - 0.03]} text="⚽ POTRA DEL BARRIO" h={0.7} fg="#0d47a1" bg="#ffffff" />
      <Plate pos={[6.4, 2.25, -HL - 0.03]} text="¡Arriba Honduras!" h={0.7} fg="#ffffff" bg="#0d47a1" />
    </>
  );
}

function Barrio() {
  return (
    <>
      <P.House pos={[17.5, 0, -10]} rot={-Math.PI / 2} w={7} d={5} color="#f6c453" />
      <P.House
        pos={[17.5, 0, -1]}
        rot={-Math.PI / 2}
        w={7}
        d={5}
        floors={2}
        color="#7fd1c8"
        sign="Pulpería La Bendición"
      />
      <P.House pos={[17.5, 0, 9]} rot={-Math.PI / 2} w={7} d={5} color="#f29c9c" roofColor="#8d4a3a" />
      <P.House pos={[-17.5, 0, -9]} rot={Math.PI / 2} w={7} d={5} floors={2} color="#c7b3f5" />
      <P.House pos={[-17.5, 0, 2]} rot={Math.PI / 2} w={8} d={5} color="#ffb27a" sign="Barbería El Crack" />

      <P.Stall pos={[-13.2, 0, 11]} rot={Math.PI / 2} sign="Topogigios" color="#00a3d7" />

      <P.Bench pos={[-12.4, 0, -8.5]} rot={Math.PI / 2} />
      <P.Lamp pos={[-11.4, 0, -17]} />
      <P.Lamp pos={[11.4, 0, -17]} />
      <P.Tree pos={[-14, 0, 17]} />
      <P.Tree pos={[15, 0, 17.5]} scale={1.15} />
      <P.Flag pos={[12.6, 0, -15]} height={6.5} />
      <P.Mototaxi pos={[13.6, 0, 12.5]} rot={0.3} />
    </>
  );
}

function Fans({ cheer }: { cheer: { until: number } }) {
  const states = useMemo(() => FANS.map(() => ({ anim: 'clap', speed: 0 }) as AvatarState), []);
  useFrame(() => {
    const c = performance.now() < cheer.until;
    states.forEach((s, i) => {
      s.anim = c ? 'celebrate' : i === 1 ? 'idle' : 'clap';
    });
  });
  return (
    <>
      {FANS.map((f, i) => (
        <group key={i} position={f.pos} rotation-y={f.rot}>
          <art.Avatar config={f.cfg} state={states[i]} />
        </group>
      ))}
    </>
  );
}

/** Rivales según la etapa: en la 1 corren, tiran y atajan peor; en la última, mejor que el valor de siempre. */
const rivalesDe = (dif: number): Partial<Params> => ({
  rivSpeed: 5.0 + 1.0 * dif,
  rivErr: 0.16 - 0.08 * dif,
  rivTackle: 0.28 + 0.12 * dif,
  gkSave: [DEF.gkSave[0], 0.68 + 0.17 * dif],
  gkReact: [DEF.gkReact[0], 0.3 - 0.1 * dif],
});

export function FutbolScene() {
  const rules = rulesOf('futbol');
  const match = useMemo(
    () => new Match(rules.duration, (Math.random() * 2 ** 31) | 0, rivalesDe(partida().dif)),
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const states = useMemo(() => match.ents.map(() => ({ anim: 'idle', speed: 0 }) as AvatarState), [match]);
  const groups = useRef<(THREE.Group | null)[]>([]);
  const ball = useRef<THREE.Group>(null),
    spin = useRef<THREE.Group>(null),
    shadow = useRef<THREE.Mesh>(null),
    ring = useRef<THREE.Mesh>(null);
  const done = useRef(false),
    cheer = useRef({ until: 0 }).current;
  const [banner, setBanner] = useState<null | { text: string; z: number }>(null);
  const axis = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    player.camPitch = 0.68;
    player.camDist = 14;
    player.control = false;
    phys.limit = { minX: -HW + 0.45, maxX: HW - 0.45, minZ: -HL + 0.45, maxZ: HL - 0.45 };
    if (location.hash.includes('test')) {
      const w = window as any;
      w.__mcTest = { ...(w.__mcTest ?? {}), futbol: { m: match, P: DEF } };
    }
  }, [match]);

  const onEvent = (e: Ev) => {
    const g = useGame.getState();
    if (e.type === 'kick') {
      audio.sfx('kick');
      if (e.by === 0) player.play('kick', 0.35);
    } else if (e.type === 'whiff') player.play('kick', 0.3);
    else if (e.type === 'save' || e.type === 'post') audio.sfx('hit');
    else if (e.type === 'whistle') audio.sfx('whistle');
    else if (e.type === 'goal') {
      audio.sfx('whistle');
      audio.sfx('goal');
      if (e.team === 0) {
        g.toast('¡GOOOL!', '⚽');
        player.play('celebrate', 2.5);
        cheer.until = performance.now() + 3200;
        setBanner({ text: '¡GOOOL!', z: -HL });
      } else {
        g.toast(`Gol de ${TEAM_B}`, '😬');
        setBanner({ text: `Gol de ${TEAM_B}`, z: HL });
      }
    } else if (e.type === 'reset') {
      const s = match.humanSpot();
      player.teleport(s[0], 0, s[1], 0);
      setBanner(null);
    } else if (e.type === 'end') g.toast('¡Final del partido!', '🏁');
  };

  useMgTick((dt) => {
    const m = match,
      b = player.body;
    const fire = input.take('fire'),
      alt = input.take('alt');
    for (const e of m.step(dt, { x: b.pos[0], z: b.pos[2], vx: b.vel[0], vz: b.vel[2], yaw: player.yaw, fire, alt }))
      onEvent(e);
    player.control = m.state === 'play' || m.state === 'goal';
    const near = Math.hypot(m.ball.p[0] - b.pos[0], m.ball.p[2] - b.pos[2]);
    player.speedMul = m.state === 'play' && near < 1.3 && m.ball.lastId === 0 ? m.P.carryMul : 1;
    setHud({
      timer: Math.ceil(m.clock),
      score: `${m.score[0]} - ${m.score[1]}`,
      objective: `${TEAM_A} vs ${TEAM_B}`,
      lines: [
        near < m.P.kickRange
          ? '¡Dale! · 🎯 / F: tiro · Q: pase'
          : `Pelota: ${Math.round(near)} m ${m.ball.p[2] < b.pos[2] ? '↑' : '↓'} ${m.ball.p[0] < b.pos[0] ? '←' : '→'} · 🎯 / F: tiro · Q: pase`,
      ],
    });
    if (m.state === 'over') {
      player.control = false;
      if (!done.current && m.stateT > 1.1) {
        done.current = true;
        const [a, c] = m.score,
          won = a > c;
        if (won) player.play('celebrate', 4);
        finish({
          won,
          stars: !won ? 0 : a >= rules.goldGoals ? 3 : a - c >= 2 ? 2 : 1,
          score: a,
          label: a === c ? `Empate ${a} - ${c}` : `${a} - ${c}`,
          stats: { goals: a },
        });
      }
    }
  });

  // dibujar: también corre en la tarjeta de inicio y en los resultados
  useFrame((_, rawDt) => {
    const m = match,
      dt = Math.min(rawDt, 0.05);
    m.ents.forEach((e, i) => {
      const g = groups.current[i];
      if (!g) return;
      g.position.set(e.x, 0, e.z);
      g.rotation.y = e.yaw + Math.PI;
      states[i].anim = e.anim;
      states[i].speed = Math.hypot(e.vx, e.vz);
    });
    const p = m.ball.p,
      v = m.ball.v;
    if (ball.current) ball.current.position.set(p[0], p[1], p[2]);
    const sp = Math.hypot(v[0], v[2]);
    if (spin.current && sp > 0.05) {
      axis.set(v[2] / sp, 0, -v[0] / sp);
      spin.current.rotateOnWorldAxis(axis, (sp * dt) / BR);
    }
    if (shadow.current) {
      shadow.current.position.set(p[0], 0.05, p[2]);
      const s = Math.max(0.5, 1 - (p[1] - BR) * 0.18);
      shadow.current.scale.set(s, s, 1);
    }
    if (ring.current) {
      const b = player.pos;
      ring.current.position.set(b[0], 0.06, b[2]);
      const can = m.state === 'play' && Math.hypot(p[0] - b[0], p[2] - b[2]) < m.P.kickRange && p[1] < 1.5;
      ring.current.material = art.material('neon', can ? '#ffd23f' : '#35c7f0');
    }
  });

  return (
    <>
      <art.SkyRig time="tarde" shadowRadius={30} />
      <Spawn pos={[0, 0, 1.5]} yaw={0} />
      <Ground size={170} color="#86b25c" mat="grass" />
      <Ground size={[HW * 2 + 1.6, HL * 2 + 4.2]} y={0.02} color={DIRT} mat="dirt" />
      <Lines />
      <Arena />
      <Barrio />
      <Fans cheer={cheer} />

      {match.ents.map(
        (e, i) =>
          SQUAD[i] && (
            <group
              key={i}
              ref={(g) => {
                groups.current[i] = g;
              }}
              position={[e.x, 0, e.z]}
            >
              <art.Avatar config={SQUAD[i]!.cfg} state={states[i]} name={SQUAD[i]!.name} />
            </group>
          ),
      )}
      <group ref={ball} position={[0, BR, 0]}>
        <group ref={spin}>
          <P.SoccerBall r={BR} />
        </group>
      </group>
      <mesh ref={shadow} rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
        <circleGeometry args={[BR * 1.1, 16]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.06, 1.5]} material={art.material('neon', '#35c7f0')}>
        <ringGeometry args={[0.62, 0.78, 28]} />
      </mesh>
      {banner && (
        <Label
          pos={[0, 5.2, banner.z * 0.55]}
          text={banner.text}
          h={banner.z < 0 ? 2.4 : 1.4}
          fg={banner.z < 0 ? '#ffd23f' : '#ffffff'}
          depthTest={false}
        />
      )}
    </>
  );
}
