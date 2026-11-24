// Confluencias del Patuca: la proa y la popa del pipante se reman por separado. Cada confluencia pide cruzar en
// diagonal: la proa en una boya y la popa en la otra. Si solo orientás la proa, la popa queda atravesada.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { MEDIDA, Objeto } from '../kit/objetos';
import { Poza } from '../kit/poza';
import { controles, cursor, duracion, limitar, Mesa, metas, mover, variante } from './comun';

type Remolino = { x: number; vel: number; giro: 1 | -1; popa: boolean };
type Estado = ReturnType<typeof cursor> & {
  proa: number;
  popa: number;
  meta: [number, number];
  falta: number;
  remolinos: Remolino[];
  afluente: number;
  espera: number;
  cruces: number;
  atravesadas: number;
  fuera: number;
  postal: number;
  remadas: number;
  azar: () => number;
};
type Param = { intervalo: number; tol: number; fuerza: number; afluente: number; seed: number };
type Sesion = Motor<Param, Estado>;

const ZP = -1.7,
  ZS = 1.7;
const X = (x: number) => -1 + x * 3.6;
const LARGO = 1.2;

function nuevaMeta(s: Estado): [number, number] {
  const r = s.azar,
    proa = (r() * 2 - 1) * 0.75,
    lado = proa > 0 ? -1 : 1;
  return [proa, limitar(proa + lado * (0.35 + r() * 0.45))];
}
function remar(m: Sesion, extremo: 'proa' | 'popa') {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.2;
  s.remadas++;
  s[extremo] = limitar(s[extremo] + (s.x - s[extremo]) * 0.45);
  // el pipante no se dobla: si un extremo se aleja de más, arrastra al otro
  const otro = extremo === 'proa' ? 'popa' : 'proa',
    d = s[extremo] - s[otro];
  if (Math.abs(d) > LARGO) s[otro] = s[extremo] - Math.sign(d) * LARGO;
}
function confluencia(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    toast = useGame.getState().toast;
  const proa = Math.abs(s.proa - s.meta[0]) <= p.tol,
    popa = Math.abs(s.popa - s.meta[1]) <= p.tol;
  if (proa && popa) {
    s.cruces++;
    m.sumar(50);
  } else if (proa) {
    s.atravesadas++;
    s.postal = 3;
    m.sumar(-25);
    toast('La proa ya dobló; la popa quedó atravesada.', '🛶');
  } else {
    s.fuera++;
    m.sumar(-20);
    toast('Te saliste de la diagonal de la confluencia.', '🌀');
  }
  s.meta = nuevaMeta(s);
  s.falta = p.intervalo;
}

