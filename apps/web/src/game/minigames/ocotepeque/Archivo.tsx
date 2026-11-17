import { input } from '../../../core/input';
import { useGame } from '../../../core/store';
import { Block, Label, Plate } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { casilla, controles, cursor, duracion, Mesa, metas, mover, xDe } from './comun';

/** Rótulos de práctica: oficios genéricos, ningún negocio real. */
const PALABRAS = ['BOTICA', 'CORREO', 'TALLER', 'COMEDOR', 'BARBERIA', 'SASTRERIA', 'PANADERIA', 'ZAPATERIA'];
const TINTAS = ['#b23a48', '#3a6ea5'];
const NOMBRE_TINTA = ['roja', 'azul'];
/** una letra: capas de tinta encima (de abajo hacia arriba, cada una con su color) y si el trazo original es débil */
type Letra = { l: string; capas: number[]; debil: boolean; borrada: boolean };
type Estado = ReturnType<typeof cursor> & {
  letras: Letra[];
  fuerte: boolean;
  tinta: number;
  espera: number;
  listo: number;
  bostezo: number;
  leyendas: number;
  borradas: number;
  raspones: number;
  manchas: number;
  azar: () => number;
};
type Sesion = Motor<{ largo: number; capas: number; debiles: number; vocales: boolean; seed: number }, Estado>;
const VOCALES = 'AEIOU';
const limpia = (l: Letra) => !l.capas.length;
function rotulo(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    opciones = PALABRAS.filter((w) => w.length <= p.largo),
    w = opciones[Math.floor(s.azar() * opciones.length)];
  s.letras = [...w].map((l) => {
    const n = p.vocales && VOCALES.includes(l) ? 1 + Math.floor(s.azar() * 2) : Math.floor(s.azar() * (p.capas + 1));
    return {
      l,
      capas: Array.from({ length: n }, () => Math.floor(s.azar() * 2)),
      debil: !p.vocales && s.azar() < p.debiles,
      borrada: false,
    };
  });
  if (s.letras.every(limpia)) s.letras[0].capas.push(0);
}
function cerrar(m: Sesion) {
  const s = m.datos,
    toast = useGame.getState().toast;
  if (s.listo > 0 || !s.letras.every((l) => limpia(l) || l.borrada)) return;
  s.listo = 1.2;
  if (s.letras.some((l) => l.borrada)) {
    toast('Quedó un hueco: la leyenda ya no se lee completa.', '🏚️');
    return;
  }
  s.leyendas++;
  m.sumar(30);
  toast('¡Leyenda legible! El nombre se cuida aunque la tinta se gaste.', '🏚️');
}
function aplicar(m: Sesion) {
  const s = m.datos,
    p = m.parametros,
    toast = useGame.getState().toast;
  if (s.espera > 0 || s.listo > 0) return;
  s.espera = 0.35;
  const letra = s.letras[casilla(s.x, s.letras.length)];
  if (letra.borrada) return;
  if (p.vocales) {
    // dos filtros de tinta: solo levanta la capa de arriba si es del mismo color
    const arriba = letra.capas[letra.capas.length - 1];
    if (arriba === undefined) {
      s.raspones++;
      m.sumar(-10);
      toast('Esa letra ya estaba limpia: el filtro la raspa.', '🖌️');
    } else if (arriba !== s.tinta) {
      s.manchas++;
      m.sumar(-8);
      toast(`La capa de arriba es ${NOMBRE_TINTA[arriba]}: ese filtro no la levanta.`, '🖌️');
    } else {
      letra.capas.pop();
      m.sumar(limpia(letra) ? 7 : 3);
    }
    cerrar(m);
    return;
  }
  if (s.fuerte && letra.debil) {
    letra.borrada = true;
    letra.capas = [];
    s.borradas++;
    m.sumar(-30);
    toast('El calco fuerte se llevó también el trazo original.', '💥');
  } else if (limpia(letra)) {
    s.raspones++;
    m.sumar(-10);
    toast('Esa letra ya estaba limpia: el filtro la raspa.', '🖌️');
  } else {
    const quita = Math.min(s.fuerte ? 2 : 1, letra.capas.length);
    if (s.fuerte && letra.capas.length < 2) {
      s.raspones++;
      m.sumar(-10);
      toast('Demasiada presión para una sola capa.', '🖌️');
    } else m.sumar(3 * quita);
    letra.capas.splice(letra.capas.length - quita, quita);
    if (limpia(letra)) m.sumar(4);
  }
  cerrar(m);
}
function cambiar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.2;
  if (m.parametros.vocales) s.tinta = 1 - s.tinta;
  else s.fuerte = !s.fuerte;
}
const motor = defineMotor({
  id: 'ocotepeque.archivoagua',
  modos: { duo: { tipo: 'compartido', cada: 3 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'ruinas',
  guia: {
    goal: 'Apuntá a una letra tapada y F pasa el filtro. E cambia entre filtro suave (una capa) y calco fuerte (dos capas). El calco fuerte borra los trazos débiles: con esos, solo suave. En las sobreimpresiones, E cambia de tinta y solo levanta la capa de su color.',
    ...controles('cambiar filtro'),
  },
  etapa: (p) => ({
    largo: 6 + Math.round(p.dif * 3),
    capas: 2 + Math.round(p.dif),
    debiles: 0.2 + p.dif * 0.2,
    vocales: p.tema.variante === 'el-rotulo-se-trago-las-vocales',
    seed: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => ({
    ...cursor(),
    letras: [],
    fuerte: false,
    tinta: 0,
    espera: 0,
    listo: 0,
    bostezo: 8,
    leyendas: 0,
    borradas: 0,
    raspones: 0,
    manchas: 0,
    azar: rng(p.seed),
  }),
  actualizar(m, dt) {
    const s = m.datos,
      p = m.parametros;
    if (!s.letras.length) rotulo(m);
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.listo > 0) {
      s.listo -= dt;
      if (s.listo <= 0) rotulo(m);
    }
    if (p.vocales && s.listo <= 0) {
      s.bostezo -= dt;
      if (s.bostezo <= 0) {
        s.bostezo = 9 - m.partida.dif * 3;
        const vocal = s.letras.find((l) => VOCALES.includes(l.l) && limpia(l));
        if (vocal) {
          vocal.capas.push(Math.floor(s.azar() * 2));
          useGame.getState().toast('El rótulo bostezó y escondió una vocal bajo una tilde de papel.', '🥱');
        }
      }
    }
    if (input.take('use')) cambiar(m);
    if (input.take('fire')) aplicar(m);
    const letra = s.letras[casilla(s.x, s.letras.length)];
    m.objetivo = p.vocales
      ? `Filtro de tinta ${NOMBRE_TINTA[s.tinta]} · E cambia`
      : `${s.fuerte ? 'Calco fuerte' : 'Filtro suave'} · E cambia`;
    m.lineas = [
      `Letra ${letra?.l ?? '-'}: ${letra?.borrada ? 'borrada' : `${letra?.capas.length ?? 0} capas`}${letra?.debil ? ' · trazo débil' : ''}`,
      `Leyendas ${s.leyendas} · Borradas ${s.borradas} · Raspones ${s.raspones + s.manchas}`,
    ];
    m.stats = { x: s.x, leyendas: s.leyendas, borradas: s.borradas, raspones: s.raspones, manchas: s.manchas };
  },
  bot(m) {
    const s = m.datos,
      p = m.parametros;
    if (s.espera > 0 || s.listo > 0 || !s.letras.length) return;
    s.auto = true;
    const i = s.letras.findIndex((l) => !l.borrada && !limpia(l));
    if (i < 0) return;
    const l = s.letras[i];
    s.x = xDe(i, s.letras.length);
    if (p.vocales) {
      if (l.capas[l.capas.length - 1] !== s.tinta) cambiar(m);
      else aplicar(m);
      return;
    }
    const fuerte = !l.debil && l.capas.length >= 2;
    if (fuerte !== s.fuerte) cambiar(m);
    else aplicar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      n = s.letras.length,
      k = casilla(s.x, n),
      p = m.parametros;
    return (
      <Mesa titulo="Rótulo de práctica · nombre ficticio">
        <Block pos={[-1, 1.6, -1.2]} size={[8.6, 1.9, 0.12]} color="#d8c9a8" mat="wood" solid={false} />
        {s.letras.map((l, i) => {
          const x = -1 + (i - (n - 1) / 2) * 0.9;
          return (
            <group key={i}>
              {!l.borrada && (
                <Plate
                  pos={[x, 1.6, -1.12]}
                  text={l.l}
                  h={0.8}
                  fg={l.debil ? '#a89a86' : '#2b2118'}
                  bg="rgba(0,0,0,0)"
                />
              )}
              {l.capas.map((c, j) => (
                <Block
                  key={j}
                  pos={[x, 1.6, -0.98 + j * 0.06]}
                  size={[0.7 - j * 0.08, 0.8 - j * 0.1, 0.05]}
                  color={p.vocales ? TINTAS[c] : j % 2 ? '#5a4a3a' : '#7a6650'}
                  solid={false}
                />
              ))}
              <Block
                pos={[x, 0.66, -0.9]}
                size={[0.6, 0.06, 0.1]}
                color={i === k ? '#ffd166' : l.debil ? '#c7b9a0' : '#6b5440'}
                solid={false}
              />
            </group>
          );
        })}
        <Block
          pos={[-4.6, 0.9, 1.6]}
          size={[1, 0.3, 1]}
          color={p.vocales ? TINTAS[s.tinta] : s.fuerte ? '#e63946' : '#a8dadc'}
          mat="plastic"
          solid={false}
        />
        <Label
          pos={[-4.6, 1.5, 1.6]}
          text={p.vocales ? `Tinta ${NOMBRE_TINTA[s.tinta]}` : s.fuerte ? 'Calco fuerte' : 'Filtro suave'}
          h={0.24}
        />
        <Label
          pos={[-1, 3.2, -1.2]}
          text={s.listo > 0 ? 'Leyenda recuperada 🏚️' : 'Cuidá los trazos débiles'}
          h={0.32}
        />
      </Mesa>
    );
  },
});
export const Archivo = motor.Escena;
export const guia = motor.guia;
