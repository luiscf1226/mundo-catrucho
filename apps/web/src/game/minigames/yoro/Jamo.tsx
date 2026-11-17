import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

/** −1 izquierda, 1 derecha, 0 sigue recto */
type Esquina = { dir: -1 | 0 | 1; t: number; giro: boolean; cola: number; hecha: boolean };
type Estado = ReturnType<typeof cursor> & {
  esquina: Esquina | null;
  espera: number;
  racha: number;
  curvas: number;
  rozones: number;
  ciegas: number;
  colas: number;
  azar: () => number;
};
type Param = { largo: number; senal: number; mirar: number; cola: boolean; seed: number };
type Sesion = Motor<Param, Estado>;
const LADO = ['izquierda', 'recto', 'derecha'];
const lado = (x: number): -1 | 0 | 1 => (x < -0.3 ? -1 : x > 0.3 ? 1 : 0);
function nueva(m: Sesion) {
  const s = m.datos,
    r = s.azar();
  s.esquina = { dir: r < 0.18 ? 0 : r < 0.59 ? -1 : 1, t: 0, giro: false, cola: -1, hecha: false };
}
function termina(m: Sesion) {
  const s = m.datos,
    e = s.esquina,
    p = m.parametros;
  if (!e) return;
  if (e.dir !== 0 && !e.giro) {
    s.rozones++;
    s.racha = 0;
    m.sumar(-20);
    useGame.getState().toast('No doblaste: el Jamo rozó la caseta.', '🎪');
  } else if (p.cola && e.dir !== 0 && e.cola >= 0 && !e.hecha) {
    s.racha = 0;
    m.sumar(-15);
    useGame.getState().toast('La cabeza dobló, pero la cola se quedó pegada a la caseta.', '🦎');
  }
  nueva(m);
}
function doblar(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    e = s.esquina,
    toast = useGame.getState().toast,
    d = lado(s.x);
  if (!e || s.espera > 0 || d === 0) return;
  s.espera = 0.3;
  // segunda vuelta: la cola tiene que doblar cuando llega a la misma esquina
  if (p.cola && e.giro && e.dir !== 0) {
    if (e.hecha) return;
    if (d !== e.dir || e.cola > 0) {
      e.hecha = true;
      s.racha = 0;
      m.sumar(-15);
      toast('La cola dobló antes de llegar a la esquina.', '🦎');
      return;
    }
    e.hecha = true;
    s.colas++;
    m.sumar(20);
    return;
  }
  if (e.giro) return;
  e.giro = true;
  if (e.t < p.senal + p.mirar) {
    s.ciegas++;
    s.racha = 0;
    m.sumar(-25);
    toast('Giraste sin mirar la cola: se tapó la salida.', '🙈');
    return;
  }
  if (d !== e.dir) {
    s.rozones++;
    s.racha = 0;
    m.sumar(-25);
    toast(e.dir === 0 ? 'Era recto: rozaste una caseta.' : 'Del otro lado: rozaste una caseta.', '🎪');
    return;
  }
  s.curvas++;
  s.racha++;
  e.cola = 0.9;
  m.sumar(40 + Math.min(30, (s.racha - 1) * 10));
}
const motor = defineMotor({
  id: 'yoro.jamo',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'feria',
  guia: {
    goal: 'Desde adentro del Jamo de utilería casi no ves. Mirá la cola: se mueve hacia donde viene la curva. Esperá la señal, poné el lado con A/D y F dobla. Si es recto, no dobles.',
    ...controles(),
  },
  etapa: (p) => {
    const cola = p.tema.variante === 'la-cola-llego-antes';
    return {
      largo: 3.2 - p.dif * 1 + (cola ? 0.9 : 0),
      senal: 0.5,
      mirar: 0.5 - p.dif * 0.1,
      cola,
      seed: p.seed,
    };
  },
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    esquina: null,
    espera: 0,
    racha: 0,
    curvas: 0,
    rozones: 0,
    ciegas: 0,
    colas: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    if (!s.esquina) nueva(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    const e = s.esquina;
    if (e) {
      e.t += dt;
      if (e.cola > 0) e.cola = Math.max(0, e.cola - dt);
      if (e.t >= p.largo) termina(m);
    }
    if (input.take('fire')) doblar(m);
    const v = s.esquina,
      visible = v && v.t >= p.senal;
    m.objetivo = !v
      ? 'Desfile'
      : v.giro && p.cola && v.dir !== 0 && !v.hecha
        ? v.cola > 0
          ? 'Esperá que la cola llegue a la esquina'
          : '¡Ahora doblá la cola!'
        : visible
          ? `La cola señala: ${LADO[v.dir + 1]}`
          : 'Mirá la cola…';
    m.lineas = [
      `Vas: ${LADO[lado(s.x) + 1]} · Racha ${s.racha}`,
      `Curvas ${s.curvas} · Rozones ${s.rozones} · A ciegas ${s.ciegas}${p.cola ? ` · Colas ${s.colas}` : ''}`,
    ];
    m.stats = { x: s.x, curvas: s.curvas, rozones: s.rozones, ciegas: s.ciegas, colas: s.colas, racha: s.racha };
  },
  bot(m) {
    const s = m.datos,
      p = m.parametros,
      e = s.esquina;
    if (!e || s.espera > 0 || e.dir === 0) return;
    s.auto = true;
    if (!e.giro) {
      if (e.t < p.senal + p.mirar + 0.15) return;
      s.x = e.dir * 0.8;
      doblar(m);
      return;
    }
    if (p.cola && !e.hecha && e.cola <= 0) {
      s.x = e.dir * 0.8;
      doblar(m);
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      p = m.parametros,
      e = s.esquina,
      visible = !!e && e.t >= p.senal,
      d = lado(s.x),
      avance = e ? Math.min(1, e.t / p.largo) : 0,
      meneo = visible && e ? e.dir * 0.5 : 0;
    return (
      <Mesa titulo={p.cola ? 'Desfile del Jamo · cabeza y cola' : 'Desfile del Jamo · campo visual estrecho'}>
        {/* calle con casetas a los lados; la esquina se acerca */}
        <Block pos={[-1, 0.72, 0]} size={[3, 0.03, 7.6]} color="#b8a07e" mat="cobble" solid={false} />
        {[-1, 1].map((l) =>
          [0, 1, 2].map((j) => (
            <Block
              key={`${l}${j}`}
              pos={[-1 + l * 2.2, 1.05, -3 + j * 2.4 + avance * 2.4]}
              size={[1.1, 0.65, 1.6]}
              color={['#e76f51', '#2a9d8f', '#f4a261'][j]}
              mat="cloth"
              solid={false}
            />
          )),
        )}
        {e && visible && e.dir !== 0 && (
          <Block
            pos={[-1 + e.dir * 2.2, 0.73, -3.2 + avance * 2.4]}
            size={[1.6, 0.03, 1.2]}
            color="#b8a07e"
            mat="cobble"
            solid={false}
          />
        )}
        {/* niebla: lo que el Jamo no ve */}
        <mesh position={[-1, 1.4, -2.6]}>
          <boxGeometry args={[5.4, 1.4, 2.4]} />
          <meshBasicMaterial color="#f8f9fa" transparent opacity={visible ? 0.35 : 0.8} depthWrite={false} />
        </mesh>
        {/* el Jamo: cabeza, cuerpo y cola de utilería */}
        <group position={[-1, 0, 1.4]} rotation={[0, (e?.giro ? -e.dir : -d * 0.3) * 0.5, 0]}>
          <Ball pos={[0, 1.05, -0.6]} r={0.32} color="#3a7d44" mat="cloth" />
          <Ball pos={[-0.12, 1.25, -0.82]} r={0.06} color="#ffffff" />
          <Ball pos={[0.12, 1.25, -0.82]} r={0.06} color="#ffffff" />
          <Cyl pos={[0, 1.0, 0.1]} r={0.28} h={1.1} color="#4c956c" mat="cloth" solid={false} />
          {[0, 1, 2, 3].map((j) => (
            <Ball
              key={j}
              pos={[meneo * (j + 1) * 0.35, 0.95 - j * 0.04, 0.8 + j * 0.35]}
              r={0.2 - j * 0.035}
              color={visible && j === 3 ? '#ffd166' : '#5aa469'}
              mat="cloth"
            />
          ))}
        </group>
        <Label
          pos={[-1, 3.2, -2.6]}
          text={
            !e ? '🦎' : visible ? `Cola: ${['⬅️ izquierda', '⬆️ recto', '➡️ derecha'][e.dir + 1]}` : '🦎 Mirá la cola…'
          }
          h={0.42}
        />
        <Label pos={[-1, 2.6, 2.6]} text={`Vas: ${LADO[d + 1]}`} h={0.3} />
      </Mesa>
    );
  },
});
export const Jamo = motor.Escena;
export const guia = motor.guia;
