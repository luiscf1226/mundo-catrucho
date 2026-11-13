// Alfombra por esténcil: sujetá la plantilla y soplá aserrín. El viento corre la plantilla que no está sujeta.
import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import {
  acercar,
  cursor,
  haciaIndice,
  indice,
  metasLineales,
  mezcla,
  moverCursor,
  reloj,
  Taller,
  texto,
  turno,
  variante,
} from './comun';

const COLS = 9,
  FILAS = 4,
  PASO = 4,
  X0 = -6,
  Z0 = -2.4,
  T = 0.98;
const COLORES = ['#7b3fa0', '#f6c744', '#3d8b40', '#e63946', '#2a9df4', '#ff8c42'];
const PISO = '#e9dfc8';
type Plantilla = { col: number; fila: number; mascara: boolean[]; color: string };
type Celda = { meta: string | null; hecho: string | null; sucia: boolean };
type Estado = {
  c: ReturnType<typeof cursor>;
  celdas: Celda[];
  cola: Plantilla[];
  total: number;
  pausa: number;
  sujeta: boolean;
  soplo: number;
  rafaga: number;
  proxima: number;
  lado: number;
  corrida: boolean;
  azar: () => number;
  espera: number;
  ayuda: boolean;
  limpias: number;
  manchas: number;
  alfombras: number;
  sopladas: number;
  sujetadas: number;
  aviso: string;
};
type Param = { partida: boolean; reparar: boolean; nombre: string; semilla: number; cada: number };
type Sesion = Motor<Param, Estado>;
const at = (col: number, fila: number) => fila * COLS + col;
const posicion = (col: number, fila: number): [number, number] => [X0 + col, Z0 + fila];

