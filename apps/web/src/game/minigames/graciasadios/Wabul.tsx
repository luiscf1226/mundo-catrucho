// Textura del wabul: el plátano cocido se machaca en el guacal con pasadas del mazo. Cada pasada recorre una fila
// (↔) o una columna (↕). Cruzar la pasada anterior deshace grumos; repetir la misma dirección sobre un grumo lo
// aplasta en placa, y la placa pide otra pasada cruzada antes de deshacerse.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, xDe } from './comun';

const N = 5;
type Dir = 'h' | 'v';
type Celda = { g: number; placa: number; ultima: Dir | null };
type Estado = ReturnType<typeof cursor> & {
  celdas: Celda[];
  dir: Dir;
  espera: number;
  tandas: number;
  deshechos: number;
  placas: number;
  pasadas: number;
  golpe: number;
  azar: () => number;
};
type Param = { grumo: number; seed: number };
type Sesion = Motor<Param, Estado>;

const linea = (s: Estado) => (s.dir === 'h' ? casilla(-s.y, N) : casilla(s.x, N));
const enLinea = (dir: Dir, k: number) => Array.from({ length: N }, (_, i) => (dir === 'h' ? k * N + i : i * N + k));
const total = (s: Estado) => s.celdas.reduce((a, c) => a + c.g + c.placa, 0);

function tanda(s: Estado, p: Param) {
  do {
    s.celdas = Array.from({ length: N * N }, () => ({
      g: Math.min(3, Math.floor(s.azar() * p.grumo)),
      placa: 0,
      ultima: null,
    }));
  } while (total(s) < 20);
}
/** Lo que deja una pasada en cada casilla de la línea (puntos de la casilla). */
function efecto(c: Celda, dir: Dir) {
  if (c.ultima === dir) return c.g > 0 || c.placa > 0 ? -8 : 0;
  return c.placa > 0 ? 4 : c.g > 0 ? 8 : 0;
}
function pasada(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.45;
  s.pasadas++;
  s.golpe = 0.3;
  let aplastadas = 0;
  for (const i of enLinea(s.dir, linea(s))) {
    const c = s.celdas[i],
      puntos = efecto(c, s.dir);
    if (puntos < 0) {
      c.placa = Math.min(2, c.placa + 1);
      aplastadas++;
    } else if (c.placa > 0) c.placa--;
    else if (c.g > 0) {
      c.g--;
      s.deshechos++;
    }
    c.ultima = s.dir;
    m.sumar(puntos);
  }
  if (aplastadas) {
    s.placas += aplastadas;
    useGame.getState().toast('Misma dirección otra vez: se hizo placa. Cruzá la pasada.', '🥣');
  }
  if (total(s) === 0) {
    s.tandas++;
    m.sumar(40);
    useGame.getState().toast('¡Wabul sin grumos! Otra tanda de plátano.', '🍌');
    tanda(s, m.parametros);
  }
}
function voltear(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0.3) return;
  s.dir = s.dir === 'h' ? 'v' : 'h';
  s.espera = Math.max(s.espera, 0.15);
}

const motor = defineMotor({
  id: 'graciasadios.wabul',
  modos: { duo: { tipo: 'compartido', cada: 2 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'costa',
  guia: {
    goal: 'F pasa el mazo por la fila (↔) o la columna (↕) del cursor; E voltea el mazo. Cruzar la pasada anterior deshace grumos. Repetir la misma dirección sobre un grumo lo aplasta en placa, y la placa solo se deshace cruzando.',
    ...controles('pasar el mazo', 'voltear el mazo ↔ ↕', 'elegir fila o columna'),
  },
  etapa: (p) => ({ grumo: 2.4 + p.dif * 1.6, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      celdas: [],
      dir: 'h',
      espera: 0,
      tandas: 0,
      deshechos: 0,
      placas: 0,
      pasadas: 0,
      golpe: 0,
      azar: rng(p.seed),
    };
    tanda(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.golpe = Math.max(0, s.golpe - dt);
    if (input.take('fire')) pasada(m);
    if (input.take('use')) voltear(m);
    const placas = s.celdas.filter((c) => c.placa > 0).length;
    m.objetivo = `Mazo ${s.dir === 'h' ? '↔ por fila' : '↕ por columna'} · quedan ${total(s)} grumos`;
    m.lineas = [
      `${placas ? `Placas ${placas}: cruzalas` : 'Sin placas'} · Tandas listas ${s.tandas}`,
      `Grumos deshechos ${s.deshechos} · Aplastados ${s.placas} · Pasadas ${s.pasadas}`,
    ];
    m.stats = { x: s.x, y: s.y, deshechos: s.deshechos, placas: s.placas, pasadas: s.pasadas, tandas: s.tandas };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0) return;
    s.auto = true;
    let mejor = { dir: s.dir, k: 0, valor: -1e9 };
    for (const dir of ['h', 'v'] as Dir[])
      for (let k = 0; k < N; k++) {
        const valor = enLinea(dir, k).reduce((a, i) => a + efecto(s.celdas[i], dir), 0) - (dir === s.dir ? 0 : 0.5);
        if (valor > mejor.valor) mejor = { dir, k, valor };
      }
    if (mejor.dir !== s.dir) return voltear(m);
    if (s.dir === 'h') s.y = -xDe(mejor.k, N);
    else s.x = xDe(mejor.k, N);
    pasada(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = linea(s),
      P = (i: number) => -2.1 + i * 1.05;
    const mazo: [number, number, number] = s.dir === 'h' ? [-1, 1.5 - s.golpe, P(k)] : [-1 + P(k), 1.5 - s.golpe, 0];
    return (
      <Mesa titulo="Wabul de Puerto Lempira · el guacal">
        <Cyl pos={[-1, 0.95, 0]} r={3.3} h={0.45} color="#8d5524" mat="wood" solid={false} />
        <Cyl pos={[-1, 1.18, 0]} r={3.05} h={0.04} color="#f3e5ab" solid={false} />
        <Block
          pos={s.dir === 'h' ? [-1, 1.21, P(k)] : [-1 + P(k), 1.21, 0]}
          size={s.dir === 'h' ? [5.4, 0.02, 0.9] : [0.9, 0.02, 5.4]}
          color="#ffd166"
          solid={false}
        />
        {s.celdas.map((c, i) => {
          const x = -1 + P(i % N),
            z = P(Math.floor(i / N));
          return c.placa > 0 ? (
            <Block
              key={i}
              pos={[x, 1.26, z]}
              size={[0.85, 0.06 * c.placa + 0.04, 0.85]}
              color={c.placa > 1 ? '#a47148' : '#c9a227'}
              solid={false}
            />
          ) : c.g > 0 ? (
            <Ball key={i} pos={[x, 1.26, z]} r={0.12 + c.g * 0.1} color="#e9c46a" />
          ) : null;
        })}
        <Block
          pos={mazo}
          size={s.dir === 'h' ? [5.6, 0.22, 0.28] : [0.28, 0.22, 5.6]}
          color="#bc8a5f"
          mat="wood"
          solid={false}
        />
        <Label pos={[3.3, 1.9, -2.6]} text={s.dir === 'h' ? 'Mazo ↔' : 'Mazo ↕'} h={0.4} />
      </Mesa>
    );
  },
});
export const Wabul = motor.Escena;
export const guia = motor.guia;
