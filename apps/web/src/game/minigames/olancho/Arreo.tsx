import { Ball, Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { clamp, controles, duracion, metas, mover, Taller } from './Taller';

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
};
type Sesion = Motor<{ velocidad: number; nombre: string }, Estado>;
function caminar(m: Sesion, x: number, y: number, dt: number) {
  const s = m.datos;
  s.x = clamp(x);
  s.y = clamp(y);
  if (s.y < -0.25 || Math.hypot(s.x, s.y) < 0.4) {
    s.avance = Math.max(0, s.avance - dt * 0.6);
    s.dispersion += dt;
    s.aviso = 'De frente o muy cerca se dispersan: alejate';
  } else if (s.y > 0.45 && Math.abs(s.x - s.hato) < 0.5) {
    if (Math.abs(s.hato) < 0.25) s.avance += dt * m.parametros.velocidad;
    else s.aviso = 'Movete al costado para alinear el hato con la entrada';
    s.hato = clamp(s.hato + (s.x - s.hato) * dt);
    s.aviso = 'Detrás de la línea: el hato marcha al corral';
  } else {
    s.hato = clamp(s.hato - s.x * dt * 0.4);
    s.aviso = 'Cruzá por el costado y ponete detrás';
  }
  if (s.avance >= 1) {
    m.sumar(40);
    s.buenas++;
    s.avance = 0;
    s.hato = s.buenas % 2 ? 0.6 : -0.6;
  }
}
const motor = defineMotor({
  id: 'olancho.arreo',
  guia: {
    goal: 'Rodeá el hato. El costado cambia rumbo; detrás de su línea avanza al corral. No lo toqués ni te pongás de frente.',
    ...controles,
  },
  etapa: (p) => ({
    velocidad: 0.23 - p.dif * 0.06,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Arreo de Lepaguare',
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
    m.stats = { buenas: s.buenas, dispersion: s.dispersion, avance: s.avance };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      if (m.datos.y > 0.45) caminar(m, m.datos.x, m.datos.y, dt * 0.15);
      return;
    }
    const s = m.datos;
    s.auto = true;
    caminar(m, Math.abs(s.hato) > 0.1 ? Math.sign(s.hato) * 0.9 : s.hato, Math.abs(s.hato) > 0.1 ? 0.4 : 0.8, dt);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Taller nombre={m.parametros.nombre} aviso="Corral abierto al fondo · Sin golpes" verde>
        <Block pos={[-2, 0.6, -4]} size={[0.15, 1.2, 3]} color="#a17c50" mat="wood" />
        <Block pos={[2, 0.6, -4]} size={[0.15, 1.2, 3]} color="#a17c50" mat="wood" />
        {[-1, 0, 1].map((i) => (
          <group key={i} position={[s.hato * 2 + i * 0.7, 0.6, 1 - s.avance * 4]}>
            <Block pos={[0, 0, 0]} size={[0.6, 0.7, 1]} color={i ? '#f4e2c4' : '#674a36'} mat="cloth" />
            {[-0.2, 0.2].flatMap((x) =>
              [-0.3, 0.3].map((z) => (
                <Block key={`${x}-${z}`} pos={[x, -0.45, z]} size={[0.13, 0.4, 0.13]} color="#674a36" mat="cloth" />
              )),
            )}
            <Ball pos={[0, 0.25, -0.6]} r={0.25} color="#674a36" />
          </group>
        ))}
        <Cyl pos={[s.x * 3, 0.8, s.y * 3]} r={0.3} h={1.6} color="#28788b" mat="cloth" />
        <Label pos={[0, 0.2, 0]} text="LÍNEA DE EQUILIBRIO" h={0.3} />
      </Taller>
    );
  },
});
export const Arreo = motor.Escena;
export const guia = motor.guia;
