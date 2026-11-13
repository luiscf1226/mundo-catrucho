import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { cursor, Coral as FiguraCoral, Isla, Laguna, loco, Muelle, moverCursor, Pez, texto } from './comun';

/** Especies simuladas: cuánta luz quieren (0 sombra, 1 media, 2 sol) y cuánta corriente necesitan (nutrientes). */
const ESPECIES = [
  { nombre: 'Cuerno', tipo: 'cuerno', color: '#ff6b4a', luz: 2, corriente: 1 },
  { nombre: 'Cerebro', tipo: 'cerebro', color: '#a7c957', luz: 1, corriente: 1 },
  { nombre: 'Abanico', tipo: 'abanico', color: '#b04fe0', luz: 0, corriente: 2 },
  { nombre: 'Tubo', tipo: 'tubo', color: '#ffb000', luz: 1, corriente: 2 },
];
type Celda = { especie: number; crece: number; adulta: boolean; estres: number };
type Estado = {
  c: ReturnType<typeof cursor>;
  col: number;
  fila: number;
  celdas: (Celda | null)[];
  corriente: number[];
  cola: number[];
  modulos: number;
  azar: () => number;
  adultas: number;
  blanqueadas: number;
  puestos: number;
  apretadas: number;
  ultimo: number;
  aviso: string;
};
type Param = {
  cols: number;
  filas: number;
  crece: number;
  modulos: number;
  especies: number;
  nombre: string;
  loco: boolean;
  semilla: number;
};
type Sesion = Motor<Param, Estado>;
const LADO = 1.45;
const posCelda = (p: Param, col: number, fila: number): [number, number] => [
  -1.8 + (col - (p.cols - 1) / 2) * LADO,
  -1 + (fila - (p.filas - 1) / 2) * LADO,
];
/** Luz base: más sol cerca de la superficie (filas de atrás) y sombra donde hay una colonia adulta al lado. */
function luz(m: Sesion, col: number, fila: number) {
  const p = m.parametros;
  let l = fila < p.filas / 3 ? 2 : fila < (2 * p.filas) / 3 ? 1 : 0;
  if (vecinos(m, col, fila).some((c) => c?.adulta && ESPECIES[c.especie].tipo !== 'abanico')) l = Math.max(0, l - 1);
  return l;
}
function vecinos(m: Sesion, col: number, fila: number) {
  const { cols, filas } = m.parametros;
  return [
    [col - 1, fila],
    [col + 1, fila],
    [col, fila - 1],
    [col, fila + 1],
  ]
    .filter(([c, f]) => c >= 0 && f >= 0 && c < cols && f < filas)
    .map(([c, f]) => m.datos.celdas[f * cols + c]);
}
function poner(m: Sesion, col: number, fila: number) {
  const s = m.datos;
  const i = fila * m.parametros.cols + col;
  if (s.celdas[i]) {
    s.aviso = 'Ese módulo ya está ocupado.';
    return;
  }
  if (s.modulos <= 0) {
    s.aviso = 'Sin módulos: esperá que una colonia llegue a adulta.';
    return;
  }
  s.modulos--;
  s.puestos++;
  s.celdas[i] = { especie: s.cola.shift() ?? 0, crece: 0, adulta: false, estres: 0 };
  s.cola.push(Math.floor(s.azar() * m.parametros.especies));
  s.aviso = 'Juvenil sembrado. Mirá si le llega su luz y su corriente.';
}
/** Qué tan bien le va a un juvenil en esa celda: 1 perfecto, 0.4 regular, 0 mal; null si está hacinado. */
function ajuste(m: Sesion, especie: number, col: number, fila: number) {
  const e = ESPECIES[especie];
  const ocupados = vecinos(m, col, fila).filter(Boolean).length;
  if (ocupados >= 2) return null;
  const dl = Math.abs(luz(m, col, fila) - e.luz);
  const nutre = m.datos.corriente[fila] >= e.corriente;
  if (dl === 0 && nutre) return 1;
  if (dl <= 1 && nutre) return 0.4;
  return 0;
}
const motor = defineMotor({
  id: 'islas.coral',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mar',
  guia: {
    goal: 'Sembrá juveniles donde les llegue su luz y su corriente, sin amontonarlos. Cada adulta te devuelve módulos.',
    keys: [
      ['WASD / flechas', 'elegir módulo'],
      ['Mouse / stick derecho', 'apuntar módulo'],
      ['F / clic / RT', 'sembrar el juvenil que sigue'],
    ],
    touch: [
      ['Palanca / arrastrá', 'elegir módulo'],
      ['🎯', 'sembrar'],
    ],
  },
  etapa: (p) => ({
    cols: p.dif < 0.5 ? 5 : 6,
    filas: 4,
    crece: 0.2 - p.dif * 0.06,
    modulos: 9 - Math.round(p.dif * 3),
    especies: p.dif < 0.3 && !loco(p) ? 2 : loco(p) ? 4 : 3,
    nombre: texto(p.tema.nombre, 'Arrecife por generaciones'),
    loco: loco(p),
    semilla: p.seed,
  }),
  metas: (p) => [120 + Math.round(p.dif * 80), 260 + Math.round(p.dif * 80), 400 + Math.round(p.dif * 80)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => {
    const azar = rng(p.semilla);
    return {
      c: cursor(),
      col: 0,
      fila: 0,
      celdas: Array.from({ length: p.cols * p.filas }, () => null),
      corriente: Array.from({ length: p.filas }, (_, f) =>
        f === 0 ? 1 : f === p.filas - 1 ? 2 : 1 + Math.round(azar()),
      ),
      cola: Array.from({ length: 3 }, () => Math.floor(azar() * p.especies)),
      modulos: p.modulos,
      azar,
      adultas: 0,
      blanqueadas: 0,
      puestos: 0,
      apretadas: 0,
      ultimo: 0,
      aviso: 'Fila de atrás: sol. Fila de adelante: sombra. Las flechas son corriente.',
    };
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    moverCursor(s.c, dt, 1.4);
    s.col = Math.max(0, Math.min(p.cols - 1, Math.round(((s.c.x + 1) / 2) * (p.cols - 1))));
    s.fila = Math.max(0, Math.min(p.filas - 1, Math.round(((1 - s.c.y) / 2) * (p.filas - 1))));
    if (input.take('fire')) poner(m, s.col, s.fila);
    let apretadas = 0;
    s.celdas.forEach((c, i) => {
      if (!c || c.adulta) return;
      const col = i % p.cols;
      const fila = Math.floor(i / p.cols);
      const a = ajuste(m, c.especie, col, fila);
      if (a === null) {
        apretadas++;
        return;
      }
      if (a === 0) {
        c.estres += dt;
        if (c.estres > 4) {
          s.celdas[i] = null;
          s.blanqueadas++;
          m.sumar(-10);
          s.aviso = `Ese ${ESPECIES[c.especie].nombre} no tenía su luz o su corriente.`;
        }
        return;
      }
      c.estres = 0;
      c.crece += dt * p.crece * a;
      if (c.crece >= 1) {
        c.adulta = true;
        c.crece = 1;
        s.adultas++;
        s.modulos += 2;
        m.sumar(40);
        s.aviso = `¡Colonia adulta de ${ESPECIES[c.especie].nombre}! Te devuelve dos módulos.`;
      }
    });
    s.apretadas = apretadas;
    const sig = ESPECIES[s.cola[0]];
    m.objetivo = apretadas ? 'Hay juveniles a codazos: no crecen así.' : s.aviso;
    m.lineas = [
      `Sigue: ${sig.nombre} · quiere ${['sombra', 'media luz', 'sol'][sig.luz]} y corriente ${'≥'}${sig.corriente}`,
      `Módulos ${s.modulos} · Adultas ${s.adultas} · Blanqueadas ${s.blanqueadas}`,
    ];
    m.stats = { puestos: s.puestos, adultas: s.adultas, blanqueadas: s.blanqueadas, apretadas, modulos: s.modulos };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    const p = m.parametros;
    if (actor === 'compa') {
      // el compa limpia algas: acelera un poquito a los juveniles que van bien
      for (const c of s.celdas) if (c && !c.adulta && c.estres === 0) c.crece += dt * 0.012;
      return;
    }
    if (s.modulos <= 0 || m.tiempo % 0.6 > dt) return;
    let mejor = -1;
    let nota = 0;
    for (let i = 0; i < s.celdas.length; i++) {
      if (s.celdas[i]) continue;
      const col = i % p.cols;
      const fila = Math.floor(i / p.cols);
      const a = ajuste(m, s.cola[0], col, fila);
      if (!a) continue;
      // no dejar a un vecino juvenil a codazos
      const vecinoJoven = vecinos(m, col, fila).some((v) => v && !v.adulta);
      const valor = a - (vecinoJoven ? 0.5 : 0);
      if (valor > nota) {
        nota = valor;
        mejor = i;
      }
    }
    if (mejor < 0 || (nota < 0.9 && m.tiempo - s.ultimo < 2.5)) return;
    s.ultimo = m.tiempo;
    const col = mejor % p.cols;
    const fila = Math.floor(mejor / p.cols);
    s.c.x = p.cols > 1 ? (col / (p.cols - 1)) * 2 - 1 : 0;
    s.c.y = 1 - (fila / (p.filas - 1)) * 2;
    s.c.auto = true;
    s.col = col;
    s.fila = fila;
    poner(m, col, fila);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const t = m.tiempo;
    const sig = ESPECIES[s.cola[0]];
    return (
      <Isla nombre={p.nombre} aviso="Atrás hay sol, adelante sombra · F siembra el juvenil">
        <Laguna ancho={13} largo={9.5} x={-1.8} z={-1} color="#36c2cf" />
        <Muelle letrero="Vivero de coral (simulación)" />
        {s.corriente.map((n, f) => {
          const [, z] = posCelda(p, 0, f);
          return (
            <group key={f}>
              {Array.from({ length: n }, (_, k) => (
                <Ball
                  key={k}
                  pos={[-8.3 + ((t * 1.6 + k * 0.7) % 1.6), 0.4, z + (k - (n - 1) / 2) * 0.28]}
                  r={0.07}
                  color="#e8fbff"
                  cast={false}
                />
              ))}
              <Label pos={[-8.6, 1.2, z]} text={`${'〰'.repeat(n)}`} h={0.24} bg="#0d5c6b" />
            </group>
          );
        })}
        {Array.from({ length: p.filas }, (_, f) =>
          Array.from({ length: p.cols }, (_, col) => {
            const [x, z] = posCelda(p, col, f);
            const i = f * p.cols + col;
            const c = s.celdas[i];
            const l = luz(m, col, f);
            const sel = s.col === col && s.fila === f;
            const apretado = !!c && !c.adulta && ajuste(m, c.especie, col, f) === null;
            return (
              <group key={i}>
                <Block
                  pos={[x, 0.08, z]}
                  size={[LADO * 0.86, 0.12, LADO * 0.86]}
                  color={sel ? '#fffbe0' : ['#3f6f7c', '#8fc1bd', '#ffe08a'][l]}
                  mat="concrete"
                  solid={false}
                  cast={false}
                />
                {c && (
                  <FiguraCoral
                    pos={[x, 0.14, z]}
                    tipo={ESPECIES[c.especie].tipo}
                    color={c.estres > 0 ? '#e9e4dc' : ESPECIES[c.especie].color}
                    s={0.55 + c.crece * 0.95}
                  />
                )}
                {apretado && p.loco && <Label pos={[x, 1.25, z]} text="¡un metro, porfa!" h={0.2} bg="#d1495b" />}
                {apretado && !p.loco && <Label pos={[x, 1.1, z]} text="😣" h={0.32} bg="rgba(0,0,0,0)" />}
              </group>
            );
          }),
        )}
        {(() => {
          const [x, z] = posCelda(p, s.col, s.fila);
          return (
            <group position={[x, 0, z]}>
              <Cyl pos={[0, 1.9, 0]} r={0.05} h={1.6} color="#ffffff" mat="metal" solid={false} cast={false} />
              <Ball pos={[0, 2.8, 0]} r={0.22} color={sig.color} />
              <Label
                pos={[0, 3.35, 0]}
                text={`${sig.nombre} · ${['sombra', 'media', 'sol'][sig.luz]}`}
                h={0.24}
                bg="#14627a"
              />
            </group>
          );
        })()}
        {[0, 1, 2].map((i) => {
          const a = t * 0.45 + i * 2.1;
          return (
            <Pez
              key={i}
              pos={[-1.8 + Math.cos(a) * 5.4, 0.45, -1 + Math.sin(a) * 3.4]}
              rot={-a - Math.PI / 2}
              color={['#4cc9f0', '#ffd166', '#f28482'][i]}
              s={0.75}
            />
          );
        })}
        <Label pos={[-1.8, 0.9, -4.6]} text="☀ sol" h={0.26} bg="#e9a23b" />
        <Label pos={[-1.8, 0.9, 2.7]} text="sombra" h={0.26} bg="#43566b" />
      </Isla>
    );
  },
});
export const Coral = motor.Escena;
export const guia = motor.guia;
