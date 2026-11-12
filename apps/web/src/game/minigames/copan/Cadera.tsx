import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, P } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { Campesino } from '../kit/Figuras';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  rebotes: number;
  faltas: number;
  vuelo: number;
  aviso: string;
  apoyo: boolean;
};
type Parametros = { margen: number; velocidad: number; desplazamiento: boolean };
type Sesion = Motor<Parametros, Estado>;

function blanco(s: Estado) {
  return s.rebotes % 2 ? 0.6 : -0.6;
}
function golpear(m: Sesion, prohibido = false) {
  const s = m.datos;
  if (
    s.vuelo < 0.7 ||
    s.vuelo > 1.3 ||
    prohibido ||
    Math.abs(s.x - blanco(s)) > m.parametros.margen ||
    Math.abs(s.y - (m.parametros.desplazamiento ? blanco(s) : 0)) > m.parametros.margen
  ) {
    s.faltas++;
    m.sumar(-10);
    s.aviso = prohibido ? 'Manos y pies anulan el punto' : 'Buscá el marcador y esperá el rebote';
  } else {
    m.sumar(s.apoyo ? 35 : 30);
    s.rebotes++;
    s.aviso = '¡Cadera al marcador!';
  }
  s.vuelo = 0;
}

const motor = defineMotor({
  id: 'copan.cadera',
  fondo: 'ruinas',
  guia: {
    goal: 'Orientá la cadera y desviá la pelota a los marcadores. F golpea al pasar por el aro; E o salto anula.',
    ...controles,
  },
  etapa: (p) => ({
    margen: 0.3 - p.dif * 0.17,
    velocidad: 1 + p.dif,
    desplazamiento: p.tema.variante === 'la-pelota-no-quiere-manos',
  }),
  metas,
  duracion,
  crear: (): Estado => ({
    ...cursor(),
    apoyo: false,
    rebotes: 0,
    faltas: 0,
    vuelo: 0,
    aviso: 'Esperá la pelota y orientá la cadera',
  }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.vuelo += dt * m.parametros.velocidad;
    if (s.vuelo > 2) {
      s.vuelo = 0;
      s.faltas++;
    }
    if (input.take('fire')) golpear(m);
    if (input.take('use') || input.take('jump')) golpear(m, true);
    m.objetivo = s.aviso;
    m.lineas = [
      `A/D orientá a ${blanco(s) < 0 ? 'izquierda' : 'derecha'} · F cadera al llegar al aro`,
      `W/S recepción ${m.parametros.desplazamiento ? blanco(s).toFixed(1) : '0.0'} · E / salto anula`,
    ];
    m.stats = { rebotes: s.rebotes, faltas: s.faltas, x: s.x, vuelo: s.vuelo };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') {
      m.datos.apoyo = true;
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.x = blanco(s);
    s.y = m.parametros.desplazamiento ? blanco(s) : 0;
    if (s.vuelo >= 0.9) golpear(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo="Orientá la cadera y desviá la pelota a los marcadores">
        {[-1, 1].map((l) => (
          <group key={l}>
            <Block pos={[l * 3.3, 1, -1]} size={[1, 1, 6]} color="#aaa185" mat="stone" solid={false} />
            <P.Macaw pos={[l * 3.3, 2, -2]} scale={0.5} />
            <Label pos={[l * 3.3, 2.9, -2]} text={blanco(s) * l > 0 ? '◉ Marcador' : 'Marcador'} h={0.3} />
          </group>
        ))}
        <group position={[s.x * 2, 0.8, 1]} rotation={[0, s.x, 0]}>
          <Campesino />
        </group>
        <Ball
          pos={[s.x * 2, 1.6 + Math.abs(1 - s.vuelo) * 2, 1 - s.vuelo * 2]}
          r={0.32}
          color="#3d3530"
          mat="plastic"
        />
        <Cyl pos={[s.x * 2, 1, 0]} r={0.7} h={0.06} color="#f3cf75" mat="neon" solid={false} />
        <Label pos={[-1, 1, 3.4]} text="Interpretación corporal de práctica · No es fútbol" h={0.28} />
      </Mesa>
    );
  },
});
export const Cadera = motor.Escena;
export const guia = motor.guia;
