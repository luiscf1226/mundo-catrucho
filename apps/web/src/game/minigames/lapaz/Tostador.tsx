import { audio } from '../../../core/audio';
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

const CRACK = 196,
  CARBON = 232;
const PERFILES: [string, number, number][] = [
  ['Claro', 2, 3],
  ['Medio', 4, 5],
  ['Oscuro', 6, 7],
];
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  temp: number;
  ritmo: number;
  /** ritmo de subida pedido (°/s) para este lote */
  meta: number;
  humedad: number;
  perfil: number;
  pops: number;
  proximo: number;
  seguimiento: number;
  muestras: number;
  espera: number;
  bigote: number;
  lotes: number;
  quemados: number;
  crudos: number;
  fuera: number;
};
type Sesion = Motor<{ banda: number; humedo: boolean; semilla: number }, Estado>;

/** Perillas: `x` = aire (−1 cerrado, +1 abierto) · `y` = calor del tambor (−1 bajo, +1 alto). */
const aire = (s: Estado) => (s.x + 1) / 2;
const calor = (s: Estado) => (s.y + 1) / 2;
function nuevoLote(s: Estado, humedo: boolean) {
  s.temp = 150;
  s.meta = 8 + Math.round(s.azar() * 5);
  s.perfil = Math.floor(s.azar() * 3);
  s.humedad = humedo ? 1 : 0;
  s.pops = 0;
  s.proximo = 0;
  s.seguimiento = 0;
  s.muestras = 0;
}
function descargar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.8;
  const [, a, b] = PERFILES[s.perfil],
    calidad = s.muestras ? s.seguimiento / s.muestras : 0;
  if (s.temp < CRACK) {
    s.crudos++;
    m.sumar(-35);
    useGame.getState().toast('Crudo: ni un chasquido todavía.', '🫘');
  } else if (s.pops < a || s.pops > b) {
    s.fuera++;
    m.sumar(-30);
  } else {
    s.lotes++;
    m.sumar(40 + Math.round(calidad * 40));
  }
  nuevoLote(s, m.parametros.humedo);
}
const motor = defineMotor({
  id: 'lapaz.tostador',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'finca',
  guia: {
    goal: 'A/D es el aire y W/S el calor del tambor. Seguí el ritmo pedido, contá los chasquidos y descargá con F en la ventana del perfil.',
    ...controles(),
  },
  etapa: (p) => ({
    banda: 2.2 - p.dif * 0.8,
    humedo: p.tema.variante === 'el-cafe-hizo-pop',
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      temp: 150,
      ritmo: 0,
      meta: 10,
      humedad: 0,
      perfil: 0,
      pops: 0,
      proximo: 0,
      seguimiento: 0,
      muestras: 0,
      espera: 0,
      bigote: 0,
      lotes: 0,
      quemados: 0,
      crudos: 0,
      fuera: 0,
    };
    nuevoLote(s, p.humedo);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.bigote = Math.max(0, s.bigote - dt);
    // el agua del lote húmedo se lleva calor hasta que se evapora
    s.humedad = Math.max(0, s.humedad - dt / 6);
    s.ritmo = 4 + 18 * calor(s) - 10 * aire(s) - 6 * s.humedad;
    s.temp += s.ritmo * dt;
    if (s.temp < CRACK) {
      s.muestras += dt;
      if (Math.abs(s.ritmo - s.meta) <= m.parametros.banda) s.seguimiento += dt;
    } else {
      s.proximo -= dt;
      if (s.proximo <= 0) {
        s.pops++;
        s.bigote = 0.5;
        s.proximo = 0.7 + s.azar() * 0.3;
        audio.tone(1400 + s.azar() * 600, 0.04, { type: 'square', gain: 0.08 });
      }
    }
    if (s.temp >= CARBON || s.pops > 9) {
      s.quemados++;
      m.sumar(-40);
      useGame.getState().toast('¡Carbón! Te pasaste del perfil.', '🔥');
      nuevoLote(s, m.parametros.humedo);
    }
    if (input.take('fire')) descargar(m);
    const [nombre, a, b] = PERFILES[s.perfil];
    m.objetivo = `Perfil ${nombre}: descargá entre el chasquido ${a} y el ${b}`;
    m.lineas = [
      `Ritmo ${s.ritmo.toFixed(1)} °/s (pedido ${s.meta}) · ${Math.round(s.temp)} °C · Chasquidos ${s.pops}`,
      `Lotes ${s.lotes} · Crudos ${s.crudos} · Fuera de ventana ${s.fuera} · Carbón ${s.quemados}`,
    ];
    m.stats = { x: s.x, y: s.y, lotes: s.lotes, crudos: s.crudos, quemados: s.quemados, pops: s.pops };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    // ritmo = 4 + 18·calor − 10·aire − 6·humedad → con el lote húmedo cierra el aire y busca el calor que da el ritmo
    const abre = s.humedad > 0.2 ? 0.15 : 0.5;
    s.x = abre * 2 - 1;
    s.y = Math.max(-1, Math.min(1, ((s.meta - 4 + 10 * abre + 6 * s.humedad) / 18) * 2 - 1));
    const [, a, b] = PERFILES[s.perfil];
    if (s.pops >= a && s.pops <= b && s.proximo > 0.2) descargar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      ciego = m.parametros.humedo || s.temp > 180,
      tueste = Math.min(1, Math.max(0, (s.temp - 150) / (CARBON - 150))),
      grano = ciego ? '#7a7a7a' : `hsl(${30 - tueste * 15}, ${55 - tueste * 25}%, ${62 - tueste * 45}%)`;
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Chasquido del tostado'} · Al oído`}>
        <group position={[-2, 0.7, -0.8]} scale={[1 + s.bigote * 0.08, 1, 1]}>
          <Block pos={[0, 0.9, 0]} size={[2.6, 1.8, 2]} color="#3c3f45" mat="metal" solid={false} />
          <Cyl pos={[1.4, 1.1, 0]} r={0.8} h={0.3} color="#2b2d31" mat="metal" solid={false} />
          <Cyl pos={[0, 2.3, 0]} r={0.35} h={1} color="#55595f" mat="metal" solid={false} />
          {s.bigote > 0 &&
            [-1, 1].map((l) => (
              // cada chasquido infla un bigote de vapor
              <Ball key={l} pos={[0.6 + l * 0.6, 3.1, 0]} r={0.35 + s.bigote * 0.4} color="#f2f2f2" mat="glass" />
            ))}
        </group>
        <Block pos={[1.2, 0.85, 1.6]} size={[2.2, 0.2, 1.4]} color={grano} mat="stone" solid={false} />
        {ciego && <Label pos={[1.2, 1.4, 1.6]} text="👂 Color oculto" h={0.26} />}
        <Block pos={[3.2, 0.8 + aire(s), -2]} size={[0.4, aire(s) * 2 + 0.05, 0.4]} color="#7fc7e8" solid={false} />
        <Block pos={[3.9, 0.8 + calor(s), -2]} size={[0.4, calor(s) * 2 + 0.05, 0.4]} color="#e2703a" solid={false} />
        <Label pos={[3.55, 3.3, -2]} text="Aire · Calor" h={0.28} />
        <Block
          pos={[-4.6, 0.8 + tueste * 1.4, 1.6]}
          size={[0.3, tueste * 2.8 + 0.05, 0.3]}
          color={s.temp >= CRACK ? '#d9503a' : '#e8b04a'}
          solid={false}
        />
        <Plate pos={[-4.6, 3.6, 1.6]} text={`${Math.round(s.temp)} °C`} h={0.26} />
        <Label pos={[-1, 3.6, -2.6]} text={'💥'.repeat(Math.min(9, s.pops)) || 'Esperando el crack…'} h={0.32} />
      </Mesa>
    );
  },
});
export const Tostador = motor.Escena;
export const guia = motor.guia;
