// ¡Corré, que viene la chepa!: jugás de asaltante de caricatura. Juntás bolsas de pisto por las calles de noche
// y las guardás en la guarida sin que te agarren los chepos. Entre más cargás, más lento corrés.
import { audio } from '../../../core/audio';
import { SHOP } from '../../../core/data';
import { player } from '../../../core/player';
import type { AvatarConfig, AvatarState } from '../../../core/types';
import { art, Ball, Block, Label, P } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { type Caminante, caminar, parada, rumbo } from './capital/calles';
import { Ciudad, useCiudad } from './capital/ciudad';
import {
  type Aviso,
  AvisoFlotante,
  type Carro,
  crearTrafico,
  dondeCarro,
  Flecha,
  Marca,
  moverTrafico,
  SobreJugador,
} from './capital/piezas';

const GUARIDA: [number, number] = [-2.6, 30];
const CARGA_MAX = 4;
/** contenedores de basura en las esquinas: quieto detrás de uno, los chepos no te ven */
const ESCONDITES: [number, number][] = [
  [-5.1, 5.1],
  [18.9, -5.1],
  [-29.1, -18.9],
  [29.1, 29.1],
  [5.1, -29.1],
  [-18.9, 29.1],
];
const CHEPO: AvatarConfig = {
  ...SHOP.defaultAvatar,
  shirtColor: '#1d3557',
  pantsColor: '#14213d',
  hat: 'gorra',
  hatColor: '#14213d',
  skin: '#a66f45',
} as AvatarConfig;

type Chepo = Caminante & {
  tx: number;
  tz: number;
  persigue: number;
  mareo: number;
  st: AvatarState;
};
type Bolsa = { x: number; z: number };
type Param = {
  chepos: number;
  vista: number;
  velChepo: number;
  bolsas: number;
  patrullas: number;
  nombre: string;
  seed: number;
};
type Asalto = {
  r: () => number;
  chepos: Chepo[];
  bolsas: Bolsa[];
  patrullas: Carro[];
  lleva: number;
  guardadas: number;
  agarrones: number;
  escudo: number;
  ayuda: number;
  escondido: boolean;
  antes: [number, number];
  pop: Aviso;
  mensaje: string;
};
type Sesion = Motor<Param, Asalto>;

const lejos = (x: number, z: number) => Math.hypot(player.pos[0] - x, player.pos[2] - z);
function nuevaBolsa(s: Asalto): Bolsa {
  let p = parada(s.r);
  for (let i = 0; i < 20; i++) {
    if (Math.hypot(p.ax - GUARIDA[0], p.az - GUARIDA[1]) > 14 && lejos(p.ax, p.az) > 8) break;
    p = parada(s.r);
  }
  return { x: p.ax, z: p.az };
}
function agarrar(m: Sesion) {
  const s = m.datos;
  s.agarrones++;
  m.sumar(-15);
  s.mensaje =
    s.lleva > 0 ? `¡Te agarró la chepa! Perdiste ${s.lleva} bolsa${s.lleva > 1 ? 's' : ''}.` : '¡Te agarró la chepa!';
  s.pop = { texto: '−15 🚨', t: 1.5 };
  s.lleva = 0;
  s.escudo = 2.5;
  player.speedMul = 1;
  player.teleport(GUARIDA[0], 0.2, GUARIDA[1] + 3, 0);
  for (const c of s.chepos) c.persigue = 0;
  audio.sfx('whistle');
}
function guardar(m: Sesion) {
  const s = m.datos,
    total = s.lleva * 25 + (s.lleva - 1) * 10;
  m.sumar(total);
  s.guardadas += s.lleva;
  s.mensaje = `+${total} · ¡${s.lleva} bolsa${s.lleva > 1 ? 's' : ''} a la guarida!`;
  s.pop = { texto: `+${total}`, t: 1.5 };
  s.lleva = 0;
  player.speedMul = 1;
  audio.sfx('coin');
}

