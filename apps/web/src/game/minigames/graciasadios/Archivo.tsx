// Archivo de Ciudad Blanca: Gracias a Dios reutiliza el motor «exploradores». Con `tema.archivo` el juego es una
// réplica museográfica: recorrés la ruta señalada, encontrás las marcas de cada vitrina (código, procedencia y foto)
// y las registrás en la ficha. La ficha se lleva; la pieza se queda: salirte de la ruta o tocar un resto anula la
// ficha que llevabas. Sin `tema.archivo` sigue el Exploradores de siempre (Copán, Yojoa y Roatán).
import { useMemo } from 'react';
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { partida, rng } from '../api';
import { ExploradoresScene } from '../exploradores/Scene';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, limitar, Mesa, metas, mover, variante } from './comun';

type V2 = [number, number];
const RUTA: V2[] = [
  [-5.4, -2.6],
  [3.4, -2.6],
  [3.4, 0],
  [-5.4, 0],
  [-5.4, 2.6],
  [3.4, 2.6],
];
const TRAMOS = RUTA.slice(1).map((b, i) => {
  const a = RUTA[i];
  return { a, b, largo: Math.hypot(b[0] - a[0], b[1] - a[1]) };
});
const LARGO = TRAMOS.reduce((s, t) => s + t.largo, 0);
const ANCHO = 0.6,
  TOQUE = 0.25,
  ALCANCE = 0.45,
  VELOCIDAD = 2.4;
const TIPOS = ['Código', 'Procedencia', 'Foto'];

/** Punto y dirección de la ruta a `t` metros del inicio. */
function enRuta(t: number): { p: V2; d: V2 } {
  let resto = Math.max(0, Math.min(LARGO, t));
  for (const s of TRAMOS) {
    if (resto <= s.largo || s === TRAMOS[TRAMOS.length - 1]) {
      const d: V2 = [(s.b[0] - s.a[0]) / s.largo, (s.b[1] - s.a[1]) / s.largo];
      return { p: [s.a[0] + d[0] * resto, s.a[1] + d[1] * resto], d };
    }
    resto -= s.largo;
  }
  return { p: RUTA[0], d: [1, 0] };
}
/** Lo más cerca de la ruta: distancia y a cuántos metros del inicio. */
function sobreRuta(x: number, z: number) {
  let mejor = { dist: 1e9, t: 0 },
    base = 0;
  for (const s of TRAMOS) {
    const dx = s.b[0] - s.a[0],
      dz = s.b[1] - s.a[1];
    const k = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / (s.largo * s.largo)));
    const dist = Math.hypot(x - (s.a[0] + dx * k), z - (s.a[1] + dz * k));
    if (dist < mejor.dist) mejor = { dist, t: base + k * s.largo };
    base += s.largo;
  }
  return mejor;
}
const lado = (t: number, off: number): V2 => {
  const { p, d } = enRuta(t);
  return [p[0] - d[1] * off, p[1] + d[0] * off];
};

type Marca = { t: number; pos: V2; tipo: number; hecha: boolean };
type Vitrina = {
  t: number;
  lado: 1 | -1;
  resto: V2;
  caja: V2;
  marcas: Marca[];
  sinProcedencia: boolean;
  lista: boolean;
};
type Estado = ReturnType<typeof cursor> & {
  vitrinas: Vitrina[];
  ficha: { x: number; z: number };
  sala: number;
  espera: number;
  fichas: number;
  anuladas: number;
  fallos: number;
  excluidas: number;
  aviso: number;
  marcas: number;
  azar: () => number;
};
type Param = { vitrinas: number; contraste: boolean; seed: number };
type Sesion = Motor<Param, Estado>;

