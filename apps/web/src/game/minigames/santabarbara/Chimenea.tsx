import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { aviso, casilla, controles, cursor, duracion, ejeDe, entre, Mesa, metas, mover } from './comun';

const FUERZAS = 12;
const COLORES = ['#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#8338ec', '#ff006e'];
interface Seccion {
  /** peso del papel y la madera de esta sección */
  peso: number;
  mojada: boolean;
  /** variante: brazo que saluda (+1) o tenis en la base (+2) */
  extra: number;
  /** fuerza de la costilla que se le puso (0 = falta) */
  costilla: number;
}
type Estado = ReturnType<typeof cursor> & {
  secciones: Seccion[];
  /** índice de la sección que toca (se arma del remate hacia abajo) */
  actual: number;
  /** lo que ya pesa encima de la unión que toca: secciones de arriba y costillas de más */
  carga: number;
  quema: number;
  limpia: boolean;
  espera: number;
  mirando: number;
  justas: number;
  gruesas: number;
  derrumbes: number;
  figuras: number;
  intentos: number;
  azar: () => number;
};
type Sesion = Motor<{ secciones: number; mojadas: boolean; tenis: boolean; seed: number }, Estado>;
const pesoDe = (c: Seccion) => c.peso * (c.mojada ? 2 : 1) + c.extra;
function figura(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  s.secciones = Array.from({ length: p.secciones }, () => ({
    peso: entre(s.azar, 1, 3),
    mojada: p.mojadas && s.azar() < 0.3,
    extra: 0,
    costilla: 0,
  }));
  if (p.tenis) {
    s.secciones[0].extra = 2;
    s.secciones[entre(s.azar, 1, p.secciones - 1)].extra = 1;
  }
  // la base nunca pide más fuerza de la que hay en el banco de costillas
  for (let total = s.secciones.reduce((a, c) => a + pesoDe(c), 0); total > FUERZAS - 1; ) {
    const c = s.secciones.find((x) => x.mojada) ?? s.secciones.find((x) => x.peso > 1);
    if (!c) break;
    if (c.mojada) c.mojada = false;
    else c.peso--;
    total = s.secciones.reduce((a, x) => a + pesoDe(x), 0);
  }
  s.actual = p.secciones - 1;
  s.carga = 0;
  s.limpia = true;
  s.mirando = 0;
}
/** Lo que tiene que aguantar la costilla de la sección que toca. */
const necesita = (s: Estado) => s.carga + pesoDe(s.secciones[s.actual]);
function encajar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.quema > 0) return;
  s.intentos++;
  s.espera = 0.6;
  const fuerza = casilla(s.x, FUERZAS) + 1,
    carga = necesita(s);
  if (fuerza < carga) {
    s.derrumbes++;
    m.sumar(-40);
    aviso(`Unión débil: aguantaba ${fuerza} y le cayeron ${carga}. ¡Se derrumbó!`, '💥');
    figura(m);
    return;
  }
  s.secciones[s.actual].costilla = fuerza;
  if (fuerza === carga) {
    s.justas++;
    m.sumar(30);
  } else {
    s.gruesas++;
    s.limpia = false;
    aviso(`Aguanta, pero la costilla pesa ${fuerza - carga} de más para las de abajo.`, '🪵');
  }
  // la costilla gruesa también pesa sobre las uniones de abajo
  s.carga = carga + (fuerza - carga);
  s.actual--;
  s.mirando = 0;
  if (s.actual < 0) {
    s.figuras++;
    m.sumar(s.limpia ? 40 : 10);
    aviso(s.limpia ? '¡Encendido a distancia: llegó bonita hasta el remate!' : 'Llegó al remate, pero pesadota.', '🔥');
    s.quema = 2;
  }
}
const motor = defineMotor({
  id: 'santabarbara.chimenea',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'feria',
  guia: {
    goal: 'Armá la chimenea del remate hacia abajo. Cada costilla aguanta lo que pesa su sección más todo lo de arriba (💧 pesa doble). Menos fuerza la derrumba; más fuerza aguanta pero pesa de más abajo. Elegí la fuerza y F la encaja.',
    ...controles(),
  },
  etapa: (p) => ({
    secciones: 4 + Math.round(p.dif * 2),
    mojadas: p.dif > 0.4,
    tenis: p.tema.variante === 'la-chimenea-se-puso-tenis',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    secciones: [],
    actual: 0,
    carga: 0,
    quema: 0,
    limpia: true,
    espera: 0,
    mirando: 0,
    justas: 0,
    gruesas: 0,
    derrumbes: 0,
    figuras: 0,
    intentos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.secciones.length) figura(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    if (s.quema > 0) {
      s.quema -= dt;
      if (s.quema <= 0) figura(m);
    }
    if (input.take('fire')) encajar(m);
    const fuerza = casilla(s.x, FUERZAS) + 1;
    m.objetivo = s.quema > 0 ? 'Encendido a distancia…' : 'Encajá la costilla justa';
    m.lineas = [
      s.quema > 0
        ? '🔥 Mirá cómo se consume desde el remate'
        : `Sección ${s.secciones.length - s.actual}/${s.secciones.length} · costilla de fuerza ${fuerza}`,
      `Justas ${s.justas} · Gruesas ${s.gruesas} · Derrumbes ${s.derrumbes} · Figuras ${s.figuras}`,
    ];
    m.stats = {
      x: s.x,
      justas: s.justas,
      gruesas: s.gruesas,
      derrumbes: s.derrumbes,
      figuras: s.figuras,
      intentos: s.intentos,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.quema > 0 || s.mirando < 1.3 || !s.secciones.length) return;
    s.auto = true;
    s.x = ejeDe(Math.min(FUERZAS, necesita(s)) - 1, FUERZAS);
    encajar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      k = casilla(s.x, FUERZAS),
      tenis = m.parametros.tenis,
      n = s.secciones.length,
      // al quemarse se consume del remate hacia abajo
      quemadas = s.quema > 0 ? Math.floor((1 - s.quema / 2) * (n + 1)) : 0,
      ola = Math.sin(m.tiempo * 3);
    return (
      <Mesa titulo={tenis ? 'Trinidad · la chimenea se puso tenis' : 'Trinidad · chimenea gigante'}>
        <group position={[-3.2, 0.7, -1]}>
          {s.secciones.map((c, i) => {
            const y = 0.3 + i * 0.62,
              ancho = 0.9 - i * 0.07 + (i === n - 1 ? 0.15 : 0),
              puesta = c.costilla > 0,
              toca = i === s.actual && s.quema <= 0;
            if (n - 1 - i < quemadas) return null;
            return (
              <group key={i}>
                <Cyl
                  pos={[0, y, 0]}
                  r={ancho}
                  rTop={ancho * 0.85}
                  h={0.58}
                  color={puesta ? COLORES[i % COLORES.length] : toca ? '#fdf0d5' : '#c9c1b4'}
                  mat="cloth"
                  solid={false}
                  sides={10}
                />
                {puesta && (
                  <Block pos={[0, y - 0.3, 0]} size={[ancho * 2.1, 0.06 + c.costilla * 0.012, 0.12]} color="#8a5a34" />
                )}
                {c.extra === 1 && (
                  <Block
                    pos={[ancho + 0.3, y + 0.2, 0]}
                    size={[0.6, 0.12, 0.12]}
                    rot={tenis && s.quema > 0 ? ola : 0}
                    color="#fdf0d5"
                    mat="cloth"
                    solid={false}
                  />
                )}
                <Label
                  pos={[1.9, y, 0.4]}
                  text={`${c.peso}${c.mojada ? ' 💧' : ''}${c.extra === 1 ? ' 👋+1' : c.extra === 2 ? ' 👟+2' : ''}${toca ? ' ◀' : ''}`}
                  h={0.28}
                />
              </group>
            );
          })}
          {tenis &&
            [-0.45, 0.45].map((x) => (
              <Block key={x} pos={[x, 0.08, 0.5]} size={[0.4, 0.16, 0.7]} color="#ffffff" mat="cloth" solid={false} />
            ))}
          {s.quema > 0 && <Ball pos={[0, 0.3 + (n - quemadas) * 0.62, 0]} r={0.35} color="#ff8c00" mat="neon" />}
        </group>
        <Label
          pos={[1.6, 3.4, -2]}
          text={s.carga > 0 && s.quema <= 0 ? `Ya pesa encima: lo de arriba + costillas` : 'Del remate hacia abajo'}
          h={0.26}
        />
        {Array.from({ length: FUERZAS }, (_, i) => {
          const x = -1 + ejeDe(i, FUERZAS) * 4.2;
          return (
            <group key={i}>
              <Block
                pos={[x, 0.78, 2.6]}
                size={[0.62, 0.08, 0.8]}
                color={i === k ? '#ffd166' : '#e9e4d8'}
                mat="wood"
                solid={false}
              />
              <Label pos={[x, 1.1, 2.6]} text={`${i + 1}`} h={0.3} />
            </group>
          );
        })}
      </Mesa>
    );
  },
});
export const Chimenea = motor.Escena;
export const guia = motor.guia;
