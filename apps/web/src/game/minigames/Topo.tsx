import { input } from '../../core/input';
import { Ball, Block, Label } from '../kit';
import { controles, cursor, limitar, Mesa, mover } from './cortes/comun';
import { defineMotor, type Motor } from './kit';

type Estado = ReturnType<typeof cursor> & {
  sello: number;
  tension: number;
  pedido: number;
  entregas: number;
  rotas: number;
  espera: number;
};
type Sesion = Motor<{ margen: number; resistencia: number }, Estado>;
const sabores = ['Coco', 'Fresa', 'Tamarindo'];
const colores = ['#f4e7cb', '#ef7da0', '#ba8661'];
function tirar(m: Sesion, dt: number) {
  const s = m.datos;
  if (s.espera > 0) return;
  const izq = (s.x + 1) / 2,
    der = (s.y + 1) / 2;
  s.tension = Math.abs(izq - der);
  if (s.tension > m.parametros.margen) {
    s.rotas++;
    m.sumar(-25);
    s.sello = 0;
    s.espera = 1;
    return;
  }
  s.sello += (Math.min(izq, der) * dt) / m.parametros.resistencia;
  if (s.sello >= 1) {
    m.sumar(40);
    s.entregas++;
    s.sello = 0;
    s.pedido = (s.pedido + 1) % 3;
    s.espera = 0.7;
  }
}
const motor = defineMotor({
  id: 'cortes.topo',
  guia: {
    goal: 'Separá el sabor pedido con dos tirones parejos. A/D regula el sello izquierdo; W/S el derecho. F sostenido no hace falta: pulsá para tirar un segundo.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.16, resistencia: 1.4 + p.dif }),
  metas: (p) => [120 + Math.round(p.dif * 80), 320, 520],
  duracion: (p) => 70 + p.dif * 20,
  crear: (): Estado => ({ ...cursor(), sello: 0, tension: 0, pedido: 0, entregas: 0, rotas: 0, espera: 0 }),
  actualizar: (m, dt) => {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) tirar(m, 1);
    s.sello = limitar(s.sello - dt * 0.025, 0, 1);
    m.objetivo = `Pedido ${sabores[s.pedido]} · Regulá ambos tirones y pulsá F`;
    m.lineas = [
      `Izq ${Math.round((s.x + 1) * 50)}% · Der ${Math.round((s.y + 1) * 50)}% · Sello ${Math.round(s.sello * 100)}%`,
      `Asimetría máxima ${Math.round(m.parametros.margen * 100)}% · Entregas ${s.entregas} · Rotas ${s.rotas}`,
    ];
    m.stats = { entregas: s.entregas, rotas: s.rotas, sello: s.sello, tension: s.tension };
  },
  bot: (m, dt, actor) => {
    if (actor === 'compa') {
      tirar(m, dt * 0.2);
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.x = s.y = 0.6;
    tirar(m, dt);
  },
  Escena: ({ motor: m }) => (
    <Mesa
      titulo="Despegue de topogigios"
      texto={`Pedido: ${sabores[m.datos.pedido]} · A/D sello izquierdo · W/S derecho · F tirá`}
      color="#a6cbd3"
    >
      {sabores.map((s, i) => (
        <group key={s}>
          <Block pos={[-4 + i * 2.6, 1.6, 0]} size={[1.6, 1.7, 0.6]} color={colores[i]} mat="glass" solid={false} />
          <Block pos={[-4 + i * 2.6, 2.6, 0]} size={[1.8, 0.16, 0.7]} color="#d8efff" mat="plastic" solid={false} />
          <Label pos={[-4 + i * 2.6, 3.2, 0]} text={`${s}${i === m.datos.pedido ? ' ← pedido' : ''}`} h={0.32} />
        </group>
      ))}
      {[m.datos.x, m.datos.y].map((f, i) => (
        <Ball key={i} pos={[-3 + i * 4, 1.5 + (f + 1), 2]} r={0.23} color={i ? '#89e9e2' : '#ffcf70'} mat="neon" />
      ))}
      <Label pos={[-1, 1.2, 3.8]} text={`Sellos separados ${Math.round(m.datos.sello * 100)}%`} h={0.36} />
    </Mesa>
  ),
});
export const Topo = motor.Escena;
export const guia = motor.guia;
