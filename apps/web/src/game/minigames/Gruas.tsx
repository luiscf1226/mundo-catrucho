import { input } from '../../core/input';
import { Ball, Block, Label } from '../kit';
import { controles, cursor, Mesa, mover } from './cortes/comun';
import { defineMotor, type Motor } from './kit';

type Estado = ReturnType<typeof cursor> & {
  cola: number[];
  cargas: { riel: number; t: number; confeti: boolean }[];
  manifiesto: number;
  entregas: number;
  choques: number;
  bloqueo: number;
  mensaje: string;
  /** contenedores despachados (en el modo loco cada tercero viene con confeti) */
  despachos: number;
  confetis: number;
  estornudo: number;
};
type Sesion = Motor<{ velocidad: number; loco: boolean }, Estado>;
/** bodega invertida: el manifiesto del modo loco no alterna, sale en este orden */
const INVERTIDA = [1, 1, 0, 1, 0, 0];
const manifiestoDe = (m: Sesion, entregas: number) =>
  m.parametros.loco ? INVERTIDA[entregas % INVERTIDA.length] : entregas % 2;
function programar(m: Sesion, riel: number) {
  const s = m.datos;
  if (s.cola.length < 4) s.cola.push(riel);
}
const motor = defineMotor({
  id: 'cortes.gruas',
  modos: { duo: { tipo: 'apoyo', cada: 4 }, abierto: { tipo: 'objetivo-comun', bots: 3, cada: 6 } },
  guia: {
    goal: 'Programá riel 1 o 2 según el manifiesto. Esperá a que la otra grúa libere el cruce. En el modo loco la bodega viene al revés y el contenedor de confeti se infla y ocupa más cruce.',
    ...controles,
  },
  etapa: (p) => ({ velocidad: 0.32 + p.dif * 0.18, loco: p.tema.loco === true }),
  metas: (p) => [120 + Math.round(p.dif * 80), 300, 500],
  duracion: (p) => 75 + p.dif * 20,
  crear: (p): Estado => ({
    ...cursor(),
    cola: [],
    cargas: [],
    manifiesto: p.loco ? INVERTIDA[0] : 0,
    entregas: 0,
    choques: 0,
    bloqueo: 0,
    mensaje: 'Izá en orden. Izquierda riel 1; derecha riel 2.',
    despachos: 0,
    confetis: 0,
    estornudo: 0,
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    mover(s, dt);
    if (input.take('fire')) programar(m, s.x < 0 ? 0 : 1);
    s.bloqueo = Math.max(0, s.bloqueo - dt);
    if (s.cola.length && s.bloqueo === 0) {
      const r = s.cola[0];
      if (!s.cargas.some((c) => c.riel === r)) {
        s.cola.shift();
        s.cargas.push({ riel: r, t: 0, confeti: m.parametros.loco && s.despachos % 3 === 2 });
        s.despachos++;
      }
    }
    s.estornudo = Math.max(0, s.estornudo - dt);
    // el contenedor de confeti se infla al abrirse: va más lento y ocupa más cruce
    for (const c of s.cargas) c.t += dt * m.parametros.velocidad * (c.confeti ? 0.75 : 1);
    const enCruce = (c: { t: number; confeti: boolean }) =>
      c.confeti ? c.t > 0.25 && c.t < 0.8 : c.t > 0.35 && c.t < 0.7;
    if (s.cargas.length === 2 && s.cargas.every(enCruce)) {
      s.cargas = [];
      s.cola = [];
      s.choques++;
      m.sumar(-40);
      s.bloqueo = 2;
      s.mensaje = '¡Cruce ocupado! Reprogramá sin cruzar plumas.';
    }
    for (const c of s.cargas.filter((c) => c.t >= 1)) {
      if (c.riel === s.manifiesto) {
        m.sumar(40);
        s.entregas++;
        s.manifiesto = manifiestoDe(m, s.entregas);
        s.mensaje = c.confeti
          ? '¡Achís! El contenedor estornudó confeti, pero llegó bien.'
          : 'Carga bien estibada. Revisá el siguiente manifiesto.';
        if (c.confeti) {
          s.confetis++;
          s.estornudo = 1.2;
        }
      } else {
        m.sumar(-30);
        s.bloqueo = 3;
        s.mensaje = 'Bodega bloqueada por carga fuera de orden.';
      }
    }
    s.cargas = s.cargas.filter((c) => c.t < 1);
    m.objetivo = `Manifiesto: riel ${s.manifiesto + 1} · ${s.mensaje}`;
    m.lineas = [`Cola ${s.cola.map((r) => r + 1).join(' → ') || 'vacía'} · Bloqueo ${s.bloqueo.toFixed(1)} s`];
    m.stats = {
      entregas: s.entregas,
      choques: s.choques,
      cola: s.cola.length,
      activas: s.cargas.length,
      confetis: s.confetis,
    };
  },
  bot: (m, _dt) => {
    const s = m.datos;
    if (!s.cola.length && !s.cargas.length && s.bloqueo === 0) programar(m, s.manifiesto);
  },
  Escena: ({ motor: m }) => (
    <Mesa
      titulo={m.parametros.loco ? 'Bodega invertida' : 'Cruce de grúas portuarias'}
      texto={`Manifiesto: riel ${m.datos.manifiesto + 1} · A/D elegí · F programá`}
    >
      {[0, 1].map((r) => (
        <group key={r}>
          <Block
            pos={[-1, 0.85, 0]}
            size={r ? [0.2, 0.1, 7] : [8, 0.1, 0.2]}
            color="#b7c5d0"
            mat="metal"
            solid={false}
          />
          <Block pos={[r ? -1 : -4, 2, r ? -3 : 0]} size={[0.3, 3, 0.3]} color="#eebc30" mat="metal" solid={false} />
          <Block
            pos={[r ? -1 : -1, 3.45, r ? 0 : 0]}
            size={r ? [0.25, 0.25, 6.5] : [7, 0.25, 0.25]}
            color="#eebc30"
            mat="metal"
            solid={false}
          />
          <Block
            pos={[r ? -1 : 2, 2.5, r ? 3 : 0]}
            size={[0.045, 1.8, 0.045]}
            color="#313e4b"
            mat="metal"
            solid={false}
          />
          <Block
            pos={[r ? -1 : 2, 1.6, r ? 3 : 0]}
            size={[0.65, 0.13, 0.65]}
            color="#eebc30"
            mat="metal"
            solid={false}
          />
          <Block
            pos={[r ? -1 : -4, 1.5, r ? -3 : 0]}
            size={[0.8, 0.8, 0.8]}
            color="#3a7184"
            mat="glass"
            solid={false}
          />
          <Label pos={[r ? -1 : -4, 4, r ? -3 : 0]} text={`Riel ${r + 1}`} h={0.4} />
        </group>
      ))}
      {m.datos.cargas.map((c) => (
        <group key={c.riel}>
          <Block
            pos={[c.riel ? -1 : -5 + c.t * 8, 1.5, c.riel ? -4 + c.t * 8 : 0]}
            size={c.confeti ? [1.6, 1.1, 1.4] : [1.2, 0.8, 1]}
            mat="metal"
            color={c.confeti ? '#e46fb0' : c.riel ? '#42ae9f' : '#f29a4e'}
            solid={false}
          />
          {c.confeti && (
            <Label pos={[c.riel ? -1 : -5 + c.t * 8, 2.4, c.riel ? -4 + c.t * 8 : 0]} text="🎉 confeti" h={0.3} />
          )}
        </group>
      ))}
      {m.datos.estornudo > 0 &&
        [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Ball
            key={i}
            pos={[
              2 + Math.cos(i * 0.8) * (1.4 - m.datos.estornudo),
              1.6 + (1.2 - m.datos.estornudo) * 1.5 + (i % 3) * 0.2,
              Math.sin(i * 0.8) * (1.4 - m.datos.estornudo),
            ]}
            r={0.09}
            color={['#ff5d8f', '#ffd23c', '#4cc3ff', '#7be06a'][i % 4]}
            mat="neon"
          />
        ))}
      <Label pos={[-1, 1, 3.8]} text={m.datos.bloqueo ? 'BODEGA BLOQUEADA' : 'CRUCE COMPARTIDO'} h={0.38} />
    </Mesa>
  ),
});
export const Gruas = motor.Escena;
export const guia = motor.guia;