const ESQUINAS = TRAMOS.slice(0, -1).reduce<number[]>((a, s) => [...a, (a[a.length - 1] ?? 0) + s.largo], []);
function sala(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    r = s.azar;
  const libres: number[] = [];
  for (let t = 1.2; t < LARGO - 1; t += 0.1)
    if (ESQUINAS.every((e) => Math.abs(e - t) > 1)) libres.push(Math.round(t * 10) / 10);
  const elegidos: number[] = [];
  for (let intento = 0; elegidos.length < p.vitrinas && intento < 400; intento++) {
    const t = libres[Math.floor(r() * libres.length)];
    if (elegidos.every((e) => Math.abs(e - t) >= 2.2)) elegidos.push(t);
  }
  elegidos.sort((a, b) => a - b);
  const falsa = p.contraste ? Math.floor(r() * elegidos.length) : -1;
  s.vitrinas = elegidos.map((t, i) => {
    const l: 1 | -1 = r() < 0.5 ? 1 : -1;
    return {
      t,
      lado: l,
      resto: lado(t, l * 0.36),
      caja: lado(t, l * 1.2),
      marcas: revolverTipos(r).map((tipo, k) => ({
        t: t + (k - 1) * 0.5,
        pos: lado(t + (k - 1) * 0.5, -l * 0.3),
        tipo,
        hecha: false,
      })),
      sinProcedencia: i === falsa,
      lista: false,
    };
  });
  s.sala++;
}
function revolverTipos(r: () => number) {
  const c = [0, 1, 2];
  for (let i = 2; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [c[i], c[j]] = [c[j], c[i]];
  }
  return c;
}
/** La ficha en curso se anula: lo registrado de las vitrinas sin terminar se pierde y volvés al centro de la ruta. */
function anular(m: Sesion, texto: string) {
  const s = m.datos;
  for (const v of s.vitrinas) if (!v.lista) for (const k of v.marcas) k.hecha = false;
  s.anuladas++;
  m.sumar(-20);
  const { p } = enRuta(sobreRuta(s.ficha.x, s.ficha.z).t);
  s.ficha = { x: p[0], z: p[1] };
  // el cursor vuelve con la ficha, para que no siga caminando hacia afuera
  s.x = limitar((p[0] + 1) / 4.9);
  s.y = limitar(-p[1] / 3.3);
  s.aviso = 1.2;
  useGame.getState().toast(texto, '🗿');
}
function salaCompleta(s: Estado) {
  return s.vitrinas.every((v) => v.lista);
}
function registrar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0) return;
  s.espera = 0.4;
  let cerca: { v: Vitrina; k: Marca } | null = null;
  for (const v of s.vitrinas)
    for (const k of v.marcas)
      if (!k.hecha && !v.lista && Math.hypot(k.pos[0] - s.ficha.x, k.pos[1] - s.ficha.z) < ALCANCE) cerca = { v, k };
  if (!cerca) {
    s.fallos++;
    m.sumar(-10);
    toast('Aquí no hay marca que registrar.', '🔍');
    return;
  }
  if (cerca.v.sinProcedencia) return anular(m, 'Esa pieza no tiene procedencia: no entra al inventario.');
  cerca.k.hecha = true;
  s.marcas++;
  m.sumar(25);
  if (cerca.v.marcas.every((k) => k.hecha)) {
    cerca.v.lista = true;
    s.fichas++;
    m.sumar(50);
  }
  if (salaCompleta(s)) {
    toast('Inventario completo. Pasá a la otra sala de la réplica.', '📋');
    sala(m);
  }
}
function excluir(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0) return;
  s.espera = 0.4;
  const v = s.vitrinas.find((x) => !x.lista && Math.hypot(x.resto[0] - s.ficha.x, x.resto[1] - s.ficha.z) < 0.9);
  if (!v?.sinProcedencia) {
    s.fallos++;
    m.sumar(-10);
    toast(v ? 'Esa pieza sí tiene procedencia: registrá su ficha.' : 'No hay pieza cerca para excluir.', '📋');
    return;
  }
  v.lista = true;
  s.excluidas++;
  m.sumar(40);
  toast('Excluida: pieza sin procedencia, fuera del inventario.', '🚫');
  if (salaCompleta(s)) sala(m);
}

