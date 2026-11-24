// Taxi a toda mecha: manejás un taxi por Tegucigalpa, subís pasajeros y los llevás antes de que se aburran.
import { useLayoutEffect, useMemo } from 'react';
import { audio } from '../../../core/audio';
import { input } from '../../../core/input';
import { player } from '../../../core/player';
import { useGame } from '../../../core/store';
import type { AvatarState } from '../../../core/types';
import { art } from '../../kit';
import { enterVehicle } from '../../PlayerController';
import { rng } from '../api';
import { botCfg } from '../corte/common';
import { defineMotor, type Motor } from '../kit';
import { LUGARES, parada, rumbo } from './capital/calles';
import { Ciudad, useCiudad } from './capital/ciudad';
import {
  type Aviso,
  AvisoFlotante,
  type Carro,
  crearTrafico,
  dondeCarro,
  Flecha,
  LuzTaxi,
  Marca,
  moverTrafico,
  SobreJugador,
  Trafico,
} from './capital/piezas';

const NOMBRES = [
  'Doña Tencha',
  'El profe Wilmer',
  'Yoselin',
  'Don Arnulfo',
  'La seño Rosa',
  'Brayan',
  'Doña Lupe',
  'Kevin',
];
const GRACIAS = ['¡Cheque, alero!', '¡Llegamos volando!', 'Tome, quédese con el vuelto.', '¡Qué chivo manejás!'];
const PRISA = 8;
/** velocidad normal del carro (PlayerController) y con turbo */
const VEL = 16,
  VEL_TURBO = 24,
  RECARGA = 5;

type Pasajero = { x: number; z: number; ax: number; az: number; nombre: string; destino: number; cfg: number };
type Param = { carros: number; velTrafico: number; ritmo: number; holgura: number; nombre: string; seed: number };
type Taxi = {
  r: () => number;
  carros: Carro[];
  fase: 'buscar' | 'llevar';
  pas: Pasajero;
  quedan: number;
  entregas: number;
  bajados: number;
  choques: number;
  racha: number;
  golpe: number;
  pito: number;
  turbo: number;
  carga: number;
  ayuda: boolean;
  pop: Aviso;
  mensaje: string;
};
type Sesion = Motor<Param, Taxi>;

const dist = (x: number, z: number) => Math.hypot(player.pos[0] - x, player.pos[2] - z);
const rapidez = () => Math.abs(player.vehicle?.speed ?? 0);

function nuevoPasajero(s: Taxi, n: number): Pasajero {
  let p = parada(s.r);
  for (let i = 0; i < 20; i++) {
    const d = dist(p.x, p.z);
    if (d > 14 && d < 42) break;
    p = parada(s.r);
  }
  let destino = Math.floor(s.r() * LUGARES.length);
  for (let i = 0; i < 20; i++) {
    const l = LUGARES[destino];
    if (Math.abs(l.x - p.x) + Math.abs(l.z - p.z) > 34) break;
    destino = Math.floor(s.r() * LUGARES.length);
  }
  return { ...p, nombre: NOMBRES[n % NOMBRES.length], destino, cfg: n % 4 };
}
function subir(m: Sesion) {
  const s = m.datos,
    l = LUGARES[s.pas.destino],
    camino = Math.abs(l.x - s.pas.x) + Math.abs(l.z - s.pas.z);
  s.fase = 'llevar';
  s.quedan = (m.parametros.holgura + camino / m.parametros.ritmo) * (s.ayuda ? 1.25 : 1);
  s.mensaje = `${s.pas.nombre}: «Al ${l.nombre}, y apurado.»`;
  audio.sfx('pickup');
}
function bajar(m: Sesion, pago: boolean) {
  const s = m.datos;
  if (pago) {
    s.racha = Math.min(5, s.racha + 1);
    const total = 25 + Math.ceil(s.quedan) * 2 + (s.racha - 1) * 5;
    m.sumar(total);
    s.entregas++;
    s.mensaje = `+${total} · ${GRACIAS[s.entregas % GRACIAS.length]}`;
    s.pop = { texto: `+${total}${s.racha > 1 ? ` · racha x${s.racha}` : ''}`, t: 1.5 };
    audio.sfx('coin');
  } else {
    s.racha = 0;
    s.bajados++;
    s.mensaje = `${s.pas.nombre} se bajó: «¡Ni que fuera rapidito!»`;
    audio.sfx('miss');
  }
  s.fase = 'buscar';
  s.pas = nuevoPasajero(s, s.entregas + s.bajados + 1);
}
function objetivo(s: Taxi): [number, number] {
  if (s.fase === 'buscar') return [s.pas.x, s.pas.z];
  const l = LUGARES[s.pas.destino];
  return [l.x, l.z];
}

