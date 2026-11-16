import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

const BANCAS = 5;
/** ocupante de un asiento: peso, chaleco y qué es (persona, maleta o sombrilla) */
type Ocupante = { peso: number; chaleco: boolean; cosa: 'persona' | 'maleta' | 'sombrilla' };
type Asientos = (Ocupante | null)[][];
type Estado = ReturnType<typeof cursor> & {
  asientos: Asientos;
  fila: Ocupante[];
  espera: number;
  salidas: number;
  fallas: number;
  escoras: number;
  sombrilla: boolean;
  azar: () => number;
};
type Sesion = Motor<{ pasajeros: number; tolerancia: number; bajar: boolean; seed: number }, Estado>;
const vacios = (): Asientos => Array.from({ length: BANCAS }, () => [null, null]);
/** escora: estribor menos babor */
const escora = (a: Asientos) => a.reduce((t, b) => t + (b[1]?.peso ?? 0) - (b[0]?.peso ?? 0), 0);
const ocupados = (a: Asientos) => a.flat().filter((o) => o !== null).length;
const elegido = (s: Estado): [number, number] => [Math.round(((s.x + 1) / 2) * (BANCAS - 1)), s.y < 0 ? 0 : 1];
/** las dos bancas vecinas se acomodan: quien queda del lado del cambio se corre al otro si hay campo */
function vecinas(a: Asientos, banca: number, lado: number) {
  for (const j of [banca - 1, banca + 1]) {
    const b = a[j];
    if (!b || !b[lado] || b[1 - lado]) continue;
    b[1 - lado] = b[lado];
    b[lado] = null;
  }
}
/** sentar o bajar en una copia, para que el bot y la vista previa calculen sin tocar la partida */
function probar(a: Asientos, banca: number, lado: number, quien: Ocupante | null) {
  const c = a.map((b) => [...b]);
  c[banca][lado] = quien;
  // al sentarse alguien las vecinas se acomodan; al bajarse nadie se mueve
  if (quien) vecinas(c, banca, lado);
  return c;
}
function persona(s: Estado, dif: number): Ocupante {
  return { peso: 1 + Math.floor(s.azar() * 3), chaleco: s.azar() > 0.35 + dif * 0.2, cosa: 'persona' };
}
function cargar(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  s.asientos = vacios();
  s.fila = Array.from({ length: p.pasajeros }, () => persona(s, m.partida.dif));
  s.sombrilla = false;
  if (!p.bajar) return;
  // desembarque: la lancha llega cargada y pareja; una maleta de espuma ocupa un asiento y va creciendo
  for (const q of s.fila) {
    q.chaleco = true;
    const [b, l] = mejor(s.asientos, q, p.tolerancia).lugar;
    s.asientos = probar(s.asientos, b, l, q);
  }
  s.fila = [];
  const libres = lugares(s.asientos, false);
  const [b, l] = libres[Math.floor(s.azar() * libres.length)];
  s.asientos[b][l] = { peso: 1, chaleco: true, cosa: 'maleta' };
}
const lugares = (a: Asientos, llenos: boolean) =>
  a.flatMap((b, i) => b.map((o, l) => [i, l] as [number, number])).filter(([i, l]) => !!a[i][l] === llenos);
