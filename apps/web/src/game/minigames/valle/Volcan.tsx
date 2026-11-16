import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  tomas: number[];
  borde: number;
  espera: number;
  panoramas: number;
  dobles: number;
  huecos: number;
  /** postal: cuál de las tres tomas salió del lugar correcto y cuánto se corrieron las otras */
  buena: number;
  corrido: number[];
  azar: () => number;
};
type Sesion = Motor<{ ancho: number; viento: number; postal: boolean; seed: number }, Estado>;
const TOMAS_POSTAL = 6;
const X = (u: number) => -1 + u * 4;
const elegida = (x: number) => (x < -0.33 ? 0 : x > 0.33 ? 2 : 1);
function nuevas(s: Estado, dif: number) {
  s.buena = Math.floor(s.azar() * 3);
  s.corrido = [0, 1, 2].map((k) => (k === s.buena ? 0 : (0.25 - dif * 0.12) * (s.azar() > 0.5 ? 1 : -1)));
}
function tomar(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    toast = useGame.getState().toast;
  if (s.espera > 0) return;
  s.espera = 1.2;
  if (p.postal) {
    if (elegida(s.x) === s.buena) {
      s.tomas.push(s.tomas.length);
      m.sumar(12);
      if (s.tomas.length >= TOMAS_POSTAL) {
        s.panoramas++;
        s.tomas = [];
        m.sumar(50);
        toast('¡Postal continua del Tigre!', '🌋');
      }
    } else {
      s.dobles++;
      m.sumar(-50);
      toast('Esa la tomaron desde otro lugar: doble costa.', '📷');
    }
    nuevas(s, m.partida.dif);
    return;
  }
  const c = s.x,
    izq = c - p.ancho / 2;
  if (Math.abs(s.y) > 0.15) {
    s.dobles++;
    m.sumar(-25);
    toast('Moviste la cámara en vez de girarla: doble costa.', '📷');
    return;
  }
  if (!s.tomas.length) {
    if (izq > -0.95) {
      s.huecos++;
      m.sumar(-10);
      toast('Empezá por la punta izquierda de la isla.', '📷');
      return;
    }
  } else {
    const encima = (s.borde - izq) / p.ancho;
    if (encima < 0.15) {
      s.huecos++;
      m.sumar(-20);
      toast('Quedó un hueco en la unión.', '📷');
      return;
    }
    if (encima > 0.45) {
      m.sumar(-5);
      return;
    }
  }
  s.tomas.push(c);
  s.borde = c + p.ancho / 2;
  m.sumar(10);
  if (s.borde >= 0.95) {
    s.panoramas++;
    s.tomas = [];
    s.borde = -1;
    m.sumar(60);
    toast('¡Panorámica sin doble costa!', '🌋');
  }
}
function Isla({ x, z, s = 1, fantasma = 0 }: { x: number; z: number; s?: number; fantasma?: number }) {
  return (
    <>
      <Cyl
        pos={[x, 0.75 + 0.9 * s, z]}
        r={1.6 * s}
        rTop={0.25 * s}
        h={1.8 * s}
        color="#5b6b4e"
        mat="grass"
        solid={false}
      />
      {fantasma !== 0 && (
        <Cyl
          pos={[x + fantasma, 0.76 + 0.9 * s, z + 0.05]}
          r={1.6 * s}
          rTop={0.25 * s}
          h={1.8 * s}
          color="#9aa58e"
          solid={false}
        />
      )}
    </>
  );
}
const motor = defineMotor({
  id: 'valle.volcan',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'mar',
  guia: {
    goal: 'A/D gira la cámara; W/S la corre del trípode y hay que dejarla en cero. F toma la foto: empezá a la izquierda y traslapá un tercio. En la postal, elegí la toma sin doble costa.',
    ...controles(),
  },
  etapa: (p) => ({
    ancho: 0.5 - p.dif * 0.1,
    viento: 0.05 + p.dif * 0.15,
    postal: p.tema.variante === 'la-isla-no-cabe-en-la-foto',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      tomas: [],
      borde: -1,
      espera: 0,
      panoramas: 0,
      dobles: 0,
      huecos: 0,
      buena: 1,
      corrido: [0, 0, 0],
      azar: rng(p.seed),
    };
    nuevas(s, 0);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    mover(s, dt);
    if (!p.postal) s.y = Math.max(-1, Math.min(1, s.y + Math.sin(m.tiempo * 0.8) * p.viento * dt));
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) tomar(m);
    m.objetivo = p.postal ? 'Elegí la toma hecha desde el mirador' : 'Girá y traslapá sin correr la cámara';
    m.lineas = p.postal
      ? [
          `Toma ${elegida(s.x) + 1} de 3 · Postal ${s.tomas.length}/${TOMAS_POSTAL}`,
          `Postales ${s.panoramas} · Tomas malas ${s.dobles}`,
        ]
      : [
          `Giro ${s.x.toFixed(2)} · Corrimiento ${s.y.toFixed(2)} (dejalo en 0) · ${s.espera > 0 ? 'Revelando…' : 'Lista'}`,
          `Fotos ${s.tomas.length} · Panorámicas ${s.panoramas} · Dobles ${s.dobles} · Huecos ${s.huecos}`,
        ];
    m.stats = { x: s.x, panoramas: s.panoramas, dobles: s.dobles, huecos: s.huecos, tomas: s.tomas.length };
  },
  bot(m) {
    const s = m.datos,
      p = m.parametros;
    s.auto = true;
    if (p.postal) s.x = (s.buena - 1) * 0.66;
    else {
      s.y = 0;
      s.x = s.tomas.length ? s.borde + p.ancho * 0.2 : -1 + p.ancho / 2 - 0.02;
    }
    tomar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      p = m.parametros,
      ancho = p.ancho * 4;
    if (p.postal)
      return (
        <Mesa titulo="La isla no cabe · ¿Cuál se tomó del mirador?">
          {[0, 1, 2].map((k) => (
            <group key={k}>
              <Block
                pos={[-3.6 + k * 2.6, 0.8, -0.6]}
                size={[2.3, 0.1, 2.2]}
                color={elegida(s.x) === k ? '#ffd166' : '#f1faee'}
                solid={false}
              />
              <Block
                pos={[-3.6 + k * 2.6, 0.86, -0.6]}
                size={[2.1, 0.06, 2]}
                color="#4ea8de"
                mat="water"
                solid={false}
              />
              <Isla x={-3.6 + k * 2.6} z={-0.6} s={0.45} fantasma={s.corrido[k] * 2.5} />
            </group>
          ))}
          {Array.from({ length: TOMAS_POSTAL }, (_, k) => (
            <Block
              key={k}
              pos={[-4.4 + k * 1.35, 0.8, 2.6]}
              size={[1.3, 0.08, 1]}
              color={k < s.tomas.length ? '#5b6b4e' : '#e9e4d4'}
              solid={false}
            />
          ))}
          <group scale={[1 + s.tomas.length * 0.12, 1, 1]}>
            <Label pos={[-1, 3.2, -2.4]} text="🖼️ Marco de postal" h={0.32} />
          </group>
        </Mesa>
      );
    return (
      <Mesa titulo="Mirador del golfo · Panorámica del Tigre">
        <Block pos={[-1, 0.76, -2]} size={[9.6, 0.04, 3]} color="#4ea8de" mat="water" solid={false} />
        <Isla x={-1} z={-2.2} fantasma={Math.abs(s.y) > 0.15 ? s.y * 1.5 : 0} />
        <Block pos={[-1, 0.78, 2.6]} size={[8.4, 0.06, 1.2]} color="#e9e4d4" solid={false} />
        {s.tomas.map((u, k) => (
          <Block
            key={k}
            pos={[X(u), 0.84 + k * 0.01, 2.6]}
            size={[ancho, 0.05, 1]}
            color={k % 2 ? '#7d9a6a' : '#6b8a5e'}
            solid={false}
          />
        ))}
        <group position={[X(s.x), 0.95, 2.6]}>
          <Block pos={[-ancho / 2, 0, 0]} size={[0.06, 0.06, 1.2]} color="#ff006e" solid={false} />
          <Block pos={[ancho / 2, 0, 0]} size={[0.06, 0.06, 1.2]} color="#ff006e" solid={false} />
        </group>
        <group position={[-1 + s.y * 1.5, 0.75, 0.6]}>
          <Cyl pos={[0, 0.6, 0]} r={0.05} h={1.2} color="#333333" mat="metal" solid={false} />
          <group rotation={[0, -s.x * 0.9, 0]}>
            <Block pos={[0, 1.35, 0]} size={[0.5, 0.35, 0.3]} color="#222222" mat="metal" solid={false} />
            <Block pos={[0, 1.35, -0.25]} size={[0.18, 0.18, 0.25]} color="#555555" mat="glass" solid={false} />
          </group>
        </group>
        <Label
          pos={[-1, 3.4, -1]}
          text={Math.abs(s.y) > 0.15 ? '¡Cámara corrida: doble costa!' : 'Girá, no corrás'}
          h={0.32}
        />
      </Mesa>
    );
  },
});
export const Volcan = motor.Escena;
export const guia = motor.guia;