function Escena({ motor: m }: { motor: Sesion }) {
  useCiudad(() => m.cuenta > 0);
  const s = m.datos;
  const meta: [number, number] | null =
    m.cuenta > 0
      ? null
      : s.lleva >= CARGA_MAX || (s.lleva > 0 && s.bolsas.length === 0)
        ? GUARIDA
        : s.bolsas.reduce<[number, number] | null>(
            (mejor, b) => (!mejor || lejos(b.x, b.z) < lejos(mejor[0], mejor[1]) ? [b.x, b.z] : mejor),
            null,
          );
  const sirena = Math.floor(m.tiempo * 4) % 2 === 0;
  return (
    <>
      <Ciudad noche spawn={[[GUARIDA[0], 0.2, GUARIDA[1] + 3], 0]} />
      <Marca x={GUARIDA[0]} z={GUARIDA[1]} r={3} color="#ffb703" texto="🏚️ La guarida" />
      {s.bolsas.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <Ball pos={[0, 0.75, 0]} r={0.55} color="#e9c46a" mat="cloth" />
          <Ball pos={[0, 1.35, 0]} r={0.2} color="#c9a227" mat="cloth" />
          <Label pos={[0, 2.3, 0]} text="💰" h={0.55} bg="rgba(0,0,0,0)" />
        </group>
      ))}
      {ESCONDITES.map(([x, z], i) => (
        <group key={i}>
          <Block pos={[x, 0.85, z]} size={[1.7, 1.3, 1]} color="#2d6a4f" mat="metal" solid={false} />
          <Label pos={[x, 2.3, z]} text="🫣" h={0.5} bg="rgba(0,0,0,0)" />
        </group>
      ))}
      {s.chepos.map((c, i) => (
        <mesh key={`v${i}`} position={[c.x, 0.14, c.z]} rotation-x={-Math.PI / 2}>
          <ringGeometry
            args={[
              (c.persigue > 0 ? m.parametros.vista * 1.5 : m.parametros.vista) - 0.25,
              c.persigue > 0 ? m.parametros.vista * 1.5 : m.parametros.vista,
              40,
            ]}
          />
          <meshBasicMaterial
            color={c.persigue > 0 ? '#ff3b3b' : '#cfe8ff'}
            transparent
            opacity={c.persigue > 0 ? 0.7 : 0.45}
            depthWrite={false}
          />
        </mesh>
      ))}
      {s.chepos.map((c, i) => (
        <group key={i} position={[c.x, 0.2, c.z]} rotation-y={c.yaw}>
          <art.Avatar
            config={CHEPO}
            state={c.st}
            name={c.mareo > 0 ? '😵 Chepo' : c.persigue > 0 ? '🚨 Chepo' : '👮 Chepo'}
          />
        </group>
      ))}
      {s.patrullas.map((c, i) => {
        const [x, z, rot] = dondeCarro(c);
        return (
          <group key={i}>
            <P.Car pos={[x, 0, z]} rot={rot} color="#1d3557" solid={false} />
            <Ball pos={[x, 2.1, z]} r={0.28} color={sirena ? '#ff3b3b' : '#3b8bff'} mat="neon" />
          </group>
        );
      })}
      <SobreJugador
        texto={
          s.escondido
            ? `🫣 Escondido · 💰 ${s.lleva}/${CARGA_MAX}`
            : s.escudo > 0
              ? '😮‍💨 Te soltaron'
              : `🦹 Asaltante · 💰 ${s.lleva}/${CARGA_MAX}`
        }
        alto={2.7}
        fg="#ffe08a"
      />
      {m.cuenta > 0 && <SobreJugador texto={`¡Preparáte! ${Math.ceil(m.cuenta)}`} alto={4.4} />}
      <AvisoFlotante aviso={s.pop} alto={4.6} />
      <Flecha hacia={meta} color={meta === GUARIDA ? '#ffb703' : '#7cff6b'} />
    </>
  );
}

