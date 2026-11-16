// «Mazorcas como engranajes»: una sola rueda motriz gira; enganchá cada mazorca cuando su leva pasa por la marca,
// con el sentido de transmisión correcto. Invertida, la figura se cierra antes de tiempo.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Figura = { fase: number; sentido: 1 | -1 };
type Estado = ReturnType<typeof cursor> & {
  giro: number;
  figuras: Figura[];
  actual: number;
  vueltas: number;
  invertidas: number;
  fallas: number;
  sorteo: () => number;
};
type Parametros = { n: number; velocidad: number; tolerancia: number; retardos: boolean; semilla: number };
type Sesion = Motor<Parametros, Estado>;
const TAU = Math.PI * 2;
const distancia = (a: number, b: number) => {
  const d = (((a - b) % TAU) + TAU) % TAU;
  return Math.min(d, TAU - d);
};
function armar(s: Estado, par: Parametros) {
  const base = s.sorteo() * TAU,
    retardo = 1.2 + s.sorteo() * 0.8;
  s.figuras = Array.from({ length: par.n }, (_, k) => ({
    // con retardos, las tres figuras saludan una detrás de otra a pasos fijos de la rueda
    fase: par.retardos ? (base + k * retardo) % TAU : s.sorteo() * TAU,
    sentido: s.sorteo() < 0.5 ? 1 : -1,
  }));
  s.actual = 0;
}
function enganchar(m: Sesion) {
  const s = m.datos,
    f = s.figuras[s.actual];
  if (s.espera > 0) return;
  s.espera = 0.4;
  if (Math.abs(s.x) <= 0.3) {
    m.sumar(-10);
    return;
  }
  if ((s.x > 0 ? 1 : -1) !== f.sentido) {
    s.invertidas++;
    m.sumar(-35);
    useGame.getState().toast('Transmisión invertida: la figura se cerró antes de tiempo.', '🌽');
    return;
  }
  if (distancia(s.giro, f.fase) > m.parametros.tolerancia) {
    s.fallas++;
    m.sumar(-20);
    return;
  }
  m.sumar(20);
  s.actual++;
  if (s.actual >= s.figuras.length) {
    s.vueltas++;
    m.sumar(60);
    s.espera = 1.2;
    armar(s, m.parametros);
  }
}
const motor = defineMotor({
  id: 'elparaiso.carrozamaiz',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'feria',
  guia: {
    goal: 'A/D elegí el sentido de la transmisión (↺ o ↻). Cuando la leva de la rueda pase por la marca de la mazorca, F enganchá.',
    ...controles,
  },
  etapa: (p) => {
    const retardos = p.tema.variante === 'la-mazorca-desfila-sola';
    return {
      n: retardos ? 3 : 3 + Math.round(p.dif * 2),
      velocidad: 1.5 + p.dif * 0.9,
      tolerancia: 0.45 - p.dif * 0.2,
      retardos,
      semilla: p.seed + 5,
    };
  },
  metas,
  duracion,
  crear: (par) => {
    const s: Estado = {
      ...cursor(),
      giro: 0,
      figuras: [],
      actual: 0,
      vueltas: 0,
      invertidas: 0,
      fallas: 0,
      sorteo: rng(par.semilla),
    };
    armar(s, par);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.giro = (s.giro + dt * m.parametros.velocidad) % TAU;
    if (input.take('fire')) enganchar(m);
    const f = s.figuras[s.actual];
    m.objetivo = `Mazorca ${s.actual + 1}/${s.figuras.length} · sentido ${f.sentido > 0 ? '↻ (D)' : '↺ (A)'}`;
    m.lineas = [
      `Sentido elegido ${Math.abs(s.x) <= 0.3 ? 'ninguno' : s.x > 0 ? '↻' : '↺'} · Leva a ${Math.round((distancia(s.giro, f.fase) * 180) / Math.PI)}° de la marca`,
      `Secuencias completas ${s.vueltas} · Invertidas ${s.invertidas} · Fuera de tiempo ${s.fallas}`,
    ];
    m.stats = { x: s.x, vueltas: s.vueltas, invertidas: s.invertidas, actual: s.actual };
  },
  bot(m) {
    const s = m.datos,
      f = s.figuras[s.actual];
    s.auto = true;
    s.x = 0.7 * f.sentido;
    if (s.espera <= 0 && distancia(s.giro, f.fase) < 0.12) enganchar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      R = 2.1,
      W: [number, number] = [-3, 0];
    return (
      <Mesa
        titulo={
          m.parametros.retardos ? 'La mazorca desfila sola · Tres saludos' : 'Maíz convertido en carroza · Una rueda'
        }
      >
        <Cyl pos={[W[0], 0.78, W[1]]} r={R} h={0.1} color="#8a5a34" mat="wood" solid={false} sides={28} />
        <Cyl pos={[W[0], 0.9, W[1]]} r={0.35} h={0.2} color="#5a5f66" mat="metal" solid={false} />
        <Block
          pos={[W[0] + Math.cos(s.giro) * R * 0.5, 0.92, W[1] - Math.sin(s.giro) * R * 0.5]}
          size={[R, 0.1, 0.22]}
          rot={s.giro}
          color="#ffe066"
          mat="neon"
          solid={false}
        />
        {s.figuras.map((f, k) => (
          <Ball
            key={`m${k}`}
            pos={[W[0] + Math.cos(f.fase) * (R + 0.25), 0.95, W[1] - Math.sin(f.fase) * (R + 0.25)]}
            r={k === s.actual ? 0.26 : 0.16}
            color={k < s.actual ? '#6aa842' : k === s.actual ? '#ff7f50' : '#d8cfc0'}
          />
        ))}
        {s.figuras.map((f, k) => {
          const abierta = k < s.actual,
            x = 0.6 + k * 0.85;
          return (
            <group key={`f${k}`} position={[x, 0, -0.6]}>
              <Cyl pos={[0, 1.4, 0]} r={0.26} rTop={0.16} h={1.2} color="#f6d55c" solid={false} />
              <group position={[-0.22, 0.95, 0]} rotation={[0, 0, abierta ? 0.9 : 0.1]}>
                <Block pos={[0, 0.5, 0]} size={[0.1, 1, 0.34]} color="#6aa842" mat="leaf" solid={false} />
              </group>
              <group position={[0.22, 0.95, 0]} rotation={[0, 0, abierta ? -0.9 : -0.1]}>
                <Block pos={[0, 0.5, 0]} size={[0.1, 1, 0.34]} color="#6aa842" mat="leaf" solid={false} />
              </group>
              <Label
                pos={[0, 2.4, 0]}
                text={f.sentido > 0 ? '↻' : '↺'}
                h={0.5}
                fg={k === s.actual ? '#ffe066' : undefined}
              />
            </group>
          );
        })}
        {m.parametros.retardos && (
          <group position={[-1 + Math.sin(m.tiempo * 0.8) * 2.5, 0, 2.4]}>
            <Cyl pos={[0, 1.3, 0]} r={0.3} rTop={0.2} h={1} color="#ffd23f" mat="plastic" solid={false} />
            <Block pos={[-0.15, 0.78, 0.1]} size={[0.2, 0.12, 0.38]} color="#c0392b" solid={false} />
            <Block pos={[0.15, 0.78, 0.1]} size={[0.2, 0.12, 0.38]} color="#c0392b" solid={false} />
            <Label pos={[0, 2.1, 0]} text="👟 Mazorca de espuma" h={0.34} />
          </group>
        )}
        <Label pos={[W[0], 2.1, W[1]]} text={`Vueltas ${s.vueltas}`} h={0.42} />
      </Mesa>
    );
  },
});
export const Carroza = motor.Escena;
export const guia = motor.guia;
