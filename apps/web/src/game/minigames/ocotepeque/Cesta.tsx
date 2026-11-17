import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, xDe } from './comun';

/** [nombre, peso, cuánto aguanta encima, color] */
const BAYAS: [string, number, number, string][] = [
  ['Mora madura', 1, 1, '#3c1642'],
  ['Mora', 1, 2, '#5b2a86'],
  ['Mora verde', 1, 3, '#8e3b46'],
  ['Mora grande', 2, 3, '#2d1e2f'],
];
const COLUMNAS = 4;
type Baya = { t: number; col: number };
type Estado = ReturnType<typeof cursor> & {
  cola: Baya[];
  cesta: number[][];
  espera: number;
  listo: number;
  jugo: number;
  jugoCol: number;
  sana: boolean;
  cestas: number;
  aplastadas: number;
  llenas: number;
  sacadas: number;
  azar: () => number;
};
type Sesion = Motor<{ alto: number; bayas: number; seed: number }, Estado>;
/** presión sobre cada baya de una columna (de abajo hacia arriba): el peso de todas las de encima */
function presiones(col: number[]) {
  return col.map((_, i) => col.slice(i + 1).reduce((t, x) => t + BAYAS[x][1], 0));
}
const aguanta = (col: number[]) => presiones(col).every((p, i) => p <= BAYAS[col[i]][2]);
function cesta(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    columnas: number[][] = Array.from({ length: COLUMNAS }, () => []);
  // se arma una cesta que sí se puede: cada columna desde arriba, con bayas que aguanten lo de encima
  let total = 0;
  for (let c = 0; c < COLUMNAS && total < p.bayas; c++) {
    let encima = 0;
    const alto = Math.min(p.alto, p.bayas - total, 2 + Math.floor(s.azar() * (p.alto - 1)));
    for (let h = 0; h < alto; h++) {
      const posibles = BAYAS.map((_, i) => i).filter((i) => BAYAS[i][2] >= encima);
      if (!posibles.length) break;
      const t = posibles[Math.floor(s.azar() * posibles.length)];
      columnas[c].unshift(t);
      encima += BAYAS[t][1];
    }
    total += columnas[c].length;
  }
  // las bayas llegan revueltas, pero cada columna de abajo hacia arriba
  const altura = columnas.map(() => 0);
  s.cola = [];
  while (s.cola.length < total) {
    const c = Math.floor(s.azar() * COLUMNAS);
    if (altura[c] < columnas[c].length) s.cola.push({ t: columnas[c][altura[c]++], col: c });
  }
  s.cesta = Array.from({ length: COLUMNAS }, () => []);
  s.sana = true;
}
/** ¿se puede terminar la cesta desde aquí? Búsqueda con memoria; prueba primero la columna que se usó al armarla */
function plan(cesta: number[][], cola: Baya[], alto: number) {
  const vistos = new Set<string>();
  let pasos = 0;
  function va(col: number[][], i: number): boolean {
    if (i >= cola.length) return true;
    const clave = `${i}|${col.map((c) => c.join('')).join('/')}`;
    if (vistos.has(clave) || ++pasos > 20000) return false;
    vistos.add(clave);
    const orden = [cola[i].col, ...[0, 1, 2, 3].filter((c) => c !== cola[i].col)];
    for (const c of orden) {
      if (col[c].length >= alto) continue;
      const nueva = [...col[c], cola[i].t];
      if (!aguanta(nueva)) continue;
      const copia = col.map((x, k) => (k === c ? nueva : x));
      if (va(copia, i + 1)) return true;
    }
    return false;
  }
  const orden = [cola[0].col, ...[0, 1, 2, 3].filter((c) => c !== cola[0].col)];
  for (const c of orden) {
    if (cesta[c].length >= alto) continue;
    const nueva = [...cesta[c], cola[0].t];
    if (
      aguanta(nueva) &&
      va(
        cesta.map((x, k) => (k === c ? nueva : x)),
        1,
      )
    )
      return c;
  }
  return -1;
}
function poner(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast,
    b = s.cola[0];
  if (s.espera > 0 || s.listo > 0 || !b) return;
  s.espera = 0.4;
  const c = casilla(s.x, COLUMNAS),
    col = s.cesta[c];
  if (col.length >= m.parametros.alto) {
    s.llenas++;
    m.sumar(-10);
    toast('Esa columna ya llegó al borde de la cesta.', '🧺');
    return;
  }
  col.push(b.t);
  s.cola.shift();
  // se aplastan las que no aguantan; las de encima bajan un nivel
  let aplastó = false;
  for (let i = 0; i < col.length; i++) {
    if (presiones(col)[i] > BAYAS[col[i]][2]) {
      col.splice(i, 1);
      i--;
      aplastó = true;
      s.aplastadas++;
      m.sumar(-25);
    }
  }
  if (aplastó) {
    s.sana = false;
    s.jugo = 1;
    s.jugoCol = c;
    toast('¡Apachurraste una de abajo! La presión baja por toda la columna.', '🫐');
  } else m.sumar(4);
  if (!s.cola.length) {
    s.listo = 1.5;
    if (s.sana) {
      s.cestas++;
      m.sumar(60);
      toast('¡Cesta llena y sin apachurrar!', '🫐');
    }
  }
}
function sacar(m: Sesion) {
  const s = m.datos,
    c = casilla(s.x, COLUMNAS),
    t = s.cesta[c].pop();
  if (s.espera > 0 || s.listo > 0 || t === undefined) return;
  s.espera = 0.4;
  s.sacadas++;
  s.cola.unshift({ t, col: c });
  m.sumar(-6);
}
const motor = defineMotor({
  id: 'ocotepeque.moras',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'Cada mora aguanta cierto peso encima (la barrita blanca). Elegí columna con A/D y F pone la que sigue: su peso baja por toda la columna y puede apachurrar una de dos niveles abajo. E saca la de arriba.',
    ...controles('sacar la de arriba'),
  },
  etapa: (p) => ({ alto: 4 + Math.round(p.dif), bayas: 8 + Math.round(p.dif * 4), seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    cola: [],
    cesta: [],
    espera: 0,
    listo: 0,
    jugo: 0,
    jugoCol: 0,
    sana: true,
    cestas: 0,
    aplastadas: 0,
    llenas: 0,
    sacadas: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.cesta.length) cesta(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.jugo = Math.max(0, s.jugo - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) cesta(m);
    }
    if (input.take('use')) sacar(m);
    if (input.take('fire')) poner(m);
    const b = s.cola[0],
      c = casilla(s.x, COLUMNAS);
    m.objetivo = b ? `Sigue: ${BAYAS[b.t][0]} (pesa ${BAYAS[b.t][1]}, aguanta ${BAYAS[b.t][2]})` : 'Cesta lista';
    m.lineas = [
      `Columna ${c + 1} · ${s.cesta[c]?.length ?? 0} de ${m.parametros.alto} · Faltan ${s.cola.length}`,
      `Cestas ${s.cestas} · Apachurradas ${s.aplastadas} · Sacadas ${s.sacadas}`,
    ];
    m.stats = {
      x: s.x,
      puestas: s.cesta.reduce((t, c) => t + c.length, 0),
      cestas: s.cestas,
      aplastadas: s.aplastadas,
      llenas: s.llenas,
      sacadas: s.sacadas,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.listo > 0 || !s.cola.length) return;
    s.auto = true;
    const c = plan(s.cesta, s.cola, m.parametros.alto);
    if (c >= 0) {
      s.x = xDe(c, COLUMNAS);
      poner(m);
      return;
    }
    // sin salida: saca la de arriba de la columna más alta
    const alta = s.cesta.reduce((k, col, i) => (col.length > s.cesta[k].length ? i : k), 0);
    s.x = xDe(alta, COLUMNAS);
    sacar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = casilla(s.x, COLUMNAS),
      alto = m.parametros.alto,
      X = (c: number) => -3 + c * 1.3;
    return (
      <Mesa titulo="Cesta de moras · Güisayote">
        <Block pos={[-1, 0.75, -0.6]} size={[5.6, 0.1, 1.2]} color="#a47148" mat="wood" solid={false} />
        {s.cesta.map((col, c) => {
          const pres = presiones(col);
          return (
            <group key={c}>
              <Block
                pos={[X(c), 0.8 + alto * 0.28, -1.15]}
                size={[1.1, alto * 0.56 + 0.1, 0.06]}
                color={c === k ? '#ffd166' : '#c8a165'}
                mat="wood"
                solid={false}
              />
              {col.map((t, i) => (
                <group key={i}>
                  <Ball pos={[X(c), 1.05 + i * 0.56, -0.6]} r={0.18 + BAYAS[t][1] * 0.06} color={BAYAS[t][3]} />
                  <Block
                    pos={[X(c) + 0.42, 0.95 + i * 0.56 + Math.max(0, BAYAS[t][2] - pres[i]) * 0.06, -0.6]}
                    size={[0.08, Math.max(0.02, (BAYAS[t][2] - pres[i]) * 0.12), 0.08]}
                    color="#ffffff"
                    solid={false}
                  />
                </group>
              ))}
            </group>
          );
        })}
        {s.jugo > 0 && <Cyl pos={[X(s.jugoCol), 0.82, -0.6]} r={0.6 * s.jugo} h={0.04} color="#7b2cbf" solid={false} />}
        {s.cola.slice(0, 5).map((b, i) => (
          <Ball
            key={i}
            pos={[-4.2 + i * 0.7, 1.2, 2.6]}
            r={(0.18 + BAYAS[b.t][1] * 0.06) * (i ? 0.8 : 1)}
            color={BAYAS[b.t][3]}
          />
        ))}
        {s.cola[0] && (
          <Label pos={[-4.2, 1.85, 2.6]} text={`${BAYAS[s.cola[0].t][0]} · aguanta ${BAYAS[s.cola[0].t][2]}`} h={0.3} />
        )}
        <Label pos={[-1, 3.6, -1.2]} text={s.listo > 0 ? 'Cesta lista 🫐' : `Columna ${k + 1}`} h={0.42} />
      </Mesa>
    );
  },
});
export const Cesta = motor.Escena;
export const guia = motor.guia;
