import { input } from '../../../core/input';
import { Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  par: number;
  ultimo: number;
  espera: number;
  jugo: number;
  atascos: number;
};
type Sesion = Motor<{ limite: number }, Estado>;
function alimentar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  const gruesa = s.x > 0;
  if (s.par + (gruesa ? 0.65 : 0.25) > m.parametros.limite || (gruesa && s.ultimo === 1)) {
    s.atascos++;
    s.espera = 2;
    s.par = 0.8;
    m.sumar(-40);
  } else if (!gruesa && s.ultimo === 0) {
    s.espera = 1.2;
    m.sumar(-15);
  } else {
    s.par += gruesa ? 0.65 : 0.25;
    s.ultimo = gruesa ? 1 : 0;
    s.jugo++;
    m.sumar(gruesa ? 35 : 15);
    s.espera = 1.2;
  }
}
const motor = defineMotor({
  id: 'lempira.trapiche',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: { goal: 'Alterná cañas finas y gruesas. Esperá que baje el par antes de alimentar con F.', ...controles },
  etapa: (p) => ({ limite: 1.15 - p.dif * 0.15 }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), par: 0, ultimo: -1, espera: 0, jugo: 0, atascos: 0 }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.par = Math.max(0, s.par - dt * 0.28);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) alimentar(m);
    m.objetivo = 'Mantené jugo continuo sin atascar los rodillos';
    m.lineas = [
      `A/D grosor: ${s.x > 0 ? 'gruesa' : 'fina'} · Par ${s.par.toFixed(2)}/${m.parametros.limite.toFixed(2)}`,
      'F alimentá · Dos gruesas seguidas atascan · Esperá entre tallos',
    ];
    m.stats = { x: s.x, jugo: s.jugo, atascos: s.atascos, par: s.par };
  },
  bot(m, _dt) {
    const s = m.datos;
    s.auto = true;
    s.x = s.ultimo === 1 ? -0.7 : 0.7;
    if (s.par < 0.3) alimentar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Trapiche de maqueta · Alterná espesores">
      {[-1, 1].map((i) => (
        <group key={i} position={[i, 1.6, 0]} rotation={[Math.PI / 2, m.tiempo, 0]}>
          <Cyl pos={[0, 0, 0]} r={0.7} h={3.4} color="#6b7779" mat="metal" solid={false} />
        </group>
      ))}
      <group scale={[m.datos.x > 0 ? 1.6 : 0.7, 1, 1]}>
        <Block pos={[0, 2.4, 2]} size={[0.3, 0.3, 3]} color="#a6b965" mat="wood" solid={false} />
      </group>
      <Cyl pos={[0, 0.9, 3]} r={0.8} h={0.15} color="#d9b449" mat="water" solid={false} />
      <Label pos={[0, 3.4, 0]} text={m.datos.espera > 1.2 ? '¡Atascado!' : 'Leé el par antes de alimentar'} h={0.3} />
    </Mesa>
  ),
});
export const Trapiche = motor.Escena;
export const guia = motor.guia;
