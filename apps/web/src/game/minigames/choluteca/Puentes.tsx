import { input } from '../../../core/input';
import { Block, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { columna, controles, cursor, duracion, Mesa, metas, mover, Puntero, xDe } from './comun';

type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  /** columnas del puente viejo y del puente nuevo (distintas) */
  puentes: [number, number];
  /** cuál de los dos puentes cruza el cauce en este mapa */
  conRio: 0 | 1;
  despues: boolean;
  firme: number;
  paso: 0 | 1;
  conexiones: number;
  sueltos: number;
  espera: number;
};
type Sesion = Motor<{ gps: boolean; margen: number; semilla: number }, Estado>;
const NOMBRES = ['Puente viejo', 'Sol Naciente'];

function nuevoPar(s: Estado) {
  const a = Math.floor(s.azar() * 3),
    b = (a + 1 + Math.floor(s.azar() * 2)) % 3;
  s.puentes = [a, b];
  s.conRio = s.azar() < 0.5 ? 0 : 1;
  s.despues = false;
  nuevaOrilla(s);
}
function nuevaOrilla(s: Estado) {
  s.firme = (s.azar() < 0.5 ? -1 : 1) * (0.35 + s.azar() * 0.4);
  s.paso = 0;
}
const cruce = (s: Estado) => s.puentes[s.conRio];
function conectar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.8;
  if (s.paso === 0) {
    if (columna(s.x) === cruce(s)) s.paso = 1;
    else {
      s.sueltos++;
      m.sumar(-25);
    }
    return;
  }
  if (Math.abs(s.y - s.firme) > m.parametros.margen) {
    s.sueltos++;
    m.sumar(-30);
    s.paso = 0;
    return;
  }
  s.conexiones++;
  m.sumar(60);
  if (s.despues) nuevoPar(s);
  else {
    // la crecida movió el cauce: ahora pasa bajo el otro puente; el construido sigue en su lugar
    s.despues = true;
    s.conRio = s.conRio === 0 ? 1 : 0;
    nuevaOrilla(s);
  }
}
const motor = defineMotor({
  id: 'choluteca.puentes',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'rio',
  guia: {
    goal: 'A/D elegí el puente que cruza el cauce de este mapa y F. W/S llevá el acceso a tierra firme y F.',
    ...controles,
  },
  etapa: (p) => ({
    gps: p.tema.variante === 'el-gps-se-quedo-en-otro-ano',
    margen: 0.2 - p.dif * 0.07,
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      puentes: [0, 2],
      conRio: 0,
      despues: false,
      firme: 0.5,
      paso: 0,
      conexiones: 0,
      sueltos: 0,
      espera: 0,
    };
    nuevoPar(s);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) conectar(m);
    m.objetivo = `Mapa ${s.despues ? 'después de la crecida' : 'antes de la crecida'} · ${s.paso ? 'Acceso a tierra firme' : 'Elegí el puente con río'}`;
    m.lineas = [
      s.despues
        ? 'El cauce se movió; el puente construido no. ¿Cuál cruza agua ahora?'
        : 'Fijate cuál puente tiene el río debajo',
      `${m.parametros.gps ? 'El GPS es de otro año: no le creás la foto · ' : ''}Conexiones ${s.conexiones} · Extremos sueltos ${s.sueltos}`,
    ];
    m.stats = { x: s.x, y: s.y, conexiones: s.conexiones, sueltos: s.sueltos, paso: s.paso };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    s.x = xDe(cruce(s));
    s.y = s.firme;
    conectar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      rio = cruce(s),
      seco = s.puentes[s.conRio === 0 ? 1 : 0];
    return (
      <Mesa
        titulo={`${m.partida.juego?.name ?? 'El puente y el cauce'} · ${s.despues ? 'Después' : 'Antes'} de la crecida`}
      >
        <Block pos={[xDe(rio) * 5, 0.74, 0]} size={[1.4, 0.06, 7.6]} color="#5aa9c9" mat="water" solid={false} />
        {[0, 1, 2].map((c) => (
          <Block
            key={c}
            pos={[xDe(c) * 5, 0.73, -s.firme * 3]}
            size={[1.6, 0.04, 0.9]}
            color={c === rio ? '#7fb069' : '#b59a6e'}
            mat={c === rio ? 'grass' : 'dirt'}
            solid={false}
          />
        ))}
        {s.puentes.map((c, i) => (
          <group key={i} position={[xDe(c) * 5, 0, 0]}>
            <Block
              pos={[0, 1.2, 0]}
              size={[2, 0.16, 0.8]}
              color={i ? '#c7ccd4' : '#8d8f94'}
              mat="metal"
              solid={false}
            />
            {i === 0 ? (
              [-0.9, 0.9].map((x) => (
                <Block key={x} pos={[x, 1.8, 0]} size={[0.14, 1.2, 0.14]} color="#8d8f94" mat="metal" solid={false} />
              ))
            ) : (
              <Block pos={[0, 0.95, 0]} size={[0.3, 0.5, 0.3]} color="#d8d4ca" mat="concrete" solid={false} />
            )}
            <Label pos={[0, 2.7, 0]} text={NOMBRES[i]} h={0.28} />
          </group>
        ))}
        {m.parametros.gps && <Plate pos={[xDe(seco) * 5, 3.4, 0]} text="🛰️ GPS: cruzá aquí" h={0.3} bg="#8a3b12" />}
        {s.paso === 1 && (
          <Block
            pos={[xDe(rio) * 5, 0.9, -s.y * 1.5]}
            size={[0.5, 0.12, Math.abs(s.y) * 3 + 0.4]}
            color="#4a4e55"
            mat="asphalt"
            solid={false}
          />
        )}
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Puentes = motor.Escena;
export const guia = motor.guia;
