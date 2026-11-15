import { Block, Cyl, Label, P } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Taza } from './comun';

type Estado = ReturnType<typeof cursor> & { taza: number; golpes: number; tramos: number; reloj: number };
type Parametros = { margen: number; velocidad: number };
type Sesion = Motor<Parametros, Estado>;

function diagonal(s: Estado) {
  return s.tramos % 2 ? 0.6 : -0.6;
}
function avanzar(m: Sesion) {
  const s = m.datos;
  const resonancia = Math.abs(s.x - s.y) < 0.25;
  const estable =
    !resonancia &&
    Math.abs(s.x - diagonal(s)) < m.parametros.margen &&
    Math.abs(s.y + diagonal(s)) < m.parametros.margen;
  s.taza = estable ? s.taza * 0.35 : Math.min(1, s.taza + 0.32);
  if (estable) {
    m.sumar(25);
    s.tramos++;
  } else {
    s.golpes++;
    m.sumar(-10);
  }
  s.reloj = 0;
}

const motor = defineMotor({
  id: 'copan.adoquin',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'Elegí diagonales de rueda para que la taza no salte. A/D ajusta delante, W/S atrás; evitá impactos al mismo tiempo.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.17, velocidad: 1 + p.dif }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), taza: 0, golpes: 0, tramos: 0, reloj: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.reloj += dt * m.parametros.velocidad;
    if (s.reloj >= 2) avanzar(m);
    m.objetivo = 'Desfasá los golpes de las ruedas y conservá la taza en su marca';
    m.lineas = [
      `A/D diagonal delantera ${diagonal(s).toFixed(1)} · W/S trasera ${(-diagonal(s)).toFixed(1)}`,
      `Próximo adoquín ${(2 - s.reloj).toFixed(1)} s · Taza ${Math.round(s.taza * 100)}% fuera de marca · Mismos ejes = resonancia`,
    ];
    m.stats = { tramos: s.tramos, golpes: s.golpes, taza: s.taza, x: s.x };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      if (m.datos.taza > 0) m.datos.taza = Math.max(0, m.datos.taza - dt * 0.03);
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.x = diagonal(s);
    s.y = -s.x;
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo="Elegí diagonales de rueda para que la taza no salte">
        <P.Mototaxi pos={[-2, 0.7, -0.5]} scale={0.7} />
        <group position={[1.6, 0, 1]}>
          <Taza x={s.taza} nivel={1 - s.taza * 0.5} />
          <Cyl pos={[0, 0.8, 0]} r={1.1} h={0.08} color="#77dfbd" mat="neon" solid={false} />
        </group>
        {[-1, 1].flatMap((l) =>
          [0, 1, 2, 3].map((i) => (
            <Block
              key={`${l}-${i}`}
              pos={[l * 3, 0.76, -3 + i * 1.5]}
              size={[1, 0.16, 1]}
              color={i % 2 ? '#8f8b81' : '#b9b2a4'}
              mat="cobble"
              solid={false}
            />
          )),
        )}
        <Label pos={[-1, 3, -2]} text={`Ruedas ${s.x.toFixed(1)} / ${s.y.toFixed(1)} · Desfasá impactos`} h={0.35} />
      </Mesa>
    );
  },
});
export const Adoquin = motor.Escena;
export const guia = motor.guia;
