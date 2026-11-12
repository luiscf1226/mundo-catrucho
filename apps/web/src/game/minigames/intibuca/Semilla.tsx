import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  marcados: number;
  reservadas: number;
  vendidas: number;
  errores: number;
  espera: number;
};
type Sesion = Motor<{ margen: number }, Estado>;
function ojo(s: Estado) {
  return { x: s.marcados === 0 ? -0.6 : 0.6, y: (s.reservadas % 2 ? 1 : -1) * 0.45 };
}
function marcar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.marcados === 2) return;
  s.espera = 0.6;
  const o = ojo(s);
  if (Math.hypot(s.x - o.x, s.y - o.y) < m.parametros.margen) s.marcados++;
  else {
    s.errores++;
    m.sumar(-15);
  }
}
function reservar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.8;
  if (s.marcados === 2) {
    s.reservadas++;
    s.marcados = 0;
    m.sumar(45);
  } else {
    s.errores++;
    m.sumar(-25);
  }
}
const motor = defineMotor({
  id: 'intibuca.semilla',
  guia: {
    goal: 'Girá la papa con ambos ejes. F marca dos ojos viables; E reserva el lote. Q / Salto vende y pierde la semilla.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.15 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), marcados: 0, reservadas: 0, vendidas: 0, errores: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) marcar(m);
    if (input.take('use')) reservar(m);
    if ((input.take('alt') || input.take('jump')) && s.espera <= 0) {
      s.vendidas++;
      s.marcados = 0;
      s.espera = 1;
      m.sumar(-50);
    }
    m.objetivo = `Ojos viables ${s.marcados}/2 · ${s.marcados === 2 ? 'E: reservá semilla' : 'F: marcá el ojo brillante'}`;
    m.lineas = [
      `Lotes reservados ${s.reservadas} · Vendidos ${s.vendidas}`,
      'Girá a izquierda/derecha y arriba/abajo. Es una réplica de práctica.',
    ];
    m.stats = { x: s.x, reservadas: s.reservadas, vendidas: s.vendidas, errores: s.errores };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') return;
    const s = m.datos;
    s.auto = true;
    Object.assign(s, ojo(s));
    if (s.marcados === 2) reservar(m);
    else marcar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Semilla para la siguiente temporada">
      <group rotation={[m.datos.y, m.datos.x * 2, 0]}>
        <group scale={[1.5, 0.8, 1]}>
          <Ball pos={[-0.6, 1.8, 0]} r={1.3} color="#bc946c" mat="dirt" />
        </group>
        {[-1, 1].map((i) => (
          <Ball key={i} pos={[-1 + i * 0.8, 2.2, i * 0.5]} r={0.16} color="#e8df7b" />
        ))}
      </group>
      <Block
        pos={[-1 + ojo(m.datos).x * 3, 2.8, ojo(m.datos).y * 2]}
        size={[0.2, 0.15, 0.2]}
        color="#98e783"
        solid={false}
      />
      <Label
        pos={[-1, 3.5, -2]}
        text={`Ojo ${Math.min(2, m.datos.marcados + 1)} · ${ojo(m.datos).x < 0 ? 'izquierda' : 'derecha'} / ${ojo(m.datos).y < 0 ? 'abajo' : 'arriba'}`}
        h={0.35}
      />
    </Mesa>
  ),
});
export const Semilla = motor.Escena;
export const guia = motor.guia;
