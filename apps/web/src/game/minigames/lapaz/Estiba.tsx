import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, Mesa, metas, mover, Puntero } from './comun';

const CARRILES = 3,
  FONDO = 4;
const DESTINOS: [string, string][] = [
  ['Marcala', '#c0392b'],
  ['Opatoro', '#2a9d8f'],
  ['Guajiquiro', '#e9c46a'],
  ['Santa Elena', '#7b2cbf'],
];
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  /** orden de paradas (índices de DESTINOS) y costales por cargar (índice de parada) */
  ruta: number[];
  fila: number[];
  /** carriles de la paila: el último del arreglo queda junto a la puerta de atrás */
  paila: number[][];
  /** reparto en curso: parada actual y reloj */
  repartiendo: number;
  reloj: number;
  espera: number;
  entregas: number;
  tapadas: number;
  viajes: number;
  cargados: number;
  tapadasViaje: number;
};
type Sesion = Motor<{ paradas: number; costales: number; semilla: number }, Estado>;

function nuevoViaje(s: Estado, p: Sesion['parametros']) {
  const orden = DESTINOS.map((_, i) => i).sort(() => s.azar() - 0.5);
  s.ruta = orden.slice(0, p.paradas);
  s.fila = Array.from({ length: p.costales }, (_, i) => (i < p.paradas ? i : Math.floor(s.azar() * p.paradas)));
  s.fila.sort(() => s.azar() - 0.5);
  s.paila = Array.from({ length: CARRILES }, () => []);
  s.repartiendo = -1;
  s.reloj = 0;
  s.tapadasViaje = 0;
}
function cargar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.repartiendo >= 0 || !s.fila.length) return;
  s.espera = 0.55;
  const c = casilla(s.x, CARRILES);
  if (s.paila[c].length >= FONDO) {
    m.sumar(-10);
    useGame.getState().toast('Ese carril ya va lleno.', '🛻');
    return;
  }
  s.paila[c].push(s.fila.shift() ?? 0);
  s.cargados++;
  if (!s.fila.length) {
    s.repartiendo = 0;
    s.reloj = 1.2;
  }
}
/** En cada parada se baja por atrás lo que toca; lo de esa parada que quedó tapado cuesta un turno. */
function parada(m: Sesion) {
  const s = m.datos,
    k = s.repartiendo;
  for (const carril of s.paila) {
    while (carril.length && carril[carril.length - 1] === k) {
      carril.pop();
      s.entregas++;
      m.sumar(22);
    }
    for (let i = carril.length - 1; i >= 0; i--)
      if (carril[i] === k) {
        carril.splice(i, 1);
        s.tapadas++;
        s.tapadasViaje++;
        m.sumar(-25);
      }
  }
}
const motor = defineMotor({
  id: 'lapaz.estiba',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'A/D elegí carril y F cargá el costal. La paila solo abre atrás: lo de la primera parada va de último, junto a la puerta.',
    ...controles(),
  },
  etapa: (p) => ({
    paradas: p.dif < 0.5 ? 3 : 4,
    costales: 8 + Math.round(p.dif * 2),
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      ruta: [],
      fila: [],
      paila: [],
      repartiendo: -1,
      reloj: 0,
      espera: 0,
      entregas: 0,
      tapadas: 0,
      viajes: 0,
      cargados: 0,
      tapadasViaje: 0,
    };
    nuevoViaje(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.repartiendo >= 0) {
      s.reloj -= dt;
      if (s.reloj <= 0) {
        parada(m);
        s.repartiendo++;
        s.reloj = 0.8;
        if (s.repartiendo >= s.ruta.length) {
          s.viajes++;
          if (!s.tapadasViaje) m.sumar(30);
          nuevoViaje(s, m.parametros);
        }
      }
    }
    if (input.take('fire')) cargar(m);
    const sig = s.fila[0];
    m.objetivo =
      s.repartiendo >= 0
        ? `Repartiendo: parada ${s.repartiendo + 1}, ${DESTINOS[s.ruta[Math.min(s.repartiendo, s.ruta.length - 1)]][0]}`
        : `Cargá: ${DESTINOS[s.ruta[sig ?? 0]][0]} (parada ${(sig ?? 0) + 1})`;
    m.lineas = [
      `Ruta: ${s.ruta.map((d, i) => `${i + 1}. ${DESTINOS[d][0]}`).join(' → ')}`,
      `Entregas ${s.entregas} · Tapadas ${s.tapadas} · Viajes ${s.viajes}`,
    ];
    m.stats = { x: s.x, y: s.y, entregas: s.entregas, tapadas: s.tapadas, cargados: s.cargados, viajes: s.viajes };
  },
  bot(m) {
    const s = m.datos;
    if (s.repartiendo >= 0 || !s.fila.length) return;
    s.auto = true;
    const k = s.fila[0];
    // el carril cuya carga de atrás baja después (o igual) que este costal, el más justo
    const tope = (c: number) => (s.paila[c].length ? s.paila[c][s.paila[c].length - 1] : 99);
    const libres = [0, 1, 2].filter((c) => s.paila[c].length < FONDO),
      buenos = libres.filter((c) => tope(c) >= k).sort((a, b) => tope(a) - tope(b));
    const c = buenos[0] ?? libres.sort((a, b) => tope(b) - tope(a))[0] ?? 0;
    s.x = centro(c, CARRILES);
    cargar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      sel = casilla(s.x, CARRILES),
      sig = s.fila[0];
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Descarga de Tutule'} · Sale por atrás`}>
        <Block pos={[-1, 0.8, -3]} size={[4.6, 1.4, 0.3]} color="#c0392b" mat="metal" solid={false} />
        <Label pos={[-1, 2, -3]} text="Cabina" h={0.3} />
        <Block pos={[-1, 0.74, -0.4]} size={[4.6, 0.06, 5]} color="#4a4e55" mat="metal" solid={false} />
        <Block pos={[-1, 0.9, 2.2]} size={[4.6, 0.3, 0.12]} color="#8d8f94" mat="metal" solid={false} />
        <Label pos={[-1, 1.5, 2.5]} text="⬇ Puerta de atrás" h={0.26} />
        {s.paila.map((carril, c) =>
          carril.map((k, i) => (
            <Ball
              key={`${c}-${i}`}
              pos={[-1 + (c - 1) * 1.45, 1.05, -2.4 + i * 1.15]}
              r={0.42}
              color={DESTINOS[s.ruta[k]][1]}
              mat="cloth"
            />
          )),
        )}
        {s.paila.map((carril, c) =>
          carril.length ? (
            <Label
              key={c}
              pos={[-1 + (c - 1) * 1.45, 1.75, -2.4 + (carril.length - 1) * 1.15]}
              text={`${carril[carril.length - 1] + 1}`}
              h={0.26}
            />
          ) : null,
        )}
        {sig !== undefined && s.repartiendo < 0 && (
          <group position={[3.4, 0.7, 1.4]}>
            <Ball pos={[0, 0.45, 0]} r={0.45} color={DESTINOS[s.ruta[sig]][1]} mat="cloth" />
            <Plate pos={[0, 1.4, 0]} text={`${DESTINOS[s.ruta[sig]][0]} · parada ${sig + 1}`} h={0.24} />
            <Label pos={[0, 2, 0]} text={`Faltan ${s.fila.length}`} h={0.22} />
          </group>
        )}
        {s.ruta.map((d, i) => (
          <group key={d} position={[3.2, 0.7, -2.6 + i * 0.7]}>
            <Cyl pos={[0, 0.1, 0]} r={0.2} h={0.2} color={DESTINOS[d][1]} solid={false} />
            <Label pos={[0.9, 0.3, 0]} text={`${i + 1}. ${DESTINOS[d][0]}`} h={0.2} />
          </group>
        ))}
        <Puntero x={(-1 + (sel - 1) * 1.45 + 1) / 4.4} y={-0.75} />
      </Mesa>
    );
  },
});
export const Estiba = motor.Escena;
export const guia = motor.guia;
