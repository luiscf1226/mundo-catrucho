import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, revolver, sector } from './comun';

const GIRO = Math.PI / 2;
const PRODUCTOS: [string, string][] = [
  ['Papa', '#c9a66b'],
  ['Repollo', '#9bc47a'],
  ['Zanahoria', '#f28c28'],
  ['Frijol', '#6b2e2e'],
  ['Café', '#5a3a22'],
  ['Aguacate', '#4f772d'],
  ['Durazno', '#f5b041'],
  ['Cebolla', '#e8d5f0'],
];
type Oferta = { da: number; pide: number; usada: boolean };
type Estado = ReturnType<typeof cursor> & {
  carga: number[];
  lista: number[];
  ofertas: Oferta[];
  ronda: number;
  rondas: number;
  espera: number;
  listo: number;
  listas: number;
  malos: number;
  fallidas: number;
  azar: () => number;
};
type Sesion = Motor<
  { tipos: number; sacos: number; cambios: number; ronda: number; circular: boolean; seed: number },
  Estado
>;
/** cuántos sacos de la lista todavía no tenés (los sacos no se parten: cada uno cuenta entero) */
function faltan(carga: number[], lista: number[]) {
  const resto = [...carga];
  let n = 0;
  for (const x of lista) {
    const i = resto.indexOf(x);
    if (i < 0) n++;
    else resto.splice(i, 1);
  }
  return n;
}
/** lo que pide la lista y no tenés, y lo que tenés de sobra */
function diferencia(carga: number[], lista: number[]) {
  const sobra = [...carga],
    falta: number[] = [];
  for (const x of lista) {
    const i = sobra.indexOf(x);
    if (i < 0) falta.push(x);
    else sobra.splice(i, 1);
  }
  return { falta, sobra };
}
const cambiar = (carga: number[], o: Oferta) => {
  const c = [...carga];
  c.splice(c.indexOf(o.pide), 1, o.da);
  return c;
};
function encargo(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    tipo = () => Math.floor(s.azar() * p.tipos);
  s.carga = Array.from({ length: p.sacos }, tipo);
  s.lista = [...s.carga];
  const cambios = p.circular ? 1 : p.cambios;
  for (let k = 0; k < cambios; k++) {
    // un saco que no traés: así de verdad hay que conseguirlo
    let t = tipo();
    for (let n = 0; n < p.tipos && s.carga.includes(t); n++) t = (t + 1) % p.tipos;
    s.lista[k] = t;
  }
  s.lista = revolver(s.lista, s.azar);
  ronda(m);
}
/** madrugada: cada puesto revela su trueque; siempre hay un camino, y un puesto que solo confunde */
function ronda(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    { falta, sobra } = diferencia(s.carga, s.lista),
    ofertas: Oferta[] = [];
  s.ronda = p.ronda;
  s.rondas++;
  if (p.circular && falta.length) {
    // sin cambio directo: hay que pasar por un saco de en medio que no está en la lista
    let z = Math.floor(s.azar() * p.tipos);
    for (let n = 0; n < p.tipos && (s.lista.includes(z) || s.carga.includes(z)); n++) z = (z + 1) % p.tipos;
    ofertas.push({ da: z, pide: sobra[0], usada: false }, { da: falta[0], pide: z, usada: false });
  } else falta.forEach((x, i) => ofertas.push({ da: x, pide: sobra[i], usada: false }));
  while (ofertas.length < 3) {
    // el que confunde: te da algo que no pide la lista a cambio de un saco que sí
    const pide = s.lista[Math.floor(s.azar() * s.lista.length)];
    let da = Math.floor(s.azar() * p.tipos);
    if (da === pide) da = (da + 1) % p.tipos;
    ofertas.push({ da, pide, usada: false });
  }
  s.ofertas = revolver(ofertas, s.azar);
}
function trocar(m: Sesion, k: number) {
  const s = m.datos,
    toast = useGame.getState().toast,
    o = s.ofertas[k];
  if (s.espera > 0 || s.listo > 0 || !o) return;
  s.espera = 0.4;
  if (o.usada) {
    m.sumar(-5);
    toast('Ese puesto ya cerró su trueque en esta ronda.', '🧺');
    return;
  }
  if (!s.carga.includes(o.pide)) {
    s.malos++;
    m.sumar(-10);
    toast(`No tenés un saco de ${PRODUCTOS[o.pide][0]} cerrado para dar.`, '🧺');
    return;
  }
  const antes = faltan(s.carga, s.lista);
  s.carga = cambiar(s.carga, o);
  o.usada = true;
  const despues = faltan(s.carga, s.lista);
  if (despues < antes) m.sumar(8);
  else if (despues > antes) {
    s.malos++;
    m.sumar(-10);
    toast('Diste un saco que pedía la lista.', '🥬');
  }
}
function entregar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.6;
  const n = faltan(s.carga, s.lista);
  if (n === 0) {
    s.listas++;
    s.listo = 1.5;
    m.sumar(60);
    toast('¡Lista completa y con todos los sacos cerrados!', '🥬');
    return;
  }
  s.fallidas++;
  m.sumar(-40);
  toast(`Todavía faltan ${n} sacos de la lista.`, '🧺');
}
const motor = defineMotor({
  id: 'ocotepeque.mercadomadruga',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mercado',
  guia: {
    goal: 'Cada puesto ofrece un trueque de saco por saco: apuntá a uno y F cambia. Los sacos no se abren ni se parten. Cuando tu carga cubra la lista, apuntá al centro y F la entrega. Cada ronda de madrugada cambian las ofertas.',
    ...controles(),
  },
  etapa: (p) => ({
    tipos: 4 + Math.round(p.dif * 2) + (p.tema.variante === 'el-repollo-compra-la-lista' ? 2 : 0),
    sacos: 3 + Math.round(p.dif),
    cambios: 1 + Math.round(p.dif),
    ronda: 8 - p.dif * 2,
    circular: p.tema.variante === 'el-repollo-compra-la-lista',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    carga: [],
    lista: [],
    ofertas: [],
    ronda: 0,
    rondas: 0,
    espera: 0,
    listo: 0,
    listas: 0,
    malos: 0,
    fallidas: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.lista.length) encargo(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) encargo(m);
    } else {
      s.ronda -= dt;
      if (s.ronda <= 0) ronda(m);
    }
    const k = sector(s.x, s.y, 3, GIRO);
    if (input.take('fire')) {
      if (k < 0) entregar(m);
      else trocar(m, k);
    }
    const o = s.ofertas[k];
    m.objetivo =
      k < 0 ? 'Centro: F entrega la lista' : o ? `Da ${PRODUCTOS[o.da][0]} · pide ${PRODUCTOS[o.pide][0]}` : '';
    m.lineas = [
      `Faltan ${faltan(s.carga, s.lista)} de la lista · Ronda nueva en ${Math.max(0, s.ronda).toFixed(0)} s`,
      `Listas ${s.listas} · Malos trueques ${s.malos} · Entregas fallidas ${s.fallidas}`,
    ];
    m.stats = { x: s.x, listas: s.listas, malos: s.malos, fallidas: s.fallidas };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.listo > 0 || !s.lista.length) return;
    s.auto = true;
    const apuntar = (k: number) => {
      const a = GIRO + (k * Math.PI * 2) / 3;
      s.x = Math.cos(a) * 0.8;
      s.y = Math.sin(a) * 0.8;
    };
    const n = faltan(s.carga, s.lista);
    if (n === 0) {
      s.x = 0;
      s.y = 0;
      entregar(m);
      return;
    }
    const sirve = (o: Oferta) => !o.usada && s.carga.includes(o.pide);
    let k = s.ofertas.findIndex((o) => sirve(o) && faltan(cambiar(s.carga, o), s.lista) < n);
    if (k < 0)
      k = s.ofertas.findIndex(
        (o) =>
          sirve(o) &&
          faltan(cambiar(s.carga, o), s.lista) === n &&
          s.ofertas.some((q) => q !== o && !q.usada && q.pide === o.da && s.lista.includes(q.da)),
      );
    if (k < 0) return;
    apuntar(k);
    trocar(m, k);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = sector(s.x, s.y, 3, GIRO),
      nombres = (l: number[]) => l.map((x) => PRODUCTOS[x][0]).join(', ');
    return (
      <Mesa titulo="Mercado de madrugada · Belén Gualcho">
        {s.ofertas.map((o, i) => {
          const a = GIRO + (i * Math.PI * 2) / 3,
            x = -1 + Math.cos(a) * 2.6,
            z = -Math.sin(a) * 2.2;
          return (
            <group key={i}>
              <Block
                pos={[x, 0.95, z]}
                size={[2, 0.3, 1]}
                color={i === k ? '#ffd166' : o.usada ? '#8a8174' : '#c08552'}
                mat="wood"
                solid={false}
              />
              <Cyl pos={[x - 0.5, 1.4, z]} r={0.3} h={0.6} color={PRODUCTOS[o.da][1]} mat="cloth" solid={false} />
              <Cyl pos={[x + 0.5, 1.4, z]} r={0.3} h={0.6} color={PRODUCTOS[o.pide][1]} mat="cloth" solid={false} />
              <Label
                pos={[x, 2.15, z]}
                text={o.usada ? 'Ya cambió' : `Da ${PRODUCTOS[o.da][0]} ⇄ pide ${PRODUCTOS[o.pide][0]}`}
                h={0.3}
              />
            </group>
          );
        })}
        <Block
          pos={[-1, 0.9, 0]}
          size={[0.8, 0.2, 0.8]}
          color={k < 0 ? '#ffd166' : '#7f5539'}
          mat="wood"
          solid={false}
        />
        {s.carga.map((x, i) => (
          <Cyl
            key={i}
            pos={[-3.6 + i * 0.6, 1.05, 3]}
            r={0.25}
            h={0.5}
            color={PRODUCTOS[x][1]}
            mat="cloth"
            solid={false}
          />
        ))}
        <Label pos={[-2.6, 1.7, 3]} text={`Tu carga: ${nombres(s.carga)}`} h={0.3} />
        <Label
          pos={[-1, 3.4, -2.6]}
          text={s.listo > 0 ? '¡Lista cubierta! 🥬' : `Lista: ${nombres(s.lista)}`}
          h={0.42}
        />
      </Mesa>
    );
  },
});
export const Mercado = motor.Escena;
export const guia = motor.guia;
