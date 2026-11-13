// Motor «Apartaderos de Cuero y Salado»: antes de partir elegís apartadero, el orden de los vagones y cuáles dejás en
// el andén. Tu tren tiene que caber entero en el apartadero y llegar antes que el convoy contrario.
import { input } from '../../../core/input';
import { Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, cursor, Escena, moverCursor, texto } from './comun';

const U = 0.6; // metros por unidad de vagón
const ZV = 1.4; // vía principal
const ZAS = [-1.6, -2.75, -3.9]; // un apartadero por fila, para que no se encimen
const XE = -4.6; // estación
const CAMBIOS = [-2.4, 0.4, 3.2];
const DESVIO = 1.2; // el cambio arranca este tanto antes del apartadero
const CARGAS: [string, string][] = [
  ['🧳', '#e76f51'],
  ['🥥', '#8d6e4a'],
  ['🪵', '#6d4b2c'],
  ['🍌', '#f4d35e'],
  ['🧊', '#a8dadc'],
];
type Carro = { largo: number; valor: number; carga: number; tele: boolean };
type Estado = {
  c: ReturnType<typeof cursor>;
  r: () => number;
  tren: Carro[];
  andén: Carro[];
  largos: number[];
  decide: number;
  anima: number;
  elegido: number;
  resultado: '' | 'paso' | 'largo' | 'tarde';
  arriba: boolean;
  bot: number;
  rondas: number;
  pasos: number;
  bloqueos: number;
  tarde: number;
  soltados: number;
  giros: number;
  aviso: string;
};
type Param = { decide: number; vel: number; convoy: number; tele: boolean; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
const ANIMA = 2.6;

/** Largo que ocupa el tren en el apartadero: la burra (1) y los vagones; el telescópico de la cola se encoge. */
export function largoTren(tren: Carro[], tele: boolean) {
  let l = 1 + tren.reduce((a, c) => a + c.largo, 0);
  const cola = tren[tren.length - 1];
  if (tele && cola?.tele) l -= 1;
  return l;
}
/** Segundos que tarda tu tren en meterse entero al apartadero `i`, contra los que tarda el convoy en llegar ahí. */
export function tiempos(i: number, tren: Carro[], p: Param) {
  const propio = (CAMBIOS[i] - XE + largoTren(tren, p.tele) * U) / p.vel;
  const convoy = p.convoy - i * 1.6;
  return { propio, convoy, llega: propio < convoy };
}
function ronda(s: Estado, m: Sesion) {
  const p = m.parametros,
    d = m.partida.dif;
  const n = 3 + Math.floor(s.r() * 2 + d * 1.5);
  s.tren = Array.from({ length: n }, () => {
    const carga = Math.floor(s.r() * CARGAS.length);
    const largo = s.r() < 0.4 + d * 0.2 ? 2 : 1;
    return { largo, valor: 10 + Math.floor(s.r() * 3) * 5 + (largo === 2 ? 10 : 0), carga, tele: false };
  });
  if (p.tele) for (const c of s.tren) c.tele = c.largo === 2 && s.r() < 0.6;
  s.andén = [];
  s.largos = CAMBIOS.map(() => 3 + Math.floor(s.r() * (4 - d)));
  s.largos[Math.floor(s.r() * 3)] = Math.max(...s.largos, largoTren(s.tren, p.tele) - 1 - Math.floor(s.r() * 2));
  s.decide = p.decide;
  s.anima = 0;
  s.resultado = '';
}
function partir(m: Sesion) {
  const s = m.datos;
  if (s.anima > 0) return;
  const i = casilla(s.c.x, 3);
  s.elegido = i;
  s.anima = ANIMA;
  s.rondas++;
  const t = tiempos(i, s.tren, m.parametros);
  const largo = largoTren(s.tren, m.parametros.tele);
  if (largo > s.largos[i]) {
    s.resultado = 'largo';
    s.bloqueos++;
    m.sumar(-20);
    s.aviso = 'La carga quedó salida: bloqueó el retorno. La burra no se aparta donde se te ocurra.';
  } else if (!t.llega) {
    s.resultado = 'tarde';
    s.tarde++;
    m.sumar(-20);
    s.aviso = 'El convoy llegó primero a ese apartadero.';
  } else {
    s.resultado = 'paso';
    s.pasos++;
    const carga = s.tren.reduce((a, c) => a + c.valor, 0);
    m.sumar(10 + carga);
    s.aviso = `¡Le diste paso al convoy! Llevaste ${carga} de carga.`;
  }
}
function soltar(m: Sesion) {
  const s = m.datos;
  if (s.anima > 0 || !s.tren.length) return;
  // vaciar el tren sería cambiarlo gratis por uno nuevo: la burra sale al menos con un vagón
  if (s.tren.length === 1) {
    s.aviso = 'La burra no sale sin carga: dejá al menos un vagón.';
    return;
  }
  const c = s.tren.pop();
  if (c) s.andén.push(c);
  s.soltados++;
}
function girar(m: Sesion, dir: 1 | -1) {
  const s = m.datos;
  if (s.anima > 0 || s.tren.length < 2) return;
  if (dir > 0) {
    const c = s.tren.pop();
    if (c) s.tren.unshift(c);
  } else {
    const c = s.tren.shift();
    if (c) s.tren.push(c);
  }
  s.giros++;
}

const motor = defineMotor({
  id: 'atlantida.vagon',
  fondo: 'selva',
  guia: {
    goal: 'Elegí apartadero y ordená los vagones. Tu tren tiene que caber entero y llegar antes que el convoy.',
    keys: [
      ['A / D · mouse', 'elegir apartadero'],
      ['W / S', 'pasar el último vagón adelante (o al revés)'],
      ['E / X', 'dejar el último vagón en el andén'],
      ['F / clic / RT', 'partir'],
    ],
    touch: [
      ['Palanca ← →', 'elegir apartadero'],
      ['Palanca ↑ ↓', 'reordenar vagones'],
      ['E', 'dejar el último vagón'],
      ['🎯', 'partir'],
    ],
  },
  etapa: (p) => ({
    decide: 8 - p.dif * 3,
    vel: 3.4,
    convoy: 6.2 - p.dif * 1.2,
    tele: p.tema.telescopico === true,
    nombre: texto(p.tema.nombre, 'Apartaderos de Cuero y Salado'),
    semilla: p.seed,
  }),
  metas: (p) => [150 + Math.round(p.dif * 100), 400 + Math.round(p.dif * 100), 650 + Math.round(p.dif * 100)],
  duracion: (p) => 80 + Math.round(p.dif * 15),
  crear: (p): Estado => ({
    c: { ...cursor(), x: centro(0, 3), y: 0 },
    r: rng(p.semilla),
    tren: [],
    andén: [],
    largos: [3, 4, 5],
    decide: p.decide,
    anima: 0,
    elegido: 0,
    resultado: '',
    arriba: false,
    bot: 0,
    rondas: 0,
    pasos: 0,
    bloqueos: 0,
    tarde: 0,
    soltados: 0,
    giros: 0,
    aviso: 'El convoy viene: buscá apartadero donde quepás entero.',
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    const p = m.parametros;
    if (!s.tren.length && !s.anima) ronda(s, m);
    moverCursor(s.c, dt, 1.6);
    // W/S: un empujón de la palanca gira el orden una vez. Solo la palanca o el teclado: el puntero
    // elige apartadero y no debe reordenar el tren si pasa por arriba o por abajo de la pantalla
    s.c.y = 0;
    const y = -input.mz;
    if (!s.arriba && Math.abs(y) > 0.6) {
      s.arriba = true;
      girar(m, y > 0 ? 1 : -1);
    } else if (Math.abs(y) < 0.3) s.arriba = false;
    if (input.take('use')) soltar(m);
    if (input.take('fire')) partir(m);
    if (s.anima > 0) {
      s.anima -= dt;
      if (s.anima <= 0) {
        s.anima = 0;
        ronda(s, m);
      }
    } else {
      s.decide -= dt;
      if (s.decide <= 0) {
        // nadie decidió: el convoy pasa primero y la burra se queda esperando
        s.rondas++;
        s.tarde++;
        m.sumar(-10);
        s.aviso = 'Se acabó el tiempo: el convoy pasó y la burra se quedó en el andén.';
        s.tren = [];
      }
    }
    const i = casilla(s.c.x, 3);
    const t = tiempos(i, s.tren, p);
    const largo = largoTren(s.tren, p.tele);
    m.objetivo = s.aviso;
    m.lineas = [
      `Apartadero ${i + 1}: cabe ${s.largos[i]} · tu tren mide ${largo}${largo > s.largos[i] ? ' (no cabe)' : ''} · ${t.llega ? 'llegás a tiempo' : 'no llegás'}`,
      `Decidí en ${Math.max(0, Math.ceil(s.decide))} s · el convoy llega a ese cambio en ${t.convoy.toFixed(1)} s · Pasos ${s.pasos}`,
    ];
    m.stats = {
      rondas: s.rondas,
      pasos: s.pasos,
      bloqueos: s.bloqueos,
      tarde: s.tarde,
      soltados: s.soltados,
      giros: s.giros,
      sel: i,
      largo,
      vagones: s.tren.length,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    const p = m.parametros;
    if (actor === 'compa') {
      // el compa avisa por radio: el convoy espera un poquito más
      if (s.anima === 0) s.decide = Math.max(s.decide, 1.2);
      return;
    }
    s.c.auto = true;
    s.bot -= dt;
    if (s.bot > 0 || s.anima > 0 || !s.tren.length) return;
    s.bot = 0.3;
    // mejor plan: apartadero alcanzable y subconjunto de vagones de más valor que quepa
    const n = s.tren.length;
    let mejor = { i: 0, quita: -1, valor: -1, costo: 99 };
    for (let i = 0; i < 3; i++)
      // sin vaciar el tren: siempre queda al menos un vagón
      for (let mask = 0; mask < (1 << n) - 1; mask++) {
        const queda = s.tren.filter((_, k) => !(mask & (1 << k)));
        const tele = queda.findIndex((c) => c.tele);
        const orden = p.tele && tele >= 0 ? [...queda.filter((_, k) => k !== tele), queda[tele]] : queda;
        if (largoTren(orden, p.tele) > s.largos[i] || !tiempos(i, orden, p).llega) continue;
        const valor = queda.reduce((a, c) => a + c.valor, 0);
        // a igual valor, el plan que pide menos vueltas (soltar desde la cola)
        const costo = mask ? n - 1 - Math.floor(Math.log2(mask)) : 0;
        if (valor > mejor.valor || (valor === mejor.valor && costo < mejor.costo))
          mejor = { i, quita: mask, valor, costo };
      }
    s.c.x = centro(mejor.i, 3);
    s.c.y = 0;
    // se suelta desde la cola: primero el vagón marcado que esté más atrás
    const quitar = mejor.quita > 0 ? Math.floor(Math.log2(mejor.quita)) : -1;
    if (mejor.quita > 0 && quitar >= 0) {
      if (quitar === n - 1) soltar(m);
      else girar(m, 1);
      return;
    }
    const tele = s.tren.findIndex((c) => c.tele);
    if (p.tele && tele >= 0 && tele !== n - 1 && largoTren(s.tren, true) > s.largos[mejor.i]) {
      girar(m, -1);
      return;
    }
    partir(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const p = m.parametros;
    const sel = casilla(s.c.x, 3);
    const k = s.anima > 0 ? 1 - s.anima / ANIMA : 0;
    // la burra avanza hasta el cambio, entra al apartadero y el convoy pasa
    const meta = CAMBIOS[s.elegido];
    const fase1 = Math.min(1, k / 0.45);
    const bx = s.anima > 0 ? XE + (meta + largoTren(s.tren, p.tele) * U - XE) * fase1 : XE + 0.6;
    const bz = s.anima > 0 && k > 0.45 && s.resultado !== 'tarde' ? ZAS[s.elegido] : ZV;
    const cx = s.anima > 0 ? 9 - k * 20 : 6.5;
    let x = bx;
    return (
      <Escena nombre={p.nombre} aviso="A/D apartadero · W/S orden · E dejar vagón · F partir">
        {[-0.32, 0.32].map((d) => (
          <Block
            key={d}
            pos={[-2.5, 0.08, ZV + d]}
            size={[13, 0.06, 0.06]}
            color="#5c5c5c"
            mat="metal"
            solid={false}
            cast={false}
          />
        ))}
        <Block pos={[-2.5, 0.03, ZV]} size={[13, 0.04, 1]} color="#8d7b68" mat="wood" solid={false} cast={false} />
        {CAMBIOS.map((cx0, i) => {
          const largo = s.largos[i] * U;
          const t = tiempos(i, s.tren, p);
          return (
            <group key={i}>
              {[-0.32, 0.32].map((d) => (
                <Block
                  key={d}
                  pos={[cx0 + largo / 2, 0.08, ZAS[i] + d]}
                  size={[largo, 0.06, 0.06]}
                  color="#5c5c5c"
                  mat="metal"
                  solid={false}
                  cast={false}
                />
              ))}
              <Block
                pos={[cx0 + largo / 2, 0.03, ZAS[i]]}
                size={[largo + 0.2, 0.04, 0.9]}
                color={sel === i ? '#ffd166' : '#8d7b68'}
                mat="wood"
                solid={false}
                cast={false}
              />
              <group
                position={[cx0 - DESVIO / 2, 0.06, (ZAS[i] + ZV) / 2]}
                rotation-y={Math.atan2(DESVIO, ZAS[i] - ZV)}
              >
                <Block
                  pos={[0, 0, 0]}
                  size={[0.08, 0.05, Math.hypot(DESVIO, ZAS[i] - ZV)]}
                  color="#5c5c5c"
                  mat="metal"
                  solid={false}
                  cast={false}
                />
              </group>
              <Label
                pos={[cx0 + largo / 2, 0.75, ZAS[i] - 0.5]}
                text={`${i + 1} · cabe ${s.largos[i]} · ${t.llega ? '✓ llegás' : '✗ no llegás'}`}
                h={0.32}
                bg={sel === i ? '#e76f51' : '#264653'}
              />
            </group>
          );
        })}
        <Block pos={[XE - 0.2, 0.25, ZV + 1.2]} size={[2.6, 0.5, 1.2]} color="#c2a878" mat="concrete" solid={false} />
        <Label pos={[XE, 1.2, ZV + 1.6]} text="Andén · La Unión" h={0.24} bg="#2a9d8f" />
        {s.andén.map((c, i) => (
          <Block
            key={i}
            pos={[XE - 0.8 + i * 0.5, 0.75, ZV + 1.2]}
            size={[0.4, 0.5, 0.4]}
            color={CARGAS[c.carga][1]}
            mat="wood"
            solid={false}
          />
        ))}
        <group position={[bx, 0, bz]}>
          <Block pos={[0, 0.5, 0]} size={[U * 0.9, 0.7, 0.8]} color="#c0392b" mat="metal" solid={false} />
          <Cyl pos={[0.1, 1.05, 0]} r={0.12} h={0.4} color="#2b2b2b" mat="metal" solid={false} />
          <Label pos={[0, 1.6, 0]} text="La burra" h={0.28} bg="#c0392b" />
        </group>
        {s.tren.map((c, i) => {
          const largo = p.tele && c.tele && i === s.tren.length - 1 && s.anima > 0 && k > 0.45 ? c.largo - 1 : c.largo;
          x -= (i === 0 ? U * 0.5 : 0) + largo * U * 0.5 + 0.06;
          const px = x;
          x -= largo * U * 0.5;
          return (
            <group key={i} position={[px, 0, bz]}>
              <Block pos={[0, 0.42, 0]} size={[largo * U - 0.1, 0.4, 0.78]} color="#4a4e69" mat="wood" solid={false} />
              <Block
                pos={[0, 0.72, 0]}
                size={[largo * U - 0.3, 0.26, 0.6]}
                color={CARGAS[c.carga][1]}
                mat="cloth"
                solid={false}
              />
              {s.anima === 0 && (
                <Label
                  pos={[0, 1.25, 0]}
                  text={`${c.tele ? '↔' : ''}${CARGAS[c.carga][0]}${c.valor}`}
                  h={0.3}
                  bg="#22223b"
                />
              )}
            </group>
          );
        })}
        <group position={[cx, 0, ZV]}>
          {[0, 1, 2].map((i) => (
            <Block
              key={i}
              pos={[i * 1.1, 0.55, 0]}
              size={[1, 0.8, 0.8]}
              color={i ? '#457b9d' : '#1d3557'}
              mat="metal"
              solid={false}
            />
          ))}
          <Label pos={[0, 1.4, 0]} text="Convoy" h={0.28} bg="#1d3557" />
        </group>
      </Escena>
    );
  },
});
export const Vagon = motor.Escena;
export const guia = motor.guia;
