import { input } from '../../core/input';
import { Ball, Block, Label } from '../kit';
import { controles, cursor, Mesa, mover } from './cortes/comun';
import { defineMotor, type Motor } from './kit';

type Estado = ReturnType<typeof cursor> & {
  fila: number;
  seleccion: number[];
  podrida: number;
  inspeccion: number;
  cruces: number;
  caidas: number;
  espera: number;
};
type Sesion = Motor<{ cambio: number; vigencia: number }, Estado>;
const raices = [[0], [1], [2], [0, 1], [1, 2], [0, 2]];
function sanas(s: Estado) {
  return raices.flatMap((padres, i) => (padres.includes(s.podrida) ? [] : [i]));
}
function elegido(s: Estado) {
  return Math.min(2, Math.floor((s.x + 1) * 1.5)) + (s.y < -0.1 ? 3 : 0);
}
function apoyo(m: Sesion, i: number) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.3;
  if (!sanas(s).includes(i)) {
    s.caidas++;
    m.sumar(-20);
    s.seleccion = [];
    s.fila = 0;
    s.inspeccion = 0;
    return;
  }
  if (s.seleccion.includes(i)) return;
  s.seleccion.push(i);
  if (s.seleccion.length === 2) {
    const [a, b] = s.seleccion;
    if (raices[a].some((r) => raices[b].includes(r))) {
      s.caidas++;
      m.sumar(-15);
      s.seleccion = [];
      return;
    }
    s.fila++;
    s.seleccion = [];
    if (s.fila === 4) {
      s.cruces++;
      m.sumar(60);
      s.fila = 0;
    }
    s.podrida = (s.fila + s.cruces + m.parametros.cambio) % 3;
    s.inspeccion = 0;
  }
}
const motor = defineMotor({
  id: 'cortes.cusuco',
  guia: {
    goal: 'Inspeccioná los apoyos. Elegí dos apoyos sanos con raíces independientes por fila para tener redundancia; la raíz podrida debilita todas sus salidas.',
    ...controles,
  },
  etapa: (p) => ({ cambio: Math.round(p.dif * 2), vigencia: 12 - p.dif * 7 }),
  metas: (p) => [120 + Math.round(p.dif * 60), 300, 480],
  duracion: (p) => 75 + p.dif * 20,
  crear: (): Estado => ({
    ...cursor(),
    fila: 0,
    seleccion: [],
    podrida: 1,
    inspeccion: 0,
    cruces: 0,
    caidas: 0,
    espera: 0,
  }),
  actualizar: (m, dt) => {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (s.seleccion.length) {
      s.inspeccion += dt;
      if (s.inspeccion > m.parametros.vigencia) {
        s.podrida = (s.podrida + 1) % 3;
        s.seleccion = [];
        s.inspeccion = 0;
      }
    }
    if (input.take('fire')) apoyo(m, elegido(s));
    m.objetivo = `Fila ${s.fila + 1}/4: dos apoyos con raíces independientes`;
    m.lineas = [
      `Apoyos elegidos ${s.seleccion.map((i) => i + 1).join(', ') || 'ninguno'} · Pasarelas ${s.cruces}`,
      `Inspección vigente ${Math.ceil(m.parametros.vigencia - s.inspeccion)} s · Raíz marrón debilita todas sus salidas · WASD elegí apoyo · F confirmá`,
    ];
    m.stats = { cruces: s.cruces, caidas: s.caidas, fila: s.fila, elegidos: s.seleccion.length };
  },
  bot: (m, _dt, actor) => {
    if (actor === 'compa' && m.tiempo % 4 > _dt) return;
    const i = sanas(m.datos).find((i) => i < 3 && !m.datos.seleccion.includes(i));
    if (i !== undefined) apoyo(m, i);
  },
  Escena: ({ motor: m }) => (
    <Mesa titulo="Raíces conectadas de Cusuco" texto="Dos apoyos sanos por fila · Marrón: raíz podrida y sus salidas">
      {[0, 1, 2].map((i) => (
        <group key={i}>
          <Ball pos={[-4 + i * 3, 1, 3.4]} r={0.4} color={i === m.datos.podrida ? '#7e5034' : '#5bad79'} mat="wood" />
          <Label
            pos={[-4 + i * 3, 1.8, 3.4]}
            text={`Raíz ${i + 1}: ${i === m.datos.podrida ? 'podrida' : 'sana'}`}
            h={0.25}
          />
        </group>
      ))}
      {raices.map((padres, i) => {
        const x = -4 + (i % 3) * 3,
          z = i < 3 ? 0.8 : -2;
        const sana = sanas(m.datos).includes(i);
        return (
          <group key={i}>
            {padres.map((r) => {
              const rx = -4 + r * 3;
              return (
                <Block
                  key={r}
                  pos={[(rx + x) / 2, 0.9, (3.4 + z) / 2]}
                  size={[0.09, 0.09, Math.hypot(x - rx, z - 3.4)]}
                  rot={Math.atan2(x - rx, z - 3.4)}
                  color={r === m.datos.podrida ? '#7e5034' : '#90c981'}
                  mat="wood"
                  solid={false}
                />
              );
            })}
            <Block
              pos={[x, 1, z]}
              size={[1.8, 0.2, 1.1]}
              color={m.datos.seleccion.includes(i) ? '#ffe18b' : sana ? '#98c68d' : '#674d40'}
              mat="wood"
              solid={false}
            />
            <Label pos={[x, 1.6, z]} text={`${i + 1} ← ${padres.map((r) => r + 1).join('+')}`} h={0.25} />
          </group>
        );
      })}
      <Ball
        pos={[-4 + (elegido(m.datos) % 3) * 3, 1.9, elegido(m.datos) < 3 ? 0.8 : -2]}
        r={0.16}
        color="#ffffff"
        mat="neon"
      />
    </Mesa>
  ),
});
export const Cusuco = motor.Escena;
export const guia = motor.guia;
