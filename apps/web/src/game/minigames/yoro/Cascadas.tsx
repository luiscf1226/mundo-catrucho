import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, xDe } from './comun';

/** Desviador de un piso: columna y lado al que manda el agua (−1 izquierda, 1 derecha). */
type Desvio = { col: number; dir: -1 | 1 } | null;
type Estado = ReturnType<typeof cursor> & {
  /** manantiales: agua nueva que entra en cada piso y columna */
  brotes: number[][];
  desvios: Desvio[];
  solucion: Desvio[];
  presupuesto: number;
  espera: number;
  listo: number;
  mirando: number;
  pasos: number;
  fallas: number;
  toques: number;
  azar: () => number;
};
type Param = { pisos: number; cols: number; brotes: number; holgura: number; seed: number };
type Sesion = Motor<Param, Estado>;
/**
 * Agua en cada piso después de los desviadores. Lo que se desvía cae en la columna vecina del mismo piso
 * (secar arriba carga la de al lado) y todo baja al piso siguiente; tres o más láminas juntas se desbordan
 * y salpican a las dos columnas vecinas del piso de abajo.
 */
function agua(brotes: number[][], desvios: Desvio[], cols: number) {
  const pisos: number[][] = [];
  let baja = Array.from({ length: cols }, () => 0);
  for (let k = 0; k < brotes.length; k++) {
    const f = baja.map((v, c) => v + brotes[k][c]);
    const d = desvios[k];
    if (d && f[d.col] > 0) {
      f[d.col + d.dir] += f[d.col];
      f[d.col] = 0;
    }
    pisos.push(f);
    baja = [...f];
    f.forEach((v, c) => {
      if (v >= 3) {
        if (c > 0) baja[c - 1]++;
        if (c < cols - 1) baja[c + 1]++;
      }
    });
  }
  return pisos;
}
/** ¿hay un paso seco de arriba abajo, moviéndose como mucho una columna por piso? */
function paso(pisos: number[][]) {
  let alcanza = pisos[0].map((v) => v === 0);
  for (let k = 1; k < pisos.length; k++)
    alcanza = pisos[k].map((v, c) => v === 0 && (alcanza[c] || !!alcanza[c - 1] || !!alcanza[c + 1]));
  return alcanza.some(Boolean);
}
/** la solución con menos desviadores (búsqueda completa: son pocos pisos) */
function resolver(brotes: number[][], cols: number) {
  const opciones: Desvio[] = [null];
  for (let c = 0; c < cols; c++) {
    if (c > 0) opciones.push({ col: c, dir: -1 });
    if (c < cols - 1) opciones.push({ col: c, dir: 1 });
  }
  let mejor: Desvio[] | null = null;
  const actual: Desvio[] = [];
  function va(k: number, usados: number) {
    if (mejor && usados >= mejor.filter(Boolean).length) return;
    if (k === brotes.length) {
      if (paso(agua(brotes, actual, cols))) mejor = [...actual];
      return;
    }
    for (const o of opciones) {
      actual[k] = o;
      va(k + 1, usados + (o ? 1 : 0));
    }
    actual.length = k;
  }
  va(0, 0);
  return mejor as Desvio[] | null;
}
function maqueta(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  for (let intento = 0; intento < 40; intento++) {
    const brotes = Array.from({ length: p.pisos }, (_, k) =>
      Array.from({ length: p.cols }, () => (k === 0 ? 1 : s.azar() < p.brotes ? 1 : 0)),
    );
    const sol = resolver(brotes, p.cols);
    const usados = sol?.filter(Boolean).length ?? 0;
    // que haga falta desviar algo, pero que se pueda
    if (!sol || usados < 1 || usados > 3) continue;
    s.brotes = brotes;
    s.solucion = sol;
    s.presupuesto = usados + p.holgura;
    s.desvios = Array.from({ length: p.pisos }, () => null);
    s.mirando = 0;
    return;
  }
  // respaldo: una sola lámina que basta con desviar arriba
  s.brotes = Array.from({ length: p.pisos }, (_, k) => Array.from({ length: p.cols }, () => (k === 0 ? 1 : 0)));
  s.solucion = resolver(s.brotes, p.cols) ?? [];
  s.presupuesto = s.solucion.filter(Boolean).length + p.holgura;
  s.desvios = Array.from({ length: p.pisos }, () => null);
  s.mirando = 0;
}
const celda = (s: Estado, p: Param) => ({
  piso: p.pisos - 1 - casilla(s.y, p.pisos),
  col: casilla(s.x, p.cols),
});
const yDe = (piso: number, pisos: number) => xDe(pisos - 1 - piso, pisos);
function girar(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.25;
  s.toques++;
  const { piso, col } = celda(s, p),
    d = s.desvios[piso];
  // en la misma columna: izquierda → derecha → quitar; en otra, se mueve el desviador del piso
  const lados = ([-1, 1] as const).filter((x) => col + x >= 0 && col + x < p.cols);
  let nuevo: Desvio;
  if (d && d.col === col) {
    const i = lados.indexOf(d.dir);
    nuevo = i + 1 < lados.length ? { col, dir: lados[i + 1] } : null;
  } else nuevo = { col, dir: lados[0] };
  if (nuevo && !d && s.desvios.filter(Boolean).length >= s.presupuesto) {
    useGame.getState().toast('No te quedan desviadores: mové uno que ya pusiste.', '🪵');
    return;
  }
  s.desvios[piso] = nuevo;
}
function cruzar(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    toast = useGame.getState().toast;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.3;
  if (paso(agua(s.brotes, s.desvios, p.cols))) {
    s.pasos++;
    m.sumar(80);
    s.listo = 1.2;
    toast('¡Paso seco de arriba abajo!', '💦');
    return;
  }
  s.fallas++;
  m.sumar(-30);
  toast('Todavía hay un apoyo mojado en el camino.', '💧');
}
const motor = defineMotor({
  id: 'yoro.pijol',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'selva',
  guia: {
    goal: 'Hacé un paso seco de arriba abajo por apoyos sin agua. F pone un desviador (izquierda, derecha o quitar): seca ese apoyo, pero el agua cae en el de al lado y baja. Tres láminas juntas se desbordan. E cruza cuando el paso está listo.',
    ...controles('cruzar'),
  },
  etapa: (p) => ({
    pisos: 4 + Math.round(p.dif),
    cols: 3 + (p.dif > 0.5 ? 1 : 0),
    brotes: 0.2 + p.dif * 0.15,
    holgura: p.dif > 0.6 ? 0 : 1,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    brotes: [],
    desvios: [],
    solucion: [],
    presupuesto: 1,
    espera: 0,
    listo: 0,
    mirando: 0,
    pasos: 0,
    fallas: 0,
    toques: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    if (!s.brotes.length) maqueta(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) maqueta(m);
    }
    if (input.take('use')) cruzar(m);
    if (input.take('fire')) girar(m);
    const { piso, col } = celda(s, p),
      w = agua(s.brotes, s.desvios, p.cols)[piso]?.[col] ?? 0,
      usados = s.desvios.filter(Boolean).length;
    m.objetivo = `Desviadores ${usados}/${s.presupuesto} · ${paso(agua(s.brotes, s.desvios, p.cols)) ? '¡paso listo: E!' : 'falta un paso seco'}`;
    m.lineas = [
      `Piso ${piso + 1}, columna ${col + 1}: ${w === 0 ? 'seco' : w >= 3 ? 'se desborda' : `${w} lámina${w > 1 ? 's' : ''}`}`,
      `Pasos ${s.pasos} · Fallas ${s.fallas}`,
    ];
    m.stats = { x: s.x, y: s.y, pasos: s.pasos, fallas: s.fallas, toques: s.toques, usados };
  },
  bot(m) {
    const s = m.datos,
      p = m.parametros;
    if (s.espera > 0 || s.listo > 0 || s.mirando < 1.2 || !s.brotes.length) return;
    s.auto = true;
    // primero quita lo que sobra, luego pone cada desviador de la solución
    const igual = (d: Desvio, q: Desvio) => (d?.col ?? -1) === (q?.col ?? -1) && (d?.dir ?? 0) === (q?.dir ?? 0);
    const sobra = s.desvios.findIndex((d, i) => d && !igual(d, s.solucion[i]));
    const k = sobra >= 0 ? sobra : s.desvios.findIndex((d, i) => !igual(d, s.solucion[i]));
    if (k < 0) {
      cruzar(m);
      return;
    }
    const q = s.solucion[k],
      d = s.desvios[k];
    s.x = xDe(q ? q.col : (d?.col ?? 0), p.cols);
    s.y = yDe(k, p.pisos);
    girar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      p = m.parametros,
      pisos = agua(s.brotes, s.desvios, p.cols),
      sel = celda(s, p),
      listo = s.brotes.length > 0 && paso(pisos),
      // maqueta vertical al frente de la mesa: una repisa por piso y columna
      X = (c: number) => -1 + (c - (p.cols - 1) / 2) * 2,
      Y = (k: number) => 4.4 - k * 0.78,
      Z = 0.2;
    return (
      <Mesa titulo="Pico Pijol · cascadas en cadena">
        <Block
          pos={[-1, 2.6, Z - 0.45]}
          size={[2 * p.cols + 0.6, 4.2, 0.2]}
          color="#5f6f52"
          mat="stone"
          solid={false}
        />
        {pisos.map((fila, k) =>
          fila.map((w, c) => {
            const d = s.desvios[k],
              aqui = sel.piso === k && sel.col === c;
            return (
              <group key={`${k}-${c}`}>
                <Block
                  pos={[X(c), Y(k) - 0.25, Z]}
                  size={[1.6, 0.14, 0.6]}
                  color={aqui ? '#ffd166' : w === 0 ? '#c08552' : '#3d5a80'}
                  mat="wood"
                  solid={false}
                />
                {w > 0 && (
                  <mesh position={[X(c), Y(k) + 0.12, Z + 0.05]}>
                    <boxGeometry args={[0.3 + Math.min(3, w) * 0.35, 0.6, 0.12]} />
                    <meshBasicMaterial color={w >= 3 ? '#0077b6' : '#90e0ef'} transparent opacity={0.8} />
                  </mesh>
                )}
                {d && d.col === c && (
                  <Block
                    pos={[X(c) + d.dir * 0.45, Y(k) + 0.2, Z + 0.3]}
                    size={[1, 0.08, 0.3]}
                    rot={0}
                    color="#e9c46a"
                    mat="wood"
                    solid={false}
                  />
                )}
                {d && d.col === c && <Label pos={[X(c), Y(k) + 0.25, Z + 0.4]} text={d.dir < 0 ? '⬅️' : '➡️'} h={0.3} />}
                {s.brotes[k]?.[c] > 0 && k > 0 && <Label pos={[X(c) - 0.65, Y(k) + 0.3, Z + 0.3]} text="💧" h={0.24} />}
              </group>
            );
          }),
        )}
        <Block
          pos={[-1, 0.76, Z + 0.4]}
          size={[2 * p.cols + 0.6, 0.04, 1.2]}
          color="#4a90b8"
          mat="water"
          solid={false}
        />
        <Label
          pos={[-1, 5.2, Z]}
          text={
            s.listo > 0
              ? '¡Paso abierto!'
              : listo
                ? '✅ Paso seco: E para cruzar'
                : `🪵 Desviadores ${s.desvios.filter(Boolean).length}/${s.presupuesto}`
          }
          h={0.42}
        />
      </Mesa>
    );
  },
});
export const Cascadas = motor.Escena;
export const guia = motor.guia;
