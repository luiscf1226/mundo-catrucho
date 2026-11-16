// «Expedientes de Las Manos»: tablero de aduana simulado. Primero el sello, después la fila según documento y carga.
// Si mandás un camión a la fila equivocada, retrocede hasta la bahía de maniobra y la aduana espera.
import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, centro, controles, cursor, duracion, fila, Mesa, metas, mover, Puntero } from './comun';

const FILAS = ['Perecederos', 'Carga seca', 'Tránsito/vacíos'];
const COLOR = ['#5fb36b', '#d9a35b', '#6f9fd8'];
type Camion = { doc: 'Importación' | 'Tránsito'; carga: 'Perecedero' | 'Seca' | 'Vacío'; sello: boolean };
type Estado = ReturnType<typeof cursor> & {
  camion: Camion;
  llega: number;
  bahia: number;
  enFila: number[];
  despachos: number;
  seguidos: number;
  completos: number;
  errores: number;
  sorteo: () => number;
};
type Parametros = { vacios: boolean; semilla: number };
type Sesion = Motor<Parametros, Estado>;
export const filaDe = (c: Camion) =>
  c.doc === 'Tránsito' || c.carga === 'Vacío' ? 2 : c.carga === 'Perecedero' ? 0 : 1;
function nuevo(s: Estado, par: Parametros): Camion {
  const r = s.sorteo();
  return {
    doc: s.sorteo() < 0.3 ? 'Tránsito' : 'Importación',
    carga: par.vacios && r < 0.25 ? 'Vacío' : r < 0.6 ? 'Perecedero' : 'Seca',
    sello: false,
  };
}
function actuar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.llega > 0) return;
  s.espera = 0.5;
  if (s.bahia > 0) {
    m.sumar(-10);
    return;
  }
  const f = fila(s.y);
  if (f === 0) {
    m.sumar(-10);
    return;
  }
  if (f === 1) {
    if (s.camion.sello) m.sumar(-10);
    s.camion.sello = true;
    return;
  }
  if (!s.camion.sello) {
    s.errores++;
    m.sumar(-30);
    useGame.getState().toast('El sello va antes: sin sello no se despacha.', '📄');
    return;
  }
  const elegida = casilla(s.x, 3);
  if (elegida !== filaDe(s.camion)) {
    s.errores++;
    s.seguidos = 0;
    s.bahia = 3;
    m.sumar(-25);
    useGame.getState().toast('Fila equivocada: el camión retrocede hasta la bahía de maniobra.', '🚛');
    return;
  }
  s.enFila[elegida] = Math.min(4, s.enFila[elegida] + 1);
  s.despachos++;
  s.seguidos++;
  m.sumar(30);
  if (s.seguidos % 5 === 0) {
    s.completos++;
    m.sumar(50);
  }
  s.camion = nuevo(s, m.parametros);
  s.llega = 1;
}
const motor = defineMotor({
  id: 'elparaiso.fronterafila',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'montana',
  guia: {
    goal: 'W + F sellá el documento. Después S, A/D elegí la fila y F mandá el camión: tránsito y vacíos a la derecha, perecederos a la izquierda, carga seca al centro.',
    ...controles,
  },
  etapa: (p) => ({ vacios: p.dif >= 0.5, semilla: p.seed + 17 }),
  metas,
  duracion,
  crear: (par) => {
    const s: Estado = {
      ...cursor(),
      camion: { doc: 'Importación', carga: 'Seca', sello: false },
      llega: 0,
      bahia: 0,
      enFila: [0, 0, 0],
      despachos: 0,
      seguidos: 0,
      completos: 0,
      errores: 0,
      sorteo: rng(par.semilla),
    };
    s.camion = nuevo(s, par);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.llega = Math.max(0, s.llega - dt);
    s.bahia = Math.max(0, s.bahia - dt);
    // las filas avanzan solas: cada tanto sale un camión despachado
    if (Math.floor(m.tiempo / 3) !== Math.floor((m.tiempo - dt) / 3))
      s.enFila = s.enFila.map((n) => Math.max(0, n - 1));
    if (input.take('fire')) actuar(m);
    const c = s.camion;
    m.objetivo = `${c.doc} · ${c.carga} · ${c.sello ? 'sellado ✓' : 'sin sello'}`;
    m.lineas = [
      `${fila(s.y) === 1 ? 'Sello' : fila(s.y) === -1 ? `Fila: ${FILAS[casilla(s.x, 3)]}` : 'Subí al sello o bajá a las filas'} · Bahía ${s.bahia > 0 ? `ocupada ${s.bahia.toFixed(1)} s` : 'libre'}`,
      `Despachados ${s.despachos} · Convoyes completos ${s.completos} · Errores ${s.errores}`,
    ];
    m.stats = { x: s.x, despachos: s.despachos, errores: s.errores, completos: s.completos };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.llega > 0 || s.bahia > 0) return;
    s.auto = true;
    if (!s.camion.sello) s.y = 0.8;
    else {
      s.y = -0.8;
      s.x = centro(filaDe(s.camion), 3);
    }
    actuar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      f = fila(s.y),
      sel = casilla(s.x, 3),
      c = s.camion;
    return (
      <Mesa titulo="El sello va antes · Aduana de juguete">
        {FILAS.map((nombre, i) => {
          const x = -1 + centro(i, 3) * 4.6;
          return (
            <group key={i} position={[x, 0, 0]}>
              <Block
                pos={[0, 0.73, -1]}
                size={[2.6, 0.04, 4.6]}
                color={f === -1 && sel === i ? '#fff2a8' : COLOR[i]}
                mat="asphalt"
                solid={false}
              />
              <Label pos={[0, 1.2, 1.6]} text={nombre} h={0.34} />
              {Array.from({ length: s.enFila[i] }, (_, k) => (
                <Block
                  key={k}
                  pos={[0, 1, -3 + k * 1.05]}
                  size={[0.7, 0.5, 0.9]}
                  color="#e8e8e8"
                  mat="metal"
                  solid={false}
                />
              ))}
            </group>
          );
        })}
        <group position={s.bahia > 0 ? [-5.2, 0, 2.2] : [-1 + (s.llega > 0 ? -3 * s.llega : 0), 0, 3]}>
          <Block
            pos={[0, 1.1, 0]}
            size={[1.6, 0.8, 0.9]}
            color={c.carga === 'Perecedero' ? '#5fb36b' : c.carga === 'Seca' ? '#d9a35b' : '#bbbbbb'}
            mat="metal"
            solid={false}
          />
          <Block pos={[1.05, 1, 0]} size={[0.5, 0.6, 0.8]} color="#c0392b" mat="metal" solid={false} />
          <Label pos={[0, 2.1, 0]} text={`📄 ${c.doc} · ${c.carga}${c.sello ? ' · ✅' : ''}`} h={0.4} />
        </group>
        <Block
          pos={[2.8, 1.1, 2.9]}
          size={[0.6, 0.5, 0.6]}
          color={f === 1 ? '#ffe066' : '#8d6e63'}
          mat="wood"
          solid={false}
        />
        <Label pos={[2.8, 1.7, 2.9]} text="Sello" h={0.38} />
        <Block
          pos={[-5.2, 0.73, 2.6]}
          size={[1.4, 0.04, 1.6]}
          color={s.bahia > 0 ? '#ff9678' : '#b8c4c9'}
          mat="concrete"
          solid={false}
        />
        <Label pos={[-5.2, 1.2, 2.6]} text={s.bahia > 0 ? 'Retrocediendo a la bahía' : 'Bahía libre'} h={0.34} />
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Frontera = motor.Escena;
export const guia = motor.guia;
