import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  nodo: number;
  tension: number;
  levantadas: number;
  perdidas: number;
  espera: number;
};
type Sesion = Motor<{ margen: number }, Estado>;
function levantar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.7;
  if (Math.abs(s.x - [-0.65, 0, 0.65][s.nodo]) < m.parametros.margen && s.y > 0.2 && s.tension < 0.45) {
    s.nodo++;
    if (s.nodo === 3) {
      s.levantadas++;
      s.nodo = 0;
      m.sumar(50);
    }
  } else {
    s.perdidas++;
    s.nodo = 0;
    s.tension = 1;
    m.sumar(-35);
  }
}
const motor = defineMotor({
  id: 'intibuca.papas',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Apoyá cada raíz de izquierda a derecha y levantá suave con F. Esperá que baje la tensión.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.14 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), nodo: 0, tension: 0, levantadas: 0, perdidas: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    const antes = s.x;
    mover(s, dt);
    s.tension = Math.max(0, Math.min(1, s.tension + Math.abs(s.x - antes) * 0.8 - dt * 0.28));
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) levantar(m);
    m.objetivo = `Raíz ${s.nodo + 1}/3 · Sostené arriba y levantá con F`;
    m.lineas = [
      `Tensión ${Math.round(s.tension * 100)}% · Menos de 45% para levantar`,
      `Familias completas ${s.levantadas} · Papas perdidas bajo tierra ${s.perdidas}`,
    ];
    m.stats = { x: s.x, levantadas: s.levantadas, perdidas: s.perdidas, tension: s.tension };
  },
  bot(m, _dt) {
    const s = m.datos;
    s.auto = true;
    s.x = [-0.65, 0, 0.65][s.nodo];
    s.y = 0.5;
    levantar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Mata virtual · También cuidá las pequeñas">
      {[-1, 0, 1].map((i) => (
        <group key={i}>
          <Block pos={[-1 + i * 2, 1.05, 0]} size={[0.08, 0.08, 3]} color="#89a55a" mat="leaf" solid={false} />
          <group scale={[1, 0.65, 1]}>
            <Ball
              pos={[-1 + i * 2, 2 + (i + 1 < m.datos.nodo ? 1 : 0), 0]}
              r={i === 1 ? 0.35 : 0.65}
              color="#bd935e"
              mat="dirt"
            />
          </group>
        </group>
      ))}
      <Label
        pos={[-1, 3, -2]}
        text={`Uniones: ${m.datos.nodo}/3 · Tensión ${Math.round(m.datos.tension * 100)}%`}
        h={0.35}
      />
    </Mesa>
  ),
});
export const Papas = motor.Escena;
export const guia = motor.guia;
