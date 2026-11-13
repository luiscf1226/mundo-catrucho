// Motor «Fruto, semilla, árbol»: armá tríos de la colección (fruto, semilla y placa). El color dice la familia y la
// placa dice la forma del fruto y de la semilla. Una unión equivocada ocupa tres ranuras hasta que la revisés.
import type { ReactNode } from 'react';
import { input } from '../../../core/input';
import type { V3 } from '../../../core/types';
import { Ball, Block, Cyl, Label, P } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, cursor, Escena, moverCursor, texto } from './comun';

type Especie = {
  nombre: string;
  familia: string;
  tono: string;
  fruto: 'erizo' | 'bola' | 'estrella' | 'grande' | 'mazorca' | 'ovalo' | 'pera';
  colorFruto: string;
  semilla: 'redonda' | 'almendra' | 'plana' | 'grande' | 'rinon';
  dice: string;
};
// Especies de colección tropical (como las de un jardín botánico); los colores marcan la familia.
const ESPECIES: Especie[] = [
  {
    nombre: 'Rambután',
    familia: 'Sapindáceas',
    tono: '#ef476f',
    fruto: 'erizo',
    colorFruto: '#d62828',
    semilla: 'almendra',
    dice: 'con pelitos · semilla larga',
  },
  {
    nombre: 'Lichi',
    familia: 'Sapindáceas',
    tono: '#ef476f',
    fruto: 'bola',
    colorFruto: '#e5989b',
    semilla: 'redonda',
    dice: 'liso · semilla redonda',
  },
  {
    nombre: 'Mangostán',
    familia: 'Clusiáceas',
    tono: '#7b2cbf',
    fruto: 'bola',
    colorFruto: '#5a189a',
    semilla: 'plana',
    dice: 'morado · semilla plana',
  },
  {
    nombre: 'Carambola',
    familia: 'Oxalidáceas',
    tono: '#f4d35e',
    fruto: 'estrella',
    colorFruto: '#f9c74f',
    semilla: 'plana',
    dice: 'en estrella · semilla plana',
  },
  {
    nombre: 'Jaca',
    familia: 'Moráceas',
    tono: '#90be6d',
    fruto: 'grande',
    colorFruto: '#a7c957',
    semilla: 'grande',
    dice: 'enorme · semilla grande',
  },
  {
    nombre: 'Cacao',
    familia: 'Malváceas',
    tono: '#bc6c25',
    fruto: 'mazorca',
    colorFruto: '#e76f51',
    semilla: 'almendra',
    dice: 'mazorca · semilla larga',
  },
  {
    nombre: 'Mango',
    familia: 'Anacardiáceas',
    tono: '#3a86ff',
    fruto: 'ovalo',
    colorFruto: '#f77f00',
    semilla: 'grande',
    dice: 'ovalado · semilla grande',
  },
  {
    nombre: 'Marañón',
    familia: 'Anacardiáceas',
    tono: '#3a86ff',
    fruto: 'pera',
    colorFruto: '#e63946',
    semilla: 'rinon',
    dice: 'de pera · semilla de riñón',
  },
];
const COLUMNAS = ['Frutos', 'Semillas', 'Placas'];
/** true si el color es claro (para escribir encima en oscuro). */
const claro = (hex: string) => {
  const n = Number.parseInt(hex.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 150;
};
const XS = [-6.8, -4, -1];
const RANURAS = 6;
type Union = { ids: [number, number, number]; buena: boolean; t: number };
type Estado = {
  c: ReturnType<typeof cursor>;
  r: () => number;
  ronda: number[];
  orden: number[][];
  hechas: Set<number>;
  sel: [number, number, number];
  uniones: Union[];
  revisa: number;
  bot: number;
  aciertos: number;
  errores: number;
  revisadas: number;
  rondas: number;
  aviso: string;
};
type Param = { n: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;

const columna = (s: Estado) => casilla(s.c.x, 3);
const fila = (s: Estado) => casilla(-s.c.y, s.ronda.length);
const ocupadas = (s: Estado) => s.uniones.reduce((a, u) => a + (u.buena ? 1 : 3), 0);

function nuevaRonda(s: Estado, m: Sesion) {
  const n = m.parametros.n;
  const pool = ESPECIES.map((_, i) => i).sort(() => s.r() - 0.5);
  // desde la segunda etapa hay parientes de la misma familia: el color no alcanza, hay que leer la placa
  s.ronda =
    m.partida.dif > 0.2
      ? [0, 1, ...pool.filter((i) => i > 1)].slice(0, n)
      : pool.filter((i) => ESPECIES[i].nombre !== 'Lichi' && ESPECIES[i].nombre !== 'Marañón').slice(0, n);
  const ronda = s.ronda;
  s.orden = [0, 1, 2].map(() => [...ronda].sort(() => s.r() - 0.5));
  s.hechas = new Set();
  s.sel = [-1, -1, -1];
}
function elegir(m: Sesion) {
  const s = m.datos;
  if (s.revisa > 0) return;
  const col = columna(s);
  const esp = s.orden[col][fila(s)];
  if (esp === undefined || s.hechas.has(esp) || s.uniones.some((u) => !u.buena && u.ids[col] === esp)) return;
  s.sel[col] = esp;
  if (s.sel.some((x) => x < 0)) {
    s.aviso = `Elegiste ${COLUMNAS[col].toLowerCase().slice(0, -1)}. Te faltan ${s.sel.filter((x) => x < 0).length}.`;
    return;
  }
  const buena = s.sel[0] === s.sel[1] && s.sel[1] === s.sel[2];
  if (!buena && RANURAS - ocupadas(s) < 3) {
    s.aviso = 'No hay ranuras: revisá una unión mala con E.';
    s.sel = [-1, -1, -1];
    return;
  }
  s.uniones.push({ ids: [...s.sel], buena, t: m.tiempo });
  s.sel = [-1, -1, -1];
  if (buena) {
    s.aciertos++;
    s.hechas.add(s.uniones[s.uniones.length - 1].ids[0]);
    m.sumar(50);
    s.aviso = `¡${ESPECIES[s.uniones[s.uniones.length - 1].ids[0]].nombre} al archivo!`;
    if (s.hechas.size === s.ronda.length) {
      s.rondas++;
      m.sumar(20);
      s.aviso = '¡Colección completa! Viene otra gaveta.';
      nuevaRonda(s, m);
    }
  } else {
    s.errores++;
    m.sumar(-15);
    s.aviso = 'Esa unión no cuadra: ocupa tres ranuras hasta que la revisés (E).';
  }
}
function revisar(m: Sesion) {
  const s = m.datos;
  if (s.revisa > 0 || !s.uniones.some((u) => !u.buena)) return;
  s.revisa = 1.4;
  s.aviso = 'Revisando la unión…';
}

function Fruto({ e, pos }: { e: Especie; pos: V3 }) {
  const c = e.colorFruto;
  let forma: ReactNode;
  if (e.fruto === 'erizo')
    forma = (
      <>
        <Ball pos={[0, 0, 0]} r={0.28} color={c} />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <group key={i} rotation-z={(i * Math.PI) / 3}>
            <Block pos={[0, 0.33, 0]} size={[0.04, 0.14, 0.04]} color="#2d6a4f" solid={false} cast={false} />
          </group>
        ))}
      </>
    );
  else if (e.fruto === 'estrella')
    forma = [0, 1, 2, 3, 4].map((i) => (
      <group key={i} rotation-z={(i * Math.PI * 2) / 5}>
        <Block pos={[0, 0.16, 0]} size={[0.14, 0.34, 0.5]} color={c} solid={false} />
      </group>
    ));
  else if (e.fruto === 'grande')
    forma = (
      <group scale={[1, 0.8, 1]}>
        <Ball pos={[0, 0.05, 0]} r={0.45} color={c} mat="leaf" />
      </group>
    );
  else if (e.fruto === 'mazorca')
    forma = (
      <group scale={[0.7, 0.7, 1.4]}>
        <Ball pos={[0, 0, 0]} r={0.33} color={c} />
      </group>
    );
  else if (e.fruto === 'ovalo')
    forma = (
      <group scale={[0.8, 0.9, 1.15]}>
        <Ball pos={[0, 0, 0]} r={0.3} color={c} />
      </group>
    );
  else if (e.fruto === 'pera')
    forma = (
      <>
        <Ball pos={[0, 0, 0]} r={0.26} color={c} />
        <Ball pos={[0, 0.3, 0]} r={0.17} color={c} />
        <group scale={[1, 0.6, 1.4]}>
          <Ball pos={[0, -0.45, 0]} r={0.1} color="#8d6e4a" />
        </group>
      </>
    );
  else forma = <Ball pos={[0, 0, 0]} r={0.27} color={c} />;
  return <group position={pos}>{forma}</group>;
}
function Semilla({ e, pos }: { e: Especie; pos: V3 }) {
  const c = '#8d6e4a';
  const forma =
    e.semilla === 'plana' ? (
      <Cyl pos={[0, 0, 0]} r={0.2} h={0.06} color="#c9a66b" solid={false} />
    ) : e.semilla === 'almendra' ? (
      <group scale={[0.6, 0.5, 1.3]}>
        <Ball pos={[0, 0, 0]} r={0.18} color={c} />
      </group>
    ) : e.semilla === 'grande' ? (
      <group scale={[1, 0.55, 1.3]}>
        <Ball pos={[0, 0, 0]} r={0.26} color="#d4a373" />
      </group>
    ) : e.semilla === 'rinon' ? (
      <>
        <Ball pos={[-0.1, 0, 0]} r={0.13} color="#9c6644" />
        <Ball pos={[0.1, 0, 0.06]} r={0.13} color="#9c6644" />
      </>
    ) : (
      <Ball pos={[0, 0, 0]} r={0.15} color="#5c4033" />
    );
  return <group position={pos}>{forma}</group>;
}

