// «Tallos como barreras»: doblá cada tallo hacia un saco. El tallo doblado queda acostado en la celda vecina:
// si ahí había otro tallo sin cosechar, ese queda encerrado. Hay que llenar los dos sacos.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { Objeto } from '../kit/objetos';
import { casilla, centro, controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Celda = 'tallo' | 'izq' | 'der' | 'encerrado';
type Estado = ReturnType<typeof cursor> & {
  celdas: Celda[];
  sacos: [number, number];
  surcos: number;
  limpios: number;
  encierros: number;
  pausa: number;
};
type Sesion = Motor<{ n: number }, Estado>;
const surco = (n: number): Celda[] => Array.from({ length: n }, () => 'tallo');
function doblar(m: Sesion) {
  const s = m.datos,
    n = m.parametros.n;
  if (s.espera > 0 || s.pausa > 0) return;
  s.espera = 0.5;
  const k = casilla(s.x, n * 2),
    i = k >> 1,
    lado = k & 1 ? 1 : -1;
  if (s.celdas[i] !== 'tallo') {
    m.sumar(-10);
    return;
  }
  s.celdas[i] = lado < 0 ? 'izq' : 'der';
  s.sacos[lado < 0 ? 0 : 1]++;
  m.sumar(5);
  const j = i + lado;
  if (j >= 0 && j < n && s.celdas[j] === 'tallo') {
    s.celdas[j] = 'encerrado';
    s.encierros++;
    m.sumar(-20);
    useGame.getState().toast('El tallo que doblaste te tapó la salida de otro.', '🌽');
  }
  if (s.celdas.every((c) => c !== 'tallo')) {
    s.surcos++;
    const cuota = Math.floor(n / 2);
    if (!s.celdas.includes('encerrado') && s.sacos[0] >= cuota && s.sacos[1] >= cuota) {
      s.limpios++;
      m.sumar(50);
    }
    s.pausa = 1;
  }
}
const motor = defineMotor({
  id: 'elparaiso.tapisca',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'A/D apuntá a un lado del tallo: a su izquierda lo doblás al saco izquierdo y a su derecha al derecho. F doblá. El tallo acostado tapa la celda vecina.',
    ...controles,
  },
  etapa: (p) => ({ n: 5 + Math.round(p.dif) }),
  metas,
  duracion,
  crear: (par): Estado => ({
    ...cursor(),
    celdas: surco(par.n),
    sacos: [0, 0],
    surcos: 0,
    limpios: 0,
    encierros: 0,
    pausa: 0,
  }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    if (s.pausa > 0) {
      s.pausa -= dt;
      if (s.pausa <= 0) {
        s.celdas = surco(m.parametros.n);
        s.sacos = [0, 0];
      }
    }
    if (input.take('fire')) doblar(m);
    const n = m.parametros.n,
      k = casilla(s.x, n * 2);
    m.objetivo = `Surco ${s.surcos + 1} · llená los dos sacos (mínimo ${Math.floor(n / 2)} cada uno)`;
    m.lineas = [
      `Tallo ${(k >> 1) + 1} hacia la ${k & 1 ? 'derecha' : 'izquierda'} · Sacos ${s.sacos[0]} | ${s.sacos[1]}`,
      `Surcos sin encierros ${s.limpios} · Tallos encerrados ${s.encierros}`,
    ];
    m.stats = {
      x: s.x,
      limpios: s.limpios,
      encierros: s.encierros,
      surcos: s.surcos,
      dobladas: s.celdas.filter((c) => c === 'izq' || c === 'der').length,
    };
  },
  bot(m) {
    const s = m.datos,
      n = m.parametros.n;
    if (s.espera > 0 || s.pausa > 0) return;
    // de la orilla hacia adentro: la mitad izquierda al saco izquierdo y la otra mitad al derecho
    const mitad = Math.ceil(n / 2);
    let i = s.celdas.findIndex((c, j) => c === 'tallo' && j < mitad),
      lado = 0;
    if (i < 0) {
      for (let j = n - 1; j >= mitad; j--)
        if (s.celdas[j] === 'tallo') {
          i = j;
          break;
        }
      lado = 1;
    }
    if (i < 0) return;
    s.auto = true;
    s.x = centro(i * 2 + lado, n * 2);
    doblar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      n = m.parametros.n,
      k = casilla(s.x, n * 2);
    return (
      <Mesa titulo="Tapisca de Jamastrán · Doblá sin encerrarte">
        <Block pos={[-1, 0.72, -0.2]} size={[9.4, 0.06, 2.4]} color="#7a5a3a" mat="dirt" solid={false} />
        {s.celdas.map((c, i) => {
          const x = -1 + centro(i, n) * 4.6;
          return (
            <group key={i} position={[x, 0.75, -0.2]}>
              <group rotation={[0, 0, c === 'izq' ? 1.35 : c === 'der' ? -1.35 : 0]}>
                <Block
                  pos={[0, 0.9, 0]}
                  size={[0.12, 1.8, 0.12]}
                  color={c === 'encerrado' ? '#8a6a48' : '#5f9a3a'}
                  mat="leaf"
                  solid={false}
                />
                {c !== 'encerrado' && (
                  <Block pos={[0.1, 1.1, 0]} size={[0.16, 0.42, 0.16]} color="#f6d55c" solid={false} />
                )}
              </group>
              {c === 'encerrado' && <Label pos={[0, 2.2, 0]} text="Encerrado" h={0.32} fg="#ff9678" />}
            </group>
          );
        })}
        <Block
          pos={[-1 + centro(k, n * 2) * 4.6, 0.8, 1.4]}
          size={[0.3, 0.06, 0.6]}
          color={k & 1 ? '#7fc8ff' : '#ffb36b'}
          mat="neon"
          solid={false}
        />
        {[0, 1].map((lado) => (
          <group key={lado} position={[lado ? 3.6 : -5.6, 0, 1.8]}>
            <Objeto k="saco" pos={[0, 0.7, 0]} scale={[1.7, 1.45, 1.3]} c="#c9a36a" />
            {s.sacos[lado] > 0 && <Ball pos={[0, 1.7, 0]} r={0.22} color="#f6d55c" />}
            <Label pos={[0, 2.2, 0]} text={`${lado ? 'Saco der.' : 'Saco izq.'} ${s.sacos[lado]}`} h={0.38} />
          </group>
        ))}
      </Mesa>
    );
  },
});
export const Tapisca = motor.Escena;
export const guia = motor.guia;
