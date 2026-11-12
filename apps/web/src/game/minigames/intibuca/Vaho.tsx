import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  aire: number;
  vaho: number;
  trazo: number;
  mensajes: number;
  errores: number;
  espera: number;
};
type Sesion = Motor<{ evapora: number }, Estado>;
const puntos = [
  [-0.6, -0.5],
  [-0.6, 0.5],
  [0, 0],
  [0.6, 0.5],
  [0.6, -0.5],
];
function soplar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.6;
  if (s.aire < 0.25) return;
  s.aire -= 0.25;
  s.vaho = Math.min(1, s.vaho + 0.35);
  if (s.vaho > 0.85) {
    s.trazo = 0;
    s.errores++;
    m.sumar(-25);
  }
}
function dibujar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.3;
  const p = puntos[s.trazo];
  if (s.vaho > 0.2 && s.vaho < 0.85 && Math.hypot(s.x - p[0], s.y - p[1]) < 0.25) {
    s.trazo++;
    if (s.trazo === puntos.length) {
      s.mensajes++;
      s.trazo = 0;
      m.sumar(60);
    }
  } else {
    s.errores++;
    m.sumar(-10);
  }
}
const motor = defineMotor({
  id: 'intibuca.vaho',
  guia: {
    goal: 'E exhala. Entre 20% y 85% de vaho, seguí los cinco puntos con F. Soplar de más borra la guía.',
    ...controles,
  },
  etapa: (p) => ({ evapora: 0.045 + p.dif * 0.025 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), aire: 1, vaho: 0, trazo: 0, mensajes: 0, errores: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.aire = Math.min(1, s.aire + dt * 0.12);
    s.vaho = Math.max(0, s.vaho - dt * m.parametros.evapora);
    if (s.vaho === 0) s.trazo = 0;
    if (input.take('use')) soplar(m);
    if (input.take('fire')) dibujar(m);
    m.objetivo = `Mensaje ${s.mensajes + 1} · Punto ${s.trazo + 1}/5`;
    m.lineas = [
      `Aire ${Math.round(s.aire * 100)}% · Vaho ${Math.round(s.vaho * 100)}%`,
      'E: exhalá · F: trazá el punto luminoso · Esperá si la guía está tapada',
    ];
    m.stats = { x: s.x, mensajes: s.mensajes, errores: s.errores, vaho: s.vaho };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') return;
    const s = m.datos;
    s.auto = true;
    [s.x, s.y] = puntos[s.trazo];
    if (s.vaho < 0.3) soplar(m);
    else dibujar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Escribí en el vaho · Fantasía del altiplano">
      <Block
        pos={[-1, 1.1, 0]}
        size={[7, 0.2, 5]}
        color={m.datos.vaho > 0.85 ? '#ffffff' : '#a3c3d1'}
        mat="glass"
        solid={false}
      />
      {m.datos.vaho < 0.85 &&
        puntos.map(([x, y], i) => (
          <Ball
            key={i}
            pos={[-1 + x * 3, 1.5, y * 3]}
            r={0.14}
            color={i < m.datos.trazo ? '#577b92' : i === m.datos.trazo ? '#ffd466' : '#eeeeee'}
          />
        ))}
      <Ball pos={[-1 + m.datos.x * 3, 1.9, m.datos.y * 3]} r={0.13} color="#744793" />
      <Label
        pos={[-1, 3, -2]}
        text={m.datos.vaho > 0.85 ? 'Esperá, tapaste la guía' : 'Seguí los puntos para escribir M'}
        h={0.35}
      />
    </Mesa>
  ),
});
export const Vaho = motor.Escena;
export const guia = motor.guia;
