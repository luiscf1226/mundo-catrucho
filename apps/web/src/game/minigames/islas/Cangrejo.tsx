import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, P } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { cursor, Cangrejo as FiguraCangrejo, Isla, Muelle, moverCursor, texto } from './comun';

const COLS = 9;
const FILAS = 5;
const LADO = 1.2;
const X0 = -2.4;
const Z0 = -1.2;
const pos = (c: number, f: number): [number, number] => [
  X0 + (c - (COLS - 1) / 2) * LADO,
  Z0 + (f - (FILAS - 1) / 2) * LADO,
];
const DIRS: [number, number][] = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
];
type Cerca = { c: number; f: number; vida: number };
type Estado = {
  cur: ReturnType<typeof cursor>;
  col: number;
  fila: number;
  rocas: boolean[];
  cercas: Cerca[];
  cc: number;
  cf: number;
  antes: [number, number];
  dir: number;
  paso: number;
  refugio: [number, number];
  pausa: number;
  azar: () => number;
  ayuda: boolean;
  refugiados: number;
  arrinconados: number;
  puestas: number;
  aviso: string;
};
type Param = { paso: number; vida: number; max: number; rocas: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
const dentro = (c: number, f: number) => c >= 0 && f >= 0 && c < COLS && f < FILAS;
function libre(s: Estado, c: number, f: number) {
  return dentro(c, f) && !s.rocas[f * COLS + c] && !s.cercas.some((k) => k.c === c && k.f === f);
}
/** Camino más corto (BFS) al refugio; devuelve la primera casilla o null si no hay salida. */
function camino(s: Estado): [number, number] | null {
  const prev = new Map<number, number>();
  const ini = s.cf * COLS + s.cc;
  const fin = s.refugio[1] * COLS + s.refugio[0];
  const cola = [ini];
  prev.set(ini, -1);
  while (cola.length) {
    const i = cola.shift() ?? 0;
    if (i === fin) break;
    for (const [dc, df] of DIRS) {
      const c = (i % COLS) + dc;
      const f = Math.floor(i / COLS) + df;
      const j = f * COLS + c;
      if (libre(s, c, f) && !prev.has(j)) {
        prev.set(j, i);
        cola.push(j);
      }
    }
  }
  if (!prev.has(fin)) return null;
  let i = fin;
  while (prev.get(i) !== ini && prev.get(i) !== -1) i = prev.get(i) ?? ini;
  return [i % COLS, Math.floor(i / COLS)];
}
function nuevoCangrejo(m: Sesion, rocasNuevas: boolean) {
  const s = m.datos;
  const p = m.parametros;
  s.cercas = [];
  for (let intento = 0; intento < 40; intento++) {
    s.refugio = [COLS - 1, Math.floor(s.azar() * FILAS)];
    s.cc = 0;
    s.cf = Math.floor(s.azar() * FILAS);
    if (rocasNuevas) {
      s.rocas = Array.from({ length: COLS * FILAS }, () => false);
      for (let k = 0; k < p.rocas; k++) {
        const c = 1 + Math.floor(s.azar() * (COLS - 2));
        s.rocas[Math.floor(s.azar() * FILAS) * COLS + c] = true;
      }
    }
    if (camino(s)) break;
  }
  s.antes = [s.cc, s.cf];
  s.dir = 0;
  s.paso = 0;
  s.pausa = 1;
}
function tocar(m: Sesion, c: number, f: number) {
  const s = m.datos;
  const i = s.cercas.findIndex((k) => k.c === c && k.f === f);
  if (i >= 0) {
    s.cercas.splice(i, 1);
    return;
  }
  if (
    !dentro(c, f) ||
    s.rocas[f * COLS + c] ||
    (c === s.cc && f === s.cf) ||
    (c === s.refugio[0] && f === s.refugio[1])
  )
    return;
  if (s.cercas.length >= m.parametros.max) s.cercas.shift();
  s.cercas.push({ c, f, vida: m.parametros.vida + (s.ayuda ? 1.5 : 0) });
  s.puestas++;
}
function caminar(m: Sesion) {
  const s = m.datos;
  const opciones = DIRS.map((_, k) => k).filter((k) => libre(s, s.cc + DIRS[k][0], s.cf + DIRS[k][1]));
  if (!opciones.length) {
    s.arrinconados++;
    m.sumar(-20);
    s.aviso = 'Lo arrinconaste: sin salida no hay turno. Dejale un camino.';
    nuevoCangrejo(m, false);
    return;
  }
  const atras = (s.dir + 2) % 4;
  let k = s.dir;
  const sigue = opciones.includes(s.dir) && s.azar() > 0.3;
  if (!sigue) {
    const lados = opciones.filter((o) => o !== atras);
    const pool = lados.length ? lados : opciones;
    k = pool[Math.floor(s.azar() * pool.length)];
  }
  s.dir = k;
  s.antes = [s.cc, s.cf];
  s.cc += DIRS[k][0];
  s.cf += DIRS[k][1];
  if (s.cc === s.refugio[0] && s.cf === s.refugio[1]) {
    s.refugiados++;
    m.sumar(40);
    s.aviso = '¡Llegó a su refugio! Ahí viene otro.';
    nuevoCangrejo(m, s.refugiados % 2 === 0);
  }
}
const motor = defineMotor({
  id: 'islas.cangrejo',
  fondo: 'mar',
  guia: {
    goal: 'Poné cercas un ratito para que el cangrejo azul encuentre su refugio. Nunca lo dejés sin salida.',
    keys: [
      ['WASD / flechas', 'mover el cursor'],
      ['Mouse / stick derecho', 'apuntar casilla'],
      ['F / clic / RT', 'poner o quitar cerca'],
    ],
    touch: [
      ['Palanca / arrastrá', 'mover el cursor'],
      ['🎯', 'poner o quitar cerca'],
    ],
  },
  etapa: (p) => ({
    paso: 0.62 - p.dif * 0.22,
    vida: 5 - p.dif * 1.5,
    max: p.dif < 0.6 ? 3 : 2,
    rocas: 4 + Math.round(p.dif * 4),
    nombre: texto(p.tema.nombre, 'Barreras para cangrejo azul'),
    semilla: p.seed,
  }),
  metas: (p) => [120 + Math.round(p.dif * 60), 240 + Math.round(p.dif * 60), 360 + Math.round(p.dif * 60)],
  duracion: (p) => 80 + Math.round(p.dif * 10),
  crear: (p): Estado => {
    const s: Estado = {
      cur: cursor(),
      col: 4,
      fila: 2,
      rocas: [],
      cercas: [],
      cc: 0,
      cf: 2,
      antes: [0, 2],
      dir: 0,
      paso: 0,
      refugio: [COLS - 1, 2],
      pausa: 0,
      azar: rng(p.semilla),
      ayuda: false,
      refugiados: 0,
      arrinconados: 0,
      puestas: 0,
      aviso: 'El cangrejo camina de lado y cambia de idea. Guialo con cercas.',
    };
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    if (!s.rocas.length) nuevoCangrejo(m, true);
    moverCursor(s.cur, dt, 1.4);
    s.col = Math.max(0, Math.min(COLS - 1, Math.round(((s.cur.x + 1) / 2) * (COLS - 1))));
    s.fila = Math.max(0, Math.min(FILAS - 1, Math.round(((1 - s.cur.y) / 2) * (FILAS - 1))));
    if (input.take('fire')) tocar(m, s.col, s.fila);
    for (const k of s.cercas) k.vida -= dt;
    s.cercas = s.cercas.filter((k) => k.vida > 0);
    s.ayuda = false;
    if (s.pausa > 0) s.pausa -= dt;
    else {
      s.paso += dt / p.paso;
      if (s.paso >= 1) {
        s.paso = 0;
        caminar(m);
      }
    }
    m.objetivo = s.aviso;
    m.lineas = [
      `Cercas ${s.cercas.length}/${p.max} · duran ${p.vida.toFixed(1)} s`,
      `En su refugio ${s.refugiados} · Arrinconados ${s.arrinconados}`,
    ];
    m.stats = { refugiados: s.refugiados, arrinconados: s.arrinconados, puestas: s.puestas, cercas: s.cercas.length };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    if (m.tiempo % 0.15 > _dt) return;
    const sig = camino(s);
    if (!sig) {
      if (s.cercas.length) tocar(m, s.cercas[0].c, s.cercas[0].f);
      return;
    }
    // tapa las salidas que no van al refugio, sin pasar del máximo y sin tapar el camino
    for (const [dc, df] of DIRS) {
      const c = s.cc + dc;
      const f = s.cf + df;
      if ((c === sig[0] && f === sig[1]) || !libre(s, c, f)) continue;
      if (s.cercas.length >= m.parametros.max) {
        const vieja = s.cercas.findIndex((k) => Math.abs(k.c - s.cc) + Math.abs(k.f - s.cf) > 1);
        if (vieja < 0) return;
        tocar(m, s.cercas[vieja].c, s.cercas[vieja].f);
      }
      s.cur.x = (c / (COLS - 1)) * 2 - 1;
      s.cur.y = 1 - (f / (FILAS - 1)) * 2;
      s.cur.auto = true;
      tocar(m, c, f);
      return;
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const k = Math.min(1, s.paso * 2.5);
    const [ax, az] = pos(s.antes[0], s.antes[1]);
    const [bx, bz] = pos(s.cc, s.cf);
    const [rx, rz] = pos(s.refugio[0], s.refugio[1]);
    const [ux, uz] = pos(s.col, s.fila);
    return (
      <Isla nombre={m.parametros.nombre} aviso="F pone una cerca un ratito · dejale siempre salida">
        <Muelle letrero="Guanaja · paso de cangrejos" />
        <Block
          pos={[X0, 0.03, Z0]}
          size={[COLS * LADO + 0.4, 0.06, FILAS * LADO + 0.4]}
          color="#e8d29c"
          mat="sand"
          solid={false}
          cast={false}
        />
        {Array.from({ length: COLS * FILAS }, (_, i) => {
          const [x, z] = pos(i % COLS, Math.floor(i / COLS));
          return (i + Math.floor(i / COLS)) % 2 ? (
            <Block
              key={i}
              pos={[x, 0.065, z]}
              size={[LADO, 0.01, LADO]}
              color="#dcc48a"
              mat="sand"
              solid={false}
              cast={false}
            />
          ) : null;
        })}
        {s.rocas.map((r, i) => {
          if (!r) return null;
          const [x, z] = pos(i % COLS, Math.floor(i / COLS));
          return <P.Rock key={i} pos={[x, 0, z]} scale={0.55} solid={false} />;
        })}
        {s.cercas.map((c) => {
          const [x, z] = pos(c.c, c.f);
          const lateral = c.c !== s.cc;
          return (
            <group key={`${c.c}-${c.f}`} position={[x, 0, z]} rotation-y={lateral ? Math.PI / 2 : 0}>
              {[-0.45, 0, 0.45].map((d) => (
                <Cyl key={d} pos={[d, 0.4, 0]} r={0.05} h={0.8} color="#8a6a45" mat="wood" solid={false} cast={false} />
              ))}
              <Block
                pos={[0, 0.55, 0]}
                size={[1.05, 0.32, 0.06]}
                color={c.vida < 1.2 ? '#f4a261' : '#e9c46a'}
                mat="cloth"
                solid={false}
              />
            </group>
          );
        })}
        <group position={[rx, 0, rz]}>
          <Cyl pos={[0, 0.06, 0]} r={0.42} h={0.04} color="#3b2a1a" mat="dirt" solid={false} cast={false} />
          <P.Bush pos={[0.55, 0, -0.45]} scale={0.6} solid={false} />
          <Label pos={[0, 1.4, 0]} text="refugio" h={0.26} bg="#2a9d8f" />
        </group>
        <FiguraCangrejo
          pos={[ax + (bx - ax) * k, 0, az + (bz - az) * k]}
          rot={s.dir % 2 ? Math.PI / 2 : 0}
          paso={m.tiempo * 9}
        />
        <Block
          pos={[ux, 0.09, uz]}
          size={[LADO * 0.95, 0.03, LADO * 0.95]}
          color="#fff3b0"
          mat="neon"
          solid={false}
          cast={false}
        />
        <Ball pos={[ux, 1.3, uz]} r={0.12} color="#fff3b0" mat="neon" cast={false} />
        {[-6.4, -3.6, -0.6, 2].map((x, i) => (
          <P.Palm key={x} pos={[x, 0, -5.4 - (i % 2)]} scale={0.8} solid={false} />
        ))}
      </Isla>
    );
  },
});
export const Cangrejo = motor.Escena;
export const guia = motor.guia;
