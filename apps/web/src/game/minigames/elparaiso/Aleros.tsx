// «Lluvia de los tejados»: uní aleros de alto a bajo, siempre hacia la cuneta. Un tramo que sube embalsa y rebalsa;
// volver hacia atrás pega el agua contra la fachada. Más aleros en la cadena, más lluvia recogida.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  alto: number[];
  mejor: number[];
  cadena: number[];
  cunetas: number;
  rebalses: number;
  retornos: number;
  pausa: number;
  sorteo: () => number;
};
type Parametros = { n: number; semilla: number };
type Sesion = Motor<Parametros, Estado>;
function calle(s: Estado, n: number) {
  s.alto = Array.from({ length: n }, (_, i) => (i === 0 ? 6 : i === n - 1 ? 0 : 1 + Math.floor(s.sorteo() * 5)));
  // cadena más larga que baja siempre hacia la derecha (la usa el bot)
  s.mejor = s.alto.map(() => 0);
  for (let i = n - 2; i >= 0; i--) {
    let b = -1;
    for (let j = i + 1; j < n; j++)
      if (s.alto[j] < s.alto[i] && (j === n - 1 || s.mejor[j] > 0)) b = Math.max(b, s.mejor[j]);
    s.mejor[i] = b < 0 ? 0 : b + 1;
  }
  s.cadena = [0];
}
function unir(m: Sesion) {
  const s = m.datos,
    n = m.parametros.n;
  if (s.espera > 0 || s.pausa > 0) return;
  s.espera = 0.6;
  const c = s.cadena[s.cadena.length - 1],
    t = casilla(s.x, n);
  if (t === c) {
    m.sumar(-10);
    return;
  }
  if (t < c) {
    s.retornos++;
    m.sumar(-30);
    useGame.getState().toast('Ese tramo regresa contra la fachada.', '🏚️');
    return;
  }
  if (s.alto[t] >= s.alto[c]) {
    s.rebalses++;
    s.cadena = [0];
    m.sumar(-40);
    useGame.getState().toast('El agua no sube porque dibujaste bonito: se embalsó y rebalsó.', '🌧️');
    return;
  }
  s.cadena.push(t);
  m.sumar(10);
  if (t === n - 1) {
    s.cunetas++;
    m.sumar(10 * (s.cadena.length - 1));
    s.pausa = 1;
  }
}
const motor = defineMotor({
  id: 'elparaiso.aleros',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'A/D elegí el siguiente alero y F uní el tramo. Siempre más bajo y hacia la cuneta. Pasá por la mayor cantidad de aleros.',
    ...controles,
  },
  etapa: (p) => ({ n: 7 + Math.round(p.dif * 2), semilla: p.seed + 13 }),
  metas,
  duracion,
  crear: (par) => {
    const s: Estado = {
      ...cursor(),
      alto: [],
      mejor: [],
      cadena: [0],
      cunetas: 0,
      rebalses: 0,
      retornos: 0,
      pausa: 0,
      sorteo: rng(par.semilla),
    };
    calle(s, par.n);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      n = m.parametros.n;
    mover(s, dt);
    if (s.pausa > 0) {
      s.pausa -= dt;
      if (s.pausa <= 0) calle(s, n);
    }
    if (input.take('fire')) unir(m);
    const t = casilla(s.x, n),
      c = s.cadena[s.cadena.length - 1];
    m.objetivo = `Llevá la lluvia a la cuneta · ${s.cadena.length - 1} tramos (se puede con ${s.mejor[0]})`;
    m.lineas = [
      `Alero ${c + 1} (alto ${s.alto[c]}) → ${t === n - 1 ? 'cuneta' : `alero ${t + 1}`} (alto ${s.alto[t]})`,
      `Cunetas llenas ${s.cunetas} · Rebalses ${s.rebalses} · Retornos ${s.retornos}`,
    ];
    m.stats = { x: s.x, cunetas: s.cunetas, rebalses: s.rebalses, tramos: s.cadena.length - 1 };
  },
  bot(m) {
    const s = m.datos,
      n = m.parametros.n;
    if (s.espera > 0 || s.pausa > 0) return;
    const c = s.cadena[s.cadena.length - 1];
    let t = n - 1;
    for (let j = c + 1; j < n - 1; j++)
      if (s.alto[j] < s.alto[c] && s.mejor[j] === s.mejor[c] - 1 && s.mejor[j] > 0) {
        t = j;
        break;
      }
    s.auto = true;
    s.x = centro(t, n);
    unir(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      n = m.parametros.n,
      t = casilla(s.x, n),
      X = (i: number) => -1 + centro(i, n) * 4.6,
      Y = (i: number) => 0.8 + s.alto[i] * 0.42;
    return (
      <Mesa titulo="Yuscarán por sus aleros · La lluvia baja">
        {s.alto.map((h, i) => {
          const cuneta = i === n - 1;
          return (
            <group key={i} position={[X(i), 0, -1]}>
              {cuneta ? (
                <Block pos={[0, 0.78, 0]} size={[0.9, 0.1, 2]} color="#58bbc5" mat="water" solid={false} />
              ) : (
                <>
                  <Block
                    pos={[0, 0.7 + h * 0.21, 0]}
                    size={[0.8, h * 0.42, 1]}
                    color="#fbfaf5"
                    mat="stucco"
                    solid={false}
                  />
                  <Block
                    pos={[0.1, Y(i) + 0.05, 0.1]}
                    size={[1, 0.1, 1.3]}
                    color={i === t ? '#ffe066' : '#b5543c'}
                    mat="roof"
                    solid={false}
                  />
                </>
              )}
              <Label
                pos={[0, Y(i) + 0.55, 0.6]}
                text={cuneta ? 'Cuneta' : `${h}`}
                h={0.38}
                fg={i === t ? '#ffe066' : undefined}
              />
            </group>
          );
        })}
        {s.cadena.slice(1).map((b, k) => {
          const a = s.cadena[k],
            dx = X(b) - X(a),
            dy = Y(b) - Y(a);
          return (
            <group
              key={k}
              position={[(X(a) + X(b)) / 2, (Y(a) + Y(b)) / 2 + 0.15, -0.4]}
              rotation={[0, 0, Math.atan2(dy, dx)]}
            >
              <Block
                pos={[0, 0, 0]}
                size={[Math.hypot(dx, dy), 0.08, 0.16]}
                color="#5ec8ff"
                mat="water"
                solid={false}
              />
            </group>
          );
        })}
      </Mesa>
    );
  },
});
export const Aleros = motor.Escena;
export const guia = motor.guia;
