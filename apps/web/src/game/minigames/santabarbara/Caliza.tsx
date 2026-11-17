import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { aviso, casilla, controles, cursor, duracion, ejeDe, entre, Mesa, metas, mover } from './comun';

interface Placa {
  hueca: boolean;
  grieta: boolean;
  sondeada: boolean;
  carga: boolean;
}
type Estado = ReturnType<typeof cursor> & {
  placas: Placa[];
  /** variante: placa que cede con el material encima (−1 si no hay) */
  cede: number;
  sondas: number;
  espera: number;
  mirando: number;
  puestas: number;
  rotas: number;
  sueltas: number;
  pasos: number;
  sondeos: number;
  intentos: number;
  azar: () => number;
};
type Sesion = Motor<
  { cols: number; filas: number; huecos: number; enganos: number; sondas: number; rescate: boolean; seed: number },
  Estado
>;
const vecinos = (i: number, cols: number, filas: number) => {
  const c = i % cols,
    f = Math.floor(i / cols);
  return [c > 0 ? i - 1 : -1, c < cols - 1 ? i + 1 : -1, f > 0 ? i - cols : -1, f < filas - 1 ? i + cols : -1].filter(
    (j) => j >= 0,
  );
};
function tablero(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  const firmes = new Set<number>();
  // un paso firme garantizado de la orilla izquierda a la derecha
  let f = entre(s.azar, 0, p.filas - 1);
  for (let c = 0; c < p.cols; c++) {
    firmes.add(f * p.cols + c);
    if (c < p.cols - 1 && s.azar() < 0.5) {
      const g = Math.max(0, Math.min(p.filas - 1, f + (s.azar() < 0.5 ? -1 : 1)));
      firmes.add(g * p.cols + c);
      f = g;
    }
  }
  s.cede = -1;
  if (p.rescate) {
    // la placa que cede queda junto al final del paso, nunca encima de él
    const fin = [...firmes].filter((i) => i % p.cols === p.cols - 1)[0];
    const cand = vecinos(fin, p.cols, p.filas).filter((j) => !firmes.has(j));
    s.cede = cand.length ? cand[0] : -1;
  }
  s.placas = Array.from({ length: p.cols * p.filas }, (_, i) => {
    const hueca = !firmes.has(i) && i !== s.cede && s.azar() < p.huecos;
    // toda placa hueca tiene grieta; algunas firmes también (la piedra de arriba no cuenta todo)
    return { hueca, grieta: hueca || s.azar() < p.enganos, sondeada: false, carga: false };
  });
  if (s.cede >= 0) s.placas[s.cede] = { hueca: true, grieta: true, sondeada: true, carga: false };
  s.sondas = p.sondas;
  s.mirando = 0;
}
const listo = (s: Estado, cols: number, filas: number) =>
  s.cede >= 0
    ? vecinos(s.cede, cols, filas).some((j) => s.placas[j].carga)
    : s.placas.some((q, i) => q.carga && i % cols === cols - 1);
const elegida = (s: Estado, cols: number, filas: number) => casilla(s.y, filas) * cols + casilla(s.x, cols);
const conecta = (s: Estado, i: number, cols: number, filas: number) =>
  s.placas.some((q) => q.carga) ? vecinos(i, cols, filas).some((j) => s.placas[j].carga) : i % cols === 0;
