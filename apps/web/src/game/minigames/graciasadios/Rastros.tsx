// Distancia del jaguar: en el mapa de la selva aparecen huellas con su hora. Ordenándolas sabés por dónde pasó y
// hacia dónde va. Marcás la zona de exclusión (el rastro y lo que sigue) y elegís un lugar de observación lejos.
// Elegir un punto adelante del animal es seguirlo: se cancela el recorrido.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, xDe } from './comun';

const COLS = 6,
  FILAS = 4;
type Celda = [number, number];
type Huella = { c: number; f: number; hora: number; danto: boolean };
type Estado = ReturnType<typeof cursor> & {
  huellas: Huella[];
  zona: Set<number>;
  adelante: Set<number>;
  rastro: Set<number>;
  ultima: Celda;
  marcadas: Set<number>;
  visto: number;
  observado: number;
  paciencia: number;
  mirando: number;
  espera: number;
  bien: number;
  seguidas: number;
  errores: number;
  azar: () => number;
};
type Param = { pasos: number; vuelta: boolean; dantos: number; paciencia: number; seed: number };
type Sesion = Motor<Param, Estado>;

const DIRS: Celda[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];
const id = (c: number, f: number) => f * COLS + c;
const dentro = (c: number, f: number) => c >= 0 && c < COLS && f >= 0 && f < FILAS;
const cerca = (a: number, c: number, f: number) =>
  Math.max(Math.abs((a % COLS) - c), Math.abs(Math.floor(a / COLS) - f));
const hora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
const celdaDe = (s: Estado): Celda => [casilla(s.x, COLS), casilla(-s.y, FILAS)];

/** Lugares de observación que valen: fuera del rastro y a dos casillas o más de lo que viene adelante. */
function lugares(s: Estado) {
  const out: number[] = [];
  for (let f = 0; f < FILAS; f++)
    for (let c = 0; c < COLS; c++)
      if (!s.rastro.has(id(c, f)) && [...s.adelante].every((a) => cerca(a, c, f) >= 2)) out.push(id(c, f));
  return out;
}
function ronda(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    r = s.azar;
  for (let intento = 0; intento < 60; intento++) {
    let d = DIRS[Math.floor(r() * 8)];
    let c = Math.floor(r() * COLS),
      f = Math.floor(r() * FILAS);
    const camino: Celda[] = [[c, f]];
    let ok = true;
    for (let k = 1; k < p.pasos && ok; k++) {
      // en las etapas altas el animal dobla una vez: lo que sigue va según el último paso
      if (p.vuelta && k === p.pasos - 1 && r() < 0.6) {
        const i = DIRS.findIndex((x) => x[0] === d[0] && x[1] === d[1]);
        d = DIRS[[4, 7, 6, 5, 2, 0, 1, 3][i] ?? i] ?? d;
      }
      c += d[0];
      f += d[1];
      ok = dentro(c, f) && !camino.some(([a, b]) => a === c && b === f);
      camino.push([c, f]);
    }
    if (!ok) continue;
    const adelante = [1, 2].map((k): Celda => [c + d[0] * k, f + d[1] * k]).filter(([a, b]) => dentro(a, b));
    if (!adelante.length) continue;
    s.rastro = new Set(camino.map(([a, b]) => id(a, b)));
    s.adelante = new Set([id(c, f), ...adelante.map(([a, b]) => id(a, b))]);
    s.zona = new Set([...s.rastro, ...s.adelante]);
    if (!lugares(s).length) continue;
    let min = 290 + Math.floor(r() * 30);
    s.huellas = camino.map(([a, b]) => ({ c: a, f: b, hora: (min += 10 + Math.floor(r() * 15)), danto: false }));
    for (let k = 0; k < p.dantos; k++) {
      const libres = [];
      for (let q = 0; q < COLS * FILAS; q++)
        if (!s.zona.has(q) && !s.huellas.some((h) => id(h.c, h.f) === q)) libres.push(q);
      const q = libres[Math.floor(r() * libres.length)];
      if (q !== undefined)
        s.huellas.push({ c: q % COLS, f: Math.floor(q / COLS), hora: 300 + Math.floor(r() * 60), danto: true });
    }
    // se muestran revueltas: el orden lo da la hora, no la posición
    s.huellas.sort(() => r() - 0.5);
    s.ultima = [c, f];
    s.marcadas = new Set();
    s.paciencia = p.paciencia;
    s.mirando = 0;
    return;
  }
}
function marcar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.25;
  const q = id(...celdaDe(s));
  if (s.marcadas.has(q)) s.marcadas.delete(q);
  else s.marcadas.add(q);
}
function observar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0) return;
  s.espera = 0.8;
  const [c, f] = celdaDe(s),
    q = id(c, f);
  s.observado = q;
  s.visto = 1.2;
  if ([...s.adelante].some((a) => cerca(a, c, f) <= 1)) {
    s.seguidas++;
    m.sumar(-40);
    toast('Eso es seguir al animal: se canceló el recorrido.', '🐆');
  } else if (s.rastro.has(q)) {
    s.errores++;
    m.sumar(-20);
    toast('Ahí está el rastro: buscá un lugar lejos.', '🐾');
  } else {
    const aciertos = [...s.marcadas].filter((x) => s.zona.has(x)).length,
      sobran = s.marcadas.size - aciertos,
      faltan = s.zona.size - aciertos;
    s.bien++;
    m.sumar(30 + 15 * aciertos - 15 * sobran - 10 * faltan);
    if (faltan || sobran) toast(`Observación lejos, pero la zona quedó ${faltan ? 'corta' : 'de más'}.`, '🗺️');
  }
  ronda(m);
}

