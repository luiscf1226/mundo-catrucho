// Carta que gira: en la laguna de Caratasca el horizonte es bajo y la carta se te gira en las manos. Con F y E
// enderezás la carta (rotación); con el cursor corregís la deriva del viento (traslación). Si corregís el giro
// como si fuera deriva, te salís del canal entre las dos marcas de la costa.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, limitar, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  y: number;
  viento: number;
  rafaga: number;
  giro: number;
  proximoGiro: number;
  falta: number;
  espera: number;
  bien: number;
  giradas: number;
  fuera: number;
  vueltas: number;
  azar: () => number;
};
type Param = { canal: number; viento: number; cadaGiro: number; cadaMarca: number; seed: number };
type Sesion = Motor<Param, Estado>;

const PASO = 15;
const normal = (g: number) => ((((g + 180) % 360) + 360) % 360) - 180;
const ESCALA = 3.4;

function girar(m: Sesion, sentido: 1 | -1) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.18;
  s.vueltas++;
  s.giro = normal(s.giro + sentido * PASO);
}
function marcas(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  const dentro = Math.abs(s.y) <= m.parametros.canal,
    derecha = Math.abs(s.giro) < 1;
  if (dentro && derecha) {
    s.bien++;
    m.sumar(40);
  } else if (dentro) {
    s.giradas++;
    m.sumar(10);
    toast('Pasaste, pero con la carta girada no sabés tu rumbo.', '🗺️');
  } else {
    s.fuera++;
    m.sumar(-25);
    toast('Confundiste giro con deriva: te saliste del canal.', '🌬️');
    s.y = 0;
  }
  s.falta = m.parametros.cadaMarca;
}

