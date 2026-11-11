import { input } from '../../../core/input';
import { Ball, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, duracion, metas, mover, Taller } from './Taller';

type Estado = {
  x: number;
  y: number;
  px: number;
  py: number;
  giro: number;
  sedimento: number;
  arena: number;
  buenas: number;
  perdidas: number;
  auto: boolean;
  aviso: string;
};
type Sesion = Motor<{ dif: number; nombre: string }, Estado>;
function inclinar(m: Sesion) {
  const s = m.datos;
  if (s.sedimento < 1 || Math.abs(s.x) > 0.6 - m.parametros.dif * 0.2) {
    m.sumar(-20);
    s.perdidas++;
    s.aviso = 'Perdiste la muestra: dejá sedimentar y nivelá';
  } else {
    s.arena -= 0.34;
    s.aviso = 'Arena afuera; material pesado retenido';
    if (s.arena <= 0) {
      m.sumar(40);
      s.buenas++;
      s.arena = 1;
    }
  }
  s.sedimento = 0;
  s.giro = 0;
}
const motor = defineMotor({
  id: 'olancho.batea',
  guia: { goal: 'Girá suavemente, soltá para sedimentar y luego incliná con F. No es extracción real.', ...controles },
  etapa: (p) => ({ dif: p.dif, nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Batea del Guayape' }),
  metas,
  duracion,
  crear: (): Estado => ({
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    giro: 0,
    sedimento: 0,
    arena: 1,
    buenas: 0,
    perdidas: 0,
    auto: false,
    aviso: 'Mové A/D para separar por densidad',
  }),
  actualizar(m, dt) {
    const s = m.datos;
    const antes = s.x;
    if (!s.auto) mover(s, dt);
    else s.x = s.giro < 1 ? Math.sin(m.tiempo * 4) * 0.4 : 0;
    s.auto = false;
    const movimiento = Math.abs(s.x - antes);
    s.giro += movimiento * 4;
    if (s.giro >= 1 && movimiento < 0.008) s.sedimento = Math.min(1, s.sedimento + dt / (1.5 + m.parametros.dif));
    else if (movimiento > 0.008) s.sedimento = Math.max(0, s.sedimento - dt);
    if (input.take('fire')) inclinar(m);
    m.objetivo = s.aviso;
    m.lineas = [
      `Giro ${Math.round(s.giro * 100)}% · Sedimentado ${Math.round(s.sedimento * 100)}%`,
      `Arena ${Math.max(0, Math.round(s.arena * 100))}% · Muestras ${s.buenas}`,
    ];
    m.stats = { buenas: s.buenas, perdidas: s.perdidas, sedimento: s.sedimento };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') {
      if (m.datos.sedimento >= 1) inclinar(m);
      return;
    }
    const s = m.datos;
    s.auto = true;
    if (s.sedimento >= 1) inclinar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Taller nombre={m.parametros.nombre} aviso="Girá → pausá → F para inclinar">
        <group rotation-z={s.x * 0.5}>
          <Cyl pos={[0, 0.6, 0]} r={3} h={0.6} color="#80512f" mat="wood" />
          <Cyl pos={[0, 0.94, 0]} r={2.7} h={0.08} color="#799c9e" mat="water" />
          {Array.from({ length: 18 }, (_, i) => (
            <Ball
              key={i}
              pos={[
                Math.sin(i * 2.4) * ((i % 3) + 1) * 0.65,
                1.1 - s.sedimento * 0.1,
                Math.cos(i * 2.4) * ((i % 3) + 1) * 0.65,
              ]}
              r={i % 3 ? 0.12 : 0.18}
              color={i % 3 ? '#c5b48b' : '#eac34d'}
              mat={i % 3 ? 'sand' : 'gold'}
            />
          ))}
        </group>
        <Label pos={[0, 2.2, 3]} text={`Sedimentado ${Math.round(s.sedimento * 100)}%`} h={0.4} />
      </Taller>
    );
  },
});
export const Batea = motor.Escena;
export const guia = motor.guia;
