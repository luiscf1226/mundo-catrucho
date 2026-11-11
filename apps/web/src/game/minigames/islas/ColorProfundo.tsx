import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { Coral, cursor, Isla, Laguna, Muelle, moverCursor, Pez, texto } from './comun';

type RGB = [number, number, number];
const COLORES: { nombre: string; rgb: RGB }[] = [
  { nombre: 'rojo', rgb: [0.85, 0.15, 0.2] },
  { nombre: 'naranja', rgb: [0.95, 0.45, 0.15] },
  { nombre: 'amarillo', rgb: [0.95, 0.82, 0.3] },
  { nombre: 'rosado', rgb: [0.94, 0.55, 0.7] },
  { nombre: 'morado', rgb: [0.5, 0.3, 0.65] },
  { nombre: 'verde', rgb: [0.35, 0.7, 0.35] },
];
const TIPOS = ['cerebro', 'cuerno', 'abanico', 'tubo'];
const AGUA: RGB = [0.08, 0.38, 0.55];
/** El agua se come primero el rojo, luego el verde; el azul llega más hondo. */
function bajoAgua(c: RGB, d: number): RGB {
  const k = [0.2, 0.06, 0.025];
  return c.map((v, i) => {
    const t = Math.exp(-d * k[i]);
    return v * t + AGUA[i] * (1 - t) * 0.55;
  }) as RGB;
}
const hex = (c: RGB) =>
  `#${c
    .map((v) =>
      Math.round(Math.max(0, Math.min(1, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
type Opcion = { color: string; clase: 'real' | 'absorbido' | 'otro' };
type Ronda = {
  real: number;
  tipo: string;
  d1: number;
  d2: number;
  opciones: Opcion[];
  t: number;
  resuelta: number;
  elegida: number;
};
type Estado = {
  c: ReturnType<typeof cursor>;
  sel: number;
  ronda: Ronda;
  azar: () => number;
  pista: boolean;
  aciertos: number;
  absorbidos: number;
  fallos: number;
  intentos: number;
  aviso: string;
};
type Param = { d1: number; d2: number; tiempo: number; opciones: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;

function nuevaRonda(p: Param, azar: () => number): Ronda {
  const real = Math.floor(azar() * COLORES.length);
  const d1 = p.d1 + Math.round(azar() * 2);
  const d2 = p.d2 + Math.round(azar() * 4);
  const c = COLORES[real].rgb;
  const otro = (real + 1 + Math.floor(azar() * (COLORES.length - 1))) % COLORES.length;
  const opciones: Opcion[] = [
    { color: hex(c), clase: 'real' },
    { color: hex(bajoAgua(c, d2)), clase: 'absorbido' },
    { color: hex(COLORES[otro].rgb), clase: 'otro' },
    { color: hex(bajoAgua(c, (d1 + d2) / 2)), clase: 'absorbido' },
  ].slice(0, p.opciones) as Opcion[];
  for (let i = opciones.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [opciones[i], opciones[j]] = [opciones[j], opciones[i]];
  }
  return { real, tipo: TIPOS[Math.floor(azar() * TIPOS.length)], d1, d2, opciones, t: 0, resuelta: 0, elegida: -1 };
}
function elegir(m: Sesion, i: number) {
  const s = m.datos;
  s.intentos++;
  const r = s.ronda;
  if (r.resuelta) return;
  const o = r.opciones[i];
  r.elegida = i;
  r.resuelta = 0.001;
  if (o.clase === 'real') {
    s.aciertos++;
    m.sumar(30 + (r.t < 5 ? 10 : 0));
    s.aviso = `¡Exacto! Era ${COLORES[r.real].nombre}: el agua solo lo apagaba.`;
  } else if (o.clase === 'absorbido') {
    s.absorbidos++;
    m.sumar(-15);
    s.aviso = 'Ese tono es el agua, no el coral. El rojo se queda arriba.';
  } else {
    s.fallos++;
    m.sumar(-5);
    s.aviso = 'Ese color no sale de estas fotos.';
  }
}
const motor = defineMotor({
  id: 'islas.colorprofundo',
  fondo: 'mar',
  guia: {
    goal: 'Compará las dos fotos del mismo coral y elegí su color real: el que pierde rojo al bajar.',
    keys: [
      ['A / D', 'elegir color de la carta'],
      ['Mouse / stick derecho', 'apuntar color'],
      ['F / clic / RT', 'confirmar'],
    ],
    touch: [
      ['Palanca / arrastrá', 'elegir color'],
      ['🎯', 'confirmar'],
    ],
  },
  etapa: (p) => ({
    d1: 2 + Math.round(p.dif * 5),
    d2: 10 + Math.round(p.dif * 6),
    tiempo: 11 - p.dif * 4,
    opciones: p.dif < 0.3 ? 3 : 4,
    nombre: texto(p.tema.nombre, 'Color con profundidad'),
    semilla: p.seed,
  }),
  metas: (p) => [140 + Math.round(p.dif * 80), 300 + Math.round(p.dif * 80), 460 + Math.round(p.dif * 80)],
  duracion: (p) => 75 + Math.round(p.dif * 15),
  crear: (p): Estado => {
    const azar = rng(p.semilla);
    return {
      c: cursor(),
      sel: 0,
      ronda: nuevaRonda(p, azar),
      azar,
      pista: false,
      aciertos: 0,
      absorbidos: 0,
      fallos: 0,
      intentos: 0,
      aviso: 'La foto honda se ve más azul: el coral no cambió, cambió la luz.',
    };
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    const r = s.ronda;
    moverCursor(s.c, dt, 1.5);
    const n = r.opciones.length;
    s.sel = Math.max(0, Math.min(n - 1, Math.round(((s.c.x + 1) / 2) * (n - 1))));
    if (input.take('fire') && !r.resuelta) elegir(m, s.sel);
    r.t += dt;
    if (r.resuelta) {
      r.resuelta += dt;
      if (r.resuelta > 1.6) s.ronda = nuevaRonda(p, s.azar);
    } else if (r.t > p.tiempo + (s.pista ? 2 : 0)) {
      s.fallos++;
      s.aviso = 'Se acabó el aire de esa toma. Otra foto.';
      s.ronda = nuevaRonda(p, s.azar);
    }
    s.pista = false;
    m.objetivo = s.aviso;
    m.lineas = [
      `Fotos a ${r.d1} m y ${r.d2} m · quedan ${Math.max(0, Math.ceil(p.tiempo - r.t))} s`,
      `Aciertos ${s.aciertos} · Colores de agua ${s.absorbidos}`,
    ];
    m.stats = { aciertos: s.aciertos, absorbidos: s.absorbidos, fallos: s.fallos, intentos: s.intentos, sel: s.sel };
  },
  bot: (m, _dt, actor) => {
    const s = m.datos;
    const r = s.ronda;
    if (actor === 'compa') {
      s.pista = true;
      return;
    }
    if (r.resuelta || r.t < 1.8) return;
    const i = r.opciones.findIndex((o) => o.clase === 'real');
    const n = r.opciones.length;
    s.c.x = n > 1 ? (i / (n - 1)) * 2 - 1 : 0;
    s.c.auto = true;
    s.sel = i;
    elegir(m, i);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const r = s.ronda;
    const p = m.parametros;
    const real = COLORES[r.real].rgb;
    const fotos: [number, number][] = [
      [-6, r.d1],
      [-2.2, r.d2],
    ];
    return (
      <Isla nombre={p.nombre} aviso="Dos fotos, un coral · F elige su color real">
        <Laguna ancho={14} largo={10} x={-2.2} z={-1} color="#2fb3c6" />
        <Muelle letrero="Jardín submarino · carta de color" />
        {fotos.map(([x, d], i) => (
          <group key={i} position={[x, 0, -3.2]}>
            <Block pos={[0, 2, 0]} size={[3.2, 2.8, 0.14]} color="#f4f1e8" mat="plastic" solid={false} />
            <Block
              pos={[0, 2, 0.08]}
              size={[2.9, 2.5, 0.04]}
              color={hex(bajoAgua([0.55, 0.8, 0.9], d))}
              mat="plastic"
              solid={false}
              cast={false}
            />
            <Coral pos={[0, 1.05, 0.35]} tipo={r.tipo} color={hex(bajoAgua(real, d))} s={1.5} />
            <Label pos={[0, 3.75, 0]} text={`📷 ${d} m`} h={0.32} bg="#14627a" />
          </group>
        ))}
        <Label pos={[-4.1, 2.1, -3]} text="→" h={0.6} bg="rgba(0,0,0,0)" />
        <group position={[1.9, 0, -3]}>
          <Block pos={[0, 0.9, 0]} size={[0.25, 1.8, 0.25]} color="#5d4630" mat="wood" solid={false} />
          <Coral pos={[0, 1.8, 0]} tipo={r.tipo} color={r.resuelta ? hex(real) : '#d9d4c8'} s={1.3} />
          <Label
            pos={[0, 3.6, 0]}
            text={r.resuelta ? `real: ${COLORES[r.real].nombre}` : '¿color real?'}
            h={0.3}
            bg="#2a9d8f"
          />
        </group>
        <Block pos={[-2.2, 0.5, 2.1]} size={[7.4, 0.2, 2.2]} color="#3b2f2a" mat="wood" solid={false} />
        <Label pos={[-2.2, 0.75, 3.5]} text="Carta cromática" h={0.3} bg="#3b2f2a" />
        {r.opciones.map((o, i) => {
          const x = -2.2 + (i - (r.opciones.length - 1) / 2) * 1.7;
          const sel = s.sel === i;
          const ok = r.resuelta && o.clase === 'real';
          const mal = r.resuelta && r.elegida === i && o.clase !== 'real';
          return (
            <group key={i}>
              <Block
                pos={[x, sel ? 0.85 : 0.72, 2.1]}
                size={[1.2, 0.22, 1.2]}
                color={o.color}
                mat="plastic"
                solid={false}
              />
              {(sel || ok || mal) && (
                <Block
                  pos={[x, 0.63, 2.1]}
                  size={[1.42, 0.1, 1.42]}
                  color={ok ? '#7ae582' : mal ? '#ef476f' : '#fff3b0'}
                  mat="neon"
                  solid={false}
                  cast={false}
                />
              )}
            </group>
          );
        })}
        {[0, 1].map((i) => {
          const a = m.tiempo * 0.5 + i * 3;
          return (
            <Pez
              key={i}
              pos={[-2 + Math.cos(a) * 5, 0.35, 0.2 + Math.sin(a) * 1.2]}
              rot={-a - Math.PI / 2}
              color={['#4cc9f0', '#ffd166'][i]}
              s={0.8}
            />
          );
        })}
      </Isla>
    );
  },
});
export const ColorProfundo = motor.Escena;
export const guia = motor.guia;
