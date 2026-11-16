import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { columna, controles, cursor, duracion, Mesa, metas, mover, Puntero, xDe } from './comun';

const FILAS = ['Adelante', 'En medio', 'Última fila'];
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  abiertas: [boolean, boolean, boolean];
  deflector: [number, number, number];
  /** viento que entra en esta curva: − desde la izquierda, + desde la derecha */
  viento: number;
  acalorado: number;
  curva: number;
  frescas: number;
  papeles: number;
  espera: number;
  vuelan: number;
};
type Sesion = Motor<{ curva: number; margen: number; semilla: number }, Estado>;
const abiertas = (s: Estado) => s.abiertas.filter(Boolean).length;
function nuevaCurva(s: Estado) {
  s.viento = (s.azar() < 0.5 ? -1 : 1) * (0.35 + s.azar() * 0.5);
  s.acalorado = Math.floor(s.azar() * 3);
}
function manejar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.5;
  const f = columna(s.x);
  if (!s.abiertas[f]) {
    s.abiertas[f] = true;
    s.deflector[f] = s.y;
  } else if (Math.abs(s.deflector[f] - s.y) < 0.1) s.abiertas[f] = false;
  else s.deflector[f] = s.y;
}
function evaluar(m: Sesion) {
  const s = m.datos,
    f = s.acalorado;
  if (abiertas(s) === 3) {
    s.papeles++;
    s.vuelan = 1.5;
    m.sumar(-40);
  } else if (s.abiertas[f] && Math.abs(s.deflector[f] + s.viento) <= m.parametros.margen) {
    s.frescas++;
    m.sumar(60);
  } else m.sumar(-10);
  s.curva = m.parametros.curva;
  nuevaCurva(s);
}
const motor = defineMotor({
  id: 'choluteca.ventanasbus',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ciudad',
  guia: {
    goal: 'A/D elegí fila. W/S ángulo del deflector contra el viento. F abre o ajusta; F con el mismo ángulo cierra. Nunca las tres.',
    ...controles,
  },
  etapa: (p) => ({ curva: 4 - p.dif * 0.5, margen: 0.22 - p.dif * 0.08, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      abiertas: [false, false, false],
      deflector: [0, 0, 0],
      viento: 0.5,
      acalorado: 0,
      curva: p.curva,
      frescas: 0,
      papeles: 0,
      espera: 0,
      vuelan: 0,
    };
    nuevaCurva(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.vuelan = Math.max(0, s.vuelan - dt);
    if (input.take('fire')) manejar(m);
    s.curva -= dt;
    if (s.curva <= 0) evaluar(m);
    m.objetivo = `Curva en ${Math.ceil(s.curva)} s · Acalorado: ${FILAS[s.acalorado]}`;
    m.lineas = [
      `Viento entra por la ${s.viento < 0 ? 'izquierda' : 'derecha'} (${Math.abs(s.viento).toFixed(2)}) · Deflector opuesto · Ventanas abiertas ${abiertas(s)}/3`,
      `Fila ${FILAS[columna(s.x)]} · Ángulo ${s.y.toFixed(2)} · Confort ${s.frescas} · Papeles volando ${s.papeles}`,
    ];
    m.stats = { x: s.x, y: s.y, frescas: s.frescas, papeles: s.papeles, abiertas: abiertas(s) };
  },
  bot(m) {
    const s = m.datos,
      f = s.acalorado;
    s.auto = true;
    if (!s.abiertas[f] && abiertas(s) === 2) {
      // primero cierra otra fila para no abrir las tres
      const otra = s.abiertas.findIndex((a, i) => a && i !== f);
      s.x = xDe(otra);
      s.y = s.deflector[otra];
    } else {
      if (s.abiertas[f] && Math.abs(s.deflector[f] + s.viento) < 0.1) return;
      s.x = xDe(f);
      s.y = -s.viento;
    }
    manejar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo="Bus sureño con brisa · Ventanas opuestas">
        <Block pos={[0, 1.3, 0]} size={[8.4, 1.2, 2.6]} color="#f4c430" mat="metal" solid={false} />
        <Block pos={[0, 2, 0]} size={[8.6, 0.12, 2.8]} color="#e2e2e2" mat="metal" solid={false} />
        {s.abiertas.map((a, f) => (
          <group key={f} position={[xDe(f) * 5, 0, 0]}>
            {[-1, 1].map((l) => (
              <Block
                key={l}
                pos={[0, 1.55, l * 1.32]}
                size={[1.8, 0.5, 0.05]}
                color={a ? '#1d2a33' : '#9fd3e6'}
                mat="glass"
                solid={false}
              />
            ))}
            <group position={[0, 1.95, 0]} rotation={[0, s.deflector[f] * 0.9, 0]}>
              <Block pos={[0, 0.2, 0]} size={[0.08, 0.3, 1.4]} color={a ? '#7fb069' : '#777'} solid={false} />
            </group>
            <Label pos={[0, 2.9, 0]} text={`${FILAS[f]}${f === s.acalorado ? ' 🥵' : ''}`} h={0.26} />
          </group>
        ))}
        <group position={[-1, 1.6, 3.3]} rotation={[0, s.viento * 0.9, 0]}>
          <Block pos={[0, 0, 0]} size={[0.12, 0.12, 1.6]} color="#8ecae6" mat="neon" solid={false} />
          <Ball pos={[0, 0, -0.85]} r={0.16} color="#8ecae6" mat="neon" />
        </group>
        <Label pos={[-1, 2.2, 3.3]} text="Viento de la curva" h={0.22} />
        {s.vuelan > 0 &&
          [0, 1, 2, 3].map((i) => (
            <Block
              key={i}
              pos={[3 - i * 0.4, 2.4 + i * 0.3 + s.vuelan * 0.5, (i % 2) - 0.5]}
              size={[0.35, 0.02, 0.25]}
              color="#fafafa"
              solid={false}
            />
          ))}
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Bus = motor.Escena;
export const guia = motor.guia;
