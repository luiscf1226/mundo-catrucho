// Mostrador de Brus: en Brus Laguna el trueque se hace de bote a bote. Cada pedido cambia bultos entre dos botes,
// y uno de los dos va con el borde justo: si recibe antes de soltar, se le hunde el borde. Hay que soltar primero
// desde el bote apretado y después recibir.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, revolver, xDe } from './comun';

const SLOTS = 4;
const NOMBRES = ['Arroz', 'Casabe', 'Pescado seco', 'Cocos', 'Leña', 'Plátano', 'Bidón de agua', 'Yuca'];
type Bulto = { nombre: string; peso: number; pedido: boolean };
type Bote = { base: number; cap: number; slots: (Bulto | null)[] };
type Estado = ReturnType<typeof cursor> & {
  botes: [Bote, Bote];
  espera: number;
  mirando: number;
  hunde: number;
  entregas: number;
  pasados: number;
  hundidas: number;
  errores: number;
  intentos: number;
  azar: () => number;
};
type Param = { dobles: number; seed: number };
type Sesion = Motor<Param, Estado>;

const carga = (b: Bote) => b.base + b.slots.reduce((a, x) => a + (x?.peso ?? 0), 0);
const caben = (b: Bote) => b.cap - carga(b);
const entre = (r: () => number, a: number, b: number) => a + Math.floor(r() * (b - a + 1));

function pedido(m: Sesion) {
  const s = m.datos,
    r = s.azar,
    p = m.parametros,
    nombres = revolver(NOMBRES, r);
  const bulto = (peso: number, pedido: boolean): Bulto => ({ nombre: nombres.pop() ?? 'Bulto', peso, pedido });
  // el bote apretado (T) solo aguanta lo que recibe si antes soltó lo suyo
  const dobleO = r() < p.dobles,
    dobleT = !dobleO && r() < p.dobles;
  const outO = Array.from({ length: dobleO ? 2 : 1 }, () => bulto(entre(r, 15, 30), true));
  const sumaO = outO.reduce((a, b) => a + b.peso, 0),
    minO = Math.min(...outO.map((b) => b.peso));
  const margenT = entre(r, 2, minO - 3);
  const pesoT = Math.max(12, sumaO - margenT + entre(r, 0, 6));
  const outT = dobleT ? [bulto(Math.ceil(pesoT / 2), true), bulto(Math.floor(pesoT / 2), true)] : [bulto(pesoT, true)];
  const sumaT = outT.reduce((a, b) => a + b.peso, 0);
  const margenO = sumaT + entre(r, 1, 8);
  const armar = (out: Bulto[], margen: number): Bote => {
    const base = entre(r, 30, 50),
      cosas = revolver([...out, bulto(entre(r, 10, 25), false)], r);
    const slots: (Bulto | null)[] = revolver([...cosas, ...Array(SLOTS - cosas.length).fill(null)], r);
    return { base, cap: base + cosas.reduce((a, b) => a + b.peso, 0) + margen, slots };
  };
  const T = armar(outT, margenT),
    O = armar(outO, margenO);
  s.botes = r() < 0.5 ? [T, O] : [O, T];
  s.mirando = 0;
}
function pasar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.espera > 0) return;
  s.espera = 0.5;
  s.intentos++;
  const i = casilla(s.x, SLOTS * 2),
    de = s.botes[i < SLOTS ? 0 : 1],
    a = s.botes[i < SLOTS ? 1 : 0],
    k = i % SLOTS,
    b = de.slots[k];
  if (!b) {
    m.sumar(-5);
    toast('Ahí no hay bulto.', '📦');
  } else if (!b.pedido) {
    s.errores++;
    m.sumar(-15);
    toast('Ese bulto no es del pedido.', '📦');
  } else if (carga(a) + b.peso > a.cap) {
    s.hundidas++;
    s.hunde = 1;
    m.sumar(-30);
    toast('Recibiste antes de soltar: se hundió el borde. Soltá primero.', '🌊');
  } else {
    const libre = a.slots.indexOf(null);
    de.slots[k] = null;
    a.slots[libre] = { ...b, pedido: false };
    s.pasados++;
    m.sumar(15);
    if (!s.botes.some((x) => x.slots.some((y) => y?.pedido))) {
      s.entregas++;
      m.sumar(40);
      toast('Entrega cerrada a peso parejo.', '⚖️');
      pedido(m);
    }
  }
}

