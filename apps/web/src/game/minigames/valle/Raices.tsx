import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Tramo = { ancho: boolean; c: number; desde: number; largo: number };
type Estado = ReturnType<typeof cursor> & {
  tramos: Tramo[];
  dist: number;
  v: number;
  lado: number;
  lat: number;
  trabada: number;
  premio: number;
  cambiado: number;
  choques: number;
  trabas: number;
  cambios: number;
  remadas: number;
};
type Sesion = Motor<{ angosto: number; seed: number }, Estado>;
function tramoEn(s: Estado, d: number) {
  return s.tramos.find((t) => d >= t.desde && d < t.desde + t.largo) ?? s.tramos[s.tramos.length - 1];
}
const mitad = (m: Sesion, t: Tramo) => (t.ancho ? 1.6 : m.parametros.angosto);
function remar(s: Estado) {
  if (s.trabada > 0) return;
  s.v = Math.min(3, s.v + 0.5);
  s.remadas++;
}
function cambiar(m: Sesion) {
  const s = m.datos,
    t = tramoEn(s, s.dist);
  if (s.trabada > 0) return;
  if (!t.ancho) {
    s.trabas++;
    s.trabada = 1.5;
    s.v = 0;
    m.sumar(-30);
    useGame.getState().toast('¡Pala trabada! En lo angosto no se cambia de borda.', '🛶');
    return;
  }
  s.lado = -s.lado;
  s.cambios++;
  if (s.cambiado !== t.desde) {
    s.cambiado = t.desde;
    m.sumar(8);
  }
}
const motor = defineMotor({
  id: 'valle.raices',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'rio',
  guia: {
    goal: 'F rema del lado de la pala. Remar a la derecha te lleva a la izquierda. E cambia de borda, pero solo en los ensanches. A/D usan la pala de timón.',
    ...controles('cambiar de borda'),
  },
  etapa: (p) => ({ angosto: 0.8 - p.dif * 0.25, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const azar = rng(p.seed),
      tramos: Tramo[] = [];
    let desde = 0;
    for (let i = 0; i < 60; i++) {
      const ancho = i % 2 === 0,
        largo = ancho ? 3 : 7,
        c = ancho ? 0 : i === 1 ? 1 : Math.floor(azar() * 3) - 1;
      tramos.push({ ancho, c, desde, largo });
      desde += largo;
    }
    return {
      ...cursor(),
      tramos,
      dist: 0,
      v: 0,
      lado: 1,
      lat: 0,
      trabada: 0,
      premio: 0,
      cambiado: -1,
      choques: 0,
      trabas: 0,
      cambios: 0,
      remadas: 0,
    };
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.trabada = Math.max(0, s.trabada - dt);
    if (input.take('fire')) remar(s);
    if (input.take('use')) cambiar(m);
    s.v = Math.max(0, s.v - (0.5 + s.v * 0.2) * dt);
    const t = tramoEn(s, s.dist);
    s.lat += s.v * 0.35 * (-t.c - s.lado + s.x) * dt;
    s.dist += s.v * dt;
    s.premio += s.v * dt * 4;
    if (s.premio >= 1) {
      m.sumar(Math.floor(s.premio));
      s.premio -= Math.floor(s.premio);
    }
    if (Math.abs(s.lat) > mitad(m, t)) {
      s.choques++;
      s.v = 0;
      s.lat = 0;
      s.trabada = 0.8;
      s.premio = 0;
      m.sumar(-20);
      useGame.getState().toast('¡Raíz! El cayuco se fue de lado.', '🌿');
    }
    const sig = s.tramos[s.tramos.indexOf(t) + 1];
    m.objetivo = t.ancho
      ? `Ensanche: ${sig.c ? `la curva va a la ${sig.c > 0 ? 'derecha: remá a la izquierda' : 'izquierda: remá a la derecha'}` : 'viene recto'}`
      : `Canal angosto${t.c ? ` con curva a la ${t.c > 0 ? 'derecha' : 'izquierda'}` : ''}: no cambiés de borda`;
    m.lineas = [
      `Pala ${s.lado > 0 ? 'derecha' : 'izquierda'} · Timón ${s.x.toFixed(2)} · Velocidad ${s.v.toFixed(1)}${s.trabada > 0 ? ' · ¡trabada!' : ''}`,
      `${Math.floor(s.dist)} m · Choques ${s.choques} · Trabas ${s.trabas}`,
    ];
    m.stats = {
      x: s.x,
      metros: Math.floor(s.dist),
      choques: s.choques,
      trabas: s.trabas,
      cambios: s.cambios,
      remadas: s.remadas,
    };
  },
  bot(m) {
    const s = m.datos,
      t = tramoEn(s, s.dist),
      sig = s.tramos[s.tramos.indexOf(t) + 1];
    s.auto = true;
    if (t.ancho && sig.c && s.lado !== -sig.c && s.dist > t.desde + 0.5) cambiar(m);
    s.x = Math.max(-1, Math.min(1, t.c + s.lado - s.lat * 1.5));
    if (s.v < 2.6) remar(s);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      t = tramoEn(s, s.dist);
    return (
      <Mesa titulo="Canal entre raíces · Cambiá de borda en lo ancho">
        <Block pos={[-1, 0.74, 0]} size={[5, 0.04, 7.6]} color="#3f6f6a" mat="water" solid={false} />
        {Array.from({ length: 12 }, (_, k) => {
          const d = Math.floor(s.dist) + k,
            q = tramoEn(s, d),
            hw = mitad(m, q),
            z = 3.4 - (k - (s.dist % 1)) * 0.65;
          return [-1, 1].map((lado) => (
            <Cyl
              key={`${k}${lado}`}
              pos={[-1 + lado * (hw + 0.35) * 1.4, 1, z]}
              r={0.22}
              h={0.6}
              color={q.ancho ? '#7a5a3a' : '#5a3d26'}
              mat="wood"
              solid={false}
            />
          ));
        })}
        <group position={[-1 + s.lat * 1.4, 0.85, 2.2]} rotation={[0, -s.x * 0.25, 0]}>
          <Block pos={[0, 0, 0]} size={[0.55, 0.25, 1.8]} color="#8d5a2b" mat="wood" solid={false} />
          <group
            position={[s.lado * 0.45, 0.3, 0]}
            rotation={[0.3 * Math.sin(m.tiempo * 6 * Math.min(1, s.v)), 0, s.lado * 0.5]}
          >
            <Block pos={[0, 0, 0]} size={[0.08, 1.1, 0.08]} color="#d4a373" mat="wood" solid={false} />
          </group>
        </group>
        <Label pos={[-1, 3.2, -2]} text={t.ancho ? '✅ Ensanche: podés cambiar' : '⛔ Angosto: no cambiés'} h={0.34} />
      </Mesa>
    );
  },
});
export const Raices = motor.Escena;
export const guia = motor.guia;
