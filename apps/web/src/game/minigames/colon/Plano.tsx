import { input } from '../../../core/input';
import { Block, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { columna, controles, cursor, duracion, Mesa, metas, mover, Puntero, wx, wz, xCol } from './comun';

/** Marcas de muralla: tres alturas y dos colores de piedra. */
const ALTURAS = [0.25, 0.55, 0.85],
  PIEDRAS = ['#c0392b', '#2a5c8a'];
const TRAMOS = 5;
interface Fragmento {
  /** índice en el recorrido: su marca izquierda es marcas[k] y la derecha marcas[k + 1] */
  k: number;
  volteado: boolean;
}
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  marcas: number[];
  sueltos: (Fragmento | null)[];
  puestos: number;
  planos: number;
  malos: number;
  desplazados: number;
  espera: number;
  aviso: string;
};
interface Params {
  volteados: number;
  semilla: number;
}
type Sesion = Motor<Params, Estado>;
function nuevoPlano(s: Estado, q: Params) {
  const tipos = [0, 1, 2, 3, 4, 5].sort(() => s.azar() - 0.5);
  // cinco marcas distintas; la del final es la del principio: el recorrido cierra sobre sí mismo
  s.marcas = [...tipos.slice(0, TRAMOS), tipos[0]];
  const sueltos = [1, 2, 3, 4].map((k) => ({ k, volteado: s.azar() < q.volteados }));
  s.sueltos = sueltos.sort(() => s.azar() - 0.5);
  s.puestos = 1;
}
/** Qué fragmento (y en qué sentido) sigue según la marca abierta. */
function siguiente(s: Estado) {
  const i = s.sueltos.findIndex((f) => f?.k === s.puestos);
  return { columna: i, girar: !!s.sueltos[i]?.volteado };
}
function colocar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 1;
  const c = columna(s.x, 4),
    f = s.sueltos[c],
    girar = s.y < 0;
  if (!f) {
    m.sumar(-10);
    s.malos++;
    s.aviso = 'Ahí ya no hay fragmento';
    return;
  }
  if (f.k !== s.puestos) {
    m.sumar(-25);
    s.malos++;
    s.aviso = 'Las marcas de la muralla no siguen en ese borde';
    return;
  }
  if (girar !== f.volteado) {
    // la garita queda mirando para adentro: el último tramo se corre y vuelve a la mesa
    m.sumar(-25);
    s.malos++;
    s.desplazados++;
    if (s.puestos > 1) {
      const hueco = s.sueltos.indexOf(null);
      s.puestos--;
      s.sueltos[hueco] = { k: s.puestos, volteado: s.azar() < 0.5 };
    }
    s.aviso = 'La garita quedó mirando para adentro: se corrieron los tramos';
    return;
  }
  s.sueltos[c] = null;
  s.puestos++;
  m.sumar(25);
  s.aviso = 'La muralla sigue';
  if (s.puestos >= TRAMOS) {
    s.planos++;
    m.sumar(50);
    s.aviso = '¡El recorrido cerró sobre sí mismo!';
    nuevoPlano(s, m.parametros);
  }
}
function Tramo({ x, z, izq, der, volteado }: { x: number; z: number; izq: number; der: number; volteado: boolean }) {
  const marca = (t: number, lado: number) => (
    <Block
      pos={[x + lado * 0.72, 0.85 + ALTURAS[t % 3] * 0.9, z]}
      size={[0.16, 0.18, 0.5]}
      color={PIEDRAS[Math.floor(t / 3)]}
      mat="stone"
      solid={false}
    />
  );
  return (
    <>
      <Block pos={[x, 0.76, z]} size={[1.6, 0.08, 1.2]} color="#e9e1c8" mat="cloth" solid={false} />
      <Block pos={[x, 1.2, z]} size={[1.3, 0.8, 0.3]} color="#a89f8c" mat="stone" solid={false} />
      <Block
        pos={[x, 1.85, z + (volteado ? -0.35 : 0.35)]}
        size={[0.34, 0.5, 0.34]}
        color="#b8b2a4"
        mat="stone"
        solid={false}
      />
      {marca(izq, -1)}
      {marca(der, 1)}
    </>
  );
}
const motor = defineMotor({
  id: 'colon.plano',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ruinas',
  guia: {
    goal: 'A/D elegí el fragmento cuya marca sigue la muralla abierta. W lo pone así, S lo gira. F coloca. La garita mira para afuera.',
    ...controles,
  },
  etapa: (p) => ({ volteados: 0.25 + p.dif * 0.35, semilla: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      marcas: [],
      sueltos: [],
      puestos: 1,
      planos: 0,
      malos: 0,
      desplazados: 0,
      espera: 0,
      aviso: '',
    };
    nuevoPlano(s, p);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) colocar(m);
    m.objetivo = `Tramo ${s.puestos + 1} de ${TRAMOS} · fragmento ${columna(s.x, 4) + 1} ${s.y < 0 ? 'girado' : 'así'}`;
    m.lineas = [
      'Buscá la marca que sigue el borde abierto; si está del otro lado, giralo',
      `Planos cerrados ${s.planos} · Errores ${s.malos}${s.aviso ? ` · ${s.aviso}` : ''}`,
    ];
    m.stats = { x: s.x, y: s.y, planos: s.planos, malos: s.malos, puestos: s.puestos, desplazados: s.desplazados };
  },
  bot(m) {
    const s = m.datos,
      n = siguiente(s);
    if (n.columna < 0) return;
    s.auto = true;
    s.x = xCol(n.columna, 4);
    s.y = n.girar ? -0.6 : 0.6;
    colocar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'El plano del castillo'} · Archivo de Santa Bárbara`}>
        <Label pos={[wx(0), 1, wz(0.95)]} text="Fragmentos sueltos" h={0.24} />
        {s.sueltos.map((f, c) =>
          f ? (
            <Tramo
              key={c}
              x={wx(xCol(c, 4))}
              z={wz(0.55)}
              izq={f.volteado ? s.marcas[f.k + 1] : s.marcas[f.k]}
              der={f.volteado ? s.marcas[f.k] : s.marcas[f.k + 1]}
              volteado={f.volteado}
            />
          ) : null,
        )}
        <Label pos={[wx(0), 1, wz(-0.05)]} text="Plano armado" h={0.24} />
        {Array.from({ length: s.puestos }, (_, k) => (
          <Tramo
            key={k}
            x={wx(xCol(k, TRAMOS))}
            z={wz(-0.5)}
            izq={s.marcas[k]}
            der={s.marcas[k + 1]}
            volteado={false}
          />
        ))}
        <Plate
          pos={[wx(xCol(Math.min(s.puestos, TRAMOS - 1), TRAMOS)), 2.6, wz(-0.5)]}
          text="Sigue aquí ▼"
          h={0.22}
          bg="#3b3f4a"
        />
        <Puntero x={s.x} y={s.y} color={s.y < 0 ? '#e57373' : '#f7dc80'} />
      </Mesa>
    );
  },
});
export const Plano = motor.Escena;
export const guia = motor.guia;
