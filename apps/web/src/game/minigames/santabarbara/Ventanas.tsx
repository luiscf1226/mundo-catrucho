import { input } from '../../../core/input';
import { Ball, Block, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { aviso, controles, cursor, duracion, enMesa, entre, Mesa, metas, mover } from './comun';

/** La foto está acostada sobre la mesa: «arriba» en la foto es el fondo de la mesa (−z). */
const FACHADA = { x0: -5, x1: -1.6, z0: 2.2, z1: -2.6 };
type Estado = ReturnType<typeof cursor> & {
  pisos: number;
  /** piso desde donde se tomó la foto (0 = planta baja) */
  piso: number;
  fuga: [number, number];
  corregida: boolean;
  espera: number;
  mirando: number;
  fotos: number;
  fugas: number;
  confusas: number;
  errores: number;
  intentos: number;
  azar: () => number;
};
type Sesion = Motor<{ pisos: number; trazo: number; seed: number }, Estado>;
const zPiso = (i: number, n: number) => FACHADA.z0 + ((i + 0.5) / n) * (FACHADA.z1 - FACHADA.z0);
const apunta = (s: Estado) => enMesa(s.x, s.y);
/** Piso cuya fila de ventanas está más cerca del cursor. */
function pisoCursor(s: Estado) {
  const z = apunta(s)[2];
  let mejor = 0;
  for (let i = 1; i < s.pisos; i++)
    if (Math.abs(zPiso(i, s.pisos) - z) < Math.abs(zPiso(mejor, s.pisos) - z)) mejor = i;
  return mejor;
}
function foto(m: Sesion) {
  const s = m.datos,
    p = m.parametros;
  s.pisos = p.pisos;
  s.piso = entre(s.azar, 0, p.pisos - 1);
  // el punto de fuga cae a la altura de la cámara, del lado derecho de la foto
  s.fuga = [1.4 + s.azar() * 1.8, zPiso(s.piso, p.pisos)];
  s.corregida = false;
  s.mirando = 0;
}
function fijarFuga(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0 || s.corregida) return;
  s.espera = 0.6;
  const [x, , z] = apunta(s);
  if (Math.hypot(x - s.fuga[0], z - s.fuga[1]) < 0.5) {
    s.corregida = true;
    s.fugas++;
    m.sumar(15);
    aviso('Fuga corregida: ahora las líneas se juntan en un punto.', '📐');
  } else {
    s.confusas++;
    m.sumar(-15);
    aviso('Ahí las líneas no se juntan: quedan incompatibles.', '📏');
  }
}
function elegirPiso(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.intentos++;
  s.espera = 0.6;
  const k = pisoCursor(s);
  if (k === s.piso) {
    s.fotos++;
    m.sumar(s.corregida ? 40 : 20);
    aviso(`¡Foto tomada desde el piso ${k + 1}!`, '📷');
    foto(m);
    return;
  }
  s.errores++;
  m.sumar(-40);
  aviso('Esa fila no queda a la altura de la cámara: la foto agranda la ventana, no el piso.', '🏰');
}
const motor = defineMotor({
  id: 'santabarbara.perspectiva',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ruinas',
  guia: {
    goal: 'Las líneas de las ventanas se juntan en el punto de fuga, a la altura de la cámara. Alargalas con la vista, poné el cursor donde se juntan y E corrige la fuga. Después apuntá el piso que queda a esa altura y F lo confirma.',
    ...controles('corregir la fuga'),
  },
  etapa: (p) => ({ pisos: 3 + Math.round(p.dif * 2), trazo: 0.55 - p.dif * 0.3, seed: p.seed }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    pisos: 0,
    piso: 0,
    fuga: [0, 0],
    corregida: false,
    espera: 0,
    mirando: 0,
    fotos: 0,
    fugas: 0,
    confusas: 0,
    errores: 0,
    intentos: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.pisos) foto(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.mirando += dt;
    if (input.take('use')) fijarFuga(m);
    if (input.take('fire')) elegirPiso(m);
    m.objetivo = s.corregida ? 'Apuntá el piso de la cámara' : 'Buscá dónde se juntan las líneas';
    m.lineas = [
      `Piso ${pisoCursor(s) + 1} de ${s.pisos} · Fuga ${s.corregida ? 'corregida ✓' : 'sin corregir'}`,
      `Fotos ${s.fotos} · Fugas ${s.fugas} · Líneas confusas ${s.confusas} · Errores ${s.errores}`,
    ];
    m.stats = {
      x: s.x,
      fotos: s.fotos,
      fugas: s.fugas,
      confusas: s.confusas,
      errores: s.errores,
      intentos: s.intentos,
    };
  },
  bot(m) {
    const s = m.datos;
    if (s.espera > 0 || s.mirando < 1.4 || !s.pisos) return;
    s.auto = true;
    if (!s.corregida) {
      s.x = (s.fuga[0] + 1) / 4.2;
      s.y = -s.fuga[1] / 3.1;
      fijarFuga(m);
    } else elegirPiso(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      [cx, , cz] = apunta(s),
      sel = pisoCursor(s),
      ancho = FACHADA.x1 - FACHADA.x0;
    return (
      <Mesa titulo="Castillo Bográn · fotos desde afuera">
        {/* el papel de la foto y la fachada */}
        <Block pos={[-1, 0.72, -0.2]} size={[9.2, 0.03, 5.8]} color="#f4efe6" solid={false} />
        <Block
          pos={[(FACHADA.x0 + FACHADA.x1) / 2, 0.75, (FACHADA.z0 + FACHADA.z1) / 2]}
          size={[ancho, 0.03, FACHADA.z0 - FACHADA.z1]}
          color="#c9b79c"
          mat="stone"
          solid={false}
        />
        {Array.from({ length: s.pisos }, (_, i) => {
          const z = zPiso(i, s.pisos),
            // las líneas de cada piso apuntan a la fuga: horizontales solo a la altura de la cámara
            dx = s.fuga[0] - FACHADA.x1,
            dz = s.fuga[1] - z,
            largo = Math.hypot(dx, dz) * (s.corregida ? 1 : m.parametros.trazo),
            a = Math.atan2(-dz, dx);
          return (
            <group key={i}>
              {[0.2, 0.5, 0.8].map((f) => (
                <Block
                  key={f}
                  pos={[FACHADA.x0 + ancho * f, 0.79, z]}
                  size={[0.5, 0.04, (FACHADA.z0 - FACHADA.z1) / s.pisos - 0.35]}
                  color={i === sel ? '#ffd166' : '#5a4636'}
                  mat="glass"
                  solid={false}
                />
              ))}
              <Block
                pos={[FACHADA.x1 + (Math.cos(a) * largo) / 2, 0.8, z - (Math.sin(a) * largo) / 2]}
                size={[largo, 0.03, 0.05]}
                rot={a}
                color="#1d3557"
                solid={false}
              />
              <Label pos={[FACHADA.x0 - 0.5, 1, z]} text={`${i + 1}`} h={0.28} />
            </group>
          );
        })}
        {s.corregida && <Ball pos={[s.fuga[0], 0.85, s.fuga[1]]} r={0.12} color="#e63946" />}
        <Block pos={[cx, 1.1, cz]} size={[0.1, 0.7, 0.1]} color="#ffd166" mat="neon" solid={false} />
        <Label pos={[cx, 1.7, cz]} text={s.corregida ? `piso ${sel + 1}` : 'fuga?'} h={0.26} />
      </Mesa>
    );
  },
});
export const Ventanas = motor.Escena;
export const guia = motor.guia;