const motor = defineMotor({
  id: 'graciasadios.caratasca',
  modos: { duo: { tipo: 'compartido', cada: 2 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'lago',
  guia: {
    goal: 'Pasá entre cada par de marcas bajas de la costa. La carta se gira sola: F y E la enderezan hasta que la N quede arriba. El viento te corre de lado: el cursor corrige esa deriva. Que la carta gire no quiere decir que te moviste.',
    ...controles('girar la carta ↻', 'girar la carta ↺', 'corregir la deriva'),
  },
  etapa: (p) => ({
    canal: 0.45 - p.dif * 0.12,
    viento: 0.25 + p.dif * 0.2,
    cadaGiro: 4.5 - p.dif * 1.5,
    cadaMarca: 3.5 - p.dif * 0.8,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    y: 0,
    viento: p.viento,
    rafaga: 2,
    giro: 0,
    proximoGiro: 2.5,
    falta: p.cadaMarca + 0.5,
    espera: 0,
    bien: 0,
    giradas: 0,
    fuera: 0,
    vueltas: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.rafaga -= dt;
    if (s.rafaga <= 0) {
      s.rafaga = 3.5;
      s.viento = (s.azar() < 0.5 ? -1 : 1) * (p.viento + s.azar() * 0.3);
    }
    s.proximoGiro -= dt;
    if (s.proximoGiro <= 0) {
      // la laguna se lleva la brújula: la carta da una vuelta de dos a cuatro pasos
      s.proximoGiro = p.cadaGiro;
      s.giro = normal(s.giro + (s.azar() < 0.5 ? -1 : 1) * PASO * (2 + Math.floor(s.azar() * 3)));
    }
    s.y = limitar(s.y + (s.viento + s.x * 0.8) * 0.5 * dt);
    s.falta -= dt;
    if (s.falta <= 0) marcas(m);
    if (input.take('fire')) girar(m, 1);
    if (input.take('use')) girar(m, -1);
    m.objetivo = `Marcas en ${Math.max(0, s.falta).toFixed(1)} s · ${Math.abs(s.giro) < 1 ? 'carta derecha' : `carta girada ${s.giro > 0 ? '↻' : '↺'} ${Math.abs(s.giro)}°`}`;
    m.lineas = [
      `Viento ${s.viento > 0 ? '→' : '←'} · ${Math.abs(s.y) <= p.canal ? 'dentro del canal' : '¡fuera del canal!'}`,
      `Bien ${s.bien} · Con la carta girada ${s.giradas} · Fuera ${s.fuera}`,
    ];
    m.stats = { x: s.x, y: s.y, giro: s.giro, bien: s.bien, giradas: s.giradas, fuera: s.fuera, vueltas: s.vueltas };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    // traslación: compensa el viento y vuelve al centro; rotación: endereza la carta paso a paso
    s.x = limitar((-s.viento - s.y * 2) / 0.8);
    if (Math.abs(s.giro) >= 1) girar(m, s.giro < 0 ? 1 : -1);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      canal = m.parametros.canal * ESCALA,
      giro = (-s.giro * Math.PI) / 180;
    return (
      <Mesa titulo="Laguna de Caratasca · carta y viento">
        <Block pos={[-1, 0.75, 0]} size={[9.4, 0.06, 7.4]} color="#4f9fb0" mat="water" solid={false} />
        <group position={[-1, 0.82, 0]} rotation-y={giro}>
          <Block pos={[0, 0, 0]} size={[5.6, 0.04, 6.4]} color="#f1e3c6" mat="cloth" solid={false} />
          {[-1, 1].map((l) => (
            <group key={l}>
              <Block pos={[l * canal, 0.04, 0]} size={[0.06, 0.02, 6]} color="#1d3557" solid={false} />
              <Cyl pos={[l * (canal + 0.25), 0.16, -2.9]} r={0.14} h={0.24} color="#6a994e" solid={false} />
            </group>
          ))}
          <Block pos={[0, 0.06, -3]} size={[0.2, 0.02, 0.3]} color="#c1121f" solid={false} />
          <Label pos={[0, 0.5, -3.3]} text="N" h={0.36} />
          <Block pos={[s.y * ESCALA, 0.1, 1.2]} size={[0.32, 0.12, 0.8]} color="#7f5539" mat="wood" solid={false} />
        </group>
        {/* rumbo de la lancha: siempre hacia adelante; la carta es la que gira */}
        <Block pos={[-1 + s.y * ESCALA, 1.05, -0.1]} size={[0.08, 0.04, 1.6]} color="#ffd166" solid={false} />
        <Label pos={[3.4, 1.5, -2.6]} text={`Viento ${s.viento > 0 ? '→' : '←'}`} h={0.3} />
        <Block
          pos={[3.4 + Math.sign(s.viento) * 0.3, 1.2, -2.6]}
          size={[0.6, 0.18, 0.06]}
          color="#e63946"
          mat="cloth"
          solid={false}
        />
        <Cyl pos={[3.4, 0.95, -2.6]} r={0.04} h={0.5} color="#adb5bd" solid={false} />
        <group position={[3.2, 0.9, 1.8]}>
          <Cyl pos={[0, 0, 0]} r={0.55} h={0.08} color="#e9ecef" solid={false} />
          <group rotation-y={giro + Math.sin(m.tiempo * 9) * (Math.abs(s.giro) > 0 ? 0.4 : 0)}>
            <Block pos={[0, 0.07, -0.2]} size={[0.08, 0.04, 0.4]} color="#e63946" solid={false} />
            <Block pos={[0, 0.07, 0.2]} size={[0.08, 0.04, 0.4]} color="#457b9d" solid={false} />
          </group>
          <Ball pos={[0, 0.1, 0]} r={0.06} color="#343a40" />
        </group>
        <Label pos={[-1, 1.9, 3.4]} text={`Remo ${s.x > 0.1 ? '→' : s.x < -0.1 ? '←' : '·'}`} h={0.3} />
      </Mesa>
    );
  },
});
export const Carta = motor.Escena;
export const guia = motor.guia;
