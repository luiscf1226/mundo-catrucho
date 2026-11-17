import { audio } from '../../../core/audio';
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover, Puntero } from './comun';

const PUEBLOS = ['Comitiva de arriba', 'Comitiva de abajo'];
const COLORES = ['#c0392b', '#2a6f97'];
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  /** hospitalidad de cada comitiva en esta visita (cuántas veces ofreció) */
  hosp: [number, number];
  provisiones: [number, number];
  /** quién ofreció el saludo que espera respuesta (−1 = nadie) */
  ofrecio: number;
  ventana: number;
  parada: number;
  paradas: number;
  /** lo que le falta a cada comitiva para llegar a la parada (camino angosto = más lento) */
  camino: [number, number];
  visitas: number;
  suspendidos: number;
  desiguales: number;
  saludos: number;
  espera: number;
};
type Sesion = Motor<
  { paradas: number; ventana: number; angosto: boolean; provisiones: boolean; semilla: number },
  Estado
>;

const lado = (s: Estado) => (s.x < 0 ? 0 : 1);
function nuevaVisita(s: Estado, p: Sesion['parametros']) {
  s.hosp = [0, 0];
  // con provisiones compartidas, anfitrión y visitante se invierten en cada visita: ofrece quien tiene
  s.provisiones = p.provisiones ? (s.visitas % 2 ? [1, 0] : [0, 1]) : [1, 1];
  s.ofrecio = -1;
  s.parada = 0;
  s.paradas = p.paradas;
  s.camino = [0, 0];
}
function suspender(m: Sesion, motivo: string) {
  const s = m.datos;
  s.suspendidos++;
  m.sumar(-40);
  useGame.getState().toast(motivo, '🥁');
  nuevaVisita(s, m.parametros);
}
function actuar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.8;
  const g = lado(s),
    otro = 1 - g;
  if (s.camino[g] > 0) return suspender(m, 'Esa comitiva todavía viene en camino: se adelantó.');
  if (s.ofrecio < 0) {
    // ofrecer fuera de turno también es adelantarse: la hospitalidad debe quedar pareja y cuesta una provisión
    if (m.parametros.provisiones && s.provisiones[g] <= 0) {
      s.desiguales++;
      return suspender(m, 'Esa comitiva no trae provisiones: le toca recibir.');
    }
    if (s.hosp[g] > s.hosp[otro]) {
      s.desiguales++;
      return suspender(m, 'Le tocaba ofrecer a la otra comitiva: se suspende el encuentro.');
    }
    s.ofrecio = g;
    s.hosp[g]++;
    s.provisiones[g]--;
    s.ventana = m.parametros.ventana;
    m.sumar(10);
    audio.drum(160, 0.12, 0.2);
    return;
  }
  // responder: lo hace la otra; si ofrece la misma otra vez, se adelantó sin respuesta
  if (g === s.ofrecio) return suspender(m, '¡Saludaste dos veces sin esperar respuesta! Se suspende el encuentro.');
  s.provisiones[g]++;
  s.ofrecio = -1;
  s.saludos++;
  m.sumar(20);
  audio.drum(220, 0.12, 0.2);
  s.parada++;
  if (s.parada >= s.paradas) {
    if (s.hosp[0] === s.hosp[1]) {
      s.visitas++;
      m.sumar(60);
      useGame.getState().toast('Visita completa, con hospitalidad pareja.', '🥁');
    } else {
      s.desiguales++;
      m.sumar(-20);
    }
    nuevaVisita(s, m.parametros);
    return;
  }
  // camino a la siguiente parada: el angosto tarda más
  s.camino = m.parametros.angosto ? [1.6, 0.4] : [0.4, 0.4];
}
const motor = defineMotor({
  id: 'lapaz.reciprocidad',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'A elegí la comitiva de arriba y D la de abajo; F saluda. Una ofrece y la otra responde, por turnos y parejo. Esperá a que llegue cada una.',
    ...controles(),
  },
  etapa: (p) => ({
    paradas: 4 + 2 * Math.round(p.dif),
    ventana: 5 - p.dif * 2,
    angosto: p.tema.variante === 'dos-pueblos-se-saludan',
    provisiones: p.tema.variante === 'la-visita-devuelve-la-visita',
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      hosp: [0, 0],
      provisiones: [1, 1],
      ofrecio: -1,
      ventana: 0,
      parada: 0,
      paradas: p.paradas,
      camino: [0, 0],
      visitas: 0,
      suspendidos: 0,
      desiguales: 0,
      saludos: 0,
      espera: 0,
    };
    nuevaVisita(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.camino = [Math.max(0, s.camino[0] - dt), Math.max(0, s.camino[1] - dt)];
    if (s.ofrecio >= 0) {
      s.ventana -= dt;
      if (s.ventana <= 0) suspender(m, 'El saludo se quedó sin respuesta.');
    }
    if (input.take('fire')) actuar(m);
    m.objetivo =
      s.ofrecio < 0
        ? `Parada ${s.parada + 1} de ${s.paradas}: que ofrezca la que va debiendo`
        : `${PUEBLOS[1 - s.ofrecio]}: respondé el saludo (${Math.ceil(s.ventana)} s)`;
    m.lineas = [
      `Hospitalidad ${s.hosp[0]} · ${s.hosp[1]}${m.parametros.provisiones ? ` · Provisiones ${s.provisiones[0]} · ${s.provisiones[1]}` : ''}`,
      `Visitas ${s.visitas} · Saludos ${s.saludos} · Suspendidos ${s.suspendidos}`,
    ];
    m.stats = { x: s.x, y: s.y, visitas: s.visitas, saludos: s.saludos, suspendidos: s.suspendidos };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    const g =
      s.ofrecio >= 0
        ? 1 - s.ofrecio
        : s.hosp[0] !== s.hosp[1]
          ? s.hosp[0] < s.hosp[1]
            ? 0
            : 1
          : s.provisiones[0] > 0
            ? 0
            : 1;
    s.x = g ? 0.5 : -0.5;
    if (s.camino[g] <= 0) actuar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      avance = s.parada / s.paradas;
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Saludo entre comitivas'} · Visita y devolución`}>
        <Block
          pos={[-1, 0.73, -1]}
          size={[9, 0.04, m.parametros.angosto ? 0.5 : 1.2]}
          color="#b08a5a"
          mat="dirt"
          solid={false}
        />
        <Block pos={[-1, 0.73, 1.4]} size={[9, 0.04, 1.2]} color="#b08a5a" mat="dirt" solid={false} />
        <Cyl pos={[3.4, 1.4, 0.2]} r={0.08} h={1.4} color="#8a6a45" mat="wood" solid={false} />
        <Plate pos={[3.4, 2.4, 0.2]} text="Plaza del encuentro" h={0.24} />
        {[0, 1].map((g) => {
          const z = g ? 1.4 : -1,
            x = -5 + avance * 8 + (s.camino[g] > 0 ? -s.camino[g] * 1.2 : 0),
            activa = lado(s) === g;
          return (
            <group key={g} position={[x, 0.75, z]}>
              {[-0.35, 0, 0.35].map((dz, k) => (
                <group key={k} position={[k * -0.4, 0, dz]}>
                  <Cyl pos={[0, 0.3, 0]} r={0.14} h={0.6} color={COLORES[g]} mat="cloth" solid={false} />
                  <Ball pos={[0, 0.72, 0]} r={0.13} color="#c68b59" />
                </group>
              ))}
              {s.ofrecio === g && <Label pos={[0, 1.6, 0]} text="🤝 ¡Saludos!" h={0.28} />}
              {activa && <Ball pos={[0, 1.2, 0]} r={0.1} color="#ffe38a" mat="neon" />}
              <Label pos={[0.4, 1.15, 0]} text={`${'★'.repeat(s.hosp[g])}`} h={0.22} />
            </group>
          );
        })}
        <Label pos={[-1, 3.2, -2.6]} text={`Hospitalidad ${s.hosp[0]} · ${s.hosp[1]}`} h={0.36} />
        <Puntero x={-0.95} y={lado(s) ? -0.45 : 0.3} color={COLORES[lado(s)]} />
      </Mesa>
    );
  },
});
export const Reciprocidad = motor.Escena;
export const guia = motor.guia;
