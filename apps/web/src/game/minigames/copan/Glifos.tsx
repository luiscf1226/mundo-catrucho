import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { Campesino } from '../kit/Figuras';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  pieza: number;
  juntas: number;
  sueltas: number;
  espera: number;
  /** fase del marco que gira en «El glifo quedó de cabeza» */
  marco: number;
};
type Parametros = { margen: number; invertido: boolean };
type Sesion = Motor<Parametros, Estado>;

function referencia(s: Estado) {
  return { a: ((s.pieza % 3) - 1) * 0.6, b: (((s.pieza + 1) % 3) - 1) * 0.6 };
}
function encajar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const r = referencia(s);
  if (Math.abs(s.x - r.a) < m.parametros.margen && Math.abs(s.y - r.b) < m.parametros.margen) {
    s.juntas++;
    s.pieza++;
    m.sumar(40);
  } else {
    s.sueltas++;
    m.sumar(-10);
  }
  s.espera = 0.8;
}

const motor = defineMotor({
  id: 'copan.glifos',
  fondo: 'ruinas',
  guia: {
    goal: 'Girás la réplica y cotejás dos bordes. A/D giro, W/S inclinación; F encaja si ambas juntas continúan.',
    ...controles,
  },
  etapa: (p) => ({
    margen: 0.3 - p.dif * 0.17,

    invertido: p.tema.variante === 'el-glifo-quedo-de-cabeza',
  }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), pieza: 0, juntas: 0, sueltas: 0, espera: 0, marco: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    if (m.parametros.invertido) s.marco += dt * 0.45;
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) encajar(m);
    // el objetivo no va en números: hay que comparar la réplica con la referencia a ojo
    m.objetivo = m.parametros.invertido
      ? 'El marco gira: cotejá las juntas aunque todo quede de cabeza'
      : 'Cotejá las dos juntas antes de encajar';
    m.lineas = [
      `A/D giro ${Math.round(s.x * 90)}° · W/S inclinación ${Math.round(s.y * 90)}° · Pieza ${s.pieza + 1}`,
      'Réplica con trazos geométricos inventados · No traduce escritura',
    ];
    m.stats = { juntas: s.juntas, sueltas: s.sueltas, x: s.x, y: s.y };
  },
  bot(m, dt, actor) {
    const s = m.datos;
    if (actor === 'compa') {
      m.datos.espera = Math.max(0, m.datos.espera - dt * 0.2);
      return;
    }
    const r = referencia(s);
    s.auto = true;
    s.x = r.a;
    s.y = r.b;
    encajar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    // el marco gira alrededor de su centro (y = 2) entre derecho y de cabeza; las etiquetas siguen a su bloque
    const giro = m.parametros.invertido ? (Math.PI * (1 - Math.cos(s.marco))) / 2 : 0,
      lado = Math.cos(giro);
    return (
      <Mesa titulo="Girás la réplica y cotejás dos bordes">
        <group position={[0, 2, 0]} rotation={[0, 0, giro]}>
          <group position={[0, -2, 0]}>
            {m.parametros.invertido && (
              <group position={[0, 1, 0]}>
                <Campesino />
              </group>
            )}
            {[-1, 1].map((l) => (
              <group
                key={l}
                position={[l * 2.6, 0, 0]}
                rotation={[l > 0 ? s.y : referencia(s).b, l > 0 ? s.x : referencia(s).a, 0]}
              >
                <Block pos={[0, 1.8, 0]} size={[2, 0.4, 2]} color="#c4b79c" mat="stone" solid={false} />
                {[-1, 1].map((i) => (
                  <Block
                    key={i}
                    pos={[i * 0.4, 2.03, i * 0.4]}
                    size={[0.9, 0.06, 0.15]}
                    color="#588e91"
                    mat="cloth"
                    solid={false}
                  />
                ))}
              </group>
            ))}
          </group>
        </group>
        <Label pos={[-2.6 * lado, 3.6, 0]} text="Referencia · dos bordes" h={0.3} />
        <Label pos={[2.6 * lado, 3.6, 0]} text="Tu réplica" h={0.3} />
      </Mesa>
    );
  },
});
export const Glifos = motor.Escena;
export const guia = motor.guia;
