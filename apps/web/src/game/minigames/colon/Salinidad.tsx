import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { columna, controles, cursor, duracion, Mesa, metas, mover, Puntero, wx, wz, xCol } from './comun';

/** Zonas de la laguna, de la boca hacia adentro: cada especie pide su propia mezcla. */
const ZONAS = [
  { especie: 'Camarón', medio: 0.68, mar: 1.25 },
  { especie: 'Róbalo', medio: 0.45, mar: 1 },
  { especie: 'Sábalo', medio: 0.2, mar: 0.8 },
];
const REVISION = 4;
type Estado = ReturnType<typeof cursor> & {
  abre: [number, number, number];
  sal: [number, number, number];
  reloj: number;
  revision: number;
  aptas: number;
  fallas: number;
  homogenea: number;
  ajustes: number;
  espera: number;
  aviso: string;
};
type Sesion = Motor<{ banda: number; periodo: number; loco: boolean }, Estado>;
/** Marea de 0.62 a 1: cuánta agua salada empuja la bahía hacia la laguna. */
const marea = (m: Sesion) => 0.81 + 0.19 * Math.sin((m.datos.reloj / m.parametros.periodo) * Math.PI * 2);
/** Con lluvia el río empuja agua dulce (solo en la laguna de maqueta que pidió agua dulce). */
const lluvia = (m: Sesion) => (m.parametros.loco && Math.floor(m.datos.reloj / 10) % 2 === 1 ? 0.9 : 1);
/** La compuerta trabada cambia cada 12 s y solo se mueve de a poquito. */
const trabada = (m: Sesion) => (m.parametros.loco ? Math.floor(m.datos.reloj / 12) % 3 : -1);
const apta = (m: Sesion, i: number) => Math.abs(m.datos.sal[i] - ZONAS[i].medio) <= m.parametros.banda;
const aperturaDe = (y: number) => Math.max(0, Math.min(1, (y + 1) / 2));
/** Apertura que deja a la zona `i` justo en su mezcla con la marea de ahora. */
const ideal = (m: Sesion, i: number) => Math.min(1, ZONAS[i].medio / (marea(m) * lluvia(m) * ZONAS[i].mar));

