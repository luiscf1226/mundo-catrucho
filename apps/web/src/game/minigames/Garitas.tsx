import { input } from '../../core/input';
import { Block, Cyl, Label } from '../kit';
import { controles, cursor, Mesa, mover } from './cortes/comun';
import { defineMotor, type Motor } from './kit';

const esquinas = [
  [-4, -3],
  [2, -3],
  [2, 3],
  [-4, 3],
];
type Estado = ReturnType<typeof cursor> & {
  garita: number;
  angulos: number[];
  rondas: number;
  fallos: number;
  espera: number;
};
type Sesion = Motor<{ apertura: number; obstaculo: number }, Estado>;
function visibles(m: Sesion, g: number, a: number) {
  const [x, z] = esquinas[g];
  return esquinas.map(([tx, tz], i) => {
    if (i === g) return false;
    const dx = tx - x,
      dz = tz - z;
    const diferencia = Math.atan2(Math.sin(Math.atan2(dx, dz) - a), Math.cos(Math.atan2(dx, dz) - a));
    const muro = i === (g + 2) % 4;
    return !muro && Math.abs(diferencia) < m.parametros.apertura;
  });
}
function guardar(m: Sesion) {
  const s = m.datos;
  if (s.espera > 0) return;
  s.espera = 0.25;
  s.angulos[s.garita] = s.x * Math.PI;
  s.garita = (s.garita + 1) % 4;
  if (s.garita === 0) {
    const cobertura = esquinas.map((_, i) => s.angulos.filter((a, g) => visibles(m, g, a)[i]).length);
    if (cobertura.every((n) => n >= 2)) {
      m.sumar(80);
      s.rondas++;
      s.espera = 1;
      s.angulos = [0, 0, 0, 0];
    } else {
      s.fallos++;
      m.sumar(-10);
    }
  }
}
const motor = defineMotor({
  id: 'cortes.garitas',
  guia: {
    goal: 'Orientá las cuatro garitas hacia el patio y guardá cada cono. Cada esquina necesita dos visuales; el muro tapa la diagonal.',
    ...controles,
  },
  etapa: (p) => ({ apertura: 1.05 - p.dif * 0.18, obstaculo: p.dif }),
  metas: (p) => [80 + Math.round(p.dif * 80), 240, 400],
  duracion: (p) => 75 + p.dif * 20,
  crear: (): Estado => ({ ...cursor(), garita: 0, angulos: [0, 0, 0, 0], rondas: 0, fallos: 0, espera: 0 }),
  actualizar: (m, dt) => {
    const s = m.datos;
    mover(s, dt);
    s.espera = Math.max(0, s.espera - dt);
    if (input.take('fire')) guardar(m);
    m.objetivo = `Garita ${s.garita + 1}: apuntá entre las dos esquinas vecinas`;
    const actual = s.angulos.map((a, g) => (g === s.garita ? s.x * Math.PI : a));
    m.lineas = [
      `Cobertura: ${esquinas.map((_, i) => actual.filter((a, g) => visibles(m, g, a)[i]).length).join(' / ')} (necesitás 2 en todas)`,
      'A/D o mouse/stick derecho: ángulo · F: guardar y cambiar garita',
    ];
    m.stats = { rondas: s.rondas, fallos: s.fallos, garita: s.garita };
  },
  bot: (m, _dt, actor) => {
    if (actor === 'compa' && m.tiempo % 4 > _dt) return;
    const s = m.datos,
      [x, z] = esquinas[s.garita];
    s.auto = true;
    s.x = Math.atan2(-1 - x, -z) / Math.PI;
    guardar(m);
  },
  Escena: ({ motor: m }) => (
    <Mesa
      titulo="Visuales de Omoa"
      texto={`Garita ${m.datos.garita + 1} · Cada esquina necesita dos miradas`}
      color="#a7bd9a"
    >
      <Block pos={[-1, 1, 0]} size={[2, 1, 1.4]} color="#9e957c" mat="stone" solid={false} />
      {esquinas.map(([x, z], g) => {
        const a = g === m.datos.garita ? m.datos.x * Math.PI : m.datos.angulos[g];
        return (
          <group key={g}>
            <Cyl
              pos={[x, 1.3, z]}
              r={0.55}
              h={1.2}
              color={g === m.datos.garita ? '#ffd34e' : '#baad91'}
              mat="stone"
              solid={false}
            />
            <Label pos={[x, 2.4, z]} text={`${g + 1}`} h={0.35} />
            <group position={[x, 1.9, z]} rotation-y={a}>
              <Block pos={[0, 0, 1.3]} size={[0.12, 0.1, 2.6]} color="#ffe384" mat="neon" solid={false} />
              {[-1, 1].map((k) => (
                <Block
                  key={k}
                  pos={[k * Math.sin(m.parametros.apertura) * 1.3, 0, Math.cos(m.parametros.apertura) * 1.3]}
                  size={[0.06, 0.06, 2.6]}
                  rot={k * m.parametros.apertura}
                  color="#f0dc99"
                  mat="neon"
                  solid={false}
                />
              ))}
            </group>
          </group>
        );
      })}
    </Mesa>
  ),
});
export const Garitas = motor.Escena;
export const guia = motor.guia;
