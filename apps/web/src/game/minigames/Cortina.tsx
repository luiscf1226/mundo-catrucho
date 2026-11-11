import { input } from '../../core/input';
import { Ball, Block, Label } from '../kit';
import { controles, cursor, Mesa, mover } from './cortes/comun';
import { defineMotor, type Motor } from './kit';

type Estado = ReturnType<typeof cursor> & {
  refugio: number;
  marcadas: number;
  primero: number;
  cruces: number;
  mojadas: number;
  espera: number;
};
type Sesion = Motor<{ velocidad: number; ventana: number }, Estado>;
function abierta(m: Sesion, i: number) {
  return Math.sin(m.tiempo * m.parametros.velocidad + i * 0.65) > m.parametros.ventana;
}
function marcar(m: Sesion, i: number) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.35;
  s.marcadas++;
  if (!abierta(m, i)) {
    s.primero = -1;
    s.refugio = 0;
    s.mojadas++;
    m.sumar(-20);
    return;
  }
  if (s.primero < 0) {
    s.primero = i;
    return;
  }
  if (i === s.primero + 1 && abierta(m, s.primero)) {
    s.refugio = i;
    s.cruces++;
    m.sumar(35);
    s.primero = -1;
  } else {
    s.primero = i;
  }
}
const motor = defineMotor({
  id: 'cortes.cortina',
  guia: {
    goal: 'Con guía, marcá refugio 1 y después 2 mientras ambas ventanas estén verdes. Es una réplica virtual.',
    ...controles,
  },
  etapa: (p) => ({ velocidad: 0.8 + p.dif * 0.6, ventana: 0.05 + p.dif * 0.3 }),
  metas: (p) => [100 + Math.round(p.dif * 80), 280, 450],
  duracion: (p) => 70 + p.dif * 20,
  crear: (): Estado => ({ ...cursor(), refugio: 0, marcadas: 0, primero: -1, cruces: 0, mojadas: 0, espera: 0 }),
  actualizar: (m, dt) => {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) marcar(m, s.x < 0 ? 0 : 1);
    m.objetivo = s.primero < 0 ? 'Marcá el primer refugio verde' : 'Ahora el segundo, antes de que cierre el primero';
    m.lineas = ['A/D o puntero elegí refugio · F marcá', `Cruces ${s.cruces} · Regresos por agua ${s.mojadas}`];
    m.stats = { marcadas: s.marcadas, cruces: s.cruces, mojadas: s.mojadas, primero: s.primero };
  },
  bot: (m, _dt, actor) => {
    if (actor === 'compa' && m.datos.primero >= 0) return;
    if (abierta(m, 0) && abierta(m, 1)) marcar(m, m.datos.primero < 0 ? 0 : 1);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Ventanas de Pulhapanzak" texto="Esperá dos huecos verdes · F marcá 1 y después 2" color="#709f9b">
      {[0, 1].map((i) => (
        <group key={i}>
          <Block
            pos={[-3 + i * 4, 2, -1]}
            size={[2.8, abierta(m, i) ? 0.4 : 4, 0.5]}
            color={abierta(m, i) ? '#7fdc8b' : '#8cd9ff'}
            mat="water"
            solid={false}
          />
          <Block pos={[-3 + i * 4, 0.9, 1]} size={[2, 0.3, 2]} color="#77868e" mat="stone" solid={false} />
          <Label pos={[-3 + i * 4, 4.4, -1]} text={`${i + 1} ${abierta(m, i) ? 'PASÁ' : 'ESPERÁ'}`} h={0.4} />
        </group>
      ))}
      <Ball pos={[m.datos.primero < 0 ? -4 : -3 + m.datos.primero * 4, 1.6, 1]} r={0.35} color="#ffc64d" mat="cloth" />
      <Label pos={[-1, 1.4, 3.4]} text="🤖 Guía: seguí la cuerda, sin soltarte" h={0.35} />
    </Mesa>
  ),
});
export const Cortina = motor.Escena;
export const guia = motor.guia;