function Escena({ motor: m }: { motor: Sesion }) {
  useCiudad(() => m.cuenta > 0);
  useLayoutEffect(() => {
    enterVehicle('Car');
    useGame.getState().setPrompt(null);
  }, []);
  const s = m.datos,
    l = LUGARES[s.pas.destino],
    meta = objetivo(s),
    cfg = useMemo(() => [0, 1, 2, 3].map(botCfg), []),
    saluda = useMemo((): AvatarState => ({ anim: 'wave', speed: 0 }), []);
  return (
    <>
      <Ciudad spawn={[[2.2, 0.2, 14], 0]} />
      <Trafico carros={s.carros} />
      <LuzTaxi turbo={s.turbo > 0} />
      <AvisoFlotante aviso={s.pop} alto={5.8} />
      {m.cuenta > 0 && <SobreJugador texto={`¡Preparate! ${Math.ceil(m.cuenta)}`} alto={5.6} />}
      <Flecha hacia={m.cuenta > 0 ? null : meta} color={s.fase === 'buscar' ? '#7cff6b' : l.color} />
      {s.fase === 'buscar' ? (
        <>
          <group position={[s.pas.ax, 0.2, s.pas.az]}>
            <art.Avatar config={cfg[s.pas.cfg]} state={saluda} name={`🙋 ${s.pas.nombre}`} />
          </group>
          <Marca x={s.pas.x} z={s.pas.z} color="#7cff6b" />
        </>
      ) : (
        <Marca x={l.x} z={l.z} color={l.color} texto={`🏁 ${l.nombre}`} r={4.5} />
      )}
    </>
  );
}

