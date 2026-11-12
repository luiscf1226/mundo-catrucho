import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & { capas: number[]; murales: number; tapadas: number; espera: number };
type Sesion = Motor<{ inverso: boolean }, Estado>;
const colores = ['#c56e55', '#e9ca80', '#6aa3a1'];
function orden(s: Estado) {
  return s.murales % 2 ? [2, 0, 1] : [0, 2, 1];
}
function poner(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.7;
  const elegida = Math.max(0, Math.min(2, Math.round(s.x + 1)));
  if (elegida !== orden(s)[s.capas.length]) {
    s.tapadas++;
    s.capas = [];
    m.sumar(-30);
    return;
  }
  s.capas.push(elegida);
  if (s.capas.length === 3) {
    s.murales++;
    s.capas = [];
    m.sumar(75);
  }
}
const motor = defineMotor({
  id: 'lempira.pigmentos',
  fondo: 'pueblo',
  guia: {
    goal: 'Observá qué trazo pasa encima en la copia. A/D elegí pigmento; F poné de fondo a frente. La iglesia real no se toca.',
    ...controles,
  },
  etapa: () => ({ inverso: false }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), capas: [], murales: 0, tapadas: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) poner(m);
    const o = orden(s);
    m.objetivo = 'Componé sin tapar rasgos necesarios';
    m.lineas = [
      `Solapamientos: ${o[2] + 1} tapa ${o[1] + 1}; ${o[1] + 1} tapa ${o[0] + 1}`,
      `A/D pigmento ${Math.round(s.x + 1) + 1} · F colocá fondo a frente · Capas ${s.capas.length}/3`,
    ];
    m.stats = { x: s.x, murales: s.murales, tapadas: s.tapadas };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') return;
    const s = m.datos;
    s.auto = true;
    s.x = orden(s)[s.capas.length] - 1;
    poner(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Capas de Colohete · Copia digital de taller">
      {[-1, 1].map((l) => (
        <group key={l} position={[l * 2.4, 1, 0]}>
          <Block pos={[0, 0, 0]} size={[3.6, 0.1, 4]} color="#eee1bf" mat="cloth" solid={false} />
          {(l < 0 ? orden(m.datos) : m.datos.capas).map((c, i) => (
            <Block
              key={c}
              pos={[0, 0.12 + i * 0.12, 0]}
              size={c === 0 ? [3, 0.1, 0.5] : c === 1 ? [0.5, 0.1, 3] : [2.2, 0.1, 1.3]}
              rot={c === 2 ? 0.4 : 0}
              color={colores[c]}
              mat="cloth"
              solid={false}
            />
          ))}
        </group>
      ))}
      <Label pos={[-2.4, 2.2, -2]} text="Referencia · Mirá los cruces" h={0.28} />
      <Label pos={[2.4, 2.2, -2]} text="Tu composición" h={0.28} />
      {m.datos.murales > 0 && (
        <group rotation={[0, 0, Math.sin(m.tiempo) * 0.2]}>
          <Block pos={[4, 2, 2]} size={[0.2, 1.5, 0.2]} color="#a57045" mat="wood" solid={false} />
          <Block pos={[4, 2.8, 2]} size={[0.6, 0.4, 0.3]} color="#e9cc72" mat="cloth" solid={false} />
          <Label pos={[1, 3.5, 2]} text="¡Otra brocha, porfa!" h={0.35} />
        </group>
      )}
    </Mesa>
  ),
});
export const Pigmentos = motor.Escena;
export const guia = motor.guia;
