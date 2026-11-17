import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, revolver } from './comun';

const PESOS = ['', '#d8c3a5', '#b08968', '#7f5539', '#5e3a1f'];
type Estado = ReturnType<typeof cursor> & {
  cola: number[];
  lados: [number[], number[]];
  contra: [boolean, boolean];
  puntillas: number;
  espera: number;
  listo: number;
  cayo: boolean;
  arcos: number;
  colapsos: number;
  llenos: number;
  azar: () => number;
};
type Sesion = Motor<{ dovelas: number; tolerancia: number; espuma: boolean; seed: number }, Estado>;
const suma = (l: number[]) => l.reduce((t, x) => t + x, 0);
/** empuje: izquierda menos derecha */
const empuje = (s: Estado) => suma(s.lados[0]) - suma(s.lados[1]);
/** aguanta si el desbalance no pasa la tolerancia; un contrafuerte del lado pesado aguanta uno más */
const aguanta = (d: number, contra: [boolean, boolean], tol: number) =>
  Math.abs(d) <= tol + (d > 0 && contra[0] ? 1 : d < 0 && contra[1] ? 1 : 0);
function nuevo(m: Sesion) {
  const s = m.datos,
    mitad = m.parametros.dovelas / 2,
    peso = () => 1 + Math.floor(s.azar() * 3);
  // se arma una partición exacta: las dos mitades pesan lo mismo, así que siempre hay solución
  let a: number[] = [],
    b: number[] = [];
  do {
    a = Array.from({ length: mitad }, peso);
    b = Array.from({ length: mitad }, peso);
  } while (suma(a) !== suma(b));
  s.cola = revolver([...a, ...b], s.azar);
  s.lados = [[], []];
  s.contra = [false, false];
  s.puntillas = m.parametros.espuma ? 2 + Math.floor(s.azar() * (m.parametros.dovelas - 4)) : -1;
  s.cayo = false;
}
/** el mejor desbalance final que se puede lograr con lo que falta, sabiendo cuánto cabe de cada lado */
function mejorFinal(d: number, cola: number[], libres: [number, number]): number {
  if (!cola.length) return Math.abs(d);
  const [w, ...resto] = cola;
  let mejor = Infinity;
  if (libres[0] > 0) mejor = Math.min(mejor, mejorFinal(d + w, resto, [libres[0] - 1, libres[1]]));
  if (libres[1] > 0) mejor = Math.min(mejor, mejorFinal(d - w, resto, [libres[0], libres[1] - 1]));
  return mejor;
}
function poner(m: Sesion, lado: 0 | 1) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.35;
  if (!s.cola.length) {
    retirar(m);
    return;
  }
  if (s.lados[lado].length >= m.parametros.dovelas / 2) {
    s.llenos++;
    m.sumar(-10);
    toast('Ese lado del arco ya tiene todas sus dovelas.', '🧱');
    return;
  }
  s.lados[lado].push(s.cola.shift() ?? 1);
  m.sumar(3);
  const puestas = s.lados[0].length + s.lados[1].length;
  if (puestas === s.puntillas) {
    const l = s.lados[0].length && (s.azar() < 0.5 || !s.lados[1].length) ? 0 : 1,
      i = Math.floor(s.azar() * s.lados[l].length);
    s.lados[l][i] = Math.min(4, s.lados[l][i] + 1);
    toast('¡Una dovela de espuma se puso de puntillas y ahora empuja más!', '🩰');
  }
}
function contrafuerte(m: Sesion, lado: 0 | 1) {
  const s = m.datos;
  if (s.espera > 0 || s.listo > 0 || s.contra[lado]) return;
  s.espera = 0.35;
  s.contra[lado] = true;
  m.sumar(-5);
}
function retirar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast,
    d = empuje(s);
  s.listo = 1.4;
  if (aguanta(d, s.contra, m.parametros.tolerancia)) {
    s.arcos++;
    m.sumar(s.contra[0] || s.contra[1] ? 80 : 90);
    if (m.parametros.espuma && s.arcos % 3 === 0) {
      m.sumar(20);
      toast('¡Las tres naves quedaron de pie!', '⛪');
    } else toast('Quitaste la cimbra y la bóveda aguantó.', '🌀');
    return;
  }
  s.colapsos++;
  s.cayo = true;
  m.sumar(-40);
  toast(`Se abrió la bóveda: empuja ${Math.abs(d)} de más hacia la ${d > 0 ? 'izquierda' : 'derecha'}.`, '💥');
}
const motor = defineMotor({
  id: 'ocotepeque.boveda',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'Cada dovela tiene su peso. Apuntá a un lado del arco y F la pone ahí; los dos lados llevan las mismas dovelas. E pone un contrafuerte de ese lado. Con todas puestas, F retira la cimbra: si un lado empuja más, la bóveda se abre.',
    ...controles('contrafuerte'),
  },
  etapa: (p) => ({
    dovelas: 6 + 2 * Math.round(p.dif * 2),
    tolerancia: p.dif > 0.6 ? 0 : 1,
    espuma: p.tema.variante === 'la-boveda-anda-de-puntillas',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    cola: [],
    lados: [[], []],
    contra: [false, false],
    puntillas: -1,
    espera: 0,
    listo: 0,
    cayo: false,
    arcos: 0,
    colapsos: 0,
    llenos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.cola.length && !s.lados[0].length && !s.lados[1].length) nuevo(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) nuevo(m);
    }
    const lado = s.x < 0 ? 0 : 1;
    if (input.take('use')) contrafuerte(m, lado);
    if (input.take('fire')) poner(m, lado);
    const d = empuje(s);
    m.objetivo = s.cola.length
      ? `Dovela de peso ${s.cola[0]} → lado ${lado ? 'derecho' : 'izquierdo'}`
      : 'Todas puestas: F retira la cimbra';
    m.lineas = [
      `Izquierda ${suma(s.lados[0])} · Derecha ${suma(s.lados[1])} · Aguanta ±${m.parametros.tolerancia}${s.contra[0] || s.contra[1] ? ' + contrafuerte' : ''}`,
      `Bóvedas ${s.arcos} · Colapsos ${s.colapsos} · Desbalance ${d > 0 ? '+' : ''}${d}`,
    ];
    m.stats = {
      contras: (s.contra[0] ? 1 : 0) + (s.contra[1] ? 1 : 0),
      x: s.x,
      arcos: s.arcos,
      colapsos: s.colapsos,
      llenos: s.llenos,
      puestas: s.lados[0].length + s.lados[1].length,
    };
  },
  bot(m) {
    const s = m.datos,
      p = m.parametros;
    if (s.espera > 0 || s.listo > 0 || (!s.cola.length && !s.lados[0].length)) return;
    s.auto = true;
    const mitad = p.dovelas / 2,
      d = empuje(s);
    if (!s.cola.length) {
      const pesado = d > 0 ? 0 : 1;
      if (!aguanta(d, s.contra, p.tolerancia) && !s.contra[pesado]) {
        s.x = pesado ? 0.6 : -0.6;
        contrafuerte(m, pesado);
        return;
      }
      poner(m, 0);
      return;
    }
    const [w, ...resto] = s.cola,
      libres: [number, number] = [mitad - s.lados[0].length, mitad - s.lados[1].length];
    const izq = libres[0] > 0 ? mejorFinal(d + w, resto, [libres[0] - 1, libres[1]]) : Infinity,
      der = libres[1] > 0 ? mejorFinal(d - w, resto, [libres[0], libres[1] - 1]) : Infinity,
      lado = izq <= der ? 0 : 1;
    s.x = lado ? 0.6 : -0.6;
    poner(m, lado);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      mitad = m.parametros.dovelas / 2,
      lado = s.x < 0 ? 0 : 1,
      caida = s.cayo ? Math.min(1, (1.4 - s.listo) * 2) : 0,
      R = 1.9,
      cy = 0.75;
    return (
      <Mesa titulo="Maqueta de bóveda · Belén Gualcho">
        {/* apoyos y contrafuertes */}
        {[0, 1].map((l) => (
          <group key={l}>
            <Block
              pos={[-1 + (l ? 1 : -1) * R, cy + 0.35, -0.6]}
              size={[0.7, 0.7, 0.8]}
              color={l === lado ? '#ffd166' : '#c9b79c'}
              mat="stone"
              solid={false}
            />
            {s.contra[l] && (
              <Block
                pos={[-1 + (l ? 1 : -1) * (R + 0.75), cy + 0.6, -0.6]}
                size={[0.5, 1.2, 0.7]}
                color="#a68a64"
                mat="stone"
                solid={false}
              />
            )}
          </group>
        ))}
        {/* cimbra de madera mientras no se retira */}
        {s.listo <= 0 && (
          <group position={[-1, cy + 0.7, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
            <Cyl pos={[0, 0, 0]} r={R - 0.4} h={0.3} color="#8d5a2b" mat="wood" solid={false} />
          </group>
        )}
        {s.lados.map((dovelas, l) =>
          dovelas.map((w, j) => {
            const a = l === 0 ? Math.PI - ((j + 0.5) / mitad) * (Math.PI / 2) : ((j + 0.5) / mitad) * (Math.PI / 2);
            return (
              <group
                key={`${l}-${j}`}
                position={[
                  -1 + Math.cos(a) * R,
                  cy + 0.7 + Math.sin(a) * R - caida * 1.4,
                  -0.6 + caida * (j % 2 ? 0.4 : -0.4),
                ]}
                rotation={[0, 0, a - Math.PI / 2 + caida * (l ? -0.8 : 0.8)]}
              >
                <Block pos={[0, 0, 0]} size={[0.32 + w * 0.06, 0.5, 0.7]} color={PESOS[w]} mat="stone" solid={false} />
              </group>
            );
          }),
        )}
        {/* fila de dovelas que faltan; la primera es la que sigue */}
        {s.cola.map((w, i) => (
          <Block
            key={i}
            pos={[-4.4 + i * 0.6, 0.8 + w * 0.08, 2.6]}
            size={[0.45, w * 0.16, 0.45]}
            color={i === 0 ? '#ffd166' : PESOS[w]}
            mat="stone"
            solid={false}
          />
        ))}
        {s.cola.length > 0 && <Label pos={[-4.4, 1.6, 2.6]} text={`Sigue: peso ${s.cola[0]}`} h={0.3} />}
        <Label
          pos={[-1, 3.6, -0.6]}
          text={
            s.listo > 0
              ? s.cayo
                ? '¡Se abrió! 💥'
                : '¡Aguantó! 🌀'
              : `Izq ${suma(s.lados[0])} · Der ${suma(s.lados[1])}`
          }
          h={0.42}
        />
      </Mesa>
    );
  },
});
export const Boveda = motor.Escena;
export const guia = motor.guia;
