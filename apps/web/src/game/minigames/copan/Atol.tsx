import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Taza } from './comun';

type Estado = ReturnType<typeof cursor> & {
  sedimento: number;
  espuma: number;
  servicio: number;
  tazas: number;
  verticales: number;
  espera: number;
};
type Parametros = { margen: number };
type Sesion = Motor<Parametros, Estado>;

function agitar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  if (Math.abs(s.x) > 0.35 && Math.abs(s.y) < 0.3) {
    s.sedimento = Math.max(0, s.sedimento - 0.45);
  } else {
    s.espuma = Math.min(1, s.espuma + 0.25);
    s.verticales++;
    m.sumar(-10);
  }
  s.espera = 0.4;
}

const motor = defineMotor({
  id: 'copan.atol',
  fondo: 'pueblo',
  guia: {
    goal: 'Mantené el atol en suspensión sin cambiar el fuego. A/D y F agita lateral; W/S incorpora espuma.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.17 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), sedimento: 0.8, espuma: 0, servicio: 0, tazas: 0, verticales: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.sedimento = Math.min(1, s.sedimento + dt * (0.1 + 0.08 * m.partida.dif));
    s.espuma = Math.max(0, s.espuma - dt * 0.03);
    if (input.take('fire')) agitar(m);
    if (s.sedimento < 0.3 && s.espuma < 0.4) {
      s.servicio += dt;
      if (s.servicio >= 2.5) {
        s.tazas++;
        m.sumar(30);
        s.servicio = 0;
        s.sedimento = 0.65;
      }
    } else s.servicio = 0;
    m.objetivo = 'Agitá a los lados y sostené la textura durante el servicio';
    m.lineas = [
      `A/D horizontal y F agitá · W/S vertical hace espuma · Fuego fijo`,
      `Sedimento ${Math.round(s.sedimento * 100)}% · Espuma ${Math.round(s.espuma * 100)}% · Servicio ${s.servicio.toFixed(1)}/2.5 s`,
    ];
    m.stats = { tazas: s.tazas, verticales: s.verticales, sedimento: s.sedimento, espuma: s.espuma, x: s.x };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') {
      const s = m.datos;
      if (Math.abs(s.x) > 0.35 && Math.abs(s.y) < 0.3 && s.sedimento > 0.2) agitar(m);
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.x = 0.7;
    s.y = 0;
    if (s.sedimento > 0.18) agitar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo="Mantené el atol en suspensión sin cambiar el fuego">
        <Taza x={-1} nivel={1 - s.espuma * 0.5} />
        <Block pos={[-1 + s.x, 2.4, s.y]} size={[2.3, 0.12, 0.15]} color="#e1bb76" mat="wood" solid={false} />
        {Array.from({ length: 12 }, (_, i) => (
          <Ball
            key={i}
            pos={[
              -1 + Math.sin(i * 3) * 0.6,
              1 + (1 - s.sedimento) * 0.7 + Math.sin(m.tiempo + i) * 0.1,
              Math.cos(i * 3) * 0.6,
            ]}
            r={0.07}
            color="#ead39d"
            mat="sand"
          />
        ))}
        <Label pos={[-1, 3.4, 0]} text={`Textura en suspensión · ${s.tazas} tazas`} h={0.4} />
      </Mesa>
    );
  },
});
export const Atol = motor.Escena;
export const guia = motor.guia;
