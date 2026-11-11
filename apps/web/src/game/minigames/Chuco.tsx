import { input } from '../../core/input';
import { Ball, Block, Cyl, Label } from '../kit';
import { controles, cursor, Mesa, mover } from './cortes/comun';
import { defineMotor, type Motor } from './kit';

type Estado = ReturnType<typeof cursor> & {
  capas: number[];
  salsa: number;
  espera: number;
  buenas: number;
  derrames: number;
  mensaje: string;
};
type Sesion = Motor<{ margen: number; viento: number; nombre: string }, Estado>;
function servir(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  if (s.capas.length < 3) {
    s.capas.push(s.x * 1.8);
    s.mensaje = 'Otra capa. Centrá el peso antes de bañar.';
  } else if (s.salsa < 1) s.mensaje = 'Incliná el envase hacia abajo (S) para verter salsa.';
}
function centro(m: Sesion) {
  const s = m.datos;
  return (s.capas.reduce((a, b) => a + b, 0) + s.salsa * s.x * 2) / (s.capas.length + s.salsa || 1);
}
function resolver(m: Sesion, bien: boolean) {
  const s = m.datos;
  m.sumar(bien ? 50 : -25);
  bien ? s.buenas++ : s.derrames++;
  s.capas = [];
  s.salsa = 0;
  s.espera = 1;
  s.mensaje = bien ? '¡Plato firme! Prepará otro.' : 'Cedió el papel. Repartí el peso.';
}
const motor = defineMotor({
  id: 'cortes.chuco',
  guia: { goal: 'Apilá tres capas centradas y bañalas sin volcar el papel.', ...controles },
  etapa: (p) => ({
    margen: 0.85 - p.dif * 0.4,
    viento: 0.1 + p.dif * 0.3,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Pollo chuco en equilibrio',
  }),
  metas: (p) => [100 + Math.round(p.dif * 100), 300, 500],
  duracion: (p) => 70 + p.dif * 20,
  crear: (): Estado => ({
    ...cursor(),
    capas: [],
    salsa: 0,
    espera: 0,
    buenas: 0,
    derrames: 0,
    mensaje: 'F para apilar tajada, pollo y tajada.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) servir(m);
    if (s.capas.length === 3) {
      s.salsa += Math.max(0, s.y) * dt * 0.65;
      const peso = centro(m) + Math.sin(m.tiempo * 2) * m.parametros.viento * s.salsa;
      if (Math.abs(peso) > m.parametros.margen / (1 + s.salsa * 0.3)) resolver(m, false);
      else if (s.salsa >= 1.5) resolver(m, true);
    }
    m.objetivo = s.mensaje;
    m.lineas = [
      `Capas ${s.capas.length}/3 · Salsa ${Math.round(s.salsa * 67)}%`,
      `Centro ${centro(m).toFixed(2)} · F apilar · S verter · A/D equilibrar`,
    ];
    m.stats = { buenas: s.buenas, derrames: s.derrames, capas: s.capas.length, salsa: s.salsa };
  },
  bot: (m, _dt, actor) => {
    if (actor === 'compa' && m.tiempo % 4 > _dt) return;
    const s = m.datos;
    s.auto = true;
    s.x = 0;
    s.y = s.capas.length === 3 ? 0.8 : 0;
    if (s.capas.length < 3) servir(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo={m.parametros.nombre} texto="F apilá · A/D repartí peso · S incliná la salsa">
      <Cyl pos={[-1, 0.85, 0]} r={3} h={0.12} mat="cloth" color="#fff0ca" solid={false} />
      {m.datos.capas.map((x, i) => (
        <Block
          key={i}
          pos={[-1 + x, 1.1 + i * 0.45, 0]}
          size={[2.2, 0.4, 1.3]}
          color={i === 1 ? '#bf6c28' : '#f6cb52'}
          mat="sand"
          solid={false}
        />
      ))}
      <Ball pos={[-1 + centro(m), 1.5, 2]} r={0.18} color="#e54428" mat="neon" />
      <Block
        pos={[-1 + m.datos.x * 2, 3.8, 0]}
        size={[0.5, 1, 0.5]}
        rot={m.datos.y}
        color="#fce3ab"
        mat="plastic"
        solid={false}
      />
      <Label pos={[-1, 2, 3.5]} text={`Papel cede con el peso · ${Math.round(m.datos.salsa * 67)}% salsa`} h={0.32} />
    </Mesa>
  ),
});
export const Chuco = motor.Escena;
export const guia = motor.guia;
