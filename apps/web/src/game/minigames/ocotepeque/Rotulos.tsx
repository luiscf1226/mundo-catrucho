import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, revolver, xDe } from './comun';

/** tres salidas: dos fronteras y la carretera al interior */
const DESTINOS: [string, string][] = [
  ['Agua Caliente', 'Guatemala'],
  ['El Poy', 'El Salvador'],
  ['Santa Rosa de Copán', 'Honduras'],
];
const PAISES = ['Guatemala', 'El Salvador', 'Honduras'];
const FLECHAS = ['↑', '→', '↓', '←'];
const DIR: [number, number][] = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
];
type Rotulo = { destino: number; pais: number; flecha: number; tipo: 'bueno' | 'trampa' | 'otro' };
type Estado = ReturnType<typeof cursor> & {
  mapa: number[];
  pide: number;
  rotulos: Rotulo[];
  antes: number;
  espera: number;
  mirando: number;
  listo: number;
  regreso: number;
  llegadas: number;
  trampas: number;
  errores: number;
  azar: () => number;
};
type Sesion = Motor<{ rotulos: number; dudoso: boolean; seed: number }, Estado>;
/** cuántas referencias contradice un rótulo: el país del destino y la dirección del mapa */
const contradice = (s: Estado, r: Rotulo) =>
  (PAISES[r.pais] !== DESTINOS[r.destino][1] ? 1 : 0) + (r.flecha !== s.mapa[r.destino] ? 1 : 0);