const motor = defineMotor({
  id: 'graciasadios.rastros',
  modos: { duo: { tipo: 'compartido', cada: 2 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'selva',
  guia: {
    goal: 'Ordená las huellas del jaguar por la hora: así sabés hacia dónde va. F marca la zona de exclusión (el rastro y las dos casillas que siguen). E elige el lugar de observación: lejos y nunca adelante del animal. Las huellas de danto no cuentan.',
    ...controles('marcar exclusión', 'observar desde ahí', 'elegir casilla'),
  },
  etapa: (p) => ({
    pasos: p.dif > 0.5 ? 4 : 3,
    vuelta: p.dif > 0.3,
    dantos: p.dif > 0.4 ? 2 : p.dif > 0 ? 1 : 0,
    paciencia: 18 - p.dif * 6,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    huellas: [],
    zona: new Set(),
    adelante: new Set(),
    rastro: new Set(),
    ultima: [0, 0],
    marcadas: new Set(),
    visto: 0,
    observado: -1,
    paciencia: p.paciencia,
    mirando: 0,
    espera: 0,
    bien: 0,
    seguidas: 0,
    errores: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.huellas.length) ronda(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.visto = Math.max(0, s.visto - dt);
    s.mirando += dt;
    s.paciencia -= dt;
    if (s.paciencia <= 0) {
      s.errores++;
      m.sumar(-10);
      useGame.getState().toast('El rastro se enfrió: llegó otro mapa.', '⏱️');
      ronda(m);
    }
    if (input.take('fire')) marcar(m);
    if (input.take('use')) observar(m);
    m.objetivo = `Marcá la zona y observá lejos · ${Math.max(0, s.paciencia).toFixed(0)} s`;
    m.lineas = [
      `Casillas marcadas ${s.marcadas.size}`,
      `Observaciones bien ${s.bien} · Seguiste al animal ${s.seguidas} · Errores ${s.errores}`,
    ];
    m.stats = { x: s.x, y: s.y, marcadas: s.marcadas.size, bien: s.bien, seguidas: s.seguidas, errores: s.errores };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.mirando < 0.8 || !s.huellas.length) return;
    s.auto = true;
    const ir = (q: number) => {
      s.x = xDe(q % COLS, COLS);
      s.y = -xDe(Math.floor(q / COLS), FILAS);
    };
    const falta = [...s.zona].find((q) => !s.marcadas.has(q)) ?? [...s.marcadas].find((q) => !s.zona.has(q));
    if (falta !== undefined) {
      ir(falta);
      return marcar(m);
    }
    const [uc, uf] = s.ultima;
    const mejor = lugares(s).sort((a, b) => cerca(b, uc, uf) - cerca(a, uc, uf))[0];
    if (mejor !== undefined) {
      ir(mejor);
      observar(m);
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      [cc, cf] = celdaDe(s);
    const X = (c: number) => -5 + c * 1.6,
      Z = (f: number) => -2.4 + f * 1.6;
    const celdas = [];
    for (let f = 0; f < FILAS; f++)
      for (let c = 0; c < COLS; c++) {
        const q = id(c, f),
          marcada = s.marcadas.has(q);
        celdas.push(
          <Block
            key={q}
            pos={[X(c), 0.74, Z(f)]}
            size={[1.5, 0.06, 1.5]}
            color={marcada ? '#e76f51' : (c + f) % 2 ? '#40916c' : '#52b788'}
            mat={marcada ? 'cloth' : 'leaf'}
            solid={false}
          />,
        );
      }
    return (
      <Mesa titulo="Mapa del Río Plátano · zona de exclusión">
        {celdas}
        <Block pos={[X(cc), 0.79, Z(cf)]} size={[1.2, 0.04, 1.2]} color="#ffd166" solid={false} />
        {s.huellas.map((h, k) => (
          <Label
            key={k}
            pos={[X(h.c), 1.15, Z(h.f)]}
            text={`${h.danto ? 'danto' : '🐾'} ${hora(h.hora)}`}
            h={0.3}
            fg={h.danto ? '#bde0fe' : '#ffd166'}
          />
        ))}
        {s.visto > 0 && s.observado >= 0 && (
          <Label pos={[X(s.observado % COLS), 1.8, Z(Math.floor(s.observado / COLS))]} text="🔭" h={0.5} />
        )}
      </Mesa>
    );
  },
});
export const Rastros = motor.Escena;
export const guia = motor.guia;
