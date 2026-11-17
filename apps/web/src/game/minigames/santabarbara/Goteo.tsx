import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { aviso, casilla, controles, cursor, duracion, ejeDe, enMesa, Mesa, metas, mover } from './comun';

const FILAS = ['#90e0ef', '#ffd166', '#c77dff'];
const NOMBRES = ['Gota celeste', 'Gota dorada', 'Gota morada'];
/** Segundos que dura un tic de la recta: el agua cae a su ritmo y nadie la apura. */
const TIC = 0.45;
type Estado = ReturnType<typeof cursor> & {
  periodos: number[];
  fases: number[];
  visto: number;
  largo: number;
  respuesta: number;
  marcadores: number;
  fallas: number[];
  espera: number;
  mirando: number;
  aciertos: number;
  errores: number;
  perdidos: number;
  intentos: number;
  azar: () => number;
};
type Sesion = Motor<{ periodos: number[]; marcadores: number; seed: number }, Estado>;
const cae = (s: Estado, i: number, t: number) => (t - s.fases[i]) % s.periodos[i] === 0;
/** Arma tres goteos y busca la primera coincidencia después de lo observado. */
function ciclo(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  for (let intento = 0; intento < 200; intento++) {
    const periodos = [0, 1, 2].map(() => p.periodos[Math.floor(s.azar() * p.periodos.length)]);
    if (new Set(periodos).size < 3) continue;
    s.periodos = periodos;
    s.fases = periodos.map((q) => Math.floor(s.azar() * q));
    // se ven al menos dos gotas de cada una antes de «ahora»
    s.visto = Math.max(...periodos) * 2;
    s.largo = s.visto + 22;
    let t = s.visto;
    while (t < s.largo && ![0, 1, 2].every((i) => cae(s, i, t))) t++;
    if (t < s.largo && t > s.visto + 1) {
      s.respuesta = t;
      break;
    }
  }
  s.marcadores = p.marcadores;
  s.fallas = [];
  s.mirando = 0;
}
function marcar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.intentos++;
  s.espera = 0.6;
  const t = casilla(s.x, s.largo);
  if (t === s.respuesta) {
    s.aciertos++;
    m.sumar(60);
    aviso('¡Cayeron las tres juntas, justo ahí!', '💧');
    ciclo(m);
    return;
  }
  s.errores++;
  s.marcadores--;
  if (!s.fallas.includes(t)) s.fallas.push(t);
  m.sumar(-20);
  if (s.marcadores <= 0) {
    s.perdidos++;
    aviso('Se acabaron los marcadores. Mirá otro goteo.', '🦇');
    ciclo(m);
  } else
    aviso(t < s.visto ? 'Eso ya pasó: marcá después de «ahora».' : 'Ahí no coinciden las tres. Contá cada ritmo.', '🕯️');
}
const motor = defineMotor({
  id: 'santabarbara.goteo',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'cueva',
  guia: {
    goal: 'Tres goteos caen cada uno a su ritmo. Mirá cada cuántos tics cae cada gota y marcá en la recta el próximo tic donde caen las tres juntas. Cada error gasta un marcador.',
    ...controles(),
  },
  etapa: (p) => ({
    periodos: p.dif < 0.3 ? [2, 3, 4] : p.dif < 0.7 ? [2, 3, 4, 5] : [3, 4, 5, 6],
    marcadores: p.dif > 0.6 ? 2 : 3,
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    periodos: [],
    fases: [],
    visto: 0,
    largo: 1,
    respuesta: 0,
    marcadores: p.marcadores,
    fallas: [],
    espera: 0,
    mirando: 0,
    aciertos: 0,
    errores: 0,
    perdidos: 0,
    intentos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.periodos.length) ciclo(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    if (input.take('fire')) marcar(m);
    const t = casilla(s.x, s.largo);
    m.objetivo = 'Marcá cuándo caen las tres juntas';
    m.lineas = [
      `Tic ${t}${t < s.visto ? ' (ya pasó)' : ''} · Marcadores ${'🕯️'.repeat(Math.max(0, s.marcadores))}`,
      `Aciertos ${s.aciertos} · Errores ${s.errores} · Perdidos ${s.perdidos}`,
    ];
    m.stats = { x: s.x, aciertos: s.aciertos, errores: s.errores, perdidos: s.perdidos, intentos: s.intentos };
  },
  bot(m) {
    const s = m.datos;
    // el bot también mira las gotas un rato antes de marcar
    if (s.espera > 0 || s.mirando < 2.2 || !s.periodos.length) return;
    s.auto = true;
    s.x = ejeDe(s.respuesta, s.largo);
    marcar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      t = casilla(s.x, s.largo),
      tic = Math.floor(m.tiempo / TIC);
    const xDe = (k: number) => enMesa(ejeDe(k, s.largo), 0)[0];
    return (
      <Mesa titulo="Cuevas de Pencaligüe · recta del goteo">
        {/* las tres estalactitas con su gota cayendo a su propio ritmo */}
        {s.periodos.map((q, i) => {
          const x = -3 + i * 2,
            fase = ((tic - s.fases[i]) % q) + (m.tiempo / TIC - tic),
            k = Math.min(1, fase / 1.2);
          return (
            <group key={i}>
              <Cyl pos={[x, 2.9, -3.3]} r={0.05} rTop={0.35} h={1.2} color="#7f7466" mat="stone" solid={false} />
              <Ball pos={[x, 2.3 - k * 1.5, -3.3]} r={0.12} color={FILAS[i]} />
              <Label pos={[x, 3.7, -3.3]} text={`${NOMBRES[i]}`} h={0.24} />
            </group>
          );
        })}
        {/* la recta: lo observado a la izquierda de «ahora», lo que viene a la derecha */}
        <Block
          pos={[(xDe(0) + xDe(s.visto - 1)) / 2, 0.74, -0.4]}
          size={[Math.abs(xDe(s.visto - 1) - xDe(0)) + 0.3, 0.04, 3.4]}
          color="#3d405b"
          mat="stone"
          solid={false}
        />
        <Block pos={[(xDe(s.visto - 1) + xDe(s.visto)) / 2, 0.9, -0.4]} size={[0.06, 0.4, 3.6]} color="#f4f1de" />
        <Label pos={[(xDe(s.visto - 1) + xDe(s.visto)) / 2, 1.4, 1.7]} text="ahora" h={0.26} />
        {Array.from({ length: s.largo }, (_, k) => (
          <Block
            key={k}
            pos={[xDe(k), 0.76, 1.3]}
            size={[0.05, 0.05, k % 5 === 0 ? 0.5 : 0.25]}
            color={k === t ? '#ffd166' : s.fallas.includes(k) ? '#e63946' : '#e9e4d8'}
            solid={false}
          />
        ))}
        {s.periodos.flatMap((_, i) =>
          Array.from({ length: s.visto }, (_, k) => k)
            .filter((k) => cae(s, i, k))
            .map((k) => <Ball key={`${i}-${k}`} pos={[xDe(k), 0.85, -1.6 + i * 1.1]} r={0.13} color={FILAS[i]} />),
        )}
        {s.fallas.map((k) => (
          <Label key={k} pos={[xDe(k), 1.1, 0.9]} text="✗" h={0.3} fg="#e63946" bg="transparent" />
        ))}
        <Block pos={[xDe(t), 1.2, -0.4]} size={[0.08, 0.9, 3.6]} color="#ffd166" mat="neon" solid={false} />
        <Label pos={[xDe(t), 2, -0.4]} text={`tic ${t}`} h={0.28} />
      </Mesa>
    );
  },
});
export const Goteo = motor.Escena;
export const guia = motor.guia;
