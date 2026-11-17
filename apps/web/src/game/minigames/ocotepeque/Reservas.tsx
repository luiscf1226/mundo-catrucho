import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, revolver, xDe } from './comun';

const COLORES = ['#e76f51', '#2a9d8f', '#e9c46a', '#8ab17d', '#9c6644', '#6d597a', '#457b9d', '#f4a261'];
/** un pasajero sube en la parada `de` y se baja en la parada `a` (el asiento queda libre desde ahí) */
type Viaje = { de: number; a: number; color: string };
type Estado = ReturnType<typeof cursor> & {
  cola: Viaje[];
  asientos: Viaje[][];
  puestos: [number, Viaje][];
  espera: number;
  listo: number;
  buses: number;
  devueltos: number;
  liberados: number;
  azar: () => number;
};
type Sesion = Motor<{ asientos: number; paradas: number; seed: number }, Estado>;
const choca = (lista: Viaje[], v: Viaje) => lista.some((o) => o.de < v.a && v.de < o.a);
/** reparte el resto de la cola sin chocar (búsqueda con límite); devuelve el asiento del primero o −1 */
function plan(asientos: Viaje[][], cola: Viaje[]) {
  let pasos = 0;
  const copia = asientos.map((a) => [...a]);
  function va(i: number): boolean {
    if (i >= cola.length) return true;
    if (++pasos > 4000) return false;
    // primero el asiento que queda más justo
    const orden = copia
      .map((a, k) => ({
        k,
        holgura: a.length ? Math.min(...a.map((o) => Math.abs(o.de - cola[i].a) + Math.abs(o.a - cola[i].de))) : 99,
      }))
      .sort((x, y) => x.holgura - y.holgura);
    for (const { k } of orden) {
      if (choca(copia[k], cola[i])) continue;
      copia[k].push(cola[i]);
      if (va(i + 1)) return true;
      copia[k].pop();
    }
    return false;
  }
  for (let k = 0; k < asientos.length; k++) {
    if (choca(asientos[k], cola[0])) continue;
    copia[k].push(cola[0]);
    if (va(1)) return k;
    copia[k].pop();
  }
  return -1;
}
function tanda(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    viajes: Viaje[] = [];
  // cada asiento se reparte en tramos seguidos; las reservas llegan revueltas, no en orden de subida
  for (let k = 0; k < p.asientos; k++) {
    let t = s.azar() < 0.3 ? 1 : 0;
    while (t < p.paradas) {
      const a = Math.min(p.paradas, t + 1 + Math.floor(s.azar() * 3));
      viajes.push({ de: t, a, color: COLORES[viajes.length % COLORES.length] });
      t = a + (s.azar() < 0.2 ? 1 : 0);
    }
  }
  s.cola = revolver(viajes, s.azar);
  s.asientos = Array.from({ length: p.asientos }, () => []);
  s.puestos = [];
}
function vender(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast,
    v = s.cola[0];
  if (s.espera > 0 || s.listo > 0 || !v) return;
  s.espera = 0.4;
  const k = casilla(s.x, s.asientos.length);
  if (choca(s.asientos[k], v)) {
    s.devueltos++;
    m.sumar(-30);
    // el boleto se devuelve y la reserva pasa al final de la fila
    s.cola.push(s.cola.shift() ?? v);
    toast(`El asiento ${k + 1} ya va ocupado en ese tramo: devolviste el boleto.`, '🎟️');
    return;
  }
  s.asientos[k].push(v);
  s.puestos.push([k, v]);
  s.cola.shift();
  m.sumar(8);
  if (!s.cola.length) {
    s.buses++;
    s.listo = 1.5;
    m.sumar(50);
    toast('¡Salió el bus con todos sentados por tramo!', '🚌');
  }
}
function liberar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.listo > 0) return;
  const k = casilla(s.x, s.asientos.length),
    v = s.asientos[k].pop();
  if (!v) return;
  s.espera = 0.4;
  s.liberados++;
  s.puestos = s.puestos.filter(([, o]) => o !== v);
  s.cola.unshift(v);
  m.sumar(-12);
}
const motor = defineMotor({
  id: 'ocotepeque.reservas',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ciudad',
  guia: {
    goal: 'Cada reserva va de una parada a otra. Elegí asiento con A/D y F lo vende: un asiento libre ahorita puede ir ocupado más adelante. E libera la última reserva de ese asiento. Pensá en los que suben después.',
    ...controles('liberar reserva'),
  },
  etapa: (p) => ({ asientos: 4 + Math.round(p.dif * 2), paradas: 5 + Math.round(p.dif * 2), seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    cola: [],
    asientos: [],
    puestos: [],
    espera: 0,
    listo: 0,
    buses: 0,
    devueltos: 0,
    liberados: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.asientos.length) tanda(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) tanda(m);
    }
    if (input.take('use')) liberar(m);
    if (input.take('fire')) vender(m);
    const v = s.cola[0],
      k = casilla(s.x, s.asientos.length),
      cabe = v && s.asientos.some((a) => !choca(a, v));
    m.objetivo = v ? `Reserva: parada ${v.de + 1} → ${v.a + 1}` : 'Bus lleno';
    m.lineas = [
      `Asiento ${k + 1}${v && choca(s.asientos[k] ?? [], v) ? ' · ocupado en ese tramo' : ''}${v && !cabe ? ' · no cabe: liberá una (E)' : ''} · En fila ${s.cola.length}`,
      `Buses ${s.buses} · Boletos devueltos ${s.devueltos} · Liberadas ${s.liberados}`,
    ];
    m.stats = { x: s.x, buses: s.buses, devueltos: s.devueltos, liberados: s.liberados, fila: s.cola.length };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.listo > 0 || !s.cola.length) return;
    s.auto = true;
    const k = plan(s.asientos, s.cola);
    if (k >= 0) {
      s.x = xDe(k, s.asientos.length);
      vender(m);
      return;
    }
    // sin salida: se libera la última reserva vendida
    const ultimo = s.puestos[s.puestos.length - 1];
    if (!ultimo) return;
    s.x = xDe(ultimo[0], s.asientos.length);
    liberar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      n = s.asientos.length,
      T = m.parametros.paradas,
      k = casilla(s.x, n),
      v = s.cola[0],
      X = (i: number) => -4 + i * (6.4 / Math.max(1, n - 1)),
      Z = (t: number) => 2.4 - (t / T) * 5;
    return (
      <Mesa titulo="Bus de la frontera · reservas por tramo">
        {Array.from({ length: T + 1 }, (_, t) => (
          <group key={t}>
            <Block pos={[-0.8, 0.72, Z(t)]} size={[7.6, 0.03, 0.04]} color="#f1faee" solid={false} />
            <Label pos={[-5, 0.95, Z(t)]} text={`Parada ${t + 1}`} h={0.2} />
          </group>
        ))}
        {s.asientos.map((a, i) => (
          <group key={i}>
            <Block
              pos={[X(i), 0.74, 0]}
              size={[0.8, 0.04, 5.2]}
              color={i === k ? '#ffd166' : '#a8b2b8'}
              mat="plastic"
              solid={false}
            />
            <Label pos={[X(i), 1, 3]} text={`${i + 1}`} h={0.3} />
            {a.map((o, j) => (
              <Block
                key={j}
                pos={[X(i), 0.95, (Z(o.de) + Z(o.a)) / 2]}
                size={[0.6, 0.35, Math.abs(Z(o.a) - Z(o.de)) - 0.1]}
                color={o.color}
                mat="cloth"
                solid={false}
              />
            ))}
          </group>
        ))}
        {v && (
          <Block
            pos={[X(k), 1.5, (Z(v.de) + Z(v.a)) / 2]}
            size={[0.5, 0.2, Math.abs(Z(v.a) - Z(v.de)) - 0.1]}
            color={choca(s.asientos[k] ?? [], v) ? '#e63946' : '#ffd166'}
            solid={false}
          />
        )}
        <Label
          pos={[-1, 3.2, -2.6]}
          text={s.listo > 0 ? '¡Salió el bus! 🚌' : v ? `Reserva: parada ${v.de + 1} → ${v.a + 1}` : 'Bus listo'}
          h={0.34}
        />
        {s.cola.length > 1 && (
          <Label
            pos={[-1, 2.7, -2.6]}
            text={`Después: ${s.cola
              .slice(1, 4)
              .map((o) => `${o.de + 1}→${o.a + 1}`)
              .join(' · ')}`}
            h={0.24}
          />
        )}
      </Mesa>
    );
  },
});
export const Reservas = motor.Escena;
export const guia = motor.guia;