function sondear(m: Sesion) {
  const s = m.datos,
    { cols, filas } = m.parametros;
  if (s.espera > 0) return;
  const q = s.placas[elegida(s, cols, filas)];
  s.espera = 0.4;
  if (q.sondeada) return;
  if (s.sondas <= 0) {
    aviso('Ya no hay sondas para esta placa: decidí con las grietas.', '🔦');
    return;
  }
  s.sondas--;
  s.sondeos++;
  q.sondeada = true;
  aviso(q.hueca ? 'Suena hueca: abajo hay cavidad.' : 'Suena firme.', q.hueca ? '🕳️' : '🪨');
}
function cargar(m: Sesion) {
  const s = m.datos,
    { cols, filas } = m.parametros;
  if (s.espera > 0) return;
  s.intentos++;
  s.espera = 0.5;
  const i = elegida(s, cols, filas),
    q = s.placas[i];
  if (q.carga || !conecta(s, i, cols, filas)) {
    s.sueltas++;
    m.sumar(-10);
    aviso(
      q.carga ? 'Ahí ya hay carga: repartila.' : 'Esa placa no conecta con el paso (empezá por la izquierda).',
      '🧭',
    );
    return;
  }
  if (q.hueca) {
    s.rotas++;
    m.sumar(-30);
    aviso(i === s.cede ? 'No se sube nadie a la placa que cede.' : '¡Placa hueca! Se rompió: otro tablero.', '💥');
    tablero(m);
    return;
  }
  q.carga = true;
  s.puestas++;
  m.sumar(20);
  s.mirando = 0;
  if (listo(s, cols, filas)) {
    s.pasos++;
    m.sumar(40);
    aviso(s.cede >= 0 ? '¡Material rescatado con apoyos!' : '¡Paso completo sobre placas firmes!', '⛰️');
    tablero(m);
  }
}
/** Camino más corto por placas firmes desde lo cargado (o la orilla) hasta la meta. */
function siguiente(s: Estado, cols: number, filas: number) {
  const n = s.placas.length,
    previo = new Array<number>(n).fill(-2),
    cola: number[] = [];
  const hay = s.placas.some((q) => q.carga);
  for (let i = 0; i < n; i++)
    if (
      (hay ? s.placas[i].carga : i % cols === 0 && !s.placas[i].hueca) &&
      !(s.placas[i].hueca && !s.placas[i].carga)
    ) {
      previo[i] = -1;
      cola.push(i);
    }
  const meta = (i: number) => (s.cede >= 0 ? vecinos(s.cede, cols, filas).includes(i) : i % cols === cols - 1);
  for (let h = 0; h < cola.length; h++) {
    const i = cola[h];
    if (meta(i) && (!s.placas[i].carga || !hay)) {
      let j = i;
      while (previo[j] >= 0 && !s.placas[previo[j]].carga) j = previo[j];
      return s.placas[j].carga ? -1 : j;
    }
    for (const v of vecinos(i, cols, filas))
      if (previo[v] === -2 && !s.placas[v].hueca) {
        previo[v] = i;
        cola.push(v);
      }
  }
  return -1;
}
const motor = defineMotor({
  id: 'santabarbara.caliza',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'Toda placa hueca tiene grieta, pero no toda grieta es hueca. Sondeá (E) las dudosas y cargá (F) placas firmes conectadas desde la izquierda hasta el otro lado. Una placa hueca cargada se rompe.',
    ...controles('sondear'),
  },
  etapa: (p) => ({
    cols: 5 + Math.round(p.dif),
    filas: 3 + Math.round(p.dif),
    huecos: 0.35 + p.dif * 0.15,
    enganos: 0.15 + p.dif * 0.25,
    sondas: 3,
    rescate: p.tema.variante === 'la-montana-trae-burbujas',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    placas: [],
    cede: -1,
    sondas: p.sondas,
    espera: 0,
    mirando: 0,
    puestas: 0,
    rotas: 0,
    sueltas: 0,
    pasos: 0,
    sondeos: 0,
    intentos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos,
      { cols, filas } = m.parametros;
    if (!s.placas.length) tablero(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    if (input.take('use')) sondear(m);
    if (input.take('fire')) cargar(m);
    const q = s.placas[elegida(s, cols, filas)];
    m.objetivo = s.cede >= 0 ? 'Llegá con apoyos junto a la placa que cede' : 'Cargá un paso firme de lado a lado';
    m.lineas = [
      `Placa: ${q.sondeada ? (q.hueca ? 'hueca' : 'firme') : q.grieta ? 'con grieta (¿?)' : 'sin grieta'} · Sondas ${s.sondas}`,
      `Cargas ${s.puestas} · Pasos ${s.pasos} · Rotas ${s.rotas} · Sueltas ${s.sueltas}`,
    ];
    m.stats = {
      x: s.x,
      puestas: s.puestas,
      pasos: s.pasos,
      rotas: s.rotas,
      sueltas: s.sueltas,
      sondeos: s.sondeos,
      intentos: s.intentos,
    };
  },
  bot(m) {
    const s = m.datos,
      { cols, filas } = m.parametros;
    if (s.espera > 0 || s.mirando < 1 || !s.placas.length) return;
    const i = siguiente(s, cols, filas);
    if (i < 0) return;
    s.auto = true;
    s.x = ejeDe(i % cols, cols);
    s.y = ejeDe(Math.floor(i / cols), filas);
    // con grieta y sondas, primero la sondea
    if (s.placas[i].grieta && !s.placas[i].sondeada && s.sondas > 0) sondear(m);
    else cargar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      { cols, filas, rescate } = m.parametros,
      sel = elegida(s, cols, filas);
    const pos = (i: number, y: number): [number, number, number] => [
      -1 + ejeDe(i % cols, cols) * 3.9,
      y,
      -ejeDe(Math.floor(i / cols), filas) * 2.6 + 0.2,
    ];
    const ancho = 7.8 / cols - 0.12,
      hondo = 5.2 / filas - 0.12;
    return (
      <Mesa titulo={rescate ? 'Maroncho · la montaña trae burbujas' : 'Maroncho · placas de caliza'}>
        {s.placas.map((q, i) => {
          const p = pos(i, 0.8);
          return (
            <group key={i}>
              <Block
                pos={p}
                size={[ancho, 0.16, hondo]}
                color={
                  i === s.cede
                    ? '#c77dff'
                    : q.sondeada
                      ? q.hueca
                        ? '#6c584c'
                        : '#e9e4d8'
                      : i === sel
                        ? '#ffe8a3'
                        : '#c8c2b4'
                }
                mat="stone"
                solid={false}
              />
              {q.grieta && !q.sondeada && (
                <Block
                  pos={[p[0], 0.9, p[2]]}
                  size={[ancho * 0.7, 0.02, 0.06]}
                  rot={0.5 + (i % 3) * 0.4}
                  color="#3d3a35"
                  solid={false}
                />
              )}
              {q.carga && <Cyl pos={[p[0], 1.2, p[2]]} r={0.18} h={0.7} color="#e76f51" mat="cloth" solid={false} />}
              {i === s.cede &&
                [0, 1, 2].map((b) => (
                  <Ball
                    key={b}
                    pos={[p[0] - 0.3 + b * 0.3, 1 + ((m.tiempo * 0.6 + b * 0.33) % 1) * 0.5, p[2]]}
                    r={0.08}
                    color="#e0f7ff"
                  />
                ))}
            </group>
          );
        })}
        <Block pos={[...pos(sel, 1.5)] as [number, number, number]} size={[0.12, 1, 0.12]} color="#ffd166" mat="neon" />
        <Label pos={[-5.4, 1.4, 0]} text="Entrada" h={0.28} />
        <Label pos={[3.4, 1.4, -3.6]} text={`Sondas: ${s.sondas}`} h={0.3} />
      </Mesa>
    );
  },
});
export const Caliza = motor.Escena;
export const guia = motor.guia;
