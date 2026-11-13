import { input } from '../../../core/input';
import { Ball, Block, Cyl, Label } from '../../kit';
import { defineMotor, type Motor } from '../kit';
import { controles, duracion, metas, mover, Taller } from './Taller';

type Estado = {
  x: number;
  y: number;
  px: number;
  py: number;
  registro: number;
  buenas: number;
  malas: number;
  auto: boolean;
  aviso: string;
};
type Sesion = Motor<{ margen: number; nombre: string }, Estado>;
function objetivo(s: Estado) {
  return { x: s.buenas % 2 ? 0.45 : -0.45, y: s.buenas % 3 ? 0.35 : -0.35 };
}
function registrar(m: Sesion, extraer = false) {
  const s = m.datos;
  if (s.registro >= 1 && !extraer) {
    m.sumar(40);
    s.buenas++;
    s.aviso = 'Ficha registrada sin contacto';
  } else {
    m.sumar(-20);
    s.malas++;
    s.aviso = extraer ? 'No se extrae: documentá sin tocar' : 'Faltan ambos ángulos';
  }
  s.registro = 0;
}
const motor = defineMotor({
  id: 'olancho.calcita',
  modos: { duo: { tipo: 'apoyo' }, abierto: { tipo: 'ambiente', bots: 3 } },
  guia: {
    goal: 'Alineá ambos focos con las marcas, sostené la luz y registrá con F. E / X invalida la ficha por intentar extraer.',
    ...controles,
  },
  etapa: (p) => ({
    margen: 0.24 - p.dif * 0.12,
    nombre: typeof p.tema.nombre === 'string' ? p.tema.nombre : 'Escaneo educativo de Talgua',
  }),
  metas,
  duracion,
  crear: (): Estado => ({
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    registro: 0,
    buenas: 0,
    malas: 0,
    auto: false,
    aviso: 'Orientá dos focos: horizontal y vertical',
  }),
  actualizar(m, dt) {
    const s = m.datos;
    if (!s.auto) mover(s, dt);
    s.auto = false;
    const o = objetivo(s);
    if (Math.abs(s.x - o.x) < m.parametros.margen && Math.abs(s.y - o.y) < m.parametros.margen)
      s.registro = Math.min(1, s.registro + dt * 0.5);
    else s.registro = Math.max(0, s.registro - dt);
    if (input.take('fire')) registrar(m);
    if (input.take('use')) registrar(m, true);
    m.objetivo = s.aviso;
    m.lineas = [
      `Focos ${Math.round(s.x * 90)}° / ${Math.round(s.y * 90)}° · Buscá ${Math.round(o.x * 90)}° / ${Math.round(o.y * 90)}°`,
      `Registro ${Math.round(s.registro * 100)}% · F documentar · E / X no extraer`,
    ];
    m.stats = { buenas: s.buenas, malas: s.malas, registro: s.registro };
  },
  bot(m, _dt, actor) {
    if (actor === 'compa') {
      if (m.datos.registro >= 1) registrar(m);
      return;
    }
    const s = m.datos;
    s.auto = true;
    Object.assign(s, objetivo(s));
    if (s.registro >= 1) registrar(m);
  },
  Escena: ({ motor: m }) => {
    const s = m.datos,
      o = objetivo(s);
    return (
      <Taller nombre={m.parametros.nombre} aviso="Réplica virtual · El brillo se documenta">
        <Block pos={[-0.6, 1.06, 1]} size={[2, 0.12, 0.25]} color="#e2d9c6" mat="stone" />
        <Label pos={[0, 1.2, 1.7]} text="Hueso y depósito de calcita · réplica" h={0.22} />
        <Block pos={[0, 0.5, 0]} size={[6, 1, 4]} color="#554c49" mat="stone" />
        {[-1, 0, 1].map((i) => (
          <Cyl
            key={i}
            pos={[i * 1.2, 1.5, 0]}
            r={0.5}
            h={1.5}
            rTop={0.08}
            color={s.registro > 0 ? '#bdebea' : '#b8b4a8'}
            mat="stone"
          />
        ))}
        {[-1, 1].map((v, i) => (
          <group key={v}>
            <Ball pos={[v * 3, 2, 1]} r={0.3} color="#ffe3a0" mat="neon" />
            <Ball pos={[(i ? s.y : s.x) * 4, 1.2, i ? 1.5 : -1.5]} r={0.18} color="#ffc857" />
            <Ball pos={[(i ? o.y : o.x) * 4, 1.15, i ? 1.5 : -1.5]} r={0.3} color="#72bdab" mat="glass" />
          </group>
        ))}
        <Label pos={[0, 2, 3]} text={`Ficheo ${Math.round(s.registro * 100)}% · Sin contacto`} h={0.4} />
      </Taller>
    );
  },
});
export const Calcita = motor.Escena;
export const guia = motor.guia;