const motor = defineMotor({
  id: 'graciasadios.pipante',
  modos: { duo: { tipo: 'compartido', cada: 2 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'rio',
  guia: {
    goal: 'En cada confluencia, la proa va a la boya de adelante y la popa a la de atrás: así cruzás en diagonal. Poné el remo con el cursor; F rema en la proa y E en la popa. Los remolinos empujan cada punta por su lado.',
    ...controles('remar en la proa', 'remar en la popa', 'poner el remo'),
  },
  etapa: (p) => ({
    intervalo: 4 - p.dif * 1.2,
    tol: 0.22 - p.dif * 0.05,
    fuerza: 0.18 + p.dif * 0.18,
    afluente: variante(p) === 'la-popa-anda-por-su-cuenta' ? 0.2 : 0,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const azar = rng(p.seed);
    const s: Estado = {
      ...cursor(),
      proa: 0,
      popa: 0,
      meta: [0, 0],
      falta: p.intervalo + 1,
      remolinos: [0, 1, 2].map((k) => ({
        x: azar() * 2 - 1,
        vel: 0.3 + azar() * 0.3,
        giro: azar() < 0.5 ? 1 : -1,
        popa: k !== 0,
      })),
      afluente: 1,
      espera: 0,
      cruces: 0,
      atravesadas: 0,
      fuera: 0,
      postal: 0,
      remadas: 0,
      azar,
    };
    s.meta = nuevaMeta(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.postal = Math.max(0, s.postal - dt);
    // los remolinos se pasean de orilla a orilla y empujan la punta que les queda cerca
    for (const r of s.remolinos) {
      r.x += r.vel * dt;
      if (Math.abs(r.x) > 1) {
        r.x = Math.sign(r.x);
        r.vel = -r.vel;
      }
      const extremo = r.popa ? 'popa' : 'proa',
        cerca = Math.exp(-(((s[extremo] - r.x) / 0.35) ** 2));
      s[extremo] = limitar(s[extremo] + r.giro * p.fuerza * cerca * dt);
    }
    // el afluente empuja la popa con la carga corrida; cambia de lado cada tres confluencias
    if (p.afluente) {
      s.afluente = Math.floor((s.cruces + s.atravesadas + s.fuera) / 3) % 2 ? -1 : 1;
      s.popa = limitar(s.popa + s.afluente * p.afluente * dt);
    }
    s.falta -= dt;
    if (s.falta <= 0) confluencia(m);
    if (input.take('fire')) remar(m, 'proa');
    if (input.take('use')) remar(m, 'popa');
    m.objetivo = `Confluencia en ${Math.max(0, s.falta).toFixed(1)} s: proa y popa a sus boyas`;
    m.lineas = [
      `Proa ${Math.abs(s.proa - s.meta[0]) <= p.tol ? '✔' : '✘'} · Popa ${Math.abs(s.popa - s.meta[1]) <= p.tol ? '✔' : '✘'}${p.afluente ? ` · Afluente empuja la popa ${s.afluente > 0 ? '→' : '←'}` : ''}`,
      `Cruces ${s.cruces} · Atravesadas ${s.atravesadas} · Fuera ${s.fuera}`,
    ];
    m.stats = { x: s.x, cruces: s.cruces, atravesadas: s.atravesadas, fuera: s.fuera, remadas: s.remadas };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0) return;
    s.auto = true;
    const ep = s.meta[0] - s.proa,
      es = s.meta[1] - s.popa;
    if (Math.max(Math.abs(ep), Math.abs(es)) < 0.04) return;
    // rema donde el remo deja la punta justo en su boya
    const extremo = Math.abs(ep) >= Math.abs(es) ? 'proa' : 'popa';
    s.x = limitar(s[extremo] + (extremo === 'proa' ? ep : es) / 0.45);
    remar(m, extremo);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      loco = m.parametros.afluente > 0;
    const dx = X(s.popa) - X(s.proa),
      dz = ZS - ZP,
      largo = Math.hypot(dx, dz),
      giro = Math.atan2(dx, dz);
    const mx = X(s.meta[1]) - X(s.meta[0]);
    return (
      <Mesa titulo={loco ? 'Afluente del Patuca · carga corrida' : 'Confluencia del Patuca'}>
        <Poza pos={[-1, 0.76, 0]} size={[9.4, 0.06, 6.6]} color="#3d8f8a" hondo="#173532" seed={4} />
        <Poza pos={[2.6, 0.77, -2.6]} size={[2.6, 0.06, 1.6]} rot={0.7} color="#5aa6a0" seed={9} />
        {/* guía de la diagonal entre las dos boyas */}
        <Block
          pos={[(X(s.meta[0]) + X(s.meta[1])) / 2, 0.8, 0]}
          size={[0.06, 0.02, Math.hypot(mx, dz)]}
          rot={Math.atan2(mx, dz)}
          color="#ffd166"
          solid={false}
        />
        <Cyl pos={[X(s.meta[0]), 0.95, ZP]} r={0.22} h={0.3} color="#f77f00" solid={false} />
        <Cyl pos={[X(s.meta[1]), 0.95, ZS]} r={0.22} h={0.3} color="#fcbf49" solid={false} />
        {s.remolinos.map((r, k) => (
          <Cyl
            key={k}
            pos={[X(r.x), 0.8, r.popa ? ZS + 0.45 * (k - 1.5) : ZP]}
            r={0.45}
            rTop={0.3}
            h={0.04}
            sides={12}
            color={r.giro > 0 ? '#a8dadc' : '#cdeaf0'}
            solid={false}
          />
        ))}
        <group>
          <Objeto
            k="cayuco"
            pos={[(X(s.proa) + X(s.popa)) / 2, 0.81, 0]}
            scale={[0.42 / MEDIDA.cayuco[0], 0.22 / MEDIDA.cayuco[1], largo / MEDIDA.cayuco[2]]}
            rot={giro}
            c="#7f5539"
          />
          <Ball pos={[X(s.proa), 1.08, ZP]} r={0.16} color="#e63946" />
          <Ball pos={[X(s.popa), 1.08, ZS]} r={loco ? 0.2 : 0.16} color="#ffb703" />
          {loco && (
            <Block
              pos={[X(s.popa), 1.08, ZS + 0.3]}
              size={[0.22, 0.12, 0.4 + Math.abs(s.popa - s.meta[1]) * 2]}
              color="#c9a46b"
              solid={false}
            />
          )}
          <Block
            pos={[(X(s.proa) + X(s.popa)) / 2 + 0.05, 1.12, 0.2]}
            size={[0.3, 0.22, 0.4]}
            color="#606c38"
            solid={false}
          />
        </group>
        <Block pos={[X(s.x), 1.3, 0]} size={[0.08, 0.06, 1.2]} rot={0.4} color="#bc6c25" mat="wood" solid={false} />
        <Label pos={[X(s.x), 1.75, 0]} text="remo" h={0.22} />
        <Label pos={[X(s.meta[0]), 1.5, ZP - 0.4]} text="proa" h={0.24} />
        <Label pos={[X(s.meta[1]), 1.5, ZS + 0.5]} text="popa" h={0.24} />
        {loco && s.postal > 0 && (
          <Label pos={[X(s.proa), 2.3, ZP]} text="📮 Postal de la proa: «¡Regresá, popa!»" h={0.28} />
        )}
      </Mesa>
    );
  },
});
export const Pipante = motor.Escena;
export const guia = motor.guia;