const motor = defineMotor({
  id: 'franciscomorazan.taxi',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  libre: { bots: [6.2, 0.2, 18], yaw: -1.2 },
  guia: {
    goal: 'Subí pasajeros y llevalos a su destino antes de que se acabe su paciencia. Frená dentro de la marca.',
    keys: [
      ['W / S', 'acelerar / frenar y retroceder'],
      ['A / D', 'girar'],
      ['F / clic', '¡pisale! turbo y pito: el tráfico te abre paso'],
    ],
    touch: [
      ['Palanca', 'acelerar, frenar y girar'],
      ['🎯', 'turbo y pito'],
    ],
  },
  etapa: (p) => ({
    carros: 6 + Math.round(p.dif * 8),
    velTrafico: 5 + p.dif * 3,
    ritmo: 8 + p.dif * 3,
    holgura: 9 - p.dif * 4,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Taxi a toda mecha',
    seed: p.seed,
  }),
  metas: (p) => [100 + Math.round(p.dif * 60), 220 + Math.round(p.dif * 80), 340 + Math.round(p.dif * 100)],
  duracion: (p) => 75 + Math.round(p.dif * 15),
  crear: (p): Taxi => {
    const r = rng(p.seed),
      s: Taxi = {
        r,
        carros: crearTrafico(p.carros, r, p.velTrafico),
        fase: 'buscar',
        pas: { x: 0, z: 0, ax: 0, az: 0, nombre: '', destino: 0, cfg: 0 },
        quedan: 0,
        entregas: 0,
        bajados: 0,
        choques: 0,
        racha: 0,
        golpe: 0,
        pito: 0,
        turbo: 0,
        carga: 0,
        ayuda: false,
        pop: { texto: '', t: 0 },
        mensaje: 'Buscá la columna verde: ahí te para alguien.',
      };
    // el primero espera a la vuelta de la esquina
    s.pas = { x: 2.2, z: -14, ax: 5.6, az: -14, nombre: NOMBRES[0], destino: 1, cfg: 0 };
    s.carros = s.carros.filter((c) => {
      const [x, z] = dondeCarro(c);
      return Math.hypot(x - 2.2, z - 14) > 12;
    });
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    player.control = true;
    if (!player.vehicle) {
      enterVehicle('Car');
      useGame.getState().setPrompt(null);
    }
    s.golpe = Math.max(0, s.golpe - dt);
    s.pito = Math.max(0, s.pito - dt);
    s.pop.t = Math.max(0, s.pop.t - dt);
    s.carga = Math.max(0, s.carga - dt);
    if (s.turbo > 0) {
      s.turbo -= dt;
      if (s.turbo <= 0 && player.vehicle) player.vehicle.maxSpeed = VEL;
    }
    if (input.take('fire') && s.pito <= 0) {
      s.pito = 0.6;
      audio.sfx('horn');
      const v = player.vehicle;
      if (s.carga <= 0 && v) {
        s.turbo = 1.6;
        s.carga = RECARGA;
        v.maxSpeed = VEL_TURBO;
        v.speed = Math.min(VEL_TURBO, Math.max(v.speed, 10) + 8);
        s.pop = { texto: '¡Pisale! 🔥', t: 1.2 };
      }
      for (const c of s.carros) {
        const [x, z] = dondeCarro(c);
        if (dist(x, z) < 12) c.t += c.dir * 6;
      }
    }
    moverTrafico(s.carros, dt);
    for (const c of s.carros) {
      const [x, z] = dondeCarro(c);
      if (s.golpe <= 0 && dist(x, z) < 2.4) {
        s.golpe = 1.2;
        s.choques++;
        s.racha = 0;
        m.sumar(-8);
        if (player.vehicle) player.vehicle.speed *= -0.3;
        s.mensaje = '¡Pum! Chocaste: −8 y se fue la racha.';
        audio.sfx('hit');
      }
    }
    const [ox, oz] = objetivo(s),
      d = dist(ox, oz);
    if (s.fase === 'buscar') {
      if (d < 4.5 && rapidez() < PRISA) subir(m);
      else if (d < 4.5) s.mensaje = '¡Frená, que se queda!';
    } else {
      s.quedan -= dt;
      if (d < 4.5 && rapidez() < PRISA) bajar(m, true);
      else if (s.quedan <= 0) bajar(m, false);
      else if (d < 4.5) s.mensaje = '¡Frená en la marca!';
    }
    const l = LUGARES[s.pas.destino];
    const [nx, nz] = objetivo(s);
    m.objetivo = s.fase === 'buscar' ? `Recogé a ${s.pas.nombre}` : `Llevá a ${s.pas.nombre} a ${l.nombre}`;
    m.lineas = [
      s.mensaje,
      `${s.fase === 'llevar' ? `⏱ ${Math.ceil(s.quedan)} s · ` : ''}${Math.round(dist(nx, nz))} m al ${rumbo(nx - player.pos[0], nz - player.pos[2])} · Entregas ${s.entregas} · Racha x${Math.max(1, s.racha)}`,
      `W/S acelerar · A/D girar · F ${s.turbo > 0 ? '🔥 ¡turbo!' : s.carga > 0 ? `turbo en ${Math.ceil(s.carga)} s` : 'turbo listo'}`,
    ];
    m.stats = {
      entregas: s.entregas,
      bajados: s.bajados,
      choques: s.choques,
      racha: s.racha,
      turbo: s.turbo > 0 ? 1 : 0,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      // el compa va de copiloto y les da plática: los pasajeros aguantan más
      s.ayuda = true;
      return;
    }
    const [ox, oz] = objetivo(s),
      dx = ox - player.pos[0],
      dz = oz - player.pos[2],
      d = Math.hypot(dx, dz),
      paso = Math.min(d, 14 * dt);
    if (d > 0.01) {
      player.pos[0] += (dx / d) * paso;
      player.pos[2] += (dz / d) * paso;
      player.yaw = Math.atan2(-dx, -dz);
    }
    // se mueve solo con la posición: la velocidad del carro queda en cero para no avanzar dos veces
    if (player.vehicle) player.vehicle.speed = 0;
  },
  Escena,
});
export const Taxi = motor.Escena;
export const guia = motor.guia;