/** Arma un diseño: dos mitades de 4×4 separadas por el paso de la procesión, en cuadros de 2×2. */
function disenar(s: Estado, p: Param) {
  s.celdas = Array.from({ length: COLS * FILAS }, (_, i) => ({
    meta: i % COLS === PASO ? null : PISO,
    hecho: null,
    sucia: false,
  }));
  const cola: Plantilla[] = [];
  for (const c0 of [0, 2, 5, 7])
    for (const f0 of [0, 2]) {
      const a = COLORES[Math.floor(s.azar() * COLORES.length)];
      let b = COLORES[Math.floor(s.azar() * COLORES.length)];
      if (b === a) b = COLORES[(COLORES.indexOf(a) + 1) % COLORES.length];
      const mascara = p.partida
        ? [true, false, false, true].map((v) => (s.azar() < 0.5 ? v : !v))
        : [true, true, true, true];
      if (mascara.every(Boolean) || mascara.every((v) => !v)) mascara.splice(0, 4, true, false, false, true);
      const partes = p.partida ? [mascara, mascara.map((v) => !v)] : [[true, true, true, true]];
      partes.forEach((m, k) => {
        cola.push({ col: c0, fila: f0, mascara: m, color: k ? b : a });
        m.forEach((v, i) => {
          if (v) s.celdas[at(c0 + (i % 2), f0 + Math.floor(i / 2))].meta = k ? b : a;
        });
      });
    }
  if (p.reparar) {
    // la alfombra ya está hecha; el viento barrió algunas plantillas y hay que reponerlas sin tapar lo listo
    for (const c of s.celdas) c.hecho = c.meta;
    const barridas = cola.sort(() => s.azar() - 0.5).slice(0, p.partida ? 5 : 3);
    for (const pl of barridas)
      pl.mascara.forEach((v, i) => {
        if (v) s.celdas[at(pl.col + (i % 2), pl.fila + Math.floor(i / 2))].hecho = null;
      });
    s.cola = barridas;
  } else s.cola = cola.sort(() => s.azar() - 0.5);
  s.total = s.cola.length;
  s.c.x = haciaIndice(s.azar() < 0.5 ? 0 : COLS - 2, COLS - 1);
}
function celdaPlantilla(s: Estado): [number, number] {
  return [indice(s.c.x, COLS - 1), indice(-s.c.y, FILAS - 1)];
}
function sujetar(m: Sesion) {
  const s = m.datos;
  if (s.soplo > 0 || !s.cola.length) return;
  s.sujeta = !s.sujeta;
  if (s.sujeta) s.sujetadas++;
  s.aviso = s.sujeta ? 'Plantilla sujeta: ahora soplá.' : 'Plantilla suelta.';
}
function soplar(m: Sesion) {
  const s = m.datos;
  const pl = s.cola[0];
  if (s.soplo > 0 || !pl) return;
  const [col, fila] = celdaPlantilla(s);
  s.sopladas++;
  s.soplo = 1;
  let buenas = 0,
    malas = 0;
  const pintar = (x: number, z: number) => {
    if (x < 0 || z < 0 || x >= COLS || z >= FILAS) return;
    const c = s.celdas[at(x, z)];
    if (c.hecho === pl.color) return;
    if (c.meta === pl.color && !c.hecho) {
      c.hecho = pl.color;
      buenas++;
    } else {
      c.hecho = pl.color;
      c.sucia = true;
      malas++;
    }
  };
  pl.mascara.forEach((v, i) => {
    if (v) pintar(col + (i % 2), fila + Math.floor(i / 2));
  });
  // sin sujetar, la ráfaga mete aserrín por los huecos de la plantilla
  if (s.rafaga > 0 && !s.sujeta && !s.ayuda) {
    pintar(col + (s.lado > 0 ? 2 : -1), fila);
    pintar(col + (s.lado > 0 ? 2 : -1), fila + 1);
  }
  m.sumar(buenas * 5 - malas * 10);
  s.manchas += malas;
  const falta = pl.mascara.some(
    (v, i) => v && s.celdas[at(pl.col + (i % 2), pl.fila + Math.floor(i / 2))].hecho !== pl.color,
  );
  s.cola.shift();
  if (falta) s.cola.push(pl);
  else if (!malas) {
    s.limpias++;
    const vecina = [-2, 2].some((dx) => {
      const x = pl.col + dx;
      return x >= 0 && x < COLS && x !== PASO && s.celdas[at(x, pl.fila)].hecho && !s.celdas[at(x, pl.fila)].sucia;
    });
    if (vecina) m.sumar(10);
    s.aviso = vecina ? '¡Borde limpio y continuo! +10' : '¡Borde limpio!';
  }
  if (malas)
    s.aviso = s.rafaga > 0 && !s.sujeta ? 'El viento metió aserrín por los huecos.' : 'Manchaste afuera del dibujo.';
  s.sujeta = false;
  if (!s.cola.length) {
    s.alfombras++;
    m.sumar(5 * s.total);
    s.aviso = `¡Alfombra lista! +${5 * s.total}. Viene otra.`;
    s.pausa = 2;
  }
}
const motor = defineMotor({
  id: 'comayagua.aserrin',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'Poné la plantilla sobre su dibujo, sujetala y soplá el aserrín. No manchés el paso de la procesión.',
    keys: [
      ['WASD / flechas', 'mover la plantilla'],
      ['Mouse / stick derecho', 'llevar la plantilla'],
      ['E / mando X', 'sujetar o soltar'],
      ['F / clic / RT', 'soplar aserrín'],
    ],
    touch: [
      ['Palanca / arrastrá', 'mover la plantilla'],
      ['E', 'sujetar'],
      ['🎯', 'soplar'],
    ],
  },
  etapa: (p) => ({
    partida: p.dif >= 0.5,
    reparar: variante(p) === 'reparar',
    nombre: texto(p.tema.nombre, 'Alfombra de aserrín'),
    semilla: p.seed,
    cada: 7 - p.dif * 3,
  }),
  metas: metasLineales(140, 300, 460, 60),
  duracion: reloj(80, 10),
  crear: (p): Estado => {
    const s: Estado = {
      c: cursor(),
      celdas: [],
      cola: [],
      total: 0,
      pausa: 0,
      sujeta: false,
      soplo: 0,
      rafaga: 0,
      proxima: p.cada * 0.6,
      lado: 1,
      corrida: false,
      azar: rng(p.semilla),
      espera: 0.6,
      ayuda: false,
      limpias: 0,
      manchas: 0,
      alfombras: 0,
      sopladas: 0,
      sujetadas: 0,
      aviso: 'Llevá la plantilla a su dibujo pálido.',
    };
    disenar(s, p);
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    if (!s.sujeta) moverCursor(s.c, dt, 1.3);
    else {
      // sujeta no se mueve; el puntero se registra para que no salte al soltarla
      s.c.px = input.px;
      s.c.py = input.py;
      s.c.auto = false;
    }
    if (s.soplo > 0) {
      s.soplo = Math.max(0, s.soplo - dt * 1.6);
    }
    if (s.pausa > 0) {
      s.pausa -= dt;
      if (s.pausa <= 0) disenar(s, m.parametros);
    }
    s.proxima -= dt;
    if (s.proxima <= 0) {
      s.rafaga = 1.6;
      s.lado = s.azar() < 0.5 ? -1 : 1;
      s.proxima = m.parametros.cada;
      s.corrida = false;
    }
    if (s.rafaga > 0) {
      s.rafaga = Math.max(0, s.rafaga - dt);
      // la ráfaga corre una casilla la plantilla suelta (con compa, él la detiene)
      if (!s.corrida && !s.sujeta && !s.ayuda && s.rafaga < 1) {
        s.corrida = true;
        s.c.x = haciaIndice(indice(s.c.x, COLS - 1) + s.lado, COLS - 1);
        s.c.x = Math.max(-1, Math.min(1, s.c.x));
      }
    }
    if (input.take('use')) sujetar(m);
    if (input.take('fire')) soplar(m);
    s.ayuda = false;
    const pl = s.cola[0];
    m.objetivo = s.aviso;
    m.lineas = [
      `Plantillas por soplar ${s.cola.length} · Alfombras ${s.alfombras}`,
      s.rafaga > 0
        ? `¡Ráfaga ${s.lado > 0 ? '→' : '←'}! ${s.sujeta ? 'La plantilla está sujeta.' : 'Sujetala con E.'}`
        : `Viento en ${Math.ceil(s.proxima)} s · Limpias ${s.limpias} · Manchas ${s.manchas}`,
      pl ? `Plantilla ${pl.mascara.filter(Boolean).length} casillas` : 'Secando…',
    ];
    m.stats = {
      limpias: s.limpias,
      manchas: s.manchas,
      alfombras: s.alfombras,
      sopladas: s.sopladas,
      sujetadas: s.sujetadas,
      col: celdaPlantilla(s)[0],
      fila: celdaPlantilla(s)[1],
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    const pl = s.cola[0];
    if (!pl || s.soplo > 0) return;
    const x = haciaIndice(pl.col, COLS - 1),
      y = -haciaIndice(pl.fila, FILAS - 1);
    if (!s.sujeta) {
      s.c.x = acercar(s.c.x, x, dt * 1.6);
      s.c.y = acercar(s.c.y, y, dt * 1.6);
      s.c.auto = true;
    }
    if (Math.abs(s.c.x - x) > 0.01 || Math.abs(s.c.y - y) > 0.01 || !turno(s, dt, 0.7)) return;
    if (s.rafaga > 0 || s.proxima < 1.2) {
      if (!s.sujeta) sujetar(m);
      else soplar(m);
    } else soplar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const pl = s.cola[0];
    const [col, fila] = celdaPlantilla(s);
    const [px, pz] = posicion(col, fila);
    const alto = 0.22 + s.soplo * 0.5;
    return (
      <Taller nombre={m.parametros.nombre} aviso="WASD plantilla · E sujetar · F soplar aserrín">
        <Block
          pos={[X0 + 4, 0.02, Z0 + 1.5]}
          size={[COLS + 1.2, 0.04, FILAS + 1.2]}
          color="#9e958a"
          mat="cobble"
          solid={false}
        />
        {s.celdas.map((c, i) => {
          const x = i % COLS,
            z = Math.floor(i / COLS);
          const [cx, cz] = posicion(x, z);
          const paso = x === PASO;
          const color =
            paso && !c.hecho
              ? '#d8d0c0'
              : c.sucia
                ? mezcla(c.hecho ?? '#6e5a48', '#3b2a1e', 0.55)
                : c.hecho
                  ? c.hecho
                  : mezcla(c.meta ?? PISO, PISO, 0.62);
          return (
            <Block
              key={i}
              pos={[cx, c.hecho ? 0.09 : 0.06, cz]}
              size={[T, c.hecho ? 0.08 : 0.04, T]}
              color={color}
              mat={paso ? 'stone' : c.hecho ? 'sand' : 'cloth'}
              solid={false}
              cast={false}
            />
          );
        })}
        <Label pos={[X0 + PASO, 0.5, Z0 - 0.9]} text="Paso de la procesión" h={0.26} bg="#5b3a24" />
        {pl && (
          <group position={[px + 0.5, alto, pz + 0.5]}>
            {[
              [0, -1.05, 2.1, 0.08],
              [0, 1.05, 2.1, 0.08],
              [-1.05, 0, 0.08, 2.1],
              [1.05, 0, 0.08, 2.1],
            ].map(([x, z, w, d], i) => (
              <Block
                key={i}
                pos={[x, 0, z]}
                size={[w, 0.08, d]}
                color={s.sujeta ? '#c0392b' : '#8a5a32'}
                mat="wood"
                solid={false}
              />
            ))}
            {pl.mascara.map((v, i) =>
              v ? (
                <Block
                  key={i}
                  pos={[(i % 2) - 0.5, 0.02, Math.floor(i / 2) - 0.5]}
                  size={[0.82, 0.03, 0.82]}
                  color={pl.color}
                  mat="glass"
                  solid={false}
                  cast={false}
                />
              ) : null,
            )}
            {s.sujeta &&
              [-1, 1].map((l) => (
                <Ball key={l} pos={[l * 1.05, 0.15, l * 1.05]} r={0.16} color="#6d6d6d" mat="stone" />
              ))}
          </group>
        )}
        {s.soplo > 0 &&
          [0, 1, 2, 3, 4].map((i) => (
            <Ball
              key={i}
              pos={[
                px + 0.5 + Math.sin(i * 2.1) * 0.7,
                0.3 + (1 - s.soplo) * (0.6 + i * 0.25),
                pz + 0.5 + Math.cos(i * 1.7) * 0.6,
              ]}
              r={0.09}
              color={COLORES[i % COLORES.length]}
              mat="sand"
              cast={false}
            />
          ))}
        {s.rafaga > 0 &&
          [0, 1, 2, 3].map((i) => {
            const k = (1.6 - s.rafaga) / 1.6;
            return (
              <Block
                key={i}
                pos={[(s.lado > 0 ? -7 : 3) + s.lado * k * 10, 0.6 + i * 0.35, Z0 + i * 1.1]}
                size={[0.5, 0.04, 0.12]}
                color="#e8f4ff"
                mat="cloth"
                solid={false}
                cast={false}
              />
            );
          })}
        {s.rafaga > 0 && (
          <Label pos={[-1.5, 3.5, -3.6]} text={`¡Ráfaga ${s.lado > 0 ? '→' : '←'}!`} h={0.42} bg="#2a6f97" />
        )}
        <Label pos={[3.4, 1.6, 2.4]} text={`Plantillas: ${s.cola.length}`} h={0.3} bg="#7a3b1f" />
      </Taller>
    );
  },
});
export const Aserrin = motor.Escena;
export const guia = motor.guia;
