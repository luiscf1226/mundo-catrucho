// Cruce de pista: en Puerto Lempira la franja de vuelo se cruza solo entre aterrizajes. Juntás en un grupo al
// personal con permiso y lo hacés cruzar cuando cabe en la ventana. Si el aviso llega con gente en la franja,
// el grupo vuelve al refugio. En «La avioneta trae una cama» la cama cruza sola y por etapas.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, variante, xDe } from './comun';

type Tipo = 'ok' | 'no' | 'cama';
type Cruce = { n: number; que: 'grupo' | 'cama1' | 'cama2'; t: number; dur: number };
type Estado = ReturnType<typeof cursor> & {
  fila: Tipo[];
  grupo: number;
  cama: 'lista' | 'medio' | null;
  cruce: Cruce | null;
  reloj: number;
  espera: number;
  cruzaron: number;
  devueltos: number;
  sinPermiso: number;
  camas: number;
  aviso: boolean;
  azar: () => number;
};
type Param = { abierta: number; cerrada: number; no: number; cama: number; seed: number };
type Sesion = Motor<Param, Estado>;

const FILA = 6,
  MAX = 5,
  AVISO = 2.5;
const durGrupo = (n: number) => 1 + 0.4 * n;
const DUR_CAMA = [1.6, 1.8];

function ventana(m: Sesion) {
  const p = m.parametros,
    t = m.datos.reloj % (p.abierta + p.cerrada);
  return t < p.abierta ? { abierta: true, resta: p.abierta - t } : { abierta: false, resta: p.abierta + p.cerrada - t };
}
function persona(s: Estado, p: Param): Tipo {
  const r = s.azar();
  if (r < p.cama && !s.cama && !s.fila.includes('cama')) return 'cama';
  return s.azar() < p.no ? 'no' : 'ok';
}
function sacar(s: Estado, p: Param, i: number) {
  s.fila.splice(i, 1);
  s.fila.push(persona(s, p));
}
function agregar(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    toast = useGame.getState().toast;
  if (s.espera > 0) return;
  s.espera = 0.25;
  const i = casilla(s.x, FILA),
    t = s.fila[i];
  if (t === 'no') {
    s.sinPermiso++;
    m.sumar(-15);
    toast('Sin permiso no se entra a la pista.', '⛔');
    sacar(s, p, i);
  } else if (t === 'cama') {
    if (s.grupo > 0 || s.cama) {
      m.sumar(-10);
      toast('La cama cruza sola: primero pasá lo que ya tenés listo.', '🛏️');
      return;
    }
    s.cama = 'lista';
    sacar(s, p, i);
  } else if (s.grupo >= MAX) {
    m.sumar(-5);
    toast('El grupo ya va lleno.', '👥');
  } else {
    s.grupo++;
    sacar(s, p, i);
  }
}
function cruzar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0) return;
  s.espera = 0.4;
  const v = ventana(m);
  if (s.cruce) {
    m.sumar(-5);
    toast('Ya hay alguien en la pista.', '🚶');
  } else if (s.cama === 'lista') s.cruce = { n: 0, que: 'cama1', t: 0, dur: DUR_CAMA[0] };
  else if (!s.cama && !s.grupo) {
    m.sumar(-5);
    toast('No hay grupo listo en el refugio.', '👥');
  } else if (!v.abierta) {
    m.sumar(-10);
    toast('Pista cerrada: la avioneta está bajando.', '🛬');
  } else if (s.cama === 'medio') s.cruce = { n: 0, que: 'cama2', t: 0, dur: DUR_CAMA[1] };
  else {
    s.cruce = { n: s.grupo, que: 'grupo', t: 0, dur: durGrupo(s.grupo) };
    s.grupo = 0;
  }
}

