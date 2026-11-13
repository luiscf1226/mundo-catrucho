import { input } from '../../../core/input';
import { Block, Cyl, Label, P } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  nodo: number;
  parejas: number;
  fallos: number;
  descanso: number;
  ruta: number[];
};
type Parametros = { margen: number; escalas: boolean };
type Sesion = Motor<Parametros, Estado>;

const nodos = [
  [-4, 0],
  [-2, -2],
  [0, 0],
  [2, -2],
  [4, 0],
  [0, 3],
];
function destino(s: Estado) {
  return Math.max(0, Math.min(5, Math.round((s.x + 1) * 2.5)));
}
function volar(m: Sesion) {
  const s = m.datos;
  if (s.descanso > 0) return;
  const n = destino(s),
    a = nodos[s.nodo],
    b = nodos[n];
  const alcance = m.parametros.escalas && s.parejas % 2 ? 3.1 : 4.2 - m.partida.dif * 0.7;
  if (n === 5 || n <= s.nodo || Math.hypot(a[0] - b[0], a[1] - b[1]) > alcance) {
    s.fallos++;
    m.sumar(-10);
    return;
  }
  s.nodo = n;
  s.ruta.push(n);
  s.descanso = 0.8 + m.partida.dif;
  if (n === 4) {
    s.parejas++;
    m.sumar(60);
    s.nodo = 0;
    s.ruta = [0];
  }
}

const motor = defineMotor({
  id: 'copan.guaras',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'valle',
  guia: {
    goal: 'Conectá refugios sin encerrar aves. A/D elige destino, F vuela; hacé escalas dentro del alcance de cada pareja.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.17, escalas: p.tema.variante === 'la-guara-quiere-escala' }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), nodo: 0, parejas: 0, fallos: 0, descanso: 0, ruta: [0] }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.descanso = Math.max(0, s.descanso - dt);
    if (input.take('fire')) volar(m);
    m.objetivo = 'Conectá árboles vecinos y descansá en cada escala';
    m.lineas = [
      `Árbol ${s.nodo + 1} → destino ${destino(s) + 1} · Alcance ${m.parametros.escalas && s.parejas % 2 ? 3.1 : 4.2 - m.partida.dif * 0.7} m`,
      `A/D elegí nodo · F volá · Descanso ${s.descanso.toFixed(1)} s · Nodo 6 es jaula: no cuenta`,
    ];
    m.stats = { parejas: s.parejas, fallos: s.fallos, nodo: s.nodo, x: s.x };
  },
  bot(m, dt, actor) {
    if (actor === 'compa') {
      m.datos.descanso = Math.max(0, m.datos.descanso - dt * 0.15);
      return;
    }
    const s = m.datos;
    s.auto = true;
    s.x = (s.nodo + 1) / 2.5 - 1;
    volar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo="Conectá refugios sin encerrar aves">
        {[0, 1, 2, 3].map((i) => {
          const a = nodos[i],
            b = nodos[i + 1];
          return (
            <Block
              key={i}
              pos={[(a[0] + b[0]) / 2, 0.83, (a[1] + b[1]) / 2]}
              size={[0.08, 0.04, Math.hypot(a[0] - b[0], a[1] - b[1])]}
              rot={Math.atan2(b[0] - a[0], b[1] - a[1])}
              color={s.ruta.includes(i + 1) ? '#72e0b0' : '#ddb861'}
              mat="neon"
              solid={false}
            />
          );
        })}
        {nodos.map(([x, z], i) => (
          <group key={i}>
            <Cyl
              pos={[x, 0.8, z]}
              r={0.45}
              h={0.12}
              color={i === destino(s) ? '#f5cc67' : '#689d73'}
              mat="neon"
              solid={false}
            />
            {i < 5 ? (
              <P.Tree pos={[x, 0.7, z]} scale={0.35} seed={i} />
            ) : (
              <Block pos={[x, 1.4, z]} size={[1, 1.3, 0.8]} color="#666b70" mat="metal" solid={false} />
            )}
            <Label
              pos={[x, 2.8, z]}
              text={i < 5 ? `${i + 1} · ${i % 2 ? 'Refugio' : 'Alimento'}` : '6 · Jaula ✗'}
              h={0.25}
            />
          </group>
        ))}
        {m.parametros.escalas && (
          <>
            <Block pos={[-1, 0.85, 3]} size={[1.7, 0.06, 1]} color="#f6e8be" mat="cloth" solid={false} />
            <Label pos={[-1, 1.2, 3]} text={`Guara de papel · ${s.ruta.length - 1} sellos`} h={0.22} />
          </>
        )}
        {[0, 1].map((i) => (
          <P.Macaw key={i} pos={[nodos[s.nodo][0] + i * 0.5, 2.2, nodos[s.nodo][1]]} flying scale={0.45} />
        ))}
      </Mesa>
    );
  },
});
export const Guaras = motor.Escena;
export const guia = motor.guia;
