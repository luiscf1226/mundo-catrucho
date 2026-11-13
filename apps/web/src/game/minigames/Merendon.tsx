import { input } from '../../core/input';
import { Block, Label } from '../kit';
import { controles, Mesa } from './cortes/comun';
import { defineMotor, type Motor } from './kit';
import { Campesino } from './kit/Figuras';

type Estado = { altura: number; reserva: number; descanso: number; cumbres: number; agotadas: number; mensaje: string };
type Sesion = Motor<{ recarga: number; coste: number }, Estado>;
function capacidad(m: Sesion) {
  return 100 - m.datos.altura * 4;
}
function costo(m: Sesion) {
  return m.parametros.coste + (m.datos.altura >= 7 ? 30 : 0);
}
function subir(m: Sesion) {
  const s = m.datos;
  if (s.descanso > 0) return;
  const gasto = costo(m);
  if (s.reserva < gasto) {
    s.agotadas++;
    m.sumar(-15);
    s.mensaje = 'Sin reserva para ese tramo. Descansá antes de subir.';
    s.descanso = 1;
    return;
  }
  s.reserva -= gasto;
  s.altura++;
  s.descanso = 0.5;
  s.reserva = Math.min(s.reserva, capacidad(m));
  if (s.altura === 8) {
    const bien = s.reserva >= 8;
    m.sumar(bien ? 80 : -30);
    s.cumbres += bien ? 1 : 0;
    s.mensaje = bien
      ? '¡Llegaste con reserva! Bajá y prepará otra subida.'
      : 'Llegaste sin reserva. Guardá más antes del tramo final.';
    s.altura = 0;
    s.reserva = 25;
    s.descanso = 2;
  }
}
const motor = defineMotor({
  id: 'cortes.merendon',
  modos: { duo: { tipo: 'apoyo', cada: 4 }, abierto: { tipo: 'objetivo-comun', bots: 3, cada: 6 } },
  guia: {
    goal: 'Guardá esfuerzo descansando. F sube un tramo; la mochila pierde capacidad con la altura. El último cuesta 30 extra y exige 8 de reserva.',
    ...controles,
  },
  etapa: (p) => ({ recarga: 15 - p.dif * 4, coste: 7 + p.dif * 3 }),
  metas: (p) => [80 + Math.round(p.dif * 80), 240, 400],
  duracion: (p) => 80 + p.dif * 20,
  crear: (): Estado => ({
    altura: 0,
    reserva: 35,
    descanso: 0,
    cumbres: 0,
    agotadas: 0,
    mensaje: 'Descansá para guardar esfuerzo antes de subir.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    s.descanso = Math.max(0, s.descanso - dt);
    s.reserva = Math.min(capacidad(m), s.reserva + dt * m.parametros.recarga);
    if (input.take('fire')) subir(m);
    m.objetivo = s.mensaje;
    m.lineas = [
      `Altura ${s.altura}/8 · Reserva ${Math.floor(s.reserva)}/${capacidad(m)} · Siguiente cuesta ${costo(m)}`,
      'F / 🎯 / RT subí · Sin pulsar descansás',
    ];
    m.stats = { cumbres: s.cumbres, agotadas: s.agotadas, altura: s.altura, reserva: s.reserva };
  },
  bot: (m, _dt) => {
    if (m.datos.reserva >= costo(m) + 12) subir(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Reserva de altura" texto="Guardá esfuerzo para el último tramo · F subí · Esperá para descansar">
      {Array.from({ length: 8 }, (_, i) => (
        <Block
          key={i}
          pos={[-1, 0.85 + i * 0.33, 3 - i * 0.8]}
          size={[5, 0.3, 0.8]}
          color={i === 7 ? '#d3b95d' : '#798973'}
          mat="stone"
          solid={false}
        />
      ))}
      <group position={[-1, 1 + m.datos.altura * 0.33, 3 - m.datos.altura * 0.8]} scale={0.7}>
        <Campesino />
      </group>
      <Label pos={[-1, 4, -3]} text="MERENDÓN" h={0.6} />
      <Block
        pos={[-1, 1, 4]}
        size={[Math.max(0.02, m.datos.reserva / 12), 0.3, 0.4]}
        color="#77df8c"
        mat="neon"
        solid={false}
      />
    </Mesa>
  ),
});
export const Merendon = motor.Escena;
export const guia = motor.guia;
