import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, sector } from './comun';

const NODOS: [string, string][] = [
  ['Raíces de mangle', '#7a5a3a'],
  ['Hojarasca', '#9c7c38'],
  ['Curil', '#3b2f2f'],
  ['Punche', '#b5452e'],
  ['Pececitos', '#4ea8de'],
  ['Garza', '#f1faee'],
  ['Mapache', '#6c757d'],
  ['Agua clara', '#7fd6e8'],
];
/** de quién depende cada cosa: [de, a, tipo] — si se quita «de», «a» pierde alimento o refugio */
const VINCULOS: [number, number, 'refugio' | 'alimento'][] = [
  [0, 2, 'refugio'],
  [0, 3, 'refugio'],
  [0, 4, 'refugio'],
  [0, 1, 'alimento'],
  [0, 7, 'refugio'],
  [1, 3, 'alimento'],
  [1, 4, 'alimento'],
  [3, 6, 'alimento'],
  [3, 5, 'alimento'],
  [4, 5, 'alimento'],
  [2, 6, 'alimento'],
  [7, 2, 'refugio'],
  [7, 4, 'refugio'],
];
const QUITABLES = [0, 1, 3, 7];
const efectos = (n: number) => VINCULOS.filter(([de]) => de === n).map(([, a]) => a);
const R = 2.6;
const lugar = (k: number): [number, number] => [-1 + Math.cos((k * Math.PI) / 4) * R, -Math.sin((k * Math.PI) / 4) * R];
type Estado = ReturnType<typeof cursor> & {
  quitado: number;
  marcados: number[];
  espera: number;
  rondas: number;
  incompletas: number;
  errores: number;
  azar: () => number;
};
type Sesion = Motor<{ pide: number; seed: number }, Estado>;
const pide = (m: Sesion) => Math.min(m.parametros.pide, efectos(m.datos.quitado).length);
function ronda(s: Estado) {
  let q = s.quitado;
  while (q === s.quitado) q = QUITABLES[Math.floor(s.azar() * QUITABLES.length)];
  s.quitado = q;
  s.marcados = [];
}
function marcar(m: Sesion) {
  const s = m.datos,
    k = sector(s.x, s.y, NODOS.length);
  if (s.espera > 0 || k < 0 || k === s.quitado) return;
  s.espera = 0.6;
  s.marcados = s.marcados.includes(k) ? s.marcados.filter((x) => x !== k) : [...s.marcados, k];
}
function explicar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0) return;
  s.espera = 0.6;
  const bien = efectos(s.quitado),
    malos = s.marcados.filter((k) => !bien.includes(k));
  if (malos.length) {
    s.errores++;
    m.sumar(-30 * malos.length);
    toast(`${NODOS[malos[0]][0]} no depende de ${NODOS[s.quitado][0].toLowerCase()}.`, '🦀');
    s.marcados = s.marcados.filter((k) => bien.includes(k));
    return;
  }
  if (s.marcados.length < pide(m)) {
    s.incompletas++;
    m.sumar(-15);
    toast(`Incompleta: marcá ${pide(m)} efectos, no uno solo.`, '🌿');
    return;
  }
  s.rondas++;
  m.sumar(15 + 10 * s.marcados.length);
  toast('¡Bien explicado! El manglar sostiene al golfo.', '🌿');
  ronda(s);
}
const motor = defineMotor({
  id: 'valle.redviva',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'rio',
  guia: {
    goal: 'Se quita un eslabón del manglar. Apuntá a lo que pierde alimento o refugio y marcalo con F. Con E explicás: hacen falta al menos dos efectos y ninguno de más.',
    ...controles('explicar'),
  },
  etapa: (p) => ({ pide: p.dif > 0.6 ? 3 : 2, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      quitado: -1,
      marcados: [],
      espera: 0,
      rondas: 0,
      incompletas: 0,
      errores: 0,
      azar: rng(p.seed),
    };
    ronda(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) marcar(m);
    if (input.take('use')) explicar(m);
    const k = sector(s.x, s.y, NODOS.length);
    m.objetivo = `Sin ${NODOS[s.quitado][0].toLowerCase()}: ¿quién pierde? (${pide(m)} o más)`;
    m.lineas = [
      `Apuntás a ${k < 0 ? 'nada' : NODOS[k][0]} · Marcados ${s.marcados.map((x) => NODOS[x][0]).join(', ') || 'ninguno'}`,
      `Explicaciones ${s.rondas} · Incompletas ${s.incompletas} · Errores ${s.errores}`,
    ];
    m.stats = { x: s.x, rondas: s.rondas, incompletas: s.incompletas, errores: s.errores, marcados: s.marcados.length };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0) return;
    s.auto = true;
    const falta = efectos(s.quitado).find((k) => !s.marcados.includes(k));
    if (s.marcados.length < pide(m) && falta !== undefined) {
      s.x = Math.cos((falta * Math.PI) / 4) * 0.8;
      s.y = Math.sin((falta * Math.PI) / 4) * 0.8;
      marcar(m);
    } else explicar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = sector(s.x, s.y, NODOS.length);
    return (
      <Mesa titulo="Red del manglar · Alimento y refugio">
        {VINCULOS.map(([de, a, tipo], i) => {
          const [x1, z1] = lugar(de),
            [x2, z2] = lugar(a),
            largo = Math.hypot(x2 - x1, z2 - z1);
          return (
            <Block
              key={i}
              pos={[(x1 + x2) / 2, 0.76, (z1 + z2) / 2]}
              size={[largo, 0.03, 0.06]}
              rot={-Math.atan2(z2 - z1, x2 - x1)}
              color={de === s.quitado ? '#555555' : tipo === 'refugio' ? '#52b788' : '#f4a261'}
              solid={false}
            />
          );
        })}
        {NODOS.map(([nombre, color], n) => {
          const [x, z] = lugar(n),
            quitado = n === s.quitado,
            marcado = s.marcados.includes(n);
          return (
            <group key={n}>
              <Ball pos={[x, 1.05, z]} r={n === k ? 0.42 : 0.34} color={quitado ? '#444444' : color} />
              {marcado && <Ball pos={[x, 1.65, z]} r={0.14} color="#ffd166" />}
              <Label pos={[x, 2.05, z]} text={quitado ? `✂️ ${nombre}` : marcado ? `⚠️ ${nombre}` : nombre} h={0.32} />
            </group>
          );
        })}
        <Label pos={[3.6, 1.6, 3]} text="🟩 refugio · 🟧 alimento" h={0.3} />
      </Mesa>
    );
  },
});
export const Redviva = motor.Escena;
export const guia = motor.guia;
