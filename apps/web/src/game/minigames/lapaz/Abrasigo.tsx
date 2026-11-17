import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, enMesa, Mesa, metas, mover, Puntero } from './comun';

const COLS = 6,
  FILAS = 4;
/** Contornos (columna, fila desde abajo) de figuras de pared: mano, venado, sol y espiral. */
const FIGURAS: [string, [number, number][]][] = [
  [
    'Mano',
    [
      [1, 0],
      [2, 0],
      [3, 0],
      [1, 1],
      [3, 1],
      [0, 2],
      [1, 3],
      [2, 3],
      [3, 3],
      [4, 2],
    ],
  ],
  [
    'Venado',
    [
      [0, 2],
      [1, 2],
      [2, 2],
      [3, 2],
      [4, 3],
      [5, 3],
      [1, 1],
      [3, 1],
      [1, 0],
      [3, 0],
    ],
  ],
  [
    'Sol',
    [
      [2, 1],
      [3, 1],
      [2, 2],
      [3, 2],
      [1, 0],
      [4, 0],
      [1, 3],
      [4, 3],
      [0, 2],
      [5, 1],
    ],
  ],
  [
    'Espiral',
    [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [3, 1],
      [3, 2],
      [2, 2],
      [1, 2],
      [1, 3],
      [5, 3],
    ],
  ],
];
const ESTACIONES = ['Estación izquierda', 'Estación del centro', 'Estación derecha'];
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  figura: number;
  /** celdas (col + fila·COLS) del contorno y si ya están calcadas */
  contorno: number[];
  calcadas: number[];
  estacion: number;
  espera: number;
  figuras: number;
  trazos: number;
  errores: number;
  tocadas: number;
};
type Sesion = Motor<{ vista: number; semilla: number }, Estado>;

const celda = (s: Estado) => casilla(s.y, FILAS) * COLS + casilla(s.x, COLS);
/** Desde cada estación fija solo se distinguen unas columnas de la pared. */
function visible(est: number, celdaId: number, vista: number) {
  const c = celdaId % COLS,
    centroEst = est * 2.5;
  return Math.abs(c - centroEst) <= vista;
}
function nuevaFigura(s: Estado) {
  s.figura = Math.floor(s.azar() * FIGURAS.length);
  s.contorno = FIGURAS[s.figura][1].map(([c, f]) => f * COLS + c);
  s.calcadas = [];
}
function calcar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.7;
  const i = celda(s);
  if (s.calcadas.includes(i)) {
    m.sumar(-10);
    return;
  }
  if (!visible(s.estacion, i, m.parametros.vista)) {
    // calcar lo que no se ve desde tu estación es tocar o alumbrar la pared: se cancela el registro
    s.tocadas++;
    m.sumar(-40);
    useGame.getState().toast('Eso no se ve desde tu estación: no se toca la pared. Registro cancelado.', '🖐️');
    s.calcadas = [];
    return;
  }
  if (!s.contorno.includes(i)) {
    s.errores++;
    m.sumar(-15);
    return;
  }
  s.calcadas.push(i);
  s.trazos++;
  m.sumar(18);
  if (s.calcadas.length === s.contorno.length) {
    s.figuras++;
    m.sumar(60);
    useGame.getState().toast(`Contorno de ${FIGURAS[s.figura][0].toLowerCase()} reconstruido sin tocar la pared.`, '🖐️');
    nuevaFigura(s);
  }
}
function cambiarEstacion(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.7;
  s.estacion = (s.estacion + 1) % 3;
}
const motor = defineMotor({
  id: 'lapaz.abrasigo',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'cueva',
  guia: {
    goal: 'Calcá con F en la transparencia solo los trazos que se ven desde tu estación. E te cambia de estación. La pared no se toca.',
    ...controles('cambiar de estación'),
  },
  etapa: (p) => ({ vista: p.dif < 0.5 ? 1.5 : 1, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      figura: 0,
      contorno: [],
      calcadas: [],
      estacion: 1,
      espera: 0,
      figuras: 0,
      trazos: 0,
      errores: 0,
      tocadas: 0,
    };
    nuevaFigura(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('use')) cambiarEstacion(m);
    if (input.take('fire')) calcar(m);
    m.objetivo = `${ESTACIONES[s.estacion]} · Calcadas ${s.calcadas.length}/${s.contorno.length}`;
    m.lineas = [
      'El dibujo se mira desde lejos; la transparencia se calca',
      `Figuras ${s.figuras} · Trazos fuera ${s.errores} · Registros cancelados ${s.tocadas}`,
    ];
    m.stats = { x: s.x, y: s.y, figuras: s.figuras, trazos: s.trazos, errores: s.errores, tocadas: s.tocadas };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    const faltan = s.contorno.filter((i) => !s.calcadas.includes(i));
    const aqui = faltan.find((i) => visible(s.estacion, i, m.parametros.vista));
    if (aqui === undefined) return cambiarEstacion(m);
    s.x = centro(aqui % COLS, COLS);
    s.y = centro(Math.floor(aqui / COLS), FILAS);
    calcar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      sel = celda(s);
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Lectura rupestre sin contacto'} · ${ESTACIONES[s.estacion]}`}>
        <Block pos={[-1, 3.3, -3.8]} size={[9.6, 4.2, 0.3]} color="#9a7b5c" mat="stone" solid={false} />
        {s.contorno.map((i) => {
          const c = i % COLS,
            f = Math.floor(i / COLS);
          if (!visible(s.estacion, i, m.parametros.vista)) return null;
          return (
            <Block
              key={i}
              pos={[-1 + centro(c, COLS) * 4.4, 3.3 + centro(f, FILAS) * 1.8, -3.62]}
              size={[1, 0.7, 0.05]}
              color="#a33a24"
              solid={false}
            />
          );
        })}
        {/* sombra donde no llega la vista de la estación */}
        {[0, 1, 2, 3, 4, 5].map((c) =>
          visible(s.estacion, c, m.parametros.vista) ? null : (
            <Block
              key={c}
              pos={[-1 + centro(c, COLS) * 4.4, 3.3, -3.6]}
              size={[1.45, 4, 0.04]}
              color="#3b2f25"
              solid={false}
            />
          ),
        )}
        <Block pos={[-1, 0.74, 0]} size={[9, 0.04, 6.6]} color="#e9f2f5" mat="glass" solid={false} />
        {s.calcadas.map((i) => (
          <Block
            key={i}
            pos={enMesa(i % COLS, Math.floor(i / COLS), COLS, FILAS, 0.8)}
            size={[1.1, 0.06, 1]}
            color="#2b2b2b"
            solid={false}
          />
        ))}
        <Ball pos={enMesa(sel % COLS, Math.floor(sel / COLS), COLS, FILAS, 0.95)} r={0.14} color="#f7dc80" mat="neon" />
        <group position={[-1 + (s.estacion - 1) * 3.2, 0.7, 3.6]}>
          <Cyl pos={[0, 0.6, 0]} r={0.06} h={1.2} color="#5e6670" mat="metal" solid={false} />
          <Ball pos={[0, 1.3, 0]} r={0.2} color="#2c2f36" />
          <Label pos={[0, 1.8, 0]} text="👁️ Estación" h={0.24} />
        </group>
        <Puntero x={s.x} y={s.y} color="#f7dc80" />
      </Mesa>
    );
  },
});
export const Abrasigo = motor.Escena;
export const guia = motor.guia;