/** el asiento que deja la lancha más pareja */
function mejor(a: Asientos, quien: Ocupante | null, _tol: number) {
  let lugar: [number, number] = [0, 0],
    valor = Infinity;
  for (const [i, l] of lugares(a, !quien)) {
    const v = Math.abs(escora(probar(a, i, l, quien))) + (quien ? 0 : a[i][l]?.cosa === 'persona' ? 0.1 : 0);
    if (v < valor) {
      valor = v;
      lugar = [i, l];
    }
  }
  return { lugar, valor };
}
/** desembarque: el de ese asiento se pasa al otro lado de su banca, si hay campo */
function cambiarLado(m: Sesion) {
  const s = m.datos,
    [b, l] = elegido(s),
    banca = s.asientos[b];
  if (s.espera > 0 || !banca[l] || banca[1 - l]) return;
  s.espera = 0.5;
  banca[1 - l] = banca[l];
  banca[l] = null;
}
function chaleco(m: Sesion) {
  const q = m.datos.fila[0];
  if (q && !q.chaleco && m.datos.espera <= 0) {
    q.chaleco = true;
    m.datos.espera = 0.3;
  }
}
function confirmar(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  if (s.espera > 0) return;
  s.espera = 0.5;
  const toast = useGame.getState().toast;
  if (p.bajar) {
    const [b, l] = elegido(s),
      quien = s.asientos[b][l];
    if (!quien) {
      m.sumar(-5);
      return;
    }
    const despues = probar(s.asientos, b, l, null);
    if (Math.abs(escora(despues)) > p.tolerancia + 2) {
      s.escoras++;
      m.sumar(-30);
      toast('¡Escora! Ese no se baja todavía.', '🚤');
      return;
    }
    s.asientos = despues;
    m.sumar(quien.cosa === 'persona' ? 5 : 10);
    if (!ocupados(s.asientos)) {
      s.salidas++;
      m.sumar(40);
      toast('¡Todos en tierra firme!', '🚤');
      cargar(m);
    }
    return;
  }
  if (!s.fila.length) {
    const e = escora(s.asientos),
      sinChaleco = s.asientos.flat().some((o) => o && !o.chaleco);
    if (Math.abs(e) <= p.tolerancia && !sinChaleco) {
      s.salidas++;
      m.sumar(100);
      toast('¡Salió la lancha pareja a Amapala!', '🚤');
    } else {
      s.fallas++;
      m.sumar(-50);
      toast(sinChaleco ? 'No sale: falta chaleco.' : `No sale: va ladeada (${e > 0 ? '+' : ''}${e}).`, '⛔');
    }
    cargar(m);
    return;
  }
  const [b, l] = elegido(s);
  if (s.asientos[b][l]) {
    m.sumar(-10);
    return;
  }
  s.asientos = probar(s.asientos, b, l, s.fila.shift() ?? null);
}
const motor = defineMotor({
  id: 'valle.embarque',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'costa',
  guia: {
    goal: 'Elegí banca con A/D y lado con W/S. F sienta al que sigue; las dos bancas vecinas se acomodan. E le pone chaleco. Con la fila vacía, F autoriza la salida si va pareja. Al desembarcar, F baja a uno y E lo pasa al otro lado.',
    ...controles('chaleco · pasar de lado'),
  },
  etapa: (p) => ({
    pasajeros: 6 + Math.round(p.dif * 2),
    tolerancia: p.dif > 0.6 ? 1 : 2,
    bajar: p.tema.variante === 'la-maleta-pesa-mas-que-vos',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    asientos: vacios(),
    fila: [],
    espera: 0,
    salidas: 0,
    fallas: 0,
    escoras: 0,
    sombrilla: false,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.fila.length && !ocupados(s.asientos)) cargar(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (m.parametros.bajar) {
      const maleta = s.asientos.flat().find((o) => o?.cosa === 'maleta');
      if (maleta) {
        maleta.peso = Math.min(3, maleta.peso + dt * 0.12);
        const libre = lugares(s.asientos, false)[0];
        if (maleta.peso >= 2.2 && !s.sombrilla && libre) {
          s.sombrilla = true;
          s.asientos[libre[0]][libre[1]] = { peso: 0.5, chaleco: true, cosa: 'sombrilla' };
          useGame.getState().toast('¡Del cierre salió una sombrilla y pidió asiento!', '☂️');
        }
      }
    }
    if (input.take('use')) {
      if (m.parametros.bajar) cambiarLado(m);
      else chaleco(m);
    }
    if (input.take('fire')) confirmar(m);
    const [b, l] = elegido(s),
      e = escora(s.asientos),
      q = s.fila[0];
    m.objetivo = m.parametros.bajar
      ? 'Bajá de uno en uno sin escorar · E pasa de lado'
      : q
        ? `Sentá: peso ${q.peso}${q.chaleco ? '' : ' · ¡sin chaleco! (E)'}`
        : 'Fila vacía: F autoriza la salida';
    m.lineas = [
      `Banca ${b + 1} · ${l ? 'estribor' : 'babor'} · Escora ${e > 0 ? '+' : ''}${e.toFixed(1)} (máx ${m.parametros.tolerancia})`,
      `${m.parametros.bajar ? `Quedan ${ocupados(s.asientos)}` : `En fila ${s.fila.length}`} · Viajes ${s.salidas} · Fallas ${s.fallas + s.escoras}`,
    ];
    m.stats = { x: s.x, salidas: s.salidas, fallas: s.fallas, escoras: s.escoras, escora: e };
  },
  bot(m) {
    const s = m.datos,
      q = s.fila[0];
    if (s.espera > 0) return;
    s.auto = true;
    if (q && !q.chaleco) {
      chaleco(m);
      return;
    }
    if (!m.parametros.bajar && !q) {
      confirmar(m);
      return;
    }
    const apuntar = ([b, l]: [number, number]) => {
      s.x = (b / (BANCAS - 1)) * 2 - 1;
      s.y = l ? 0.5 : -0.5;
    };
    const plan = mejor(s.asientos, q ?? null, m.parametros.tolerancia);
    if (m.parametros.bajar && plan.valor > m.parametros.tolerancia + 2) {
      // nadie puede bajar sin escorar: primero alguien se pasa al otro lado
      const ahora = Math.abs(escora(s.asientos));
      let cambio: [number, number] | null = null,
        valor = ahora;
      for (const [i, l] of lugares(s.asientos, true)) {
        if (s.asientos[i][1 - l]) continue;
        const c = s.asientos.map((x) => [...x]);
        c[i][1 - l] = c[i][l];
        c[i][l] = null;
        const v = Math.abs(escora(c));
        if (v < valor) {
          valor = v;
          cambio = [i, l];
        }
      }
      if (cambio) {
        apuntar(cambio);
        cambiarLado(m);
        return;
      }
    }
    apuntar(plan.lugar);
    confirmar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      [sb, sl] = elegido(s),
      e = escora(s.asientos);
    return (
      <Mesa
        titulo={
          m.parametros.bajar ? 'Desembarque en Coyolito · La maleta crece' : 'Lancha de Coyolito · Bancas parejas'
        }
      >
        <group position={[-1, 0.8, 0]} rotation={[Math.max(-0.3, Math.min(0.3, e * 0.05)), 0, 0]}>
          <Block pos={[0, 0.25, 0]} size={[7.4, 0.5, 3]} color="#f4f1de" mat="wood" solid={false} />
          <Block pos={[0, 0.55, 1.45]} size={[7.4, 0.3, 0.1]} color="#3d5a80" mat="wood" solid={false} />
          <Block pos={[0, 0.55, -1.45]} size={[7.4, 0.3, 0.1]} color="#3d5a80" mat="wood" solid={false} />
          {s.asientos.map((banca, i) => {
            const x = -2.8 + i * 1.4;
            return (
              <group key={i}>
                <Block
                  pos={[x, 0.6, 0]}
                  size={[0.5, 0.12, 2.6]}
                  color={i === sb ? '#ffd166' : '#a0703c'}
                  mat="wood"
                  solid={false}
                />
                {banca.map((o, l) => {
                  if (!o) return null;
                  const z = l ? -0.7 : 0.7;
                  if (o.cosa === 'maleta')
                    return (
                      <Block
                        key={l}
                        pos={[x, 0.75 + o.peso * 0.15, z]}
                        size={[0.5, 0.3 * o.peso, 0.4]}
                        color="#9b5de5"
                        solid={false}
                      />
                    );
                  if (o.cosa === 'sombrilla')
                    return <Cyl key={l} pos={[x, 1.3, z]} r={0.45} rTop={0.05} h={0.3} color="#f15bb5" solid={false} />;
                  return (
                    <group key={l}>
                      <Cyl
                        pos={[x, 0.9, z]}
                        r={0.12 + o.peso * 0.06}
                        h={0.5}
                        color={o.chaleco ? '#f77f00' : '#8d99ae'}
                        solid={false}
                      />
                      <Ball pos={[x, 1.3, z]} r={0.14} color="#a56b43" />
                    </group>
                  );
                })}
              </group>
            );
          })}
          <Ball pos={[-2.8 + sb * 1.4, 1.7, sl ? -0.7 : 0.7]} r={0.12} color="#ffffff" />
        </group>
        {s.fila.slice(0, 4).map((q, k) => (
          <group key={k}>
            <Cyl
              pos={[-4.8, 1, 3.1 - k * 0.9]}
              r={0.12 + q.peso * 0.06}
              h={0.6}
              color={q.chaleco ? '#f77f00' : '#8d99ae'}
              solid={false}
            />
            <Ball pos={[-4.8, 1.45, 3.1 - k * 0.9]} r={0.14} color="#a56b43" />
          </group>
        ))}
        <Label
          pos={[-1, 3.2, -1.8]}
          text={`Escora ${e > 0 ? '+' : ''}${e.toFixed(1)} · ${Math.abs(e) <= m.parametros.tolerancia ? 'pareja' : '¡ladeada!'}`}
          h={0.36}
        />
      </Mesa>
    );
  },
});
export const Embarque = motor.Escena;
export const guia = motor.guia;
