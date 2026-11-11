import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  cara: number;
  registro: number;
  fichas: number;
  errores: number;
  espera: number;
};
type Parametros = { margen: number };
type Sesion = Motor<Parametros, Estado>;

function lesion(s: Estado) {
  const x = s.fichas % 2 ? 0.5 : -0.5;
  return { x: s.cara ? -x : x, y: s.fichas % 3 ? 0.4 : -0.4 };
}
function observar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const l = lesion(s);
  if (Math.abs(s.x - l.x) < m.parametros.margen && Math.abs(s.y - l.y) < m.parametros.margen) {
    if (s.cara === 0) {
      s.registro = 1;
      s.cara = 1;
    } else if (s.registro) {
      s.fichas++;
      m.sumar(45);
      s.registro = 0;
      s.cara = 0;
    }
  } else {
    s.errores++;
    m.sumar(-10);
  }
  s.espera = 0.8;
}

const motor = defineMotor({
  id: 'copan.hojas',
  fondo: 'finca',
  guia: {
    goal: 'Contrastá ambas caras de la hoja. Ubicá la misma lesión con ambos ejes; F registra el haz y luego el envés.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.17 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), cara: 0, registro: 0, fichas: 0, errores: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) observar(m);
    m.objetivo = `Ubicá la lesión en ${s.cara ? 'envés (hoja volteada)' : 'haz'}`;
    m.lineas = [
      'A/D y W/S mové la lupa · F registrá y volteá',
      `Caras registradas ${s.registro}/2 · Espejá la posición al voltear; el color solo no basta`,
    ];
    m.stats = { fichas: s.fichas, errores: s.errores, cara: s.cara, x: s.x };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      m.datos.espera = Math.max(0, m.datos.espera - dt * 0.2);
      return;
    }
    const s = m.datos;
    s.auto = true;
    Object.assign(s, lesion(s));
    observar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo="Contrastá ambas caras de la hoja">
        <group scale={[1.3, 0.1, 2]}>
          <Ball pos={[-0.6, 12, 0]} r={1.5} color={s.cara ? '#97b66f' : '#477d47'} mat="leaf" />
        </group>
        <Block pos={[-0.8, 1.45, 0]} size={[0.06, 0.06, 5]} color="#d9d396" mat="wood" solid={false} />
        {[-1, 1].map((i) => (
          <Ball key={i} pos={[i * 1.5, 1.5, i * 0.9]} r={0.18} color="#bca351" mat="sand" />
        ))}
        <Ball pos={[-0.8 + lesion(s).x * 2, 1.6, lesion(s).y * 2]} r={0.23} color="#795445" mat="dirt" />
        <Cyl pos={[-0.8 + s.x * 2, 1.85, s.y * 2]} r={0.4} h={0.08} color="#96e5e1" mat="glass" solid={false} />
        <Label
          pos={[-1, 3, -2]}
          text={s.cara ? 'Envés · Ubicación reflejada' : 'Haz · Registrá la misma lesión'}
          h={0.4}
        />
      </Mesa>
    );
  },
});
export const Hojas = motor.Escena;
export const guia = motor.guia;