const motor = defineMotor({
  id: 'graciasadios.truequeflotante',
  modos: { duo: { tipo: 'compartido', cada: 2 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'lago',
  guia: {
    goal: 'Los bultos con etiqueta amarilla van al otro bote. Elegí el bulto con el cursor y F lo pasa. Mirá cuánto le cabe a cada bote: el que va justo tiene que soltar lo suyo antes de recibir, o se le hunde el borde.',
    ...controles('pasar el bulto', undefined, 'elegir bulto'),
  },
  etapa: (p) => ({ dobles: p.dif > 0.4 ? 0.25 + p.dif * 0.3 : 0, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    botes: [
      { base: 0, cap: 0, slots: [] },
      { base: 0, cap: 0, slots: [] },
    ],
    espera: 0,
    mirando: 0,
    hunde: 0,
    entregas: 0,
    pasados: 0,
    hundidas: 0,
    errores: 0,
    intentos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.botes[0].slots.length) pedido(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.hunde = Math.max(0, s.hunde - dt);
    s.mirando += dt;
    if (input.take('fire')) pasar(m);
    const [A, B] = s.botes;
    m.objetivo = 'Soltá primero desde el bote que va justo';
    m.lineas = [
      `Bote de la izquierda: le caben ${caben(A)} · Bote de la derecha: le caben ${caben(B)}`,
      `Entregas ${s.entregas} · Pasados ${s.pasados} · Bordes hundidos ${s.hundidas} · Errores ${s.errores}`,
    ];
    m.stats = {
      x: s.x,
      entregas: s.entregas,
      pasados: s.pasados,
      hundidas: s.hundidas,
      errores: s.errores,
      intentos: s.intentos,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.mirando < 0.9) return;
    s.auto = true;
    // primero suelta el bote al que no le cabe lo que va a recibir
    const opciones = s.botes.flatMap((b, j) =>
      b.slots.flatMap((x, k) =>
        x?.pedido ? [{ i: j * SLOTS + k, cabe: carga(s.botes[1 - j]) + x.peso <= s.botes[1 - j].cap }] : [],
      ),
    );
    const elegido = opciones.find((o) => o.cabe);
    if (!elegido) return;
    s.x = xDe(elegido.i, SLOTS * 2);
    pasar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      sel = casilla(s.x, SLOTS * 2);
    return (
      <Mesa titulo="Brus Laguna · trueque de bote a bote">
        <Block pos={[-1, 0.75, 0]} size={[9.4, 0.06, 7]} color="#3a7ca5" mat="water" solid={false} />
        <Block pos={[-1, 0.8, -3]} size={[9.4, 0.12, 0.9]} color="#a98467" mat="wood" solid={false} />
        <Label pos={[-1, 1.4, -3]} text="Mostrador del muelle" h={0.3} />
        {s.botes.map((b, j) => {
          const cx = j ? 1.4 : -3.4,
            lleno = carga(b) / b.cap,
            y = 1.05 - lleno * 0.25 - (s.hunde > 0 && caben(b) < 6 ? Math.sin(m.tiempo * 30) * 0.05 : 0);
          return (
            <group key={j}>
              <Block
                pos={[cx, y, 0.4]}
                size={[4, 0.4, 1.8]}
                color={j ? '#2a9d8f' : '#e76f51'}
                mat="wood"
                solid={false}
              />
              <Block pos={[cx, y + 0.21, 1.31]} size={[4, 0.03, 0.03]} color="#d62828" solid={false} />
              <Label
                pos={[cx, 2.5, 1.4]}
                text={`Le caben ${caben(b)}`}
                h={0.3}
                fg={caben(b) < 10 ? '#ffb4a2' : '#ffffff'}
              />
              {b.slots.map((x, k) => {
                const sx = cx - 1.5 + k,
                  i = j * SLOTS + k;
                return (
                  <group key={k}>
                    {i === sel && (
                      <Block pos={[sx, y + 0.22, 0.4]} size={[0.9, 0.03, 1.2]} color="#ffd166" solid={false} />
                    )}
                    {x && (
                      <>
                        <Block
                          pos={[sx, y + 0.25 + x.peso / 100, 0.4]}
                          size={[0.7, x.peso / 50, 0.7]}
                          color={x.pedido ? '#f4d35e' : '#b08968'}
                          mat="cloth"
                          solid={false}
                        />
                        <Label
                          pos={[sx, y + 0.75 + x.peso / 50, 0.4]}
                          text={`${x.pedido ? '→ ' : ''}${x.nombre} ${x.peso}`}
                          h={0.2}
                          fg={x.pedido ? '#ffd166' : '#e9ecef'}
                        />
                      </>
                    )}
                  </group>
                );
              })}
            </group>
          );
        })}
        <Cyl pos={[-1, 0.9, 0.4]} r={0.08} h={0.3} color="#6c584c" solid={false} />
      </Mesa>
    );
  },
});
export const Mostrador = motor.Escena;
export const guia = motor.guia;
