import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, xDe } from './comun';

const COLORES = ['#e63946', '#2a9d8f', '#e9c46a', '#6d597a'];
const NOMBRES = ['roja', 'verde', 'amarilla', 'morada'];
/** peso 1 = liviano, 2 = pesado, 3 = racimo de espuma gigante (ocupa dos lugares y busca asiento libre) */
type Gancho = { x: number; peso: 1 | 2 | 3; destino: number; va?: number };
/** estación a la que va el gancho (la espuma va a la que eligió quien la soltó) */
const rumbo = (g: Gancho) => (g.destino >= 0 ? g.destino : (g.va ?? -1));
type Estacion = { carga: number; pesado: number; lavando: number };
type Estado = ReturnType<typeof cursor> & {
  agujas: boolean[];
  cola: Gancho[];
  linea: Gancho[];
  estaciones: Estacion[];
  /** segundos desde que salió el último gancho y su peso */
  desde: number;
  ultimo: number;
  atasco: number;
  espera: number;
  lavados: number;
  entregados: number;
  ajenos: number;
  atascos: number;
  perdidos: number;
  toques: number;
  sueltos: number;
  azar: () => number;
};
type Param = {
  n: number;
  cupo: number;
  vel: number;
  pesados: number;
  separacion: number;
  descarga: number;
  espuma: boolean;
  seed: number;
};
type Sesion = Motor<Param, Estado>;
const X0 = -5.6,
  X1 = 3.6,
  ZL = -1.8;
/** dónde queda la aguja `i` de `n` sobre el cable */
const xAguja = (i: number, n: number) => -3.6 + (i * 6) / Math.max(1, n - 1);
const lugares = (g: Gancho) => (g.peso === 3 ? 2 : 1);
function nuevo(s: Estado, p: Param): Gancho {
  if (p.espuma && s.azar() < 0.2) return { x: X0, peso: 3, destino: -1 };
  return { x: X0, peso: s.azar() < p.pesados ? 2 : 1, destino: Math.floor(s.azar() * p.n) };
}
/** ¿se puede soltar el próximo gancho sin juntar cargas? */
function separado(s: Estado, p: Param) {
  const g = s.cola[0];
  if (!g) return false;
  const pesado = g.peso >= 2 && s.ultimo >= 2;
  return s.desde >= (pesado ? p.separacion : 0.8);
}
function soltar(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    g = s.cola.shift();
  if (!g || s.espera > 0 || s.atasco > 0) {
    if (g) s.cola.unshift(g);
    return;
  }
  s.espera = 0.25;
  s.sueltos++;
  const junto = s.desde < (g.peso >= 2 && s.ultimo >= 2 ? p.separacion : 0.8);
  s.cola.push(nuevo(s, p));
  if (junto) {
    // dos cargas pesadas juntas atascan el cable: el gancho se regresa y todo se detiene un rato
    s.atascos++;
    s.atasco = 2;
    s.cola.unshift(g);
    s.cola.pop();
    m.sumar(-25);
    useGame.getState().toast('¡Juntaste cargas pesadas y se atascó el cable!', '⛓️');
    return;
  }
  s.desde = 0;
  s.ultimo = g.peso;
  s.linea.push(g);
}
function tocar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.15;
  s.toques++;
  const k = casilla(s.x, s.agujas.length);
  s.agujas[k] = !s.agujas[k];
}
function llega(m: Sesion, g: Gancho, k: number) {
  const s = m.datos,
    p = m.parametros,
    e = s.estaciones[k],
    toast = useGame.getState().toast;
  if (e.lavando > 0 || e.carga + lugares(g) > p.cupo || (g.peso >= 2 && e.pesado > 0)) {
    s.atascos++;
    m.sumar(-25);
    toast(
      e.lavando > 0
        ? 'Esa estación está lavando: el racimo se trabó en el ramal.'
        : g.peso >= 2 && e.pesado > 0
          ? 'Dos racimos pesados en el mismo ramal: ¡atasco!'
          : g.peso === 3
            ? 'El racimo de espuma pidió dos asientos y ahí no cabía.'
            : 'Ese ramal ya no tiene cupo.',
      '⛓️',
    );
    return;
  }
  if (g.destino >= 0 && g.destino !== k) {
    s.ajenos++;
    m.sumar(-20);
    toast(`Ese racimo iba para la estación ${NOMBRES[g.destino]}.`, '🍌');
    return;
  }
  e.carga += lugares(g);
  if (g.peso >= 2) e.pesado = p.descarga;
  s.entregados++;
  m.sumar(g.peso === 3 ? 30 : g.peso === 2 ? 15 : 10);
  if (e.carga >= p.cupo) {
    e.lavando = 1.5;
    s.lavados++;
    m.sumar(40);
    toast(`¡Se llenó la estación ${NOMBRES[k]}: a lavar!`, '💦');
  }
}
/** carga que tiene o lleva en camino la estación `k` */
const cargaDe = (s: Estado, k: number) =>
  s.estaciones[k].carga + s.linea.filter((o) => rumbo(o) === k).reduce((t, o) => t + lugares(o), 0);
