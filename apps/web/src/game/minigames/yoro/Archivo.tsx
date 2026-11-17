import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, revolver, xDe } from './comun';

const TIPOS = ['Recibo', 'Horario', 'Foto'] as const;
const ICONO = ['🧾', '🕐', '📷'];
const COLOR = ['#f1faee', '#e9c46a', '#a8dadc'];
const TURNOS = ['mañana', 'tarde', 'noche'];
const PAGOS = ['L 1,20', 'L 1,50', 'L 1,80'];
/** Un papel de práctica (ficticio): tipo, día de mayo, turno y, en los recibos, el pago. */
type Papel = { tipo: number; dia: number; turno: number; pago: number };
type Ficha = { dia: number; turno: number; pago: number; contradice: boolean };
type Estado = ReturnType<typeof cursor> & {
  ficha: Ficha | null;
  papeles: Papel[];
  elegidos: number[];
  espera: number;
  listo: number;
  mirando: number;
  sostenidas: number;
  pendientes: number;
  fallas: number;
  sello: number;
  azar: () => number;
};
type Param = { contradiccion: number; pagos: boolean; papeles: number; seed: number };
type Sesion = Motor<Param, Estado>;
const FILAS = 2;
const COLUMNAS = 4;
/** ¿el papel apoya la ficha? Mismo día y turno; si se piden pagos, el recibo también debe cuadrar en el pago */
const apoya = (f: Ficha, p: Papel, pagos: boolean) =>
  p.dia === f.dia && p.turno === f.turno && (!pagos || p.tipo !== 0 || p.pago === f.pago);
