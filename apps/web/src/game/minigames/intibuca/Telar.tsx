import { input } from '../../../core/input';
import { Block, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  pedal: number;
  cara: number;
  filas: number;
  flotante: number;
  espera: number;
  errores: number;
  punta: boolean;
};
type Sesion = Motor<{ margen: number; reparar: boolean }, Estado>;
function objetivo(m: Sesion) {
  return (m.datos.filas + m.datos.cara + Number(m.parametros.reparar)) % 2;
}
function pasar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.65;
  const lado = s.cara ? 0.65 : -0.65;
  if (m.parametros.reparar && !s.punta) {
    if (Math.abs(s.x - lado) < m.parametros.margen && Math.abs(s.y - (s.cara ? -0.5 : 0.5)) < m.parametros.margen)
      s.punta = true;
    else {
      s.errores++;
      m.sumar(-20);
    }
    return;
  }
  if (s.pedal === objetivo(m) && Math.abs(s.x - lado) < m.parametros.margen) {
    s.punta = false;
    s.flotante = 0;
    s.cara = 1 - s.cara;
    if (!s.cara) {
      s.filas++;
      m.sumar(40);
    }
  } else {
    s.flotante++;
    s.errores++;
    m.sumar(-20);
    if (s.flotante >= 3) {
      s.cara = 0;
      s.flotante = 0;
      m.sumar(-40);
    }
  }
}
const motor = defineMotor({
  id: 'intibuca.telar',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Elegí pedal con E. Llevá la lanzadera al extremo señalado y pasala con F; revisá ambas caras.',
    ...controles,
  },
  etapa: (p) => ({ margen: 0.3 - p.dif * 0.14, reparar: p.tema.variante === 'la-bufanda-abraza-el-puesto' }),
  metas,
  duracion,
  crear: (): Estado => ({ ...cursor(), pedal: 0, cara: 0, filas: 0, flotante: 0, espera: 0, errores: 0, punta: false }),
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('use')) s.pedal = 1 - s.pedal;
    if (input.take('fire')) pasar(m);
    m.objetivo = `${m.parametros.reparar ? 'Repará la punta' : 'Tejé la franja'} · ${s.cara ? 'reverso → derecha' : 'frente → izquierda'} · pedal ${objetivo(m) + 1}`;
    m.lineas = [
      `E: pedal ${s.pedal + 1} · F: pasá la lanzadera · Hilos enganchados ${s.flotante}/3`,
      m.parametros.reparar && !s.punta
        ? `Buscá la punta ${s.cara ? 'abajo a la derecha' : 'arriba a la izquierda'} con F antes de reparar`
        : `${s.filas} motivos completos · Pasá la lanzadera sin cortar urdimbre`,
    ];
    m.stats = { x: s.x, filas: s.filas, errores: s.errores };
  },
  bot(m, _dt) {
    const s = m.datos;
    s.auto = true;
    s.pedal = objetivo(m);
    s.x = s.cara ? 0.65 : -0.65;
    s.y = s.cara ? -0.5 : 0.5;
    pasar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Telar de práctica · Frente y reverso">
      {Array.from({ length: 10 }, (_, i) => (
        <Block
          key={i}
          pos={[-3 + i * 0.4, 1.2 + (i % 2 === m.datos.pedal ? 0.25 : 0), 0]}
          size={[0.05, 0.05, 4]}
          color={i % 2 ? '#d78849' : '#754a95'}
          mat="cloth"
          solid={false}
        />
      ))}
      <Block pos={[-1, 1, 0]} size={[4, 0.1, 1 + m.datos.cara]} color="#b376ad" mat="cloth" solid={false} />
      <Block pos={[-1 + m.datos.x * 3, 1.7, 0]} size={[0.8, 0.2, 0.3]} color="#e8ba66" mat="wood" solid={false} />
      <Label pos={[-1, 3, -2]} text={`Pedal ${m.datos.pedal + 1} · ${m.datos.cara ? 'Reverso' : 'Frente'}`} h={0.45} />
      {m.parametros.reparar && (
        <Block pos={[-1, 0.8, 2]} size={[6, 0.3, 0.5]} color="#b376ad" mat="cloth" solid={false} />
      )}
    </Mesa>
  ),
});
export const Telar = motor.Escena;
export const guia = motor.guia;
