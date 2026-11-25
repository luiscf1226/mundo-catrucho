import { Block, Label, P } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { Campesino, Vaca } from '../kit/Figuras';
import { clamp, duracion, metas, mover, Taller } from './Taller';

type Estado = {
  x: number;
  y: number;
  px: number;
  py: number;
  hato: number;
  avance: number;
  buenas: number;
  dispersion: number;
  auto: boolean;
  aviso: string;
  /** «La vaca dirige el desfile»: grupo que toca separar y parejas de cría que se dividieron */
  grupo: number;
  divididas: number;
  cerca: number;
};
type Sesion = Motor<{ velocidad: number; nombre: string; desfile: boolean }, Estado>;
const GRUPOS = ['claras', 'pintas'];
/** entrada a la que hay que alinear el hato: al centro, o en el desfile el corral de su grupo */
const entrada = (m: Sesion) => (m.parametros.desfile ? (m.datos.grupo ? 0.6 : -0.6) : 0);
function caminar(m: Sesion, x: number, y: number, dt: number) {
  const s = m.datos;
  s.x = clamp(x);
  s.y = clamp(y);
  if (s.y < -0.25 || Math.hypot(s.x - (m.parametros.desfile ? s.hato : 0), s.y) < 0.4) {
    s.avance = Math.max(0, s.avance - dt * 0.6);
    s.dispersion += dt;
    s.cerca += dt;
    s.aviso = m.parametros.desfile
      ? 'Muy cerca: la vaca se separa de su ternero'
      : 'De frente o muy cerca se dispersan: alejate';
    // en el desfile, cada segundo encima divide una pareja de cría
    if (m.parametros.desfile && s.cerca >= 1) {
      s.cerca = 0;
      s.divididas++;
      m.sumar(-10);
    }
  } else if (s.y > 0.45 && Math.abs(s.x - s.hato) < 0.5) {
    s.cerca = 0;
    if (Math.abs(s.hato - entrada(m)) < 0.25) {
      s.avance += dt * m.parametros.velocidad;
      s.aviso = 'Detrás de la línea: el hato marcha al corral';
    } else s.aviso = 'Movete al costado para alinear el hato con la entrada';
    s.hato = clamp(s.hato + (s.x - s.hato) * dt);
  } else {
    s.cerca = 0;
    s.hato = clamp(s.hato - (s.x - (m.parametros.desfile ? s.hato : 0)) * dt * 0.4);
    s.aviso = m.parametros.desfile
      ? `Separá las ${GRUPOS[s.grupo]} hacia su corral: cruzá por el costado`
      : 'Cruzá por el costado y ponete detrás';
  }
  if (s.avance >= 1) {
    // en el desfile cada grupo separado vale más: hay que alinear el hato con su corral
    m.sumar(m.parametros.desfile ? 50 : 40);
    s.buenas++;
    s.avance = 0;
    if (m.parametros.desfile) {
      s.grupo = 1 - s.grupo;
      s.hato = 0;
    } else s.hato = s.buenas % 2 ? 0.6 : -0.6;
  }
}
const motor = defineMotor({
  id: 'olancho.arreo',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Rodeá el hato. El costado cambia rumbo; detrás de su línea avanza al corral. No lo toqués ni te pongás de frente.',
    // se arrea caminando: no hay botón de acción
    keys: [
      ['WASD / flechas', 'caminar alrededor del hato'],
      ['Mouse / stick derecho', 'ubicarte'],
    ],
    touch: [['Palanca / arrastrá', 'caminar alrededor del hato']],
  },
  etapa: (p) => ({
    velocidad: 0.23 - p.dif * 0.02,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Arreo de Lepaguare',
    desfile: p.tema.variante === 'la-vaca-dirige-el-desfile',
  }),
  metas,
  duracion,
  crear: (): Estado => ({
    x: -1,
    y: 0,
    px: 0,
    py: 0,
    hato: 0,
    avance: 0,
    buenas: 0,
    dispersion: 0,
    auto: false,
    aviso: 'Rodeá el hato por un costado',
    grupo: 0,
    divididas: 0,
    cerca: 0,
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.auto) {
      mover(s, dt);
      caminar(m, s.x, s.y, dt);
    }
    s.auto = false;
    m.objetivo = s.aviso;
    m.lineas = [
      `Corrales ${s.buenas} · Camino ${Math.round(s.avance * 100)}%`,
      'WASD / palanca / stick derecho · Costado para girar, atrás para avanzar',
    ];
    if (m.parametros.desfile)
      m.lineas.push(
        `Ahora: las ${GRUPOS[s.grupo]} al corral ${s.grupo ? 'derecho' : 'izquierdo'} · Parejas divididas ${s.divididas}`,
      );
    m.stats = { buenas: s.buenas, dispersion: s.dispersion, avance: s.avance, grupo: s.grupo, divididas: s.divididas };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      if (m.datos.y > 0.45) caminar(m, m.datos.x, m.datos.y, dt * 0.15);
      return;
    }
    const s = m.datos;
    s.auto = true;
    const falta = s.hato - entrada(m);
    if (m.parametros.desfile) {
      // se para del lado contrario a la entrada para empujar el hato hacia allá, sin acercarse
      if (Math.abs(falta) > 0.1) caminar(m, clamp(s.hato + Math.sign(falta) * 0.6), 0.5, dt);
      else caminar(m, s.hato, 0.8, dt);
      return;
    }
    caminar(m, Math.abs(s.hato) > 0.1 ? Math.sign(s.hato) * 0.9 : s.hato, Math.abs(s.hato) > 0.1 ? 0.4 : 0.8, dt);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Taller nombre={m.parametros.nombre} aviso="Corral abierto al fondo · Sin golpes">
        {m.parametros.desfile ? (
          <>
            {[-1, 1].map((lado) => (
              <group key={lado}>
                <Block pos={[lado * 1.2 - 0.6, 0.6, -4]} size={[0.15, 1.2, 3]} color="#a17c50" mat="wood" />
                <Block pos={[lado * 1.2 + 0.6, 0.6, -4]} size={[0.15, 1.2, 3]} color="#a17c50" mat="wood" />
                <Label pos={[lado * 1.2, 1.6, -4]} text={lado < 0 ? 'Claras' : 'Pintas'} h={0.3} />
              </group>
            ))}
            {/* dos parejas de cría (vaca y ternero) del grupo que toca */}
            {[-1, 1].map((i) => (
              <group key={i} position={[s.hato * 2 + i * 0.8, 0.6, 1 - s.avance * 4]}>
                <Vaca clara={s.grupo === 0} />
                <group position={[0.35, -0.15, 0.6]} scale={0.55}>
                  <Vaca clara={s.grupo === 0} />
                </group>
              </group>
            ))}
          </>
        ) : (
          <>
            <Block pos={[-2, 0.6, -4]} size={[0.15, 1.2, 3]} color="#a17c50" mat="wood" />
            <Block pos={[2, 0.6, -4]} size={[0.15, 1.2, 3]} color="#a17c50" mat="wood" />
            {[-1, 0, 1].map((i) => (
              <group key={i} position={[s.hato * 2 + i * 0.7, 0.6, 1 - s.avance * 4]}>
                <Vaca clara={i !== 0} />
              </group>
            ))}
          </>
        )}
        <group position={[s.x * 3, 0, s.y * 3]}>
          <Campesino />
        </group>
        <Block pos={[0, 0.03, 0]} size={[5, 0.03, 0.08]} color="#e8d7aa" mat="sand" solid={false} />
        <P.Fence pos={[0, 0, -5.5]} length={4} solid={false} />
      </Taller>
    );
  },
});
export const Arreo = motor.Escena;
export const guia = motor.guia;
