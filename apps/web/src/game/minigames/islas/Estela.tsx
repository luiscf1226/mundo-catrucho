import { input } from '../../../core/input';
import { Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { Boya, cursor, Isla, Laguna, Lancha, limitar, Muelle, moverCursor, texto } from './comun';

const SALIDA = -7.6;
const ATRACA = [2.1, 2.7];
const MUELLE = 4.35;
const PARED = -9.6;
type Onda = { x: number; a: number; dir: 1 | -1 };
type Estado = {
  c: ReturnType<typeof cursor>;
  bx: number;
  v: number;
  palanca: number;
  ondas: Onda[];
  emite: number;
  golpesViaje: number;
  pausa: number;
  calma: number;
  viajes: number;
  golpes: number;
  frenazos: number;
  choques: number;
  intentos: number;
  aviso: string;
};
type Param = { onda: number; decae: number; umbral: number; rebote: boolean; nombre: string };
type Sesion = Motor<Param, Estado>;
const enMuelle = (s: Estado) => s.bx >= ATRACA[0] && s.bx <= ATRACA[1];
const peligro = (m: Sesion) =>
  m.datos.ondas.some((o) => o.a > m.parametros.umbral && (o.dir === 1 || m.parametros.rebote));

function nuevoViaje(s: Estado) {
  s.bx = SALIDA;
  s.v = 0;
  s.palanca = 0;
  s.c.x = 0;
  s.ondas = [];
  s.golpesViaje = 0;
  s.pausa = 1.2;
}
function amarrar(m: Sesion) {
  const s = m.datos;
  s.intentos++;
  if (!enMuelle(s) || Math.abs(s.v) > 0.35) {
    s.aviso = enMuelle(s) ? 'Muy rápido para amarrar: soltá el acelerador.' : 'Todavía no estás en el embarcadero.';
    return;
  }
  if (peligro(m)) {
    s.aviso = 'Esperá: tu estela todavía viene.';
    return;
  }
  s.viajes++;
  m.sumar(40 + (s.golpesViaje ? 0 : 20));
  s.aviso = s.golpesViaje
    ? 'Amarrado, pero el muelle se llevó tus olas.'
    : '¡Amarrado sin golpear el muelle! Pasajeros felices.';
  nuevoViaje(s);
}
const motor = defineMotor({
  id: 'islas.estela',
  fondo: 'mar',
  guia: {
    goal: 'Acelerá y frená suave. Tu estela llega después: dejala pasar antes de amarrar con F.',
    keys: [
      ['D / →', 'acelerar'],
      ['A / ←', 'frenar o retroceder'],
      ['Mouse / stick derecho', 'palanca del motor'],
      ['F / clic / RT', 'amarrar en el embarcadero'],
    ],
    touch: [
      ['Palanca / arrastrá', 'acelerar o frenar'],
      ['🎯', 'amarrar'],
    ],
  },
  etapa: (p) => ({
    onda: 0.045 + p.dif * 0.02,
    decae: 0.42 - p.dif * 0.16,
    umbral: 0.2 - p.dif * 0.06,
    rebote: p.tema.rebote === true,
    nombre: texto(p.tema.nombre, 'Estela que llega después'),
  }),
  metas: (p) => [120 + Math.round(p.dif * 80), 260 + Math.round(p.dif * 80), 400 + Math.round(p.dif * 80)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (): Estado => ({
    c: { ...cursor(), x: 0 },
    bx: SALIDA,
    v: 0,
    palanca: 0,
    ondas: [],
    emite: 0,
    golpesViaje: 0,
    pausa: 0,
    calma: 0,
    viajes: 0,
    golpes: 0,
    frenazos: 0,
    choques: 0,
    intentos: 0,
    aviso: 'Llevá el water taxi al embarcadero sin que la estela golpee el muelle.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    moverCursor(s.c, dt, 1.6);
    s.palanca = s.c.x;
    if (input.take('fire')) amarrar(m);
    if (s.pausa > 0) {
      s.pausa -= dt;
      s.palanca = 0;
    }
    const v0 = s.v;
    const empuje = s.palanca >= 0 ? s.palanca * 2.2 : s.palanca * (s.v > 0 ? 3.4 : 1.2);
    s.v += (empuje - s.v * 0.3) * dt;
    s.v = Math.max(-1.6, Math.min(4.6, s.v));
    const frena = (v0 - s.v) / Math.max(dt, 1e-4);
    if (frena > 2.4 && s.v > 0.5) {
      s.frenazos++;
      s.ondas.push({ x: s.bx + 1.6, a: Math.min(0.6, 0.06 * frena), dir: 1 });
      s.aviso = '¡Frenazo! La ola se te adelantó.';
    }
    s.bx += s.v * dt;
    if (s.bx > 2.95) {
      if (s.v > 0.8) {
        s.choques++;
        m.sumar(-20);
        s.aviso = '¡Pegaste contra el muelle! Volvé a salir.';
        nuevoViaje(s);
      } else {
        s.bx = 2.95;
        s.v = 0;
      }
    }
    if (s.bx < PARED + 1.4) {
      s.bx = PARED + 1.4;
      s.v = Math.max(0, s.v);
    }
    s.emite -= dt;
    if (s.emite <= 0 && Math.abs(s.v) > 0.3) {
      s.emite = 0.3;
      s.ondas.push({ x: s.bx - 1.4, a: p.onda * s.v * s.v, dir: 1 });
    }
    const c = 1.5 + p.onda * 8;
    for (const o of s.ondas) {
      o.x += o.dir * c * dt;
      o.a *= Math.exp(-p.decae * dt * (1 - s.calma * 0.3));
      if (o.dir === 1 && o.x >= MUELLE) {
        if (o.a > p.umbral) {
          s.golpes++;
          s.golpesViaje++;
          m.sumar(-10);
          s.aviso = '¡La estela golpeó el muelle!';
        }
        if (p.rebote) {
          o.dir = -1;
          o.a *= 0.65;
        } else o.a = 0;
      } else if (o.dir === -1 && o.x <= PARED) {
        o.dir = 1;
        o.a *= 0.65;
      }
    }
    s.ondas = s.ondas.filter((o) => o.a > 0.025).slice(-36);
    s.calma = 0;
    m.objetivo = s.aviso;
    m.lineas = [
      `Velocidad ${s.v.toFixed(1)} m/s · Palanca ${s.palanca > 0.1 ? 'adelante' : s.palanca < -0.1 ? 'atrás' : 'neutro'}`,
      `Viajes ${s.viajes} · Golpes al muelle ${s.golpes}${peligro(m) ? ' · ola en camino' : ''}`,
    ];
    m.stats = {
      viajes: s.viajes,
      golpes: s.golpes,
      frenazos: s.frenazos,
      choques: s.choques,
      intentos: s.intentos,
      x: s.bx,
    };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.calma = 1;
      return;
    }
    const meta = (ATRACA[0] + ATRACA[1]) / 2;
    const falta = meta - s.bx;
    // velocidad que deja frenar suave antes del embarcadero
    const quiero = Math.max(0, Math.min(2.6, Math.sqrt(Math.max(0, falta) * 1.1) - 0.1));
    const palanca = falta < 0.15 ? (s.v > 0.05 ? -0.25 : 0) : limitar((quiero - s.v) * 1.2, -0.45, 1);
    s.c.x = palanca;
    s.c.auto = true;
    if (enMuelle(s) && Math.abs(s.v) <= 0.35 && !peligro(m)) amarrar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    return (
      <Isla nombre={p.nombre} aviso="Suave al acelerar, suave al frenar · F amarra">
        <Laguna ancho={14.4} largo={9} x={-2.4} z={-1.2} color="#2aa9bf" />
        <Muelle letrero="Embarcadero · Coxen Hole" />
        <Block pos={[MUELLE - 0.05, 0.4, -1.2]} size={[0.3, 0.8, 4.2]} color="#7a5634" mat="wood" solid={false} />
        {[-3, -1.6, -0.2, 0.8].map((z) => (
          <Cyl
            key={z}
            pos={[MUELLE + 0.1, 0.5, z]}
            r={0.18}
            h={1}
            color="#2b2b2b"
            mat="plastic"
            solid={false}
            cast={false}
          />
        ))}
        {p.rebote && (
          <Block pos={[PARED, 0.5, -1.2]} size={[0.4, 1, 5.5]} color="#9aa3a8" mat="concrete" solid={false} />
        )}
        <Block
          pos={[(ATRACA[0] + ATRACA[1]) / 2 + 0.4, 0.05, -1.2]}
          size={[1.2, 0.02, 1.6]}
          color="#7ae582"
          mat="glass"
          solid={false}
          cast={false}
        />
        <Label pos={[2.8, 1.5, 0.2]} text="Atracar aquí" h={0.24} bg="#2a9d8f" />
        <Boya pos={[-3.5, 0.02, -4]} color="#ffd166" />
        <Boya pos={[-3.5, 0.02, 1.8]} color="#ffd166" />
        {s.ondas.map((o, i) => (
          <Block
            key={i}
            pos={[o.x, 0.04 + o.a * 0.2, -1.2]}
            size={[0.18, 0.04 + o.a * 0.7, 2.4 + (1 - o.a) * 0.8]}
            color={o.a > p.umbral ? '#ffffff' : '#bfeef5'}
            mat="cloth"
            solid={false}
            cast={false}
          />
        ))}
        <Lancha pos={[s.bx, 0.08 + Math.sin(m.tiempo * 3) * 0.03, -1.2]} franja="#d1495b" />
        <Label pos={[s.bx, 2.3, -1.2]} text={`${s.v.toFixed(1)} m/s`} h={0.26} bg="#14627a" />
        <group position={[-6.5, 0, 3.6]}>
          <Block pos={[0, 0.9, 0]} size={[2.4, 0.18, 0.5]} color="#1d1d1f" mat="plastic" solid={false} cast={false} />
          <Block
            pos={[s.palanca * 1.1, 1.05, 0]}
            size={[0.2, 0.3, 0.5]}
            color="#ffd166"
            mat="plastic"
            solid={false}
            cast={false}
          />
          <Label pos={[0, 1.6, 0]} text="atrás  ·  neutro  ·  adelante" h={0.22} />
        </group>
      </Isla>
    );
  },
});
export const Estela = motor.Escena;
export const guia = motor.guia;
