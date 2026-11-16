// «Puntada de exportación»: cerrá el costal de café agujero por agujero, con ida (arriba) y retorno (abajo).
// Un punto omitido o una vuelta sin trabar no aguanta la prueba de tracción: hay que deshacer hasta la falla.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, fila, Mesa, metas, mover, Puntero } from './comun';

type Punto = 'nada' | 'ida' | 'trabado' | 'falla';
type Estado = ReturnType<typeof cursor> & {
  puntos: Punto[];
  actual: number;
  costales: number;
  deshechos: number;
  fallas: number;
  pausa: number;
};
type Sesion = Motor<{ n: number }, Estado>;
const costal = (n: number): Punto[] => Array.from({ length: n }, () => 'nada');
function traccion(m: Sesion) {
  const s = m.datos,
    falla = s.puntos.indexOf('falla');
  if (falla < 0) {
    s.costales++;
    m.sumar(70);
    s.pausa = 1.2;
    useGame.getState().toast('¡Aguantó la tracción! El grano se queda adentro.', '☕');
    return;
  }
  const deshacer = s.puntos.length - falla;
  s.deshechos += deshacer;
  m.sumar(-5 * deshacer);
  for (let i = falla; i < s.puntos.length; i++) s.puntos[i] = 'nada';
  s.actual = falla;
  useGame.getState().toast(`Se abrió en el punto ${falla + 1}: deshacé hasta ahí.`, '🧵');
}
function coser(m: Sesion) {
  const s = m.datos,
    n = m.parametros.n;
  if (s.espera > 0 || s.pausa > 0) return;
  s.espera = 0.4;
  const f = fila(s.y),
    h = casilla(s.x, n);
  if (f === 0) {
    m.sumar(-10);
    return;
  }
  if (h < s.actual) {
    m.sumar(-10);
    return;
  }
  if (h > s.actual) {
    // se saltó agujeros: quedan omitidos
    for (let i = s.actual; i < h; i++) if (s.puntos[i] !== 'ida') s.puntos[i] = 'falla';
    s.puntos[s.actual] = 'falla';
    s.fallas++;
    s.actual = h;
  }
  const p = s.puntos[h];
  if (f === 1 && p === 'nada') {
    s.puntos[h] = 'ida';
    m.sumar(6);
  } else if (f === -1 && p === 'ida') {
    s.puntos[h] = 'trabado';
    s.actual = h + 1;
    m.sumar(6);
  } else {
    // retorno sin ida, o dos idas seguidas: el bucle no traba
    s.puntos[h] = 'falla';
    s.fallas++;
    s.actual = h + 1;
  }
  if (s.actual >= n) traccion(m);
}
const motor = defineMotor({
  id: 'elparaiso.costura',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'A/D elegí el agujero en orden. W + F pasá la ida por arriba y S + F el retorno por abajo para trabar el bucle. Al final viene la prueba de tracción.',
    ...controles,
  },
  etapa: (p) => ({ n: 6 + Math.round(p.dif * 3) }),
  metas,
  duracion,
  crear: (par): Estado => ({
    ...cursor(),
    puntos: costal(par.n),
    actual: 0,
    costales: 0,
    deshechos: 0,
    fallas: 0,
    pausa: 0,
  }),
  actualizar(m, dt) {
    const s = m.datos,
      n = m.parametros.n;
    mover(s, dt);
    if (s.pausa > 0) {
      s.pausa -= dt;
      if (s.pausa <= 0) {
        s.puntos = costal(n);
        s.actual = 0;
      }
    }
    if (input.take('fire')) coser(m);
    const pide = s.puntos[s.actual] === 'ida' ? 'retorno (S)' : 'ida (W)';
    m.objetivo = s.pausa > 0 ? 'Costal listo · viene otro' : `Agujero ${s.actual + 1}/${n} · ${pide}`;
    m.lineas = [
      `Cursor: agujero ${casilla(s.x, n) + 1} · ${fila(s.y) === 1 ? 'ida' : fila(s.y) === -1 ? 'retorno' : 'sin aguja'}`,
      `Costales cerrados ${s.costales} · Puntos omitidos ${s.fallas} · Deshechos ${s.deshechos}`,
    ];
    m.stats = { x: s.x, costales: s.costales, fallas: s.fallas, actual: s.actual };
  },
  bot(m) {
    const s = m.datos,
      n = m.parametros.n;
    if (s.espera > 0 || s.pausa > 0) return;
    s.auto = true;
    s.x = centro(s.actual, n);
    s.y = s.puntos[s.actual] === 'ida' ? -0.8 : 0.8;
    coser(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      n = m.parametros.n,
      h = casilla(s.x, n),
      X = (i: number) => -1 + centro(i, n) * 4.2;
    return (
      <Mesa titulo="Café que no se riega · Ida y retorno">
        {/* costal acostado: la boca con los agujeros queda hacia vos */}
        <Block pos={[-1, 1.05, -1.6]} size={[9, 0.7, 3.4]} color="#c9a36a" mat="cloth" solid={false} />
        <Block pos={[-1, 1.15, 0.6]} size={[9.2, 0.9, 1.2]} color="#b58d55" mat="cloth" solid={false} />
        {[-4.6, -3.1, -0.4, 1.8, 3].map((x, i) => (
          <Ball key={x} pos={[x, 1.48, -2.2 + (i % 2) * 0.9]} r={0.2} color="#5a2d1a" />
        ))}
        {s.puntos.map((p, i) => (
          <group key={i} position={[X(i), 1.62, 0.6]}>
            <Cyl
              pos={[0, 0, 0]}
              r={0.13}
              h={0.04}
              color={i === s.actual ? '#ffe066' : i === h ? '#9fd8ff' : '#3b2a1a'}
              solid={false}
            />
            {(p === 'ida' || p === 'trabado') && (
              <Block pos={[0, 0.06, 0]} size={[0.12, 0.08, 1]} rot={0.6} color="#f4ecd2" mat="cloth" solid={false} />
            )}
            {p === 'trabado' && (
              <Block pos={[0, 0.1, 0]} size={[0.12, 0.08, 1]} rot={-0.6} color="#e8d28a" mat="cloth" solid={false} />
            )}
            {p === 'falla' && <Label pos={[0, 0.6, 0]} text="✗" h={0.5} fg="#ff6b5a" />}
          </group>
        ))}
        <group position={[X(h), 2.2, 0.6 - (fila(s.y) === 1 ? 0.6 : fila(s.y) === -1 ? -0.6 : 0)]}>
          <Block pos={[0, 0, 0]} size={[0.08, 0.08, 1.1]} color="#d8dee9" mat="metal" solid={false} />
          <Label pos={[0, 0.5, 0]} text={fila(s.y) === 1 ? 'ida ↑' : fila(s.y) === -1 ? 'retorno ↓' : '·'} h={0.36} />
        </group>
        <Label
          pos={[-1, 2.9, -2.4]}
          text={`Costales ${s.costales} · ${s.pausa > 0 ? 'prueba de tracción ✓' : 'cerrá el saco'}`}
          h={0.42}
        />
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Costura = motor.Escena;
export const guia = motor.guia;
