// «Archivo del maíz»: reutiliza las preguntas del motor `trivia` (trivia/preguntas.ts) en una mesa con fichas.
// Cada pregunta trae una ficha verificada; si está cerrada, contestar o consultarla gasta una consulta. Podés pasar.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Ball, Block, Cyl, Label } from '../../kit';
import { type Partida, rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { armar } from '../trivia/preguntas';
import { casilla, centro, controles, cursor, duracion, fila, Mesa, metas, mover, Puntero } from './comun';

/** Alto de un rótulo para que quepa en `ancho` metros (como en Trivia.tsx). */
const ajustar = (texto: string, ancho: number, maximo: number) => Math.min(maximo, ancho / (texto.length * 0.52 + 0.8));
type Ficha = { q: string; ops: string[]; ok: number; ficha: string };
function preguntas(p: Partida): Ficha[] {
  const r = rng(p.seed + 11),
    dadas = Array.isArray(p.tema.preguntas)
      ? (p.tema.preguntas as unknown[]).filter((x): x is string[] => Array.isArray(x) && x.length >= 4)
      : [];
  if (!dadas.length)
    return armar(p.tema, p.dept?.id, 10, r).map((q) => ({ ...q, ficha: `Ficha verificada: «${q.ops[q.ok]}»` }));
  return dadas.map(([q, ok, m1, m2, ficha]) => {
    const ops = [ok, m1, m2];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [ops[i], ops[j]] = [ops[j], ops[i]];
    }
    return { q, ops, ok: ops.indexOf(ok), ficha: ficha ?? `Ficha verificada: «${ok}»` };
  });
}
type Estado = ReturnType<typeof cursor> & {
  lista: Ficha[];
  i: number;
  abierta: boolean;
  consultas: number;
  pistas: number;
  errores: number;
  pasadas: number;
  dice: number;
  sorteo: () => number;
};
type Parametros = { visibles: number; consultas: number; examen: boolean; lista: Ficha[]; semilla: number };
type Sesion = Motor<Parametros, Estado>;
function siguiente(s: Estado, par: Parametros) {
  s.i++;
  s.abierta = s.sorteo() < par.visibles;
  const q = s.lista[s.i % s.lista.length];
  // la mazorca de espuma también se equivoca: 4 de cada 10 veces señala otra
  s.dice = s.sorteo() < 0.6 ? q.ok : (q.ok + 1 + Math.floor(s.sorteo() * 2)) % 3;
}
function actuar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.5;
  const q = s.lista[s.i % s.lista.length],
    f = fila(s.y);
  if (f === 0) {
    m.sumar(-10);
    useGame.getState().toast('Apuntá a una respuesta o a la ficha.', '🌽');
    return;
  }
  if (f === -1) {
    if (s.x > 0) {
      s.pasadas++;
      s.espera = 1;
      siguiente(s, m.parametros);
    } else if (!s.abierta && s.consultas > 0) {
      s.consultas--;
      s.abierta = true;
    } else m.sumar(-10);
    return;
  }
  const elegida = casilla(s.x, 3);
  if (!s.abierta) {
    if (s.consultas <= 0) {
      m.sumar(-10);
      useGame.getState().toast('Sin consultas: pasá esta pregunta.', '📇');
      return;
    }
    s.consultas--;
  }
  s.espera = 1.4;
  if (elegida === q.ok) {
    s.pistas++;
    m.sumar(s.abierta ? 50 : 25);
  } else {
    s.errores++;
    m.sumar(-40);
  }
  siguiente(s, m.parametros);
}
const motor = defineMotor({
  id: 'elparaiso.trivia',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'feria',
  guia: {
    goal: 'Arriba elegí la respuesta que cuadra con la ficha. Abajo a la izquierda consultá la ficha; a la derecha pasá. Contestar con la ficha cerrada gasta una consulta.',
    ...controles,
  },
  etapa: (p) => ({
    visibles: 0.75 - p.dif * 0.35,
    consultas: 4 - Math.round(p.dif * 2),
    examen: p.tema.variante === 'la-mazorca-te-puso-examen',
    lista: preguntas(p),
    semilla: p.seed + 29,
  }),
  metas,
  duracion,
  crear: (par) => {
    const s: Estado = {
      ...cursor(),
      lista: par.lista,
      i: -1,
      abierta: false,
      consultas: par.consultas,
      pistas: 0,
      errores: 0,
      pasadas: 0,
      dice: 0,
      sorteo: rng(par.semilla),
    };
    siguiente(s, par);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    if (input.take('fire')) actuar(m);
    const q = s.lista[s.i % s.lista.length];
    m.objetivo = q.q;
    m.lineas = [
      `Ficha ${s.abierta ? 'abierta' : 'cerrada'} · Consultas ${s.consultas} · Pistas del itinerario ${s.pistas}`,
      'W arriba: respuestas · S abajo: consultar (izq.) o pasar (der.) · F confirmá',
    ];
    m.stats = { x: s.x, pistas: s.pistas, errores: s.errores, consultas: s.consultas, pasadas: s.pasadas };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0) return;
    s.auto = true;
    const q = s.lista[s.i % s.lista.length];
    if (s.abierta) {
      s.x = centro(q.ok, 3);
      s.y = 0.8;
    } else {
      s.x = s.consultas > 0 ? -0.6 : 0.6;
      s.y = -0.8;
    }
    actuar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      q = s.lista[s.i % s.lista.length],
      f = fila(s.y),
      sel = casilla(s.x, 3);
    return (
      <Mesa
        titulo={
          m.parametros.examen ? 'Examen de la mazorca · ¿Cuál no tiene fuente?' : 'Archivo del maíz · Fichas de Danlí'
        }
      >
        {/* pizarra: las tres respuestas y la ficha (la pregunta va en el HUD; en la mesa solo van las letras) */}
        <Block pos={[-1, 1.95, -3.7]} size={[10.4, 2.3, 0.2]} color="#2f3b2a" mat="wood" solid={false} />
        {q.ops.map((op, i) => (
          <Label
            key={`o${i}`}
            pos={[-1, 2.8 - i * 0.48, -3.45]}
            text={`${'ABC'[i]}: ${op}`}
            h={ajustar(`${'ABC'[i]}: ${op}`, 9.8, 0.44)}
            fg={f === 1 && sel === i ? '#ffe066' : undefined}
          />
        ))}
        <Label
          pos={[-1, 1.3, -3.45]}
          text={s.abierta ? q.ficha : '📇 Ficha cerrada'}
          h={s.abierta ? ajustar(q.ficha, 9.8, 0.42) : 0.4}
          fg={s.abierta ? '#b9f2a4' : '#c9c9c9'}
        />
        {q.ops.map((_, i) => (
          <group key={i} position={[-1 + centro(i, 3) * 4.6, 0, -1.6]}>
            <Block
              pos={[0, 0.78, 0]}
              size={[2.9, 0.08, 1.8]}
              color={f === 1 && sel === i ? '#ffe066' : '#f4ecd2'}
              mat="cloth"
              solid={false}
            />
            <Label pos={[0, 1.5, 0]} text={'ABC'[i]} h={0.7} />
          </group>
        ))}
        <Block
          pos={[-3.3, 0.78, 2]}
          size={[4.2, 0.08, 1.8]}
          color={f === -1 && s.x <= 0 ? '#9fd8ff' : s.abierta ? '#d8f0c8' : '#9aa0a6'}
          mat="cloth"
          solid={false}
        />
        <Label pos={[-3.3, 1.5, 2]} text={s.abierta ? '📇 Ficha abierta' : `📇 Consultar (${s.consultas})`} h={0.46} />
        <Block
          pos={[2.4, 0.78, 2]}
          size={[2.4, 0.08, 1.8]}
          color={f === -1 && s.x > 0 ? '#ffc4a8' : '#e5d7bd'}
          mat="cloth"
          solid={false}
        />
        <Label pos={[2.4, 1.5, 2]} text="Pasar ⏭" h={0.46} />
        {/* «Mazorca con examen»: la mazorca de espuma enseña la tarjeta y a veces se equivoca */}
        <group position={[-6.9, 0, -1.2]}>
          <Cyl pos={[0, 1.6, 0]} r={0.42} rTop={0.3} h={1.7} color="#f6d55c" mat="plastic" solid={false} />
          <Block pos={[-0.35, 1.3, 0.1]} size={[0.15, 1.4, 0.5]} color="#6aa842" mat="leaf" solid={false} />
          <Block pos={[0.35, 1.3, 0.1]} size={[0.15, 1.4, 0.5]} color="#6aa842" mat="leaf" solid={false} />
          <Ball pos={[-0.13, 2.05, 0.36]} r={0.07} color="#222222" />
          <Ball pos={[0.13, 2.05, 0.36]} r={0.07} color="#222222" />
          <Label pos={[0, 2.9, 0]} text={`🌽 «¿Será la ${'ABC'[s.dice]}?»`} h={0.42} />
        </group>
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Archivo = motor.Escena;
export const guia = motor.guia;
