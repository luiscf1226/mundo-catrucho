import { useLayoutEffect } from 'react';
import { audio } from '../../core/audio';
import { input } from '../../core/input';
import { player } from '../../core/player';
import { art, Ball, Block, Cyl, Ground, Label, P, Spawn } from '../kit';
import { defineMotor, type Motor } from './kit';

type Parametros = { calor: number; margen: number; nombre: string };
type Horno = {
  giro: number;
  centro: number;
  borde: number;
  tanda: number;
  buenas: number;
  quemadas: number;
  enfriar: number;
  auto: boolean;
  ayuda: number;
  cursor: number;
};
type Sesion = Motor<Parametros, Horno>;
const metas = (p: { dif: number }): [number, number, number] => [
  80 + Math.round(p.dif * 80),
  180 + Math.round(p.dif * 80),
  280 + Math.round(p.dif * 80),
];
function sacar(m: Sesion) {
  const s = m.datos;
  if (s.enfriar > 0) return;
  const buena = s.centro >= 1 && s.borde < m.parametros.margen;
  m.sumar(buena ? 40 : -20);
  if (buena) s.buenas++;
  else s.quemadas++;
  audio.sfx(buena ? 'coin' : 'miss');
  s.centro = s.borde = 0;
  s.tanda++;
  s.enfriar = 0.7;
}
function Escena({ motor: m }: { motor: Sesion }) {
  const s = m.datos;
  useLayoutEffect(() => {
    player.control = false;
    player.fixedCam = { pos: [0, 10, 13], target: [0, 1, 0], fov: 52 };
    return () => {
      player.control = true;
      player.fixedCam = null;
    };
  }, []);
  return (
    <>
      <art.SkyRig time="tarde" shadowRadius={25} />
      <Ground size={80} color="#b4a078" mat="dirt" />
      <Spawn pos={[-5, 0, 3]} yaw={0.6} />
      <P.House pos={[-9, 0, -9]} />
      <P.Tree pos={[10, 0, -9]} />
      <Block pos={[0, 0.7, 0]} size={[8, 1.4, 7]} color="#934e32" mat="brick" />
      <Cyl pos={[0, 1.5, 0]} r={3.4} h={0.25} color="#414a50" mat="metal" solid={false} />
      <Label pos={[0, 5, -3]} text={m.parametros.nombre} h={0.65} fg="#ffe0a1" />
      <Label pos={[0, 4, -3]} text="Girá hacia el calor · Sacá cuando diga LISTAS" h={0.34} />
      <Label
        pos={[0, 3, 3.4]}
        text={
          s.enfriar > 0
            ? 'Preparando otra tanda…'
            : s.centro >= 1
              ? s.borde < m.parametros.margen
                ? '¡LISTAS! Clic / F / 🎯'
                : '¡Se quemaron! Sacalas'
              : 'Centro crudo · seguí girando'
        }
        h={0.38}
        fg={s.centro >= 1 ? '#b9f280' : '#ffffff'}
      />
      <Label pos={[-2.5, 2.8, 0]} text={`Centro ${Math.round(s.centro * 100)}%`} h={0.3} />
      <Label
        pos={[2.4, 2.8, 0]}
        text={`Borde ${Math.round((s.borde / m.parametros.margen) * 100)}%`}
        h={0.3}
        fg="#ffd080"
      />
      <Block pos={[0, 1.7, -2.7]} size={[5, 0.12, 1]} color="#ff6525" mat="neon" solid={false} />
      <Label pos={[0, 2, -4]} text="ZONA CALIENTE" h={0.32} fg="#ffb264" />
      <group rotation-y={s.giro}>
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
          const a = (i * Math.PI) / 4,
            exterior = i % 2 === 0,
            r = exterior ? 2.5 : 1.5;
          const color =
            (exterior ? s.borde : s.centro) > (exterior ? m.parametros.margen : 1.3)
              ? '#39251c'
              : (exterior ? s.borde : s.centro) > 0.8
                ? '#c78035'
                : '#f4d79c';
          return (
            <group key={i} position={[Math.sin(a) * r, 1.85, Math.cos(a) * r]}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((j) => (
                <Ball
                  key={j}
                  pos={[Math.sin((j * Math.PI) / 4) * 0.24, 0, Math.cos((j * Math.PI) / 4) * 0.24]}
                  r={0.14}
                  color={color}
                  mat="sand"
                />
              ))}
            </group>
          );
        })}
        <Block pos={[0, 1.9, 3.6]} size={[0.4, 0.2, 1.8]} color="#c99554" mat="wood" solid={false} />
      </group>
    </>
  );
}
const motor = defineMotor({
  id: 'franciscomorazan.rosquilla',
  guia: {
    goal: 'Girá la bandeja para dorar el centro sin quemar el borde. Sacá cada tanda a tiempo.',
    keys: [
      ['Mové el mouse / A D', 'girar la bandeja hacia el calor'],
      ['Clic / F', 'sacar la tanda'],
    ],
    touch: [
      ['Palanca', 'girar la bandeja'],
      ['🎯', 'sacar la tanda'],
    ],
  },
  etapa: (p) => ({
    calor: 0.12 + p.dif * 0.035,
    margen: 1.8 - p.dif * 0.35,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Horno de Sabanagrande',
  }),
  metas,
  duracion: (p) => 70 + p.dif * 20,
  crear: (): Horno => ({
    giro: 0,
    centro: 0,
    borde: 0,
    tanda: 1,
    buenas: 0,
    quemadas: 0,
    enfriar: 0,
    auto: false,
    ayuda: 0,
    cursor: 0,
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    if (s.enfriar > 0) {
      s.enfriar -= dt;
      return;
    }
    if (!s.auto) {
      s.giro += input.mx * dt * 2.5;
      if (input.px !== s.cursor) s.giro = input.px * Math.PI;
      s.cursor = input.px;
    }
    s.auto = false;
    // El centro recibe calor cuando el mango mira hacia el frente; girar reparte el calor del borde.
    const calor = 0.55 + 0.45 * Math.cos(s.giro);
    s.centro += dt * m.parametros.calor * calor;
    s.borde += dt * m.parametros.calor * (1.15 + 0.65 * Math.sin(s.giro));
    if (s.ayuda > 0) {
      s.borde = Math.max(0, s.borde - dt * 0.015);
      s.ayuda -= dt;
    }
    if (input.take('fire')) sacar(m);
    m.objetivo = 'Centro listo y borde sin quemar';
    m.lineas = [
      `Tanda ${s.tanda} · Buenas ${s.buenas} · Perdidas ${s.quemadas}`,
      'A / D, mouse o palanca para girar · Clic / F / 🎯 para sacar',
    ];
    m.stats = { buenas: s.buenas, quemadas: s.quemadas, centro: s.centro, borde: s.borde, giro: s.giro };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = 1;
      return;
    }
    s.auto = true;
    s.giro = -0.35 + Math.sin(m.tiempo * 2) * 0.35;
    if (s.centro >= 1.02) sacar(m);
    void dt;
  },
  Escena,
});
export const Rosquilla = motor.Escena;
export const guia = motor.guia;
