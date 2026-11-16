import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Puntero } from './comun';

const TOPE = 0.72;
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  /** tensión de la cincha izquierda y derecha (0..1) */
  t: [number, number];
  /** el lomo carga más un lado: + izquierda, − derecha */
  sesgo: number;
  parejas: number;
  corridas: number;
  espera: number;
  aviso: string;
};
type Sesion = Motor<{ margen: number; semilla: number }, Estado>;
/** Apretar de más un lado corre el asiento hacia ese lado. */
const asiento = (s: Estado) => (Math.max(0, s.t[0] - TOPE) - Math.max(0, s.t[1] - TOPE)) * 3;
const presiones = (s: Estado) => {
  const o = asiento(s);
  return [s.t[0] + s.sesgo + o * 0.5, s.t[1] - o * 0.5] as const;
};
const desnivel = (s: Estado) => {
  const [a, b] = presiones(s);
  return Math.abs(a - b);
};
function nueva(s: Estado) {
  s.sesgo = (s.azar() < 0.5 ? -1 : 1) * (0.08 + s.azar() * 0.14);
  // el lado izquierdo arranca flojo (presión 0.25–0.38) y el derecho apretado: hay que leer el mapa
  s.t = [0.25 + s.azar() * 0.13 - s.sesgo, 0.62 + s.azar() * 0.08];
}
function ajustar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.9;
  const antes = desnivel(s),
    lado = s.x < 0 ? 0 : 1,
    previa = s.t[lado];
  s.t[lado] = (s.y + 1) / 2;
  const [a, b] = presiones(s);
  if (asiento(s) !== 0) {
    s.corridas++;
    s.aviso = 'Apretaste de más: el asiento se corrió';
    m.sumar(-15);
    return;
  }
  if (desnivel(s) <= m.parametros.margen && Math.min(a, b) >= 0.45 && Math.max(a, b) <= 0.7) {
    s.parejas++;
    s.aviso = '¡Contacto parejo! Siguiente montura';
    m.sumar(60);
    nueva(s);
    return;
  }
  if (Math.abs(previa - s.t[lado]) < 0.01) {
    s.aviso = 'Ese ajuste no cambió nada';
    m.sumar(-15);
  } else s.aviso = desnivel(s) < antes ? 'Vas mejor: seguí leyendo el mapa' : 'Así se desniveló más';
}
const motor = defineMotor({
  id: 'choluteca.cincha',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'A/D elegí la cincha izquierda o derecha. W/S tensión. F ajustá. Repartí la presión pareja sin apretar de más.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.07 - p.dif * 0.03, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      t: [0.4, 0.6],
      sesgo: 0,
      parejas: 0,
      corridas: 0,
      espera: 0,
      aviso: '',
    };
    nueva(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) ajustar(m);
    const [a, b] = presiones(s);
    m.objetivo = `Cincha ${s.x < 0 ? 'izquierda' : 'derecha'} a ${Math.round(((s.y + 1) / 2) * 100)}%`;
    m.lineas = [
      `Presión izquierda ${a.toFixed(2)} · derecha ${b.toFixed(2)} · Pareja: diferencia ≤ ${m.parametros.margen.toFixed(2)}, entre 0.45 y 0.70`,
      `Monturas parejas ${s.parejas} · Asientos corridos ${s.corridas} · ${s.aviso}`,
    ];
    m.stats = { x: s.x, y: s.y, parejas: s.parejas, corridas: s.corridas };
  },
  bot(m) {
    const s = m.datos,
      izquierda = 0.5 - s.sesgo;
    s.auto = true;
    const lado = Math.abs(s.t[0] - izquierda) > 0.01 ? 0 : 1;
    s.x = lado ? 0.6 : -0.6;
    s.y = (lado ? 0.5 : izquierda) * 2 - 1;
    ajustar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      [a, b] = presiones(s),
      color = (p: number) => (p > 0.7 ? '#d1495b' : p < 0.45 ? '#5e8fd1' : '#7fb069'),
      o = asiento(s);
    return (
      <Mesa titulo="Montura de San Marcos · Cuero que queda parejo">
        <Block pos={[-1, 1.3, -0.5]} size={[2.4, 1.1, 5]} color="#8a5a34" mat="cloth" solid={false} />
        <group position={[-1 - o * 0.8, 0, -0.5]}>
          <Block pos={[0, 1.95, 0]} size={[2.6, 0.22, 2.2]} color="#5a3d26" mat="wood" solid={false} />
          <Block pos={[0, 2.25, -0.8]} size={[1, 0.4, 0.3]} color="#5a3d26" mat="wood" solid={false} />
        </group>
        {[0, 1].map((i) => (
          <group key={i} position={[-1 + (i ? 1.35 : -1.35), 0, -0.5]}>
            <Block
              pos={[0, 1.2, 0]}
              size={[0.1, 1.2, 0.35 + s.t[i] * 0.4]}
              color={s.t[i] > TOPE ? '#d1495b' : '#c9a56b'}
              mat="cloth"
              solid={false}
            />
          </group>
        ))}
        {[a, b].map((p, i) => (
          <group key={i} position={[i ? 2.6 : -4.6, 0, -0.5]}>
            <Block pos={[0, 0.75 + p, 0]} size={[0.6, p * 2, 0.6]} color={color(p)} solid={false} />
            <Label pos={[0, 2.4, 0]} text={`${i ? 'Der.' : 'Izq.'} ${p.toFixed(2)}`} h={0.26} />
          </group>
        ))}
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Cincha = motor.Escena;
export const guia = motor.guia;
