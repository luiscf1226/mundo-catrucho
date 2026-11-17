import { input } from '../../../core/input';
import { Ball, Block, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { columna, controles, cursor, duracion, Mesa, metas, mover, Puntero, wx, wz, xCol } from './comun';

const PANELES = ['Punta izquierda', 'Copo', 'Punta derecha'];
interface Panel {
  /** talla del juvenil que tiene que salir */
  juvenil: number;
  /** talla del adulto que se queda */
  adulto: number;
  abre: number;
}
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  paneles: Panel[];
  demo: number;
  disenos: number;
  malas: number;
  espera: number;
  aviso: string;
};
interface Params {
  banda: number;
  semilla: number;
}
type Sesion = Motor<Params, Estado>;
const cm = (v: number) => (2 + v * 8).toFixed(1);
const abreDe = (y: number) => Math.max(0.05, Math.min(1, (y + 1) / 2));
const sirve = (p: Panel) => p.abre >= p.juvenil && p.abre < p.adulto;

function nuevaRed(s: Estado, q: Params) {
  s.paneles = PANELES.map(() => {
    const juvenil = 0.18 + s.azar() * 0.45;
    return { juvenil, adulto: juvenil + q.banda, abre: 0.05 };
  });
  // si el centro del cursor sirve en el copo, se corre: apretar sin mirar no arma la red
  const copo = s.paneles[1];
  if (0.5 >= copo.juvenil && 0.5 < copo.adulto) {
    copo.juvenil = Math.min(0.85, 0.52 + s.azar() * 0.2);
    copo.adulto = copo.juvenil + q.banda;
  }
}
function plegar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.demo > 0) return;
  s.espera = 0.6;
  const i = columna(s.x, 3),
    p = s.paneles[i];
  p.abre = abreDe(s.y);
  if (p.abre < p.juvenil) {
    s.malas++;
    m.sumar(-10);
    s.aviso = `${PANELES[i]}: ${cm(p.abre)} cm atrapa juveniles de ${cm(p.juvenil)} cm`;
  } else if (p.abre >= p.adulto) {
    s.malas++;
    m.sumar(-10);
    s.aviso = `${PANELES[i]}: tan abierta se van los adultos de ${cm(p.adulto)} cm`;
  } else s.aviso = `${PANELES[i]} lista`;
  if (s.paneles.every(sirve)) {
    s.disenos++;
    m.sumar(60);
    s.demo = 1;
    s.aviso = '¡Los juveniles salen y los grandes se quedan!';
  }
}
const motor = defineMotor({
  id: 'colon.redjuvenil',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'lago',
  guia: {
    goal: 'A/D elegí la parte de la red, W/S cuánto abrís la malla y F. Que salga el juvenil y se quede el adulto en las tres.',
    ...controles,
  },
  etapa: (p) => ({ banda: 0.22 - p.dif * 0.08, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      paneles: [],
      demo: 0,
      disenos: 0,
      malas: 0,
      espera: 0,
      aviso: '',
    };
    nuevaRed(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.demo > 0) {
      s.demo -= dt;
      if (s.demo <= 0) nuevaRed(s, m.parametros);
    }
    if (input.take('fire')) plegar(m);
    const i = columna(s.x, 3);
    m.objetivo = `${PANELES[i]} · malla de ${cm(abreDe(s.y))} cm`;
    m.lineas = [
      s.paneles
        .map((p, k) => `${PANELES[k]}: sale ${cm(p.juvenil)}, queda ${cm(p.adulto)} ${sirve(p) ? '✅' : '❌'}`)
        .join(' · '),
      `Diseños válidos ${s.disenos} · Malos ${s.malas}${s.aviso ? ` · ${s.aviso}` : ''}`,
    ];
    m.stats = { x: s.x, y: s.y, disenos: s.disenos, malas: s.malas };
  },
  bot(m) {
    const s = m.datos,
      i = s.paneles.findIndex((p) => !sirve(p));
    if (i < 0 || s.demo > 0) return;
    s.auto = true;
    const p = s.paneles[i];
    s.x = xCol(i, 3);
    s.y = ((p.juvenil + p.adulto) / 2) * 2 - 1;
    plegar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'La red deja crecer'} · Malla con escape`}>
        <Block pos={[wx(0), 0.74, wz(0)]} size={[9.4, 0.04, 6.6]} color="#4f9fbf" mat="water" solid={false} />
        {s.paneles.map((p, i) => {
          const x = wx(xCol(i, 3)),
            lado = 0.25 + p.abre * 0.5,
            sale = s.demo > 0 && sirve(p);
          return (
            <group key={PANELES[i]}>
              <Block pos={[x, 1.6, wz(0.1)]} size={[2.6, 1.8, 0.06]} color="#e9e1c8" mat="cloth" solid={false} />
              {[-0.75, 0, 0.75].flatMap((dx) =>
                [-0.5, 0.25].map((dy) => (
                  <Block
                    key={`${dx}${dy}`}
                    pos={[x + dx, 1.75 + dy, wz(0.1) + 0.05]}
                    size={[lado, lado, 0.04]}
                    color="#2b4a5c"
                    solid={false}
                  />
                )),
              )}
              <group position={[x - 0.5, 1.2, wz(sale ? 0.6 : -0.4)]} scale={[1.6, 0.6, 0.6]}>
                <Ball pos={[0, 0, 0]} r={0.18 + p.juvenil * 0.3} color="#ffb347" />
              </group>
              <group position={[x + 0.6, 1.2, wz(-0.45)]} scale={[1.6, 0.6, 0.6]}>
                <Ball pos={[0, 0, 0]} r={0.18 + p.adulto * 0.3} color="#7f97a6" />
              </group>
              <Label pos={[x, 3, wz(0.1)]} text={`${PANELES[i]} ${sirve(p) ? '✅' : ''}`} h={0.34} />
              <Label pos={[x, 0.95, wz(-0.85)]} text={`🐟 sale ${cm(p.juvenil)} · 🐠 queda ${cm(p.adulto)}`} h={0.3} />
            </group>
          );
        })}
        {s.demo > 0 && <Plate pos={[wx(0), 3.6, wz(0.1)]} text="🐟 ¡Salen los juveniles!" h={0.3} bg="#2e7d32" />}
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const RedJuvenil = motor.Escena;
export const guia = motor.guia;
