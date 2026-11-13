import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, duracion, metas, mover, Taller } from './Taller';

type Estado = {
  x: number;
  y: number;
  px: number;
  py: number;
  inicio: number | null;
  recorrido: number;
  buenas: number;
  malas: number;
  auto: boolean;
  aviso: string;
};
type Sesion = Motor<{ margen: number; nombre: string }, Estado>;
function carril(s: Estado) {
  return s.buenas % 2 ? 0.55 : -0.55;
}
function trazar(m: Sesion) {
  const s = m.datos;
  if (s.inicio === null) {
    if (s.y < -0.65) {
      s.inicio = s.x;
      s.recorrido = 0;
      s.aviso = 'Seguí la fibra hasta abajo y confirmá';
    } else {
      s.aviso = 'Empezá en el borde superior';
      m.sumar(-5);
    }
    return;
  }
  const bueno = s.y > 0.65 && s.recorrido < m.parametros.margen && Math.abs(s.x - carril(s)) < m.parametros.margen;
  m.sumar(bueno ? 40 : -20);
  if (bueno) s.buenas++;
  else s.malas++;
  s.aviso = bueno ? 'Pieza útil sin nudos' : 'Corte inválido: respetá fibra y evitá el nudo';
  s.inicio = null;
}
const motor = defineMotor({
  id: 'olancho.tablas',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Madera ya aserrada. Apuntá al inicio del carril verde arriba, F; seguí la fibra hasta abajo y F. El nudo central invalida el corte.',
    ...controles,
  },
  etapa: (p) => ({
    margen: 0.25 - p.dif * 0.12,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Pedido de Campamento',
  }),
  metas,
  duracion,
  crear: (): Estado => ({
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    inicio: null,
    recorrido: 0,
    buenas: 0,
    malas: 0,
    auto: false,
    aviso: 'Buscá el inicio del carril verde',
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.auto) mover(s, dt);
    s.auto = false;
    if (s.inicio !== null) s.recorrido = Math.max(s.recorrido, Math.abs(s.x - carril(s)), Math.abs(s.x - s.inicio));
    if (input.take('fire')) trazar(m);
    m.objetivo = s.aviso;
    m.lineas = [`Piezas ${s.buenas} · Desperdicio ${s.malas}`, 'A/D y W/S o mouse / stick derecho · F inicio y fin'];
    m.stats = { buenas: s.buenas, malas: s.malas, x: s.x, y: s.y };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      if (m.datos.inicio !== null && m.datos.y > 0.7 && m.datos.recorrido < m.parametros.margen) trazar(m);
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.x = carril(s);
    if (s.inicio === null) {
      s.y = -0.9;
      trazar(m);
    } else {
      s.y = Math.min(0.9, s.y + dt);
      if (s.y >= 0.85) trazar(m);
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Taller nombre={m.parametros.nombre} aviso="Cortá siguiendo la veta · No usés árboles vivos">
        <Block pos={[0, 0.6, 0]} size={[6, 0.6, 7]} color="#c18b54" mat="wood" />
        {[-2, -1, 0, 1, 2].map((x) => (
          <Block key={x} pos={[x, 0.92, 0]} size={[0.035, 0.02, 7]} color="#835c34" mat="wood" />
        ))}
        <Cyl pos={[0, 0.95, 0.2]} r={0.55} h={0.05} color="#654127" mat="wood" />
        <Block pos={[carril(s) * 3, 0.96, 0]} size={[m.parametros.margen * 3, 0.02, 6.5]} color="#84b894" mat="glass" />
        <Ball pos={[s.x * 3, 1.1, s.y * 3]} r={0.18} color="#fff2c2" mat="neon" />
        {s.inicio !== null && (
          <Block
            pos={[s.inicio * 3, 1.02, (s.y - 0.9) * 1.5]}
            size={[0.07, 0.04, (s.y + 0.9) * 3]}
            color="#5c402b"
            mat="wood"
          />
        )}
        <Label pos={[0, 1.2, -3.5]} text="INICIO · F" h={0.3} />
        <Label pos={[0, 1.2, 3.5]} text="FIN · F" h={0.3} />
      </Taller>
    );
  },
});
export const Tablas = motor.Escena;
export const guia = motor.guia;
