import { input } from '../../core/input';
import { Ball, Block, Cyl, Label } from '../kit';
import { controles, cursor, Mesa, mover } from './cortes/comun';
import { defineMotor, type Motor } from './kit';
import { Tajadas } from './kit/Figuras';

type Estado = ReturnType<typeof cursor> & {
  capas: number[];
  salsa: number;
  espera: number;
  buenas: number;
  derrames: number;
  mensaje: string;
  /** «¡Se vino el aderezo!»: el río de salsa baja por un carril y las tajadas lo desvían */
  rio: { x: number; t: number; n: number };
  diques: number[];
  desviados: number;
};
type Sesion = Motor<{ margen: number; viento: number; nombre: string; loco: boolean; bajada: number }, Estado>;
const CARRILES = [-0.7, 0.25, -0.25, 0.7, 0, -0.45, 0.45];
function dique(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.diques.length >= 2) return;
  s.diques.push(s.x);
  s.mensaje = s.diques.length === 1 ? 'Tajada puesta. Te queda una para la siguiente.' : 'Ya no te quedan tajadas.';
}
function crecida(m: Sesion, dt: number) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.rio.t += dt / m.parametros.bajada;
  if (s.rio.t < 1) return;
  const desvio = s.diques.some((d) => Math.abs(d - s.rio.x) < 0.3);
  m.sumar(desvio ? 40 : -25);
  if (desvio) s.desviados++;
  else s.derrames++;
  s.mensaje = desvio
    ? '¡Desviaste el aderezo! El plato sigue servido.'
    : 'La salsa llegó al plato. Poné la tajada en su carril.';
  s.rio = { x: CARRILES[(s.rio.n + 1) % CARRILES.length], t: 0, n: s.rio.n + 1 };
  s.diques = [];
  s.espera = 0.4;
}
function servir(m: Sesion) {
  const s = m.datos;
  if (m.parametros.loco) return dique(m);
  if (s.espera > 0) return;
  if (s.capas.length < 3) {
    s.capas.push(s.x * 1.8);
    s.mensaje = 'Otra capa. Centrá el peso antes de bañar.';
  } else if (s.salsa < 1) s.mensaje = 'Incliná el envase hacia abajo (S) para verter salsa.';
}
function centro(m: Sesion) {
  const s = m.datos;
  return (s.capas.reduce((a, b) => a + b, 0) + s.salsa * s.x * 2) / (s.capas.length + s.salsa || 1);
}
function resolver(m: Sesion, bien: boolean) {
  const s = m.datos;
  m.sumar(bien ? 50 : -25);
  bien ? s.buenas++ : s.derrames++;
  s.capas = [];
  s.salsa = 0;
  s.espera = 1;
  s.mensaje = bien ? '¡Plato firme! Prepará otro.' : 'Cedió el papel. Repartí el peso.';
}
const motor = defineMotor({
  id: 'cortes.chuco',
  modos: { duo: { tipo: 'apoyo', cada: 4 }, abierto: { tipo: 'objetivo-comun', bots: 3, cada: 6 } },
  guia: {
    goal: 'Apilá tres capas centradas y bañalas sin volcar el papel. En el modo loco, F pone tajadas para desviar el río de aderezo.',
    ...controles,
  },
  etapa: (p) => ({
    margen: 0.85 - p.dif * 0.4,
    viento: 0.1 + p.dif * 0.3,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Pollo chuco en equilibrio',
    loco: p.tema.loco === true,
    bajada: 2.6 - p.dif * 0.4,
  }),
  metas: (p) => [100 + Math.round(p.dif * 100), 300, 500],
  duracion: (p) => 70 + p.dif * 20,
  crear: (p): Estado => ({
    ...cursor(),
    capas: p.loco ? [0, 0, 0] : [],
    salsa: 0,
    espera: 0,
    buenas: 0,
    derrames: 0,
    mensaje: p.loco
      ? 'El plato ya está servido. F pone una tajada donde baja la salsa.'
      : 'F para apilar tajada, pollo y tajada.',
    rio: { x: CARRILES[0], t: 0, n: 0 },
    diques: [],
    desviados: 0,
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) servir(m);
    if (m.parametros.loco) {
      crecida(m, dt);
      m.objetivo = s.mensaje;
      m.lineas = [
        `Salsa ${Math.round(s.rio.t * 100)}% del camino · Tajadas ${2 - s.diques.length}/2`,
        `Desviados ${s.desviados} · Derrames ${s.derrames} · A/D apuntá · F poné tajada`,
      ];
      m.stats = { desviados: s.desviados, derrames: s.derrames, diques: s.diques.length, x: s.x, capas: 3 };
      return;
    }
    if (s.capas.length === 3) {
      s.salsa += Math.max(0, s.y) * dt * 0.65;
      const peso = centro(m) + Math.sin(m.tiempo * 2) * m.parametros.viento * s.salsa;
      if (Math.abs(peso) > m.parametros.margen / (1 + s.salsa * 0.3)) resolver(m, false);
      else if (s.salsa >= 1.5) resolver(m, true);
    }
    m.objetivo = s.mensaje;
    m.lineas = [
      `Capas ${s.capas.length}/3 · Salsa ${Math.round(s.salsa * 67)}%`,
      `Centro ${centro(m).toFixed(2)} · F apilar · S verter · A/D equilibrar`,
    ];
    m.stats = { buenas: s.buenas, derrames: s.derrames, capas: s.capas.length, salsa: s.salsa };
  },
  bot: (m, _dt) => {
    const s = m.datos;
    s.auto = true;
    if (m.parametros.loco) {
      s.x = s.rio.x;
      if (!s.diques.length && s.rio.t > 0.2) dique(m);
      return;
    }
    s.y = s.capas.length === 3 ? 0.8 : 0;
    // como el jugador con A/D: corre el envase contra el viento para que el centro de masa quede en medio
    const capas = s.capas.reduce((a, b) => a + b, 0),
      viento = Math.sin(m.tiempo * 2) * m.parametros.viento * s.salsa;
    s.x =
      s.capas.length === 3 && s.salsa > 0.05
        ? Math.max(-1, Math.min(1, (-viento * (3 + s.salsa) - capas) / (2 * s.salsa)))
        : 0;
    if (s.capas.length < 3) servir(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo={m.parametros.nombre} texto="F apilá · A/D repartí peso · S incliná la salsa">
      <Cyl pos={[-1, 0.85, 0]} r={3} h={0.12} mat="cloth" color="#fff0ca" solid={false} />
      {m.datos.capas.map((x, i) => (
        <group key={i} position={[-1 + x, 1.1 + i * 0.45, 0]}>
          <Tajadas pollo={i === 1} />
        </group>
      ))}
      <Ball pos={[-1 + (m.parametros.loco ? m.datos.x * 2 : centro(m)), 1.5, 2]} r={0.18} color="#e54428" mat="neon" />
      <Block
        pos={[-1 + m.datos.x * 2, 3.8, 0]}
        size={[0.5, 1, 0.5]}
        rot={m.datos.y}
        color="#fce3ab"
        mat="plastic"
        solid={false}
      />
      {m.parametros.loco ? (
        <>
          {/* el río de salsa baja desde atrás hacia el plato; las tajadas lo desvían */}
          <Block
            pos={[-1 + m.datos.rio.x * 2, 0.95, -3.4 + m.datos.rio.t * 1.7]}
            size={[0.5, 0.08, Math.max(0.1, m.datos.rio.t * 3.4)]}
            color="#f08a3c"
            mat="plastic"
            solid={false}
          />
          {m.datos.diques.map((d, i) => (
            <group key={i} position={[-1 + d * 2, 0.95, -1.6]} scale={0.6}>
              <Tajadas />
            </group>
          ))}
          {/* pollo de espuma navegando en una tapa de aderezo */}
          <Cyl
            pos={[2.6, 0.95 + Math.sin(m.tiempo * 2) * 0.12, -2]}
            r={0.6}
            h={0.08}
            color="#f7f1e3"
            mat="plastic"
            solid={false}
          />
          <Ball pos={[2.6, 1.25 + Math.sin(m.tiempo * 2) * 0.12, -2]} r={0.3} color="#fffdf6" mat="cloth" />
          <Label pos={[-1, 2, 3.5]} text={`¡Se vino el aderezo! · Desviados ${m.datos.desviados}`} h={0.32} />
        </>
      ) : (
        <Label pos={[-1, 2, 3.5]} text={`Papel cede con el peso · ${Math.round(m.datos.salsa * 67)}% salsa`} h={0.32} />
      )}
    </Mesa>
  ),
});
export const Chuco = motor.Escena;
export const guia = motor.guia;
