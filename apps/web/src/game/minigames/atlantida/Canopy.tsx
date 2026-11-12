// Motor «Panza del cable»: soltate con F y frená con F (o manteniendo Espacio). El cable tiene panza: frenar antes
// del fondo te deja sin energía para subir la otra mitad; llegar rápido a la plataforma es un golpe.
import { input } from '../../../core/input';
import { Block, Cyl, Label, P } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { Barra, Escena, Monito, texto } from './comun';

const XA = -7.6;
const XB = 2.4;
// gravedad de juego (más lenta que la real, para que se pueda leer el cable)
const G = 4;
const ROCE = 0.12;
const FRENO = 2.4;
type Estado = {
  r: () => number;
  x: number;
  v: number;
  andando: boolean;
  freno: boolean;
  temprano: boolean;
  viento: number;
  quieto: number;
  pausa: number;
  cruces: number;
  golpes: number;
  cortos: number;
  frenadas: number;
  ultimaV: number;
  aviso: string;
};
type Param = { ya: number; yb: number; panza: number; vmax: number; viento: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;

const altura = (p: Param, x: number) => {
  const u = (x - XA) / (XB - XA);
  return p.ya + (p.yb - p.ya) * u - p.panza * 4 * u * (1 - u);
};
const pendiente = (p: Param, x: number) => (altura(p, x + 0.01) - altura(p, x - 0.01)) / 0.02;
const fondoX = (p: Param) => XA + (0.5 + (p.yb - p.ya) / (8 * p.panza)) * (XB - XA);
/** Velocidad con la que llegarías a la plataforma sin frenar más (contando el viento si ya lo sentís). */
export function llegada(s: { x: number; v: number; viento: number }, p: Param) {
  const t = { x: s.x, v: s.v };
  for (let i = 0; i < 400 && t.x < XB - 0.05; i++) {
    paso(t, p, s.viento, false, 0.05);
    if (t.v <= 0) return -1;
  }
  return t.v;
}
/** Un paso de la física sobre el cable (el mismo para el juego y para la predicción). */
function paso(t: { x: number; v: number }, p: Param, viento: number, frena: boolean, dt: number) {
  const mm = pendiente(p, t.x),
    cos = 1 / Math.sqrt(1 + mm * mm),
    sin = mm * cos;
  let a = -G * sin - Math.sign(t.v) * ROCE - (t.x > fondoX(p) ? viento : 0);
  if (frena) {
    if (Math.abs(t.v) < FRENO * dt) {
      t.v = 0;
      a = 0;
    } else a -= Math.sign(t.v) * FRENO;
  }
  t.v += a * dt;
  t.x += t.v * cos * dt;
}
function salir(s: Estado, p: Param) {
  s.x = XA + 0.05;
  s.v = 0;
  s.andando = false;
  s.freno = false;
  s.temprano = false;
  s.quieto = 0;
  s.viento = p.viento * (0.4 + s.r() * 0.6);
}
function boton(m: Sesion) {
  const s = m.datos;
  if (s.pausa > 0) return;
  if (!s.andando) {
    s.andando = true;
    s.aviso = '¡Allá vas! Esperá el fondo antes de frenar.';
    return;
  }
  s.freno = !s.freno;
  if (s.freno) {
    s.frenadas++;
    if (s.x < fondoX(m.parametros)) {
      s.temprano = true;
      s.aviso = 'Frenaste antes del fondo: vas a quedar sin alcance.';
    }
  }
}

const motor = defineMotor({
  id: 'atlantida.canopy',
  fondo: 'selva',
  guia: {
    goal: 'Soltate con F y frená después del fondo para llegar despacio a la plataforma.',
    keys: [
      ['F / clic / RT', 'soltarte · poner o quitar el freno'],
      ['Espacio / A (mantener)', 'frenar mientras lo tenés'],
    ],
    touch: [
      ['🎯', 'soltarte · freno'],
      ['Saltar (mantener)', 'frenar'],
    ],
  },
  etapa: (p) => ({
    ya: 4.4,
    yb: 3.3 - p.dif * 0.5,
    panza: 1.6 + p.dif * 0.4,
    vmax: 1.4 - p.dif * 0.4,
    viento: 0.1 + p.dif * 0.15,
    nombre: texto(p.tema.nombre, 'Panza del cable'),
    semilla: p.seed,
  }),
  metas: (p) => [150 + Math.round(p.dif * 80), 320 + Math.round(p.dif * 80), 500 + Math.round(p.dif * 80)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => {
    const s: Estado = {
      r: rng(p.semilla),
      x: XA,
      v: 0,
      andando: false,
      freno: false,
      temprano: false,
      viento: 0,
      quieto: 0,
      pausa: 0,
      cruces: 0,
      golpes: 0,
      cortos: 0,
      frenadas: 0,
      ultimaV: 0,
      aviso: 'Soltate con F.',
    };
    salir(s, p);
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    if (input.take('fire')) boton(m);
    if (s.pausa > 0) {
      s.pausa -= dt;
      if (s.pausa <= 0) salir(s, p);
    } else if (s.andando) {
      const frena = s.freno || input.jump;
      const pasado = s.x > fondoX(p);
      paso(s, p, s.viento, frena, dt);
      if (s.x >= XB - 0.05) {
        const v = Math.abs(s.v);
        s.ultimaV = v;
        if (v <= p.vmax) {
          s.cruces++;
          m.sumar(40 + Math.round(20 * (1 - v / p.vmax)));
          s.aviso = `¡Llegaste suave, a ${v.toFixed(1)} m/s!`;
        } else {
          s.golpes++;
          m.sumar(-20);
          s.aviso = `¡Golpe al tope! Llegaste a ${v.toFixed(1)} m/s.`;
        }
        s.x = XB - 0.05;
        s.v = 0;
        s.pausa = 0.9;
      } else if (s.x < XA) {
        s.x = XA;
        s.v = 0;
      }
      // sin alcance: te devolvés o te quedás quieto en la panza
      if (pasado && (s.v < 0 || (s.v === 0 && !frena))) s.quieto += dt;
      else if (s.v > 0.05) s.quieto = 0;
      if (s.quieto > 1.6 || (s.v < 0 && s.x < fondoX(p) - 0.3)) {
        s.cortos++;
        m.sumar(-10);
        s.aviso = s.temprano
          ? 'Sin alcance: frenaste antes del fondo. Te rescataron.'
          : 'Sin alcance: te quedaste en la panza. Te rescataron.';
        s.pausa = 0.9;
        s.andando = false;
      }
    }
    const pasado = s.x > fondoX(p);
    const ve = llegada(s, p);
    m.objetivo = s.aviso;
    m.lineas = [
      `Velocidad ${Math.abs(s.v).toFixed(1)} m/s · ${s.freno || input.jump ? 'FRENANDO' : 'sin freno'} · Tope ${p.vmax.toFixed(1)} m/s`,
      pasado && s.andando
        ? `Llegarías a ${Math.max(0, ve).toFixed(1)} m/s · Viento en contra ${s.viento > 0.12 ? 'fuerte' : 'suave'}`
        : 'Todavía no pasaste el fondo: no frenés',
    ];
    m.stats = {
      cruces: s.cruces,
      golpes: s.golpes,
      cortos: s.cortos,
      frenadas: s.frenadas,
      andando: s.andando ? 1 : 0,
      freno: s.freno ? 1 : 0,
      x: s.x,
      v: s.v,
      viento: s.viento,
    };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    const p = m.parametros;
    if (actor === 'compa') return;
    if (s.pausa > 0) return;
    if (!s.andando) {
      boton(m);
      return;
    }
    // frena solo si después de un paso más de freno todavía llegaría (el freno quita mucho de golpe)
    const prueba = { x: s.x, v: s.v, viento: s.viento };
    paso(prueba, p, s.viento, true, 0.05);
    const quiero = s.x > fondoX(p) + 0.3 && llegada(prueba, p) > p.vmax * 0.45;
    if (quiero !== s.freno) boton(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const N = 14;
    const y = altura(p, s.x);
    const ang = Math.atan(pendiente(p, s.x));
    const fx = fondoX(p);
    const pasado = s.x > fx;
    return (
      <Escena nombre={p.nombre} aviso="F soltarte o frenar · Espacio mantener freno">
        <Block pos={[-2.6, 0.04, -1]} size={[12, 0.04, 2.2]} color="#4fb3c6" mat="water" solid={false} cast={false} />
        {[
          [XA, p.ya],
          [XB, p.yb],
        ].map(([x, h]) => (
          <group key={x}>
            {[-0.5, 0.5].map((d) => (
              <Cyl key={d} pos={[x + d, h / 2, -1 + d]} r={0.12} h={h} color="#6d4b2c" mat="wood" solid={false} />
            ))}
            <Block pos={[x, h - 0.6, -1]} size={[1.6, 0.14, 1.6]} color="#a7794a" mat="wood" solid={false} />
          </group>
        ))}
        <Label pos={[XB, p.yb + 0.5, -1]} text="Plataforma" h={0.24} bg="#2d6a4f" />
        {Array.from({ length: N }, (_, i) => {
          const x0 = XA + ((XB - XA) * i) / N,
            x1 = XA + ((XB - XA) * (i + 1)) / N,
            y0 = altura(p, x0),
            y1 = altura(p, x1);
          return (
            <group key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, -1]} rotation-z={Math.atan2(y1 - y0, x1 - x0)}>
              <Block
                pos={[0, 0, 0]}
                size={[Math.hypot(x1 - x0, y1 - y0) + 0.02, 0.04, 0.04]}
                color="#2b2b2b"
                mat="metal"
                solid={false}
                cast={false}
              />
            </group>
          );
        })}
        <Cyl
          pos={[fx, altura(p, fx) - 0.15, -1]}
          r={0.06}
          h={0.3}
          color="#ffd166"
          mat="neon"
          solid={false}
          cast={false}
        />
        <Label pos={[fx, altura(p, fx) - 0.65, -0.4]} text="fondo · desde aquí podés frenar" h={0.26} bg="#bc6c25" />
        <group position={[s.x, y, -1]} rotation-z={ang * 0.6}>
          <Cyl
            pos={[0, 0, 0]}
            r={0.12}
            h={0.16}
            color={s.freno || input.jump ? '#ef476f' : '#adb5bd'}
            mat="metal"
            solid={false}
            cast={false}
          />
          <Block pos={[0, -0.35, 0]} size={[0.04, 0.6, 0.04]} color="#f4a261" mat="cloth" solid={false} cast={false} />
          <Monito pos={[0, -1.75, 0]} color="#ffbe0b" s={1.2} brazo={-2.6} />
        </group>
        <Label
          pos={[s.x, y + 0.6, -1]}
          text={`${Math.abs(s.v).toFixed(1)} m/s`}
          h={0.24}
          bg={s.freno || input.jump ? '#ef476f' : '#14627a'}
        />
        <Barra
          pos={[-2.6, 0.4, 2.6]}
          valor={pasado && s.andando ? Math.max(0, llegada(s, p)) / (p.vmax * 2) : 0}
          alerta={0.5}
          ancho={4}
          color="#2a9d8f"
          texto={pasado && s.andando ? 'Velocidad al llegar (la raya es el tope)' : 'Energía: se lee después del fondo'}
        />
        {[-9.5, 4.2].map((x) => (
          <P.Tree key={x} pos={[x, 0, -3]} scale={1.3} seed={x} solid={false} />
        ))}
      </Escena>
    );
  },
});
export const Canopy = motor.Escena;
export const guia = motor.guia;
