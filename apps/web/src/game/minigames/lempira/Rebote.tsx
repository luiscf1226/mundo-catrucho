import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  pelota: { x: number; z: number; vx: number; vz: number } | null;
  rebotes: number;
  tiros: number;
  fallos: number;
  blanco: number;
};
type Sesion = Motor<{ velocidad: number }, Estado>;
const objetivo = (s: Estado) => (s.blanco % 2 ? 2 : -2);
function tirar(m: Sesion) {
  const s = m.datos;
  if (s.pelota) return;
  const a = ((s.x + 1) * Math.PI) / 2;
  s.pelota = { x: 0, z: 3, vx: Math.cos(a) * m.parametros.velocidad, vz: -Math.sin(a) * m.parametros.velocidad };
  s.rebotes = 0;
}
const motor = defineMotor({
  id: 'lempira.rebote',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ruinas',
  guia: {
    goal: 'A/D apuntá al muro del fondo; F lanzá pelota blanda. El tabique tapa el tiro directo. Acertá con un solo rebote.',
    ...controles,
  },
  etapa: (p) => ({ velocidad: 7 + p.dif }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), pelota: null, rebotes: 0, tiros: 0, fallos: 0, blanco: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    if (input.take('fire')) tirar(m);
    const b = s.pelota;
    if (b) {
      b.x += b.vx * dt;
      b.z += b.vz * dt;
      if (b.z < -3) {
        b.z = -6 - b.z;
        b.vz = Math.abs(b.vz);
        s.rebotes++;
      }
      if (Math.abs(b.x) > 4.5) {
        b.x = Math.sign(b.x) * (9 - Math.abs(b.x));
        b.vx = -b.vx;
        s.rebotes++;
      }
      const tabique = s.rebotes === 0 && b.z < 0.25 && b.z > -0.25 && Math.abs(b.x) < 0.4;
      if (s.rebotes > 1 || tabique || b.z > 3.5) {
        s.fallos++;
        m.sumar(-15);
        s.pelota = null;
      } else if (s.rebotes === 1 && b.z >= 0 && Math.abs(b.x - objetivo(s)) < 0.5) {
        s.tiros++;
        s.blanco++;
        m.sumar(60);
        s.pelota = null;
      }
    }
    m.objetivo = 'Un rebote vale; dos anulan el tiro';
    m.lineas = [
      `A/D ángulo ${Math.round((s.x + 1) * 90)}° · Blanco ${objetivo(s)} m · Rebotes ${s.rebotes}`,
      'Buscá el blanco reflejado detrás del muro · F lanzá',
    ];
    m.stats = { x: s.x, tiros: s.tiros, fallos: s.fallos, rebotes: s.rebotes };
  },
  bot(m, _dt) {
    const s = m.datos;
    s.auto = true;
    s.x = Math.atan2(9, objetivo(s)) / (Math.PI / 2) - 1;
    tirar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Geometría con pelotas de utilería">
      <Block pos={[0, 1.3, -3.2]} size={[9.4, 1, 0.3]} color="#eee3ca" mat="stone" solid={false} />
      {[-1, 1].map((i) => (
        <Block key={i} pos={[i * 4.7, 1.3, 0]} size={[0.3, 1, 6.5]} color="#b4b4aa" mat="stone" solid={false} />
      ))}
      <Block pos={[0, 1.3, 0]} size={[0.8, 1, 0.3]} color="#b88968" mat="wood" solid={false} />
      <Ball pos={[objetivo(m.datos), 1.2, 0]} r={0.45} color="#eea951" />
      <Ball pos={[m.datos.pelota?.x ?? 0, 1.2, m.datos.pelota?.z ?? 3]} r={0.2} color="#7ae2cc" />
      <Label pos={[0, 2.5, -3.3]} text="Muro de práctica · Un rebote" h={0.3} />
    </Mesa>
  ),
});
export const Rebote = motor.Escena;
export const guia = motor.guia;
