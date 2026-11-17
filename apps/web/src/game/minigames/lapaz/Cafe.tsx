import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, enMesa, Mesa, metas, mover, Puntero } from './comun';

const COLS = 6,
  RAMAS = 3;
/** Cada nudo de la rama: vacío (florece otra vez), verde (madurando), roja (lista) o muerto (lo arrancaste). */
type Nudo = { fase: 'vacio' | 'verde' | 'roja' | 'muerto'; t: number; hoja: boolean };
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  nudos: Nudo[];
  temporada: 1 | 2;
  espera: number;
  rojas: number;
  verdes: number;
  arrancados: number;
  levantadas: number;
};
type Sesion = Motor<{ madura: number; brota: number; lista: boolean; semilla: number }, Estado>;

const celda = (s: Estado) => casilla(s.y, RAMAS) * COLS + casilla(s.x, COLS);
function brotar(s: Estado, n: Nudo, p: Sesion['parametros']) {
  n.fase = 'verde';
  n.t = p.madura * (0.7 + s.azar() * 0.6);
  // con el cafeto que pasa lista, algunas verdes se esconden bajo hojas como sombreritos
  n.hoja = p.lista && s.azar() < 0.45;
}
function pellizcar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.45;
  const n = s.nudos[celda(s)];
  if (n.hoja) {
    // pellizcar a ciegas bajo la hoja arranca lo que haya
    n.hoja = false;
    if (n.fase === 'verde') {
      s.verdes++;
      m.sumar(-25);
      n.fase = 'vacio';
      n.t = m.parametros.brota;
      return;
    }
  }
  if (n.fase === 'roja') {
    s.rojas++;
    m.sumar(s.temporada === 2 ? 14 : 12);
    n.fase = 'vacio';
    n.t = m.parametros.brota;
  } else if (n.fase === 'verde') {
    s.verdes++;
    m.sumar(-25);
    n.fase = 'vacio';
    n.t = m.parametros.brota;
  } else if (n.fase === 'vacio') {
    // arrancar el nudo elimina la producción futura
    s.arrancados++;
    m.sumar(-30);
    n.fase = 'muerto';
    useGame.getState().toast('¡Arrancaste el nudo! De ahí ya no sale café.', '🌿');
  } else m.sumar(-10);
}
function levantar(m: Sesion) {
  const s = m.datos,
    n = s.nudos[celda(s)];
  if (!n.hoja) return;
  n.hoja = false;
  s.levantadas++;
}
const motor = defineMotor({
  id: 'lapaz.cafe',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'Pellizcá con F solo las cerezas rojas. El verde se queda y el nudo vacío no se toca: de ahí sale la otra cosecha.',
    ...controles('levantar la hoja'),
  },
  etapa: (p) => ({
    madura: 9 - p.dif * 2,
    brota: 3 + p.dif * 1.5,
    lista: p.tema.variante === 'el-cafeto-pasa-lista',
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const azar = rng(p.semilla);
    const s: Estado = {
      ...cursor(),
      azar,
      nudos: [],
      temporada: 1,
      espera: 0,
      rojas: 0,
      verdes: 0,
      arrancados: 0,
      levantadas: 0,
    };
    s.nudos = Array.from({ length: COLS * RAMAS }, () => {
      const n: Nudo = { fase: 'verde', t: 0, hoja: false };
      brotar(s, n, p);
      if (azar() < 0.35) {
        n.fase = 'roja';
        n.hoja = false;
      }
      return n;
    });
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.temporada === 1 && m.tiempo > 37.5) {
      s.temporada = 2;
      useGame.getState().toast('Segunda temporada: solo producen los nudos que cuidaste.', '☕');
    }
    for (const n of s.nudos) {
      if (n.fase === 'muerto' || n.fase === 'roja') continue;
      n.t -= dt;
      if (n.t > 0) continue;
      if (n.fase === 'vacio') brotar(s, n, m.parametros);
      else {
        n.fase = 'roja';
        n.hoja = false;
      }
    }
    if (input.take('use')) levantar(m);
    if (input.take('fire')) pellizcar(m);
    const vivos = s.nudos.filter((n) => n.fase !== 'muerto').length;
    m.objetivo = `Temporada ${s.temporada} de 2 · Cosechá rojas sin agotar la rama`;
    m.lineas = [
      m.parametros.lista
        ? 'Las verdes se esconden bajo hojas: levantalas con E antes de pellizcar'
        : 'Rojo sí · verde no · nudo vacío no',
      `Rojas ${s.rojas} · Verdes arrancadas ${s.verdes} · Nudos vivos ${vivos}/${COLS * RAMAS}`,
    ];
    m.stats = { x: s.x, y: s.y, rojas: s.rojas, verdes: s.verdes, arrancados: s.arrancados, levantadas: s.levantadas };
  },
  bot(m) {
    const s = m.datos;
    const i = s.nudos.findIndex((n) => n.fase === 'roja' || n.hoja);
    if (i < 0) return;
    s.auto = true;
    s.x = centro(i % COLS, COLS);
    s.y = centro(Math.floor(i / COLS), RAMAS);
    if (s.nudos[i].hoja) levantar(m);
    else pellizcar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      sel = celda(s);
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Rama que vuelve a producir'} · Temporada ${s.temporada}`}>
        {[0, 1, 2].map((f) => (
          <Block
            key={f}
            pos={[-1, 1.05, enMesa(0, f, COLS, RAMAS)[2]]}
            size={[9.2, 0.14, 0.14]}
            color="#6b4a2e"
            mat="wood"
            solid={false}
          />
        ))}
        {s.nudos.map((n, i) => {
          const [x, , z] = enMesa(i % COLS, Math.floor(i / COLS), COLS, RAMAS);
          return (
            <group key={i} position={[x, 1.05, z]}>
              <Ball pos={[0, 0.02, 0]} r={0.13} color={n.fase === 'muerto' ? '#3a2a1e' : '#8a6a45'} mat="wood" />
              {n.hoja ? (
                <Cyl pos={[0, 0.38, 0]} r={0.08} rTop={0.42} h={0.3} color="#3f8a46" mat="leaf" solid={false} />
              ) : n.fase === 'roja' ? (
                <Ball pos={[0, 0.3, 0]} r={0.22} color="#c8222a" mat="plastic" />
              ) : n.fase === 'verde' ? (
                <Ball pos={[0, 0.28, 0]} r={0.18} color="#7dbb3c" mat="plastic" />
              ) : null}
              {i === sel && <Ball pos={[0, 0.75, 0]} r={0.08} color="#ffffff" mat="neon" />}
            </group>
          );
        })}
        {m.parametros.lista && (
          // el cafeto de utilería pasa lista con su libretita
          <group position={[-5.4, 0.7, -2.4]} rotation={[0, 0, Math.sin(m.tiempo * 3) * 0.1]}>
            <Cyl pos={[0, 0.6, 0]} r={0.12} h={1.2} color="#6b4a2e" mat="wood" solid={false} />
            <Ball pos={[0, 1.5, 0]} r={0.55} color="#2f7a3a" mat="leaf" />
            <Plate
              pos={[0, 2.5, 0]}
              text={`📋 ¿Rama ${1 + (Math.floor(m.tiempo / 3) % 3)}? ¡Presente!`}
              h={0.22}
              bg="#4a3a22"
            />
          </group>
        )}
        <Label pos={[3.6, 3.1, -2.6]} text={s.temporada === 1 ? 'Temporada 1' : 'Temporada 2'} h={0.4} />
        <Puntero x={s.x} y={s.y} color="#ffd6d6" />
      </Mesa>
    );
  },
});
export const Cafe = motor.Escena;
export const guia = motor.guia;
