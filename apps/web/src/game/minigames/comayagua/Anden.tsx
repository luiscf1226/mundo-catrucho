// Trasbordo de Siguatepeque: un solo andén y un diagrama horario. Cada enlace necesita tiempo para bajar la maleta.
import { input } from '../../../core/input';
import { Block, Label, P } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { acercar, cursor, haciaIndice, indice, metasLineales, moverCursor, reloj, Taller, texto, turno } from './comun';

const RANURAS = 12;
const ANCHO = 0.84;
const X0 = -6.9;
const EQUIPAJE = 1;
const LINEAS: [string, string][] = [
  ['Bus de Tegus', '#e63946'],
  ['Rapidito de La Esperanza', '#2a9d8f'],
  ['Bus de San Pedro', '#f4a261'],
  ['Bus de Comayagua', '#7b2cbf'],
  ['Bus de Santa Rosa', '#2a6f97'],
  ['Bus de Marcala', '#8d5a2b'],
];
type Bus = {
  nombre: string;
  color: string;
  dura: number;
  desde: number;
  hasta: number;
  enlace: number;
  inicio: number;
  ganado: number;
};
type Estado = {
  c: ReturnType<typeof cursor>;
  buses: Bus[];
  turno: number;
  salida: number;
  ronda: number;
  azar: () => number;
  espera: number;
  ayuda: boolean;
  aTiempo: number;
  enlaces: number;
  perdidos: number;
  solapes: number;
  puestos: number;
  aviso: string;
};
type Param = { buses: number; enlaces: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
const hora = (r: number) => `${10 + Math.floor((r * 5) / 60)}:${String((r * 5) % 60).padStart(2, '0')}`;
const fin = (b: Bus) => b.inicio + b.dura;
const actual = (s: Estado) => s.buses[s.turno] as Bus | undefined;
const ranura = (s: Estado) => {
  const b = actual(s);
  return Math.min(RANURAS - (b?.dura ?? 1), indice(s.c.x, RANURAS));
};
const choca = (s: Estado, b: Bus, inicio: number) =>
  s.buses.some((o) => o !== b && o.inicio >= 0 && inicio < fin(o) && o.inicio < inicio + b.dura);

/** Arma un horario que sí tiene solución y de ahí saca las ventanas y los enlaces. */
function ronda(s: Estado, p: Param) {
  s.ronda++;
  const n = p.buses;
  const conEnlace = new Set<number>();
  while (conEnlace.size < Math.min(p.enlaces, n - 1)) conEnlace.add(1 + Math.floor(s.azar() * (n - 1)));
  const lineas = [...LINEAS].sort(() => s.azar() - 0.5);
  let plan: number[] = [];
  let duras: number[] = [];
  for (let intento = 0; intento < 30; intento++) {
    let t = Math.floor(s.azar() * 2);
    plan = [];
    duras = [];
    for (let i = 0; i < n; i++) {
      const dura = intento > 20 || s.azar() < 0.55 ? 1 : 2;
      if (i) t += conEnlace.has(i) ? EQUIPAJE : s.azar() < 0.35 ? 1 : 0;
      plan.push(t);
      duras.push(dura);
      t += dura;
    }
    if (t <= RANURAS) break;
  }
  s.buses = plan.map((inicio, i) => ({
    nombre: lineas[i % lineas.length][0],
    color: lineas[i % lineas.length][1],
    dura: duras[i],
    desde: Math.max(0, inicio - 1 - Math.floor(s.azar() * 2)),
    hasta: Math.min(RANURAS - duras[i], inicio + 1 + Math.floor(s.azar() * 2)),
    enlace: conEnlace.has(i) ? i - 1 : -1,
    inicio: -1,
    ganado: 0,
  }));
  s.turno = 0;
}
function asignar(m: Sesion) {
  const s = m.datos;
  const b = actual(s);
  if (!b || s.salida > 0) return;
  const r = ranura(s);
  if (choca(s, b, r)) {
    s.solapes++;
    m.sumar(-15);
    s.aviso = `¡Solapado! Dos buses en el mismo andén a las ${hora(r)}: se cancela. −15`;
    return;
  }
  b.inicio = r;
  s.puestos++;
  s.turno++;
  let msg = `${b.nombre} llega a las ${hora(r)}`;
  b.ganado = 0;
  if (r >= b.desde && r <= b.hasta) {
    s.aTiempo++;
    b.ganado += 5;
    msg += ', en su ventana. +5';
  } else msg += ', fuera de su ventana.';
  if (b.enlace >= 0) {
    const o = s.buses[b.enlace];
    if (r >= fin(o) + EQUIPAJE) {
      s.enlaces++;
      b.ganado += 15;
      msg = `Trasbordo de ${o.nombre} con tiempo para la maleta. +15`;
    } else {
      s.perdidos++;
      b.ganado -= 10;
      msg = `El bus llegó; la maleta todavía no. −10`;
    }
  }
  m.sumar(b.ganado);
  s.aviso = msg;
  if (!actual(s)) {
    const todo = s.buses.every(
      (x) =>
        x.inicio >= x.desde && x.inicio <= x.hasta && (x.enlace < 0 || x.inicio >= fin(s.buses[x.enlace]) + EQUIPAJE),
    );
    if (todo) m.sumar(20);
    s.aviso = todo ? '¡Andén redondo! +20. Viene otra tanda.' : 'Tanda cerrada. Viene otra.';
    s.salida = 2.5;
  }
}
function deshacer(m: Sesion) {
  const s = m.datos;
  if (s.salida > 0 || s.turno === 0) return;
  s.turno--;
  const b = s.buses[s.turno];
  // devolver descuenta lo que ese bus había sumado, para reacomodarlo sin trampa
  m.sumar(-Math.max(0, b.ganado));
  b.ganado = 0;
  b.inicio = -1;
  s.aviso = `${b.nombre} vuelve a la fila.`;
}
const motor = defineMotor({
  id: 'comayagua.anden',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'Poné cada bus en el diagrama dentro de su ventana, sin encimarlo con otro. Si trae enlace, dejá tiempo para la maleta.',
    keys: [
      ['A / D', 'mover la hora de llegada'],
      ['Mouse / stick derecho', 'elegir la hora'],
      ['F / clic / RT', 'asignar al andén'],
      ['E / mando X', 'devolver el último'],
    ],
    touch: [
      ['Palanca / arrastrá', 'elegir la hora'],
      ['🎯', 'asignar'],
      ['E', 'devolver el último'],
    ],
  },
  etapa: (p) => ({
    buses: 4 + Math.round(p.dif * 2),
    enlaces: 1 + Math.round(p.dif * 1.4),
    nombre: texto(p.tema.nombre, 'Terminal de un andén'),
    semilla: p.seed,
  }),
  metas: metasLineales(80, 180, 280, 40),
  duracion: reloj(80, 10),
  crear: (p): Estado => {
    const s: Estado = {
      c: cursor(-1, 0),
      buses: [],
      turno: 0,
      salida: 0,
      ronda: 0,
      azar: rng(p.semilla),
      espera: 0.5,
      ayuda: false,
      aTiempo: 0,
      enlaces: 0,
      perdidos: 0,
      solapes: 0,
      puestos: 0,
      aviso: 'Llegó la lista de buses: acomodalos en el andén.',
    };
    ronda(s, p);
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    moverCursor(s.c, dt, 1);
    if (input.take('fire')) asignar(m);
    if (input.take('use')) deshacer(m);
    if (s.salida > 0) {
      s.salida -= dt * (s.ayuda ? 1.5 : 1);
      if (s.salida <= 0) {
        ronda(s, m.parametros);
        s.c.x = -1;
      }
    }
    s.ayuda = false;
    const b = actual(s);
    m.objetivo = s.aviso;
    m.lineas = b
      ? [
          `${b.nombre} · descarga ${b.dura * 5} min · ventana ${hora(b.desde)}–${hora(b.hasta)}`,
          b.enlace >= 0
            ? `Enlace con ${s.buses[b.enlace].nombre}: llegá ${EQUIPAJE * 5} min después de que termine`
            : `Sin enlace · Llegada elegida ${hora(ranura(s))}`,
          `Tanda ${s.ronda} · Enlaces ${s.enlaces} · Solapes ${s.solapes}`,
        ]
      : ['Los buses salen…'];
    m.stats = {
      puestos: s.puestos,
      aTiempo: s.aTiempo,
      enlaces: s.enlaces,
      perdidos: s.perdidos,
      solapes: s.solapes,
      ranura: ranura(s),
      ronda: s.ronda,
      turno: s.turno,
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    const b = actual(s);
    if (!b || s.salida > 0) return;
    const minimo = b.enlace >= 0 ? fin(s.buses[b.enlace]) + EQUIPAJE : 0;
    let r = -1;
    for (let k = Math.max(b.desde, minimo); k <= b.hasta && r < 0; k++) if (!choca(s, b, k)) r = k;
    for (let k = 0; k <= RANURAS - b.dura && r < 0; k++) if (!choca(s, b, k)) r = k;
    if (r < 0) return;
    const x = haciaIndice(r, RANURAS);
    s.c.x = acercar(s.c.x, x, dt * 1.5);
    s.c.auto = true;
    if (s.c.x === x && turno(s, dt, 0.9)) asignar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const b = actual(s);
    const r = ranura(s);
    const xr = (k: number) => X0 + k * ANCHO;
    const yDiag = 2.1;
    const zDiag = -2.9;
    return (
      <Taller nombre={m.parametros.nombre} aviso="A/D hora · F asignar · E devolver">
        {/* tablero del diagrama horario */}
        <Block
          pos={[X0 + (RANURAS * ANCHO) / 2 - ANCHO / 2, yDiag + 0.3, zDiag - 0.1]}
          size={[RANURAS * ANCHO + 0.6, 2.6, 0.12]}
          color="#2b5470"
          mat="plastic"
          solid={false}
        />
        {Array.from({ length: RANURAS }, (_, k) => (
          <Block
            key={k}
            pos={[xr(k), yDiag - 0.4, zDiag]}
            size={[ANCHO - 0.06, 0.5, 0.04]}
            color={b && k >= b.desde && k < b.hasta + b.dura ? '#3d6b52' : '#41708f'}
            mat="plastic"
            solid={false}
            cast={false}
          />
        ))}
        {[0, 2, 4, 6, 8, 10].map((k) => (
          <Label key={k} pos={[xr(k), yDiag - 0.95, zDiag + 0.1]} text={hora(k)} h={0.28} bg="#2b5470" />
        ))}
        {s.buses.map((x, i) =>
          x.inicio >= 0 ? (
            <group key={i}>
              <Block
                pos={[xr(x.inicio) + ((x.dura - 1) * ANCHO) / 2, yDiag - 0.4, zDiag + 0.06]}
                size={[x.dura * ANCHO - 0.1, 0.42, 0.06]}
                color={x.color}
                mat="neon"
                solid={false}
                cast={false}
              />
              <Label
                pos={[xr(x.inicio) + ((x.dura - 1) * ANCHO) / 2, yDiag + 0.2 + (i % 2) * 0.42, zDiag + 0.1]}
                text={x.nombre.replace('Bus de ', '')}
                h={0.26}
                bg={x.color}
              />
            </group>
          ) : null,
        )}
        {b && s.salida <= 0 && (
          <>
            <Block
              pos={[xr(r) + ((b.dura - 1) * ANCHO) / 2, yDiag - 0.4, zDiag + 0.12]}
              size={[b.dura * ANCHO - 0.1, 0.46, 0.04]}
              color={choca(s, b, r) ? '#e63946' : '#ffd166'}
              mat="glass"
              solid={false}
              cast={false}
            />
            <Label
              pos={[xr(r) + ((b.dura - 1) * ANCHO) / 2, yDiag + 1.25, zDiag + 0.1]}
              text={`▼ ${hora(r)}`}
              h={0.26}
              bg="#c0392b"
            />
            {b.enlace >= 0 && s.buses[b.enlace].inicio >= 0 && (
              <Block
                pos={[xr(fin(s.buses[b.enlace])) + ((EQUIPAJE - 1) * ANCHO) / 2, yDiag - 0.85, zDiag + 0.08]}
                size={[EQUIPAJE * ANCHO - 0.1, 0.12, 0.04]}
                color="#f4f1e8"
                mat="neon"
                solid={false}
                cast={false}
              />
            )}
          </>
        )}
        {/* andén, con el bus que toca y la fila */}
        <Block pos={[-2.3, 0.15, 0.2]} size={[9.4, 0.3, 1.4]} color="#b7b2a8" mat="concrete" solid={false} />
        <Block
          pos={[-2.3, 0.31, 0.88]}
          size={[9.4, 0.03, 0.08]}
          color="#ffd166"
          mat="plastic"
          solid={false}
          cast={false}
        />
        <group position={[s.salida > 0 ? -2.3 + (2.5 - s.salida) * 5 : -2.3, 0, -1.2]}>
          <P.Bus pos={[0, 0, 0]} rot={Math.PI / 2} scale={0.75} color={b?.color ?? '#ffd23f'} solid={false} />
        </group>
        {s.buses.slice(s.turno + 1, s.turno + 4).map((x, i) => (
          <Label
            key={i}
            pos={[-5.6 + i * 2.6, 1.1, 2.5]}
            text={`${i ? '' : 'Después: '}${x.nombre.replace('Bus de ', '')}`}
            h={0.24}
            bg={x.color}
          />
        ))}
        <P.Pine pos={[-7.6, 0, -4.6]} scale={1.2} solid={false} />
        <P.Pine pos={[3.4, 0, -4.8]} scale={1.1} solid={false} />
      </Taller>
    );
  },
});
export const Anden = motor.Escena;
export const guia = motor.guia;
