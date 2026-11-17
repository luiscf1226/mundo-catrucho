import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { columna, controles, cursor, duracion, Mesa, metas, mover, Puntero, Raya, wx, wz, xCol } from './comun';

/** Tres perfiles de la costa conocidos, en la orilla de arriba de la carta. */
const PERFILES = ['Fortaleza', 'Cerro Calentura', 'Punta Caxinas'];
const Y_COSTA = 0.86;
type P2 = [number, number];
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  barco: P2;
  /** perfil cuya visual está corrida (−1: todas buenas) */
  corrida: number;
  /** punto falso por donde pasa la visual corrida */
  desvio: P2;
  /** paso 0: descartar la corrida (solo en la carta que se fue de paseo); paso 1: marcar la posición */
  paso: 0 | 1;
  fijadas: number;
  errores: number;
  espera: number;
  aviso: string;
};
interface Params {
  margen: number;
  corridas: number;
  loco: boolean;
  semilla: number;
}
type Sesion = Motor<Params, Estado>;
const origen = (i: number): P2 => [xCol(i, 3), Y_COSTA];

function nuevaCarta(s: Estado, q: Params) {
  // el barco nunca queda en el centro de la carta: ahí no se gana apretando sin mirar
  do s.barco = [-0.8 + s.azar() * 1.6, -0.75 + s.azar() * 1.05];
  while (Math.hypot(s.barco[0], s.barco[1]) < 0.3);
  s.corrida = q.loco || s.azar() < q.corridas ? Math.floor(s.azar() * 3) : -1;
  const lado = s.azar() < 0.5 ? -1 : 1;
  s.desvio = [s.barco[0] + lado * (0.3 + s.azar() * 0.2), s.barco[1] + (s.azar() - 0.5) * 0.2];
  s.paso = q.loco ? 0 : 1;
}
/** Hacia dónde apunta la visual del perfil `i`. */
const blanco = (s: Estado, i: number) => (i === s.corrida ? s.desvio : s.barco);

function confirmar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 1.2;
  if (s.paso === 0) {
    const i = columna(s.x, 3);
    if (s.y > 0.6 && i === s.corrida) {
      s.paso = 1;
      m.sumar(20);
      s.aviso = `Descartaste la visual de ${PERFILES[i]}: no pasa por el cruce de las otras`;
    } else {
      s.errores++;
      m.sumar(-25);
      s.aviso = 'Esa visual sí cuadra. Buscá la que deja el triángulo de error';
    }
    return;
  }
  if (Math.hypot(s.x - s.barco[0], s.y - s.barco[1]) <= m.parametros.margen) {
    s.fijadas++;
    m.sumar(m.parametros.loco ? 40 : 50);
    s.aviso = '¡Posición fijada en el único cruce!';
    nuevaCarta(s, m.parametros);
  } else {
    s.errores++;
    m.sumar(-30);
    s.aviso =
      s.corrida >= 0 ? 'Ahí solo se cruzan dos visuales: es el triángulo de error' : 'No es el cruce de las tres';
  }
}
const motor = defineMotor({
  id: 'colon.visualbahia',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'costa',
  guia: {
    goal: 'Mové el cursor al único punto donde se cruzan las tres visuales (con la de control del faro) y F. Si una visual quedó corrida, no le hagás caso.',
    ...controles,
  },
  etapa: (p) => ({
    margen: 0.13 - p.dif * 0.04,
    corridas: 0.2 + p.dif * 0.4,
    loco: p.tema.variante === 'el-mapa-se-fue-de-paseo',
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      barco: [0.5, -0.4],
      corrida: -1,
      desvio: [0, 0],
      paso: 1,
      fijadas: 0,
      errores: 0,
      espera: 0,
      aviso: '',
    };
    nuevaCarta(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) confirmar(m);
    m.objetivo =
      s.paso === 0 ? 'Arriba: elegí el perfil cuya visual está corrida' : 'Marcá el único cruce de tres visuales';
    m.lineas = [
      s.corrida >= 0 && s.paso === 1
        ? 'Hay un triángulo de error: el faro te dice qué cruce es el bueno'
        : 'Cada visual sale de un perfil de la costa',
      `Posiciones fijadas ${s.fijadas} · Errores ${s.errores}${s.aviso ? ` · ${s.aviso}` : ''}`,
    ];
    m.stats = { x: s.x, y: s.y, fijadas: s.fijadas, errores: s.errores, paso: s.paso };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    if (s.paso === 0) {
      s.x = xCol(s.corrida, 3);
      s.y = 0.8;
    } else {
      s.x = s.barco[0];
      s.y = s.barco[1];
    }
    confirmar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      pt = (p: P2): P2 => [wx(p[0]), wz(p[1])];
    // visual extendida más allá del objetivo hasta el borde de la carta
    const largo = (a: P2, b: P2): P2 => {
      const dx = b[0] - a[0],
        dy = b[1] - a[1];
      let k = 3;
      if (dx > 1e-6) k = Math.min(k, (0.98 - a[0]) / dx);
      if (dx < -1e-6) k = Math.min(k, (-0.98 - a[0]) / dx);
      if (dy > 1e-6) k = Math.min(k, (0.9 - a[1]) / dy);
      if (dy < -1e-6) k = Math.min(k, (-0.95 - a[1]) / dy);
      return [a[0] + dx * k, a[1] + dy * k];
    };
    const faro: P2 = [-0.95, -0.9];
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Trazas de la bahía'} · Tres visuales, un solo cruce`}>
        <Block pos={[wx(0), 0.72, wz(-0.1)]} size={[9.6, 0.04, 5.6]} color="#cfe3ea" mat="cloth" solid={false} />
        <Block pos={[wx(0), 0.75, wz(Y_COSTA)]} size={[9.6, 0.06, 0.7]} color="#7fae6a" mat="grass" solid={false} />
        {PERFILES.map((n, i) => {
          const o = origen(i);
          const malo = i === s.corrida && s.paso === 1 && m.parametros.loco;
          return (
            <group key={n}>
              <Cyl pos={[wx(o[0]), 1.05, wz(o[1])]} r={0.25} h={0.6} color="#8a7f6c" mat="stone" solid={false} />
              <Label pos={[wx(o[0]), 1.8, wz(o[1])]} text={n} h={0.36} />
              {!malo && <Raya a={pt(o)} b={pt(largo(o, blanco(s, i)))} color="#2a5c8a" />}
            </group>
          );
        })}
        {s.corrida >= 0 && (
          <>
            <Cyl pos={[wx(faro[0]), 1.1, wz(faro[1])]} r={0.18} h={0.8} color="#f4efe2" solid={false} />
            <Raya a={pt(faro)} b={pt(largo(faro, s.barco))} color="#e9c46a" ancho={0.05} />
            <Label pos={[wx(faro[0]), 1.9, wz(faro[1])]} text="Faro de control" h={0.32} />
          </>
        )}
        {m.parametros.loco && (
          <group position={[wx(0.92), 0.7, wz(-0.75)]}>
            <Block pos={[0, 0.5, 0]} size={[0.7, 0.9, 0.05]} color="#e9e1c8" mat="cloth" solid={false} rot={0.4} />
            <Cyl pos={[0.5, 0.6, 0]} r={0.14} h={0.8} color="#c9a05a" mat="gold" solid={false} />
            <Ball pos={[0, 1.15, 0]} r={0.08} color="#2b2b2b" />
            <Plate pos={[0, 1.7, 0]} text="🗺️ La carta se fue de paseo" h={0.2} />
          </group>
        )}
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const VisualBahia = motor.Escena;
export const guia = motor.guia;
