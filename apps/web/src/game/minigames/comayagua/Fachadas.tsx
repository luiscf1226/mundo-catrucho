// Alzado colonial: recortes de fotos (forma + color) a su lugar en la fachada. La foto 1 da las formas y la 2 los
// colores; solo un hueco cumple las dos. Un recorte repetido se descarta: si lo pegás, se invalida el alzado.
import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { acercar, cursor, haciaIndice, indice, metasLineales, moverCursor, reloj, Taller, texto, turno } from './comun';

type Forma = 'ventana' | 'balcon' | 'arco' | 'puerta';
const FORMAS: Forma[] = ['ventana', 'balcon', 'arco'];
const NOMBRE: Record<Forma, string> = { ventana: 'Ventana', balcon: 'Balcón', arco: 'Arco', puerta: 'Puerta' };
const COLORES: [string, string][] = [
  ['azul', '#2a6f97'],
  ['verde', '#3d8b40'],
  ['café', '#8a5a32'],
];
const FILAS = 2;
type Pieza = { forma: Forma; color: number };
type Recorte = Pieza & { hueco: number };
type Estado = {
  c: ReturnType<typeof cursor>;
  cols: number;
  plano: Pieza[];
  puesto: boolean[];
  cola: Recorte[];
  listo: number;
  azar: () => number;
  espera: number;
  ayuda: boolean;
  pegados: number;
  errados: number;
  descartes: number;
  invalidas: number;
  fachadas: number;
  aviso: string;
};
type Param = { cols: number; repetidos: number; nombre: string; semilla: number };
type Sesion = Motor<Param, Estado>;
const hueco = (s: Estado) => indice(-s.c.y, FILAS) * s.cols + indice(s.c.x, s.cols);

