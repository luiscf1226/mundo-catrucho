import { input } from '../../../core/input';
import { Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  ladera: number;
  trazo: boolean;
  tomas: number;
  secas: number;
  espera: number;
};
type Sesion = Motor<{ sequia: boolean }, Estado>;
function asignar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.8;
  if (!s.trazo) {
    if (Math.abs(s.x - (s.ladera - 1) * 0.6) < 0.2) {
      s.trazo = true;
    } else {
      s.secas++;
      m.sumar(-25);
    }
    return;
  }
  const disponible = m.parametros.sequia ? 0.6 : 0.9,
    toma = (s.y + 1) * 0.5;
  if (toma > disponible - 0.2 || toma < 0.25 || Math.abs(s.x - (s.ladera - 1) * 0.6) > 0.2) {
    s.secas++;
    m.sumar(-30);
  } else {
    s.tomas++;
    m.sumar(60);
    s.ladera = (s.ladera + 1) % 3;
  }
  s.trazo = false;
}
const motor = defineMotor({
  id: 'lempira.cuencas',
  fondo: 'montana',
  guia: {
    goal: 'A/D trazá la divisoria de la ladera indicada, F fijá. W/S asigná caudal y F confirmá sin secar el río.',
    ...controles,
  },
  etapa: (p) => ({ sequia: p.tema.variante === 'el-rio-no-sube-la-cuesta' }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), ladera: 0, trazo: false, tomas: 0, secas: 0, espera: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) asignar(m);
    m.objetivo = `${s.trazo ? 'Asigná captación' : 'Trazá divisoria'} · Ladera ${s.ladera + 1}`;
    m.lineas = [
      `Lluvia ${m.parametros.sequia ? '0.60 · Sequía' : '0.90 · Uniforme'} · Reservá 0.20 ecológico`,
      `A/D divisoria ${s.x.toFixed(2)} (marcas −0.6, 0, +0.6) · W/S toma ${((s.y + 1) / 2).toFixed(2)} · Mínimo poblado 0.25`,
    ];
    m.stats = { x: s.x, tomas: s.tomas, secas: s.secas, trazo: Number(s.trazo) };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') return;
    const s = m.datos;
    s.auto = true;
    s.x = (s.ladera - 1) * 0.6;
    s.y = m.parametros.sequia ? -0.35 : 0.1;
    asignar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Divisorias y captaciones · Conservá agua abajo">
      {[0, 1, 2].map((i) => (
        <group key={i} position={[(i - 1) * 3, 0, 0]}>
          <Cyl
            pos={[0, 1.8, 0]}
            r={1.4}
            rTop={0.15}
            h={2}
            color={i === m.datos.ladera ? '#a6b58a' : '#6d9278'}
            mat="grass"
            solid={false}
          />
          <Block pos={[0, 0.9, 2]} size={[0.3, 0.1, 2]} color="#58bbc5" mat="water" solid={false} />
          <Label pos={[0, 3.2, 0]} text={`Ladera ${i + 1}`} h={0.3} />
        </group>
      ))}
      <Block pos={[m.datos.x * 5, 2, 1]} size={[0.08, 2, 0.1]} color="#f7dc80" mat="neon" solid={false} />
    </Mesa>
  ),
});
export const Cuencas = motor.Escena;
export const guia = motor.guia;