const motor = defineMotor({
  id: 'graciasadios.pistalempira',
  modos: { duo: { tipo: 'compartido', cada: 1.5 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'costa',
  guia: {
    goal: 'Elegí en la fila a quien tiene permiso (chaleco verde) y F lo suma al grupo. E lo hace cruzar la pista: solo si la ventana alcanza para todo el cruce. Si te agarra el aviso con gente en la franja, vuelven al refugio.',
    ...controles('sumar al grupo', 'cruzar la pista', 'elegir en la fila'),
  },
  etapa: (p) => ({
    abierta: 10 - p.dif * 3,
    cerrada: 3.5,
    no: 0.2 + p.dif * 0.2,
    cama: variante(p) === 'la-avioneta-trae-una-cama' ? 0.18 : 0,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      fila: [],
      grupo: 0,
      cama: null,
      cruce: null,
      reloj: 0,
      espera: 0,
      cruzaron: 0,
      devueltos: 0,
      sinPermiso: 0,
      camas: 0,
      aviso: false,
      azar: rng(p.seed),
    };
    while (s.fila.length < FILA) s.fila.push(persona(s, p));
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      toast = useGame.getState().toast;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    const antes = ventana(m);
    s.reloj += dt;
    const v = ventana(m);
    const aviso = v.abierta && v.resta < AVISO;
    if (aviso && !s.aviso) toast('Aviso de aterrizaje: no empecés cruces largos.', '📢');
    s.aviso = aviso;
    const c = s.cruce;
    if (c) {
      c.t += dt;
      if (antes.abierta && !v.abierta && c.que !== 'cama1') {
        // llegó la avioneta con gente en la franja de vuelo: todos de vuelta
        s.devueltos++;
        m.sumar(-20);
        if (c.que === 'grupo') s.grupo = Math.min(MAX, s.grupo + c.n);
        toast('Empezaste tarde: el grupo vuelve al refugio.', '↩️');
        s.cruce = null;
      } else if (c.t >= c.dur) {
        if (c.que === 'grupo') {
          s.cruzaron += c.n;
          m.sumar(12 * c.n + (c.n >= 3 ? 15 : 0));
        } else if (c.que === 'cama1') {
          s.cama = 'medio';
          m.sumar(10);
        } else {
          s.cama = null;
          s.camas++;
          m.sumar(40);
        }
        s.cruce = null;
      }
    }
    if (input.take('fire')) agregar(m);
    if (input.take('use')) cruzar(m);
    m.objetivo = v.abierta
      ? `Pista libre ${v.resta.toFixed(1)} s · cruce de ${s.grupo || 1}: ${durGrupo(s.grupo || 1).toFixed(1)} s`
      : `Avioneta en pista · abre en ${v.resta.toFixed(1)} s`;
    m.lineas = [
      `Grupo listo ${s.grupo}/${MAX}${s.cama ? ` · Cama ${s.cama === 'lista' ? 'en el refugio' : 'en el refugio del medio'}` : ''}`,
      `Cruzaron ${s.cruzaron} · Devueltos ${s.devueltos} · Sin permiso ${s.sinPermiso}${m.parametros.cama ? ` · Camas ${s.camas}` : ''}`,
    ];
    m.stats = {
      x: s.x,
      grupo: s.grupo,
      cruzaron: s.cruzaron,
      devueltos: s.devueltos,
      sinPermiso: s.sinPermiso,
      cruces: s.cruzaron + s.devueltos + (s.cruce ? 1 : 0),
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0) return;
    s.auto = true;
    const v = ventana(m),
      cabe = (dur: number) => v.abierta && v.resta >= dur + 0.3;
    if (!s.cruce) {
      if (s.cama === 'lista') return cruzar(m);
      if (s.cama === 'medio' && cabe(DUR_CAMA[1])) return cruzar(m);
      if (!s.cama && s.grupo > 0 && cabe(durGrupo(s.grupo))) {
        const otro = s.grupo < MAX && s.fila.includes('ok') && cabe(durGrupo(s.grupo + 1));
        if (!otro) return cruzar(m);
      }
    }
    const cama = s.fila.indexOf('cama');
    if (cama >= 0 && !s.cama && s.grupo === 0 && !s.cruce) {
      s.x = xDe(cama, FILA);
      return agregar(m);
    }
    const ok = s.fila.indexOf('ok');
    if (ok >= 0 && s.grupo < MAX) {
      s.x = xDe(ok, FILA);
      agregar(m);
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      v = ventana(m),
      sel = casilla(s.x, FILA),
      loco = m.parametros.cama > 0,
      c = s.cruce;
    const avion = v.abierta ? (s.aviso ? 4.8 + v.resta : null) : 5 - (1 - v.resta / m.parametros.cerrada) * 12;
    const figura = (x: number, z: number, tipo: Tipo, k: string | number) =>
      tipo === 'cama' ? (
        <group key={k}>
          <Block pos={[x, 0.95, z]} size={[1, 0.25, 0.6]} color="#e9c46a" mat="wood" solid={false} />
          <Block pos={[x - 0.4, 1.15, z]} size={[0.2, 0.2, 0.6]} color="#f4f1de" mat="cloth" solid={false} />
        </group>
      ) : (
        <group key={k}>
          <Cyl pos={[x, 1.05, z]} r={0.17} h={0.55} color={tipo === 'ok' ? '#2a9d8f' : '#e63946'} solid={false} />
          <Ball pos={[x, 1.45, z]} r={0.13} color="#8d5524" />
        </group>
      );
    const [z0, z1] = c?.que === 'cama1' ? [1.9, 0.1] : c?.que === 'cama2' ? [0.1, -3.1] : [1.9, -3.1];
    const zc = c ? z0 + (z1 - z0) * Math.min(1, c.t / c.dur) : 0;
    return (
      <Mesa titulo={loco ? 'Pista de Puerto Lempira · llegó una cama' : 'Pista de Puerto Lempira'}>
        <Block pos={[-1, 0.74, -0.5]} size={[9.4, 0.06, 3.2]} color="#495057" mat="asphalt" solid={false} />
        {[-5, -3, -1, 1, 3].map((x) => (
          <Block key={x} pos={[x, 0.78, -0.5]} size={[0.9, 0.02, 0.12]} color="#f8f9fa" solid={false} />
        ))}
        {loco && <Block pos={[-4.2, 0.8, 0.1]} size={[1.8, 0.08, 0.5]} color="#90be6d" mat="grass" solid={false} />}
        <Block pos={[-1, 0.76, 2.6]} size={[9.4, 0.06, 1.9]} color="#ddb892" mat="sand" solid={false} />
        <Block pos={[-1, 0.76, -3.2]} size={[9.4, 0.06, 1]} color="#ddb892" mat="sand" solid={false} />
        <Label pos={[-5.6, 1.4, -3.2]} text="Refugio de llegada" h={0.24} />
        <Block pos={[-5 + sel * 1.4, 0.8, 3.1]} size={[1.1, 0.04, 0.8]} color="#ffd166" solid={false} />
        {s.fila.map((t, i) => figura(-5 + i * 1.4, 3.1, t, `f${i}`))}
        {Array.from({ length: s.grupo }, (_, i) => figura(-5.2 + i * 0.45, 1.95, 'ok', `g${i}`))}
        {s.cama === 'lista' && figura(-2.4, 1.95, 'cama', 'cama')}
        {s.cama === 'medio' && !c && figura(-4.2, 0.1, 'cama', 'cama')}
        {c &&
          (c.que === 'grupo'
            ? Array.from({ length: c.n }, (_, i) => figura(-4.2 + i * 0.45, zc, 'ok', `c${i}`))
            : figura(-4.2, zc, 'cama', 'cruce'))}
        {Array.from({ length: Math.min(6, s.cruzaron) }, (_, i) => figura(-0.5 + i * 0.5, -3.2, 'ok', `l${i}`))}
        <Ball pos={[3.6, 1.6, 1.3]} r={0.22} color={v.abierta ? (s.aviso ? '#ffb703' : '#2dc653') : '#e63946'} />
        <Cyl pos={[3.6, 1.1, 1.3]} r={0.05} h={0.8} color="#adb5bd" solid={false} />
        {avion !== null && (
          <group position={[avion, v.abierta ? 2.6 : 1.1, -0.9]}>
            <Block pos={[0, 0, 0]} size={[1.8, 0.3, 0.32]} color="#f1faee" solid={false} />
            <Block pos={[-0.1, 0.12, 0]} size={[0.4, 0.06, 2]} color="#e63946" solid={false} />
            <Block pos={[0.8, 0.25, 0]} size={[0.25, 0.4, 0.06]} color="#e63946" solid={false} />
          </group>
        )}
        <Label
          pos={[-1, 2.9, -0.5]}
          text={
            v.abierta
              ? s.aviso
                ? '📢 Aviso de aterrizaje'
                : `Pista libre · ${Math.ceil(v.resta)} s`
              : '🛬 Avioneta en pista'
          }
          h={0.34}
        />
      </Mesa>
    );
  },
});
export const Pista = motor.Escena;
export const guia = motor.guia;