const motor = defineMotor({
  id: 'exploradores',
  modos: { duo: { tipo: 'compartido', cada: 2 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ruinas',
  guia: {
    goal: 'Recorré la réplica por la ruta señalada. Acercate a cada marca (código, procedencia y foto) y registrala con F: tres marcas cierran la ficha de una vitrina. Salirte de la ruta o tocar un resto anula la ficha. Si una pieza no tiene procedencia, excluila con E.',
    ...controles('registrar la marca', 'excluir pieza sin procedencia', 'caminar por la réplica'),
  },
  etapa: (p) => ({
    vitrinas: 5 + Math.round(p.dif),
    contraste: variante(p) === 'la-ficha-que-faltaba',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    // el cursor arranca donde está la ficha, al inicio de la ruta
    x: (RUTA[0][0] + 1) / 4.9,
    y: -RUTA[0][1] / 3.3,
    vitrinas: [],
    ficha: { x: RUTA[0][0], z: RUTA[0][1] },
    sala: 0,
    espera: 0,
    fichas: 0,
    anuladas: 0,
    fallos: 0,
    excluidas: 0,
    aviso: 0,
    marcas: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.vitrinas.length) sala(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.aviso = Math.max(0, s.aviso - dt);
    // la ficha (tu visitante) camina hacia el cursor, sin brincarse nada
    const tx = -1 + s.x * 4.9,
      tz = -s.y * 3.3,
      dx = tx - s.ficha.x,
      dz = tz - s.ficha.z,
      d = Math.hypot(dx, dz),
      paso = Math.min(d, VELOCIDAD * dt);
    if (d > 1e-4 && s.aviso <= 0) {
      s.ficha.x += (dx / d) * paso;
      s.ficha.z += (dz / d) * paso;
    }
    if (s.aviso <= 0) {
      if (sobreRuta(s.ficha.x, s.ficha.z).dist > ANCHO) anular(m, 'Te saliste del recorrido: la ficha se anuló.');
      else if (s.vitrinas.some((v) => Math.hypot(v.resto[0] - s.ficha.x, v.resto[1] - s.ficha.z) < TOQUE))
        anular(m, 'Tocaste un resto: la pieza se queda y la ficha se anula.');
    }
    if (input.take('fire')) registrar(m);
    if (input.take('use')) excluir(m);
    const faltan = s.vitrinas.filter((v) => !v.lista).length;
    m.objetivo = `Sala ${s.sala}: faltan ${faltan} fichas · la pieza se queda`;
    m.lineas = [
      `Fichas ${s.fichas} · Anuladas ${s.anuladas} · Sin marca ${s.fallos}${m.parametros.contraste ? ` · Excluidas ${s.excluidas}` : ''}`,
      'Réplica de exposición: no es el sitio real',
    ];
    m.stats = {
      x: s.x,
      y: s.y,
      fichas: s.fichas,
      anuladas: s.anuladas,
      fallos: s.fallos,
      excluidas: s.excluidas,
      marcas: s.marcas,
    };
  },
  bot(m) {
    const s = m.datos;
    if (!s.vitrinas.length) return;
    s.auto = true;
    const aqui = sobreRuta(s.ficha.x, s.ficha.z).t;
    // lo que falta en esta sala, en el orden de la ruta: marcas válidas y la pieza sin procedencia
    const pendientes = s.vitrinas.flatMap((v) =>
      v.lista
        ? []
        : v.sinProcedencia
          ? [{ t: v.t, pos: enRuta(v.t).p, excluir: true }]
          : v.marcas.filter((k) => !k.hecha).map((k) => ({ t: k.t, pos: k.pos, excluir: false })),
    );
    const meta = pendientes.sort((a, b) => Math.abs(a.t - aqui) - Math.abs(b.t - aqui))[0];
    if (!meta) return;
    const apuntar = (x: number, z: number) => {
      s.x = limitar((x + 1) / 4.9);
      s.y = limitar(-z / 3.3);
    };
    const falta = meta.t - aqui;
    if (Math.abs(falta) > 0.12) {
      const { p } = enRuta(aqui + Math.sign(falta) * Math.min(0.7, Math.abs(falta)));
      return apuntar(p[0], p[1]);
    }
    apuntar(meta.pos[0], meta.pos[1]);
    if (Math.hypot(meta.pos[0] - s.ficha.x, meta.pos[1] - s.ficha.z) < (meta.excluir ? 0.5 : ALCANCE * 0.8)) {
      if (meta.excluir) excluir(m);
      else registrar(m);
    }
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      contraste = m.parametros.contraste;
    return (
      <Mesa titulo={contraste ? 'Réplica de Ciudad Blanca · la ficha que faltaba' : 'Réplica de Ciudad Blanca'}>
        {TRAMOS.map((t, i) => {
          const cx = (t.a[0] + t.b[0]) / 2,
            cz = (t.a[1] + t.b[1]) / 2,
            ancho = t.a[1] === t.b[1];
          return (
            <group key={i}>
              <Block
                pos={[cx, 0.72, cz]}
                size={ancho ? [t.largo + ANCHO * 2, 0.04, ANCHO * 2] : [ANCHO * 2, 0.04, t.largo + ANCHO * 2]}
                color="#e9dcc3"
                mat="stone"
                solid={false}
              />
              {[-1, 1].map((l) => (
                <Block
                  key={l}
                  pos={ancho ? [cx, 0.95, cz + l * ANCHO] : [cx + l * ANCHO, 0.95, cz]}
                  size={ancho ? [t.largo, 0.03, 0.03] : [0.03, 0.03, t.largo]}
                  color="#9d0208"
                  solid={false}
                />
              ))}
            </group>
          );
        })}
        {RUTA.map(([x, z], i) => (
          <Cyl key={i} pos={[x, 0.95, z]} r={0.05} h={0.5} color="#6c757d" solid={false} />
        ))}
        {s.vitrinas.map((v, i) => (
          <group key={`${s.sala}-${i}`}>
            <Block pos={[v.caja[0], 1, v.caja[1]]} size={[0.7, 0.5, 0.5]} color="#6f4e37" mat="wood" solid={false} />
            <Block
              pos={[v.caja[0], 1.45, v.caja[1]]}
              size={[0.66, 0.4, 0.46]}
              color="#caf0f8"
              mat="glass"
              solid={false}
            />
            <Ball pos={[v.caja[0], 1.4, v.caja[1]]} r={0.14} color={v.lista ? '#8d99ae' : '#d4a373'} mat="stone" />
            <Cyl pos={[v.resto[0], 0.82, v.resto[1]]} r={0.17} h={0.16} color="#a68a64" mat="stone" solid={false} />
            {v.lista && (
              <Label
                pos={[v.caja[0], 2, v.caja[1]]}
                text={v.sinProcedencia ? '🚫 excluida' : '📋 ficha lista'}
                h={0.24}
              />
            )}
            {!v.lista &&
              v.marcas.map((k, j) => {
                const cerca = Math.hypot(k.pos[0] - s.ficha.x, k.pos[1] - s.ficha.z) < 1.6;
                const texto = k.hecha
                  ? '✔'
                  : !cerca
                    ? '?'
                    : v.sinProcedencia && k.tipo === 1
                      ? 'Sin procedencia'
                      : TIPOS[k.tipo];
                return (
                  <group key={j}>
                    <Block
                      pos={[k.pos[0], 0.76, k.pos[1]]}
                      size={[0.22, 0.03, 0.22]}
                      color={k.hecha ? '#2a9d8f' : '#ffd166'}
                      solid={false}
                    />
                    <Label
                      pos={[k.pos[0], 1.15, k.pos[1]]}
                      text={texto}
                      h={0.2}
                      fg={texto === 'Sin procedencia' ? '#ff8fa3' : undefined}
                    />
                  </group>
                );
              })}
          </group>
        ))}
        <group position={[s.ficha.x, 0.75, s.ficha.z]}>
          <Cyl pos={[0, 0.2, 0]} r={0.12} h={0.4} color={s.aviso > 0 ? '#e63946' : '#264653'} solid={false} />
          <Ball pos={[0, 0.5, 0]} r={0.1} color="#8d5524" />
        </group>
        <Block pos={[-1 + s.x * 4.9, 0.74, -s.y * 3.3]} size={[0.16, 0.02, 0.16]} color="#ffffff" solid={false} />
      </Mesa>
    );
  },
});

/** El motor «exploradores»: con tema de archivo es la réplica de Ciudad Blanca; sin él, la expedición de siempre. */
export function Exploradores() {
  const p = useMemo(partida, []);
  return p.tema.archivo ? <motor.Escena /> : <ExploradoresScene />;
}
export const guia = motor.guia;