function ajustar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.35;
  s.ajustes++;
  const i = columna(s.x, 3),
    meta = aperturaDe(s.y);
  if (i === trabada(m)) {
    const paso = Math.max(-0.12, Math.min(0.12, meta - s.abre[i]));
    s.abre[i] += paso;
    s.aviso = `La compuerta de ${ZONAS[i].especie} está trabada: se mueve de a poquito`;
  } else {
    s.abre[i] = meta;
    s.aviso = `Boca de ${ZONAS[i].especie} al ${Math.round(meta * 100)} %`;
  }
}
const motor = defineMotor({
  id: 'colon.salinidad',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'lago',
  guia: {
    goal: 'A/D elegí el canal, W/S cuánto lo abrís y F. Cada especie pide su mezcla; abrir todo deja la laguna igual de salada.',
    ...controles,
  },
  etapa: (p) => ({
    banda: 0.12 - p.dif * 0.03,
    periodo: 36 - p.dif * 10,
    loco: p.tema.variante === 'la-laguna-pidio-agua-dulce',
  }),
  metas,
  duracion,
  crear: (): Estado => ({
    ...cursor(),
    // después del temporal quedaron todas abiertas: la laguna está igual de salada de punta a punta
    abre: [1, 1, 1],
    sal: [0.9, 0.9, 0.88],
    reloj: 0,
    revision: REVISION,
    aptas: 0,
    fallas: 0,
    homogenea: 0,
    ajustes: 0,
    espera: 0,
    aviso: '',
  }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.reloj += dt;
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) ajustar(m);
    const empuje = marea(m) * lluvia(m),
      todoAbierto = s.abre.every((a) => a > 0.85);
    const equilibrio = ZONAS.map((z, i) => Math.min(1, s.abre[i] * empuje * z.mar));
    const tope = Math.max(...equilibrio);
    for (let i = 0; i < 3; i++) {
      // con todas las bocas abiertas el agua se mezcla y desaparece el refugio de agua dulce
      const e = todoAbierto ? tope : equilibrio[i];
      s.sal[i] += (e - s.sal[i]) * Math.min(1, dt * 0.6);
    }
    s.revision -= dt;
    if (s.revision <= 0) {
      s.revision += REVISION;
      if ([0, 1, 2].every((i) => apta(m, i))) {
        s.aptas++;
        m.sumar(60);
      } else {
        s.fallas++;
        if (todoAbierto) s.homogenea++;
        m.sumar(-15);
      }
    }
    const t = trabada(m);
    m.objetivo = `Revisión en ${Math.ceil(s.revision)} s · Canal de ${ZONAS[columna(s.x, 3)].especie} · abrir al ${Math.round(aperturaDe(s.y) * 100)} %`;
    m.lineas = [
      ZONAS.map(
        (z, i) => `${z.especie} ${s.sal[i].toFixed(2)} (pide ${z.medio.toFixed(2)}) ${apta(m, i) ? '✅' : '⚠️'}`,
      ).join(' · '),
      `Marea ${marea(m) > 0.81 ? 'subiendo agua salada' : 'bajando'}${lluvia(m) < 1 ? ' · 🌧️ lluvia' : ''}${t >= 0 ? ` · trabada: ${ZONAS[t].especie}` : ''}${todoAbierto ? ' · ¡Todo abierto: la laguna se volvió una sola!' : ''} · ${s.aviso}`,
    ];
    m.stats = { x: s.x, y: s.y, aptas: s.aptas, fallas: s.fallas, homogenea: s.homogenea, ajustes: s.ajustes };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    let peor = -1,
      error = 0.03;
    for (let i = 0; i < 3; i++) {
      const e = Math.abs(ideal(m, i) - s.abre[i]);
      if (e > error) {
        peor = i;
        error = e;
      }
    }
    if (peor < 0) return;
    s.x = xCol(peor, 3);
    s.y = ideal(m, peor) * 2 - 1;
    ajustar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      t = trabada(m),
      dulce = lluvia(m) < 1;
    const tono = (v: number) => {
      const k = Math.round(Math.max(0, Math.min(1, v)) * 8) / 8;
      const mezcla = (a: number, b: number) =>
        Math.round(a + (b - a) * k)
          .toString(16)
          .padStart(2, '0');
      return `#${mezcla(0x8f, 0x1f)}${mezcla(0xc9, 0x6f)}${mezcla(0x9a, 0xb5)}`;
    };
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Boca de Guaimoreto'} · Mezcla para tres especies`}>
        <Block pos={[wx(0), 0.76, wz(0.92)]} size={[9.4, 0.08, 0.9]} color="#1f6fb5" mat="water" solid={false} />
        <Label pos={[wx(0.85), 1.4, wz(0.92)]} text="Bahía de Trujillo" h={0.32} />
        {ZONAS.map((z, i) => {
          const x = wx(xCol(i, 3));
          return (
            <group key={z.especie}>
              <Block
                pos={[x, 0.77, wz(0.62)]}
                size={[0.5, 0.06, 1.2]}
                color={tono(s.sal[i])}
                mat="water"
                solid={false}
              />
              <Block
                pos={[x, 0.95 + (1 - s.abre[i]) * 0.35, wz(0.55)]}
                size={[0.9, 0.5, 0.12]}
                color={i === t ? '#b5651d' : '#6d6f73'}
                mat="metal"
                solid={false}
              />
              <Block
                pos={[x, 0.77, wz(-0.25)]}
                size={[2.6, 0.06, 3.4]}
                color={tono(s.sal[i])}
                mat="water"
                solid={false}
              />
              <Block
                pos={[x - 1.05, 0.8 + s.sal[i], wz(-0.25)]}
                size={[0.14, s.sal[i] * 2, 0.14]}
                color="#f0e2a8"
                solid={false}
              />
              <Block
                pos={[x - 1.05, 0.8 + z.medio * 2, wz(-0.25)]}
                size={[0.34, m.parametros.banda * 4, 0.06]}
                color="#7fe08a"
                mat="neon"
                solid={false}
              />
              {apta(m, i) && <Block pos={[x, 0.82, wz(0.32)]} size={[2.2, 0.04, 0.12]} color="#ffffff" solid={false} />}
              <Label pos={[x, 2.2, wz(-0.25)]} text={`${z.especie} ${apta(m, i) ? '😊' : '😣'}`} h={0.36} />
            </group>
          );
        })}
        <Block pos={[wx(0), 0.77, wz(-0.92)]} size={[9.4, 0.06, 0.5]} color="#8fc99a" mat="water" solid={false} />
        <Label pos={[wx(-0.8), 1.3, wz(-0.92)]} text="Río" h={0.32} />
        {m.parametros.loco && (
          <group position={[wx(0.95), 0.7, wz(-0.6)]}>
            <Ball pos={[0, 0.5, 0]} r={0.45} color={tono((s.sal[0] + s.sal[1] + s.sal[2]) / 3)} mat="water" />
            <Cyl pos={[0, 1.15, 0]} r={0.55} rTop={0.12} h={0.5} color={dulce ? '#4a90d9' : '#f2c14e'} solid={false} />
            <Block pos={[0, 0.42, 0.42]} size={[0.6, 0.08, 0.06]} color="#ffffff" solid={false} />
            <Plate pos={[0, 2, 0]} text={dulce ? '🌧️ ¡Sombrero de lluvia!' : '🎩 La laguna te mira'} h={0.3} />
          </group>
        )}
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Salinidad = motor.Escena;
export const guia = motor.guia;
