import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

/** El punto es un hilo de 5 cm; la miel espesa sola sobre el fuego. */
const PUNTO = 5;
type Prueba = { t: number; hilo: number };
type Estado = ReturnType<typeof cursor> & {
  t: number;
  ritmo: number;
  pruebas: Prueba[];
  miel: number;
  espera: number;
  listo: number;
  alPunto: number;
  casi: number;
  aguadas: number;
  pasadas: number;
  quemadas: number;
  azar: () => number;
};
type Param = { ritmo: [number, number]; margen: number; ruido: number; seed: number };
type Sesion = Motor<Param, Estado>;
/** cuánto se deja enfriar la cuchara (0..1); lo justo está entre 0,35 y 0,65 */
const enfriado = (x: number) => (x + 1) / 2;
const espesor = (s: Estado) => s.ritmo * s.t;
function olla(s: Estado, p: Param) {
  s.t = 0;
  s.ritmo = p.ritmo[0] + s.azar() * (p.ritmo[1] - p.ritmo[0]);
  s.pruebas = [];
  s.miel = 1;
}
/** lo que mide la cuchara: con mucho frío el hilo sale más largo de lo que es; muy caliente, más corto */
function leer(s: Estado, p: Param) {
  const c = enfriado(s.x),
    sesgo = 1 + Math.max(0, c - 0.65) * 2.5 - Math.max(0, 0.35 - c) * 1.2;
  return Math.max(0, PUNTO * espesor(s) * sesgo + (s.azar() * 2 - 1) * p.ruido);
}
function probar(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.6;
  if (s.pruebas.length >= 3) {
    useGame.getState().toast('Ya hiciste tres pruebas: decidí con lo que tenés.', '🥄');
    return;
  }
  s.pruebas.push({ t: s.t, hilo: leer(s, p) });
  // cada prueba se come un poco de miel
  s.miel = Math.max(0, s.miel - 0.12);
}
function cierra(m: Sesion, puntos: number, texto: string) {
  m.sumar(puntos);
  useGame.getState().toast(texto, '🍯');
  m.datos.listo = 1;
}
function retirar(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.4;
  const e = espesor(s);
  if (Math.abs(e - 1) <= p.margen) {
    s.alPunto++;
    cierra(m, Math.round(100 * s.miel), '¡Coyoles al punto!');
  } else if (Math.abs(e - 1) <= p.margen * 2) {
    s.casi++;
    cierra(m, Math.round(40 * s.miel), 'Casi: le faltó o le sobró poquito.');
  } else if (e < 1) {
    s.aguadas++;
    cierra(m, -20, 'La sacaste aguada.');
  } else {
    s.pasadas++;
    cierra(m, -25, 'Se te pasó: quedó dura.');
  }
}
const motor = defineMotor({
  id: 'yoro.coyol',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'La miel espesa sola. F prueba con la cuchara (tres veces como mucho; cada prueba gasta miel) y mide el hilo: el punto es 5 cm. A/D dicen cuánto enfriás la cuchara: muy fría miente. E saca la olla del fuego.',
    ...controles('sacar del fuego'),
  },
  etapa: (p) => ({
    ritmo: [0.15 - p.dif * 0.01, 0.3 + p.dif * 0.04] as [number, number],
    margen: 0.1 - p.dif * 0.04,
    ruido: 0.05 + p.dif * 0.05,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      t: 0,
      ritmo: 0.2,
      pruebas: [],
      miel: 1,
      espera: 0,
      listo: 0,
      alPunto: 0,
      casi: 0,
      aguadas: 0,
      pasadas: 0,
      quemadas: 0,
      azar: rng(p.seed),
    };
    olla(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) olla(s, p);
    } else {
      s.t += dt;
      if (espesor(s) >= 1.5) {
        s.quemadas++;
        cierra(m, -30, 'Se quemó la miel: hay que sacarla antes.');
      }
    }
    if (input.take('use')) retirar(m);
    if (input.take('fire')) probar(m);
    const c = enfriado(s.x),
      u = s.pruebas[s.pruebas.length - 1];
    m.objetivo = `Punto: hilo de ${PUNTO} cm · ${s.t.toFixed(1)} s en el fuego`;
    m.lineas = [
      `Cuchara: ${c < 0.35 ? 'muy caliente' : c > 0.65 ? 'muy fría' : 'tibia'} · Pruebas ${s.pruebas.length}/3${u ? ` · última: ${u.hilo.toFixed(1)} cm a los ${u.t.toFixed(1)} s` : ''}`,
      `Al punto ${s.alPunto} · Casi ${s.casi} · Aguadas ${s.aguadas} · Pasadas ${s.pasadas + s.quemadas}`,
    ];
    m.stats = {
      x: s.x,
      pruebas: s.pruebas.length,
      alPunto: s.alPunto,
      casi: s.casi,
      aguadas: s.aguadas,
      pasadas: s.pasadas,
      quemadas: s.quemadas,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.listo > 0) return;
    s.auto = true;
    s.x = 0;
    // primera prueba temprano; la segunda cuando el hilo vaya por 3,5 cm, que mide mejor
    const u = s.pruebas[s.pruebas.length - 1];
    if (!u) {
      if (s.t >= 1.2) probar(m);
      return;
    }
    const ritmo = u.hilo / PUNTO / Math.max(0.1, u.t);
    if (s.pruebas.length === 1 && ritmo > 0 && s.t * ritmo >= 0.7) {
      probar(m);
      return;
    }
    if (s.pruebas.length >= 2 && ritmo > 0 && s.t >= 1 / ritmo) retirar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      e = Math.min(1.5, espesor(s)),
      c = enfriado(s.x),
      u = s.pruebas[s.pruebas.length - 1];
    // del dorado al café oscuro según espesa
    const tono = `hsl(${Math.round(40 - e * 18)}, 75%, ${Math.round(55 - e * 22)}%)`;
    return (
      <Mesa titulo="Coyoles en miel · punto de hilo">
        <Cyl pos={[-2.4, 0.9, -0.8]} r={1} h={0.3} color="#3d3d3d" mat="stone" solid={false} />
        <Cyl pos={[-2.4, 1.45, -0.8]} r={1.05} h={0.9} color="#2b2d42" mat="metal" solid={false} />
        <Cyl
          pos={[-2.4, 1.92, -0.8]}
          r={0.95 * (0.7 + s.miel * 0.3)}
          h={0.04}
          color={tono}
          mat="plastic"
          solid={false}
        />
        {[0, 1, 2, 3, 4].map((j) => (
          <Ball
            key={j}
            pos={[-2.4 + Math.cos(j * 1.3) * 0.5, 1.98, -0.8 + Math.sin(j * 1.3) * 0.5]}
            r={0.13}
            color="#c9a227"
          />
        ))}
        {/* cuchara y su hilo */}
        <Block pos={[0.6, 1.9, -0.6]} size={[1.4, 0.06, 0.16]} rot={-0.3} color="#adb5bd" mat="metal" solid={false} />
        {u && (
          <Cyl
            pos={[0.1, 1.85 - Math.min(5, u.hilo) * 0.11, -0.6]}
            r={0.03}
            h={Math.max(0.02, Math.min(5, u.hilo) * 0.22)}
            color={tono}
            solid={false}
          />
        )}
        {/* regla del hilo y termómetro de la cuchara */}
        <Block pos={[1.6, 1.3, -0.6]} size={[0.1, 1.1, 0.05]} color="#fefae0" solid={false} />
        <Block pos={[1.6, 0.75 + 0.22 * PUNTO * 0.5, -0.55]} size={[0.3, 0.04, 0.05]} color="#e63946" solid={false} />
        <Label pos={[1.6, 2.1, -0.6]} text="5 cm" h={0.2} />
        <Block pos={[-1, 0.73, 2.4]} size={[4, 0.02, 0.3]} color="#dee2e6" solid={false} />
        <Block pos={[-1, 0.74, 2.4]} size={[1.2, 0.02, 0.3]} color="#b7e4c7" solid={false} />
        <Ball pos={[-3 + c * 4, 0.9, 2.4]} r={0.14} color="#ffd166" />
        <Label
          pos={[-1, 1.3, 2.4]}
          text={c < 0.35 ? 'Cuchara: muy caliente' : c > 0.65 ? 'Cuchara: muy fría' : 'Cuchara: tibia'}
          h={0.24}
        />
        {s.pruebas.map((q, i) => (
          <Label
            key={i}
            pos={[2.8, 2.6 - i * 0.45, -0.6]}
            text={`🥄 ${q.hilo.toFixed(1)} cm · ${q.t.toFixed(1)} s`}
            h={0.26}
          />
        ))}
        <Label
          pos={[-1, 3.4, -2.4]}
          text={`🍯 ${s.t.toFixed(1)} s en el fuego · miel ${Math.round(s.miel * 100)} %`}
          h={0.36}
        />
      </Mesa>
    );
  },
});
export const Miel = motor.Escena;
export const guia = motor.guia;
