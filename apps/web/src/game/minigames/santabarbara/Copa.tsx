import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { aviso, casilla, controles, cursor, duracion, ejeDe, entre, Mesa, metas, mover, revolver } from './comun';

const OPCIONES = 6;
interface Vuelta {
  radio: number;
  cruces: number;
  ala: boolean;
  /** en la variante de reparar: cuántos cruces trae la vuelta demasiado tupida */
  trae: number;
  hecha: 'bien' | 'mal' | null;
}
type Estado = ReturnType<typeof cursor> & {
  vueltas: Vuelta[];
  actual: number;
  densidad: number;
  opciones: number[];
  espera: number;
  mirando: number;
  planas: number;
  arrugas: number;
  errores: number;
  sombreros: number;
  intentos: number;
  azar: () => number;
};
type Sesion = Motor<{ copa: number; ala: number; paso: number; reparar: boolean; seed: number }, Estado>;
/** Un sombrero nuevo: vueltas de copa con el mismo radio y vueltas de ala que se abren. */
function sombrero(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  s.densidad = entre(s.azar, 2, 4);
  const r0 = entre(s.azar, 3, 4);
  s.vueltas = [];
  for (let i = 0; i < p.copa; i++)
    s.vueltas.push({ radio: r0, cruces: s.densidad * r0, ala: false, trae: 0, hecha: null });
  let r = r0;
  for (let i = 0; i < p.ala; i++) {
    r += entre(s.azar, 1, p.paso);
    const cruces = s.densidad * r;
    // la vuelta de práctica viene con la densidad equivocada: hay que retirar cruces
    const trae = p.reparar ? cruces + entre(s.azar, 1, 3) * 2 : 0;
    s.vueltas.push({ radio: r, cruces, ala: true, trae, hecha: null });
  }
  s.actual = 0;
  opciones(m);
}
function opciones(m: Sesion) {
  const s = m.datos,
    v = s.vueltas[s.actual],
    antes = s.vueltas[s.actual - 1];
  const c = new Set<number>([v.cruces]);
  // las trampas: la misma cuenta de antes (canasta), lo que trae la vuelta tupida y vecinos cercanos
  if (antes) c.add(antes.cruces);
  if (v.trae) c.add(v.trae);
  for (const d of [s.densidad, -s.densidad, 2, -2, 1, -1, 4, -4, 6]) if (v.cruces + d > 2) c.add(v.cruces + d);
  s.opciones = revolver([...c].slice(0, OPCIONES), s.azar);
  s.mirando = 0;
}
function trenzar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.intentos++;
  s.espera = 0.6;
  const v = s.vueltas[s.actual],
    antes = s.vueltas[s.actual - 1],
    n = s.opciones[casilla(s.x, OPCIONES)];
  if (n === v.cruces) {
    v.hecha = 'bien';
    s.planas++;
    m.sumar(35);
    s.actual++;
    if (s.actual >= s.vueltas.length) {
      s.sombreros++;
      aviso('¡Sombrero plano en el ala!', '👒');
      sombrero(m);
    } else opciones(m);
    return;
  }
  v.hecha = 'mal';
  m.sumar(-25);
  if (antes && n === antes.cruces && v.radio > antes.radio) {
    s.arrugas++;
    aviso('Misma cuenta con más radio: te sale canasta en vez de ala.', '🧺');
  } else {
    s.errores++;
    aviso(n > v.cruces ? 'Muy tupido: el ala se ondula.' : 'Muy ralo: el tejido se abre.', '🌾');
  }
}
const motor = defineMotor({
  id: 'santabarbara.junco',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'En la copa el radio no cambia y los cruces tampoco. En el ala el radio crece: los cruces tienen que crecer igual (cruces ÷ radio siempre lo mismo). Elegí la cuenta y F trenza la vuelta.',
    ...controles(),
  },
  etapa: (p) => ({
    copa: p.dif < 0.5 ? 2 : 1,
    ala: 3 + Math.round(p.dif * 2),
    paso: p.dif < 0.4 ? 1 : 2,
    reparar: p.tema.variante === 'el-sombrero-tapo-la-mesa',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    vueltas: [],
    actual: 0,
    densidad: 3,
    opciones: [],
    espera: 0,
    mirando: 0,
    planas: 0,
    arrugas: 0,
    errores: 0,
    sombreros: 0,
    intentos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.vueltas.length) sombrero(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    if (input.take('fire')) trenzar(m);
    const v = s.vueltas[s.actual],
      antes = s.vueltas[s.actual - 1];
    m.objetivo = v.ala ? 'Ala: abrí los cruces con el radio' : 'Copa: mismo radio, mismos cruces';
    m.lineas = [
      `Vuelta ${s.actual + 1}/${s.vueltas.length} · radio ${v.radio}${antes ? ` · antes ${antes.cruces} cruces en radio ${antes.radio}` : ''}${v.trae ? ` · trae ${v.trae}` : ''}`,
      `Trenzás ${s.opciones[casilla(s.x, OPCIONES)]} · Planas ${s.planas} · Canastas ${s.arrugas} · Errores ${s.errores}`,
    ];
    m.stats = {
      x: s.x,
      planas: s.planas,
      arrugas: s.arrugas,
      errores: s.errores,
      sombreros: s.sombreros,
      intentos: s.intentos,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.mirando < 1.6 || !s.vueltas.length) return;
    s.auto = true;
    s.x = ejeDe(s.opciones.indexOf(s.vueltas[s.actual].cruces), OPCIONES);
    trenzar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = casilla(s.x, OPCIONES),
      reparar = m.parametros.reparar,
      // el sombrero de práctica crece y crece hasta darle sombra a toda la mesa
      maximo = Math.max(1, ...s.vueltas.map((w) => w.radio)),
      escala = Math.min(reparar ? 0.2 + 0.04 * s.planas : 0.24, (reparar ? 5.2 : 2.6) / maximo);
    const v = s.vueltas[s.actual];
    return (
      <Mesa titulo={reparar ? 'Ilama · el sombrero tapó la mesa' : 'Ilama · de copa a ala'}>
        <group position={[-2.6, 0.72, -0.9]}>
          {s.vueltas.map((w, i) => (
            <Cyl
              key={i}
              pos={[0, w.ala ? 0.01 + i * 0.008 : 0.25 + i * 0.22, 0]}
              r={w.radio * escala}
              h={w.ala ? 0.06 : 0.22}
              color={
                i === s.actual ? '#f2e6b8' : w.hecha === 'bien' ? '#d8c27a' : w.hecha === 'mal' ? '#b5523b' : '#8a7f5a'
              }
              mat="cloth"
              solid={false}
              sides={20}
            />
          ))}
          {v &&
            Array.from({ length: Math.min(40, s.opciones[k] ?? 0) }, (_, i) => {
              const a = (i / Math.max(1, s.opciones[k])) * Math.PI * 2,
                r = v.radio * escala;
              return (
                <Ball key={i} pos={[Math.cos(a) * r, v.ala ? 0.12 : 0.5, Math.sin(a) * r]} r={0.06} color="#5a3d26" />
              );
            })}
        </group>
        <Label
          pos={[-2.6, 2.6, -0.9]}
          text={v ? `Radio ${v.radio}${v.trae ? ` · trae ${v.trae}` : ''}` : ''}
          h={0.32}
        />
        {s.opciones.map((n, i) => {
          const x = -1 + ejeDe(i, OPCIONES) * 4.2;
          return (
            <group key={i}>
              <Block
                pos={[x, 0.78, 2.4]}
                size={[1.1, 0.08, 0.9]}
                color={i === k ? '#ffd166' : '#e9e4d8'}
                mat="wood"
                solid={false}
              />
              <Label pos={[x, 1.15, 2.4]} text={`${n}`} h={0.36} />
            </group>
          );
        })}
        <Label
          pos={[2.2, 2.2, -1.8]}
          text={
            s.vueltas[s.actual - 1]
              ? `Antes: ${s.vueltas[s.actual - 1].cruces} cruces · radio ${s.vueltas[s.actual - 1].radio}`
              : `Copa: ${v?.cruces ?? 0} cruces · radio ${v?.radio ?? 0}`
          }
          h={0.3}
        />
      </Mesa>
    );
  },
});
export const Copa = motor.Escena;
export const guia = motor.guia;