const motor = defineMotor({
  id: 'franciscomorazan.asalto',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  libre: { bots: [2.6, 0.2, 40], yaw: Math.PI },
  guia: {
    goal: 'Jugás de asaltante: juntá bolsas de pisto y guardalas en la guarida sin que te agarren los chepos.',
    keys: [
      ['WASD', 'correr por las calles'],
      ['Shift', 'correr más rápido'],
      ['Espacio', 'saltar'],
      ['Quieto en un 🫣', 'esconderte de los chepos'],
    ],
    touch: [
      ['Palanca', 'correr (a fondo, más rápido)'],
      ['⤴', 'saltar'],
      ['Quieto en un 🫣', 'esconderte'],
    ],
  },
  etapa: (p) => ({
    chepos: 2 + Math.round(p.dif * 3),
    vista: 9 + p.dif * 4,
    velChepo: 5.8 + p.dif * 1.4,
    bolsas: 6 - Math.round(p.dif * 2),
    patrullas: p.dif > 0.5 ? 2 : 1,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : '¡Corré, que viene la chepa!',
    seed: p.seed,
  }),
  metas: (p) => [90 + Math.round(p.dif * 60), 220 + Math.round(p.dif * 90), 360 + Math.round(p.dif * 120)],
  duracion: (p) => 80 + Math.round(p.dif * 20),
  crear: (p): Asalto => {
    const r = rng(p.seed),
      s: Asalto = {
        r,
        chepos: [],
        bolsas: [],
        patrullas: crearTrafico(p.patrullas, r, 7),
        lleva: 0,
        guardadas: 0,
        agarrones: 0,
        escudo: 0,
        ayuda: 0,
        escondido: false,
        antes: [GUARIDA[0], GUARIDA[1] + 3],
        pop: { texto: '', t: 0 },
        mensaje: 'Seguí la flecha verde: hay pisto tirado por todo el centro.',
      };
    // las dos primeras quedan cerca de la guarida para arrancar con algo
    s.bolsas.push({ x: 5.4, z: 19 }, { x: -5.4, z: 13 });
    while (s.bolsas.length < p.bolsas) s.bolsas.push(nuevaBolsa(s));
    for (let i = 0; i < p.chepos; i++) {
      let q = parada(r);
      for (let k = 0; k < 20 && Math.hypot(q.x - GUARIDA[0], q.z - GUARIDA[1]) < 30; k++) q = parada(r);
      const t = parada(r);
      s.chepos.push({
        x: q.x,
        z: q.z,
        tx: t.x,
        tz: t.z,
        yaw: 0,
        rodeo: null,
        persigue: 0,
        mareo: 0,
        st: { anim: 'walk', speed: 3 },
      });
    }
    // las patrullas no salen frente a la guarida
    for (const c of s.patrullas) if (Math.abs(c.t - GUARIDA[1]) < 20) c.t = -30;
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos,
      p = m.parametros;
    player.control = true;
    player.speedMul = 1 - s.lleva * 0.09;
    s.escudo = Math.max(0, s.escudo - dt);
    s.pop.t = Math.max(0, s.pop.t - dt);
    // escondido: quieto junto a un contenedor (la rapidez se mide por cuánto se movió, sirva quien sirva la entrada)
    const movido = Math.hypot(player.pos[0] - s.antes[0], player.pos[2] - s.antes[1]) / Math.max(dt, 1e-3);
    s.antes = [player.pos[0], player.pos[2]];
    const escondido = movido < 1 && ESCONDITES.some(([x, z]) => lejos(x, z) < 1.8);
    if (escondido && !s.escondido) {
      s.mensaje = '🫣 Escondido: si no te ven llegar, los chepos te pierden.';
      audio.sfx('click');
    }
    s.escondido = escondido;
    // juntar bolsas
    for (let i = s.bolsas.length - 1; i >= 0; i--) {
      const b = s.bolsas[i];
      if (s.lleva < CARGA_MAX && lejos(b.x, b.z) < 1.9) {
        s.bolsas.splice(i, 1);
        s.lleva++;
        s.mensaje =
          s.lleva >= CARGA_MAX
            ? '¡Ya no te cabe nada! Corré a la guarida.'
            : `💰 ${s.lleva} bolsa${s.lleva > 1 ? 's' : ''} · entre más llevás, más lento.`;
        audio.sfx('pickup');
      }
    }
    while (s.bolsas.length + s.lleva < p.bolsas) s.bolsas.push(nuevaBolsa(s));
    if (s.lleva > 0 && lejos(GUARIDA[0], GUARIDA[1]) < 3.2) guardar(m);
    // chepos
    if (s.ayuda > 0) s.ayuda -= dt;
    for (const c of s.chepos) {
      const d = lejos(c.x, c.z);
      if (c.mareo > 0) {
        c.mareo -= dt;
        c.st.anim = 'idle';
        continue;
      }
      // escondido solo te ven si ya los tenés encima
      const ve = s.escudo <= 0 && d < (c.persigue > 0 ? p.vista * 1.5 : p.vista) && (!s.escondido || d < 4);
      if (ve && c.persigue <= 0) {
        s.mensaje = '🚨 ¡Te vio un chepo! Corré.';
        audio.sfx('whistle');
      }
      c.persigue = ve ? 2.5 : Math.max(0, c.persigue - dt);
      if (c.persigue > 0 && s.escudo <= 0) {
        caminar(c, player.pos[0], player.pos[2], p.velChepo, dt);
        c.st.anim = 'run';
        if (d < 1.1) {
          agarrar(m);
          break;
        }
      } else {
        if (caminar(c, c.tx, c.tz, 3, dt) < 1.5) {
          const t = parada(s.r);
          c.tx = t.x;
          c.tz = t.z;
        }
        c.st.anim = 'walk';
      }
    }
    moverTrafico(s.patrullas, dt);
    for (const c of s.patrullas) {
      const [x, z] = dondeCarro(c);
      if (s.escudo <= 0 && lejos(x, z) < 2.3) agarrar(m);
    }
    const persiguen = s.chepos.filter((c) => c.persigue > 0).length;
    m.objetivo = s.lleva >= CARGA_MAX ? 'Llevá el pisto a la guarida' : 'Juntá bolsas de pisto 💰';
    m.lineas = [
      s.mensaje,
      `💰 Cargás ${s.lleva}/${CARGA_MAX} · Guardadas ${s.guardadas} · Te agarraron ${s.agarrones}${persiguen ? ` · 🚨 ${persiguen} te siguen` : ''}`,
      `Guarida: ${Math.round(lejos(GUARIDA[0], GUARIDA[1]))} m al ${rumbo(GUARIDA[0] - player.pos[0], GUARIDA[1] - player.pos[2])} · Shift o palanca a fondo para correr`,
    ];
    m.stats = {
      guardadas: s.guardadas,
      lleva: s.lleva,
      agarrones: s.agarrones,
      persiguen,
      escondido: s.escondido ? 1 : 0,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      // el compa le pide la hora a un chepo que te sigue y lo deja mareado
      if (s.ayuda > 0) return;
      const c = s.chepos.find((x) => x.persigue > 0 && x.mareo <= 0);
      if (c) {
        c.mareo = 3;
        c.persigue = 0;
        s.ayuda = 9;
        s.mensaje = '🤖 Tu compa distrajo a un chepo.';
      }
      return;
    }
    // jugador automático de prueba: corre (con la misma lentitud por carga) a la bolsa más cercana o a la guarida
    const cerca = s.chepos.some((c) => c.persigue > 0 && lejos(c.x, c.z) < 6);
    const masCerca = Math.min(...s.bolsas.map((b) => lejos(b.x, b.z)));
    const volver = s.lleva >= 2 || (s.lleva > 0 && (cerca || masCerca > lejos(GUARIDA[0], GUARIDA[1]) + 10));
    let tx = GUARIDA[0],
      tz = GUARIDA[1];
    if (!volver) {
      let mejor = Infinity;
      for (const b of s.bolsas) {
        const d = lejos(b.x, b.z);
        if (d < mejor) {
          mejor = d;
          tx = b.x;
          tz = b.z;
        }
      }
    }
    let dx = tx - player.pos[0],
      dz = tz - player.pos[2];
    const d = Math.hypot(dx, dz),
      paso = Math.min(d, player.sprint * (1 - s.lleva * 0.09) * dt);
    // se aparta de los chepos que vienen cerca
    for (const c of s.chepos) {
      const e = lejos(c.x, c.z);
      if (c.persigue > 0 && e < 7 && e > 0.01) {
        dx += ((player.pos[0] - c.x) / e) * d * 0.8;
        dz += ((player.pos[2] - c.z) / e) * d * 0.8;
      }
    }
    const n = Math.hypot(dx, dz);
    if (n > 0.01) {
      player.pos[0] += (dx / n) * paso;
      player.pos[2] += (dz / n) * paso;
      player.yaw = Math.atan2(-dx, -dz);
    }
  },
  Escena,
});
export const Asalto = motor.Escena;
export const guia = motor.guia;
