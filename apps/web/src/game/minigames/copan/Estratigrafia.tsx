import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & { patio: number; recorridos: number; cerradas: number; espera: number };
type Parametros = { margen: number };
type Sesion = Motor<Parametros, Estado>;

const fase = (s: Estado) => Math.max(0, Math.min(2, Math.round(s.x + 1)));
function cruzar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const requerida = s.recorridos % 3,
    puerta = s.patio % 2 ? 0.6 : -0.6;
  if (fase(s) !== requerida || Math.abs(s.y - puerta) > m.parametros.margen) {
    s.cerradas++;
    s.patio = 0;
    m.sumar(-10);
  } else {
    s.patio++;
    if (s.patio === 3) {
      s.recorridos++;
      s.patio = 0;
      m.sumar(60);
    }
  }
  s.espera = 0.7;
}

const motor = defineMotor({
  id: 'copan.estratigrafia',
  fondo: 'ruinas',
  guia: {
    goal: 'Elegí una fase y recorré solo sus accesos. A/D rueda temporal, W/S puerta; F cruza al siguiente patio.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.17 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), patio: 0, recorridos: 0, cerradas: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) cruzar(m);
    m.objetivo = `Plano de época ${(s.recorridos % 3) + 1} · Conectá sus tres patios`;
    m.lineas = [
      `Rueda A/D: época ${fase(s) + 1} · W/S puerta ${s.patio % 2 ? 'norte +54°' : 'sur −54°'}`,
      `F atravesá · Patio ${s.patio + 1}/3 · Mezclar épocas cierra el modelo`,
    ];
    m.stats = { recorridos: s.recorridos, cerradas: s.cerradas, patio: s.patio, x: s.x };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      m.datos.espera = Math.max(0, m.datos.espera - dt * 0.2);
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.x = (s.recorridos % 3) - 1;
    s.y = s.patio % 2 ? 0.6 : -0.6;
    cruzar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo="Elegí una fase y recorré solo sus accesos">
        {[0, 1, 2].map((i) => (
          <group key={i} position={[-3 + i * 3, 0, 0]}>
            <Block
              pos={[0, 0.9, 0]}
              size={[2.5, 0.3, 3]}
              color={i === fase(s) ? '#d1b785' : '#8d9690'}
              mat="stone"
              solid={false}
            />
            {[-1, 1].map((l) => (
              <Block
                key={l}
                pos={[l * 0.8, 1.8, -0.5]}
                size={[0.4, 1.5, 0.5]}
                color="#b0a48e"
                mat="stone"
                solid={false}
              />
            ))}
            <Block pos={[0, 2.6, -0.5]} size={[2, 0.3, 0.6]} color="#b0a48e" mat="stone" solid={false} />
            {i !== s.recorridos % 3 && (
              <Block pos={[0, 1.8, -0.5]} size={[1.2, 1.4, 0.3]} color="#847663" mat="brick" solid={false} />
            )}
            <Label pos={[0, 3.3, 0]} text={`Época ${i + 1}${i === fase(s) ? ' ◉' : ''}`} h={0.3} />
          </group>
        ))}
        <Label pos={[-1, 1, 3]} text="Maqueta interpretativa · Las puertas cambian con la época" h={0.28} />
      </Mesa>
    );
  },
});
export const Estratigrafia = motor.Escena;
export const guia = motor.guia;