function cruce(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    otro = (n: number, de: number) => (de + 1 + Math.floor(s.azar() * (n - 1))) % n;
  // el tablero de este cruce: cada salida en una dirección distinta
  s.mapa = revolver([0, 1, 2, 3], s.azar).slice(0, 3);
  s.pide = Math.floor(s.azar() * 3);
  const verdad = (d: number): Rotulo => ({
    destino: d,
    pais: PAISES.indexOf(DESTINOS[d][1]),
    flecha: s.mapa[d],
    tipo: 'otro',
  });
  const bueno = { ...verdad(s.pide), tipo: 'bueno' as const };
  // en las etapas difíciles el rótulo bueno está desteñido en una cosa; la trampa siempre falla en dos
  if (p.dudoso && s.azar() < 0.6) {
    if (s.azar() < 0.5) bueno.pais = otro(3, bueno.pais);
    else bueno.flecha = otro(4, bueno.flecha);
  }
  const trampa: Rotulo = {
    destino: s.pide,
    pais: otro(3, PAISES.indexOf(DESTINOS[s.pide][1])),
    flecha: otro(4, s.mapa[s.pide]),
    tipo: 'trampa',
  };
  const resto = [0, 1, 2].filter((d) => d !== s.pide).map(verdad);
  let lista = revolver([bueno, trampa, ...resto.slice(0, p.rotulos - 2)], s.azar);
  // el bueno nunca queda donde estaba el anterior: machacar el mismo rótulo no lleva a ningún lado
  for (let n = 0; n < 6 && lista.findIndex((r) => r.tipo === 'bueno') === s.antes; n++) lista = revolver(lista, s.azar);
  s.rotulos = lista;
  s.mirando = 0;
}
function elegir(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0 || s.listo > 0 || s.regreso > 0) return;
  s.espera = 0.5;
  const i = casilla(s.x, s.rotulos.length),
    r = s.rotulos[i];
  if (r.tipo === 'bueno') {
    s.llegadas++;
    s.antes = i;
    s.listo = 1;
    m.sumar(45);
    toast(`¡Bien! Esa salida sí va a ${DESTINOS[s.pide][0]}.`, '🪧');
    return;
  }
  if (r.tipo === 'trampa') {
    s.trampas++;
    s.regreso = 1.2;
    m.sumar(-40);
    toast('Ese rótulo contradice dos referencias: regresás al nodo de control.', '↩️');
    return;
  }
  s.errores++;
  m.sumar(-30);
  toast(`Ese rótulo va para ${DESTINOS[r.destino][0]}, no para donde vas.`, '🪧');
}
const motor = defineMotor({
  id: 'ocotepeque.rotulos',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'Compará cada rótulo con el mapa del cruce (dirección) y la tabla de países. Elegí con A/D el que lleva a tu destino y F lo sigue. Un rótulo que contradice dos referencias te regresa al nodo de control.',
    ...controles(),
  },
  etapa: (p) => ({ rotulos: 3 + Math.round(p.dif), dudoso: p.dif > 0.5, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    mapa: [],
    pide: 0,
    rotulos: [],
    antes: -1,
    espera: 0,
    mirando: 0,
    listo: 0,
    regreso: 0,
    llegadas: 0,
    trampas: 0,
    errores: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.rotulos.length) cruce(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    s.regreso = Math.max(0, s.regreso - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) cruce(m);
    }
    if (input.take('fire')) elegir(m);
    const r = s.rotulos[casilla(s.x, s.rotulos.length)];
    m.objetivo = `Destino: ${DESTINOS[s.pide][0]}`;
    m.lineas = [
      r ? `Rótulo: ${FLECHAS[r.flecha]} ${DESTINOS[r.destino][0]} · ${PAISES[r.pais]}` : '',
      `Llegadas ${s.llegadas} · Trampas ${s.trampas} · Errores ${s.errores}`,
    ];
    m.stats = { x: s.x, llegadas: s.llegadas, trampas: s.trampas, errores: s.errores };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.listo > 0 || s.regreso > 0 || s.mirando < 1.4 || !s.rotulos.length) return;
    s.auto = true;
    const i = s.rotulos.findIndex((r) => r.destino === s.pide && contradice(s, r) < 2);
    s.x = xDe(i, s.rotulos.length);
    elegir(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      n = s.rotulos.length,
      k = casilla(s.x, n),
      vuelta = s.regreso > 0 ? s.regreso / 1.2 : 0,
      cx = -4,
      cz = -0.8;
    return (
      <Mesa titulo="Tablero de rutas · tres salidas">
        {/* mapa del cruce: el nodo de control y sus tres salidas */}
        <Block pos={[cx, 0.74, cz]} size={[3, 0.04, 3]} color="#e9edc9" solid={false} />
        <Block pos={[cx, 0.85, cz]} size={[0.4, 0.2, 0.4]} color="#e63946" solid={false} />
        {s.mapa.map((d, j) => (
          <group key={j}>
            <Block
              pos={[cx + DIR[d][0] * 0.7, 0.78, cz + DIR[d][1] * 0.7]}
              size={[DIR[d][0] ? 1.2 : 0.18, 0.04, DIR[d][1] ? 1.2 : 0.18]}
              color="#6c757d"
              mat="asphalt"
              solid={false}
            />
            <Label pos={[cx + DIR[d][0] * 1.3, 1.1, cz + DIR[d][1] * 1.3]} text={DESTINOS[j][0]} h={0.3} />
          </group>
        ))}
        {/* tabla de países */}
        <Plate
          pos={[-4, 1.5, 2.4]}
          rot={0.3}
          text={DESTINOS.map(([d, p]) => `${d}: ${p}`).join('  ·  ')}
          h={0.3}
          bg="#264653"
        />
        {s.rotulos.map((r, i) => {
          const x = 1.6 * (i - (n - 1) / 2) + 0.6;
          return (
            <group key={i}>
              <Block pos={[x, 1.3, -1]} size={[0.08, 1.2, 0.08]} color="#adb5bd" mat="metal" solid={false} />
              <Plate
                pos={[x, 2.1, -0.95]}
                text={`${FLECHAS[r.flecha]} ${DESTINOS[r.destino][0]}`}
                h={0.3}
                bg={i === k ? '#b8860b' : '#1b6b3a'}
              />
              <Plate pos={[x, 1.75, -0.95]} text={PAISES[r.pais]} h={0.3} bg="#14532d" />
            </group>
          );
        })}
        {/* la carga: va al cruce y, si siguió la trampa, regresa al nodo */}
        <Block
          pos={[
            cx + (vuelta > 0 ? DIR[s.mapa[s.pide] ?? 0][0] * vuelta : 0),
            1.1,
            cz + (vuelta > 0 ? DIR[s.mapa[s.pide] ?? 0][1] * vuelta : 0),
          ]}
          size={[0.3, 0.3, 0.3]}
          color="#ffd166"
          solid={false}
        />
        <Label
          pos={[0.6, 3.3, -1]}
          text={s.listo > 0 ? '¡Salida correcta! 🪧' : `Destino: ${DESTINOS[s.pide][0]}`}
          h={0.42}
        />
      </Mesa>
    );
  },
});
export const Rotulos = motor.Escena;
export const guia = motor.guia;
