import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  izq: number;
  der: number;
  tramos: number[];
  tramo: number;
  avance: number;
  incl: number;
  peor: number;
  giroRueda: number;
  vueltas: number;
  salidas: number;
  pedaladas: { izq: number; der: number };
  azar: () => number;
};
type Sesion = Motor<{ largo: number; carga: number; hamaca: boolean; seed: number }, Estado>;
const MAX = 3;
const curva = (s: Estado) => s.tramos[s.tramo % s.tramos.length];
const velocidad = (s: Estado) => (s.izq + s.der) / 2;
/** diferencia entre ruedas: positiva dobla a la izquierda (la derecha empuja más) */
const diferencia = (s: Estado) => (s.der - s.izq) / (s.izq + s.der + 0.3);
/** lo que empuja la cabina hacia afuera: curva, carga y, en la locura, la hamaca y los ronquidos */
function empuje(m: Sesion) {
  const s = m.datos,
    c = curva(s);
  let e = c * velocidad(s) * 0.12 * m.parametros.carga;
  if (m.parametros.hamaca)
    e += Math.sin(m.tiempo * 1.3) * 0.45 + (c ? c * 0.25 * (Math.sin(m.tiempo * 0.7) > 0 ? 1 : 0) : 0);
  return e;
}
function pedal(s: Estado, lado: 'izq' | 'der') {
  s[lado] = Math.min(MAX, s[lado] + 0.45);
  s.pedaladas[lado]++;
}
const motor = defineMotor({
  id: 'valle.bicitaxi',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'costa',
  guia: {
    goal: 'E pedalea la rueda izquierda y F la derecha. Para doblar a la izquierda empujá más la derecha. Con A/D inclinate para centrar la carga.',
    keys: [
      ['E · mando X', 'pedal izquierdo'],
      ['F · RT', 'pedal derecho'],
      ['A / D · stick derecho', 'inclinarte'],
    ],
    touch: [
      ['E', 'pedal izquierdo'],
      ['🎯', 'pedal derecho'],
      ['Palanca', 'inclinarte'],
    ],
  },
  etapa: (p) => ({
    largo: 5 + p.dif,
    carga: 1 + p.dif * 0.8,
    hamaca: p.tema.variante === 'el-pasajero-trajo-una-hamaca',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const azar = rng(p.seed);
    return {
      ...cursor(),
      izq: 0,
      der: 0,
      tramos: [0, ...Array.from({ length: 40 }, () => Math.floor(azar() * 3) - 1)],
      tramo: 0,
      avance: 0,
      incl: 0,
      peor: 0,
      giroRueda: 0,
      vueltas: 0,
      salidas: 0,
      pedaladas: { izq: 0, der: 0 },
      azar,
    };
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    if (input.take('use')) pedal(s, 'izq');
    if (input.take('fire')) pedal(s, 'der');
    for (const lado of ['izq', 'der'] as const) s[lado] = Math.max(0, s[lado] - (s[lado] * 0.35 + 0.1) * dt);
    const c = curva(s),
      error = diferencia(s) - c * 0.5,
      meta = error * 1.6 + empuje(m) - s.x;
    s.incl += (meta - s.incl) * Math.min(1, dt * 3);
    s.peor = Math.max(s.peor, Math.abs(s.incl));
    s.avance += velocidad(s) * dt;
    s.giroRueda += velocidad(s) * dt * 3;
    if (Math.abs(s.incl) > 1) {
      s.salidas++;
      s.izq = s.der = 0;
      s.avance = 0;
      s.incl = 0;
      s.peor = 0;
      m.sumar(-35);
      useGame.getState().toast('¡Se salió del trazado! Repartí los pedales.', '🚲');
    } else if (s.avance >= m.parametros.largo) {
      m.sumar(c ? 35 : 20);
      s.vueltas++;
      s.tramo++;
      s.avance = 0;
      s.peor = 0;
    }
    const sig = curva(s);
    m.objetivo =
      sig === 0
        ? 'Recta: pedaleá parejo'
        : `Curva a la ${sig > 0 ? 'izquierda: más derecha' : 'derecha: más izquierda'}`;
    m.lineas = [
      `Rueda izq ${s.izq.toFixed(1)} · der ${s.der.toFixed(1)} · Cabina ${Math.round(s.incl * 100)}%`,
      `Tramos ${s.vueltas} · Salidas ${s.salidas} · Inclinación tuya ${s.x.toFixed(2)}`,
    ];
    m.stats = { x: s.x, tramos: s.vueltas, salidas: s.salidas, izq: s.pedaladas.izq, der: s.pedaladas.der };
  },
  bot(m) {
    const s = m.datos,
      c = curva(s),
      base = c ? 2 : 2.4,
      d = c * 0.5;
    s.auto = true;
    s.x = Math.max(-1, Math.min(1, empuje(m) + (diferencia(s) - d) * 1.6));
    if (s.izq < base * (1 - d) - 0.15) pedal(s, 'izq');
    if (s.der < base * (1 + d) - 0.15) pedal(s, 'der');
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      c = curva(s);
    return (
      <Mesa
        titulo={
          m.parametros.hamaca ? 'Bicitaxi con hamaca · No despertés al pasajero' : 'Bicitaxi de Amapala · Dos pedales'
        }
      >
        {[0, 1, 2, 3].map((k) => {
          const t = s.tramos[(s.tramo + k) % s.tramos.length];
          return (
            <group key={k} position={[-1 - k * t * 0.35, 0.74, 1.5 - k * 1.6]} rotation={[0, t * 0.35 * k, 0]}>
              <Block
                pos={[0, 0, 0]}
                size={[2.4, 0.06, 1.5]}
                color={k ? '#8b8f92' : '#a7aaa9'}
                mat="asphalt"
                solid={false}
              />
              <Block pos={[0, 0.04, 0]} size={[0.12, 0.04, 0.9]} color="#f2d24b" solid={false} />
            </group>
          );
        })}
        <group position={[-1, 0.8, 2.2]} rotation={[0, 0, -s.incl * 0.45]}>
          <Block pos={[0, 0.9, 0.2]} size={[1.5, 0.9, 1]} color="#2a9d8f" mat="metal" solid={false} />
          <Block pos={[0, 1.5, 0.2]} size={[1.7, 0.08, 1.2]} color="#e9c46a" mat="cloth" solid={false} />
          <Ball pos={[0, 1.2, 0.3]} r={0.22} color="#a56b43" />
          {[-0.8, 0.8].map((x) => (
            <group key={x} position={[x, 0.35, 0.6]} rotation={[s.giroRueda * (x < 0 ? s.izq : s.der), 0, Math.PI / 2]}>
              <Cyl
                pos={[0, 0, 0]}
                r={0.35}
                h={0.12}
                color={x < 0 ? '#e76f51' : '#457b9d'}
                mat="plastic"
                solid={false}
              />
            </group>
          ))}
          <group position={[0, 0.3, -0.8]} rotation={[0, 0, Math.PI / 2]}>
            <Cyl pos={[0, 0, 0]} r={0.3} h={0.1} color="#333333" mat="plastic" solid={false} />
          </group>
          {m.parametros.hamaca && (
            <group position={[0, 1.4, 0.2]} rotation={[0, 0, Math.sin(m.tiempo * 1.3) * 0.5]}>
              <Block pos={[0, -0.35, 0]} size={[1.2, 0.08, 0.5]} color="#e63946" mat="cloth" solid={false} />
              <Label pos={[0.6, 0.6 + ((m.tiempo * 0.5) % 1) * 0.5, 0]} text="zzz ☁️" h={0.28} />
            </group>
          )}
        </group>
        <Label
          pos={[-1, 3.4, -1.5]}
          text={c === 0 ? '⬆️ Recta' : c > 0 ? '⬅️ Curva izquierda' : 'Curva derecha ➡️'}
          h={0.42}
        />
        <Block
          pos={[3.4, 0.75 + (s.izq / MAX) * 0.8, 1]}
          size={[0.35, (s.izq / MAX) * 1.6 + 0.02, 0.35]}
          color="#e76f51"
          solid={false}
        />
        <Block
          pos={[4.1, 0.75 + (s.der / MAX) * 0.8, 1]}
          size={[0.35, (s.der / MAX) * 1.6 + 0.02, 0.35]}
          color="#457b9d"
          solid={false}
        />
      </Mesa>
    );
  },
});
export const Bicitaxi = motor.Escena;
export const guia = motor.guia;
