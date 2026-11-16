import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

const COLS = 5,
  FILAS = 4;
const TIPOS = ['Concha adulta', 'Juvenil · dejala', 'Raíz', 'Hueco'] as const;
const COLOR = ['#3b2f2f', '#8a6d5a', '#7a5a3a', '#2c4a52'];
/** resistencia y ancho de cada tipo bajo el palpador */
const LECTURA: [number, number][] = [
  [0.85, 0.8],
  [0.8, 0.3],
  [0.55, 0.6],
  [0.12, 0],
];
type Estado = ReturnType<typeof cursor> & {
  celdas: number[];
  ruido: number[];
  hechas: (number | null)[];
  marca: number;
  sobre: number;
  palpado: number;
  espera: number;
  bien: number;
  errores: number;
  juveniles: number;
  tablas: number;
  azar: () => number;
};
type Sesion = Motor<{ palpar: number; ruido: number; transecto: boolean; seed: number }, Estado>;
const celdaDe = (x: number, y: number) =>
  Math.min(FILAS - 1, Math.max(0, Math.floor(((y + 1) / 2) * FILAS))) * COLS +
  Math.min(COLS - 1, Math.max(0, Math.floor(((x + 1) / 2) * COLS)));
const centro = (i: number): [number, number] => [
  (((i % COLS) + 0.5) / COLS) * 2 - 1,
  ((Math.floor(i / COLS) + 0.5) / FILAS) * 2 - 1,
];
function tabla(s: Estado, ruido: number) {
  s.celdas = Array.from({ length: COLS * FILAS }, () => Math.floor(s.azar() * 4));
  s.ruido = s.celdas.map(() => (s.azar() - 0.5) * ruido);
  s.hechas = s.celdas.map(() => null);
}
/** lectura visible de una celda: la del transecto esconde el ancho hasta palpar el doble */
function lectura(m: Sesion, i: number) {
  const s = m.datos,
    [r, a] = LECTURA[s.celdas[i]],
    listo = s.sobre === i && s.palpado >= m.parametros.palpar;
  return {
    resistencia: listo ? Math.max(0, r + s.ruido[i]) : 0,
    ancho:
      listo && (!m.parametros.transecto || s.palpado >= m.parametros.palpar * 1.4) ? Math.max(0, a + s.ruido[i]) : -1,
    vibra: listo && s.celdas[i] === 2,
    listo,
  };
}
function registrar(m: Sesion) {
  const s = m.datos,
    i = celdaDe(s.x, s.y);
  if (s.espera > 0 || s.hechas[i] !== null) return;
  if (s.sobre !== i || s.palpado < m.parametros.palpar) {
    m.objetivo = 'Palpá primero: quedate quieto sobre la celda';
    return;
  }
  s.espera = 0.25;
  s.hechas[i] = s.marca;
  if (s.marca === s.celdas[i]) {
    s.bien++;
    if (s.marca === 1) s.juveniles++;
    m.sumar(m.parametros.transecto ? (s.marca === 1 ? 20 : 12) : s.marca === 1 ? 12 : 8);
  } else if (s.marca === 0 && s.celdas[i] === 1) {
    s.errores++;
    m.sumar(-40);
    useGame.getState().toast('¡Ese era juvenil! Se queda en el lodo.', '🐚');
  } else {
    s.errores++;
    m.sumar(-25);
  }
  if (s.hechas.every((h) => h !== null)) {
    s.tablas++;
    m.sumar(40);
    tabla(s, m.parametros.ruido);
  }
}
const motor = defineMotor({
  id: 'valle.curil',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'rio',
  guia: {
    goal: 'Quedate quieto sobre una celda de lodo para palparla. Leé resistencia y ancho, elegí con E qué es y registrá con F. Los juveniles se dejan.',
    ...controles('cambiar lo que registrás'),
  },
  etapa: (p) => ({
    palpar: 0.55 + p.dif * 0.3,
    ruido: 0.05 + p.dif * 0.12,
    transecto: p.tema.variante === 'la-concha-no-es-boton',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      celdas: [],
      ruido: [],
      hechas: [],
      marca: 0,
      sobre: -1,
      palpado: 0,
      espera: 0,
      bien: 0,
      errores: 0,
      juveniles: 0,
      tablas: 0,
      azar: rng(p.seed),
    };
    tabla(s, p.ruido);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    const i = celdaDe(s.x, s.y);
    if (i === s.sobre) s.palpado += dt;
    else {
      s.sobre = i;
      s.palpado = 0;
    }
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('use')) s.marca = (s.marca + 1) % 4;
    m.objetivo = m.parametros.transecto
      ? 'Transecto: palpá el doble para ver el ancho y dejá los juveniles'
      : 'Registrá concha, raíz y hueco sin sacar juveniles';
    if (input.take('fire')) registrar(m);
    const l = lectura(m, i);
    m.lineas = [
      l.listo
        ? `Resistencia ${l.resistencia.toFixed(2)} · Ancho ${l.ancho < 0 ? '¿?' : l.ancho.toFixed(2)}${l.vibra ? ' · vibra' : ''}`
        : `Palpando… ${Math.round(Math.min(1, s.palpado / m.parametros.palpar) * 100)}%`,
      `E: ${TIPOS[s.marca]} · Registradas ${s.hechas.filter((h) => h !== null).length}/${COLS * FILAS} · Errores ${s.errores}`,
    ];
    m.stats = { x: s.x, bien: s.bien, errores: s.errores, juveniles: s.juveniles, tablas: s.tablas };
  },
  bot(m) {
    const s = m.datos;
    const i = s.hechas.findIndex((h) => h === null);
    if (i < 0) return;
    s.auto = true;
    [s.x, s.y] = centro(i);
    s.marca = s.celdas[i];
    const l = lectura(m, i);
    if (l.listo && (!m.parametros.transecto || l.ancho >= 0)) registrar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      i = celdaDe(s.x, s.y),
      l = lectura(m, i);
    const [cx, cy] = centro(i);
    return (
      <Mesa
        titulo={
          m.parametros.transecto ? 'Transecto del estero · Lecturas a medias' : 'Lodo del manglar · Palpá sin sacar'
        }
      >
        {s.celdas.map((tipo, k) => {
          const [x, y] = centro(k),
            hecha = s.hechas[k];
          return (
            <Block
              key={k}
              pos={[-1 + x * 4.2, 0.78, -y * 3.2]}
              size={[1.5, 0.12, 1.4]}
              color={hecha === null ? (k === i ? '#6b5440' : '#4f3d2c') : hecha === tipo ? '#5d7d4f' : '#9b3b33'}
              mat="dirt"
              solid={false}
            />
          );
        })}
        {s.hechas.map((h, k) => {
          if (h === null) return null;
          const [x, y] = centro(k);
          return <Ball key={k} pos={[-1 + x * 4.2, 0.95, -y * 3.2]} r={0.18} color={COLOR[s.celdas[k]]} mat="stone" />;
        })}
        <Ball
          pos={[-1 + cx * 4.2, 1.3 + (l.listo ? 0 : Math.sin(m.tiempo * 9) * 0.06), -cy * 3.2]}
          r={0.2}
          color="#f2e2b8"
        />
        <Block
          pos={[3.4, 0.7 + l.resistencia, -2.6]}
          size={[0.4, l.resistencia * 2 + 0.02, 0.4]}
          color="#d97b3a"
          solid={false}
        />
        <Block
          pos={[4.1, 0.7 + Math.max(0, l.ancho), -2.6]}
          size={[0.4, Math.max(0, l.ancho) * 2 + 0.02, 0.4]}
          color={l.ancho < 0 ? '#777777' : '#3a9ad9'}
          solid={false}
        />
        <group position={[3.4 + (l.vibra ? Math.sin(m.tiempo * 40) * 0.05 : 0), 0, 0]}>
          <Label
            pos={[0.35, 3.1, -2.6]}
            text={l.vibra ? 'Resistencia · ancho · ¡vibra!' : 'Resistencia · ancho'}
            h={0.32}
          />
        </group>
        <Label pos={[-1, 3.2, -2]} text={`Registrás: ${TIPOS[s.marca]}`} h={0.5} />
      </Mesa>
    );
  },
});
export const Curil = motor.Escena;
export const guia = motor.guia;