/** ¿el papel contradice la ficha? Mismo día, mismo tipo de prueba, otro turno */
const contradice = (f: Ficha, p: Papel) => p.dia === f.dia && p.turno !== f.turno && p.tipo === 1;
function nueva(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    a = s.azar;
  const f: Ficha = {
    dia: 1 + Math.floor(a() * 6),
    turno: Math.floor(a() * 3),
    pago: Math.floor(a() * 3),
    contradice: a() < p.contradiccion,
  };
  const lista: Papel[] = TIPOS.map((_, t) => ({ tipo: t, dia: f.dia, turno: f.turno, pago: f.pago }));
  if (f.contradice) lista.push({ tipo: 1, dia: f.dia, turno: (f.turno + 1 + Math.floor(a() * 2)) % 3, pago: f.pago });
  // un recibo intruso: mismo día y turno, pero con otro pago
  if (p.pagos) lista.push({ tipo: 0, dia: f.dia, turno: f.turno, pago: (f.pago + 1 + Math.floor(a() * 2)) % 3 });
  while (lista.length < p.papeles) {
    // papeles de relleno: otro día (o mismo día y turno distinto, pero que no sea un horario)
    const tipo = Math.floor(a() * 3),
      otroDia = a() < 0.6 || tipo === 1;
    lista.push({
      tipo,
      dia: otroDia ? 1 + ((f.dia + Math.floor(a() * 5)) % 6) : f.dia,
      turno: otroDia ? Math.floor(a() * 3) : (f.turno + 1 + Math.floor(a() * 2)) % 3,
      pago: Math.floor(a() * 3),
    });
    const ultimo = lista[lista.length - 1];
    if (otroDia && ultimo.dia === f.dia) ultimo.dia = (f.dia % 6) + 1;
  }
  s.ficha = f;
  s.papeles = revolver(lista, a);
  s.elegidos = [];
  s.mirando = 0;
}
function cierra(m: Sesion, puntos: number, texto: string, icono: string) {
  const s = m.datos;
  m.sumar(puntos);
  useGame.getState().toast(texto, icono);
  s.listo = 1;
  s.ficha = null;
}
const indice = (s: Estado) => (s.y > 0 ? 0 : 1) * COLUMNAS + casilla(s.x, COLUMNAS);
function elegir(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    f = s.ficha,
    i = indice(s);
  if (!f || s.espera > 0 || s.listo > 0 || i >= s.papeles.length) return;
  s.espera = 0.35;
  if (s.elegidos.includes(i)) {
    s.elegidos = s.elegidos.filter((x) => x !== i);
    return;
  }
  s.elegidos.push(i);
  if (s.elegidos.length < 3) return;
  const papeles = s.elegidos.map((k) => s.papeles[k]);
  const tipos = new Set(papeles.map((x) => x.tipo));
  if (!papeles.every((x) => apoya(f, x, p.pagos)) || tipos.size < 3) {
    s.fallas++;
    s.elegidos = [];
    m.sumar(-25);
    useGame
      .getState()
      .toast(
        tipos.size < 3
          ? 'Faltó variedad: un recibo, un horario y una foto.'
          : 'Uno de esos papeles no cuadra con la ficha.',
        '📜',
      );
    return;
  }
  if (f.contradice) {
    s.fallas++;
    cierra(m, -40, 'En la mesa hay un horario que la contradice: tocaba dejarla pendiente.', '⚠️');
    return;
  }
  s.sostenidas++;
  cierra(m, 60, '¡Afirmación sostenida con tres pruebas!', '📜');
}
function pendiente(m: Sesion) {
  const s = m.datos,
    f = s.ficha;
  if (!f || s.espera > 0 || s.listo > 0) return;
  s.espera = 0.35;
  s.sello = 1.2;
  if (f.contradice) {
    s.pendientes++;
    cierra(m, 35, 'Bien: con una contradicción, la ficha queda pendiente.', '🗂️');
    return;
  }
  s.fallas++;
  s.elegidos = [];
  m.sumar(-25);
  useGame.getState().toast('Nada la contradice: buscá sus tres pruebas.', '🔎');
}
const motor = defineMotor({
  id: 'yoro.acuerdos',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'Cada ficha dice un día y un turno. Con F juntá un recibo, un horario y una foto que digan lo mismo. Si en la mesa hay un horario del mismo día con otro turno, E la deja pendiente. Papeles de práctica: nada se inventa.',
    ...controles('dejar pendiente'),
  },
  etapa: (p) => ({
    contradiccion: 0.25 + p.dif * 0.15,
    pagos: p.tema.variante === 'el-archivo-no-se-inventa',
    papeles: 6 + Math.round(p.dif * 2),
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    ficha: null,
    papeles: [],
    elegidos: [],
    espera: 0,
    listo: 0,
    mirando: 0,
    sostenidas: 0,
    pendientes: 0,
    fallas: 0,
    sello: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    if (!s.ficha && s.listo <= 0) nueva(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.sello = Math.max(0, s.sello - dt);
    s.mirando += dt;
    if (s.listo > 0) s.listo -= dt;
    if (input.take('use')) pendiente(m);
    if (input.take('fire')) elegir(m);
    const f = s.ficha,
      papel = s.papeles[indice(s)];
    m.objetivo = f
      ? `Ficha: ${f.dia} de mayo, turno de ${TURNOS[f.turno]}${p.pagos ? `, pago ${PAGOS[f.pago]}` : ''}`
      : 'Archivando…';
    m.lineas = [
      papel
        ? `${ICONO[papel.tipo]} ${TIPOS[papel.tipo]}: ${papel.dia} de mayo · ${TURNOS[papel.turno]}${p.pagos && papel.tipo === 0 ? ` · ${PAGOS[papel.pago]}` : ''} · En la ficha ${s.elegidos.length}/3`
        : `En la ficha ${s.elegidos.length}/3`,
      `Sostenidas ${s.sostenidas} · Pendientes ${s.pendientes} · Fallas ${s.fallas}`,
    ];
    m.stats = {
      x: s.x,
      sostenidas: s.sostenidas,
      pendientes: s.pendientes,
      fallas: s.fallas,
      elegidos: s.elegidos.length,
    };
  },
  bot(m) {
    const s = m.datos,
      p = m.parametros,
      f = s.ficha;
    if (!f || s.espera > 0 || s.listo > 0 || s.mirando < 1.2) return;
    s.auto = true;
    if (s.papeles.some((x) => contradice(f, x))) {
      pendiente(m);
      return;
    }
    const tiene = new Set(s.elegidos.map((k) => s.papeles[k].tipo));
    const i = s.papeles.findIndex((x, k) => !s.elegidos.includes(k) && !tiene.has(x.tipo) && apoya(f, x, p.pagos));
    if (i < 0) return;
    s.x = xDe(i % COLUMNAS, COLUMNAS);
    s.y = i < COLUMNAS ? 0.6 : -0.6;
    elegir(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      p = m.parametros,
      f = s.ficha,
      sel = indice(s);
    return (
      <Mesa titulo="Archivo de la jornada · papeles de práctica">
        {s.papeles.map((x, i) => {
          const fila = Math.floor(i / COLUMNAS),
            col = i % COLUMNAS,
            pos: [number, number, number] = [-4.2 + col * 2.1, 0.74, -1.6 + fila * 2.3],
            elegido = s.elegidos.includes(i);
          return (
            <group key={i}>
              <Block
                pos={pos}
                size={[1.8, 0.04, 1.9]}
                color={i === sel ? '#ffd166' : elegido ? '#57cc99' : COLOR[x.tipo]}
                mat="cloth"
                solid={false}
              />
              <Label
                pos={[pos[0], 1.35, pos[2]]}
                text={`${ICONO[x.tipo]} ${TIPOS[x.tipo]}\n${x.dia} may · ${TURNOS[x.turno]}${p.pagos && x.tipo === 0 ? `\n${PAGOS[x.pago]}` : ''}`}
                h={0.26}
              />
            </group>
          );
        })}
        <Label
          pos={[-1, 3.2, -2.9]}
          text={
            f
              ? `📜 ${f.dia} de mayo · turno de ${TURNOS[f.turno]}${p.pagos ? ` · ${PAGOS[f.pago]}` : ''}`
              : '🗂️ Siguiente ficha…'
          }
          h={0.4}
        />
        {s.sello > 0 && (
          <Label
            pos={[2.4, 2.4 + s.sello * 0.4, 0]}
            text={p.pagos ? '🎩 PENDIENTE (hasta el sombrero)' : 'PENDIENTE'}
            h={0.4}
          />
        )}
      </Mesa>
    );
  },
});
export const Archivo = motor.Escena;
export const guia = motor.guia;