function fachada(s: Estado, p: Param) {
  s.cols = p.cols;
  const n = s.cols * FILAS;
  // cada pieza (forma + color) es única: así las dos fotos juntas dicen dónde va cada recorte
  const todas: Pieza[] = [];
  for (const forma of FORMAS) for (let color = 0; color < COLORES.length; color++) todas.push({ forma, color });
  const mezcladas = todas.sort(() => s.azar() - 0.5);
  const puerta = s.cols + Math.floor(s.cols / 2);
  let k = 0;
  s.plano = Array.from({ length: n }, (_, i): Pieza => (i === puerta ? { forma: 'puerta', color: 2 } : mezcladas[k++]));
  s.puesto = Array.from({ length: n }, () => false);
  const cola: Recorte[] = s.plano.map((pz, i) => ({ ...pz, hueco: i }));
  cola.sort(() => s.azar() - 0.5);
  for (let j = 0; j < p.repetidos; j++) {
    const i = 2 + Math.floor(s.azar() * (cola.length - 2));
    cola.splice(i, 0, { ...cola[Math.floor(s.azar() * i)] });
  }
  s.cola = cola;
}
function pegar(m: Sesion) {
  const s = m.datos;
  const r = s.cola[0];
  if (!r || s.listo > 0) return;
  const h = hueco(s);
  if (s.puesto[r.hueco]) {
    s.invalidas++;
    m.sumar(-20);
    s.puesto = s.puesto.map(() => false);
    s.cola = s.plano.map((pz, i) => ({ ...pz, hueco: i })).sort(() => s.azar() - 0.5);
    s.aviso = '¡Ese recorte estaba repetido! El alzado se invalida y volvés a empezar. −20';
    return;
  }
  if (h !== r.hueco) {
    s.errados++;
    m.sumar(-10);
    s.aviso = s.puesto[h] ? 'Ese hueco ya está lleno.' : 'No coincide con las dos fotos. −10';
    return;
  }
  s.puesto[h] = true;
  s.pegados++;
  s.cola.shift();
  m.sumar(15);
  s.aviso = `${NOMBRE[r.forma]} ${COLORES[r.color][0]} en su sitio. +15`;
  if (s.puesto.every(Boolean)) {
    s.fachadas++;
    m.sumar(40);
    s.aviso = '¡El alzado coincide con las dos fotos! +40';
    s.listo = 1.4;
  }
}
function descartar(m: Sesion) {
  const s = m.datos;
  const r = s.cola[0];
  if (!r || s.listo > 0) return;
  s.descartes++;
  s.cola.shift();
  // repetido: su pieza ya está pegada o viene otra igual en la pila
  if (s.puesto[r.hueco] || s.cola.some((x) => x.hueco === r.hueco)) {
    m.sumar(10);
    s.aviso = '¡Bien visto, ese ya estaba! +10';
  } else {
    m.sumar(-5);
    s.cola.push(r);
    s.aviso = 'Ese sí servía: vuelve al final de la pila. −5';
  }
}
/** Forma de la pieza dibujada de frente (en el plano x-y), centrada en el hueco. */
function Figura({ forma, color, s = 1, gris = false }: { forma: Forma; color: string; s?: number; gris?: boolean }) {
  const c = gris ? '#8d8d8d' : color;
  const marco = gris ? '#5d5d5d' : '#f4f1e8';
  return (
    <group scale={s}>
      {forma === 'puerta' ? (
        <Block pos={[0, -0.15, 0]} size={[0.75, 1.3, 0.05]} color={c} mat="wood" solid={false} cast={false} />
      ) : (
        <Block pos={[0, 0, 0]} size={[0.62, 0.9, 0.05]} color={c} mat="wood" solid={false} cast={false} />
      )}
      {forma === 'arco' && (
        <group rotation-x={Math.PI / 2}>
          <Cyl pos={[0, 0.0, -0.45]} r={0.31} h={0.05} color={c} mat="wood" solid={false} cast={false} sides={12} />
        </group>
      )}
      {forma === 'ventana' && (
        <>
          <Block pos={[0, 0, 0.03]} size={[0.05, 0.9, 0.02]} color={marco} mat="wood" solid={false} cast={false} />
          <Block pos={[0, 0, 0.03]} size={[0.62, 0.05, 0.02]} color={marco} mat="wood" solid={false} cast={false} />
        </>
      )}
      {forma === 'balcon' && (
        <>
          <Block
            pos={[0, -0.48, 0.18]}
            size={[0.95, 0.06, 0.36]}
            color={gris ? '#6d6d6d' : '#3a3a3a'}
            mat="metal"
            solid={false}
            cast={false}
          />
          <Block
            pos={[0, -0.28, 0.34]}
            size={[0.95, 0.04, 0.04]}
            color={gris ? '#6d6d6d' : '#3a3a3a'}
            mat="metal"
            solid={false}
            cast={false}
          />
        </>
      )}
    </group>
  );
}
const motor = defineMotor({
  id: 'comayagua.fachadas',
  fondo: 'pueblo',
  guia: {
    goal: 'La foto 1 da las formas y la 2 los colores: pegá cada recorte donde cumple las dos. Si se repite, descartalo.',
    keys: [
      ['WASD / flechas', 'elegir hueco de la fachada'],
      ['Mouse / stick derecho', 'apuntar el hueco'],
      ['F / clic / RT', 'pegar el recorte'],
      ['E / mando X', 'descartar repetido'],
    ],
    touch: [
      ['Palanca / arrastrá', 'elegir hueco'],
      ['🎯', 'pegar'],
      ['E', 'descartar repetido'],
    ],
  },
  etapa: (p) => ({
    cols: p.dif < 0.5 ? 4 : 5,
    repetidos: 1 + Math.round(p.dif * 2),
    nombre: texto(p.tema.nombre, 'Alzado de la calle real'),
    semilla: p.seed,
  }),
  metas: metasLineales(90, 210, 330, 50),
  duracion: reloj(80, 10),
  crear: (p): Estado => {
    const s: Estado = {
      c: cursor(),
      cols: p.cols,
      plano: [],
      puesto: [],
      cola: [],
      listo: 0,
      azar: rng(p.semilla),
      espera: 0.5,
      ayuda: false,
      pegados: 0,
      errados: 0,
      descartes: 0,
      invalidas: 0,
      fachadas: 0,
      aviso: 'Mirá las dos fotos antes de pegar.',
    };
    fachada(s, p);
    return s;
  },
  actualizar: (m, dt) => {
    const s = m.datos;
    moverCursor(s.c, dt, 1.1);
    if (input.take('fire')) pegar(m);
    if (input.take('use')) descartar(m);
    if (s.listo > 0) {
      s.listo -= dt * (s.ayuda ? 1.5 : 1);
      if (s.listo <= 0) fachada(s, m.parametros);
    }
    s.ayuda = false;
    const r = s.cola[0];
    m.objetivo = s.aviso;
    m.lineas = [
      r ? `Recorte: ${NOMBRE[r.forma]} ${COLORES[r.color][0]} · quedan ${s.cola.length}` : 'Fachada lista',
      `Fachadas ${s.fachadas} · Pegados ${s.pegados} · Descartes ${s.descartes}`,
    ];
    m.stats = {
      pegados: s.pegados,
      errados: s.errados,
      descartes: s.descartes,
      invalidas: s.invalidas,
      fachadas: s.fachadas,
      hueco: hueco(s),
    };
  },
  bot: (m, dt, actor) => {
    const s = m.datos;
    if (actor === 'compa') {
      s.ayuda = true;
      return;
    }
    const r = s.cola[0];
    if (!r || s.listo > 0) return;
    if (s.puesto[r.hueco]) {
      if (turno(s, dt, 0.9)) descartar(m);
      return;
    }
    const x = haciaIndice(r.hueco % s.cols, s.cols),
      y = -haciaIndice(Math.floor(r.hueco / s.cols), FILAS);
    s.c.x = acercar(s.c.x, x, dt * 1.6);
    s.c.y = acercar(s.c.y, y, dt * 1.6);
    s.c.auto = true;
    if (s.c.x === x && s.c.y === y && turno(s, dt, 0.8)) pegar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos;
    const h = hueco(s);
    const r = s.cola[0];
    const ancho = 1.25;
    const x0 = -1.9 - ((s.cols - 1) * ancho) / 2;
    const pos = (i: number): [number, number] => [x0 + (i % s.cols) * ancho, 3.2 - Math.floor(i / s.cols) * 1.6];
    const foto = (cx: number, titulo: string, gris: boolean) => (
      <group position={[cx, 0, 1.4]}>
        <Block pos={[0, 1.15, 0]} size={[2.7, 1.5, 0.06]} color="#f4f1e8" mat="cloth" solid={false} />
        <Block pos={[0, 0.2, -0.2]} size={[0.08, 0.8, 0.08]} color="#5a3d26" mat="wood" solid={false} cast={false} />
        {s.plano.map((pz, i) => (
          <group
            key={i}
            position={[-1.0 + (i % s.cols) * (2 / Math.max(1, s.cols - 1)), 1.5 - Math.floor(i / s.cols) * 0.62, 0.05]}
          >
            {gris ? (
              <Figura forma={pz.forma} color="#888" s={0.42} gris />
            ) : (
              <Block
                pos={[0, 0, 0]}
                size={[0.3, 0.38, 0.03]}
                color={COLORES[pz.color][1]}
                mat="plastic"
                solid={false}
                cast={false}
              />
            )}
          </group>
        ))}
        <Label pos={[0, 2.15, 0.05]} text={titulo} h={0.24} bg="#5b3a24" />
      </group>
    );
    return (
      <Taller nombre={m.parametros.nombre} aviso="WASD hueco · F pegar · E descartar repetido">
        <Block
          pos={[-1.9, 2.4, -2.6]}
          size={[s.cols * ancho + 0.8, 3.6, 0.3]}
          color="#f2e6cf"
          mat="stucco"
          solid={false}
        />
        <Block
          pos={[-1.9, 4.35, -2.5]}
          size={[s.cols * ancho + 1.1, 0.3, 0.6]}
          color="#b5523b"
          mat="roof"
          solid={false}
        />
        {s.plano.map((pz, i) => {
          const [x, y] = pos(i);
          return (
            <group key={i} position={[x, y, -2.4]}>
              {s.puesto[i] ? (
                <Figura forma={pz.forma} color={COLORES[pz.color][1]} />
              ) : (
                <Block
                  pos={[0, 0, 0]}
                  size={[0.7, 1, 0.03]}
                  color={i === h ? '#ffd166' : '#d9ccb0'}
                  mat={i === h ? 'neon' : 'stucco'}
                  solid={false}
                  cast={false}
                />
              )}
            </group>
          );
        })}
        {r && s.listo <= 0 && (
          <group position={[pos(h)[0], pos(h)[1], -1.9]}>
            <Figura forma={r.forma} color={COLORES[r.color][1]} s={0.8} />
            <Ball pos={[0.42, 0.5, 0.1]} r={0.06} color="#c0392b" cast={false} />
          </group>
        )}
        {foto(-5.6, 'Foto 1 · formas', true)}
        {foto(2.4, 'Foto 2 · colores', false)}
        {r && (
          <Label pos={[-1.9, 0.9, 1.6]} text={`✂ ${NOMBRE[r.forma]} ${COLORES[r.color][0]}`} h={0.32} bg="#7a3b1f" />
        )}
      </Taller>
    );
  },
});
export const Fachadas = motor.Escena;
export const guia = motor.guia;