const motor = defineMotor({
  id: 'atlantida.lancetilla',
  fondo: 'selva',
  guia: {
    goal: 'Juntá fruto, semilla y placa de la misma planta. El color es la familia; la placa dice las formas.',
    keys: [
      ['WASD / mouse', 'elegir columna y fila'],
      ['F / clic / RT', 'tomar pieza'],
      ['E / X', 'revisar una unión mala'],
    ],
    touch: [
      ['Palanca / tocá', 'elegir pieza'],
      ['🎯', 'tomar pieza'],
      ['E', 'revisar unión mala'],
    ],
  },
  etapa: (p) => ({
    n: 3 + Math.round(p.dif * 2),
    nombre: texto(p.tema.nombre, 'Fruto, semilla, árbol'),
    semilla: p.seed,
  }),
  metas: (p) => [200 + Math.round(p.dif * 100), 450 + Math.round(p.dif * 100), 700 + Math.round(p.dif * 100)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => ({
    c: cursor(),
    r: rng(p.semilla),
    ronda: [],
    orden: [],
    hechas: new Set(),
    sel: [-1, -1, -1],
    uniones: [],
    revisa: 0,
    bot: 0,
    aciertos: 0,
    errores: 0,
    revisadas: 0,
    rondas: 0,
    aviso: 'Tomá un fruto, una semilla y su placa.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    if (!s.ronda.length) nuevaRonda(s, m);
    moverCursor(s.c, dt, 1.5);
    if (input.take('fire')) elegir(m);
    if (input.take('use')) revisar(m);
    if (s.revisa > 0) {
      s.revisa -= dt;
      if (s.revisa <= 0) {
        s.revisa = 0;
        const i = s.uniones.findIndex((u) => !u.buena);
        if (i >= 0) s.uniones.splice(i, 1);
        s.revisadas++;
        s.aviso = 'Unión revisada: las piezas volvieron a su lugar.';
      }
    }
    // las uniones buenas pasan al archivo
    s.uniones = s.uniones.filter((u) => !u.buena || m.tiempo - u.t < 1.2);
    m.objetivo = s.aviso;
    const esp = s.orden[columna(s)]?.[fila(s)];
    m.lineas = [
      `${COLUMNAS[columna(s)]} · ${esp !== undefined ? (columna(s) === 2 ? ESPECIES[esp].nombre : `familia ${ESPECIES[esp].familia}`) : ''}`,
      `Ranuras libres ${RANURAS - ocupadas(s)} de ${RANURAS} · Archivadas ${s.aciertos} · Malas ${s.errores}`,
    ];
    m.stats = {
      aciertos: s.aciertos,
      errores: s.errores,
      revisadas: s.revisadas,
      rondas: s.rondas,
      columna: columna(s),
      fila: fila(s),
      elegidas: s.sel.filter((x) => x >= 0).length,
      libres: RANURAS - ocupadas(s),
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      if (s.revisa > 0) s.revisa -= dt * 0.5;
      return;
    }
    s.c.auto = true;
    s.bot -= dt;
    if (s.bot > 0 || !s.ronda.length) return;
    s.bot = 0.4;
    if (s.uniones.some((u) => !u.buena)) {
      revisar(m);
      return;
    }
    const meta = s.sel.find((x) => x >= 0) ?? s.ronda.find((e) => !s.hechas.has(e));
    if (meta === undefined) return;
    const col = s.sel.findIndex((x) => x < 0);
    s.c.x = centro(col, 3);
    s.c.y = -centro(s.orden[col].indexOf(meta), s.ronda.length);
    elegir(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const n = s.ronda.length;
    const zDe = (f: number) => -4.2 + (f + 0.5) * (6 / Math.max(1, n));
    const col = columna(s);
    const fil = fila(s);
    const malas = s.uniones.filter((u) => !u.buena);
    return (
      <Escena nombre={p.nombre} aviso="F tomar pieza · E revisar unión mala">
        <Block pos={[-3, 0.4, -1.2]} size={[11, 0.8, 7]} color="#c9a66b" mat="wood" solid={false} />
        {COLUMNAS.map((t, c) => (
          <Label key={t} pos={[XS[c], 1.2, 2.6]} text={t} h={0.28} bg={c === col ? '#e76f51' : '#264653'} />
        ))}
        {s.orden.map((lista, c) =>
          lista.map((esp, f) => {
            const e = ESPECIES[esp];
            if (s.hechas.has(esp)) return null;
            const z = zDe(f);
            const tomado = s.sel[c] === esp || malas.some((u) => u.ids[c] === esp);
            const y = tomado ? 1.4 : 1.05;
            return (
              <group key={`${c}-${esp}`}>
                <Cyl pos={[XS[c], 0.82, z]} r={0.55} h={0.04} color={e.tono} mat="cloth" solid={false} cast={false} />
                {c === 0 && <Fruto e={e} pos={[XS[c], y, z]} />}
                {c === 1 && <Semilla e={e} pos={[XS[c], y - 0.1, z]} />}
                {c === 2 && (
                  <>
                    <Block
                      pos={[XS[c] + 1.1, 0.86, z]}
                      size={[3.4, 0.06, 0.9]}
                      color="#fefae0"
                      mat="plastic"
                      solid={false}
                      cast={false}
                    />
                    <Block
                      pos={[XS[c] - 0.55, 0.9, z]}
                      size={[0.12, 0.04, 0.9]}
                      color={e.tono}
                      mat="plastic"
                      solid={false}
                      cast={false}
                    />
                    <Label pos={[XS[c] + 1.1, 1.55, z]} text={e.nombre} h={0.32} fg="#3d2c1e" bg="#fefae0" />
                    <Label
                      pos={[XS[c] + 1.1, 1.1, z]}
                      text={`fruto ${e.dice}`}
                      h={0.26}
                      fg={claro(e.tono) ? '#1d1d1f' : '#fefae0'}
                      bg={e.tono}
                    />
                  </>
                )}
                {c === col && f === fil && (
                  <Cyl pos={[XS[c], 0.86, z]} r={0.68} h={0.03} color="#ffd166" mat="neon" solid={false} cast={false} />
                )}
              </group>
            );
          }),
        )}
        <group position={[3.5, 0.85, 0]}>
          <Block pos={[0, -0.45, -1.5]} size={[1.3, 0.9, 6.4]} color="#6d4b2c" mat="wood" solid={false} />
          {Array.from({ length: RANURAS }, (_, i) => (
            <Block
              key={i}
              pos={[0, 0.03, -4.2 + i * 1.1]}
              size={[1, 0.06, 0.95]}
              color="#495057"
              mat="wood"
              solid={false}
              cast={false}
            />
          ))}
          {(() => {
            let i = 0;
            return s.uniones.map((u, k) => {
              const ancho = u.buena ? 1 : 3;
              const z = -4.2 + (i + (ancho - 1) / 2) * 1.1;
              i += ancho;
              return (
                <Label
                  key={k}
                  pos={[0, 0.35, z]}
                  text={u.buena ? `✓ ${ESPECIES[u.ids[0]].nombre}` : '✗ por revisar'}
                  h={0.26}
                  bg={u.buena ? '#2d6a4f' : '#c1121f'}
                />
              );
            });
          })()}
          <Label pos={[0, 0.5, 2.2]} text={s.revisa > 0 ? 'Revisando…' : 'Ranuras'} h={0.26} />
        </group>
        <P.Palm pos={[-9.5, 0, -5]} solid={false} />
      </Escena>
    );
  },
});
export const Lancetilla = motor.Escena;
export const guia = motor.guia;