/** estación que le sirve al gancho: la suya, o para la espuma la más vacía con dos lugares y sin pesados */
function meta(s: Estado, p: Param, g: Gancho) {
  if (g.destino >= 0) return g.destino;
  let mejor = -1;
  s.estaciones.forEach((e, k) => {
    const pesado = e.pesado > 0.6 || s.linea.some((o) => rumbo(o) === k && o.peso >= 2);
    if (e.lavando > 0 || pesado || cargaDe(s, k) + 2 > p.cupo) return;
    if (mejor < 0 || cargaDe(s, k) < cargaDe(s, mejor)) mejor = k;
  });
  return mejor;
}
const motor = defineMotor({
  id: 'yoro.cable',
  modos: { duo: { tipo: 'compartido', cada: 2 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'Cada racimo lleva el color de su estación de lavado. E suelta el próximo gancho al cable; A/D eligen aguja y F la abre o la cierra: el gancho entra en la primera aguja abierta. Dejá espacio entre dos pesados o se atasca.',
    ...controles('soltar gancho'),
  },
  etapa: (p) => ({
    n: 3 + Math.round(p.dif),
    cupo: 4,
    vel: 1.4 + p.dif * 0.6,
    pesados: 0.3 + p.dif * 0.2,
    separacion: 1.6 + p.dif * 0.6,
    descarga: 2 + p.dif * 0.8,
    espuma: p.tema.variante === 'el-racimo-pidio-asiento',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      agujas: Array.from({ length: p.n }, () => false),
      cola: [],
      linea: [],
      estaciones: Array.from({ length: p.n }, () => ({ carga: 0, pesado: 0, lavando: 0 })),
      desde: 9,
      ultimo: 1,
      atasco: 0,
      espera: 0,
      lavados: 0,
      entregados: 0,
      ajenos: 0,
      atascos: 0,
      perdidos: 0,
      toques: 0,
      sueltos: 0,
      azar: rng(p.seed),
    };
    for (let i = 0; i < 3; i++) s.cola.push(nuevo(s, p));
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros,
      n = p.n;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.desde += dt;
    for (const e of s.estaciones) {
      e.pesado = Math.max(0, e.pesado - dt);
      if (e.lavando > 0) {
        e.lavando -= dt;
        if (e.lavando <= 0) e.carga = 0;
      }
    }
    if (s.atasco > 0) s.atasco -= dt;
    else
      for (const g of [...s.linea]) {
        const antes = g.x;
        g.x += p.vel * dt;
        const k = s.agujas.findIndex((abierta, i) => abierta && antes < xAguja(i, n) && g.x >= xAguja(i, n));
        if (k >= 0) {
          s.linea = s.linea.filter((o) => o !== g);
          llega(m, g, k);
        } else if (g.x > X1) {
          s.linea = s.linea.filter((o) => o !== g);
          s.perdidos++;
          m.sumar(-20);
          useGame.getState().toast('Un racimo se fue al final del cable sin lavar.', '🍌');
        }
      }
    if (input.take('use')) soltar(m);
    if (input.take('fire')) tocar(m);
    const g = s.cola[0],
      k = casilla(s.x, n);
    m.objetivo = g
      ? `Próximo: ${g.peso === 3 ? 'racimo de espuma (dos asientos)' : `${g.peso === 2 ? 'pesado' : 'liviano'} a la ${NOMBRES[g.destino]}`}`
      : 'Cable listo';
    m.lineas = [
      `Aguja ${NOMBRES[k]}: ${s.agujas[k] ? 'abierta' : 'cerrada'}${s.atasco > 0 ? ' · ¡cable atascado!' : !separado(s, p) ? ' · esperá para soltar' : ''}`,
      `Lavados ${s.lavados} · Entregados ${s.entregados} · Atascos ${s.atascos} · Perdidos ${s.perdidos + s.ajenos}`,
    ];
    m.stats = {
      x: s.x,
      lavados: s.lavados,
      entregados: s.entregados,
      atascos: s.atascos,
      perdidos: s.perdidos,
      ajenos: s.ajenos,
      toques: s.toques,
      sueltos: s.sueltos,
    };
  },
  bot(m) {
    const s = m.datos,
      p = m.parametros,
      n = p.n;
    if (s.espera > 0 || s.atasco > 0) return;
    s.auto = true;
    // cada aguja se pone como la necesita el gancho que viene más cerca antes de ella
    for (let i = 0; i < n; i++) {
      const xa = xAguja(i, n),
        g = s.linea.filter((o) => o.x < xa).sort((a, b) => b.x - a.x)[0];
      const quiere = g ? rumbo(g) === i : false;
      if (g && s.agujas[i] !== quiere && xa - g.x < 2.6) {
        s.x = xDe(i, n);
        tocar(m);
        return;
      }
    }
    const g = s.cola[0];
    if (!g || !separado(s, p)) return;
    const k = meta(s, p, g);
    if (k < 0) return;
    const e = s.estaciones[k];
    // no manda a una estación que va a estar lavando o con un pesado cuando llegue
    const viaje = (xAguja(k, n) - X0) / p.vel,
      enCamino = s.linea.filter((o) => rumbo(o) === k);
    const carga = cargaDe(s, k);
    if (e.lavando > 0 && e.lavando > viaje - 0.2) return;
    if (carga + lugares(g) > p.cupo) return;
    if (g.peso >= 2 && (e.pesado > viaje - 0.3 || enCamino.some((o) => o.peso >= 2))) return;
    if (g.destino < 0) g.va = k;
    soltar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      p = m.parametros,
      n = p.n,
      k = casilla(s.x, n);
    return (
      <Mesa titulo="Cable bananero · estaciones de lavado">
        <Block pos={[(X0 + X1) / 2, 2.2, ZL]} size={[X1 - X0, 0.05, 0.05]} color="#3d3d3d" mat="metal" solid={false} />
        {[X0, X1].map((x) => (
          <Cyl key={x} pos={[x, 1.45, ZL]} r={0.08} h={1.5} color="#6b4a2a" mat="wood" solid={false} />
        ))}
        {s.agujas.map((abierta, i) => {
          const x = xAguja(i, n),
            e = s.estaciones[i];
          return (
            <group key={i}>
              <Block
                pos={[x, 2.2, ZL + 0.25]}
                size={[0.3, 0.12, 0.5]}
                rot={abierta ? 0.7 : 0}
                color={i === k ? '#ffd166' : abierta ? '#57cc99' : '#9a9a9a'}
                mat="metal"
                solid={false}
              />
              {/* ramal hacia la estación */}
              <Block
                pos={[x, 2.2, ZL + 1.6]}
                size={[0.05, 0.05, 2.6]}
                color={abierta ? '#57cc99' : '#5a5a5a'}
                mat="metal"
                solid={false}
              />
              <Block
                pos={[x, 0.95, 1.6]}
                size={[1.3, 0.5, 1.1]}
                color={e.lavando > 0 ? '#90e0ef' : COLORES[i]}
                mat="plastic"
                solid={false}
              />
              {Array.from({ length: p.cupo }, (_, j) => (
                <Block
                  key={j}
                  pos={[x - 0.45 + (j * 0.9) / Math.max(1, p.cupo - 1), 1.25, 2.2]}
                  size={[0.18, 0.1, 0.18]}
                  color={j < e.carga ? '#f4d35e' : '#ffffff'}
                  solid={false}
                />
              ))}
              <Label
                pos={[x, 1.9, 2.4]}
                text={`${e.lavando > 0 ? '💦 lavando' : `${e.carga}/${p.cupo}`}${e.pesado > 0 ? ' · ⚠️ pesado' : ''}`}
                h={0.26}
              />
            </group>
          );
        })}
        {s.linea.map((g, i) => (
          <group key={i} position={[g.x, 0, ZL]}>
            <Block pos={[0, 2.0, 0]} size={[0.06, 0.4, 0.06]} color="#3d3d3d" mat="metal" solid={false} />
            {g.peso === 3 ? (
              <Ball pos={[0, 1.45, 0]} r={0.5} color="#fdfd96" mat="cloth" />
            ) : (
              <Cyl
                pos={[0, 1.5, 0]}
                r={g.peso === 2 ? 0.3 : 0.2}
                h={0.6}
                color={g.peso === 2 ? '#8ab17d' : '#b5e48c'}
                mat="leaf"
                solid={false}
              />
            )}
            <Ball pos={[0, 1.15, 0.22]} r={0.1} color={g.destino >= 0 ? COLORES[g.destino] : '#ffffff'} />
          </group>
        ))}
        {s.cola.slice(0, 3).map((g, i) => (
          <group key={i} position={[X0 - 0.2, 0, ZL + 1.2 + i * 0.8]}>
            <Cyl
              pos={[0, 1, 0]}
              r={g.peso === 3 ? 0.36 : g.peso === 2 ? 0.26 : 0.18}
              h={0.4}
              color={g.peso === 3 ? '#fdfd96' : '#8ab17d'}
              mat="leaf"
              solid={false}
            />
            <Ball pos={[0, 1.3, 0]} r={0.1} color={g.destino >= 0 ? COLORES[g.destino] : '#ffffff'} />
          </group>
        ))}
        <Label pos={[X0 - 0.2, 2.1, ZL + 1.2]} text="Próximos" h={0.24} />
        <Label
          pos={[-1, 3.3, -2.6]}
          text={s.atasco > 0 ? '⛓️ Cable atascado' : `Aguja ${NOMBRES[k]} · ${s.agujas[k] ? 'abierta' : 'cerrada'}`}
          h={0.36}
        />
      </Mesa>
    );
  },
});
export const Cable = motor.Escena;
export const guia = motor.guia;
