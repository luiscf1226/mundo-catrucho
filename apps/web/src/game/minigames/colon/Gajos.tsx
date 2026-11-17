import { input } from '../../../core/input';
import { Ball, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Puntero, Raya, wx, wz } from './comun';

const CENTRO: [number, number] = [-0.1, -0.05];
const RADIOS = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8];
const GAJOS = 8;
type P2 = [number, number];
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  /** curvatura de las membranas de esta naranja (todas giran igual) */
  curva: number;
  giro: number;
  gajo: number;
  nodo: number;
  /** guías visibles del gajo actual */
  guias: boolean[];
  gajos: number;
  tajos: number;
  naranjas: number;
  jugo: number;
  espera: number;
  aviso: string;
};
interface Params {
  margen: number;
  laberinto: boolean;
  semilla: number;
}
type Sesion = Motor<Params, Estado>;
/** Punto `j` de la membrana `k`: gira con el radio, como espiral. */
function nodo(s: Estado, k: number, j: number): P2 {
  const r = RADIOS[j],
    a = s.giro + (k / GAJOS) * Math.PI * 2 + s.curva * r;
  return [CENTRO[0] + Math.cos(a) * r, CENTRO[1] + Math.sin(a) * r];
}
function nuevoGajo(s: Estado, q: Params) {
  s.nodo = 0;
  // en la naranja con laberinto las salpicaduras tapan uno de cada dos puntos; quedan las uniones de las puntas
  s.guias = RADIOS.map((_, j) => !q.laberinto || j % 2 === 0 || j === RADIOS.length - 1);
}
function nuevaNaranja(s: Estado, q: Params) {
  s.curva = (s.azar() < 0.5 ? -1 : 1) * (1.2 + s.azar() * 1.4);
  s.giro = s.azar() * Math.PI * 2;
  s.gajo = 0;
  nuevoGajo(s, q);
}
function cortar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.55;
  const [nx, ny] = nodo(s, s.gajo, s.nodo);
  if (Math.hypot(s.x - nx, s.y - ny) <= m.parametros.margen) {
    s.nodo++;
    m.sumar(10);
    if (s.nodo >= RADIOS.length) {
      s.gajos++;
      m.sumar(40);
      s.aviso = '¡Gajo entero, sin romper la pulpa!';
      s.gajo++;
      if (s.gajo >= GAJOS) {
        s.naranjas++;
        nuevaNaranja(s, m.parametros);
      } else nuevoGajo(s, m.parametros);
    } else s.aviso = 'Seguí la membrana';
    return;
  }
  // tajo recto: suelta jugo y borra una de las guías que faltan
  s.tajos++;
  s.jugo = 1.5;
  m.sumar(-25);
  const quedan = s.guias.map((v, j) => (v && j > s.nodo ? j : -1)).filter((j) => j >= 0);
  if (quedan.length) s.guias[quedan[Math.floor(s.azar() * quedan.length)]] = false;
  s.aviso = 'Tajo recto: salió jugo y se borró una guía';
}
const motor = defineMotor({
  id: 'colon.gajos',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'Llevá el cursor punto por punto sobre la membrana curva y F. Un tajo fuera de la curva bota jugo y borra una guía.',
    ...controles,
  },
  etapa: (p) => ({
    margen: 0.1 - p.dif * 0.03,
    laberinto: p.tema.variante === 'la-naranja-trae-laberinto',
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      curva: 1.5,
      giro: 0,
      gajo: 0,
      nodo: 0,
      guias: [],
      gajos: 0,
      tajos: 0,
      naranjas: 0,
      jugo: 0,
      espera: 0,
      aviso: '',
    };
    nuevaNaranja(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.jugo = Math.max(0, s.jugo - dt);
    if (input.take('fire')) cortar(m);
    m.objetivo = `Gajo ${s.gajo + 1} de ${GAJOS} · punto ${s.nodo + 1} de ${RADIOS.length}`;
    m.lineas = [
      m.parametros.laberinto
        ? 'Las salpicaduras tapan puntos: todas las membranas curvan igual que la anterior'
        : 'Todas las membranas curvan igual: fijate en la que ya abriste',
      `Gajos ${s.gajos} · Tajos ${s.tajos}${s.aviso ? ` · ${s.aviso}` : ''}`,
    ];
    m.stats = { x: s.x, y: s.y, gajos: s.gajos, tajos: s.tajos, nodo: s.nodo };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    [s.x, s.y] = nodo(s, s.gajo, s.nodo);
    cortar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      w = (p: P2): P2 => [wx(p[0]), wz(p[1])];
    const hechas = Array.from({ length: s.gajo }, (_, k) => k);
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Naranja por gajos'} · Seguí la membrana`}>
        <group position={[wx(CENTRO[0]), 0.78, wz(CENTRO[1])]} scale={[4.4, 1, 3.4]}>
          <Cyl pos={[0, 0, 0]} r={0.86} h={0.1} color="#f39c12" mat="plastic" solid={false} />
          <Cyl pos={[0, 0.06, 0]} r={0.8} h={0.04} color="#ffc35c" mat="plastic" solid={false} />
        </group>
        {hechas.flatMap((k) =>
          RADIOS.slice(1).map((_, j) => (
            <Raya key={`${k}-${j}`} a={w(nodo(s, k, j))} b={w(nodo(s, k, j + 1))} color="#fff3d6" y={0.86} />
          )),
        )}
        {RADIOS.slice(1, s.nodo).map((_, j) => (
          <Raya key={`h${j}`} a={w(nodo(s, s.gajo, j))} b={w(nodo(s, s.gajo, j + 1))} color="#fff3d6" y={0.86} />
        ))}
        {RADIOS.map((_, j) => {
          if (j < s.nodo || !s.guias[j]) return null;
          const p = w(nodo(s, s.gajo, j));
          return (
            <Ball
              key={j}
              pos={[p[0], 0.9, p[1]]}
              r={j === s.nodo ? 0.22 : 0.14}
              color={j === s.nodo ? '#2e7d32' : '#7cb342'}
              mat="neon"
            />
          );
        })}
        {m.parametros.laberinto &&
          [0.3, 1.9, 3.5, 5.1].map((a) => (
            <Ball
              key={a}
              pos={[wx(CENTRO[0] + Math.cos(a) * 0.45), 0.86, wz(CENTRO[1] + Math.sin(a) * 0.45)]}
              r={0.32}
              color="#ffb347"
            />
          ))}
        {s.jugo > 0 && <Plate pos={[wx(s.x), 2.4, wz(s.y)]} text="💦 ¡Jugo!" h={0.36} bg="#e67e22" />}
        <Label pos={[wx(0.85), 1.6, wz(0.7)]} text={`🍊 Naranjas ${s.naranjas}`} h={0.34} />
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Gajos = motor.Escena;
export const guia = motor.guia;
