import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, sector } from './comun';

/** Tres piezas de relieve alrededor de la cumbre: 0 arriba, 1 abajo a la izquierda, 2 abajo a la derecha. */
const GIRO = Math.PI / 2;
const NOMBRES = ['vertiente norte', 'vertiente poniente', 'vertiente oriente'];
const ALTOS = ['#7fb069', '#e9c46a', '#e76f51', '#6d597a', '#2a9d8f'];
type Pieza = { lados: number[]; giro: number };
type Estado = ReturnType<typeof cursor> & {
  piezas: Pieza[];
  espera: number;
  listo: number;
  armadas: number;
  partidas: number;
  vueltas: number;
  azar: () => number;
};
type Sesion = Motor<{ alturas: number; fija: boolean; seed: number }, Estado>;
/** cada pieza toca dos divisorias: la de su izquierda y la de su derecha; girarla cambia las dos */
const izq = (p: Pieza) => p.lados[p.giro];
const der = (p: Pieza) => p.lados[(p.giro + 1) % 4];
/** divisoria i: entre la pieza i y la siguiente */
const unida = (ps: Pieza[], i: number) => der(ps[i]) === izq(ps[(i + 1) % 3]);
const conectadas = (ps: Pieza[]) => [0, 1, 2].filter((i) => unida(ps, i)).length;
function armar(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    alto = () => Math.floor(s.azar() * p.alturas);
  const div = [alto(), alto(), alto()];
  s.piezas = [0, 1, 2].map((i) => {
    const giro = Math.floor(s.azar() * 4),
      lados = [alto(), alto(), alto(), alto()];
    lados[giro] = div[(i + 2) % 3];
    lados[(giro + 1) % 4] = div[i];
    return { lados, giro };
  });
  // la cumbre fija se queda como está; las otras se corren hasta que no quede armada
  do {
    for (let i = p.fija ? 1 : 0; i < 3; i++) s.piezas[i].giro = (s.piezas[i].giro + 1 + Math.floor(s.azar() * 3)) % 4;
  } while (conectadas(s.piezas) === 3);
}
/** cuántos giros faltan para unir las tres (busca entre las 64 posiciones) */
function plan(ps: Pieza[], fija: boolean) {
  let mejor: number[] = [],
    costo = Infinity;
  for (let k = 0; k < 64; k++) {
    const g = [k % 4, Math.floor(k / 4) % 4, Math.floor(k / 16)];
    if (fija && g[0] !== ps[0].giro) continue;
    const prueba = ps.map((p, i) => ({ ...p, giro: g[i] }));
    if (conectadas(prueba) < 3) continue;
    const c = g.reduce((t, x, i) => t + ((x - ps[i].giro + 4) % 4), 0);
    if (c < costo) {
      costo = c;
      mejor = g;
    }
  }
  return mejor;
}
function girar(m: Sesion, i: number) {
  const s = m.datos;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.3;
  if (m.parametros.fija && i === 0) {
    m.sumar(-15);
    useGame.getState().toast('La cumbre no se mueve: acomodá las otras dos.', '⛰️');
    return;
  }
  s.piezas[i].giro = (s.piezas[i].giro + 1) % 4;
  s.vueltas++;
  m.sumar(-2);
}
function probar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.6;
  if (conectadas(s.piezas) === 3) {
    s.armadas++;
    s.listo = 1.2;
    m.sumar(70);
    toast('¡Las tres vertientes bajan de la misma cumbre!', '🌄');
    return;
  }
  s.partidas++;
  m.sumar(-35);
  // al partirse, el agua corre por donde no era y mueve otra divisoria
  const libres = m.parametros.fija ? [1, 2] : [0, 1, 2],
    i = libres[Math.floor(s.azar() * libres.length)];
  s.piezas[i].giro = (s.piezas[i].giro + 1) % 4;
  toast('Se partió la cumbre: una divisoria no encaja y el agua movió otra.', '💧');
}
const motor = defineMotor({
  id: 'ocotepeque.trifinio',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'Apuntá a una pieza de relieve y girala con F. Cada giro mueve sus dos divisorias. Cuando las tres alturas encajen, apuntá al centro y probá la cumbre con F.',
    ...controles(),
  },
  etapa: (p) => ({
    alturas: 3 + Math.round(p.dif * 2),
    fija: p.tema.variante === 'la-cumbre-no-se-parte-en-tres',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    piezas: [],
    espera: 0,
    listo: 0,
    armadas: 0,
    partidas: 0,
    vueltas: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.piezas.length) armar(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) armar(m);
    }
    const k = sector(s.x, s.y, 3, GIRO);
    if (input.take('fire')) {
      if (k < 0) probar(m);
      else girar(m, k);
    }
    m.objetivo = k < 0 ? 'Centro: F prueba la cumbre' : `F gira la ${NOMBRES[k]}`;
    m.lineas = [
      `Divisorias unidas ${conectadas(s.piezas)} de 3${m.parametros.fija ? ' · la cumbre norte no se toca' : ''}`,
      `Relieves armados ${s.armadas} · Cumbres partidas ${s.partidas} · Giros ${s.vueltas}`,
    ];
    m.stats = { x: s.x, armadas: s.armadas, partidas: s.partidas, vueltas: s.vueltas };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.listo > 0 || !s.piezas.length) return;
    s.auto = true;
    const g = plan(s.piezas, m.parametros.fija),
      i = g.findIndex((x, j) => x !== s.piezas[j].giro);
    if (i < 0) {
      s.x = 0;
      s.y = 0;
      probar(m);
      return;
    }
    const a = GIRO + (i * Math.PI * 2) / 3;
    s.x = Math.cos(a) * 0.8;
    s.y = Math.sin(a) * 0.8;
    girar(m, i);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = sector(s.x, s.y, 3, GIRO),
      ps = s.piezas;
    if (!ps.length) return null;
    const alto = (c: number) => 0.3 + c * 0.32;
    return (
      <Mesa titulo="Maqueta del Trifinio · tres vertientes, una cumbre">
        {ps.map((p, i) => {
          const a = GIRO + (i * Math.PI * 2) / 3,
            cx = -1 + Math.cos(a) * 1.9,
            cz = -Math.sin(a) * 1.9;
          return (
            <group key={i}>
              <Cyl
                pos={[cx, 0.85, cz]}
                r={1.25}
                h={0.3}
                sides={6}
                color={i === k ? '#ffd166' : ['#6a994e', '#8a9a5b', '#5b8e7d'][i]}
                mat="grass"
                solid={false}
              />
              {/* los cuatro lados de la pieza con su altura (color); los dos que tocan divisorias, grandes */}
              {[0, 1, 2, 3].map((g) => {
                const r = (g - p.giro + 4) % 4;
                return (
                  <Ball
                    key={g}
                    pos={[cx + Math.cos((r * Math.PI) / 2) * 0.6, 1.08, cz - Math.sin((r * Math.PI) / 2) * 0.6]}
                    r={r < 2 ? 0.17 : 0.1}
                    color={ALTOS[p.lados[g]]}
                  />
                );
              })}
              <Label pos={[cx, 1.9, cz]} text={NOMBRES[i]} h={0.2} />
            </group>
          );
        })}
        {/* en cada divisoria, la altura de un lado y la del otro: si son iguales, encajan */}
        {[0, 1, 2].map((i) => {
          const a = GIRO + ((i + 0.5) * Math.PI * 2) / 3,
            bien = unida(ps, i),
            dx = Math.cos(a + Math.PI / 2) * 0.28,
            dz = -Math.sin(a + Math.PI / 2) * 0.28,
            x = -1 + Math.cos(a) * 1.75,
            z = -Math.sin(a) * 1.75,
            a1 = der(ps[i]),
            a2 = izq(ps[(i + 1) % 3]);
          return (
            <group key={`d${i}`}>
              <Block
                pos={[x - dx, 1 + alto(a1) / 2, z - dz]}
                size={[0.36, alto(a1), 0.36]}
                color={ALTOS[a1]}
                mat="stone"
                solid={false}
              />
              <Block
                pos={[x + dx, 1 + alto(a2) / 2, z + dz]}
                size={[0.36, alto(a2), 0.36]}
                color={ALTOS[a2]}
                mat="stone"
                solid={false}
              />
              <Block
                pos={[-1 + Math.cos(a) * 3.1, 0.75, -Math.sin(a) * 3.1]}
                size={[0.5, 0.06, 0.5]}
                color={bien ? '#4cc9f0' : '#6b5440'}
                mat={bien ? 'water' : 'dirt'}
                solid={false}
              />
            </group>
          );
        })}
        <Cyl
          pos={[-1, 1.3, 0]}
          r={0.55}
          rTop={0.05}
          h={1.1}
          color={k < 0 ? '#ffd166' : '#8d7b68'}
          mat="stone"
          solid={false}
        />
        <Label
          pos={[-1, 3.3, -2.6]}
          text={s.listo > 0 ? '¡Cumbre armada! 🌄' : `Unidas ${conectadas(ps)} de 3`}
          h={0.36}
        />
      </Mesa>
    );
  },
});
export const Trifinio = motor.Escena;
export const guia = motor.guia;
