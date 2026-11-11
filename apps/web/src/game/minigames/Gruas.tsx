import { input } from '../../core/input';
import { Block, Label } from '../kit';
import { controles, cursor, Mesa, mover } from './cortes/comun';
import { defineMotor, type Motor } from './kit';

type Estado = ReturnType<typeof cursor> & {
  cola: number[];
  cargas: { riel: number; t: number }[];
  manifiesto: number;
  entregas: number;
  choques: number;
  bloqueo: number;
  mensaje: string;
};
type Sesion = Motor<{ velocidad: number }, Estado>;
function programar(m: Sesion, riel: number) {
  const s = m.datos;
  if (s.cola.length < 4) s.cola.push(riel);
}
const motor = defineMotor({
  id: 'cortes.gruas',
  guia: { goal: 'Programá riel 1 o 2 según el manifiesto. Esperá a que la otra grúa libere el cruce.', ...controles },
  etapa: (p) => ({ velocidad: 0.32 + p.dif * 0.18 }),
  metas: (p) => [120 + Math.round(p.dif * 80), 300, 500],
  duracion: (p) => 75 + p.dif * 20,
  crear: (): Estado => ({
    ...cursor(),
    cola: [],
    cargas: [],
    manifiesto: 0,
    entregas: 0,
    choques: 0,
    bloqueo: 0,
    mensaje: 'Izá en orden. Izquierda riel 1; derecha riel 2.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    mover(s, dt);
    if (input.take('fire')) programar(m, s.x < 0 ? 0 : 1);
    s.bloqueo = Math.max(0, s.bloqueo - dt);
    if (s.cola.length && s.bloqueo === 0) {
      const r = s.cola[0];
      if (!s.cargas.some((c) => c.riel === r)) {
        s.cola.shift();
        s.cargas.push({ riel: r, t: 0 });
      }
    }
    for (const c of s.cargas) c.t += dt * m.parametros.velocidad;
    if (s.cargas.length === 2 && s.cargas.every((c) => c.t > 0.35 && c.t < 0.7)) {
      s.cargas = [];
      s.cola = [];
      s.choques++;
      m.sumar(-40);
      s.bloqueo = 2;
      s.mensaje = '¡Cruce ocupado! Reprogramá sin cruzar plumas.';
    }
    for (const c of s.cargas.filter((c) => c.t >= 1)) {
      if (c.riel === s.manifiesto) {
        m.sumar(40);
        s.entregas++;
        s.manifiesto = 1 - s.manifiesto;
        s.mensaje = 'Carga bien estibada. Revisá el siguiente manifiesto.';
      } else {
        m.sumar(-30);
        s.bloqueo = 3;
        s.mensaje = 'Bodega bloqueada por carga fuera de orden.';
      }
    }
    s.cargas = s.cargas.filter((c) => c.t < 1);
    m.objetivo = `Manifiesto: riel ${s.manifiesto + 1} · ${s.mensaje}`;
    m.lineas = [`Cola ${s.cola.map((r) => r + 1).join(' → ') || 'vacía'} · Bloqueo ${s.bloqueo.toFixed(1)} s`];
    m.stats = { entregas: s.entregas, choques: s.choques, cola: s.cola.length, activas: s.cargas.length };
  },
  bot: (m, _dt, actor) => {
    if (actor === 'compa' && m.tiempo % 4 > _dt) return;
    const s = m.datos;
    if (!s.cola.length && !s.cargas.length && s.bloqueo === 0) programar(m, s.manifiesto);
  },
  Escena: ({ motor: m }) => (
    <Mesa
      titulo="Cruce de grúas portuarias"
      texto={`Manifiesto: riel ${m.datos.manifiesto + 1} · A/D elegí · F programá`}
      color="#8ec8cc"
    >
      {[0, 1].map((r) => (
        <group key={r}>
          <Block
            pos={[-1, 0.85, 0]}
            size={r ? [0.2, 0.1, 7] : [8, 0.1, 0.2]}
            color="#b7c5d0"
            mat="metal"
            solid={false}
          />
          <Block pos={[r ? -1 : -4, 2, r ? -3 : 0]} size={[0.3, 3, 0.3]} color="#eebc30" mat="metal" solid={false} />
          <Label pos={[r ? -1 : -4, 4, r ? -3 : 0]} text={`Riel ${r + 1}`} h={0.4} />
        </group>
      ))}
      {m.datos.cargas.map((c) => (
        <Block
          key={c.riel}
          pos={[c.riel ? -1 : -5 + c.t * 8, 1.5, c.riel ? -4 + c.t * 8 : 0]}
          size={[1.2, 0.8, 1]}
          mat="metal"
          color={c.riel ? '#42ae9f' : '#f29a4e'}
          solid={false}
        />
      ))}
      <Label pos={[-1, 1, 3.8]} text={m.datos.bloqueo ? 'BODEGA BLOQUEADA' : 'CRUCE COMPARTIDO'} h={0.38} />
    </Mesa>
  ),
});
export const Gruas = motor.Escena;
export const guia = motor.guia;
