import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

/** Regla de 0 a 10; los equipos están en 9. Los sensores van entre 1,5 y 7,5. */
const EQUIPO = 9,
  BAJO = 1.5,
  ALTO = 7.5,
  FIN = 5.5;
type Lectura = { h: number; t: number };
type Estado = ReturnType<typeof cursor> & {
  sensores: number[];
  lecturas: Lectura[];
  nivel: number;
  t: number;
  ritmo: number;
  fuerte: boolean;
  fase: number;
  espera: number;
  listo: number;
  retirado: boolean;
  anticipados: number;
  calmas: number;
  alarmas: number;
  tarde: number;
  sinDatos: number;
  puestos: number;
  azar: () => number;
};
type Param = { fuerte: [number, number]; calma: [number, number]; ola: number; seed: number };
type Sesion = Motor<Param, Estado>;
const altura = (y: number) => Math.round((BAJO + ((y + 1) / 2) * (ALTO - BAJO)) * 10) / 10;
const yDe = (h: number) => ((h - BAJO) / (ALTO - BAJO)) * 2 - 1;
/** tendencia con las dos lecturas más separadas: segundos que faltan para que el agua llegue a los equipos */
function proyeccion(l: Lectura[]) {
  if (l.length < 2) return null;
  const a = l[0],
    b = l[l.length - 1],
    v = (b.h - a.h) / Math.max(0.05, b.t - a.t);
  return v > 0 ? b.t + (EQUIPO - b.h) / v : Number.POSITIVE_INFINITY;
}
function crecida(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    a = s.azar;
  s.fuerte = a() < 0.6;
  const [lo, hi] = s.fuerte ? p.fuerte : p.calma;
  s.ritmo = lo + a() * (hi - lo);
  s.fase = a() * 6;
  s.t = 0;
  s.nivel = 1;
  s.lecturas = [];
  s.retirado = false;
}
function cierra(m: Sesion, puntos: number, texto: string, icono: string) {
  m.sumar(puntos);
  useGame.getState().toast(texto, icono);
  m.datos.listo = 1;
}
function poner(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.3;
  const h = altura(s.y);
  if (s.sensores.some((o) => Math.abs(o - h) < 0.8)) {
    useGame.getState().toast('Ya hay un sensor ahí: separalos.', '📏');
    return;
  }
  s.puestos++;
  s.sensores.push(h);
  if (s.sensores.length > 3) s.sensores.shift();
  s.sensores.sort((x, y) => x - y);
}
function retirar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.listo > 0 || s.retirado) return;
  s.espera = 0.3;
  if (s.lecturas.length < 2) {
    s.sinDatos++;
    m.sumar(-20);
    useGame.getState().toast('Sin dos lecturas no hay tendencia: esperá los sensores.', '📈');
    return;
  }
  s.retirado = true;
  if (s.fuerte) {
    s.anticipados++;
    cierra(m, 70, '¡Equipos retirados a tiempo!', '🚚');
  } else {
    s.alarmas++;
    cierra(m, -25, 'Falsa alarma: este aguacero no iba a llegar.', '🌦️');
  }
}
const motor = defineMotor({
  id: 'yoro.ulua',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'rio',
  guia: {
    goal: 'Con W/S elegí altura y F pone un sensor (tres, separados). Cada sensor mojado marca un punto en la gráfica. Si la línea llega a los equipos antes de que pare el aguacero, E los retira. Si esperás a que se moje el último sensor, ya es tarde.',
    ...controles('retirar equipos'),
  },
  etapa: (p) => ({
    fuerte: [2.2 - p.dif * 0.4, 2.8 - p.dif * 0.3] as [number, number],
    calma: [0.6 + p.dif * 0.1, 0.9 + p.dif * 0.3] as [number, number],
    ola: 0.12 + p.dif * 0.12,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    sensores: [],
    lecturas: [],
    nivel: 1,
    t: 0,
    ritmo: 1,
    fuerte: false,
    fase: 0,
    espera: 0,
    // un ratito al empezar para poner los sensores
    listo: 1.2,
    retirado: false,
    anticipados: 0,
    calmas: 0,
    alarmas: 0,
    tarde: 0,
    sinDatos: 0,
    puestos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) crecida(m);
    } else {
      s.t += dt;
      s.nivel = 1 + s.ritmo * s.t + Math.sin(s.t * 5 + s.fase) * p.ola;
      for (const h of s.sensores)
        if (s.nivel >= h && s.t > 0.05 && !s.lecturas.some((l) => l.h === h)) s.lecturas.push({ h, t: s.t });
      const ultimo = s.sensores[s.sensores.length - 1];
      if (s.fuerte && !s.retirado && (s.nivel >= EQUIPO || (s.sensores.length === 3 && s.nivel >= ultimo))) {
        s.tarde++;
        cierra(m, -30, 'El agua llegó al último sensor: el material quedó fuera de alcance.', '🌊');
      } else if (!s.fuerte && s.t >= FIN) {
        if (s.lecturas.length >= 2) {
          s.calmas++;
          cierra(m, 50, 'Paró el aguacero: bien leído, no había que mover nada.', '🌤️');
        } else cierra(m, 0, 'Paró el aguacero, pero sin lecturas no supiste por qué.', '🌤️');
      }
    }
    if (input.take('use')) retirar(m);
    if (input.take('fire')) poner(m);
    const pr = proyeccion(s.lecturas);
    m.objetivo =
      pr === null
        ? `Sensores ${s.sensores.length}/3 · esperá dos lecturas`
        : pr < FIN
          ? 'La tendencia llega a los equipos antes de que pare'
          : 'La tendencia no llega antes de que pare';
    m.lineas = [
      `Sensor en ${altura(s.y).toFixed(1)} m · Agua ${Math.max(0, s.nivel).toFixed(1)} m · ${Math.max(0, FIN - s.t).toFixed(1)} s de aguacero`,
      `A tiempo ${s.anticipados} · Calmas ${s.calmas} · Falsas alarmas ${s.alarmas} · Tarde ${s.tarde}`,
    ];
    m.stats = {
      x: s.x,
      y: s.y,
      puestos: s.puestos,
      anticipados: s.anticipados,
      calmas: s.calmas,
      alarmas: s.alarmas,
      tarde: s.tarde,
      sinDatos: s.sinDatos,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0) return;
    s.auto = true;
    // sensores separados: uno abajo y dos arriba, para que la tendencia salga con buena base
    const quiere = [BAJO, 5.9, ALTO];
    const falta = quiere.find((h) => !s.sensores.some((o) => Math.abs(o - h) < 0.05));
    if (falta !== undefined && s.sensores.length < 3) {
      s.x = 0;
      s.y = yDe(falta);
      poner(m);
      return;
    }
    if (s.listo > 0 || s.retirado) return;
    const pr = proyeccion(s.lecturas);
    if (pr !== null && s.lecturas.length >= 2 && pr < FIN) retirar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      pr = proyeccion(s.lecturas),
      // regla grande a la izquierda, gráfica a la derecha (tiempo hacia la derecha, nivel hacia el fondo)
      H = (h: number) => 0.75 + h * 0.3,
      GX = (t: number) => -0.4 + (t / 7) * 4.6,
      GZ = (h: number) => 2.7 - h * 0.52,
      a = s.lecturas[0],
      b = s.lecturas[s.lecturas.length - 1];
    let tendencia = null as null | { x: number; z: number; largo: number; giro: number };
    if (pr !== null && a && b && s.lecturas.length >= 2) {
      const fin = Math.min(7, Number.isFinite(pr) ? pr : 7),
        hFin = a.h + ((b.h - a.h) / Math.max(0.05, b.t - a.t)) * (fin - a.t),
        x0 = GX(a.t),
        z0 = GZ(a.h),
        x1 = GX(fin),
        z1 = GZ(Math.min(10, hFin));
      tendencia = {
        x: (x0 + x1) / 2,
        z: (z0 + z1) / 2,
        largo: Math.hypot(x1 - x0, z1 - z0),
        giro: -Math.atan2(z1 - z0, x1 - x0),
      };
    }
    return (
      <Mesa titulo="Río Ulúa · lectura de crecida">
        {/* regla de nivel con sensores y cursor; al lado, el tanque con el agua y los equipos arriba */}
        <Block pos={[-4.4, H(5), 0.4]} size={[0.5, 3, 0.12]} color="#f1faee" mat="plastic" solid={false} />
        {[0, 2, 4, 6, 8, 10].map((h) => (
          <Label key={h} pos={[-5.15, H(h), 0.4]} text={`${h} m`} h={0.24} />
        ))}
        {s.sensores.map((h) => (
          <Ball
            key={h}
            pos={[-4.4, H(h), 0.55]}
            r={0.16}
            color={s.lecturas.some((l) => l.h === h) ? '#e63946' : '#57cc99'}
          />
        ))}
        <Block pos={[-4.4, H(altura(s.y)), 0.55]} size={[0.8, 0.08, 0.3]} color="#ffd166" solid={false} />
        <Block
          pos={[-3.2, (0.75 + H(Math.max(0, s.nivel))) / 2, 0.4]}
          size={[1.2, Math.max(0.02, H(Math.max(0, s.nivel)) - 0.75), 0.8]}
          color="#4a90b8"
          mat="water"
          solid={false}
        />
        <Block pos={[-3.2, H(EQUIPO), 0.4]} size={[1, 0.25, 0.6]} color="#e76f51" mat="metal" solid={false} />
        <Label pos={[-3.2, H(EQUIPO) + 0.45, 0.4]} text={s.retirado ? '🚚 a salvo' : '🧰 equipos'} h={0.28} />
        {/* gráfica: lecturas, tendencia, equipos y fin del aguacero */}
        <Block pos={[1.9, 0.73, 0.1]} size={[5, 0.02, 5.6]} color="#fefae0" mat="cloth" solid={false} />
        <Block pos={[1.9, 0.75, GZ(EQUIPO)]} size={[5, 0.02, 0.08]} color="#e76f51" solid={false} />
        <Label pos={[-0.2, 1.05, GZ(EQUIPO)]} text="equipos" h={0.24} />
        <Block pos={[GX(FIN), 0.75, 0.1]} size={[0.08, 0.02, 5.6]} color="#457b9d" solid={false} />
        <Label pos={[GX(FIN), 1.05, -2.6]} text="para el aguacero" h={0.24} />
        {s.lecturas.map((l, i) => (
          <Ball key={i} pos={[GX(l.t), 0.82, GZ(l.h)]} r={0.14} color="#e63946" />
        ))}
        {tendencia && (
          <Block
            pos={[tendencia.x, 0.77, tendencia.z]}
            size={[tendencia.largo, 0.02, 0.06]}
            rot={tendencia.giro}
            color={pr !== null && pr < FIN ? '#e63946' : '#2a9d8f'}
            solid={false}
          />
        )}
        <Label
          pos={[-1, 3.6, -2.4]}
          text={
            s.listo > 0
              ? '…'
              : pr === null
                ? `📏 Sensores ${s.sensores.length}/3 · esperá dos lecturas`
                : pr < FIN
                  ? '📈 ¡Llega antes de que pare!'
                  : '📉 No llega antes de que pare'
          }
          h={0.4}
        />
      </Mesa>
    );
  },
});
export const Crecida = motor.Escena;
export const guia = motor.guia;
