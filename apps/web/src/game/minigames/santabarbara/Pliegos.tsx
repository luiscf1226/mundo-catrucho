import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { aviso, casilla, controles, cursor, duracion, ejeDe, entre, Mesa, metas, mover, revolver } from './comun';

const OPCIONES = 6;
/** Cuántos cuadritos de superficie tapa un pliego según la curva: plano 4, curva media 3, curva fuerte 2. */
const FORMAS = [
  { nombre: 'tubo', curva: 'sin curva', cubre: 4 },
  { nombre: 'cono', curva: 'curva media', cubre: 3 },
  { nombre: 'cabeza', curva: 'curva fuerte', cubre: 2 },
] as const;
interface Parte {
  forma: number;
  ancho: number;
  alto: number;
  hecha: boolean;
}
type Estado = ReturnType<typeof cursor> & {
  partes: Parte[];
  actual: number;
  opciones: number[];
  espera: number;
  mirando: number;
  forradas: number;
  huecos: number;
  sobras: number;
  gigantes: number;
  intentos: number;
  azar: () => number;
};
type Sesion = Motor<{ partes: number; curvas: number; ancho: number; seed: number }, Estado>;
const pliegos = (q: Parte) => Math.ceil((q.ancho * q.alto) / FORMAS[q.forma].cubre);
function opciones(m: Sesion) {
  const s = m.datos,
    q = s.partes[s.actual],
    bien = pliegos(q),
    area = q.ancho * q.alto;
  // trampas: contar hojas como si todo fuera plano, o redondear hacia abajo
  const c = new Set<number>([bien, Math.ceil(area / 4), Math.floor(area / FORMAS[q.forma].cubre)]);
  for (const d of [1, -1, 2, -2, 3, 4, 5, 6]) if (bien + d > 0) c.add(bien + d);
  s.opciones = revolver([...c].filter((n) => n > 0).slice(0, OPCIONES), s.azar);
  s.mirando = 0;
}
function gigante(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  s.partes = Array.from({ length: p.partes }, (_, i) => ({
    forma: i === p.partes - 1 ? Math.min(2, p.curvas) : entre(s.azar, 0, p.curvas),
    ancho: entre(s.azar, 2, p.ancho),
    alto: entre(s.azar, 1, 3),
    hecha: false,
  }));
  s.actual = 0;
  opciones(m);
}
function forrar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.intentos++;
  s.espera = 0.6;
  const q = s.partes[s.actual],
    n = s.opciones[casilla(s.x, OPCIONES)],
    bien = pliegos(q);
  if (n === bien) {
    q.hecha = true;
    s.forradas++;
    m.sumar(35);
    s.actual++;
    if (s.actual >= s.partes.length) {
      s.gigantes++;
      m.sumar(30);
      aviso('¡Gigante forrado sin huecos y con poco sobrante!', '🔥');
      gigante(m);
    } else opciones(m);
    return;
  }
  if (n < bien) {
    s.huecos++;
    m.sumar(-30);
    aviso('Faltan pliegos: en la curva cada hoja tapa menos y quedan huecos.', '🕳️');
  } else {
    s.sobras++;
    m.sumar(-20);
    aviso('Sobra papel: medí antes de recortar.', '📜');
  }
}
const motor = defineMotor({
  id: 'santabarbara.papel',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'feria',
  guia: {
    goal: 'Contá los cuadritos de la parte (ancho × alto). Un pliego tapa 4 en lo plano, 3 en curva media y 2 en curva fuerte. Elegí cuántos pliegos tapan todo con el menor sobrante y F forra la parte.',
    ...controles(),
  },
  etapa: (p) => ({
    partes: 3 + Math.round(p.dif * 2),
    curvas: p.dif < 0.3 ? 1 : 2,
    ancho: 4 + Math.round(p.dif * 2),
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    partes: [],
    actual: 0,
    opciones: [],
    espera: 0,
    mirando: 0,
    forradas: 0,
    huecos: 0,
    sobras: 0,
    gigantes: 0,
    intentos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.partes.length) gigante(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    if (input.take('fire')) forrar(m);
    const q = s.partes[s.actual];
    m.objetivo = 'Forrá cada parte sin huecos';
    m.lineas = [
      `Parte ${s.actual + 1}/${s.partes.length}: ${FORMAS[q.forma].nombre} ${q.ancho}×${q.alto}, ${FORMAS[q.forma].curva} · ${s.opciones[casilla(s.x, OPCIONES)]} pliegos`,
      `Forradas ${s.forradas} · Huecos ${s.huecos} · Sobras ${s.sobras} · Gigantes ${s.gigantes}`,
    ];
    m.stats = {
      x: s.x,
      forradas: s.forradas,
      huecos: s.huecos,
      sobras: s.sobras,
      gigantes: s.gigantes,
      intentos: s.intentos,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.mirando < 1.5 || !s.partes.length) return;
    s.auto = true;
    s.x = ejeDe(s.opciones.indexOf(pliegos(s.partes[s.actual])), OPCIONES);
    forrar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = casilla(s.x, OPCIONES),
      q = s.partes[s.actual];
    return (
      <Mesa titulo="Trinidad · papel para el gigante">
        {/* el molde: las partes de abajo hacia arriba */}
        <group position={[-4, 0.7, -1.4]}>
          {s.partes.map((p, i) => {
            const y = 0.3 + i * 0.55,
              color = p.hecha ? '#e76f51' : i === s.actual ? '#fdf0d5' : '#9c8f7c';
            return p.forma === 2 ? (
              <Ball key={i} pos={[0, y + 0.05, 0]} r={0.32} color={color} mat="cloth" />
            ) : (
              <Cyl
                key={i}
                pos={[0, y, 0]}
                r={0.4}
                rTop={p.forma === 1 ? 0.22 : 0.4}
                h={0.5}
                color={color}
                mat="cloth"
                solid={false}
                sides={10}
              />
            );
          })}
        </group>
        {/* la parte que toca, desenrollada en cuadritos */}
        {q &&
          Array.from({ length: q.ancho * q.alto }, (_, i) => (
            <Block
              key={i}
              pos={[
                -1.2 + ((i % q.ancho) - (q.ancho - 1) / 2) * 0.82,
                0.78,
                -0.4 + (Math.floor(i / q.ancho) - 1) * 0.82,
              ]}
              size={[0.76, 0.06, 0.76]}
              color={(i + Math.floor(i / q.ancho)) % 2 ? '#f4efe6' : '#e9e4d8'}
              mat="cloth"
              solid={false}
            />
          ))}
        {q && (
          <Label
            pos={[-1.2, 1.6, -2.4]}
            text={`${FORMAS[q.forma].nombre} · ${q.ancho}×${q.alto} · ${FORMAS[q.forma].curva} (${FORMAS[q.forma].cubre} por pliego)`}
            h={0.28}
          />
        )}
        {s.opciones.map((n, i) => {
          const x = -1 + ejeDe(i, OPCIONES) * 4.2;
          return (
            <group key={i}>
              <Block
                pos={[x, 0.78, 2.4]}
                size={[1.1, 0.08, 0.9]}
                color={i === k ? '#ffd166' : '#e9e4d8'}
                mat="cloth"
                solid={false}
              />
              <Label pos={[x, 1.15, 2.4]} text={`${n} 📜`} h={0.34} />
            </group>
          );
        })}
      </Mesa>
    );
  },
});
export const Pliegos = motor.Escena;
export const guia = motor.guia;
