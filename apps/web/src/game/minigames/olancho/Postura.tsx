import { input } from '../../../core/input';
import { Block, Label, P } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { Campesino } from '../kit/Figuras';
import { duracion, metas, Taller } from './Taller';

type Estado = { paso: number; agachado: boolean; buenas: number; golpes: number; auto: boolean; aviso: string };
type Sesion = Motor<{ viento: number; nombre: string }, Estado>;
function rama(s: Estado) {
  return s.paso % 4 > 1.4 && s.paso % 4 < 3.1;
}
function avanzar(m: Sesion, dt: number, marcha: number) {
  const s = m.datos;
  if (rama(s) && !s.agachado) {
    s.paso = Math.floor(s.paso / 4) * 4;
    s.golpes++;
    s.aviso = 'Rozaste la copa: volvé al apoyo';
    return;
  }
  const viento = m.parametros.viento * (0.6 + 0.4 * Math.sin(m.tiempo));
  const v = s.agachado ? 0.65 : 1 - viento;
  s.paso += Math.max(0, marcha) * dt * v;
  if (s.paso >= 6) {
    m.sumar(65);
    s.buenas++;
    s.paso = 0;
    s.aviso = 'Marca alcanzada; seguí hacia la siguiente';
  }
}
const motor = defineMotor({
  id: 'olancho.postura',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Avanzá con W o palanca arriba. F alterna postura. Agachate antes de las copas bajas; erguido avanzás más pero el viento te frena.',
    keys: [
      ['W / flecha arriba / palanca izquierda', 'avanzar'],
      ['F / clic / B / RT', 'alternar postura'],
    ],
    touch: [
      ['Palanca arriba', 'avanzar'],
      ['🎯', 'alternar postura'],
    ],
  },
  etapa: (p) => ({
    viento: 0.3 + p.dif * 0.25,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Maqueta del bosque enano de Agalta',
  }),
  metas,
  duracion,
  crear: (): Estado => ({
    paso: 0,
    agachado: false,
    buenas: 0,
    golpes: 0,
    auto: false,
    aviso: 'F para agacharte antes de la rama',
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (input.take('fire')) s.agachado = !s.agachado;
    if (!s.auto) avanzar(m, dt, -input.mz);
    s.auto = false;
    m.objetivo = s.aviso;
    m.lineas = [
      `${s.agachado ? 'Agachado' : 'Erguido'} · Recorrido ${s.paso.toFixed(1)}/6 · Marcas ${s.buenas}`,
      'Copas bajas entre 1.4 y 3.1 de cada tramo · F cambia postura',
    ];
    m.stats = { buenas: s.buenas, golpes: s.golpes, paso: s.paso };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      if (rama(m.datos)) m.datos.agachado = true;
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.agachado = s.paso % 4 > 1.2 && s.paso % 4 < 3.3;
    avanzar(m, dt, 1);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Taller nombre={m.parametros.nombre} aviso="W avanzá · F agachate · Maqueta, no talés">
        <Block pos={[0, 0.05, 0]} size={[3, 0.1, 12]} color="#c6b391" mat="dirt" />
        {[0, 4].map((i) => (
          <group key={i}>
            <Block pos={[-1.6, 0.8, 5 - (i + 2.25) * 1.65]} size={[0.3, 1.6, 0.3]} color="#775136" mat="wood" />
            <P.Tree pos={[-1.6, 0, 5 - (i + 2.25) * 1.65]} scale={0.65} solid={false} />
          </group>
        ))}
        <group position={[0, 0, 5 - s.paso * 1.65]}>
          <Campesino agachado={s.agachado} />
        </group>
        <Label pos={[3, 1, 1]} text={`Viento ${Math.round(m.parametros.viento * 100)}%`} h={0.35} />
      </Taller>
    );
  },
});
export const Postura = motor.Escena;
export const guia = motor.guia;
