import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { rng } from '../api';
import { defineMotor, type Motor } from '../kit';
import { controles, cursor, duracion, Mesa, metas, mover } from './comun';

type Estado = ReturnType<typeof cursor> & {
  azar: () => number;
  /** avance de la miel desde el borde de afuera y desde el hoyo (fracción del ancho del anillo) */
  afuera: number;
  adentro: number;
  va: number;
  vi: number;
  listas: number;
  secas: number;
  desarmadas: number;
  espera: number;
  aviso: string;
};
type Sesion = Motor<{ temprano: number; tarde: number; opaca: boolean; rapidez: number; semilla: number }, Estado>;
function nueva(s: Estado, rapidez: number) {
  s.afuera = 0;
  s.adentro = 0;
  s.va = (0.11 + s.azar() * 0.1) * rapidez;
  s.vi = (0.06 + s.azar() * 0.08) * rapidez;
}
const hueco = (s: Estado) => 1 - s.afuera - s.adentro;
/** ¿Hay miel donde está la sonda? x = −1 en el hoyo, +1 en el borde de afuera. */
const conMiel = (s: Estado) => {
  const f = (s.x + 1) / 2;
  return f <= s.adentro || f >= 1 - s.afuera;
};
function retirar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.6;
  if (hueco(s) > m.parametros.temprano) {
    s.secas++;
    s.aviso = 'Muy pronto: el centro quedó seco';
    m.sumar(-20);
  } else {
    s.listas++;
    s.aviso = '¡Bañada parejo y entera!';
    m.sumar(60);
  }
  nueva(s, m.parametros.rapidez);
}
const motor = defineMotor({
  id: 'choluteca.mielrosca',
  modos: { duo: { tipo: 'compartido', cada: 4 }, abierto: { tipo: 'ambiente', bots: 3 } },
  fondo: 'pueblo',
  guia: {
    goal: 'La miel entra por el borde y por el hoyo. A/D mové la sonda. F sacá la rosquilla cuando los dos frentes se juntan.',
    ...controles,
  },
  etapa: (p) => ({
    temprano: 0.1 - p.dif * 0.04,
    tarde: 0.12 - p.dif * 0.05,
    opaca: p.dif >= 0.5,
    rapidez: 1 + p.dif * 0.4,
    semilla: p.seed,
  }),
  metas,
  duracion,
  crear: (p): Estado => {
    const s: Estado = {
      ...cursor(),
      azar: rng(p.semilla),
      afuera: 0,
      adentro: 0,
      va: 0.1,
      vi: 0.1,
      listas: 0,
      secas: 0,
      desarmadas: 0,
      espera: 0,
      aviso: '',
    };
    nueva(s, p.rapidez);
    return s;
  },
  actualizar(m, dt) {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    s.afuera += s.va * dt;
    s.adentro += s.vi * dt;
    if (input.take('fire')) retirar(m);
    if (-hueco(s) > m.parametros.tarde) {
      s.desarmadas++;
      s.aviso = 'Esperaste de más: se desarmó el anillo';
      m.sumar(-40);
      nueva(s, m.parametros.rapidez);
    }
    m.objetivo = `Rosquilla ${s.listas + s.secas + s.desarmadas + 1} · Sacala cuando se junte la miel`;
    m.lineas = [
      `Sonda ${conMiel(s) ? '🍯 con miel' : '· seca'}${m.parametros.opaca ? ' · Rosquilla opaca: medí con la sonda' : ` · Falta ${Math.max(0, Math.round(hueco(s) * 100))}%`}`,
      `Listas ${s.listas} · Secas ${s.secas} · Desarmadas ${s.desarmadas} · ${s.aviso}`,
    ];
    m.stats = { x: s.x, listas: s.listas, secas: s.secas, desarmadas: s.desarmadas };
  },
  bot(m) {
    const s = m.datos;
    s.auto = true;
    s.x = s.adentro * 2 - 1;
    if (hueco(s) <= m.parametros.temprano * 0.5) retirar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      ancho = 6,
      empapada = Math.min(1, s.afuera + s.adentro);
    return (
      <Mesa titulo="Miel dentro de la rosquilla · Juntá los frentes">
        <group position={[-3.4, 0, -1.6]}>
          <Cyl
            pos={[0, 0.85, 0]}
            r={1.5}
            h={0.3}
            color={empapada > 0.9 ? '#b8651b' : '#d9a441'}
            mat="plastic"
            solid={false}
          />
          <Cyl pos={[0, 0.88, 0]} r={0.55} h={0.32} color="#6b4423" solid={false} />
          <Label pos={[0, 2, 0]} text="Rosquilla en miel" h={0.26} />
        </group>
        <group position={[0.6, 0, 0.6]}>
          <Block
            pos={[0, 0.9, 0]}
            size={[ancho, 0.4, 0.8]}
            color={m.parametros.opaca ? '#c08a3e' : '#e8cf96'}
            mat="plastic"
            solid={false}
          />
          {!m.parametros.opaca && (
            <>
              <Block
                pos={[ancho / 2 - (s.afuera * ancho) / 2, 1.12, 0]}
                size={[s.afuera * ancho, 0.1, 0.84]}
                color="#b85c00"
                mat="plastic"
                solid={false}
              />
              <Block
                pos={[-ancho / 2 + (s.adentro * ancho) / 2, 1.12, 0]}
                size={[s.adentro * ancho, 0.1, 0.84]}
                color="#b85c00"
                mat="plastic"
                solid={false}
              />
            </>
          )}
          <Label pos={[-ancho / 2, 1.6, 0.6]} text="Hoyo" h={0.22} />
          <Label pos={[ancho / 2, 1.6, 0.6]} text="Borde" h={0.22} />
          <Ball pos={[(s.x * ancho) / 2, 1.35, 0]} r={0.16} color={conMiel(s) ? '#ffb000' : '#f4f1de'} mat="neon" />
        </group>
      </Mesa>
    );
  },
});
export const MielRosca = motor.Escena;
export const guia = motor.guia;
