import { input } from '../../../core/input';
import { Ball, Block, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { columna, controles, cursor, duracion, Mesa, metas, mover, Puntero, xDe } from './comun';

const ALTOS = [0.7, 1, 0.85];
/** Lado de la sombra: antes del mediodía cae hacia arriba (+1), después hacia abajo (−1). */
const lado = (h: number) => (h < 12.5 ? 1 : -1);
/** Largo de la sombra (en unidades del cursor) de un edificio a esa hora: corta al mediodía, larga temprano. */
const largo = (h: number, c: number) => Math.min(1, ALTOS[c] * (0.3 + Math.abs(h - 12.5) * 0.14));
const siguiente = (h: number) => (h >= 17 ? 8 : h + 1);
type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  hora: number;
  falta: number;
  parada: number;
  refugio: { c: number; y: number } | null;
  calor: number;
  racha: number;
  frescas: number;
  sofocos: number;
  espera: number;
};
type Sesion = Motor<{ hora: number; toldos: boolean; semilla: number }, Estado>;
function valido(h: number, c: number, y: number) {
  return Math.sign(y) === lado(h) && Math.abs(y) >= 0.15 && Math.abs(y) <= largo(h, c);
}
function fijar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.4;
  s.refugio = { c: columna(s.x), y: s.y };
}
function pasarHora(m: Sesion) {
  const s = m.datos,
    h = siguiente(s.hora),
    r = s.refugio;
  if (r && r.c === s.parada && valido(h, r.c, r.y)) {
    s.frescas++;
    s.calor = Math.max(0, s.calor - 20);
    s.racha = m.parametros.toldos ? Math.min(3, s.racha + 1) : 0;
    m.sumar(60 + s.racha * 10);
  } else {
    s.racha = 0;
    s.calor += 34;
    m.sumar(-10);
    if (s.calor >= 100) {
      s.sofocos++;
      s.calor = 40;
      m.sumar(-60);
    }
  }
  s.hora = h;
  s.falta = m.parametros.hora;
  s.refugio = null;
  s.parada = Math.floor(s.azar() * 3);
}
const motor = defineMotor({
  id: 'choluteca.sombra',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ciudad',
  guia: {
    goal: 'A/D elegí el edificio de tu próxima parada. W/S poné tu refugio donde caerá la sombra de la PRÓXIMA hora. F fijalo.',
    ...controles,
  },
  etapa: (p) => ({
    hora: 4 - p.dif * 0.5,
    toldos: p.tema.variante === 'hasta-la-sombra-anda-sudando',
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const azar = rng(p.semilla);
    return {
      ...cursor(),
      azar,
      hora: 8 + Math.floor(azar() * 4),
      falta: p.hora,
      parada: Math.floor(azar() * 3),
      refugio: null,
      calor: 0,
      racha: 0,
      frescas: 0,
      sofocos: 0,
      espera: 0,
    };
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) fijar(m);
    s.falta -= dt;
    if (s.falta <= 0) pasarHora(m);
    const h = siguiente(s.hora);
    m.objetivo = `Son las ${s.hora}:00 · Próxima parada: edificio ${s.parada + 1} a las ${h}:00`;
    m.lineas = [
      `Reloj solar: a las ${h}:00 la sombra cae ${lado(h) > 0 ? 'arriba' : 'abajo'} · ${s.refugio ? 'Refugio fijado' : 'Sin refugio todavía'}`,
      `Calor ${Math.round(s.calor)}% · Horas al fresco ${s.frescas} · Sofocos ${s.sofocos}${m.parametros.toldos ? ` · Corredor ×${s.racha}` : ''}`,
    ];
    m.stats = { x: s.x, y: s.y, frescas: s.frescas, sofocos: s.sofocos, calor: s.calor };
  },
  bot(m) {
    const s = m.datos,
      h = siguiente(s.hora);
    s.auto = true;
    s.x = xDe(s.parada);
    s.y = lado(h) * Math.max(0.17, largo(h, s.parada) * 0.6);
    if (!s.refugio || s.refugio.c !== s.parada || !valido(h, s.refugio.c, s.refugio.y)) fijar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      h = siguiente(s.hora),
      sol = (hora: number) => [-1, 1 + Math.sin(((hora - 8) / 9) * Math.PI) * 3, 4 - ((hora - 8) / 9) * 8] as const;
    return (
      <Mesa titulo={`${m.partida.juego?.name ?? 'Geometría del sofoco'} · Pensá en la próxima hora`}>
        {ALTOS.map((alto, c) => {
          const l = largo(s.hora, c) * 3;
          return (
            <group key={c} position={[xDe(c) * 5, 0, 0]}>
              <Block
                pos={[0, 0.7 + alto, 0]}
                size={[1.6, alto * 2, 1]}
                color={c === s.parada ? '#f2c4a4' : '#e9dfc9'}
                mat="stucco"
                solid={false}
              />
              <Block
                pos={[0, 0.72, -lado(s.hora) * (0.5 + l / 2)]}
                size={[1.6, 0.03, l]}
                color="#3b3f4a"
                solid={false}
              />
              {c === s.parada && <Label pos={[0, 1.2 + alto * 2, 0]} text="Próxima parada" h={0.26} />}
            </group>
          );
        })}
        <Ball pos={[...sol(s.hora)]} r={0.35} color="#ffd23f" mat="neon" />
        <Ball pos={[...sol(h)]} r={0.2} color="#fff2a8" mat="glass" />
        <Label pos={[sol(h)[0], sol(h)[1] + 0.5, sol(h)[2]]} text={`${h}:00`} h={0.22} />
        {s.refugio && (
          <Block
            pos={[xDe(s.refugio.c) * 5, m.parametros.toldos ? 1.6 : 0.76, -s.refugio.y * 3]}
            size={[1.2, 0.06, 0.6]}
            color={m.parametros.toldos ? '#e76f51' : '#7fb069'}
            mat="cloth"
            solid={false}
          />
        )}
        {s.calor >= 50 && (
          <group position={[-5, 0.7, 1.5]}>
            <Ball pos={[0, 1.55, 0]} r={0.24} color="#23262e" />
            <Block pos={[0, 0.95, 0]} size={[0.5, 0.8, 0.06]} color="#23262e" solid={false} />
            <group position={[0.45, 1.1, 0.1]} rotation={[0, 0, Math.sin(m.tiempo * 12) * 0.6]}>
              <Block pos={[0, 0.2, 0]} size={[0.45, 0.4, 0.04]} color="#c9a0dc" mat="cloth" solid={false} />
            </group>
            <Plate pos={[0, 2, 0]} text="🪭 ¿Me das turno bajo el toldo?" h={0.2} bg="#3b3f4a" />
          </group>
        )}
        <Puntero x={s.x} y={s.y} />
      </Mesa>
    );
  },
});
export const Sombra = motor.Escena;
export const guia = motor.guia;
