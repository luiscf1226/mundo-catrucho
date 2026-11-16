// «Soportes de Yuscarán»: maqueta de galerías. Repartí los puntales antes de liberar los bloques; el bloque que se
// retira pasa su carga a la bóveda vecina. Cada puntal aguanta dos bloques.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, fila, Mesa, metas, mover, Puntero } from './comun';

const BOVEDAS = 5,
  AGUANTA = 2;
type Estado = ReturnType<typeof cursor> & {
  carga: number[];
  puntales: number[];
  quedan: number;
  retirada: number;
  hacia: number;
  estables: number;
  derrumbes: number;
  liberando: number;
  sorteo: () => number;
};
type Parametros = { maximo: number; diagnostico: boolean; semilla: number };
type Sesion = Motor<Parametros, Estado>;
const pide = (carga: number) => Math.ceil(carga / AGUANTA);
function plano(s: Estado, par: Parametros) {
  const carga = Array.from({ length: BOVEDAS }, () => 1 + Math.floor(s.sorteo() * par.maximo));
  s.retirada = Math.floor(s.sorteo() * BOVEDAS);
  s.hacia = s.retirada === 0 ? 1 : s.retirada === BOVEDAS - 1 ? BOVEDAS - 2 : s.retirada + (s.sorteo() < 0.5 ? -1 : 1);
  carga[s.hacia] += carga[s.retirada];
  carga[s.retirada] = 0;
  s.carga = carga;
  if (par.diagnostico) {
    // los puntales ya están; una o dos bóvedas quedaron cortas y hay que encontrarlas por las lecturas
    s.puntales = carga.map(pide);
    let cortas = 0;
    for (const i of [s.hacia, ...[0, 1, 2, 3, 4].filter((i) => i !== s.hacia)]) {
      if (cortas < 1 + (par.maximo > 4 ? 1 : 0) && s.puntales[i] > 0) {
        s.puntales[i]--;
        cortas++;
      }
    }
    s.quedan = cortas;
  } else {
    s.puntales = carga.map(() => 0);
    s.quedan = carga.reduce((a, c) => a + pide(c), 0);
  }
}
function liberar(m: Sesion) {
  const s = m.datos,
    cortas = s.carga.filter((c, i) => s.puntales[i] < pide(c)).length;
  // en el diagnóstico solo faltan uno o dos puntales: leer las fuerzas y liberar lleva más rato y paga menos
  s.liberando = m.parametros.diagnostico ? 2.5 : 1.5;
  if (cortas) {
    s.derrumbes += cortas;
    m.sumar(-40 * cortas);
    useGame.getState().toast(`Se cedió ${cortas === 1 ? 'una bóveda' : `${cortas} bóvedas`} de la maqueta.`, '⛏️');
  } else {
    s.estables++;
    m.sumar(m.parametros.diagnostico ? 40 : 80);
    useGame.getState().toast('¡Modelo estable!', '⛏️');
  }
}
function actuar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.liberando > 0) return;
  s.espera = 0.6;
  const b = casilla(s.x, BOVEDAS),
    f = fila(s.y);
  if (f === 0) {
    m.sumar(-10);
    return;
  }
  if (f === -1) {
    if (m.parametros.diagnostico) {
      m.sumar(-25);
      useGame.getState().toast('Primero diagnosticá: no retirés nada.', '📏');
    } else if (s.puntales[b] > 0) {
      // quitar devuelve los 5 puntos de ponerlo: alternar no suma
      s.puntales[b]--;
      s.quedan++;
      m.sumar(-5);
    }
    return;
  }
  if (s.quedan <= 0) return;
  s.puntales[b]++;
  s.quedan--;
  m.sumar(5);
  if (s.quedan === 0) liberar(m);
}
const motor = defineMotor({
  id: 'elparaiso.mina',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'cueva',
  guia: {
    goal: 'A/D elegí la bóveda. W + F poné un puntal; S + F quitalo. Cada puntal aguanta 2 bloques; contá la carga que llega de la vecina. Con el último puntal se liberan los bloques.',
    ...controles,
  },
  etapa: (p) => ({
    maximo: 3 + Math.round(p.dif * 2),
    diagnostico: p.tema.variante === 'la-mina-cabe-en-una-mesa',
    semilla: p.seed + 7,
  }),
  metas,
  duracion,
  crear: (par) => {
    const s: Estado = {
      ...cursor(),
      carga: [],
      puntales: [],
      quedan: 0,
      retirada: 0,
      hacia: 0,
      estables: 0,
      derrumbes: 0,
      liberando: 0,
      sorteo: rng(par.semilla),
    };
    plano(s, par);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    if (s.liberando > 0) {
      s.liberando -= dt;
      if (s.liberando <= 0) plano(s, m.parametros);
    }
    if (input.take('fire')) actuar(m);
    const b = casilla(s.x, BOVEDAS);
    m.objetivo = m.parametros.diagnostico
      ? `Encontrá la bóveda sobrecargada · faltan ${s.quedan} puntales`
      : `Repartí ${s.quedan} puntales · el bloque de B${s.retirada + 1} pasa a B${s.hacia + 1}`;
    m.lineas = [
      `Bóveda B${b + 1}: carga ${s.carga[b]} · puntales ${s.puntales[b]} · fuerza ${s.carga[b] ? Math.round((s.carga[b] / Math.max(1, s.puntales[b] * AGUANTA)) * 100) : 0}%`,
      `Modelos estables ${s.estables} · Bóvedas cedidas ${s.derrumbes}`,
    ];
    m.stats = { x: s.x, estables: s.estables, derrumbes: s.derrumbes, quedan: s.quedan };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.liberando > 0) return;
    const b = s.carga.findIndex((c, i) => s.puntales[i] < pide(c));
    if (b < 0) return;
    s.auto = true;
    s.x = centro(b, BOVEDAS);
    s.y = 0.8;
    actuar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      b = casilla(s.x, BOVEDAS);
    return (
      <Mesa
        titulo={
          m.parametros.diagnostico
            ? 'La mina cabe en una mesa · Lecturas de fuerza'
            : 'Plata bajo Yuscarán · Maqueta de galerías'
        }
      >
        {s.carga.map((c, i) => {
          const x = -1 + centro(i, BOVEDAS) * 4.6,
            corta = s.puntales[i] < pide(c),
            cedio = s.liberando > 0 && corta,
            fuerza = c ? Math.round((c / Math.max(1, s.puntales[i] * AGUANTA)) * 100) : 0;
          return (
            <group key={i} position={[x, cedio ? -0.5 : 0, -0.4]}>
              <Block pos={[-0.7, 1.4, 0]} size={[0.25, 1.3, 1.2]} color="#8c8378" mat="stone" solid={false} />
              <Block pos={[0.7, 1.4, 0]} size={[0.25, 1.3, 1.2]} color="#8c8378" mat="stone" solid={false} />
              <Block
                pos={[0, 2.15, 0]}
                size={[1.7, 0.22, 1.2]}
                color={i === b ? '#c9b27a' : '#a59d92'}
                mat="stone"
                solid={false}
              />
              {Array.from({ length: Math.min(c, 9) }, (_, k) => (
                <Block
                  key={k}
                  pos={[((k % 3) - 1) * 0.45, 2.45 + Math.floor(k / 3) * 0.32, 0]}
                  size={[0.4, 0.28, 0.6]}
                  color="#6b6f75"
                  mat="metal"
                  solid={false}
                />
              ))}
              {Array.from({ length: s.puntales[i] }, (_, k) => (
                <Block
                  key={`p${k}`}
                  pos={[(k - (s.puntales[i] - 1) / 2) * 0.28, 1.4, 0.3]}
                  size={[0.1, 1.3, 0.1]}
                  color="#b07a45"
                  mat="wood"
                  solid={false}
                />
              ))}
              <Label
                pos={[0, 1, 1]}
                text={m.parametros.diagnostico ? `${fuerza}%` : `${c}▪ ${s.puntales[i]}⛏`}
                h={0.4}
                fg={m.parametros.diagnostico && fuerza > 100 ? '#ff9678' : undefined}
              />
              <Label
                pos={[0, 3.4, 0]}
                text={i === s.retirada ? `B${i + 1} → B${s.hacia + 1}` : `B${i + 1}`}
                h={0.36}
                fg={i === s.retirada ? '#ffe066' : undefined}
              />
            </group>
          );
        })}
        <Label pos={[-1, 0.9, 3.4]} text={`Puntales en mano: ${s.quedan}`} h={0.42} />
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Mina = motor.Escena;
export const guia = motor.guia;
